import type React from 'react';
import type dayjs from 'dayjs';
import type { ReportPeriodComparison } from '@mos-lab/shared';
import type { BookingData, BranchDetail } from '../../hooks/useTodayData';

export type TodayStatsThemeMode = 'light' | 'dark';
export type TodayStatsDateRangeMode = 'day' | 'week' | 'month';

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
  strokeClassName?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
  themeMode: TodayStatsThemeMode;
  centerLabel?: string;
  centerSubLabel?: string;
  size?: number;
}

export interface TodayStatsProps {
  themeMode: TodayStatsThemeMode;
  token: SafeAny;
  allBookings: BookingData[];
  bookingsCombo: BookingData[];
  bookingsOc: BookingData[];
  bookingsOther: BookingData[];
  bookingBranchCounts: { dt: number; ep: number; total: number };
  branchesData: Record<string, BranchDetail>;
  showTax: boolean;
  previousAllBookings?: BookingData[];
  previousBranchesData?: Record<string, BranchDetail> | null;
  comparison?: ReportPeriodComparison | null;
  dateRangeMode?: TodayStatsDateRangeMode;
  selectedDate?: dayjs.Dayjs | null;
}

export interface StatCountAndPrice {
  count: number;
  price: number;
}

export interface ComingCategoryStats {
  combo: StatCountAndPrice;
  oc: StatCountAndPrice;
  other: StatCountAndPrice;
  totalCount: number;
  totalPrice: number;
}

export interface ComingStatusStats {
  done: StatCountAndPrice;
  serving: StatCountAndPrice;
  late: StatCountAndPrice;
  pending: StatCountAndPrice;
  totalCount: number;
}

export interface TotalRevenueStats {
  revLe: number;
  revCombo: number;
  revProduct: number;
  total: number;
}

export interface CategoryRevenueStats {
  revCombo: number;
  revTele: number;
  revOther: number;
  total: number;
}

export interface TodayStatsLegendItem {
  key: string;
  label: string;
  value: React.ReactNode;
  dotClassName: string;
  subtext?: string;
  tooltipTitle?: string;
  tabularValue?: boolean;
}

export interface TodayStatsComputedData {
  comingStats: ComingCategoryStats;
  comingStatusStats: ComingStatusStats;
  totalRevenueData: TotalRevenueStats;
  previousComingCount: number;
  previousTotalRevenue: number;
  categoryRevenueData: CategoryRevenueStats;
  isDayMode: boolean;
  periodNoun: 'tuần' | 'tháng';
  elapsedRatioPercent: number;
  isPastPeriod: boolean;
  projectedTotalBookings: number;
  projectedComingCount: number;
  projectedComingPrice: number;
  projectedTotalRevenue: number;
}
