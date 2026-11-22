'use client';

import type { ComponentProps } from 'react';
import { Card, Tooltip } from 'antd';
import { DollarSign, Package, Trophy, User, UserCheck } from 'lucide-react';
import { StatusTag } from '~/components/ui';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND } from '~/lib/format-utils';
import { formatBkDoneCurrency, type BkDoneForecast, type BkDoneSummary } from './bkDoneUtils';

export interface BkDoneSummaryCardsProps {
  summary: BkDoneSummary;
  previousSummary: BkDoneSummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecast: BkDoneForecast;
}

interface BkDoneForecastFooterProps {
  forecast: BkDoneForecast;
  projectedValue: number;
  unit?: string;
}

function BkDoneForecastFooter({ forecast, projectedValue, unit = '' }: BkDoneForecastFooterProps) {
  const { isDayMode, isPastPeriod, elapsedRatioPercent, periodNoun } = forecast;
  if (isDayMode || !projectedValue) return null;

  const formattedVal =
    unit === 'đ' ? formatBkDoneCurrency(projectedValue) : `${projectedValue.toLocaleString('vi-VN')} ${unit}`.trim();

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">{formattedVal}</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
    >
      <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
        <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
          🔮
        </span>
        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          ~{formattedVal}
        </span>
      </div>
    </Tooltip>
  );
}

