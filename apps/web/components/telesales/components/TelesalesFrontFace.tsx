'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { metricConfigs } from './TelesalesConstants';
import { TelesalesDonutChart } from './telesales-front-face/TelesalesDonutChart';
import { TelesalesFrontHeader } from './telesales-front-face/TelesalesFrontHeader';
import { TelesalesLeaderboard } from './telesales-front-face/TelesalesLeaderboard';
import { TelesalesMetricGrid } from './telesales-front-face/TelesalesMetricGrid';
import { TelesalesTimelineTrack } from './telesales-front-face/TelesalesTimelineTrack';
import type { TelesalesFrontFaceProps } from './telesales-front-face/telesalesFrontFaceTypes';

export type { TelesalesFrontFaceProps } from './telesales-front-face/telesalesFrontFaceTypes';

export const TelesalesFrontFace: React.FC<TelesalesFrontFaceProps> = ({
  themeMode,
  currentMemberId,
  currentPeriodId,
  currentMetricKey,
  activeMember,
  activePerformance,
  activePercent,
  activeLevelIdx,
  activePreset,
  dailyTarget,
  weeklyTarget,
  monthlyTarget,
  podiumOrder,
  remaining,
  isRadialOpen,
  loading,
  isAdmin,
  activeValue,
  activeTarget,
  onClose,
  setIsFlipped,
  setIsConfigOpen,
  setIsRadialOpen,
  setCurrentPeriodId,
  setCurrentMetricKey,
  setCurrentMemberId,
  handleUpdateLevel,
  getMemberTarget,
  periodDataMap,
  activeMemberTargets,
}) => {
  const isDark = themeMode === 'dark';
  const activeMetricConfig = metricConfigs.find((m) => m.key === currentMetricKey) || metricConfigs[0];

  return (
    <div
      className={`telesales-dashboard-face absolute inset-0 w-full h-full rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden box-border backface-hidden [-webkit-backface-visibility:hidden] [transform:rotateY(0deg)] [-webkit-transform:rotateY(0deg)] transition-all duration-300 ${
        isDark ? 'bg-[rgb(18,18,18)] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <TelesalesFrontHeader
        themeMode={themeMode}
        activeMember={activeMember}
        isAdmin={isAdmin}
        onFlipToRadar={() => setIsFlipped(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onClose={onClose}
      />

      <div
        className={`telesales-dashboard-main flex-1 p-5 flex flex-col justify-between relative ${
          isRadialOpen ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
        {loading && (
          <div
            role="status"
            aria-label="Đang tải dữ liệu"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-2xl"
          >
            <Loader2 className="w-7 h-7 animate-spin text-gold" />
          </div>
        )}

        <TelesalesTimelineTrack
          themeMode={themeMode}
          currentPeriodId={currentPeriodId}
          currentMetricKey={currentMetricKey}
          activeMember={activeMember}
          activeLevelIdx={activeLevelIdx}
          activePreset={activePreset}
          dailyTarget={dailyTarget}
          weeklyTarget={weeklyTarget}
          monthlyTarget={monthlyTarget}
          isRadialOpen={isRadialOpen}
          isAdmin={isAdmin}
          periodDataMap={periodDataMap}
          setIsRadialOpen={setIsRadialOpen}
          setCurrentPeriodId={setCurrentPeriodId}
          handleUpdateLevel={handleUpdateLevel}
        />

        <TelesalesDonutChart
          themeMode={themeMode}
          currentMetricKey={currentMetricKey}
          activeMetricLabel={activeMetricConfig.label}
          activeValue={activeValue}
          activeTarget={activeTarget}
          activePercent={activePercent}
        />

        <TelesalesMetricGrid
          themeMode={themeMode}
          currentMetricKey={currentMetricKey}
          activePerformance={activePerformance}
          activeMemberTargets={activeMemberTargets}
          onSelectMetric={setCurrentMetricKey}
        />

        <TelesalesLeaderboard
          themeMode={themeMode}
          currentMemberId={currentMemberId}
          currentPeriodId={currentPeriodId}
          currentMetricKey={currentMetricKey}
          activeMetricLabel={activeMetricConfig.label}
          podiumOrder={podiumOrder}
          remaining={remaining}
          getMemberTarget={getMemberTarget}
          onSelectMember={setCurrentMemberId}
        />
      </div>
    </div>
  );
};
