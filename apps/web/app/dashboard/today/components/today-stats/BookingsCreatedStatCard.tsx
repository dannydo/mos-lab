'use client';

import { Card, Col, Row } from 'antd';
import { Calendar } from 'lucide-react';
import type { ReportPeriodComparison } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import PeriodComparison from '~/components/ui/PeriodComparison';
import type { BookingData } from '../../hooks/useTodayData';
import { useTodaySandbox } from '../../context/SandboxModeContext';
import { DonutStatSection } from './DonutStatSection';
import { ForecastIndicator } from './ForecastIndicator';
import { TODAY_STATS_COLORS } from './todayStatsConstants';
import type { TodayStatsThemeMode } from './types';

export interface BookingsCreatedStatCardProps {
  themeMode: TodayStatsThemeMode;
  allBookings: BookingData[];
  bookingsCombo: BookingData[];
  bookingsOc: BookingData[];
  bookingsOther: BookingData[];
  bookingBranchCounts: { dt: number; ep: number; total: number };
  previousAllBookings: BookingData[];
  comparison?: ReportPeriodComparison | null;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: 'tuần' | 'tháng';
  projectedTotalBookings: number;
}

export function BookingsCreatedStatCard({
  themeMode,
  allBookings,
  bookingsCombo,
  bookingsOc,
  bookingsOther,
  bookingBranchCounts,
  previousAllBookings,
  comparison,
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
  projectedTotalBookings,
}: BookingsCreatedStatCardProps) {
  const sandbox = useTodaySandbox();

  return (
    <Col xs={24} sm={24} md={24} lg={24} xl={8}>
      <Card
        size="small"
        className="h-full min-h-[225px] flex flex-col justify-between bg-[var(--mos-bg-container)] border-[var(--mos-border-secondary)] [&_.ant-card-body]:flex-1 [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:justify-between"
      >
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-bold text-[13px] text-[var(--mos-text-secondary,rgb(71,85,105))] dark:text-slate-300">
                <AppIcon icon={Calendar} size={13} className="text-[rgba(82,196,26,1)] shrink-0" />
                Booking Tạo Hôm Nay
              </span>
              {sandbox.isSandbox && (
                <>
                  <span
                    className={
                      sandbox.mode === 'training'
                        ? 'px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }
                  >
                    {sandbox.mode === 'training' ? '🧪 Training Mode' : '💎 Sales Mode'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 tabular-nums">
                    {sandbox.mode === 'training'
                      ? `NVL ${sandbox.materialReadyCount}/${sandbox.materialsChecklist.length} · KH ${sandbox.designPlanTotals.completed}/${sandbox.designPlanTotals.target}`
                      : `Tỉ lệ chốt ${sandbox.closingRate}% (+${sandbox.closingUpliftPercent}%)`}
                  </span>
                </>
              )}
            </div>
            <PeriodComparison
              comparison={comparison}
              currentValue={allBookings.length}
              previousValue={previousAllBookings.length}
              formatter={(value) => `${value.toLocaleString('vi-VN')} booking`}
              compact
              className="mt-1 border-0 pt-0 text-[10px]"
            />
          </div>
          <div className="flex flex-col items-end">
            <strong className="tabular-nums text-[15px] text-[var(--mos-text,rgb(15,23,42))] dark:text-slate-100">
              {allBookings.length}
            </strong>
            <ForecastIndicator
              themeMode={themeMode}
              isDayMode={isDayMode}
              isPastPeriod={isPastPeriod}
              elapsedRatioPercent={elapsedRatioPercent}
              periodNoun={periodNoun}
            >
              <span>{projectedTotalBookings.toLocaleString('vi-VN')} booking</span>
            </ForecastIndicator>
          </div>
        </div>

        <Row gutter={16} className="flex-1 items-center">
          <DonutStatSection
            title="Nhóm khách"
            total={allBookings.length}
            themeMode={themeMode}
            hasRightBorder
            segments={[
              { value: bookingsCombo.length, color: TODAY_STATS_COLORS.combo.color, label: 'Combo' },
              { value: bookingsOc.length, color: TODAY_STATS_COLORS.tele.color, label: 'Tele' },
              { value: bookingsOther.length, color: TODAY_STATS_COLORS.other.color, label: 'Khác' },
            ]}
            legendItems={[
              {
                key: 'combo',
                label: 'Combo',
                value: bookingsCombo.length,
                dotClassName: TODAY_STATS_COLORS.combo.dotClass,
              },
              {
                key: 'tele',
                label: 'Tele',
                value: bookingsOc.length,
                dotClassName: TODAY_STATS_COLORS.tele.dotClass,
              },
              {
                key: 'other',
                label: 'Khác',
                value: bookingsOther.length,
                dotClassName: TODAY_STATS_COLORS.other.dotClass,
              },
            ]}
          />

          <DonutStatSection
            title="Chi nhánh"
            total={allBookings.length}
            themeMode={themeMode}
            segments={[
              { value: bookingBranchCounts.dt, color: TODAY_STATS_COLORS.detham.color, label: 'Đ.Thám' },
              { value: bookingBranchCounts.ep, color: TODAY_STATS_COLORS.estella.color, label: 'Estella' },
            ]}
            legendItems={[
              {
                key: 'dt',
                label: 'DT',
                value: bookingBranchCounts.dt,
                dotClassName: TODAY_STATS_COLORS.detham.dotClass,
              },
              {
                key: 'ep',
                label: 'EP',
                value: bookingBranchCounts.ep,
                dotClassName: TODAY_STATS_COLORS.estella.dotClass,
              },
            ]}
          />
        </Row>
      </Card>
    </Col>
  );
}
