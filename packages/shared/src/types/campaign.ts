export type CampaignStatus =
  'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ENDED' | 'ARCHIVED' | 'DELETED';

export type CampaignOperationMode = 'PERSONAL' | 'SHARED_POOL';

export type CampaignPoolStatus = 'AVAILABLE' | 'CLAIMED' | 'EXPLOITED' | 'RECYCLING' | 'EXCLUDED' | 'BOOKED';

export interface SharedPoolRecycleRules {
  THINKING?: number | null; // Days until re-entering pool (e.g. 3)
  NO_ANSWER?: number | null; // Days until re-entering pool (e.g. 1)
  BUSY?: number | null; // Days until re-entering pool (e.g. 1)
  ERROR?: number | null; // Days until re-entering pool (e.g. 1)
  CALLBACK?: string | null; // 'CUSTOM_DATE'
  REJECTED?: null;
  WRONG_NUMBER?: null;
  NO_NEED?: null;
  BOOKED?: null;
}

export interface SharedPoolConfig {
  batchSize: number; // e.g. 100
  claimTtlMinutes: number; // e.g. 15
  maxClaimsPerStaff: number; // e.g. 1
  cooldownMinutes: number; // e.g. 60
  warningThreshold: number; // e.g. 30 (%)
  criticalThreshold: number; // e.g. 10 (%)
  isPaused: boolean;
  recycleRules?: Partial<SharedPoolRecycleRules>;
}

export const DEFAULT_SHARED_POOL_CONFIG: SharedPoolConfig = {
  batchSize: 100,
  claimTtlMinutes: 15,
  maxClaimsPerStaff: 1,
  cooldownMinutes: 60,
  warningThreshold: 30,
  criticalThreshold: 10,
  isPaused: false,
  recycleRules: {
    THINKING: 7,
    NO_ANSWER: 3,
    BUSY: 3,
    ERROR: 3,
    CALLBACK: 'CUSTOM_DATE',
    REJECTED: null,
    WRONG_NUMBER: null,
    NO_NEED: null,
    BOOKED: null,
  },
};

export interface SharedPoolOverviewStats {
  activeBatchNumber: number;
  totalBatches: number;
  batchSize: number;
  isPaused: boolean;
  // Active batch metrics
  batchTotal: number;
  batchAvailable: number;
  batchClaimed: number;
  batchExploited: number;
  batchRecycling: number;
  batchExcluded: number;
  batchBooked: number;
  // Campaign-wide data pool metrics
  totalCustomers: number;
  totalExploited: number;
  totalRemaining: number;
  totalExcluded?: number;
  percentRemaining: number;
  // Early warning & forecasting
  warningLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED';
  warningMessage: string;
  burnRatePerHour: number;
  estimatedHoursRemaining: number | null;
  // Team member performance metrics (MOS-BUG-81)
  staffPerformance?: CampaignStaffPerformanceResponse;
}

export interface CampaignStaffPerformance {
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  exploitedCount: number; // Đã khai thác: X KH
  pickupCount: number; // Pickup: X
  bookedCount: number; // Book: X
  conversionRate: number; // Tỷ lệ Data → Book: X%
  claimedCount?: number; // Lượt nhận khách (Claim)
}

export interface CampaignStaffPerformanceResponse {
  campaignId: number;
  campaignName: string;
  startDate: string | null;
  endDate: string | null;
  totalMembers: number;
  items: CampaignStaffPerformance[];
  summary: {
    totalExploited: number;
    totalPickup: number;
    totalBooked: number;
    avgConversionRate: number;
  };
}

