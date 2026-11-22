'use client';

import React from 'react';
import type { CbLiveTelemetryResponse } from '@mos-lab/shared';
import { formatMillions } from './cb-live-telemetry-utils';

interface CbBottomStatusBarProps {
  uniquePaxCount: number;
  totalDoneVisits: number;
  uniquePaxPerVisit: number;
  pacingStatus: CbLiveTelemetryResponse['meta']['pacingStatus'];
  isConfigured: boolean;
  dailyPlanPace: number;
  packageUsageDoneTarget: number;
}

export function CbBottomStatusBar({
  uniquePaxCount,
  totalDoneVisits,
  uniquePaxPerVisit,
  pacingStatus,
  isConfigured,
  dailyPlanPace,
  packageUsageDoneTarget,
}: CbBottomStatusBarProps) {
  const dotColorClass =
    pacingStatus === 'ĐÚNG TIẾN ĐỘ'
      ? 'bg-emerald-400 animate-pulse'
      : pacingStatus === 'SÁT MỤC TIÊU'
        ? 'bg-amber-400'
        : pacingStatus === 'HỤT MỤC TIÊU'
          ? 'bg-red-400 animate-pulse'
          : 'bg-slate-500';

  const statusTextColorClass =
    pacingStatus === 'ĐÚNG TIẾN ĐỘ'
      ? 'text-emerald-400'
      : pacingStatus === 'SÁT MỤC TIÊU'
        ? 'text-amber-400'
        : pacingStatus === 'HỤT MỤC TIÊU'
          ? 'text-red-400'
          : 'text-slate-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* KHÁCH HÀNG DUY NHẤT */}
      <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Khách Hàng Duy Nhất (Unique Pax)
          </span>
          <div className="text-2xl font-black text-slate-100 font-mono tabular-nums mt-1">
            {uniquePaxCount} <span className="text-sm font-normal text-slate-400">khách</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono tabular-nums">
          <div>{totalDoneVisits} lượt Done toàn hệ thống</div>
          <div className="text-amber-300">{uniquePaxPerVisit} lượt / khách</div>
        </div>
      </div>

      {/* CẢNH BÁO NHỊP */}
      <div className="bg-slate-900/90 dark:bg-black/75 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Cảnh Báo Nhịp</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-3 h-3 rounded-full ${dotColorClass}`} />
            <span className={`text-lg font-black tracking-wide ${statusTextColorClass}`}>{pacingStatus}</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono tabular-nums">
          <div>Nhịp: {isConfigured ? `${formatMillions(dailyPlanPace)}/ngày` : '---'}</div>
          <div>Mốc: {packageUsageDoneTarget || 1000} Done dùng gói</div>
        </div>
      </div>
    </div>
  );
}
