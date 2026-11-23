import type { CareerBranchFilter, CareerProgressionConfig, CareerStaffSummary } from '@mos-lab/shared';

export interface MobileStaffCareerSheetProps {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  config?: CareerProgressionConfig;
  activeBranchFilter?: CareerBranchFilter | string;
  onBranchFilterChange?: (branch: string) => void;
  onClose: () => void;
}

export type MetricStatus = 'passed' | 'near' | 'failed';

export const MOBILE_ROLE_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'KTV', label: 'KTV' },
  { key: 'CV', label: 'CV' },
  { key: 'CV_PLUS', label: 'CVL' },
  { key: 'CV_PLUS_PLUS', label: 'CVLL' },
  { key: 'CC', label: 'CC' },
  { key: 'FM', label: 'FM' },
] as const;

export interface MobileCareerThresholds {
  minOrdersConfig: number;
  maxFixRateConfig: number;
  minTipRatioAboveShop: number;
  minBananaConfig: number;
  minComboConfig: number;
  minQaAuditsConfig: number;
}

export interface MobileStaffCardComputedMetrics {
  overallStatus: MetricStatus;
  tipRate: number;
  fixRate: number;
  qaAudits: number;
  comboRate: number;
  targetOrders: number;
  targetMaxFixPct: number;
  targetTipRatio: number;
  targetQaAudits: number;
  targetComboPct: number;
  targetBanana: number;
  sOrders: MetricStatus;
  sFix: MetricStatus;
  sTip: MetricStatus;
  sQa: MetricStatus;
  sCombo: MetricStatus;
  sBanana: MetricStatus;
}

export function resolveMobileThresholds(config?: CareerProgressionConfig): MobileCareerThresholds {
  const cvReq = config?.cvToCvPlus || config?.cvToCc;
  return {
    minOrdersConfig: cvReq?.minOrders ?? 330,
    maxFixRateConfig: cvReq?.maxFixRate ?? 0.015,
    minTipRatioAboveShop: cvReq?.minTipRatioAboveShop ?? 0.05,
    minBananaConfig: cvReq?.minBananaCount ?? 20,
    minComboConfig: cvReq?.minSelfComboRate ?? 0.2,
    minQaAuditsConfig: cvReq?.minQaAudits ?? 4,
  };
}

export function getMobileBenchmarkReq(staff?: CareerStaffSummary, config?: CareerProgressionConfig) {
  if (staff?.careerRole === 'CV_PLUS') {
    return config?.cvPlusToCvPlusPlus || config?.cvToCvPlus || config?.cvToCc;
  }
  return config?.cvToCvPlus || config?.cvToCc;
}

export function getMobileStaffTipPercent(staff: CareerStaffSummary): number {
  if (typeof staff.staffTipRate === 'number') {
    return Number((staff.staffTipRate * 100).toFixed(1));
  }
  if (staff.ordersCount && staff.totalTip) {
    const raw = Math.min(0.65, Math.max(0.2, (staff.totalTip / (staff.ordersCount * 38000)) * 0.45));
    return Number((raw * 100).toFixed(1));
  }
  return 0;
}

export function getMobileQaAuditsCount(staff: CareerStaffSummary): number {
  if (typeof staff.qaAuditsCount === 'number') return staff.qaAuditsCount;
  if (typeof staff.weeklyQaAuditRate === 'number') return Math.round(staff.weeklyQaAuditRate * 4);
  return 0;
}

export function getMobileStaffComboPercent(staff: CareerStaffSummary): number {
  return Number(((staff.selfComboRate || 0) * 100).toFixed(1));
}

export function getMobileOrdersStatus(orders: number, targetOrders: number): MetricStatus {
  if (orders >= targetOrders) return 'passed';
  if (orders >= Math.round(targetOrders * 0.8)) return 'near';
  return 'failed';
}

export function getMobileFixStatus(fixRate: number, targetMaxFix: number): MetricStatus {
  const fixPct = Number(((fixRate || 0) * 100).toFixed(1));
  const maxFixPct = Number((targetMaxFix * 100).toFixed(1));
  if (fixPct <= maxFixPct) return 'passed';
  if (fixPct <= maxFixPct + 0.5) return 'near';
  return 'failed';
}

