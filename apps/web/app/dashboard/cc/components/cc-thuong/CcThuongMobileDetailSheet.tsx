'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { DailySalesBonusConsultantRecord, DailySalesBonusLeaderboardEntry } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatusTag } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';

interface CcThuongMobileDetailSheetProps {
  open: boolean;
  onClose: () => void;
  consultant: DailySalesBonusLeaderboardEntry | null;
  dailyRecords: DailySalesBonusConsultantRecord[];
  onSelectDay: (record: DailySalesBonusConsultantRecord) => void;
}

const formatCount = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

export const CcThuongMobileDetailSheet: React.FC<CcThuongMobileDetailSheetProps> = ({
  open,
  onClose,
  consultant,
  dailyRecords,
  onSelectDay,
}) => {
  const comboRate = consultant?.greenComboConversionRate || 0;

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82dvh"
      zIndex={990}
      title={
        consultant ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <CcAvatar name={consultant.displayName} src={consultant.avatar} size={32} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {consultant.displayName}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {formatStoreCode(consultant.store)} · {formatCount(consultant.totalVisits)} lượt ·{' '}
                {formatCount(consultant.greenVisits)} Vòng Xanh
              </div>
            </div>
          </div>
        ) : (
          'Chi tiết thưởng CC'
        )
      }
    >
      {consultant && (
        <div data-testid="cc-mobile-detail-sheet" className="space-y-3 pb-4">
          {/* Top 3-metric Apple Wallet summary bar */}
          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08] rounded-2xl px-3 py-2.5 bg-slate-100/85 border border-slate-200/75 dark:bg-white/[0.05] dark:border-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">% Bán Combo</div>
              <div
                className={`text-base font-bold tabular-nums ${
                  comboRate >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {comboRate}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {formatCount(consultant.comboSalesCount)}/{formatCount(consultant.greenVisits)} VX
              </div>
            </div>

            <div className="px-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Doanh số</div>
              <div className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                {formatCompactVND(consultant.totalSales || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {consultant.comboSalesCount} combo
              </div>
            </div>

            <div className="pl-2.5 min-w-0">
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng</div>
              <div className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                +{formatCompactVND(consultant.totalBonus || 0)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Daily Bonus</div>
            </div>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
            Chi tiết theo ngày · {dailyRecords.length} ngày
          </div>

          {dailyRecords.length === 0 ? (
            <div className="rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
              Không có bản ghi thưởng theo ngày trong kỳ này.
            </div>
          ) : (
            <div className="space-y-1.5">
              {dailyRecords.map((record) => {
                const greenVisits = record.green_visits || 0;
                const comboCount = record.combo_count || 0;
                const dailyRate = greenVisits > 0 ? Math.min(100, Math.round((comboCount / greenVisits) * 100)) : null;

                return (
                  <button
                    key={`${record.date}-${record.user_id}`}
                    type="button"
                    onClick={() => onSelectDay(record)}
                    className="w-full min-h-[56px] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 text-left bg-white border border-slate-200/80 dark:bg-white/[0.04] dark:border-white/[0.08] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {record.date}
                        </span>
                        <StatusTag
                          status={
                            record.commission_rate_percent >= 2
                              ? 'success'
                              : record.commission_rate_percent >= 1
                                ? 'gold'
                                : 'processing'
                          }
                          label={`${record.commission_rate_percent.toFixed(1)}%`}
                          className="tabular-nums text-[10px] font-bold py-0 px-1.5"
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                        {comboCount} combo
                        {dailyRate !== null ? ` · ${dailyRate}% VX` : ''}
                        {record.product_count ? ` · ${record.product_count} SP` : ''}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatCompactVND(record.daily_bonus || 0)}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                        DS {formatCompactVND(record.total_sales || 0)}
                      </div>
                    </div>

                    <AppIcon icon={ChevronRight} size={15} className="text-slate-400 shrink-0" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdaptiveDrawer>
  );
};
