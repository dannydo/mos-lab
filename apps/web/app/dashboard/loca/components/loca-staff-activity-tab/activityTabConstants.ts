import type { LocaActivityViewMode, SelectOptionItem, TouchpointChipConfig } from './types';

export const EXCLUDED_ACTIVITY_STAFF_ROLES = new Set(['security-guard', 'office-cleaner', 'teacher', 'ktv']);

export const ACTIVITY_VIEW_MODE_OPTIONS: ReadonlyArray<{
  label: string;
  value: LocaActivityViewMode;
}> = [
  { label: 'Tháng', value: 'month' },
  { label: 'Tuần', value: 'week' },
  { label: 'Ngày', value: 'day' },
];

export const ACTIVITY_ACTION_TYPE_OPTIONS: SelectOptionItem[] = [
  { value: 'ALL', label: 'Tất cả Hành động' },
  { value: 'CALL', label: '📞 Cuộc gọi' },
  { value: 'TOUCHPOINT', label: '✅ Điểm chạm' },
  { value: 'BOOKED', label: '📅 Đặt lịch' },
];

export const CUSTOMER_AVATAR_BG_CLASSES: ReadonlyArray<string> = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-slate-500',
  'bg-amber-600',
];

export const TOUCHPOINT_CHIP_CONFIGS: ReadonlyArray<TouchpointChipConfig> = [
  { key: '24h', label: '24h', textColorClass: 'text-emerald-500' },
  { key: '17', label: 'Chạm 17', textColorClass: 'text-blue-500' },
  { key: '19', label: 'Chạm 19', textColorClass: 'text-indigo-500' },
  { key: '21', label: 'Chạm 21', textColorClass: 'text-violet-500' },
  { key: '23', label: 'Chạm 23', textColorClass: 'text-pink-500' },
  { key: '25', label: 'Chạm 25', textColorClass: 'text-rose-500' },
  { key: '30', label: 'Chạm 30', textColorClass: 'text-red-500' },
  { key: '30plus', label: 'Chạm 30+', textColorClass: 'text-amber-600' },
];
