'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import {
  PhoneCall,
  PhoneIncoming,
  Clock,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react';
import { TelesaleTargetOverview, TelesaleStaffDailyAction, TelesaleDailyActionStatus } from '@mos-lab/shared';
import { getKpiProgressStroke } from '../utils/kpi-color-utils';

interface DailyActionScheduleProps {
  overview: TelesaleTargetOverview;
}

export const DailyActionSchedule: React.FC<DailyActionScheduleProps> = ({ overview }) => {
  const { token } = theme.useToken();
  const { dailyAction, workSchedule, staffTargets } = overview;

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

  // Fallback if staffActions isn't populated (e.g. legacy cache)
  const staffActions: TelesaleStaffDailyAction[] =
    dailyAction.staffActions && dailyAction.staffActions.length > 0
      ? dailyAction.staffActions
      : staffTargets.map((s) => ({
          legacyStaffId: s.legacyStaffId,
          name: s.name,
          isWorkingToday: true,
          callTarget: s.callTargetDaily || 83,
          callActual: s.callActualToday,
          callPercent:
            (s.callTargetDaily || 83) > 0
              ? Number(((s.callActualToday / (s.callTargetDaily || 83)) * 100).toFixed(1))
              : 0,
          callGap: s.callActualToday - (s.callTargetDaily || 83),
          pickupTarget: s.pickupTargetDaily || 25,
          pickupActual: s.pickupActualToday,
          pickupPercent:
            (s.pickupTargetDaily || 25) > 0
              ? Number(((s.pickupActualToday / (s.pickupTargetDaily || 25)) * 100).toFixed(1))
              : 0,
          pickupGap: s.pickupActualToday - (s.pickupTargetDaily || 25),
          overallPercent: Number(
            (
              ((s.callActualToday / (s.callTargetDaily || 83) + s.pickupActualToday / (s.pickupTargetDaily || 25)) /
                2) *
              100
            ).toFixed(1)
          ),
          status: 'ACHIEVED',
          statusLabel: 'Đúng nhịp',
        }));

  const workingStaffCount = staffActions.filter((s) => s.isWorkingToday).length;

  const getStatusBadge = (
    percent: number,
    isWorking: boolean,
    legacyStatus?: TelesaleDailyActionStatus,
    label?: string
  ) => {
    if (!isWorking) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
          <MinusCircle className="w-2.5 h-2.5" />
          Nghỉ
        </span>
      );
    }
    if (percent >= 100) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Sparkles className="w-2.5 h-2.5" />
          {percent > 100 ? `Vượt ${percent}%` : 'Đạt'}
        </span>
      );
    }
    if (percent >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-2.5 h-2.5" />
          Gần đạt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
        <AlertCircle className="w-2.5 h-2.5" />
        Chưa đạt
      </span>
    );
  };

  const getProgressStrokeColor = (percent: number) => {
    return getKpiProgressStroke(percent, token);
  };

  return (
    <div className="space-y-4">
      {/* 1. HÀNH ĐỘNG MỖI NGÀY (MOS-BUG-77: Tinh giản vào Call và Pickup) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
        <div className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> Hành Động Mỗi Ngày
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">{workingStaffCount} Telesales đang trực ca</span>
        </div>

        {/* 2 Core Input Cards: Gọi điện (Call) & Nghe máy (Pickup) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cấp Team: Gọi điện (Call) */}
          <div className="bg-black/40 border border-zinc-800/80 hover:border-emerald-500/40 transition-colors p-3.5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  Gọi điện (Call)
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">≥ {callTargetPerStaff} Call/NV</span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-zinc-100 tabular-nums">{teamCallActual}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ {teamCallTarget}</span>
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                    teamCallPercent >= 100
                      ? 'text-emerald-400'
                      : teamCallPercent >= 80
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {teamCallPercent}%
                </div>
              </div>

              {/* Progress bar using Ant Design Progress to avoid inline style objects */}
              <div className="mt-2.5">
                <Progress
                  percent={Math.min(100, Math.max(0, teamCallPercent))}
                  strokeColor={getProgressStrokeColor(teamCallPercent)}
                  strokeWidth={6}
                  size="small"
                  showInfo={false}
                />
              </div>
            </div>

            {/* Gap info */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Chênh lệch mục tiêu:</span>
              {teamCallGap >= 0 ? (
                <span className="font-mono font-bold text-emerald-400 tabular-nums">+{teamCallGap} vượt chỉ tiêu</span>
              ) : teamCallPercent >= 80 ? (
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  Thiếu {Math.abs(teamCallGap)} cuộc (Gần đạt)
                </span>
              ) : (
                <span className="font-mono font-bold text-rose-400 tabular-nums">
                  Thiếu {Math.abs(teamCallGap)} cuộc
                </span>
              )}
            </div>
          </div>

          {/* Cấp Team: Nghe máy (Pickup) */}
          <div className="bg-black/40 border border-zinc-800/80 hover:border-emerald-500/40 transition-colors p-3.5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                  Nghe máy (Pickup)
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">≥ {pickupTargetPerStaff} Pickup/NV</span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-zinc-100 tabular-nums">{teamPickupActual}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ {teamPickupTarget}</span>
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                    teamPickupPercent >= 100
                      ? 'text-emerald-400'
                      : teamPickupPercent >= 80
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {teamPickupPercent}%
                </div>
              </div>

              {/* Progress bar using Ant Design Progress to avoid inline style objects */}
              <div className="mt-2.5">
                <Progress
                  percent={Math.min(100, Math.max(0, teamPickupPercent))}
                  strokeColor={getProgressStrokeColor(teamPickupPercent)}
                  strokeWidth={6}
                  size="small"
                  showInfo={false}
                />
              </div>
            </div>

            {/* Gap info */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Chênh lệch mục tiêu:</span>
              {teamPickupGap >= 0 ? (
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  +{teamPickupGap} vượt chỉ tiêu
                </span>
              ) : teamPickupPercent >= 80 ? (
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  Thiếu {Math.abs(teamPickupGap)} cuộc (Gần đạt)
                </span>
              ) : (
                <span className="font-mono font-bold text-rose-400 tabular-nums">
                  Thiếu {Math.abs(teamPickupGap)} cuộc
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cấp Nhân sự: Từng nhân viên hiển thị Call, Pickup, % hoàn thành và 4 trạng thái màu sắc */}
        <div className="mt-4 pt-3.5 border-t border-zinc-800/80">
          <div className="text-[11px] text-zinc-400 mb-2.5 font-medium flex items-center justify-between">
            <span>Tiến độ từng nhân sự hôm nay:</span>
            <span className="text-[10px] text-zinc-500 font-mono">OmiCall CDR Realtime</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {staffActions.map((s) => (
              <div
                key={s.legacyStaffId}
                className={`p-2.5 rounded-xl border transition-all ${
                  !s.isWorkingToday
                    ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Header: Tên & Badge trạng thái */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-200 font-bold truncate">{s.name}</span>
                  {getStatusBadge(s.overallPercent, s.isWorkingToday, s.status, s.statusLabel)}
                </div>

                {s.isWorkingToday ? (
                  <div className="space-y-1.5 text-[11px]">
                    {/* Call row */}
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <PhoneCall className="w-3 h-3 text-emerald-400" /> Gọi:
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-zinc-200">
                        {s.callActual}
                        <span className="text-zinc-500 font-normal">/{s.callTarget}</span>{' '}
                        <span
                          className={`text-[10px] font-bold ${
                            s.callPercent >= 100
                              ? 'text-emerald-400'
                              : s.callPercent >= 80
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }`}
                        >
                          ({s.callPercent}%)
                        </span>
                      </span>
                    </div>

                    {/* Pickup row */}
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <PhoneIncoming className="w-3 h-3 text-emerald-400" /> Nghe:
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-zinc-200">
                        {s.pickupActual}
                        <span className="text-zinc-500 font-normal">/{s.pickupTarget}</span>{' '}
                        <span
                          className={`text-[10px] font-bold ${
                            s.pickupPercent >= 100
                              ? 'text-emerald-400'
                              : s.pickupPercent >= 80
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }`}
                        >
                          ({s.pickupPercent}%)
                        </span>
                      </span>
                    </div>

                    {/* Overall mini progress bar using Ant Design Progress */}
                    <div className="pt-1">
                      <Progress
                        percent={Math.min(100, Math.max(0, s.overallPercent))}
                        strokeColor={getProgressStrokeColor(s.overallPercent)}
                        strokeWidth={4}
                        size="small"
                        showInfo={false}
                      />
                      <div className="text-[10px] text-zinc-500 mt-0.5 flex justify-between font-mono">
                        <span>Tổng hợp</span>
                        <span
                          className={`font-bold tabular-nums ${
                            s.overallPercent >= 100
                              ? 'text-emerald-400'
                              : s.overallPercent >= 80
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }`}
                        >
                          {s.overallPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-[11px] text-zinc-500 italic">Nghỉ ca trực hôm nay</div>
                )}
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
