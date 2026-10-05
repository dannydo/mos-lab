'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip, Button, theme } from 'antd';
import { Tv, Calendar, Maximize2, Volume2, ClipboardList } from 'lucide-react';
import { TelesaleTargetOverview, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../utils/tv-monitor-pacing';
import { TelesaleTvCelebration } from './TelesaleTvCelebration';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { SemicircleGauge } from './SemicircleGauge';

interface TelesaleTodayTvMonitorCardProps {
  overview: TelesaleTargetOverview;
  onOpenFullscreen?: () => void;
}

export const TelesaleTodayTvMonitorCard: React.FC<TelesaleTodayTvMonitorCardProps> = ({
  overview,
  onOpenFullscreen,
}) => {
  const { teamDaily } = overview;
  const [now, setNow] = useState<Date>(new Date());
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [journalOpen, setJournalOpen] = useState<boolean>(false);

  const isManagerOrAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem('mos_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        return isAdminOrSuperAdminRole(u?.role) || u?.role === 'manager';
      }
    } catch {}
    return true;
  }, []);

  // Update clock every 5 seconds for smooth countdown
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

  const expectedBookPacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedBook || 0) / (metrics.bookTarget || 1)) * 100)
  );

  const expectedDonePacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedDone || 0) / (metrics.doneTarget || 1)) * 100)
  );

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-950/25 via-zinc-950/95 to-zinc-950 border p-3.5 glass-card shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
        isDoneOver100 || isBookOver100
          ? 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
          : 'border-amber-500/35 hover:border-amber-400/70'
      }`}
    >
      <TelesaleTvCelebration active={showCelebration} onComplete={() => setShowCelebration(false)} />
      <TelesaleTvJournalModal open={journalOpen} onClose={() => setJournalOpen(false)} />

      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Tv className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </span>
            <div>
              <span className="text-amber-300 text-xs font-black uppercase tracking-wider block">
                TV MONITOR HÔM NAY
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block leading-none mt-0.5">
                {pacing.shiftStatusLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-300 bg-black/60 px-2 py-0.5 rounded-lg border border-zinc-800 font-mono tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {teamDaily.date}
            </span>

            <span className="hidden md:inline-flex items-center gap-1 text-[9px] text-amber-300/90 bg-amber-950/40 px-1.5 py-0.5 rounded-lg border border-amber-500/30 font-medium">
              <Volume2 className="w-3 h-3 text-amber-400" />
              Loa TV: Bật
            </span>

            {isManagerOrAdmin && (
              <Tooltip title="Nhật ký giám sát Live TV Monitor">
                <Button
                  type="default"
                  size="small"
                  data-testid="tv-journal-card-button"
                  icon={<ClipboardList className="w-3 h-3 text-amber-300" />}
                  onClick={() => setJournalOpen(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-700 rounded-lg text-xs h-6 px-1.5 flex items-center gap-1"
                >
                  <span className="hidden lg:inline text-[10px]">Nhật ký TV</span>
                </Button>
              </Tooltip>
            )}

            {onOpenFullscreen && (
              <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
                <Button
                  type="primary"
                  size="small"
                  icon={<Maximize2 className="w-3 h-3" />}
                  onClick={onOpenFullscreen}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 rounded-lg text-xs h-6 px-2 flex items-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <span className="hidden lg:inline text-[10px]">Mở TV</span>
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 2 Semicircle Arcs (Book Hôm Nay & Done Hôm Nay) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 2.1: Book Hôm Nay (Hành động chính) */}
          <div className="bg-blue-950/20 rounded-2xl p-2.5 border border-blue-500/35 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-blue-200 text-xs">BOOK HÔM NAY</strong>
                </span>
                <span className="text-[9px] text-blue-400 font-mono font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/40">
                  HÀNH ĐỘNG
                </span>
              </div>

              {/* Semicircle Gauge (Book Hôm Nay) */}
              <SemicircleGauge
                percent={metrics.bookPercent}
                actual={metrics.bookActual}
                target={metrics.bookTarget}
                label="Tiến độ"
                tone="blue"
                pacingPercent={expectedBookPacingPercent}
                gapText={`GAP: ${metrics.gapBook >= 0 ? '+' : ''}${metrics.gapBook}`}
                gapType={metrics.gapBook >= 0 ? 'positive' : 'negative'}
              />

              {/* Horizontal Ribbon 4 Cột */}
              <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px]">
                <div>
                  <span className="text-zinc-500 block">Kỳ vọng</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">
                    {metrics.expectedBook} Book
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapBook >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Còn thiếu</span>
                  <span className="text-xs font-black text-blue-300 block tabular-nums">
                    {metrics.remainingBook} Book
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Mục tiêu</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">≥{metrics.bookTarget}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-blue-900/40 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              <span>Mục tiêu ngày</span>
              <span className="text-blue-300 font-bold">≥ {metrics.bookTarget} Book</span>
            </div>
          </div>

          {/* Card 2.2: Done Hôm Nay */}
          <div className="bg-black/50 rounded-2xl p-2.5 border border-zinc-800 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <strong className="text-zinc-200 text-xs">DONE HÔM NAY</strong>
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">Chỉ tiêu: {metrics.doneTarget}</span>
              </div>

              {/* Semicircle Gauge (Done Hôm Nay) */}
              <SemicircleGauge
                percent={metrics.donePercent}
                actual={metrics.doneActual}
                target={metrics.doneTarget}
                label="Tiến độ"
                tone="emerald"
                pacingPercent={expectedDonePacingPercent}
                gapText={`GAP: ${metrics.gapDone >= 0 ? '+' : ''}${metrics.gapDone}`}
                gapType={metrics.gapDone >= 0 ? 'positive' : 'negative'}
              />

              {/* Horizontal Ribbon 4 Cột */}
              <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px]">
                <div>
                  <span className="text-zinc-500 block">Kỳ vọng</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">
                    {metrics.expectedDone} Done
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapDone >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {metrics.gapDone >= 0 ? `+${metrics.gapDone}` : metrics.gapDone}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Còn thiếu</span>
                  <span className="text-xs font-black text-amber-300 block tabular-nums">
                    {metrics.remainingDone} Done
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Mục tiêu</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">{metrics.doneTarget}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-zinc-800/60 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
              <span>Mục tiêu ngày</span>
              <span className="text-zinc-200 font-bold">{metrics.doneTarget} Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 2 Footer Action Banner */}
      <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-300 flex items-center gap-1">
          Nhịp ngày: <strong className="text-amber-300">{pacing.shiftStatusLabel}</strong>
        </span>
        <span className="text-zinc-400">
          Cần thêm: <strong className="text-blue-300">+{metrics.remainingBook} Book</strong> trước 22:00
        </span>
      </div>
    </section>
  );
};
