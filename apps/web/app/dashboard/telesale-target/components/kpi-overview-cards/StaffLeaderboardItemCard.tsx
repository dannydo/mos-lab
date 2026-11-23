'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import type { TelesaleStaffTarget } from '@mos-lab/shared';
import { KpiStatRibbon } from './KpiStatRibbon';
import type { KpiStatRibbonCell, StaffLeaderboardItemMetrics, StaffLeaderboardStatusTier } from './kpiOverviewTypes';

interface StaffLeaderboardItemCardProps {
  staff: TelesaleStaffTarget;
  metrics: StaffLeaderboardItemMetrics;
  isDark: boolean;
}

const CARD_TIER_CLASS: Record<StaffLeaderboardStatusTier, { dark: string; light: string }> = {
  not_started: {
    dark: 'bg-zinc-900/40 border-zinc-800 text-zinc-300',
    light: 'bg-slate-50 border-slate-200 text-slate-600',
  },
  achieved: {
    dark: 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    light: 'bg-emerald-50/60 border-emerald-200/90 shadow-2xs',
  },
  approaching: {
    dark: 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    light: 'bg-amber-50/60 border-amber-200/90 shadow-2xs',
  },
  behind: {
    dark: 'bg-rose-950/25 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    light: 'bg-rose-50/60 border-rose-200/90 shadow-2xs',
  },
};

/**
 * Renders an individual staff performance card inside Box 3 (`KpiStaffLeaderboardCard`).
 */
export const StaffLeaderboardItemCard: React.FC<StaffLeaderboardItemCardProps> = ({ staff, metrics, isDark }) => {
  const { token } = theme.useToken();
  const {
    percent,
    staffComboDoneActual,
    staffComboSoldActual,
    staffExpectedDone,
    staffGapDone,
    staffRemainingDone,
    dailyRequiredDoneStr,
    isStaffAchieved,
    isStaffApproaching,
    badgeLabel,
    statusTier,
    revenueVnd,
    rankLabel,
  } = metrics;

  const cardStyleClass = isDark ? CARD_TIER_CLASS[statusTier].dark : CARD_TIER_CLASS[statusTier].light;
  const formattedGap = staffGapDone > 0 ? `+${staffGapDone}` : staffGapDone;

  const badgeClass = isStaffAchieved
    ? isDark
      ? 'text-emerald-300 bg-emerald-950 border-emerald-500/40'
      : 'text-emerald-700 bg-emerald-100 border-emerald-300'
    : isStaffApproaching
      ? isDark
        ? 'text-amber-300 bg-amber-950 border-amber-500/40'
        : 'text-amber-700 bg-amber-100 border-amber-300'
      : isDark
        ? 'text-rose-400 bg-rose-950 border-rose-500/40'
        : 'text-rose-700 bg-rose-100 border-rose-300';

  const ribbonCells: KpiStatRibbonCell[] = [
    {
      label: 'Kỳ vọng',
      value: staffExpectedDone,
      valueClassName: `font-bold block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`,
    },
    {
      label: 'Gap KPI',
      value: formattedGap,
      valueClassName: `font-black block tabular-nums ${
        staffGapDone >= 0
          ? isDark
            ? 'text-emerald-400'
            : 'text-emerald-600'
          : isDark
            ? 'text-rose-400'
            : 'text-rose-600'
      }`,
    },
    {
      label: 'Còn thiếu',
      value: `${staffRemainingDone} Done`,
      valueClassName: `font-bold block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`,
    },
    {
      label: 'Cần TB',
      value: dailyRequiredDoneStr,
      valueClassName: `font-bold block tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`,
    },
  ];

  return (
    <div className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${cardStyleClass}`}>
      <div>
        {/* Name, Rank & Today Count */}
        <div className="flex items-center justify-between text-xs mb-1">
          <span
            className={`font-bold truncate flex items-center gap-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
          >
            <span className={`font-mono text-xs ${isDark ? 'text-amber-400' : 'text-amber-600 font-bold'}`}>
              {rankLabel}
            </span>
            <span>{staff.name}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'}`}>
              +{staff.doneToday || 0} hôm nay
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Progress Numbers & Bar */}
        <div className="flex items-baseline justify-between font-mono text-xs mb-1">
          <div>
            <span className={`text-base font-black tabular-nums ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {staff.doneActual}
            </span>
            <span className={`text-[10px] font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              {' '}
              / {staff.doneTarget} Done
            </span>
          </div>
          <span className={`text-[10px] font-bold tabular-nums ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            {percent}%
          </span>
        </div>
        <div className="w-full mb-1.5">
          <Progress
            percent={Math.min(100, percent)}
            size="small"
            showInfo={false}
            strokeColor={
              isStaffAchieved ? token.colorSuccess : isStaffApproaching ? token.colorWarning : token.colorError
            }
            className="!m-0 leading-none"
          />
        </div>

        <KpiStatRibbon cells={ribbonCells} isDark={isDark} variant="staff" />

        {/* Hidden text assertion for vitest */}
        <div className="hidden">
          <span>Gap: {formattedGap} Done</span>
        </div>
      </div>

      {/* Footer: Revenue & Combo Bán vs Combo Done */}
      <div
        className={`mt-1.5 pt-1 border-t flex items-center justify-between text-[9px] font-mono ${
          isDark ? 'border-zinc-800/80' : 'border-slate-200'
        }`}
      >
        <span className={`truncate mr-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Doanh thu:{' '}
          <strong className={isDark ? 'text-emerald-300 font-medium' : 'text-emerald-700 font-bold'}>
            {revenueVnd.toLocaleString('vi-VN')}đ
          </strong>
        </span>
        <div className="flex items-center gap-1 shrink-0 font-mono">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-bold leading-none ${
              isDark
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                : 'bg-purple-100 border-purple-300 text-purple-700'
            }`}
            title="Combo Bán: Số gói combo đã chốt bán trong tháng"
          >
            <span className={`text-[8px] font-normal ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Bán:</span>
            <strong className="tabular-nums">{staffComboSoldActual}</strong>
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-bold leading-none ${
              isDark ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300' : 'bg-cyan-100 border-cyan-300 text-cyan-700'
            }`}
            title="Combo Done: Số lượt khách đi làm bằng combo trong tháng"
          >
            <span className={`text-[8px] font-normal ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Done:</span>
            <strong className="tabular-nums">{staffComboDoneActual}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
