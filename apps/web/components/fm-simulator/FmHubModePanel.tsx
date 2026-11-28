'use client';

import React from 'react';
import { Building2, ChevronDown, Factory, ShieldCheck } from 'lucide-react';
import { AppleSegmented } from './ApplePrimitives';
import { FmInfoTrigger } from './FmInfoGuideModal';
import {
  FM_CVLL_KEYHOLDER_ALLOWANCE_VND,
  FM_PHASE2_OVERLOAD_REV_VND,
  FmSimulationResult,
  FmStaffingMode,
  SimulatorInput,
  formatK,
  formatM,
} from './fm-simulator.engine';

interface FmHubModePanelProps {
  readonly input: SimulatorInput;
  readonly fm: FmSimulationResult;
  readonly onChange: (patch: Partial<SimulatorInput>) => void;
}

export function FmHubModePanel({ input, fm, onChange }: FmHubModePanelProps) {
  const mode: FmStaffingMode = fm.fmStaffingMode;
  const rookiePct = Math.round((fm.rookieCvs / Math.max(1, input.cvs)) * 100);
  const falMetric = input.pillarMetrics?.falRatePct ?? 1.0;
  const mapsEffective = fm.pillarBreakdowns.find((p) => p.key === 'maps')?.effectiveStar ?? 0;

  const signalRows = [
    {
      key: 'overload',
      active: fm.phase2Signals.overloadSignal,
      title: `DT ≥ ${Math.round(FM_PHASE2_OVERLOAD_REV_VND / 1e6)}M & quá tải chất lượng`,
      detail: `DT ${formatM(input.revVnd, 0)} · FAL ${falMetric.toFixed(1)}% (>1%) · Maps ${mapsEffective}★ (<2★)`,
    },
    {
      key: 'rookie',
      active: fm.phase2Signals.rookieHeavySignal,
      title: 'Tỷ lệ CV mới > 40% cần kèm sát giường',
      detail: `${fm.rookieCvs}/${input.cvs} CV mới (${rookiePct}% > 40%)`,
    },
    {
      key: 'hub',
      active: fm.phase2Signals.hubBenchSignal,
      title: 'Chiến lược Hub 100 Shop (Đào tạo FM #2)',
      detail:
        fm.fmCount === 2
          ? `Đang chạy Lò Đúc 2 FM · CAPEX 3 tháng ~${formatM(fm.secondFmQuarterlyBenchCostVnd, 0)} xuất xưởng 1 FM mới`
          : 'Bật 2 FM trước khi đôn CHO hoặc mở shop mới 3 tháng',
    },
  ];

  return (
    <div className="space-y-2.5 rounded-2xl border border-black/5 bg-neutral-100/75 px-3.5 py-3 dark:border-white/10 dark:bg-neutral-800/65">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
          {fm.fmCount === 2 ? (
            <Factory className="h-3.5 w-3.5 text-violet-500" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
          )}
          <span>Mô hình Quản lý Sàn (100 Shop)</span>
          <FmInfoTrigger guideId="ctrl-hub-mode" label="Mô hình Quản lý Sàn (100 Shop)" />
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            fm.fmCount === 2
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          }`}
        >
          {fm.fmCount === 2 ? '2 FM · Lò Đúc' : '1 FM · Vệ tinh'}
        </span>
      </div>

      <AppleSegmented<FmStaffingMode>
        ariaLabel="Chọn chế độ 1 FM hoặc 2 FM Lò Đúc"
        value={mode}
        onChange={(fmStaffingMode) => onChange({ fmStaffingMode })}
        options={[
          { value: 'auto', label: 'Tự động' },
          { value: 'single', label: '1 FM · Vệ tinh' },
          { value: 'hub', label: '2 FM · Lò Đúc' },
        ]}
        className="w-full"
      />

      <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 tabular-nums">
        {fm.fmCount === 1 ? (
          <>
            Tiết kiệm P&amp;L:{' '}
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{formatM(fm.singleVsHubMonthlySavingsVnd, 1)}/tháng
            </strong>{' '}
            so với 2 FM
            {fm.cvllKeyholderAllowanceVnd > 0
              ? ` (đã tính +${formatK(fm.cvllKeyholderAllowanceVnd)} phụ cấp ${Math.min(2, input.cvllKeyholders)} CVLL Keyholder × ${formatK(FM_CVLL_KEYHOLDER_ALLOWANCE_VND)})`
              : ''}
            .
          </>
        ) : (
          <>
            Lò Đúc đào tạo quản lý:{' '}
            <strong className="font-semibold text-violet-600 dark:text-violet-300">
              CAPEX ~{formatM(fm.secondFmQuarterlyBenchCostVnd, 0)} / 3 tháng
            </strong>{' '}
            để xuất xưởng 1 FM mới mở chuỗi.
          </>
        )}
      </p>

      <details className="group border-t border-black/5 pt-2 dark:border-white/10">
        <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>3 Tín Hiệu Kích Hoạt FM #2 (Pha 2)</span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
            <span>{fm.phase2Signals.activeCount}/3 đang bật</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="mt-2 space-y-1.5">
          {signalRows.map((sig) => (
            <div
              key={sig.key}
              className={`rounded-xl px-2.5 py-2 text-[11px] ${
                sig.active
                  ? 'bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200'
                  : 'bg-white/70 text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-medium">
                <span>{sig.title}</span>
                <span className="shrink-0 font-semibold">{sig.active ? 'Kích hoạt' : 'Chờ'}</span>
              </div>
              <div className="mt-0.5 text-[10px] opacity-80 tabular-nums">{sig.detail}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
