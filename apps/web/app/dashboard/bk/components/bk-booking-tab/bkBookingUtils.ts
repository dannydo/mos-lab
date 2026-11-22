import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  removeVietnameseTones,
  shouldMaskCustomerPhone,
  type BkBookingRecord,
  type ReportComparisonMode,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export interface BkBookingTabProps {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export interface BkBookingSummary {
  totalBookings: number;
  doneBookings: number;
  missedBookings: number;
  conversionRate: number;
  totalCalls: number;
  totalPickups: number;
}

export interface BkBookingDetailRow extends BkBookingRecord {
  rowKeyId: string;
}

export interface BkBookingForecast {
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  projectedCalls: number;
  projectedMissed: number;
  projectedPickups: number;
  projectedBookings: number;
  projectedDoneBookings: number;
}

export const EMPTY_BK_BOOKING_SUMMARY: BkBookingSummary = {
  totalBookings: 0,
  doneBookings: 0,
  missedBookings: 0,
  conversionRate: 0,
  totalCalls: 0,
  totalPickups: 0,
};

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

export function readIsMaskedRole(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const user = JSON.parse(stored);
      return shouldMaskCustomerPhone(user?.role);
    }
  } catch {
    return false;
  }
  return false;
}

export function computeElapsedRatioPercent(
  dateRange: [SafeAny, SafeAny] | undefined,
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
  const ratioValue = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(ratioValue * 1000) / 10;
}

export function computeBkBookingForecast(
  dateRange: [SafeAny, SafeAny] | undefined,
  comparisonMode: ReportComparisonMode,
  summary: BkBookingSummary
): BkBookingForecast {
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';
  const elapsedRatioPercent = computeElapsedRatioPercent(dateRange, comparisonMode);
  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  return {
    isDayMode,
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun,
    projectedCalls: Math.round((summary.totalCalls || 0) / (ratio || 1)),
    projectedMissed: Math.round((summary.missedBookings || 0) / (ratio || 1)),
    projectedPickups: Math.round((summary.totalPickups || 0) / (ratio || 1)),
    projectedBookings: Math.round((summary.totalBookings || 0) / (ratio || 1)),
    projectedDoneBookings: Math.round((summary.doneBookings || 0) / (ratio || 1)),
  };
}

export function filterBkBookingDetails(records: BkBookingDetailRow[], searchText: string): BkBookingDetailRow[] {
  if (!searchText) return records;
  const query = removeVietnameseTones(searchText);
  return records.filter(
    (record) =>
      removeVietnameseTones(record.clientName).includes(query) ||
      removeVietnameseTones(record.orderKey).includes(query) ||
      (record.clientPhone && removeVietnameseTones(record.clientPhone).includes(query)) ||
      (record.bookerName && removeVietnameseTones(record.bookerName).includes(query))
  );
}
