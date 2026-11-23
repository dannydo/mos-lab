'use client';

import React from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';
import type { KpiCardProps } from './kpiOverviewTypes';
import { computeTeamMonthKpiMetrics } from './kpiOverviewUtils';
import { TeamMonthComboHub } from './TeamMonthComboHub';
import { TeamMonthGaugeCard } from './TeamMonthGaugeCard';

/**
 * Box 1: Monthly Team KPI Card (Retail Done, Monthly Incoming, Combo Hub, and Pacing footer).
 */
export const KpiTeamMonthCard: React.FC<KpiCardProps> = ({ overview, className = '' }) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const metrics = computeTeamMonthKpiMetrics(overview);

  const {
    monthNumStr,
    donePercent,
    isDoneOver100,
    isPeriodNotStarted,
    workDaysElapsed,
    workDaysTotal,
    pacingStatus,
    pacingStatusLabel,
    pacingRatio,
    gapBook,
  } = metrics;

  return (
    <section
      className={`rounded-3xl border p-3.5 glass-card relative overflow-hidden flex flex-col justify-between transition-all duration-300 h-full ${
        isDark
          ? `bg-gradient-to-b from-amber-950/20 via-zinc-950/90 to-zinc-950 shadow-2xl ${
              isDoneOver100
                ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'border-amber-500/30 hover:border-amber-400/60'
            }`
          : `bg-white shadow-sm ${
              isDoneOver100
                ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'border-slate-200/90 hover:border-slate-300'
            }`
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
            <Trophy className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} /> KPI TEAM THÁNG{' '}
            {monthNumStr}
          </span>
          <div className="flex items-center gap-1.5">
            {!isPeriodNotStarted && isDoneOver100 && (
              <span className="text-[10px] px-2 py-0.5 rounded font-black font-mono bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> VƯỢT {donePercent}%
              </span>
            )}
            {isPeriodNotStarted ? (
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold border ${
                  isDark
                    ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                Chưa bắt đầu
              </span>
            ) : (
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-semibold border ${
                  pacingStatus === 'AHEAD' || pacingStatus === 'ON_TRACK'
                    ? isDark
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : pacingRatio >= 0.8
                      ? isDark
                        ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                      : isDark
                        ? 'bg-rose-950 text-rose-300 border-rose-600/50'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {pacingStatus === 'AHEAD' && '🚀 Vượt nhịp'}
                {pacingStatus === 'ON_TRACK' && '✓ Đúng nhịp'}
                {pacingStatus === 'BEHIND' &&
                  (pacingRatio >= 0.8
                    ? '⚡ Gần đạt nhịp'
                    : gapBook >= 0
                      ? '⚡ Chậm nhịp · Pipeline tốt'
                      : '⚡ Chưa đạt nhịp')}
              </span>
            )}
          </div>
        </div>

        {/* 2 Semicircle Arcs (Done Khách Lẻ & Incoming Tháng) */}
        <div className="grid grid-cols-2 gap-2.5">
          <TeamMonthGaugeCard variant="done" isDark={isDark} metrics={metrics} />
          <TeamMonthGaugeCard variant="incoming" isDark={isDark} metrics={metrics} />
        </div>

        <TeamMonthComboHub isDark={isDark} metrics={metrics} />
      </div>

      {/* Box 1 Footer */}
      <div
        className={`mt-1 pt-1.5 border-t flex items-center justify-between text-[11px] font-mono ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
        }`}
      >
        <span className="flex items-center gap-1">
          Ngày làm việc{' '}
          <strong className={`tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
            {workDaysElapsed}/{workDaysTotal}
          </strong>
        </span>
        <span>
          Nhịp bám đuổi:{' '}
          <strong
            className={
              pacingStatus === 'AHEAD' || pacingStatus === 'ON_TRACK'
                ? isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-700'
                : isDark
                  ? 'text-amber-400'
                  : 'text-amber-700'
            }
          >
            {(pacingRatio * 100).toFixed(0)}% · {pacingStatusLabel}
          </strong>
        </span>
      </div>
    </section>
  );
};
