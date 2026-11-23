'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import TelesalesAvatar from '../TelesalesAvatar';
import { calculateRatioPercent, getMetricVisualTheme } from './frontFaceVisualConfig';
import type { TelesalesThemeMode } from './telesalesFrontFaceTypes';

export interface TelesalesLeaderboardProps {
  themeMode: TelesalesThemeMode;
  currentMemberId: string;
  currentPeriodId: string;
  currentMetricKey: string;
  activeMetricLabel: string;
  podiumOrder: SafeAny[];
  remaining: SafeAny[];
  getMemberTarget: (memberId: string, periodId: string) => SafeAny;
  onSelectMember: (memberId: string) => void;
}

const PODIUM_BAR_HEIGHT_CLASSES = ['h-[70px]', 'h-[95px]', 'h-[50px]'] as const;
const PODIUM_RANKS = [2, 1, 3] as const;
const PODIUM_EMOJIS = ['🥈', '🥇', '🥉'] as const;

export const TelesalesLeaderboard: React.FC<TelesalesLeaderboardProps> = ({
  themeMode,
  currentMemberId,
  currentPeriodId,
  currentMetricKey,
  activeMetricLabel,
  podiumOrder,
  remaining,
  getMemberTarget,
  onSelectMember,
}) => {
  const isDark = themeMode === 'dark';
  const metricTheme = getMetricVisualTheme(currentMetricKey);

  return (
    <div
      className={`telesales-leaderboard pt-2 border-t mt-2 flex-shrink-0 ${isDark ? 'border-white/5' : 'border-slate-200'}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Trophy className="w-3.5 h-3.5 text-gold animate-bounce" />
        <span
          className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
        >
          Bảng Xếp Hạng Đội Nhóm
        </span>
        <span className={`text-[9px] font-semibold ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          — {activeMetricLabel}
        </span>
      </div>

      {/* Podium Grid */}
      <div className="telesales-podium w-full flex items-end justify-center gap-4 pt-9 min-h-[190px]">
        {podiumOrder.map((member, idx) => {
          if (!member) return null;
          const val = member.value;
          const memberTargets = getMemberTarget(member.id, currentPeriodId);
          const target = memberTargets?.[currentMetricKey] || 0;
          const pct = calculateRatioPercent(val, target);
          const isSelected = member.id === currentMemberId;
          const rank = PODIUM_RANKS[idx] ?? 3;
          const barHeightClass = PODIUM_BAR_HEIGHT_CLASSES[idx] ?? 'h-[50px]';
          const rankEmoji = PODIUM_EMOJIS[idx] ?? '🥉';

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`w-[90px] flex flex-col items-center relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                isSelected ? 'scale-105 z-10' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col items-center mb-1.5 text-center w-full relative z-10">
                <span className="text-xs mb-0.5">{rank === 1 ? '👑' : rankEmoji}</span>
                <TelesalesAvatar
                  member={member}
                  size="md"
                  className={`mb-1 border-2 ${
                    isSelected
                      ? 'border-gold shadow-lg shadow-gold/30 scale-105'
                      : isDark
                        ? 'border-slate-800'
                        : 'border-white'
                  }`}
                />
                <div
                  className={`text-[10px] font-black truncate w-full px-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                >
                  {member.name}
                </div>
                <div className={`text-sm font-black tabular-nums ${metricTheme.textColorClass}`}>{val}</div>
                <div className={`text-[9px] font-bold tabular-nums ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {pct}%
                </div>
              </div>
              <div
                className={`w-full rounded-t-xl flex items-end justify-center pb-1.5 transition-all duration-500 shadow-inner ${barHeightClass} ${
                  isDark ? metricTheme.podiumBarDarkClass : metricTheme.podiumBarLightClass
                } ${isSelected ? metricTheme.podiumSelectedShadowClass : ''}`}
              >
                <span className={`text-xs font-black opacity-20 tabular-nums ${metricTheme.textColorClass}`}>
                  {rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining Ranks 4+ List */}
      <div className="telesales-staff-selector grid grid-cols-3 gap-2 mt-2">
        {remaining.map((member, idx) => {
          const memberTargets = getMemberTarget(member.id, currentPeriodId);
          const target = memberTargets?.[currentMetricKey] || 0;
          const pct = calculateRatioPercent(member.value, target);
          const isSelected = member.id === currentMemberId;

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-gold/15 border-gold/40 shadow-sm'
                  : isDark
                    ? 'bg-white/[0.02] border-transparent hover:bg-white/5'
                    : 'bg-slate-50 border-transparent hover:bg-slate-100'
              }`}
            >
              <span
                className={`text-[11px] font-bold w-4 text-center tabular-nums ${isDark ? 'text-gray-500' : 'text-slate-400'}`}
              >
                #{idx + 4}
              </span>
              <TelesalesAvatar member={member} size="sm" />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className={`text-xs font-bold truncate ${isDark ? 'text-gray-200' : 'text-slate-700'}`}>
                  {member.name}
                </span>
                <span className={`text-xs font-black shrink-0 tabular-nums ${metricTheme.textColorClass}`}>
                  {member.value}{' '}
                  <span className={`text-[10px] font-bold tabular-nums ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    ({pct}%)
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
