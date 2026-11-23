'use client';

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Clock, Gift, PackageCheck, ArrowRight } from 'lucide-react';
import type { IosBookingItem } from '@mos-lab/shared';
import {
  IOS_SANDBOX_MODE_OPTIONS,
  type IosSandboxPresetMode,
  type IosSimMaterialCheckItem,
} from '../../state/iosSandboxPresetConfig';

interface IosSimulationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  isReadOnlyMentorView: boolean;
  activeBooking?: IosBookingItem;
  simPresetMode: IosSandboxPresetMode;
  onSelectSimPresetMode?: (mode: IosSandboxPresetMode) => void;
  onSimJumpToStep?: (step: number, bookingId?: number) => void;
  simMaterialsChecklist: IosSimMaterialCheckItem[];
  onToggleSimMaterial?: (id: string) => void;
}

export function IosSimulationModeModal({
  isOpen,
  onClose,
  isDark,
  isReadOnlyMentorView,
  activeBooking,
  simPresetMode,
  onSelectSimPresetMode,
  onSimJumpToStep,
  simMaterialsChecklist,
  onToggleSimMaterial,
}: IosSimulationModeModalProps) {
  const materialsCheckedCount = useMemo(
    () => simMaterialsChecklist.filter((m) => m.checked).length,
    [simMaterialsChecklist]
  );

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="ios-app-font-scope fixed inset-0 z-[80] flex justify-center select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Chọn mode giả lập Sandbox"
    >
      <div className="fixed inset-0 bg-black/55 backdrop-blur-xs" onClick={onClose} data-testid="sim-mode-backdrop" />
      <div className="relative w-full max-w-[430px] h-full pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto absolute top-9 left-2.5 right-2.5 rounded-2xl border p-3 shadow-2xl z-10 space-y-3 max-h-[75dvh] overflow-y-auto ${
            isDark ? 'bg-neutral-900 border-pink-400/35 text-white' : 'bg-white border-pink-300 text-neutral-900'
          }`}
        >
          <div className="px-1 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-pink-400">
              Đa chế độ Sandbox (Training & Kế hoạch)
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng chế độ Sandbox"
              className="p-0.5 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {IOS_SANDBOX_MODE_OPTIONS.map((opt) => {
              const isSelected = simPresetMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectSimPresetMode?.(opt.id);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-pink-500/20 border-pink-400 text-pink-100'
                        : 'bg-pink-50 border-pink-400 text-pink-950'
                      : isDark
                        ? 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800 text-neutral-200'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black">{opt.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                  </div>
                  <p className={`text-[10.5px] mt-0.5 m-0 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>

          {onSimJumpToStep && !isReadOnlyMentorView && (
            <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="text-[10.5px] font-black uppercase tracking-wider text-sky-400">
                Chuyển nhanh bước giả lập (PA #{Math.max(1, (activeBooking?.simulationAttemptCount || 0) + 1)})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSimJumpToStep(2, activeBooking?.id);
                  }}
                  className={`px-2 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800 text-neutral-200'
                      : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <span>Check-in (B2)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSimJumpToStep(9, activeBooking?.id);
                  }}
                  className={`px-2 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-sky-950/50 border-sky-500/40 hover:bg-sky-900/50 text-sky-200'
                      : 'bg-sky-50 border-sky-300 hover:bg-sky-100 text-sky-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Bấm giờ (B9)</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSimJumpToStep(12, activeBooking?.id);
                  }}
                  className={`px-2 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-amber-950/50 border-amber-500/40 hover:bg-amber-900/50 text-amber-200'
                      : 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    <span>Upsell & Quà (B12)</span>
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSimJumpToStep(13, activeBooking?.id);
                  }}
                  className={`px-2 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between cursor-pointer ${
                    isDark
                      ? 'bg-emerald-950/50 border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-200'
                      : 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900'
                  }`}
                >
                  <span>Check-out (B13)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {simMaterialsChecklist.length > 0 && onToggleSimMaterial && (
            <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-black uppercase tracking-wider text-emerald-400">
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>Check Nguyên Vật Liệu</span>
                </span>
                <span className="text-[10.5px] font-bold tabular-nums text-emerald-400">
                  {materialsCheckedCount}/{simMaterialsChecklist.length} Đạt
                </span>
              </div>
              <div className="space-y-1">
                {simMaterialsChecklist.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => onToggleSimMaterial(mat.id)}
                    className={`w-full px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-left text-[11px] cursor-pointer ${
                      isDark
                        ? 'bg-neutral-950/70 border-neutral-800 hover:bg-neutral-800'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="truncate font-semibold">{mat.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        mat.checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {mat.checked ? 'Đủ ✓' : 'Kiểm tra'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