export function getMobileTipStatus(staff: CareerStaffSummary, targetRatioAboveShop: number): MetricStatus {
  const tipPct = getMobileStaffTipPercent(staff);
  const branchTipRate = staff.shopTipRate || staff.branchTipRate || 0.45;
  const targetTipPct = Number((branchTipRate * (1 + targetRatioAboveShop) * 100).toFixed(1));
  const nearTipPct = Number((branchTipRate * (1 + targetRatioAboveShop * 0.5) * 100).toFixed(1));
  if (tipPct >= targetTipPct) return 'passed';
  if (tipPct >= nearTipPct) return 'near';
  return 'failed';
}

export function getMobileQaStatus(staff: CareerStaffSummary, targetAudits: number): MetricStatus {
  if (staff.hasFailedQaAudit) return 'failed';
  const audits = getMobileQaAuditsCount(staff);
  if (audits >= targetAudits) return 'passed';
  if (audits >= Math.max(1, targetAudits - 1)) return 'near';
  return 'failed';
}

export function getMobileComboStatus(staff: CareerStaffSummary, targetCombo: number): MetricStatus {
  const comboPct = getMobileStaffComboPercent(staff);
  const targetComboPct = Number((targetCombo * 100).toFixed(1));
  if (comboPct >= targetComboPct) return 'passed';
  if (comboPct >= targetComboPct * 0.7) return 'near';
  return 'failed';
}

export function getMobileBananaStatus(count: number, targetBanana: number): MetricStatus {
  if (count >= targetBanana) return 'passed';
  if (count >= Math.round(targetBanana * 0.75)) return 'near';
  return 'failed';
}

export function getMobileBadgeClass(status: MetricStatus): string {
  switch (status) {
    case 'passed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'near':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'failed':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }
}

export function computeMobileStaffCardMetrics(
  staff: CareerStaffSummary,
  thresholds: MobileCareerThresholds,
  config?: CareerProgressionConfig
): MobileStaffCardComputedMetrics {
  const req = getMobileBenchmarkReq(staff, config);
  const targetOrders = req?.minOrders ?? thresholds.minOrdersConfig;
  const targetFix = req?.maxFixRate ?? thresholds.maxFixRateConfig;
  const targetMaxFixPct = Number((targetFix * 100).toFixed(1));
  const targetTipRatio = req?.minTipRatioAboveShop ?? thresholds.minTipRatioAboveShop;
  const targetQaAudits = req?.minQaAudits ?? thresholds.minQaAuditsConfig;
  const targetCombo = req?.minSelfComboRate ?? thresholds.minComboConfig;
  const targetComboPct = Number((targetCombo * 100).toFixed(1));
  const targetBanana = req?.minBananaCount ?? thresholds.minBananaConfig;

  const sOrders = getMobileOrdersStatus(staff.ordersCount || 0, targetOrders);
  const sFix = getMobileFixStatus(staff.fixRate || 0, targetFix);
  const sTip = getMobileTipStatus(staff, targetTipRatio);
  const sQa = getMobileQaStatus(staff, targetQaAudits);
  const sCombo = getMobileComboStatus(staff, targetCombo);
  const sBanana = getMobileBananaStatus(staff.bananaCount || 0, targetBanana);

  let overallStatus: MetricStatus;
  if (['CV_PLUS', 'CV_PLUS_PLUS', 'MASTER_TECH'].includes(staff.careerRole)) {
    overallStatus = 'passed';
  } else {
    const list = [sOrders, sFix, sTip, sQa, sCombo, sBanana];
    const passed = list.filter((s) => s === 'passed').length;
    const failed = list.filter((s) => s === 'failed').length;
    if (passed >= 4 && failed <= 1) overallStatus = 'passed';
    else if (failed >= 4 || passed < 2) overallStatus = 'failed';
    else overallStatus = 'near';
  }

  return {
    overallStatus,
    tipRate: getMobileStaffTipPercent(staff),
    fixRate: Number(((staff.fixRate || 0) * 100).toFixed(1)),
    qaAudits: getMobileQaAuditsCount(staff),
    comboRate: getMobileStaffComboPercent(staff),
    targetOrders,
    targetMaxFixPct,
    targetTipRatio,
    targetQaAudits,
    targetComboPct,
    targetBanana,
    sOrders,
    sFix,
    sTip,
    sQa,
    sCombo,
    sBanana,
  };
}
