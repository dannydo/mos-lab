'use client';

import React from 'react';
import { Button, ConfigProvider, DatePicker, Input, Segmented, Tooltip, Typography } from 'antd';
import type dayjs from 'dayjs';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  MessageSquare,
  Phone,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { LocaBookingStatusFilter, LocaContactSubTab, LocaDatePreset } from '../hooks/use-loca-data/types';

const { Text } = Typography;

export interface LocaFilterBarProps {
  themeMode: 'light' | 'dark';
  activeTab: string;
  contactSubTab: LocaContactSubTab;
  datePreset: LocaDatePreset;
  selectedDate: dayjs.Dayjs;
  bookingStatusFilter: LocaBookingStatusFilter;
  searchQuery: string;
  onContactSubTabChange: (val: LocaContactSubTab) => void;
  onDatePresetChange: (val: LocaDatePreset) => void;
  onSelectedDateChange: (date: dayjs.Dayjs) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onBookingStatusFilterChange: (val: LocaBookingStatusFilter) => void;
  onSearchChange: (val: string) => void;
  onOpenTableConfig: () => void;
}

export function LocaFilterBar({
  themeMode,
  activeTab,
  contactSubTab,
  datePreset,
  selectedDate,
  bookingStatusFilter,
  searchQuery,
  onContactSubTabChange,
  onDatePresetChange,
  onSelectedDateChange,
  onPrevDate,
  onNextDate,
  onBookingStatusFilterChange,
  onSearchChange,
  onOpenTableConfig,
}: LocaFilterBarProps) {
  const isDark = themeMode === 'dark';

  return (
    <>
      {/* CONTACTED SUB-TAB SELECTOR */}
      {activeTab === 'CONTACTED' && (
        <div className="flex items-center gap-3 py-1">
          <Text className="text-[13px] font-semibold">Hình thức liên hệ:</Text>
          <Segmented
            value={contactSubTab}
            onChange={(val) => onContactSubTabChange(val as LocaContactSubTab)}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'CALL', label: 'Cuộc gọi', icon: <AppIcon icon={Phone} size={13} /> },
              { value: 'TEXT', label: 'Tin nhắn', icon: <AppIcon icon={MessageSquare} size={13} /> },
            ]}
            className="bg-[var(--mos-surface-muted)]"
          />
        </div>
      )}

      {/* MINIMALIST FILTER BAR (SINGLE ROW - RIGHT ALIGNED) */}
      <div className="flex w-full flex-wrap items-center justify-end gap-2.5 border-b border-slate-100 py-2 dark:border-slate-800/60">
        {activeTab === 'NEW_LOCA' && (
          <ConfigProvider
            theme={{
              components: {
                Segmented: {
                  itemSelectedBg: 'rgb(212, 168, 75)',
                  itemSelectedColor: 'rgb(0, 0, 0)',
                  trackBg: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)',
                  itemColor: isDark ? 'rgb(170, 170, 170)' : 'rgb(85, 85, 85)',
                },
              },
            }}
          >
            <Segmented
              value={datePreset}
              onChange={(val) => onDatePresetChange(val as LocaDatePreset)}
              options={[
                { value: 'month', label: 'Tháng' },
                { value: 'week', label: 'Tuần' },
                { value: 'today', label: 'Ngày' },
              ]}
              className="flex h-8 items-center font-semibold"
            />
          </ConfigProvider>
        )}

        {activeTab === 'NEW_LOCA' && (
          <div className="flex h-8 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-500/5 transition-colors hover:border-slate-300 dark:border-slate-800/60 dark:hover:border-slate-700">
            <Button
              type="text"
              size="small"
              aria-label="Kỳ trước"
              icon={<AppIcon icon={ChevronLeft} size={12} className="text-neutral-500" />}
              onClick={onPrevDate}
              className="flex h-full w-7 items-center justify-center rounded-none hover:bg-slate-500/10"
            />
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                if (date) onSelectedDateChange(date);
              }}
              picker={datePreset === 'month' ? 'month' : datePreset === 'week' ? 'week' : 'date'}
              format={
                datePreset === 'month' ? '[Tháng] MM/YYYY' : datePreset === 'week' ? '[Tuần] ww/YYYY' : 'DD/MM/YYYY'
              }
              allowClear={false}
              variant="borderless"
              suffixIcon={<AppIcon icon={Calendar} size={13} className="text-amber-500" />}
              className="w-[150px] px-2 text-center text-[13px] font-semibold tabular-nums"
            />
            <Button
              type="text"
              size="small"
              aria-label="Kỳ sau"
              icon={<AppIcon icon={ChevronRight} size={12} className="text-neutral-500" />}
              onClick={onNextDate}
              className="flex h-full w-7 items-center justify-center rounded-none hover:bg-slate-500/10"
            />
          </div>
        )}

        {/* Minimalist Booking Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <Tooltip title="Tất cả khách hàng (Cả đã book & chưa book)">
            <button
              type="button"
              aria-label="Tất cả khách hàng (Cả đã book và chưa book)"
              aria-pressed={bookingStatusFilter === 'ALL'}
              onClick={() => onBookingStatusFilterChange('ALL')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all ${
                bookingStatusFilter === 'ALL'
                  ? 'border-blue-300 bg-blue-50 text-blue-600 shadow-xs dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-400'
                  : 'border-slate-200/60 bg-slate-100/60 text-slate-400 hover:bg-slate-200/60 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-500 dark:hover:bg-slate-800/80'
              }`}
            >
              <AppIcon
                icon={List}
                size={14}
                className={bookingStatusFilter === 'ALL' ? 'text-blue-600 dark:text-blue-400' : ''}
              />
            </button>
          </Tooltip>

          <Tooltip title="Đã book (Có lịch hẹn tương lai)">
            <button
              type="button"
              aria-label="Đã book (Có lịch hẹn tương lai)"
              aria-pressed={bookingStatusFilter === 'BOOKED'}
              onClick={() => onBookingStatusFilterChange('BOOKED')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all ${
                bookingStatusFilter === 'BOOKED'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-600 shadow-xs dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'border-slate-200/60 bg-slate-100/60 text-slate-400 hover:bg-slate-200/60 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-500 dark:hover:bg-slate-800/80'
              }`}
            >
              <AppIcon
                icon={Calendar}
                size={14}
                className={bookingStatusFilter === 'BOOKED' ? 'text-emerald-600 dark:text-emerald-400' : ''}
              />
            </button>
          </Tooltip>

          <Tooltip title="Chưa book (Chưa có lịch hẹn tương lai)">
            <button
              type="button"
              aria-label="Chưa book (Chưa có lịch hẹn tương lai)"
              aria-pressed={bookingStatusFilter === 'NOT_BOOKED'}
              onClick={() => onBookingStatusFilterChange('NOT_BOOKED')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-all ${
                bookingStatusFilter === 'NOT_BOOKED'
                  ? 'border-rose-300 bg-rose-50 text-rose-600 shadow-xs dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'border-slate-200/60 bg-slate-100/60 text-slate-400 hover:bg-slate-200/60 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-500 dark:hover:bg-slate-800/80'
              }`}
            >
              <AppIcon
                icon={XCircle}
                size={14}
                className={bookingStatusFilter === 'NOT_BOOKED' ? 'text-rose-600 dark:text-rose-400' : ''}
              />
            </button>
          </Tooltip>
        </div>

        {/* Borderless Search Input */}
        <div className="flex h-8 max-w-[280px] items-center rounded-lg border border-slate-200 bg-slate-500/5 px-2.5 transition-colors focus-within:border-slate-300 dark:border-slate-800/60 dark:focus-within:border-slate-700">
          <AppIcon icon={Search} size={14} className="mr-1.5 text-neutral-400" />
          <Input
            placeholder="Tìm khách hàng..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            variant="borderless"
            className="w-[180px] p-0 text-[13px]"
          />
        </div>

        {/* Action buttons (Settings) */}
        <Tooltip title="Cấu hình cột bảng">
          <Button
            type="primary"
            aria-label="Cấu hình cột bảng"
            icon={<AppIcon icon={Settings} size={14} className="text-white" />}
            onClick={onOpenTableConfig}
            className={`flex h-8 w-8 items-center justify-center rounded-lg p-0 ${
              isDark
                ? 'border-amber-500 bg-amber-500 hover:border-amber-400 hover:bg-amber-400'
                : 'border-blue-600 bg-blue-600 hover:border-blue-500 hover:bg-blue-500'
            }`}
          />
        </Tooltip>
      </div>
    </>
  );
}
