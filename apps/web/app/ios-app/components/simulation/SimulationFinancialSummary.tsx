'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { FeatherSvg } from '../ui-kit/CvFeatherLabels';

interface SimulationFinancialSummaryProps {
  grandTotal: number;
  estimatedReward: number;
  cvPoints: number;
  isDark: boolean;
}

/** Bảng tổng hợp tính toán tài chính Realtime — dùng trong SimulationAttemptEditModal */
export function SimulationFinancialSummary({
  grandTotal,
  estimatedReward,
  cvPoints,
  isDark,
}: SimulationFinancialSummaryProps) {
  return (
    <div
      className={`p-3 rounded-2xl border space-y-2 ${
        isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Chỉ số tài chính sau chỉnh sửa (Tự động tính)</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
          <div className="text-[9.5px] opacity-65 font-semibold">Khách thanh toán</div>
          <div className="text-[12.5px] font-black tabular-nums">{grandTotal.toLocaleString('vi-VN')}đ</div>
        </div>
        <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
          <div className="text-[9.5px] opacity-65 font-semibold">Thưởng + Tip CV</div>
          <div className="text-[12.5px] font-black text-emerald-400 tabular-nums">
            +{estimatedReward.toLocaleString('vi-VN')}đ
          </div>
        </div>
        <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900' : 'bg-white'}`}>
          <div className="text-[9.5px] opacity-65 font-semibold">Điểm Xoay Tua</div>
          <div className="text-[12.5px] font-black text-amber-400 tabular-nums inline-flex items-center justify-center gap-0.5">
            <span>+{cvPoints}</span>
            <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
