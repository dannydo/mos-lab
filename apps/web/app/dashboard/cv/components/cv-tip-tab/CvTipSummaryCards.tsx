'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { DollarSign, Gift, Percent, User } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import type { CvTipForecast, CvTipSummary } from './cvTipUtils';

interface CvTipForecastSubtextProps {
  projectedVal: number;
  unit?: string;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
}

function CvTipForecastSubtext({
  projectedVal,
  unit = '',
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
}: CvTipForecastSubtextProps) {
  if (isDayMode || !projectedVal) return null;

  const formattedVal = unit === 'đ' ? formatVND(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`;

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/20 pt-1.5 cursor-help opacity-70">
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {formattedVal}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/30 pt-1.5 cursor-help">
        <span className="shrink-0 flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="text-sm leading-none">
            🔮
          </span>
          <span>Dự kiến:</span>
        </span>
        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          ~{formattedVal}
        </span>
      </div>
    </Tooltip>
  );
}

export interface CvTipSummaryCardsProps {
  summary: CvTipSummary;
  previousSummary: CvTipSummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecast: CvTipForecast;
  isMobile: boolean;
  onOpenTipHistory: () => void;
}

export function CvTipSummaryCards({
  summary,
  previousSummary,
  comparison,
  forecast,
  isMobile,
  onOpenTipHistory,
}: CvTipSummaryCardsProps) {
  const {
    isDayMode,
    isPastPeriod,
    elapsedRatioPercent,
    periodNoun,
    projectedCvTipBonus,
    projectedCustomerTip,
    projectedTippedVisits,
  } = forecast;

  return (
    <Row gutter={[12, 12]} className="mb-4 cv-tip-stat-grid">
      <Col xs={12} sm={12} lg={6}>
        <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            ∑ Thưởng CV Tip
          </div>
          <div className="flex items-center gap-2">
            <AppIcon icon={Gift} size="md" className="text-amber-500 shrink-0" />
            <span className="tabular-nums font-bold text-xl md:text-2xl text-amber-600 dark:text-amber-400 truncate">
              {isMobile ? formatCompactVND(summary.totalCvTipBonus) : formatVND(summary.totalCvTipBonus)}
            </span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCvTipBonus}
            previousValue={previousSummary?.totalCvTipBonus || 0}
            formatter={formatVND}
          />
          <CvTipForecastSubtext
            projectedVal={projectedCvTipBonus}
            unit="đ"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            elapsedRatioPercent={elapsedRatioPercent}
            periodNoun={periodNoun}
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Thực nhận 70% tiền tip (90% trong kỳ training CVL)
          </div>
        </Card>
      </Col>

      <Col xs={12} sm={12} lg={6}>
        <Card className="shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
          <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
            ∑ Tip
          </div>
          <div className="flex items-center gap-2">
            <AppIcon icon={DollarSign} size="md" className="text-purple-500 shrink-0" />
            <span className="tabular-nums font-bold text-xl md:text-2xl text-purple-600 dark:text-purple-400 truncate">
              {isMobile ? formatCompactVND(summary.totalCustomerTip) : formatVND(summary.totalCustomerTip)}
            </span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCustomerTip}
            previousValue={previousSummary?.totalCustomerTip || 0}
            formatter={formatVND}
          />
          <CvTipForecastSubtext
            projectedVal={projectedCustomerTip}
            unit="đ"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            elapsedRatioPercent={elapsedRatioPercent}
            periodNoun={periodNoun}
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Tổng số tiền tip khách hàng để lại</div>
        </Card>
      </Col>

      <Col xs={12} sm={12} lg={6}>
        <Card className="shadow-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
          <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
            % Tip
          </div>
          <div className="flex items-center gap-2">
            <AppIcon icon={Percent} size="md" className="text-cyan-500 shrink-0" />
            <span className="tabular-nums font-bold text-xl md:text-2xl text-cyan-600 dark:text-cyan-400">
              {summary.avgTipRatePercent}%
            </span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.avgTipRatePercent}
            previousValue={previousSummary?.avgTipRatePercent || 0}
            formatter={(value) => `${value.toFixed(1)}%`}
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Tỷ lệ chốt tip trên tổng lượt khách phục vụ
          </div>
        </Card>
      </Col>

      <Col xs={12} sm={12} lg={6}>
        <Card className="shadow-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
          <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
            Lượt Tip / Khách
          </div>
          <div className="flex items-center gap-2">
            <AppIcon icon={User} size="md" className="text-blue-500 shrink-0" />
            <div className="flex items-baseline gap-1 min-w-0">
              <button
                type="button"
                className="tabular-nums font-bold text-xl md:text-2xl text-blue-600 dark:text-blue-400 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                onClick={onOpenTipHistory}
                aria-label={`Xem ${summary.totalTippedVisits} lượt khách đã tip và các lượt không tip`}
              >
                {summary.totalTippedVisits}
              </button>
              <span className="tabular-nums text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                / {summary.totalVisits}
              </span>
            </div>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalTippedVisits}
            previousValue={previousSummary?.totalTippedVisits || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
          />
          <CvTipForecastSubtext
            projectedVal={projectedTippedVisits}
            unit="lượt"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            elapsedRatioPercent={elapsedRatioPercent}
            periodNoun={periodNoun}
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Nhấn vào số để xem tất cả lượt tip và không tip
          </div>
        </Card>
      </Col>
    </Row>
  );
}
