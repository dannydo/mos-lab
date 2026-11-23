'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row } from 'antd';
import { Clock, Gift, Wallet, Zap } from 'lucide-react';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { CvIncomeForecastSubtext } from './CvIncomeForecastSubtext';
import type { CvIncomeForecastMeta, CvIncomeSummary, CvProjectedSummary } from './cvThuNhapUtils';

interface CvIncomeSummaryCardsProps {
  summary: CvIncomeSummary;
  previousSummary: CvIncomeSummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecastMeta: CvIncomeForecastMeta;
  projectedSummary: CvProjectedSummary;
  formatMetricValue: (value: number) => string;
  useCompactMetricFormat: boolean;
  isMobile: boolean;
}

/** Renders the 5 CV Income KPI summary cards with period comparisons and run-rate forecasts. */
export function CvIncomeSummaryCards({
  summary,
  previousSummary,
  comparison,
  forecastMeta,
  projectedSummary,
  formatMetricValue,
  useCompactMetricFormat,
  isMobile,
}: CvIncomeSummaryCardsProps) {
  return (
    <Row gutter={[12, 12]} className="cv-income-stat-grid">
      <Col xs={12} sm={4} md={4} lg={4} xl={4}>
        <Card variant="outlined" className="shadow-sm rounded-xl">
          <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[26px] sm:min-h-0 leading-tight">
            ∑ Lương Giờ
          </div>
          <div className="flex items-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400 min-w-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">{formatMetricValue(summary.totalHourlyWage)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalHourlyWage}
            previousValue={previousSummary?.totalHourlyWage || 0}
            formatter={formatMetricValue}
            compact={useCompactMetricFormat}
          />
          <CvIncomeForecastSubtext
            projectedVal={projectedSummary.projectedHourlyWage}
            forecastMeta={forecastMeta}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={12} sm={5} md={5} lg={5} xl={5}>
        <Card variant="outlined" className="shadow-sm rounded-xl">
          <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[26px] sm:min-h-0 leading-tight">
            ∑ Thưởng Ca CV
          </div>
          <div className="flex items-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-green-700 dark:text-emerald-400 min-w-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">{formatMetricValue(summary.totalCvXoayBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCvXoayBonus}
            previousValue={previousSummary?.totalCvXoayBonus || 0}
            formatter={formatMetricValue}
            compact={useCompactMetricFormat}
          />
          <CvIncomeForecastSubtext
            projectedVal={projectedSummary.projectedCvXoayBonus}
            forecastMeta={forecastMeta}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={12} sm={5} md={5} lg={5} xl={5}>
        <Card variant="outlined" className="shadow-sm rounded-xl">
          <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[26px] sm:min-h-0 leading-tight">
            ∑ Thưởng Thâm Niên
          </div>
          <div className="flex items-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 min-w-0">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">{formatMetricValue(summary.totalSeniorityBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalSeniorityBonus}
            previousValue={previousSummary?.totalSeniorityBonus || 0}
            formatter={formatMetricValue}
            compact={useCompactMetricFormat}
          />
          <CvIncomeForecastSubtext
            projectedVal={projectedSummary.projectedSeniorityBonus}
            forecastMeta={forecastMeta}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={12} sm={5} md={5} lg={5} xl={5}>
        <Card variant="outlined" className="shadow-sm rounded-xl">
          <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[26px] sm:min-h-0 leading-tight">
            ∑ Thưởng CV Tip
          </div>
          <div className="flex items-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400 min-w-0">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">{formatMetricValue(summary.totalCvTipBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCvTipBonus}
            previousValue={previousSummary?.totalCvTipBonus || 0}
            formatter={formatMetricValue}
            compact={useCompactMetricFormat}
          />
          <CvIncomeForecastSubtext
            projectedVal={projectedSummary.projectedCvTipBonus}
            forecastMeta={forecastMeta}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={12} sm={5} md={5} lg={5} xl={5}>
        <Card variant="outlined" className="shadow-sm rounded-xl border-emerald-500/80 dark:border-emerald-500/70">
          <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[26px] sm:min-h-0 leading-tight">
            ∑ Thu Nhập
          </div>
          <div className="flex items-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 min-w-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">{formatMetricValue(summary.grandTotalIncome)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.grandTotalIncome}
            previousValue={previousSummary?.grandTotalIncome || 0}
            formatter={formatMetricValue}
            compact={useCompactMetricFormat}
          />
          <CvIncomeForecastSubtext
            projectedVal={projectedSummary.projectedTotalIncome}
            forecastMeta={forecastMeta}
            isMobile={isMobile}
          />
        </Card>
      </Col>
    </Row>
  );
}
