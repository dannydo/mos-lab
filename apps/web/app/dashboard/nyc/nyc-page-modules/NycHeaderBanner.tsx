'use client';

import React from 'react';
import { Select, Space, Typography } from 'antd';
import { CalendarPlus, CheckCircle2, Clock, Phone, User } from 'lucide-react';
import { canManageCustomerAllocation, vietnameseSearchFilter, type Staff } from '@mos-lab/shared';
import { AppIcon, IconButton, StatusTag } from '~/components/ui';
import type { NycOverallStats, NycStaffOption } from './nycPageTypes';
import { computeBookedRatePercent, computeTotalTabCustomers } from './nycPageUtils';

const { Title, Text } = Typography;

export interface NycHeaderBannerProps {
  themeMode: 'light' | 'dark';
  currentUser: Staff | null;
  tabCounts: Record<string, number>;
  overallStats: NycOverallStats;
  assignedStaffId: string | number;
  bookerStaffList: NycStaffOption[];
  onAssignedStaffChange: (value: string | number) => void;
  onOpenNewBooking: () => void;
}

export function NycHeaderBanner({
  themeMode,
  currentUser,
  tabCounts,
  overallStats,
  assignedStaffId,
  bookerStaffList,
  onAssignedStaffChange,
  onOpenNewBooking,
}: NycHeaderBannerProps) {
  const isDark = themeMode === 'dark';
  const totalCustomers = computeTotalTabCustomers(tabCounts);
  const nyc30Count = tabCounts['NYC_30'] || 0;
  const bookedRatePercent = computeBookedRatePercent(overallStats.totalBookedToday, overallStats.totalCalledToday);

  return (
    <div
      className={`mb-5 rounded-xl border p-4 transition-all duration-300 ${
        isDark
          ? 'border-gold/20 bg-gradient-to-r from-slate-900/90 via-gray-900/95 to-slate-800/90 shadow-lg shadow-black/40'
          : 'border-amber-200/60 bg-gradient-to-r from-white via-amber-50/30 to-slate-50 shadow-sm'
      }`}
    >
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Title
              level={3}
              className={`m-0 flex items-center gap-1.5 text-xl font-extrabold tracking-wide ${
                isDark ? 'text-[var(--color-primary)]' : 'text-amber-800'
              }`}
            >
              <AppIcon icon={Clock} size={18} className="shrink-0" />
              <span>CHIẾN DỊCH KHÁCH HÀNG NYC</span>
            </Title>
            <StatusTag status="gold" label="Single / Combo Hết Hạn" className="text-[11px] font-semibold" />
          </div>
          <Text className="text-xs text-[var(--mos-text-secondary)]">
            Quy trình chăm sóc đặc biệt dành cho khách hàng chưa mua gói Combo
          </Text>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3 lg:w-auto lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
              }`}
            >
              <AppIcon icon={User} size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <div>
                <div className="text-[10px] leading-none text-[var(--mos-text-secondary)]">∑ KH</div>
                <div className="text-[15px] font-extrabold leading-tight tabular-nums">{totalCustomers}</div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <AppIcon icon={Clock} size={14} className={isDark ? 'text-[var(--color-primary)]' : 'text-amber-800'} />
              <div>
                <div
                  className={`text-[10px] font-semibold leading-none ${
                    isDark ? 'text-[var(--color-primary)]' : 'text-amber-800'
                  }`}
                >
                  NYC 30
                </div>
                <div
                  className={`text-[15px] font-extrabold leading-tight tabular-nums ${
                    isDark ? 'text-[var(--color-primary)]' : 'text-amber-800'
                  }`}
                >
                  {nyc30Count}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                isDark ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <AppIcon icon={CheckCircle2} size={14} className="text-emerald-500" />
              <div>
                <div className="text-[10px] font-semibold leading-none text-emerald-500">Đã đặt lịch</div>
                <div className="text-[15px] font-extrabold leading-tight text-emerald-500 tabular-nums">
                  {bookedRatePercent}%
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                isDark ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-200 bg-blue-50'
              }`}
            >
              <AppIcon icon={Phone} size={14} className="text-blue-500" />
              <div>
                <div className="text-[10px] font-semibold leading-none text-blue-500">Đã gọi hôm nay</div>
                <div className="text-[15px] font-extrabold leading-tight text-blue-500 tabular-nums">
                  {overallStats.totalCalledToday}
                </div>
              </div>
            </div>
          </div>

          <Space wrap size="small">
            {canManageCustomerAllocation(currentUser?.role) && (
              <Select
                showSearch
                filterOption={vietnameseSearchFilter}
                placeholder="Chọn Booker"
                value={assignedStaffId}
                onChange={(val) => onAssignedStaffChange(val)}
                className="w-[160px]"
                size="middle"
                options={[
                  { value: 'ALL', label: 'Tất cả Booker' },
                  { value: 'unassigned', label: 'Chưa phân bổ' },
                  ...bookerStaffList.map((staff) => ({
                    value: staff.id.toString(),
                    label: staff.displayName,
                  })),
                ]}
              />
            )}
            <IconButton label="Đặt lịch mới" icon={CalendarPlus} tone="primary" onClick={onOpenNewBooking} />
          </Space>
        </div>
      </div>
    </div>
  );
}
