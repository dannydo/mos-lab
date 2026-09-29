'use client';

import React from 'react';
import { Phone, Calendar, Sun, Moon, Clock } from 'lucide-react';
import { TelesaleTargetOverview } from '@mos-lab/shared';

interface DailyActionScheduleProps {
  overview: TelesaleTargetOverview;
}

export const DailyActionSchedule: React.FC<DailyActionScheduleProps> = ({ overview }) => {
  const { dailyAction, workSchedule, staffTargets } = overview;

  return (
    <div className="space-y-4">
      {/* 1. HÀNH ĐỘNG MỖI NGÀY */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
        <div className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" /> Hành Động Mỗi Ngày
          </span>
          <span className="text-[11px] text-zinc-500 font-normal">Kỷ luật &amp; Hành động</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Call target */}
          <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gọi điện</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-zinc-100 tabular-nums">
                ≥ {dailyAction.callTargetPerStaff}
              </span>
              <span className="text-xs text-zinc-400">Call / NV</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Đã gọi hôm nay: <span className="text-emerald-400 font-bold">{dailyAction.totalCallsToday}</span>
            </div>
          </div>

          {/* Book target */}
          <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Tạo lịch</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-zinc-100 tabular-nums">
                {dailyAction.bookTargetPerDay}
              </span>
              <span className="text-xs text-zinc-400">Book / ngày</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Đã tạo hôm nay: <span className="text-blue-400 font-bold">{dailyAction.totalBookingsToday}</span>
            </div>
          </div>
        </div>

        {/* Breakdown cuộc gọi hôm nay của từng bạn */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 mb-2 font-medium flex items-center justify-between">
            <span>Cuộc gọi hôm nay theo nhân sự:</span>
            <span className="text-[10px] text-zinc-500 font-mono">OmiCall CDR</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {staffTargets.map((s) => (
              <div key={s.legacyStaffId} className="bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800/60">
                <div className="text-[11px] text-zinc-300 font-semibold truncate">{s.name}</div>
                <div className="text-xs font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                  {s.callActualToday}
                  <span className="text-[10px] text-zinc-500 font-normal">/{s.callTargetDaily}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. LỊCH LÀM VIỆC TRONG NGÀY */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
        <div className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Lịch Làm Việc Trong Ngày
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">08:00 – 17:00</span>
        </div>

        <div className="space-y-3">
          {/* Sáng: 08:00 - 12:00 */}
          <div
            className={`p-3.5 rounded-xl border transition-all duration-300 ${
              workSchedule.morning.isActive
                ? 'bg-amber-950/30 border-amber-400/80 shadow-lg shadow-amber-500/10'
                : 'bg-black/30 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sun className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-zinc-300">{workSchedule.morning.timeRange}</div>
                  <div className="text-sm font-semibold text-zinc-100">{workSchedule.morning.title}</div>
                </div>
              </div>
              {workSchedule.morning.isActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                  Đang trong ca
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-2 pl-10.5">
              Tập trung danh sách khách hàng chu kỳ từ <strong className="text-zinc-200">0D đến 120D</strong>
            </div>
          </div>

          {/* Chiều: 13:00 - 17:00 */}
          <div
            className={`p-3.5 rounded-xl border transition-all duration-300 ${
              workSchedule.afternoon.isActive
                ? 'bg-purple-950/30 border-purple-400/80 shadow-lg shadow-purple-500/10'
                : 'bg-black/30 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Moon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-zinc-300">{workSchedule.afternoon.timeRange}</div>
                  <div className="text-sm font-semibold text-zinc-100">{workSchedule.afternoon.title}</div>
                </div>
              </div>
              {workSchedule.afternoon.isActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pink-500/20 text-pink-300 border border-pink-400/40 animate-pulse">
                  Đang trong ca
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-2 pl-10.5">
              Chiến dịch <strong className="text-pink-400">Cua lại vợ bầu</strong> · Khai thác data chu kỳ{' '}
              <strong className="text-zinc-200">&gt; 120D</strong> (Teamwork chung)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
