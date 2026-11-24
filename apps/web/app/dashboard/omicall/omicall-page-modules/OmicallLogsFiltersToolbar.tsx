'use client';

import React from 'react';
import { Button, Checkbox, DatePicker, Input, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import {
  AI_STATUS_FILTER_OPTIONS,
  CALL_STATUS_FILTER_OPTIONS,
  DIRECTION_FILTER_OPTIONS,
  HAPPY_CALL_FILTER_OPTIONS,
  type OmicallStaffSummary,
} from './omicallPageTypes';

const { RangePicker } = DatePicker;

export interface OmicallLogsFiltersToolbarProps {
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
}

export function OmicallLogsFiltersToolbar({
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
}: OmicallLogsFiltersToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Tìm SĐT / Call UUID:</span>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onPressEnter={onSearch}
          allowClear
          placeholder="Nhập SĐT hoặc UUID..."
          className="w-full sm:w-[210px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Khoảng thời gian:</span>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              onDateRangeChange([dates[0], dates[1]]);
            }
          }}
          format="DD/MM/YYYY"
          className="w-full sm:w-[250px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Chiều gọi:</span>
        <Select
          value={directionFilter}
          onChange={onDirectionFilterChange}
          className="w-full sm:w-[165px]"
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
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Trạng thái Happy Call:</span>
        <Select
          value={happyFilter}
          onChange={onHappyFilterChange}
          className="w-full sm:w-[150px]"
          options={HAPPY_CALL_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Trạng thái AI:</span>
        <Select
          value={aiFilter}
          onChange={onAiFilterChange}
          className="w-full sm:w-[170px]"
          options={AI_STATUS_FILTER_OPTIONS}
        />
      </div>

      {canReviewQa && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--mos-text-secondary)]">Nhân viên:</span>
          <Select
            value={staffFilter}
            onChange={onStaffFilterChange}
            className="w-full sm:w-[170px]"
            showSearch
            filterOption={vietnameseSearchFilter}
            options={[
              { value: 'ALL', label: 'Tất cả nhân viên' },
              ...staffList.map((staff) => ({ value: staff.id.toString(), label: staff.displayName })),
            ]}
          />
        </div>
      )}

      <div className="pb-1">
        <Checkbox checked={onlyWithRecording} onChange={(e) => onOnlyWithRecordingChange(e.target.checked)}>
          Chỉ hiện cuộc có ghi âm
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
