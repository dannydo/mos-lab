'use client';

import React, { useMemo } from 'react';
import type { IosSimulationAttemptSummary } from '@mos-lab/shared';

const COMMON_COMBOS = [
  { name: 'Không dùng Combo', price: 0 },
  { name: 'Gói 3 Lần (Tiết kiệm)', price: 1170000 },
  { name: 'Gói 5 Lần (Phổ biến)', price: 1850000 },
  { name: 'Gói 10 Lần (VIP)', price: 3500000 },
];

const COMMON_UNDER_COMBOS = [
  { name: 'Không dùng Mi Dưới', price: 0 },
  { name: 'Mi Dưới 3 Lần', price: 450000 },
  { name: 'Mi Dưới 5 Lần', price: 700000 },
];

interface SimulationComboSelectionSectionProps {
  isDark: boolean;
  attempt: IosSimulationAttemptSummary;
  comboName: string;
  comboPrice: number;
  onChangeCombo: (name: string, price: number) => void;
  underComboName: string;
  underComboPrice: number;
  onChangeUnderCombo: (name: string, price: number) => void;
}

export function SimulationComboSelectionSection({
  isDark,
  attempt,
  comboName,
  comboPrice,
  onChangeCombo,
  underComboName,
  underComboPrice,
  onChangeUnderCombo,
}: SimulationComboSelectionSectionProps) {
  const hasCustomSavedCombo = useMemo(() => {
    if (!attempt.selectedComboName && !(attempt.selectedComboPrice > 0)) return false;
    return !COMMON_COMBOS.some((c) =>
      c.price === 0
        ? !attempt.selectedComboName && attempt.selectedComboPrice === 0
        : c.name === attempt.selectedComboName && c.price === attempt.selectedComboPrice
    );
  }, [attempt.selectedComboName, attempt.selectedComboPrice]);

  const hasCustomSavedUnderCombo = useMemo(() => {
    if (!attempt.selectedUnderComboName && !(attempt.selectedUnderComboPrice > 0)) return false;
    return !COMMON_UNDER_COMBOS.some((uc) =>
      uc.price === 0
        ? !attempt.selectedUnderComboName && attempt.selectedUnderComboPrice === 0
        : uc.name === attempt.selectedUnderComboName && uc.price === attempt.selectedUnderComboPrice
    );
  }, [attempt.selectedUnderComboName, attempt.selectedUnderComboPrice]);

  return (
    <>
      {/* 3. Gói Combo Nối Mi */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="font-bold text-[11.5px]">Gói Combo Nối Mi</label>
          {comboPrice > 0 && (
            <span className="text-[11px] font-bold text-amber-500 tabular-nums">
              {comboPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {hasCustomSavedCombo && attempt.selectedComboName && (
            <button
              type="button"
              onClick={() => onChangeCombo(attempt.selectedComboName || '', attempt.selectedComboPrice || 0)}
              className={`col-span-2 p-2 rounded-xl text-left border text-[11px] transition-all cursor-pointer ${
                comboName === attempt.selectedComboName && comboPrice === attempt.selectedComboPrice
                  ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
              }`}
            >
              <div className="truncate">{attempt.selectedComboName} (Đang chọn)</div>
              <div className="text-[10px] opacity-75 tabular-nums">
                {Number(attempt.selectedComboPrice || 0).toLocaleString('vi-VN')}đ
              </div>
            </button>
          )}
          {COMMON_COMBOS.map((c) => {
            const active = comboName === (c.price > 0 ? c.name : '') && comboPrice === c.price;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onChangeCombo(c.price === 0 ? '' : c.name, c.price)}
                className={`p-2 rounded-xl text-left border text-[11px] transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                }`}
              >
                <div className="truncate">{c.name}</div>
                <div className="text-[10px] opacity-75 tabular-nums">
                  {c.price > 0 ? `${c.price.toLocaleString('vi-VN')}đ` : 'Không chọn'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Gói Mi Dưới */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="font-bold text-[11.5px]">Gói Mi Dưới</label>
          {underComboPrice > 0 && (
            <span className="text-[11px] font-bold text-amber-500 tabular-nums">
              {underComboPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {hasCustomSavedUnderCombo && attempt.selectedUnderComboName && (
            <button
              type="button"
              onClick={() =>
                onChangeUnderCombo(attempt.selectedUnderComboName || '', attempt.selectedUnderComboPrice || 0)
              }
              className={`col-span-3 p-2 rounded-xl text-left border text-[10.5px] transition-all cursor-pointer ${
                underComboName === attempt.selectedUnderComboName && underComboPrice === attempt.selectedUnderComboPrice
                  ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
              }`}
            >
              <div className="truncate">{attempt.selectedUnderComboName} (Đang chọn)</div>
              <div className="text-[9.5px] opacity-75 tabular-nums">
                {Number(attempt.selectedUnderComboPrice || 0).toLocaleString('vi-VN')}đ
              </div>
            </button>
          )}
          {COMMON_UNDER_COMBOS.map((uc) => {
            const active = underComboName === (uc.price > 0 ? uc.name : '') && underComboPrice === uc.price;
            return (
              <button
                key={uc.name}
                type="button"
                onClick={() => onChangeUnderCombo(uc.price === 0 ? '' : uc.name, uc.price)}
                className={`p-2 rounded-xl text-left border text-[10.5px] transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                    : isDark
                      ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                }`}
              >
                <div className="truncate">{uc.name}</div>
                <div className="text-[9.5px] opacity-75 tabular-nums">
                  {uc.price > 0 ? `${uc.price.toLocaleString('vi-VN')}đ` : 'Không'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