export interface CampaignSharedPoolLog {
  id: number;
  campaignId: number;
  campaignCustomerId?: number | null;
  legacyUserId?: number | null;
  staffId: number | null;
  staffName: string | null;
  action: string;
  note: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface CampaignSharedPoolDetailedLog {
  id: number;
  campaignId: number;
  campaignCustomerId?: number | null;
  legacyUserId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  currentPoolStatus?: string | null;
  currentClaimedByStaffId?: number | null;
  currentClaimedByStaffName?: string | null;
  staffId: number | null;
  staffName: string | null;
  action: string;
  actionLabel: string;
  previousPoolStatus?: string | null;
  nextPoolStatus?: string | null;
  previousClaimedByStaffName?: string | null;
  nextClaimedByStaffName?: string | null;
  note: string | null;
  metadata?: any;
  result?: string | null;
  isDrifted?: boolean;
  canRestore?: boolean;
  createdAt: string;
}

export interface SharedPoolHistoryQueryParams {
  page?: number;
  pageSize?: number;
  action?: string;
  search?: string;
  customerId?: number;
  staffId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface SharedPoolHistoryResponse {
  items: CampaignSharedPoolDetailedLog[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export type SharedPoolRecoveryAction =
  'RELEASE_CLAIM' | 'FORCE_UNLOCK' | 'RESTORE_EXCLUDED' | 'RESET_POOL_STATUS' | 'RESET_RECYCLE' | 'ROLLBACK_TO_LOG';

export interface SharedPoolRecoveryDto {
  customerId: number;
  action: SharedPoolRecoveryAction;
  targetPoolStatus?: string;
  logId?: number;
  reason: string;
  forceOverride?: boolean;
}

export interface SharedPoolRecoveryResponse {
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  driftDetected?: boolean;
  currentStatus?: string;
  targetPreviousStatus?: string;
  customer?: any;
}

export type CampaignPromotionType =
  'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'FIXED_FINAL_PRICE' | 'FREE_SERVICE' | 'FREE_PRODUCT';

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CampaignStatus;
  operationMode?: CampaignOperationMode;
  sharedPoolConfig?: SharedPoolConfig | null;
  currentBatchNumber?: number;
  createdBy: number | null;
  assignedStaffIds?: number[] | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers?: number;
    touchpoints?: number;
    promotions?: number;
  };
}

export interface CampaignCustomer {
  id: number;
  campaignId: number;
  legacyUserId: number;
  addedAt: string;
  addedBy: number | null;
  removedAt: string | null;
  removedReason: string | null;
  removedBy: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  // Shared Pool attributes
  batchNumber?: number;
  poolStatus?: CampaignPoolStatus;
  claimedByStaffId?: number | null;
  claimedByStaffName?: string | null;
  claimedAt?: string | null;
  claimExpiresAt?: string | null;
  cooldownUntil?: string | null;
  availableAt?: string | null;
  lastCallStaffId?: number | null;
  lastCallStaffName?: string | null;
  lastCallAt?: string | null;
  lastCallResult?: string | null;
  lastCallNote?: string | null;
  bookedByStaffId?: number | null;
  bookedByStaffName?: string | null;
  bookedAt?: string | null;
  callCount?: number;
  isClaimedByMe?: boolean;
  canClaim?: boolean;
  canCall?: boolean;
  claimRemainingSeconds?: number;
  cooldownRemainingSeconds?: number;
}

/**
 * Quick operational filter for campaign customers. `DONE` means the customer
 * completed a service within the campaign's configured operating window.
 */
export type CampaignBookingStatusFilter = 'ALL' | 'BOOKED' | 'DONE' | 'MISSED';

export interface CampaignCustomersQueryParams {
  page?: number;
  pageSize?: number;
  assignedStaffId?: string | number;
  search?: string;
  touchpointKey?: string;
  bookingStatus?: CampaignBookingStatusFilter;
  batchNumber?: number | 'ALL';
  poolStatus?: CampaignPoolStatus | 'ALL' | 'REMAINING' | 'RECYCLE';
}

export interface CampaignTouchpoint {
  id: number;
  campaignId: number;
  key: string;
  label: string;
  icon?: string | null;
  daysMin: number;
  daysMax: number | null;
  color: string | null;
  sortOrder: number;
}

export interface CampaignPromotion {
  id: number;
  campaignId: number;
  name: string;
  code: string | null;
  type: CampaignPromotionType;
  /**
   * VND final price for FIXED_FINAL_PRICE; discount value for legacy promotion
   * types. All VND values are whole integers.
   */
  value: number;
  /** Service IDs that can receive a fixed final price. */
  eligibleServiceIds?: number[];
  /** Catalog lash-family keys (for example `hyperlight`) expanded server-side. */
  eligibleServiceCategoryKeys?: string[];
  description: string | null;
  isActive: boolean;
  legacyPromotionId?: number | null;
  createdAt: string;
}

import { TouchpointStatus } from './customer';

export interface CampaignTouchpointLog {
  id: number;
  campaignCustomerId: number;
  touchpointId: number;
  isChecked: boolean;
  status?: TouchpointStatus | null;
  completedAt: string | null;
  completedByStaffId: number | null;
  completedByStaffName: string | null;
  note: string | null;
}

export interface CreateCampaignTouchpointDto {
  key: string;
  label: string;
  icon?: string;
  daysMin: number;
  daysMax?: number;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCampaignTouchpointDto {
  label?: string;
  icon?: string;
  daysMin?: number;
  daysMax?: number;
  color?: string;
  sortOrder?: number;
}

export interface CreateCampaignPromotionDto {
  name: string;
  code?: string;
  type: CampaignPromotionType;
  value: number;
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
  description?: string;
}

export interface UpdateCampaignPromotionDto {
  name?: string;
  code?: string;
  type?: CampaignPromotionType;
  value?: number;
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
  description?: string;
  isActive?: boolean;
}

export interface CreateCampaignDto {
  name: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: CampaignStatus;
  operationMode?: CampaignOperationMode;
  sharedPoolConfig?: SharedPoolConfig | null;
  currentBatchNumber?: number;
  assignedStaffIds?: number[] | null;
  touchpoints?: CreateCampaignTouchpointDto[];
  promotions?: CreateCampaignPromotionDto[];
}

export interface UpdateCampaignDto {
  name?: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: CampaignStatus;
  operationMode?: CampaignOperationMode;
  sharedPoolConfig?: SharedPoolConfig | null;
  currentBatchNumber?: number;
  assignedStaffIds?: number[] | null;
  touchpoints?: CreateCampaignTouchpointDto[];
  promotions?: CreateCampaignPromotionDto[];
}

export interface ClaimSharedCustomerDto {
  customerId: number;
}

export interface ReleaseSharedCustomerDto {
  customerId: number;
}

export interface UpdateSharedPoolStatusDto {
  customerId: number;
  callResult: string; // THINKING | NO_ANSWER | BUSY | ERROR | CALLBACK | NO_NEED | REJECTED | WRONG_NUMBER | BOOKED | COMPLETED
  note?: string;
  durationSec?: number;
  callbackDate?: string;
  isBooked?: boolean;
}

export interface AdvanceSharedPoolBatchDto {
  targetBatchNumber?: number;
}

export interface ToggleSharedPoolPauseDto {
  isPaused: boolean;
}

export interface SyncSharedPoolCallDto {
  customerId: number;
}

export interface ManagerPoolActionDto {
  customerId: number;
  action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED';
  reason?: string;
}

export interface BatchManagerPoolActionDto {
  customerIds: number[];
  action: 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED';
  reason?: string;
}

export interface AddCampaignCustomersDto {
  customerIds: number[];
}

export interface AddCustomerDetail {
  legacyUserId: number;
  customerName: string;
  customerPhone?: string | null;
  status: 'ADDED' | 'SKIPPED';
  reason?: string;
  currentCampaignId?: number | null;
  currentCampaignName?: string | null;
}

export interface AddCampaignCustomersResponse {
  success: boolean;
  message: string;
  addedCount: number;
  skippedCount: number;
  details: AddCustomerDetail[];
}

export interface TransferCampaignCustomersDto {
  customerIds: number[];
  reason?: string;
}

export interface RemoveCampaignCustomerDto {
  reason?: string;
}

export interface BatchRemoveCampaignCustomersDto {
  customerIds: number[];
  reason?: string;
}

export interface ToggleCampaignTouchpointLogDto {
  isChecked: boolean;
  status?: TouchpointStatus | null;
  note?: string;
  callbackDate?: string;
}

export interface CampaignStatsResponse {
  totalCustomers: number;
  bookedCount: number;
  bookedRate: number;
  totalTouchpointLogs: number;
  totalCallsToday: number;
  campaignRevenue: number;
}

export interface CustomerCampaignPromotionItem {
  id: number;
  campaignId: number;
  name: string;
  code: string | null;
  type: CampaignPromotionType;
  value: number;
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
  /** Human-readable catalog family labels resolved by the backend. */
  eligibleServiceCategoryLabels?: string[];
  description: string | null;
  isActive: boolean;
  label: string;
  legacyPromotionId?: number | null;
}

export interface CustomerCampaignPromotionInfo {
  campaignId: number;
  campaignName: string;
  campaignSlug: string;
  promotions: CustomerCampaignPromotionItem[];
}

/** A promotion that is safe to apply while editing an existing booking. */
export interface BookingPromotionOption {
  id: number;
  source: 'STANDARD' | 'CUSTOM_CAMPAIGN';
  name: string;
  label: string;
  code?: string | null;
  campaignId?: number | null;
  campaignName?: string | null;
  promotionType: CampaignPromotionType | null;
  value: number;
  /** Standard-promotion values, supplied so UI previews do not infer a type. */
  discountPercentage?: number;
  discountAmount?: number;
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
  eligibleServiceCategoryLabels?: string[];
}

/**
 * A booking that originated from a custom campaign is locked to that campaign's
 * promotion list. Standard bookings receive the standard promotion list instead.
 */
export interface BookingPromotionOptionsResponse {
  mode: 'STANDARD' | 'CUSTOM_CAMPAIGN';
  campaign: {
    id: number;
    name: string;
    slug: string;
  } | null;
  selectedPromotionId: number | null;
  selectedCampaignPromotionId: number | null;
  promotions: BookingPromotionOption[];
}

export interface ListCampaignsParams {
  status?: CampaignStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CloneCampaignDto {
  name?: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReopenCampaignDto {
  endDate?: string;
}
