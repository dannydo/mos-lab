'use client';

import React from 'react';
import { COMMON_COMBOS, COMMON_UNDER_COMBOS } from './simulationConstants';
import type { IosSimulationAttemptSummary } from '@mos-lab/shared';

interface SimulationComboSelectorsProps {
  attempt: IosSimulationAttemptSummary;
  comboName: string;
  comboPrice: number;
  underComboName: string;
  underComboPrice: number;
  isDark: boolean;
  hasCustomSavedCombo: boolean;
  hasCustomSavedUnderCombo: boolean;
  setComboName: (v: string) => void;
  setComboPrice: (v: number) => void;
  setUnderComboName: (v: string) => void;
  setUnderComboPrice: (v: number) => void;
}

const btnBase = (active: boolean, isDark: boolean, extra = '') =>
  `p-2 rounded-xl text-left border transition-all cursor-pointer ${extra} ${
    active
      ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
      : isDark
        ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
        : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
  }`;

/** Sections 3 & 4: Gói Combo Nối Mi + Gói Mi Dưới selectors */
export function SimulationComboSelectors({
  attempt,
  comboName,
  comboPrice,
  underComboName,
  underComboPrice,
  isDark,
  hasCustomSavedCombo,
  hasCustomSavedUnderCombo,
  setComboName,
  setComboPrice,
  setUnderComboName,
  setUnderComboPrice,
}: SimulationComboSelectorsProps) {
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
              onClick={() => {
                setComboName(attempt.selectedComboName || '');
                setComboPrice(attempt.selectedComboPrice || 0);
              }}
              className={btnBase(
                comboName === attempt.selectedComboName && comboPrice === attempt.selectedComboPrice,
                isDark,
                'col-span-2 text-[11px]'
              )}
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
                onClick={() => {
                  if (c.price === 0) {
                    setComboName('');
                    setComboPrice(0);
                  } else {
                    setComboName(c.name);
                    setComboPrice(c.price);
                  }
                }}
                className={btnBase(active, isDark, 'text-[11px]')}
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
              onClick={() => {
                setUnderComboName(attempt.selectedUnderComboName || '');
                setUnderComboPrice(attempt.selectedUnderComboPrice || 0);
              }}
              className={btnBase(
                underComboName === attempt.selectedUnderComboName &&
                  underComboPrice === attempt.selectedUnderComboPrice,
                isDark,
                'col-span-3 text-[10.5px]'
              )}
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
                onClick={() => {
                  if (uc.price === 0) {
                    setUnderComboName('');
                    setUnderComboPrice(0);
                  } else {
                    setUnderComboName(uc.name);
                    setUnderComboPrice(uc.price);
                  }
                }}
                className={btnBase(active, isDark, 'text-[10.5px]')}
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
