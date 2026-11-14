'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';

export interface ReceiptTotalsSummaryProps {
  isDark: boolean;
  booking?: BookingItem;
  subtotal: number;
  appliedPromotionName?: string | null;
  promotionDiscountAmount: number;
  vatAmount: number;
  tipAmount: number;
  effectiveDiamondUsed: number;
  diamondDiscountAmount: number;
  finalGrandTotal: number;
  showStaffRewards: boolean;
}

export function ReceiptTotalsSummary({
  isDark,
  booking,
  subtotal,
  appliedPromotionName,
  promotionDiscountAmount,
  vatAmount,
  tipAmount,
  effectiveDiamondUsed,
  diamondDiscountAmount,
  finalGrandTotal,
  showStaffRewards,
}: ReceiptTotalsSummaryProps) {
  return (
    <>
      <div
        className={`p-3.5 ${
          isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/50 border-neutral-100'
        } space-y-1.5 border-t text-[12px]`}
      >
        <div className="flex items-center justify-between text-[var(--mos-text-muted)] font-medium">
          <span>Tạm tính dịch vụ &amp; SP:</span>
          <span
            className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold tabular-nums whitespace-nowrap shrink-0`}
          >
            {subtotal.toLocaleString('vi-VN')}đ
          </span>
        </div>
        {promotionDiscountAmount > 0 && (
          <div
            data-testid="receipt-promotion-row"
            className={`flex items-center justify-between font-bold px-2.5 py-1.5 rounded-xl border ${
              isDark
                ? 'text-emerald-300 bg-emerald-950/35 border-emerald-800/60'
                : 'text-emerald-800 bg-emerald-50/80 border-emerald-200'
            }`}
          >
            <span className="truncate mr-2">🏷️ Khuyến mãi ({appliedPromotionName || 'Ưu đãi'}):</span>
            <span className="font-black tabular-nums whitespace-nowrap shrink-0">
              -{promotionDiscountAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-[var(--mos-text-muted)] font-medium">
          <span>Thuế VAT (8%):</span>
          <span
            className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold tabular-nums whitespace-nowrap shrink-0`}
          >
            +{vatAmount.toLocaleString('vi-VN')}đ
          </span>
        </div>
        {tipAmount > 0 && (
          <div
            className={`flex items-center justify-between ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-semibold`}
          >
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
              <span>Tiền tip chuyên viên:</span>
            </span>
            <span className="font-black tabular-nums whitespace-nowrap shrink-0">
              +{tipAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
        {effectiveDiamondUsed > 0 && (
          <div
            className={`flex items-center justify-between font-bold px-2.5 py-1.5 rounded-xl border ${
              isDark ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800/60' : 'text-cyan-800 bg-cyan-50/80 border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>💎 Thanh toán Kim Cương:</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums ${
                  isDark ? 'text-cyan-300 bg-neutral-900 border-cyan-700' : 'text-cyan-800 bg-white border-cyan-300'
                }`}
              >
                {effectiveDiamondUsed} 💎
              </span>
            </div>
            <span className="font-black tabular-nums whitespace-nowrap shrink-0">
              -{diamondDiscountAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
      </div>

      {/* Total Row */}
      <div
        className={`p-3.5 ${
          isDark ? 'bg-[#251B08] border-amber-500/30' : 'bg-[#FFFBEB] border-amber-200/80'
        } flex items-center justify-between border-t`}
      >
        <div>
          <span
            className={`text-[13px] font-black ${isDark ? 'text-amber-200' : 'text-neutral-900'} tracking-tight block`}
          >
            TỔNG TIỀN THANH TOÁN
          </span>
          <span className="text-[10.5px] text-[var(--mos-text-muted)] font-medium">
            {effectiveDiamondUsed > 0
              ? `Đã cấn trừ ${effectiveDiamondUsed} 💎 (-${diamondDiscountAmount.toLocaleString('vi-VN')}đ)`
              : promotionDiscountAmount > 0
                ? `Đã giảm -${promotionDiscountAmount.toLocaleString('vi-VN')}đ KM · Đã gồm 8% VAT`
                : tipAmount > 0
                  ? 'Đã gồm Dịch vụ + 8% VAT + Tiền tip'
                  : 'Đã bao gồm 8% thuế VAT'}
          </span>
        </div>
        <span className="text-[20px] font-black text-[#FF9500] tabular-nums whitespace-nowrap shrink-0 tracking-tight">
          {finalGrandTotal.toLocaleString('vi-VN')}đ
        </span>
      </div>

      {/* CV Rotation Points Recording Banner */}
      {booking?.cvRotationPoints && showStaffRewards && (
        <div
          className={`px-3.5 py-2.5 ${
            isDark ? 'bg-blue-950/40 border-blue-900/60' : 'bg-blue-50/60 border-blue-100'
          } border-t flex items-center justify-between text-[11.5px]`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
            <span className={`font-black ${isDark ? 'text-blue-300' : 'text-blue-950'} shrink-0`}>◔ Vòng xoay CV:</span>
            <span className={`text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-700'} font-medium truncate`}>
              {booking.cvRotationBreakdown || 'Điểm thưởng ca'}
            </span>
          </div>
          <span
            className={`font-black tabular-nums whitespace-nowrap shrink-0 border px-2 py-0.5 rounded-full text-[10.5px] ${
              isDark ? 'text-blue-300 bg-blue-900/50 border-blue-700' : 'text-blue-800 bg-blue-100/70 border-blue-200'
            }`}
          >
            +{booking.cvRotationPoints} pts
          </span>
        </div>
      )}
    </>
  );
}
