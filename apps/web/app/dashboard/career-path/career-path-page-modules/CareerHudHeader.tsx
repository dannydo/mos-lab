'use client';

import React from 'react';
import { Avatar, Progress } from 'antd';
import { ChevronDown, GraduationCap, Settings } from 'lucide-react';
import type { BananaTransactionCategory, StaffCareerStatus } from '@mos-lab/shared';
import { WingRoleLabel } from '../components/IslandGameIcon';
import { formatCareerRoleName } from '../career-path.constants';
import { computeExpProgressPercent } from './careerPathTypesAndHelpers';

interface CareerHudHeaderProps {
  selectedStaffStatus: StaffCareerStatus | null;
  selectedStaffId: number | null;
  minOrders: number;
  canConfigure: boolean;
  onPlayPop: () => void;
  onOpenMobileStaffDrawer: () => void;
  onOpenMapDrawer: () => void;
  onOpenBananaDrawer: (staffId: number | null, category: BananaTransactionCategory) => void;
  onOpenConfigDrawer: () => void;
  onOpenMentorshipModal?: () => void;
}

export const CareerHudHeader: React.FC<CareerHudHeaderProps> = ({
  selectedStaffStatus,
  selectedStaffId,
  minOrders,
  canConfigure,
  onPlayPop,
  onOpenMobileStaffDrawer,
  onOpenMapDrawer,
  onOpenBananaDrawer,
  onOpenConfigDrawer,
  onOpenMentorshipModal,
}) => {
  const staffRealOrders = selectedStaffStatus?.metrics?.ordersCount || 0;
  const expPercent = computeExpProgressPercent(staffRealOrders, minOrders);
  const realBalance =
    typeof selectedStaffStatus?.metrics?.bananaBalance === 'number' ? selectedStaffStatus.metrics.bananaBalance : 0;
  const isNegativeBalance = realBalance < 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-pink-200 dark:border-slate-800 px-3 py-2.5 shadow-xs">
      <div className="w-full max-w-[1880px] mx-auto flex items-center justify-between">
        {/* Player Avatar & Status (Click to open staff picker on mobile) */}
        <button
          type="button"
          onClick={() => {
            onPlayPop();
            onOpenMobileStaffDrawer();
          }}
          className="flex items-center gap-2 text-left transition min-w-0 hover:opacity-90 active:scale-98 cursor-pointer group"
          title="Nhấn để đổi nhân sự"
        >
          <div className="relative shrink-0 w-10 h-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-purple-400 p-0.5 shadow-md shadow-pink-500/25 group-hover:ring-2 group-hover:ring-pink-400">
              <Avatar
                src={selectedStaffStatus?.avatarUrl || undefined}
                shape="square"
                className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-lg overflow-hidden font-black text-white border-0 [&>img]:object-cover [&>img]:w-full [&>img]:h-full"
              >
                {selectedStaffStatus?.staffName ? selectedStaffStatus.staffName.slice(0, 1).toUpperCase() : '🧝‍♀️'}
              </Avatar>
            </div>
            <span className="absolute -bottom-0.5 -right-1 text-[9px] font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full border border-white dark:border-slate-900 shadow-sm whitespace-nowrap inline-flex items-center justify-center leading-none z-10">
              <WingRoleLabel
                text={formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)}
                iconSize={9.5}
              />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1 truncate">
                <span className="truncate max-w-[95px] xs:max-w-[120px] sm:max-w-none">
                  {selectedStaffStatus?.staffName || 'Đang chọn nhân sự...'}
                </span>
                <ChevronDown className="w-3 h-3 text-pink-500 dark:text-pink-400 shrink-0 md:hidden" />
              </span>
              {/* Desktop-only full role badge (hidden on mobile to prevent clutter and weird oval wrap) */}
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 whitespace-nowrap shrink-0">
                <span>✨</span>
                <WingRoleLabel text={formatCareerRoleName(selectedStaffStatus?.currentRole || 'CV', true)} />
              </span>
            </div>

            {/* Mini EXP Bar */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-12 sm:w-24 shrink-0 flex items-center">
                <Progress
                  percent={expPercent}
                  size="small"
                  showInfo={false}
                  strokeColor={{ from: 'rgb(236, 72, 153)', to: 'rgb(168, 85, 247)' }}
                  className="m-0 w-full leading-none [&_.ant-progress-inner]:bg-slate-200 dark:[&_.ant-progress-inner]:bg-slate-800 [&_.ant-progress-inner]:border [&_.ant-progress-inner]:border-slate-300 dark:[&_.ant-progress-inner]:border-slate-700"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold tabular-nums whitespace-nowrap">
                {expPercent}%<span className="hidden sm:inline"> EXP</span>
              </span>
            </div>
          </div>
        </button>

        {/* Currencies, Islands & Admin Setting Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onPlayPop();
              onOpenMapDrawer();
            }}
            className="h-8 px-2.5 rounded-full bg-pink-500/15 dark:bg-pink-500/25 border border-pink-500/40 text-pink-700 dark:text-pink-300 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1 hover:bg-pink-500/30"
          >
            <span className="text-xs">🗺️</span>
            <span className="text-[11px] font-bold">7 Đảo</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenBananaDrawer(selectedStaffId, 'ALL')}
            className={`h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold font-mono shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
              isNegativeBalance
                ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:border-rose-400'
                : 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 hover:border-amber-400'
            }`}
            title={`Số dư chuối của ${selectedStaffStatus?.staffName || 'nhân sự'}: ${realBalance.toLocaleString('vi-VN')} · Nhấn để xem sao kê lịch sử chuối`}
          >
            <span className="text-xs">🍌</span>
            <span className="tabular-nums">{realBalance.toLocaleString('vi-VN')}</span>
          </button>

          {canConfigure && onOpenMentorshipModal && (
            <button
              type="button"
              onClick={() => {
                onPlayPop();
                onOpenMentorshipModal();
              }}
              className="h-8 px-2.5 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs active:scale-95 transition hover:border-amber-500 shrink-0 cursor-pointer flex items-center gap-1"
              title="Gán Mentor 1-kèm-1 & Chốt tốt nghiệp Training CVL"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mentor CVL</span>
            </button>
          )}

          {canConfigure && (
            <button
              type="button"
              onClick={() => {
                onPlayPop();
                onOpenConfigDrawer();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:scale-90 transition hover:border-pink-400 shrink-0 cursor-pointer"
              title="Cấu hình quy chuẩn thăng cấp"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
