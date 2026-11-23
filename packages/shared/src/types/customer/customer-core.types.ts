export type BucketType = 'COMBO_LIVE' | 'COMBO_DEAD' | 'SINGLE' | 'COMBO_ELSA';

/** Status assigned by WingsLashes at the time a service was booked. */
export type BookingUserServiceType =
  | 'lead'
  | 'lead_book'
  | 'new'
  | 'combo'
  | 'combo_last'
  | 'combo_expired'
  | 'combo_over'
  | 'long_time'
  | 'lapser'
  | 'occasion'
  | 'lost'
  | 'game';

export interface BookingServiceStatus {
  serviceName: string;
  serviceType?: string | null;
  /** Unknown legacy values remain representable instead of being discarded. */
  userServiceType: BookingUserServiceType | (string & {}) | null;
}

export type TouchpointStatus =
  'SUCCESS' | 'MESSAGED' | 'FAILED' | 'LOST' | 'PENDING' | 'DUE_TODAY' | 'BOOKED' | 'DONE' | 'CALLBACK';

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
  age?: number | null;
  lastVisit: string | null; // ISO Date String
  daysSinceLastVisit: number | null;
  totalSpent: number;
  totalVisits: number;
  bucket: BucketType;
  totalPromotionsUsed?: number;
  totalReferrals?: number;
  avatar?: string | null;
  isForeign?: boolean;
  isForeignOverridden?: boolean;

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
  elsaReservation?: CustomerElsaReservation | null;
}

export interface CustomerElsaReservation {
  id: number;
  legacyUserId: number;
  status: 'ACTIVE' | 'RELEASED' | 'CANCELLED';
  reservationType: 'FIXED_TERM' | 'INDEFINITE';
  reason: string;
  startDate: string;
  endDate: string | null;
  reminderDate: string | null;
  reminderNote: string | null;
  isReminderDismissed: boolean;
  createdByStaffId: number | null;
  createdByStaffName: string | null;
  releasedAt?: string | null;
  releasedByStaffId?: number | null;
  releasedByStaffName?: string | null;
  releaseNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateElsaReservationInput {
  reason: string;
  reservationType?: 'FIXED_TERM' | 'INDEFINITE';
  endDate?: string | null;
  reminderDate: string;
  reminderNote?: string | null;
}

export interface ReleaseElsaReservationInput {
  releaseNote?: string | null;
}

export interface CustomerStats {
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
  comboElsa?: number;
}

/**
 * The legacy customer form values that can be captured before an appointment
 * exists. Name and phone identify the lead; every other legacy field is
 * deliberately optional.
 */
export interface CreateCustomerInput {
  name: string;
  phone: string;
  /** Explicit country status selected by the operator. When absent, infer it from the phone. */
  isForeign?: boolean | null;
  referrerPhone?: string | null;
  genderAttributeId?: number | null;
  dateOfBirth?: string | null;
  languageId?: number | null;
  socialProfileName?: string | null;
  socialProfileLink?: string | null;
  socialMessageLink?: string | null;
  campaignId?: number | null;
  advertiseId?: number | null;
  storeId?: number | null;
}

export interface CreateCustomerResponse {
  success: boolean;
  customer: Pick<Customer, 'id' | 'name' | 'phone'>;
  message: string;
}

export interface CustomerCreationOptionsResponse {
  campaigns: Array<{ id: number; name: string }>;
  advertises: Array<{ id: number; campaignId: number; name: string }>;
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
  bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE' | 'NEW_LOCA';
  search?: string;
  page?: number | string;
  limit?: number | string;
  sort?: string;
  sortField?: string;
  daysSinceLastVisitMin?: number | string;
  daysSinceLastVisitMax?: number | string;
  totalSpentMin?: number | string;
  totalSpentMax?: number | string;
  totalVisitsMin?: number | string;
  totalVisitsMax?: number | string;
  /** Comma-separated legacy service IDs. A customer matches when they completed any selected service. */
  serviceIds?: string;
  /** Number of completed orders containing a selected service. */
  serviceVisitCountMin?: number | string;
  serviceVisitCountMax?: number | string;
  promoUsed?: 'yes' | 'no' | 'all';
  promoCountMin?: number | string;
  promoCountMax?: number | string;
  referralUsed?: 'yes' | 'no' | 'all';
  referralCountMin?: number | string;
  referralCountMax?: number | string;
  assignedStaffId?: string;
  assignedDaysMin?: number | string;
  assignedDaysMax?: number | string;
  dobMonth?: number | string;
  birthdayPreset?: 'today' | 'this_month' | 'next_month';
  ageMin?: number | string;
  ageMax?: number | string;
  callStatuses?: string;
  lastCallDaysMin?: number | string;
  lastCallDaysMax?: number | string;
  trash?: string | boolean;
  ids?: string;
  hsd30?: string | boolean;
  lsd1?: string | boolean;
  hasProduct?: string | boolean;
  contacted?: string | boolean;
  contactType?: string;
  hasCallback?: string | boolean;
  hasFutureBooking?: string | boolean;
  dateFrom?: string;
  dateTo?: string;
  retainedOnly?: string | boolean;
  allocationBatchId?: string;
  isForeign?: 'all' | 'foreign' | 'local' | boolean | string;
  /** Filter by NYC campaign participation history */
  campaignId?: number | string;
  /** Campaign filter mode: 'ALL' (no filter) | 'IN' (participated) | 'NOT_IN' (never participated) */
  campaignFilterMode?: 'ALL' | 'IN' | 'NOT_IN' | 'all' | 'in' | 'not_in';
}

/** An active catalog service available for customer segmentation. */
export interface CustomerServiceFilterOption {
  id: number;
  name: string;
  serviceType: string | null;
  serviceGroup: string | null;
  /** Active VND single-service price, when the catalog exposes one. */
  singlePrice: number | null;
}

export interface CustomerServiceFilterCategory {
  /** Stable key persisted by saved customer filters. */
  key: string;
  label: string;
  /** Active legacy catalog IDs resolved from the database for this family. */
  serviceIds: number[];
}

export interface CustomerServiceFilterOptionsResponse {
  services: CustomerServiceFilterOption[];
  /** Only families that actually exist in the active catalog are returned. */
  categories: CustomerServiceFilterCategory[];
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
  comboElsa?: number;
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

export interface CustomerHistoryEntry {
  id: number;
  customerId: number;
  action: string;
  note: string | null;
  createdAt: string;
  staffName: string | null;
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

export interface ReferralTabCounts {
  all_time: number;
  this_month: number;
  last_month: number;
  this_year: number;
  last_year: number;
}

export interface ReferralFriendItem {
  id: number;
  name: string;
  phone: string;
  dateCreated: string | null;
  rewardDiamonds: number;
}

export interface ReferrerSummaryItem {
  referrerId: number;
  referrerName: string;
  referrerPhone: string;
  totalReferred: number;
  totalRewardDiamonds: number;
  referredUsers: ReferralFriendItem[];
}

export interface ReferralsPaginatedResponse {
  items: ReferrerSummaryItem[];
  total: number;
  page: number;
  pageSize: number;
  tabCounts: ReferralTabCounts;
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
