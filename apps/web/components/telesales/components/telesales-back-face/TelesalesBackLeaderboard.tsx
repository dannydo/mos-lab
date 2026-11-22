'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { pointsToString } from '../../hooks/useTelesalesDashboard';
import TelesalesAvatar from '../TelesalesAvatar';
import {
  buildMiniRadarGeometry,
  MINI_RADAR_GOLD_FILL,
  PODIUM_SLOT_CONFIGS,
  RADAR_AXES,
  RADAR_GOLD_STROKE_RGB,
} from './backFaceVisualConfig';
import type { TelesalesBackThemeMode } from './telesalesBackFaceTypes';

export interface TelesalesBackLeaderboardProps {
  themeMode: TelesalesBackThemeMode;
  currentMemberId: string;
  currentPeriodId: string;
  podiumOrderBack: SafeAny[];
  remainingBack: SafeAny[];
  getMemberTarget: (memberId: string, periodId: string) => SafeAny;
  onSelectMember: (memberId: string) => void;
}

interface MemberMiniRadarProps {
  memberId: string;
  perf: SafeAny;
  memberTargets: SafeAny;
  isDark: boolean;
}

const MemberMiniRadar: React.FC<MemberMiniRadarProps> = ({ memberId, perf, memberTargets, isDark }) => {
  const { outerRingPoints, innerRingPoints, dataPoints } = buildMiniRadarGeometry(perf, memberTargets);

  return (
    <svg id={`miniRadar-Back-New-${memberId}`} viewBox="0 0 60 60" className="w-[32px] h-[32px] my-0.5 opacity-80">
      <polygon
        points={pointsToString(outerRingPoints)}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
        strokeWidth={0.5}
      />
      <polygon
        points={pointsToString(innerRingPoints)}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}
        strokeWidth={0.3}
        strokeDasharray="1.5,1.5"
      />
      <polygon
        points={pointsToString(dataPoints)}
        fill={MINI_RADAR_GOLD_FILL}
        stroke={RADAR_GOLD_STROKE_RGB}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {dataPoints.map((pt, idx) => (
        <circle
          key={RADAR_AXES[idx].key}
          cx={pt.x.toFixed(1)}
          cy={pt.y.toFixed(1)}
          r={1.5}
          fill={RADAR_AXES[idx].rgb}
        />
      ))}
    </svg>
  );
};

export const TelesalesBackLeaderboard: React.FC<TelesalesBackLeaderboardProps> = ({
  themeMode,
  currentMemberId,
  currentPeriodId,
  podiumOrderBack,
  remainingBack,
  getMemberTarget,
  onSelectMember,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`telesales-leaderboard pt-2 border-t mt-2 flex-shrink-0 ${
        isDark ? 'border-white/5' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Trophy className="w-3.5 h-3.5 text-gold animate-bounce" />
        <span
          className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
        >
          Bảng Xếp Hạng Đội Nhóm (Đóng deal)
        </span>
      </div>

      {/* Podium Grid */}
      <div className="telesales-podium w-full flex items-end justify-center gap-4 pt-9 min-h-[190px]">
        {podiumOrderBack.map((member, idx) => {
          if (!member) return null;
          const val = member.value;
          const isSelected = member.id === currentMemberId;
          const slotConfig = PODIUM_SLOT_CONFIGS[idx] ?? PODIUM_SLOT_CONFIGS[2];
          const memberTargets = getMemberTarget(member.id, currentPeriodId);

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`w-[90px] flex flex-col items-center relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                isSelected ? 'scale-105 z-10' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col items-center mb-1 text-center w-full relative z-10">
                <span className="text-xs mb-0.5">{slotConfig.badgeEmoji}</span>
                <TelesalesAvatar
                  member={member}
                  size="md"
                  className={`mb-1 border-2 ${
                    isSelected
                      ? 'border-gold shadow-lg shadow-gold/20 scale-105'
                      : isDark
                        ? 'border-white/10'
                        : 'border-gray-300'
                  }`}
                />
                <div
                  className={`text-[10px] font-black truncate w-full px-1 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {member.name}
                </div>

                <MemberMiniRadar
                  memberId={String(member.id)}
                  perf={member.perf}
                  memberTargets={memberTargets}
                  isDark={isDark}
                />

                <div className={`text-sm font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {val}
                </div>
              </div>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 flex items-end justify-center pb-1 border border-b-0 ${slotConfig.barHeightClass} ${
                  isDark
                    ? 'bg-[linear-gradient(to_top,rgba(255,255,255,0.03),rgba(255,255,255,0.08))] border-white/10'
                    : 'bg-[linear-gradient(to_top,rgba(0,0,0,0.02),rgba(0,0,0,0.05))] border-black/[0.08]'
                }`}
              >
                <span
                  className={`text-xs font-black opacity-20 tabular-nums ${isDark ? 'text-white' : 'text-slate-700'}`}
                >
                  {slotConfig.rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks 4-7 list */}
      <div className="telesales-staff-selector grid grid-cols-3 gap-2 mt-2">
        {remainingBack.map((member, idx) => {
          const memberTargets = getMemberTarget(member.id, currentPeriodId);
          const isSelected = member.id === currentMemberId;

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-gold/15 border-gold/35 shadow-sm'
                  : isDark
                    ? 'bg-white/[0.02] border-transparent hover:bg-white/5'
                    : 'bg-slate-50 border-transparent hover:bg-slate-100'
              }`}
            >
              <span
                className={`text-[11px] font-bold w-4 text-center tabular-nums ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                #{idx + 4}
              </span>
              <TelesalesAvatar member={member} size="sm" />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className={`text-xs font-bold truncate ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                  {member.name}
                </span>
                <div className="flex gap-0.5 shrink-0 w-20">
                  {RADAR_AXES.map((axis) => {
                    const itemVal = member.perf?.[axis.key] || 0;
                    const itemTgt = memberTargets?.[axis.key] || 0;
                    const itemPct = itemTgt > 0 ? Math.min(Math.round((itemVal / itemTgt) * 100), 100) : 0;
                    return (
                      <div
                        key={axis.key}
                        className={`flex-1 h-1 rounded overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
                      >
                        <svg
                          viewBox="0 0 100 4"
                          preserveAspectRatio="none"
                          className="w-full h-full block"
                          aria-hidden="true"
                        >
                          {itemPct > 0 && <rect x={0} y={0} width={itemPct} height={4} fill={axis.rgb} />}
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
