import type { FastifyInstance } from 'fastify';
import {
  CareerPeriod,
  CareerProgressionStatus,
  CareerRole,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  StaffCareerStatus,
} from '@mos-lab/shared';
import { getCareerConfig, invalidateCareerConfigCache } from './career-config.service.js';
import { evaluateStaffQaAudits, normalizeAvatarUrl, resolveCareerPeriodDates } from './career-helpers.js';
import { calculateProgressionEarningsSimulation } from './career-progression-earnings.js';
import { fetchLegacyStaffAvatarFallback, fetchStaffProgressionLegacyMetrics } from './career-progression-metrics.js';

function resolveProgressionCurrentRole(
  staff: { role: string | null; displayName: string | null },
  progressionCurrentRole: string | null | undefined,
  targetLegacyStaffId: number,
  selfComboRate: number,
  ordersCount: number
): CareerRole {
  if (progressionCurrentRole) {
    return progressionCurrentRole as CareerRole;
  }

  const normalizedRole = (staff.role || '').toLowerCase();
  if (['cvll', 'cv_plus_plus'].includes(normalizedRole)) {
    return 'CV_PLUS_PLUS';
  }
  if (['cvl', 'cv_plus'].includes(normalizedRole)) {
    return 'CV_PLUS';
  }
  if (['lt', 'technician', 'cv', 'ktv'].includes(normalizedRole)) {
    if (selfComboRate >= 0.25 && ordersCount >= 250) {
      return 'CV_PLUS_PLUS';
    }
    if (selfComboRate >= 0.15 && ordersCount >= 150) {
      return 'CV_PLUS';
    }
    return 'CV';
  }
  if (['cc', 'consultant'].includes(normalizedRole)) {
    return 'CC';
  }
  if (['manager', 'fm'].includes(normalizedRole) || [52086, 52454].includes(targetLegacyStaffId)) {
    return staff.displayName?.includes('CHO') ? 'CHO' : 'FM';
  }
  if (['admin', 'super_admin'].includes(normalizedRole)) {
    return 'BOSS';
  }
  return 'CV';
}

function resolveProgressionTargetRole(
  progressionTargetRole: string | null | undefined,
  requestedTargetRole: CareerRole | undefined,
  currentRole: CareerRole
): CareerRole {
  if (requestedTargetRole && ['CV_PLUS', 'CV_PLUS_PLUS', 'FM', 'CHO', 'BOSS'].includes(requestedTargetRole)) {
    return requestedTargetRole;
  }
  if (progressionTargetRole) {
    return progressionTargetRole as CareerRole;
  }
  if (currentRole === 'KTV') return 'CV';
  if (currentRole === 'CV') return 'CV_PLUS';
  if (currentRole === 'CV_PLUS') return 'CV_PLUS_PLUS';
  if (currentRole === 'CV_PLUS_PLUS') return 'FM';
  if (currentRole === 'CC') return 'FM';
  if (currentRole === 'FM') return 'CHO';
  if (currentRole === 'CHO') return 'BOSS';
  if (currentRole === 'BOSS') return 'BOSS';
  if (currentRole === 'MASTER_TECH') return 'MASTER_TECH';
  return 'CV_PLUS';
}

/**
 * Tính toán chỉ số thực tế và đánh giá tiến trình thăng cấp cho 1 nhân viên
 */
