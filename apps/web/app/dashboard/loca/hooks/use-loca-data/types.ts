export interface Touchpoint {
  key: string;
  label: string;
  daysMin: number;
  daysMax: number;
  color: string;
}

export interface TabConfigs {
  [key: string]: Touchpoint[];
}

export interface CustomTouchpoint {
  key: string;
  daysMin: number;
  daysMax: number;
}

export interface UseLocaDataOptions {
  settingsForm?: SafeAny; // Ant Design FormInstance
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onWarning?: (msg: string) => void;
  onCloseDrawer?: () => void;
}

export interface LocaOverallStats {
  totalComboLive: number;
  hsd30Count: number;
  lsd1Count: number;
  totalCalledToday: number;
  totalBookedToday: number;
}

export type LocaContactSubTab = 'ALL' | 'CALL' | 'TEXT';
export type LocaDatePreset = 'today' | 'week' | 'month';
export type LocaBookingStatusFilter = 'ALL' | 'BOOKED' | 'NOT_BOOKED';
export type LocaActivityViewMode = 'month' | 'week' | 'day';
