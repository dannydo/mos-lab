import { createHash, randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import type { FastifyInstance } from 'fastify';
import {
  calculateAcademyTalentAssessmentResult,
  calculateAcademyWorkshopAgendaRemainingSeconds,
  calculateAcademyWorkshopFeeStatus,
  formatAcademyTalentBenefitLabel,
  removeVietnameseTones,
  sortAcademyWorkshopTalentLeaderboard,
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  type AcademyTalentAssessmentQuote,
  type AcademyWorkshopAgendaItem,
  type AcademyWorkshopDetail,
  type AcademyWorkshopEquipmentPackage,
  type AcademyWorkshopEquipmentPackageImage,
  type AcademyWorkshopListItem,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopMenuItem,
  type AcademyWorkshopMenuSelection,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopParticipantEquipmentSelection,
  type AcademyWorkshopPublicMediaUploadResult,
  type AcademyWorkshopQuiz,
  type AcademyWorkshopSummary,
  type AcademyWorkshopTalentLeaderboardEntry,
  type CreateAcademyWorkshopMenuItemRequest,
  type CreateAcademyWorkshopPublicMediaUploadRequest,
  type CreateAcademyWorkshopEquipmentPackageRequest,
  type CreateAcademyWorkshopEquipmentPackageImageRequest,
  type CreateAcademyWorkshopAgendaItemRequest,
  type CreateAcademyWorkshopRequest,
  type CreateAcademyWorkshopWalkInRequest,
  type ListAcademyWorkshopParticipantsParams,
  type ListAcademyWorkshopsParams,
  type SafeAny,
  type ReorderAcademyWorkshopAgendaRequest,
  type UpdateAcademyWorkshopAgendaItemRequest,
  type UpdateAcademyWorkshopMenuItemRequest,
  type UpdateAcademyWorkshopEquipmentPackageRequest,
  type UpdateAcademyWorkshopEquipmentPackageImageRequest,
  type UpdateAcademyWorkshopRequest,
  type UpsertAcademyWorkshopAgendaItemRequest,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  AcademySalesService,
  buildAcademyLeadSearchText,
  canManageAcademySales,
  normalizeAcademyPhone,
  type AcademyActor,
} from '../academy-sales/academy-sales.service.js';
import { AcademyWorkshopStorageService } from './academy-workshop-storage.service.js';
import {
  AcademyWorkshopAgendaTemplateService,
  toAcademyWorkshopAgendaTemplate,
} from './academy-workshop-agenda-template.service.js';

const WORKSHOP_STATUSES = new Set([
  'DRAFT',
  'SCHEDULED',
  'CHECKIN_OPEN',
  'LIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
const AGENDA_KINDS = new Set(['CONTENT', 'TALENT_TEST', 'GAME', 'BREAK', 'SALES', 'OTHER']);
const MENU_CATEGORIES = new Set<AcademyWorkshopMenuCategory>(ACADEMY_WORKSHOP_MENU_CATEGORIES);
const MENU_CATEGORY_ORDER = new Map<AcademyWorkshopMenuCategory, number>(
  ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category, index) => [category, index])
);

const STAFF_SELECT = { id: true, displayName: true, email: true };
const PARTICIPANT_INCLUDE: SafeAny = {
  campaignLead: { include: { lead: true } },
  infoSentBy: { select: STAFF_SELECT },
  attendanceConfirmedBy: { select: STAFF_SELECT },
  checkedInBy: { select: STAFF_SELECT },
  primaryInstructor: { include: { staff: { select: { avatarUrl: true } } } },
  feePayments: { include: { confirmedBy: { select: STAFF_SELECT } }, orderBy: [{ receivedAt: 'desc' }] },
  photos: { include: { capturedBy: { select: STAFF_SELECT } }, orderBy: [{ capturedAt: 'desc' }] },
  menuSelections: { orderBy: [{ category: 'asc' }, { id: 'asc' }] },
  equipmentSelection: true,
  assessments: {
    include: { payments: { select: { amountVnd: true } } },
    orderBy: [{ updatedAt: 'desc' }],
  },
  answers: { select: { score: true, responseTimeMs: true } },
  rewards: { select: { status: true } },
  instructorBonuses: { select: { amountVnd: true, status: true } },
};

const WORKSHOP_INCLUDE: SafeAny = {
  campaign: true,
  agendaTemplate: { include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
  agendaItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  menuItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  equipmentPackages: {
    include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  quizzes: {
    where: { isTemplate: false },
    include: {
      questions: {
        include: { options: { orderBy: { sortOrder: 'asc' as const } } },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { updatedAt: 'desc' as const },
  },
  participants: { include: PARTICIPANT_INCLUDE },
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isPrivateLanIpv4(address: string): boolean {
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  const match = address.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function resolveAcademyWorkshopPublicOrigin(
  configuredUrl = process.env.ACADEMY_WORKSHOP_PUBLIC_URL,
  nodeEnv = process.env.NODE_ENV,
  interfaces = networkInterfaces()
): string {
  const configured = String(configuredUrl || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  if (nodeEnv !== 'production') {
    const preferredInterfaces = Object.entries(interfaces)
      .filter(([name]) => /^(en\d+|wlan\d+|eth\d+)$/.test(name))
      .sort(([left], [right]) => {
        const priority = (name: string) => (['en0', 'wlan0', 'eth0'].includes(name) ? 0 : 1);
        return priority(left) - priority(right) || left.localeCompare(right);
      });

    for (const [, addresses] of preferredInterfaces) {
      const lanAddress = addresses?.find(
        (entry) => entry.family === 'IPv4' && !entry.internal && isPrivateLanIpv4(entry.address)
      );
      if (lanAddress) return `http://${lanAddress.address}:4000`;
    }
  }

  return 'http://localhost:4000';
}

function parseDate(value: unknown, label: string, nullable = false): Date | null {
  if ((value === null || value === undefined || String(value).trim() === '') && nullable) return null;
  const raw = String(value || '').trim();
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw) ? `${raw}+07:00` : raw);
  if (!Number.isFinite(parsed.getTime())) throw new AcademySalesError(`${label} không hợp lệ.`);
  return parsed;
}

function normalizeHeroImageUrl(value: unknown): string | null {
  const imageUrl = String(value ?? '').trim();
  if (!imageUrl) return null;
  if (imageUrl.length > 512) {
    throw new AcademySalesError('URL banner hero không được dài quá 512 ký tự.', 400);
  }
  if (!imageUrl.startsWith('/') && !/^https?:\/\//i.test(imageUrl)) {
    throw new AcademySalesError('URL banner hero phải là đường dẫn nội bộ hoặc URL http(s).', 400);
  }
  return imageUrl;
}

function slugify(value: string) {
  return removeVietnameseTones(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

function assignedStaffIds(value: string | null | undefined) {
  return Array.from(
    new Set(
      parseJson<unknown[]>(value, [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

function staff(row: SafeAny) {
  return row ? { id: Number(row.id), displayName: String(row.displayName), email: row.email ?? null } : null;
}

function instructor(row: SafeAny) {
  if (!row) return null;
  return {
    id: Number(row.id),
    code: String(row.code),
    staffId: row.staffId == null ? null : Number(row.staffId),
    displayName: String(row.displayName),
    description: row.description ?? null,
    avatarUrl: row.avatarUrl ?? row.staff?.avatarUrl ?? null,
    surchargePercent: Math.max(0, Math.round(Number(row.surchargePercent) || 0)),
    isActive: Boolean(row.isActive),
    sortOrder: Math.max(0, Math.round(Number(row.sortOrder) || 0)),
  };
}

function hashQr(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function issueQrToken() {
  return randomBytes(32).toString('base64url');
}

function displayCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function registrationCode() {
  return randomBytes(18).toString('base64url');
}

export function toAcademyWorkshopQuiz(row: SafeAny, revealAnswers = false): AcademyWorkshopQuiz | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    workshopId: row.workshopId == null ? null : Number(row.workshopId),
    title: String(row.title),
    description: row.description ?? null,
    isTemplate: Boolean(row.isTemplate),
    status: row.status as AcademyWorkshopQuiz['status'],
    activeQuestionId: row.activeQuestionId == null ? null : Number(row.activeQuestionId),
    questionOpenedAt: row.questionOpenedAt ? new Date(row.questionOpenedAt).toISOString() : null,
    questionClosesAt: row.questionClosesAt ? new Date(row.questionClosesAt).toISOString() : null,
    podiumRewards: parseJson<Record<string, string>>(row.podiumRewardsJson, {}),
    questions: (row.questions || []).map((question: SafeAny) => ({
      id: Number(question.id),
      quizId: Number(question.quizId),
      type: question.type as AcademyWorkshopQuiz['questions'][number]['type'],
      prompt: String(question.prompt),
      imageUrl: question.imageUrl ?? null,
      durationSeconds: Number(question.durationSeconds),
      sortOrder: Number(question.sortOrder),
      rewardRule: question.rewardRule as AcademyWorkshopQuiz['questions'][number]['rewardRule'],
      fastestCount: Number(question.fastestCount),
      rewardLabel: question.rewardLabel ?? null,
      rewardQuantity: Number(question.rewardQuantity),
      options: (question.options || []).map((option: SafeAny) => ({
        id: Number(option.id),
        label: String(option.label),
        color: option.color ?? null,
        sortOrder: Number(option.sortOrder),
        ...(revealAnswers ? { isCorrect: Boolean(option.isCorrect) } : {}),
      })),
    })),
  };
}

export function toAcademyWorkshopAgendaItem(row: SafeAny, now = new Date()): AcademyWorkshopAgendaItem {
  const startedAt = row.startedAt ? new Date(row.startedAt) : null;
  const pausedAt = row.pausedAt ? new Date(row.pausedAt) : null;
  const completedAt = row.completedAt ? new Date(row.completedAt) : null;
  const elapsedSeconds = startedAt
    ? Math.max(
        0,
        Math.floor(((completedAt || pausedAt || now).getTime() - startedAt.getTime()) / 1000) -
          Math.max(0, Number(row.pausedSeconds) || 0)
      )
    : 0;
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    title: String(row.title),
    description: row.description ?? null,
    kind: row.kind,
    plannedDurationSeconds: Number(row.plannedDurationSeconds),
    sortOrder: Number(row.sortOrder),
    status: row.status,
    startedAt: startedAt?.toISOString() || null,
    completedAt: completedAt?.toISOString() || null,
    pausedAt: pausedAt?.toISOString() || null,
    pausedSeconds: Math.max(0, Number(row.pausedSeconds) || 0),
    actualDurationSeconds: completedAt ? elapsedSeconds : null,
    remainingSeconds: calculateAcademyWorkshopAgendaRemainingSeconds(
      row.plannedDurationSeconds,
      startedAt,
      pausedAt,
      row.pausedSeconds,
      now
    ),
  };
}

function menuCategory(value: unknown): AcademyWorkshopMenuCategory {
  if (!MENU_CATEGORIES.has(value as AcademyWorkshopMenuCategory)) {
    throw new AcademySalesError('Nhóm món ăn không hợp lệ.');
  }
  return value as AcademyWorkshopMenuCategory;
}

function menuItem(row: SafeAny): AcademyWorkshopMenuItem {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    category: menuCategory(row.category),
    name: String(row.name),
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    isAvailable: Boolean(row.isAvailable),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function menuSelection(row: SafeAny): AcademyWorkshopMenuSelection {
  return {
    id: Number(row.id),
    participantId: Number(row.participantId),
    menuItemId: row.menuItemId == null ? null : Number(row.menuItemId),
    category: menuCategory(row.category),
    itemName: String(row.itemName),
    selectedAt: new Date(row.selectedAt).toISOString(),
  };
}

function equipmentItems(value: unknown): string[] {
  const items = Array.isArray(value) ? value : parseJson<unknown[]>(String(value || ''), []);
  return Array.from(
    new Set(
      items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 180))
    )
  );
}

function equipmentPackage(row: SafeAny): AcademyWorkshopEquipmentPackage {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    name: String(row.name),
    description: row.description ?? null,
    includedItems: equipmentItems(row.includedItemsJson),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    isAvailable: Boolean(row.isAvailable),
    images: (row.images || []).map(equipmentPackageImage),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function equipmentPackageImage(row: SafeAny): AcademyWorkshopEquipmentPackageImage {
  return {
    id: Number(row.id),
    equipmentPackageId: Number(row.equipmentPackageId),
    imageUrl: String(row.imageUrl),
    altText: row.altText ?? null,
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function equipmentSelection(row: SafeAny): AcademyWorkshopParticipantEquipmentSelection | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    participantId: Number(row.participantId),
    equipmentPackageId: row.equipmentPackageId == null ? null : Number(row.equipmentPackageId),
    packageName: String(row.packageName),
    packageContents: equipmentItems(row.packageContentsJson),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    selectedAt: new Date(row.selectedAt).toISOString(),
  };
}

function sortMenuItems(items: AcademyWorkshopMenuItem[]) {
  return [...items].sort(
    (left, right) =>
      (MENU_CATEGORY_ORDER.get(left.category) || 0) - (MENU_CATEGORY_ORDER.get(right.category) || 0) ||
      left.sortOrder - right.sortOrder ||
      left.id - right.id
  );
}

export function academyWorkshopTalentSnapshotFromAssessment(assessment: SafeAny) {
  const quote = parseJson<AcademyTalentAssessmentQuote | null>(assessment.quoteSnapshotJson, null);
  const fallbackResult = calculateAcademyTalentAssessmentResult(assessment);
  // An assessment snapshot is calculated with the global ladder policy active
  // at save time. Recalculating here with the code defaults makes Workshop OS
  // drift from the Talent drawer whenever Academy customises that ladder.
  const result =
    quote?.result &&
    typeof quote.result.rewardLabel === 'string' &&
    Number.isFinite(Number(quote.result.scholarshipPercent))
      ? quote.result
      : fallbackResult;
  const paid = (assessment.payments || []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
    0
  );
  const finalPriceVnd = Math.max(0, Math.round(Number(quote?.finalPriceVnd) || 0));
  const scholarshipPercent = Math.max(0, Math.round(Number(result.scholarshipPercent) || 0));
  const sampleRewardPercent = Math.max(
    0,
    Math.round(Number(quote?.sampleRewardPercent ?? result.tier?.sampleRewardPercent) || 0)
  );
  const kitRewardPercent = Math.max(
    0,
    Math.round(Number(quote?.kitRewardPercent ?? result.tier?.kitRewardPercent) || 0)
  );
  return {
    assessmentId: Number(assessment.id),
    status: String(assessment.status),
    qualified: result.qualified,
    strands5Min: Number(assessment.strands5Min),
    totalErrors: result.totalErrors,
    eyeScore: Number(assessment.eyeScore),
    handScore: Number(assessment.handScore),
    rankLabel: result.rankLabel,
    rewardLabel: formatAcademyTalentBenefitLabel(
      { scholarshipPercent, sampleRewardPercent, kitRewardPercent },
      result.rewardLabel
    ),
    scholarshipPercent,
    sampleRewardPercent,
    kitRewardPercent,
    invoiceNumber: assessment.invoiceNumber ?? null,
    finalPriceVnd,
    totalPaidVnd: paid,
    paymentStatus: finalPriceVnd > 0 && paid >= finalPriceVnd ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
    completedAt: new Date(assessment.updatedAt).toISOString(),
  };
}

function talent(row: SafeAny) {
  const assessment = (row.assessments || []).find((item: SafeAny) => item.status !== 'DRAFT') || row.assessments?.[0];
  return assessment ? academyWorkshopTalentSnapshotFromAssessment(assessment) : null;
}

async function toParticipant(row: SafeAny, feeVnd: number, qrToken?: string): Promise<AcademyWorkshopParticipant> {
  const paid = (row.feePayments || []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.round(Number(payment.amountVnd) || 0),
    0
  );
  const feeStatus = calculateAcademyWorkshopFeeStatus(feeVnd, paid, Boolean(row.feeWaivedAt));
  const photos = await Promise.all(
    (row.photos || []).map(async (photo: SafeAny) => ({
      id: Number(photo.id),
      participantId: Number(photo.participantId),
      storagePath: String(photo.storagePath),
      signedUrl: await AcademyWorkshopStorageService.signedViewUrl(String(photo.storagePath)).catch(() => null),
      mimeType: String(photo.mimeType),
      sizeBytes: Number(photo.sizeBytes),
      caption: photo.caption ?? null,
      capturedAt: new Date(photo.capturedAt).toISOString(),
      capturedBy: staff(photo.capturedBy),
    }))
  );
  const latestTalent = talent(row);
  const bonusRows = row.instructorBonuses || [];
  const instructorBonusVnd = bonusRows.reduce(
    (sum: number, bonus: SafeAny) => sum + (bonus.status === 'VOID' ? 0 : Math.max(0, Number(bonus.amountVnd) || 0)),
    0
  );
  const bonusStatus = bonusRows.some((bonus: SafeAny) => bonus.status === 'MISSING_CONFIG')
    ? 'MISSING_CONFIG'
    : bonusRows.some((bonus: SafeAny) => bonus.status === 'EARNED')
      ? 'EARNED'
      : bonusRows.some((bonus: SafeAny) => bonus.status === 'PAID')
        ? 'PAID'
        : bonusRows.some((bonus: SafeAny) => bonus.status === 'VOID')
          ? 'VOID'
          : null;
  const lead = row.campaignLead.lead;
  return {
    id: Number(row.id),
    campaignLeadId: Number(row.campaignLeadId),
    workshopId: Number(row.workshopId),
    addedAt: new Date(row.createdAt).toISOString(),
    lead: {
      id: Number(lead.id),
      name: String(lead.name),
      phone: lead.phone ?? null,
      email: lead.email ?? null,
      avatarUrl: lead.avatarUrl ?? null,
      facebookChatLink: lead.facebookChatLink ?? null,
      status: lead.status,
      course: lead.course ?? null,
      source: String(lead.source),
    },
    infoSentAt: row.infoSentAt ? new Date(row.infoSentAt).toISOString() : null,
    infoSentBy: staff(row.infoSentBy),
    attendanceStatus: row.attendanceStatus,
    attendanceConfirmedAt: row.attendanceConfirmedAt ? new Date(row.attendanceConfirmedAt).toISOString() : null,
    attendanceConfirmedBy: staff(row.attendanceConfirmedBy),
    feeStatus,
    feePaidVnd: Math.max(0, paid),
    feeRemainingVnd: feeStatus === 'WAIVED' ? 0 : Math.max(0, feeVnd - paid),
    feeWaivedAt: row.feeWaivedAt ? new Date(row.feeWaivedAt).toISOString() : null,
    feeWaiverReason: row.feeWaiverReason ?? null,
    checkedInAt: row.checkedInAt ? new Date(row.checkedInAt).toISOString() : null,
    checkedInBy: staff(row.checkedInBy),
    photoConsentAt: row.photoConsentAt ? new Date(row.photoConsentAt).toISOString() : null,
    photoConsentVersion: row.photoConsentVersion ?? null,
    primaryInstructor: instructor(row.primaryInstructor),
    qrRedeemedAt: row.qrRedeemedAt ? new Date(row.qrRedeemedAt).toISOString() : null,
    tokenVersion: Number(row.tokenVersion),
    ...(qrToken
      ? {
          qrToken,
          qrUrl: `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/join/${encodeURIComponent(qrToken)}`,
        }
      : {}),
    photos,
    feePayments: (row.feePayments || []).map((payment: SafeAny) => ({
      id: Number(payment.id),
      participantId: Number(payment.participantId),
      amountVnd: Math.round(Number(payment.amountVnd) || 0),
      method: payment.method,
      reference: payment.reference ?? null,
      note: payment.note ?? null,
      receivedAt: new Date(payment.receivedAt).toISOString(),
      confirmedBy: staff(payment.confirmedBy),
      createdAt: new Date(payment.createdAt).toISOString(),
    })),
    menuSelections: (row.menuSelections || []).map(menuSelection),
    equipmentSelection: equipmentSelection(row.equipmentSelection),
    talent: latestTalent,
    gameScore: (row.answers || []).reduce((sum: number, answer: SafeAny) => sum + Number(answer.score || 0), 0),
    gameResponseTimeMs: (row.answers || []).reduce(
      (sum: number, answer: SafeAny) => sum + Number(answer.responseTimeMs || 0),
      0
    ),
    pendingRewardCount: (row.rewards || []).filter((reward: SafeAny) => reward.status === 'PROMISED').length,
    instructorBonusVnd,
    instructorBonusStatus: bonusStatus,
  };
}

function summarize(participants: AcademyWorkshopParticipant[]): AcademyWorkshopSummary {
  return {
    total: participants.length,
    infoSent: participants.filter((row) => row.infoSentAt).length,
    confirmed: participants.filter((row) => row.attendanceStatus === 'CONFIRMED').length,
    feeReady: participants.filter((row) => ['FREE', 'PAID', 'WAIVED'].includes(row.feeStatus)).length,
    checkedIn: participants.filter((row) => row.checkedInAt).length,
    tested: participants.filter((row) => row.talent).length,
    invoiced: participants.filter((row) => row.talent?.invoiceNumber).length,
    tuitionPaid: participants.filter((row) => row.talent?.paymentStatus === 'PAID').length,
    bonusEarned: participants.filter((row) => ['EARNED', 'PAID'].includes(row.instructorBonusStatus || '')).length,
    noShow: participants.filter((row) => !row.checkedInAt).length,
  };
}

function canManage(actor: AcademyActor) {
  return canManageAcademySales(actor);
}

export class AcademyWorkshopService {
  private static async uniqueSlug(fastify: FastifyInstance, desired: string, excludeCampaignId?: number) {
    const base = (slugify(desired) || `academy-workshop-${Date.now()}`).slice(0, 140);
    for (let index = 0; index < 1000; index += 1) {
      const suffix = index ? `-${index}` : '';
      const candidate = `${base.slice(0, 150 - suffix.length)}${suffix}`;
      const row = await fastify.prisma.crm.crmAcademyCampaign.findFirst({
        where: { slug: candidate, ...(excludeCampaignId ? { NOT: { id: excludeCampaignId } } : {}) },
        select: { id: true },
      });
      if (!row) return candidate;
    }
    throw new AcademySalesError('Không thể tạo slug workshop duy nhất.', 409);
  }

  private static async validateStaffIds(fastify: FastifyInstance, values: unknown) {
    if (!Array.isArray(values)) return [];
    const ids = Array.from(new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    const count = await fastify.prisma.crm.crmStaff.count({ where: { id: { in: ids }, isActive: true } });
    if (count !== ids.length) throw new AcademySalesError('Danh sách nhân sự workshop có người không hợp lệ.');
    return ids;
  }

  private static assertVisible(actor: AcademyActor, campaign: SafeAny) {
    if (canManage(actor)) return;
    if (!assignedStaffIds(campaign.assignedStaffIds).includes(actor.id)) {
      throw new AcademySalesError('Bạn không được phân công vào workshop này.', 403);
    }
  }

  static async rowById(fastify: FastifyInstance, actor: AcademyActor, workshopId: number): Promise<SafeAny> {
    const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
      where: { id: positiveId(workshopId, 'Workshop ID') },
      include: WORKSHOP_INCLUDE,
    });
    if (!row || row.campaign.kind !== 'WORKSHOP' || row.campaign.deletedAt) {
      throw new AcademySalesError('Không tìm thấy workshop.', 404);
    }
    this.assertVisible(actor, row.campaign);
    return row;
  }

  static async rowBySlug(fastify: FastifyInstance, actor: AcademyActor, slug: string): Promise<SafeAny> {
    const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshop.findFirst({
      where: { campaign: { slug: String(slug || '').trim(), kind: 'WORKSHOP', deletedAt: null } },
      include: WORKSHOP_INCLUDE,
    });
    if (!row) throw new AcademySalesError('Không tìm thấy workshop.', 404);
    this.assertVisible(actor, row.campaign);
    return row;
  }

  private static async detail(row: SafeAny): Promise<AcademyWorkshopDetail> {
    const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
    return {
      id: Number(row.id),
      campaignId: Number(row.campaignId),
      name: String(row.campaign.name),
      slug: String(row.campaign.slug),
      description: row.campaign.description ?? null,
      heroImageUrl: row.heroImageUrl ?? null,
      startsAt: new Date(row.startsAt).toISOString(),
      endsAt: new Date(row.endsAt).toISOString(),
      location: String(row.location),
      capacity: Number(row.capacity),
      feeVnd: Math.max(0, Math.round(Number(row.feeVnd) || 0)),
      feeDueAt: row.feeDueAt ? new Date(row.feeDueAt).toISOString() : null,
      status: row.status,
      agendaTemplate: row.agendaTemplate ? toAcademyWorkshopAgendaTemplate(row.agendaTemplate) : null,
      assignedStaffIds: assignedStaffIds(row.campaign.assignedStaffIds),
      participantCount: participants.length,
      checkedInCount: participants.filter((item) => item.checkedInAt).length,
      liveAgendaItemId: row.liveAgendaItemId == null ? null : Number(row.liveAgendaItemId),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      showInSidebar: Boolean(row.campaign.showInSidebar),
      registrationCode: row.registrationCode ?? null,
      registrationOpen: Boolean(row.registrationOpen),
      registrationUrl: row.registrationCode
        ? `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/register/${encodeURIComponent(String(row.registrationCode))}`
        : null,
      displayCode: String(row.displayCode),
      sharedJoinUrl: `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/lobby/${encodeURIComponent(String(row.displayCode))}`,
      summary: summarize(participants),
      agenda: row.agendaItems.map((item: SafeAny) => toAcademyWorkshopAgendaItem(item)),
      menuItems: sortMenuItems((row.menuItems || []).map(menuItem)),
      equipmentPackages: (row.equipmentPackages || []).map(equipmentPackage),
      activeQuiz: toAcademyWorkshopQuiz(row.quizzes?.[0], true),
    };
  }

  static async getById(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
    return this.detail(await this.rowById(fastify, actor, workshopId));
  }

  static async getBySlug(fastify: FastifyInstance, actor: AcademyActor, slug: string) {
    return this.detail(await this.rowBySlug(fastify, actor, slug));
  }

  static async list(fastify: FastifyInstance, actor: AcademyActor, params: ListAcademyWorkshopsParams = {}) {
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    const rows: SafeAny[] = await fastify.prisma.crm.crmAcademyWorkshop.findMany({
      where: {
        campaign: { kind: 'WORKSHOP', deletedAt: null },
        ...(params.status && params.status !== 'ALL' ? { status: params.status } : {}),
      },
      include: WORKSHOP_INCLUDE,
      orderBy: [{ startsAt: 'desc' }],
    });
    const search = removeVietnameseTones(String(params.search || ''));
    const visible = rows.filter((row) => {
      try {
        this.assertVisible(actor, row.campaign);
      } catch {
        return false;
      }
      return (
        !search || removeVietnameseTones(`${row.campaign.name} ${row.campaign.slug} ${row.location}`).includes(search)
      );
    });
    const mapped = await Promise.all(
      visible.map(async (row) => {
        const detail = await this.detail(row);
        const {
          summary: _summary,
          agenda: _agenda,
          activeQuiz: _activeQuiz,
          displayCode: _displayCode,
          showInSidebar: _show,
          ...item
        } = detail;
        return item as AcademyWorkshopListItem;
      })
    );
    const allParticipants = (
      await Promise.all(
        visible.map((row) => Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd))))
      )
    ).flat();
    return {
      data: mapped.slice((page - 1) * limit, page * limit),
      total: mapped.length,
      page,
      limit,
      summary: summarize(allParticipants),
    };
  }

  static async create(fastify: FastifyInstance, actor: AcademyActor, input: CreateAcademyWorkshopRequest) {
    if (!canManage(actor))
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được tạo workshop.', 403);
    const name = String(input.name || '').trim();
    const location = String(input.location || '').trim();
    if (!name || name.length > 150) throw new AcademySalesError('Tên workshop là bắt buộc và tối đa 150 ký tự.');
    if (!location || location.length > 255) throw new AcademySalesError('Địa điểm workshop là bắt buộc.');
    const startsAt = parseDate(input.startsAt, 'Thời gian bắt đầu')!;
    const endsAt = parseDate(input.endsAt, 'Thời gian kết thúc')!;
    if (endsAt <= startsAt) throw new AcademySalesError('Thời gian kết thúc phải sau thời gian bắt đầu.');
    const capacity = Math.min(100, Math.max(1, Math.round(Number(input.capacity) || 100)));
    const feeVnd = Math.max(0, Math.round(Number(input.feeVnd) || 0));
    const feeDueAt = parseDate(input.feeDueAt, 'Hạn đóng phí', true);
    const heroImageUrl = normalizeHeroImageUrl(input.heroImageUrl);
    const staffIds = await this.validateStaffIds(fastify, input.assignedStaffIds || []);
    if (!staffIds.includes(actor.id)) staffIds.push(actor.id);
    const slug = await this.uniqueSlug(fastify, input.slug || name);
    const agendaTemplate = await AcademyWorkshopAgendaTemplateService.getRequired(fastify, input.agendaTemplateId);
    const agenda = input.agenda?.length
      ? this.normalizeAgenda(input.agenda)
      : this.normalizeAgenda(agendaTemplate.items as UpsertAcademyWorkshopAgendaItemRequest[]);

    const created = await fastify.prisma.crm.$transaction(async (tx) => {
      const campaign = await tx.crmAcademyCampaign.create({
        data: {
          kind: 'WORKSHOP',
          name,
          slug,
          description: String(input.description || '').trim() || null,
          startDate: startsAt,
          endDate: endsAt,
          status: 'SCHEDULED',
          showInSidebar: Boolean(input.showInSidebar),
          assignedStaffIds: JSON.stringify(staffIds),
          createdByStaffId: actor.id,
        },
      });
      return tx.crmAcademyWorkshop.create({
        data: {
          campaignId: campaign.id,
          startsAt,
          endsAt,
          location,
          capacity,
          feeVnd,
          feeDueAt,
          heroImageUrl,
          status: 'SCHEDULED',
          agendaTemplateId: agendaTemplate.id,
          registrationCode: registrationCode(),
          displayCode: displayCode(),
          agendaItems: agenda.length ? { create: agenda } : undefined,
        },
      });
    });
    return this.getById(fastify, actor, created.id);
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: UpdateAcademyWorkshopRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    if (!canManage(actor) && actor.academyAccess !== true) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa workshop.', 403);
    }
    const name = input.name === undefined ? row.campaign.name : String(input.name).trim();
    const location = input.location === undefined ? row.location : String(input.location).trim();
    const startsAt = input.startsAt === undefined ? row.startsAt : parseDate(input.startsAt, 'Thời gian bắt đầu')!;
    const endsAt = input.endsAt === undefined ? row.endsAt : parseDate(input.endsAt, 'Thời gian kết thúc')!;
    if (!name || !location || endsAt <= startsAt)
      throw new AcademySalesError('Thông tin thời gian/địa điểm workshop không hợp lệ.');
    if (input.status && !WORKSHOP_STATUSES.has(input.status))
      throw new AcademySalesError('Trạng thái workshop không hợp lệ.');
    const nextStaffIds =
      input.assignedStaffIds === undefined
        ? assignedStaffIds(row.campaign.assignedStaffIds)
        : await this.validateStaffIds(fastify, input.assignedStaffIds);
    const slug =
      input.slug === undefined ? row.campaign.slug : await this.uniqueSlug(fastify, input.slug || name, row.campaignId);
    const agendaTemplate =
      input.agendaTemplateId === undefined
        ? row.agendaTemplate
        : await AcademyWorkshopAgendaTemplateService.getRequired(fastify, input.agendaTemplateId);
    const heroImageUrl =
      input.heroImageUrl === undefined ? row.heroImageUrl : normalizeHeroImageUrl(input.heroImageUrl);
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyCampaign.update({
        where: { id: row.campaignId },
        data: {
          name,
          slug,
          description:
            input.description === undefined ? row.campaign.description : String(input.description || '').trim() || null,
          startDate: startsAt,
          endDate: endsAt,
          showInSidebar: input.showInSidebar === undefined ? row.campaign.showInSidebar : Boolean(input.showInSidebar),
          assignedStaffIds: JSON.stringify(nextStaffIds),
          status: input.status || row.campaign.status,
        },
      });
      await tx.crmAcademyWorkshop.update({
        where: { id: row.id },
        data: {
          startsAt,
          endsAt,
          location,
          capacity:
            input.capacity === undefined ? row.capacity : Math.min(100, Math.max(1, Math.round(input.capacity))),
          feeVnd: input.feeVnd === undefined ? row.feeVnd : Math.max(0, Math.round(input.feeVnd)),
          feeDueAt: input.feeDueAt === undefined ? row.feeDueAt : parseDate(input.feeDueAt, 'Hạn đóng phí', true),
          heroImageUrl,
          status: input.status || row.status,
          registrationOpen:
            input.registrationOpen === undefined ? row.registrationOpen : Boolean(input.registrationOpen),
          agendaTemplateId: agendaTemplate?.id ?? null,
        },
      });
      if (input.agenda || input.agendaTemplateId !== undefined) {
        this.assertAgendaStructureEditable(row);
        await tx.crmAcademyWorkshopAgendaItem.deleteMany({ where: { workshopId: row.id } });
        const agenda = input.agenda
          ? this.normalizeAgenda(input.agenda)
          : this.normalizeAgenda((agendaTemplate?.items || []) as UpsertAcademyWorkshopAgendaItemRequest[]);
        if (agenda.length)
          await tx.crmAcademyWorkshopAgendaItem.createMany({
            data: agenda.map((item) => ({ ...item, workshopId: row.id })),
          });
      }
    });
    if (input.status === 'COMPLETED') await this.ensureCompletionFollowUps(fastify, actor, row.id);
    return this.getById(fastify, actor, row.id);
  }

  private static normalizeAgenda(input: UpsertAcademyWorkshopAgendaItemRequest[]) {
    return input.map((item, index) => {
      const title = String(item.title || '').trim();
      const plannedDurationSeconds = Math.round(Number(item.plannedDurationSeconds));
      if (
        !title ||
        !AGENDA_KINDS.has(item.kind) ||
        plannedDurationSeconds < 30 ||
        plannedDurationSeconds > 8 * 60 * 60
      ) {
        throw new AcademySalesError(`Agenda #${index + 1} không hợp lệ.`);
      }
      return {
        title,
        description: String(item.description || '').trim() || null,
        kind: item.kind,
        plannedDurationSeconds,
        sortOrder: item.sortOrder === undefined ? index + 1 : Math.max(0, Math.round(item.sortOrder)),
      };
    });
  }

  private static assertCanEditAgenda(actor: AcademyActor) {
    if (!canManage(actor) && actor.academyAccess !== true) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa agenda.', 403);
    }
  }

  private static assertAgendaStructureEditable(row: SafeAny) {
    if (row.agendaItems.some((item: SafeAny) => item.status !== 'PENDING')) {
      throw new AcademySalesError('Không thể thay cấu trúc agenda sau khi workshop đã chạy.', 409);
    }
  }

  static async createAgendaItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopAgendaItemRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditAgenda(actor);
    this.assertAgendaStructureEditable(row);
    const [item] = this.normalizeAgenda([{ ...input, sortOrder: row.agendaItems.length + 1 }]);
    const created = await fastify.prisma.crm.crmAcademyWorkshopAgendaItem.create({
      data: { ...item, workshopId: row.id },
    });
    return toAcademyWorkshopAgendaItem(created);
  }

  static async updateAgendaItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    agendaItemId: number,
    input: UpdateAcademyWorkshopAgendaItemRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditAgenda(actor);
    this.assertAgendaStructureEditable(row);
    const existing = row.agendaItems.find((item: SafeAny) => item.id === positiveId(agendaItemId, 'Agenda ID'));
    if (!existing) throw new AcademySalesError('Không tìm thấy mục agenda.', 404);
    const [item] = this.normalizeAgenda([
      {
        title: input.title === undefined ? existing.title : input.title,
        description: input.description === undefined ? existing.description : input.description,
        kind: input.kind === undefined ? existing.kind : input.kind,
        plannedDurationSeconds:
          input.plannedDurationSeconds === undefined ? existing.plannedDurationSeconds : input.plannedDurationSeconds,
        sortOrder: existing.sortOrder,
      },
    ]);
    const updated = await fastify.prisma.crm.crmAcademyWorkshopAgendaItem.update({
      where: { id: existing.id },
      data: item,
    });
    return toAcademyWorkshopAgendaItem(updated);
  }

  static async deleteAgendaItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    agendaItemId: number
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditAgenda(actor);
    this.assertAgendaStructureEditable(row);
    const itemId = positiveId(agendaItemId, 'Agenda ID');
    if (!row.agendaItems.some((item: SafeAny) => item.id === itemId)) {
      throw new AcademySalesError('Không tìm thấy mục agenda.', 404);
    }
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopAgendaItem.delete({ where: { id: itemId } });
      await Promise.all(
        row.agendaItems
          .filter((item: SafeAny) => item.id !== itemId)
          .map((item: SafeAny, index: number) =>
            tx.crmAcademyWorkshopAgendaItem.update({ where: { id: item.id }, data: { sortOrder: index + 1 } })
          )
      );
    });
  }

  static async reorderAgenda(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: ReorderAcademyWorkshopAgendaRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditAgenda(actor);
    this.assertAgendaStructureEditable(row);
    const ids = Array.isArray(input.agendaItemIds) ? input.agendaItemIds.map(Number) : [];
    const existingIds = row.agendaItems.map((item: SafeAny) => Number(item.id));
    if (
      ids.length !== existingIds.length ||
      new Set(ids).size !== ids.length ||
      ids.some((itemId) => !Number.isInteger(itemId) || !existingIds.includes(itemId))
    ) {
      throw new AcademySalesError('Thứ tự agenda không hợp lệ.');
    }
    await fastify.prisma.crm.$transaction(
      ids.map((itemId, index) =>
        fastify.prisma.crm.crmAcademyWorkshopAgendaItem.update({
          where: { id: itemId },
          data: { sortOrder: index + 1 },
        })
      )
    );
    return (await this.getById(fastify, actor, row.id)).agenda;
  }

  private static assertCanEditWorkshopMedia(actor: AcademyActor) {
    if (!canManage(actor) && actor.academyAccess !== true) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa hình ảnh workshop.', 403);
    }
  }

  private static assertCanEditMenu(actor: AcademyActor) {
    if (!canManage(actor) && actor.academyAccess !== true) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa thực đơn.', 403);
    }
  }

  static async uploadHeroImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> {
    await this.rowById(fastify, actor, workshopId);
    this.assertCanEditWorkshopMedia(actor);
    return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'hero-images', input);
  }

  static async uploadMenuImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> {
    await this.rowById(fastify, actor, workshopId);
    this.assertCanEditMenu(actor);
    return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'menu-items', input);
  }

  private static normalizeMenuItem(input: {
    category: unknown;
    name: unknown;
    description?: unknown;
    imageUrl?: unknown;
    isAvailable?: unknown;
  }) {
    const category = menuCategory(input.category);
    const name = String(input.name || '').trim();
    const description = String(input.description || '').trim() || null;
    const imageUrl = String(input.imageUrl || '').trim() || null;
    if (!name || name.length > 180) throw new AcademySalesError('Tên món là bắt buộc và tối đa 180 ký tự.');
    if (description && description.length > 2_000) throw new AcademySalesError('Mô tả món tối đa 2.000 ký tự.');
    if (!imageUrl) throw new AcademySalesError('Mỗi món cần có ít nhất một ảnh minh họa.');
    if (imageUrl && imageUrl.length > 512) throw new AcademySalesError('Đường dẫn ảnh món tối đa 512 ký tự.');
    if (imageUrl && !/^(https?:\/\/|\/)/i.test(imageUrl)) {
      throw new AcademySalesError('Đường dẫn ảnh món phải bắt đầu bằng https://, http:// hoặc /.');
    }
    return {
      category,
      name,
      description,
      imageUrl,
      isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
    };
  }

  static async createMenuItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopMenuItemRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditMenu(actor);
    const item = this.normalizeMenuItem(input);
    const sortOrder =
      Math.max(
        0,
        ...row.menuItems
          .filter((current: SafeAny) => current.category === item.category)
          .map((current: SafeAny) => Number(current.sortOrder) || 0)
      ) + 1;
    const created = await fastify.prisma.crm.crmAcademyWorkshopMenuItem.create({
      data: { ...item, workshopId: row.id, sortOrder },
    });
    return menuItem(created);
  }

  static async updateMenuItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    menuItemId: number,
    input: UpdateAcademyWorkshopMenuItemRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditMenu(actor);
    const itemId = positiveId(menuItemId, 'Món ăn');
    const existing = row.menuItems.find((item: SafeAny) => item.id === itemId);
    if (!existing) throw new AcademySalesError('Không tìm thấy món ăn trong thực đơn.', 404);
    const item = this.normalizeMenuItem({
      category: input.category === undefined ? existing.category : input.category,
      name: input.name === undefined ? existing.name : input.name,
      description: input.description === undefined ? existing.description : input.description,
      imageUrl: input.imageUrl === undefined ? existing.imageUrl : input.imageUrl,
      isAvailable: input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
    });
    const sortOrder =
      item.category === existing.category
        ? existing.sortOrder
        : Math.max(
            0,
            ...row.menuItems
              .filter((current: SafeAny) => current.id !== existing.id && current.category === item.category)
              .map((current: SafeAny) => Number(current.sortOrder) || 0)
          ) + 1;
    const updated = await fastify.prisma.crm.crmAcademyWorkshopMenuItem.update({
      where: { id: existing.id },
      data: { ...item, sortOrder },
    });
    return menuItem(updated);
  }

  static async deleteMenuItem(fastify: FastifyInstance, actor: AcademyActor, workshopId: number, menuItemId: number) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditMenu(actor);
    const itemId = positiveId(menuItemId, 'Món ăn');
    if (!row.menuItems.some((item: SafeAny) => item.id === itemId)) {
      throw new AcademySalesError('Không tìm thấy món ăn trong thực đơn.', 404);
    }
    await fastify.prisma.crm.crmAcademyWorkshopMenuItem.delete({ where: { id: itemId } });
  }

  private static assertCanEditEquipment(actor: AcademyActor) {
    if (!canManage(actor) && actor.academyAccess !== true) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa bộ dụng cụ.', 403);
    }
  }

  static async uploadEquipmentImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> {
    await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    return AcademyWorkshopStorageService.uploadPublicMedia(workshopId, 'equipment-images', input);
  }

  private static normalizeEquipmentPackage(input: {
    name: unknown;
    description?: unknown;
    includedItems: unknown;
    priceVnd: unknown;
    isAvailable?: unknown;
  }) {
    const name = String(input.name || '').trim();
    const description = String(input.description || '').trim() || null;
    const includedItems = equipmentItems(input.includedItems);
    const priceVnd = Math.round(Number(input.priceVnd));
    if (!name || name.length > 180) throw new AcademySalesError('Tên bộ dụng cụ là bắt buộc và tối đa 180 ký tự.');
    if (description && description.length > 2_000) throw new AcademySalesError('Mô tả bộ dụng cụ tối đa 2.000 ký tự.');
    if (!includedItems.length) throw new AcademySalesError('Mỗi bộ dụng cụ cần có ít nhất một món đi kèm.');
    if (includedItems.length > 16) throw new AcademySalesError('Mỗi bộ dụng cụ tối đa 16 món đi kèm.');
    if (!Number.isFinite(priceVnd) || priceVnd < 0 || priceVnd > 100_000_000) {
      throw new AcademySalesError('Giá bộ dụng cụ phải là số tiền VND hợp lệ.');
    }
    return {
      name,
      description,
      includedItemsJson: JSON.stringify(includedItems),
      priceVnd,
      isAvailable: input.isAvailable === undefined ? true : Boolean(input.isAvailable),
    };
  }

  static async createEquipmentPackage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopEquipmentPackageRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const item = this.normalizeEquipmentPackage(input);
    const sortOrder =
      Math.max(0, ...row.equipmentPackages.map((current: SafeAny) => Number(current.sortOrder) || 0)) + 1;
    const created = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.create({
      data: { ...item, workshopId: row.id, sortOrder },
    });
    return equipmentPackage(created);
  }

  static async updateEquipmentPackage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    equipmentPackageId: number,
    input: UpdateAcademyWorkshopEquipmentPackageRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const itemId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
    const existing = row.equipmentPackages.find((item: SafeAny) => item.id === itemId);
    if (!existing) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
    const item = this.normalizeEquipmentPackage({
      name: input.name === undefined ? existing.name : input.name,
      description: input.description === undefined ? existing.description : input.description,
      includedItems:
        input.includedItems === undefined ? parseJson<unknown[]>(existing.includedItemsJson, []) : input.includedItems,
      priceVnd: input.priceVnd === undefined ? existing.priceVnd : input.priceVnd,
      isAvailable: input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
    });
    const updated = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.update({
      where: { id: existing.id },
      data: item,
    });
    return equipmentPackage(updated);
  }

  static async deleteEquipmentPackage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    equipmentPackageId: number
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const itemId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
    if (!row.equipmentPackages.some((item: SafeAny) => item.id === itemId)) {
      throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
    }
    await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackage.delete({ where: { id: itemId } });
  }

  private static normalizeEquipmentImage(input: { imageUrl: unknown; altText?: unknown }) {
    const imageUrl = String(input.imageUrl || '').trim();
    const altText = String(input.altText || '').trim() || null;
    if (!imageUrl || imageUrl.length > 512 || !/^(https?:\/\/|\/)/i.test(imageUrl)) {
      throw new AcademySalesError('Đường dẫn ảnh phải bắt đầu bằng https://, http:// hoặc /.');
    }
    if (altText && altText.length > 180) throw new AcademySalesError('Mô tả ảnh tối đa 180 ký tự.');
    return { imageUrl, altText };
  }

  static async createEquipmentPackageImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    equipmentPackageId: number,
    input: CreateAcademyWorkshopEquipmentPackageImageRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
    const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
    if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
    const image = this.normalizeEquipmentImage(input);
    const sortOrder =
      Math.max(0, ...(selectedPackage.images || []).map((item: SafeAny) => Number(item.sortOrder) || 0)) + 1;
    const created = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.create({
      data: { ...image, equipmentPackageId: selectedPackage.id, sortOrder },
    });
    return equipmentPackageImage(created);
  }

  static async updateEquipmentPackageImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    equipmentPackageId: number,
    imageId: number,
    input: UpdateAcademyWorkshopEquipmentPackageImageRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
    const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
    if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
    const selectedImage = (selectedPackage.images || []).find(
      (item: SafeAny) => item.id === positiveId(imageId, 'Ảnh')
    );
    if (!selectedImage) throw new AcademySalesError('Không tìm thấy ảnh của bộ dụng cụ.', 404);
    const image = this.normalizeEquipmentImage({
      imageUrl: input.imageUrl === undefined ? selectedImage.imageUrl : input.imageUrl,
      altText: input.altText === undefined ? selectedImage.altText : input.altText,
    });
    const updated = await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.update({
      where: { id: selectedImage.id },
      data: image,
    });
    return equipmentPackageImage(updated);
  }

  static async deleteEquipmentPackageImage(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    equipmentPackageId: number,
    imageId: number
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    this.assertCanEditEquipment(actor);
    const packageId = positiveId(equipmentPackageId, 'Bộ dụng cụ');
    const selectedPackage = row.equipmentPackages.find((item: SafeAny) => item.id === packageId);
    if (!selectedPackage) throw new AcademySalesError('Không tìm thấy bộ dụng cụ thực hành.', 404);
    const currentImage = (selectedPackage.images || []).find((item: SafeAny) => item.id === positiveId(imageId, 'Ảnh'));
    if (!currentImage) throw new AcademySalesError('Không tìm thấy ảnh của bộ dụng cụ.', 404);
    await fastify.prisma.crm.crmAcademyWorkshopEquipmentPackageImage.delete({ where: { id: currentImage.id } });
  }

  private static async addLeadIds(fastify: FastifyInstance, actor: AcademyActor, row: SafeAny, leadIds: number[]) {
    const ids = Array.from(new Set(leadIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    if (!ids.length) throw new AcademySalesError('Chọn ít nhất một học viên.');
    if (row.participants.length + ids.length > row.capacity)
      throw new AcademySalesError('Workshop vượt quá sức chứa.', 409);
    for (const leadId of ids) await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
    const issued: Array<{ participantId: number; token: string }> = [];
    await fastify.prisma.crm.$transaction(async (tx) => {
      for (const leadId of ids) {
        const membership = await tx.crmAcademyCampaignLead.upsert({
          where: { campaignId_leadId: { campaignId: row.campaignId, leadId } },
          create: { campaignId: row.campaignId, leadId, addedByStaffId: actor.id },
          update: { removedAt: null, removedReason: null, removedByStaffId: null },
        });
        const existing = await tx.crmAcademyWorkshopParticipant.findUnique({
          where: { campaignLeadId: membership.id },
        });
        if (existing) continue;
        const token = issueQrToken();
        const participant = await tx.crmAcademyWorkshopParticipant.create({
          data: { workshopId: row.id, campaignLeadId: membership.id, qrTokenHash: hashQr(token) },
        });
        issued.push({ participantId: participant.id, token });
        await tx.crmAcademyWorkshopParticipantEvent.create({
          data: { workshopId: row.id, participantId: participant.id, eventType: 'ADDED', actorStaffId: actor.id },
        });
      }
    });
    return Promise.all(
      issued.map(async ({ participantId, token }) => {
        const participant = await this.participantRow(fastify, actor, row.id, participantId);
        return toParticipant(participant, row.feeVnd, token);
      })
    );
  }

  static async addParticipants(fastify: FastifyInstance, actor: AcademyActor, workshopId: number, leadIds: number[]) {
    const row = await this.rowById(fastify, actor, workshopId);
    return this.addLeadIds(fastify, actor, row, leadIds);
  }

  static async addWalkIn(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: CreateAcademyWorkshopWalkInRequest
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    const name = String(input.name || '').trim();
    if (!name) throw new AcademySalesError('Tên học viên walk-in là bắt buộc.');
    const phoneNormalized = normalizeAcademyPhone(input.phone);
    let lead = phoneNormalized
      ? await fastify.prisma.crm.crmAcademyLead.findFirst({
          where: { phoneNormalized },
          orderBy: { updatedAt: 'desc' },
        })
      : null;
    if (!lead) {
      lead = await fastify.prisma.crm.crmAcademyLead.create({
        data: {
          name,
          phone: String(input.phone || '').trim() || null,
          phoneNormalized,
          email: String(input.email || '').trim() || null,
          source: String(input.source || 'Workshop walk-in').trim(),
          sourceSystem: 'MANUAL',
          searchText: buildAcademyLeadSearchText({
            name,
            phone: input.phone,
            email: input.email,
            source: input.source,
          }),
          status: 'SCHEDULED',
          ownerStaffId: actor.id,
          createdByStaffId: actor.id,
        },
      });
    }
    const [participant] = await this.addLeadIds(fastify, actor, row, [lead.id]);
    if (!participant) throw new AcademySalesError('Học viên đã có trong workshop.', 409);
    if (input.primaryInstructorId)
      await this.assignInstructor(fastify, actor, row.id, participant.id, input.primaryInstructorId);
    return this.getParticipant(fastify, actor, row.id, participant.id, participant.qrToken);
  }

  private static async participantRow(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number
  ) {
    const workshop = await this.rowById(fastify, actor, workshopId);
    const row: SafeAny = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
      where: { id: positiveId(participantId, 'Participant ID'), workshopId: workshop.id },
      include: PARTICIPANT_INCLUDE,
    });
    if (!row) throw new AcademySalesError('Không tìm thấy học viên trong workshop.', 404);
    return row;
  }

  static async getParticipant(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    qrToken?: string
  ) {
    const workshop = await this.rowById(fastify, actor, workshopId);
    const row = await this.participantRow(fastify, actor, workshop.id, participantId);
    return toParticipant(row, workshop.feeVnd, qrToken);
  }

  static async listParticipants(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    params: ListAcademyWorkshopParticipantsParams = {}
  ) {
    const row = await this.rowById(fastify, actor, workshopId);
    const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
    const search = removeVietnameseTones(String(params.search || ''));
    const filtered = participants.filter((participant) => {
      if (
        search &&
        !removeVietnameseTones(
          `${participant.lead.name} ${participant.lead.phone || ''} ${participant.lead.email || ''}`
        ).includes(search)
      )
        return false;
      if (
        params.attendanceStatus &&
        params.attendanceStatus !== 'ALL' &&
        participant.attendanceStatus !== params.attendanceStatus
      )
        return false;
      if (params.feeStatus && params.feeStatus !== 'ALL' && participant.feeStatus !== params.feeStatus) return false;
      if (
        params.checkedIn !== undefined &&
        params.checkedIn !== 'ALL' &&
        Boolean(participant.checkedInAt) !== Boolean(params.checkedIn)
      )
        return false;
      return true;
    });
    const page = Math.max(1, Math.round(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      limit,
      summary: summarize(participants),
    };
  }

  static async updateCare(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    input: { infoSent?: boolean; attendanceStatus?: 'PENDING' | 'CONFIRMED' | 'DECLINED'; note?: string | null }
  ) {
    const participant = await this.participantRow(fastify, actor, workshopId, participantId);
    const now = new Date();
    const attendanceChanged =
      input.attendanceStatus !== undefined && input.attendanceStatus !== participant.attendanceStatus;
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopParticipant.update({
        where: { id: participant.id },
        data: {
          ...(input.infoSent !== undefined
            ? { infoSentAt: input.infoSent ? now : null, infoSentByStaffId: input.infoSent ? actor.id : null }
            : {}),
          ...(input.attendanceStatus !== undefined
            ? {
                attendanceStatus: input.attendanceStatus,
                attendanceConfirmedAt: attendanceChanged ? now : participant.attendanceConfirmedAt,
                attendanceConfirmedByStaffId: attendanceChanged ? actor.id : participant.attendanceConfirmedByStaffId,
              }
            : {}),
        },
      });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId,
          participantId,
          eventType: 'PRE_CARE_UPDATED',
          metadataJson: JSON.stringify({ ...input, channelOpenedOnly: true }),
          actorStaffId: actor.id,
        },
      });
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async checkIn(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    checkedIn = true
  ) {
    await this.participantRow(fastify, actor, workshopId, participantId);
    const now = new Date();
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopParticipant.update({
        where: { id: participantId },
        data: { checkedInAt: checkedIn ? now : null, checkedInByStaffId: checkedIn ? actor.id : null },
      });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId,
          participantId,
          eventType: checkedIn ? 'CHECKED_IN' : 'CHECKIN_REVERTED',
          actorStaffId: actor.id,
        },
      });
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async checkInByQr(fastify: FastifyInstance, actor: AcademyActor, workshopId: number, qrToken: string) {
    await this.rowById(fastify, actor, workshopId);
    const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findFirst({
      where: { workshopId, qrTokenHash: hashQr(String(qrToken || '')) },
      select: { id: true },
    });
    if (!participant) throw new AcademySalesError('QR không hợp lệ hoặc đã được cấp lại.', 404);
    return this.checkIn(fastify, actor, workshopId, participant.id, true);
  }

  static async reissueQr(fastify: FastifyInstance, actor: AcademyActor, workshopId: number, participantId: number) {
    await this.participantRow(fastify, actor, workshopId, participantId);
    const token = issueQrToken();
    await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
      where: { id: participantId },
      data: { qrTokenHash: hashQr(token), qrRedeemedAt: null, tokenVersion: { increment: 1 } },
    });
    return this.getParticipant(fastify, actor, workshopId, participantId, token);
  }

  static async setConsent(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    consent: boolean,
    policyVersion = 'academy-photo-v1'
  ) {
    await this.participantRow(fastify, actor, workshopId, participantId);
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyWorkshopParticipant.update({
        where: { id: participantId },
        data: {
          photoConsentAt: consent ? new Date() : null,
          photoConsentVersion: consent ? policyVersion.slice(0, 40) : null,
        },
      });
      await tx.crmAcademyWorkshopParticipantEvent.create({
        data: {
          workshopId,
          participantId,
          eventType: consent ? 'PHOTO_CONSENTED' : 'PHOTO_CONSENT_REVOKED',
          actorStaffId: actor.id,
        },
      });
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async createPhotoUploadIntent(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    input: { fileName: string; mimeType: string; sizeBytes: number }
  ) {
    const participant = await this.participantRow(fastify, actor, workshopId, participantId);
    if (!participant.photoConsentAt) throw new AcademySalesError('Cần ghi nhận consent trước khi tải ảnh.', 409);
    return AcademyWorkshopStorageService.createUploadIntent(
      workshopId,
      participantId,
      input.fileName,
      input.mimeType,
      input.sizeBytes
    );
  }

  static async confirmPhoto(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    input: { storagePath: string; mimeType: string; sizeBytes: number; caption?: string | null; capturedAt?: string }
  ) {
    const participant = await this.participantRow(fastify, actor, workshopId, participantId);
    if (!participant.photoConsentAt) throw new AcademySalesError('Consent ảnh đã bị thu hồi.', 409);
    await AcademyWorkshopStorageService.verifyObject(
      workshopId,
      participantId,
      input.storagePath,
      input.mimeType,
      input.sizeBytes
    );
    const capturedAt = input.capturedAt ? parseDate(input.capturedAt, 'Thời điểm chụp')! : new Date();
    await fastify.prisma.crm.crmAcademyWorkshopPhoto.create({
      data: {
        participantId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        caption: String(input.caption || '').trim() || null,
        capturedAt,
        capturedByStaffId: actor.id,
      },
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async assignInstructor(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    instructorId: number | null
  ) {
    await this.participantRow(fastify, actor, workshopId, participantId);
    if (instructorId !== null) {
      const exists = await fastify.prisma.crm.crmAcademyInstructor.count({
        where: { id: instructorId, isActive: true },
      });
      if (!exists) throw new AcademySalesError('Giáo viên chính không hợp lệ.');
    }
    await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
      where: { id: participantId },
      data: { primaryInstructorId: instructorId },
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async recordFee(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    input: { amountVnd: number; method: string; reference?: string | null; note?: string | null; receivedAt?: string }
  ) {
    await this.participantRow(fastify, actor, workshopId, participantId);
    const amountVnd = Math.round(Number(input.amountVnd));
    if (!Number.isInteger(amountVnd) || amountVnd === 0)
      throw new AcademySalesError('Số tiền phải là VND nguyên khác 0.');
    if (!['BANK_TRANSFER', 'CASH', 'ADJUSTMENT'].includes(input.method))
      throw new AcademySalesError('Phương thức thu phí không hợp lệ.');
    if (input.method !== 'ADJUSTMENT' && amountVnd < 0) throw new AcademySalesError('Số tiền thu không thể âm.');
    if (input.method === 'ADJUSTMENT' && !canManage(actor))
      throw new AcademySalesError('Chỉ quản lý được ghi bút toán điều chỉnh.', 403);
    await fastify.prisma.crm.crmAcademyWorkshopFeePayment.create({
      data: {
        participantId,
        amountVnd,
        method: input.method,
        reference:
          String(input.reference || '')
            .trim()
            .slice(0, 160) || null,
        note: String(input.note || '').trim() || null,
        receivedAt: input.receivedAt ? parseDate(input.receivedAt, 'Thời điểm nhận tiền')! : new Date(),
        confirmedByStaffId: actor.id,
      },
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async waiveFee(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    participantId: number,
    waived: boolean,
    reason: string
  ) {
    if (!canManage(actor))
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được miễn phí workshop.', 403);
    await this.participantRow(fastify, actor, workshopId, participantId);
    const cleanReason = String(reason || '').trim();
    if (waived && !cleanReason) throw new AcademySalesError('Cần nhập lý do miễn phí.');
    await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
      where: { id: participantId },
      data: {
        feeWaivedAt: waived ? new Date() : null,
        feeWaiverReason: waived ? cleanReason : null,
        feeWaivedByStaffId: waived ? actor.id : null,
      },
    });
    return this.getParticipant(fastify, actor, workshopId, participantId);
  }

  static async talentLeaderboard(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
    const row = await this.rowById(fastify, actor, workshopId);
    const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
    const ranked = sortAcademyWorkshopTalentLeaderboard(
      participants
        .filter(
          (item): item is AcademyWorkshopParticipant & { talent: NonNullable<AcademyWorkshopParticipant['talent']> } =>
            Boolean(item.talent)
        )
        .map((item) => ({
          participantId: item.id,
          name: item.lead.name,
          avatarUrl: item.lead.avatarUrl,
          qualified: item.talent.qualified,
          strands5Min: item.talent.strands5Min,
          totalErrors: item.talent.totalErrors,
          eyeScore: item.talent.eyeScore,
          handScore: item.talent.handScore,
          rankLabel: item.talent.rankLabel,
          rewardLabel: item.talent.rewardLabel,
          scholarshipPercent: item.talent.scholarshipPercent,
          sampleRewardPercent: item.talent.sampleRewardPercent,
          kitRewardPercent: item.talent.kitRewardPercent,
          completedAt: item.talent.completedAt,
        }))
    );
    return ranked.map((item, index) => ({ ...item, rank: index + 1 })) as AcademyWorkshopTalentLeaderboardEntry[];
  }

  static async ensureCompletionFollowUps(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
    const row = await this.rowById(fastify, actor, workshopId);
    const participants = await Promise.all(row.participants.map((item: SafeAny) => toParticipant(item, row.feeVnd)));
    const dueAt = new Date(Math.max(Date.now(), new Date(row.endsAt).getTime()) + 24 * 60 * 60 * 1000);
    for (const participant of participants) {
      const reason = !participant.checkedInAt
        ? 'NO_SHOW'
        : participant.talent?.paymentStatus !== 'PAID'
          ? 'NOT_CONVERTED'
          : null;
      if (!reason) continue;
      const marker = `[WORKSHOP:${workshopId}:${reason}]`;
      const exists = await fastify.prisma.crm.crmAcademyFollowUpTask.findFirst({
        where: { leadId: participant.lead.id, content: { startsWith: marker } },
        select: { id: true },
      });
      if (exists) continue;
      await fastify.prisma.crm.crmAcademyFollowUpTask.create({
        data: {
          leadId: participant.lead.id,
          content: `${marker} ${reason === 'NO_SHOW' ? 'Chăm lại học viên vắng workshop' : 'Follow-up chốt khóa sau workshop'} ${row.campaign.name}.`,
          dueAt,
          status: 'PENDING',
          pancakeLink: participant.lead.facebookChatLink,
          assigneeStaffId: row.campaign.createdByStaffId || actor.id,
        },
      });
    }
  }
}

export { hashQr as hashAcademyWorkshopQrToken, toParticipant as toAcademyWorkshopParticipant };
