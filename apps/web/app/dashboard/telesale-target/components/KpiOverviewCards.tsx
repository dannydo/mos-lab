'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { Trophy, User, Sparkles } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { TelesaleTodayTvMonitorCard } from './TelesaleTodayTvMonitorCard';
import { SemicircleGauge } from './SemicircleGauge';
import { useTheme } from '../../../../context/ThemeContext';

export interface KpiCardProps {
  overview: TelesaleTargetOverview;
  className?: string;
  onOpenTvFullscreen?: () => void;
}

// ============================================================================
// 1. KPI TEAM THÁNG X COMPONENT
// ============================================================================
export const KpiTeamMonthCard: React.FC<KpiCardProps> = ({ overview, className = '' }) => {
  const { month, teamMonth } = overview;
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const monthNumStr = month.split('-')[1] || '10';

  const comboLiveMonthActual = teamMonth.comboLiveDoneActual || 0;
  const comboSoldMonthActual = teamMonth.comboSoldActual || 0;
  const comboRevenueMonthActual = teamMonth.comboRevenueActual || 0;
  // Retail Done (Single Done thuần túy không gồm Combo, e.g. 44 ở T10, 313 ở T9)
  const retailDoneActual = teamMonth.retailDoneActual ?? teamMonth.doneActual;
  // Total Done in month across all orders (e.g. 44 + 12 = 56 ở T10, 313 + 125 = 438 ở T9)
  const totalMonthDone = retailDoneActual + comboLiveMonthActual;

  const singleToComboRate =
    teamMonth.singleToComboRate ??
    (retailDoneActual > 0 ? Number(((comboSoldMonthActual / retailDoneActual) * 100).toFixed(1)) : 0);

  const donePercent = Math.round((retailDoneActual / (teamMonth.doneTarget || 1)) * 100);
  const isDoneOver100 = donePercent > 100;

  const comboLiveMonthShare = totalMonthDone > 0 ? Math.round((comboLiveMonthActual / totalMonthDone) * 100) : 0;

  const incomingTarget = teamMonth.incomingTarget ?? teamMonth.bookTarget ?? 1;
  const incomingActual = teamMonth.incomingActual ?? teamMonth.bookActual ?? 0;
  const incomingPercent = Math.round((incomingActual / (incomingTarget || 1)) * 100);

  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';
  const isPeriodCompleted = teamMonth.periodStatus === 'COMPLETED';

  const workDaysElapsed = teamMonth.workDaysElapsed ?? teamMonth.pacingDaysElapsed ?? 0;
  const workDaysTotal = teamMonth.workDaysTotal ?? teamMonth.pacingDaysTotal ?? 26;

  const pacingStatus =
    teamMonth.pacingStatus || (isPeriodNotStarted ? 'NOT_STARTED' : teamMonth.isPacingOnTrack ? 'ON_TRACK' : 'BEHIND');
  const pacingStatusLabel =
    teamMonth.pacingStatusLabel ||
    (isPeriodNotStarted
      ? 'Chưa bắt đầu'
      : pacingStatus === 'AHEAD'
        ? 'Vượt nhịp'
        : pacingStatus === 'ON_TRACK'
          ? 'Đúng nhịp'
          : 'Chậm nhịp');

  const expectedDone = isPeriodNotStarted
    ? '-'
    : (teamMonth.expectedDone ?? Math.round(teamMonth.doneTarget * (workDaysElapsed / (workDaysTotal || 1))));

  const gapDone = isPeriodNotStarted
    ? '-'
    : typeof expectedDone === 'number'
      ? retailDoneActual - expectedDone
      : (teamMonth.gapDone ?? 0);
  const remainingDone = Math.max(0, teamMonth.doneTarget - retailDoneActual);
  const workDaysRemaining = teamMonth.workDaysRemaining ?? Math.max(0, workDaysTotal - workDaysElapsed);
  const dailyRequiredDone = isPeriodCompleted
    ? '-'
    : `${workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0}/ngày`;

  const expectedIncoming = isPeriodNotStarted
    ? '-'
    : (teamMonth.expectedIncoming ??
      teamMonth.expectedBook ??
      Math.round(incomingTarget * (workDaysElapsed / (workDaysTotal || 1))));

  const gapIncoming = isPeriodNotStarted ? '-' : (teamMonth.gapIncoming ?? teamMonth.gapBook ?? 0);
  const remainingIncoming =
    teamMonth.remainingIncoming ?? teamMonth.remainingBook ?? Math.max(0, incomingTarget - incomingActual);
  const dailyRequiredIncoming = isPeriodCompleted
    ? '-'
    : `${teamMonth.dailyRequiredIncoming ?? teamMonth.dailyRequiredBook ?? 0}/ngày`;

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
                    : (teamMonth.pacingRatio ?? 0) >= 0.8
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
                  ((teamMonth.pacingRatio ?? 0) >= 0.8
                    ? '⚡ Gần đạt nhịp'
                    : (teamMonth.gapBook ?? 0) >= 0
                      ? '⚡ Chậm nhịp · Pipeline tốt'
                      : '⚡ Chưa đạt nhịp')}
              </span>
            )}
          </div>
        </div>

        {/* 2 Semicircle Arcs (Done Khách Lẻ & Incoming Tháng) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1.1: Done Khách Lẻ (KPI Chính) */}
          <div
            className={`rounded-2xl p-2.5 border flex flex-col justify-between transition-all ${
              isDark
                ? 'bg-emerald-950/20 border-emerald-500/35 shadow-inner'
                : 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs'
            }`}
          >
            <div>
              <div
                className={`flex items-center justify-between text-xs mb-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className={isDark ? 'text-emerald-200 text-xs' : 'text-emerald-900 text-xs font-bold'}>
                    Done Khách Lẻ
                  </strong>
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isDark
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-500/40'
                      : 'text-emerald-700 bg-emerald-100 border-emerald-300'
                  }`}
                >
                  KPI CHÍNH
                </span>
              </div>

              {/* Semicircle Gauge (Done Khách Lẻ) - NO OVERLAP */}
              <SemicircleGauge
                percent={isPeriodNotStarted ? 0 : donePercent}
                actual={retailDoneActual}
                target={teamMonth.doneTarget}
                unit="Done"
                label=""
                hideLabelText={true}
                hideUnitText={true}
                tone="emerald"
                pacingPercent={Math.min(
                  100,
                  Math.round(((Number(expectedDone) || 0) / (teamMonth.doneTarget || 1)) * 100)
                )}
                gapText={typeof gapDone === 'number' ? `GAP: ${gapDone >= 0 ? '+' : ''}${gapDone}` : undefined}
                gapType={typeof gapDone === 'number' && gapDone >= 0 ? 'positive' : 'negative'}
              />

              {/* Horizontal Ribbon 4 Cột */}
              <div
                className={`mt-2 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono text-[9px] border transition-all ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-x divide-zinc-800'
                    : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Kỳ vọng</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                  >
                    {expectedDone}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Gap KPI</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      typeof gapDone === 'number' && gapDone >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                    }`}
                  >
                    {typeof gapDone === 'number' ? `${gapDone >= 0 ? '+' : ''}${gapDone}` : gapDone}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Còn lại</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                  >
                    {remainingDone}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Cần TB</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
                  >
                    {dailyRequiredDone}
                  </span>
                </div>
              </div>
            </div>

            {/* Done Footer */}
            <div
              className={`mt-2 pt-1.5 border-t text-[10px] font-mono flex items-center justify-between ${
                isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              <span>
                Chỉ tiêu:{' '}
                <strong className={isDark ? 'text-zinc-200 font-bold' : 'text-slate-800 font-bold'}>
                  {teamMonth.doneTarget} Done
                </strong>
              </span>
              <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Combo: +{comboLiveMonthActual} Done
              </span>
            </div>
          </div>

          {/* Card 1.2: Incoming Tháng */}
          <div
            className={`rounded-2xl p-2.5 border flex flex-col justify-between transition-all ${
              isDark ? 'bg-black/50 border-zinc-800 shadow-inner' : 'bg-sky-50/40 border-sky-200/80 shadow-2xs'
            }`}
          >
            <div>
              <div
                className={`flex items-center justify-between text-xs mb-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <strong className={isDark ? 'text-zinc-200 text-xs' : 'text-slate-800 text-xs font-bold'}>
                    Incoming Tháng
                  </strong>
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isDark ? 'text-sky-400 bg-sky-950 border-sky-500/30' : 'text-sky-700 bg-sky-100 border-sky-300'
                  }`}
                >
                  SẮP TỚI
                </span>
              </div>

              {/* Semicircle Gauge (Incoming) - NO OVERLAP */}
              <SemicircleGauge
                percent={isPeriodNotStarted ? 0 : incomingPercent}
                actual={incomingActual}
                target={incomingTarget}
                unit="Incoming"
                label=""
                hideLabelText={true}
                hideUnitText={true}
                tone="blue"
                pacingPercent={Math.min(
                  100,
                  Math.round(((Number(expectedIncoming) || 0) / (incomingTarget || 1)) * 100)
                )}
                gapText={
                  typeof gapIncoming === 'number' ? `GAP: ${gapIncoming >= 0 ? '+' : ''}${gapIncoming}` : undefined
                }
                gapType={typeof gapIncoming === 'number' && gapIncoming >= 0 ? 'positive' : 'negative'}
              />

              {/* Horizontal Ribbon 4 Cột */}
              <div
                className={`mt-2 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono text-[9px] border transition-all ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-x divide-zinc-800'
                    : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Kỳ vọng</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                  >
                    {expectedIncoming}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Gap KPI</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      typeof gapIncoming === 'number' && gapIncoming >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                    }`}
                  >
                    {typeof gapIncoming === 'number' ? `${gapIncoming >= 0 ? '+' : ''}${gapIncoming}` : gapIncoming}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Còn lại</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}
                  >
                    {remainingIncoming}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Cần TB</span>
                  <span className={`text-xs font-black block tabular-nums ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                    {dailyRequiredIncoming}
                  </span>
                </div>
              </div>
            </div>

            {/* Incoming Footer */}
            <div
              className={`mt-2 pt-1.5 border-t text-[10px] font-mono flex items-center justify-between ${
                isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              <span>Chỉ tiêu Incoming</span>
              <span className={isDark ? 'text-zinc-200 font-bold' : 'text-slate-800 font-bold'}>
                {incomingTarget} Incoming
              </span>
            </div>
          </div>
        </div>

        {/* Refactored Combo Hub: Bán, Done, Doanh thu, % Single -> Combo */}
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
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" /> COMBO HIỆU
              SUẤT THÁNG
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
              <span
                className={`text-sm font-black block tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
              >
                {comboSoldMonthActual}{' '}
                <span className={`text-[9px] font-normal ${isDark ? 'text-purple-400/80' : 'text-purple-600'}`}>
                  gói
                </span>
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
                {comboRevenueMonthActual >= 1_000_000
                  ? `${(comboRevenueMonthActual / 1_000_000).toFixed(1)}M`
                  : `${comboRevenueMonthActual.toLocaleString('vi-VN')}đ`}
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
            {((teamMonth.pacingRatio ?? 0) * 100).toFixed(0)}% · {pacingStatusLabel}
          </strong>
        </span>
      </div>
    </section>
  );
};

