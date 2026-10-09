'use client';

import React from 'react';

export type GaugeTone = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';

export interface SemicircleGaugeProps {
  percent: number;
  actual: number | string;
  target: number | string;
  expected?: number;
  gap?: number;
  unit?: string;
  label?: string;
  tone?: GaugeTone;
  pacingPercent?: number;
  showPacingArc?: boolean;
  showDeficitZone?: boolean;
  showPacingMarker?: boolean;
  showFloatingGapBadge?: boolean;
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
  expected,
  gap,
  unit = '',
  label = '',
  tone = 'emerald',
  pacingPercent,
  showPacingArc = false,
  showDeficitZone = true,
  showPacingMarker = true,
  showFloatingGapBadge = true,
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
  const viewBoxStr = isTv ? '0 -22 360 212' : '0 -10 200 122';
  const strokeWidthVal = isTv ? 26 : 12;

  // SVG Path definition for semicircle
  const pathD = `M ${startX} ${baselineY} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${endX} ${baselineY}`;

  // Actual progress stroke offset
  const actualOffset = arcLength * (1 - clampedPercent / 100);

  // Expected pacing calculation
  const numericTarget = Number(target) || 0;
  const numericActual = Number(actual) || 0;
  const numericExpected =
    expected !== undefined
      ? expected
      : pacingPercent !== undefined && numericTarget > 0
        ? Math.round((pacingPercent / 100) * numericTarget)
        : undefined;

  const effectivePacingPercent =
    pacingPercent !== undefined
      ? pacingPercent
      : numericExpected !== undefined && numericTarget > 0
        ? (numericExpected / numericTarget) * 100
        : undefined;

  const clampedPacing =
    effectivePacingPercent !== undefined ? Math.min(100, Math.max(0, effectivePacingPercent)) : undefined;

  // Optional legacy pacing arc offset
  const pacingOffset = clampedPacing !== undefined ? arcLength * (1 - clampedPacing / 100) : undefined;

  const effectiveGap =
    gap !== undefined ? gap : numericExpected !== undefined ? numericActual - numericExpected : undefined;

  const isDeficit =
    effectiveGap !== undefined ? effectiveGap < 0 : clampedPacing !== undefined && clampedPercent < clampedPacing;

  const deficitAmount = isDeficit
    ? effectiveGap !== undefined
      ? Math.abs(effectiveGap)
      : Math.max(1, Math.round(((clampedPacing! - clampedPercent) / 100) * numericTarget))
    : 0;

  // Deficit Arc Calculation (from clampedPercent to clampedPacing)
  let deficitArcD: string | null = null;
  if (showDeficitZone && isDeficit && clampedPacing !== undefined && clampedPacing > clampedPercent) {
    const rad1 = (clampedPercent / 100) * Math.PI;
    const rad2 = (clampedPacing / 100) * Math.PI;
    const x1 = Number((centerCoordX - effectiveRadius * Math.cos(rad1)).toFixed(1));
    const y1 = Number((baselineY - effectiveRadius * Math.sin(rad1)).toFixed(1));
    const x2 = Number((centerCoordX - effectiveRadius * Math.cos(rad2)).toFixed(1));
    const y2 = Number((baselineY - effectiveRadius * Math.sin(rad2)).toFixed(1));
    deficitArcD = `M ${x1} ${y1} A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${x2} ${y2}`;
  }

  // Pacing Marker Line coordinates (Radial tick at clampedPacing)
  let markerCoords: {
    xIn: number;
    yIn: number;
    xOut: number;
    yOut: number;
    xLbl: number;
    yLbl: number;
  } | null = null;
  if (showPacingMarker && clampedPacing !== undefined && clampedPacing > 0) {
    const radP = (clampedPacing / 100) * Math.PI;
    const rIn = effectiveRadius - strokeWidthVal / 2 - (isTv ? 6 : 3);
    const rOut = effectiveRadius + strokeWidthVal / 2 + (isTv ? 7 : 4);
    const rLbl = rOut + (isTv ? 13 : 8);
    markerCoords = {
      xIn: Number((centerCoordX - rIn * Math.cos(radP)).toFixed(1)),
      yIn: Number((baselineY - rIn * Math.sin(radP)).toFixed(1)),
      xOut: Number((centerCoordX - rOut * Math.cos(radP)).toFixed(1)),
      yOut: Number((baselineY - rOut * Math.sin(radP)).toFixed(1)),
      xLbl: Number((centerCoordX - rLbl * Math.cos(radP)).toFixed(1)),
      yLbl: Number((baselineY - rLbl * Math.sin(radP)).toFixed(1)),
    };
  }

