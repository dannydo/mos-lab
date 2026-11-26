'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

export function AppleSurface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80 ${className}`}
    >
      {children}
    </section>
  );
}

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: React.ReactNode;
}

export function AppleSegmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-xl bg-neutral-200/75 p-1 dark:bg-neutral-800/90 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AppleKpiHero({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'emerald' | 'blue' | 'amber' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'blue'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'amber'
          ? 'text-amber-600 dark:text-amber-400'
          : tone === 'rose'
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-neutral-900 dark:text-neutral-50';

  return (
    <AppleSurface className="p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
        {icon}
        <span className="truncate font-normal">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${toneClass}`}>{value}</div>
      {hint ? (
        <p className="mt-1 truncate text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</p>
      ) : null}
    </AppleSurface>
  );
}

export function AppleSliderRow({
  id,
  icon,
  label,
  valueText,
  value,
  min,
  max,
  step = 1,
  hint,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
        >
          {icon}
          <span>{label}</span>
        </label>
        <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="fm-apple-range"
      />
      {hint ? <p className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function AppleStepperRow({
  icon,
  label,
  hint,
  value,
  min,
  max,
  suffix = '',
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        {hint ? (
          <p className="truncate text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</p>
        ) : null}
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
          {value}
          {suffix}
        </span>
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AppleToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left transition hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60"
    >
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        {hint ? (
          <p className="truncate text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</p>
        ) : null}
      </div>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

export function AppleProgressRow({
  icon,
  label,
  amountText,
  pctOfRev,
  tone = 'blue',
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  amountText: string;
  pctOfRev: number;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  hint?: string;
}) {
  const safePct = Math.max(0, Math.min(100, pctOfRev));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-300">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">
          {amountText}{' '}
          <span className="font-normal text-neutral-400 dark:text-neutral-500">({safePct.toFixed(1)}%)</span>
        </span>
      </div>
      <progress className={`fm-apple-progress tone-${tone}`} value={safePct} max={100} />
      {hint ? <p className="text-[11px] font-normal text-neutral-400 dark:text-neutral-500">{hint}</p> : null}
    </div>
  );
}
