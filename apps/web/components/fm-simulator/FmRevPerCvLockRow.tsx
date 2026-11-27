'use client';

import React from 'react';
import { Lock, Minus, Plus, Unlock } from 'lucide-react';
import { FM_ROOKIE_ESTIMATED_REV_VND, formatM } from './fm-simulator.engine';
import { FmInfoTrigger } from './FmInfoGuideModal';

interface FmRevPerCvLockRowProps {
  readonly revPerCvM: number;
  readonly locked: boolean;
  readonly matureCvs: number;
  readonly rookieCvs: number;
  readonly revVnd: number;
  readonly onToggleLock: () => void;
  readonly onChangeRevPerCvM: (nextM: number) => void;
}

const REV_PER_CV_QUICK_PRESETS = [45, 48, 50, 52] as const;

export function FmRevPerCvLockRow({
  revPerCvM,
  locked,
  matureCvs,
  rookieCvs,
  revVnd,
  onToggleLock,
  onChangeRevPerCvM,
}: FmRevPerCvLockRowProps) {
  const clamp = (val: number) => Math.max(20, Math.min(80, Math.round(val)));
  const rookieUnitM = Math.round(FM_ROOKIE_ESTIMATED_REV_VND / 1_000_000);
  const totalRevM = Math.round(revVnd / 1_000_000);

  return (
    <div
      className={`space-y-2.5 rounded-2xl border px-3.5 py-3 transition-colors ${
        locked
          ? 'border-emerald-500/30 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-950/20'
          : 'border-black/5 bg-neutral-100/75 dark:border-white/10 dark:bg-neutral-800/65'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-100">REV / CV mục tiêu</span>
            <FmInfoTrigger guideId="ctrl-rev-per-cv" label="REV / CV mục tiêu" />
            <button
              type="button"
              aria-pressed={locked}
              onClick={onToggleLock}
              className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition ${
                locked
                  ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                  : 'bg-white text-neutral-600 shadow-2xs hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              <span>{locked ? 'Đã khóa' : 'Khóa'}</span>
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 tabular-nums">
            {locked
              ? rookieCvs > 0
                ? `${matureCvs} CV chính × ${revPerCvM}M + ${rookieCvs} CV mới × ${rookieUnitM}M = ${totalRevM}M`
                : `${matureCvs} CV × ${revPerCvM}M = ${totalRevM}M (tự nhân khi đổi CV)`
              : `Đang mở khóa · Hiện ${formatM(revVnd / Math.max(1, matureCvs + rookieCvs), 1)}/CV (bấm Khóa để cố định)`}
          </p>
        </div>

        <div className="inline-flex min-w-[128px] shrink-0 items-center justify-between rounded-xl bg-white/95 p-1 shadow-2xs dark:bg-neutral-900/90">
          <button
            type="button"
            aria-label="Giảm REV/CV mục tiêu"
            disabled={revPerCvM <= 20}
            onClick={() => onChangeRevPerCvM(clamp(revPerCvM - 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <div className="inline-flex items-center px-0.5">
            <input
              type="number"
              aria-label="Giá trị REV/CV (triệu đồng)"
              min={20}
              max={80}
              step={1}
              value={revPerCvM}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isFinite(raw) && raw > 0) {
                  onChangeRevPerCvM(clamp(raw));
                }
              }}
              className="w-8 bg-transparent text-center text-xs font-semibold tabular-nums text-neutral-900 outline-none dark:text-white"
            />
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">M</span>
          </div>

          <button
            type="button"
            aria-label="Tăng REV/CV mục tiêu"
            disabled={revPerCvM >= 80}
            onClick={() => onChangeRevPerCvM(clamp(revPerCvM + 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Mốc nhanh:</span>
        {REV_PER_CV_QUICK_PRESETS.map((preset) => {
          const active = locked && revPerCvM === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeRevPerCvM(preset)}
              className={`min-h-7 rounded-lg px-2.5 text-[11px] font-medium tabular-nums transition ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/80 text-neutral-600 hover:bg-white dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {preset}M
            </button>
          );
        })}
      </div>
    </div>
  );
}
