'use client';

import React from 'react';
import { Dropdown, Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, CircleUser, CreditCard, MapPin, Sparkles, Table as TableIcon } from 'lucide-react';
import {
  normalizeCareerBranchFilter,
  type CareerPeriod,
  type CareerRole,
  type CareerStaffSummary,
} from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import type { CareerBranchOption } from '../../career-path.constants';
import { WingRoleLabel } from '../IslandGameIcon';
import type { CareerSelectorMode } from './staffCareerSelectorTypes';
import { PERIOD_TABS } from './staffCareerMetrics';

export interface RoleTabItem {
  key: string;
  label: string;
  fullLabel: React.ReactNode;
}

export const ROLE_TABS: RoleTabItem[] = [
  { key: 'ALL', label: 'Tất cả', fullLabel: 'Tất cả Chuyên Viên, CC & FM' },
  { key: 'KTV', label: 'KTV', fullLabel: 'KTV Thử Việc (Tập sự & Sát hạch)' },
  { key: 'CV', label: 'CV', fullLabel: 'Chuyên Viên Mi' },
  {
    key: 'CV_PLUS',
    label: 'CVL',
    fullLabel: (
      <span className="inline-flex items-center gap-1">
        <span>Chuyên Viên ·</span>
        <WingRoleLabel text="CVL" />
        <span>(Đang triển khai)</span>
      </span>
    ),
  },
  {
    key: 'CV_PLUS_PLUS',
    label: 'CVLL',
    fullLabel: (
      <span className="inline-flex items-center gap-1">
        <span>Chuyên Viên Cấp Cao ·</span>
        <WingRoleLabel text="CVLL" />
        <span>(Đang nghiên cứu)</span>
      </span>
    ),
  },
  { key: 'CC', label: 'CC', fullLabel: 'Tư Vấn Viên CC' },
  { key: 'FM', label: 'FM', fullLabel: 'Quản Lý Tầng FM' },
];

export const StaffRoleBadge: React.FC<{ role: CareerRole; compact?: boolean }> = ({ role, compact = false }) => {
  switch (role) {
    case 'KTV':
      return (
        <StatusTag
          status="default"
          label={compact ? 'KTV' : 'KTV Thử Việc'}
          className="tabular-nums font-semibold m-0 text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        />
      );
    case 'CV':
      return (
        <StatusTag
          status="processing"
          label="CV"
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/40"
        />
      );
    case 'CV_PLUS':
      return (
        <StatusTag
          status="purple"
          label={<WingRoleLabel text="CVL" />}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
        />
      );
    case 'CV_PLUS_PLUS':
      return (
        <StatusTag
          status="gold"
          label={<WingRoleLabel text="CVLL" />}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
        />
      );
    case 'MASTER_TECH':
      return (
        <StatusTag
          status="gold"
          label={compact ? 'Master Tech' : 'Master Tech · Kỹ Thuật'}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
        />
      );
    case 'CC':
      return (
        <StatusTag
          status="orange"
          label={compact ? 'CC' : 'CC · Tư Vấn'}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
        />
      );
    case 'FM':
      return (
        <StatusTag
          status="gold"
          label={compact ? 'FM' : 'FM · Quản Lý Sàn'}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
        />
      );
    case 'CHO':
      return (
        <StatusTag
          status="purple"
          label={compact ? 'CHO' : 'CHO · Mẹ Thiên Thần'}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
        />
      );
    case 'BOSS':
      return (
        <StatusTag
          status="error"
          label={compact ? 'BOSS' : 'BOSS · Co-Owner'}
          className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0"
        />
      );
    default:
      return <StatusTag status="default" label={role} className="tabular-nums font-bold m-0 text-[10px] px-1.5 py-0" />;
  }
};

