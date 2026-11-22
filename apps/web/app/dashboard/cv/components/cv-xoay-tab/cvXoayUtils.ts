import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  calculateFractionToday,
  removeVietnameseTones,
  type CvXoayRecord,
  type ReportComparisonMode,
} from '@mos-lab/shared';

dayjs.extend(isoWeek);

export interface CvXoayTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  comparisonMode: ReportComparisonMode;
}

export interface CvLeaderboardRow {
  rank: number;
  techName: string;
  avatar?: string | null;
  store: string;
  techLevel: number;
  totalServices: number;
  totalPoints: number;
  totalBonus: number;
  maxPointsAccu: number;
}

export interface CvXoaySummary {
  totalServices: number;
  totalBonus: number;
  totalPoints: number;
}

export interface CvXoayForecast {
  isMonthMode: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  ratio: number;
  projectedServices: number;
  projectedPoints: number;
  projectedBonus: number;
}

export const CV_XOAY_PAGE_SIZE_STORAGE_KEY = 'cv_xoay_page_size';
export const DEFAULT_CV_XOAY_PAGE_SIZE = 50;

export const EMPTY_CV_XOAY_SUMMARY: CvXoaySummary = {
  totalServices: 0,
  totalBonus: 0,
  totalPoints: 0,
};

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

export function buildCvXoayLeaderboard(data: CvXoayRecord[]): CvLeaderboardRow[] {
  const map = new Map<string, Omit<CvLeaderboardRow, 'rank'>>();

  data.forEach((item) => {
    const name = item.techName || 'Chưa phân công';
    const existing = map.get(name) || {
      techName: name,
      avatar: item.avatar,
      store: item.store || 'DT',
      techLevel: item.techLevel || 1,
      totalServices: 0,
      totalPoints: 0,
      totalBonus: 0,
      maxPointsAccu: 0,
    };

    if (!existing.avatar && item.avatar) {
      existing.avatar = item.avatar;
    }
    existing.totalServices += 1;
    existing.totalPoints += item.techPoints;
    existing.totalBonus += item.techBonus;
    if (item.pointsAccu > existing.maxPointsAccu) {
      existing.maxPointsAccu = item.pointsAccu;
    }
    if (item.techLevel > existing.techLevel) {
      existing.techLevel = item.techLevel;
    }
    map.set(name, existing);
  });

  const list = Array.from(map.values());
  list.sort((a, b) => b.totalBonus - a.totalBonus || b.totalPoints - a.totalPoints);

  return list.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}

export function computeCvXoayForecast(
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  comparisonMode: ReportComparisonMode,
  summary: CvXoaySummary,
  leaderboard: CvLeaderboardRow[]
): CvXoayForecast {
  const isMonthMode = comparisonMode === 'month';
  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';
  const elapsedRatioPercent = computeElapsedRatioPercent(dateRange, comparisonMode);
  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedServices = Math.round((summary.totalServices || 0) / (ratio || 1));
  const projectedPoints = Math.round((summary.totalPoints || 0) / (ratio || 1));
  const projectedBonus = !isMonthMode
    ? 0
    : leaderboard.length > 0
      ? leaderboard.reduce(
          (acc, row) => acc + calculateProjectedCvXoay(row.totalServices || 0, row.totalBonus || 0, ratio),
          0
        )
      : Math.round((summary.totalBonus || 0) / (ratio || 1));

  return {
    isMonthMode,
    isDayMode,
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun,
    ratio,
    projectedServices,
    projectedPoints,
    projectedBonus,
  };
}

export function filterCvXoayRecords(
  data: CvXoayRecord[],
  selectedCvName: string | null,
  searchText: string
): CvXoayRecord[] {
  let result = data;
  if (selectedCvName) {
    result = result.filter((item) => item.techName.toLowerCase() === selectedCvName.toLowerCase());
  }
  if (searchText) {
    const query = removeVietnameseTones(searchText);
    result = result.filter(
      (item) =>
        removeVietnameseTones(item.techName).includes(query) ||
        removeVietnameseTones(item.clientName).includes(query) ||
        removeVietnameseTones(item.serviceName).includes(query) ||
        removeVietnameseTones(item.store).includes(query)
    );
  }
  return result;
}

export function readSavedCvXoayPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_CV_XOAY_PAGE_SIZE;
  const saved = localStorage.getItem(CV_XOAY_PAGE_SIZE_STORAGE_KEY);
  if (!saved) return DEFAULT_CV_XOAY_PAGE_SIZE;
  const parsed = parseInt(saved, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CV_XOAY_PAGE_SIZE;
}

export function saveCvXoayPageSize(size: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CV_XOAY_PAGE_SIZE_STORAGE_KEY, size.toString());
}
