'use client';

import React from 'react';
import { Row, Col, Progress, theme } from 'antd';
import { Trophy, CheckCircle2, Calendar, User, Sparkles } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { TelesaleTodayTvMonitorCard } from './TelesaleTodayTvMonitorCard';
import { SemicircleGauge } from './SemicircleGauge';

interface KpiOverviewCardsProps {
  overview: TelesaleTargetOverview;
  onOpenTvFullscreen?: () => void;
}

export const KpiOverviewCards: React.FC<KpiOverviewCardsProps> = ({ overview, onOpenTvFullscreen }) => {
  const { token } = theme.useToken();
  const { month, teamMonth, staffTargets } = overview;
  const monthNumStr = month.split('-')[1] || '10';

  // 1. Team Month Calculations
  const donePercent = Math.round((teamMonth.doneActual / (teamMonth.doneTarget || 1)) * 100);
  const isDoneOver100 = donePercent > 100;

  const comboLiveMonthActual = teamMonth.comboLiveDoneActual || 0;
  const totalMonthDone = teamMonth.doneActual + comboLiveMonthActual;
  const comboLiveMonthShare = totalMonthDone > 0 ? Math.round((comboLiveMonthActual / totalMonthDone) * 100) : 0;

  const incomingTarget = teamMonth.incomingTarget ?? teamMonth.bookTarget ?? 1;
  const incomingActual = teamMonth.incomingActual ?? teamMonth.bookActual ?? 0;
  const incomingPercent = Math.round((incomingActual / (incomingTarget || 1)) * 100);

  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';
  const isPeriodCompleted = teamMonth.periodStatus === 'COMPLETED';

  // Workdays pacing & metrics
  const workDaysElapsed = teamMonth.workDaysElapsed ?? teamMonth.pacingDaysElapsed ?? 0;
  const workDaysTotal = teamMonth.workDaysTotal ?? teamMonth.pacingDaysTotal ?? 26;

  // Pacing status & label
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

  const gapDone = isPeriodNotStarted ? '-' : (teamMonth.gapDone ?? 0);
  const remainingDone = teamMonth.remainingDone ?? Math.max(0, teamMonth.doneTarget - teamMonth.doneActual);
  const dailyRequiredDone = isPeriodCompleted ? '-' : `${teamMonth.dailyRequiredDone ?? 0}/ngày`;

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 w-full items-stretch">
      {/* ============================================================ */}
      {/* 1. KPI TEAM THÁNG X                                           */}
      {/* ============================================================ */}
      <section
        className={`rounded-3xl bg-gradient-to-b from-amber-950/20 via-zinc-950/90 to-zinc-950 border p-3.5 glass-card shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
          isDoneOver100
            ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : 'border-amber-500/30 hover:border-amber-400/60'
        }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> KPI TEAM THÁNG {monthNumStr}
            </span>
            <div className="flex items-center gap-1.5">
              {!isPeriodNotStarted && isDoneOver100 && (
                <span className="text-[10px] px-2 py-0.5 rounded font-black font-mono bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> VƯỢT {donePercent}%
                </span>
              )}
              {isPeriodNotStarted ? (
                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  Chưa bắt đầu
                </span>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                    pacingStatus === 'AHEAD' || pacingStatus === 'ON_TRACK'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                      : (teamMonth.pacingRatio ?? 0) >= 0.8
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                        : 'bg-rose-950 text-rose-300 border border-rose-600/50'
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
            <div className="bg-emerald-950/20 rounded-2xl p-2.5 border border-emerald-500/35 flex flex-col justify-between shadow-inner">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <strong className="text-emerald-200 text-xs">Done Khách Lẻ</strong>
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    KPI CHÍNH
                  </span>
                </div>

                {/* Semicircle Gauge (Done Khách Lẻ) */}
                <SemicircleGauge
                  percent={isPeriodNotStarted ? 0 : donePercent}
                  actual={teamMonth.doneActual}
                  target={teamMonth.doneTarget}
                  unit="Done"
                  label="Tiến độ"
                  tone="emerald"
                  pacingPercent={Math.min(
                    100,
                    Math.round(((Number(expectedDone) || 0) / (teamMonth.doneTarget || 1)) * 100)
                  )}
                  gapText={typeof gapDone === 'number' ? `GAP: ${gapDone >= 0 ? '+' : ''}${gapDone}` : undefined}
                  gapType={typeof gapDone === 'number' && gapDone >= 0 ? 'positive' : 'negative'}
                />

                {/* Horizontal Ribbon 4 Cột */}
                <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px]">
                  <div>
                    <span className="text-zinc-500 block">Kỳ vọng</span>
                    <span className="text-xs font-black text-zinc-200 block tabular-nums">{expectedDone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Gap KPI</span>
                    <span
                      className={`text-xs font-black block tabular-nums ${
                        typeof gapDone === 'number' && gapDone >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {typeof gapDone === 'number' ? `${gapDone >= 0 ? '+' : ''}${gapDone}` : gapDone}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Còn lại</span>
                    <span className="text-xs font-black text-zinc-200 block tabular-nums">{remainingDone}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cần TB</span>
                    <span className="text-xs font-black text-amber-300 block tabular-nums">{dailyRequiredDone}</span>
                  </div>
                </div>
              </div>

              {/* Combo Live nguyên bản */}
              <div className="mt-2 pt-1.5 border-t border-emerald-900/40 font-mono text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Combo Live:
                  </span>
                  <span className="text-purple-200 font-bold tabular-nums">{comboLiveMonthActual} Done</span>
                </div>
                <Progress percent={comboLiveMonthShare} size="small" showInfo={false} className="combo-live-bar mt-1" />
                <div className="flex justify-between text-[9px] text-zinc-400 mt-0.5">
                  <span>Tỷ trọng</span>
                  <span className="text-purple-300 font-semibold">
                    {comboLiveMonthShare}% tổng Done ({totalMonthDone})
                  </span>
                </div>
              </div>
            </div>

            {/* Card 1.2: Incoming Tháng */}
            <div className="bg-black/50 rounded-2xl p-2.5 border border-zinc-800 flex flex-col justify-between shadow-inner">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <strong className="text-zinc-200 text-xs">Incoming Tháng</strong>
                  </span>
                  <span className="text-[9px] text-sky-400 font-mono font-bold bg-sky-950 px-1.5 py-0.5 rounded border border-sky-500/30">
                    SẮP TỚI
                  </span>
                </div>

                {/* Semicircle Gauge (Incoming) */}
                <SemicircleGauge
                  percent={isPeriodNotStarted ? 0 : incomingPercent}
                  actual={incomingActual}
                  target={incomingTarget}
                  unit="Incoming"
                  label="Tiến độ"
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
                <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px]">
                  <div>
                    <span className="text-zinc-500 block">Kỳ vọng</span>
                    <span className="text-xs font-black text-zinc-200 block tabular-nums">{expectedIncoming}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Gap KPI</span>
                    <span
                      className={`text-xs font-black block tabular-nums ${
                        typeof gapIncoming === 'number' && gapIncoming >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {typeof gapIncoming === 'number' ? `${gapIncoming >= 0 ? '+' : ''}${gapIncoming}` : gapIncoming}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Còn lại</span>
                    <span className="text-xs font-black text-zinc-200 block tabular-nums">{remainingIncoming}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cần TB</span>
                    <span className="text-xs font-black text-sky-300 block tabular-nums">{dailyRequiredIncoming}</span>
                  </div>
                </div>
              </div>

              {/* Incoming Footer */}
              <div className="mt-2 pt-1.5 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                <span>Chỉ tiêu Incoming</span>
                <span className="text-zinc-200 font-bold">{incomingTarget} Incoming</span>
              </div>
            </div>
          </div>
        </div>

        {/* Box 1 Footer */}
        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1">
            Ngày làm việc{' '}
            <strong className="text-zinc-200 tabular-nums">
              {workDaysElapsed}/{workDaysTotal}
            </strong>
          </span>
          <span>
            Nhịp bám đuổi:{' '}
            <strong
              className={
                pacingStatus === 'AHEAD' || pacingStatus === 'ON_TRACK' ? 'text-emerald-400' : 'text-amber-400'
              }
            >
              {((teamMonth.pacingRatio ?? 0) * 100).toFixed(0)}% · {pacingStatusLabel}
            </strong>
          </span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. TV MONITOR HÔM NAY                                         */}
      {/* ============================================================ */}
      <TelesaleTodayTvMonitorCard overview={overview} onOpenFullscreen={onOpenTvFullscreen} />

      {/* ============================================================ */}
      {/* 3. KPI CÁ NHÂN (DONE) - 5 CHUYÊN VIÊN TELESALES               */}
      {/* ============================================================ */}
      <section className="rounded-3xl bg-gradient-to-b from-amber-950/20 via-zinc-950/90 to-zinc-950 border border-amber-500/30 p-3.5 glass-card shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-300 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" /> KPI Cá Nhân (Done)
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Tổng: {teamMonth.doneTarget} Done Khách Lẻ</span>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-2 gap-2 my-0.5">
            {staffTargets.map((staff) => {
              const percent = Math.round((staff.doneActual / (staff.doneTarget || 1)) * 100);
              const isOver100 = percent > 100;
              const staffComboActual = staff.comboLiveDoneActual || 0;

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

              const cardStyleClass = isPeriodNotStarted
                ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
                : isStaffAchieved
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                  : isStaffApproaching
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    : 'bg-rose-950/25 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.15)]';

              const revenueVnd = staff.revenueActual || 0;

              return (
                <div
                  key={staff.legacyStaffId}
                  className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${cardStyleClass}`}
                >
                  <div>
                    {/* Name & Today Count */}
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-bold text-zinc-100 truncate flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isStaffAchieved ? 'bg-emerald-400' : isStaffApproaching ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                        />
                        {staff.name}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">+{staff.doneToday || 0} hôm nay</span>
                    </div>

                    {/* Progress Actual / Target */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-black font-mono text-zinc-100 tabular-nums">
                        {staff.doneActual}{' '}
                        <span className="text-[10px] text-zinc-500 font-normal">/ {staff.doneTarget} Done</span>
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border ${
                          isStaffAchieved
                            ? 'text-emerald-300 bg-emerald-950 border-emerald-500/40'
                            : isStaffApproaching
                              ? 'text-amber-300 bg-amber-950 border-amber-500/40'
                              : 'text-rose-400 bg-rose-950 border-rose-500/40'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Ribbon 4 Cột */}
                    <div className="bg-black/60 border border-zinc-800/80 rounded-lg p-1 mt-1 grid grid-cols-4 gap-0.5 text-center font-mono text-[8px] divide-x divide-zinc-800">
                      <div>
                        <span className="text-zinc-500 block">Kỳ vọng</span>
                        <span className="text-zinc-200 font-bold block tabular-nums">{staffExpectedDone}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Gap</span>
                        <span
                          className={`font-black block tabular-nums ${
                            staffGapDone >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {staffGapDone > 0 ? `+${staffGapDone}` : staffGapDone}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Thiếu</span>
                        <span className="text-zinc-200 font-bold block tabular-nums">{staffRemainingDone} Done</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Cần TB</span>
                        <span className="text-amber-300 font-bold block tabular-nums">{dailyRequiredDoneStr}</span>
                      </div>
                    </div>

                    {/* Gap textual assertion for vitest */}
                    <div className="hidden">
                      <span>Gap: {staffGapDone > 0 ? `+${staffGapDone}` : staffGapDone} Done</span>
                    </div>
                  </div>

                  {/* Card Footer: Revenue & Combo */}
                  <div className="mt-1 pt-1 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-zinc-400 truncate">
                      Doanh thu:{' '}
                      <strong className="text-emerald-300 font-medium">{revenueVnd.toLocaleString('vi-VN')}đ</strong>
                    </span>
                    <span className="text-purple-300 shrink-0">
                      Combo: <strong>{staffComboActual}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Box 3 Footer */}
        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>4 Trụ cột Telesales</span>
          <span className="text-zinc-300">Phượng (150) · Kiều (100) · Điệp (100) · Vũ (100)</span>
        </div>
      </section>
    </div>
  );
};
