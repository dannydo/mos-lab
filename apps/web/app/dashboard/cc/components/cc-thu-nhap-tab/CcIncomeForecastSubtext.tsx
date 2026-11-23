'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { formatCompactVND } from '~/lib/format-utils';

interface CcIncomeForecastSubtextProps {
  projectedVal: number;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  elapsedRatioPercent: number;
  isMobile: boolean;
}

export function CcIncomeForecastSubtext({
  projectedVal,
  isDayMode,
  isPastPeriod,
  periodNoun,
  elapsedRatioPercent,
  isMobile,
}: CcIncomeForecastSubtextProps) {
  if (isDayMode || !projectedVal) return null;

  const sizeClass = isMobile ? 'text-[10px] leading-[1.35]' : 'text-xs';

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div
          className={`${sizeClass} font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70`}
        >
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
            {formatCompactVND(projectedVal)}
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00). Dự đoán về đích cuối ${periodNoun} dựa trên tốc độ hiện tại.`}
    >
      <div
        className={`${sizeClass} font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help`}
      >
        <span className="inline-flex items-center gap-1">
          <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="text-[11px] text-slate-400">Cuối {periodNoun}:</span>
        </span>
        <span className="tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
          ~{formatCompactVND(projectedVal)}
        </span>
      </div>
    </Tooltip>
  );
}