export async function getStaffProgression(
  fastify: FastifyInstance,
  staffId: number,
  forceRefresh = false,
  requestedTargetRole?: CareerRole,
  period?: CareerPeriod
): Promise<StaffCareerStatus> {
  if (forceRefresh) {
    invalidateCareerConfigCache();
  }

  const config = await getCareerConfig(fastify);
  const periodConfig = resolveCareerPeriodDates(period);

  const staff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
    include: { careerProgression: true },
  });

  if (!staff) {
    throw new Error(`Staff not found with ID ${staffId}`);
  }

  const targetLegacyStaffId = staff.legacyStaffId || staff.id;
  const progression = staff.careerProgression;
  const progressionStatus: CareerProgressionStatus = (progression?.status as CareerProgressionStatus) || 'IN_PROGRESS';

  // Avatar resolution with fallback to legacy user_profile
  const rawAvatar =
    staff.avatarUrl ||
    (await fetchLegacyStaffAvatarFallback(fastify, staffId, staff.legacyStaffId, targetLegacyStaffId));
  const avatarUrl = normalizeAvatarUrl(rawAvatar);

  // Calculate live performance metrics from legacy database
  const metrics = await fetchStaffProgressionLegacyMetrics(fastify, staffId, targetLegacyStaffId, periodConfig);

  // Role mapping
  const currentRole = resolveProgressionCurrentRole(
    staff,
    progression?.currentRole,
    targetLegacyStaffId,
    metrics.selfComboRate,
    metrics.ordersCount
  );
  const targetRole = resolveProgressionTargetRole(progression?.targetRole, requestedTargetRole, currentRole);

  const isCvPlusPlusTarget = targetRole === 'CV_PLUS_PLUS';
  const activeReq = isCvPlusPlusTarget
    ? config.cvPlusToCvPlusPlus || DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusToCvPlusPlus
    : config.cvToCvPlus || config.cvToCc || DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus;

  const minOrders = activeReq.minOrders ?? 330;
  const maxFixRate = activeReq.maxFixRate ?? 0.015;
  const minTipRatioAboveShop = activeReq.minTipRatioAboveShop ?? 0.05;
  const targetTipRate = Number((metrics.shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));
  const minBananaCount = activeReq.minBananaCount && activeReq.minBananaCount >= 1 ? activeReq.minBananaCount : 20;
  const minHappinessIndex = activeReq.minHappinessIndex ?? 0.7;
  const promotionMinComboRate = isCvPlusPlusTarget
    ? ((activeReq as SafeAny).promotionMinComboRate ?? 0.3)
    : (activeReq.minSelfComboRate ?? 0.21);
  const minSelfComboRate = activeReq.minSelfComboRate ?? 0.21;
  const requiredAudits = activeReq.minQaAudits && activeReq.minQaAudits >= 0 ? activeReq.minQaAudits : 4;
  const requireZeroFailedAudits = activeReq.requireZeroFailedAudits !== false;

  // QA/QC Audit Quest Evaluation: Tính theo kỳ được chọn
  const { qaAudit } = evaluateStaffQaAudits(
    staff.id,
    targetLegacyStaffId,
    periodConfig.periodStart,
    periodConfig.periodEnd,
    requiredAudits,
    requireZeroFailedAudits
  );
  const qaAuditCompleted = qaAudit.isPassed;

  // 6 Tiêu Chí Nâng Cấp (Theo chuẩn cấu hình tương ứng CVL hoặc CVLL):
  const isOrdersPassed = metrics.ordersCount >= minOrders;
  const isFixPassed = metrics.fixRate <= maxFixRate;
  const isTipPassed = metrics.staffTipRate >= targetTipRate || metrics.tipRatioAboveShop >= minTipRatioAboveShop;
  const isHiPassed = metrics.happinessIndex >= minHappinessIndex;
  const isBananaPassed = metrics.bananaCount >= minBananaCount;

  const foundationCompleted =
    isOrdersPassed && isFixPassed && isTipPassed && qaAuditCompleted && isHiPassed && isBananaPassed;

  const bossTrialCompleted =
    activeReq.allowSelfConsultTrial !== false && metrics.selfComboRate >= promotionMinComboRate;

  // Đạt đủ cả 6 ải cốt lõi (kèm tự chốt combo nếu bật tính năng)
  const allPassed = foundationCompleted && (activeReq.allowSelfConsultTrial !== false ? bossTrialCompleted : true);

  let recommendedAction: StaffCareerStatus['recommendedAction'] = 'CONTINUE_TRAINING';
  if (allPassed) {
    recommendedAction = 'PROMOTE';
  } else if (foundationCompleted && progressionStatus !== 'TRIAL_GATE') {
    recommendedAction = 'START_TRIAL';
  }

  const earningsSimulation = calculateProgressionEarningsSimulation({
    config,
    activeReq,
    currentRole,
    isCvPlusPlusTarget,
    minSelfComboRate,
    metrics,
  });

  return {
    staffId: staff.id,
    staffName: staff.displayName || staff.username || `Staff #${staff.id}`,
    avatarUrl,
    currentRole,
    targetRole,
    status: progressionStatus,
    trialStartedAt: progression?.trialStartedAt?.toISOString() || null,
    trialEndsAt: progression?.trialEndsAt?.toISOString() || null,
    period: periodConfig.period,
    targetOrders: minOrders,
    metrics: {
      ordersCount: metrics.ordersCount, // Luôn luôn giữ ở 90 ngày qua (chuẩn ≥ 330 bộ)
      periodOrders: metrics.periodOrders,
      targetOrders: minOrders,
      period: periodConfig.period,
      fixCount: metrics.fixCount,
      fixRate: metrics.fixRate,
      totalTip: metrics.totalTip,
      tipRatioAboveShop: metrics.tipRatioAboveShop,
      shopAvgTip: metrics.shopAvgTip,
      staffAvgTip: metrics.staffAvgTip,
      staffTipRate: metrics.staffTipRate,
      shopTipRate: metrics.shopTipRate,
      storeId: metrics.staffBranch.storeId,
      branchName: metrics.staffBranch.branchName,
      branchCode: metrics.staffBranch.branchCode,
      branchTipRate: metrics.staffBranch.tipRate,
      branchAvgTip: metrics.staffBranch.avgTip,
      targetTipRate,
      tippedOrdersCount: metrics.tippedOrdersCount,
      happinessIndex: metrics.happinessIndex,
      happyCount: metrics.happyCount,
      totalHi: metrics.totalHi,
      bananaCount: metrics.bananaCount,
      bananaBalance: metrics.bananaBalance,
      isBananaPassed,
      selfComboCount: metrics.selfComboCount,
      selfComboRate: metrics.selfComboRate,
      monthsInRole: 6,
      avgCcLevel: metrics.ccLevel,
      monthlyPoints: metrics.monthlyPoints,
      ccBonusCash: metrics.ccBonusCash,
      ccTipShare: metrics.ccTipShare,
      totalVisits: metrics.ordersCount,
      facilityScore: 96,
      inventoryLossRate: 0.003,
      googleReviewsCount: 32,
      servicesPerHour: metrics.productivity.servicesPerHour,
      revenuePerHour: metrics.productivity.revenuePerHour,
      actualWorkingHours: metrics.productivity.actualWorkingHours,
      totalCompletedServices: metrics.productivity.totalCompletedServices,
      serviceRevenue: metrics.productivity.serviceRevenue,
      productivity: metrics.productivity,
      qaAudit,
    },
    qualifiedQuests: {
      foundationCompleted,
      bossTrialCompleted,
      qaAuditCompleted,
      allPassed,
    },
    recommendedAction,
    earningsSimulation,
    lastSyncedAt: new Date().toISOString(),
  };
}
