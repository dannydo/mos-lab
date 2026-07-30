'use client';

import React from 'react';
import { Button, Spin } from 'antd';
import { SyncOutlined, SettingOutlined, CloseOutlined, LoadingOutlined, TrophyOutlined } from '@ant-design/icons';
import { LEVEL_PRESETS } from '../hooks/useTelesalesDashboard';
import { metricConfigs, periods, radialCoords, periodPositions } from './TelesalesConstants';
import TelesalesAvatar from './TelesalesAvatar';

interface TelesalesFrontFaceProps {
  themeMode: 'light' | 'dark';
  currentMemberId: string;
  currentPeriodId: string;
  currentMetricKey: string;
  activeMember: SafeAny;
  activePerformance: SafeAny;
  activePercent: number;
  activeLevelIdx: number;
  activePreset: SafeAny;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  podiumOrder: SafeAny[];
  remaining: SafeAny[];
  isRadialOpen: boolean;
  loading: boolean;
  isAdmin: boolean;
  activeValue: number;
  activeTarget: number;
  onClose: () => void;
  setIsFlipped: (flipped: boolean) => void;
  setIsConfigOpen: (open: boolean) => void;
  setIsRadialOpen: (open: boolean) => void;
  setCurrentPeriodId: (periodId: string) => void;
  setCurrentMetricKey: (metricKey: string) => void;
  setCurrentMemberId: (memberId: string) => void;
  handleUpdateLevel: (levelIdx: number) => void;
  getMemberTarget: (memberId: string, periodId: string) => SafeAny;
  periodDataMap: SafeAny;
  activeMemberTargets: SafeAny;
}

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
  // Donut calculations
  const r = 85;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (activePercent / 100) * circumference;

  const activeMetricConfig = metricConfigs.find((m) => m.key === currentMetricKey) || metricConfigs[0];

  return (
    <div
      className={`absolute inset-0 w-full h-full rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden transition-all duration-300 ${
        themeMode === 'dark'
          ? 'bg-[#121212] border-neutral-800/80 text-white'
          : 'bg-white border-slate-100 text-slate-800'
      }`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: themeMode === 'dark' ? '#121212' : '#ffffff',
        border: `1px solid ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'}`,
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitTransform: 'rotateY(0deg)',
        transform: 'rotateY(0deg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b transition-colors ${
          themeMode === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <TelesalesAvatar member={activeMember} size="lg" className="shadow-lg shadow-black/10" />
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-bold text-base md:text-lg tracking-tight ${
                  themeMode === 'dark' ? 'text-white' : 'text-slate-800'
                }`}
              >
                {activeMember?.name}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold/15 text-gold font-extrabold border border-gold/25 shadow-sm">
                Telesales
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <div
              className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              <span>Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="text"
            icon={<SyncOutlined className="text-gold" />}
            onClick={() => setIsFlipped(true)}
            className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
            title="Xoay lật sang biểu đồ Radar"
          />
          {isAdmin && (
            <Button
              type="text"
              icon={<SettingOutlined className="text-gold" />}
              onClick={() => setIsConfigOpen(true)}
              className="hover:bg-gold/10 flex items-center justify-center w-8 h-8 rounded-lg"
              title="Cấu hình Target & Nhân sự"
            />
          )}
          <Button
            type="text"
            icon={
              <CloseOutlined
                className={
                  themeMode === 'dark' ? 'text-gray-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'
                }
              />
            }
            aria-label="Đóng bảng điều khiển Telesales"
            onClick={onClose}
            className="hover:bg-red-500/10 flex items-center justify-center w-8 h-8 rounded-lg"
          />
        </div>
      </div>

      {/* Main Area */}
      <div
        className={`flex-1 p-5 flex flex-col justify-between relative ${
          isRadialOpen ? 'overflow-visible' : 'overflow-hidden'
        }`}
      >
        {loading && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-2xl">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#D4A84B' }} spin />} />
          </div>
        )}

        {/* Timeline (Capsule Track) */}
        <div className="mt-5 w-full py-4 relative">
          <div className="relative flex items-center justify-center py-6 h-20">
            {/* Timeline Track Line */}
            <div
              className={`absolute left-[4%] right-[4%] h-[2px] z-0 ${
                themeMode === 'dark' ? 'bg-slate-800/80' : 'bg-slate-200/80'
              }`}
              style={{
                position: 'absolute',
                left: '4%',
                right: '4%',
                top: '50%',
                height: '2px',
                WebkitTransform: 'translateY(-50%)',
                transform: 'translateY(-50%)',
                zIndex: 0,
              }}
            />

            {/* Center target quick select orb */}
            <div
              className={`absolute left-1/2 top-1/2 flex items-center justify-center transition-all duration-300 ${
                isRadialOpen ? 'z-[9999]' : 'z-30'
              }`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                WebkitTransform: 'translate(-50%, -50%)',
                transform: 'translate(-50%, -50%)',
                zIndex: isRadialOpen ? 9999 : 30,
              }}
            >
              {isAdmin ? (
                <div className="relative flex items-center justify-center">
                  {isRadialOpen && (
                    <>
                      {/* Click overlay */}
                      <div
                        className="fixed inset-0 z-[9998] cursor-default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRadialOpen(false);
                        }}
                      />

                      {/* Radial buttons */}
                      <div className="absolute z-[9999] pointer-events-none">
                        {LEVEL_PRESETS.map((preset, idx) => {
                          const coord = radialCoords[idx];
                          const isCurrent = idx === activeLevelIdx;
                          return (
                            <div
                              key={idx}
                              className="absolute pointer-events-auto"
                              style={{
                                transform: `translate(-50%, -50%) translate(${coord.x}px, ${coord.y}px)`,
                              }}
                            >
                              <div
                                className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 ${
                                  themeMode === 'dark'
                                    ? isCurrent
                                      ? 'bg-gold/15 shadow-[0_0_15px_rgba(212,163,75,0.45)] text-white font-bold'
                                      : 'bg-neutral-900/90 shadow-[0_0_8px_rgba(212,163,75,0.15)] hover:shadow-[0_0_15px_rgba(212,163,75,0.35)] text-gray-300 hover:text-white'
                                    : isCurrent
                                      ? 'bg-gold/10 shadow-[0_2px_12px_rgba(212,163,75,0.3)] text-slate-800 font-bold'
                                      : 'bg-white shadow-[0_2px_6px_rgba(212,163,75,0.12)] hover:shadow-[0_4px_12px_rgba(212,163,75,0.25)] text-slate-600 hover:text-slate-900'
                                }`}
                                style={{
                                  borderColor: isCurrent ? '#D4A84B' : 'rgba(212, 163, 75, 0.2)',
                                }}
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

                  {/* Trigger orb */}
                  <div
                    className={`w-16 h-16 rounded-full border flex items-center justify-center cursor-pointer select-none transition-all duration-300 z-50 ${
                      isRadialOpen
                        ? 'scale-110 shadow-[0_0_20px_rgba(212,163,75,0.5)] bg-gold/10'
                        : themeMode === 'dark'
                          ? 'bg-neutral-900/90 shadow-[0_0_10px_rgba(212,163,75,0.15)] hover:shadow-[0_0_18px_rgba(212,163,75,0.45)] hover:scale-110'
                          : 'bg-white shadow-[0_2px_8px_rgba(212,163,75,0.1)] hover:shadow-[0_4px_12px_rgba(212,163,75,0.25)] hover:scale-110'
                    }`}
                    style={{
                      borderColor: isRadialOpen
                        ? '#D4A84B'
                        : themeMode === 'dark'
                          ? 'rgba(212, 163, 75, 0.3)'
                          : 'rgba(212, 163, 75, 0.25)',
                    }}
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
                  className={`w-16 h-16 rounded-full border flex items-center justify-center select-none transition-all duration-300 ${
                    themeMode === 'dark'
                      ? 'bg-neutral-900 shadow-[0_0_8px_rgba(212,163,75,0.1)]'
                      : 'bg-white shadow-[0_2px_6px_rgba(212,163,75,0.08)]'
                  }`}
                  style={{
                    borderColor: themeMode === 'dark' ? 'rgba(212, 163, 75, 0.2)' : 'rgba(212, 163, 75, 0.2)',
                  }}
                >
                  <span className="text-[32px] leading-none relative -top-[0.5px]">{activePreset?.emoji}</span>
                </div>
              )}
            </div>

            {/* Time Capsule Nodes */}
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {periods.map((p) => {
                const isActive = p.id === currentPeriodId;
                const leftPos = periodPositions[p.id];
                let periodTgt = monthlyTarget;
                if (p.id === 'today' || p.id === 'yesterday') {
                  periodTgt = dailyTarget;
                } else if (p.id === 'this_week' || p.id === 'last_week') {
                  periodTgt = weeklyTarget;
                }

                const isPast = ['yesterday', 'last_week', 'last_month'].includes(p.id);
                let displayValue = periodTgt;
                if (isPast) {
                  const pList = periodDataMap[p.id] || [];
                  const memInPeriod = pList.find(
                    (m: SafeAny) => m.id === activeMember?.id || m.initials === activeMember?.id
                  );
                  if (memInPeriod && memInPeriod.perf) {
                    displayValue = memInPeriod.perf[currentMetricKey] || 0;
                  } else {
                    displayValue = 0;
                  }
                }

                return (
                  <div
                    key={p.id}
                    className="pointer-events-auto flex flex-col items-center cursor-pointer select-none"
                    style={{
                      left: leftPos,
                      position: 'absolute',
                      top: '50%',
                      WebkitTransform: 'translate(-50%, -50%)',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: isActive ? 20 : 10,
                    }}
                    onClick={() => setCurrentPeriodId(p.id)}
                  >
                    <div
                      className={`p-[1.2px] rounded-full transition-all duration-300 flex items-center justify-center ${
                        isActive
                          ? `bg-gradient-to-r ${activeMetricConfig.bgGradient} scale-105 z-20`
                          : `${themeMode === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'} z-10 hover:scale-105`
                      }`}
                      style={isActive ? { boxShadow: `0 0 12px ${activeMetricConfig.color}59` } : undefined}
                    >
                      <div
                        className={`rounded-full px-2.5 py-1.5 flex flex-col items-center min-w-[84px] ${
                          themeMode === 'dark'
                            ? isActive
                              ? 'bg-[#121212]'
                              : 'bg-neutral-900/90 text-gray-400 hover:text-white'
                            : isActive
                              ? 'bg-white'
                              : 'bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        <span
                          className={`font-outfit leading-tight ${
                            isActive
                              ? 'text-base font-black'
                              : `text-sm font-bold ${themeMode === 'dark' ? 'text-gray-200' : 'text-slate-700'}`
                          }`}
                          style={isActive ? { color: activeMetricConfig.color } : undefined}
                        >
                          {displayValue}
                        </span>
                        <span
                          className={`text-[9px] mt-0.5 leading-none whitespace-nowrap ${
                            isActive
                              ? `font-bold ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`
                              : `font-medium ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`
                          }`}
                        >
                          {p.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Donut Chart visualizer */}
        <div className="flex flex-col items-center my-1 flex-shrink-0">
          <div className="relative w-[150px] h-[150px]">
            <svg width="150" height="150" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="callsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>
                <linearGradient id="pickupsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
                <linearGradient id="happyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient id="bookedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
                <linearGradient id="doneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r={r}
                fill="none"
                strokeWidth="14"
                className={themeMode === 'dark' ? 'stroke-white/5' : 'stroke-slate-100'}
              ></circle>
              <circle
                cx="100"
                cy="100"
                r={r}
                fill="none"
                strokeWidth="14"
                strokeLinecap="round"
                stroke={`url(#${activeMetricConfig.gradId})`}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-black tracking-tight tabular-nums"
                style={{ color: activeMetricConfig.color }}
              >
                {activeValue}
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 tabular-nums ${themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}
              >
                / {activeTarget} {activeMetricConfig.label}
              </span>
              <span className="text-sm font-extrabold mt-0.5 tabular-nums" style={{ color: activeMetricConfig.color }}>
                {activePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric selection buttons grid */}
        <div
          className="grid grid-cols-5 gap-2 mt-1.5 flex-shrink-0"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '6px',
            flexShrink: 0,
          }}
        >
          {metricConfigs.map((mc) => {
            const val = activePerformance?.[mc.key] || 0;
            const target = activeMemberTargets?.[mc.key] || 0;
            const actualPct = target > 0 ? Math.round((val / target) * 100) : 0;
            const barPct = Math.min(actualPct, 100);
            const isActive = currentMetricKey === mc.key;
            const Icon = mc.antIcon;
            return (
              <div
                key={mc.key}
                onClick={() => setCurrentMetricKey(mc.key)}
                className={`rounded-2xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-300 border ${
                  isActive
                    ? 'border-transparent'
                    : themeMode === 'dark'
                      ? 'border-white/5 hover:border-white/10'
                      : 'border-slate-100 hover:border-slate-200/80'
                }`}
                style={{
                  background: isActive
                    ? themeMode === 'dark'
                      ? `linear-gradient(135deg, ${mc.color}15, rgba(255,255,255,0.01))`
                      : `linear-gradient(135deg, ${mc.color}08, #ffffff)`
                    : themeMode === 'dark'
                      ? 'rgba(255,255,255,0.01)'
                      : 'rgba(0,0,0,0.01)',
                  boxShadow: isActive ? `0 10px 25px -5px ${mc.color}25, 0 8px 10px -6px ${mc.color}25` : 'none',
                  borderLeft: isActive ? `3.5px solid ${mc.color}` : undefined,
                }}
              >
                <div
                  className="relative w-11 h-11 flex items-center justify-center shrink-0 rounded-full transition-all duration-300"
                  style={{
                    boxShadow: `0 0 15px ${mc.color}35`,
                  }}
                >
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke={themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                      strokeWidth="2.5"
                    ></circle>
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke={mc.color}
                      strokeWidth="3"
                      strokeDasharray="100"
                      strokeDashoffset={100 - barPct}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    ></circle>
                  </svg>
                  <Icon className="text-sm relative z-10" style={{ color: mc.color, fontSize: '22px' }} />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider block font-outfit"
                    style={{ color: mc.color }}
                  >
                    {mc.label}
                  </span>
                  <div className="flex items-center gap-1.5 leading-none mt-0 select-none">
                    <span
                      className={`text-2xl font-outfit font-black ${
                        themeMode === 'dark' ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {val}
                    </span>
                    <span
                      className="w-[1.5px] h-5 transform rotate-12 shrink-0"
                      style={{ backgroundColor: `${mc.color}45` }}
                    ></span>
                    <span
                      className={`text-xs font-extrabold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}
                    >
                      {target}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase block mt-0.5" style={{ color: mc.color }}>
                    ĐẠT: {actualPct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard Podiums section */}
        <div
          className={`pt-2 border-t mt-2 flex-shrink-0 ${themeMode === 'dark' ? 'border-white/5' : 'border-slate-150'}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrophyOutlined className="text-gold text-xs animate-bounce" />
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              Bảng Xếp Hạng Đội Nhóm
            </span>
            <span className={`text-[9px] font-semibold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
              — {activeMetricConfig.label}
            </span>
          </div>

          {/* Podium Grid */}
          <div className="w-full flex items-end justify-center gap-4 pt-9" style={{ minHeight: '190px' }}>
            {podiumOrder.map((member, idx) => {
              if (!member) return null;
              const val = member.value;
              const memberTargets = getMemberTarget(member.id, currentPeriodId);
              const target = memberTargets?.[currentMetricKey] || 0;
              const pct = target > 0 ? Math.round((val / target) * 100) : 0;
              const isSelected = member.id === currentMemberId;
              const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const barHeight = idx === 0 ? 70 : idx === 1 ? 95 : 50;
              const rankEmoji = idx === 0 ? '🥈' : idx === 1 ? '🥇' : '🥉';
              const color = activeMetricConfig.color;

              return (
                <div
                  key={member.id}
                  onClick={() => setCurrentMemberId(member.id)}
                  className={`flex flex-col items-center relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                    isSelected ? 'scale-105 z-10' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{ width: '90px' }}
                >
                  <div className="flex flex-col items-center mb-1.5 text-center w-full relative z-10">
                    <span className="text-xs mb-0.5">{rank === 1 ? '👑' : rankEmoji}</span>
                    <TelesalesAvatar
                      member={member}
                      size="md"
                      className={`mb-1 border-2 ${
                        isSelected
                          ? 'border-gold shadow-lg shadow-gold/30 scale-105'
                          : themeMode === 'dark'
                            ? 'border-slate-800'
                            : 'border-white'
                      }`}
                    />
                    <div
                      className={`text-[10px] font-black truncate w-full px-1 ${
                        themeMode === 'dark' ? 'text-gray-300' : 'text-slate-700'
                      }`}
                    >
                      {member.name}
                    </div>
                    <div className="text-sm font-black" style={{ color }}>
                      {val}
                    </div>
                    <div
                      className={`text-[9px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}
                    >
                      {pct}%
                    </div>
                  </div>
                  <div
                    className="w-full rounded-t-xl flex items-end justify-center pb-1.5 transition-all duration-500 shadow-inner"
                    style={{
                      height: `${barHeight}px`,
                      background:
                        themeMode === 'dark'
                          ? `linear-gradient(to top, ${color}15, ${color}45)`
                          : `linear-gradient(to top, ${color}08, ${color}25)`,
                      borderTop: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                      borderLeft: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                      borderRight: `1px solid ${color}${themeMode === 'dark' ? '30' : '40'}`,
                      boxShadow: isSelected ? `0 -4px 15px ${color}18` : 'none',
                    }}
                  >
                    <span className="text-xs font-black opacity-20" style={{ color }}>
                      {rank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remaining ranks 4-7 list */}
          <div
            className="grid grid-cols-3 gap-2 mt-2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {remaining.map((m, i) => {
              const memberTargets = getMemberTarget(m.id, currentPeriodId);
              const target = memberTargets?.[currentMetricKey] || 0;
              const pct = target > 0 ? Math.round((m.value / target) * 100) : 0;
              const isSelected = m.id === currentMemberId;
              return (
                <div
                  key={m.id}
                  onClick={() => setCurrentMemberId(m.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gold/15 border-gold/40 shadow-sm'
                      : themeMode === 'dark'
                        ? 'bg-white/[0.02] border-transparent hover:bg-white/5'
                        : 'bg-slate-50 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold w-4 text-center ${
                      themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'
                    }`}
                  >
                    #{i + 4}
                  </span>
                  <TelesalesAvatar member={m} size="sm" />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold truncate ${
                        themeMode === 'dark' ? 'text-gray-200' : 'text-slate-700'
                      }`}
                    >
                      {m.name}
                    </span>
                    <span className="text-xs font-black shrink-0" style={{ color: activeMetricConfig.color }}>
                      {m.value}{' '}
                      <span
                        className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}
                      >
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
