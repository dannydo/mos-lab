import dayjs from 'dayjs';
import {
  CcTipLeaderboardResponse,
  CcTipRecord,
  TipFilterType,
  calculateFractionToday,
  removeVietnameseTones,
} from '@mos-lab/shared';

export type TipComparisonMode = 'month' | 'week' | 'day';

export interface CcTipTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  comparisonMode?: TipComparisonMode;
  onSelectConsultant?: (consultantName: string) => void;
}

export interface TipStatusCounts {
  totalTippedCount: number;
  totalSmallChangeCount: number;
  totalNoTipCount: number;
}

export const DEFAULT_TIP_SUMMARY: CcTipLeaderboardResponse['summary'] = {
  totalCcTipBonus: 0,
  totalCustomerTip: 0,
  avgTipRatePercent: 0,
  totalTippedVisits: 0,
  totalVisits: 0,
};

export function computeTipElapsedRatioPercent(dateRange?: [dayjs.Dayjs, dayjs.Dayjs]): number {
  const now = dayjs();
  const currentHour = now.hour();
  const fractionToday = calculateFractionToday(currentHour);

  const start = dateRange ? dateRange[0] : dayjs().startOf('month');
  const end = dateRange ? dateRange[1] : dayjs().endOf('month');

  if (now.isBefore(start, 'day')) return 0.1;
  if (now.isAfter(end, 'day')) return 100;

  const totalDays = end.diff(start, 'day') + 1;
  const daysPassed = now.diff(start, 'day');
  const elapsedDays = daysPassed + fractionToday;
  const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(ratio * 1000) / 10;
}

export function projectTipMetric(value: number, ratio: number): number {
  return Math.round((value || 0) / (ratio || 1));
}

export function filterCcTipRecords(
  records: CcTipRecord[],
  tipFilter: TipFilterType,
  searchText: string
): CcTipRecord[] {
  const normalizedQuery = searchText ? removeVietnameseTones(searchText) : '';

  return records.filter((record) => {
    if (tipFilter === 'TIPPED' && record.tipStatus !== 'Tipped') return false;
    if (tipFilter === 'SMALL_CHANGE' && record.tipStatus !== 'Small Change') return false;
    if (tipFilter === 'NO_TIP' && record.tipStatus !== 'No Tip') return false;

    if (searchText) {
      return (
        removeVietnameseTones(record.clientName).includes(normalizedQuery) ||
        removeVietnameseTones(record.serviceName).includes(normalizedQuery) ||
        removeVietnameseTones(record.ccInName).includes(normalizedQuery) ||
        removeVietnameseTones(record.ccOutName).includes(normalizedQuery) ||
        removeVietnameseTones(record.consultantName).includes(normalizedQuery) ||
        record.checkinTime.includes(searchText)
      );
    }

    return true;
  });
}

export function countTipStatusBuckets(records: CcTipRecord[]): TipStatusCounts {
  let totalTippedCount = 0;
  let totalSmallChangeCount = 0;
  let totalNoTipCount = 0;

  for (const record of records) {
    if (record.tipStatus === 'Tipped') totalTippedCount += 1;
    else if (record.tipStatus === 'Small Change') totalSmallChangeCount += 1;
    else if (record.tipStatus === 'No Tip') totalNoTipCount += 1;
  }

  return {
    totalTippedCount,
    totalSmallChangeCount,
    totalNoTipCount,
  };
}

export function formatTipRankBadge(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function formatTipVnd(value: number): string {
  return `${Math.round(value || 0).toLocaleString('vi-VN')}\u00A0đ`;
}

export function formatSignedTipVnd(value: number): string {
  return value > 0 ? `+${value.toLocaleString('vi-VN')}\u00A0đ` : '0 đ';
}
