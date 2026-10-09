'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { TelesaleStaffTarget } from '@mos-lab/shared';
import { Calendar, CheckCircle2, Crown, Users } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { calculateShiftPacing, calculatePacingTier, ShiftPacingResult } from '../utils/tv-monitor-pacing';

interface TelesaleTvStaffContributionGridProps {
  staffTargets: TelesaleStaffTarget[];
  totalTeamBookToday: number;
  dailyBookTarget?: number;
  pacing?: ShiftPacingResult;
}

const StaffAvatarItem: React.FC<{
  name: string;
  avatarUrl?: string | null;
  isTop?: boolean;
  colorClass: string;
  isDark?: boolean;
}> = ({ name, avatarUrl, isTop, colorClass, isDark = true }) => {
  const [hasError, setHasError] = React.useState(false);
  const parts = name.trim().split(/\s+/);
  const lastWord = parts[parts.length - 1] || '';
  const displayInitial = lastWord.length <= 2 ? lastWord : lastWord.charAt(0).toUpperCase();

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setHasError(true)}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 shadow-md ${
          isTop
            ? isDark
              ? 'border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-zinc-950'
              : 'border-amber-500 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-white'
            : isDark
              ? 'border-zinc-700'
              : 'border-slate-300'
        }`}
      />
    );
  }

  return (
    <div
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm sm:text-base border-2 shadow-md ${
        isTop
          ? isDark
            ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-zinc-950 border-amber-300 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-zinc-950'
            : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-300 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-white'
          : `${colorClass} text-white`
      }`}
    >
      {displayInitial}
    </div>
  );
};

