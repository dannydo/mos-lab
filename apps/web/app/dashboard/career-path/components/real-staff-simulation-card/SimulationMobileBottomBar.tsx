'use client';

import React from 'react';
import type { StaffCareerStatus } from '@mos-lab/shared';
import { formatVnd } from './simulationTypesAndHelpers';

interface SimulationMobileBottomBarProps {
  status: StaffCareerStatus;
  isComboTargetHit: boolean;
  totalSimulatedGain: number;
  effectiveTipGain: number;
  isQaPassed: boolean;
  loadingAction?: boolean;
  onPromote?: () => void;
  onActivateTrial?: () => void;
}

export const SimulationMobileBottomBar: React.FC<SimulationMobileBottomBarProps> = ({
  status,
  isComboTargetHit,
  totalSimulatedGain,
  effectiveTipGain,
  isQaPassed,
  loadingAction,
  onPromote,
  onActivateTrial,
}) => (
  <>
    {/* MOBILE BOTTOM SPACER TO PREVENT STICKY BAR OVERLAP */}
    <div className="md:hidden h-28 sm:h-32 w-full pointer-events-none" aria-hidden="true" />

    {/* MOBILE STICKY BOTTOM ACTION BAR (iOS Safari Safe Area) */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-4 py-2.5 pb-[max(14px,env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
          {isComboTargetHit ? 'Thực nhận thêm' : 'Bảo lưu 90% Tip (<21%)'}
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className={`text-base font-black font-mono tabular-nums ${
              isComboTargetHit ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            +{formatVnd(isComboTargetHit ? totalSimulatedGain : effectiveTipGain)}
          </span>
          <span className="text-[10px] text-slate-400">/tháng</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {status.qualifiedQuests.allPassed ? (
          onPromote ? (
            <button
              type="button"
              onClick={onPromote}
              disabled={loadingAction}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 via-rose-500 to-emerald-500 text-white shadow-lg shadow-pink-500/30 hover:opacity-95 transition-all cursor-pointer animate-pulse active:scale-95"
            >
              🎉 Duyệt Thăng Hạng
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
              Chờ Danny duyệt
            </span>
          )
        ) : (
          onActivateTrial && (
            <button
              type="button"
              onClick={onActivateTrial}
              disabled={loadingAction || !isQaPassed}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20 hover:opacity-95 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
            >
              🚀 Mở Ải 30 Ngày
            </button>
          )
        )}
      </div>
    </div>
  </>
);
