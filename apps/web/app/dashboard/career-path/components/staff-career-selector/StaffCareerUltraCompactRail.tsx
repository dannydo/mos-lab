'use client';

import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserCheck } from 'lucide-react';
import type { CareerPeriod, CareerProgressionConfig, CareerStaffSummary } from '@mos-lab/shared';
import type { CareerBranchOption } from '../../career-path.constants';
import type { CareerSelectorMode } from './staffCareerSelectorTypes';
import {
  getBananaBalance,
  getStaffComboPercent,
  getStaffOverallStatus,
  getStaffTipPercent,
  getStatusLabel,
} from './staffCareerMetrics';
import {
  BranchFilterChips,
  PeriodFilterChips,
  RailScrollButtons,
  RoleFilterChips,
  SelectorModeSwitcher,
  StaffRoleBadge,
} from './StaffCareerRoleControls';

interface StaffCareerUltraCompactRailProps {
  filteredStaff: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  currentFilter: string;
  onSelectFilter: (role: string) => void;
  branchOptions: CareerBranchOption[];
  currentBranchFilter: string;
  onSelectBranch: (branch: string) => void;
  period: CareerPeriod;
  onPeriodChange?: (period: CareerPeriod) => void;
  currentMode: CareerSelectorMode;
  onModeChange: (mode: CareerSelectorMode) => void;
  scrollRailRef: React.RefObject<HTMLDivElement | null>;
  onScrollRail: (direction: 'left' | 'right') => void;
  config?: CareerProgressionConfig;
}

export const StaffCareerUltraCompactRail: React.FC<StaffCareerUltraCompactRailProps> = ({
  filteredStaff,
  selectedStaffId,
  onSelectStaff,
  currentFilter,
  onSelectFilter,
  branchOptions,
  currentBranchFilter,
  onSelectBranch,
  period,
  onPeriodChange,
  currentMode,
  onModeChange,
  scrollRailRef,
  onScrollRail,
  config,
}) => (
  <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-2.5 shadow-sm transition-all duration-200">
    {/* Top Control Bar: Title, Count, Inline Role Chips, Period & 3-Way Mode Switcher */}
    <div className="flex items-center justify-between gap-2.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-6 h-6 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Chuyên Viên</h3>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
          {filteredStaff.length} CV
        </span>
        <RoleFilterChips currentFilter={currentFilter} onSelectFilter={onSelectFilter} variant="ultra_compact" />
        <BranchFilterChips
          branchOptions={branchOptions}
          currentBranchFilter={currentBranchFilter}
          onSelectBranch={onSelectBranch}
          compact
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <PeriodFilterChips period={period} onPeriodChange={onPeriodChange} hideOnMobile />
        <RailScrollButtons onScroll={onScrollRail} size="sm" />
        <div className="hidden md:inline-flex">
          <SelectorModeSwitcher currentMode={currentMode} onModeChange={onModeChange} />
        </div>
      </div>
    </div>

    {/* ULTRA COMPACT AVATAR ONLY RAIL */}
    <div ref={scrollRailRef} className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth">
      {filteredStaff.length === 0 ? (
        <div className="py-2 px-3 text-xs text-slate-400">Không tìm thấy Chuyên Viên nào trong danh mục này</div>
      ) : (
        filteredStaff.map((staff) => {
          const isSelected = staff.id === selectedStaffId;
          const overallStatus = getStaffOverallStatus(staff, config);
          const tipRate = getStaffTipPercent(staff);
          const balance = getBananaBalance(staff);

          return (
            <Tooltip
              key={staff.id}
              title={
                <div className="p-1 space-y-1 text-center min-w-[140px]">
                  <div className="font-bold text-xs text-white flex items-center justify-center gap-1">
                    <span>{staff.displayName}</span>
                    <StaffRoleBadge role={staff.careerRole} compact />
                  </div>
                  <div className="text-[10px] text-slate-300">
                    {staff.branchName ? `${staff.branchName} · ` : ''}
                    {getStatusLabel(overallStatus)}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 border-t border-white/10 pt-1 tabular-nums">
                    {staff.ordersCount || 0} mi ·{' '}
                    {(staff.servicesPerHour ?? staff.productivity?.servicesPerHour ?? 0).toFixed(2)}/h · {tipRate}% tip
                    · {getStaffComboPercent(staff)}% combo · {balance.toLocaleString('vi-VN')} 🍌
                  </div>
                </div>
              }
            >
              <button
                data-staff-id={staff.id}
                type="button"
                onClick={() => onSelectStaff(staff.id)}
                className={`group relative flex flex-col items-center px-1.5 py-1 rounded-2xl transition-all duration-200 shrink-0 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? 'bg-rose-500/10 dark:bg-rose-500/20 shadow-xs'
                    : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="relative">
                  <Avatar
                    src={staff.avatarUrl || undefined}
                    className={`bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-xs transition-all ${
                      isSelected
                        ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md shadow-pink-500/30'
                        : overallStatus === 'passed'
                          ? 'border-2 border-emerald-500'
                          : overallStatus === 'near'
                            ? 'border-2 border-amber-500'
                            : 'border-2 border-rose-500'
                    }`}
                    size={42}
                  >
                    {staff.displayName.slice(0, 1).toUpperCase()}
                  </Avatar>

                  {isSelected ? (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                      ✓
                    </span>
                  ) : (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        overallStatus === 'passed'
                          ? 'bg-emerald-500'
                          : overallStatus === 'near'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] truncate max-w-[58px] text-center block mt-1 transition-colors ${
                    isSelected
                      ? 'font-bold text-pink-600 dark:text-pink-400'
                      : 'font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {staff.displayName}
                </span>
              </button>
            </Tooltip>
          );
        })
      )}
    </div>
  </div>
);
