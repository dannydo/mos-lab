'use client';

import React from 'react';
import { Target, Users } from 'lucide-react';
import { Progress } from 'antd';
import type { CbGreenFunnelTelemetry, CbRetentionTelemetry, CbRevenueTelemetry, CbTargetConfig } from '@mos-lab/shared';
import type { CbCumulativeChartData, CbDrilldownCategory } from './cb-live-telemetry-types';
import { formatMillions } from './cb-live-telemetry-utils';
import { CbRunRateChartCard } from './CbRunRateChartCard';

interface CbFunnelTelemetryRowProps {
  chartPoints: CbCumulativeChartData;
  isConfigured: boolean;
  revenue: CbRevenueTelemetry;
  targets: CbTargetConfig;
  greenFunnel: CbGreenFunnelTelemetry;
  retention: CbRetentionTelemetry;
  onOpenDrilldown: (category: CbDrilldownCategory, title: string) => void;
}

export function CbFunnelTelemetryRow({
  chartPoints,
  isConfigured,
  revenue,
  targets,
  greenFunnel,
  retention,
  onOpenDrilldown,
}: CbFunnelTelemetryRowProps) {
  const inGreenPackageVisits = Math.max(
    0,
    retention.balanceDeductionVisitsCount - retention.packageUsageNonGreenVisitsCount
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <CbRunRateChartCard
        chartPoints={chartPoints}
        isConfigured={isConfigured}
        totalSalesNet={revenue.totalSalesNet}
        totalSalesTarget={targets.totalSalesTarget}
      />

      {/* Cột 2: ĐỘNG CƠ VÒNG XANH (Done từ khách lẻ) (3 cols) */}
      <div
        onClick={() => onOpenDrilldown('GREEN_FUNNEL', 'Lượt Done Vòng Xanh')}
        className="lg:col-span-3 bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-emerald-500/50 transition-all rounded-2xl p-4 shadow-lg cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              Vòng Xanh
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tabular-nums">
              Vạch: 10,0%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Done từ khách lẻ</p>

          <div className="flex items-baseline gap-2 mb-2 font-mono tabular-nums">
            <span className="text-3xl font-black text-emerald-400">{greenFunnel.greenVisitsCount}</span>
            <span className="text-slate-500 text-sm font-semibold">/ {greenFunnel.greenVisitsTarget} Done</span>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <Progress
              percent={Math.min(100, greenFunnel.progressPercent)}
              showInfo={false}
              strokeColor="rgb(16 185 129)"
              trailColor="rgb(30 41 59)"
              size="small"
            />
          </div>

          <div className="space-y-1.5 text-xs tabular-nums">
            <div className="flex items-center justify-between text-slate-300">
              <span>• Đơn gói chốt:</span>
              <strong className="text-emerald-400 font-mono">{greenFunnel.greenComboOrdersCount} đơn</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>• Tỷ lệ chốt Live:</span>
              <strong className="text-emerald-400 font-mono">{greenFunnel.closingRatePercent}%</strong>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Kế hoạch:</span>
          <span className="font-mono text-slate-300 tabular-nums">780 Book → 540 Done</span>
        </div>
      </div>

      {/* Cột 3: KHÁCH ĐANG DÙNG GÓI (Done có trừ lượt gói) (4 cols) */}
      <div
        onClick={() => onOpenDrilldown('PACKAGE_USAGE', 'Lượt Done Khách Dùng Gói (Trừ Số Dư)')}
        className="lg:col-span-4 bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-purple-500/50 transition-all rounded-2xl p-4 shadow-lg cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-400" />
              Khách Đang Dùng Gói
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30 tabular-nums">
              Mốc: 1.000 Done
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Done có trừ lượt gói</p>

          <div className="flex items-baseline gap-2 mb-1 font-mono tabular-nums">
            <span className="text-3xl font-black text-purple-400">{retention.balanceDeductionVisitsCount}</span>
            <span className="text-slate-500 text-sm font-semibold">/ {retention.targetVisits} Done</span>
          </div>

          <div className="text-[11px] text-purple-300/80 mb-2 font-mono tabular-nums">
            ({retention.packageUsageNonGreenVisitsCount} ngoài VX + {inGreenPackageVisits} trong VX)
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <Progress
              percent={Math.min(100, retention.progressPercent)}
              showInfo={false}
              strokeColor="rgb(168 85 247)"
              trailColor="rgb(30 41 59)"
              size="small"
            />
          </div>

          <div className="space-y-1.5 text-xs tabular-nums">
            <div className="flex items-center justify-between text-slate-300">
              <span>• Đơn mua tiếp / gia hạn:</span>
              <strong className="text-purple-400 font-mono">{retention.repurchaseOrdersCount} đơn</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>• Doanh số gói mua tiếp:</span>
              <strong className="text-purple-400 font-mono">
                {formatMillions(retention.repurchaseComboSalesNet)} /{' '}
                {formatMillions(targets.repeatComboSalesTarget || 349_000_000)}
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Renew / Upgrade:</span>
          <span className="font-mono text-slate-300 tabular-nums">Mục tiêu 349M gói</span>
        </div>
      </div>
    </div>
  );
}