export const TelesaleTvStaffContributionGrid: React.FC<TelesaleTvStaffContributionGridProps> = ({
  staffTargets,
  totalTeamBookToday,
  dailyBookTarget,
  pacing,
}) => {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const currentPacing = React.useMemo(() => pacing || calculateShiftPacing(new Date()), [pacing]);
  const teamDailyBookTarget = dailyBookTarget || 25;
  const staffDailyBookTarget =
    staffTargets.length > 0 ? Math.max(1, Math.round(teamDailyBookTarget / staffTargets.length)) : 5;

  const sortedStaffTargets = React.useMemo(() => {
    if (!staffTargets || staffTargets.length === 0) return [];
    return [...staffTargets].sort((a, b) => {
      // 1. Tiêu chí 1: Book hôm nay
      const bookDiff = (b.bookToday ?? 0) - (a.bookToday ?? 0);
      if (bookDiff !== 0) return bookDiff;

      // 2. Tiêu chí 2 (Tie-breaker): Check-in hôm nay (tiền đề Done dịch vụ)
      const aCheckin = a.checkinToday ?? a.doneToday ?? 0;
      const bCheckin = b.checkinToday ?? b.doneToday ?? 0;
      const checkinDiff = bCheckin - aCheckin;
      if (checkinDiff !== 0) return checkinDiff;

      // 3. Tiêu chí 3: Combo Live Check-in hôm nay
      const aCombo = a.comboLiveCheckinToday ?? a.comboLiveDoneToday ?? 0;
      const bCombo = b.comboLiveCheckinToday ?? b.comboLiveDoneToday ?? 0;
      const comboDiff = bCombo - aCombo;
      if (comboDiff !== 0) return comboDiff;

      // 4. Tiêu chí 4: Backend isTopBookToday
      if (b.isTopBookToday && !a.isTopBookToday) return 1;
      if (a.isTopBookToday && !b.isTopBookToday) return -1;

      return 0;
    });
  }, [staffTargets]);

  const topStaff = sortedStaffTargets[0] || null;

  if (!staffTargets || staffTargets.length === 0) {
    return null;
  }

  const AVATAR_BG_COLORS = [
    'bg-blue-600 border-blue-400/60',
    'bg-amber-600 border-amber-400/60',
    'bg-teal-600 border-teal-400/60',
    'bg-sky-600 border-sky-400/60',
    'bg-zinc-700 border-zinc-500/60',
  ];

  return (
    <section className="relative z-10 pt-3.5 sm:pt-4.5 pb-0.5 flex flex-col gap-2 shrink-0">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2
              className={`text-sm sm:text-base font-black uppercase tracking-wider m-0 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
            >
              ĐÓNG GÓP CÁ NHÂN HÔM NAY · TELESALES EXECUTIVES
            </h2>
            <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {staffTargets.length} Nhân sự hoạt động · Tự động đồng bộ realtime
            </span>
          </div>
        </div>

        <div
          className={`hidden sm:flex items-center gap-3 text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
        >
          <span className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
            <Crown className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            Top Book
          </span>
        </div>
      </div>

      {/* Cards Container (Option 1: 5-column layout on Fullscreen TV) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 my-auto">
        {sortedStaffTargets.map((staff, idx) => {
          const bookToday = staff.bookToday ?? 0;
          const checkinToday = staff.checkinToday ?? staff.doneToday ?? 0;
          const comboLiveCheckinToday = staff.comboLiveCheckinToday ?? staff.comboLiveDoneToday ?? 0;
          const contributionPercent = totalTeamBookToday > 0 ? Math.round((bookToday / totalTeamBookToday) * 100) : 0;
          const isTop =
            topStaff &&
            bookToday > 0 &&
            bookToday === (topStaff.bookToday ?? 0) &&
            checkinToday === (topStaff.checkinToday ?? topStaff.doneToday ?? 0);
          const colorClass = AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length];

          // Pacing & Tier calculation for daily booking target
          const expectedBookToday = Math.round(staffDailyBookTarget * currentPacing.rTime);
          const gapBook = bookToday - expectedBookToday;
          const staffBookTier = calculatePacingTier(
            bookToday,
            expectedBookToday,
            staffDailyBookTarget,
            currentPacing.rTime
          );

          let bookBadgeText: string;
          if (bookToday >= staffDailyBookTarget) {
            bookBadgeText =
              bookToday > staffDailyBookTarget ? `+${bookToday - staffDailyBookTarget} VƯỢT` : 'ĐẠT TARGET';
          } else if (gapBook >= 0) {
            bookBadgeText = 'ĐÚNG NHỊP';
          } else if (gapBook === -1) {
            bookBadgeText = '-1 BÁM NHỊP';
          } else {
            bookBadgeText = `${gapBook} CHẬM`;
          }

          const bookTierStyles = {
            emerald: {
              box: isDark
                ? 'bg-emerald-950/35 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-emerald-50/90 border-emerald-300 shadow-sm',
              label: isDark ? 'text-emerald-400' : 'text-emerald-700',
              number: isDark ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'text-emerald-700',
              badge: isDark
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300',
            },
            amber: {
              box: isDark
                ? 'bg-amber-950/35 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'bg-amber-50/90 border-amber-300 shadow-sm',
              label: isDark ? 'text-amber-400' : 'text-amber-700',
              number: isDark ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]' : 'text-amber-700',
              badge: isDark
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-amber-100 text-amber-800 border-amber-300',
            },
            rose: {
              box: isDark
                ? 'bg-rose-950/35 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                : 'bg-rose-50/90 border-rose-300 shadow-sm',
              label: isDark ? 'text-rose-400' : 'text-rose-700',
              number: isDark ? 'text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]' : 'text-rose-700',
              badge: isDark
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-rose-100 text-rose-800 border-rose-300',
            },
          }[staffBookTier];

          return (
            <div
              key={staff.legacyStaffId}
              data-testid={`tv-staff-card-${staff.legacyStaffId}`}
              className={`relative rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between backdrop-blur-xl border transition-all duration-300 min-h-[160px] sm:min-h-[168px] ${
                isTop
                  ? isDark
                    ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-400/90 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                    : 'bg-gradient-to-b from-amber-50/80 via-white to-white border-amber-400/90 shadow-[0_4px_24px_rgba(245,158,11,0.15)]'
                  : isDark
                    ? 'bg-zinc-900/85 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700 shadow-lg'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-md'
              }`}
            >
              {/* Crown badge for Top Book */}
              {isTop && (
                <div
                  className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold shadow-sm ${
                    isDark
                      ? 'bg-amber-500/20 border-amber-400/80 text-amber-300'
                      : 'bg-amber-100 border-amber-300 text-amber-800'
                  }`}
                >
                  <Crown className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>TOP BOOK</span>
                </div>
              )}

              {/* Staff Avatar + Name */}
              <div className="flex items-center gap-3 mb-2">
                <div className="relative shrink-0">
                  <StaffAvatarItem
                    name={staff.name}
                    avatarUrl={staff.avatarUrl}
                    isTop={isTop}
                    colorClass={colorClass}
                    isDark={isDark}
                  />
                </div>

                <div className="min-w-0 flex-1 pr-12">
                  <h3
                    className={`text-sm sm:text-base font-black tracking-tight truncate m-0 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}
                  >
                    {staff.name}
                  </h3>
                  <span
                    className={`text-[11px] font-mono block truncate mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                  >
                    Telesales Executive
                  </span>
                </div>
              </div>

              {/* Today Metrics: 2 Big Numbers Side-by-side (KPI Chính: Book & Check-in) */}
              <div className="grid grid-cols-2 gap-1.5 mt-auto">
                {/* Book Today with Daily Target Pacing Tier (Xanh, Vàng, Đỏ) */}
                <div className={`text-center rounded-xl p-2 border transition-all ${bookTierStyles.box}`}>
                  <div
                    className={`flex items-center justify-center gap-1 text-[10px] uppercase font-mono font-bold tracking-wider ${bookTierStyles.label}`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>BOOK</span>
                    <span className="text-[9px] opacity-75 font-normal">/{staffDailyBookTarget}</span>
                  </div>
                  <div
                    className={`text-xl sm:text-2xl xl:text-3xl font-black font-mono tabular-nums mt-0.5 leading-none ${bookTierStyles.number}`}
                  >
                    {bookToday}
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border leading-none ${bookTierStyles.badge}`}
                    >
                      {bookBadgeText}
                    </span>
                  </div>
                </div>

                {/* Single Check-in Today (Khách Lẻ - KPI Chính) */}
                <div
                  className={`text-center rounded-xl p-2 border transition-all ${
                    checkinToday > 0
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                      : isDark
                        ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                        : 'bg-slate-50/80 border-slate-200 text-slate-400'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center gap-1 text-[10px] uppercase font-mono font-bold tracking-wider ${
                      checkinToday > 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-zinc-500'
                          : 'text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CHECK-IN</span>
                  </div>
                  <div
                    className={`text-xl sm:text-2xl xl:text-3xl font-black font-mono tabular-nums mt-0.5 leading-none ${
                      checkinToday > 0
                        ? isDark
                          ? 'text-emerald-300'
                          : 'text-emerald-700'
                        : isDark
                          ? 'text-zinc-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {checkinToday}
                  </div>
                  <div className="mt-1 flex items-center justify-center">
                    <span
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border leading-none ${
                        checkinToday > 0
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isDark
                            ? 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {checkinToday > 0 ? `${checkinToday} LƯỢT` : 'CHƯA CÓ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Combo */}
              <div
                className={`mt-1.5 pt-1 border-t flex items-center justify-between text-[10px] font-mono px-0.5 ${
                  isDark ? 'border-zinc-800/80' : 'border-slate-200'
                }`}
              >
                <span className={`flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                  <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>Combo:</span>
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    comboLiveCheckinToday > 0
                      ? isDark
                        ? 'text-purple-300'
                        : 'text-purple-700'
                      : isDark
                        ? 'text-zinc-500'
                        : 'text-slate-400'
                  }`}
                >
                  {comboLiveCheckinToday > 0 ? `+${comboLiveCheckinToday}` : '0'} Check-in
                </span>
              </div>

              {/* Accessible hidden text for test assertions */}
              <span className="sr-only">{contributionPercent}% Team</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
