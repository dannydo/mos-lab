import type { CareerPeriod, CareerProgressionConfig, CareerStaffSummary } from '@mos-lab/shared';
import { matchesCareerBranchFilter, matchesCareerRoleFilter } from '../../career-path.constants';
import type { CareerThresholdConfig, MetricStatus, PeriodTabItem } from './staffCareerSelectorTypes';

export const PERIOD_TABS: PeriodTabItem[] = [
  {
    key: 'last_month',
    label: 'Tháng trước',
    fullLabel: 'Tháng trước (chu kỳ hoàn tất gần nhất, không tính tháng này)',
  },
  { key: 'this_month', label: 'Tháng này', fullLabel: 'Tháng này (tính từ ngày 1 đến hiện tại)' },
  { key: 'last_30_days', label: '30 ngày qua', fullLabel: '30 ngày gần nhất tính đến hôm nay' },
  {
    key: 'last_3_months',
    label: '3 tháng trước',
    fullLabel: '3 tháng trước (quý hoàn tất gần nhất, không tính tháng này)',
  },
];

export function getPeriodLabel(period?: CareerPeriod): string {
  const currentPeriodTab = PERIOD_TABS.find((t) => t.key === period);
  return currentPeriodTab ? currentPeriodTab.label : 'tháng trước';
}

