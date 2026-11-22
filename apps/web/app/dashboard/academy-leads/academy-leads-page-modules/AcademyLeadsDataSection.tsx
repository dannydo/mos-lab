'use client';

import React from 'react';
import { Button, Typography } from 'antd';
import type { AcademyFollowUpTask, AcademyLead } from '@mos-lab/shared';
import { DataSection, DataTable } from '~/components/ui';
import type { AcademyWorkspaceTab } from '../hooks/useAcademySalesWorkspace';
import {
  buildAcademyFollowUpColumns,
  buildAcademyLeadColumns,
  followUpMobileCard,
  leadMobileCard,
} from './academyLeadsColumns';

const { Text } = Typography;

export interface AcademyLeadsDataSectionProps {
  activeTab: AcademyWorkspaceTab;
  leads: AcademyLead[];
  followUps: AcademyFollowUpTask[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number, pageSize: number) => void;
  onRefresh: () => void;
  onOpenLead: (lead: AcademyLead) => void;
  onCompleteFollowUp: (task: AcademyFollowUpTask) => Promise<void>;
}

export function AcademyLeadsDataSection({
  activeTab,
  leads,
  followUps,
  total,
  page,
  pageSize,
  loading,
  error,
  onPageChange,
  onRefresh,
  onOpenLead,
  onCompleteFollowUp,
}: AcademyLeadsDataSectionProps) {
  const isFollowUps = activeTab === 'FOLLOW_UPS';
  const tableRows = isFollowUps ? followUps : leads;
  const sectionState = loading ? 'loading' : error ? 'error' : tableRows.length === 0 ? 'empty' : undefined;

  const leadColumns = React.useMemo(() => buildAcademyLeadColumns(onOpenLead), [onOpenLead]);
  const followUpColumns = React.useMemo(() => buildAcademyFollowUpColumns(onCompleteFollowUp), [onCompleteFollowUp]);

  const pagination = {
    current: page,
    pageSize,
    total,
    onChange: onPageChange,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (totalCount: number, range: [number, number]) =>
      `Hiển thị ${range[0]}-${range[1]} / ${totalCount.toLocaleString('vi-VN')}`,
  };

  return (
    <DataSection
      title={
        isFollowUps ? 'Hàng đợi follow-up' : activeTab === 'HOT' ? 'Danh sách ưu tiên' : 'Danh sách khách hàng Academy'
      }
      extra={
        <Text type="secondary" className="tabular-nums">
          {total.toLocaleString('vi-VN')} bản ghi
        </Text>
      }
      state={sectionState}
      stateTitle={error || (isFollowUps ? 'Chưa có follow-up theo bộ lọc' : 'Chưa có khách hàng theo bộ lọc')}
      stateDescription={error ? 'Hãy thử làm mới dữ liệu.' : undefined}
      stateExtra={error ? <Button onClick={onRefresh}>Thử lại</Button> : undefined}
    >
      {isFollowUps ? (
        <DataTable
          rowKey="id"
          columns={followUpColumns}
          dataSource={followUps}
          loading={loading}
          scroll={{ x: 780 }}
          columnPriority={{
            lead: 'primary',
            content: 'primary',
            due: 'secondary',
            assignee: 'secondary',
            status: 'secondary',
            action: 'primary',
          }}
          mobileRenderer={(task) => followUpMobileCard(task, onOpenLead)}
          pagination={pagination}
        />
      ) : (
        <DataTable
          rowKey="id"
          columns={leadColumns}
          dataSource={leads}
          loading={loading}
          scroll={{ x: 1080 }}
          stickyPrimaryColumn
          columnPriority={{
            lead: 'primary',
            status: 'primary',
            course: 'secondary',
            owner: 'secondary',
            schedule: 'tertiary',
            hot: 'secondary',
            updatedAt: 'tertiary',
          }}
          mobileRenderer={(lead) => leadMobileCard(lead, onOpenLead)}
          pagination={pagination}
        />
      )}
    </DataSection>
  );
}
