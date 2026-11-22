import type { Staff } from '@mos-lab/shared';

export const NYC_CANONICAL_COLUMN_TITLES = {
  stt: null,
} as const;

export const NYC_SETTINGS_MODAL_DEFAULTS = {
  width: 700,
  height: 550,
  minWidth: 500,
  maxWidth: 1800,
  minHeight: 350,
  maxHeight: 1000,
} as const;

export const NYC_STORAGE_KEYS = {
  modalWidth: 'mos_nyc_settings_modal_width',
  modalHeight: 'mos_nyc_settings_modal_height',
  pageSize: 'mos_nyc_pageSize',
} as const;

export const NYC_SORT_OPTIONS = [
  { value: 'daysSinceLastVisit_asc', label: 'Chưa ghé ↑' },
  { value: 'daysSinceLastVisit_desc', label: 'Chưa ghé ↓' },
  { value: 'totalSpent_desc', label: 'Doanh thu LTV ↓' },
  { value: 'lastCallDate_desc', label: 'Gọi gần nhất' },
  { value: 'lastCallDate_asc', label: 'Gọi lâu nhất' },
] as const;

export const NYC_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export type NycStaffOption = Staff & {
  staff_role?: string;
  name?: string;
};

export interface NycOverallStats {
  totalCalledToday: number;
  totalPlannedToday: number;
  totalBookedToday: number;
}
