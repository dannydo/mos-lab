'use client';

import { Tooltip } from 'antd';
import { formatCompactVND } from '~/lib/format-utils';
import type { BkIncomeForecastMeta } from './bkThuNhapUtils';

interface BkIncomeForecastSubtextProps {
  forecastMeta: BkIncomeForecastMeta;
  projectedValue: number;
  isMobile: boolean;
}

/** Displays the closed-period actual footer or live run-rate forecast subtext on KPI summary cards. */
export function BkIncomeForecastSubtext({ forecastMeta, projectedValue, isMobile }: BkIncomeForecastSubtextProps) {
  const { isDayMode, isPastPeriod, elapsedRatioPercent, periodNoun } = forecastMeta;
  if (isDayMode) return null;

  const sizeClass = isMobile ? 'text-[10px] leading-[1.35]' : 'text-xs';

  if (isPastPeriod) {
    return (
      <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
        <div
          className={`font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70 ${sizeClass}`}
        >
          <span>Thực tế chốt {periodNoun}:</span>
          <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
            {formatCompactVND(projectedValue)}
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
        className={`font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help ${sizeClass}`}
      >
        <span className="inline-flex items-center gap-1">
          <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="text-[11px] text-slate-400">Cuối {periodNoun}:</span>
        </span>
        <span className="tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
          ~{formatCompactVND(projectedValue)}
        </span>
      </div>
    </Tooltip>
  );
}
