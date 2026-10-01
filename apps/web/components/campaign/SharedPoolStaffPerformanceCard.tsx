'use client';

import React from 'react';
import { Card, Tag, Tooltip, Avatar } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  AimOutlined,
  TrophyOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { CampaignStaffPerformance, CampaignStaffPerformanceResponse } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';

interface SharedPoolStaffPerformanceCardProps {
  performance?: CampaignStaffPerformanceResponse | null;
  loading?: boolean;
  selectedStaffId?: string | number | null;
  onSelectStaff?: (staffId: string) => void;
}

export const SharedPoolStaffPerformanceCard: React.FC<SharedPoolStaffPerformanceCardProps> = ({
  performance,
  loading = false,
  selectedStaffId,
  onSelectStaff,
}) => {
  const { themeMode } = useTheme();

  if (!performance || !performance.items || performance.items.length === 0) {
    return null;
  }

  const { items, summary, totalMembers } = performance;

  return (
    <div className="mt-3.5 pt-3.5 border-t border-purple-200/50 dark:border-purple-900/30">
      {/* Title & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs uppercase tracking-wide text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
            <TeamOutlined className="text-purple-500" />
            <span>KẾT QUẢ KHAI THÁC THEO NHÂN VIÊN</span>
          </span>
          <Tag color="purple" className="m-0 font-semibold text-[11px] px-2 py-0.2 rounded-md">
            {totalMembers} nhân sự
          </Tag>
        </div>

        {/* Campaign-wide aggregate summary */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 px-3 py-1 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-xs flex-wrap">
          <span>
            Tổng khai thác:{' '}
            <strong className="tabular-nums font-bold text-slate-800 dark:text-slate-100">
              {summary.totalExploited}
            </strong>{' '}
            KH
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            Pickup (Nghe máy):{' '}
            <strong className="tabular-nums font-bold text-amber-600 dark:text-amber-400">{summary.totalPickup}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            Book:{' '}
            <strong className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalBooked}
            </strong>
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            Tỷ lệ Data → Book:{' '}
            <Tag
              color={
                summary.avgConversionRate >= 5 ? 'success' : summary.avgConversionRate > 0 ? 'processing' : 'default'
              }
              className="m-0 font-bold tabular-nums text-[11px] px-1.5 py-0"
            >
              {summary.avgConversionRate}%
            </Tag>
          </span>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map((staff, index) => {
          const isSelected =
            selectedStaffId !== undefined &&
            selectedStaffId !== null &&
            String(selectedStaffId) === String(staff.staffId);
          const hasBookings = staff.bookedCount > 0;

          return (
            <div
              key={staff.staffId}
              onClick={() => onSelectStaff && onSelectStaff(String(staff.staffId))}
              className={`p-3 rounded-xl border transition-all duration-200 ${
                onSelectStaff ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
              } ${
                isSelected
                  ? 'border-purple-500 bg-purple-50/90 dark:bg-purple-950/60 ring-2 ring-purple-400/50 shadow-sm'
                  : themeMode === 'dark'
                    ? 'bg-slate-900/60 border-slate-800 hover:border-purple-800/80 hover:bg-slate-850'
                    : 'bg-white border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              {/* Member Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    size={28}
                    src={staff.avatarUrl || undefined}
                    icon={!staff.avatarUrl && <UserOutlined />}
                    className="shrink-0 bg-purple-500 text-white"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {staff.staffName}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      ID #{staff.staffId}
                      {staff.claimedCount ? ` · Nhận ${staff.claimedCount}` : ''}
                    </div>
                  </div>
                </div>

                {/* Rank Badge */}
                {index === 0 && hasBookings && (
                  <Tooltip title="Nhân viên chốt nhiều lịch hẹn nhất">
                    <span className="inline-flex items-center justify-center text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      👑 Top 1
                    </span>
                  </Tooltip>
                )}
                {index === 1 && hasBookings && (
                  <span className="inline-flex items-center justify-center text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                    🥈 Top 2
                  </span>
                )}
                {index === 2 && hasBookings && (
                  <span className="inline-flex items-center justify-center text-xs bg-amber-700/10 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded-md font-semibold shrink-0">
                    🥉 Top 3
                  </span>
                )}
              </div>

              {/* 4 Core Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2.5">
                {/* Metric 1: Đã khai thác */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                    <span>Đã khai thác</span>
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold tabular-nums font-mono text-slate-800 dark:text-slate-100">
                      {staff.exploitedCount}
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">KH</span>
                  </div>
                </div>

                {/* Metric 2: Pickup (Nghe máy) */}
                <div className="flex flex-col">
                  <Tooltip title="Số cuộc gọi khách hàng bốc máy / nghe máy">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium cursor-help">
                      <span>Pickup</span>
                      <PhoneOutlined className="text-[9px]" />
                    </span>
                  </Tooltip>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold tabular-nums font-mono text-amber-600 dark:text-amber-400">
                      {staff.pickupCount}
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">lượt</span>
                  </div>
                </div>

                {/* Metric 3: Book */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <span>Book</span>
                    <CheckCircleOutlined className="text-[9px]" />
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold tabular-nums font-mono text-emerald-600 dark:text-emerald-400">
                      {staff.bookedCount}
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">đơn</span>
                  </div>
                </div>

                {/* Metric 4: Tỷ lệ Data → Book */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-medium">
                    <span>Data → Book</span>
                  </span>
                  <div className="mt-0.5">
                    <Tag
                      color={staff.conversionRate >= 5 ? 'success' : staff.conversionRate > 0 ? 'purple' : 'default'}
                      className="m-0 font-bold tabular-nums font-mono text-xs px-1.5 py-0"
                    >
                      {staff.conversionRate}%
                    </Tag>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
