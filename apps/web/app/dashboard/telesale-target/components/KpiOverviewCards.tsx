'use client';

import React from 'react';
import { TelesaleTodayTvMonitorCard } from './TelesaleTodayTvMonitorCard';
import { KpiStaffLeaderboardCard } from './kpi-overview-cards/KpiStaffLeaderboardCard';
import { KpiTeamMonthCard } from './kpi-overview-cards/KpiTeamMonthCard';
import type { KpiCardProps } from './kpi-overview-cards/kpiOverviewTypes';

export type { KpiCardProps, KpiStaffLeaderboardCardProps } from './kpi-overview-cards/kpiOverviewTypes';
export { KpiStaffLeaderboardCard } from './kpi-overview-cards/KpiStaffLeaderboardCard';
export { KpiTeamMonthCard } from './kpi-overview-cards/KpiTeamMonthCard';

// ============================================================================
// LEGACY WRAPPER (FOR TEST COMPATIBILITY)
// ============================================================================
export const KpiOverviewCards: React.FC<KpiCardProps> = ({ overview, onOpenTvFullscreen }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 w-full items-stretch h-full">
      <KpiTeamMonthCard overview={overview} />
      <TelesaleTodayTvMonitorCard overview={overview} onOpenFullscreen={onOpenTvFullscreen} />
      <KpiStaffLeaderboardCard overview={overview} isFullVertical={false} />
    </div>
  );
};

export default KpiOverviewCards;
