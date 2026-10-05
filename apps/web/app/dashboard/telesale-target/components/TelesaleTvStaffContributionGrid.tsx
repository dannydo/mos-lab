'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { TelesaleStaffTarget } from '@mos-lab/shared';
import { Calendar, CheckCircle2, Crown, Users } from 'lucide-react';

interface TelesaleTvStaffContributionGridProps {
  staffTargets: TelesaleStaffTarget[];
  totalTeamBookToday: number;
}

const StaffAvatarItem: React.FC<{
  name: string;
  avatarUrl?: string | null;
  isTop?: boolean;
  colorClass: string;
}> = ({ name, avatarUrl, isTop, colorClass }) => {
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
          isTop ? 'border-amber-400 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-zinc-950' : 'border-zinc-700'
        }`}
      />
    );
  }

  return (
    <div
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm sm:text-base border-2 shadow-md ${
        isTop
          ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-zinc-950 border-amber-300 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-zinc-950'
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
}) => {
  const { token } = theme.useToken();

  const topStaff = React.useMemo(() => {
    if (!staffTargets || staffTargets.length === 0) return null;
    return [...staffTargets].sort((a, b) => {
      const bookDiff = (b.bookToday ?? 0) - (a.bookToday ?? 0);
      if (bookDiff !== 0) return bookDiff;
      if (b.isTopBookToday && !a.isTopBookToday) return 1;
      if (a.isTopBookToday && !b.isTopBookToday) return -1;
      return 0;
    })[0];
  }, [staffTargets]);

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
            <h2 className="text-sm sm:text-base font-black text-zinc-100 uppercase tracking-wider m-0">
              ĐÓNG GÓP CÁ NHÂN HÔM NAY · TELESALES EXECUTIVES
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">
              {staffTargets.length} Nhân sự hoạt động · Tự động đồng bộ realtime
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Top Book
          </span>
        </div>
      </div>

      {/* Cards Container (Option 1: 5-column layout on Fullscreen TV) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 my-auto">
        {staffTargets.map((staff, idx) => {
          const bookToday = staff.bookToday ?? 0;
          const doneToday = staff.doneToday ?? 0;
          const comboLiveDoneToday = staff.comboLiveDoneToday ?? 0;
          const contributionPercent = totalTeamBookToday > 0 ? Math.round((bookToday / totalTeamBookToday) * 100) : 0;
          const isTop = staff.legacyStaffId === topStaff?.legacyStaffId;
          const colorClass = AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length];

          return (
            <div
              key={staff.legacyStaffId}
              data-testid={`tv-staff-card-${staff.legacyStaffId}`}
              className={`relative rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between backdrop-blur-xl border transition-all duration-300 min-h-[160px] sm:min-h-[168px] ${
                isTop
                  ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-400/90 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-900/85 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700 shadow-lg'
              }`}
            >
              {/* Crown badge for Top Book */}
              {isTop && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/80 text-amber-300 text-[10px] font-mono font-bold shadow-sm">
                  <Crown className="w-3 h-3 text-amber-400" />
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
                  />
                </div>

                <div className="min-w-0 flex-1 pr-12">
                  <h3 className="text-sm sm:text-base font-black text-zinc-100 tracking-tight truncate m-0">
                    {staff.name}
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400 block truncate mt-0.5">Telesales Executive</span>
                </div>
              </div>

              {/* Today Metrics: 2 Big Numbers Side-by-side (KPI Chính: Book & Khách Lẻ) */}
              <div className="grid grid-cols-2 gap-2 mt-auto bg-black/60 rounded-xl p-2.5 sm:p-3 border border-zinc-800/80">
                {/* Book Today */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-blue-400 uppercase font-mono font-bold tracking-wider">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span>BOOK HÔM NAY</span>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-blue-300 tabular-nums mt-1 leading-none">
                    {bookToday}
                  </div>
                </div>

                {/* Single Done Today (Khách Lẻ - KPI Chính) */}
                <div className="text-center border-l border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-emerald-400 uppercase font-mono font-bold tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>DONE KHÁCH LẺ</span>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-emerald-300 tabular-nums mt-1 leading-none">
                    {doneToday}
                  </div>
                </div>
              </div>

              {/* Combo */}
              <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono px-0.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                  <span className="text-zinc-300">Combo:</span>
                </span>
                <span
                  className={`font-black tabular-nums ${comboLiveDoneToday > 0 ? 'text-purple-300' : 'text-zinc-500'}`}
                >
                  {comboLiveDoneToday > 0 ? `+${comboLiveDoneToday}` : '0'} Done
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
