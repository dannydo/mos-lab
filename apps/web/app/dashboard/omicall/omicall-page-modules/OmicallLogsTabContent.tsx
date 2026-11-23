'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DataTable } from '~/components/ui';
import { OmicallLogsFiltersToolbar } from './OmicallLogsFiltersToolbar';
import { OMICALL_PAGE_SIZE_OPTIONS, type OmicallLogRow, type OmicallStaffSummary } from './omicallPageTypes';

export interface OmicallLogsTabContentProps {
  isAdmin: boolean;
  dateRange: [Dayjs, Dayjs];
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  happyFilter: string;
  onHappyFilterChange: (value: string) => void;
  aiFilter: string;
  onAiFilterChange: (value: string) => void;
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  staffList: OmicallStaffSummary[];
  onSearch: () => void;
  onReset: () => void;
  columns: ColumnsType<OmicallLogRow>;
  logs: OmicallLogRow[];
  loadingLogs: boolean;
  currentPage: number;
  pageSize: number;
  totalLogs: number;
  onPageChange: (page: number, size: number) => void;
}

export function OmicallLogsTabContent({
  isAdmin,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  happyFilter,
  onHappyFilterChange,
  aiFilter,
  onAiFilterChange,
  staffFilter,
  onStaffFilterChange,
  staffList,
  onSearch,
  onReset,
  columns,
  logs,
  loadingLogs,
  currentPage,
  pageSize,
  totalLogs,
  onPageChange,
}: OmicallLogsTabContentProps) {
  return (
    <div>
      <OmicallLogsFiltersToolbar
        isAdmin={isAdmin}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        happyFilter={happyFilter}
        onHappyFilterChange={onHappyFilterChange}
        aiFilter={aiFilter}
        onAiFilterChange={onAiFilterChange}
        staffFilter={staffFilter}
        onStaffFilterChange={onStaffFilterChange}
        staffList={staffList}
        onSearch={onSearch}
        onReset={onReset}
      />

      <DataTable<OmicallLogRow>
        columns={columns}
        dataSource={logs}
        loading={loadingLogs}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize,
          total: totalLogs,
          showSizeChanger: true,
          pageSizeOptions: OMICALL_PAGE_SIZE_OPTIONS,
          onChange: onPageChange,
          locale: { items_per_page: '/ trang' },
        }}
      />
    </div>
  );
}
