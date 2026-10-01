'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { TelesaleStaffTarget } from '@mos-lab/shared';
import { Calendar, CheckCircle2, Crown, Users } from 'lucide-react';

interface TelesaleTvStaffContributionGridProps {
  staffTargets: TelesaleStaffTarget[];
  totalTeamBookToday: number;
}

export const TelesaleTvStaffContributionGrid: React.FC<TelesaleTvStaffContributionGridProps> = ({
  staffTargets,
  totalTeamBookToday,
}) => {
  const { token } = theme.useToken();

  if (!staffTargets || staffTargets.length === 0) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return 'TS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Check if <= 4 staff to use 1 static row, otherwise use responsive wrapping or horizontal scroll
  const isSmallTeam = staffTargets.length <= 4;

  return (
    <section className="relative z-10 my-4 flex flex-col gap-3">
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
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            Book hôm nay
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Done hôm nay
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Top Book
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className={
          isSmallTeam
            ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
            : 'flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50'
        }
      >
        {staffTargets.map((staff) => {
          const bookToday = staff.bookToday ?? 0;
          const doneToday = staff.doneToday ?? 0;
          const contributionPercent =
            totalTeamBookToday > 0 ? Math.round((bookToday / totalTeamBookToday) * 100) : 0;
          const isTop = staff.isTopBookToday && bookToday > 0;

          return (
            <div
              key={staff.legacyStaffId}
              data-testid={`tv-staff-card-${staff.legacyStaffId}`}
              className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xl border transition-all duration-300 ${
                isSmallTeam ? 'w-full' : 'min-w-[260px] sm:min-w-[280px] flex-1'
              } ${
                isTop
                  ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-400/90 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800/90 hover:border-zinc-700 shadow-lg'
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
              <div className="flex items-center gap-3 mb-3">
                <div className="relative shrink-0">
                  {staff.avatarUrl ? (
                    <img
                      src={staff.avatarUrl}
                      alt={staff.name}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 shadow-md ${
                        isTop ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-zinc-700'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-2 shadow-md ${
                        isTop
                          ? 'bg-gradient-to-br from-amber-400 to-amber-700 text-zinc-950 border-amber-300'
                          : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      }`}
                    >
                      {getInitials(staff.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight truncate m-0">
                    {staff.name}
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400 block truncate">
                    Telesales Executive
                  </span>
                </div>
              </div>

              {/* Today Metrics: 2 Big Numbers Side-by-side */}
              <div className="grid grid-cols-2 gap-2 my-2 bg-black/40 rounded-xl p-2.5 border border-zinc-800/80">
                {/* Book Today */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-blue-300 uppercase font-mono font-semibold">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span>Book hôm nay</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-blue-300 tabular-nums">
                    {bookToday}
                  </div>
                </div>

                {/* Done Today */}
                <div className="text-center border-l border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-emerald-300 uppercase font-mono font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Done hôm nay</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 tabular-nums">
                    {doneToday}
                  </div>
                </div>
              </div>

              {/* % Contribution Progress */}
              <div className="mt-2 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between text-xs font-mono mb-1 font-semibold">
                  <span className="text-zinc-400">Đóng góp Book:</span>
                  <span className={isTop ? 'text-amber-400 font-bold' : 'text-zinc-200'}>
                    {contributionPercent}% Team
                  </span>
                </div>
                <Progress
                  percent={Math.min(100, contributionPercent)}
                  strokeColor={isTop ? token.colorWarning : token.colorPrimary}
                  size={['100%', 8]}
                  showInfo={false}
                  className="rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
