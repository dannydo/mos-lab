'use client';

import type React from 'react';
import { Tooltip } from 'antd';
import type { TodayStatsThemeMode } from './types';

export interface ForecastIndicatorProps {
  themeMode: TodayStatsThemeMode;
  isDayMode: boolean;
  isPastPeriod: boolean;
  elapsedRatioPercent: number;
  periodNoun: 'tuần' | 'tháng';
  children: React.ReactNode;
}

export function ForecastIndicator({
  themeMode,
  isDayMode,
  isPastPeriod,
  elapsedRatioPercent,
  periodNoun,
  children,
}: ForecastIndicatorProps) {
  if (isDayMode || isPastPeriod || !children) return null;

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 11:00 - 23:00). Dự đoán về đích cuối ${periodNoun} dựa trên tốc độ hiện tại.`}
    >
      <div
        className={`flex items-center justify-end gap-1 text-[11px] font-medium tabular-nums mt-0.5 cursor-help ${
          themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
        }`}
      >
        <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
          🔮
        </span>
        <span className="text-[10px] text-slate-400">Cuối {periodNoun}:</span>
        <span className="font-semibold whitespace-nowrap">~{children}</span>
      </div>
    </Tooltip>
  );
}
