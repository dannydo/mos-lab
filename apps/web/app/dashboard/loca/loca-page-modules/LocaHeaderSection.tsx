'use client';

import React, { useMemo } from 'react';
import { Select, Space, Typography } from 'antd';
import { CalendarPlus, Heart } from 'lucide-react';
import { vietnameseSearchFilter, type Staff } from '@mos-lab/shared';
import { AppIcon, IconButton } from '~/components/ui';
import { buildBookerSelectOptions } from './locaPageUtils';

const { Title, Text } = Typography;

export interface LocaHeaderSectionProps {
  themeMode: 'light' | 'dark';
  currentUser: Staff | null;
  assignedStaffId: string | number;
  staffList: Staff[];
  onAssignedStaffChange: (value: string | number) => void;
  onOpenNewBooking: () => void;
}

export function LocaHeaderSection({
  themeMode,
  currentUser,
  assignedStaffId,
  staffList,
  onAssignedStaffChange,
  onOpenNewBooking,
}: LocaHeaderSectionProps) {
  const isDark = themeMode === 'dark';
  const canFilterStaff = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const staffOptions = useMemo(() => buildBookerSelectOptions(staffList), [staffList]);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <Title
          level={2}
          className={`m-0 flex items-center gap-2 font-bold tracking-wide ${
            isDark ? 'text-[var(--color-primary)]' : 'text-amber-800'
          }`}
        >
          <AppIcon icon={Heart} size={22} className="shrink-0 text-rose-500" />
          <span>Chiến Dịch LoCa</span>
        </Title>
        <Text className="mt-1 block text-sm text-[var(--mos-text-secondary)]">
          Hệ thống chăm sóc đặc biệt dành cho khách hàng Combo Live (còn hạn, còn lần sử dụng).
        </Text>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Space wrap>
          {canFilterStaff && (
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              placeholder="Chọn Booker/Telesales"
              value={assignedStaffId}
              onChange={(val) => onAssignedStaffChange(val)}
              className="w-[200px]"
              options={staffOptions}
            />
          )}
          <IconButton label="Đặt lịch mới" icon={CalendarPlus} tone="primary" onClick={onOpenNewBooking} />
        </Space>
      </div>
    </div>
  );
}
