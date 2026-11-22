'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { DARK_LASHES_SOP_7_STEPS_DETAILED, type PilotSopStepEmpiricalStat } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';

interface PilotSopNavigatorBarProps {
  selectedStepOrder: number | 'all';
  stats: Record<number, PilotSopStepEmpiricalStat>;
  filterQuery: string;
  onSelectAll: () => void;
  onSelectStep: (stepOrder: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFilterQueryChange: (value: string) => void;
}

export function PilotSopNavigatorBar({
  selectedStepOrder,
  stats,
  filterQuery,
  onSelectAll,
  onSelectStep,
  onExpandAll,
  onCollapseAll,
  onFilterQueryChange,
}: PilotSopNavigatorBarProps) {
  return (
    <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <button
          type="button"
          onClick={onSelectAll}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedStepOrder === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Tất cả 7 bước
        </button>

        {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
          const isSelected = selectedStepOrder === step.stepOrder;
          const st = stats[step.stepOrder];
          return (
            <button
              key={step.stepOrder}
              type="button"
              aria-label={`Bước ${step.stepOrder}: ${step.name}`}
              onClick={() => onSelectStep(step.stepOrder)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {step.stepOrder}
              </span>
              <span>{step.name}</span>
              {st && st.avgDurationSeconds > 0 && (
                <span
                  className={`text-[10px] px-1 py-0.5 rounded tabular-nums font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {Math.round(st.avgDurationSeconds / 60)}p
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Nút mở rộng / thu gọn tất cả accordion */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shrink-0">
          <button
            type="button"
            onClick={onExpandAll}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Mở rộng tất cả 7 bước"
            data-testid="expand-all-btn"
          >
            <AppIcon icon={ChevronDown} size={12} />
            <span>Mở rộng hết</span>
          </button>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={onCollapseAll}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Thu gọn tất cả các bước"
            data-testid="collapse-all-btn"
          >
            <AppIcon icon={ChevronUp} size={12} />
            <span>Thu gọn hết</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative shrink-0 w-full md:w-56">
          <input
            type="text"
            placeholder="Tìm theo bước, vật tư, lỗi..."
            value={filterQuery}
            onChange={(e) => onFilterQueryChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <AppIcon icon={Search} size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
