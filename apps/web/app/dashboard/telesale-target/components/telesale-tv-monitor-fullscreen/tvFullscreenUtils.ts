import dayjs from 'dayjs';
import { isAdminOrSuperAdminRole, type TelesaleStaffTarget } from '@mos-lab/shared';
import type { ShiftTimelineProgress, TvFullscreenCardTierStyles, TvFullscreenTier } from './tvFullscreenTypes';

const DARK_TIER_STYLES: Record<TvFullscreenTier, TvFullscreenCardTierStyles> = {
  emerald: {
    container:
      'bg-gradient-to-b from-emerald-950/40 via-zinc-900/90 to-zinc-950/90 border-emerald-400/90 shadow-[0_0_40px_rgba(16,185,129,0.32)] hover:border-emerald-300',
    ambientGlow: 'bg-emerald-500/20',
    headerTargetBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    ribbonBorder: 'border-emerald-900/40 border border-emerald-500/25',
    ribbonActualText: 'text-emerald-300',
    iconBox: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  },
  amber: {
    container:
      'bg-gradient-to-b from-amber-950/40 via-zinc-900/90 to-zinc-950/90 border-amber-400/85 shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:border-amber-300',
    ambientGlow: 'bg-amber-500/15',
    headerTargetBadge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    ribbonBorder: 'border-amber-900/40 border border-amber-500/25',
    ribbonActualText: 'text-amber-300',
    iconBox: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
  },
  rose: {
    container:
      'bg-gradient-to-b from-rose-950/40 via-zinc-900/90 to-zinc-950/90 border-rose-500/70 shadow-[0_0_35px_rgba(244,63,94,0.25)] hover:border-rose-400',
    ambientGlow: 'bg-rose-500/15',
    headerTargetBadge: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    ribbonBorder: 'border-rose-900/40 border border-rose-500/25',
    ribbonActualText: 'text-rose-300',
    iconBox: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
  },
};

const LIGHT_TIER_STYLES: Record<TvFullscreenTier, TvFullscreenCardTierStyles> = {
  emerald: {
    container:
      'bg-gradient-to-b from-emerald-50/70 via-white to-white border-emerald-300/90 shadow-[0_8px_30px_rgba(16,185,129,0.12)] hover:border-emerald-400',
    ambientGlow: 'bg-emerald-400/10',
    headerTargetBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ribbonBorder: 'border-emerald-200/80 border bg-emerald-50/40 shadow-sm',
    ribbonActualText: 'text-emerald-700',
    iconBox: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  },
  amber: {
    container:
      'bg-gradient-to-b from-amber-50/70 via-white to-white border-amber-300/90 shadow-[0_8px_30px_rgba(245,158,11,0.12)] hover:border-amber-400',
    ambientGlow: 'bg-amber-400/10',
    headerTargetBadge: 'bg-amber-50 text-amber-800 border-amber-200',
    ribbonBorder: 'border-amber-200/80 border bg-amber-50/40 shadow-sm',
    ribbonActualText: 'text-amber-700',
    iconBox: 'bg-amber-100 border-amber-300 text-amber-700',
  },
  rose: {
    container:
      'bg-gradient-to-b from-rose-50/70 via-white to-white border-rose-300/90 shadow-[0_8px_30px_rgba(244,63,94,0.12)] hover:border-rose-400',
    ambientGlow: 'bg-rose-400/10',
    headerTargetBadge: 'bg-rose-50 text-rose-800 border-rose-200',
    ribbonBorder: 'border-rose-200/80 border bg-rose-50/40 shadow-sm',
    ribbonActualText: 'text-rose-700',
    iconBox: 'bg-rose-100 border-rose-300 text-rose-700',
  },
};

/** Resolves theme-aware Tailwind classes for fullscreen Book and Check-in gauge cards. */
export function getFullscreenCardTierStyles(tier: TvFullscreenTier, isDark: boolean): TvFullscreenCardTierStyles {
  const map = isDark ? DARK_TIER_STYLES : LIGHT_TIER_STYLES;
  return map[tier] ?? map.rose;
}

/** Resolves header gap pill classes based on gap sign and active theme. */
export function getHeaderGapBadgeClass(gap: number, isDark: boolean): string {
  if (gap >= 0) {
    return isDark
      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
      : 'bg-emerald-50 text-emerald-800 border-emerald-300';
  }
  if (gap === -1) {
    return isDark ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-800 border-amber-300';
  }
  return isDark ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-800 border-rose-300';
}

/** Resolves text color class for the numeric gap metric in the 4-stat ribbon. */
export function getRibbonGapTextClass(gap: number, isDark: boolean): string {
  if (gap >= 0) return isDark ? 'text-emerald-400' : 'text-emerald-600';
  if (gap === -1) return isDark ? 'text-amber-400' : 'text-amber-600';
  return isDark ? 'text-rose-400' : 'text-rose-600';
}

/** Reads persisted side-panel open state with safe SSR/storage fallback. */
export function readStoredPanelVisibility(storageKey: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(storageKey) !== 'false';
  } catch {
    return true;
  }
}

/** Persists side-panel open state to localStorage without throwing in restricted storage modes. */
export function persistPanelVisibility(storageKey: string, visible: boolean): void {
  try {
    localStorage.setItem(storageKey, String(visible));
  } catch {
    // Ignore storage quota or restricted-mode errors
  }
}

/** Checks stored user role to gate Manager/Admin-only TV monitor journal access. */
export function readIsFullscreenManagerOrAdmin(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem('mos_user') || localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      return isAdminOrSuperAdminRole(user?.role) || user?.role === 'manager';
    }
  } catch {
    // Ignore malformed user payload
  }
  return true;
}

/** Returns hourly tick labels for the current morning or afternoon work shift. */
export function computeShiftNodes(now: Date): string[] {
  if (now.getHours() < 12) {
    return ['[8h]', '[9h]', '[10h]', '[11h]', '[12h]'];
  }
  return ['[13h]', '[14h]', '[15h]', '[16h]', '[17h]'];
}

/** Computes shift progress percentage and formatted clock string for the timeline orb. */
export function computeShiftTimelineProgress(now: Date): ShiftTimelineProgress {
  const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();
  const isMorning = now.getHours() < 12;
  const shiftStart = isMorning ? 8 * 60 : 13 * 60;
  const shiftEnd = isMorning ? 12 * 60 : 17 * 60;
  const duration = shiftEnd - shiftStart;
  const elapsed = currentMinutesOfDay - shiftStart;
  const percent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const timeFormatted = dayjs(now).format('HH:mm');
  return { percent, timeFormatted, isMorning };
}

/** Selects the leading staff member today ordered by Book, Check-in/Done, and Combo Check-in. */
export function findTopBookStaff(staffTargets?: TelesaleStaffTarget[]): TelesaleStaffTarget | null {
  if (!staffTargets || staffTargets.length === 0) return null;
  return [...staffTargets].sort((a, b) => {
    const bookDiff = (b.bookToday ?? 0) - (a.bookToday ?? 0);
    if (bookDiff !== 0) return bookDiff;
    const aCheckin = a.checkinToday ?? a.doneToday ?? 0;
    const bCheckin = b.checkinToday ?? b.doneToday ?? 0;
    const checkinDiff = bCheckin - aCheckin;
    if (checkinDiff !== 0) return checkinDiff;
    return (b.comboLiveCheckinToday ?? 0) - (a.comboLiveCheckinToday ?? 0);
  })[0];
}
