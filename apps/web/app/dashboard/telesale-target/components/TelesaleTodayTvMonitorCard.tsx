'use client';

import React, { useState, useEffect } from 'react';
import { Progress, Tooltip, Button, theme } from 'antd';
import { Tv, CheckCircle2, Calendar, Maximize2, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../utils/tv-monitor-pacing';
import { TelesaleTvCelebration } from './TelesaleTvCelebration';

interface TelesaleTodayTvMonitorCardProps {
  overview: TelesaleTargetOverview;
  onOpenFullscreen?: () => void;
}

export const TelesaleTodayTvMonitorCard: React.FC<TelesaleTodayTvMonitorCardProps> = ({
  overview,
  onOpenFullscreen,
}) => {
  const { token } = theme.useToken();
  const { teamDaily } = overview;
  const [now, setNow] = useState<Date>(new Date());
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Update clock every 5 seconds for smooth countdown without excessive re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const pacing = calculateShiftPacing(now);
  const metrics = calculateTvMonitorMetrics(teamDaily, pacing);

  // Trigger celebration on initial mount if 100% achieved
  useEffect(() => {
    if (metrics.teamState === 'COMPLETED') {
      setShowCelebration(true);
    }
  }, [metrics.teamState]);

  const isDoneOver100 = metrics.donePercent >= 100;
  const isBookOver100 = metrics.bookPercent >= 100;

  const getGapBadgeClass = (gap: number) => {
    if (gap >= 0) return 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40';
    if (gap === -1) return 'text-amber-400 bg-amber-950/70 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/70 border-rose-500/40';
  };

  const getTeamStateClass = () => {
    switch (metrics.teamState) {
      case 'COMPLETED':
        return 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black border-emerald-300 shadow-emerald-500/20';
      case 'ACCELERATING':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60';
      case 'APPROACHING':
        return 'bg-amber-950/90 text-amber-300 border-amber-500/60';
      case 'ON_PACE':
        return 'bg-blue-950/90 text-blue-300 border-blue-500/60';
      case 'WARMUP':
        return 'bg-sky-950/90 text-sky-300 border-sky-500/60';
      default:
        return 'bg-rose-950/90 text-rose-300 border-rose-500/60';
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/30 via-zinc-950 to-zinc-950 border p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
        isDoneOver100 || isBookOver100
          ? 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
          : 'border-amber-500/40 hover:border-amber-400/70'
      }`}
    >
      <TelesaleTvCelebration active={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Tv className="w-4 h-4 text-amber-400 animate-pulse" />
            </span>
            <div>
              <span className="text-amber-300 text-xs font-black uppercase tracking-wider block">
                TV MONITOR HÔM NAY
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block">{pacing.shiftStatusLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-zinc-300 bg-black/60 px-2.5 py-1 rounded-xl border border-zinc-800 font-mono tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {teamDaily.date}
            </span>

            {onOpenFullscreen && (
              <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
                <Button
                  type="primary"
                  size="small"
                  icon={<Maximize2 className="w-3.5 h-3.5" />}
                  onClick={onOpenFullscreen}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 rounded-xl text-xs h-7 px-2.5 flex items-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <span className="hidden md:inline">Mở TV</span>
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 2. Main KPI Two-Column High-Contrast Grid (MOS-BUG-75: Ưu tiên Book -> Done) */}
        <div className="grid grid-cols-2 gap-3.5 my-2.5">
          {/* 1. BOOK HÔM NAY (Hành động chính, nổi bật nhất trên TV Monitor) */}
          <div className="bg-blue-950/20 rounded-2xl p-3.5 border border-blue-500/35 flex flex-col justify-between transition-all hover:border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <strong className="text-blue-200 font-bold">BOOK HÔM NAY</strong>
                </span>
                <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
                  HÀNH ĐỘNG CHÍNH
                </span>
              </div>

              {/* Big Dominant Numbers */}
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  data-testid="tv-monitor-card-book-actual"
                  className="text-3xl sm:text-4xl font-black font-mono text-blue-300 tabular-nums"
                >
                  {metrics.bookActual}
                </span>
                <span className="text-zinc-400 text-sm font-mono font-semibold">/ {metrics.bookTarget}</span>
              </div>

              {/* Dominant Thick Progress Bar */}
              <Progress
                percent={Math.min(100, metrics.bookPercent)}
                strokeColor={
                  isBookOver100 ? token.colorWarning : metrics.gapBook >= 0 ? token.colorInfo : token.colorWarning
                }
                strokeWidth={8}
                size="small"
                showInfo={false}
                className="mt-2"
              />

              {/* Progress % + Milestone pulse */}
              <div className="flex justify-between items-center text-[11px] mt-1.5 font-mono">
                <span className="text-zinc-400">Tiến độ</span>
                <span
                  className={`font-black ${
                    isBookOver100
                      ? 'text-amber-400 animate-pulse'
                      : metrics.bookPercent >= 75
                        ? 'text-blue-300'
                        : 'text-zinc-200'
                  }`}
                >
                  {isBookOver100 ? `✨ ${metrics.bookPercent}% VƯỢT` : `${metrics.bookPercent}%`}
                </span>
              </div>

              {/* Pacing Breakdown: Kỳ vọng giờ này | Nhịp Gap | Còn thiếu */}
              <div className="mt-2.5 pt-2 border-t border-blue-900/40 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Kỳ vọng giờ này:</span>
                  <span className="text-zinc-200 font-semibold tabular-nums">{metrics.expectedBook} Book</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Nhịp (Gap):</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border tabular-nums ${getGapBadgeClass(
                      metrics.gapBook
                    )}`}
                  >
                    {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Còn thiếu:</span>
                  <span className="text-blue-300 font-bold tabular-nums">{metrics.remainingBook} Book</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-blue-900/40 text-[10px] font-mono flex items-center justify-between text-zinc-400">
              <span>Mục tiêu ngày:</span>
              <span className="text-blue-300 font-semibold">≥ {metrics.bookTarget} Book</span>
            </div>
          </div>

          {/* 2. DONE HÔM NAY (Kết quả theo sau, nhỏ hơn 1 cấp) */}
          <div className="bg-black/50 rounded-2xl p-3.5 border border-zinc-800 flex flex-col justify-between transition-all hover:border-zinc-700">
            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <strong className="text-zinc-200 font-medium">DONE HÔM NAY</strong>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Khách lẻ</span>
              </div>

              {/* Numbers (nhỏ hơn 1 cấp so với Book) */}
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  data-testid="tv-monitor-card-done-actual"
                  className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tabular-nums"
                >
                  {metrics.doneActual}
                </span>
                <span className="text-zinc-400 text-sm font-mono font-semibold">/ {metrics.doneTarget}</span>
              </div>

              {/* Progress Bar */}
              <Progress
                percent={Math.min(100, metrics.donePercent)}
                strokeColor={
                  isDoneOver100 ? token.colorWarning : metrics.gapDone >= 0 ? token.colorSuccess : token.colorWarning
                }
                strokeWidth={5}
                size="small"
                showInfo={false}
                className="mt-2"
              />

              {/* Progress % */}
              <div className="flex justify-between items-center text-[11px] mt-1.5 font-mono">
                <span className="text-zinc-400">Tiến độ</span>
                <span
                  className={`font-black ${
                    isDoneOver100 ? 'text-amber-400' : metrics.donePercent >= 75 ? 'text-emerald-300' : 'text-zinc-200'
                  }`}
                >
                  {isDoneOver100 ? `✨ ${metrics.donePercent}% VƯỢT` : `${metrics.donePercent}%`}
                </span>
              </div>

              {/* Pacing Breakdown */}
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Kỳ vọng giờ này:</span>
                  <span className="text-zinc-200 font-semibold tabular-nums">{metrics.expectedDone} Done</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Còn thiếu:</span>
                  <span className="text-amber-300 font-bold tabular-nums">{metrics.remainingDone} Done</span>
                </div>
              </div>
            </div>

            {/* Sub Combo Live */}
            {metrics.comboLiveDoneActual > 0 ? (
              <div className="mt-2 pt-1.5 border-t border-zinc-800/60 text-[10px] font-mono flex items-center justify-between text-purple-300">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Combo Live:
                </span>
                <span className="font-bold tabular-nums">+{metrics.comboLiveDoneActual}</span>
              </div>
            ) : (
              <div className="mt-2 pt-1.5 border-t border-zinc-800/60 text-[10px] font-mono flex items-center justify-between text-zinc-400">
                <span>Mục tiêu ngày:</span>
                <span className="text-zinc-300">{metrics.doneTarget} Done</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Countdown & Team Status Row */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-300 font-mono font-bold tabular-nums">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{pacing.countdownText}</span>
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border shadow-sm ${getTeamStateClass()}`}
          >
            {metrics.teamStateBadge}
          </span>
        </div>

        {/* 4. Actionable Message Banner */}
        <div className="bg-black/60 border border-amber-500/30 rounded-xl px-3 py-1.5 text-center">
          <p className="m-0 text-[11px] sm:text-xs font-semibold text-amber-200 flex items-center justify-center gap-1.5 font-mono">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{metrics.actionableMessage}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
