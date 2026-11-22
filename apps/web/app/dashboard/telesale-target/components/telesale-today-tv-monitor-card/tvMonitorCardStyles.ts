import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import type { TvCardTierStyles, TvMonitorTier } from './tvMonitorCardTypes';

const MINI_TIER_BADGE_MAP: Record<TvMonitorTier, { dark: string; light: string }> = {
  emerald: {
    dark: 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 font-bold',
    light: 'text-emerald-800 bg-emerald-100 border border-emerald-300 font-bold',
  },
  amber: {
    dark: 'text-amber-300 bg-amber-950/80 border border-amber-500/60 font-bold',
    light: 'text-amber-800 bg-amber-100 border border-amber-300 font-bold',
  },
  rose: {
    dark: 'text-rose-300 bg-rose-950/80 border border-rose-500/60 font-bold',
    light: 'text-rose-800 bg-rose-100 border border-rose-300 font-bold',
  },
};

const CARD_TIER_STYLE_MAP: Record<TvMonitorTier, { dark: TvCardTierStyles; light: TvCardTierStyles }> = {
  emerald: {
    dark: {
      container:
        'bg-gradient-to-b from-emerald-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-emerald-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden',
      badge:
        'text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono font-bold text-[9px]',
      title: 'text-emerald-200 text-xs font-bold',
      icon: 'text-emerald-400',
      bottomBorder: 'border-emerald-900/40',
      bottomText: 'text-emerald-300 font-bold',
      targetBadge: 'text-[9px] text-emerald-400 font-mono',
    },
    light: {
      container:
        'bg-gradient-to-b from-emerald-50/70 to-white rounded-2xl p-2.5 border border-emerald-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
      badge:
        'text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-mono font-bold text-[9px]',
      title: 'text-emerald-900 text-xs font-bold',
      icon: 'text-emerald-600',
      bottomBorder: 'border-slate-200',
      bottomText: 'text-emerald-700 font-bold',
      targetBadge: 'text-[9px] text-emerald-700 font-mono',
    },
  },
  amber: {
    dark: {
      container:
        'bg-gradient-to-b from-amber-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-amber-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden',
      badge:
        'text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono font-bold text-[9px]',
      title: 'text-amber-200 text-xs font-bold',
      icon: 'text-amber-400',
      bottomBorder: 'border-amber-900/40',
      bottomText: 'text-amber-300 font-bold',
      targetBadge: 'text-[9px] text-amber-400 font-mono',
    },
    light: {
      container:
        'bg-gradient-to-b from-amber-50/70 to-white rounded-2xl p-2.5 border border-amber-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
      badge: 'text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-mono font-bold text-[9px]',
      title: 'text-amber-900 text-xs font-bold',
      icon: 'text-amber-600',
      bottomBorder: 'border-slate-200',
      bottomText: 'text-amber-700 font-bold',
      targetBadge: 'text-[9px] text-amber-700 font-mono',
    },
  },
  rose: {
    dark: {
      container:
        'bg-gradient-to-b from-rose-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-rose-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden',
      badge: 'text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/40 font-mono font-bold text-[9px]',
      title: 'text-rose-200 text-xs font-bold',
      icon: 'text-rose-400',
      bottomBorder: 'border-rose-900/40',
      bottomText: 'text-rose-300 font-bold',
      targetBadge: 'text-[9px] text-rose-400 font-mono',
    },
    light: {
      container:
        'bg-gradient-to-b from-rose-50/70 to-white rounded-2xl p-2.5 border border-rose-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
      badge: 'text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 font-mono font-bold text-[9px]',
      title: 'text-rose-900 text-xs font-bold',
      icon: 'text-rose-600',
      bottomBorder: 'border-slate-200',
      bottomText: 'text-rose-700 font-bold',
      targetBadge: 'text-[9px] text-rose-700 font-mono',
    },
  },
};

/** Returns badge Tailwind classes for daily snapshot percentages by tier and theme mode. */
export function getMiniTierBadgeClass(tier: TvMonitorTier, isDark = true): string {
  const entry = MINI_TIER_BADGE_MAP[tier] ?? MINI_TIER_BADGE_MAP.rose;
  return isDark ? entry.dark : entry.light;
}

/** Returns container, header, and footer classes for a TV Monitor gauge card tier. */
export function getCardTierStyles(tier: TvMonitorTier, isDark = true): TvCardTierStyles {
  const entry = CARD_TIER_STYLE_MAP[tier] ?? CARD_TIER_STYLE_MAP.rose;
  return isDark ? entry.dark : entry.light;
}

/** Returns status dot classes for a past daily snapshot row based on Book and Check-in tiers. */
export function getSnapshotRowDotClass(bookTier: TvMonitorTier, checkinTier: TvMonitorTier): string {
  if (bookTier === 'emerald' && checkinTier === 'emerald') {
    return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]';
  }
  if (bookTier === 'rose' || checkinTier === 'rose') {
    return 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]';
  }
  return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]';
}

/** Computes clamped 0..100 pacing marker percentage from expected vs full-day target. */
export function computeExpectedPacingPercent(expected?: number, target?: number): number {
  return Math.min(100, Math.round(((expected || 0) / (target || 1)) * 100));
}

/** Reads stored user role to determine whether Manager/Admin TV journal access is enabled. */
export function readIsManagerOrAdmin(): boolean {
  try {
    const stored = localStorage.getItem('mos_auth_user');
    if (stored) {
      const user = JSON.parse(stored);
      return isAdminOrSuperAdminRole(user?.role) || user?.role === 'manager';
    }
  } catch {
    // Ignore unreadable storage in restricted contexts
  }
  return true;
}

/** Returns outer card wrapper classes with dark/light parity and >=100% highlight glow. */
export function getTvCardSectionClass(isDark: boolean, isHighlighted: boolean): string {
  const base =
    'relative overflow-hidden rounded-3xl border p-3.5 backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300';
  if (isDark) {
    const borderGlow = isHighlighted
      ? 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
      : 'border-amber-500/35 hover:border-amber-400/70';
    return `${base} bg-gradient-to-b from-amber-950/25 via-zinc-950/95 to-zinc-950 glass-card shadow-2xl ${borderGlow}`;
  }
  const lightBorder = isHighlighted
    ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20'
    : 'border-slate-200/90 hover:border-amber-400/70';
  return `${base} bg-white shadow-sm ${lightBorder}`;
}
