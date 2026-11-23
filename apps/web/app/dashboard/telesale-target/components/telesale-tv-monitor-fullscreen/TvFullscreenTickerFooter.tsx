'use client';

import React from 'react';
import { Clock, Crown, Rocket, Sparkles } from 'lucide-react';
import type { TelesaleStaffTarget } from '@mos-lab/shared';
import type { ShiftPacingResult, TvMonitorKpiMetrics } from '../../utils/tv-monitor-pacing';

interface TvFullscreenTickerFooterProps {
  isDark: boolean;
  pacing: ShiftPacingResult;
  metrics: TvMonitorKpiMetrics;
  topStaff: TelesaleStaffTarget | null;
}

/** Bottom Wall Street ticker tape summarizing remaining shift time, Book progress, gap, and top performer. */
export const TvFullscreenTickerFooter: React.FC<TvFullscreenTickerFooterProps> = ({
  isDark,
  pacing,
  metrics,
  topStaff,
}) => {
  const mutedLabelClass = isDark ? 'text-zinc-400' : 'text-slate-500';
  const dotSeparator = (
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-2 shrink-0" />
  );

  return (
    <footer
      className={`relative z-10 w-full h-14 border-t px-4 sm:px-8 flex items-center justify-between text-sm sm:text-base font-sans shrink-0 backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-zinc-950/98 border-zinc-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]'
          : 'bg-white/95 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex items-center gap-2.5 leading-none">
        <Clock className={`w-5 h-5 animate-pulse shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>Ca chiều:</span>
        <span
          className={`font-black tabular-nums text-base sm:text-lg leading-none ${
            isDark ? 'text-amber-300' : 'text-amber-700'
          }`}
        >
          {pacing.hoursRemaining !== undefined && pacing.minsRemaining !== undefined
            ? `Còn ${pacing.hoursRemaining}h ${pacing.minsRemaining < 10 ? '0' : ''}${pacing.minsRemaining}m`
            : pacing.countdownText}
        </span>
      </div>

      {dotSeparator}

      <div className="flex items-center gap-2.5 leading-none">
        <span className="text-lg leading-none">🎯</span>
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>Tiến độ:</span>
        <span
          className={`font-black tabular-nums text-base sm:text-lg leading-none ${
            isDark ? 'text-blue-300' : 'text-blue-700'
          }`}
        >
          {metrics.bookActual}/{metrics.bookTarget} Book ({metrics.bookPercent}%)
        </span>
      </div>

      {dotSeparator}

      <div className="flex items-center gap-2.5 leading-none">
        <Sparkles className={`w-5 h-5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>Cần</span>
        <span
          className={`font-black tabular-nums text-base sm:text-lg leading-none ${
            isDark ? 'text-amber-300' : 'text-amber-700'
          }`}
        >
          {metrics.remainingBook} Book
        </span>
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>nữa</span>
      </div>

      {dotSeparator}

      <div className="flex items-center gap-2.5 leading-none">
        <Rocket className={`w-5 h-5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>Vượt nhịp:</span>
        <span
          className={`font-black tabular-nums text-base sm:text-lg leading-none ${
            metrics.gapBook >= 0
              ? isDark
                ? 'text-emerald-400'
                : 'text-emerald-600'
              : isDark
                ? 'text-rose-400'
                : 'text-rose-600'
          }`}
        >
          {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
        </span>
      </div>

      {dotSeparator}

      <div className="flex items-center gap-2.5 leading-none">
        <Crown className={`w-5 h-5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <span className={`font-semibold leading-none ${mutedLabelClass}`}>Dẫn đầu:</span>
        <span
          className={`font-black text-base sm:text-lg leading-none ${isDark ? 'text-amber-200' : 'text-amber-800'}`}
        >
          {topStaff && (topStaff.bookToday ?? 0) > 0 ? `${topStaff.name} (${topStaff.bookToday} Book)` : 'Chưa có'}
        </span>
      </div>
    </footer>
  );
};
