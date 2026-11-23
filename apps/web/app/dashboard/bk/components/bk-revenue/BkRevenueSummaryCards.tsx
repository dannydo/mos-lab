'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { DollarSign, ShoppingCart, Trophy } from 'lucide-react';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatBkRevenueCurrency } from './bkRevenueColumns';

export interface BkRevenueSummaryCardsProps {
  summary: {
    completedOrdersCount: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  };
  previousSummary: {
    completedOrdersCount: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  } | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: string;
  projectedCompletedOrders: number;
  projectedRevenue: number;
  projectedCommissionBonus: number;
}

export function BkRevenueSummaryCards({
  summary,
  previousSummary,
  comparison,
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
  projectedCompletedOrders,
  projectedRevenue,
  projectedCommissionBonus,
}: BkRevenueSummaryCardsProps) {
  const renderForecastSubtext = (projectedVal: number, unit = '') => {
    if (isDayMode) return null;

    if (isPastPeriod) {
      return (
        <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
            <span>Thực tế chốt {periodNoun}:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {unit === 'đ' ? formatBkRevenueCurrency(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
          <span className="inline-flex items-center gap-1">
            <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
              🔮
            </span>
            <span className="text-[11px] text-slate-400">Cuối {periodNoun}:</span>
          </span>
          <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            ~{unit === 'đ' ? formatBkRevenueCurrency(projectedVal) : `${projectedVal.toLocaleString('vi-VN')} ${unit}`}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Done</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <span>{summary.completedOrdersCount.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.completedOrdersCount}
            previousValue={previousSummary?.completedOrdersCount || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} đơn`}
          />
          {renderForecastSubtext(projectedCompletedOrders, 'đơn')}
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Doanh Thu Net</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            <DollarSign className="w-5 h-5 shrink-0" />
            <span>{formatBkRevenueCurrency(summary.totalRevenue)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalRevenue}
            previousValue={previousSummary?.totalRevenue || 0}
            formatter={formatBkRevenueCurrency}
          />
          {renderForecastSubtext(projectedRevenue, 'đ')}
        </Card>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Thưởng Doanh Thu</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            <Trophy className="w-5 h-5 shrink-0" />
            <span>{formatBkRevenueCurrency(summary.totalCommissionBonus)}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCommissionBonus}
            previousValue={previousSummary?.totalCommissionBonus || 0}
            formatter={formatBkRevenueCurrency}
          />
          {renderForecastSubtext(projectedCommissionBonus, 'đ')}
        </Card>
      </Col>
    </Row>
  );
}
