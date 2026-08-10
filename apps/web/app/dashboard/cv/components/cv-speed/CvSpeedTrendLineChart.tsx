'use client';

import React, { useState } from 'react';
import { CvSpeedMonthlyTrend } from '@mos-lab/shared';

export interface CvSpeedTrendLineChartProps {
  monthlyTrend: CvSpeedMonthlyTrend[];
  isDark?: boolean;
  benchmarkMinutes?: number;
}

export function CvSpeedTrendLineChart({
  monthlyTrend,
  isDark = true,
  benchmarkMinutes = 60,
}: CvSpeedTrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!monthlyTrend || monthlyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-xs font-medium">
        Chưa có dữ liệu xu hướng 6 tháng
      </div>
    );
  }

  // SVG dimensions
  const width = 380;
  const height = 135;
  const paddingLeft = 32;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate Y min & max (around benchmark 60)
  const times = monthlyTrend.map((m) => m.avgTotalMinutes);
  const minVal = Math.min(...times, benchmarkMinutes - 15, 30);
  const maxVal = Math.max(...times, benchmarkMinutes + 20, 80);
  const valRange = maxVal - minVal || 1;

  const getY = (val: number) => {
    const ratio = (val - minVal) / valRange;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  const getX = (index: number) => {
    if (monthlyTrend.length <= 1) return paddingLeft + chartWidth / 2;
    const step = chartWidth / (monthlyTrend.length - 1);
    return paddingLeft + index * step;
  };

  const bmY = getY(benchmarkMinutes);

  // Generate SVG Points
  const points = monthlyTrend.map((m, idx) => ({
    x: getX(idx),
    y: getY(m.avgTotalMinutes),
    data: m,
  }));

  // Build smooth Bezier path
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
  }

  // Build Area path for gradient background
  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${
          paddingTop + chartHeight
        } Z`
      : '';

  // Hovered Point Calculations
  const hoveredPoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;
  const isNearTop = hoveredPoint ? hoveredPoint.y < 42 : false;
  const rawXPercent = hoveredPoint ? (hoveredPoint.x / width) * 100 : 50;
  // Clamp left percent to prevent tooltip from clipping on left/right edges
  const leftPercent = Math.max(18, Math.min(82, rawXPercent));

  return (
    <div
      className="relative w-full overflow-visible select-none pt-1"
      role="img"
      aria-label="Biểu đồ đường xu hướng tốc độ nối mi 6 tháng gần đây"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="speedTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={isDark ? 0.35 : 0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* HORIZONTAL GRID & BENCHMARK DASHED LINE */}
        <line
          x1={paddingLeft}
          y1={bmY}
          x2={width - paddingRight}
          y2={bmY}
          stroke={isDark ? '#ef4444' : '#dc2626'}
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity={0.8}
        />
        <text
          x={width - paddingRight}
          y={bmY - 4}
          textAnchor="end"
          fontSize="9"
          fontWeight="bold"
          fill={isDark ? '#f87171' : '#ef4444'}
          className="tabular-nums"
        >
          BM {benchmarkMinutes}p
        </text>

        {/* AREA GRADIENT FILL */}
        <path d={areaD} fill="url(#speedTrendGradient)" />

        {/* LINE PATH */}
        <path
          d={pathD}
          fill="none"
          stroke={isDark ? '#60a5fa' : '#2563eb'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* DATA NODES */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          const diff = pt.data.avgTotalMinutes - benchmarkMinutes;
          const isFaster = diff <= 0;

          return (
            <g key={`point_${pt.data.month}_${idx}`}>
              {/* Vertical Guide Line on Hover */}
              {isHovered && (
                <line
                  x1={pt.x}
                  y1={paddingTop - 10}
                  x2={pt.x}
                  y2={paddingTop + chartHeight}
                  stroke={isDark ? '#64748b' : '#cbd5e1'}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {/* Data Circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill={isFaster ? '#22c55e' : '#f43f5e'}
                stroke={isDark ? '#0f172a' : '#ffffff'}
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Month Label below */}
              <text
                x={pt.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight="500"
                fill={isHovered ? (isDark ? '#f8fafc' : '#0f172a') : isDark ? '#94a3b8' : '#64748b'}
                className="tabular-nums font-mono"
              >
                {pt.data.month.slice(5)}/{pt.data.month.slice(2, 4)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* HIGH CONTRAST HOVER TOOLTIP POPUP */}
      {hoveredPoint && (
        <div
          className="absolute z-50 px-3 py-2 rounded-xl shadow-2xl text-xs font-semibold pointer-events-none transition-all duration-150 border whitespace-nowrap min-w-[150px]"
          style={{
            left: `${leftPercent}%`,
            top: isNearTop ? `${(hoveredPoint.y / height) * 100 + 12}%` : `${(hoveredPoint.y / height) * 100 - 8}%`,
            transform: isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#475569' : '#cbd5e1',
            boxShadow: isDark ? '0 12px 28px -4px rgba(0, 0, 0, 0.85)' : '0 12px 28px -4px rgba(0, 0, 0, 0.15)',
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        >
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-700/80">
            <span
              className={isDark ? 'text-slate-200 font-bold tabular-nums' : 'text-slate-700 font-bold tabular-nums'}
            >
              Tháng {hoveredPoint.data.month}
            </span>
            <span
              className={`font-extrabold text-xs tabular-nums ${
                hoveredPoint.data.avgTotalMinutes <= benchmarkMinutes
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDark
                    ? 'text-rose-400'
                    : 'text-rose-600'
              }`}
            >
              {hoveredPoint.data.avgTotalMinutes}p
            </span>
          </div>

          <div
            className={`text-[11px] font-medium mt-1.5 flex items-center justify-between gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            <span>BM: {benchmarkMinutes}p</span>
            <span
              className={`font-bold tabular-nums ${
                hoveredPoint.data.avgTotalMinutes <= benchmarkMinutes
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDark
                    ? 'text-rose-400'
                    : 'text-rose-600'
              }`}
            >
              (
              {hoveredPoint.data.avgTotalMinutes <= benchmarkMinutes
                ? `Nhanh hơn ${benchmarkMinutes - hoveredPoint.data.avgTotalMinutes}p`
                : `Chậm hơn ${hoveredPoint.data.avgTotalMinutes - benchmarkMinutes}p`}
              )
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
