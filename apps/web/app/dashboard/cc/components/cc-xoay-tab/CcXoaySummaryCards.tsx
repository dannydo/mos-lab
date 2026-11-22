'use client';

import React from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import type { CcXoayReportResponse } from '@mos-lab/shared';
import { formatCompactVND } from '~/lib/format-utils';
import CcPeriodComparison from '../CcPeriodComparison';

interface CcXoaySummaryCardsProps {
  summary?: CcXoayReportResponse['summary'];
  projectedCheckins: number;
  projectedPoints: number;
  projectedBonus: number;
  isMonthMode: boolean;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

interface CcXoayForecastSubtextProps {
  projectedValue: number;
  unit?: string;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

function CcXoayForecastSubtext({
  projectedValue,
  unit = '',
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: CcXoayForecastSubtextProps) {
  if (isDayMode || !projectedValue) return null;

  const formattedValue =
    unit === 'đ' ? formatCompactVND(projectedValue) : `${projectedValue.toLocaleString('vi-VN')} ${unit}`.trim();

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/20 pt-1.5 cursor-help opacity-75">
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-400 whitespace-nowrap">
            {formattedValue}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
    >
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/30 pt-1.5 cursor-help">
        <span className="shrink-0 flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="text-sm leading-none">
            🔮
          </span>
          <span>Dự kiến:</span>
        </span>
        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          ~{formattedValue}
        </span>
      </div>
    </Tooltip>
  );
}

export function CcXoaySummaryCards({
  summary,
  projectedCheckins,
  projectedPoints,
  projectedBonus,
  isMonthMode,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: CcXoaySummaryCardsProps) {
  const totalCheckins = summary?.totalCheckins || 0;
  const totalPoints = summary?.totalPoints || 0;
  const totalBonus = summary?.totalBonus || 0;

  return (
    <Row gutter={[12, 12]} className="cc-xoay-summary-row">
      <Col xs={24} sm={8}>
        <Card size="small" variant="outlined" className="h-full shadow-sm rounded-xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Lượt CC Xoay</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {totalCheckins.toLocaleString('vi-VN')}
            </span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">lượt</span>
          </div>
          <CcPeriodComparison
            comparison={summary?.comparison}
            currentValue={totalCheckins}
            previousValue={summary?.comparison?.totalCheckins || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
          />
          <CcXoayForecastSubtext
            projectedValue={projectedCheckins}
            unit="lượt"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            periodNoun={periodNoun}
            elapsedRatioPercent={elapsedRatioPercent}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card size="small" variant="outlined" className="h-full shadow-sm rounded-xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Điểm CC</div>
          <div className="tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {totalPoints.toLocaleString('vi-VN')}
          </div>
          <CcPeriodComparison
            comparison={summary?.comparison}
            currentValue={totalPoints}
            previousValue={summary?.comparison?.totalPoints || 0}
            formatter={(value) => value.toLocaleString('vi-VN')}
          />
          <CcXoayForecastSubtext
            projectedValue={projectedPoints}
            unit="pts"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            periodNoun={periodNoun}
            elapsedRatioPercent={elapsedRatioPercent}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card size="small" variant="outlined" className="h-full shadow-sm rounded-xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">∑ Thưởng CC Xoay</div>
          <div className="tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {formatCompactVND(Number(totalBonus))}
          </div>
          <CcPeriodComparison
            comparison={summary?.comparison}
            currentValue={totalBonus}
            previousValue={summary?.comparison?.totalBonus || 0}
            formatter={formatCompactVND}
          />
          {isMonthMode ? (
            <CcXoayForecastSubtext
              projectedValue={projectedBonus}
              unit="đ"
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              periodNoun={periodNoun}
              elapsedRatioPercent={elapsedRatioPercent}
            />
          ) : null}
        </Card>
      </Col>
    </Row>
  );
}
