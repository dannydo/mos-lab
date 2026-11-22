'use client';

import React from 'react';
import { TelesalesBackHeader } from './telesales-back-face/TelesalesBackHeader';
import { TelesalesBackLeaderboard } from './telesales-back-face/TelesalesBackLeaderboard';
import { TelesalesRadarChart } from './telesales-back-face/TelesalesRadarChart';
import type { TelesalesBackFaceProps } from './telesales-back-face/telesalesBackFaceTypes';
import { TelesalesMetricGrid } from './telesales-front-face/TelesalesMetricGrid';
import { TelesalesTimelineTrack } from './telesales-front-face/TelesalesTimelineTrack';

export type { TelesalesBackFaceProps } from './telesales-back-face/telesalesBackFaceTypes';

export const TelesalesBackFace: React.FC<TelesalesBackFaceProps> = ({
  themeMode,
  currentMemberId,
  currentPeriodId,
  currentMetricKey,
  activeMember,
  activePerformance,
  activeLevelIdx,
  activePreset,
  dailyTarget,
  weeklyTarget,
  monthlyTarget,
  podiumOrderBack,
  remainingBack,
  isRadialOpen,
  isAdmin,
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
  dataPoints,
  activeMemberTargets,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`telesales-dashboard-face absolute inset-0 w-full h-full rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden box-border backface-hidden [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] [-webkit-transform:rotateY(180deg)] transition-colors duration-300 ${
        isDark ? 'bg-[rgb(18,18,18)] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <TelesalesBackHeader
        themeMode={themeMode}
        activeMember={activeMember}
        isAdmin={isAdmin}
        onFlipToDonut={() => setIsFlipped(false)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onClose={onClose}
      />

      <div
        className={`telesales-dashboard-main flex-1 p-5 flex flex-col justify-between relative ${
          isRadialOpen ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
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

        <TelesalesRadarChart themeMode={themeMode} currentMetricKey={currentMetricKey} dataPoints={dataPoints} />

        <TelesalesMetricGrid
          themeMode={themeMode}
          currentMetricKey={currentMetricKey}
          activePerformance={activePerformance}
          activeMemberTargets={activeMemberTargets}
          onSelectMetric={setCurrentMetricKey}
        />

        <TelesalesBackLeaderboard
          themeMode={themeMode}
          currentMemberId={currentMemberId}
          currentPeriodId={currentPeriodId}
          podiumOrderBack={podiumOrderBack}
          remainingBack={remainingBack}
          getMemberTarget={getMemberTarget}
          onSelectMember={setCurrentMemberId}
        />
      </div>
    </div>
  );
};
