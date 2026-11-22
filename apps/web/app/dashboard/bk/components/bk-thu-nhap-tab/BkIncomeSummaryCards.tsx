'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { CheckCircle2, DollarSign, Gift, Trophy, Wallet } from 'lucide-react';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND } from '~/lib/format-utils';
import { BkIncomeForecastSubtext } from './BkIncomeForecastSubtext';
import {
  formatBkIncomeCurrency,
  type BkIncomeForecastMeta,
  type BkIncomeSummary,
  type BkProjectedSummary,
} from './bkThuNhapUtils';

interface BkIncomeSummaryCardsProps {
  summary: BkIncomeSummary;
  previousSummary: BkIncomeSummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecastMeta: BkIncomeForecastMeta;
  projectedSummary: BkProjectedSummary;
  isMobile: boolean;
}

/** Renders the 5 BK Income KPI summary cards with period comparisons and run-rate forecasts. */
export function BkIncomeSummaryCards({
  summary,
  previousSummary,
  comparison,
  forecastMeta,
  projectedSummary,
  isMobile,
}: BkIncomeSummaryCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Lương Cứng</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="truncate">{formatBkIncomeCurrency(summary.totalBaseSalary)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalBaseSalary}
            previousValue={previousSummary?.totalBaseSalary || 0}
            formatter={formatBkIncomeCurrency}
            compact={isMobile}
          />
          <BkIncomeForecastSubtext
            forecastMeta={forecastMeta}
            projectedValue={projectedSummary.projectedBaseSalary}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Thưởng Done</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="truncate">{formatBkIncomeCurrency(summary.totalDoneBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalDoneBonus}
            previousValue={previousSummary?.totalDoneBonus || 0}
            formatter={formatBkIncomeCurrency}
            compact={isMobile}
          />
          <BkIncomeForecastSubtext
            forecastMeta={forecastMeta}
            projectedValue={projectedSummary.projectedDoneBonus}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Thưởng Doanh Thu</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            <Trophy className="w-5 h-5 shrink-0" />
            <span className="truncate">{formatBkIncomeCurrency(summary.totalRevenueBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalRevenueBonus}
            previousValue={previousSummary?.totalRevenueBonus || 0}
            formatter={formatBkIncomeCurrency}
            compact={isMobile}
          />
          <BkIncomeForecastSubtext
            forecastMeta={forecastMeta}
            projectedValue={projectedSummary.projectedRevenueBonus}
            isMobile={isMobile}
          />
          <div className="mt-1.5 pt-1.5 border-t border-slate-700/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Doanh thu:</span>
            <Tooltip
              title={`Tổng doanh thu đơn hợp lệ (Completed + CheckOut): ${formatBkIncomeCurrency(summary.totalRevenue || 0)}${previousSummary?.totalRevenue !== undefined ? ` (Kỳ trước: ${formatBkIncomeCurrency(previousSummary.totalRevenue)})` : ''}`}
            >
              <span className="font-semibold text-purple-400 tabular-nums cursor-help">
                {formatCompactVND(summary.totalRevenue || 0)}
                {previousSummary?.totalRevenue !== undefined && (
                  <span className="text-slate-500 font-normal ml-1">
                    (Kỳ tr: {formatCompactVND(previousSummary.totalRevenue)})
                  </span>
                )}
              </span>
            </Tooltip>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Thưởng Tip</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-pink-600 dark:text-pink-400">
            <Gift className="w-5 h-5 shrink-0" />
            <span className="truncate">{formatBkIncomeCurrency(summary.totalTipBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalTipBonus}
            previousValue={previousSummary?.totalTipBonus || 0}
            formatter={formatBkIncomeCurrency}
            compact={isMobile}
          />
          <BkIncomeForecastSubtext
            forecastMeta={forecastMeta}
            projectedValue={projectedSummary.projectedTipBonus}
            isMobile={isMobile}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Thu Nhập Tạm Tính</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5 shrink-0" />
            <span className="truncate">{formatBkIncomeCurrency(summary.grandTotalIncome)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.grandTotalIncome}
            previousValue={previousSummary?.grandTotalIncome || 0}
            formatter={formatBkIncomeCurrency}
            compact={isMobile}
          />
          <BkIncomeForecastSubtext
            forecastMeta={forecastMeta}
            projectedValue={projectedSummary.projectedTotalIncome}
            isMobile={isMobile}
          />
        </Card>
      </Col>
    </Row>
  );
}
