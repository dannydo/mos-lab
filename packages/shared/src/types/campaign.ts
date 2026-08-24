export type CampaignStatus =
  'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ENDED' | 'ARCHIVED' | 'DELETED';

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
  assignedStaffIds?: number[] | null;
  touchpoints?: CreateCampaignTouchpointDto[];
  promotions?: CreateCampaignPromotionDto[];
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
