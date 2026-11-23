import type { TouchpointStatus } from '@mos-lab/shared';

export interface CampaignTouchpointItem {
  id: number;
  key: string;
  label: string;
  icon?: string | null;
  daysMin?: number;
  daysMax?: number | null;
  color?: string | null;
  sortOrder?: number;
}

export interface CampaignTouchpointCellProps {
  customer: any;
  touchpoint: CampaignTouchpointItem;
  themeMode: 'light' | 'dark';
  onToggle: (
    customerId: number,
    touchpointId: number,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    callbackDate?: string
  ) => Promise<void>;
  onOpenBooking?: (customer: any) => void;
}

export type TouchpointDisplayStatus = TouchpointStatus | 'OVERDUE' | 'BLANK';

export type TouchpointActionStatus = 'SUCCESS' | 'FAILED' | 'MESSAGED' | 'CALLBACK' | 'BOOKED' | 'LOST';
