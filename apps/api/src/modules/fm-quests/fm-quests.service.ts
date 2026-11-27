import type { FastifyInstance } from 'fastify';
import {
  canManageFmQuests,
  canSubmitFmDinner,
  FM_SHOP_FUND_SPECS,
  resolveBondingStarFromDinner,
  type FmBondingSummary,
  type FmBranchCode,
  type FmQuestsOverviewResponse,
  type FmTeamDinnerRecord,
  type FmWeeklyQuestDefinition,
  type ReviewFmTeamDinnerRequest,
  type SaveFmQuestsConfigRequest,
  type SettleFmWeeklyQuestRequest,
  type SubmitFmQuestProofRequest,
  type SubmitFmTeamDinnerRequest,
} from '@mos-lab/shared';
import { FundService } from '../funds/fund.service.js';
import { evaluateWeeklyQuest, resolveIsoWeekRange } from './fm-quests.evaluator.js';
import {
  creditShopFundForQuest,
  ensureShopFund,
  readQuestLedger,
  readQuestsConfig,
  readTeamDinners,
  writeQuestLedger,
  writeQuestsConfig,
  writeTeamDinners,
} from './fm-quests.store.js';

export class FmQuestError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'FmQuestError';
  }
}

export interface FmQuestActor {
  id: number;
  name: string;
  role: string;
}

function normalizeBranch(branch?: string | null): FmBranchCode {
  return String(branch || '')
    .trim()
    .toLowerCase() === 'ep'
    ? 'ep'
    : 'dt';
}

function ledgerKey(branch: FmBranchCode, weekKey: string, questId: string): string {
  return `${branch}:${weekKey}:${questId}`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function computeBondingSummary(dinners: FmTeamDinnerRecord[]): FmBondingSummary {
  const approved = dinners.filter((d) => d.status === 'APPROVED');
  const pending = dinners.filter((d) => d.status === 'PENDING');
  if (approved.length === 0) {
    return {
      approvedDinnerCount: 0,
      pendingDinnerCount: pending.length,
      bestAttendancePct: 0,
      hasValidSocialCheckin: false,
      effectiveStar: 0,
      missingDinnerShieldPenalty: 1,
    };
  }

  let bestStar: 0 | 1 | 2 | 3 = 0;
  let bestPct = 0;
  let anyCheckin = false;
  for (const d of approved) {
    const hasSocial =
      Boolean(d.socialCheckinUrl?.trim()) || (Array.isArray(d.proofImageUrls) && d.proofImageUrls.length > 0);
    if (hasSocial) anyCheckin = true;
    if (d.attendancePct > bestPct) bestPct = d.attendancePct;
    const res = resolveBondingStarFromDinner({
      organized: true,
      hasSocialCheckin: hasSocial,
      attendancePct: d.attendancePct,
    });
    if (res.star > bestStar) bestStar = res.star;
  }

  const finalEval = resolveBondingStarFromDinner({
    organized: approved.length > 0,
    hasSocialCheckin: anyCheckin,
    attendancePct: bestPct,
  });

  return {
    approvedDinnerCount: approved.length,
    pendingDinnerCount: pending.length,
    bestAttendancePct: bestPct,
    hasValidSocialCheckin: anyCheckin,
    effectiveStar: finalEval.star,
    missingDinnerShieldPenalty: finalEval.missingDinnerShieldPenalty,
  };
}

export async function getFmQuestsOverview(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  params: { branch?: string; weekKey?: string; monthKey?: string }
): Promise<FmQuestsOverviewResponse> {
  const branch = normalizeBranch(params.branch);
  const week = resolveIsoWeekRange(params.weekKey);
  const monthKey = /^\d{4}-\d{2}$/.test(String(params.monthKey || '')) ? String(params.monthKey) : week.monthKey;

  const [config, ledger, allDinners, shopFund] = await Promise.all([
    readQuestsConfig(fastify.prisma.crm),
    readQuestLedger(fastify.prisma.crm),
    readTeamDinners(fastify.prisma.crm),
    ensureShopFund(fastify.prisma.crm, branch),
  ]);

  const branchQuests = config.quests
    .filter((q) => q.branchScope === 'all' || q.branchScope === branch)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const evaluations = await Promise.all(
    branchQuests.map((quest) =>
      evaluateWeeklyQuest(
        fastify,
        branch,
        week.weekStart,
        week.weekEnd,
        quest,
        ledger[ledgerKey(branch, week.weekKey, quest.id)]
      )
    )
  );

  const monthSettledQuestVnd = Object.values(ledger)
    .filter((entry) => entry.branch === branch && entry.monthKey === monthKey && entry.settled)
    .reduce((sum, entry) => sum + Number(entry.settledAmountVnd || 0), 0);

  const dinners = allDinners
    .filter((d) => d.branch === branch && d.monthKey === monthKey)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.submittedAt.localeCompare(a.submittedAt));

  return {
    branch,
    weekKey: week.weekKey,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    monthKey,
    shopFund,
    monthlyQuestCapVnd: config.monthlyQuestCapVnd,
    monthSettledQuestVnd,
    quests: branchQuests,
    evaluations,
    dinners,
    bondingSummary: computeBondingSummary(dinners),
    permissions: {
      canManageQuests: canManageFmQuests(actor.role),
      canSubmitDinner: canSubmitFmDinner(actor.role),
      canReviewDinner: canManageFmQuests(actor.role),
    },
  };
}

