'use client';

import React from 'react';
import type { PendingReferral } from './NewCustomerReferralModal';

interface ReferralDiamondBannerProps {
  pendingReferral: PendingReferral | null;
  isDark: boolean;
  onOpenModal: () => void;
}

/** Inline banner shown on Screen02 for new customers — lets CVL/CC set a referrer. */
export function ReferralDiamondBanner({ pendingReferral, isDark, onOpenModal }: ReferralDiamondBannerProps) {
  return (
    <div
      className={`mx-3 mb-2 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
        isDark ? 'bg-amber-500/8 border-amber-500/25' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">🌟</span>
        <div className="min-w-0">
          <p className={`text-[12px] font-bold truncate ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Khách mới — Có người giới thiệu?
          </p>
          {pendingReferral ? (
            <p className={`text-[11px] truncate ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ✓ GT: {pendingReferral.referrerName} → +100 KC sau TT
            </p>
          ) : (
            <p className={`text-[11px] truncate ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
              Nhập SĐT người giới thiệu để trao 100 Kim Cương
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onOpenModal}
        className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black active:scale-95 transition-all ${
          pendingReferral
            ? isDark
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
            : 'bg-amber-400 text-black'
        }`}
      >
        {pendingReferral ? 'Sửa' : '+ Thêm'}
      </button>
    </div>
  );
}
