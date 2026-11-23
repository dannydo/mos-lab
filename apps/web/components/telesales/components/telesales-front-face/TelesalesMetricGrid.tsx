'use client';

import React from 'react';
import { metricConfigs } from '../TelesalesConstants';
import { calculateRatioPercent, getMetricVisualTheme } from './frontFaceVisualConfig';
import type { TelesalesThemeMode } from './telesalesFrontFaceTypes';

export interface TelesalesMetricGridProps {
  themeMode: TelesalesThemeMode;
  currentMetricKey: string;
  activePerformance: SafeAny;
  activeMemberTargets: SafeAny;
  onSelectMetric: (metricKey: string) => void;
}

export const TelesalesMetricGrid: React.FC<TelesalesMetricGridProps> = ({
  themeMode,
  currentMetricKey,
  activePerformance,
  activeMemberTargets,
  onSelectMetric,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div className="telesales-metric-grid grid grid-cols-5 gap-2 mt-1.5 flex-shrink-0">
      {metricConfigs.map((mc) => {
        const val = activePerformance?.[mc.key] || 0;
        const target = activeMemberTargets?.[mc.key] || 0;
        const actualPct = calculateRatioPercent(val, target);
        const barPct = Math.min(actualPct, 100);
        const isActive = currentMetricKey === mc.key;
        const metricTheme = getMetricVisualTheme(mc.key);
        const Icon = metricTheme.icon;

        const cardBorderAndBgClass = isActive
          ? isDark
            ? metricTheme.cardActiveDarkClass
            : metricTheme.cardActiveLightClass
          : isDark
            ? 'border-white/5 hover:border-white/10 bg-white/[0.01]'
            : 'border-slate-100 hover:border-slate-200/80 bg-black/[0.01]';

        return (
          <div
            key={mc.key}
            onClick={() => onSelectMetric(mc.key)}
            className={`rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-300 border ${cardBorderAndBgClass}`}
          >
            <div
              className={`relative w-11 h-11 flex items-center justify-center shrink-0 rounded-full transition-all duration-300 ${metricTheme.ringShadowClass}`}
            >
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke={metricTheme.rgb}
                  strokeWidth="3"
                  strokeDasharray="100"
                  strokeDashoffset={100 - barPct}
                  strokeLinecap="round"
                  className="transition-[stroke-dashoffset] duration-[800ms] ease-in-out"
                />
              </svg>
              <span className={`relative z-10 inline-flex items-center justify-center ${metricTheme.textColorClass}`}>
                <Icon className="w-[22px] h-[22px]" />
              </span>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <span
                className={`text-[10px] font-black uppercase tracking-wider block font-outfit ${metricTheme.textColorClass}`}
              >
                {mc.label}
              </span>
              <div className="flex items-center gap-1.5 leading-none mt-0 select-none">
                <span
                  className={`text-2xl font-outfit font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}
                >
                  {val}
                </span>
                <span className={`w-[1.5px] h-5 transform rotate-12 shrink-0 ${metricTheme.dividerColorClass}`} />
                <span className={`text-xs font-extrabold tabular-nums ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {target}
                </span>
              </div>
              <span
                className={`text-[9px] font-black uppercase block mt-0.5 tabular-nums ${metricTheme.textColorClass}`}
              >
                ĐẠT: {actualPct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
