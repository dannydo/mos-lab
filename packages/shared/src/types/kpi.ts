export interface StaffKPI {
  id: number;
  staffId: number;
  kpiDate: string; // YYYY-MM-DD
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalRenewed: number;

  // Joined relation fields
  staffName?: string;
}

export interface BookerSalary {
  role?: 'telesales' | 'oc';
  baseSalary: number;
  doneCount?: number;
  missedCount?: number;
  missedRate?: number;
  clientBonus?: number;
  doneBonus?: number;
  missedBonus?: number;
  tipBonus?: number;
  revBonus?: number;
  totalTips?: number;
  totalNetRev?: number;
  totalSalary: number;

  // Online Consultant specific fields
  salesReward?: number;
  servicingReward?: number;
  growthReward?: number;
  storeServicingReward?: number;
  checkins?: number;
  checkinLateMin?: number;

  // Match tier info
  doneLevelCount?: number;
  missedLevelRate?: number;
  revLevelRate?: number;
  revLevelMin?: number;
}

export interface KPISummary {
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalCheckin: number;
  totalEarnings: number;
  salary: BookerSalary | null;
}

export interface OutcomeBreakdown {
  BOOKED: number;
  CALL_BACK: number;
  NO_ANSWER: number;
  BUSY: number;
  WRONG_NUMBER: number;
  OTHERS: number;
}

export interface TrendDay {
  date: string;
  planned: number;
  called: number;
}

export interface TrendsResponse {
  breakdown: OutcomeBreakdown;
  dailyTrends: TrendDay[];
}

export interface LeaderboardEntry {
  staffId: number;
  displayName: string;
  username: string;
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalCheckin: number;
  answerRate: number;
  bookingRate: number;
  checkinRate: number;
  totalEarnings: number;
  salary: BookerSalary;
}

export interface ClientBonusRefill {
  discount30: number;
  discount50: number;
  discountMore: number;
}

export interface ClientBonusFullSet {
  discount0: number;
  discount30: number;
  discount50: number;
  discountMore: number;
}

export interface DoneBonusTier {
  minCount: number;
  bonus: number;
}

export interface MissedBonusTier {
  maxRate: number;
  bonus: number;
}

export interface RevBonusTier {
  minRev: number;
  rate: number;
}

export interface SalaryConfig {
  baseSalary: number;
  tipsPercent: number;
  clientBonusRefill: ClientBonusRefill;
  clientBonusFullSet: ClientBonusFullSet;
  doneBonusTiers: DoneBonusTier[];
  missedBonusTiers: MissedBonusTier[];
  revBonusTiers: RevBonusTier[];
}
