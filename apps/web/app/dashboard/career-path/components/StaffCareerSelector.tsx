'use client';

import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { Info, UserCheck } from 'lucide-react';
import type { CareerStaffSummary } from '@mos-lab/shared';
import { DataTable } from '../../../../components/ui';
import type { CareerSelectorMode, StaffCareerSelectorProps } from './staff-career-selector/staffCareerSelectorTypes';
import { getStaffOverallStatus } from './staff-career-selector/staffCareerMetrics';
import { useStaffCareerSelectorState } from './staff-career-selector/useStaffCareerSelectorState';
import {
  PeriodFilterChips,
  RoleFilterChips,
  SelectorModeSwitcher,
} from './staff-career-selector/StaffCareerRoleControls';
import { buildStaffCareerColumns } from './staff-career-selector/staffCareerColumns';
import { StaffCareerUltraCompactRail } from './staff-career-selector/StaffCareerUltraCompactRail';
import { StaffCareerCardsRail } from './staff-career-selector/StaffCareerCardsRail';
import { StaffCareerGridView } from './staff-career-selector/StaffCareerGridView';
import { StaffCareerSelectedFooter } from './staff-career-selector/StaffCareerSelectedFooter';

export type { CareerSelectorMode, StaffCareerSelectorProps };

const StaffCareerSelectorComponent: React.FC<StaffCareerSelectorProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  lastSyncedAt,
  activeRoleFilter = 'ALL',
  onRoleFilterChange,
  period = 'last_30_days',
  onPeriodChange,
  onSetRole,
  onDemote,
  actionLoading = false,
  onOpenBananaDrawer,
  isCollapsedHorizontal = false,
  onCollapseHorizontal,
  onExpandHorizontal,
  selectorMode,
  onSelectorModeChange,
  config,
}) => {
  const {
    viewMode,
    currentMode,
    handleModeChange,
    currentFilter,
    setFilter,
    scrollRailRef,
    scrollRail,
    filteredStaff,
    selectedStaff,
  } = useStaffCareerSelectorState({
    staffList,
    selectedStaffId,
    activeRoleFilter,
    onRoleFilterChange,
    isCollapsedHorizontal,
    onCollapseHorizontal,
    onExpandHorizontal,
    selectorMode,
    onSelectorModeChange,
  });

  const columns = useMemo(
    () =>
      buildStaffCareerColumns({
        selectedStaffId,
        period,
        config,
        onSetRole,
        onOpenBananaDrawer,
      }),
    [selectedStaffId, period, config, onSetRole, onOpenBananaDrawer]
  );

  if (currentMode === 'ultra_compact') {
    return (
      <StaffCareerUltraCompactRail
        filteredStaff={filteredStaff}
        selectedStaffId={selectedStaffId}
        onSelectStaff={onSelectStaff}
        currentFilter={currentFilter}
        onSelectFilter={setFilter}
        period={period}
        onPeriodChange={onPeriodChange}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        scrollRailRef={scrollRailRef}
        onScrollRail={scrollRail}
        config={config}
      />
    );
  }

  if (currentMode === 'cards' || (isCollapsedHorizontal && currentMode !== 'table')) {
    return (
      <StaffCareerCardsRail
        filteredStaff={filteredStaff}
        selectedStaffId={selectedStaffId}
        onSelectStaff={onSelectStaff}
        currentFilter={currentFilter}
        onSelectFilter={setFilter}
        period={period}
        onPeriodChange={onPeriodChange}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        scrollRailRef={scrollRailRef}
        onScrollRail={scrollRail}
        config={config}
      />
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-rose-100/60 dark:border-slate-800/80 p-4 shadow-sm mb-6 transition-all duration-200">
      {/* Header bar: Clean 2-Row Layout */}
      <div className="space-y-2.5 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        {/* Row 1: Title, Count, Info, Period Filter & 3-Way Mode Switcher */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
                Chuyên Viên Mô Phỏng
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
                {filteredStaff.length} CV
              </span>
              <Tooltip
                title="Dữ liệu đánh giá theo tháng hoàn tất gần nhất (3 tháng đối với bộ mi & combo). Bấm vào từng bạn để mô phỏng."
                placement="bottomLeft"
              >
                <span className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 inline-flex items-center">
                  <Info className="w-3.5 h-3.5" />
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <PeriodFilterChips period={period} onPeriodChange={onPeriodChange} />
            <div className="hidden md:inline-flex">
              <SelectorModeSwitcher currentMode={currentMode} onModeChange={handleModeChange} />
            </div>
          </div>
        </div>

        {/* Row 2: Full-width Role Filter Chips */}
        <RoleFilterChips currentFilter={currentFilter} onSelectFilter={setFilter} variant="table" />
      </div>

      {/* Primary View: Table with all metrics */}
      {viewMode === 'table' ? (
        <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-xs">
          <DataTable<CareerStaffSummary>
            columns={columns}
            dataSource={filteredStaff}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 520 }}
            onRow={(record) => ({
              onClick: () => onSelectStaff(record.id),
              className: 'cursor-pointer group',
            })}
            rowClassName={(record) => {
              const isSelected = record.id === selectedStaffId;
              if (!isSelected) {
                return 'cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50';
              }
              const overall = getStaffOverallStatus(record, config);
              const colorBg =
                overall === 'passed'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/40 [&>td]:!bg-emerald-500/10 dark:[&>td]:!bg-emerald-950/40'
                  : overall === 'near'
                    ? 'bg-amber-500/10 dark:bg-amber-950/40 [&>td]:!bg-amber-500/10 dark:[&>td]:!bg-amber-950/40'
                    : 'bg-rose-500/10 dark:bg-rose-950/40 [&>td]:!bg-rose-500/10 dark:[&>td]:!bg-rose-950/40';
              return `cursor-pointer transition-colors font-bold ${colorBg}`;
            }}
          />
        </div>
      ) : (
        <StaffCareerGridView
          filteredStaff={filteredStaff}
          selectedStaffId={selectedStaffId}
          onSelectStaff={onSelectStaff}
          config={config}
          onSetRole={onSetRole}
          onOpenBananaDrawer={onOpenBananaDrawer}
        />
      )}

      {/* Footer bar showing active selected staff summary */}
      {selectedStaff && (
        <StaffCareerSelectedFooter
          selectedStaff={selectedStaff}
          lastSyncedAt={lastSyncedAt}
          actionLoading={actionLoading}
          onSetRole={onSetRole}
          onDemote={onDemote}
        />
      )}
    </div>
  );
};

export const StaffCareerSelector = React.memo(StaffCareerSelectorComponent);
