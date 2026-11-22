import type { TouchpointStatus } from '@mos-lab/shared';
import type { CampaignTouchpointItem, TouchpointActionStatus, TouchpointDisplayStatus } from './touchpoint-cell-types';

export const DIAMOND_NOTE_TAG = '[Đã tư vấn CT Kim Cương 💎]';

interface TouchpointDayWindow {
  min: number;
  max: number | null;
  strictMin?: boolean;
}

const LEGACY_TOUCHPOINT_WINDOWS: Record<string, TouchpointDayWindow> = {
  '24h': { min: 1, max: 1 },
  '17': { min: 16, max: 17 },
  '17d': { min: 16, max: 17 },
  '19': { min: 18, max: 19 },
  '19d': { min: 18, max: 19 },
  '21': { min: 20, max: 21 },
  '21d': { min: 20, max: 21 },
  '23': { min: 22, max: 23 },
  '23d': { min: 22, max: 23 },
  '25': { min: 24, max: 25 },
  '25d': { min: 24, max: 25 },
  '30': { min: 29, max: 30 },
  '30d': { min: 29, max: 30 },
  '30plus': { min: 30, max: null, strictMin: true },
  '30dplus': { min: 30, max: null, strictMin: true },
};

export interface TouchpointStatusButtonConfig {
  status: TouchpointActionStatus;
  label: string;
  iconColorClass: string;
  selectedDarkClass: string;
  selectedLightClass: string;
  triggersBookingModal?: boolean;
}

export const TOUCHPOINT_STATUS_BUTTONS: readonly TouchpointStatusButtonConfig[] = [
  {
    status: 'SUCCESS',
    label: 'Hoàn tất (Gọi thành công)',
    iconColorClass: 'text-emerald-500',
    selectedDarkClass: 'border-2 border-emerald-500 bg-emerald-900 text-emerald-400',
    selectedLightClass: 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    status: 'FAILED',
    label: 'Fail (Cuộc gọi thất bại)',
    iconColorClass: 'text-rose-500',
    selectedDarkClass: 'border-2 border-red-500 bg-red-900 text-red-300',
    selectedLightClass: 'border-2 border-red-500 bg-red-50 text-red-700',
  },
  {
    status: 'MESSAGED',
    label: 'Nhắn tin thành công',
    iconColorClass: 'text-cyan-500',
    selectedDarkClass: 'border-2 border-cyan-500 bg-cyan-900 text-cyan-300',
    selectedLightClass: 'border-2 border-cyan-500 bg-cyan-50 text-cyan-600',
  },
  {
    status: 'CALLBACK',
    label: 'Hẹn gọi lại (Lên lịch gọi)',
    iconColorClass: 'text-purple-500',
    selectedDarkClass: 'border-2 border-purple-500 bg-purple-900 text-purple-400',
    selectedLightClass: 'border-2 border-purple-500 bg-purple-100 text-purple-700',
  },
  {
    status: 'BOOKED',
    label: 'Đã đặt lịch (Chuyển đổi Book)',
    iconColorClass: 'text-indigo-500',
    selectedDarkClass: 'border-2 border-indigo-500 bg-indigo-900 text-indigo-300',
    selectedLightClass: 'border-2 border-indigo-500 bg-indigo-100 text-indigo-700',
    triggersBookingModal: true,
  },
  {
    status: 'LOST',
    label: 'Không thuộc về nhau',
    iconColorClass: 'text-pink-500',
    selectedDarkClass: 'border-2 border-rose-500 bg-rose-900 text-rose-300',
    selectedLightClass: 'border-2 border-rose-500 bg-rose-50 text-rose-700',
  },
];

export const CALLBACK_QUICK_PRESETS: ReadonlyArray<{ label: string; addDays: number }> = [
  { label: 'Hôm nay', addDays: 0 },
  { label: 'Ngày mai', addDays: 1 },
  { label: '3 ngày', addDays: 3 },
  { label: '7 ngày', addDays: 7 },
];

const DEFAULT_PILL_STYLE = {
  dark: 'bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.25)] text-slate-400',
  light: 'bg-[rgba(241,245,249,0.6)] border border-[rgba(203,213,225,0.6)] text-slate-500',
};

