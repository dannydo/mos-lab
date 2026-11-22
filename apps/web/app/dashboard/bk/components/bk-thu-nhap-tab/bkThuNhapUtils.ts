import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  DEFAULT_BK_REV_BONUS_TIERS,
  getRevCommissionRate,
  type BkPaystubRecord,
  type BkPaystubResponse,
  type ReportComparisonMode,
  type SafeAny,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

dayjs.extend(isoWeek);

export interface BkThuNhapTabProps {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export interface BkIncomeSummary {
  totalBaseSalary: number;
  totalDoneBonus: number;
  totalTipBonus: number;
  totalRevenue: number;
  totalRevenueBonus: number;
  totalHolidayBasePay: number;
  totalHolidayPremiumPay: number;
  totalHolidayPayrollAddition: number;
  grandTotalIncome: number;
}

export const EMPTY_BK_INCOME_SUMMARY: BkIncomeSummary = {
  totalBaseSalary: 0,
  totalDoneBonus: 0,
  totalTipBonus: 0,
  totalRevenue: 0,
  totalRevenueBonus: 0,
  totalHolidayBasePay: 0,
  totalHolidayPremiumPay: 0,
  totalHolidayPayrollAddition: 0,
  grandTotalIncome: 0,
};

export interface BkProjectedRecord {
  projectedBaseSalary: number;
  projectedDoneBonus: number;
  projectedTipBonus: number;
  projectedRevenue: number;
  projectedRevRate: number;
  projectedRevenueBonus: number;
  projectedHolidayPay: number;
  projectedTotalIncome: number;
}

export interface BkProjectedSummary {
  projectedBaseSalary: number;
  projectedDoneBonus: number;
  projectedRevenueBonus: number;
  projectedTipBonus: number;
  projectedTotalIncome: number;
}

export interface BkIncomeForecastMeta {
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  ratio: number;
}

/** Formats a store name or code into a compact branch abbreviation (defaults to HQ for BK income views). */
export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

/** Formats a VND amount with standard Vietnamese currency formatting. */
export const formatBkIncomeCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

/** Normalizes a BK paystub API summary object with safe zero fallbacks. */
export function normalizeBkPaystubSummary(summary?: Partial<BkPaystubResponse['summary']> | null): BkIncomeSummary {
  if (!summary) return { ...EMPTY_BK_INCOME_SUMMARY };
  return {
    totalBaseSalary: summary.totalBaseSalary || 0,
    totalDoneBonus: summary.totalDoneBonus || 0,
    totalTipBonus: summary.totalTipBonus || 0,
    totalRevenue: summary.totalRevenue || 0,
    totalRevenueBonus: summary.totalRevenueBonus || 0,
    totalHolidayBasePay: summary.totalHolidayBasePay || 0,
    totalHolidayPremiumPay: summary.totalHolidayPremiumPay || 0,
    totalHolidayPayrollAddition: summary.totalHolidayPayrollAddition || 0,
    grandTotalIncome: summary.grandTotalIncome || 0,
  };
}

/** Computes the elapsed percentage of the selected week or month period for run-rate forecasting. */
export function computeBkIncomeElapsedRatioPercent(
  dateRange: [SafeAny, SafeAny] | undefined,
  comparisonMode: ReportComparisonMode
): number {
  const now = dayjs();
  const fractionToday = calculateFractionToday(now.hour());

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

/** Builds forecast metadata (mode, closure state, elapsed ratio, and Vietnamese period noun). */
export function computeBkIncomeForecastMeta(
  dateRange: [SafeAny, SafeAny] | undefined,
  comparisonMode: ReportComparisonMode
): BkIncomeForecastMeta {
  const elapsedRatioPercent = computeBkIncomeElapsedRatioPercent(dateRange, comparisonMode);
  const isPastPeriod = elapsedRatioPercent >= 100;
  return {
    isDayMode: comparisonMode === 'day',
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun: comparisonMode === 'week' ? 'tuần' : 'tháng',
    ratio: (elapsedRatioPercent || 100) / 100,
  };
}

/** Extrapolates an individual Booker paystub record to end-of-period projected earnings. */
export function computeProjectedBkRecord(
  record: BkPaystubRecord,
  isPastPeriod: boolean,
  ratio: number
): BkProjectedRecord {
  const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;
  if (isPastPeriod) {
    return {
      projectedBaseSalary: record.calculatedBaseSalary || 0,
      projectedDoneBonus: record.doneBonus || 0,
      projectedTipBonus: record.tipBonus || 0,
      projectedRevenue: record.totalRevenue || 0,
      projectedRevRate: record.revCommissionRate || 0,
      projectedRevenueBonus: record.revenueBonus || 0,
      projectedHolidayPay: holidayActual,
      projectedTotalIncome: record.totalIncome || 0,
    };
  }

  const safeRatio = ratio || 1;
  const standardDays = record.standardWorkDays || 26;
  const actualDays = record.actualWorkDays || 0;
  const projectedDays =
    actualDays > 0 ? Math.min(standardDays, Math.max(actualDays, Math.round(actualDays / safeRatio))) : 0;

  const projectedBaseSalary =
    standardDays > 0
      ? Math.round(((record.monthlyBaseSalary || 0) / standardDays) * projectedDays)
      : record.calculatedBaseSalary || 0;

  const projectedDoneBonus = Math.round((record.doneBonus || 0) / safeRatio);
  const projectedTipBonus = Math.round((record.tipBonus || 0) / safeRatio);
  const currentRev = record.totalRevenue || 0;
  const projectedRevenue = Math.round(currentRev / safeRatio);
  const projectedRevRate = getRevCommissionRate(projectedRevenue, DEFAULT_BK_REV_BONUS_TIERS);
  const projectedRevenueBonus = Math.round((projectedRevenue * projectedRevRate) / 100);
  const projectedHolidayPay = holidayActual;

  const projectedTotalIncome =
    projectedBaseSalary + projectedDoneBonus + projectedTipBonus + projectedRevenueBonus + projectedHolidayPay;

  return {
    projectedBaseSalary,
    projectedDoneBonus,
    projectedTipBonus,
    projectedRevenue,
    projectedRevRate,
    projectedRevenueBonus,
    projectedHolidayPay,
    projectedTotalIncome,
  };
}

/** Aggregates end-of-period projected income across all Booker paystub rows. */
export function computeProjectedBkSummary(
  summary: BkIncomeSummary,
  paystubs: BkPaystubRecord[],
  isPastPeriod: boolean,
  ratio: number
): BkProjectedSummary {
  if (isPastPeriod) {
    return {
      projectedBaseSalary: summary.totalBaseSalary,
      projectedDoneBonus: summary.totalDoneBonus,
      projectedRevenueBonus: summary.totalRevenueBonus,
      projectedTipBonus: summary.totalTipBonus,
      projectedTotalIncome: summary.grandTotalIncome,
    };
  }

  const safeRatio = ratio || 1;
  let sumProjectedBase = 0;
  let sumProjectedRevenueBonus = 0;

  if (paystubs.length > 0) {
    for (const record of paystubs) {
      const proj = computeProjectedBkRecord(record, false, safeRatio);
      sumProjectedBase += proj.projectedBaseSalary;
      sumProjectedRevenueBonus += proj.projectedRevenueBonus || 0;
    }
  } else {
    sumProjectedBase = Math.round((summary.totalBaseSalary || 0) / safeRatio);
    const projRev = Math.round((summary.totalRevenue || 0) / safeRatio);
    const rate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
    sumProjectedRevenueBonus = Math.round((projRev * rate) / 100);
  }

  const projectedDoneBonus = Math.round((summary.totalDoneBonus || 0) / safeRatio);
  const projectedTipBonus = Math.round((summary.totalTipBonus || 0) / safeRatio);
  const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;
  const projectedTotalIncome =
    sumProjectedBase + projectedDoneBonus + sumProjectedRevenueBonus + projectedTipBonus + holidayAddition;

  return {
    projectedBaseSalary: sumProjectedBase,
    projectedDoneBonus,
    projectedRevenueBonus: sumProjectedRevenueBonus,
    projectedTipBonus,
    projectedTotalIncome,
  };
}

const BADGE_COLOR_TO_STATUS: Record<string, StatusType> = {
  green: 'success',
  success: 'success',
  blue: 'processing',
  processing: 'processing',
  red: 'error',
  error: 'error',
  gold: 'gold',
  yellow: 'warning',
  warning: 'warning',
  cyan: 'cyan',
  purple: 'purple',
  orange: 'orange',
  default: 'default',
};

/** Maps legacy Antd tag color strings from shared attendance exception configs into StatusTag tones. */
export function mapExceptionBadgeColorToStatus(color?: string | null): StatusType {
  if (!color) return 'default';
  return BADGE_COLOR_TO_STATUS[color] ?? 'default';
}
