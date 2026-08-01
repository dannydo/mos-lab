import { CallLog } from './call';

export type BucketType = 'COMBO_LIVE' | 'COMBO_DEAD' | 'SINGLE';

export type TouchpointStatus = 'SUCCESS' | 'FAILED' | 'LOST' | 'PENDING' | 'DUE_TODAY' | 'BOOKED' | 'DONE';

export interface LocaTouchpointState {
  isChecked: boolean;
  status?: TouchpointStatus | null;
  checkedAt: string | null;
  checkedByStaffId: number | null;
  checkedByStaffName: string | null;
  note: string | null;
  conversionDetails?: {
    convertedAt: string;
    orderId?: number;
    orderState?: string;
    touchpointKey?: string;
  } | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dob: string | null;
  lastVisit: string | null; // ISO Date String
  daysSinceLastVisit: number | null;
  totalSpent: number;
  totalVisits: number;
  bucket: BucketType;
  totalPromotionsUsed?: number;
  totalReferrals?: number;
  avatar?: string | null;

  // Specific combo info if available
  comboBalance?: {
    normalCount: number;
    retainCount: number;
    expiryDate: string | null;
  } | null;
  assignedStaff?: {
    id: number;
    displayName: string;
    username: string;
    assignedAt?: string | null;
  } | null;
  assignedAt?: string | null;
  expiresAt?: string | null;
  assignedDurationDays?: number | null;
  isRetained?: boolean;
  retainedAt?: string | null;
  lastAllocation?: {
    assignedAt: string;
    staffName?: string | null;
    expiresAt?: string | null;
    sourceType?: string;
    sourceFilterSummary?: string | null;
    reason?: string | null;
  } | null;
  lastBookingState?: string | null;
  lastBookingDate?: string | null;
  callbackDate?: string | null;
  isDeleted?: boolean;
  lastCall?: {
    createdAt: string;
    durationSec: number | null;
    callResult: string | null;
    note: string | null;
  } | null;
  touchpoints?: Record<string, LocaTouchpointState>;
  newComboDetails?: {
    comboName?: string;
    comboPrice?: number;
    purchaseDate?: string;
    bookerName?: string;
    ccInName?: string;
    ccOutName?: string;
    cvName?: string;
  } | null;
}

export interface CustomerStats {
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  hasCall: boolean;
  callOutcome?: string | null;
  callResult?: string | null;
  note?: string | null;
  hasCheckin: boolean;
  orderId?: number | null;
}

export interface CustomerWeeklyProgress {
  customer: Customer;
  dailyActivities: DailyActivity[];
  isConfirmed: boolean;
  confirmTime?: string | null;
  planId?: number | null;
}

export interface ListCustomersParams {
  bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE';
  search?: string;
  page?: number | string;
  limit?: number | string;
  sort?: string;
  daysSinceLastVisitMin?: number | string;
  daysSinceLastVisitMax?: number | string;
  totalSpentMin?: number | string;
  totalSpentMax?: number | string;
  totalVisitsMin?: number | string;
  totalVisitsMax?: number | string;
  promoUsed?: 'yes' | 'no' | 'all';
  promoCountMin?: number | string;
  promoCountMax?: number | string;
  referralUsed?: 'yes' | 'no' | 'all';
  referralCountMin?: number | string;
  referralCountMax?: number | string;
  assignedStaffId?: string;
  assignedDaysMin?: number | string;
  assignedDaysMax?: number | string;
  trash?: string | boolean;
  ids?: string;
}

