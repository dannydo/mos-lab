'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { Eye } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';

export type CcIncomeCellTone = 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan';

const TONE_CLASSES: Record<CcIncomeCellTone, { container: string; value: string; forecast: string; eye: string }> = {
  blue: {
    container: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    value: 'text-blue-600 dark:text-blue-400',
    forecast: 'text-blue-400/90',
    eye: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    container: 'hover:bg-purple-500/10 hover:border-purple-500/30',
    value: 'text-purple-600 dark:text-purple-300',
    forecast: 'text-purple-400/90',
    eye: 'text-purple-600 dark:text-purple-300',
  },
  emerald: {
    container: 'hover:bg-emerald-500/10 hover:border-emerald-500/30',
    value: 'text-emerald-600 dark:text-emerald-400',
    forecast: 'text-emerald-400/90',
    eye: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    container: 'hover:bg-amber-500/10 hover:border-amber-500/30',
    value: 'text-amber-600 dark:text-amber-300',
    forecast: 'text-amber-400/90',
    eye: 'text-amber-600 dark:text-amber-300',
  },
  cyan: {
    container: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
    value: 'text-cyan-600 dark:text-cyan-300',
    forecast: 'text-cyan-400/90',
    eye: 'text-cyan-600 dark:text-cyan-300',
  },
};

interface CcIncomeClickableCellProps {
  tone: CcIncomeCellTone;
  tooltipTitle: string;
  ariaLabel: string;
  formattedValue: string;
  projectedValue?: number;
  showForecast: boolean;
  periodNoun: string;
  subLabel: string;
  onClick: () => void;
}

export function CcIncomeClickableCell({
  tone,
  tooltipTitle,
  ariaLabel,
  formattedValue,
  projectedValue = 0,
  showForecast,
  periodNoun,
  subLabel,
  onClick,
}: CcIncomeClickableCellProps) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <Tooltip title={tooltipTitle}>
      <div
        className={`text-right cursor-pointer group p-1.5 rounded-lg transition-colors border border-transparent ${toneClasses.container}`}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div
          className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${toneClasses.value}`}
        >
          {formattedValue}
        </div>
        {showForecast && projectedValue > 0 && (
          <div
            className={`flex items-center justify-end gap-1 text-[11px] font-medium tabular-nums mt-0.5 ${toneClasses.forecast}`}
          >
            <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
              🔮
            </span>
            <span>~{formatCompactVND(projectedValue)}</span>
          </div>
        )}
        <div className="text-[11px] tabular-nums flex items-center justify-end gap-1 text-slate-500 dark:text-slate-300">
          <span>{subLabel}</span>
          <AppIcon
            icon={Eye}
            size={11}
            className={`opacity-75 group-hover:opacity-100 transition-opacity ${toneClasses.eye}`}
          />
        </div>
      </div>
    </Tooltip>
  );
}
