import type { ReportPeriodComparison } from './report-period.js';
import type { HolidayPayBreakdown } from './holiday-work.js';

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

export interface CcPaystubRecord extends HolidayPayBreakdown {
  consultantId: number;
  userId?: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  hourlyWage: number;
  totalWorkHours: number;
  hourlyRate?: number;
  ccXoayBonus: number;
  checkinCount: number;
  comboProductBonus: number;
  comboCount: number;
  productCount: number;
  minigameBonus: number;
  rawMinigameBonus?: number;
  monthlyDailyBonus?: number;
  maxWheelBonusAllowed?: number;
  wheelCapPercent?: number;
  capStatus?: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
  ccTipBonus: number;
  tippedVisitsCount?: number;
  diamondBonus?: number;
  diamondCount?: number;
  totalIncome: number;
}

export interface CcPaystubResponse {
  data: CcPaystubRecord[];
  total: number;
  summary: {
    totalHourlyWage: number;
    totalCcXoayBonus: number;
    totalComboProductBonus: number;
    totalMinigameBonus: number;
    totalCcTipBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
    comparison?: ReportPeriodComparison & {
      totalHourlyWage: number;
      totalCcXoayBonus: number;
      totalComboProductBonus: number;
      totalMinigameBonus: number;
      totalCcTipBonus: number;
      totalDiamondBonus: number;
      grandTotalIncome: number;
    };
  };
}

export interface CcWorkLogDetailRecord {
  work_date: string;
  first_in: string;
  last_out: string;
  total_hours: number;
  service_count: number;
  hourly_rate: number;
  daily_wage: number;
}

export interface CcWorkLogDetailResponse {
  consultantId: number;
  consultantName: string;
  store: string;
  data: CcWorkLogDetailRecord[];
  summary: {
    totalWorkDays: number;
    totalWorkHours: number;
    hourlyRate: number;
    totalWage: number;
  };
}

export type PackageAuditReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REVOKED';

export interface PackageAuditRecord {
  id: number;
  balanceId: number;
  userId: number;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  serviceName: string;
  normalCountAdded: number;
  retainCountAdded: number;
  note: string;
  staffId: number;
  staffName: string;
  dateCreated: string;
  reviewStatus: PackageAuditReviewStatus;
  reviewedByStaffId?: number;
  reviewedByStaffName?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface PackageAuditListParams {
  dateFrom?: string;
  dateTo?: string;
  staffId?: number;
  status?: PackageAuditReviewStatus | 'ALL';
  search?: string;
}

export interface PackageAuditSummary {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  revokedCount: number;
}

export interface PackageAuditListResponse {
  data: PackageAuditRecord[];
  summary: PackageAuditSummary;
}

export interface ReviewPackageAuditParams {
  transactionId: number;
  action: 'APPROVE' | 'REVOKE';
  reviewNote?: string;
}
