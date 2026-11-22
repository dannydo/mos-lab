'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';
import type { KpiStaffLeaderboardCardProps } from './kpiOverviewTypes';
import { computeStaffLeaderboardMetrics } from './kpiOverviewUtils';
import { StaffLeaderboardItemCard } from './StaffLeaderboardItemCard';

/**
 * Box 3: Individual Staff KPI Leaderboard Card (ranked by Done progress).
 */
export const KpiStaffLeaderboardCard: React.FC<KpiStaffLeaderboardCardProps> = ({
  overview,
  className = '',
  isFullVertical = true,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { teamMonth, staffTargets } = overview;

  return (
    <section
      className={`rounded-3xl border p-3.5 glass-card relative overflow-hidden flex flex-col justify-between h-full transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-amber-950/20 via-zinc-950/90 to-zinc-950 border-amber-500/30 shadow-2xl'
          : 'bg-white border-slate-200/90 shadow-sm'
      } ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isDark ? 'text-amber-300' : 'text-amber-800'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} /> LEADERBOARD CHUYÊN VIÊN{' '}
            <span
              className={isDark ? 'text-[10px] text-zinc-500 font-normal' : 'text-[10px] text-slate-400 font-normal'}
            >
              KPI Cá Nhân (Done)
            </span>
          </span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Xếp hạng</span>
        </div>

        {/* Staff Grid/Stack */}
        <div className={isFullVertical ? 'space-y-2' : 'grid grid-cols-2 gap-2 my-0.5'}>
          {staffTargets.map((staff, idx) => (
            <StaffLeaderboardItemCard
              key={staff.legacyStaffId}
              staff={staff}
              metrics={computeStaffLeaderboardMetrics(staff, overview, idx)}
              isDark={isDark}
            />
          ))}
        </div>
      </div>

      {/* Leaderboard Footer */}
      <div
        className={`mt-2 pt-2 border-t flex items-center justify-between text-[11px] font-mono ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
        }`}
      >
        <span>
          Tổng chỉ tiêu: <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{teamMonth.doneTarget}</strong>
        </span>
        <div className="flex items-center gap-2">
          <span>
            Thực tế:{' '}
            <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'}>
              {teamMonth.doneActual}
            </strong>
          </span>
          <span className={isDark ? 'text-purple-300 text-[10px]' : 'text-purple-700 text-[10px] font-bold'}>
            Bán: <strong className="tabular-nums">{teamMonth.comboSoldActual || 0}</strong>
          </span>
          <span className={isDark ? 'text-cyan-300 text-[10px]' : 'text-cyan-700 text-[10px] font-bold'}>
            Done: <strong className="tabular-nums">{teamMonth.comboLiveDoneActual || 0}</strong>
          </span>
        </div>
      </div>
    </section>
  );
};
