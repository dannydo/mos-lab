'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';
import type { CbForecastTelemetry } from '@mos-lab/shared';
import { formatMillions } from './cb-live-telemetry-utils';

interface CbMonthlyForecastCardProps {
  forecast: CbForecastTelemetry;
  totalSalesTarget: number;
  isConfigured: boolean;
}

export function CbMonthlyForecastCard({ forecast, totalSalesTarget, isConfigured }: CbMonthlyForecastCardProps) {
  const isPositiveVariance = forecast.forecastVariance >= 0;

  return (
    <div className="lg:col-span-4 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Dự Báo Chốt Tháng
          </span>
          <span className="text-[10px] text-slate-400">Nhịp 7 ngày gần nhất</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">Theo nhịp thực tế 7 ngày vừa qua</p>

        <div className="flex items-baseline gap-2 mb-2 font-mono tabular-nums">
          <span className="text-4xl font-black text-emerald-400">
            {isConfigured ? formatMillions(forecast.forecastTotal) : '---'}
          </span>
          <span className="text-slate-500 text-sm font-semibold">
            / {isConfigured ? formatMillions(totalSalesTarget) : '---'}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
            {isConfigured ? `${forecast.forecastPercent}%` : '---'}
          </span>
          <span className="text-xs text-slate-400">dự báo đạt</span>
        </div>

        {/* Difference Badge */}
        {isConfigured && (
          <div
            className={`p-2.5 rounded-xl border text-xs font-medium mb-3 flex items-center gap-2 tabular-nums ${
              isPositiveVariance
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border-red-500/30'
            }`}
          >
            {isPositiveVariance ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
            <span>
              {isPositiveVariance ? '+' : ''}
              {formatMillions(forecast.forecastVariance)} so với mục tiêu
            </span>
          </div>
        )}

        {/* Formula Explanation */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono tabular-nums">
          {forecast.summaryFormula}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Trạng thái dự báo:</span>
        <span
          className={`font-semibold ${
            forecast.status === 'ON_TRACK'
              ? 'text-emerald-400'
              : forecast.status === 'BORDERLINE'
                ? 'text-amber-400'
                : 'text-red-400'
          }`}
        >
          {forecast.status === 'ON_TRACK'
            ? 'Đúng nhịp'
            : forecast.status === 'BORDERLINE'
              ? 'Sát mục tiêu'
              : 'Nguy cơ hụt'}
        </span>
      </div>
    </div>
  );
}
