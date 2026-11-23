'use client';

import { useMemo } from 'react';
import type dayjs from 'dayjs';
import type { BookingData, BranchDetail } from '../../hooks/useTodayData';
import {
  computeCategoryRevenueData,
  computeComingCategoryStats,
  computeComingStatusStats,
  computeElapsedRatioPercent,
  computePreviousComingCount,
  computePreviousTotalRevenue,
  computeProjectedValue,
  computeTotalRevenueData,
} from './todayStatsHelpers';
import type { TodayStatsComputedData, TodayStatsDateRangeMode } from './types';

interface UseTodayStatsDataParams {
  allBookings: BookingData[];
  branchesData: Record<string, BranchDetail>;
  showTax: boolean;
  previousBranchesData?: Record<string, BranchDetail> | null;
  dateRangeMode?: TodayStatsDateRangeMode;
  selectedDate?: dayjs.Dayjs | null;
}

export function useTodayStatsData({
  allBookings,
  branchesData,
  showTax,
  previousBranchesData,
  dateRangeMode = 'day',
  selectedDate,
}: UseTodayStatsDataParams): TodayStatsComputedData {
  const comingStats = useMemo(() => computeComingCategoryStats(branchesData, showTax), [branchesData, showTax]);

  const comingStatusStats = useMemo(() => computeComingStatusStats(branchesData, showTax), [branchesData, showTax]);

  const totalRevenueData = useMemo(() => computeTotalRevenueData(branchesData, showTax), [branchesData, showTax]);

  const previousComingCount = useMemo(() => computePreviousComingCount(previousBranchesData), [previousBranchesData]);

  const previousTotalRevenue = useMemo(
    () => computePreviousTotalRevenue(previousBranchesData, showTax),
    [previousBranchesData, showTax]
  );

  const categoryRevenueData = useMemo(() => computeCategoryRevenueData(branchesData, showTax), [branchesData, showTax]);

  const isDayMode = dateRangeMode === 'day';
  const periodNoun: 'tuần' | 'tháng' = dateRangeMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(
    () => computeElapsedRatioPercent(selectedDate, dateRangeMode),
    [selectedDate, dateRangeMode]
  );

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  const projectedTotalBookings = useMemo(
    () => computeProjectedValue(allBookings.length, isDayMode, isPastPeriod, ratio),
    [allBookings.length, isDayMode, isPastPeriod, ratio]
  );

  const projectedComingCount = useMemo(
    () => computeProjectedValue(comingStats.totalCount, isDayMode, isPastPeriod, ratio),
    [comingStats.totalCount, isDayMode, isPastPeriod, ratio]
  );

  const projectedComingPrice = useMemo(
    () => computeProjectedValue(comingStats.totalPrice, isDayMode, isPastPeriod, ratio),
    [comingStats.totalPrice, isDayMode, isPastPeriod, ratio]
  );

  const projectedTotalRevenue = useMemo(
    () => computeProjectedValue(totalRevenueData.total, isDayMode, isPastPeriod, ratio),
    [totalRevenueData.total, isDayMode, isPastPeriod, ratio]
  );

  return {
    comingStats,
    comingStatusStats,
    totalRevenueData,
    previousComingCount,
    previousTotalRevenue,
    categoryRevenueData,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    projectedTotalBookings,
    projectedComingCount,
    projectedComingPrice,
    projectedTotalRevenue,
  };
}
