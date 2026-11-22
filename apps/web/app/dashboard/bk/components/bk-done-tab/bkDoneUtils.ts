import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  removeVietnameseTones,
  shouldMaskCustomerPhone,
  type BkDoneDetailsFilter,
  type BkDoneRecord,
  type ReportComparisonMode,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

/** Canonical column header labels for the BK Done leaderboard table. */
export const BK_DONE_LEADERBOARD_LABELS = {
  booker: 'Booker',
  done: 'Done (Lẻ / Combo)',
  newCustomerDone: 'Done Khách Mới',
  newCustomerRate: '% Khách Mới',
  missed: 'Missed',
  doneBonus: 'Thưởng Done',
  rankBonus: 'Thưởng Hạng',
  missedBonus: 'Thưởng/Phạt Missed',
  totalDoneBonus: '∑ Thưởng Done',
} as const;

export interface BkDoneTabProps {
  dateRange: [SafeAny, SafeAny];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export interface BkDoneSummary {
  totalDone: number;
  totalNewCustomerDone?: number;
  avgNewCustomerRate?: number;
  avgDoneRate: number;
  totalDoneBonus: number;
  totalSingleDone?: number;
  totalComboLiveDone?: number;
  totalComboSold?: number;
  comboRevenue?: number;
  singleToComboRate?: number;
}

export const EMPTY_BK_DONE_SUMMARY: BkDoneSummary = {
  totalDone: 0,
  totalNewCustomerDone: 0,
  avgNewCustomerRate: 0,
  avgDoneRate: 0,
  totalDoneBonus: 0,
  totalSingleDone: 0,
  totalComboLiveDone: 0,
  totalComboSold: 0,
  comboRevenue: 0,
  singleToComboRate: 0,
};

export interface BkDoneDetailRow extends BkDoneRecord {
  rowKeyId: string;
}

export interface BkDoneForecast {
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  projectedDone: number;
  projectedSingleDone: number;
  projectedComboLiveDone: number;
  projectedDoneBonus: number;
}

export interface BkDoneRecordStatus {
  kind: 'done' | 'cancelled' | 'future' | 'missed';
  statusType: 'success' | 'error' | 'processing' | 'orange';
  label: string;
}

const BK_DONE_FILTER_DESCRIPTIONS: Partial<Record<BkDoneDetailsFilter, string>> = {
  SINGLE: 'Đang hiển thị danh sách Khách hàng LẺ DONE (không có gói combo active, tính KPI Rank)',
  COMBO_LIVE: 'Đang hiển thị danh sách Khách hàng COMBO LIVE DONE (làm bằng gói combo, +1.000đ/lượt)',
  COMBO_SOLD: 'Đang hiển thị các đơn Completed có bán gói combo mới',
  NEW_CUSTOMER: 'Đang hiển thị danh sách Khách hàng MỚI DONE (lần đầu hoàn thành dịch vụ trong lịch sử hệ thống)',
  COMPLETED: 'Đang hiển thị tất cả Khách hàng DONE (cả Lẻ và Combo)',
  TIP: 'Đang hiển thị các đơn Completed có tiền tip',
};

const DEFAULT_FILTER_DESCRIPTION = 'Hiển thị tất cả đơn hàng hoàn thành (Done) của Booker';

/** Formats a store name or code into a compact branch abbreviation (defaults to HQ for BK views). */
export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

/** Formats a numeric VND amount using Vietnamese currency locale formatting. */
export function formatBkDoneCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

/** Reads the authenticated user role from localStorage to determine phone masking. */
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

/** Computes elapsed percentage within the active report period for run-rate forecasting. */
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

/** Projects end-of-period BK Done counts and bonus amounts based on elapsed period progress. */
export function computeBkDoneForecast(
  dateRange: [SafeAny, SafeAny] | undefined,
  comparisonMode: ReportComparisonMode,
  summary: BkDoneSummary
): BkDoneForecast {
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
    projectedDone: Math.round((summary.totalDone || 0) / (ratio || 1)),
    projectedSingleDone: Math.round(((summary.totalSingleDone ?? summary.totalDone) || 0) / (ratio || 1)),
    projectedComboLiveDone: Math.round((summary.totalComboLiveDone || 0) / (ratio || 1)),
    projectedDoneBonus: Math.round((summary.totalDoneBonus || 0) / (ratio || 1)),
  };
}

/** Filters BK Done detail rows by accent-insensitive search across customer, order, phone, booker, and service. */
export function filterBkDoneDetails(records: BkDoneDetailRow[], searchText: string): BkDoneDetailRow[] {
  if (!searchText) return records;
  const query = removeVietnameseTones(searchText);
  return records.filter(
    (record) =>
      removeVietnameseTones(record.clientName).includes(query) ||
      removeVietnameseTones(record.orderKey).includes(query) ||
      (record.clientPhone && removeVietnameseTones(record.clientPhone).includes(query)) ||
      (record.bookerName && removeVietnameseTones(record.bookerName).includes(query)) ||
      (record.serviceName && removeVietnameseTones(record.serviceName).includes(query))
  );
}

/** Returns the human-readable description matching the active BK Done detail filter. */
export function getBkDoneFilterDescription(filterStatus: BkDoneDetailsFilter): string {
  return BK_DONE_FILTER_DESCRIPTIONS[filterStatus] ?? DEFAULT_FILTER_DESCRIPTION;
}

/** Derives normalized display status metadata for a BK Done detail record. */
export function resolveBkDoneRecordStatus(record: BkDoneRecord): BkDoneRecordStatus {
  const isComp =
    record.status === 'Completed' ||
    record.status === 'CheckOut' ||
    (record.netRevenue || 0) > 0 ||
    (record.totalPrice || 0) > 0 ||
    record.status === 'Check-in thành công';
  const isCancelled = record.status === 'Cancelled';
  const orderTime = record.orderDate
    ? new Date(String(record.orderDate).replace('T', ' ').replace(/\..*$/, '').replace('Z', '')).getTime()
    : 0;
  const isFuture = orderTime > Date.now();

  if (isComp) {
    return { kind: 'done', statusType: 'success', label: 'Done' };
  }
  if (isCancelled) {
    return { kind: 'cancelled', statusType: 'error', label: 'Đã hủy' };
  }
  if (isFuture) {
    return { kind: 'future', statusType: 'processing', label: 'Sắp tới' };
  }
  return { kind: 'missed', statusType: 'orange', label: 'Missed' };
}
