'use client';

import React from 'react';
import { Button, DatePicker, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon, PageToolbar } from '~/components/ui';
import { AppointmentColumnSettingsPopover } from './AppointmentColumnSettingsPopover';
import type { AppointmentColumnConfigMap, AppointmentTabKey, AppointmentViewMode } from './appointmentsPageConstants';

const { RangePicker } = DatePicker;

export interface AppointmentsToolbarProps {
  isAdmin: boolean;
  selectedStaffId: string;
  onStaffChange: (staffId: string) => void;
  staffList: Array<{ id: number | string; displayName: string }>;
  viewMode: AppointmentViewMode;
  onViewModeChange: (mode: AppointmentViewMode) => void;
  onClearCustomRange: () => void;
  onNavigate: (direction: number) => void;
  periodLabel: string;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  dateRange: [Dayjs, Dayjs];
  onCustomRangeChange: (range: [Dayjs, Dayjs]) => void;
  activeTab: AppointmentTabKey;
  columnConfig: AppointmentColumnConfigMap;
  onSaveColumnConfig: (nextConfig: AppointmentColumnConfigMap) => void;
}

const VIEW_MODE_OPTIONS: ReadonlyArray<{ value: AppointmentViewMode; label: string }> = [
  { value: 'month', label: 'Tháng' },
  { value: 'week', label: 'Tuần' },
  { value: 'day', label: 'Ngày' },
];

export function AppointmentsToolbar({
  isAdmin,
  selectedStaffId,
  onStaffChange,
  staffList,
  viewMode,
  onViewModeChange,
  onClearCustomRange,
  onNavigate,
  periodLabel,
  pickerOpen,
  onPickerOpenChange,
  dateRange,
  onCustomRangeChange,
  activeTab,
  columnConfig,
  onSaveColumnConfig,
}: AppointmentsToolbarProps) {
  return (
    <PageToolbar
      className="appointments-table-toolbar"
      primary={
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              value={selectedStaffId}
              onChange={(value) => {
                onStaffChange(value);
                localStorage.setItem('mos_appointments_selectedStaffId', value);
              }}
              className="w-[180px]"
              options={[
                { value: 'all', label: 'Tất cả Booker' },
                ...staffList.map((staff) => ({ value: staff.id.toString(), label: staff.displayName })),
              ]}
              placeholder="Chọn Booker"
            />
          )}

          <Space wrap>
            <Space.Compact>
              {VIEW_MODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type={viewMode === option.value ? 'primary' : 'default'}
                  onClick={() => {
                    onViewModeChange(option.value);
                    onClearCustomRange();
                    localStorage.setItem('mos_appointments_viewMode', option.value);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Space.Compact>

            <Space.Compact>
              <Button
                icon={<AppIcon icon={ChevronLeft} size="action" />}
                onClick={() => onNavigate(-1)}
                aria-label="Ngày trước đó"
                title="Ngày trước đó"
              />
              <div className="relative inline-block">
                <Button
                  onClick={() => onPickerOpenChange(true)}
                  className="font-semibold min-w-[210px] text-center inline-flex items-center justify-center gap-2 text-slate-900 dark:text-slate-100 tabular-nums"
                >
                  <span>{periodLabel}</span>
                  <AppIcon icon={Calendar} size="action" className="text-[var(--ant-color-primary)]" />
                </Button>
                {pickerOpen && (
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        onCustomRangeChange([dates[0], dates[1]]);
                        onPickerOpenChange(false);
                      }
                    }}
                    format="DD/MM/YYYY"
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) onPickerOpenChange(false);
                    }}
                    className="absolute top-0 left-0 w-0 h-0 p-0 border-0 invisible pointer-events-none"
                  />
                )}
              </div>
              <Button
                icon={<AppIcon icon={ChevronRight} size="action" />}
                onClick={() => onNavigate(1)}
                aria-label="Ngày tiếp theo"
                title="Ngày tiếp theo"
              />
            </Space.Compact>
          </Space>
        </div>
      }
      actions={
        <AppointmentColumnSettingsPopover
          activeTab={activeTab}
          columnConfig={columnConfig}
          onSaveColumnConfig={onSaveColumnConfig}
        />
      }
    />
  );
}
