import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  CcDiamondEntry,
  CcPaystubRecord,
  CcPaystubResponse,
  CcTipRecord,
  ReportPeriodComparison,
  TipFilterType,
  calculateFractionToday,
  removeVietnameseTones,
} from '@mos-lab/shared';
import type { CcIncomeSummary } from '~/components/cc-thu-nhap/CcIncomeSummaryCards';

dayjs.extend(isoWeek);

export type CcIncomeComparisonMode = 'month' | 'week' | 'day';

export interface CcThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  comparisonMode?: CcIncomeComparisonMode;
}

export interface ProjectedCcIncomeRecord {
  projectedHourlyWage: number;
  projectedCcXoayBonus: number;
  projectedComboProductBonus: number;
  projectedCcTipBonus: number;
  projectedDiamondBonus: number;
  projectedMinigameBonus: number;
  projectedHolidayPay: number;
  projectedTotalIncome: number;
}

export interface ProjectedCcIncomeSummary {
  projectedHourlyWage: number;
  projectedCcXoayBonus: number;
  projectedComboProductBonus: number;
  projectedCcTipBonus: number;
  projectedMinigameBonus: number;
  projectedTotalIncome: number;
}

export interface WorkLogModalSummary {
  totalWorkDays: number;
  totalWorkHours: number;
  hourlyRate: number;
  totalWage: number;
}

export interface CcXoayModalSummary {
  totalCheckins: number;
  totalBonus: number;
  totalPoints: number;
}

export interface TipModalSummary {
  totalCustomerTip: number;
  totalCcTipBonus: number;
  tippedCount: number;
  smallChangeCount: number;
  noTipCount: number;
  totalVisits: number;
}

export const WORKLOG_MODAL_WIDTH_DEFAULT = 800;
export const WORKLOG_MODAL_WIDTH_MIN = 600;
export const WORKLOG_MODAL_WIDTH_MAX = 1800;
export const WORKLOG_MODAL_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const DEFAULT_CC_INCOME_SUMMARY: CcIncomeSummary = {
  totalHourlyWage: 0,
  totalCcXoayBonus: 0,
  totalComboProductBonus: 0,
  totalMinigameBonus: 0,
  totalCcTipBonus: 0,
  totalExtraSupport: 0,
  totalTrainingMentorshipBonus: 0,
  totalHolidayBasePay: 0,
  totalHolidayPremiumPay: 0,
  totalHolidayPayrollAddition: 0,
  totalDiamondBonus: 0,
  grandTotalIncome: 0,
};

export const DEFAULT_WORKLOG_SUMMARY: WorkLogModalSummary = {
  totalWorkDays: 0,
  totalWorkHours: 0,
  hourlyRate: 25000,
  totalWage: 0,
};

export const DEFAULT_CC_XOAY_SUMMARY: CcXoayModalSummary = {
  totalCheckins: 0,
  totalBonus: 0,
  totalPoints: 0,
};

export function formatHoursToHoursMinutes(totalHours: number, compact = false): string {
  if (!totalHours || totalHours <= 0) return compact ? '0h' : '0 giờ';
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  if (mins <= 0) return compact ? `${hrs}h` : `${hrs} giờ`;
  return compact ? `${hrs}h ${mins}m` : `${hrs} giờ ${mins} phút`;
}

