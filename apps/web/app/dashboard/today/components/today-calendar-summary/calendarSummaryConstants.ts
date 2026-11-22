import type { CalendarThemeMode } from './types';

export const CALENDAR_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

export interface BranchCalendarDisplayConfig {
  name: string;
  key: 'detham' | 'estella';
  strokeColor: string;
  textClass: string;
}

export const BRANCH_CALENDAR_CONFIG: Record<string, BranchCalendarDisplayConfig> = {
  detham: {
    name: 'Đề Thám',
    key: 'detham',
    strokeColor: 'rgba(250, 173, 20, 1)',
    textClass: 'text-amber-500',
  },
  estella: {
    name: 'Estella Place',
    key: 'estella',
    strokeColor: 'rgba(235, 47, 150, 1)',
    textClass: 'text-pink-500',
  },
};

export const BRANCH_DISPLAY_NAMES: Record<string, string> = {
  detham: 'Đề Thám',
  estella: 'Estella Place',
};

export const AVATAR_BG_CLASSES = [
  'bg-blue-500',
  'bg-purple-600',
  'bg-rose-500',
  'bg-orange-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-pink-500',
] as const;

export function getCalendarCardSurfaceClass(themeMode: CalendarThemeMode): string {
  return themeMode === 'dark'
    ? 'bg-[rgba(20,26,41,1)] border-[rgba(38,51,77,1)] dark:bg-[rgba(20,26,41,1)] dark:border-[rgba(38,51,77,1)]'
    : 'bg-white border-slate-200 dark:bg-[rgba(20,26,41,1)] dark:border-[rgba(38,51,77,1)]';
}

export function getCalendarBorderClass(themeMode: CalendarThemeMode): string {
  return themeMode === 'dark'
    ? 'border-[rgba(38,51,77,1)] dark:border-[rgba(38,51,77,1)]'
    : 'border-slate-200 dark:border-[rgba(38,51,77,1)]';
}
