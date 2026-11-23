'use client';

import React from 'react';
import type { BookingItem } from '../../../state/mockData';
import { PostCheckoutTransferProofBox } from '../post-checkout/PostCheckoutHistorySection';

interface ThermalReceiptFooterStatusBlocksProps {
  isDark: boolean;
  booking: BookingItem;
  branchCode: string;
  diamondUsed: number;
  diamondDiscountAmount: number;
}

export function ThermalReceiptFooterStatusBlocks({
  isDark,
  booking,
  branchCode,
  diamondUsed,
  diamondDiscountAmount,
}: ThermalReceiptFooterStatusBlocksProps) {
  return (
    <>
      <PostCheckoutTransferProofBox booking={booking} isDark={isDark} branchCode={branchCode} />

      {/* Trạng thái gửi hóa đơn & bảo hành qua Zalo */}
      {booking?.billing?.zaloConsent?.agreed ? (
        <div
          className={`${isDark ? 'bg-sky-950/30 border-sky-800 text-sky-300' : 'bg-[#EBF5FF] border-[#B9E6FE] text-[#004EEB]'} border rounded-xl p-2.5 space-y-1`}
        >
          <div className="flex items-center justify-between font-bold text-[11.5px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base leading-none">💬</span>
              <span className={`${isDark ? 'text-sky-400' : 'text-[#026AA2]'} font-black shrink-0`}>
                Đã gửi qua Zalo:
              </span>
              <span className={`font-extrabold ${isDark ? 'text-sky-300' : 'text-[#004EEB]'} tabular-nums truncate`}>
                {booking.billing.zaloConsent.phone}
              </span>
            </div>
            <span
              className={`${isDark ? 'bg-sky-900/60 text-sky-200' : 'bg-[#D1E9FF] text-[#004EEB]'} px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0`}
            >
              {booking.billing.zaloConsent.sentAt ? `✓ ${booking.billing.zaloConsent.sentAt}` : '✓ Đã nhận'}
            </span>
          </div>
          <div
            className={`text-[10px] ${isDark ? 'text-sky-400' : 'text-[#026AA2]'} pl-5 flex items-center gap-1.5 flex-wrap`}
          >
            <span>✓ Hóa đơn điện tử</span>
            <span>•</span>
            <span>✓ Bảo hành 3 ngày</span>
            <span>•</span>
            <span>✓ Voucher 50K</span>
          </div>
        </div>
      ) : (
        <div
          className={`${isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-500'} border rounded-xl p-2 flex items-center justify-between text-[10.5px] font-medium`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💬</span>
            <span>Chưa gửi Zalo (Khách không dùng / Bỏ qua)</span>
          </div>
          <span
            className={`text-[10px] font-bold ${isDark ? 'text-neutral-400 bg-neutral-800 border-neutral-700' : 'text-gray-400 bg-white border-gray-200'} px-2 py-0.5 rounded border`}
          >
            Chưa kết nối
          </span>
        </div>
      )}

      {/* Thông tin Ví Kim Cương minh bạch */}
      {diamondUsed > 0 ? (
        <div
          className={`text-[10.5px] ${isDark ? 'text-cyan-300 bg-cyan-950/40 border-cyan-800' : 'text-cyan-900 bg-cyan-50 border-cyan-200'} font-semibold px-2.5 py-1.5 rounded-xl border flex items-center justify-between`}
        >
          <span>
            💎 Đã cấn trừ {diamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ):
          </span>
          <span className={`font-black ${isDark ? 'text-cyan-200' : 'text-cyan-950'}`}>
            Ví còn {booking?.diamondBalance !== undefined ? booking.diamondBalance : 0} 💎
          </span>
        </div>
      ) : (
        <div
          className={`text-[10.5px] ${isDark ? 'text-cyan-400 bg-cyan-950/30 border-cyan-900' : 'text-cyan-900 bg-cyan-50/60 border-cyan-100'} font-medium px-2.5 py-1 rounded-xl border flex items-center justify-between`}
        >
          <span>💎 Số dư Ví Kim Cương:</span>
          <span className={`font-bold ${isDark ? 'text-cyan-200' : 'text-cyan-950'}`}>
            {booking?.diamondBalance !== undefined ? booking.diamondBalance : 0} 💎 (còn nguyên)
          </span>
        </div>
      )}
    </>
  );
}
