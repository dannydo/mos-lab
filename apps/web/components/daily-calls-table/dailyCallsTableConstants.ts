import type { DataColumnPriority } from '~/components/ui';
import type { DailyCallsScope } from './dailyCallsTableTypes';

export const DAILY_CALLS_TABLE_ID = 'daily_calls_table';

export const DAILY_CALLS_STORAGE_KEYS = {
  MOS_USER: 'mos_user',
  SELECTED_DATE: 'mos_daily_calls_selectedDate',
  SCOPE: 'mos_daily_calls_scope',
  SELECTED_STAFF_ID: 'mos_daily_calls_selectedStaffId',
  PAGE_SIZE: 'mos_daily_calls_pageSize',
  CURRENT_PAGE: 'mos_daily_calls_currentPage',
} as const;

export const DAILY_CALLS_PAGE_SIZE_OPTIONS = ['10', '20', '50'];

export const DAILY_CALLS_SCOPE_OPTIONS: ReadonlyArray<{ value: DailyCallsScope; label: string }> = [
  { value: 'all', label: 'Tất cả cuộc gọi' },
  { value: 'me', label: 'Khách của tôi' },
  { value: 'nyc', label: 'Chiến dịch NYC' },
];

export const DAILY_CALLS_DATA_UPDATED_EVENTS = [
  'mos-data-updated',
  'mos-call-log-saved',
  'mos-customer-updated',
  'mos-booking-updated',
] as const;

export const DAILY_CALLS_COLUMN_PRIORITY: Record<string, DataColumnPriority> = {
  customerId: 'tertiary',
  client: 'primary',
  makeCall: 'primary',
  lastTimeInBed: 'tertiary',
  lifetimeValue: 'secondary',
  assignedStaff: 'secondary',
  lastCall: 'secondary',
  duration: 'primary',
  callStatus: 'primary',
  callNotes: 'secondary',
  action: 'secondary',
};
