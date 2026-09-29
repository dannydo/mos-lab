'use client';

import React from 'react';
import { Row, Col, Progress } from 'antd';
import { Calendar, CheckCircle2, User, Trophy, Flame } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';

interface KpiOverviewCardsProps {
  overview: TelesaleTargetOverview;
}

export const KpiOverviewCards: React.FC<KpiOverviewCardsProps> = ({ overview }) => {
  const { teamMonth, teamDaily, staffTargets } = overview;

  const donePercent = Math.min(100, Math.round((teamMonth.doneActual / (teamMonth.doneTarget || 1)) * 100));
  const bookPercent = Math.min(100, Math.round((teamMonth.bookActual / (teamMonth.bookTarget || 1)) * 100));

  const dailyDonePercent = Math.min(100, Math.round((teamDaily.doneActual / (teamDaily.doneTarget || 1)) * 100));
  const dailyBookPercent = Math.min(100, Math.round((teamDaily.bookActual / (teamDaily.bookTarget || 1)) * 100));

  return (
    <Row gutter={[16, 16]}>
      {/* 1. KPI TEAM THÁNG 10 */}
      <Col xs={24} md={8}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group hover:border-amber-400/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> KPI Team Tháng 10
              </span>
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

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Done */}
              <div className="bg-black/30 rounded-xl p-3 border border-amber-500/10">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Done</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold font-mono text-zinc-100 tabular-nums">
                    {teamMonth.doneActual}
                  </span>
                  <span className="text-zinc-500 text-sm font-mono">/ {teamMonth.doneTarget}</span>
                </div>
                <Progress percent={donePercent} size="small" showInfo={false} className="mt-2" />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                  <span>Tiến độ</span>
                  <span className="text-emerald-400 font-bold">{donePercent}%</span>
                </div>
              </div>

              {/* Book */}
              <div className="bg-black/30 rounded-xl p-3 border border-amber-500/10">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Book</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold font-mono text-zinc-100 tabular-nums">
                    {teamMonth.bookActual}
                  </span>
                  <span className="text-zinc-500 text-sm font-mono">/ {teamMonth.bookTarget}</span>
                </div>
                <Progress percent={bookPercent} size="small" showInfo={false} className="mt-2" />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                  <span>Tiến độ</span>
                  <span className="text-blue-400 font-bold">{bookPercent}%</span>
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group hover:border-amber-400/60 transition-all duration-300">
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
              {/* Daily Done */}
              <div className="bg-black/30 rounded-xl p-3 border border-amber-500/10">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Done hôm nay</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold font-mono text-zinc-100 tabular-nums">
                    {teamDaily.doneActual}
                  </span>
                  <span className="text-zinc-500 text-sm font-mono">/ {teamDaily.doneTarget}</span>
                </div>
                <Progress percent={dailyDonePercent} size="small" showInfo={false} className="mt-2" />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                  <span>Chỉ tiêu ngày</span>
                  <span className="text-emerald-400 font-bold">{dailyDonePercent}%</span>
                </div>
              </div>

              {/* Daily Book */}
              <div className="bg-black/30 rounded-xl p-3 border border-amber-500/10">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Book hôm nay</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold font-mono text-zinc-100 tabular-nums">
                    {teamDaily.bookActual}
                  </span>
                  <span className="text-zinc-500 text-sm font-mono">/ {teamDaily.bookTarget}</span>
                </div>
                <Progress percent={dailyBookPercent} size="small" showInfo={false} className="mt-2" />
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                  <span>Chỉ tiêu ngày</span>
                  <span className="text-blue-400 font-bold">{dailyBookPercent}%</span>
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
              <span className="text-xs text-zinc-400 font-mono">Tổng: 450 Done</span>
            </div>

            {/* 4 Staff Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-1">
              {staffTargets.map((staff) => {
                const percent = Math.min(100, Math.round((staff.doneActual / (staff.doneTarget || 1)) * 100));
                return (
                  <div
                    key={staff.legacyStaffId}
                    className="bg-black/40 border border-zinc-800/80 hover:border-amber-500/40 p-2.5 rounded-xl transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        {staff.name}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                        +{staff.doneToday} hôm nay
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-zinc-100 tabular-nums">{staff.doneActual}</span>
                      <span className="text-zinc-500 text-xs font-mono">/ {staff.doneTarget} Done</span>
                    </div>

                    <Progress percent={percent} size="small" showInfo={false} className="mt-1.5" />

                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1 font-mono">
                      <span>Đạt {percent}%</span>
                      <span>
                        Call: {staff.callActualToday}/{staff.callTargetDaily}
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
