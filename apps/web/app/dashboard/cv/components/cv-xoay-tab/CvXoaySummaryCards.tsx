'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { DollarSign, LayoutGrid, Trophy } from 'lucide-react';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND } from '~/lib/format-utils';
import type { CvXoayForecast, CvXoaySummary } from './cvXoayUtils';

interface CvXoayForecastSubtextProps {
  projectedVal: number;
  unit?: string;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
}

function CvXoayForecastSubtext({
  projectedVal,
  unit = '',
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
}: CvXoayForecastSubtextProps) {
  if (isDayMode || !projectedVal) return null;

  const formattedVal =
    unit === 'đ' ? formatCompactVND(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`.trim();

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/20 pt-1.5 cursor-help opacity-70">
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

export interface CvXoaySummaryCardsProps {
  summary: CvXoaySummary;
  previousSummary: CvXoaySummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecast: CvXoayForecast;
}

export function CvXoaySummaryCards({ summary, previousSummary, comparison, forecast }: CvXoaySummaryCardsProps) {
  const { isDayMode, isMonthMode, isPastPeriod, elapsedRatioPercent, periodNoun } = forecast;

  return (
    <Row gutter={[16, 16]} className="mb-4">
      <Col xs={24} sm={8}>
        <Card
          variant="outlined"
          className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Bộ Mi</div>
          <div className="flex items-baseline gap-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <LayoutGrid className="w-5 h-5 shrink-0 self-center" />
            <span>{summary.totalServices.toLocaleString('vi-VN')}</span>
            <span className="text-sm font-semibold">Bộ Mi</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalServices}
            previousValue={previousSummary?.totalServices || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} Bộ Mi`}
          />
          <CvXoayForecastSubtext
            projectedVal={forecast.projectedServices}
            unit="Bộ Mi"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            elapsedRatioPercent={elapsedRatioPercent}
            periodNoun={periodNoun}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card
          variant="outlined"
          className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Điểm Xoay</div>
          <div className="flex items-baseline gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <Trophy className="w-5 h-5 shrink-0 self-center" />
            <span>{summary.totalPoints.toLocaleString('vi-VN')}</span>
            <span className="text-sm font-semibold">pts</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalPoints}
            previousValue={previousSummary?.totalPoints || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} pts`}
          />
          <CvXoayForecastSubtext
            projectedVal={forecast.projectedPoints}
            unit="pts"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            elapsedRatioPercent={elapsedRatioPercent}
            periodNoun={periodNoun}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card
          variant="outlined"
          className="bg-white dark:bg-slate-900 shadow-sm border border-amber-500/70 dark:border-amber-400/70 rounded-xl"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Thưởng Xoay</div>
          <div className="flex items-baseline gap-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <DollarSign className="w-5 h-5 shrink-0 self-center" />
            <span>{summary.totalBonus.toLocaleString('vi-VN')}</span>
            <span className="text-sm font-semibold">đ</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalBonus}
            previousValue={previousSummary?.totalBonus || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} đ`}
          />
          {isMonthMode && (
            <CvXoayForecastSubtext
              projectedVal={forecast.projectedBonus}
              unit="đ"
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              elapsedRatioPercent={elapsedRatioPercent}
              periodNoun={periodNoun}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
