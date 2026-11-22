import { BkBookingLeaderboardEntry, BkDoneLeaderboardEntry, BkRevenueLeaderboardEntry } from '@mos-lab/shared';

export interface BkBookingLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  gameId?: string | number;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkBookingLeaderboardResult {
  leaderboard: BkBookingLeaderboardEntry[];
  summary: {
    totalBookings: number;
    doneBookings: number;
    missedBookings: number;
    conversionRate: number;
    totalCalls: number;
    totalPickups: number;
  };
}

export interface BkDoneLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkDoneLeaderboardResult {
  leaderboard: BkDoneLeaderboardEntry[];
  summary: {
    totalDone: number;
    totalNewCustomerDone?: number;
    avgNewCustomerRate?: number;
    totalMissed?: number;
    avgDoneRate: number;
    avgMissedRate?: number;
    totalDoneBonus: number;
    totalSingleDone?: number;
    totalComboLiveDone?: number;
    totalComboSold?: number;
    comboRevenue?: number;
    singleToComboRate?: number;
  };
}

export interface BkRevenueLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkRevenueLeaderboardResult {
  leaderboard: BkRevenueLeaderboardEntry[];
  summary: {
    completedOrdersCount: number;
    totalSingleRevenue?: number;
    totalComboRevenue?: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  };
}

export interface BkIncomingBookingsCountParams {
  dateFrom: string;
  dateTo: string;
  targetStaffIds?: number[];
}
