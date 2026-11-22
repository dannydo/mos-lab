import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  type CvTipRecord,
  type ReportComparisonMode,
  type TipFilterType,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export interface CvTipTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
  comparisonMode: ReportComparisonMode;
}

export interface CvTipSummary {
  totalCvTipBonus: number;
  totalCustomerTip: number;
  avgTipRatePercent: number;
  totalTippedVisits: number;
  totalVisits: number;
}

export interface CvTipForecast {
  isMonthMode: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  ratio: number;
  projectedCvTipBonus: number;
  projectedCustomerTip: number;
  projectedTippedVisits: number;
}

export const EMPTY_CV_TIP_SUMMARY: CvTipSummary = {
  totalCvTipBonus: 0,
  totalCustomerTip: 0,
  avgTipRatePercent: 0,
  totalTippedVisits: 0,
  totalVisits: 0,
};

export const CV_TIP_PAGE_STORAGE_KEY = 'cv_tip_page';
export const CV_TIP_PAGE_SIZE_STORAGE_KEY = 'cv_tip_page_size';
export const CV_TIP_VALID_PAGE_SIZES = [10, 20, 50, 100];
export const DEFAULT_CV_TIP_PAGE = 1;
export const DEFAULT_CV_TIP_PAGE_SIZE = 20;

export const CV_TIP_FILTER_OPTIONS: { label: string; value: TipFilterType }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Có Tip (≥ 20K)', value: 'TIPPED' },
  { label: 'Tiền lẻ (< 20K)', value: 'SMALL_CHANGE' },
  { label: 'Không Tip (0đ)', value: 'NO_TIP' },
];

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'DT';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

export const isCvLStaff = (nameOrId?: string | number | null): boolean => {
  if (!nameOrId) return false;
  const s = String(nameOrId).toLowerCase();
  return (
    s.includes('khanh cao') ||
    s.includes('thảo ly') ||
    s.includes('thao ly') ||
    s === '13783' ||
    s === '46272' ||
    s === '37' ||
    s === '55'
  );
};

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
  const r = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(r * 1000) / 10;
}

export function computeCvTipForecast(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  comparisonMode: ReportComparisonMode,
  summary: CvTipSummary
): CvTipForecast {
  const isMonthMode = comparisonMode === 'month';
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';
  const elapsedRatioPercent = computeElapsedRatioPercent(dateRange, comparisonMode);
  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  return {
    isMonthMode,
    isDayMode,
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun,
    ratio,
    projectedCvTipBonus: Math.round((summary.totalCvTipBonus || 0) / (ratio || 1)),
    projectedCustomerTip: Math.round((summary.totalCustomerTip || 0) / (ratio || 1)),
    projectedTippedVisits: Math.round((summary.totalTippedVisits || 0) / (ratio || 1)),
  };
}

export function filterRecordsByTipStatus<T extends { tipStatus: CvTipRecord['tipStatus'] }>(
  records: T[],
  filter: TipFilterType
): T[] {
  if (filter === 'TIPPED') return records.filter((record) => record.tipStatus === 'Tipped');
  if (filter === 'SMALL_CHANGE') return records.filter((record) => record.tipStatus === 'Small Change');
  if (filter === 'NO_TIP') return records.filter((record) => record.tipStatus === 'No Tip');
  return records;
}

export function buildTipModalFilterOptions<T extends { tipStatus: CvTipRecord['tipStatus'] }>(
  records: T[]
): { label: string; value: TipFilterType }[] {
  const tippedCount = records.filter((record) => record.tipStatus === 'Tipped').length;
  const smallChangeCount = records.filter((record) => record.tipStatus === 'Small Change').length;
  const noTipCount = records.filter((record) => record.tipStatus === 'No Tip').length;

  return [
    { label: `Tất cả (${records.length})`, value: 'ALL' },
    { label: `Có tip ≥ 20K (${tippedCount})`, value: 'TIPPED' },
    { label: `Tiền lẻ < 20K (${smallChangeCount})`, value: 'SMALL_CHANGE' },
    { label: `Không tip (${noTipCount})`, value: 'NO_TIP' },
  ];
}

export function readSavedCvTipPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_CV_TIP_PAGE_SIZE;
  const saved = Number(localStorage.getItem(CV_TIP_PAGE_SIZE_STORAGE_KEY));
  return CV_TIP_VALID_PAGE_SIZES.includes(saved) ? saved : DEFAULT_CV_TIP_PAGE_SIZE;
}

export function readSavedCvTipPage(): number {
  if (typeof window === 'undefined') return DEFAULT_CV_TIP_PAGE;
  return Math.max(1, Number(localStorage.getItem(CV_TIP_PAGE_STORAGE_KEY)) || DEFAULT_CV_TIP_PAGE);
}

export function saveCvTipPagination(page: number, pageSize: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CV_TIP_PAGE_STORAGE_KEY, page.toString());
  localStorage.setItem(CV_TIP_PAGE_SIZE_STORAGE_KEY, pageSize.toString());
}
