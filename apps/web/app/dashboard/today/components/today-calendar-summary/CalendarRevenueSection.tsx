'use client';

import { Col, Row } from 'antd';
import type { ReportPeriodComparison, RevenueHourlyResponse } from '@mos-lab/shared';
import { RevenueBranchHeatmap } from '../RevenueBranchHeatmap';
import { RevenueHourlyChart } from '../RevenueHourlyChart';
import { RevenueKpiCards } from '../RevenueKpiCards';
import type { CalendarThemeMode } from './types';

export interface CalendarRevenueSectionProps {
  themeMode: CalendarThemeMode;
  token: SafeAny;
  revenueData?: RevenueHourlyResponse | null;
  previousRevenueData?: RevenueHourlyResponse | null;
  comparison?: ReportPeriodComparison | null;
  revenueLoading?: boolean;
  onKpiCardClick: (type: string) => void;
  onBarClick: (hour: string) => void;
  onCellClick: (branchKey: string, hour: string) => void;
}

export function CalendarRevenueSection({
  themeMode,
  token,
  revenueData,
  previousRevenueData,
  comparison,
  revenueLoading,
  onKpiCardClick,
  onBarClick,
  onCellClick,
}: CalendarRevenueSectionProps) {
  const containerBgClass =
    themeMode === 'dark'
      ? 'bg-gradient-to-br from-emerald-500/[0.05] to-cyan-500/[0.05]'
      : 'bg-gradient-to-br from-emerald-500/[0.03] to-cyan-500/[0.03]';

  return (
    <div className={`flex flex-col gap-5 p-0.5 rounded-xl ${containerBgClass}`}>
      <RevenueKpiCards
        themeMode={themeMode}
        token={token}
        summary={revenueData?.summary || null}
        previousSummary={previousRevenueData?.summary || null}
        comparison={comparison}
        loading={revenueLoading}
        onCardClick={onKpiCardClick}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <RevenueHourlyChart
            themeMode={themeMode}
            token={token}
            hourlyBreakdown={revenueData?.hourlyBreakdown || []}
            dailyTarget={revenueData?.summary?.dailyTarget || 0}
            onBarClick={onBarClick}
          />
        </Col>
        <Col xs={24} lg={8}>
          <RevenueBranchHeatmap
            themeMode={themeMode}
            token={token}
            branchHourlyMatrix={revenueData?.branchHourlyMatrix || []}
            onCellClick={onCellClick}
          />
        </Col>
      </Row>
    </div>
  );
}
