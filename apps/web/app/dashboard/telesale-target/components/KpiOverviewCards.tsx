'use client';

import React from 'react';
import { Row, Col, Progress } from 'antd';
import { Calendar, CheckCircle2, User, Trophy, Flame, Sparkles } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';

interface KpiOverviewCardsProps {
  overview: TelesaleTargetOverview;
}

export const KpiOverviewCards: React.FC<KpiOverviewCardsProps> = ({ overview }) => {
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
      {/* 1. KPI TEAM THÁNG X */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
            isDoneOver100 ? 'border-amber-400 supercharged-aura' : 'border-amber-500/30 hover:border-amber-400/60'
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
                {isDoneOver100 && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-black font-mono bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> VƯỢT {donePercent}%
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                    teamMonth.isPacingOnTrack
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                      : 'bg-amber-950 text-amber-400 border border-amber-700/50'
                  }`}
                >
                  {teamMonth.isPacingOnTrack ? '✓ Đạt nhịp pacing' : '⚡ Cần bứt phá'}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Done Card (2 rows: Khách lẻ Not Combo + Khách Combo Live) */}
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
                    percent={Math.min(100, donePercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isDoneOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Tiến độ</span>
                    <span
                      className={
                        isDoneOver100 ? 'text-amber-400 font-black animate-pulse' : 'text-emerald-400 font-bold'
                      }
                    >
                      {isDoneOver100 ? `🔥 ${donePercent}% VƯỢT CHỈ TIÊU` : `${donePercent}%`}
                    </span>
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
                    percent={Math.min(100, bookPercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isBookOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Tiến độ</span>
                    <span
                      className={isBookOver100 ? 'text-amber-400 font-black animate-pulse' : 'text-blue-400 font-bold'}
                    >
                      {isBookOver100 ? `🔥 ${bookPercent}% VƯỢT CHỈ TIÊU` : `${bookPercent}%`}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Chỉ tiêu Booking</span>
                  <span className="text-zinc-300">{teamMonth.bookTarget} Book</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer pacing */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">
              Ngày {teamMonth.pacingDaysElapsed}/{teamMonth.pacingDaysTotal}
            </span>
            <span className="text-zinc-400">
              Nhịp bám đuổi:{' '}
              <strong className={teamMonth.pacingRatio >= 1 ? 'text-emerald-400' : 'text-amber-400'}>
                {(teamMonth.pacingRatio * 100).toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>
      </Col>

      {/* 2. KPI MỖI NGÀY */}
      <Col xs={24} md={8}>
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
            isDailyDoneOver100 ? 'border-amber-400 supercharged-aura' : 'border-amber-500/30 hover:border-amber-400/60'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> KPI Mỗi Ngày
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-zinc-800 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Hôm nay: {teamDaily.date}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Daily Done Card */}
              <div className="bg-black/40 rounded-xl p-3 border border-amber-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-zinc-200">Done Hôm Nay</strong>
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tabular-nums">
                      {teamDaily.doneActual}
                    </span>
                    <span className="text-zinc-500 text-xs font-mono">/ {teamDaily.doneTarget}</span>
                  </div>
                  <Progress
                    percent={Math.min(100, dailyDonePercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isDailyDoneOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Chỉ tiêu ngày</span>
                    <span
                      className={
                        isDailyDoneOver100 ? 'text-amber-400 font-black animate-pulse' : 'text-emerald-400 font-bold'
                      }
                    >
                      {isDailyDoneOver100 ? `🔥 ${dailyDonePercent}% VƯỢT` : `${dailyDonePercent}%`}
                    </span>
                  </div>
                </div>

                {/* Sub Daily Combo Live */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-purple-300 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Combo Live:
                    </span>
                    <span className="text-purple-200 font-bold tabular-nums">{comboLiveDailyActual} Done</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
                    <span>Tổng hôm nay</span>
                    <span className="text-zinc-300 font-semibold">{totalDailyDone} Done</span>
                  </div>
                </div>
              </div>

              {/* Daily Book Card */}
              <div className="bg-black/40 rounded-xl p-3 border border-amber-500/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <strong className="text-zinc-200">Book Hôm Nay</strong>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tabular-nums">
                      {teamDaily.bookActual}
                    </span>
                    <span className="text-zinc-500 text-xs font-mono">/ {teamDaily.bookTarget}</span>
                  </div>
                  <Progress
                    percent={Math.min(100, dailyBookPercent)}
                    size="small"
                    showInfo={false}
                    className={`mt-1.5 ${isDailyBookOver100 ? 'supercharged-bar' : ''}`}
                  />
                  <div className="flex justify-between items-center text-[11px] mt-1 font-mono">
                    <span className="text-zinc-400">Chỉ tiêu ngày</span>
                    <span
                      className={
                        isDailyBookOver100 ? 'text-amber-400 font-black animate-pulse' : 'text-blue-400 font-bold'
                      }
                    >
                      {isDailyBookOver100 ? `🔥 ${dailyBookPercent}% VƯỢT` : `${dailyBookPercent}%`}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Mục tiêu tạo lịch</span>
                  <span className="text-amber-400 font-semibold">≥ 25 Book / ngày</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Mục tiêu tạo lịch ca ngày</span>
            <span className="text-amber-400 font-semibold font-mono">≥ 25 Book / ngày</span>
          </div>
        </div>
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
                const staffTotalDone = staff.doneActual + staffComboActual;

                return (
                  <div
                    key={staff.legacyStaffId}
                    className={`p-2.5 rounded-xl transition-all duration-300 ${
                      isOver100
                        ? 'bg-gradient-to-b from-amber-950/40 via-zinc-950 to-black border border-amber-400 supercharged-aura'
                        : 'bg-black/40 border border-zinc-800/80 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${isOver100 ? 'bg-amber-400 animate-ping' : 'bg-amber-400'}`}
                        />
                        {staff.name}
                      </span>
                      {isOver100 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center gap-0.5 shadow-sm">
                          👑 VƯỢT {percent}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                          +{staff.doneToday} hôm nay
                        </span>
                      )}
                    </div>

                    {/* Row 1: Khách lẻ - Tính KPI */}
                    <div className="mt-1.5">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black font-mono text-zinc-100 tabular-nums">
                            {staff.doneActual}
                          </span>
                          <span className="text-zinc-500 text-xs font-mono">/ {staff.doneTarget} Done</span>
                        </div>
                        {isOver100 && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold">+{staff.doneToday} lẻ</span>
                        )}
                      </div>

                      <Progress
                        percent={Math.min(100, percent)}
                        size="small"
                        showInfo={false}
                        className={`mt-1 ${isOver100 ? 'supercharged-bar' : ''}`}
                      />

                      <div className="flex justify-between items-center text-[10px] mt-0.5 font-mono">
                        <span className={isOver100 ? 'text-amber-400 font-black' : 'text-zinc-400'}>
                          {isOver100 ? `🔥 ${percent}% VƯỢT` : `Đạt ${percent}%`}
                        </span>
                        <span className="text-zinc-400">
                          Call: {staff.callActualToday}/{staff.callTargetDaily}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Khách Combo Live - Tracking */}
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-purple-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        Combo: <strong className="text-purple-200">{staffComboActual}</strong>
                      </span>
                      <span className="text-zinc-400">
                        Tổng: <strong className="text-zinc-200">{staffTotalDone}</strong>
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
