import type { Dayjs } from 'dayjs';
import type {
  Campaign,
  CampaignOperationMode,
  CampaignPromotion,
  CampaignPromotionType,
  CampaignStatus,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export interface CampaignFormTouchpoint {
  label?: string;
  key?: string;
  icon?: string;
  daysMin?: number;
  daysMax?: number | string | null;
  color?: string;
  sortOrder?: number;
}

export interface CampaignFormPromotion {
  name?: string;
  code?: string;
  type?: CampaignPromotionType;
  value?: number | string;
  description?: string;
  eligibleServiceSelection?: string[];
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
}

export interface CampaignFormValues {
  name: string;
  slug?: string;
  description?: string;
  dates?: [Dayjs | null, Dayjs | null] | null;
  status?: CampaignStatus;
  showInSidebar?: boolean;
  operationMode?: CampaignOperationMode;
  sharedPoolBatchSize?: number;
  sharedPoolMaxClaims?: number;
  sharedPoolTtl?: number;
  sharedPoolCooldown?: number;
  sharedPoolWarningThreshold?: number;
  sharedPoolCriticalThreshold?: number;
  recycleThinking?: number;
  recycleNoAnswer?: number;
  recycleBusy?: number;
  recycleError?: number;
  assignedStaffIds?: number[];
  touchpoints?: CampaignFormTouchpoint[];
  promotions?: CampaignFormPromotion[];
}

export interface CampaignDetailTouchpointRecord {
  label?: string;
  key?: string;
  icon?: string | null;
  daysMin?: number;
  daysMax?: number | null;
  color?: string | null;
  sortOrder?: number;
}

export interface CampaignDetailRecord extends Campaign {
  touchpoints?: CampaignDetailTouchpointRecord[];
  CampaignTouchpoint?: CampaignDetailTouchpointRecord[];
  promotions?: CampaignPromotion[];
  CampaignPromotion?: CampaignPromotion[];
}

export type CampaignStatusIconName =
  'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived' | 'deleted' | 'default';

export interface CampaignStatusMeta {
  status: StatusType;
  label: string;
  iconName: CampaignStatusIconName;
}

export const CAMPAIGN_SIDEBAR_STORAGE_KEYS = {
  showCustomCampaigns: 'mos_sidebar_show_custom_campaigns',
  campaignVisibility: 'mos_sidebar_campaign_visibility',
  toggleEvent: 'mos_sidebar_toggle',
} as const;

export const CAMPAIGN_PAGE_SIZE_OPTIONS = ['10', '20', '50'];

export const CAMPAIGN_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động (ACTIVE)' },
  { value: 'PAUSED', label: 'Tạm dừng (PAUSED)' },
  { value: 'SCHEDULED', label: 'Lên lịch (SCHEDULED)' },
  { value: 'DRAFT', label: 'Nháp (DRAFT)' },
  { value: 'COMPLETED', label: 'Đã hoàn thành (COMPLETED)' },
  { value: 'ARCHIVED', label: 'Lưu trữ (ARCHIVED)' },
  { value: 'DELETED', label: 'Đã xóa (DELETED)' },
] as const;

export const CAMPAIGN_FORM_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT (Nháp)' },
  { value: 'SCHEDULED', label: 'SCHEDULED (Lên lịch)' },
  { value: 'ACTIVE', label: 'ACTIVE (Đang hoạt động)' },
  { value: 'PAUSED', label: 'PAUSED (Tạm dừng)' },
  { value: 'COMPLETED', label: 'COMPLETED (Hoàn thành)' },
  { value: 'ARCHIVED', label: 'ARCHIVED (Lưu trữ)' },
  { value: 'DELETED', label: 'DELETED (Đã xóa)' },
] as const;

export const CAMPAIGN_OPERATION_MODE_OPTIONS = [
  {
    value: 'PERSONAL',
    label: 'Cá nhân — Data phân bổ riêng cho từng Booker (Chỉ NV được giao mới thấy)',
  },
  {
    value: 'SHARED_POOL',
    label: 'Teamwork / Shared Pool — Khai thác chung data theo Batch, Claim & Chống gọi trùng',
  },
] as const;

export const CAMPAIGN_PROMOTION_TYPE_OPTIONS = [
  { value: 'PERCENT_DISCOUNT', label: 'Giảm %' },
  { value: 'FIXED_DISCOUNT', label: 'Giảm số tiền' },
  { value: 'FIXED_FINAL_PRICE', label: 'Giá đồng nhất' },
  { value: 'FREE_SERVICE', label: 'Tặng dịch vụ' },
  { value: 'FREE_PRODUCT', label: 'Tặng sản phẩm' },
] as const;

export const CAMPAIGN_STATUS_META_MAP: Record<CampaignStatus, CampaignStatusMeta> = {
  DRAFT: { status: 'default', label: 'NHÁP', iconName: 'draft' },
  SCHEDULED: { status: 'processing', label: 'LÊN LỊCH', iconName: 'scheduled' },
  ACTIVE: { status: 'success', label: 'ĐANG CHẠY', iconName: 'active' },
  PAUSED: { status: 'warning', label: 'TẠM DỪNG', iconName: 'paused' },
  COMPLETED: { status: 'purple', label: 'HOÀN THÀNH', iconName: 'completed' },
  ENDED: { status: 'purple', label: 'HOÀN THÀNH', iconName: 'completed' },
  ARCHIVED: { status: 'orange', label: 'LƯU TRỮ', iconName: 'archived' },
  DELETED: { status: 'error', label: 'ĐÃ XÓA', iconName: 'deleted' },
};

export const CAMPAIGN_DEFAULT_TOUCHPOINTS: CampaignFormTouchpoint[] = [
  { label: 'Chạm D1', key: 'TP_D1', icon: 'Smile', daysMin: 1, daysMax: 1, color: 'green', sortOrder: 1 },
  { label: 'Chạm D3', key: 'TP_D3', icon: 'Handshake', daysMin: 3, daysMax: 3, color: 'indigo', sortOrder: 2 },
  { label: 'Chạm D7', key: 'TP_D7', icon: 'Kiss', daysMin: 7, daysMax: 7, color: 'amber', sortOrder: 3 },
  { label: 'Chạm D14', key: 'TP_D14', icon: 'Heart', daysMin: 14, daysMax: 14, color: 'orange', sortOrder: 4 },
  { label: 'Chạm D21', key: 'TP_D21', icon: 'BedDouble', daysMin: 21, daysMax: 21, color: 'red', sortOrder: 5 },
];

export const CAMPAIGN_DEFAULT_PROMOTIONS: CampaignFormPromotion[] = [
  {
    name: 'Giảm 20% Dịch vụ Nối mi',
    type: 'PERCENT_DISCOUNT',
    value: 20,
    description: 'Ưu đãi chiến dịch',
  },
];
