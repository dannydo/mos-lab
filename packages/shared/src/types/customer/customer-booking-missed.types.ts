import type { BookingServiceStatus } from './customer-core.types.js';

/**
 * Lash technical specifications (Dáng, Cong, Độ dày, Độ dài, Số sợi, Fan, Màu)
 * for customer appointments.
 */
export interface LashSpecification {
  serviceId?: number;
  serviceName?: string;
  /** Dáng mi (Design / Style) */
  style?: string | null;
  /** Độ cong (Curl: J, B, C, D, L, ...) */
  curl?: string | null;
  /** Độ dày mi (Thickness: 0.05, 0.07, 0.10, 0.12, 0.15, ...) */
  thickness?: string | null;
  /** Độ dài (Length: 6, 7, 8, 9, 10, 11, 12, 13, ...) */
  length?: string | null;
  /** Số sợi (Strand count: 30, 40, 50, ..., 200) */
  strandCount?: string | null;
  /** Fan / Volume (1D, 2D, 3D, 4D, 5D, 6D, ...) */
  fan?: string | null;
  /** Màu (Color: Đen, Nâu, Black, Brown, ...) */
  color?: string | null;
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
  /** One legacy segment status per booked service, in display order. */
  serviceStatuses?: BookingServiceStatus[];
  /** Whether this appointment is a technical warranty order (Fix - Log - Adjust), excluded from regular lash cycle counting */
  isWarranty?: boolean;
  serviceTypes?: string[];
  /** Rule #21 source-of-truth combo state reconstructed at order creation time. */
  hasLiveComboAtBooking?: boolean;
  /** Lash technical specifications (Dáng mi, Độ cong, Độ dày, Độ dài, Số sợi, Fan, Màu) for completed bookings */
  lashSpecifications?: LashSpecification[];
  lashSpecs?: LashSpecification[];
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
  /** Canonical short code from the CRM branch catalog (crm_stores.code). */
  branchCode?: string | null;
  technicianName?: string;
  technicianAvatar?: string | null;
  ccInName?: string;
  ccOutName?: string;
  bookerName?: string;
  ccInAvatar?: string | null;
  ccOutAvatar?: string | null;
  bookerAvatar?: string | null;
  missedLog?: MissedLog | null;
  targetBookingDate?: string;
  targetBookingTime?: string;
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
  dailyCapacities?: Record<
    string,
    {
      workingKtvCount: number;
      maxCapacity: number;
      workingStaffList?: Array<{
        id: number;
        name: string;
        branchName?: string;
        branchCode?: string;
        shift?: string;
        bookedCount?: number;
        doneCount?: number;
        avgDurationMinutes?: {
          normalAvg?: number;
          retainAvg?: number;
          removalAvg?: number;
          overallAvg?: number;
        };
      }>;
      offStaffList?: Array<{
        id: number;
        name: string;
        branchName?: string;
        branchCode?: string;
        reason: string;
        type?: string;
      }>;
    }
  >;
  summary?: AppointmentSummary | null;
}

export interface Promotion {
  id: number;
  name: string;
  code?: string;
  /** Stable legacy key, when the legacy promotion exposes one. */
  promotionKey?: string | null;
  /** Percentage reduction for a standard legacy promotion. */
  discountPercentage?: number;
  /** Whole-VND reduction for a standard legacy promotion. */
  discountAmount?: number;
  /** @deprecated Use discountPercentage. Kept for older API consumers. */
  discountPercent?: number;
  description?: string | null;
}

export interface UpdateBookingRequest {
  /** Omit locked schedule fields when editing service details; the API preserves the existing booking values. */
  storeId?: number;
  technicianId?: number | null;
  bookingDate?: string;
  bookingTime?: string;
  bookingNote?: string | null;
  serviceId?: number | null;
  /** Standard legacy promotion. Mutually exclusive with campaignPromotionId. */
  promotionId?: number | null;
  /** CRM custom-campaign promotion. Mutually exclusive with promotionId. */
  campaignPromotionId?: number | null;
  reasonCategory?: string | null;
  reasonNote?: string | null;
}

/**
 * Returned before opening the reschedule wizard so the UI can explain an
 * authorization block without making the user complete the entire flow.
 * The booking update endpoint repeats the same check before writing data.
 */
export interface BookingRescheduleEligibilityResponse {
  allowed: boolean;
  reason: 'ALLOWED' | 'ROLE_NOT_ALLOWED' | 'CUSTOMER_NOT_ASSIGNED';
  message: string;
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

export type BookingActionType = 'CANCEL' | 'RESCHEDULE' | 'CHANGE_CV' | 'CHANGE_KTV' | 'CHANGE_STORE' | 'EDIT';

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
