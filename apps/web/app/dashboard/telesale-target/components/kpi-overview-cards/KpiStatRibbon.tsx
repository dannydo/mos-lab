'use client';

import React from 'react';
import type { KpiStatRibbonCell } from './kpiOverviewTypes';

interface KpiStatRibbonProps {
  cells: KpiStatRibbonCell[];
  isDark: boolean;
  variant?: 'team' | 'staff';
}

/**
 * Shared 4-column monospace KPI metric ribbon used across Team Month and Leaderboard cards.
 */
export const KpiStatRibbon: React.FC<KpiStatRibbonProps> = ({ cells, isDark, variant = 'team' }) => {
  const containerClass =
    variant === 'team'
      ? `mt-2 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono text-[9px] border transition-all ${
          isDark
            ? 'bg-black/60 border-zinc-800/90 divide-x divide-zinc-800'
            : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
        }`
      : `rounded-lg p-1 grid grid-cols-4 gap-0.5 text-center font-mono text-[8px] border transition-all ${
          isDark
            ? 'bg-black/60 border-zinc-800/80 divide-x divide-zinc-800'
            : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
        }`;

  return (
    <div className={containerClass}>
      {cells.map((cell) => (
        <div key={cell.label}>
          <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>{cell.label}</span>
          <span className={cell.valueClassName}>{cell.value}</span>
        </div>
      ))}
    </div>
  );
};