export function formatCcRankBadge(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

export function getComparisonPeriod(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  mode: CcIncomeComparisonMode
): ReportPeriodComparison | null {
  const start = dateRange?.[0] || dayjs().startOf('month');
  const selectedEnd = dateRange?.[1] || dayjs().endOf('month');
  const now = dayjs();
  if (start.isAfter(now)) return null;

  const effectiveEnd = selectedEnd.isAfter(now) ? now : selectedEnd.endOf('day');
  const shift = (value: dayjs.Dayjs) =>
    mode === 'month' ? value.subtract(1, 'month') : value.subtract(mode === 'week' ? 7 : 1, 'day');
  const comparisonStart = shift(start);
  const comparisonEnd = shift(effectiveEnd);

  return {
    mode,
    dateFrom: comparisonStart.format('YYYY-MM-DD'),
    dateTo: comparisonEnd.format('YYYY-MM-DD'),
  } satisfies ReportPeriodComparison;
}

export function computeCcIncomeElapsedRatioPercent(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  comparisonMode: CcIncomeComparisonMode
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

/**
 * Công thức chuẩn dự đoán CC Xoay cuối tháng (Exact Closed-Form Model):
 * - N_hat = round(checkinCount / ratio)
 * - Hệ số c tăng trưởng mỗi ca giải ngược từ bonus hiện tại (hoặc mặc định 3.65đ/ca)
 * - CC_Xoay_Raw = c * N_hat * (N_hat - 1) + 45 * N_hat
 * - Giới hạn trần 1.5x Daily Bonus nếu có monthlyDailyBonus
 */
export function calculateProjectedCcXoay(
  checkinCount: number,
  currentBonus: number,
  ratio: number,
  monthlyDailyBonus?: number
): number {
  if (ratio <= 0) return currentBonus;
  const safeRatio = Math.max(0.001, Math.min(1.0, ratio));
  if (checkinCount <= 0 && currentBonus <= 0) return 0;

  const nHat = checkinCount > 0 ? Math.round(checkinCount / safeRatio) : 0;
  if (nHat <= 0) return currentBonus;

  let c = 3.65;
  if (checkinCount >= 4 && currentBonus > 0) {
    const rawC = (currentBonus - 45 * checkinCount) / (checkinCount * (checkinCount - 1));
    if (!isNaN(rawC) && rawC >= 1.5 && rawC <= 8.0) {
      c = rawC;
    }
  }

  const rawProjected = Math.max(currentBonus, Math.round(c * nHat * (nHat - 1) + 45 * nHat));

  if (monthlyDailyBonus && monthlyDailyBonus > 0) {
    const projectedDailyBonus = Math.round(monthlyDailyBonus / safeRatio);
    const maxAllowed = Math.round(projectedDailyBonus * 1.5);
    return Math.min(rawProjected, maxAllowed);
  }

  return rawProjected;
}

export function buildProjectedCcRecord(
  record: CcPaystubRecord,
  options: { isPastPeriod: boolean; ratio: number; isMonthMode: boolean }
): ProjectedCcIncomeRecord {
  const { isPastPeriod, ratio, isMonthMode } = options;
  const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;

  if (isPastPeriod) {
    return {
      projectedHourlyWage: record.hourlyWage || 0,
      projectedCcXoayBonus: record.ccXoayBonus || 0,
      projectedComboProductBonus: record.comboProductBonus || 0,
      projectedCcTipBonus: record.ccTipBonus || 0,
      projectedDiamondBonus: record.diamondBonus || 0,
      projectedMinigameBonus: record.minigameBonus || 0,
      projectedHolidayPay: holidayActual,
      projectedTotalIncome: record.totalIncome || 0,
    };
  }

  const projectedHourlyWage = Math.round((record.hourlyWage || 0) / (ratio || 1));

  // Vòng xoay là mô hình lũy tiến cấp số cộng Level reset theo tháng (số khách gấp đôi -> tiền thưởng gấp 4)
  // Sử dụng công thức chuẩn cấp số cộng (Exact Closed-Form Model). Không dự đoán theo tuần.
  const projectedCcXoayBonus = isMonthMode
    ? calculateProjectedCcXoay(
        record.checkinCount || 0,
        record.rawCcXoayBonus ?? record.ccXoayBonus ?? 0,
        ratio,
        record.monthlyDailyBonus
      )
    : 0;
  const projectedComboProductBonus = Math.round((record.comboProductBonus || 0) / (ratio || 1));
  const projectedCcTipBonus = Math.round((record.ccTipBonus || 0) / (ratio || 1));
  const projectedDiamondBonus = Math.round((record.diamondBonus || 0) / (ratio || 1));
  const projectedMinigameBonus = Math.round((record.minigameBonus || 0) / (ratio || 1));
  const projectedHolidayPay = holidayActual;

  const trainingBonusActual = record.trainingMentorshipBonus || 0;
  const projectedTotalIncome = isMonthMode
    ? projectedHourlyWage +
      projectedCcXoayBonus +
      projectedComboProductBonus +
      projectedCcTipBonus +
      projectedDiamondBonus +
      projectedMinigameBonus +
      projectedHolidayPay +
      trainingBonusActual
    : projectedHourlyWage +
      (record.ccXoayBonus || 0) +
      projectedComboProductBonus +
      projectedCcTipBonus +
      projectedDiamondBonus +
      projectedMinigameBonus +
      projectedHolidayPay +
      trainingBonusActual;

  return {
    projectedHourlyWage,
    projectedCcXoayBonus,
    projectedComboProductBonus,
    projectedCcTipBonus,
    projectedDiamondBonus,
    projectedMinigameBonus,
    projectedHolidayPay,
    projectedTotalIncome,
  };
}

export function buildProjectedCcSummary(
  summary: CcIncomeSummary,
  paystubData: CcPaystubRecord[],
  options: { isPastPeriod: boolean; ratio: number; isMonthMode: boolean }
): ProjectedCcIncomeSummary {
  const { isPastPeriod, ratio, isMonthMode } = options;

  if (isPastPeriod) {
    return {
      projectedHourlyWage: summary.totalHourlyWage,
      projectedCcXoayBonus: summary.totalCcXoayBonus,
      projectedComboProductBonus: summary.totalComboProductBonus,
      projectedCcTipBonus: summary.totalCcTipBonus,
      projectedMinigameBonus: summary.totalMinigameBonus,
      projectedTotalIncome: summary.grandTotalIncome,
    };
  }

  const projectedHourlyWage = Math.round((summary.totalHourlyWage || 0) / (ratio || 1));
  const projectedCcXoayBonus = isMonthMode
    ? paystubData.length > 0
      ? paystubData.reduce((acc, r) => acc + (buildProjectedCcRecord(r, options).projectedCcXoayBonus || 0), 0)
      : calculateProjectedCcXoay(0, summary.totalCcXoayBonus || 0, ratio)
    : 0;
  const projectedComboProductBonus = Math.round((summary.totalComboProductBonus || 0) / (ratio || 1));
  const projectedCcTipBonus = Math.round((summary.totalCcTipBonus || 0) / (ratio || 1));
  const projectedMinigameBonus = Math.round((summary.totalMinigameBonus || 0) / (ratio || 1));
  const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;
  const trainingTotal = summary.totalTrainingMentorshipBonus || 0;

  const projectedTotalIncome = isMonthMode
    ? projectedHourlyWage +
      projectedCcXoayBonus +
      projectedComboProductBonus +
      projectedCcTipBonus +
      projectedMinigameBonus +
      (summary.totalDiamondBonus || 0) +
      holidayAddition +
      trainingTotal
    : projectedHourlyWage +
      (summary.totalCcXoayBonus || 0) +
      projectedComboProductBonus +
      projectedCcTipBonus +
      projectedMinigameBonus +
      (summary.totalDiamondBonus || 0) +
      holidayAddition +
      trainingTotal;

  return {
    projectedHourlyWage,
    projectedCcXoayBonus,
    projectedComboProductBonus,
    projectedCcTipBonus,
    projectedMinigameBonus,
    projectedTotalIncome,
  };
}

export function enrichCcPaystubRecords(
  data: CcPaystubRecord[],
  diamondData?: CcDiamondEntry[]
): { enrichedData: CcPaystubRecord[]; sumDiamond: number } {
  const diamondMap = new Map<number, { thuong: number; cnt: number }>();
  if (diamondData) {
    for (const item of diamondData) {
      diamondMap.set(item.ccId, { thuong: item.thuongDiamond, cnt: item.soKhachDiamond });
    }
  }

  let sumDiamond = 0;
  const enrichedData = data.map((r) => {
    const dInfo = diamondMap.get(r.consultantId) || { thuong: 0, cnt: 0 };
    sumDiamond += dInfo.thuong;
    const totalInc = (r.totalIncome || 0) + dInfo.thuong;
    const netInc =
      r.netIncome != null ? r.netIncome + dInfo.thuong : Math.round(totalInc - (r.socialSecurityAmount || 0));

    return {
      ...r,
      diamondBonus: dInfo.thuong,
      diamondCount: dInfo.cnt,
      totalIncome: totalInc,
      netIncome: netInc,
    };
  });

  return { enrichedData, sumDiamond };
}

export function buildCcIncomeSummary(
  resSummary: CcPaystubResponse['summary'],
  sumDiamond: number,
  comparisonPeriod: ReportPeriodComparison | null,
  comparisonPaystub?: CcPaystubResponse['summary'],
  comparisonDiamondBonus = 0
): CcIncomeSummary {
  return {
    totalHourlyWage: resSummary.totalHourlyWage || 0,
    totalCcXoayBonus: resSummary.totalCcXoayBonus || 0,
    totalComboProductBonus: resSummary.totalComboProductBonus || 0,
    totalMinigameBonus: resSummary.totalMinigameBonus || 0,
    totalCcTipBonus: resSummary.totalCcTipBonus || 0,
    totalExtraSupport: resSummary.totalExtraSupport || 0,
    totalTrainingMentorshipBonus: resSummary.totalTrainingMentorshipBonus || 0,
    totalHolidayBasePay: resSummary.totalHolidayBasePay || 0,
    totalHolidayPremiumPay: resSummary.totalHolidayPremiumPay || 0,
    totalHolidayPayrollAddition: resSummary.totalHolidayPayrollAddition || 0,
    totalDiamondBonus: sumDiamond,
    grandTotalIncome: (resSummary.grandTotalIncome || 0) + sumDiamond,
    comparison:
      comparisonPeriod && comparisonPaystub
        ? {
            ...comparisonPeriod,
            totalHourlyWage: comparisonPaystub.totalHourlyWage || 0,
            totalCcXoayBonus: comparisonPaystub.totalCcXoayBonus || 0,
            totalComboProductBonus: comparisonPaystub.totalComboProductBonus || 0,
            totalMinigameBonus: comparisonPaystub.totalMinigameBonus || 0,
            totalCcTipBonus: comparisonPaystub.totalCcTipBonus || 0,
            totalHolidayBasePay: comparisonPaystub.totalHolidayBasePay || 0,
            totalHolidayPremiumPay: comparisonPaystub.totalHolidayPremiumPay || 0,
            totalHolidayPayrollAddition: comparisonPaystub.totalHolidayPayrollAddition || 0,
            totalDiamondBonus: comparisonDiamondBonus,
            grandTotalIncome: (comparisonPaystub.grandTotalIncome || 0) + comparisonDiamondBonus,
          }
        : undefined,
  };
}

export function filterCcPaystubData(paystubData: CcPaystubRecord[], searchText: string): CcPaystubRecord[] {
  if (!searchText) return paystubData;
  const q = removeVietnameseTones(searchText);
  return paystubData.filter(
    (r) =>
      removeVietnameseTones(r.displayName).includes(q) || Boolean(r.store && removeVietnameseTones(r.store).includes(q))
  );
}

export function filterCcTipModalRecords(
  records: CcTipRecord[],
  tipFilter: TipFilterType,
  searchText: string
): CcTipRecord[] {
  return records.filter((r) => {
    if (tipFilter === 'TIPPED' && r.tipStatus !== 'Tipped') return false;
    if (tipFilter === 'SMALL_CHANGE' && r.tipStatus !== 'Small Change') return false;
    if (tipFilter === 'NO_TIP' && r.tipStatus !== 'No Tip') return false;

    if (searchText) {
      const q = removeVietnameseTones(searchText.toLowerCase());
      return (
        removeVietnameseTones(r.clientName || '')
          .toLowerCase()
          .includes(q) ||
        removeVietnameseTones(r.serviceName || '')
          .toLowerCase()
          .includes(q) ||
        removeVietnameseTones(r.ccInName || '')
          .toLowerCase()
          .includes(q) ||
        removeVietnameseTones(r.ccOutName || '')
          .toLowerCase()
          .includes(q) ||
        Boolean(r.checkinTime && r.checkinTime.includes(searchText))
      );
    }
    return true;
  });
}

export function summarizeCcTipModalRecords(records: CcTipRecord[]): TipModalSummary {
  let totalCustomerTip = 0;
  let totalCcTipBonus = 0;
  let tippedCount = 0;
  let smallChangeCount = 0;
  let noTipCount = 0;

  for (const r of records) {
    totalCustomerTip += r.totalCustomerTip || 0;
    totalCcTipBonus += r.ccTipAmount || 0;
    if (r.tipStatus === 'Tipped') tippedCount++;
    else if (r.tipStatus === 'Small Change') smallChangeCount++;
    else noTipCount++;
  }

  return {
    totalCustomerTip,
    totalCcTipBonus,
    tippedCount,
    smallChangeCount,
    noTipCount,
    totalVisits: records.length,
  };
}

export function buildDiamondDetailEntry(record: CcPaystubRecord): CcDiamondEntry {
  return {
    ccId: record.consultantId,
    tenCc: record.displayName,
    tongKhach: 0,
    soKhachDiamond: record.diamondCount || 0,
    thuongDiamond: record.diamondBonus || 0,
    potentialThuong: 0,
    tyLeGioiThieu: 0,
    datDieuKien: true,
  };
}
