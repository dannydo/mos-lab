'use client';

import React from 'react';
import { Button, DatePicker, Radio, Select, Space, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { AppIcon, TableSettingsTrigger } from '~/components/ui';
import { DAILY_CALLS_SCOPE_OPTIONS } from './dailyCallsTableConstants';
import type { DailyCallsScope, DailyCallsToolbarProps } from './dailyCallsTableTypes';

export function DailyCallsToolbar({
  selectedDate,
  scope,
  isAdmin,
  staffList,
  selectedStaffId,
  loading,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
  onScopeChange,
  onStaffChange,
  onOpenConfig,
  onRefresh,
}: DailyCallsToolbarProps) {
  return (
    <div className="daily-calls-toolbar flex flex-row flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--mos-border-secondary)] bg-neutral-50 px-4 py-3 dark:bg-gray-900">
      <Space wrap className="daily-calls-toolbar-controls" size="middle">
        <Space.Compact>
          <Button aria-label="Ngày trước" icon={<AppIcon icon={ChevronLeft} size="action" />} onClick={onPrevDay} />
          <DatePicker
            value={selectedDate}
            onChange={onDateChange}
            format="DD/MM/YYYY"
            allowClear={false}
            suffixIcon={<AppIcon icon={CalendarDays} size="disclosure" />}
            className="w-[130px] text-center"
          />
          <Button aria-label="Ngày sau" icon={<AppIcon icon={ChevronRight} size="action" />} onClick={onNextDay} />
        </Space.Compact>

        <Button type="default" onClick={onToday} disabled={selectedDate.isSame(dayjs(), 'day')}>
          Hôm nay
        </Button>

        <Radio.Group
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as DailyCallsScope)}
          optionType="button"
          buttonStyle="solid"
        >
          {DAILY_CALLS_SCOPE_OPTIONS.map((option) => (
            <Radio.Button key={option.value} value={option.value}>
              {option.label}
            </Radio.Button>
          ))}
        </Radio.Group>

        {isAdmin && scope !== 'me' && (
          <Select
            showSearch
            filterOption={vietnameseSearchFilter}
            value={selectedStaffId}
            onChange={onStaffChange}
            className="w-[180px]"
            options={[
              { value: 'all', label: 'Tất cả Booker/Staff' },
              ...staffList.map((staff) => ({
                value: staff.id.toString(),
                label: `Booker: ${staff.displayName}`,
              })),
            ]}
            popupMatchSelectWidth={false}
            placeholder="Lọc theo Booker"
          />
        )}
      </Space>

      <Space className="daily-calls-toolbar-actions">
        <TableSettingsTrigger onClick={onOpenConfig} />
        <Tooltip title="Tải lại dữ liệu">
          <Button
            type="primary"
            aria-label="Tải lại dữ liệu"
            icon={<AppIcon icon={RefreshCw} size="action" />}
            onClick={onRefresh}
            loading={loading}
          />
        </Tooltip>
      </Space>
    </div>
  );
}
