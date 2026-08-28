import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const HOLIDAY_PERIOD_STATUSES = ['DRAFT', 'PUBLISHED', 'PAYROLL_LOCKED'] as const;
export type HolidayPeriodStatus = (typeof HOLIDAY_PERIOD_STATUSES)[number];

export const HOLIDAY_PAY_BASES = ['HOURLY', 'MONTHLY'] as const;
export type HolidayPayBasis = (typeof HOLIDAY_PAY_BASES)[number];

export const HOLIDAY_ROSTER_STATUSES = [
  'NOMINATED',
  'SCHEDULED',
  'HOLIDAY_OFF',
  'BOOKED_OFF',
  'CANCELLED',
  'PAYROLL_EXCEPTION',
] as const;
export type HolidayRosterStatus = (typeof HOLIDAY_ROSTER_STATUSES)[number];

export const HOLIDAY_LEDGER_STATUSES = ['READY', 'EXCEPTION', 'LOCKED', 'ADJUSTMENT'] as const;
export type HolidayLedgerStatus = (typeof HOLIDAY_LEDGER_STATUSES)[number];

export const HOLIDAY_CALENDAR_DAY_KINDS = ['PAID_HOLIDAY', 'WEEKLY_REST', 'COMPENSATORY_REST', 'SWAPPED_REST'] as const;
export type HolidayCalendarDayKind = (typeof HOLIDAY_CALENDAR_DAY_KINDS)[number];

export const HOLIDAY_CALENDAR_STATUSES = ['PAST', 'ONGOING', 'UPCOMING'] as const;
export type HolidayCalendarStatus = (typeof HOLIDAY_CALENDAR_STATUSES)[number];

export interface HolidayCalendarDay {
  date: string;
  kind: HolidayCalendarDayKind;
  label: string;
  isPaidLeave: boolean;
}

export interface HolidayCalendarSource {
  id: string;
  title: string;
  url: string;
}

export interface HolidayCalendarCompanyPeriod {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: HolidayPeriodStatus;
}

export interface HolidayCalendarOccasion {
  code: string;
  name: string;
  shortName: string;
  breakStartDate: string;
  breakEndDate: string;
  paidLeaveDays: number;
  days: HolidayCalendarDay[];
  makeupWorkDates: string[];
  status: HolidayCalendarStatus;
  daysUntil: number | null;
  planningNote: string;
  sourceIds: string[];
  companyPeriod?: HolidayCalendarCompanyPeriod | null;
}

export interface AnnualHolidayCalendarResponse {
  year: number;
  timezone: string;
  asOfDate: string;
  scheduleStatus: 'OFFICIAL';
  occasionCount: number;
  officialPaidLeaveDays: number;
  remainingPaidLeaveDays: number;
  nextHolidayCode?: string | null;
  notice: string;
  holidays: HolidayCalendarOccasion[];
  sources: HolidayCalendarSource[];
}

export interface AnnualHolidayCalendarQuery {
  year?: number;
}

export const STAFF_PERFORMANCE_EVENT_TYPES = [
  'NEGATIVE_FEEDBACK',
  'UNAPPROVED_OFF',
  'LATE',
  'EARLY_LEAVE',
  'TIME_ISSUE',
] as const;
export type StaffPerformanceEventType = (typeof STAFF_PERFORMANCE_EVENT_TYPES)[number];

export const STAFF_PERFORMANCE_EVENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type StaffPerformanceEventStatus = (typeof STAFF_PERFORMANCE_EVENT_STATUSES)[number];

export const STAFF_PERFORMANCE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type StaffPerformanceSeverity = (typeof STAFF_PERFORMANCE_SEVERITIES)[number];

export interface HolidaySelectionWeights {
  feedback: number;
  fix: number;
  tip: number;
  speed: number;
  attendance: number;
}

export const DEFAULT_HOLIDAY_SELECTION_WEIGHTS: HolidaySelectionWeights = {
  feedback: 30,
  fix: 25,
  tip: 15,
  speed: 15,
  attendance: 15,
};