export async function saveFmQuestsConfig(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  payload: SaveFmQuestsConfigRequest
) {
  if (!canManageFmQuests(actor.role)) {
    throw new FmQuestError('Chỉ HR hoặc CEO / Admin mới được chỉnh sửa Weekly Quest.', 403);
  }
  if (!Array.isArray(payload?.quests) || payload.quests.length === 0) {
    throw new FmQuestError('Danh sách Weekly Quest không được để trống.', 400);
  }

  const nowIso = new Date().toISOString();
  const normalizedQuests: FmWeeklyQuestDefinition[] = payload.quests.map((q, idx) => {
    const title = String(q.title || '').trim();
    if (!title) {
      throw new FmQuestError(`Quest #${idx + 1} chưa có tiêu đề.`, 400);
    }
    const rewardVnd = Math.round(Number(q.rewardVnd || 0));
    if (Number.isNaN(rewardVnd) || rewardVnd < 0) {
      throw new FmQuestError(`Tiền thưởng của quest "${title}" không hợp lệ.`, 400);
    }
    return {
      id: String(q.id || `quest-custom-${Date.now()}-${idx}`).trim(),
      code:
        String(q.code || `CUSTOM_${idx + 1}`)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_-]/g, '_') || `QUEST_${idx + 1}`,
      title,
      description: String(q.description || '').trim(),
      type: q.type || 'custom',
      rewardVnd,
      branchScope: q.branchScope === 'dt' || q.branchScope === 'ep' ? q.branchScope : 'all',
      isActive: q.isActive !== false,
      targetConfig: q.targetConfig || {},
      sortOrder: idx + 1,
      updatedAt: nowIso,
      updatedBy: actor.name,
    };
  });

  const cap =
    payload.monthlyQuestCapVnd == null || Number(payload.monthlyQuestCapVnd) <= 0
      ? null
      : Math.round(Number(payload.monthlyQuestCapVnd));

  return writeQuestsConfig(fastify.prisma.crm, {
    monthlyQuestCapVnd: cap,
    quests: normalizedQuests,
    updatedAt: nowIso,
    updatedBy: actor.name,
  });
}

export async function submitFmQuestProof(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  payload: SubmitFmQuestProofRequest
) {
  if (!canSubmitFmDinner(actor.role)) {
    throw new FmQuestError('Bạn không có quyền nộp minh chứng Weekly Quest.', 403);
  }
  const branch = normalizeBranch(payload.branch);
  const week = resolveIsoWeekRange(payload.weekKey);
  const questId = String(payload.questId || '').trim();
  const proofNote = String(payload.proofNote || '').trim();
  if (!questId || !proofNote) {
    throw new FmQuestError('Vui lòng chọn quest và nhập mô tả minh chứng hoàn thành.', 400);
  }
  const proofUrl = payload.proofUrl ? String(payload.proofUrl).trim() : null;
  if (proofUrl && !isValidHttpUrl(proofUrl)) {
    throw new FmQuestError('Link minh chứng phải bắt đầu bằng http:// hoặc https://', 400);
  }

  const ledger = await readQuestLedger(fastify.prisma.crm);
  const key = ledgerKey(branch, week.weekKey, questId);
  const existing = ledger[key];

  ledger[key] = {
    key,
    branch,
    weekKey: week.weekKey,
    monthKey: week.monthKey,
    questId,
    proofNote,
    proofUrl,
    proofSubmittedBy: actor.name,
    proofSubmittedAt: new Date().toISOString(),
    manualPassed: payload.manualPassed ?? true,
    settled: Boolean(existing?.settled),
    settledAmountVnd: Number(existing?.settledAmountVnd || 0),
    settledAt: existing?.settledAt || null,
    settledBy: existing?.settledBy || null,
    fundTransactionId: existing?.fundTransactionId || null,
  };

  await writeQuestLedger(fastify.prisma.crm, ledger);
  return ledger[key];
}

