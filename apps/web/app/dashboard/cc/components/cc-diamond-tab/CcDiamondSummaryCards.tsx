'use client';

import React from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { Crown, DollarSign, Users } from 'lucide-react';
import type { CcDiamondEntry, CcDiamondResponse } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import CcPeriodComparison from '../CcPeriodComparison';
import { formatDiamondCurrency } from './cc-diamond-utils';

interface CcDiamondSummaryCardsProps {
  comparison?: CcDiamondResponse['comparison'];
  totalReferrals: number;
  totalBonus: number;
  topCc: CcDiamondEntry | null;
  projectedReferrals: number;
  projectedBonus: number;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

interface DiamondForecastSubtextProps {
  projectedValue: number;
  unit: 'khách' | 'đ';
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
}

function DiamondForecastSubtext({
  projectedValue,
  unit,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: DiamondForecastSubtextProps) {
  if (isDayMode || !projectedValue) return null;

  const formattedValue =
    unit === 'đ' ? formatDiamondCurrency(projectedValue) : `${projectedValue.toLocaleString('vi-VN')} ${unit}`;

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">{formattedValue}</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
    >
      <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
        <span className="shrink-0 flex items-center gap-1">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`}>
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

export function CcDiamondSummaryCards({
  comparison,
  totalReferrals,
  totalBonus,
  topCc,
  projectedReferrals,
  projectedBonus,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
}: CcDiamondSummaryCardsProps) {
  return (
    <Row gutter={[16, 16]} className="cc-diamond-summary-row">
      <Col xs={24} sm={8}>
        <Card variant="outlined" className="h-full shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">∑ Khách Giới Thiệu</div>
          <div className="flex items-baseline gap-2">
            <AppIcon icon={Users} size={22} className="text-cyan-500 self-center shrink-0" />
            <span className="tabular-nums text-2xl font-bold text-sky-600 dark:text-sky-400">
              {totalReferrals.toLocaleString('vi-VN')}
            </span>
            <span className="text-base font-medium text-sky-600 dark:text-sky-400">khách</span>
          </div>
          <CcPeriodComparison
            comparison={comparison}
            currentValue={totalReferrals}
            previousValue={comparison?.totalReferralGuests || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} khách`}
          />
          <DiamondForecastSubtext
            projectedValue={projectedReferrals}
            unit="khách"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            periodNoun={periodNoun}
            elapsedRatioPercent={elapsedRatioPercent}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card variant="outlined" className="h-full shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">∑ Thưởng Kim Cương</div>
          <div className="flex items-baseline gap-2">
            <AppIcon icon={DollarSign} size={22} className="text-emerald-500 self-center shrink-0" />
            <span className="tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatDiamondCurrency(totalBonus)}
            </span>
          </div>
          <CcPeriodComparison
            comparison={comparison}
            currentValue={totalBonus}
            previousValue={comparison?.totalDiamondBonus || 0}
            formatter={formatDiamondCurrency}
          />
          <DiamondForecastSubtext
            projectedValue={projectedBonus}
            unit="đ"
            isDayMode={isDayMode}
            isPastPeriod={isPastPeriod}
            periodNoun={periodNoun}
            elapsedRatioPercent={elapsedRatioPercent}
          />
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card variant="outlined" className="h-full shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Quán Quân Giới Thiệu</div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <AppIcon icon={Crown} size={20} className="text-amber-500 self-center shrink-0" />
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {topCc ? topCc.tenCc : 'Chưa có'}
            </span>
            {topCc && topCc.soKhachDiamond > 0 ? (
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                (💎 {topCc.soKhachDiamond} khách)
              </span>
            ) : null}
          </div>
        </Card>
      </Col>
    </Row>
  );
}
