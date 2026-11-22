'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import type { CbRevenueTelemetry, CbTargetConfig } from '@mos-lab/shared';
import type { CbDrilldownCategory } from './cb-live-telemetry-types';
import { formatMillions, formatVnd } from './cb-live-telemetry-utils';

interface CbTopRevenueCardsProps {
  revenue: CbRevenueTelemetry;
  targets: CbTargetConfig;
  isConfigured: boolean;
  onOpenDrilldown: (category: CbDrilldownCategory, title: string) => void;
}

export function CbTopRevenueCards({ revenue, targets, isConfigured, onOpenDrilldown }: CbTopRevenueCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* DOANH SỐ GÓI */}
      <div
        onClick={() => onOpenDrilldown('COMBO', 'Danh sách Đơn Bán Gói (Chưa VAT)')}
        className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-blue-500/60 transition-all rounded-2xl p-4 cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span className="tracking-wide text-slate-300">DOANH SỐ GÓI</span>
          <span className="text-blue-400 group-hover:text-blue-300 flex items-center gap-1 text-[11px]">
            Chi tiết <Eye className="w-3 h-3" />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-black text-blue-400 tracking-tight font-mono tabular-nums">
            {formatMillions(revenue.comboSalesNet)}
          </span>
          <span className="text-slate-500 text-sm font-semibold tabular-nums">
            / {isConfigured ? formatMillions(targets.comboSalesTarget) : '---'}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium tabular-nums">
          {isConfigured ? (
            <span className="text-blue-300 font-semibold">{revenue.comboAttainmentPercent}% mục tiêu tháng</span>
          ) : (
            <span className="text-slate-500 italic">Chưa cấu hình mục tiêu</span>
          )}
          <span className="text-slate-500 ml-2">({revenue.comboOrderCount} đơn)</span>
        </div>
      </div>

      {/* SẢN PHẨM */}
      <div
        onClick={() => onOpenDrilldown('PRODUCT', 'Danh sách Đơn Bán Sản Phẩm (Chưa VAT)')}
        className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 hover:border-purple-500/60 transition-all rounded-2xl p-4 cursor-pointer group shadow-lg"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span className="tracking-wide text-slate-300">SẢN PHẨM</span>
          <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1 text-[11px]">
            Chi tiết <Eye className="w-3 h-3" />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-black text-purple-400 tracking-tight font-mono tabular-nums">
            {formatMillions(revenue.productSalesNet)}
          </span>
          <span className="text-slate-500 text-sm font-semibold tabular-nums">
            / {isConfigured ? formatMillions(targets.productSalesTarget) : '---'}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium tabular-nums">
          {isConfigured ? (
            <span className="text-purple-300 font-semibold">{revenue.productAttainmentPercent}% mục tiêu tháng</span>
          ) : (
            <span className="text-slate-500 italic">Chưa cấu hình</span>
          )}
          <span className="text-slate-500 ml-2">({revenue.productOrderCount} đơn)</span>
        </div>
      </div>

      {/* TỔNG DOANH SỐ */}
      <div className="bg-slate-900/90 dark:bg-black/75 border border-amber-500/40 rounded-2xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span className="tracking-wide text-amber-300">TỔNG DOANH SỐ</span>
          <span className="text-[11px] text-amber-400/80 font-mono">Gói + SP</span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-black text-amber-300 tracking-tight font-mono tabular-nums">
            {formatMillions(revenue.totalSalesNet)}
          </span>
          <span className="text-slate-500 text-sm font-semibold tabular-nums">
            / {isConfigured ? formatMillions(targets.totalSalesTarget) : '---'}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium tabular-nums">
          {isConfigured ? (
            <span className="text-amber-300 font-semibold">{revenue.totalAttainmentPercent}% mục tiêu</span>
          ) : (
            <span className="text-slate-500 italic">Chưa cấu hình</span>
          )}
          <span className="text-slate-500 ml-2">({formatVnd(revenue.totalSalesNet)})</span>
        </div>
      </div>

      {/* NHỊP KẾ HOẠCH */}
      <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span className="tracking-wide text-slate-300">NHỊP KẾ HOẠCH</span>
          <span className="text-[11px] text-emerald-400/80 font-mono tabular-nums">{targets.daysInMonth} ngày</span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-black text-emerald-400 tracking-tight font-mono tabular-nums">
            {isConfigured ? formatMillions(targets.dailyPlanPace) : '---'}
          </span>
          <span className="text-slate-500 text-sm font-semibold">/ ngày</span>
        </div>
        <div className="text-xs text-slate-400 font-medium tabular-nums">
          {isConfigured ? (
            <span>
              {formatMillions(targets.totalSalesTarget)} ÷ {targets.daysInMonth} ngày
            </span>
          ) : (
            <span className="text-slate-500 italic">Chưa cấu hình nhịp</span>
          )}
        </div>
      </div>
    </div>
  );
}
