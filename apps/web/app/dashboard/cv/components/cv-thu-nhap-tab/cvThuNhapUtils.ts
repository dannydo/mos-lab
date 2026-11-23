import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  normalizeCvFeatherRole,
  removeVietnameseTones,
  type CvPaystubRecord,
  type ReportComparisonMode,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export interface CvThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  currentUser?: Record<string, unknown> | null;
  comparisonMode: ReportComparisonMode;
}

export interface CvIncomeSummary {
  totalHourlyWage: number;
  totalCvXoayBonus: number;
  totalCvTipBonus: number;
  totalSeniorityBonus: number;
  totalHolidayBasePay: number;
  totalHolidayPremiumPay: number;
  totalHolidayPayrollAddition: number;
  totalTimeBonus: number;
  totalOffMonthWage: number;
  grandTotalIncome: number;
}

export interface CvSeniorityRule {
  minMonths: number;
  bonusPercent: number;
}

export interface CvProjectedRecord {
  projectedHourlyWage: number;
  projectedCvXoayBonus: number;
  projectedSeniorityBonus: number;
  projectedCvTipBonus: number;
  projectedHolidayPay: number;
  projectedTotalIncome: number;
}

export interface CvProjectedSummary {
  projectedHourlyWage: number;
  projectedCvXoayBonus: number;
  projectedSeniorityBonus: number;
  projectedCvTipBonus: number;
  projectedTotalIncome: number;
}

export interface CvIncomeForecastMeta {
  isDayMode: boolean;
  isMonthMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  ratio: number;
}

export interface CvWorkLogSummary {
  totalWorkDays: number;
  totalWorkHours: number;
  hourlyRate: number;
  totalWage: number;
}

export const EMPTY_CV_INCOME_SUMMARY: CvIncomeSummary = {
  totalHourlyWage: 0,
  totalCvXoayBonus: 0,
  totalCvTipBonus: 0,
  totalSeniorityBonus: 0,
  totalHolidayBasePay: 0,
  totalHolidayPremiumPay: 0,
  totalHolidayPayrollAddition: 0,
  totalTimeBonus: 0,
  totalOffMonthWage: 0,
  grandTotalIncome: 0,
};

export const EMPTY_CV_WORK_LOG_SUMMARY: CvWorkLogSummary = {
  totalWorkDays: 0,
  totalWorkHours: 0,
  hourlyRate: 0,
  totalWage: 0,
};

export const CV_PAYSTUB_PAGE_SIZE_STORAGE_KEY = 'cv_paystub_page_size';
export const CV_SENIORITY_POPOVER_WIDTH_STORAGE_KEY = 'cv_seniority_popover_width';
export const CV_WORKLOG_MODAL_WIDTH_STORAGE_KEY = 'cv_worklog_modal_width';

export const DEFAULT_CV_PAYSTUB_PAGE_SIZE = 20;
export const DEFAULT_POPOVER_WIDTH = 420;
export const MIN_POPOVER_RESIZE_WIDTH = 350;
export const DEFAULT_WORKLOG_MODAL_WIDTH = 800;
export const MIN_WORKLOG_MODAL_WIDTH = 600;
export const MAX_WORKLOG_MODAL_WIDTH = 1800;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'DT';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('ACADEMY') || s.includes('ADT')) return 'ADT';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('CMT8')) return 'CMT8';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

export function formatHoursToHoursMinutes(totalHours: number, compact = false): string {
  if (!totalHours || totalHours <= 0) return compact ? '0h' : '0 giờ';
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  if (mins <= 0) return compact ? `${hrs}h` : `${hrs} giờ`;
  return compact ? `${hrs}h ${mins}m` : `${hrs} giờ ${mins} phút`;
}

