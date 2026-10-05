'use client';

import React from 'react';
import { Progress } from 'antd';
import { PhoneCall } from 'lucide-react';
import { TelesaleTargetOverview, TelesaleStaffDailyAction, TelesaleDailyActionStatus } from '@mos-lab/shared';
import { SemicircleGauge } from './SemicircleGauge';

interface DailyActionScheduleProps {
  overview: TelesaleTargetOverview;
}

export const DailyActionSchedule: React.FC<DailyActionScheduleProps> = ({ overview }) => {
  const { dailyAction, staffTargets } = overview;

  const callTargetPerStaff = dailyAction.callTargetPerStaff || 83;
  const pickupTargetPerStaff = dailyAction.pickupTargetPerStaff || 25;
  const teamCallTarget = dailyAction.teamCallTarget ?? 0;
  const teamCallActual = dailyAction.teamCallActual ?? dailyAction.totalCallsToday ?? 0;
  const teamCallPercent = dailyAction.teamCallPercent ?? 0;
  const teamCallGap = dailyAction.teamCallGap ?? teamCallActual - teamCallTarget;

  const teamPickupTarget = dailyAction.teamPickupTarget ?? 0;
  const teamPickupActual = dailyAction.teamPickupActual ?? 0;
  const teamPickupPercent = dailyAction.teamPickupPercent ?? 0;
  const teamPickupGap = dailyAction.teamPickupGap ?? teamPickupActual - teamPickupTarget;

  // Fallback if staffActions isn't populated
  const staffActions: TelesaleStaffDailyAction[] =
    dailyAction.staffActions && dailyAction.staffActions.length > 0
      ? dailyAction.staffActions
      : staffTargets.map((s, idx) => ({
          legacyStaffId: s.legacyStaffId,
          name: s.name,
          isWorkingToday: true,
          callTarget: s.callTargetDaily || callTargetPerStaff,
          callActual: s.callActualToday,
          callPercent:
            (s.callTargetDaily || callTargetPerStaff) > 0
              ? Number(((s.callActualToday / (s.callTargetDaily || callTargetPerStaff)) * 100).toFixed(1))
              : 0,
          callGap: s.callActualToday - (s.callTargetDaily || callTargetPerStaff),
          pickupTarget: s.pickupTargetDaily || pickupTargetPerStaff,
          pickupActual: s.pickupActualToday,
          pickupPercent:
            (s.pickupTargetDaily || pickupTargetPerStaff) > 0
              ? Number(((s.pickupActualToday / (s.pickupTargetDaily || pickupTargetPerStaff)) * 100).toFixed(1))
              : 0,
          pickupGap: s.pickupActualToday - (s.pickupTargetDaily || pickupTargetPerStaff),
          overallPercent: Number(
            (
              ((s.callActualToday / (s.callTargetDaily || callTargetPerStaff) +
                s.pickupActualToday / (s.pickupTargetDaily || pickupTargetPerStaff)) /
                2) *
              100
            ).toFixed(1)
          ),
          status: 'ACHIEVED',
          statusLabel: idx < 2 ? 'Ca sáng' : 'Ca chiều',
        }));

  const workingStaffCount = staffActions.filter((s) => s.isWorkingToday).length;

  const pickRate = teamCallActual > 0 ? Number(((teamPickupActual / teamCallActual) * 100).toFixed(1)) : 0;

  return (
    <section className="rounded-3xl bg-gradient-to-b from-amber-950/20 via-zinc-950/95 to-zinc-950 border border-amber-500/35 p-3.5 glass-card shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* 1. Card Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-300 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> HÀNH ĐỘNG MỖI NGÀY
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono">{workingStaffCount} Chuyên Viên Trực Ca</span>
          </div>
        </div>

        {/* 2. Top: 2 Semicircle Arcs (Calls & Pickup) */}
        <div className="grid grid-cols-2 gap-2.5 mb-2">
          {/* Semicircle 1: Cuộc Gọi */}
          <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-2 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 text-blue-300 font-bold text-[11px]">
                <span>📱</span> Cuộc Gọi
              </span>
              <span className="text-[9px] text-blue-300 font-mono font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/30">
                TARGET: {teamCallTarget}
              </span>
            </div>

            {/* Semicircle Gauge (Calls) */}
            <SemicircleGauge
              percent={teamCallPercent}
              actual={teamCallActual}
              target={teamCallTarget}
              label=""
              hideLabelText={true}
              hideUnitText={true}
              tone="blue"
              pacingPercent={75}
              gapText={`GAP: ${teamCallGap >= 0 ? '+' : ''}${teamCallGap}`}
              gapType={teamCallGap >= 0 ? 'positive' : 'negative'}
              radius={78}
              heightClass="h-[90px]"
            />

            {/* Mini Ribbon 3 Cột */}
            <div className="mt-1.5 bg-black/60 border border-zinc-800/90 rounded-lg p-1 grid grid-cols-3 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[8px]">
              <div>
                <span className="text-zinc-500 block">Kỳ vọng</span>
                <span className="text-[11px] font-black text-zinc-200 block tabular-nums">
                  {Math.round(teamCallTarget * 0.75)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Gap</span>
                <span
                  className={`text-[11px] font-black block tabular-nums ${
                    teamCallGap >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {teamCallGap >= 0 ? `+${teamCallGap}` : teamCallGap}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Cần TB</span>
                <span className="text-[11px] font-black text-amber-300 block tabular-nums">29/h</span>
              </div>
            </div>
          </div>

          {/* Semicircle 2: Pickup */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-2 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="flex items-center gap-1 text-emerald-300 font-bold text-[11px]">
                <span>🎧</span> Pickup
              </span>
              <span className="text-[9px] text-emerald-300 font-mono font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                TARGET: {teamPickupTarget}
              </span>
            </div>

            {/* Semicircle Gauge (Pickup) */}
            <SemicircleGauge
              percent={teamPickupPercent}
              actual={teamPickupActual}
              target={teamPickupTarget}
              label=""
              hideLabelText={true}
              hideUnitText={true}
              tone="emerald"
              pacingPercent={75}
              gapText={`GAP: ${teamPickupGap >= 0 ? '+' : ''}${teamPickupGap}`}
              gapType={teamPickupGap >= 0 ? 'positive' : 'negative'}
              radius={78}
              heightClass="h-[90px]"
            />

            {/* Mini Ribbon 3 Cột */}
            <div className="mt-1.5 bg-black/60 border border-zinc-800/90 rounded-lg p-1 grid grid-cols-3 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[8px]">
              <div>
                <span className="text-zinc-500 block">Kỳ vọng</span>
                <span className="text-[11px] font-black text-zinc-200 block tabular-nums">
                  {Math.round(teamPickupTarget * 0.75)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Gap</span>
                <span
                  className={`text-[11px] font-black block tabular-nums ${
                    teamPickupGap >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {teamPickupGap >= 0 ? `+${teamPickupGap}` : teamPickupGap}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Pick Rate</span>
                <span className="text-[11px] font-black text-emerald-300 block tabular-nums">{pickRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom: Clean Metric Matrix Table (Zero white underlines) */}
        <div className="bg-black/50 border border-zinc-800/90 rounded-2xl p-2 font-mono text-[10px]">
          <div className="grid grid-cols-12 text-zinc-400 font-semibold pb-1 mb-1 text-[9px]">
            <span className="col-span-3">Chuyên Viên</span>
            <span className="col-span-2 text-center">Ca Trực</span>
            <span className="col-span-3 text-center">Tiến độ Gọi</span>
            <span className="col-span-2 text-center">Pickup</span>
            <span className="col-span-2 text-right">Trạng Thái</span>
          </div>

          <div className="space-y-1">
            {staffActions.slice(0, 4).map((s, idx) => {
              const isMorning = idx < 2;
              const isAchieved = s.callPercent >= 80 && s.pickupPercent >= 80;
              const isApproaching = !isAchieved && (s.callPercent >= 60 || s.pickupPercent >= 60);

              const statusBadge = isAchieved ? (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                  🌟 Đạt
                </span>
              ) : isApproaching ? (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                  ⚡ Gần đạt
                </span>
              ) : (
                <span className="text-[9px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/40">
                  ⚠️ Chậm
                </span>
              );

              return (
                <div
                  key={s.legacyStaffId}
                  className="grid grid-cols-12 items-center text-[10px] hover:bg-zinc-800/40 p-1 rounded-lg transition-colors"
                >
                  <span className="col-span-3 font-bold text-zinc-100 flex items-center gap-1 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAchieved ? 'bg-emerald-400' : isApproaching ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                    />
                    {s.name}
                  </span>

                  <span className="col-span-2 text-center">
                    {isMorning ? (
                      <span className="text-[8px] bg-amber-500/15 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                        ☀️ Sáng
                      </span>
                    ) : (
                      <span className="text-[8px] bg-blue-500/15 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">
                        🌙 Chiều
                      </span>
                    )}
                  </span>

                  <div className="col-span-3 px-1">
                    <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                      <span className="text-blue-300 font-bold tabular-nums">
                        {s.callActual}/{s.callTarget}
                      </span>
                      <span
                        className={`font-bold ${
                          s.callPercent >= 80
                            ? 'text-emerald-400'
                            : s.callPercent >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {s.callPercent}%
                      </span>
                    </div>
                    <Progress
                      percent={Math.min(100, s.callPercent)}
                      size="small"
                      showInfo={false}
                      className="m-0 leading-none"
                    />
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="font-bold text-emerald-300 tabular-nums">{s.pickupActual}</span>
                    <span className="text-zinc-500 text-[9px]">/{s.pickupTarget}</span>
                  </div>

                  <span className="col-span-2 text-right">{statusBadge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Card Footer */}
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OmiCall PBX Realtime
        </span>
        <span>Ca sáng: 08:30 - 12:30 · Ca chiều: 13:30 - 17:30</span>
      </div>
    </section>
  );
};