export interface ListCustomersResponse {
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CustomerStatsResponse {
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
  notComboLive: number;
  hsd30?: number;
  lsd1?: number;
}

export interface BulkDeleteCustomersRequest {
  ids: number[];
}

export interface BulkDeleteCustomersResponse {
  success: boolean;
  count: number;
}

export interface Appointment {
  id: number;
  orderKey: string;
  bookingDateStart: string | null;
  bookingDateEnd: string | null;
  bookingNote: string | null;
  bookingChannel: string;
  orderState: string;
  totalPrice: number;
  customerId: number;
  customerName: string;
  customerAvatar: string | null;
  customerPhone: string;
  serviceName?: string;
  servicePrice?: number;
  discountPercent?: number;
  promotionName?: string | null;
  promotionDiscountPercent?: number | null;
  promotionDiscountAmount?: number | null;
  netRevenue?: number;
  tipAmount?: number;
  bookingBonus?: number;
  technicianId?: number | null;
  storeId?: number | null;
  branchName?: string;
  technicianName?: string;
  ccInName?: string;
  ccOutName?: string;
  bookerName?: string;
  ccInAvatar?: string | null;
  ccOutAvatar?: string | null;
  bookerAvatar?: string | null;
  missedLog?: MissedLog | null;
}

export interface CustomerHistoryEntry {
  id: number;
  customerId: number;
  action: string;
  note: string | null;
  createdAt: string;
  staffName: string | null;
}

export interface AssignmentHistoryBatch {
  batchId: string;
  assignedAt: string;
  assignedBy: string;
  newStaffName: string | null;
  newStaffId: number | null;
  prevStaffName?: string | null;
  customerCount: number;
  isUndone: boolean;
  undoneAt?: string | null;
  durationDays?: number | null;
  expiresAt?: string | null;
  sourceType?: string;
  sourceFilterJson?: string | null;
  sourceFilterSummary?: string | null;
  actionType?: 'ASSIGN' | 'REVOKE' | 'TRANSFER' | 'UNASSIGN' | 'RANDOM_SELECT' | string;
  reason?: string | null;
  parentBatchId?: string | null;
}

export interface RevokePreviewResponse {
  totalCount: number;
  unassignedCount: number;
  assignedCount: number;
  staffBreakdown: Array<{
    staffId: number;
    staffName: string;
    count: number;
  }>;
}

export interface RandomIdsResponse {
  ids: number[];
  batchId?: string;
  count?: number;
  filterSummary?: string;
}

export interface CustomerAssignmentTimelineItem {
  id: number;
  batchId: string;
  assignedAt: string;
  actionType: 'ASSIGN' | 'REVOKE' | 'EXPIRE' | 'UNDO' | 'TRANSFER' | string;
  staffId: number | null;
  staffName: string | null;
  prevStaffId: number | null;
  prevStaffName: string | null;
  assignedBy: string;
  expiresAt: string | null;
  durationDays: number | null;
  isRetained: boolean;
  sourceType: string;
  sourceFilterSummary: string | null;
  reason: string | null;
}

export interface AssignmentHistoryResponse {
  data: AssignmentHistoryBatch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AssignmentHistoryDetail {
  id: number;
  batchId: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  previousStaffName: string | null;
  newStaffName: string;
  createdAt: string;
}

export interface AssignmentHistoryDetailsResponse {
  data: AssignmentHistoryDetail[];
}

export interface Referral {
  id: number;
  referrerId: number;
  referredId: number;
  createdAt: string;
  referrerName: string;
  referrerPhone: string;
  referredName: string;
  referredPhone: string;
}

export interface AppointmentSummary {
  totalPending: number;
  totalMissed: number;
  totalCompleted: number;
  totalPlanned: number;
  totalCheckin: number;
  checkInRate: number;
  missedRate: number;
  pendingValue: number;
  completedRevenue: number;
  totalTips: number;
  totalBonus: number;
  baseSalary?: number;
}

export interface ListAppointmentsResponse {
  data: Appointment[];
  total: number;
  summary?: AppointmentSummary | null;
}

export interface CustomerNote {
  id: number;
  customerId: number;
  content: string;
  createdAt: string;
  staffName: string | null;
  note?: string;
  noteFieldKey?: string;
  isSticky?: boolean;
  isIssue?: boolean;
  dateCreated?: string | null;
  staffAvatar?: string | null;
}

export interface ComboBalance {
  id: number;
  customerId: number;
  serviceName: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  expiryDate: string | null;
}

export interface DetailedCustomerResponse {
  customer: Customer;
  stats: {
    totalCalls: number;
    totalBookings: number;
    totalSpent: number;
    successRate: number;
  };
  comboBalances: ComboBalance[];
  bookings: Appointment[];
  notes: CustomerNote[];
  calls: CallLog[];
}

export interface Promotion {
  id: number;
  name: string;
  code?: string;
  discountPercent?: number;
  description?: string | null;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

export type MissedReasonCategory =
  | 'KH_DOI_HUY_LICH'
  | 'GOI_KHONG_NGHE'
  | 'TIEM_QUATAI'
  | 'BOOKER_LATHUONG'
  | 'KTV_BAN_LOI'
  | 'KH_QUEN_LICH'
  | 'LY_DO_KHAC';

export type MissedResponsibility = 'CUSTOMER' | 'BOOKER' | 'CC' | 'TECHNICIAN' | 'STORE_SYSTEM';

export type MissedFollowUpStatus = 'PENDING' | 'CONTACTED' | 'RESCHEDULED' | 'UNREACHABLE' | 'CANCELLED';

export interface MissedLog {
  id?: number;
  orderId: number;
  reasonCategory: MissedReasonCategory;
  responsibility: MissedResponsibility;
  note?: string | null;
  followUpStatus: MissedFollowUpStatus;
  callbackDate?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MissedReasonBreakdownItem {
  reasonCategory: MissedReasonCategory;
  label: string;
  count: number;
  pct: number;
}

export interface MissedResponsibilityBreakdownItem {
  responsibility: MissedResponsibility;
  label: string;
  count: number;
  pct: number;
}

export interface MissedFollowUpBreakdownItem {
  status: MissedFollowUpStatus;
  label: string;
  count: number;
}

export interface MissedSummaryStats {
  totalMissed: number;
  totalPlanned: number;
  missedRatePct: number;
  taggedCount: number;
  untaggedCount: number;
  taggedRatePct: number;
  reasonBreakdown: MissedReasonBreakdownItem[];
  responsibilityBreakdown: MissedResponsibilityBreakdownItem[];
  followUpBreakdown: MissedFollowUpBreakdownItem[];
}

export interface SaveMissedLogInput {
  orderId: number;
  reasonCategory: MissedReasonCategory;
  responsibility: MissedResponsibility;
  note?: string;
  followUpStatus?: MissedFollowUpStatus;
  callbackDate?: string | null;
}

export type BookingActionType = 'CANCEL' | 'RESCHEDULE' | 'CHANGE_KTV' | 'CHANGE_STORE' | 'EDIT';

export interface BookingAuditLog {
  id: number;
  orderId: number;
  actionType: BookingActionType;
  actorStaffId: number;
  actorStaffName?: string | null;
  originalStaffId?: number | null;
  originalStaffName?: string | null;
  isCrossAction: boolean;
  reasonCategory?: string | null;
  reasonNote?: string | null;
  oldDataJson?: string | null;
  newDataJson?: string | null;
  ipAddress?: string | null;
  dateCreated: string;
  orderKey?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface BookingAuditLogFilter {
  dateFrom?: string;
  dateTo?: string;
  actorStaffId?: number | string;
  originalStaffId?: number | string;
  isCrossActionOnly?: boolean;
  actionType?: BookingActionType | 'ALL';
  page?: number | string;
  limit?: number | string;
}

export interface BookingAuditSummary {
  totalLogs: number;
  totalCrossActions: number;
  totalCrossCancels: number;
  totalCrossReschedules: number;
}
