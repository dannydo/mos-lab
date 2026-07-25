export interface BkBookingRecord {
  orderId: number;
  orderKey: string;
  bookingDate: string;
  createdDate?: string;
  clientName: string;
  clientPhone: string;
  store: string;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Missed' | string;
  bookerId: number;
  bookerName: string;
  avatar?: string | null;
  customerId?: number;
}

export interface BkBookingLeaderboardEntry {
  rank: number;
  bookerId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  totalCreatedBookings: number;
  doneBookings: number;
  missedBookings: number;
  conversionRate: number;
  callCount: number;
}

export interface BkBookingLeaderboardResponse {
  leaderboard: BkBookingLeaderboardEntry[];
  summary: {
    totalBookings: number;
    doneBookings: number;
    conversionRate: number;
    totalCalls: number;
  };
}

export interface BkBookingResponse {
  data: BkBookingRecord[];
  total: number;
  summary: {
    totalBookings: number;
    doneBookings: number;
    conversionRate: number;
    totalCalls: number;
  };
}

export interface BkDoneRecord {
  orderId: number;
  orderKey: string;
  orderDate: string;
  clientName: string;
  clientPhone?: string;
  bookerName?: string;
  store: string;
  serviceName?: string;
  servicePrice?: number;
  discountPercent?: number;
  netRevenue?: number;
  tipAmount?: number;
  totalPrice: number;
  basicDoneBonus: number;
  promoBonus: number;
  promoLevel: string;
  milestoneBonus: number;
  doneRatePenaltyBonus: number;
  totalDoneBonus: number;
  status?: string;
  customerId?: number;
}

export interface BkDoneLeaderboardEntry {
  rank: number;
  bookerId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  doneCount: number;
  missedCount: number;
  doneRatePercent: number;
  missedRatePercent: number;
  basicBonus: number;
  promoBonus: number;
  milestoneBonus: number;
  penaltyBonus: number;
  totalDoneBonus: number;
}

export interface BkDoneLeaderboardResponse {
  leaderboard: BkDoneLeaderboardEntry[];
  summary: {
    totalDone: number;
    totalMissed?: number;
    avgDoneRate: number;
    avgMissedRate?: number;
    totalDoneBonus: number;
  };
}

export interface BkDoneResponse {
  data: BkDoneRecord[];
  total: number;
  summary: {
    totalDone: number;
    avgDoneRate: number;
    totalDoneBonus: number;
  };
}

export interface BkTipRecord {
  orderId: number;
  checkinTime: string;
  clientName: string;
  store: string;
  bookerName: string;
  avatar?: string | null;
  totalCustomerTip: number;
  bkTipAmount: number;
  bkTipPercentage: number;
  customerId?: number;
}

export interface BkTipLeaderboardEntry {
  rank: number;
  bookerId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  totalBookingsCount: number;
  tippedBookingsCount: number;
  totalCustomerTip: number;
  totalBkTipBonus: number;
}

export interface BkTipLeaderboardResponse {
  leaderboard: BkTipLeaderboardEntry[];
  summary: {
    totalBookingsCount: number;
    tippedBookingsCount: number;
    totalCustomerTip: number;
    totalBkTipBonus: number;
  };
}

export interface BkTipResponse {
  data: BkTipRecord[];
  total: number;
  summary: {
    totalBookingsCount: number;
    tippedBookingsCount: number;
    totalCustomerTip: number;
    totalBkTipBonus: number;
  };
}

export interface BkRevenueRecord {
  orderId: number;
  orderKey: string;
  orderDate: string;
  clientName: string;
  bookerName?: string;
  store: string;
  totalOrderPrice: number;
  commissionRate: number;
  commissionBonus: number;
  customerId?: number;
}

export interface BkRevenueLeaderboardEntry {
  rank: number;
  bookerId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  completedOrdersCount: number;
  totalRevenue: number;
  commissionRate: number;
  totalCommissionBonus: number;
}

export interface BkRevenueLeaderboardResponse {
  leaderboard: BkRevenueLeaderboardEntry[];
  summary: {
    completedOrdersCount: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  };
}

export interface BkRevenueResponse {
  data: BkRevenueRecord[];
  total: number;
  summary: {
    completedOrdersCount: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  };
}

export interface BkPaystubRecord {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  store: string;
  monthlyBaseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  calculatedBaseSalary: number;
  doneBonus: number;
  tipBonus: number;
  revenueBonus: number;
  totalIncome: number;
}

export interface BkPaystubResponse {
  data: BkPaystubRecord[];
  total: number;
  summary: {
    totalBaseSalary: number;
    totalDoneBonus: number;
    totalTipBonus: number;
    totalRevenueBonus: number;
    grandTotalIncome: number;
  };
}

export interface BkStaffOption {
  staffId: number;
  displayName: string;
  username?: string;
  isBk: boolean;
  store?: string;
}

export interface BkSalaryConfig {
  activeBkIds: number[];
  baseSalary: number; // Lương cứng cơ bản (Based)
  tipsPercent: number; // Phần trăm thưởng Tips (%)
  clientBonusFullSet: {
    discount0: number; // Không giảm (0%)
    discount30: number; // Giảm <= 30%
    discount50: number; // Giảm <= 50%
    discountMore: number; // Giảm cực lớn
  };
  clientBonusRefill: {
    discount30: number; // Giảm <= 30%
    discount50: number; // Giảm <= 50%
    discountMore: number; // Giảm cực lớn
  };
  doneBonusTiers: Array<{ minCount: number; bonus: number }>;
  missedBonusTiers: Array<{ maxRate: number; bonus: number }>;
  revBonusTiers: Array<{ minRev: number; rate: number }>;
}

export interface BkConfigResponse {
  activeBkIds: number[];
  config: BkSalaryConfig;
  allStaffOptions: BkStaffOption[];
}
