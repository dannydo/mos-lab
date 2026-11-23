'use client';

import React from 'react';
import { HardHat, MapPin, Search, X } from 'lucide-react';
import { normalizeCareerBranchFilter } from '@mos-lab/shared';
import type { CareerBranchOption } from '../../career-path.constants';
import { LashIcon, WingRoleLabel } from '../IslandGameIcon';
import { MOBILE_ROLE_TABS } from './mobileStaffSheetTypesAndHelpers';

interface MobileStaffSheetControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeRoleFilter: string;
  onRoleFilterChange: (role: string) => void;
  roleCounts: Record<string, number>;
  branchOptions: CareerBranchOption[];
  currentBranchFilter: string;
  onBranchFilterChange: (branch: string) => void;
}

export const MobileStaffSheetControls: React.FC<MobileStaffSheetControlsProps> = ({
  searchQuery,
  onSearchChange,
  activeRoleFilter,
  onRoleFilterChange,
  roleCounts,
  branchOptions,
  currentBranchFilter,
  onBranchFilterChange,
}) => (
  <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-20 backdrop-blur-md">
    {/* Search Bar */}
    <div className="relative mb-2.5">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm tên, @username hoặc chi nhánh..."
        className="w-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 pl-9 pr-8 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all"
      />
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-2.5 top-2.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:opacity-80"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>

    {/* Role Filter Tabs (Horizontal Pill Rail) */}
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold py-0.5">
      {MOBILE_ROLE_TABS.map((tab) => {
        const isActive = activeRoleFilter === tab.key;
        const count = roleCounts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onRoleFilterChange(tab.key)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 tabular-nums ${
              isActive
                ? 'bg-rose-500 text-white shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700'
            }`}
          >
            {tab.key === 'KTV' && (
              <span className="inline-flex items-center gap-1">
                <HardHat className="w-3 h-3 text-amber-500 shrink-0" />
                <span>KTV</span>
              </span>
            )}
            {tab.key === 'CV' && (
              <span className="inline-flex items-center gap-1">
                <LashIcon size={12} className="text-pink-400 shrink-0" />
                <span>CV</span>
              </span>
            )}
            {tab.key === 'CV_PLUS' && <WingRoleLabel text="CVL" iconSize={11} />}
            {tab.key === 'CV_PLUS_PLUS' && <WingRoleLabel text="CVLL" iconSize={11} />}
            {tab.key === 'ALL' && <span>Tất cả</span>}
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>

    {/* Branch Filter Pills */}
    {branchOptions.length > 1 && (
      <div
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/70"
        role="group"
        aria-label="Lọc theo chi nhánh"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
          <MapPin className="w-3 h-3 text-rose-500" />
        </span>
        {branchOptions.map((branch) => {
          const isActive =
            currentBranchFilter === branch.key ||
            (branch.key !== 'ALL' &&
              normalizeCareerBranchFilter(currentBranchFilter) !== 'ALL' &&
              normalizeCareerBranchFilter(currentBranchFilter) === normalizeCareerBranchFilter(branch.key));
          const label = branch.key === 'ALL' ? 'Tất cả chi nhánh' : branch.label;
          return (
            <button
              key={branch.key}
              type="button"
              data-testid={`mobile-branch-filter-${branch.key}`}
              aria-pressed={isActive}
              onClick={() => onBranchFilterChange(branch.key)}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer tabular-nums leading-none ${
                isActive
                  ? 'bg-rose-500 text-white shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/90 dark:hover:bg-slate-700'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono leading-none ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                }`}
              >
                {branch.count}
              </span>
            </button>
          );
        })}
      </div>
    )}
  </div>
);
