'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DataTable } from '~/components/ui';
import { OmicallDailyHeaderBar } from './OmicallDailyHeaderBar';
import { OmicallLogsFiltersToolbar } from './OmicallLogsFiltersToolbar';
import {
  OMICALL_PAGE_SIZE_OPTIONS,
  type OmicallBranchSummary,
  type OmicallDailySummary,
  type OmicallDateMode,
  type OmicallLogRow,
  type OmicallStaffSummary,
} from './omicallPageTypes';

export interface OmicallLogsTabContentProps {
  isAdmin: boolean;
  canReviewQa: boolean;
  dateMode: OmicallDateMode;
  selectedDate: Dayjs;
  dateRange: [Dayjs, Dayjs];
  summary: OmicallDailySummary;
  onDateModeChange: (mode: OmicallDateMode) => void;
  onSelectDate: (date: Dayjs) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  onQuickFilterAll: () => void;
  onQuickFilterAnswered: () => void;
  onQuickFilterHappyApproved: () => void;
  onQuickFilterHappyPending: () => void;
  onQuickFilterComplaints: () => void;
  onQuickFilterMismatch: () => void;
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  branches: OmicallBranchSummary[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  happyFilter: string;
  onHappyFilterChange: (value: string) => void;
  aiFilter: string;
  onAiFilterChange: (value: string) => void;
  aiSatisfactionFilter: string;
  onAiSatisfactionFilterChange: (value: string) => void;
  ratingSourceFilter: string;
  onRatingSourceFilterChange: (value: string) => void;
  ratingLevelFilter: string;
  onRatingLevelFilterChange: (value: string) => void;
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onlyWithRecording: boolean;
  onOnlyWithRecordingChange: (checked: boolean) => void;
  hasComplaintOnly: boolean;
  onHasComplaintOnlyChange: (checked: boolean) => void;
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
  dateMode,
  selectedDate,
  dateRange,
  summary,
  onDateModeChange,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onToday,
  onDateRangeChange,
  onQuickFilterAll,
  onQuickFilterAnswered,
  onQuickFilterHappyApproved,
  onQuickFilterHappyPending,
  onQuickFilterComplaints,
  onQuickFilterMismatch,
  branchFilter,
  onBranchFilterChange,
  branches,
  directionFilter,
  onDirectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  happyFilter,
  onHappyFilterChange,
  aiFilter,
  onAiFilterChange,
  aiSatisfactionFilter,
  onAiSatisfactionFilterChange,
  ratingSourceFilter,
  onRatingSourceFilterChange,
  ratingLevelFilter,
  onRatingLevelFilterChange,
  staffFilter,
  onStaffFilterChange,
  searchQuery,
  onSearchQueryChange,
  onlyWithRecording,
  onOnlyWithRecordingChange,
  hasComplaintOnly,
  onHasComplaintOnlyChange,
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
      <OmicallDailyHeaderBar
        dateMode={dateMode}
        selectedDate={selectedDate}
        dateRange={dateRange}
        summary={summary}
        canReviewQa={canReviewQa}
        onDateModeChange={onDateModeChange}
        onSelectDate={onSelectDate}
        onPrevDay={onPrevDay}
        onNextDay={onNextDay}
        onToday={onToday}
        onDateRangeChange={onDateRangeChange}
        onQuickFilterAll={onQuickFilterAll}
        onQuickFilterAnswered={onQuickFilterAnswered}
        onQuickFilterHappyApproved={onQuickFilterHappyApproved}
        onQuickFilterHappyPending={onQuickFilterHappyPending}
        onQuickFilterComplaints={onQuickFilterComplaints}
        onQuickFilterMismatch={onQuickFilterMismatch}
      />

      <OmicallLogsFiltersToolbar
        isAdmin={isAdmin}
        canReviewQa={canReviewQa}
        branchFilter={branchFilter}
        onBranchFilterChange={onBranchFilterChange}
        branches={branches}
        directionFilter={directionFilter}
        onDirectionFilterChange={onDirectionFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        happyFilter={happyFilter}
        onHappyFilterChange={onHappyFilterChange}
        aiFilter={aiFilter}
        onAiFilterChange={onAiFilterChange}
        aiSatisfactionFilter={aiSatisfactionFilter}
        onAiSatisfactionFilterChange={onAiSatisfactionFilterChange}
        ratingSourceFilter={ratingSourceFilter}
        onRatingSourceFilterChange={onRatingSourceFilterChange}
        ratingLevelFilter={ratingLevelFilter}
        onRatingLevelFilterChange={onRatingLevelFilterChange}
        staffFilter={staffFilter}
        onStaffFilterChange={onStaffFilterChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onlyWithRecording={onlyWithRecording}
        onOnlyWithRecordingChange={onOnlyWithRecordingChange}
        hasComplaintOnly={hasComplaintOnly}
        onHasComplaintOnlyChange={onHasComplaintOnlyChange}
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