export function filterAndSortCareerStaff(
  staffList: CareerStaffSummary[],
  currentFilter: string,
  currentBranchFilter = 'ALL'
): CareerStaffSummary[] {
  const list = staffList.filter(
    (s) => matchesCareerRoleFilter(s, currentFilter) && matchesCareerBranchFilter(s, currentBranchFilter)
  );

  // Luôn sắp xếp danh sách theo số bộ mi (ordersCount) giảm dần (DESC)
  return [...list].sort((a, b) => {
    const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}

export function getStaffTipPercent(staff: CareerStaffSummary): number {
  if (typeof staff.staffTipRate === 'number') {
    return Number((staff.staffTipRate * 100).toFixed(1));
  }
  if (staff.ordersCount && staff.totalTip) {
    const raw = Math.min(0.65, Math.max(0.2, (staff.totalTip / (staff.ordersCount * 38000)) * 0.45));
    return Number((raw * 100).toFixed(1));
  }
  return 0;
}

export function getQaAuditsCount(staff: CareerStaffSummary): number {
  if (typeof staff.qaAuditsCount === 'number') {
    return staff.qaAuditsCount;
  }
  if (typeof staff.weeklyQaAuditRate === 'number') {
    return Math.round(staff.weeklyQaAuditRate * 4);
  }
  return 0;
}

export function getBananaBalance(staff: CareerStaffSummary): number {
  return typeof staff.bananaBalance === 'number' ? staff.bananaBalance : 0;
}

export function getStatusBadgeClass(status: MetricStatus): string {
  switch (status) {
    case 'passed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    case 'near':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
    case 'failed':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
  }
}

export function getStatusLabel(status: MetricStatus): string {
  switch (status) {
    case 'passed':
      return '✓ Đạt chuẩn';
    case 'near':
      return '⚡ Gần đạt';
    case 'failed':
      return '✕ Chưa đạt';
  }
}

export function resolveCareerThresholds(config?: CareerProgressionConfig): CareerThresholdConfig {
  const cvReq = config?.cvToCvPlus || config?.cvToCc;
  return {
    minOrdersConfig: cvReq?.minOrders ?? 330,
    maxFixRateConfig: cvReq?.maxFixRate ?? 0.015,
    minTipRatioAboveShop: cvReq?.minTipRatioAboveShop ?? 0.05,
    minHiConfig: cvReq?.minHappinessIndex ?? 0.7,
    minBananaConfig: cvReq?.minBananaCount ?? 20,
    minComboConfig: cvReq?.minSelfComboRate ?? 0.2,
    minQaAuditsConfig: cvReq?.minQaAudits ?? 4,
  };
}

export function getStaffBenchmarkReq(staff?: CareerStaffSummary, config?: CareerProgressionConfig) {
  if (staff?.careerRole === 'CV_PLUS') {
    return config?.cvPlusToCvPlusPlus || config?.cvToCvPlus || config?.cvToCc;
  }
  return config?.cvToCvPlus || config?.cvToCc;
}

export function getOrdersStatus(orders: number, targetOrders: number): MetricStatus {
  if (orders >= targetOrders) return 'passed';
  if (orders >= Math.round(targetOrders * 0.8)) return 'near';
  return 'failed';
}

export function getFixStatus(fixRate: number, targetMaxFix: number): MetricStatus {
  const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
  const maxFixPct = Number((targetMaxFix * 100).toFixed(1));
  if (fixPct <= maxFixPct) return 'passed';
  if (fixPct <= maxFixPct + 0.5) return 'near';
  return 'failed';
}

export function getTipStatus(staff: CareerStaffSummary, targetRatioAboveShop: number): MetricStatus {
  const tipPct = getStaffTipPercent(staff);
  const branchTipRate = staff.shopTipRate || staff.branchTipRate || 0.45;
  const targetTipPct = Number((branchTipRate * (1 + targetRatioAboveShop) * 100).toFixed(1));
  const nearTipPct = Number((branchTipRate * (1 + targetRatioAboveShop * 0.5) * 100).toFixed(1));

  if (tipPct >= targetTipPct) return 'passed';
  if (tipPct >= nearTipPct) return 'near';
  return 'failed';
}

export function getQaStatus(staff: CareerStaffSummary, targetAudits: number): MetricStatus {
  if (staff.hasFailedQaAudit) return 'failed';
  const audits = getQaAuditsCount(staff);
  if (audits >= targetAudits) return 'passed';
  if (audits >= Math.max(1, targetAudits - 1)) return 'near';
  return 'failed';
}

export function getHiStatus(hi: number, targetHi: number): MetricStatus {
  const hiPct = Math.round((hi || 0.75) * 100);
  const targetHiPct = Math.round(targetHi * 100);
  if (hiPct >= targetHiPct) return 'passed';
  if (hiPct >= targetHiPct - 5) return 'near';
  return 'failed';
}

export function getBananaCountStatus(count: number, targetBanana: number): MetricStatus {
  if (count >= targetBanana) return 'passed';
  if (count >= Math.round(targetBanana * 0.75)) return 'near';
  return 'failed';
}

export function getBananaBalanceStatus(balance: number): MetricStatus {
  if (balance >= 0) return 'passed';
  if (balance >= -500) return 'near';
  return 'failed';
}

export function getStaffComboPercent(staff: CareerStaffSummary): number {
  return Number(((staff.selfComboRate || 0) * 100).toFixed(1));
}

export function getComboStatus(staff: CareerStaffSummary, targetCombo: number): MetricStatus {
  const comboPct = getStaffComboPercent(staff);
  const targetComboPct = Number((targetCombo * 100).toFixed(1));
  if (comboPct >= targetComboPct) return 'passed';
  if (comboPct >= targetComboPct * 0.7) return 'near';
  return 'failed';
}

export function getStaffOverallStatus(staff: CareerStaffSummary, config?: CareerProgressionConfig): MetricStatus {
  if (['CV_PLUS', 'CV_PLUS_PLUS', 'MASTER_TECH'].includes(staff.careerRole)) {
    return 'passed';
  }

  const thresholds = resolveCareerThresholds(config);
  const req = getStaffBenchmarkReq(staff, config);
  const targetOrders = req?.minOrders ?? thresholds.minOrdersConfig;
  const targetFix = req?.maxFixRate ?? thresholds.maxFixRateConfig;
  const targetTip = req?.minTipRatioAboveShop ?? thresholds.minTipRatioAboveShop;
  const targetQa = req?.minQaAudits ?? thresholds.minQaAuditsConfig;
  const targetHi = req?.minHappinessIndex ?? thresholds.minHiConfig;
  const targetBanana = req?.minBananaCount ?? thresholds.minBananaConfig;

  const sOrders = getOrdersStatus(staff.ordersCount || 0, targetOrders);
  const sFix = getFixStatus(staff.fixRate || 0, targetFix);
  const sTip = getTipStatus(staff, targetTip);
  const sQa = getQaStatus(staff, targetQa);
  const sHi = getHiStatus(staff.happinessIndex || 0.75, targetHi);
  const sBanana = getBananaCountStatus(staff.bananaCount || 0, targetBanana);
  const sBalance = getBananaBalanceStatus(getBananaBalance(staff));

  const list = [sOrders, sFix, sTip, sQa, sHi, sBanana, sBalance];
  const passed = list.filter((s) => s === 'passed').length;
  const failed = list.filter((s) => s === 'failed').length;

  if (passed >= 4 && failed <= 1) return 'passed';
  if (failed >= 4 || passed < 2) return 'failed';
  return 'near';
}
