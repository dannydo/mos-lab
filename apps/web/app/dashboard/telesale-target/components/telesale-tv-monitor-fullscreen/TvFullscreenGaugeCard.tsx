'use client';

import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import type { TvMonitorKpiMetrics } from '../../utils/tv-monitor-pacing';
import { RealisticCardFireworks } from '../RealisticCardFireworks';
import { SemicircleGauge } from '../SemicircleGauge';
import type { TvFullscreenCardVariant } from './tvFullscreenTypes';
import { getFullscreenCardTierStyles, getHeaderGapBadgeClass, getRibbonGapTextClass } from './tvFullscreenUtils';

interface TvFullscreenGaugeCardProps {
  variant: TvFullscreenCardVariant;
  isDark: boolean;
  metrics: TvMonitorKpiMetrics;
  fireworksEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
  isTestFireworksActive: boolean;
  isFrenzyActive: boolean;
}

/** Fullscreen cockpit gauge card for either Today Book or Today Check-in with fireworks and 4-stat ribbon. */
export const TvFullscreenGaugeCard: React.FC<TvFullscreenGaugeCardProps> = ({
  variant,
  isDark,
  metrics,
  fireworksEnabled,
  soundEnabled,
  volume,
  isTestFireworksActive,
  isFrenzyActive,
}) => {
  const isBook = variant === 'book';
  const tier = isBook ? metrics.bookTier : metrics.checkinTier;
  const percent = isBook ? metrics.bookPercent : metrics.checkinPercent;
  const actual = isBook ? metrics.bookActual : metrics.checkinActual;
  const target = isBook ? metrics.bookTarget : metrics.checkinTarget;
  const expected = isBook ? metrics.expectedBook : metrics.expectedCheckin;
  const gap = isBook ? metrics.gapBook : metrics.gapCheckin;
  const remaining = isBook ? metrics.remainingBook : metrics.remainingCheckin;
  const comboActual = isBook ? metrics.comboLiveBookActual || 0 : metrics.comboLiveCheckinActual || 0;

  const isOver100 = percent >= 100;
  const styles = getFullscreenCardTierStyles(tier, isDark);
  const gapHeaderBadgeClass = getHeaderGapBadgeClass(gap, isDark);
  const gapRibbonTextClass = getRibbonGapTextClass(gap, isDark);

  const IconComp = isBook ? Calendar : CheckCircle2;
  const title = isBook ? 'BOOK HÔM NAY' : 'CHECK-IN HÔM NAY';
  const cardLabel = isBook ? 'BOOK' : 'CHECK-IN';
  const gaugeUnit = isBook ? 'Book' : 'Check-in';
  const actualDataTestId = isBook ? 'tv-monitor-fullscreen-book-actual' : 'tv-monitor-fullscreen-checkin-actual';

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${styles.container}`}
    >
      {/* Realistic Physics Fireworks (bắn khi đạt mốc >= 100% hoặc khi test) */}
      <RealisticCardFireworks
        active={isTestFireworksActive || (fireworksEnabled && isOver100)}
        isFrenzy={isFrenzyActive || isTestFireworksActive}
        soundEnabled={soundEnabled}
        volume={volume}
        theme={tier === 'emerald' ? 'emerald' : tier === 'amber' ? 'amber' : 'gold'}
        cardLabel={cardLabel}
      />

      {/* Ambient inner glow */}
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${styles.ambientGlow}`}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${styles.iconBox}`}>
            <IconComp className="w-4 h-4" />
          </div>
          <h2
            className={`text-xs sm:text-sm xl:text-base font-black tracking-tight m-0 truncate ${
              isDark ? 'text-zinc-100' : 'text-slate-900'
            }`}
          >
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold border tabular-nums ${styles.headerTargetBadge}`}
          >
            Chỉ tiêu: {target}
          </span>
          <span
            className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-black border tabular-nums ${gapHeaderBadgeClass}`}
          >
            {gap >= 0 ? `+${gap} ĐÚNG NHỊP` : `${gap} CHẬM NHỊP`}
          </span>
        </div>
      </div>

      {/* Semicircle Gauge - Hero Centered */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-0 py-1 w-full max-w-[720px] mx-auto relative z-10">
        <SemicircleGauge
          percent={percent}
          actual={actual}
          target={target}
          expected={expected}
          gap={gap}
          pacingPercent={target > 0 ? (expected / target) * 100 : 0}
          showDeficitZone={true}
          showPacingMarker={true}
          showFloatingGapBadge={true}
          unit={gaugeUnit}
          label=""
          hideLabelText={true}
          hideUnitText={true}
          tone={tier}
          sizeVariant="tv"
          actualDataTestId={actualDataTestId}
          heightClass="h-[245px] sm:h-[270px] lg:h-[290px]"
          showPacingArc={false}
          gapText={gap >= 0 ? `GAP: +${gap} VƯỢT NHỊP` : `GAP: ${gap} CHẬM NHỊP`}
          gapType={gap >= 0 ? 'positive' : gap === -1 ? 'neutral' : 'negative'}
        />
      </div>

      {/* 4-Stat Horizontal Ribbon */}
      <div
        className={`mt-auto shrink-0 rounded-2xl p-3 sm:p-4 relative z-10 transition-colors ${
          isDark ? 'bg-black/50' : 'bg-slate-50/90'
        } ${styles.ribbonBorder}`}
      >
        <div
          className={`grid grid-cols-4 gap-2 text-center font-mono divide-x ${
            isDark ? 'divide-zinc-800' : 'divide-slate-200'
          }`}
        >
          <div>
            <span className={`text-[11px] sm:text-xs block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Đã đạt
            </span>
            <span className={`text-xl sm:text-2xl font-black block tabular-nums ${styles.ribbonActualText}`}>
              {actual}
            </span>
          </div>
          <div>
            <span className={`text-[11px] sm:text-xs block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Kỳ vọng giờ này
            </span>
            <span
              className={`text-xl sm:text-2xl font-black block tabular-nums ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              {expected}
            </span>
          </div>
          <div>
            <span className={`text-[11px] sm:text-xs block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Nhịp (Gap)
            </span>
            <span className={`text-xl sm:text-2xl font-black block tabular-nums ${gapRibbonTextClass}`}>
              {gap >= 0 ? `+${gap}` : gap}
            </span>
          </div>
          <div>
            <span className={`text-[11px] sm:text-xs block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Còn thiếu
            </span>
            <span
              className={`text-xl sm:text-2xl font-black block tabular-nums ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              {remaining}
            </span>
          </div>
        </div>

        <div
          className={`mt-3 pt-2 border-t flex items-center justify-between text-xs font-mono ${
            isDark ? 'border-zinc-800/60 text-zinc-400' : 'border-slate-200 text-slate-500'
          }`}
        >
          <span>
            {isBook ? 'Định mức tối thiểu mỗi ngày:' : 'Chỉ tiêu KPI chính:'}{' '}
            <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>
              {isBook ? `${target} Cuộc hẹn thành công` : `${target} Khách lẻ`}
            </strong>
          </span>
          <span
            className={`font-bold flex items-center gap-1 tabular-nums ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {isBook ? `Combo: +${comboActual} Book` : `Combo: +${comboActual} Check-in`}
          </span>
        </div>
      </div>
    </div>
  );
};