export interface HolidayPeriod {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: HolidayPeriodStatus;
  standardShiftHours: number;
  workPremiumMultiplier: number;
  paidLeaveMultiplier: number;
  monthlyStandardDays: number;
  monthlyStandardHours: number;
  selectionWindowDays: number;
  selectionWeights: HolidaySelectionWeights;
  notes?: string | null;
  publishedAt?: string | null;
  payrollLockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  summary?: HolidayPeriodSummary;
}

export interface HolidayPeriodSummary {
  coverageRequired: number;
  scheduled: number;
  nominated: number;
  holidayOff: number;
  bookedOff: number;
  payrollExceptions: number;
  payrollReady: number;
  payrollLocked: number;
  totalPayrollAddition: number;
}

export interface HolidayCoverageRequirement {
  id: number;
  holidayId: number;
  workDate: string;
  storeId?: number | null;
  storeKey: string;
  teamCode: string;
  shiftStart: string;
  shiftEnd: string;
  requiredCount: number;
  notes?: string | null;
}

export interface HolidayCandidateMetrics {
  completedServices: number;
  verifiedNegativeFeedbackCount: number;
  feedbackRate: number | null;
  fixCount: number;
  fixRate: number | null;
  tippedVisits: number;
  tipRate: number | null;
  medianSpeedRatio: number | null;
  attendanceIncidentPoints: number;
  feedbackPercentile: number | null;
  fixPercentile: number | null;
  tipPercentile: number | null;
  speedPercentile: number | null;
  attendancePercentile: number | null;
}

export interface HolidayCandidateScore {
  id?: number;
  holidayId: number;
  workDate: string;
  crmStaffId?: number | null;
  legacyStaffId: number;
  displayName: string;
  avatarUrl?: string | null;
  teamCode: string;
  storeId?: number | null;
  storeKey: string;
  scoreWindowFrom: string;
  scoreWindowTo: string;
  totalScore: number | null;
  dataSufficient: boolean;
  dataCoverageReason?: string | null;
  metrics: HolidayCandidateMetrics;
  explanation: string[];
  generatedAt: string;
}

