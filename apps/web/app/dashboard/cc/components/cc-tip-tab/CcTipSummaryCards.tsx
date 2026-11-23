'use client';

import React from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { DollarSign, Gift } from 'lucide-react';
import type { CcTipLeaderboardResponse } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcPeriodComparison from '../CcPeriodComparison';

interface CcTipSummaryCardsProps {
  summary: CcTipLeaderboardResponse['summary'];
  projectedTotalCcTipBonus: number;
  projectedTotalCustomerTip: number;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

interface CcTipForecastSubtextProps {
  projectedValue: number;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

function CcTipForecastSubtext({
  projectedValue,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: CcTipForecastSubtextProps) {
  if (isDayMode || !projectedValue) return null;

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {formatCompactVND(projectedValue)}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
        <span className="shrink-0 flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="text-sm leading-none">
            🔮
          </span>
          <span>Dự kiến:</span>
        </span>
        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          ~{formatCompactVND(projectedValue)}
        </span>
      </div>
    </Tooltip>
  );
}

export function CcTipSummaryCards({
  summary,
  projectedTotalCcTipBonus,
  projectedTotalCustomerTip,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: CcTipSummaryCardsProps) {
  return (
    <Row gutter={[16, 16]} className="cc-tip-summary-row">
      <Col xs={24} sm={12}>
        <Card
          variant="outlined"
          className="h-full shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl"
        >
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                ∑ Thưởng CC Tip (20%)
              </div>
              <div className="flex items-center gap-2">
                <AppIcon icon={Gift} size={22} className="text-amber-500 shrink-0" />
                <span className="tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {formatCompactVND(Number(summary.totalCcTipBonus || 0))}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                Thực nhận 20% tiền tip từ khách hàng
              </div>
              <CcPeriodComparison
                comparison={summary.comparison}
                currentValue={summary.totalCcTipBonus}
                previousValue={summary.comparison?.totalCcTipBonus || 0}
                formatter={formatCompactVND}
              />
            </div>
            <CcTipForecastSubtext
              projectedValue={projectedTotalCcTipBonus}
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              periodNoun={periodNoun}
              elapsedRatioPercent={elapsedRatioPercent}
            />
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={12}>
        <Card
          variant="outlined"
          className="h-full shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl"
        >
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">∑ Tip</div>
              <div className="flex items-center gap-2">
                <AppIcon icon={DollarSign} size={22} className="text-purple-500 shrink-0" />
                <span className="tabular-nums text-2xl font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                  {formatCompactVND(Number(summary.totalCustomerTip || 0))}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                Tổng số tiền tip khách hàng để lại
              </div>
              <CcPeriodComparison
                comparison={summary.comparison}
                currentValue={summary.totalCustomerTip}
                previousValue={summary.comparison?.totalCustomerTip || 0}
                formatter={formatCompactVND}
              />
            </div>
            <CcTipForecastSubtext
              projectedValue={projectedTotalCustomerTip}
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              periodNoun={periodNoun}
              elapsedRatioPercent={elapsedRatioPercent}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