export const StaffRoleDropdown: React.FC<{
  staff: CareerStaffSummary;
  compact?: boolean;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
}> = ({ staff, compact = false, onSetRole }) => {
  if (!onSetRole) return <StaffRoleBadge role={staff.careerRole} compact={compact} />;

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: 'KTV',
            label: (
              <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span>⛑️ KTV Thử Việc</span>
                {staff.careerRole === 'KTV' && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                )}
              </span>
            ),
            disabled: staff.careerRole === 'KTV',
          },
          {
            key: 'CV',
            label: (
              <span className="font-semibold text-xs flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                <span>CV</span>
                {staff.careerRole === 'CV' && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                )}
              </span>
            ),
            disabled: staff.careerRole === 'CV',
          },
          {
            key: 'CV_PLUS',
            label: (
              <span className="font-semibold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                <WingRoleLabel text="CVL" />
                {staff.careerRole === 'CV_PLUS' && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                )}
              </span>
            ),
            disabled: staff.careerRole === 'CV_PLUS',
          },
          {
            key: 'CV_PLUS_PLUS',
            label: (
              <span className="font-semibold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <WingRoleLabel text="CVLL" />
                {staff.careerRole === 'CV_PLUS_PLUS' && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Hiện tại</span>
                )}
              </span>
            ),
            disabled: staff.careerRole === 'CV_PLUS_PLUS',
          },
        ],
        onClick: ({ key }) => {
          onSetRole(staff.id, key as CareerRole);
        },
      }}
      trigger={['click']}
    >
      <span
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center"
        title="Nhấn để đổi cấp bậc trực tiếp"
      >
        <StaffRoleBadge role={staff.careerRole} compact={compact} />
      </span>
    </Dropdown>
  );
};

