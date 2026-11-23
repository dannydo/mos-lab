'use client';

import React from 'react';
import type { ActorTipBreakdown } from '@mos-lab/shared';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';

interface ThermalReceiptStaffRewardsBoxProps {
  isDark: boolean;
  isCheckoutStaffCc: boolean;
  actorTipBreakdown: ActorTipBreakdown;
  tipAmount: number;
  tipEarned: number;
  comboBonus: number;
  serumBonus: number;
  hasSelectedCombo: boolean;
  hasSelectedUnderCombo: boolean;
}

export function ThermalReceiptStaffRewardsBox({
  isDark,
  isCheckoutStaffCc,
  actorTipBreakdown,
  tipAmount,
  tipEarned,
  comboBonus,
  serumBonus,
  hasSelectedCombo,
  hasSelectedUnderCombo,
}: ThermalReceiptStaffRewardsBoxProps) {
  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-amber-50/40 border-amber-200/70'
      }`}
    >
      <div
        className={`w-full py-2 px-3 flex items-center justify-between text-[11px] font-bold border-b ${
          isDark ? 'border-neutral-800 text-amber-400' : 'border-amber-200/60 text-amber-900'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span>Quyền Lợi Nội Bộ</span>
          {isCheckoutStaffCc ? (
            <span className="font-bold text-emerald-400">CC</span>
          ) : (
            <FeatherSvg className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2 text-[11px]">
        <div className={`space-y-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'} font-medium`}>
          <div className="flex justify-between items-center">
            <span>Tiền Tip bạn nhận ({actorTipBreakdown.actorEarnedPercent}%):</span>
            <span className="font-bold tabular-nums text-emerald-400">+{tipEarned.toLocaleString('vi-VN')} đ</span>
          </div>
          {tipAmount > 0 && (
            <div
              className={`text-[10px] text-[var(--mos-text-muted)] flex items-center justify-between flex-wrap gap-1 tabular-nums`}
            >
              <span>
                • Làm mi ({actorTipBreakdown.techStaffName} · 70%): +
                {actorTipBreakdown.techShareAmount.toLocaleString('vi-VN')}đ
              </span>
              <span>
                • In ({actorTipBreakdown.checkInStaffName} · 10%): +
                {actorTipBreakdown.checkInShareAmount.toLocaleString('vi-VN')}đ
              </span>
              <span>
                • Out ({actorTipBreakdown.checkOutStaffName} · 10%): +
                {actorTipBreakdown.checkOutShareAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}
          {comboBonus > 0 && (
            <div className="flex justify-between items-center">
              <span>Thưởng chốt Combo ({hasSelectedCombo && hasSelectedUnderCombo ? '2 gói độc lập' : '1 gói'}):</span>
              <span className="font-bold tabular-nums inline-flex items-center gap-0.5 text-amber-400">
                +{Math.round(comboBonus / 1000)}
                <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
              </span>
            </div>
          )}
          {isCheckoutStaffCc && (hasSelectedCombo || hasSelectedUnderCombo) && (
            <div className="flex justify-between items-center text-emerald-400">
              <span>Thưởng bán Combo (CC Checkout):</span>
              <span className="font-bold">Tính trên Báo Cáo CC (Combo-Sold)</span>
            </div>
          )}
          {serumBonus > 0 && (
            <div className="flex justify-between items-center">
              <span>Thưởng bán Dưỡng mi Yeppeum:</span>
              <span className="font-bold tabular-nums inline-flex items-center gap-0.5 text-amber-400">
                +{Math.round(serumBonus / 1000)}
                <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
              </span>
            </div>
          )}
        </div>

        <div
          className={`pt-2 border-t ${
            isDark ? 'border-neutral-800' : 'border-amber-200/60'
          } flex justify-between items-center font-black ${isDark ? 'text-white' : 'text-neutral-900'} text-[11.5px]`}
        >
          <span>TỔNG THƯỞNG:</span>
          <span
            className={`tabular-nums text-[12px] font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
              isDark
                ? 'bg-amber-950/40 text-amber-300 border-amber-700/60'
                : 'bg-white text-amber-900 border-amber-300 shadow-2xs'
            }`}
          >
            {comboBonus + serumBonus > 0 ? (
              <>
                +{Math.round((comboBonus + serumBonus) / 1000)}
                <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
              </>
            ) : (
              <>
                0 <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
