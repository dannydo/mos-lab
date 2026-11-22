'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { Calendar, Sparkles } from 'lucide-react';
import type { TvMonitorKpiMetrics } from '../../utils/tv-monitor-pacing';
import { SemicircleGauge } from '../SemicircleGauge';
import { RealisticCardFireworks } from '../RealisticCardFireworks';
import { computeExpectedPacingPercent, getCardTierStyles } from './tvMonitorCardStyles';
import type { TvMonitorGaugeRibbonCell, TvMonitorGaugeVariant } from './tvMonitorCardTypes';

interface TvMonitorGaugeCardProps {
  variant: TvMonitorGaugeVariant;
  isDark: boolean;
  isTvOpen: boolean;
  fireworksEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
  isTestFireworksActive: boolean;
  metrics: TvMonitorKpiMetrics;
  onReplayCheckinCelebration?: () => void;
}

/** Renders either the Today Book or Today Check-in gauge card with live fireworks, 4-column ribbon, and combo footer. */
export const TvMonitorGaugeCard: React.FC<TvMonitorGaugeCardProps> = ({
  variant,
  isDark,
  isTvOpen,
  fireworksEnabled,
  soundEnabled,
  volume,
  isTestFireworksActive,
  metrics,
  onReplayCheckinCelebration,
}) => {
  const isBook = variant === 'book';
  const tier = isBook ? metrics.bookTier : metrics.checkinTier;
  const styles = getCardTierStyles(tier, isDark);

  const percent = isBook ? metrics.bookPercent : metrics.checkinPercent;
  const actual = isBook ? metrics.bookActual : metrics.checkinActual;
  const target = isBook ? metrics.bookTarget : metrics.checkinTarget;
  const expected = isBook ? metrics.expectedBook : metrics.expectedCheckin;
  const gap = isBook ? metrics.gapBook : metrics.gapCheckin;
  const remaining = isBook ? metrics.remainingBook : metrics.remainingCheckin;
  const comboActual = isBook ? metrics.comboLiveBookActual || 0 : metrics.comboLiveCheckinActual || 0;
  const isOver100 = percent >= 100;

  const pacingPercent = computeExpectedPacingPercent(expected, target);
  const gapNegativeColor = isBook
    ? isDark
      ? 'text-amber-400'
      : 'text-amber-600'
    : isDark
      ? 'text-rose-400'
      : 'text-rose-600';
  const gapColorClass = gap >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : gapNegativeColor;
  const neutralValueClass = `text-xs font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`;
  const unitLabel = isBook ? 'Book' : 'In';

  const ribbonCells: TvMonitorGaugeRibbonCell[] = [
    { label: 'Kỳ vọng', value: `${expected} ${unitLabel}`, valueClassName: neutralValueClass },
    {
      label: 'Nhịp',
      value: gap >= 0 ? `+${gap}` : gap,
      valueClassName: `text-xs font-black block tabular-nums ${gapColorClass}`,
    },
    {
      label: 'Còn thiếu',
      value: `${remaining} ${unitLabel}`,
      valueClassName: `text-xs font-black block tabular-nums ${styles.bottomText}`,
    },
    {
      label: 'Mục tiêu',
      value: isBook ? `≥${target}` : target,
      valueClassName: neutralValueClass,
    },
  ];

  const dotToneClass = tier === 'emerald' ? 'bg-emerald-400' : tier === 'amber' ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className={styles.container}>
      {/* Pháo bông thực tế khi đạt mốc >= 100% hoặc khi test (tắt khi mở TV fullscreen) */}
      <RealisticCardFireworks
        active={!isTvOpen && (isTestFireworksActive || (fireworksEnabled && isOver100))}
        isFrenzy={isTestFireworksActive}
        soundEnabled={!isTvOpen && soundEnabled}
        volume={volume}
        theme="emerald"
        cardLabel={isBook ? 'BOOK' : 'CHECK-IN'}
      />

      <div>
        <div
          className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'} text-xs mb-0.5 relative z-10`}
        >
          {isBook ? (
            <>
              <span className="flex items-center gap-1">
                <Calendar className={`w-3.5 h-3.5 ${styles.icon}`} />
                <strong className={styles.title}>BOOK HÔM NAY</strong>
              </span>
              <span className={styles.badge}>HÀNH ĐỘNG</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotToneClass}`} />
                <strong className={styles.title}>CHECK-IN KHÁCH LẺ</strong>
                {isOver100 && onReplayCheckinCelebration && (
                  <Tooltip title="Đạt 100% chỉ tiêu! Bấm để phát lại chúc mừng & pháo hoa">
                    <button
                      type="button"
                      onClick={onReplayCheckinCelebration}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer animate-pulse"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      Chúc mừng!
                    </button>
                  </Tooltip>
                )}
              </span>
              <span className={styles.targetBadge}>Chỉ tiêu: {target}</span>
            </>
          )}
        </div>

        {/* Semicircle Gauge */}
        <div className="relative z-10">
          <SemicircleGauge
            percent={percent}
            actual={actual}
            target={target}
            expected={expected}
            gap={gap}
            label=""
            hideLabelText={true}
            tone={tier}
            pacingPercent={pacingPercent}
            gapText={`GAP: ${gap >= 0 ? '+' : ''}${gap}`}
            gapType={gap >= 0 ? 'positive' : 'negative'}
          />
        </div>

        {/* Horizontal Ribbon 4 Cột */}
        <div
          className={`mt-2 ${
            isDark
              ? 'bg-black/60 border-zinc-800/90 divide-zinc-800'
              : 'bg-slate-50/90 border-slate-200/90 divide-slate-200'
          } border rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x text-[9px] relative z-10`}
        >
          {ribbonCells.map((cell) => (
            <div key={cell.label}>
              <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>{cell.label}</span>
              <span className={cell.valueClassName}>{cell.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mt-2 pt-1.5 border-t ${styles.bottomBorder} text-[9px] sm:text-[9.5px] ${
          isDark ? 'text-zinc-400' : 'text-slate-500'
        } font-mono flex items-center justify-between gap-1 whitespace-nowrap relative z-10`}
      >
        <span>
          {isBook ? 'Mục tiêu:' : 'Chỉ tiêu:'}{' '}
          <strong className={styles.bottomText}>{isBook ? `≥${target} Book` : `${target} Khách lẻ`}</strong>
        </span>
        <span
          className={`${isDark ? 'text-purple-300' : 'text-purple-700'} font-bold flex items-center gap-1 tabular-nums`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'} shrink-0`} />
          {isBook ? `Combo: +${comboActual} Book` : `Combo: +${comboActual} Check-in`}
        </span>
      </div>
    </div>
  );
};
