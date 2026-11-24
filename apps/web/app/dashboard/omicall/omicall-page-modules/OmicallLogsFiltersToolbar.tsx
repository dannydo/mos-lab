'use client';

import React from 'react';
import { Button, Checkbox, Input, Select, Space } from 'antd';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import {
  AI_SATISFACTION_FILTER_OPTIONS,
  AI_STATUS_FILTER_OPTIONS,
  CALL_STATUS_FILTER_OPTIONS,
  DIRECTION_FILTER_OPTIONS,
  HAPPY_CALL_FILTER_OPTIONS,
  RATING_LEVEL_OPTIONS,
  RATING_SOURCE_OPTIONS,
  type OmicallBranchSummary,
  type OmicallStaffSummary,
} from './omicallPageTypes';

export interface OmicallLogsFiltersToolbarProps {
  isAdmin: boolean;
  canReviewQa: boolean;
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
}

export function OmicallLogsFiltersToolbar({
  isAdmin,
  canReviewQa,
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
}: OmicallLogsFiltersToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3.5 rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Tìm SĐT / Call UUID:</span>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onPressEnter={onSearch}
          allowClear
          placeholder="Nhập SĐT hoặc UUID..."
          className="w-full sm:w-[195px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Chi nhánh:</span>
        <Select
          value={branchFilter}
          onChange={onBranchFilterChange}
          className="w-full sm:w-[175px]"
          showSearch
          filterOption={vietnameseSearchFilter}
          options={[
            { value: 'ALL', label: 'Tất cả chi nhánh' },
            ...branches.map((branch) => ({ value: branch.id.toString(), label: branch.name })),
          ]}
        />
      </div>

      {canReviewQa && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Nhân viên:</span>
          <Select
            value={staffFilter}
            onChange={onStaffFilterChange}
            className="w-full sm:w-[175px]"
            showSearch
            filterOption={vietnameseSearchFilter}
            options={[
              { value: 'ALL', label: 'Tất cả nhân viên' },
              ...staffList.map((staff) => ({ value: staff.id.toString(), label: staff.displayName })),
            ]}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Chiều gọi:</span>
        <Select
          value={directionFilter}
          onChange={onDirectionFilterChange}
          className="w-full sm:w-[155px]"
          options={DIRECTION_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Kết quả cuộc gọi:</span>
        <Select
          value={statusFilter}
          onChange={onStatusFilterChange}
          className="w-full sm:w-[140px]"
          options={CALL_STATUS_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Happy Call:</span>
        <Select
          value={happyFilter}
          onChange={onHappyFilterChange}
          className="w-full sm:w-[150px]"
          options={HAPPY_CALL_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Hài lòng (AI):</span>
        <Select
          value={aiSatisfactionFilter}
          onChange={onAiSatisfactionFilterChange}
          className="w-full sm:w-[180px]"
          options={AI_SATISFACTION_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Nguồn đánh giá:</span>
        <Select
          value={ratingSourceFilter}
          onChange={onRatingSourceFilterChange}
          className="w-full sm:w-[190px]"
          options={RATING_SOURCE_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Mức hài lòng đánh giá:</span>
        <Select
          value={ratingLevelFilter}
          onChange={onRatingLevelFilterChange}
          className="w-full sm:w-[195px]"
          options={RATING_LEVEL_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Trạng thái AI:</span>
        <Select
          value={aiFilter}
          onChange={onAiFilterChange}
          className="w-full sm:w-[160px]"
          options={AI_STATUS_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pb-1">
        <Checkbox checked={onlyWithRecording} onChange={(e) => onOnlyWithRecordingChange(e.target.checked)}>
          Có ghi âm
        </Checkbox>
        <Checkbox checked={hasComplaintOnly} onChange={(e) => onHasComplaintOnlyChange(e.target.checked)}>
          Chỉ khiếu nại
        </Checkbox>
      </div>

      <div className="ml-auto flex items-center">
        <Space wrap>
          <Button type="primary" icon={<AppIcon icon={Search} size={14} />} onClick={onSearch}>
            Tìm kiếm
          </Button>
          <Button icon={<AppIcon icon={RotateCcw} size={14} />} onClick={onReset}>
            Lọc lại
          </Button>
          {isAdmin && (
            <Button
              icon={<AppIcon icon={RefreshCw} size={14} className={syncingLogs ? 'animate-spin' : ''} />}
              loading={syncingLogs}
              onClick={onSync}
            >
              Đồng bộ OmiCall
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}
