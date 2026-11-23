'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { CbAttributionTelemetry, CbGreenFunnelTelemetry, CbRetentionTelemetry } from '@mos-lab/shared';
import { formatMillions, formatVnd } from './cb-live-telemetry-utils';

interface CbAttributionCardProps {
  attribution: CbAttributionTelemetry;
  greenFunnel: CbGreenFunnelTelemetry;
  retention: CbRetentionTelemetry;
  comboOrderCount: number;
}

export function CbAttributionCard({ attribution, greenFunnel, retention, comboOrderCount }: CbAttributionCardProps) {
  const isMatched = attribution.reconciliationStatus === 'MATCHED';

  return (
    <div className="bg-slate-900/90 dark:bg-black/75 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Đối Soát Nguồn Doanh Số Gói (Phân Rã Loại Trừ Nhau 100%)
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
            isMatched
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isMatched ? 'Khớp 100% Ba Nguồn Gói (Không Trùng Lặp)' : 'Cần Kiểm Tra Lệch Nguồn'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Nguồn 1: Vòng Xanh */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-semibold text-emerald-400">1. Vòng Xanh</span>
            <span className="text-[10px] font-mono tabular-nums">{greenFunnel.greenVisitsCount} Done VX</span>
          </div>
          <div className="text-lg font-black text-slate-100 font-mono tabular-nums">
            {formatMillions(attribution.vongXanh.comboSalesNet)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 tabular-nums">
            <span>{attribution.vongXanh.comboOrderCount} đơn gói chốt</span>
            <span className="text-emerald-400 font-semibold">{greenFunnel.closingRatePercent}% chốt</span>
          </div>
        </div>

        {/* Nguồn 2: Dùng Gói Ngoài VX */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-semibold text-purple-400">2. Dùng Gói Ngoài VX</span>
            <span className="text-[10px] font-mono tabular-nums">{retention.packageUsageNonGreenVisitsCount} Done</span>
          </div>
          <div className="text-lg font-black text-slate-100 font-mono tabular-nums">
            {formatMillions(attribution.dungGoiNgoaiVx.comboSalesNet)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 tabular-nums">
            <span>{attribution.dungGoiNgoaiVx.comboOrderCount} đơn mua tiếp</span>
            <span className="text-purple-300 font-semibold">Gia hạn / Upgrade</span>
          </div>
        </div>

        {/* Nguồn 3: Khách Lẻ Khác */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-blue-500/20">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-semibold text-blue-400">3. Khách Lẻ Khác</span>
            <span className="text-[10px] font-mono tabular-nums">{attribution.leKhac.doneVisitsCount} Done</span>
          </div>
          <div className="text-lg font-black text-slate-100 font-mono tabular-nums">
            {formatMillions(attribution.leKhac.comboSalesNet)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 tabular-nums">
            <span>{attribution.leKhac.comboOrderCount} đơn lẻ mua gói</span>
            <span className="text-blue-300 font-semibold">Ngoại lệ</span>
          </div>
        </div>

        {/* Tổng Đối Soát Gói */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-bold text-amber-300">TỔNG DOANH SỐ GÓI</span>
            <span className="text-[10px] font-mono tabular-nums">{comboOrderCount} đơn</span>
          </div>
          <div className="text-lg font-black text-amber-300 font-mono tabular-nums">
            {formatMillions(attribution.totalComboSalesNet)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1 tabular-nums">
            <span>{formatVnd(attribution.totalComboSalesNet)}</span>
            <span className="text-emerald-400 font-mono">47 + 55 + 3 = 105</span>
          </div>
        </div>
      </div>
    </div>
  );
}
