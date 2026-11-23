import type { Customer, TouchpointStatus } from '@mos-lab/shared';

export interface LocaTouchpointConfigItem {
  key: string;
  label: string;
  daysMin: number;
  daysMax: number;
  color?: string;
}

export interface LocaColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  handleOpenDetailModal: (record: Customer) => void;
  formatVND: (value: number) => string;
  formatDuration: (secs: number) => string;
  dailyPlanList: number[];
  handleAddToPlan: (id: number) => void;
  makeCall: (
    phone: string,
    name?: string,
    customerId?: number,
    avatar?: string,
    planId?: number
  ) => Promise<void> | void;
  handleOpenSmsModal?: (record: Customer) => void;
  handleOpenBookingWizard?: (customer: Customer) => void;
  handleToggleTouchpoint?: (
    customerId: number,
    touchpointKey: string,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    hasReferredDiamond?: boolean,
    callbackDate?: string
  ) => Promise<void>;
  touchpointConfigs?: LocaTouchpointConfigItem[];
  addingIds?: number[];
  sortField?: string;
  currentPage?: number;
  pageSize?: number;
}
