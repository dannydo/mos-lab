'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from 'antd';
import { PhoneCall } from 'lucide-react';
import { TelesaleTargetOverview, TelesaleStaffDailyAction, TelesaleDailyActionStatus } from '@mos-lab/shared';
import { SemicircleGauge } from './SemicircleGauge';
import { RealisticCardFireworks } from './RealisticCardFireworks';
import { calculateShiftPacing } from '../utils/tv-monitor-pacing';
import { useTheme } from '../../../../context/ThemeContext';
import { TvCelebrationSettings } from '../hooks/useTelesaleTvLiveCelebration';

const getActionTierStyles = (tier: 'rose' | 'amber' | 'emerald', isDark = true) => {
  switch (tier) {
    case 'emerald':
      return {
        container: isDark
          ? 'bg-gradient-to-b from-emerald-950/30 to-zinc-950/80 border border-emerald-500/40 rounded-2xl p-2 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-emerald-50/70 to-white border border-emerald-200/90 rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        title: isDark ? 'text-emerald-300 font-bold text-[11px]' : 'text-emerald-800 font-bold text-[11px]',
        badge: isDark
          ? 'text-[9px] text-emerald-300 font-mono font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40'
          : 'text-[9px] text-emerald-800 font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300',
      };
    case 'amber':
      return {
        container: isDark
          ? 'bg-gradient-to-b from-amber-950/30 to-zinc-950/80 border border-amber-500/40 rounded-2xl p-2 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-amber-50/70 to-white border border-amber-200/90 rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        title: isDark ? 'text-amber-300 font-bold text-[11px]' : 'text-amber-800 font-bold text-[11px]',
        badge: isDark
          ? 'text-[9px] text-amber-300 font-mono font-bold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40'
          : 'text-[9px] text-amber-800 font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300',
      };
    case 'rose':
    default:
      return {
        container: isDark
          ? 'bg-gradient-to-b from-rose-950/30 to-zinc-950/80 border border-rose-500/40 rounded-2xl p-2 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-rose-50/70 to-white border border-rose-200/90 rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        title: isDark ? 'text-rose-300 font-bold text-[11px]' : 'text-rose-800 font-bold text-[11px]',
        badge: isDark
          ? 'text-[9px] text-rose-300 font-mono font-bold bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/40'
          : 'text-[9px] text-rose-800 font-mono font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300',
      };
  }
};

interface DailyActionScheduleProps {
  overview: TelesaleTargetOverview;
  isTvOpen?: boolean;
  fireworksEnabled?: boolean;
  soundEnabled?: boolean;
  volume?: number;
}

