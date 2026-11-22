'use client';

import React from 'react';
import { Button, DatePicker, Segmented, Select } from 'antd';
import { Calendar, Users } from 'lucide-react';
import dayjs from 'dayjs';
import type { TelesaleTvJournalStaffOption, TvJournalStatusFilter, TvJournalTypeFilter } from './tvJournalTypes';

interface TvJournalFiltersBarProps {
  isDark: boolean;
  selectedDate: string;
  onDateChange: (dateStr: string) => void;
  staffFilter: string;
  onStaffFilterChange: (value: string) => void;
  staffList: TelesaleTvJournalStaffOption[];
  typeFilter: TvJournalTypeFilter;
  onTypeFilterChange: (value: TvJournalTypeFilter) => void;
  statusFilter: TvJournalStatusFilter;
  onStatusFilterChange: (value: TvJournalStatusFilter) => void;
}

/** Renders date, staff, event type, and execution status filter controls for the TV journal table. */
export const TvJournalFiltersBar: React.FC<TvJournalFiltersBarProps> = ({
  isDark,
  selectedDate,
  onDateChange,
  staffFilter,
  onStaffFilterChange,
  staffList,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  const todayStr = dayjs().format('YYYY-MM-DD');

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
        isDark ? 'bg-zinc-900/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date filter */}
        <div className="flex items-center gap-1.5">
          <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <Calendar className="w-3.5 h-3.5" />
            Ngày:
          </span>
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={(d) => {
              if (d) onDateChange(d.format('YYYY-MM-DD'));
            }}
            allowClear={false}
            className={
              isDark ? 'bg-zinc-950 border-zinc-700 text-zinc-100 rounded-lg text-xs h-8' : 'rounded-lg text-xs h-8'
            }
          />
          {selectedDate !== todayStr && (
            <Button
              size="small"
              onClick={() => onDateChange(todayStr)}
              className={`text-[11px] h-8 rounded-lg ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  : 'bg-white border-slate-300 text-slate-700 shadow-sm'
              }`}
            >
              Hôm nay
            </Button>
          )}
        </div>

        {/* Staff filter */}
        <div className="flex items-center gap-1.5">
          <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <Users className="w-3.5 h-3.5" />
            Nhân viên:
          </span>
          <Select
            value={staffFilter}
            onChange={onStaffFilterChange}
            className="w-36 text-xs h-8"
            options={[
              { label: 'Tất cả nhân viên', value: 'ALL' },
              ...staffList.map((s) => ({ label: s.name, value: String(s.legacyStaffId) })),
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Event Type Filter */}
        <Segmented
          value={typeFilter}
          onChange={(val) => onTypeFilterChange(val as TvJournalTypeFilter)}
          className={isDark ? 'bg-zinc-950 border border-zinc-800 text-xs' : 'text-xs'}
          options={[
            { label: 'Tất cả', value: 'ALL' },
            { label: 'BOOK', value: 'BOOK' },
            { label: 'DONE', value: 'DONE' },
            { label: 'MILESTONE', value: 'MILESTONE' },
          ]}
        />

        {/* Status Filter */}
        <Segmented
          value={statusFilter}
          onChange={(val) => onStatusFilterChange(val as TvJournalStatusFilter)}
          className={isDark ? 'bg-zinc-950 border border-zinc-800 text-xs' : 'text-xs'}
          options={[
            { label: 'Tất cả', value: 'ALL' },
            { label: '✅ Thành công', value: 'SUCCESS' },
            { label: '❌ Lỗi', value: 'ERROR' },
          ]}
        />
      </div>
    </div>
  );
};
