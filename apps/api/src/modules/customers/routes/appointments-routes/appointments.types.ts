import { SafeAny } from '@mos-lab/shared';
import { BkPaystubResult } from '../../../kpi/services/bk-salary.service.js';

export interface AppointmentsListQuery {
  dateFrom?: string;
  dateTo?: string;
  type?: 'pending' | 'missed' | 'completed';
  status?: string;
  staffId?: string;
  storeId?: string;
  page?: string;
  limit?: string;
  pageSize?: string;
  missedStatusFilter?: 'ALL' | 'UNTAGGED' | 'FOLLOWUP' | 'RESOLVED';
}

export interface MissedLogPostBody {
  orderId?: number | string;
  reasonCategory?: string;
  responsibility?: string;
  note?: string;
  followUpStatus?: string;
  callbackDate?: string;
}

export interface MissedSummaryQuery {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}

export interface AppointmentAuthUser {
  id: number;
  role: string;
  displayName?: string;
  username?: string;
}

export type AppointmentsScopeResult =
  | { empty: true }
  | {
      empty: false;
      filterByStaff: boolean;
      staffLegacyId: number | null;
      staffRole: string;
      telesalesCustomerIdSql: string;
      missedFilterCond: string;
    };

export type ActiveAppointmentsScope = Extract<AppointmentsScopeResult, { empty: false }>;

export interface AppointmentOrderRow {
  id: number | bigint;
  orderKey: string | null;
  promotionId: number | bigint | null;
  selectedPromotionId: number | bigint | null;
  bookingDateStart: Date | string | null;
  actualBookingTime: string | null;
  bookingDateEnd: Date | string | null;
  bookingNote: string | null;
  bookingChannel: string | null;
  orderState: string | null;
  totalPrice: number | string | null;
  userId: number | bigint;
  dateCreated: Date | string | null;
  technicianId: number | bigint | null;
  technicianName: string | null;
  technicianAvatar: string | null;
  storeId: number | bigint | null;
  branchName: string | null;
  customerName: string | null;
  customerAvatar: string | null;
  customerPhone: string | null;
  bookerName: string | null;
  createdStaffId: number | bigint | null;
}

export interface AppointmentOrderServiceRow {
  order_id: number;
  service_id: number;
  service_price: number;
  discount_amount: number;
  promotion_id: number | null;
}

export interface AppointmentPaymentInfo {
  tips: number;
  debt: number;
  totalPaid: number;
}

export interface AppointmentPromoInfo {
  name: string;
  discountPercentage: number;
  discountAmount: number;
}

export interface AppointmentMissedLogDto {
  id: number;
  orderId: number;
  reasonCategory: string;
  responsibility: string;
  note: string | null;
  followUpStatus: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AppointmentEnrichmentData {
  orderPaymentMap: Map<number, AppointmentPaymentInfo>;
  orderServicesMap: Map<number, AppointmentOrderServiceRow[]>;
  serviceNameMap: Map<number, string>;
  promoDetailsMap: Map<number, AppointmentPromoInfo>;
  missedLogsMap: Map<number, AppointmentMissedLogDto>;
  crmStaffMap: Map<number, string>;
}

export interface AppointmentsSummaryDto {
  totalPending: number;
  totalMissed: number;
  totalCompleted: number;
  pendingValue: number;
  completedRevenue: number;
  totalPlanned: number;
  totalCheckin: number;
  checkInRate: number;
  baseSalary: number;
  clientBonus: number;
  doneBonus: number;
  doneLevelCount: number;
  missedBonus: number;
  missedLevelRate: number;
  missedRatePct: number;
  tipBonus: number;
  totalTips: number;
  revBonus: number;
  revLevelRate: number;
  revLevelMin: number;
  totalNetRev: number;
  totalSalary: number;
}

export interface AppointmentSummaryComputationResult {
  orderCheckinMap: BkPaystubResult['orderCheckinMap'];
  summary: AppointmentsSummaryDto;
}

export interface AppointmentItemDto {
  id: number;
  orderKey: string | null;
  bookingDateStart: string | null;
  bookingDateEnd: string | null;
  bookingNote: string | null;
  bookingChannel: string | null;
  orderState: string | null;
  totalPrice: number;
  customerId: number;
  customerName: string | null;
  customerAvatar: string | null;
  customerPhone: string | null;
  serviceName: string;
  servicePrice: number;
  discountPercent: number;
  promotionName: string | null;
  promotionDiscountPercent: number | null;
  promotionDiscountAmount: number | null;
  netRevenue: number;
  tipAmount: number;
  bookingBonus: number;
  technicianId: number | null;
  technicianName: string | null;
  technicianAvatar: string | null;
  storeId: number | null;
  branchName: string;
  branchCode: string | null;
  bookerName: string | null;
  missedLog: AppointmentMissedLogDto | null;
}

export interface StaffSpeedMetrics {
  normalAvg?: number;
  retainAvg?: number;
  removalAvg?: number;
  overallAvg?: number;
}

export interface WorkingStaffItemDto {
  id: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  branchCode?: string;
  shift?: string;
  bookedCount?: number;
  doneCount?: number;
  avgDurationMinutes?: StaffSpeedMetrics;
}

export interface OffStaffItemDto {
  id: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  branchCode?: string;
  reason: string;
  type?: string;
}

export interface DailyCapacityDto {
  workingKtvCount: number;
  maxCapacity: number;
  workingStaffList?: WorkingStaffItemDto[];
  offStaffList?: OffStaffItemDto[];
}

export interface DateOffInfo {
  reason: string;
  type: 'weekly_off' | 'urgent_off' | 'planned_off';
  daysAhead: number;
}

export type AppointmentPageQueryResult = {
  candidateIds: number[];
  total: number;
  result: AppointmentOrderRow[];
  branchCodeByStoreId: Map<number, string>;
};

export type LegacyQueryRows = SafeAny[];
