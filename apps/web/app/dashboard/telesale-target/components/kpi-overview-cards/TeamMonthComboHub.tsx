'use client';

import React from 'react';
import type { TeamMonthKpiMetrics } from './kpiOverviewTypes';
import { formatComboRevenueShort } from './kpiOverviewUtils';

interface TeamMonthComboHubProps {
  isDark: boolean;
  metrics: TeamMonthKpiMetrics;
}

/**
 * Renders the Monthly Combo Performance Hub panel (Sold, Done, Revenue, and Single -> Combo rate).
 */
export const TeamMonthComboHub: React.FC<TeamMonthComboHubProps> = ({ isDark, metrics }) => {
  const {
    comboSoldMonthActual,
    comboLiveMonthActual,
    comboRevenueMonthActual,
    singleToComboRate,
    comboLiveMonthShare,
    totalMonthDone,
    retailDoneActual,
  } = metrics;

  return (
    <div
      className={`p-2.5 rounded-2xl my-2 border transition-all ${
        isDark
          ? 'bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-zinc-950/60 border-purple-500/35 shadow-inner'
          : 'bg-purple-50/50 border-purple-200/80 shadow-2xs'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <span
          className={`font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px] ${
            isDark ? 'text-purple-300' : 'text-purple-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" /> COMBO HIỆU SUẤT
          THÁNG
        </span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isDark
              ? 'text-purple-300 bg-purple-950/80 border-purple-500/30'
              : 'text-purple-700 bg-purple-100 border-purple-300'
          }`}
        >
          Chuyển đổi {singleToComboRate}%
        </span>
      </div>

      {/* 4-Stat Ribbon Grid */}
      <div
        className={`rounded-xl p-2 grid grid-cols-4 gap-1 text-center font-mono border transition-all ${
          isDark
            ? 'bg-black/60 border-zinc-800/90 divide-x divide-zinc-800/80'
            : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
        }`}
      >
        {/* 1. Combo Bán */}
        <div>
          <span className={isDark ? 'text-zinc-500 text-[10px] block' : 'text-slate-400 text-[10px] block'}>
            Combo Bán
          </span>
          <span className={`text-sm font-black block tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
            {comboSoldMonthActual}{' '}
            <span className={`text-[9px] font-normal ${isDark ? 'text-purple-400/80' : 'text-purple-600'}`}>gói</span>
          </span>
        </div>

        {/* 2. Combo Done */}
        <div>
          <span className={isDark ? 'text-zinc-500 text-[10px] block' : 'text-slate-400 text-[10px] block'}>
            Combo Done
          </span>
          <span className={`text-sm font-black block tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
            {comboLiveMonthActual}{' '}
            <span className={`text-[9px] font-normal ${isDark ? 'text-cyan-400/80' : 'text-cyan-600'}`}>Done</span>
          </span>
        </div>

        {/* 3. Doanh thu Combo */}
        <div>
          <span className={isDark ? 'text-zinc-500 text-[10px] block' : 'text-slate-400 text-[10px] block'}>
            Doanh Thu
          </span>
          <span
            className={`text-sm font-black block tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}
            title={`${comboRevenueMonthActual.toLocaleString('vi-VN')}đ`}
          >
            {formatComboRevenueShort(comboRevenueMonthActual)}
          </span>
        </div>

        {/* 4. % từ Single -> Combo */}
        <div>
          <span className={isDark ? 'text-zinc-500 text-[10px] block' : 'text-slate-400 text-[10px] block'}>
            Single ➔ Combo
          </span>
          <span className={`text-sm font-black block tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            {singleToComboRate}%
          </span>
        </div>
      </div>

      {/* Progress / Context Bar */}
      <div
        className={`mt-2 flex items-center justify-between text-[10px] font-mono ${
          isDark ? 'text-zinc-400' : 'text-slate-600'
        }`}
      >
        <span>
          Tỷ trọng Done:{' '}
          <strong className={`tabular-nums ${isDark ? 'text-cyan-300' : 'text-cyan-700 font-bold'}`}>
            {comboLiveMonthShare}%
          </strong>{' '}
          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
            ({comboLiveMonthActual}/{totalMonthDone} tổng Done)
          </span>
        </span>
        <span>
          Tỷ lệ bán:{' '}
          <strong className={`tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700 font-bold'}`}>
            {retailDoneActual > 0 ? `${comboSoldMonthActual}/${retailDoneActual}` : '0'}
          </strong>{' '}
          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>khách lẻ</span>
        </span>
      </div>
    </div>
  );
};
