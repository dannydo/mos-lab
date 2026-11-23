'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import type { CbDailyRecord } from '@mos-lab/shared';
import type { CbDailyTotals, CbDailyViewMode } from './cb-live-telemetry-types';
import { formatMillions } from './cb-live-telemetry-utils';

interface CbDailyAnalysisTableCardProps {
  records: CbDailyRecord[];
  totalDaysCount: number;
  dailyTotals: CbDailyTotals;
  dailyViewMode: CbDailyViewMode;
  onChangeDailyViewMode: (mode: CbDailyViewMode) => void;
  isConfigured: boolean;
  totalAttainmentPercent?: number;
}

export function CbDailyAnalysisTableCard({
  records,
  totalDaysCount,
  dailyTotals,
  dailyViewMode,
  onChangeDailyViewMode,
  isConfigured,
  totalAttainmentPercent,
}: CbDailyAnalysisTableCardProps) {
  return (
    <div className="lg:col-span-8 bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            Phân Tích Theo Ngày
          </span>
          <p className="text-[11px] text-slate-400">
            Doanh số chưa VAT • Đơn vị M • Có dòng tổng kết khớp 100% với Card trên
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => onChangeDailyViewMode('RECENT_7')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              dailyViewMode === 'RECENT_7' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7 ngày gần nhất
          </button>
          <button
            type="button"
            onClick={() => onChangeDailyViewMode('ALL_MONTH')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              dailyViewMode === 'ALL_MONTH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cả tháng ({totalDaysCount} ngày)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium">
              <th className="py-2 px-2">NGÀY</th>
              <th className="py-2 px-2 text-right">GÓI</th>
              <th className="py-2 px-2 text-right">SP</th>
              <th className="py-2 px-2 text-right">TỔNG</th>
              <th className="py-2 px-2 text-right">DONE VX</th>
              <th className="py-2 px-2 text-right">DONE GÓI</th>
              <th className="py-2 px-2 text-right">SO VỚI NHỊP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
            {records.map((r) => {
              const isPositive = r.varianceToPace >= 0;
              return (
                <tr key={r.date} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-2 text-slate-300 font-semibold">{r.displayDate}</td>
                  <td className="py-2 px-2 text-right text-blue-400">{formatMillions(r.comboSalesNet)}</td>
                  <td className="py-2 px-2 text-right text-purple-400">{formatMillions(r.productSalesNet)}</td>
                  <td className="py-2 px-2 text-right text-amber-300 font-bold">{formatMillions(r.totalSalesNet)}</td>
                  <td className="py-2 px-2 text-right text-emerald-400">{r.greenVisitsCount}</td>
                  <td className="py-2 px-2 text-right text-purple-400">{r.packageUsageVisitsCount}</td>
                  <td className="py-2 px-2 text-right">
                    {isConfigured ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatMillions(r.varianceToPace)}
                      </span>
                    ) : (
                      <span className="text-slate-600">---</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-700 bg-slate-950/80 font-mono tabular-nums font-bold">
            <tr>
              <td className="py-2.5 px-2 text-amber-300">TỔNG CỘNG ({records.length}N)</td>
              <td className="py-2.5 px-2 text-right text-blue-400">{formatMillions(dailyTotals.combo)}</td>
              <td className="py-2.5 px-2 text-right text-purple-400">{formatMillions(dailyTotals.product)}</td>
              <td className="py-2.5 px-2 text-right text-amber-300">{formatMillions(dailyTotals.total)}</td>
              <td className="py-2.5 px-2 text-right text-emerald-400">{dailyTotals.greenVisits}</td>
              <td className="py-2.5 px-2 text-right text-purple-400">{dailyTotals.packageUsageVisits}</td>
              <td className="py-2.5 px-2 text-right text-slate-400">
                {isConfigured ? `${Math.round(totalAttainmentPercent || 0)}%` : '---'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
