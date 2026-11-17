'use client';

import React from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { bookingRequiresUnderLashRound, resolveActiveServicingRound } from '@mos-lab/shared';
import { useTheme } from '../../../../../context/ThemeContext';
import { BookingItem } from '../../../state/mockData';

interface ServicingRoundHeaderPillProps {
  booking?: BookingItem | null;
}

export function ServicingRoundHeaderPill({ booking }: ServicingRoundHeaderPillProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  if (!bookingRequiresUnderLashRound(booking)) {
    return null;
  }

  const activeRound = resolveActiveServicingRound(booking);
  const isUnderRound = activeRound === 'UNDER';
  const upperDone = Boolean(booking?.progress?.upperCompleted || isUnderRound);
  const underTypeLabel = booking?.attributes?.underMinkServiceType === 'Retain' ? 'Dặm (Retain)' : 'Nối Mới (Normal)';

  return (
    <div
      data-testid="servicing-round-header-pill"
      className={`rounded-2xl border px-3 py-2.5 flex items-center justify-between gap-2 shadow-xs ${
        isUnderRound
          ? isDark
            ? 'bg-emerald-950/40 border-emerald-500/40'
            : 'bg-emerald-50 border-emerald-200'
          : isDark
            ? 'bg-amber-950/35 border-amber-500/35'
            : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0 ${
            isUnderRound
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-emerald-100 text-emerald-700'
              : isDark
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          <Layers className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div
            className={`text-[11px] font-black uppercase tracking-wider truncate ${
              isUnderRound
                ? isDark
                  ? 'text-emerald-300'
                  : 'text-emerald-800'
                : isDark
                  ? 'text-amber-300'
                  : 'text-amber-800'
            }`}
          >
            {isUnderRound ? 'VÒNG 2/2 · MI DƯỚI (UNDER LASHES)' : 'VÒNG 1/2 · MI TRÊN (UPPER LASHES)'}
          </div>
          <div className="text-[10.5px] font-semibold text-[var(--mos-text-muted)] truncate">
            {isUnderRound
              ? `Độc lập 3 ảnh Mi Dưới · ${underTypeLabel}`
              : `Hoàn tất 3 ảnh Mi Trên -> Next sang Mi Dưới (${underTypeLabel})`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span
          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black border leading-none ${
            upperDone
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-400 text-black border-amber-400'
          }`}
        >
          {upperDone && <CheckCircle2 className="w-2.5 h-2.5" />}
          <span>V1 Trên</span>
        </span>
        <span
          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9.5px] font-black border leading-none ${
            isUnderRound
              ? 'bg-emerald-500 text-white border-emerald-500'
              : isDark
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                : 'bg-white text-neutral-500 border-neutral-300'
          }`}
        >
          V2 Dưới
        </span>
      </div>
    </div>
  );
}
