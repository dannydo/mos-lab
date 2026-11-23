'use client';

import React from 'react';
import { Button, Segmented, Tooltip, Typography } from 'antd';
import { Calendar, LayoutGrid, List, Plus } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { BranchCounts, ScheduleViewMode } from './scheduleCalendarTypes';

const { Title, Text } = Typography;

interface ScheduleCalendarHeaderProps {
  usesAgendaComposition: boolean;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  branchCounts: BranchCounts;
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  onNewBooking: () => void;
}

export function ScheduleCalendarHeader({
  usesAgendaComposition,
  selectedBranch,
  onBranchChange,
  branchCounts,
  viewMode,
  onViewModeChange,
  onNewBooking,
}: ScheduleCalendarHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <AppIcon icon={Calendar} size="md" />
          </div>
          <div>
            <Title level={4} className="!mb-0 !font-extrabold text-slate-800 dark:text-slate-100">
              Lịch & Công Suất Phục Vụ
            </Title>
            <Text type="secondary" className="text-xs">
              Theo dõi trực quan lịch hẹn, công suất lấp đầy và tổng quan các ngày tiếp theo
            </Text>
          </div>
        </div>
      </div>

      {/* Action Controls & View Mode Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip title="Đặt lịch mới">
          <Button
            type="primary"
            aria-label="Đặt lịch mới"
            icon={
              <span aria-hidden className="relative inline-flex size-4 items-center justify-center">
                <AppIcon icon={Calendar} size="sm" />
                <span className="absolute -right-1 -bottom-1 inline-flex size-2 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-white dark:ring-slate-900">
                  <Plus className="size-1.5" strokeWidth={3} />
                </span>
              </span>
            }
            className="!size-8 !min-w-8 !rounded-lg !border-none !bg-emerald-500 !p-0 text-white shadow-sm shadow-emerald-500/20 hover:!bg-emerald-600"
            onClick={onNewBooking}
          />
        </Tooltip>

        <Segmented
          value={selectedBranch}
          onChange={(val) => onBranchChange(val as string)}
          options={[
            {
              label: usesAgendaComposition ? `Tất cả (${branchCounts.all})` : `Tất cả Chi nhánh (${branchCounts.all})`,
              value: 'all',
            },
            { label: `Đề Thám (${branchCounts.DT})`, value: 'DT' },
            {
              label: usesAgendaComposition ? `Estella (${branchCounts.EP})` : `Estella Place (${branchCounts.EP})`,
              value: 'EP',
            },
          ]}
          className="schedule-calendar-branch-control bg-slate-100 dark:bg-slate-800 p-1 font-semibold text-xs"
        />

        <Segmented
          value={viewMode}
          onChange={(val) => onViewModeChange(val as ScheduleViewMode)}
          options={
            usesAgendaComposition
              ? [
                  { label: 'Agenda', value: 'list', icon: <AppIcon icon={List} size="sm" /> },
                  { label: 'Lịch', value: 'grid', icon: <AppIcon icon={Calendar} size="sm" /> },
                ]
              : [
                  { label: 'Overview Đa cột', value: 'overview', icon: <AppIcon icon={LayoutGrid} size="sm" /> },
                  { label: 'Danh sách', value: 'list', icon: <AppIcon icon={List} size="sm" /> },
                  { label: 'Lịch lưới', value: 'grid', icon: <AppIcon icon={Calendar} size="sm" /> },
                ]
          }
          className="schedule-calendar-view-control bg-slate-100 dark:bg-slate-800 p-1 font-medium"
        />
      </div>
    </div>
  );
}
