'use client';

import React from 'react';
import {
  getPentagonPoints,
  pointsToString,
  polarToXY,
  RADAR_ANGLES,
  RADAR_CENTER_X,
  RADAR_CENTER_Y,
  RADAR_MAX_R,
} from '../../hooks/useTelesalesDashboard';
import {
  RADAR_AXES,
  RADAR_GOLD_FILL_DARK,
  RADAR_GOLD_FILL_LIGHT,
  RADAR_GOLD_STROKE_RGB,
  RADAR_POINT_ACTIVE_STROKE_RGB,
  RADAR_RING_LEVELS,
} from './backFaceVisualConfig';
import type { TelesalesBackThemeMode } from './telesalesBackFaceTypes';

export interface TelesalesRadarChartProps {
  themeMode: TelesalesBackThemeMode;
  currentMetricKey: string;
  dataPoints: SafeAny[];
}

export const TelesalesRadarChart: React.FC<TelesalesRadarChartProps> = ({
  themeMode,
  currentMetricKey,
  dataPoints,
}) => {
  const isDark = themeMode === 'dark';
  const labelDist = RADAR_MAX_R + 24;

  return (
    <div className="flex flex-col items-center my-1.5 flex-shrink-0">
      <svg viewBox="0 0 580 400" className="w-[240px] h-[165px] select-none">
        {/* Concentric rings */}
        {RADAR_RING_LEVELS.map((level) => {
          const pts = getPentagonPoints(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R * level);
          const ptsStr = pointsToString(pts);
          const isOuter = level === 1.0;
          const stroke = isOuter
            ? isDark
              ? 'rgba(255,255,255,0.32)'
              : 'rgba(0,0,0,0.35)'
            : isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(0,0,0,0.14)';

          return (
            <polygon
              key={level}
              points={ptsStr}
              fill="none"
              stroke={stroke}
              strokeWidth={isOuter ? '1.5' : '0.75'}
              strokeDasharray={isOuter ? 'none' : '3,3'}
            />
          );
        })}

        {/* Axis lines */}
        {RADAR_ANGLES.map((angle, i) => {
          const axis = RADAR_AXES[i];
          const end = polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_MAX_R, angle);
          const isActive = currentMetricKey === axis.key;
          return (
            <line
              key={axis.key}
              x1={RADAR_CENTER_X}
              y1={RADAR_CENTER_Y}
              x2={end.x}
              y2={end.y}
              stroke={isActive ? axis.rgb : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
              strokeWidth={isActive ? 1.5 : 0.5}
            />
          );
        })}

        {/* Axis labels */}
        {RADAR_ANGLES.map((angle, i) => {
          const axis = RADAR_AXES[i];
          const pos = polarToXY(RADAR_CENTER_X, RADAR_CENTER_Y, labelDist, angle);
          const isActive = currentMetricKey === axis.key;

          return (
            <text
              key={axis.key}
              x={pos.x}
              y={pos.y}
              textAnchor={axis.anchor}
              dy={axis.dy}
              fill={axis.rgb}
              fontSize={25}
              fontWeight={isActive ? 950 : 650}
              fontFamily="Plus Jakarta Sans"
            >
              {axis.label}
            </text>
          );
        })}

        {/* Values polygon */}
        <polygon
          points={pointsToString(dataPoints)}
          fill={isDark ? RADAR_GOLD_FILL_DARK : RADAR_GOLD_FILL_LIGHT}
          stroke={RADAR_GOLD_STROKE_RGB}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((pt, i) => {
          const axis = RADAR_AXES[i];
          if (!axis) return null;
          const isActive = currentMetricKey === axis.key;
          return (
            <circle
              key={axis.key}
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 5 : 3}
              fill={axis.rgb}
              stroke={isActive ? RADAR_POINT_ACTIVE_STROKE_RGB : 'none'}
              strokeWidth={isActive ? 1.5 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
};
