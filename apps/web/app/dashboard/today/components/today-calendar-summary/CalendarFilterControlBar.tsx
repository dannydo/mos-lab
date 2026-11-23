'use client';

import { Button, Card, Select, Space } from 'antd';
import { Calendar, DollarSign, Settings } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import { getCalendarCardSurfaceClass } from './calendarSummaryConstants';
import type { BookerOptionGroup, CalendarBranchFilter, CalendarThemeMode } from './types';

export interface CalendarFilterControlBarProps {
  themeMode: CalendarThemeMode;
  periodLabel: string;
  bookingBranch: CalendarBranchFilter;
  setBookingBranch: (branch: CalendarBranchFilter) => void;
  selectedBooker: string | null;
  setSelectedBooker: (booker: string | null) => void;
  groupedBookerOptions: BookerOptionGroup[];
  setTeamModalVisible?: (visible: boolean) => void;
  showRevenueView?: boolean;
  setShowRevenueView?: (val: boolean) => void;
}

export function CalendarFilterControlBar({
  themeMode,
  periodLabel,
  bookingBranch,
  setBookingBranch,
  selectedBooker,
  setSelectedBooker,
  groupedBookerOptions,
  setTeamModalVisible,
  showRevenueView,
  setShowRevenueView,
}: CalendarFilterControlBarProps) {
  const cardSurfaceClass = getCalendarCardSurfaceClass(themeMode);
  const titleTextClass =
    themeMode === 'dark' ? 'text-slate-100 dark:text-slate-100' : 'text-slate-900 dark:text-slate-100';
  const labelTextClass =
    themeMode === 'dark' ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <Card size="small" className={`${cardSurfaceClass} rounded-[10px] [&_.ant-card-body]:px-4 [&_.ant-card-body]:py-3`}>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-[18px] h-[18px] text-amber-500 shrink-0" />
          <span className={`font-bold text-[15px] ${titleTextClass}`}>Tổng Quan Lịch Phân Giờ ({periodLabel})</span>
        </div>

        <Space size="middle" className="flex-wrap">
          <Space size="small">
            <span className={`text-xs ${labelTextClass}`}>Chi nhánh:</span>
            <Select
              aria-label="Lọc chi nhánh lịch hôm nay"
              size="small"
              value={bookingBranch}
              onChange={setBookingBranch}
              className="w-[170px]"
              options={[
                { value: 'all', label: 'Tất cả chi nhánh' },
                { value: 'detham', label: 'Chi nhánh Đề Thám' },
                { value: 'estella', label: 'Chi nhánh Estella Place' },
              ]}
            />
          </Space>

          <Space size="small">
            <span className={`text-xs ${labelTextClass}`}>Đội / Booker:</span>
            <Select
              aria-label="Lọc đội hoặc Booker lịch hôm nay"
              size="small"
              showSearch
              allowClear
              placeholder="Tất cả Đội Nhóm & Booker"
              value={selectedBooker || 'all'}
              onChange={(val) => setSelectedBooker(val === 'all' || !val ? null : val)}
              filterOption={vietnameseSearchFilter}
              className="w-[210px]"
              options={groupedBookerOptions}
            />
            {setTeamModalVisible && (
              <Button
                size="small"
                icon={<Settings className="w-3.5 h-3.5" />}
                onClick={() => setTeamModalVisible(true)}
                title="Cấu hình Phân Đội Nhóm Booker"
              />
            )}
          </Space>

          {setShowRevenueView && (
            <Button
              size="small"
              type={showRevenueView ? 'primary' : 'default'}
              icon={<DollarSign className="w-3.5 h-3.5" />}
              onClick={() => setShowRevenueView(!showRevenueView)}
              className={
                showRevenueView
                  ? 'font-bold bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white hover:opacity-90'
                  : 'font-bold'
              }
            >
              {showRevenueView ? '💰 Ẩn Doanh Thu' : '💰 Xem Doanh Thu'}
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
}
