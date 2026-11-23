import type { Staff } from '@mos-lab/shared';

export interface TouchpointPalette {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const LOCA_CANONICAL_COLUMN_TITLES = {
  stt: null,
  expiryDate: 'HSD',
  daysSinceLastVisit: 'Đã Ghé',
  totalSpent: '∑ Chi Tiêu',
  lastCallDate: 'Last Called',
  lastCallDuration: 'Duration',
  lastCallResult: 'Call Status',
  lastCallNote: 'Call Notes',
} as const;

export const LOCA_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export const LOCA_STORAGE_KEYS = {
  pageSize: 'mos_loca_pageSize',
} as const;

export type LocaStaffOption = Staff;
