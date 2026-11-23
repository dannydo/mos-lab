import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { calculateFractionToday } from '@mos-lab/shared';
import type { BranchDetail, ComingClientData } from '../../hooks/useTodayData';
import type {
  CategoryRevenueStats,
  ComingCategoryStats,
  ComingStatusStats,
  TodayStatsDateRangeMode,
  TotalRevenueStats,
} from './types';

dayjs.extend(isoWeek);

export function formatCenterRevenue(val: number): string {
  const rounded = Math.round(val || 0);
  if (rounded >= 1000000) {
    return `${(rounded / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(0)}k`;
  }
  return String(rounded);
}

export function getComingItemPrice(item: ComingClientData | SafeAny, showTax: boolean): number {
  const rawPrice =
    typeof item.price === 'number' ? item.price : Number(String(item.ltv || '').replace(/[^\d]/g, '')) || 0;
  const tax = Number(item.tax || 0);
  return Math.round(showTax ? rawPrice : rawPrice - tax);
}

function flattenComingClients(branchesData: Record<string, BranchDetail>): ComingClientData[] {
  return Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
}

export function computeComingCategoryStats(
  branchesData: Record<string, BranchDetail>,
  showTax: boolean
): ComingCategoryStats {
  let comboCount = 0;
  let comboPrice = 0;
  let ocCount = 0;
  let ocPrice = 0;
  let otherCount = 0;
  let otherPrice = 0;

  const allComing = flattenComingClients(branchesData);
  allComing.forEach((item) => {
    const price = item.status === 'completed' ? getComingItemPrice(item, showTax) : 0;
    if (item.category === 'combo') {
      comboCount++;
      comboPrice += price;
    } else if (item.category === 'oc') {
      ocCount++;
      ocPrice += price;
    } else {
      otherCount++;
      otherPrice += price;
    }
  });

  return {
    combo: { count: comboCount, price: comboPrice },
    oc: { count: ocCount, price: ocPrice },
    other: { count: otherCount, price: otherPrice },
    totalCount: allComing.length,
    totalPrice: comboPrice + ocPrice + otherPrice,
  };
}

export function computeComingStatusStats(
  branchesData: Record<string, BranchDetail>,
  showTax: boolean
): ComingStatusStats {
  let doneCount = 0;
  let donePrice = 0;
  let servingCount = 0;
  let servingPrice = 0;
  let lateCount = 0;
  let latePrice = 0;
  let pendingCount = 0;
  let pendingPrice = 0;

  const allComing = flattenComingClients(branchesData);
  allComing.forEach((item) => {
    const price = item.status === 'completed' ? getComingItemPrice(item, showTax) : 0;
    if (item.status === 'completed') {
      doneCount++;
      donePrice += price;
    } else if (item.status === 'serving' || item.status === 'arrived') {
      servingCount++;
      servingPrice += price;
    } else if (item.status === 'late') {
      lateCount++;
      latePrice += price;
    } else {
      pendingCount++;
      pendingPrice += price;
    }
  });

  return {
    done: { count: doneCount, price: donePrice },
    serving: { count: servingCount, price: servingPrice },
    late: { count: lateCount, price: latePrice },
    pending: { count: pendingCount, price: pendingPrice },
    totalCount: allComing.length,
  };
}

export function computeTotalRevenueData(
  branchesData: Record<string, BranchDetail>,
  showTax: boolean
): TotalRevenueStats {
  const branches = Object.values(branchesData);
  const revLe = branches.reduce((sum, b) => sum + (showTax ? b.revLe || 0 : b.netLe || 0), 0);
  const revCombo = branches.reduce((sum, b) => sum + (showTax ? b.revCombo || 0 : b.netCombo || 0), 0);
  const revProduct = branches.reduce((sum, b) => sum + (showTax ? b.revProduct || 0 : b.netProduct || 0), 0);

  return {
    revLe,
    revCombo,
    revProduct,
    total: revLe + revCombo + revProduct,
  };
}

export function computePreviousComingCount(previousBranchesData?: Record<string, BranchDetail> | null): number {
  return Object.values(previousBranchesData || {}).reduce((total, branch) => total + (branch.coming || []).length, 0);
}

export function computePreviousTotalRevenue(
  previousBranchesData: Record<string, BranchDetail> | null | undefined,
  showTax: boolean
): number {
  return Object.values(previousBranchesData || {}).reduce(
    (total, branch) =>
      total +
      (showTax
        ? (branch.revLe || 0) + (branch.revCombo || 0) + (branch.revProduct || 0)
        : (branch.netLe || 0) + (branch.netCombo || 0) + (branch.netProduct || 0)),
    0
  );
}

export function computeCategoryRevenueData(
  branchesData: Record<string, BranchDetail>,
  showTax: boolean
): CategoryRevenueStats {
  let revCombo = 0;
  let revTele = 0;
  let revOther = 0;

  flattenComingClients(branchesData).forEach((item) => {
    if (item.status === 'completed') {
      const rawPrice = item.price || 0;
      const tax = item.tax || 0;
      const price = showTax ? rawPrice : rawPrice - tax;

      if (item.category === 'combo') {
        revCombo += price;
      } else if (item.category === 'oc') {
        revTele += price;
      } else {
        revOther += price;
      }
    }
  });

  return {
    revCombo,
    revTele,
    revOther,
    total: revCombo + revTele + revOther,
  };
}

export function computeElapsedRatioPercent(
  selectedDate: dayjs.Dayjs | null | undefined,
  dateRangeMode: TodayStatsDateRangeMode
): number {
  if (!selectedDate || dateRangeMode === 'day') return 100;

  const now = dayjs();
  const fractionToday = calculateFractionToday(now.hour());
  const start = dateRangeMode === 'week' ? selectedDate.startOf('isoWeek') : selectedDate.startOf('month');
  const end = dateRangeMode === 'week' ? selectedDate.endOf('isoWeek') : selectedDate.endOf('month');

  if (now.isBefore(start, 'day')) return 0.1;
  if (now.isAfter(end, 'day')) return 100;

  const totalDays = end.diff(start, 'day') + 1;
  const daysPassed = now.diff(start, 'day');
  const elapsedDays = daysPassed + fractionToday;
  const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
  return Math.round(ratio * 1000) / 10;
}

export function computeProjectedValue(
  currentValue: number,
  isDayMode: boolean,
  isPastPeriod: boolean,
  ratio: number
): number {
  if (isDayMode || isPastPeriod || ratio <= 0) return 0;
  return Math.round((currentValue || 0) / ratio);
}