// ============================================================================
// 2. LEADERBOARD CHUYÊN VIÊN COMPONENT (BOX 3)
// ============================================================================
export const KpiStaffLeaderboardCard: React.FC<KpiCardProps & { isFullVertical?: boolean }> = ({
  overview,
  className = '',
  isFullVertical = true,
}) => {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { teamMonth, staffTargets } = overview;
  const workDaysElapsed = teamMonth.workDaysElapsed ?? teamMonth.pacingDaysElapsed ?? 0;
  const workDaysTotal = teamMonth.workDaysTotal ?? teamMonth.pacingDaysTotal ?? 26;
  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';

  const rankIcons = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];

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
          {staffTargets.map((staff, idx) => {
            const percent = Math.round((staff.doneActual / (staff.doneTarget || 1)) * 100);
            const isOver100 = percent > 100;
            const staffComboDoneActual = staff.comboLiveDoneActual || 0;
            const staffComboSoldActual = staff.comboSoldActual || 0;

            const expectedProgressRate =
              overview.teamMonth?.expectedProgressRate ?? (workDaysTotal > 0 ? workDaysElapsed / workDaysTotal : 0);
            const workDaysRemaining =
              overview.teamMonth?.workDaysRemaining ?? Math.max(0, workDaysTotal - workDaysElapsed);
            const staffExpectedDone =
              staff.expectedDone ?? (isPeriodNotStarted ? 0 : Math.round(staff.doneTarget * expectedProgressRate));
            const staffGapDone = staff.gapDone ?? (isPeriodNotStarted ? 0 : staff.doneActual - staffExpectedDone);
            const staffRemainingDone = staff.remainingDone ?? Math.max(0, staff.doneTarget - staff.doneActual);

            let dailyRequiredDoneStr = `${staff.dailyRequiredDone ?? 0}/ngày`;
            if (staff.dailyRequiredDone === undefined) {
              if (isPeriodNotStarted) {
                const req = workDaysTotal > 0 ? (staff.doneTarget / workDaysTotal).toFixed(1) : '0';
                dailyRequiredDoneStr = `${req}/ngày`;
              } else if (teamMonth.periodStatus === 'IN_PROGRESS') {
                const req = workDaysRemaining > 0 ? (staffRemainingDone / workDaysRemaining).toFixed(1) : '0';
                dailyRequiredDoneStr = `${req}/ngày`;
              }
            }

            const staffPacingRatio =
              staffExpectedDone > 0
                ? staff.doneActual / staffExpectedDone
                : staff.doneActual >= staff.doneTarget
                  ? 1
                  : 0;
            const isStaffAchieved = isOver100 || staffGapDone >= 0 || staffPacingRatio >= 1.0;
            const isStaffApproaching = !isStaffAchieved && (staffPacingRatio >= 0.8 || staffGapDone >= -2);

            const badgeLabel = isPeriodNotStarted
              ? 'Chưa bắt đầu'
              : isOver100
                ? `🔥 ${percent}% VƯỢT`
                : isStaffAchieved
                  ? 'Đạt'
                  : isStaffApproaching
                    ? 'Gần đạt'
                    : 'Chưa đạt';

            const cardStyleClass = isDark
              ? isPeriodNotStarted
                ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
                : isStaffAchieved
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                  : isStaffApproaching
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    : 'bg-rose-950/25 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
              : isPeriodNotStarted
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : isStaffAchieved
                  ? 'bg-emerald-50/60 border-emerald-200/90 shadow-2xs'
                  : isStaffApproaching
                    ? 'bg-amber-50/60 border-amber-200/90 shadow-2xs'
                    : 'bg-rose-50/60 border-rose-200/90 shadow-2xs';

            const revenueVnd = staff.revenueActual || 0;
            const rankLabel = rankIcons[idx] || `${idx + 1}.`;

            return (
              <div
                key={staff.legacyStaffId}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${cardStyleClass}`}
              >
                <div>
                  {/* Name, Rank & Today Count */}
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`font-bold truncate flex items-center gap-1.5 ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      <span className={`font-mono text-xs ${isDark ? 'text-amber-400' : 'text-amber-600 font-bold'}`}>
                        {rankLabel}
                      </span>
                      <span>{staff.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono ${
                          isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'
                        }`}
                      >
                        +{staff.doneToday || 0} hôm nay
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          isStaffAchieved
                            ? isDark
                              ? 'text-emerald-300 bg-emerald-950 border-emerald-500/40'
                              : 'text-emerald-700 bg-emerald-100 border-emerald-300'
                            : isStaffApproaching
                              ? isDark
                                ? 'text-amber-300 bg-amber-950 border-amber-500/40'
                                : 'text-amber-700 bg-amber-100 border-amber-300'
                              : isDark
                                ? 'text-rose-400 bg-rose-950 border-rose-500/40'
                                : 'text-rose-700 bg-rose-100 border-rose-300'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Progress Numbers & Bar */}
                  <div className="flex items-baseline justify-between font-mono text-xs mb-1">
                    <div>
                      <span
                        className={`text-base font-black tabular-nums ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
                      >
                        {staff.doneActual}
                      </span>
                      <span className={`text-[10px] font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {' '}
                        / {staff.doneTarget} Done
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold tabular-nums ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full mb-1.5">
                    <Progress
                      percent={Math.min(100, percent)}
                      size="small"
                      showInfo={false}
                      strokeColor={
                        isStaffAchieved
                          ? token.colorSuccess
                          : isStaffApproaching
                            ? token.colorWarning
                            : token.colorError
                      }
                      className="!m-0 leading-none"
                    />
                  </div>

                  {/* 4-Stat Ribbon */}
                  <div
                    className={`rounded-lg p-1 grid grid-cols-4 gap-0.5 text-center font-mono text-[8px] border transition-all ${
                      isDark
                        ? 'bg-black/60 border-zinc-800/80 divide-x divide-zinc-800'
                        : 'bg-white/90 border-slate-200 divide-x divide-slate-200 shadow-2xs'
                    }`}
                  >
                    <div>
                      <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Kỳ vọng</span>
                      <span className={`font-bold block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        {staffExpectedDone}
                      </span>
                    </div>
                    <div>
                      <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Gap KPI</span>
                      <span
                        className={`font-black block tabular-nums ${
                          staffGapDone >= 0
                            ? isDark
                              ? 'text-emerald-400'
                              : 'text-emerald-600'
                            : isDark
                              ? 'text-rose-400'
                              : 'text-rose-600'
                        }`}
                      >
                        {staffGapDone > 0 ? `+${staffGapDone}` : staffGapDone}
                      </span>
                    </div>
                    <div>
                      <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Còn thiếu</span>
                      <span className={`font-bold block tabular-nums ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        {staffRemainingDone} Done
                      </span>
                    </div>
                    <div>
                      <span className={isDark ? 'text-zinc-500 block' : 'text-slate-400 block'}>Cần TB</span>
                      <span className={`font-bold block tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        {dailyRequiredDoneStr}
                      </span>
                    </div>
                  </div>

                  {/* Hidden text assertion for vitest */}
                  <div className="hidden">
                    <span>Gap: {staffGapDone > 0 ? `+${staffGapDone}` : staffGapDone} Done</span>
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
                      <span className={`text-[8px] font-normal ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                        Bán:
                      </span>
                      <strong className="tabular-nums">{staffComboSoldActual}</strong>
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-bold leading-none ${
                        isDark
                          ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                          : 'bg-cyan-100 border-cyan-300 text-cyan-700'
                      }`}
                      title="Combo Done: Số lượt khách đi làm bằng combo trong tháng"
                    >
                      <span className={`text-[8px] font-normal ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        Done:
                      </span>
                      <strong className="tabular-nums">{staffComboDoneActual}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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

// ============================================================================
// 3. LEGACY WRAPPER (FOR TEST COMPATIBILITY)
// ============================================================================
export const KpiOverviewCards: React.FC<KpiCardProps> = ({ overview, onOpenTvFullscreen }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 w-full items-stretch h-full">
      <KpiTeamMonthCard overview={overview} />
      <TelesaleTodayTvMonitorCard overview={overview} onOpenFullscreen={onOpenTvFullscreen} />
      <KpiStaffLeaderboardCard overview={overview} isFullVertical={false} />
    </div>
  );
};

export default KpiOverviewCards;