export async function settleFmWeeklyQuest(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  payload: SettleFmWeeklyQuestRequest
) {
  if (!canManageFmQuests(actor.role)) {
    throw new FmQuestError('Chỉ HR hoặc CEO / Admin mới được chốt thưởng Weekly Quest vào Quỹ Shop.', 403);
  }
  const branch = normalizeBranch(payload.branch);
  const week = resolveIsoWeekRange(payload.weekKey);
  const questId = String(payload.questId || '').trim();

  const [config, ledger] = await Promise.all([
    readQuestsConfig(fastify.prisma.crm),
    readQuestLedger(fastify.prisma.crm),
  ]);
  const quest = config.quests.find((q) => q.id === questId);
  if (!quest) {
    throw new FmQuestError('Không tìm thấy Weekly Quest để chốt.', 404);
  }

  const key = ledgerKey(branch, week.weekKey, questId);
  const existing = ledger[key];
  if (existing?.settled) {
    throw new FmQuestError('Weekly Quest này đã được chốt và nạp Quỹ Shop trước đó.', 409);
  }

  const liveEval = await evaluateWeeklyQuest(fastify, branch, week.weekStart, week.weekEnd, quest, existing);
  const isPassed = payload.overridePass === true || liveEval.passed;
  if (!isPassed) {
    throw new FmQuestError(
      'Quest chưa đạt điều kiện hoàn thành. Có thể bật xác nhận ngoại lệ nếu HR/CEO duyệt tay.',
      400
    );
  }

  let creditAmount = Math.max(0, quest.rewardVnd);
  if (config.monthlyQuestCapVnd !== null) {
    const monthUsed = Object.values(ledger)
      .filter((e) => e.branch === branch && e.monthKey === week.monthKey && e.settled)
      .reduce((sum, e) => sum + Number(e.settledAmountVnd || 0), 0);
    const remainingCap = Math.max(0, config.monthlyQuestCapVnd - monthUsed);
    if (remainingCap <= 0) {
      throw new FmQuestError(
        `Đã đạt trần Quỹ Quest tháng (${config.monthlyQuestCapVnd.toLocaleString('vi-VN')}đ).`,
        400
      );
    }
    creditAmount = Math.min(creditAmount, remainingCap);
  }

  const branchName = FM_SHOP_FUND_SPECS[branch].storeName;
  const txResult = await creditShopFundForQuest(fastify.prisma.crm, {
    branch,
    amountVnd: creditAmount,
    description: `[Weekly Quest ${week.weekKey} · ${branchName}] ${quest.title}${payload.note ? ` (${payload.note.trim()})` : ''}`,
    actor: { id: actor.id, name: actor.name },
  });

  ledger[key] = {
    key,
    branch,
    weekKey: week.weekKey,
    monthKey: week.monthKey,
    questId,
    proofNote: existing?.proofNote || payload.note || null,
    proofUrl: existing?.proofUrl || null,
    proofSubmittedBy: existing?.proofSubmittedBy || null,
    proofSubmittedAt: existing?.proofSubmittedAt || null,
    manualPassed: payload.overridePass ? true : existing?.manualPassed,
    settled: true,
    settledAmountVnd: creditAmount,
    settledAt: new Date().toISOString(),
    settledBy: actor.name,
    fundTransactionId: txResult.transactionId,
  };

  await writeQuestLedger(fastify.prisma.crm, ledger);
  return {
    entry: ledger[key],
    newBalanceVnd: txResult.newBalanceVnd,
  };
}