export const SelectorModeSwitcher: React.FC<{
  currentMode: CareerSelectorMode;
  onModeChange: (mode: CareerSelectorMode) => void;
}> = ({ currentMode, onModeChange }) => (
  <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shrink-0">
    <Tooltip title="Chế độ Siêu Gọn: Chỉ hiển thị avatar các bạn Chuyên Viên, tối đa diện tích màn hình">
      <button
        type="button"
        data-testid="mode-ultra-compact-btn"
        onClick={() => onModeChange('ultra_compact')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'ultra_compact'
            ? 'bg-rose-500 text-white shadow-xs font-black'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
        }`}
      >
        <CircleUser className="w-3.5 h-3.5" />
        <span>Chỉ Avatar</span>
      </button>
    </Tooltip>

    <Tooltip title="Chế độ Thẻ Ngang: Hiển thị avatar kèm tên, cấp bậc và 3 chỉ số nhanh">
      <button
        type="button"
        data-testid="mode-cards-btn"
        onClick={() => onModeChange('cards')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'cards'
            ? 'bg-rose-500 text-white shadow-xs font-black'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
        }`}
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Thẻ Ngang</span>
      </button>
    </Tooltip>

    <Tooltip title="Chế độ Bảng Chỉ Số: Mở rộng xem toàn bộ các chỉ số kiểm toán của toàn salon">
      <button
        type="button"
        data-testid="mode-table-btn"
        onClick={() => onModeChange('table')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          currentMode === 'table'
            ? 'bg-rose-500 text-white shadow-xs font-black'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
        }`}
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span>Bảng Chỉ Số</span>
      </button>
    </Tooltip>
  </div>
);

export const RoleFilterChips: React.FC<{
  currentFilter: string;
  onSelectFilter: (role: string) => void;
  variant?: 'ultra_compact' | 'cards' | 'table';
}> = ({ currentFilter, onSelectFilter, variant = 'table' }) => {
  const containerClass =
    variant === 'table'
      ? 'flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full'
      : 'flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 ml-1';

  const sizeClass =
    variant === 'ultra_compact'
      ? 'px-2 py-0.5 text-[10px] cursor-pointer'
      : variant === 'cards'
        ? 'px-2.5 py-0.5 text-[11px] cursor-pointer'
        : 'px-2.5 py-1 text-xs cursor-pointer';

  return (
    <div className={containerClass}>
      {ROLE_TABS.map((tab) => {
        const isActive = currentFilter === tab.key;
        return (
          <Tooltip key={tab.key} title={tab.fullLabel}>
            <button
              type="button"
              onClick={() => onSelectFilter(tab.key)}
              className={`rounded-lg font-semibold transition-all duration-150 shrink-0 whitespace-nowrap ${sizeClass} ${
                isActive
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'bg-slate-100/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700/80'
              }`}
            >
              <WingRoleLabel text={tab.label} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export const BranchFilterChips: React.FC<{
  branchOptions: CareerBranchOption[];
  currentBranchFilter: string;
  onSelectBranch: (branch: string) => void;
  compact?: boolean;
}> = ({ branchOptions, currentBranchFilter, onSelectBranch, compact = false }) => {
  if (branchOptions.length <= 1) return null;

  return (
    <div
      className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar shrink-0 max-w-full"
      role="group"
      aria-label="Lọc theo chi nhánh"
    >
      <span className="inline-flex items-center gap-1 px-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 select-none">
        <MapPin className="w-3 h-3 text-rose-500 dark:text-rose-400" />
        {!compact && <span className="hidden xl:inline">Chi nhánh:</span>}
      </span>
      {branchOptions.map((branch) => {
        const isActive =
          currentBranchFilter === branch.key ||
          (branch.key !== 'ALL' &&
            normalizeCareerBranchFilter(currentBranchFilter) !== 'ALL' &&
            normalizeCareerBranchFilter(currentBranchFilter) === normalizeCareerBranchFilter(branch.key));
        const label = branch.key === 'ALL' ? 'Tất cả' : branch.label;
        return (
          <Tooltip
            key={branch.key}
            title={
              branch.key === 'ALL'
                ? `Tất cả chi nhánh (${branch.count} nhân sự)`
                : `Chi nhánh ${branch.label} (${branch.count} nhân sự)`
            }
          >
            <button
              type="button"
              data-testid={`branch-filter-${branch.key}`}
              aria-pressed={isActive}
              onClick={() => onSelectBranch(branch.key)}
              className={`inline-flex items-center justify-center gap-1 rounded-md font-semibold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap tabular-nums leading-none ${
                compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'
              } ${
                isActive
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[9px] px-1 py-0.5 rounded-full font-mono leading-none ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/90 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                }`}
              >
                {branch.count}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};

export const PeriodFilterChips: React.FC<{
  period: CareerPeriod;
  onPeriodChange?: (period: CareerPeriod) => void;
  hideOnMobile?: boolean;
}> = ({ period, onPeriodChange, hideOnMobile = false }) => (
  <div
    className={`${
      hideOnMobile ? 'hidden sm:flex' : 'flex'
    } items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar shrink-0`}
  >
    {PERIOD_TABS.map((tab) => {
      const isActive = (period || 'last_30_days') === tab.key;
      return (
        <Tooltip key={tab.key} title={tab.fullLabel}>
          <button
            type="button"
            onClick={() => onPeriodChange?.(tab.key)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${
              isActive
                ? 'bg-rose-500 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/70'
            }`}
          >
            {tab.label}
          </button>
        </Tooltip>
      );
    })}
  </div>
);

export const RailScrollButtons: React.FC<{
  onScroll: (direction: 'left' | 'right') => void;
  size?: 'sm' | 'md';
}> = ({ onScroll, size = 'md' }) => {
  const btnClass = size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-7 h-7 rounded-lg';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="hidden md:flex items-center gap-1">
      <Tooltip title="Cuộn sang trái (kéo ngang)">
        <button
          type="button"
          onClick={() => onScroll('left')}
          className={`${btnClass} border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs`}
        >
          <ChevronLeft className={iconClass} />
        </button>
      </Tooltip>
      <Tooltip title="Cuộn sang phải (kéo ngang)">
        <button
          type="button"
          onClick={() => onScroll('right')}
          className={`${btnClass} border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs`}
        >
          <ChevronRight className={iconClass} />
        </button>
      </Tooltip>
    </div>
  );
};
