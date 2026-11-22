'use client';

import React from 'react';
import { LEVEL_PRESETS } from '../../hooks/useTelesalesDashboard';
import { periods } from '../TelesalesConstants';
import {
  getMetricVisualTheme,
  PERIOD_POSITION_CLASSES,
  RADIAL_POSITION_CLASSES,
  resolvePeriodDisplayValue,
} from './frontFaceVisualConfig';
import type { TelesalesThemeMode } from './telesalesFrontFaceTypes';

export interface TelesalesTimelineTrackProps {
  themeMode: TelesalesThemeMode;
  currentPeriodId: string;
  currentMetricKey: string;
  activeMember: SafeAny;
  activeLevelIdx: number;
  activePreset: SafeAny;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  isRadialOpen: boolean;
  isAdmin: boolean;
  periodDataMap: SafeAny;
  setIsRadialOpen: (open: boolean) => void;
  setCurrentPeriodId: (periodId: string) => void;
  handleUpdateLevel: (levelIdx: number) => void;
}

export const TelesalesTimelineTrack: React.FC<TelesalesTimelineTrackProps> = ({
  themeMode,
  currentPeriodId,
  currentMetricKey,
  activeMember,
  activeLevelIdx,
  activePreset,
  dailyTarget,
  weeklyTarget,
  monthlyTarget,
  isRadialOpen,
  isAdmin,
  periodDataMap,
  setIsRadialOpen,
  setCurrentPeriodId,
  handleUpdateLevel,
}) => {
  const isDark = themeMode === 'dark';
  const metricTheme = getMetricVisualTheme(currentMetricKey);

  return (
    <div className="telesales-dashboard-timeline mt-5 w-full py-4 relative">
      <div className="relative flex items-center justify-center py-6 h-20">
        {/* Timeline Track Line */}
        <div
          className={`absolute left-[4%] right-[4%] top-1/2 -translate-y-1/2 h-[2px] z-0 ${
            isDark ? 'bg-slate-800/80' : 'bg-slate-200/80'
          }`}
        />

        {/* Center Target Quick Select Orb */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 ${
            isRadialOpen ? 'z-[9999]' : 'z-30'
          }`}
        >
          {isAdmin ? (
            <div className="relative flex items-center justify-center">
              {isRadialOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[9998] cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRadialOpen(false);
                    }}
                  />

                  <div className="absolute z-[9999] pointer-events-none">
                    {LEVEL_PRESETS.map((preset, idx) => {
                      const positionClass = RADIAL_POSITION_CLASSES[idx] || '';
                      const isCurrent = idx === activeLevelIdx;
                      return (
                        <div key={preset.name} className={`absolute pointer-events-auto ${positionClass}`}>
                          <div
                            className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 ${
                              isCurrent ? 'border-gold' : 'border-[rgba(212,163,75,0.2)]'
                            } ${
                              isDark
                                ? isCurrent
                                  ? 'bg-gold/15 shadow-[0_0_15px_rgba(212,163,75,0.45)] text-white font-bold'
                                  : 'bg-neutral-900/90 shadow-[0_0_8px_rgba(212,163,75,0.15)] hover:shadow-[0_0_15px_rgba(212,163,75,0.35)] text-gray-300 hover:text-white'
                                : isCurrent
                                  ? 'bg-gold/10 shadow-[0_2px_12px_rgba(212,163,75,0.3)] text-slate-800 font-bold'
                                  : 'bg-white shadow-[0_2px_6px_rgba(212,163,75,0.12)] hover:shadow-[0_4px_12px_rgba(212,163,75,0.25)] text-slate-600 hover:text-slate-900'
                            }`}
                            title={preset.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateLevel(idx);
                              setIsRadialOpen(false);
                            }}
                          >
                            <span className="text-xl leading-none">{preset.emoji}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div
                className={`w-16 h-16 rounded-full border flex items-center justify-center cursor-pointer select-none transition-all duration-300 z-50 ${
                  isRadialOpen
                    ? 'scale-110 border-gold shadow-[0_0_20px_rgba(212,163,75,0.5)] bg-gold/10'
                    : isDark
                      ? 'border-[rgba(212,163,75,0.3)] bg-neutral-900/90 shadow-[0_0_10px_rgba(212,163,75,0.15)] hover:shadow-[0_0_18px_rgba(212,163,75,0.45)] hover:scale-110'
                      : 'border-[rgba(212,163,75,0.25)] bg-white shadow-[0_2px_8px_rgba(212,163,75,0.1)] hover:shadow-[0_4px_12px_rgba(212,163,75,0.25)] hover:scale-110'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRadialOpen(!isRadialOpen);
                }}
                title={`Cấp độ mục tiêu hiện tại: ${activePreset?.name} (Click để đổi nhanh)`}
              >
                <span className="text-[32px] leading-none relative -top-[0.5px]">{activePreset?.emoji}</span>
              </div>
            </div>
          ) : (
            <div
              className={`w-16 h-16 rounded-full border border-[rgba(212,163,75,0.2)] flex items-center justify-center select-none transition-all duration-300 ${
                isDark
                  ? 'bg-neutral-900 shadow-[0_0_8px_rgba(212,163,75,0.1)]'
                  : 'bg-white shadow-[0_2px_6px_rgba(212,163,75,0.08)]'
              }`}
            >
              <span className="text-[32px] leading-none relative -top-[0.5px]">{activePreset?.emoji}</span>
            </div>
          )}
        </div>

        {/* Time Capsule Nodes */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {periods.map((period) => {
            const isActive = period.id === currentPeriodId;
            const leftPosClass = PERIOD_POSITION_CLASSES[period.id] || 'left-1/2';
            const displayValue = resolvePeriodDisplayValue({
              periodId: period.id,
              currentMetricKey,
              dailyTarget,
              weeklyTarget,
              monthlyTarget,
              activeMember,
              periodDataMap,
            });

            return (
              <div
                key={period.id}
                className={`pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer select-none ${leftPosClass} ${
                  isActive ? 'z-20' : 'z-10'
                }`}
                onClick={() => setCurrentPeriodId(period.id)}
              >
                <div
                  className={`p-[1.2px] rounded-full transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? `bg-gradient-to-r ${metricTheme.bgGradient} ${metricTheme.capsuleShadowClass} scale-105 z-20`
                      : `${isDark ? 'bg-neutral-800' : 'bg-slate-200'} z-10 hover:scale-105`
                  }`}
                >
                  <div
                    className={`rounded-full px-2.5 py-1.5 flex flex-col items-center min-w-[84px] ${
                      isDark
                        ? isActive
                          ? 'bg-[rgb(18,18,18)]'
                          : 'bg-neutral-900/90 text-gray-400 hover:text-white'
                        : isActive
                          ? 'bg-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`font-outfit leading-tight tabular-nums ${
                        isActive
                          ? `text-base font-black ${metricTheme.textColorClass}`
                          : `text-sm font-bold ${isDark ? 'text-gray-200' : 'text-slate-700'}`
                      }`}
                    >
                      {displayValue}
                    </span>
                    <span
                      className={`text-[9px] mt-0.5 leading-none whitespace-nowrap ${
                        isActive
                          ? `font-bold ${isDark ? 'text-white' : 'text-slate-900'}`
                          : `font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`
                      }`}
                    >
                      {period.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