  // Floating Gap Badge coordinates (Pill above the arc)
  let floatingBadge: {
    x: number;
    y: number;
    text: string;
    type: 'deficit' | 'surplus' | 'on_track';
  } | null = null;

  if (showFloatingGapBadge && isTv && clampedPacing !== undefined) {
    if (isDeficit && deficitAmount > 0) {
      // Place badge at midpoint of deficit arc
      const midRad = ((clampedPercent + clampedPacing) / 2 / 100) * Math.PI;
      const rBadge = effectiveRadius + strokeWidthVal / 2 + 18;
      floatingBadge = {
        x: Number((centerCoordX - rBadge * Math.cos(midRad)).toFixed(1)),
        y: Number((baselineY - rBadge * Math.sin(midRad)).toFixed(1)),
        text: `-${deficitAmount} CHẬM`,
        type: 'deficit',
      };
    } else if (effectiveGap !== undefined && effectiveGap > 0) {
      const tipRad = (clampedPercent / 100) * Math.PI;
      const rBadge = effectiveRadius + strokeWidthVal / 2 + 18;
      floatingBadge = {
        x: Number((centerCoordX - rBadge * Math.cos(tipRad)).toFixed(1)),
        y: Number((baselineY - rBadge * Math.sin(tipRad)).toFixed(1)),
        text: `+${effectiveGap} VƯỢT`,
        type: 'surplus',
      };
    } else if (effectiveGap !== undefined && effectiveGap === 0 && numericActual > 0) {
      const tipRad = (clampedPercent / 100) * Math.PI;
      const rBadge = effectiveRadius + strokeWidthVal / 2 + 18;
      floatingBadge = {
        x: Number((centerCoordX - rBadge * Math.cos(tipRad)).toFixed(1)),
        y: Number((baselineY - rBadge * Math.sin(tipRad)).toFixed(1)),
        text: 'ĐÚNG NHỊP',
        type: 'on_track',
      };
    }
  }

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

        {/* Deficit Warning Arc (Vùng chậm nhịp từ actual đến expected) */}
        {deficitArcD && (
          <g className="transition-all duration-500">
            {/* Glowing red base track */}
            <path
              d={deficitArcD}
              fill="none"
              strokeWidth={strokeWidthVal}
              strokeLinecap="butt"
              className="stroke-rose-600/50 dark:stroke-rose-600/60"
            />
            {/* Warning hazard striped pulse */}
            <path
              d={deficitArcD}
              fill="none"
              strokeWidth={strokeWidthVal - (isTv ? 6 : 3)}
              strokeLinecap="butt"
              strokeDasharray={isTv ? '6 4' : '3 2'}
              className="stroke-amber-300 dark:stroke-amber-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.95)] animate-pulse"
            />
          </g>
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

        {/* Expected Pacing Milestone Tick & Label */}
        {markerCoords && (
          <g className="transition-all duration-500">
            <line
              x1={markerCoords.xIn}
              y1={markerCoords.yIn}
              x2={markerCoords.xOut}
              y2={markerCoords.yOut}
              strokeWidth={isTv ? 3.5 : 2}
              strokeLinecap="round"
              className="stroke-emerald-400 dark:stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]"
            />
            {numericExpected !== undefined && isTv && (
              <text
                x={markerCoords.xLbl}
                y={markerCoords.yLbl}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[11px] font-mono font-black fill-emerald-400 dark:fill-emerald-300 drop-shadow-[0_0_8px_rgba(0,0,0,0.95)] select-none pointer-events-none"
              >
                {numericExpected}
              </text>
            )}
          </g>
        )}

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

        {/* Floating Gap Badge directly on Arc */}
        {floatingBadge && (
          <g
            transform={`translate(${floatingBadge.x}, ${floatingBadge.y})`}
            className="select-none pointer-events-none transition-all duration-500"
          >
            <rect
              x={-34}
              y={-10}
              width={68}
              height={20}
              rx={10}
              className={
                floatingBadge.type === 'deficit'
                  ? 'fill-rose-950/95 stroke stroke-rose-500/80 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                  : 'fill-emerald-950/95 stroke stroke-emerald-500/80 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]'
              }
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-[10px] font-mono font-black tracking-wider ${
                floatingBadge.type === 'deficit' ? 'fill-rose-300' : 'fill-emerald-300'
              }`}
            >
              {floatingBadge.text}
            </text>
          </g>
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