const PILL_STATUS_STYLES: Record<TouchpointDisplayStatus, { dark: string; light: string }> = {
  DONE: {
    dark: 'bg-[rgba(5,150,105,0.35)] border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(5,150,105,0.6)]',
    light: 'bg-[rgba(16,185,129,0.2)] border border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(5,150,105,0.6)]',
  },
  BOOKED: {
    dark: 'bg-[rgba(99,102,241,0.3)] border border-indigo-400 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
    light: 'bg-[rgba(99,102,241,0.18)] border border-indigo-400 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
  },
  SUCCESS: {
    dark: 'bg-[rgba(16,185,129,0.25)] border border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    light:
      'bg-[rgba(16,185,129,0.15)] border border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  },
  CALLBACK: {
    dark: 'bg-[rgba(168,85,247,0.25)] border border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    light: 'bg-[rgba(168,85,247,0.15)] border border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
  },
  MESSAGED: {
    dark: 'bg-[rgba(6,182,212,0.25)] border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    light: 'bg-[rgba(6,182,212,0.15)] border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
  },
  FAILED: {
    dark: 'bg-[rgba(239,68,68,0.25)] border border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
    light: 'bg-[rgba(239,68,68,0.15)] border border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  },
  LOST: {
    dark: 'bg-[rgba(244,63,94,0.25)] border border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)]',
    light: 'bg-[rgba(244,63,94,0.15)] border border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.35)]',
  },
  DUE_TODAY: {
    dark: 'bg-[rgba(245,158,11,0.25)] border-[1.5px] border-solid border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    light:
      'bg-[rgba(245,158,11,0.18)] border-[1.5px] border-solid border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
  },
  PENDING: {
    dark: 'bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.25)] text-slate-400',
    light: 'bg-[rgba(241,245,249,0.6)] border border-[rgba(148,163,184,0.25)] text-slate-400',
  },
  OVERDUE: {
    dark: 'bg-[rgba(239,68,68,0.12)] border border-dashed border-red-500 text-red-300',
    light: 'bg-red-50 border border-dashed border-red-500 text-red-500',
  },
  BLANK: DEFAULT_PILL_STYLE,
};

export function findTouchpointLog(customer: any, touchpoint: CampaignTouchpointItem): any {
  return (customer.touchpointLogs || []).find(
    (log: any) => log.touchpointId === touchpoint.id || log.touchpointKey === touchpoint.key
  );
}

export function hasTouchpointDiamondReferral(tpLog: any, customer: any, currentNote: string): boolean {
  return !!(tpLog?.hasReferredDiamond || customer?.hasReferredDiamond || currentNote.includes('💎'));
}

export function formatTouchpointNoteWithDiamond(rawNote: string, hasReferredDiamond: boolean): string {
  let finalNote = rawNote.trim();
  if (hasReferredDiamond && !finalNote.includes('💎')) {
    finalNote = finalNote ? `${finalNote} ${DIAMOND_NOTE_TAG}` : DIAMOND_NOTE_TAG;
  } else if (!hasReferredDiamond && finalNote.includes(` ${DIAMOND_NOTE_TAG}`)) {
    finalNote = finalNote.replace(` ${DIAMOND_NOTE_TAG}`, '');
  } else if (!hasReferredDiamond && finalNote.includes(DIAMOND_NOTE_TAG)) {
    finalNote = finalNote.replace(DIAMOND_NOTE_TAG, '');
  }
  return finalNote;
}

export function resolveTouchpointWindow(
  touchpoint: CampaignTouchpointItem,
  days: number,
  isChecked: boolean,
  rawStatus: TouchpointStatus | null
): { isActive: boolean; isOverdue: boolean } {
  const configuredMin = touchpoint.daysMin;
  const windowConfig: TouchpointDayWindow | undefined =
    configuredMin !== undefined && configuredMin !== null
      ? { min: configuredMin, max: touchpoint.daysMax ?? null }
      : LEGACY_TOUCHPOINT_WINDOWS[touchpoint.key];

  if (!windowConfig) {
    return { isActive: false, isOverdue: false };
  }

  const meetsMin = windowConfig.strictMin ? days > windowConfig.min : days >= windowConfig.min;
  if (windowConfig.max !== null && windowConfig.max !== undefined) {
    return {
      isActive: meetsMin && days <= windowConfig.max,
      isOverdue: days > windowConfig.max && !isChecked && !rawStatus,
    };
  }

  return {
    isActive: meetsMin,
    isOverdue: false,
  };
}

export function resolveTouchpointDisplayStatus(
  touchpoint: CampaignTouchpointItem,
  days: number,
  isChecked: boolean,
  rawStatus: TouchpointStatus | null
): TouchpointDisplayStatus {
  if (rawStatus) {
    return rawStatus;
  }
  const { isActive, isOverdue } = resolveTouchpointWindow(touchpoint, days, isChecked, rawStatus);
  if (isActive) {
    return 'DUE_TODAY';
  }
  if (touchpoint.daysMin !== undefined && touchpoint.daysMin !== null && days < touchpoint.daysMin) {
    return 'PENDING';
  }
  if (isOverdue) {
    return 'OVERDUE';
  }
  return 'BLANK';
}

export function getTouchpointPillClassName(
  displayStatus: TouchpointDisplayStatus,
  isDark: boolean,
  loading: boolean
): string {
  const statusStyle = PILL_STATUS_STYLES[displayStatus] ?? DEFAULT_PILL_STYLE;
  const themeClass = isDark ? statusStyle.dark : statusStyle.light;
  const cursorClass = loading ? 'cursor-wait' : 'cursor-pointer';

  return `relative inline-flex items-center justify-center w-[28px] h-[24px] rounded-[6px] transition-all duration-200 select-none overflow-visible ${cursorClass} ${themeClass}`;
}

export function getTouchpointStatusButtonClassName(
  option: TouchpointStatusButtonConfig,
  isSelected: boolean,
  isDark: boolean
): string {
  const baseClass =
    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 text-left';

  if (isSelected) {
    return `${baseClass} ${isDark ? option.selectedDarkClass : option.selectedLightClass}`;
  }

  const idleClass = isDark
    ? 'border border-slate-700 bg-slate-800 text-slate-200'
    : 'border border-slate-200 bg-slate-50 text-slate-800';

  return `${baseClass} ${idleClass}`;
}
