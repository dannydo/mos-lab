import type { FalReadModel } from './fal.js';
import type { HolidayPayBreakdown } from './holiday-work.js';

export interface CvXoayRecord {
  orderServiceId: number;
  checkin: string; // YYYY-MM-DD HH:mm:ss
  checkinTime: string; // HH:mm:ss
  clientName: string;
  store: string;
  serviceName: string;
  serviceType: string;
  techName: string;
  avatar?: string | null;
  techLevel: number;
  techBonus: number;
  pointsAccu: number;
  techPoints: number;
  ccInName: string;
  ccOutName: string;
  classPts: number;
  fanPts: number;
  typePts: number;
  lashPts: number;
  designPts: number;
  colorPts: number;
  falRule?: string;
  fal?: FalReadModel | null;
}

export interface CvXoayReportResponse {
  data: CvXoayRecord[];
  total: number;
  summary: {
    totalServices: number;
    totalBonus: number;
    totalPoints: number;
  };
}

export interface CvTipLeaderboardEntry {
  rank: number;
  technicianId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  totalVisits: number;
  tippedVisits: number;
  tipRatePercent: number;
  totalCustomerTipAmount: number;
  totalCvTipBonus: number; // 70% of customer tip
  targetCompletionRate: number;
}

export interface CvTipLeaderboardResponse {
  leaderboard: CvTipLeaderboardEntry[];
  summary: {
    totalCvTipBonus: number;
    totalCustomerTip: number;
    avgTipRatePercent: number;
    totalTippedVisits: number;
    totalVisits: number;
  };
}

export interface CvTipRecord {
  orderId: number;
  serviceId: number;
  checkinTime: string;
  clientId: number;
  clientName: string;
  store: string;
  serviceName: string;
  techName: string;
  avatar?: string | null;
  totalCustomerTip: number;
  cvTipAmount: number; // 70% share
  cvTipPercentage: number; // 70%
  tipStatus: 'Tipped' | 'No Tip';
  clientTippedVisits?: number;
  clientTotalVisits?: number;
}

export interface CvTipResponse {
  data: CvTipRecord[];
  total: number;
  summary: {
    totalVisits: number;
    tippedVisits: number;
    nonTippedVisits: number;
    tipRatePercent: number;
    totalCustomerTip: number;
    totalCvTipBonus: number;
  };
}

export interface CvTipCustomerVisit {
  orderId: number;
  checkinTime: string;
  clientId: number;
  clientName: string;
  store: string;
  lashSets: string;
  cvNames: string;
  ccInName: string;
  ccOutName: string;
  bookerName: string;
  totalCustomerTip: number;
  tipStatus: 'Tipped' | 'No Tip';
}

export interface CvTipCustomerHistoryResponse {
  data: CvTipCustomerVisit[];
  total: number;
  summary: {
    totalVisits: number;
    tippedVisits: number;
    nonTippedVisits: number;
  };
}

export interface CvPaystubRecord extends HolidayPayBreakdown {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  store: string;
  totalWorkHours: number;
  hourlyRate: number;
  hourlyWage: number;
  cvXoayBonus: number;
  cvTipBonus: number;
  totalIncome: number;
  serviceCount: number;
  seniorityMonths?: number;
  seniorityBonus?: number;
  seniorityBonusPercent?: number;
  techLevel?: number;
  activeDays?: number;
  regularHours?: number;
  regularHourlyWage?: number;
  offDaysWorked?: number;
  offDaysWorkHours?: number;
  offDaysWorkWage?: number;
}

export interface CvPaystubResponse {
  data: CvPaystubRecord[];
  total: number;
  summary: {
    totalHourlyWage: number;
    totalCvXoayBonus: number;
    totalCvTipBonus: number;
    totalSeniorityBonus?: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
  };
}

export interface CvWorkLogDetailRecord {
  date: string;
  checkInTime: string;
  checkOutTime: string;
  workHours: number;
  hourlyRate: number;
  dailyWage: number;
  store: string;
  notes?: string;
}

