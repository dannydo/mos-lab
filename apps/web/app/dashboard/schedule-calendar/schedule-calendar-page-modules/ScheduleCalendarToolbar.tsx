'use client';

import React from 'react';
import { Button, DatePicker, Select, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { AppIcon, SearchField } from '~/components/ui';
import {
  CHANNEL_FILTER_OPTIONS,
  DATE_RANGE_PRESET_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type ScheduleStatsSummary,
  type StaffOption,
} from './scheduleCalendarTypes';
import { ScheduleSummaryStrip } from './ScheduleSummaryStrip';

const { RangePicker } = DatePicker;

interface ScheduleCalendarToolbarProps {
  loading: boolean;
  customRange: [Dayjs, Dayjs] | null;
  computedDateRange: [Dayjs, Dayjs];
  dateRangePreset: string;
  onPrevRange: () => void;
  onNextRange: () => void;
  onCustomRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onPresetChange: (preset: string) => void;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStaffId: string;
  onStaffChange: (value: string) => void;
  staffList: StaffOption[];
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedChannel: string;
  onChannelChange: (value: string) => void;
  statsSummary: ScheduleStatsSummary;
}

export function ScheduleCalendarToolbar({
  loading,
  customRange,
  computedDateRange,
  dateRangePreset,
  onPrevRange,
  onNextRange,
  onCustomRangeChange,
  onPresetChange,
  onRefresh,
  searchQuery,
  onSearchChange,
  selectedStaffId,
  onStaffChange,
  staffList,
  selectedStatus,
  onStatusChange,
  selectedChannel,
  onChannelChange,
  statsSummary,
}: ScheduleCalendarToolbarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
      {/* One compact time toolbar keeps navigation, preset and custom range in one place. */}
      <div className="schedule-calendar-date-toolbar flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <Tooltip title="Khoảng lịch trước">
          <Button
            icon={<AppIcon icon={ChevronLeft} size="sm" />}
            aria-label="Khoảng lịch trước"
            onClick={onPrevRange}
            className="!size-8 !min-w-8 !rounded-lg !p-0"
          />
        </Tooltip>

        <RangePicker
          aria-label="Chọn khoảng ngày tìm kiếm"
          className="schedule-calendar-range-picker !h-8 w-full sm:!w-[232px]"
          format="DD/MM/YYYY"
          value={customRange ?? computedDateRange}
          onChange={onCustomRangeChange}
        />

        <Tooltip title="Khoảng lịch tiếp theo">
          <Button
            icon={<AppIcon icon={ChevronRight} size="sm" />}
            aria-label="Khoảng lịch tiếp theo"
            onClick={onNextRange}
            className="!size-8 !min-w-8 !rounded-lg !p-0"
          />
        </Tooltip>

        <Select
          aria-label="Chọn khoảng xem lịch"
          value={dateRangePreset}
          onChange={onPresetChange}
          className="!h-8 w-full sm:!w-36"
          options={[
            ...DATE_RANGE_PRESET_OPTIONS,
            ...(dateRangePreset === 'custom' ? [{ value: 'custom', label: 'Tùy chọn' }] : []),
          ]}
        />

        <Tooltip title="Tải lại dữ liệu">
          <Button
            icon={<AppIcon icon={RotateCw} size="sm" />}
            aria-label="Tải lại dữ liệu lịch hẹn"
            onClick={onRefresh}
            loading={loading}
            className="!size-8 !min-w-8 !rounded-lg !p-0"
          />
        </Tooltip>
      </div>

      {/* Multi-dimensional Filters Row */}
      <div className="schedule-calendar-filters flex flex-wrap items-center w-full">
        <SearchField
          behavior="filter"
          id="calendar-search-input"
          name="calendarSearch"
          aria-label="Tìm theo Tên KH, SĐT, Dịch vụ"
          placeholder="Tìm theo Tên KH, SĐT, Dịch vụ..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="schedule-calendar-filter-search"
          allowClear
        />

        <Select
          aria-label="Lọc theo Chuyên viên"
          value={selectedStaffId}
          onChange={onStaffChange}
          className="schedule-calendar-filter-control"
          options={[
            { value: 'all', label: 'Tất cả Chuyên viên' },
            ...staffList.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />

        <Select
          aria-label="Lọc theo trạng thái"
          value={selectedStatus}
          onChange={onStatusChange}
          className="schedule-calendar-filter-control"
          options={[...STATUS_FILTER_OPTIONS]}
        />

        <Select
          aria-label="Lọc theo Kênh đặt"
          value={selectedChannel}
          onChange={onChannelChange}
          className="schedule-calendar-filter-control"
          options={[...CHANNEL_FILTER_OPTIONS]}
        />
      </div>

      <ScheduleSummaryStrip statsSummary={statsSummary} />
    </div>
  );
}