export interface HolidayRosterEntry {
  id: number;
  holidayId: number;
  rosterKey: string;
  workDate: string;
  crmStaffId?: number | null;
  legacyStaffId?: number | null;
  importedName?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  teamCode: string;
  storeId?: number | null;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
  status: HolidayRosterStatus;
  nominationReason?: string | null;
  decisionReason?: string | null;
  isApprovedLeave: boolean;
  candidateScore?: HolidayCandidateScore | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPerformanceEvent {
  id: number;
  crmStaffId?: number | null;
  legacyStaffId?: number | null;
  displayName: string;
  eventType: StaffPerformanceEventType;
  source: 'COUNTER' | 'CS' | 'HR' | 'SYSTEM';
  severity: StaffPerformanceSeverity;
  occurredAt: string;
  storeId?: number | null;
  storeKey?: string | null;
  relatedOrderId?: number | null;
  relatedTicketId?: number | null;
  evidenceUrl?: string | null;
  note: string;
  status: StaffPerformanceEventStatus;
  createdByStaffId: number;
  verifiedByStaffId?: number | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayPayrollLedgerEntry {
  id: number;
  holidayId: number;
  rosterId: number;
  workDate: string;
  crmStaffId?: number | null;
  legacyStaffId?: number | null;
  displayName: string;
  teamCode: string;
  storeKey: string;
  rosterStatus: HolidayRosterStatus;
  payBasis?: HolidayPayBasis | null;
  ledgerStatus: HolidayLedgerStatus;
  attendanceSource: 'REPORT_STAFF_WORKING_MINUTE' | 'STAFF_DAY_OFF_APPROVED' | 'HOLIDAY_ROSTER_POLICY';
  actualMinutes: number;
  actualHours: number;
  standardShiftHours: number;
  hourlyRate: number;
  baseHolidayAmount: number;
  holidayPremiumAmount: number;
  holidayTotalValue: number;
  payrollAdditionAmount: number;
  baseIncludedInMonthlySalary: boolean;
  exceptionCode?: string | null;
  exceptionMessage?: string | null;
  calculationVersion: string;
  lockedAt?: string | null;
  lockedByStaffId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayPayrollAdjustment {
  id: number;
  holidayId: number;
  ledgerId: number;
  amount: number;
  reason: string;
  createdByStaffId: number;
  createdAt: string;
}

/** Aggregate added to every live paystub without re-deriving holiday policy in the UI. */
export interface HolidayPayBreakdown {
  holidayWorkedDays: number;
  holidayWorkedHours: number;
  holidayPaidLeaveDays: number;
  holidayPaidLeaveHours: number;
  holidayWorkedBasePay: number;
  holidayPaidLeavePay: number;
  holidayBasePay: number;
  holidayPremiumPay: number;
  holidayTotalValue: number;
  holidayPayrollAddition: number;
  /** Amount still to add to legacy paystubs after their normal 1x work pay is preserved. */
  holidayPaystubAdjustment: number;
  holidayPayrollExceptionCount: number;
}

export interface HolidayWorkspaceResponse {
  period: HolidayPeriod;
  coverage: HolidayCoverageRequirement[];
  roster: HolidayRosterEntry[];
  candidates: HolidayCandidateScore[];
  ledger: HolidayPayrollLedgerEntry[];
  adjustments: HolidayPayrollAdjustment[];
  canManage: boolean;
  canNominate: boolean;
}

export interface HolidayPeriodQuery extends PageQuery {
  status?: HolidayPeriodStatus | 'ALL';
  search?: string;
}

export type HolidayPeriodListResponse = PageResponse<HolidayPeriod, HolidayPeriodSummary>;

export interface UpsertHolidayPeriodRequest {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  standardShiftHours?: number;
  workPremiumMultiplier?: number;
  paidLeaveMultiplier?: number;
  monthlyStandardDays?: number;
  monthlyStandardHours?: number;
  selectionWindowDays?: number;
  selectionWeights?: HolidaySelectionWeights;
  notes?: string | null;
}

export interface UpsertHolidayCoverageRequest {
  workDate: string;
  storeId?: number | null;
  storeKey: string;
  teamCode: string;
  shiftStart: string;
  shiftEnd: string;
  requiredCount: number;
  notes?: string | null;
}

export interface HolidayBranchCoverageSource {
  workDate: string;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
}

export interface UpsertHolidayBranchCoverageRequest {
  workDate: string;
  storeId: number;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
  requiredByTeam: {
    CC: number;
    CV: number;
  };
  notes?: string | null;
  source?: HolidayBranchCoverageSource | null;
}

export interface UpsertHolidayRosterRequest {
  workDate: string;
  crmStaffId?: number | null;
  legacyStaffId?: number | null;
  importedName?: string | null;
  displayName: string;
  teamCode: string;
  storeId?: number | null;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
  status: HolidayRosterStatus;
  nominationReason?: string | null;
  decisionReason?: string | null;
}

export interface CreateStaffPerformanceEventRequest {
  crmStaffId?: number | null;
  legacyStaffId?: number | null;
  displayName: string;
  eventType: StaffPerformanceEventType;
  source: StaffPerformanceEvent['source'];
  severity: StaffPerformanceSeverity;
  occurredAt: string;
  storeId?: number | null;
  storeKey?: string | null;
  relatedOrderId?: number | null;
  relatedTicketId?: number | null;
  evidenceUrl?: string | null;
  note: string;
}

export interface CreateHolidayPayrollAdjustmentRequest {
  ledgerId: number;
  amount: number;
  reason: string;
}

export interface StaffPerformanceEventQuery extends PageQuery {
  status?: StaffPerformanceEventStatus | 'ALL';
  eventType?: StaffPerformanceEventType | 'ALL';
  legacyStaffId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export type StaffPerformanceEventListResponse = PageResponse<StaffPerformanceEvent>;

export type HolidayActionResponse<T = undefined> = ActionResponse<T>;
