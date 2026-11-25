'use client';

import React from 'react';
import type { DailySalesBonusLeaderboardEntry } from '@mos-lab/shared';
import { formatCompactVND } from '~/lib/format-utils';

interface CcThuongMobileSummaryStripProps {
  leaderboardData: DailySalesBonusLeaderboardEntry[];
  totalSales: number;
  totalCcBonus: number;
  projectedTotalSales: number;
  projectedCcBonus: number;
  isPastPeriod: boolean;
  isDayMode: boolean;
}

const formatCount = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

export const CcThuongMobileSummaryStrip: React.FC<CcThuongMobileSummaryStripProps> = ({
  leaderboardData,
  totalSales,
  totalCcBonus,
  projectedTotalSales,
  projectedCcBonus,
  isPastPeriod,
  isDayMode,
}) => {
  const totalCombos = leaderboardData.reduce((sum, item) => sum + (item.comboSalesCount || 0), 0);
  const totalGreenVisits = leaderboardData.reduce((sum, item) => sum + (item.greenVisits || 0), 0);
  const teamComboRate = totalGreenVisits > 0 ? Math.min(100, Math.round((totalCombos / totalGreenVisits) * 100)) : 0;

  return (
    <section
      data-testid="cc-mobile-summary-strip"
      aria-label="Tóm tắt toàn đội CC"
      className="rounded-2xl px-3 py-2.5 bg-white/95 border border-slate-200/80 shadow-xs dark:bg-white/[0.045] dark:border-white/[0.08]"
    >
      <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08]">
        <div className="pr-2 min-w-0">
          <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate">% Combo đội</div>
          <div
            className={`mt-0.5 text-[16px] font-bold leading-tight tabular-nums ${
              teamComboRate >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {teamComboRate}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {formatCount(totalCombos)}/{formatCount(totalGreenVisits)} VX
          </div>
        </div>

        <div className="px-2.5 min-w-0">
          <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate">∑ Doanh số</div>
          <div className="mt-0.5 text-[16px] font-bold leading-tight tabular-nums text-amber-600 dark:text-amber-400 truncate">
            {formatCompactVND(totalSales || 0)}
          </div>
          {!isPastPeriod && !isDayMode ? (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
              ~{formatCompactVND(projectedTotalSales || 0)}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Tổng kỳ</div>
          )}
        </div>

        <div className="pl-2.5 min-w-0">
          <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate">∑ Thưởng</div>
          <div className="mt-0.5 text-[16px] font-bold leading-tight tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
            {formatCompactVND(totalCcBonus || 0)}
          </div>
          {!isPastPeriod && !isDayMode ? (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
              ~{formatCompactVND(projectedCcBonus || 0)}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Daily Bonus</div>
          )}
        </div>
      </div>
    </section>
  );
};
