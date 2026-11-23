'use client';

import React from 'react';
import { Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Clock, X } from 'lucide-react';
import type { LocaStaffActivityLogItem } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard } from '~/components/ui';
import { formatActiveFilterSummary } from './activityTabHelpers';

const { Text } = Typography;

export interface LocaStaffActivityLogTableCardProps {
  columns: ColumnsType<LocaStaffActivityLogItem>;
  logs: LocaStaffActivityLogItem[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  actionTypeFilter: string;
  selectedTouchpointKey?: string;
  onClearFilters: () => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export const LocaStaffActivityLogTableCard: React.FC<LocaStaffActivityLogTableCardProps> = ({
  columns,
  logs,
  loading,
  total,
  currentPage,
  pageSize,
  actionTypeFilter,
  selectedTouchpointKey,
  onClearFilters,
  onPageChange,
}) => {
  const hasActiveFilter =
    actionTypeFilter !== 'ALL' || Boolean(selectedTouchpointKey && selectedTouchpointKey !== 'ALL');
  const activeFilterSummary = hasActiveFilter ? formatActiveFilterSummary(actionTypeFilter, selectedTouchpointKey) : '';

  return (
    <SectionCard
      title={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Space className="text-base font-semibold">
            <AppIcon icon={Clock} size={16} className="text-amber-500" />
            <span>Nhật ký Hành động Chi tiết Nhân viên</span>
          </Space>
          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/35 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer transition-colors"
              >
                <span>Đang lọc: {activeFilterSummary} (Bấm ✖ để xóa lọc)</span>
                <AppIcon icon={X} size={12} />
              </button>
            ) : null}
            <Text type="secondary" className="text-xs font-normal tabular-nums">
              Tổng số tương tác: <strong className="text-blue-500">{total}</strong>
            </Text>
          </div>
        </div>
      }
    >
      <DataTable<LocaStaffActivityLogItem>
        size="small"
        columns={columns}
        dataSource={logs}
        rowKey={(record, index) => (record.id ? `${record.id}_${index}` : String(index))}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (t, range) => `${range[0]}-${range[1]} của ${t} mục`,
          onChange: onPageChange,
        }}
        scroll={{ x: 900 }}
        className="custom-activity-table"
      />
    </SectionCard>
  );
};
