'use client';

import React from 'react';
import {
  DONUT_CIRCUMFERENCE,
  DONUT_RADIUS,
  getDonutStrokeDashoffset,
  getMetricVisualTheme,
  METRIC_VISUAL_THEMES,
} from './frontFaceVisualConfig';
import type { TelesalesThemeMode } from './telesalesFrontFaceTypes';

export interface TelesalesDonutChartProps {
  themeMode: TelesalesThemeMode;
  currentMetricKey: string;
  activeMetricLabel: string;
  activeValue: number;
  activeTarget: number;
  activePercent: number;
}

const ALL_METRIC_THEMES = Object.values(METRIC_VISUAL_THEMES);

export const TelesalesDonutChart: React.FC<TelesalesDonutChartProps> = ({
  themeMode,
  currentMetricKey,
  activeMetricLabel,
  activeValue,
  activeTarget,
  activePercent,
}) => {
  const isDark = themeMode === 'dark';
  const metricTheme = getMetricVisualTheme(currentMetricKey);
  const strokeDashoffset = getDonutStrokeDashoffset(activePercent);

  return (
    <div className="flex flex-col items-center my-1 flex-shrink-0">
      <div className="telesales-dashboard-chart relative w-[150px] h-[150px]">
        <svg width="150" height="150" viewBox="0 0 200 200">
          <defs>
            {ALL_METRIC_THEMES.map((theme) => (
              <linearGradient key={theme.gradId} id={theme.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.gradientStartRgb} />
                <stop offset="100%" stopColor={theme.gradientEndRgb} />
              </linearGradient>
            ))}
          </defs>
          <circle
            cx="100"
            cy="100"
            r={DONUT_RADIUS}
            fill="none"
            strokeWidth="14"
            className={isDark ? 'stroke-white/5' : 'stroke-slate-100'}
          />
          <circle
            cx="100"
            cy="100"
            r={DONUT_RADIUS}
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            stroke={`url(#${metricTheme.gradId})`}
            strokeDasharray={DONUT_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
            className="transition-[stroke-dashoffset,stroke] duration-[800ms] ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black tracking-tight tabular-nums ${metricTheme.textColorClass}`}>
            {activeValue}
          </span>
          <span className={`text-[10px] font-bold mt-0.5 tabular-nums ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            / {activeTarget} {activeMetricLabel}
          </span>
          <span className={`text-sm font-extrabold mt-0.5 tabular-nums ${metricTheme.textColorClass}`}>
            {activePercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
