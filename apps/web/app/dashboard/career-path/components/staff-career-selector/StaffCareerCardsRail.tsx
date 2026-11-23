'use client';

import React from 'react';
import { Avatar } from 'antd';
import { UserCheck } from 'lucide-react';
import type { CareerPeriod, CareerProgressionConfig, CareerStaffSummary } from '@mos-lab/shared';
import type { CareerBranchOption } from '../../career-path.constants';
import type { CareerSelectorMode } from './staffCareerSelectorTypes';
import { getStaffOverallStatus, getStaffTipPercent, getStatusLabel } from './staffCareerMetrics';
import {
  BranchFilterChips,
  PeriodFilterChips,
  RailScrollButtons,
  RoleFilterChips,
  SelectorModeSwitcher,
  StaffRoleBadge,
} from './StaffCareerRoleControls';

interface StaffCareerCardsRailProps {
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

export const StaffCareerCardsRail: React.FC<StaffCareerCardsRailProps> = ({
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
  <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-3 shadow-sm transition-all duration-200">
    {/* Top Control Bar: Title, Count, Role Filters, Period & 3-Way Mode Switcher */}
    <div className="flex items-center justify-between gap-3 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 m-0">Chuyên Viên Mô Phỏng</h3>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
          {filteredStaff.length} CV
        </span>
        <RoleFilterChips currentFilter={currentFilter} onSelectFilter={onSelectFilter} variant="cards" />
        <BranchFilterChips
          branchOptions={branchOptions}
          currentBranchFilter={currentBranchFilter}
          onSelectBranch={onSelectBranch}
          compact
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <PeriodFilterChips period={period} onPeriodChange={onPeriodChange} hideOnMobile />
        <RailScrollButtons onScroll={onScrollRail} size="md" />
        <div className="hidden md:inline-flex">
          <SelectorModeSwitcher currentMode={currentMode} onModeChange={onModeChange} />
        </div>
      </div>
    </div>

    {/* Horizontal Scrollable Rail of Cards */}
    <div ref={scrollRailRef} className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth">
      {filteredStaff.length === 0 ? (
        <div className="py-3 px-4 text-xs text-slate-400">Không tìm thấy Chuyên Viên nào trong danh mục này</div>
      ) : (
        filteredStaff.map((staff) => {
          const isSelected = staff.id === selectedStaffId;
          const overallStatus = getStaffOverallStatus(staff, config);
          const tipRate = getStaffTipPercent(staff);

          return (
            <button
              key={staff.id}
              data-staff-id={staff.id}
              type="button"
              onClick={() => onSelectStaff(staff.id)}
              className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-2xl border transition-all shrink-0 cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/25'
                  : 'bg-white/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar
                  src={staff.avatarUrl || undefined}
                  size={42}
                  className={`transition-all ${
                    isSelected
                      ? overallStatus === 'passed'
                        ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-emerald-500/30'
                        : overallStatus === 'near'
                          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-amber-500/30'
                          : 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm shadow-rose-500/30'
                      : 'border border-slate-200 dark:border-slate-700 group-hover:border-pink-400'
                  }`}
                >
                  {staff.displayName.slice(0, 1).toUpperCase()}
                </Avatar>
                {isSelected ? (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                    ✓
                  </span>
                ) : (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      overallStatus === 'passed'
                        ? 'bg-emerald-500'
                        : overallStatus === 'near'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    title={getStatusLabel(overallStatus)}
                  />
                )}
              </div>

              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <span
                    className={`text-xs truncate max-w-[120px] ${
                      isSelected
                        ? 'font-black text-rose-600 dark:text-rose-400'
                        : 'font-bold text-slate-800 dark:text-slate-100'
                    }`}
                    title={staff.displayName}
                  >
                    {staff.displayName}
                  </span>
                  <span className="scale-90 origin-left shrink-0">
                    <StaffRoleBadge role={staff.careerRole} compact />
                  </span>
                  {staff.branchCode && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                        staff.branchCode === 'EP'
                          ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25'
                          : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25'
                      }`}
                    >
                      {staff.branchCode}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono mt-0.5 whitespace-nowrap tabular-nums">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{staff.ordersCount || 0} mi</span>
                  {(staff.actualWorkingHours ?? staff.productivity?.actualWorkingHours ?? 0) > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        {(staff.servicesPerHour ?? staff.productivity?.servicesPerHour ?? 0).toFixed(2)}/h
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tipRate}% tip</span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{staff.bananaCount || 0} 🍌</span>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>
);
