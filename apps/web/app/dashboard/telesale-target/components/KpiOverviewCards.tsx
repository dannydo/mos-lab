'use client';

import React from 'react';
import { Row, Col, Progress, theme } from 'antd';
import { Calendar, CheckCircle2, User, Trophy, Flame, Sparkles } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { TelesaleTodayTvMonitorCard } from './TelesaleTodayTvMonitorCard';

interface KpiOverviewCardsProps {
  overview: TelesaleTargetOverview;
  onOpenTvFullscreen?: () => void;
}

export const KpiOverviewCards: React.FC<KpiOverviewCardsProps> = ({ overview, onOpenTvFullscreen }) => {
  const { token } = theme.useToken();
  const { month, teamMonth, teamDaily, staffTargets } = overview;
  const monthNumStr = month.split('-')[1] || '10';

  // 1. Team Month Calculations
  // Not Combo Live is the primary KPI metric
  const donePercent = Math.round((teamMonth.doneActual / (teamMonth.doneTarget || 1)) * 100);
  const isDoneOver100 = donePercent > 100;

  const comboLiveMonthActual = teamMonth.comboLiveDoneActual || 0;
  const totalMonthDone = teamMonth.doneActual + comboLiveMonthActual;
  const comboLiveMonthShare = totalMonthDone > 0 ? Math.round((comboLiveMonthActual / totalMonthDone) * 100) : 0;

  const bookPercent = Math.round((teamMonth.bookActual / (teamMonth.bookTarget || 1)) * 100);
  const isBookOver100 = bookPercent > 100;

  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';
  const isPeriodCompleted = teamMonth.periodStatus === 'COMPLETED';

  // Workdays pacing & metrics (MOS-BUG-67)
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

  // Status-aware colors for Progress bar using semantic tokens (Requirement 5 & UI Contract)
  const getProgressStroke = (percent: number) => {
    if (isPeriodNotStarted) return token.colorTextQuaternary;
    if (percent >= 100) return token.colorWarning;
    if (pacingStatus === 'AHEAD') return token.colorSuccess;
    if (pacingStatus === 'ON_TRACK') return token.colorInfo;
    return token.colorWarning;
  };

  // 2. Team Daily Calculations
  const dailyDonePercent = Math.round((teamDaily.doneActual / (teamDaily.doneTarget || 1)) * 100);
  const isDailyDoneOver100 = dailyDonePercent > 100;

  const comboLiveDailyActual = teamDaily.comboLiveDoneActual || 0;
  const totalDailyDone = teamDaily.doneActual + comboLiveDailyActual;
  const comboLiveDailyShare = totalDailyDone > 0 ? Math.round((comboLiveDailyActual / totalDailyDone) * 100) : 0;

  const dailyBookPercent = Math.round((teamDaily.bookActual / (teamDaily.bookTarget || 1)) * 100);
  const isDailyBookOver100 = dailyBookPercent > 100;

  return (
    <Row gutter={[16, 16]}>
      {/* 1. KPI TEAM THÁNG X (MOS-BUG-67) */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
            isDoneOver100
              ? 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'border-amber-500/30 hover:border-amber-400/60'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> KPI Team Tháng {monthNumStr}
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
                    className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold ${
                      pacingStatus === 'AHEAD'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                        : pacingStatus === 'ON_TRACK'
                          ? 'bg-blue-950 text-blue-300 border border-blue-600/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                    }`}
                  >
                    {pacingStatus === 'AHEAD' && '🚀 Vượt nhịp'}
                    {pacingStatus === 'ON_TRACK' && '✓ Đúng nhịp'}
                    {pacingStatus === 'BEHIND' && '⚡ Chậm nhịp'}
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Done Card (Khách lẻ Not Combo + Quản trị KPI) */}
              <div className="bg-black/40 rounded-xl p-3 border border-amber-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-zinc-200">Done Khách Lẻ</strong>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Tính KPI</span>
                  </div>

                  {/* Main Metric: Khách lẻ Not Combo Live */}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tabular-nums">
                      {teamMonth.doneActual}
                    </span>
                    <span className="text-zinc-500 text-xs font-mono">/ {teamMonth.doneTarget} Done</span>
                  </div>

                  <Progress
                    percent={isPeriodNotStarted ? 0 : Math.min(100, donePercent)}
                    strokeColor={getProgressStroke(donePercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isDoneOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Tiến độ</span>
                    <span
                      className={
                        isPeriodNotStarted
                          ? 'text-zinc-500 font-semibold'
                          : isDoneOver100
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                      }
                    >
                      {isPeriodNotStarted
                        ? '0%'
                        : isDoneOver100
                          ? `✨ ${donePercent}% VƯỢT CHỈ TIÊU`
                          : `${donePercent}%`}
                    </span>
                  </div>

                  {/* Management Metrics (MOS-BUG-67) */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Kỳ vọng:</span>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {isPeriodNotStarted
                          ? '-'
                          : (teamMonth.expectedDone ??
                            Math.round(teamMonth.doneTarget * (workDaysElapsed / (workDaysTotal || 1))))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Gap KPI:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          isPeriodNotStarted
                            ? 'text-zinc-400'
                            : (teamMonth.gapDone ?? 0) >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {isPeriodNotStarted
                          ? '-'
                          : `${(teamMonth.gapDone ?? 0) >= 0 ? '+' : ''}${teamMonth.gapDone ?? 0}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Còn lại:</span>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {teamMonth.remainingDone ?? Math.max(0, teamMonth.doneTarget - teamMonth.doneActual)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Cần TB:</span>
                      <span className="text-amber-300 font-semibold tabular-nums">
                        {isPeriodCompleted ? '-' : `${teamMonth.dailyRequiredDone ?? 0}/ngày`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub Metric Row: Khách Combo Live (Tracking tiến độ) */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-purple-300 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Combo Live:
                    </span>
                    <span className="text-purple-200 font-bold tabular-nums">{comboLiveMonthActual} Done</span>
                  </div>
                  <Progress
                    percent={comboLiveMonthShare}
                    size="small"
                    showInfo={false}
                    className="combo-live-bar mt-1"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-0.5 font-mono">
                    <span>Tỷ trọng</span>
                    <span className="text-purple-300 font-semibold">
                      {comboLiveMonthShare}% tổng Done ({totalMonthDone})
                    </span>
                  </div>
                </div>
              </div>

              {/* Book Card */}
              <div className="bg-black/40 rounded-xl p-3 border border-amber-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <strong className="text-zinc-200">Book</strong>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tabular-nums">
                      {teamMonth.bookActual}
                    </span>
                    <span className="text-zinc-500 text-xs font-mono">/ {teamMonth.bookTarget}</span>
                  </div>
                  <Progress
                    percent={isPeriodNotStarted ? 0 : Math.min(100, bookPercent)}
                    strokeColor={getProgressStroke(bookPercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isBookOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Tiến độ</span>
                    <span
                      className={
                        isPeriodNotStarted
                          ? 'text-zinc-500 font-semibold'
                          : isBookOver100
                            ? 'text-amber-400 font-bold'
                            : 'text-blue-400 font-bold'
                      }
                    >
                      {isPeriodNotStarted
                        ? '0%'
                        : isBookOver100
                          ? `✨ ${bookPercent}% VƯỢT CHỈ TIÊU`
                          : `${bookPercent}%`}
                    </span>
                  </div>

                  {/* Management Metrics (MOS-BUG-67) */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Kỳ vọng:</span>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {isPeriodNotStarted
                          ? '-'
                          : (teamMonth.expectedBook ??
                            Math.round(teamMonth.bookTarget * (workDaysElapsed / (workDaysTotal || 1))))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Gap KPI:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          isPeriodNotStarted
                            ? 'text-zinc-400'
                            : (teamMonth.gapBook ?? 0) >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {isPeriodNotStarted
                          ? '-'
                          : `${(teamMonth.gapBook ?? 0) >= 0 ? '+' : ''}${teamMonth.gapBook ?? 0}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Còn lại:</span>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {teamMonth.remainingBook ?? Math.max(0, teamMonth.bookTarget - teamMonth.bookActual)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Cần TB:</span>
                      <span className="text-blue-300 font-semibold tabular-nums">
                        {isPeriodCompleted ? '-' : `${teamMonth.dailyRequiredBook ?? 0}/ngày`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Chỉ tiêu Booking</span>
                  <span className="text-zinc-300">{teamMonth.bookTarget} Book</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer pacing (MOS-BUG-67: Ngày làm việc X/Y & Nhịp bám đuổi) */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-1">
              Ngày làm việc{' '}
              <strong className="text-zinc-200 tabular-nums">
                {workDaysElapsed}/{workDaysTotal}
              </strong>
            </span>
            <span className="text-zinc-400 flex items-center gap-1.5 font-mono">
              Nhịp bám đuổi:{' '}
              {isPeriodNotStarted ? (
                <strong className="text-zinc-400">Chưa bắt đầu</strong>
              ) : (
                <strong
                  className={
                    pacingStatus === 'AHEAD'
                      ? 'text-emerald-400'
                      : pacingStatus === 'ON_TRACK'
                        ? 'text-blue-400'
                        : 'text-amber-400'
                  }
                >
                  {(teamMonth.pacingRatio * 100).toFixed(0)}% · {pacingStatusLabel}
                </strong>
              )}
            </span>
          </div>
        </div>
      </Col>

      {/* 2. TV MONITOR HÔM NAY (MOS-BUG-71) */}
      <Col xs={24} md={8}>
        <TelesaleTodayTvMonitorCard overview={overview} onOpenFullscreen={onOpenTvFullscreen} />
      </Col>

      {/* 3. KPI CÁ NHÂN (DONE) */}
      <Col xs={24} md={8}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group hover:border-amber-400/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> KPI Cá Nhân (Done)
              </span>
              <span className="text-xs text-zinc-400 font-mono">Tổng: {teamMonth.doneTarget} Done Khách Lẻ</span>
            </div>

            {/* 4 Staff Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-1">
              {staffTargets.map((staff) => {
                const percent = Math.round((staff.doneActual / (staff.doneTarget || 1)) * 100);
                const isOver100 = percent > 100;
                const staffComboActual = staff.comboLiveDoneActual || 0;

                // MOS-BUG-72: Resilience fallback calculations
                const expectedProgressRate =
                  overview.teamMonth?.expectedProgressRate ?? (workDaysTotal > 0 ? workDaysElapsed / workDaysTotal : 0);
                const workDaysRemaining =
                  overview.teamMonth?.workDaysRemaining ?? Math.max(0, workDaysTotal - workDaysElapsed);
                const expectedDone = staff.expectedDone ?? Math.round(staff.doneTarget * expectedProgressRate);
                const gapDone = staff.gapDone ?? staff.doneActual - expectedDone;
                const remainingDone = staff.remainingDone ?? Math.max(0, staff.doneTarget - staff.doneActual);

                let dailyRequiredDone = staff.dailyRequiredDone;
                if (dailyRequiredDone === undefined) {
                  if (teamMonth.periodStatus === 'NOT_STARTED') {
                    dailyRequiredDone = workDaysTotal > 0 ? Number((staff.doneTarget / workDaysTotal).toFixed(1)) : 0;
                  } else if (teamMonth.periodStatus === 'IN_PROGRESS') {
                    dailyRequiredDone =
                      workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0;
                  } else {
                    dailyRequiredDone = 0;
                  }
                }

                let progressStatus = staff.progressStatus;
                let progressStatusLabel = staff.progressStatusLabel;
                if (!progressStatus || !progressStatusLabel) {
                  if (gapDone > 0) {
                    progressStatus = 'AHEAD';
                    progressStatusLabel = 'Vượt tiến độ';
                  } else if (gapDone >= -1) {
                    progressStatus = 'ON_TRACK';
                    progressStatusLabel = 'Đúng tiến độ';
                  } else {
                    progressStatus = 'BEHIND';
                    progressStatusLabel = 'Chậm tiến độ';
                  }
                }

                const revenueVnd = staff.revenueActual || 0;

                return (
                  <div
                    key={staff.legacyStaffId}
                    className={`p-2.5 rounded-xl transition-all duration-300 flex flex-col justify-between ${
                      isOver100
                        ? 'bg-gradient-to-b from-amber-950/40 via-zinc-950 to-black border border-amber-400 supercharged-aura'
                        : 'bg-black/40 border border-zinc-800/80 hover:border-amber-500/40'
                    }`}
                  >
                    <div>
                      {/* Row 1: Tên & +X hôm nay */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-zinc-100 text-sm flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOver100 ? 'bg-amber-400 animate-ping' : 'bg-amber-400'
                            }`}
                          />
                          <span className="truncate">{staff.name}</span>
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono font-semibold tabular-nums shrink-0">
                          +{staff.doneToday} hôm nay
                        </span>
                      </div>

                      {/* Row 2: Badge Trạng thái & Gap KPI */}
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none shrink-0 ${
                            progressStatus === 'AHEAD'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : progressStatus === 'ON_TRACK'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {progressStatusLabel}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-semibold tabular-nums ${
                            gapDone > 0 ? 'text-emerald-400' : gapDone >= -1 ? 'text-blue-400' : 'text-rose-400'
                          }`}
                        >
                          Gap: {gapDone > 0 ? `+${gapDone}` : gapDone} Done
                        </span>
                      </div>

                      {/* Row 3: Done thực tế / KPI tháng & % hoàn thành */}
                      <div className="mt-1.5">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black font-mono text-zinc-100 tabular-nums">
                              {staff.doneActual}
                            </span>
                            <span className="text-zinc-500 text-xs font-mono">/ {staff.doneTarget} Done</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold tabular-nums ${
                              isOver100 ? 'text-amber-400' : 'text-zinc-400'
                            }`}
                          >
                            {isOver100 ? `🔥 ${percent}% VƯỢT` : `Đạt ${percent}%`}
                          </span>
                        </div>

                        <Progress
                          percent={Math.min(100, percent)}
                          size="small"
                          showInfo={false}
                          className={`mt-1 ${isOver100 ? 'supercharged-bar' : ''}`}
                        />
                      </div>

                      {/* Row 4: Còn thiếu & Cần TB */}
                      <div className="flex justify-between items-center text-[10px] mt-1.5 font-mono text-zinc-400">
                        <span>
                          Còn thiếu: <strong className="text-zinc-200 tabular-nums">{remainingDone} Done</strong>
                        </span>
                        <span>
                          Cần TB: <strong className="text-amber-300 tabular-nums">{dailyRequiredDone}/ngày</strong>
                        </span>
                      </div>
                    </div>

                    {/* Row 5: Doanh thu & Combo */}
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span
                        className="text-zinc-400 truncate mr-1"
                        title={`Doanh thu: ${revenueVnd.toLocaleString('vi-VN')}đ`}
                      >
                        Doanh thu:{' '}
                        <strong className="text-emerald-300 tabular-nums">{revenueVnd.toLocaleString('vi-VN')}đ</strong>
                      </span>
                      <span className="text-purple-300 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        Combo: <strong className="text-purple-200 tabular-nums">{staffComboActual}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer team sync */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>4 Trụ cột Telesales</span>
            <span className="text-zinc-400 font-mono">Phượng (150) · Kiều (100) · Điệp (100) · Vũ (100)</span>
          </div>
        </div>
      </Col>
    </Row>
  );
};
