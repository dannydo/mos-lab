'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { CbCumulativeChartData } from './cb-live-telemetry-types';
import { CB_CHART_GUIDE_VALUES, formatMillions } from './cb-live-telemetry-utils';

interface CbRunRateChartCardProps {
  chartPoints: CbCumulativeChartData;
  isConfigured: boolean;
  totalSalesNet: number;
  totalSalesTarget: number;
}

export function CbRunRateChartCard({
  chartPoints,
  isConfigured,
  totalSalesNet,
  totalSalesTarget,
}: CbRunRateChartCardProps) {
  const latestPoint = chartPoints.points.length > 0 ? chartPoints.points[chartPoints.points.length - 1] : null;

  return (
    <div className="lg:col-span-5 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Nhịp Doanh Số Lũy Kế
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Thực tế
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-3 h-0.5 bg-slate-500 border-b border-dashed inline-block" /> Kế hoạch
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">Triệu đồng • Gói + Sản phẩm • Lũy kế đến ngày hiện tại</p>

        {/* SVG Cumulative Run-Rate Chart */}
        <div className="relative w-full h-40 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
          <svg className="w-full h-full" viewBox="0 0 420 150">
            {/* Horizontal guide lines */}
            {CB_CHART_GUIDE_VALUES.map((v) => {
              const y = 130 - (v / 560) * 110;
              return (
                <g key={v}>
                  <line
                    x1="20"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-800"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <text
                    x="5"
                    y={y + 3}
                    fill="currentColor"
                    className="text-slate-500"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Plan target line */}
            {isConfigured && (
              <line
                x1="20"
                y1="130"
                x2="400"
                y2="20"
                stroke="currentColor"
                className="text-slate-600"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
            )}

            {/* Actual cumulative line */}
            <path
              d={chartPoints.actualPath}
              fill="none"
              stroke="currentColor"
              className="text-amber-500"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Latest actual point dot */}
            {latestPoint && (
              <g>
                <circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="4"
                  fill="currentColor"
                  stroke="currentColor"
                  className="text-amber-500 stroke-amber-100"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
        <span>
          Hiện tại: <strong className="text-amber-400">{formatMillions(totalSalesNet)}</strong>
        </span>
        <span>
          Mục tiêu: <strong className="text-slate-300">{formatMillions(totalSalesTarget)}</strong>
        </span>
      </div>
    </div>
  );
}
