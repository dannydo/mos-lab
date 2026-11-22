'use client';

import { DONUT_TRACK_COLORS } from './todayStatsConstants';
import type { DonutChartProps, DonutSegment } from './types';

export type { DonutChartProps, DonutSegment };

export function DonutChart({
  segments,
  total,
  themeMode,
  centerLabel,
  centerSubLabel = 'tổng',
  size = 92,
}: DonutChartProps) {
  let accumulatedPercent = 0;
  const renderedSegments = segments
    .map((seg, idx) => {
      const percent = total > 0 ? (seg.value / total) * 100 : 0;
      if (percent === 0) return null;
      const strokeDasharray = `${percent} ${100 - percent}`;
      const strokeDashoffset = -accumulatedPercent;
      accumulatedPercent += percent;
      return {
        key: `${seg.label}-${idx}`,
        seg,
        strokeDasharray,
        strokeDashoffset,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const trackColor = themeMode === 'dark' ? DONUT_TRACK_COLORS.dark : DONUT_TRACK_COLORS.light;
  const displayCenterLabel = centerLabel !== undefined ? centerLabel : total;
  const isLongCenterLabel = Boolean(centerLabel && centerLabel.length > 5);

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90 block">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke={trackColor} strokeWidth="3.4" />
        {renderedSegments.map(({ key, seg, strokeDasharray, strokeDashoffset }) => (
          <circle
            key={key}
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke={seg.strokeClassName ? undefined : seg.color}
            strokeWidth="4.0"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-[stroke-dashoffset] duration-300 ease-in-out ${seg.strokeClassName ?? ''}`.trim()}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-bold leading-none tabular-nums ${isLongCenterLabel ? 'text-xs' : 'text-[17px]'} ${
            themeMode === 'dark' ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {displayCenterLabel}
        </span>
        {centerSubLabel && (
          <span className="text-[9px] opacity-50 mt-[3px] text-neutral-500 dark:text-neutral-400">
            {centerSubLabel}
          </span>
        )}
      </div>
    </div>
  );
}
