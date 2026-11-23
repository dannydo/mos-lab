import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { CcDiamondEntry, calculateFractionToday, removeVietnameseTones } from '@mos-lab/shared';

dayjs.extend(isoWeek);

export type DiamondComparisonMode = 'month' | 'week' | 'day';

export interface CcDiamondTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  comparisonMode?: DiamondComparisonMode;
  onClearConsultant?: () => void;
}

export interface DiamondRewardTier {
  label: string;
  value: string;
  featured?: boolean;
}

export const MOBILE_DIAMOND_PAGE_SIZE = 15;

export const DIAMOND_REWARD_TIERS: readonly DiamondRewardTier[] = [
  { label: '1 khách', value: '5K đ' },
  { label: '2 khách', value: '10K đ' },
  { label: '3 khách', value: '20K đ' },
  { label: '4 khách', value: '30K đ' },
  { label: '5 khách', value: '40K đ' },
  { label: 'Từ 6 khách', value: '50K đ / khách', featured: true },
];

export function formatDiamondCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

export function getReferralRatio(record: CcDiamondEntry): string {
  return record.tongKhach > 0 ? ((record.soKhachDiamond / record.tongKhach) * 100).toFixed(1) : '0.0';
}

export function isDiamondQualified(record: CcDiamondEntry, ratio = getReferralRatio(record)): boolean {
  return record.datDieuKien ?? Number(ratio) >= 3.0;
}

export function computeDiamondElapsedRatioPercent(
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs],
  comparisonMode: DiamondComparisonMode = 'month'
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

export function scopeDiamondRecordsByConsultant(
  records: CcDiamondEntry[],
  selectedConsultant: string
): CcDiamondEntry[] {
  if (selectedConsultant === 'ALL') return records;
  const normalizedTarget = removeVietnameseTones(selectedConsultant);
  return records.filter((item) => removeVietnameseTones(item.tenCc) === normalizedTarget);
}

export function filterDiamondRecordsBySearch(records: CcDiamondEntry[], searchText: string): CcDiamondEntry[] {
  if (!searchText) return records;
  const normalizedQuery = removeVietnameseTones(searchText);
  return records.filter(
    (item) => removeVietnameseTones(item.tenCc).includes(normalizedQuery) || String(item.ccId).includes(searchText)
  );
}

export function summarizeDiamondRecords(records: CcDiamondEntry[]) {
  const totalReferrals = records.reduce((sum, record) => sum + record.soKhachDiamond, 0);
  const totalBonus = records.reduce((sum, record) => sum + record.thuongDiamond, 0);
  const topCc = records[0] || null;
  const rewardRecipientCount = records.filter((record) => record.thuongDiamond > 0).length;

  return {
    totalReferrals,
    totalBonus,
    topCc,
    rewardRecipientCount,
  };
}
