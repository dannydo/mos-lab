import type { Dayjs } from 'dayjs';
import type { CampaignBookingStatusFilter, CampaignPromotionType, CampaignStatus } from '@mos-lab/shared';

export interface CampaignDetailUser {
  id?: number;
  role?: string;
  username?: string;
  displayName?: string;
}

export type CampaignRemovalConfirmState =
  | {
      mode: 'single';
      customerId: number;
      customerName: string;
    }
  | {
      mode: 'batch';
      customerIds: number[];
      count: number;
    }
  | null;

export interface RandomSelectionFilterOptions {
  excludeAssigned: boolean;
  excludeUnconfirmedAllocation: boolean;
  excludeFutureBooking: boolean;
}

export type BookingStatusIconKey = 'filter' | 'calendar' | 'check' | 'warning';

export interface BookingStatusFilterOption {
  value: CampaignBookingStatusFilter;
  label: string;
  iconKey: BookingStatusIconKey;
  activeClassName: string;
}

export interface CampaignEditTouchpointInput {
  id?: number;
  key?: string;
  label?: string;
  icon?: string;
  daysMin?: number;
  daysMax?: number;
  color?: string;
}

export interface CampaignEditPromotionInput {
  name?: string;
  type?: CampaignPromotionType;
  value?: number | string;
  code?: string;
  description?: string;
  eligibleServiceSelection?: string[];
}

export interface CampaignEditFormValues {
  name: string;
  slug?: string;
  status: CampaignStatus;
  description?: string | null;
  dates?: [Dayjs, Dayjs] | null;
  assignedStaffIds?: number[];
  touchpoints?: CampaignEditTouchpointInput[];
  promotions?: CampaignEditPromotionInput[];
}
