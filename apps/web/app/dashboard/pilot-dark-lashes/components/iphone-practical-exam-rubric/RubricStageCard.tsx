'use client';

import React from 'react';
import { Card } from 'antd';
import { AlertTriangle, Check, XCircle } from 'lucide-react';
import type { RubricOptionIcon, RubricOptionTone, RubricStageDefinition } from './rubric-config';

interface RubricStageCardProps {
  stage: RubricStageDefinition;
  currentScore: number;
  onSelectScore: (value: number) => void;
}

const ACTIVE_TONE_CLASSES: Record<RubricOptionTone, string> = {
  emerald: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/50',
  amber: 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500/50',
  rose: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/50',
};

const INACTIVE_OPTION_CLASS =
  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

function renderOptionIcon(icon: RubricOptionIcon, size: number) {
  if (icon === 'check') return <Check size={size} />;
  if (icon === 'alert') return <AlertTriangle size={size} />;
  return <XCircle size={size} />;
}

export function RubricStageCard({ stage, currentScore, onSelectScore }: RubricStageCardProps) {
  const isTwoCol = stage.columns === 2;
  const gridClass = isTwoCol ? 'grid grid-cols-2 gap-2 pt-1' : 'grid grid-cols-3 gap-1.5 pt-1';
  const baseBtnClass = isTwoCol
    ? 'py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px]'
    : 'py-3 px-1 rounded-xl text-[11.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer min-h-[48px] text-center leading-tight';
  const iconSize = isTwoCol ? 16 : 15;

  return (
    <Card
      variant="outlined"
      className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="font-bold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {stage.headerLabel}
          </span>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {currentScore}/{stage.maxScore} điểm
          </span>
        </div>

        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 m-0">{stage.title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-snug">
          {stage.bullets.map((bullet, idx) => (
            <React.Fragment key={bullet}>
              {idx > 0 && <br />}• {bullet}
            </React.Fragment>
          ))}
        </p>

        <div className={gridClass}>
          {stage.options.map((option) => {
            const isSelected = currentScore === option.value;
            const stateClass = isSelected ? ACTIVE_TONE_CLASSES[option.tone] : INACTIVE_OPTION_CLASS;
            return (
              <button
                key={option.testId}
                type="button"
                onClick={() => onSelectScore(option.value)}
                className={`${baseBtnClass} ${stateClass}`}
                data-testid={option.testId}
              >
                {renderOptionIcon(option.icon, iconSize)}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
