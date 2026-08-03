'use client';

import React from 'react';
import { formatVND } from '../../../../lib/format-utils';

export interface DoneSummaryProps {
  summary: {
    totalPlanned?: number;
    totalCheckin?: number;
    checkInRate?: number;
    baseSalary?: number;
    clientBonus?: number;
    doneBonus?: number;
    doneLevelCount?: number;
    missedBonus?: number;
    missedRatePct?: number;
    missedLevelRate?: number;
    tipBonus?: number;
    totalTips?: number;
    completedRevenue?: number;
    totalNetRev?: number;
    revBonus?: number;
    revLevelMin?: number;
    revLevelRate?: number;
    totalSalary?: number;
  } | null;
}

export default function DoneSummaryStrip({ summary }: DoneSummaryProps) {
  if (!summary) return null;

  const revBonus = summary.revBonus ?? 0;
  const revLevelMin = summary.revLevelMin ?? 0;
  const revLevelRate = summary.revLevelRate ?? 0;
  const totalNetRev = summary.totalNetRev ?? summary.completedRevenue ?? 0;
  const missedBonus = summary.missedBonus ?? 0;
  const doneBonus = summary.doneBonus ?? 0;
  const tipBonus = summary.tipBonus ?? 0;

  return (
    <div
      className="my-2.5 w-full text-xs overflow-x-auto"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '6px' }}
    >
      {/* 1. Lịch Hẹn / Check-in */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Check-in
        </span>
        <div className="mt-1 text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums truncate leading-tight">
          {summary.totalPlanned ?? 0}/{summary.totalCheckin ?? 0}{' '}
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold">
            ({summary.checkInRate ?? 0}%)
          </span>
        </div>
      </div>

      {/* 2. Lương Cứng */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Lương Cứng
        </span>
        <div className="mt-1 text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums truncate leading-tight">
          {formatVND(summary.baseSalary ?? 0)}
        </div>
      </div>

      {/* 3. Hoa Hồng Đặt Lịch */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Hoa Hồng Đặt Lịch
        </span>
        <div className="mt-1 text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate leading-tight">
          {formatVND(summary.clientBonus ?? 0)}
        </div>
      </div>

      {/* 4. Thưởng Mốc Done */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Thưởng Mốc Done
        </span>
        <div
          className={`mt-1 text-base sm:text-lg font-black tabular-nums truncate leading-tight ${
            doneBonus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {formatVND(doneBonus)}
        </div>
      </div>

      {/* 5. Thưởng / Phạt Lỗi */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Thưởng/Phạt Lỗi
        </span>
        <div
          className={`mt-1 text-base sm:text-lg font-black tabular-nums truncate leading-tight ${
            missedBonus < 0
              ? 'text-red-500 dark:text-red-400'
              : missedBonus > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {missedBonus > 0 ? '+' : ''}
          {formatVND(missedBonus)}
        </div>
      </div>

      {/* 6. Thưởng Tips */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Thưởng Tips (7%)
        </span>
        <div
          className={`mt-1 text-base sm:text-lg font-black tabular-nums truncate leading-tight ${
            tipBonus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {formatVND(tipBonus)}
        </div>
      </div>

      {/* 7. Thưởng Doanh Thu Net */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 min-w-0">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          Thưởng DS Net
        </span>
        <div
          className={`mt-1 text-base sm:text-lg font-black tabular-nums truncate leading-tight ${
            revBonus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {formatVND(revBonus)}
        </div>
      </div>

      {/* 8. Tổng Thu Nhập (Live) Featured Card */}
      <div className="flex flex-col justify-between p-2 rounded-lg bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 dark:border-amber-600/40 min-w-0">
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
          Tổng Thu Nhập
        </span>
        <div className="mt-1 text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums truncate leading-tight">
          {formatVND(summary.totalSalary ?? 0)}
        </div>
      </div>
    </div>
  );
}
