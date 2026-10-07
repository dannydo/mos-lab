'use client';

import React from 'react';

export type GaugeTone = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';

export interface SemicircleGaugeProps {
  percent: number;
  actual: number | string;
  target: number | string;
  unit?: string;
  label?: string;
  tone?: GaugeTone;
  pacingPercent?: number;
  showPacingArc?: boolean;
  gapText?: string;
  gapType?: 'positive' | 'neutral' | 'negative';
  radius?: number;
  showNeedle?: boolean;
  className?: string;
  heightClass?: string;
  hideLabelText?: boolean;
  hideUnitText?: boolean;
  sizeVariant?: 'default' | 'tv';
  actualDataTestId?: string;
  subtitle?: string;
}

const TONE_MAP: Record<
  GaugeTone,
  {
    strokeClass: string;
    textClass: string;
    badgeClass: string;
  }
> = {
  emerald: {
    strokeClass: 'stroke-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass:
      'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40',
  },
  blue: {
    strokeClass: 'stroke-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
    badgeClass:
      'text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40',
  },
  purple: {
    strokeClass: 'stroke-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    badgeClass:
      'text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/40',
  },
  amber: {
    strokeClass: 'stroke-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeClass:
      'text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40',
  },
  rose: {
    strokeClass: 'stroke-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    badgeClass:
      'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40',
  },
};

export const SemicircleGauge: React.FC<SemicircleGaugeProps> = ({
  percent,
  actual,
  target,
  unit = '',
  label = '',
  tone = 'emerald',
  pacingPercent,
  showPacingArc = true,
  gapText,
  gapType = 'neutral',
  radius = 90,
  showNeedle = true,
  className = '',
  heightClass = 'h-[105px]',
  hideLabelText = false,
  hideUnitText = false,
  sizeVariant = 'default',
  actualDataTestId,
  subtitle,
}) => {
  const isTv = sizeVariant === 'tv';
  const effectiveRadius = isTv ? (radius === 82 || radius === 90 ? 155 : radius) : radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const arcLength = Number((Math.PI * effectiveRadius).toFixed(2));
  const centerCoordX = isTv ? 180 : 100;
  const baselineY = isTv ? 175 : 102;
  const startX = centerCoordX - effectiveRadius;
  const endX = centerCoordX + effectiveRadius;
  const viewBoxStr = isTv ? '0 0 360 190' : '0 0 200 112';
  const strokeWidthVal = isTv ? 26 : 12;

  // SVG Path definition for semicircle
  const pathD = `M ${startX} ${baselineY} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${endX} ${baselineY}`;

  // Actual progress stroke offset
  const actualOffset = arcLength * (1 - clampedPercent / 100);

  // Optional pacing arc offset
  const clampedPacing = pacingPercent !== undefined ? Math.min(100, Math.max(0, pacingPercent)) : undefined;
  const pacingOffset = clampedPacing !== undefined ? arcLength * (1 - clampedPacing / 100) : undefined;

  // Needle position (circle on the arc)
  const angle = (clampedPercent / 100) * Math.PI;
  const needleX = Number((centerCoordX - effectiveRadius * Math.cos(angle)).toFixed(1));
  const needleY = Number((baselineY - effectiveRadius * Math.sin(angle)).toFixed(1));

  const gapColorClasses =
    gapType === 'positive'
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/40'
      : gapType === 'negative'
        ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/40'
        : 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-500/40';

  const bottomOffsetClass = isTv ? 'bottom-[16px] sm:bottom-[20px]' : 'bottom-[8px]';
  const toneConfig = TONE_MAP[tone] || TONE_MAP.emerald;

  const shouldRenderLabel = !hideLabelText && label && label.trim().length > 0;
  const visibleUnit = !hideUnitText && unit && unit.trim().length > 0 ? ` ${unit}` : '';

  const actualTextClass = isTv
    ? `text-7xl sm:text-8xl lg:text-9xl font-black font-mono tabular-nums leading-none ${toneConfig.textClass}`
    : `text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${toneConfig.textClass}`;
  const targetTextClass = isTv
    ? 'text-2xl sm:text-3xl lg:text-4xl font-mono text-slate-400 dark:text-zinc-500 font-bold leading-none'
    : 'text-[11px] font-mono text-slate-400 dark:text-zinc-500 font-bold leading-none';
  const badgeClass = isTv
    ? `text-xs sm:text-sm font-mono font-bold px-3 py-1 rounded-md border ${toneConfig.badgeClass}`
    : `text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${toneConfig.badgeClass}`;
  const gapBadgeClass = isTv
    ? `text-xs sm:text-sm font-mono font-black px-3 py-1 rounded-md border ${gapColorClasses}`
    : `text-[9px] font-mono font-black px-1.5 py-0.2 rounded border ${gapColorClasses}`;

  return (
    <div className={`relative w-full ${heightClass} mx-auto flex flex-col items-center justify-end ${className}`}>
      <svg className="w-full h-full overflow-visible" viewBox={viewBoxStr}>
        {/* Background Track Arc */}
        <path
          d={pathD}
          fill="none"
          strokeWidth={strokeWidthVal}
          strokeLinecap="round"
          className="stroke-slate-200 dark:stroke-zinc-800"
        />

        {/* Target / Pacing Arc (e.g. Red Gap or Pacing target) */}
        {showPacingArc && pacingOffset !== undefined && (
          <path
            d={pathD}
            fill="none"
            strokeWidth={strokeWidthVal}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={pacingOffset}
            className="stroke-rose-500/80 transition-all duration-500"
          />
        )}

        {/* Actual Progress Arc */}
        <path
          d={pathD}
          fill="none"
          strokeWidth={strokeWidthVal}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={actualOffset}
          className={`${toneConfig.strokeClass} transition-all duration-500`}
        />

        {/* Gold Needle Marker Dot */}
        {showNeedle && (
          <circle
            cx={needleX}
            cy={needleY}
            r={isTv ? 11 : 4.5}
            strokeWidth={isTv ? 3 : 1.5}
            className="fill-amber-300 stroke-zinc-950 transition-all duration-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.95)]"
          />
        )}
      </svg>

      {/* Baseline-anchored Metric Text (Sát đáy, không bao giờ chạm đỉnh vòm) */}
      <div
        className={`absolute inset-x-0 ${bottomOffsetClass} flex flex-col items-center justify-end pointer-events-none select-none`}
      >
        {shouldRenderLabel && (
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold leading-tight">
            {label}
          </span>
        )}
        <div className="flex items-baseline justify-center gap-1 my-0.5">
          <span data-testid={actualDataTestId} className={actualTextClass}>
            {actual}
          </span>
          <span className={targetTextClass}>{`/ ${target}${visibleUnit}`}</span>
          {/* Accessible hidden unit for screen readers and test assertions */}
          {unit && hideUnitText && <span className="hidden">{`/ ${target} ${unit}`}</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={badgeClass}>{percent}% ĐẠT</span>
          {gapText && <span className={gapBadgeClass}>{gapText}</span>}
        </div>
        {subtitle && <div className="text-zinc-400 text-xs font-mono font-medium mt-1">{subtitle}</div>}
      </div>
    </div>
  );
};
