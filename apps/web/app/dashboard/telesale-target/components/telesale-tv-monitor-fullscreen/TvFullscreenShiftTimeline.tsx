'use client';

import React from 'react';
import type { ShiftTimelineProgress } from './tvFullscreenTypes';

interface TvFullscreenShiftTimelineProps {
  isDark: boolean;
  shiftNodes: string[];
  shiftProgress: ShiftTimelineProgress;
}

/** Expansive hourly shift timeline bar with trailing glowing beam and live current-time orb. */
export const TvFullscreenShiftTimeline: React.FC<TvFullscreenShiftTimelineProps> = ({
  isDark,
  shiftNodes,
  shiftProgress,
}) => {
  return (
    <div className="w-full max-w-[1160px] mx-auto relative flex items-center justify-between h-10 mt-3 mb-2 sm:mt-4 sm:mb-3 px-4">
      {/* Layer 1: Background & Active Track SVG */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
        <defs>
          <linearGradient id="activeTrailingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0)" />
            <stop offset="25%" stopColor="rgba(245, 158, 11, 0.2)" />
            <stop offset="65%" stopColor={isDark ? 'rgba(186, 230, 253, 0.6)' : 'rgba(245, 158, 11, 0.5)'} />
            <stop offset="90%" stopColor={isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(217, 119, 6, 0.85)'} />
            <stop offset="100%" stopColor={isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(180, 83, 9, 1)'} />
          </linearGradient>
        </defs>

        <line
          x1="2%"
          y1="20"
          x2="98%"
          y2="20"
          stroke={isDark ? 'rgb(63, 63, 70)' : 'rgb(203, 213, 225)'}
          strokeWidth="1.8"
          strokeDasharray="4 4"
        />

        <rect
          x="2%"
          y="16"
          width={`${Math.max(0, shiftProgress.percent - 2)}%`}
          height="8"
          rx="4"
          fill="url(#activeTrailingGrad)"
          opacity={isDark ? 0.7 : 0.4}
          filter="blur(3px)"
        />

        <rect
          x="2%"
          y="18.5"
          width={`${Math.max(0, shiftProgress.percent - 2)}%`}
          height="3"
          rx="1.5"
          fill="url(#activeTrailingGrad)"
          filter={
            isDark
              ? 'drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 0 12px rgba(245,158,11,0.8))'
              : 'drop-shadow(0 0 4px rgba(245,158,11,0.5))'
          }
        />
      </svg>

      {/* Layer 2: Shift Hour Nodes */}
      <div className="relative w-full flex items-center justify-between z-10 pointer-events-none">
        {shiftNodes.map((node, idx) => {
          const nodePercent = (idx / (shiftNodes.length - 1)) * 100;
          const isPast = nodePercent <= shiftProgress.percent;
          return (
            <span
              key={node}
              className={`px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm font-bold transition-colors ${
                isDark
                  ? `bg-zinc-950 ${isPast ? 'text-amber-400' : 'text-zinc-500'}`
                  : `bg-slate-100 ${isPast ? 'text-amber-600' : 'text-slate-400'}`
              }`}
            >
              {node}
            </span>
          );
        })}
      </div>

      {/* Layer 3: Current Time Indicator */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-20">
        <svg x={`${shiftProgress.percent}%`} y="20" overflow="visible">
          <text
            x="0"
            y="-15"
            textAnchor="middle"
            fill={isDark ? 'rgb(251, 191, 36)' : 'rgb(180, 83, 9)'}
            fontSize="13"
            fontFamily="monospace"
            fontWeight="bold"
            filter={isDark ? 'drop-shadow(0 0 6px rgba(245,158,11,0.9))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))'}
          >
            {shiftProgress.timeFormatted}
          </text>

          <circle cx="0" cy="0" r="11" fill="rgba(245, 158, 11, 0.35)" filter="drop-shadow(0 0 10px rgb(245,158,11))" />

          <circle
            cx="0"
            cy="0"
            r="6.5"
            fill="white"
            stroke="rgb(245, 158, 11)"
            strokeWidth="2.5"
            filter="drop-shadow(0 0 8px rgb(255,255,255))"
          />
        </svg>
      </svg>
    </div>
  );
};