export async function submitFmTeamDinner(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  payload: SubmitFmTeamDinnerRequest
): Promise<FmTeamDinnerRecord> {
  if (!canSubmitFmDinner(actor.role)) {
    throw new FmQuestError('Bạn không có quyền nộp báo cáo Tiệc Tháng shop.', 403);
  }
  const branch = normalizeBranch(payload.branch);
  const monthKey = /^\d{4}-\d{2}$/.test(String(payload.monthKey || ''))
    ? String(payload.monthKey)
    : resolveIsoWeekRange().monthKey;
  const venueName = String(payload.venueName || '').trim();
  const socialCheckinUrl = String(payload.socialCheckinUrl || '').trim();
  const eventDate = String(payload.eventDate || '').trim();
  const attendeeCount = Math.round(Number(payload.attendeeCount || 0));
  const totalHeadcount = Math.round(Number(payload.totalHeadcount || 0));
  const amountSpentVnd = Math.max(0, Math.round(Number(payload.amountSpentVnd || 0)));

  if (!venueName) throw new FmQuestError('Vui lòng nhập tên quán / địa điểm ăn uống.', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new FmQuestError('Ngày tổ chức tiệc không hợp lệ.', 400);
  if (!isValidHttpUrl(socialCheckinUrl)) {
    throw new FmQuestError('Bắt buộc đính kèm link bài/ảnh check-in mạng xã hội hợp lệ (http/https).', 400);
  }
  if (totalHeadcount <= 0 || attendeeCount <= 0 || attendeeCount > totalHeadcount) {
    throw new FmQuestError('Số người tham gia và tổng quân số shop không hợp lệ.', 400);
  }

  const attendancePct = Math.round((attendeeCount / totalHeadcount) * 100);
  const { star } = resolveBondingStarFromDinner({
    organized: true,
    hasSocialCheckin: true,
    attendancePct,
  });

  const record: FmTeamDinnerRecord = {
    id: `dinner-${branch}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    branch,
    monthKey,
    eventDate,
    venueName,
    attendeeCount,
    totalHeadcount,
    attendancePct,
    computedStar: star,
    socialCheckinUrl,
    proofImageUrls: Array.isArray(payload.proofImageUrls) ? payload.proofImageUrls.filter(Boolean) : [socialCheckinUrl],
    amountSpentVnd,
    deductFromShopFund: payload.deductFromShopFund !== false,
    fundTransactionId: null,
    status: 'PENDING',
    submittedByStaffId: actor.id,
    submittedByName: actor.name,
    submittedAt: new Date().toISOString(),
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
  };

  const dinners = await readTeamDinners(fastify.prisma.crm);
  dinners.push(record);
  await writeTeamDinners(fastify.prisma.crm, dinners);
  return record;
}

export async function reviewFmTeamDinner(
  fastify: FastifyInstance,
  actor: FmQuestActor,
  dinnerId: string,
  payload: ReviewFmTeamDinnerRequest
): Promise<FmTeamDinnerRecord> {
  if (!canManageFmQuests(actor.role)) {
    throw new FmQuestError('Chỉ HR hoặc CEO / Admin mới được duyệt Tiệc Tháng & trừ Quỹ Shop.', 403);
  }
  const dinners = await readTeamDinners(fastify.prisma.crm);
  const idx = dinners.findIndex((d) => d.id === dinnerId);
  if (idx === -1) {
    throw new FmQuestError('Không tìm thấy hồ sơ Tiệc Tháng.', 404);
  }

  const current = dinners[idx];
  const decision = payload.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
  let fundTransactionId = current.fundTransactionId;

  const shouldDeduct =
    decision === 'APPROVED' &&
    (payload.deductFromShopFund ?? current.deductFromShopFund) &&
    current.amountSpentVnd > 0 &&
    !fundTransactionId;

  if (shouldDeduct) {
    const shopFund = await ensureShopFund(fastify.prisma.crm, current.branch);
    const spec = FM_SHOP_FUND_SPECS[current.branch];
    const expenseRes = await FundService.recordExpense(
      fastify.prisma.crm,
      shopFund.fundId,
      {
        amount: current.amountSpentVnd,
        description: `[Tiệc Tháng ${current.monthKey} · ${spec.storeName}] ${current.venueName} (${current.attendeeCount}/${current.totalHeadcount} NV · ${current.attendancePct}%)`,
        receiptUrls: current.proofImageUrls,
      },
      { id: actor.id, name: actor.name, role: actor.role }
    );
    fundTransactionId = expenseRes.transaction.id;
  }

  const updated: FmTeamDinnerRecord = {
    ...current,
    status: decision,
    deductFromShopFund: payload.deductFromShopFund ?? current.deductFromShopFund,
    fundTransactionId,
    reviewedByName: actor.name,
    reviewedAt: new Date().toISOString(),
    reviewNote: payload.reviewNote?.trim() || null,
  };

  dinners[idx] = updated;
  await writeTeamDinners(fastify.prisma.crm, dinners);
  return updated;
}