export const DailyActionSchedule: React.FC<DailyActionScheduleProps> = ({
  overview,
  isTvOpen = false,
  fireworksEnabled,
  soundEnabled,
  volume,
}) => {
  const { dailyAction, staffTargets } = overview;
  const [now, setNow] = useState<Date>(new Date());

  // Reactive settings from localStorage / custom events if not explicitly passed as props
  const [internalSettings, setInternalSettings] = useState<Partial<TvCelebrationSettings>>(() => {
    if (typeof window === 'undefined') return { fireworksEnabled: true, soundEnabled: true, volume: 0.9 };
    try {
      const raw = localStorage.getItem('MOS_TV_MONITOR_VOICE_SETTINGS');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { fireworksEnabled: true, soundEnabled: true, volume: 0.9 };
  });

  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<TvCelebrationSettings>>;
      if (customEvent.detail) {
        setInternalSettings((prev) => ({ ...prev, ...customEvent.detail }));
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'MOS_TV_MONITOR_VOICE_SETTINGS' && e.newValue) {
        try {
          setInternalSettings(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('mos:tv-settings-updated', handleSettingsUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('mos:tv-settings-updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const effectiveFireworksEnabled =
    fireworksEnabled !== undefined ? fireworksEnabled : (internalSettings.fireworksEnabled ?? true);
  const effectiveSoundEnabled = soundEnabled !== undefined ? soundEnabled : (internalSettings.soundEnabled ?? true);
  const effectiveVolume = volume !== undefined ? volume : (internalSettings.volume ?? 0.9);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const pacing = calculateShiftPacing(now);
  const pacingPercent = Math.min(100, Math.round(pacing.rTime * 100));

  const callTargetPerStaff = dailyAction.callTargetPerStaff || 83;
  const pickupTargetPerStaff = dailyAction.pickupTargetPerStaff || 25;
  const teamCallTarget = dailyAction.teamCallTarget ?? 0;
  const teamCallActual = dailyAction.teamCallActual ?? dailyAction.totalCallsToday ?? 0;
  const teamCallPercent = dailyAction.teamCallPercent ?? 0;

  const teamPickupTarget = dailyAction.teamPickupTarget ?? 0;
  const teamPickupActual = dailyAction.teamPickupActual ?? 0;
  const teamPickupPercent = dailyAction.teamPickupPercent ?? 0;

  // Tính toán kỳ vọng theo tiến độ thời gian trong ca làm việc
  const expectedCalls = Math.round(teamCallTarget * pacing.rTime);
  const gapCalls = teamCallActual - expectedCalls;

  const expectedPickup = Math.round(teamPickupTarget * pacing.rTime);
  const gapPickup = teamPickupActual - expectedPickup;

  // Tính số lượng cần gọi trung bình mỗi giờ làm việc còn lại
  const hoursRemaining = pacing.hoursRemaining + (pacing.minsRemaining > 0 ? 1 : 0);
  const remainingCalls = Math.max(0, teamCallTarget - teamCallActual);
  const hourlyRequiredCalls = hoursRemaining > 0 ? Math.ceil(remainingCalls / hoursRemaining) : 0;

  // Pacing Tier cho Calls và Pickup
  const getActionPacingTier = (actual: number, expected: number, fullTarget: number): 'emerald' | 'amber' | 'rose' => {
    if (fullTarget > 0 && actual >= fullTarget) return 'emerald';
    if (pacing.rTime <= 0.08) {
      if (actual >= 3) return 'emerald';
      return 'amber';
    }
    const gap = actual - expected;
    if (gap >= 0) return 'emerald';
    if (gap >= -5) return 'amber';
    return 'rose';
  };

  const callTier = getActionPacingTier(teamCallActual, expectedCalls, teamCallTarget);
  const pickupTier = getActionPacingTier(teamPickupActual, expectedPickup, teamPickupTarget);

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

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const workingStaffCount = staffActions.filter((s) => s.isWorkingToday).length;

  const pickRate = teamCallActual > 0 ? Number(((teamPickupActual / teamCallActual) * 100).toFixed(1)) : 0;

  const callStyles = getActionTierStyles(callTier, isDark);
  const pickupStyles = getActionTierStyles(pickupTier, isDark);
  const isCallOver100 = teamCallPercent >= 100;
  const isPickupOver100 = teamPickupPercent >= 100;

  return (
    <section
      className={`rounded-3xl ${
        isDark
          ? 'bg-gradient-to-b from-amber-950/20 via-zinc-950/95 to-zinc-950 border-amber-500/35 glass-card shadow-2xl'
          : 'bg-white border-slate-200/90 shadow-sm'
      } border p-3.5 relative overflow-hidden flex flex-col justify-between h-full`}
    >
      {/* 1. Card Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`${
              isDark ? 'text-amber-300' : 'text-amber-800'
            } text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5`}
          >
            <PhoneCall className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} /> HÀNH ĐỘNG MỖI NGÀY
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} font-mono`}>
              {workingStaffCount}/{staffActions.length} Chuyên Viên Trực Ca
            </span>
          </div>
        </div>

        {/* 2. Top: 2 Semicircle Arcs (Calls & Pickup) */}
        <div className="grid grid-cols-2 gap-2.5 mb-2">
          {/* Semicircle 1: Cuộc Gọi */}
          <div className={callStyles.container}>
            {/* Pháo bông thực tế khi đạt mốc >= 100% (tắt khi mở TV fullscreen hoặc khi tắt pháo bông) */}
            <RealisticCardFireworks
              active={!isTvOpen && effectiveFireworksEnabled && isCallOver100}
              soundEnabled={!isTvOpen && effectiveSoundEnabled}
              volume={effectiveVolume}
              theme="emerald"
              cardLabel="CALLS"
            />
            <div>
              <div className="flex items-center justify-between text-xs mb-0.5 relative z-10">
                <span className={`flex items-center gap-1 ${callStyles.title}`}>
                  <span>📱</span> Cuộc Gọi
                </span>
                <span className={callStyles.badge}>TARGET: {teamCallTarget}</span>
              </div>

              {/* Semicircle Gauge (Calls) */}
              <div className="relative z-10">
                <SemicircleGauge
                  percent={teamCallPercent}
                  actual={teamCallActual}
                  target={teamCallTarget}
                  label=""
                  hideLabelText={true}
                  hideUnitText={true}
                  tone={callTier}
                  pacingPercent={pacingPercent}
                  gapText={`GAP: ${gapCalls >= 0 ? '+' : ''}${gapCalls}`}
                  gapType={gapCalls >= 0 ? 'positive' : gapCalls >= -5 ? 'neutral' : 'negative'}
                  radius={85}
                  heightClass="h-[95px]"
                />
              </div>

              {/* Mini Ribbon 3 Cột */}
              <div
                className={`mt-1 ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-zinc-800'
                    : 'bg-slate-50/90 border-slate-200/90 divide-slate-200'
                } border rounded-lg p-1 grid grid-cols-3 gap-0.5 text-center font-mono divide-x text-[8px] relative z-10`}
              >
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Kỳ vọng</span>
                  <span
                    className={`text-[11px] font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    {expectedCalls}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Gap</span>
                  <span
                    className={`text-[11px] font-black block tabular-nums ${
                      gapCalls >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : gapCalls >= -5
                          ? isDark
                            ? 'text-amber-400'
                            : 'text-amber-600'
                          : isDark
                            ? 'text-rose-400'
                            : 'text-rose-600'
                    }`}
                  >
                    {gapCalls >= 0 ? `+${gapCalls}` : gapCalls}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Cần TB</span>
                  <span
                    className={`text-[11px] font-black ${isDark ? 'text-amber-300' : 'text-amber-600'} block tabular-nums`}
                  >
                    {hourlyRequiredCalls}/h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Semicircle 2: Pickup */}
          <div className={pickupStyles.container}>
            {/* Pháo bông thực tế khi đạt mốc >= 100% (tắt khi mở TV fullscreen hoặc khi tắt pháo bông) */}
            <RealisticCardFireworks
              active={!isTvOpen && effectiveFireworksEnabled && isPickupOver100}
              soundEnabled={!isTvOpen && effectiveSoundEnabled}
              volume={effectiveVolume}
              theme="emerald"
              cardLabel="PICKUP"
            />
            <div>
              <div className="flex items-center justify-between text-xs mb-0.5 relative z-10">
                <span className={`flex items-center gap-1 ${pickupStyles.title}`}>
                  <span>🎧</span> Pickup
                </span>
                <span className={pickupStyles.badge}>TARGET: {teamPickupTarget}</span>
              </div>

              {/* Semicircle Gauge (Pickup) */}
              <div className="relative z-10">
                <SemicircleGauge
                  percent={teamPickupPercent}
                  actual={teamPickupActual}
                  target={teamPickupTarget}
                  label=""
                  hideLabelText={true}
                  hideUnitText={true}
                  tone={pickupTier}
                  pacingPercent={pacingPercent}
                  gapText={`GAP: ${gapPickup >= 0 ? '+' : ''}${gapPickup}`}
                  gapType={gapPickup >= 0 ? 'positive' : gapPickup >= -3 ? 'neutral' : 'negative'}
                  radius={85}
                  heightClass="h-[95px]"
                />
              </div>

              {/* Mini Ribbon 3 Cột */}
              <div
                className={`mt-1 ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-zinc-800'
                    : 'bg-slate-50/90 border-slate-200/90 divide-slate-200'
                } border rounded-lg p-1 grid grid-cols-3 gap-0.5 text-center font-mono divide-x text-[8px] relative z-10`}
              >
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Kỳ vọng</span>
                  <span
                    className={`text-[11px] font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    {expectedPickup}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Gap</span>
                  <span
                    className={`text-[11px] font-black block tabular-nums ${
                      gapPickup >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : gapPickup >= -3
                          ? isDark
                            ? 'text-amber-400'
                            : 'text-amber-600'
                          : isDark
                            ? 'text-rose-400'
                            : 'text-rose-600'
                    }`}
                  >
                    {gapPickup >= 0 ? `+${gapPickup}` : gapPickup}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Pick Rate</span>
                  <span
                    className={`text-[11px] font-black ${isDark ? 'text-emerald-300' : 'text-emerald-600'} block tabular-nums`}
                  >
                    {pickRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bottom: Clean Metric Matrix Table (Zero white underlines) */}
        <div
          className={`${
            isDark ? 'bg-black/50 border-zinc-800/90' : 'bg-slate-50/70 border-slate-200/90'
          } border rounded-2xl p-1.5 font-mono text-[10px]`}
        >
          <div
            className={`grid grid-cols-12 ${isDark ? 'text-zinc-400' : 'text-slate-500'} font-semibold pb-1 mb-0.5 text-[9px]`}
          >
            <span className="col-span-3">Chuyên Viên</span>
            <span className="col-span-2 text-center">Ca Trực</span>
            <span className="col-span-3 text-center">Tiến độ Gọi</span>
            <span className="col-span-2 text-center">Pickup</span>
            <span className="col-span-2 text-right">Trạng Thái</span>
          </div>

          <div className="space-y-0.5 max-h-[175px] overflow-y-auto scrollbar-thin pr-0.5">
            {[...staffActions]
              .sort((a, b) => {
                if (a.isWorkingToday && !b.isWorkingToday) return -1;
                if (!a.isWorkingToday && b.isWorkingToday) return 1;
                return 0;
              })
              .map((s, idx) => {
                const isOff = !s.isWorkingToday;
                const isAchieved = !isOff && s.callPercent >= 80 && s.pickupPercent >= 80;
                const isApproaching = !isOff && !isAchieved && (s.callPercent >= 60 || s.pickupPercent >= 60);

                const statusBadge = isOff ? (
                  <span
                    className={`text-[9px] font-bold ${
                      isDark
                        ? 'text-zinc-400 bg-zinc-900/90 border-zinc-700/50'
                        : 'text-slate-600 bg-slate-100 border-slate-300'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    🏖️ Nghỉ
                  </span>
                ) : isAchieved ? (
                  <span
                    className={`text-[9px] font-bold ${
                      isDark
                        ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
                        : 'text-emerald-700 bg-emerald-100 border-emerald-300'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    🌟 Đạt
                  </span>
                ) : isApproaching ? (
                  <span
                    className={`text-[9px] font-bold ${
                      isDark
                        ? 'text-amber-400 bg-amber-950/80 border-amber-500/40'
                        : 'text-amber-800 bg-amber-100 border-amber-300'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    ⚡ Gần đạt
                  </span>
                ) : (
                  <span
                    className={`text-[9px] font-bold ${
                      isDark
                        ? 'text-rose-400 bg-rose-950/80 border-rose-500/40'
                        : 'text-rose-700 bg-rose-100 border-rose-300'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    ⚠️ Chậm
                  </span>
                );

                const shiftBadge = isOff ? (
                  <span
                    className={`text-[8px] ${
                      isDark
                        ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    🏖️ Nghỉ ca
                  </span>
                ) : s.shiftLabel ? (
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded border ${
                      s.shiftLabel.includes('Sáng')
                        ? isDark
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        : s.shiftLabel.includes('Chiều')
                          ? isDark
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                          : isDark
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {s.shiftLabel}
                  </span>
                ) : (
                  <span
                    className={`text-[8px] ${
                      isDark
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    } px-1.5 py-0.5 rounded border`}
                  >
                    {idx < 2 ? '☀️ Sáng' : '🌙 Chiều'}
                  </span>
                );

                return (
                  <div
                    key={s.legacyStaffId}
                    className={`grid grid-cols-12 items-center text-[10px] py-0.5 px-1 rounded-lg transition-colors ${
                      isOff
                        ? isDark
                          ? 'opacity-60 hover:opacity-100 hover:bg-zinc-800/30'
                          : 'opacity-60 hover:opacity-100 hover:bg-slate-200/50'
                        : isDark
                          ? 'hover:bg-zinc-800/40'
                          : 'hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`col-span-3 font-bold ${isDark ? 'text-zinc-100' : 'text-slate-800'} flex items-center gap-1 truncate`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOff
                            ? 'bg-zinc-500'
                            : isAchieved
                              ? 'bg-emerald-400'
                              : isApproaching
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                        }`}
                      />
                      {s.name}
                    </span>

                    <span className="col-span-2 text-center">{shiftBadge}</span>

                    <div className="col-span-3 px-1">
                      {isOff ? (
                        <div
                          className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-slate-400'} font-mono italic text-center`}
                        >
                          Nghỉ ca
                        </div>
                      ) : (
                        <>
                          <div
                            className={`flex justify-between text-[8px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} mb-0.5`}
                          >
                            <span className={`${isDark ? 'text-blue-300' : 'text-blue-600'} font-bold tabular-nums`}>
                              {s.callActual}/{s.callTarget}
                            </span>
                            <span
                              className={`font-bold tabular-nums ${
                                s.callPercent >= 80
                                  ? isDark
                                    ? 'text-emerald-400'
                                    : 'text-emerald-600'
                                  : s.callPercent >= 60
                                    ? isDark
                                      ? 'text-amber-400'
                                      : 'text-amber-600'
                                    : isDark
                                      ? 'text-rose-400'
                                      : 'text-rose-600'
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
                        </>
                      )}
                    </div>

                    <div className="col-span-2 text-center">
                      {isOff ? (
                        <span className={`${isDark ? 'text-zinc-600' : 'text-slate-300'} text-[10px] font-mono`}>
                          -
                        </span>
                      ) : (
                        <>
                          <span
                            className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'} tabular-nums`}
                          >
                            {s.pickupActual}
                          </span>
                          <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-[9px]`}>
                            /{s.pickupTarget}
                          </span>
                        </>
                      )}
                    </div>

                    <span className="col-span-2 text-right">{statusBadge}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 4. Card Footer */}
      <div
        className={`pt-1.5 border-t ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
        } flex items-center justify-between text-[9px] font-mono`}
      >
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OmiCall PBX Realtime
        </span>
        <span>Ca sáng: 08:30 - 12:30 · Ca chiều: 13:30 - 17:30</span>
      </div>
    </section>
  );
};
