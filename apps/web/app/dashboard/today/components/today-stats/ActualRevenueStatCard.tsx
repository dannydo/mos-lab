'use client';

import { Card, Col, Row } from 'antd';
import { BarChart3 } from 'lucide-react';
import type { ReportPeriodComparison } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND, formatVND } from '~/lib/format-utils';
import { DonutStatSection } from './DonutStatSection';
import { ForecastIndicator } from './ForecastIndicator';
import { TODAY_STATS_COLORS } from './todayStatsConstants';
import { formatCenterRevenue } from './todayStatsHelpers';
import type { CategoryRevenueStats, TodayStatsThemeMode, TotalRevenueStats } from './types';

export interface ActualRevenueStatCardProps {
  themeMode: TodayStatsThemeMode;
  totalRevenueData: TotalRevenueStats;
  categoryRevenueData: CategoryRevenueStats;
  previousTotalRevenue: number;
  comparison?: ReportPeriodComparison | null;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: 'tuần' | 'tháng';
  projectedTotalRevenue: number;
}

export function ActualRevenueStatCard({
  themeMode,
  totalRevenueData,
  categoryRevenueData,
  previousTotalRevenue,
  comparison,
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
  projectedTotalRevenue,
}: ActualRevenueStatCardProps) {
  const formattedTotalRevenue = `${Math.round(totalRevenueData.total || 0).toLocaleString('vi-VN')} đ`;

  return (
    <Col xs={24} sm={24} md={24} lg={24} xl={8}>
      <Card
        size="small"
        className="h-full min-h-[225px] flex flex-col justify-between bg-[var(--mos-bg-container)] border-[var(--mos-border-secondary)] [&_.ant-card-body]:flex-1 [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:justify-between"
      >
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <span className="inline-flex items-center gap-1.5 font-bold text-[13px] text-[var(--mos-text-secondary,rgb(71,85,105))] dark:text-slate-300">
              <AppIcon icon={BarChart3} size={13} className="text-[var(--mos-accent,rgb(212,168,75))] shrink-0" />
              Doanh Thu Thực Tế
            </span>
            <PeriodComparison
              comparison={comparison}
              currentValue={totalRevenueData.total}
              previousValue={previousTotalRevenue}
              formatter={formatVND}
              compact
              className="mt-1 border-0 pt-0 text-[10px]"
            />
          </div>
          <div className="flex flex-col items-end">
            <strong
              className="tabular-nums text-[14px] text-[var(--mos-text,rgb(15,23,42))] dark:text-slate-100"
              title={`Tổng cộng: ${formattedTotalRevenue}`}
            >
              {formattedTotalRevenue}
            </strong>
            <ForecastIndicator
              themeMode={themeMode}
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              elapsedRatioPercent={elapsedRatioPercent}
              periodNoun={periodNoun}
            >
              <span>{formatCompactVND(projectedTotalRevenue)}</span>
            </ForecastIndicator>
          </div>
        </div>

        <Row gutter={16} className="flex-1 items-center">
          <DonutStatSection
            title="Nhóm sản phẩm"
            total={totalRevenueData.total}
            centerLabel={formatCenterRevenue(totalRevenueData.total)}
            centerSubLabel="doanh thu"
            themeMode={themeMode}
            hasRightBorder
            segments={[
              { value: totalRevenueData.revCombo, color: TODAY_STATS_COLORS.combo.color, label: 'Combo' },
              { value: totalRevenueData.revLe, color: TODAY_STATS_COLORS.single.color, label: 'Lẻ' },
              { value: totalRevenueData.revProduct, color: TODAY_STATS_COLORS.product.color, label: 'Sản phẩm' },
            ]}
            legendItems={[
              {
                key: 'combo',
                label: 'Combo',
                value: formatCenterRevenue(totalRevenueData.revCombo),
                dotClassName: TODAY_STATS_COLORS.combo.dotClass,
                tooltipTitle: `Combo: ${Math.round(totalRevenueData.revCombo || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'single',
                label: 'Lẻ',
                value: formatCenterRevenue(totalRevenueData.revLe),
                dotClassName: TODAY_STATS_COLORS.single.dotClass,
                tooltipTitle: `Lẻ (Single): ${Math.round(totalRevenueData.revLe || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'product',
                label: 'SP',
                value: formatCenterRevenue(totalRevenueData.revProduct),
                dotClassName: TODAY_STATS_COLORS.product.dotClass,
                tooltipTitle: `Sản phẩm: ${Math.round(totalRevenueData.revProduct || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
            ]}
          />

          <DonutStatSection
            title="Nhóm khách"
            total={categoryRevenueData.total}
            centerLabel={formatCenterRevenue(categoryRevenueData.total)}
            centerSubLabel="doanh thu"
            themeMode={themeMode}
            segments={[
              { value: categoryRevenueData.revCombo, color: TODAY_STATS_COLORS.combo.color, label: 'Combo' },
              { value: categoryRevenueData.revTele, color: TODAY_STATS_COLORS.tele.color, label: 'Tele' },
              { value: categoryRevenueData.revOther, color: TODAY_STATS_COLORS.other.color, label: 'Khác' },
            ]}
            legendItems={[
              {
                key: 'combo',
                label: 'Combo',
                value: formatCenterRevenue(categoryRevenueData.revCombo),
                dotClassName: TODAY_STATS_COLORS.combo.dotClass,
              },
              {
                key: 'tele',
                label: 'Tele',
                value: formatCenterRevenue(categoryRevenueData.revTele),
                dotClassName: TODAY_STATS_COLORS.tele.dotClass,
              },
              {
                key: 'other',
                label: 'Khác',
                value: formatCenterRevenue(categoryRevenueData.revOther),
                dotClassName: TODAY_STATS_COLORS.other.dotClass,
              },
            ]}
          />
        </Row>
      </Card>
    </Col>
  );
}
