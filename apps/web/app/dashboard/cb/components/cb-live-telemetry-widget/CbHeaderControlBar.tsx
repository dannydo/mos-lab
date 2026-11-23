'use client';

import React from 'react';
import { Clock, Radio, RefreshCw, Sliders, Sparkles } from 'lucide-react';
import { Select } from 'antd';
import type { CbTargetConfig } from '@mos-lab/shared';
import { IconButton } from '~/components/ui';
import type { CbStoreScope } from './cb-live-telemetry-types';
import {
  CB_MONTH_OPTIONS,
  CB_STORE_SCOPE_OPTIONS,
  formatMillions,
  formatMonthSubtitle,
  formatStoreScopeLabel,
} from './cb-live-telemetry-utils';

interface CbHeaderControlBarProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  storeScope: CbStoreScope;
  onSelectStoreScope: (scope: CbStoreScope) => void;
  isLive: boolean;
  onToggleLive: () => void;
  secondsAgo: number;
  isFuturePeriod: boolean;
  targets: CbTargetConfig;
  onOpenTargetConfig: () => void;
}

export function CbHeaderControlBar({
  selectedMonth,
  onSelectMonth,
  storeScope,
  onSelectStoreScope,
  isLive,
  onToggleLive,
  secondsAgo,
  isFuturePeriod,
  targets,
  onOpenTargetConfig,
}: CbHeaderControlBarProps) {
  return (
    <div className="bg-slate-900/90 dark:bg-black/80 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
              $CB SALES COMMAND BOARD
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
                isLive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isLive ? 'LIVE STREAMING' : 'TẠM DỪNG'}
            </span>
            {isFuturePeriod && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <Clock className="w-3 h-3" />
                Kế hoạch tháng tới (Chưa bắt đầu)
              </span>
            )}
          </div>
          <div className="text-xs text-amber-200/70 mt-1 flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <span>{formatMonthSubtitle(selectedMonth)}</span>
            <span>•</span>
            <span>{formatStoreScopeLabel(storeScope)}</span>
            <span>•</span>
            <span>CHƯA VAT</span>
            <span>•</span>
            <span className="text-slate-400">Đồng bộ: {secondsAgo}s trước</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select<string>
            value={selectedMonth}
            onChange={onSelectMonth}
            className="w-44 text-xs"
            options={CB_MONTH_OPTIONS}
          />
          <Select<CbStoreScope>
            value={storeScope}
            onChange={onSelectStoreScope}
            className="w-44 text-xs"
            options={CB_STORE_SCOPE_OPTIONS}
          />
          <IconButton
            label="Cấu hình mục tiêu"
            icon={Sliders}
            tone="primary"
            onClick={onOpenTargetConfig}
            className="!text-amber-400 !border-amber-500/40 hover:!border-amber-400"
          />
          <IconButton
            label={isLive ? 'Tạm dừng Live' : 'Bật Live Streaming'}
            icon={isLive ? Radio : RefreshCw}
            tone="default"
            onClick={onToggleLive}
            className={isLive ? '!text-emerald-400 !border-emerald-500/40' : '!text-slate-400'}
          />
        </div>
      </div>

      {/* Future period announcement banner */}
      {isFuturePeriod && (
        <div className="mt-3 p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Tháng {selectedMonth} chưa bắt đầu:</strong> Đang hiển thị Kế hoạch mục tiêu $CB{' '}
              <strong className="text-amber-300 font-mono tabular-nums">
                {formatMillions(targets.totalSalesTarget)}
              </strong>{' '}
              ({formatMillions(targets.comboSalesTarget)} gói + {formatMillions(targets.productSalesTarget)} SP) với
              nhịp{' '}
              <strong className="text-emerald-300 font-mono tabular-nums">
                {formatMillions(targets.dailyPlanPace)}/ngày
              </strong>
              .
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectMonth('2026-10')}
            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/40 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ml-3 cursor-pointer"
          >
            Xem Tháng 10 có số liệu →
          </button>
        </div>
      )}
    </div>
  );
}