/** Renders the 5 BK Done KPI summary cards with period comparisons and run-rate forecasts. */
export function BkDoneSummaryCards({ summary, previousSummary, comparison, forecast }: BkDoneSummaryCardsProps) {
  const singleDoneCount = summary.totalSingleDone ?? summary.totalDone;
  const singleShare = summary.totalDone > 0 ? `${((singleDoneCount / summary.totalDone) * 100).toFixed(1)}%` : '0%';
  const comboLiveShare =
    summary.totalDone > 0 ? `${(((summary.totalComboLiveDone || 0) / summary.totalDone) * 100).toFixed(1)}%` : '0%';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: Khách Lẻ Done (KPI Chính) */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Tooltip title="Đơn khách lẻ hoàn tất check-in trong kỳ. Đây là chỉ số cốt lõi dùng để xếp hạng Rank và tính thưởng bậc thang Milestone Bonus theo Điều răn BK-005.">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between gap-2 mb-1 cursor-help">
            <span>Khách Lẻ Done</span>
            <StatusTag status="cyan" label="KPI Chính" className="text-[10px] py-0.5 px-1.5 font-bold" />
          </div>
        </Tooltip>
        <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-500">
          <User className="w-5 h-5 shrink-0" />
          <span>{singleDoneCount.toLocaleString('vi-VN')}</span>
        </div>
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
          <span>Tỷ trọng / Tổng Done:</span>
          <span className="tabular-nums font-semibold text-emerald-400">{singleShare}</span>
        </div>
        <PeriodComparison
          comparison={comparison}
          currentValue={singleDoneCount}
          previousValue={previousSummary?.totalSingleDone ?? previousSummary?.totalDone ?? 0}
          formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
        />
        <BkDoneForecastFooter forecast={forecast} projectedValue={forecast.projectedSingleDone} unit="lượt" />
      </Card>

      {/* Card 2: Done Khách Mới */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Tooltip title="Số khách mới lần đầu hoàn tất dịch vụ trên toàn hệ thống Wings (hoàn tất Check-in & Check-out, tính theo tháng Check-out).">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between gap-2 mb-1 cursor-help">
            <span>Done Khách Mới</span>
            <span className="inline-flex items-center rounded border border-pink-500/30 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-pink-600 dark:text-pink-300">
              Khách Mới
            </span>
          </div>
        </Tooltip>
        <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-rose-500">
          <UserCheck className="w-5 h-5 shrink-0" />
          <span>{(summary.totalNewCustomerDone ?? 0).toLocaleString('vi-VN')}</span>
        </div>
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
          <span>Tỷ lệ / Tổng Done:</span>
          <span className="tabular-nums font-semibold text-rose-400">{summary.avgNewCustomerRate ?? 0}%</span>
        </div>
        <PeriodComparison
          comparison={comparison}
          currentValue={summary.totalNewCustomerDone ?? 0}
          previousValue={previousSummary?.totalNewCustomerDone ?? 0}
          formatter={(value) => `${value.toLocaleString('vi-VN')} khách`}
        />
      </Card>

      {/* Card 3: Combo Live Done */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Tooltip title="Lượt khách có gói Combo đang hoạt động đến làm dịch vụ trong kỳ. Booker nhận 1.000đ/lượt chăm sóc; không tính vào bậc thang Milestone Bonus theo Điều răn BK-005.">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between gap-2 mb-1 cursor-help">
            <span>Combo Live Done</span>
            <StatusTag status="purple" label="+1.000đ/lượt" className="text-[10px] py-0.5 px-1.5 font-semibold" />
          </div>
        </Tooltip>
        <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-cyan-500">
          <Package className="w-5 h-5 shrink-0" />
          <span>{(summary.totalComboLiveDone ?? 0).toLocaleString('vi-VN')}</span>
        </div>
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
          <span>Tỷ trọng / Tổng Done:</span>
          <span className="tabular-nums font-semibold text-cyan-400">{comboLiveShare}</span>
        </div>
        <PeriodComparison
          comparison={comparison}
          currentValue={summary.totalComboLiveDone ?? 0}
          previousValue={previousSummary?.totalComboLiveDone ?? 0}
          formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
        />
        <BkDoneForecastFooter forecast={forecast} projectedValue={forecast.projectedComboLiveDone} unit="lượt" />
      </Card>

      {/* Card 4: Combo Bán Mới & Chuyển đổi */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Tooltip title="Số lượng gói Combo bán mới trong kỳ và tỷ lệ chuyển đổi từ Khách Lẻ sang mua Combo (Single ➔ Combo).">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between gap-2 mb-1 cursor-help">
            <span>Combo Bán Mới</span>
            <span className="inline-flex items-center rounded border border-pink-500/30 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-pink-600 dark:text-pink-300">
              Single ➔ Combo
            </span>
          </div>
        </Tooltip>
        <div className="flex items-baseline gap-2 text-2xl font-bold tabular-nums text-purple-500">
          <Trophy className="w-5 h-5 shrink-0 self-center" />
          <span>{(summary.totalComboSold ?? 0).toLocaleString('vi-VN')}</span>
          <span className="text-base font-semibold">gói</span>
        </div>
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5">
          <span>Tỷ lệ chuyển đổi:</span>
          <span className="tabular-nums font-semibold text-purple-400">{summary.singleToComboRate ?? 0}%</span>
        </div>
        {(summary.comboRevenue || 0) > 0 && (
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
            <span>Doanh thu:</span>
            <Tooltip
              title={`Doanh thu bán Combo trong kỳ: ${formatBkDoneCurrency(summary.comboRevenue || 0)}${previousSummary?.comboRevenue !== undefined ? ` (Kỳ trước: ${formatBkDoneCurrency(previousSummary.comboRevenue || 0)})` : ''}`}
            >
              <span className="tabular-nums font-medium text-purple-600 dark:text-purple-300 cursor-help">
                {formatCompactVND(summary.comboRevenue || 0)}
                {previousSummary?.comboRevenue !== undefined && (
                  <span className="text-slate-500 font-normal ml-1">
                    (Kỳ tr: {formatCompactVND(previousSummary.comboRevenue || 0)})
                  </span>
                )}
              </span>
            </Tooltip>
          </div>
        )}
        <PeriodComparison
          comparison={comparison}
          currentValue={summary.totalComboSold ?? 0}
          previousValue={previousSummary?.totalComboSold ?? 0}
          formatter={(value) => `${value.toLocaleString('vi-VN')} gói`}
        />
      </Card>

      {/* Card 5: ∑ Thưởng Done & Check-in */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
        <Tooltip title="Tổng tiền thưởng Done bao gồm thưởng check-in cơ bản, thưởng bậc thang Milestone Rank và thưởng/phạt Missed.">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1 cursor-help">
            ∑ Thưởng Done &amp; Check-in
          </div>
        </Tooltip>
        <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          <DollarSign className="w-5 h-5 shrink-0" />
          <span>{formatBkDoneCurrency(summary.totalDoneBonus)}</span>
        </div>
        <PeriodComparison
          comparison={comparison}
          currentValue={summary.totalDoneBonus}
          previousValue={previousSummary?.totalDoneBonus || 0}
          formatter={formatBkDoneCurrency}
        />
        <BkDoneForecastFooter forecast={forecast} projectedValue={forecast.projectedDoneBonus} unit="đ" />
      </Card>
    </div>
  );
}