export interface CvWorkLogDetailResponse {
  data: CvWorkLogDetailRecord[];
  summary: {
    totalWorkDays: number;
    totalWorkHours: number;
    hourlyRate: number;
    totalWage: number;
  };
}

export interface CvStaffOption {
  staffId: number;
  displayName: string;
  username?: string;
  isCv: boolean;
  store?: string;
}

export interface CvConfigResponse {
  activeCvIds: number[];
  allStaffOptions: CvStaffOption[];
}

// ── CV Real-time Status & Queue Types ──────────────────────────────────────

/** Possible real-time order states from legacy DB */
export type LegacyOrderState =
  | 'New'
  | 'Confirmed'
  | 'Consultation'
  | 'ServiceStart'
  | 'ServiceCleaned'
  | 'ServiceCompleted'
  | 'CheckOut'
  | 'Completed'
  | 'Cancelled'
  | 'Missed';

/** CV availability derived from order_state */
export type CvLiveStatus = 'IDLE' | 'UPCOMING' | 'BUSY' | 'ENDING_SOON' | 'OVERTIME' | 'LOCKED';

export interface CvStaffRealtimeStatus {
  staffId: number;
  name: string;
  avatar: string | null;
  storeId: number;
  storeName: string;
  // Real-time from order.order_state
  currentOrderId: number | null;
  currentOrderState: LegacyOrderState | null;
  currentCustomerName: string | null;
  bookingDateEnd: string | null;
  estimatedEndMinutes: number | null;
  // Derived status for UI
  liveStatus: CvLiveStatus;
  liveLabel: string;
  // Staff average speed metrics
  avgDurationMinutes?: {
    normalAvg?: number;
    retainAvg?: number;
    removalAvg?: number;
    overallAvg?: number;
  };
  // Benchmark-based ETA info (only when BUSY)
  etaInfo?: {
    etaMinutes: number;
    elapsedMinutes: number;
    remainingMinutes: number;
    progressPercent: number;
    layer: 1 | 2 | 3;
    confidence: 'high' | 'medium' | 'low';
    lashStyle: string;
    lashCount: number | null;
    source: string;
  } | null;
}

export interface CvQueueEntry {
  queueId: number;
  staffId: number;
  name: string;
  avatar: string | null;
  storeId: number;
  position: number;
  orderId: number | null;
  dateAssigned: string | null;
  dateCreated: string;
  // Calculated
  isAvailableNow: boolean;
  estimatedWaitMinutes: number | null;
  mappedBookingTime?: string | null;
  isLockedForBooking: boolean;
  nextBookingInMinutes: number | null;
}

export interface CvRealtimeStatusResponse {
  workingCvCount?: number;
  offCvCount?: number;
  staffStatuses: CvStaffRealtimeStatus[];
  queueByStore: Record<number, CvQueueEntry[]>;
  timestamp: string;
}

export type CvRosterAttendance = 'none' | 'checked_in' | 'checked_out' | 'late';

/**
 * The scheduled CV roster for one day. This deliberately carries the same
 * attendance and OFF result as the Today dashboard so operational surfaces do
 * not derive their own weekly-leave rules.
 */
export interface CvScheduleRosterWorkingStaff {
  id: number;
  name: string;
  avatarUrl: string | null;
  branchName: string;
  branchCode: string;
  shift: 'sáng' | 'chiều' | 'full';
  attendance: CvRosterAttendance;
  bookedCount: number;
  doneCount: number;
}

export interface CvScheduleRosterOffStaff {
  id: number;
  name: string;
  avatarUrl: string | null;
  branchName: string;
  branchCode: string;
  reason: string;
  type?: string;
}

export interface CvScheduleRosterResponse {
  date: string;
  workingKtvCount: number;
  maxCapacity: number;
  workingStaffList: CvScheduleRosterWorkingStaff[];
  offStaffList: CvScheduleRosterOffStaff[];
}
