'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { LashSpecification } from '@mos-lab/shared';

interface SpecChipDescriptor {
  key: string;
  label: string;
  value: string | null | undefined;
  tabular?: boolean;
  darkClasses: string;
  lightClasses: string;
}

function buildSpecChips(spec: LashSpecification): SpecChipDescriptor[] {
  return [
    {
      key: 'style',
      label: 'Dáng:',
      value: spec.style,
      darkClasses: 'border-sky-400/30 bg-sky-400/15 text-sky-300',
      lightClasses: 'border-sky-200 bg-sky-100 text-sky-700',
    },
    {
      key: 'curl',
      label: 'Cong:',
      value: spec.curl,
      darkClasses: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
      lightClasses: 'border-purple-200 bg-purple-100 text-purple-700',
    },
    {
      key: 'thickness',
      label: 'Độ dày:',
      value: spec.thickness,
      tabular: true,
      darkClasses: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
      lightClasses: 'border-yellow-200 bg-yellow-100 text-yellow-800',
    },
    {
      key: 'length',
      label: 'Dài:',
      value: spec.length ? `${spec.length} mm` : null,
      tabular: true,
      darkClasses: 'border-green-500/30 bg-green-500/15 text-green-300',
      lightClasses: 'border-green-200 bg-green-100 text-green-700',
    },
    {
      key: 'strandCount',
      label: 'Số sợi:',
      value: spec.strandCount,
      tabular: true,
      darkClasses: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
      lightClasses: 'border-orange-200 bg-orange-100 text-orange-700',
    },
    {
      key: 'fan',
      label: 'Fan:',
      value: spec.fan,
      tabular: true,
      darkClasses: 'border-pink-500/30 bg-pink-500/15 text-pink-300',
      lightClasses: 'border-pink-200 bg-pink-100 text-pink-700',
    },
    {
      key: 'color',
      label: 'Màu:',
      value: spec.color,
      darkClasses: 'border-slate-400/30 bg-slate-400/15 text-slate-300',
      lightClasses: 'border-slate-200 bg-slate-100 text-slate-600',
    },
  ];
}

export interface BookingLashSpecsPanelProps {
  specs?: LashSpecification[];
  themeMode: 'light' | 'dark';
}

export const BookingLashSpecsPanel: React.FC<BookingLashSpecsPanelProps> = ({ specs, themeMode }) => {
  if (!Array.isArray(specs) || specs.length === 0) return null;

  const isDark = themeMode === 'dark';

  return (
    <div
      className={`mt-2 flex flex-col gap-1.5 rounded-md border border-l-[3px] px-3 py-2 ${
        isDark ? 'border-slate-700 border-l-sky-400 bg-slate-800/45' : 'border-slate-200 border-l-sky-600 bg-slate-50'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
          isDark ? 'text-sky-400' : 'text-sky-600'
        }`}
      >
        <SlidersHorizontal className="h-3 w-3 shrink-0" />
        <span>Thông số kỹ thuật bộ mi</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {specs.map((spec, sIdx) => {
          const hasMulti = specs.length > 1;
          const chips = buildSpecChips(spec).filter((chip) => Boolean(chip.value));

          return (
            <div
              key={spec.serviceId || sIdx}
              className={`flex flex-col gap-1 ${
                sIdx > 0 ? `border-t border-dashed pt-1.5 ${isDark ? 'border-slate-700' : 'border-slate-200'}` : ''
              }`}
            >
              {hasMulti && spec.serviceName && (
                <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {spec.serviceName}:
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className={`inline-flex items-center justify-center rounded border px-2 py-1 text-[11px] leading-none ${
                      chip.tabular ? 'tabular-nums' : ''
                    } ${isDark ? chip.darkClasses : chip.lightClasses}`}
                  >
                    <span className="mr-1 opacity-75">{chip.label}</span>
                    <strong>{chip.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
