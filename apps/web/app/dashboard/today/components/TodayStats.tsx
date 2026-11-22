'use client';

import { Row } from 'antd';
import { ActualRevenueStatCard } from './today-stats/ActualRevenueStatCard';
import { BookingsCreatedStatCard } from './today-stats/BookingsCreatedStatCard';
import { ComingClientsStatCard } from './today-stats/ComingClientsStatCard';
import { DonutChart, type DonutChartProps, type DonutSegment } from './today-stats/DonutChart';
import { formatCenterRevenue } from './today-stats/todayStatsHelpers';
import type { TodayStatsProps } from './today-stats/types';
import { useTodayStatsData } from './today-stats/useTodayStatsData';

export type { DonutChartProps, DonutSegment, TodayStatsProps };
export { DonutChart, formatCenterRevenue };

export default function TodayStats({
  themeMode,
  token: _token,
  allBookings,
  bookingsCombo,
  bookingsOc,
  bookingsOther,
  bookingBranchCounts,
  branchesData,
  showTax,
  previousAllBookings = [],
  previousBranchesData,
  comparison,
  dateRangeMode = 'day',
  selectedDate,
}: TodayStatsProps) {
  const stats = useTodayStatsData({
    allBookings,
    branchesData,
    showTax,
    previousBranchesData,
    dateRangeMode,
    selectedDate,
  });

  return (
    <Row gutter={[16, 16]}>
      <BookingsCreatedStatCard
        themeMode={themeMode}
        allBookings={allBookings}
        bookingsCombo={bookingsCombo}
        bookingsOc={bookingsOc}
        bookingsOther={bookingsOther}
        bookingBranchCounts={bookingBranchCounts}
        previousAllBookings={previousAllBookings}
        comparison={comparison}
        isDayMode={stats.isDayMode}
        isPastPeriod={stats.isPastPeriod}
        elapsedRatioPercent={stats.elapsedRatioPercent}
        periodNoun={stats.periodNoun}
        projectedTotalBookings={stats.projectedTotalBookings}
      />

      <ComingClientsStatCard
        themeMode={themeMode}
        comingStats={stats.comingStats}
        comingStatusStats={stats.comingStatusStats}
        previousComingCount={stats.previousComingCount}
        comparison={comparison}
        isDayMode={stats.isDayMode}
        isPastPeriod={stats.isPastPeriod}
        elapsedRatioPercent={stats.elapsedRatioPercent}
        periodNoun={stats.periodNoun}
        projectedComingCount={stats.projectedComingCount}
        projectedComingPrice={stats.projectedComingPrice}
      />

      <ActualRevenueStatCard
        themeMode={themeMode}
        totalRevenueData={stats.totalRevenueData}
        categoryRevenueData={stats.categoryRevenueData}
        previousTotalRevenue={stats.previousTotalRevenue}
        comparison={comparison}
        isDayMode={stats.isDayMode}
        isPastPeriod={stats.isPastPeriod}
        elapsedRatioPercent={stats.elapsedRatioPercent}
        periodNoun={stats.periodNoun}
        projectedTotalRevenue={stats.projectedTotalRevenue}
      />
    </Row>
  );
}
