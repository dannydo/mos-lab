import type { FastifyInstance } from 'fastify';
import {
  type CareerBranchFilter,
  type CareerPeriod,
  type CareerProgressionConfig,
  type CareerRole,
  matchesCareerBranchFilter,
  type SafeAny,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';
import { getCareerConfig } from './career-config.service.js';
import {
  CareerPeriodDates,
  computeHourlyProductivity,
  evaluateStaffQaAudits,
  normalizeAvatarUrl,
  resolveCareerPeriodDates,
  resolveStaffBranchStats,
} from './career-helpers.js';
import { BulkCareerMetrics, fetchBulkStaffCareerMetrics } from './career-staff-list-queries.js';

function resolveListCareerRole(
  staff: SafeAny,
  legacyId: number,
  activeCcLegacyIds: number[],
  selfComboRate: number,
  staffOrders90d: number
): CareerRole {
  if (
    staff.careerProgression?.currentRole &&
    ['KTV', 'CV', 'CV_PLUS', 'CV_PLUS_PLUS', 'FM', 'CHO', 'BOSS', 'MASTER_TECH', 'CC'].includes(
      staff.careerProgression.currentRole
    )
  ) {
    return staff.careerProgression.currentRole as CareerRole;
  }
  if (staff.role === 'cvll' || staff.role === 'cv_plus_plus') {
    return 'CV_PLUS_PLUS';
  }
  if (staff.role === 'cvl' || staff.role === 'cv_plus') {
    return 'CV_PLUS';
  }
  if (staff.role === 'cc' || activeCcLegacyIds.includes(legacyId)) {
    return 'CC';
  }
  if (
    staff.role === 'fm' ||
    [52086, 52454].includes(legacyId) ||
    (staff.role === 'manager' && (staff.displayName?.includes('FM') || staff.displayName?.includes('Floor')))
  ) {
    return 'FM';
  }
  if (selfComboRate >= 0.25 && staffOrders90d >= 250) {
    return 'CV_PLUS_PLUS';
  }
  if (selfComboRate >= 0.15 && staffOrders90d >= 150) {
    return 'CV_PLUS';
  }
  return 'CV';
}

function mapStaffToCareerListItem(
  staff: SafeAny,
  metrics: BulkCareerMetrics,
  config: CareerProgressionConfig,
  periodConfig: CareerPeriodDates,
  activeCcLegacyIds: number[],
  evaluatedWeeks: number
) {
  const legacyId = staff.legacyStaffId || staff.id;
  const staffOrders90d = metrics.ordersMap[legacyId]?.orders90d || 0;
  const staffOrdersPeriod = metrics.ordersMap[legacyId]?.ordersPeriod || 0;
  const staffFixesPeriod = metrics.ordersMap[legacyId]?.fixesPeriod || 0;
  const fixRate = staffOrdersPeriod > 0 ? Number((staffFixesPeriod / staffOrdersPeriod).toFixed(4)) : 0;
  const totalTip = metrics.tipsMap[legacyId]?.totalTip || 0;
  const staffAvgTip = staffOrdersPeriod > 0 ? totalTip / staffOrdersPeriod : 0;
  const validTipOrders = metrics.tipsMap[legacyId]?.validTipOrders || 0;
  const staffTipRate =
    staffOrdersPeriod > 0 && validTipOrders > 0 ? Number((validTipOrders / staffOrdersPeriod).toFixed(3)) : 0;

  // Xác định chi nhánh của nhân sự: ưu tiên store có nhiều ca làm nhất trong 3 tháng đã hoàn tất, fallback profile store
  const staffStoreId = metrics.staffPrimaryStoreMap[legacyId] || metrics.profileStoreMap[legacyId] || 6;
  const staffBranch = resolveStaffBranchStats(staffStoreId, metrics.branchSummary);

  // Tỷ lệ tip và tiền tip trung bình được tính theo chuẩn chi nhánh của chính nhân sự đó
  const shopTipRate = staffBranch.tipRate;
  const shopAvgTip = staffBranch.avgTip;

  const tipRatioAboveShop =
    shopTipRate > 0 && staffTipRate > 0
      ? Number(((staffTipRate - shopTipRate) / shopTipRate).toFixed(3))
      : shopAvgTip > 0 && staffOrdersPeriod > 0
        ? Number(((staffAvgTip - shopAvgTip) / shopAvgTip).toFixed(3))
        : 0;

  // Kinh Thánh mOS Điều răn CV-002: Tỷ lệ chốt combo được tính trên khách Not Combo Live thực tế.
  // Khách có Combo Live bán được cũng được cộng dồn vào tử số (đòn bẩy cộng dồn).
  // Đánh giá tỷ lệ đạt chuẩn tốt nhất trên chu kỳ 90 ngày tích lũy hoặc kỳ hiện hành.
  const staffComboData = metrics.combosMap[legacyId];
  const comboPeriodCount = staffComboData?.period || 0;
  const combo90dCount = staffComboData?.ninetyDays || 0;

  const notComboLivePeriod =
    metrics.notComboLiveOrdersPeriodMap[legacyId] !== undefined
      ? metrics.notComboLiveOrdersPeriodMap[legacyId]
      : staffOrdersPeriod > 0
        ? Math.max(1, Math.round(staffOrdersPeriod * 0.4))
        : 0;
  const notComboLive90d =
    metrics.notComboLiveOrders90dMap[legacyId] !== undefined
      ? metrics.notComboLiveOrders90dMap[legacyId]
      : staffOrders90d > 0
        ? Math.max(1, Math.round((staffOrders90d / 3) * 0.4 * 3))
        : 0;

  const ratePeriod =
    notComboLivePeriod > 0
      ? Number((comboPeriodCount / notComboLivePeriod).toFixed(3))
      : staffOrdersPeriod > 0
        ? Number((comboPeriodCount / staffOrdersPeriod).toFixed(3))
        : comboPeriodCount > 0
          ? 1
          : 0;
  const rate90d =
    notComboLive90d > 0
      ? Number((combo90dCount / notComboLive90d).toFixed(3))
      : staffOrders90d > 0
        ? Number((combo90dCount / staffOrders90d).toFixed(3))
        : combo90dCount > 0
          ? 1
          : 0;

  const selfComboRate = periodConfig.period === 'last_3_months' ? rate90d : ratePeriod;
  const monthlyPoints = metrics.bonusesMap[legacyId]?.points || 0;
  const ccLevel = monthlyPoints > 0 ? Math.floor(monthlyPoints / 100) + 1 : 1;

  // Determine Career Role (Chuyên Viên Mi: KTV, CV, CVL, CVLL, CC, FM)
  const careerRole = resolveListCareerRole(staff, legacyId, activeCcLegacyIds, selfComboRate, staffOrders90d);

  const rawAvatar = staff.avatarUrl || (staff.legacyStaffId ? metrics.legacyAvatarMap.get(staff.legacyStaffId) : null);
  const avatarUrl = normalizeAvatarUrl(rawAvatar);
  const prodRow = metrics.productivitySvcMap[legacyId];
  const productivity = computeHourlyProductivity({
    fullSetCount: prodRow?.fullSetCount ?? 0,
    comboRetainCount: prodRow?.comboRetainCount ?? 0,
    singleRetainCount: prodRow?.singleRetainCount ?? 0,
    serviceRevenue: prodRow?.serviceRevenue ?? 0,
    shiftHours: metrics.shiftHoursMap[legacyId] ?? 0,
    payrollHours: metrics.payrollHoursMap[legacyId] ?? 0,
  });

  const { qaAudit } = evaluateStaffQaAudits(
    staff.id,
    legacyId,
    periodConfig.periodStart,
    periodConfig.periodEnd,
    evaluatedWeeks,
    true
  );

  return {
    id: staff.id,
    displayName: staff.displayName || staff.username || `Nhân sự #${staff.id}`,
    username: staff.username,
    role: staff.role || 'technician',
    careerRole,
    avatarUrl,
    legacyStaffId: staff.legacyStaffId,
    ordersCount: staffOrders90d, // Riêng số bộ mi: luôn luôn giữ ở 90 ngày qua
    periodOrders: staffOrdersPeriod,
    targetOrders:
      careerRole === 'CC' || careerRole === 'FM'
        ? 0
        : ((careerRole === 'CV_PLUS'
            ? config.cvPlusToCvPlusPlus?.minOrders
            : config.cvToCvPlus?.minOrders || config.cvToCc?.minOrders) ?? 330),
    period: periodConfig.period,
    servicesPerHour: productivity.servicesPerHour,
    revenuePerHour: productivity.revenuePerHour,
    actualWorkingHours: productivity.actualWorkingHours,
    totalCompletedServices: productivity.totalCompletedServices,
    fullSetCount: productivity.fullSetCount,
    comboRetainCount: productivity.comboRetainCount,
    singleRetainCount: productivity.singleRetainCount,
    serviceRevenue: productivity.serviceRevenue,
    productivity,
    fixRate, // Bug trong kỳ được chọn
    totalTip,
    tipRatioAboveShop,
    staffTipRate, // % Tip trong kỳ được chọn
    shopTipRate,
    storeId: staffBranch.storeId,
    branchName: staffBranch.branchName,
    branchCode: staffBranch.branchCode,
    branchTipRate: staffBranch.tipRate,
    branchAvgTip: staffBranch.avgTip,
    selfComboRate,
    happinessIndex: metrics.hiMap[legacyId] ?? 0.75, // HI trong kỳ được chọn
    bananaCount: metrics.bananasMap[legacyId] ?? 0, // Chuối nhận trong kỳ được chọn
    bananaBalance: legacyId ? (metrics.bananaBalancesMap[legacyId] ?? 0) : 0,
    isBananaPassed:
      (metrics.bananasMap[legacyId] ?? 0) >=
      (periodConfig.period === 'last_3_months'
        ? ((careerRole === 'CV_PLUS' ? config.cvPlusToCvPlusPlus?.minBananaCount : config.cvToCvPlus?.minBananaCount) ??
            20) * 3
        : ((careerRole === 'CV_PLUS' ? config.cvPlusToCvPlusPlus?.minBananaCount : config.cvToCvPlus?.minBananaCount) ??
          20)),
    ccLevel: ['CC', 'FM'].includes(careerRole) ? ccLevel : null,
    monthlyPoints: ['CC', 'FM'].includes(careerRole) ? monthlyPoints : null,
    qaAuditPassed: qaAudit.totalAudits > 0 ? qaAudit.isPassed : false,
    hasFailedQaAudit: qaAudit.hasFailedAudit,
    weeklyQaAuditRate: qaAudit.weeklyAuditRate,
    qaAuditsCount: qaAudit.totalAudits,
  };
}

/**
 * Danh sách toàn bộ nhân viên tham gia lộ trình kèm chỉ số thực tế từ DB
 */
export async function listCareerStaff(
  fastify: FastifyInstance,
  query?: { role?: string; search?: string; period?: CareerPeriod; branch?: CareerBranchFilter | string }
): Promise<SafeAny[]> {
  // 1. Lấy danh sách ID Chuyên Viên và CC hoạt động từ cấu hình (ACTIVE_CV_STAFF_CONFIG, ACTIVE_CC_STAFF_CONFIG)
  let activeCvLegacyIds: number[] = [];
  let activeCcLegacyIds: number[] = [];
  try {
    if ((fastify.prisma.crm as SafeAny)?.crmTeam) {
      [activeCvLegacyIds, activeCcLegacyIds] = await Promise.all([
        TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG'),
        TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG'),
      ]);
    }
  } catch {
    // Safe fallback
  }

  const eligibleLegacyIds = Array.from(new Set([...activeCvLegacyIds, ...activeCcLegacyIds]));
  const INCLUDED_ROLES = ['lt', 'technician', 'cv', 'ktv', 'cc', 'fm'];
  const EXCLUDED_ROLES = [
    'office-cleaner',
    'security-guard',
    'telesales',
    'staff',
    'teacher',
    'admin',
    'super_admin',
    'oc',
    'ht',
  ];

  const where: SafeAny = {
    isActive: true,
    OR: [
      ...(eligibleLegacyIds.length > 0 ? [{ legacyStaffId: { in: eligibleLegacyIds } }] : []),
      { role: { in: INCLUDED_ROLES } },
      // Floor Managers (Quản lý tầng)
      { legacyStaffId: { in: [52086, 52454] } },
      { role: 'manager', displayName: { contains: 'FM' } },
      { role: 'manager', displayName: { contains: 'Floor' } },
    ],
    NOT: [{ role: { in: EXCLUDED_ROLES } }],
  };

  if (query?.search) {
    where.AND = [
      {
        OR: [{ displayName: { contains: query.search } }, { username: { contains: query.search } }],
      },
    ];
  }

  const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
    where,
    include: { careerProgression: true },
    orderBy: { displayName: 'asc' },
  });

  const config = await getCareerConfig(fastify);
  const periodConfig = resolveCareerPeriodDates(query?.period);

  const legacyIds = crmStaffList
    .map((s) => s.legacyStaffId)
    .filter((id): id is number => typeof id === 'number' && id > 0);

  // Bulk query performance: Số bộ mi luôn luôn giữ 90 ngày qua (300 bộ); Bug, Tip, HI, Chuối nhận tính theo kỳ được chọn
  const metrics = await fetchBulkStaffCareerMetrics(fastify, legacyIds, periodConfig);

  const evaluatedWeeks = Math.max(
    1,
    Math.round((periodConfig.periodEnd.getTime() - periodConfig.periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  const result = crmStaffList.map((staff) =>
    mapStaffToCareerListItem(staff, metrics, config, periodConfig, activeCcLegacyIds, evaluatedWeeks)
  );

  // Filter by query role and branch if specified
  const roleFilteredResult =
    query?.role && query.role !== 'ALL'
      ? result.filter((s) => {
          if (query.role === 'CV') return ['KTV', 'CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole);
          return s.careerRole === query.role;
        })
      : result;

  const filteredResult =
    query?.branch && query.branch !== 'ALL'
      ? roleFilteredResult.filter((s) => matchesCareerBranchFilter(s, query.branch))
      : roleFilteredResult;

  // Order by số bộ mi (ordersCount DESC) theo chuẩn nghiệp vụ, tie-break theo tên Chuyên Viên
  return filteredResult.sort((a, b) => {
    const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}
