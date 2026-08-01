export type CampaignStatus = 'ACTIVE' | 'ENDED' | 'ARCHIVED';

export type CampaignPromotionType = 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'FREE_SERVICE' | 'FREE_PRODUCT';

export interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CampaignStatus;
  createdBy: number | null;
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

export interface CampaignTouchpoint {
  id: number;
  campaignId: number;
  key: string;
  label: string;
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
  value: number;
  description: string | null;
  isActive: boolean;
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
  daysMin: number;
  daysMax?: number;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCampaignTouchpointDto {
  label?: string;
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
  description?: string;
}

export interface UpdateCampaignPromotionDto {
  name?: string;
  code?: string;
  type?: CampaignPromotionType;
  value?: number;
  description?: string;
  isActive?: boolean;
}

export interface CreateCampaignDto {
  name: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
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
  touchpoints?: CreateCampaignTouchpointDto[];
  promotions?: CreateCampaignPromotionDto[];
}

export interface AddCampaignCustomersDto {
  customerIds: number[];
}

export interface RemoveCampaignCustomerDto {
  reason?: string;
}

export interface ToggleCampaignTouchpointLogDto {
  isChecked: boolean;
  status?: TouchpointStatus | null;
  note?: string;
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
  description: string | null;
  isActive: boolean;
  label: string;
}

export interface CustomerCampaignPromotionInfo {
  campaignId: number;
  campaignName: string;
  campaignSlug: string;
  promotions: CustomerCampaignPromotionItem[];
}

export interface ListCampaignsParams {
  status?: CampaignStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}
