'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DataTable } from '~/components/ui';
import { OmicallLogsFiltersToolbar } from './OmicallLogsFiltersToolbar';
import { OMICALL_PAGE_SIZE_OPTIONS, type OmicallLogRow, type OmicallStaffSummary } from './omicallPageTypes';

export interface OmicallLogsTabContentProps {
  isAdmin: boolean;
  canReviewQa: boolean;
  dateRange: [Dayjs, Dayjs];
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  happyFilter: string;
  onHappyFilterChange: (value: string) => void;
  aiFilter: string;
  onAiFilterChange: (value: string) => void;
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onlyWithRecording: boolean;
  onOnlyWithRecordingChange: (checked: boolean) => void;
  staffList: OmicallStaffSummary[];
  syncingLogs: boolean;
  onSearch: () => void;
  onReset: () => void;
  onSync: () => void;
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
  canReviewQa,
  dateRange,
  onDateRangeChange,
  directionFilter,
  onDirectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  happyFilter,
  onHappyFilterChange,
  aiFilter,
  onAiFilterChange,
  staffFilter,
  onStaffFilterChange,
  searchQuery,
  onSearchQueryChange,
  onlyWithRecording,
  onOnlyWithRecordingChange,
  staffList,
  syncingLogs,
  onSearch,
  onReset,
  onSync,
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
        canReviewQa={canReviewQa}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        directionFilter={directionFilter}
        onDirectionFilterChange={onDirectionFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        happyFilter={happyFilter}
        onHappyFilterChange={onHappyFilterChange}
        aiFilter={aiFilter}
        onAiFilterChange={onAiFilterChange}
        staffFilter={staffFilter}
        onStaffFilterChange={onStaffFilterChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onlyWithRecording={onlyWithRecording}
        onOnlyWithRecordingChange={onOnlyWithRecordingChange}
        staffList={staffList}
        syncingLogs={syncingLogs}
        onSearch={onSearch}
        onReset={onReset}
        onSync={onSync}
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
