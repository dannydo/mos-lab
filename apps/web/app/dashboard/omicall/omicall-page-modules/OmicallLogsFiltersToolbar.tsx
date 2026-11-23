'use client';

import React from 'react';
import { Button, DatePicker, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { RotateCcw, Search } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import {
  AI_STATUS_FILTER_OPTIONS,
  CALL_STATUS_FILTER_OPTIONS,
  HAPPY_CALL_FILTER_OPTIONS,
  type OmicallStaffSummary,
} from './omicallPageTypes';

const { RangePicker } = DatePicker;

export interface OmicallLogsFiltersToolbarProps {
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
}

export function OmicallLogsFiltersToolbar({
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
}: OmicallLogsFiltersToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] p-4">
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
          className="w-full sm:w-[260px]"
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
          className="w-full sm:w-[150px]"
          options={AI_STATUS_FILTER_OPTIONS}
        />
      </div>

      {isAdmin && (
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

      <div className="mt-auto flex h-full items-end">
        <Space>
          <Button type="primary" icon={<AppIcon icon={Search} size={14} />} onClick={onSearch}>
            Tìm kiếm
          </Button>
          <Button icon={<AppIcon icon={RotateCcw} size={14} />} onClick={onReset}>
            Lọc lại
          </Button>
        </Space>
      </div>
    </div>
  );
}
