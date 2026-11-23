'use client';

import React from 'react';
import { Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry, SafeAny } from '@mos-lab/shared';
import { AppIcon, DataTable } from '~/components/ui';
import { LeaderboardSummary } from '../components/LeaderboardSummary';
import type { KpiRole } from './kpi-page.utils';

export interface KpiLeaderboardSectionProps {
  leaderboard: LeaderboardEntry[];
  leaderboardColumns: ColumnsType<LeaderboardEntry>;
  selectedRole: KpiRole;
  token: SafeAny;
}

export function KpiLeaderboardSection({
  leaderboard,
  leaderboardColumns,
  selectedRole,
  token,
}: KpiLeaderboardSectionProps) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 text-[var(--mos-text)]">
          <AppIcon
            icon={Trophy}
            size="sm"
            className={selectedRole === 'oc' ? 'text-purple-600 dark:text-purple-400' : 'text-[var(--mos-accent)]'}
          />
          Bảng Xếp Hạng Doanh Thu Thưởng (
          {selectedRole === 'oc' ? 'Online Consultant Leaderboard' : 'Booker Leaderboard'})
        </span>
      }
      variant="outlined"
    >
      <DataTable<LeaderboardEntry>
        dataSource={leaderboard}
        columns={leaderboardColumns}
        rowKey="staffId"
        pagination={false}
        bordered
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Chưa có dữ liệu thống kê nhân viên' }}
        summary={(pageData) => <LeaderboardSummary pageData={pageData} selectedRole={selectedRole} token={token} />}
      />
    </Card>
  );
}
