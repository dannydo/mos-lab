'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DataTable } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { OmicallDailyHeaderBar } from './OmicallDailyHeaderBar';
import { OmicallMobileCallList } from './OmicallMobileCallList';
import { isAnsweredOrRecordedCall } from './OmicallRatingChips';
import {
  OMICALL_PAGE_SIZE_OPTIONS,
  type OmicallBranchSummary,
  type OmicallDailySummary,
  type OmicallDateMode,
  type OmicallFilterChip,
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
  activeChips: OmicallFilterChip[];
  staffList: OmicallStaffSummary[];
  syncingLogs: boolean;
  onSearch: () => void;
  onReset: () => void;
  onSync: () => void;
  columns: ColumnsType<OmicallLogRow>;
  logs: OmicallLogRow[];
  loadingLogs: boolean;
  playingLogId: number | null;
  onTogglePlay: (logId: number) => void;
  onOpenQaDrawer: (logId: number) => void;
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
  activeChips,
  staffList,
  syncingLogs,
  onSearch,
  onReset,
  onSync,
  columns,
  logs,
  loadingLogs,
  playingLogId,
  onTogglePlay,
  onOpenQaDrawer,
  currentPage,
  pageSize,
  totalLogs,
  onPageChange,
}: OmicallLogsTabContentProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  return (
    <div>
      <OmicallDailyHeaderBar
        isAdmin={isAdmin}
        canReviewQa={canReviewQa}
        isMobile={isMobile}
        dateMode={dateMode}
        selectedDate={selectedDate}
        dateRange={dateRange}
        summary={summary}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearch={onSearch}
        branchFilter={branchFilter}
        onBranchFilterChange={onBranchFilterChange}
        branches={branches}
        staffFilter={staffFilter}
        onStaffFilterChange={onStaffFilterChange}
        staffList={staffList}
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
        onlyWithRecording={onlyWithRecording}
        onOnlyWithRecordingChange={onOnlyWithRecordingChange}
        hasComplaintOnly={hasComplaintOnly}
        onHasComplaintOnlyChange={onHasComplaintOnlyChange}
        activeChips={activeChips}
        syncingLogs={syncingLogs}
        onSync={onSync}
        onReset={onReset}
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

      {isMobile ? (
        <OmicallMobileCallList
          logs={logs}
          loading={loadingLogs}
          dateMode={dateMode}
          playingLogId={playingLogId}
          currentPage={currentPage}
          pageSize={pageSize}
          totalLogs={totalLogs}
          onTogglePlay={onTogglePlay}
          onOpenQaDrawer={onOpenQaDrawer}
          onPageChange={onPageChange}
        />
      ) : (
        <DataTable<OmicallLogRow>
          columns={columns}
          dataSource={logs}
          loading={loadingLogs}
          rowKey="id"
          rowClassName={(record) => {
            const isHappy = !record.aiLockedUntilSelfRated && record.happyCallStatus === 'APPROVED';
            if (isHappy) return 'cursor-pointer bg-emerald-500/[0.04]';
            if (!isAnsweredOrRecordedCall(record))
              return 'cursor-pointer opacity-55 hover:opacity-100 transition-opacity';
            return 'cursor-pointer';
          }}
          onRow={(record) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest('button, a, audio, input')) return;
              onOpenQaDrawer(record.id);
            },
          })}
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
      )}
    </div>
  );
}
