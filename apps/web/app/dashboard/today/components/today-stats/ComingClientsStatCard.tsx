'use client';

import { Card, Col, Row } from 'antd';
import { PieChart } from 'lucide-react';
import type { ReportPeriodComparison } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import PeriodComparison from '~/components/ui/PeriodComparison';
import { formatCompactVND } from '~/lib/format-utils';
import { DonutStatSection } from './DonutStatSection';
import { ForecastIndicator } from './ForecastIndicator';
import { TODAY_STATS_COLORS } from './todayStatsConstants';
import { formatCenterRevenue } from './todayStatsHelpers';
import type { ComingCategoryStats, ComingStatusStats, TodayStatsThemeMode } from './types';

export interface ComingClientsStatCardProps {
  themeMode: TodayStatsThemeMode;
  comingStats: ComingCategoryStats;
  comingStatusStats: ComingStatusStats;
  previousComingCount: number;
  comparison?: ReportPeriodComparison | null;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: 'tuần' | 'tháng';
  projectedComingCount: number;
  projectedComingPrice: number;
}

export function ComingClientsStatCard({
  themeMode,
  comingStats,
  comingStatusStats,
  previousComingCount,
  comparison,
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
  projectedComingCount,
  projectedComingPrice,
}: ComingClientsStatCardProps) {
  const totalSummaryText = `${comingStats.totalCount} khách • ${Math.round(comingStats.totalPrice || 0).toLocaleString('vi-VN')} đ`;

  return (
    <Col xs={24} sm={24} md={24} lg={24} xl={8}>
      <Card
        size="small"
        className="h-full min-h-[225px] flex flex-col justify-between bg-[var(--mos-bg-container)] border-[var(--mos-border-secondary)] [&_.ant-card-body]:flex-1 [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:justify-between"
      >
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <span className="inline-flex items-center gap-1.5 font-bold text-[13px] text-[var(--mos-text-secondary,rgb(71,85,105))] dark:text-slate-300">
              <AppIcon icon={PieChart} size={13} className="text-[rgba(24,144,255,1)] shrink-0" />
              Khách Đến Hôm Nay
            </span>
            <PeriodComparison
              comparison={comparison}
              currentValue={comingStats.totalCount}
              previousValue={previousComingCount}
              formatter={(value) => `${value.toLocaleString('vi-VN')} khách`}
              compact
              className="mt-1 border-0 pt-0 text-[10px]"
            />
          </div>
          <div className="flex flex-col items-end">
            <strong
              className="tabular-nums text-[13px] text-[var(--mos-text,rgb(15,23,42))] dark:text-slate-100"
              title={`Tổng cộng: ${totalSummaryText}`}
            >
              {totalSummaryText}
            </strong>
            <ForecastIndicator
              themeMode={themeMode}
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              elapsedRatioPercent={elapsedRatioPercent}
              periodNoun={periodNoun}
            >
              <span>
                {projectedComingCount.toLocaleString('vi-VN')} khách • {formatCompactVND(projectedComingPrice)}
              </span>
            </ForecastIndicator>
          </div>
        </div>

        <Row gutter={16} className="flex-1 items-center">
          <DonutStatSection
            title="Nhóm khách"
            total={comingStats.totalCount}
            themeMode={themeMode}
            hasRightBorder
            segments={[
              { value: comingStats.combo.count, color: TODAY_STATS_COLORS.combo.color, label: 'Combo' },
              { value: comingStats.oc.count, color: TODAY_STATS_COLORS.tele.color, label: 'Tele' },
              { value: comingStats.other.count, color: TODAY_STATS_COLORS.other.color, label: 'Khác' },
            ]}
            legendItems={[
              {
                key: 'combo',
                label: 'Combo',
                value: comingStats.combo.count,
                dotClassName: TODAY_STATS_COLORS.combo.dotClass,
                subtext: formatCenterRevenue(comingStats.combo.price),
                tooltipTitle: `Combo: ${comingStats.combo.count} khách • ${Math.round(comingStats.combo.price || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'tele',
                label: 'Tele',
                value: comingStats.oc.count,
                dotClassName: TODAY_STATS_COLORS.tele.dotClass,
                subtext: formatCenterRevenue(comingStats.oc.price),
                tooltipTitle: `Telesales: ${comingStats.oc.count} khách • ${Math.round(comingStats.oc.price || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'other',
                label: 'Khác',
                value: comingStats.other.count,
                dotClassName: TODAY_STATS_COLORS.other.dotClass,
                subtext: formatCenterRevenue(comingStats.other.price),
                tooltipTitle: `Khác: ${comingStats.other.count} khách • ${Math.round(comingStats.other.price || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
            ]}
          />

          <DonutStatSection
            title="Trạng thái"
            total={comingStatusStats.totalCount}
            themeMode={themeMode}
            dense
            segments={[
              { value: comingStatusStats.done.count, color: TODAY_STATS_COLORS.done.color, label: 'Done' },
              { value: comingStatusStats.serving.count, color: TODAY_STATS_COLORS.serving.color, label: 'Đang làm' },
              { value: comingStatusStats.late.count, color: TODAY_STATS_COLORS.late.color, label: 'Muộn' },
              { value: comingStatusStats.pending.count, color: TODAY_STATS_COLORS.pending.color, label: 'Chờ' },
            ]}
            legendItems={[
              {
                key: 'done',
                label: 'Done',
                value: comingStatusStats.done.count,
                dotClassName: TODAY_STATS_COLORS.done.dotClass,
                subtext: formatCenterRevenue(comingStatusStats.done.price),
                tooltipTitle: `Hoàn thành: ${comingStatusStats.done.count} khách • ${Math.round(comingStatusStats.done.price || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'serving',
                label: 'Đang làm',
                value: comingStatusStats.serving.count,
                dotClassName: TODAY_STATS_COLORS.serving.dotClass,
                subtext: formatCenterRevenue(comingStatusStats.serving.price),
                tooltipTitle: `Đang làm: ${comingStatusStats.serving.count} khách • ${Math.round(comingStatusStats.serving.price || 0).toLocaleString('vi-VN')}\u00A0đ`,
              },
              {
                key: 'late',
                label: 'Muộn',
                value: comingStatusStats.late.count,
                dotClassName: TODAY_STATS_COLORS.late.dotClass,
                tooltipTitle: `Đến muộn: ${comingStatusStats.late.count} khách`,
              },
              {
                key: 'pending',
                label: 'Chờ',
                value: comingStatusStats.pending.count,
                dotClassName: TODAY_STATS_COLORS.pending.dotClass,
                tooltipTitle: `Chờ đến: ${comingStatusStats.pending.count} khách`,
              },
            ]}
          />
        </Row>
      </Card>
    </Col>
  );
}
