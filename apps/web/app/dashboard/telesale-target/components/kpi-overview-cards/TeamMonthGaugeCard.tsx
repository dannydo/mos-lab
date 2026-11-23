'use client';

import React from 'react';
import { SemicircleGauge } from '../SemicircleGauge';
import { KpiStatRibbon } from './KpiStatRibbon';
import type { KpiStatRibbonCell, TeamMonthKpiMetrics } from './kpiOverviewTypes';
import { formatTeamGapValue } from './kpiOverviewUtils';

interface TeamMonthGaugeCardProps {
  variant: 'done' | 'incoming';
  isDark: boolean;
  metrics: TeamMonthKpiMetrics;
}

/**
 * Renders either the primary Retail Done gauge card or the Incoming Monthly gauge card inside Box 1.
 */
export const TeamMonthGaugeCard: React.FC<TeamMonthGaugeCardProps> = ({ variant, isDark, metrics }) => {
  const isDone = variant === 'done';

  const expectedValue = isDone ? metrics.expectedDone : metrics.expectedIncoming;
  const gapValue = isDone ? metrics.gapDone : metrics.gapIncoming;
  const remainingValue = isDone ? metrics.remainingDone : metrics.remainingIncoming;
  const dailyRequiredValue = isDone ? metrics.dailyRequiredDone : metrics.dailyRequiredIncoming;

  const containerClass = isDone
    ? isDark
      ? 'bg-emerald-950/20 border-emerald-500/35 shadow-inner'
      : 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs'
    : isDark
      ? 'bg-black/50 border-zinc-800 shadow-inner'
      : 'bg-sky-50/40 border-sky-200/80 shadow-2xs';

  const badgeClass = isDone
    ? isDark
      ? 'text-emerald-400 bg-emerald-950 border-emerald-500/40'
      : 'text-emerald-700 bg-emerald-100 border-emerald-300'
    : isDark
      ? 'text-sky-400 bg-sky-950 border-sky-500/30'
      : 'text-sky-700 bg-sky-100 border-sky-300';

  const gapColorClass =
    typeof gapValue === 'number' && gapValue >= 0
      ? isDark
        ? 'text-emerald-400'
        : 'text-emerald-600'
      : isDark
        ? 'text-rose-400'
        : 'text-rose-600';

  const dailyColorClass = isDone
    ? isDark
      ? 'text-amber-300'
      : 'text-amber-700'
    : isDark
      ? 'text-sky-300'
      : 'text-sky-700';

  const neutralValueClass = `text-xs font-black block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`;

  const ribbonCells: KpiStatRibbonCell[] = [
    {
      label: 'Kỳ vọng',
      value: expectedValue,
      valueClassName: neutralValueClass,
    },
    {
      label: 'Gap KPI',
      value: formatTeamGapValue(gapValue),
      valueClassName: `text-xs font-black block tabular-nums ${gapColorClass}`,
    },
    {
      label: 'Còn lại',
      value: remainingValue,
      valueClassName: neutralValueClass,
    },
    {
      label: 'Cần TB',
      value: dailyRequiredValue,
      valueClassName: `text-xs font-black block tabular-nums ${dailyColorClass}`,
    },
  ];

  return (
    <div className={`rounded-2xl p-2.5 border flex flex-col justify-between transition-all ${containerClass}`}>
      <div>
        <div
          className={`flex items-center justify-between text-xs mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
        >
          <span className="flex items-center gap-1">
            <span
              className={
                isDone ? 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-sky-400'
              }
            />
            <strong
              className={
                isDone
                  ? isDark
                    ? 'text-emerald-200 text-xs'
                    : 'text-emerald-900 text-xs font-bold'
                  : isDark
                    ? 'text-zinc-200 text-xs'
                    : 'text-slate-800 text-xs font-bold'
              }
            >
              {isDone ? 'Done Khách Lẻ' : 'Incoming Tháng'}
            </strong>
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>
            {isDone ? 'KPI CHÍNH' : 'SẮP TỚI'}
          </span>
        </div>

        <SemicircleGauge
          percent={metrics.isPeriodNotStarted ? 0 : isDone ? metrics.donePercent : metrics.incomingPercent}
          actual={isDone ? metrics.retailDoneActual : metrics.incomingActual}
          target={isDone ? metrics.doneTarget : metrics.incomingTarget}
          unit={isDone ? 'Done' : 'Incoming'}
          label=""
          hideLabelText={true}
          hideUnitText={true}
          tone={isDone ? 'emerald' : 'blue'}
          pacingPercent={isDone ? metrics.donePacingPercent : metrics.incomingPacingPercent}
          gapText={typeof gapValue === 'number' ? `GAP: ${formatTeamGapValue(gapValue)}` : undefined}
          gapType={typeof gapValue === 'number' && gapValue >= 0 ? 'positive' : 'negative'}
        />

        <KpiStatRibbon cells={ribbonCells} isDark={isDark} variant="team" />
      </div>

      <div
        className={`mt-2 pt-1.5 border-t text-[10px] font-mono flex items-center justify-between ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
        }`}
      >
        {isDone ? (
          <>
            <span>
              Chỉ tiêu:{' '}
              <strong className={isDark ? 'text-zinc-200 font-bold' : 'text-slate-800 font-bold'}>
                {metrics.doneTarget} Done
              </strong>
            </span>
            <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Combo: +{metrics.comboLiveMonthActual} Done
            </span>
          </>
        ) : (
          <>
            <span>Chỉ tiêu Incoming</span>
            <span className={isDark ? 'text-zinc-200 font-bold' : 'text-slate-800 font-bold'}>
              {metrics.incomingTarget} Incoming
            </span>
          </>
        )}
      </div>
    </div>
  );
};
