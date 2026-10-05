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
    textClass: 'text-emerald-400',
    badgeClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
  },
  blue: {
    strokeClass: 'stroke-blue-500',
    textClass: 'text-blue-400',
    badgeClass: 'text-blue-400 border-blue-500/30 bg-blue-950/40',
  },
  purple: {
    strokeClass: 'stroke-purple-500',
    textClass: 'text-purple-400',
    badgeClass: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
  },
  amber: {
    strokeClass: 'stroke-amber-500',
    textClass: 'text-amber-400',
    badgeClass: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
  },
  rose: {
    strokeClass: 'stroke-rose-500',
    textClass: 'text-rose-400',
    badgeClass: 'text-rose-400 border-rose-500/30 bg-rose-950/40',
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
  radius = 82,
  showNeedle = true,
  className = '',
  heightClass = 'h-[105px]',
  hideLabelText = false,
  hideUnitText = false,
}) => {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const arcLength = Number((Math.PI * radius).toFixed(2)); // ~257.6 for 82, ~245 for 78
  const startX = 100 - radius;
  const endX = 100 + radius;
  const baselineY = 105;

  // SVG Path definition for semicircle
  const pathD = `M ${startX} ${baselineY} A ${radius} ${radius} 0 0 1 ${endX} ${baselineY}`;

  // Actual progress stroke offset
  const actualOffset = arcLength * (1 - clampedPercent / 100);

  // Optional pacing arc offset
  const clampedPacing = pacingPercent !== undefined ? Math.min(100, Math.max(0, pacingPercent)) : undefined;
  const pacingOffset = clampedPacing !== undefined ? arcLength * (1 - clampedPacing / 100) : undefined;

  // Needle position (circle on the arc)
  const angle = (clampedPercent / 100) * Math.PI;
  const needleX = Number((100 - radius * Math.cos(angle)).toFixed(1));
  const needleY = Number((baselineY - radius * Math.sin(angle)).toFixed(1));

  const gapColorClasses =
    gapType === 'positive'
      ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
      : gapType === 'negative'
        ? 'text-rose-400 bg-rose-950/80 border-rose-500/40'
        : 'text-amber-400 bg-amber-950/80 border-amber-500/40';

  const bottomOffsetClass = radius <= 78 ? 'bottom-[8px]' : 'bottom-[10px]';
  const toneConfig = TONE_MAP[tone] || TONE_MAP.emerald;

  const shouldRenderLabel = !hideLabelText && label && label.trim().length > 0;
  const visibleUnit = !hideUnitText && unit && unit.trim().length > 0 ? ` ${unit}` : '';

  return (
    <div className={`relative w-full ${heightClass} mx-auto flex flex-col items-center justify-end ${className}`}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 115">
        {/* Background Track Arc */}
        <path d={pathD} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-zinc-800" />

        {/* Target / Pacing Arc (e.g. Red Gap or Pacing target) */}
        {showPacingArc && pacingOffset !== undefined && (
          <path
            d={pathD}
            fill="none"
            strokeWidth="12"
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
          strokeWidth="12"
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
            r="4.5"
            strokeWidth="1.5"
            className="fill-amber-400 stroke-zinc-900 transition-all duration-500 drop-shadow"
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
          <span
            className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${toneConfig.textClass}`}
          >
            {actual}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 font-bold leading-none">
            {`/ ${target}${visibleUnit}`}
          </span>
          {/* Accessible hidden unit for screen readers and test assertions */}
          {unit && hideUnitText && <span className="hidden">{`/ ${target} ${unit}`}</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${toneConfig.badgeClass}`}>
            {percent}% ĐẠT
          </span>
          {gapText && (
            <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded border ${gapColorClasses}`}>
              {gapText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
