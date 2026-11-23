'use client';

import React from 'react';
import type { SopPrepCriterionData } from '@mos-lab/shared';

interface SopPrepCriteriaTabsProps {
  criteria: SopPrepCriterionData[];
  activeCriterionId: number;
  onSelectCriterion: (criterionId: number) => void;
}

export function SopPrepCriteriaTabs({ criteria, activeCriterionId, onSelectCriterion }: SopPrepCriteriaTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="sop-prep-criteria-tabs">
      {criteria.map((crit) => {
        const isActive = crit.id === activeCriterionId;
        const evidenceCount = crit.evidenceFiles?.length || 0;

        return (
          <button
            key={crit.id}
            onClick={() => onSelectCriterion(crit.id)}
            type="button"
            className={`px-3.5 py-2.5 rounded-xl border text-left font-medium transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
            data-testid={`sop-prep-criterion-tab-${crit.id}`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {crit.order}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold leading-tight">{crit.name}</span>
              <span className={`text-[10px] tabular-nums ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                {evidenceCount} tệp minh chứng
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
