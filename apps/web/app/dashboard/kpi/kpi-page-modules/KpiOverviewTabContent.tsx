'use client';

import React from 'react';
import { Col, Row } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { KPISummary, LeaderboardEntry, OutcomeBreakdown, SafeAny } from '@mos-lab/shared';
import { KpiCallBreakdownCard } from './KpiCallBreakdownCard';
import { KpiLeaderboardSection } from './KpiLeaderboardSection';
import { KpiSalaryPaystubCard } from './KpiSalaryPaystubCard';
import { KpiStatsOverviewGrid } from './KpiStatsOverviewGrid';
import type { KpiRole } from './kpi-page.utils';

export interface KpiOverviewTabContentProps {
  summary: KPISummary | null;
  breakdown: OutcomeBreakdown | null;
  trendsSlot: React.ReactNode;
  isAdmin: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardColumns: ColumnsType<LeaderboardEntry>;
  selectedRole: KpiRole;
  token: SafeAny;
}

export function KpiOverviewTabContent({
  summary,
  breakdown,
  trendsSlot,
  isAdmin,
  leaderboard,
  leaderboardColumns,
  selectedRole,
  token,
}: KpiOverviewTabContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <KpiStatsOverviewGrid summary={summary} />

      {summary?.salary && <KpiSalaryPaystubCard salary={summary.salary} />}

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={16}>
          {trendsSlot}
        </Col>
        <Col xs={24} lg={8}>
          <KpiCallBreakdownCard breakdown={breakdown} />
        </Col>
      </Row>

      {isAdmin && (
        <KpiLeaderboardSection
          leaderboard={leaderboard}
          leaderboardColumns={leaderboardColumns}
          selectedRole={selectedRole}
          token={token}
        />
      )}
    </div>
  );
}