export function formatChipAmount(val: number, isUnlocked = true): string {
  if (!isUnlocked || val <= 0) return '0đ';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `+${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = Math.round(val / 1_000);
    return `+${formatted}k`;
  }
  return `+${val}đ`;
}

export function normalizeCvIncomeSummary(raw?: Partial<CvIncomeSummary> | null): CvIncomeSummary {
  return {
    totalHourlyWage: raw?.totalHourlyWage || 0,
    totalCvXoayBonus: raw?.totalCvXoayBonus || 0,
    totalCvTipBonus: raw?.totalCvTipBonus || 0,
    totalSeniorityBonus: raw?.totalSeniorityBonus || 0,
    totalHolidayBasePay: raw?.totalHolidayBasePay || 0,
    totalHolidayPremiumPay: raw?.totalHolidayPremiumPay || 0,
    totalHolidayPayrollAddition: raw?.totalHolidayPayrollAddition || 0,
    totalTimeBonus: raw?.totalTimeBonus || 0,
    totalOffMonthWage: raw?.totalOffMonthWage || 0,
    grandTotalIncome: raw?.grandTotalIncome || 0,
  };
}

export function computeElapsedRatioPercent(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  comparisonMode: ReportComparisonMode
): number {
  const now = dayjs();
  const currentHour = now.hour();
  const fractionToday = calculateFractionToday(currentHour);

  const start = dateRange?.[0] ? dayjs(dateRange[0]) : dayjs().startOf(comparisonMode === 'week' ? 'isoWeek' : 'month');
  const end = dateRange?.[1] ? dayjs(dateRange[1]) : dayjs().endOf(comparisonMode === 'week' ? 'isoWeek' : 'month');

  if (now.isBefore(start, 'day')) return 0.1;
  if (now.isAfter(end, 'day')) return 100;

  const totalDays = end.diff(start, 'day') + 1;
  const daysPassed = now.diff(start, 'day');
  const elapsedDays = daysPassed + fractionToday;
  const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(ratio * 1000) / 10;
}

export function computeCvIncomeForecastMeta(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  comparisonMode: ReportComparisonMode
): CvIncomeForecastMeta {
  const isDayMode = comparisonMode === 'day';
  const isMonthMode = comparisonMode === 'month';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';
  const elapsedRatioPercent = computeElapsedRatioPercent(dateRange, comparisonMode);
  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  return {
    isDayMode,
    isMonthMode,
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun,
    ratio,
  };
}

/**
 * Công thức chuẩn dự đoán CV Xoay cuối tháng (Exact Closed-Form Model):
 * - N_hat = round(serviceCount / ratio)
 * - Điểm kỹ thuật trung bình mỗi ca p_bar giải ngược từ bonus hiện tại (hoặc mặc định 35 pts)
 * - CV_Xoay = 1.000đ * [ (p_bar / 200) * N_hat^2 + (1 - p_bar / 200) * N_hat ]
 */
export function calculateProjectedCvXoay(serviceCount: number, currentBonus: number, ratio: number): number {
  if (ratio <= 0) return currentBonus;
  const safeRatio = Math.max(0.001, Math.min(1.0, ratio));
  if (serviceCount <= 0 && currentBonus <= 0) return 0;

  const nHat = serviceCount > 0 ? Math.round(serviceCount / safeRatio) : 0;
  if (nHat <= 0) return currentBonus;

  let pBar = 35;
  if (serviceCount >= 3 && currentBonus > 0) {
    const rawP = (200 * (currentBonus / 1000 - serviceCount)) / (serviceCount * (serviceCount - 1));
    if (!isNaN(rawP) && rawP > 5 && rawP < 80) {
      pBar = rawP;
    }
  }

  const factor = pBar / 200;
  const projected = 1000 * (factor * nHat * nHat + (1 - factor) * nHat);
  return Math.max(currentBonus, Math.round(projected));
}

export function computeProjectedCvRecord(record: CvPaystubRecord, meta: CvIncomeForecastMeta): CvProjectedRecord {
  const { isPastPeriod, ratio, isMonthMode } = meta;
  const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;

  if (isPastPeriod) {
    return {
      projectedHourlyWage: record.hourlyWage || 0,
      projectedCvXoayBonus: record.cvXoayBonus || 0,
      projectedSeniorityBonus: record.seniorityBonus || 0,
      projectedCvTipBonus: record.cvTipBonus || 0,
      projectedHolidayPay: holidayActual,
      projectedTotalIncome: record.totalIncome || 0,
    };
  }

  const projectedHourlyWage = Math.round((record.hourlyWage || 0) / (ratio || 1));

  // Vòng xoay là mô hình lũy tiến cấp số cộng Level reset theo tháng (số khách gấp đôi -> tiền thưởng gấp 4)
  // Sử dụng công thức chuẩn cấp số cộng (Exact Closed-Form Model). Không dự đoán theo tuần.
  const projectedCvXoayBonus = isMonthMode
    ? calculateProjectedCvXoay(record.serviceCount || 0, record.cvXoayBonus || 0, ratio)
    : 0;
  const projectedSeniorityBonus = isMonthMode
    ? Math.round((projectedCvXoayBonus * (record.seniorityBonusPercent || 0)) / 100)
    : 0;
  const projectedCvTipBonus = Math.round((record.cvTipBonus || 0) / (ratio || 1));
  const projectedHolidayPay = holidayActual;

  const projectedTotalIncome = isMonthMode
    ? projectedHourlyWage + projectedCvXoayBonus + projectedSeniorityBonus + projectedCvTipBonus + projectedHolidayPay
    : projectedHourlyWage +
      (record.cvXoayBonus || 0) +
      (record.seniorityBonus || 0) +
      projectedCvTipBonus +
      projectedHolidayPay;

  return {
    projectedHourlyWage,
    projectedCvXoayBonus,
    projectedSeniorityBonus,
    projectedCvTipBonus,
    projectedHolidayPay,
    projectedTotalIncome,
  };
}

export function computeProjectedCvSummary(
  summary: CvIncomeSummary,
  paystubData: CvPaystubRecord[],
  meta: CvIncomeForecastMeta
): CvProjectedSummary {
  const { isPastPeriod, ratio, isMonthMode } = meta;

  if (isPastPeriod) {
    return {
      projectedHourlyWage: summary.totalHourlyWage,
      projectedCvXoayBonus: summary.totalCvXoayBonus,
      projectedSeniorityBonus: summary.totalSeniorityBonus,
      projectedCvTipBonus: summary.totalCvTipBonus,
      projectedTotalIncome: summary.grandTotalIncome,
    };
  }

  const projectedHourlyWage = Math.round((summary.totalHourlyWage || 0) / (ratio || 1));
  const projectedCvXoayBonus = isMonthMode
    ? paystubData.length > 0
      ? paystubData.reduce((acc, r) => acc + (computeProjectedCvRecord(r, meta).projectedCvXoayBonus || 0), 0)
      : calculateProjectedCvXoay(0, summary.totalCvXoayBonus || 0, ratio)
    : 0;
  const projectedSeniorityBonus = isMonthMode
    ? paystubData.length > 0
      ? paystubData.reduce((acc, r) => acc + (computeProjectedCvRecord(r, meta).projectedSeniorityBonus || 0), 0)
      : Math.round((summary.totalSeniorityBonus || 0) / (ratio || 1))
    : 0;
  const projectedCvTipBonus = Math.round((summary.totalCvTipBonus || 0) / (ratio || 1));
  const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;

  const projectedTotalIncome = isMonthMode
    ? projectedHourlyWage + projectedCvXoayBonus + projectedSeniorityBonus + projectedCvTipBonus + holidayAddition
    : projectedHourlyWage +
      (summary.totalCvXoayBonus || 0) +
      (summary.totalSeniorityBonus || 0) +
      projectedCvTipBonus +
      holidayAddition;

  return {
    projectedHourlyWage,
    projectedCvXoayBonus,
    projectedSeniorityBonus,
    projectedCvTipBonus,
    projectedTotalIncome,
  };
}

export function filterCvPaystubRecords(paystubData: CvPaystubRecord[], searchText: string): CvPaystubRecord[] {
  if (!searchText) return paystubData;
  const featherRole = normalizeCvFeatherRole(searchText);
  if (featherRole === 'CVL') {
    return paystubData.filter((item) => Boolean(item.isCvPlus || item.cvPlusBreakdown));
  }
  const q = removeVietnameseTones(searchText);
  return paystubData.filter(
    (item) => removeVietnameseTones(item.staffName).includes(q) || removeVietnameseTones(item.store).includes(q)
  );
}

export function getSeniorityColorClass(percent: number): string {
  if (percent <= 0) return 'text-slate-500';
  if (percent <= 5) return 'text-blue-400';
  if (percent <= 10) return 'text-teal-400';
  if (percent <= 15) return 'text-emerald-400';
  if (percent <= 20) return 'text-amber-400';
  return 'text-purple-400';
}

export function clampWorkLogModalWidth(width: number): number {
  return Math.max(MIN_WORKLOG_MODAL_WIDTH, Math.min(MAX_WORKLOG_MODAL_WIDTH, width));
}
