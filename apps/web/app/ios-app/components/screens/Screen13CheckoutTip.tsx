'use client';

import React, { useState } from 'react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { calculateCvComboTierBonus } from '../../state/useIosBillingCheckout';

interface Screen13CheckoutTipProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onBack: () => void;
  onRecordTip: (tipAmount: number) => void;
}

export function Screen13CheckoutTip({ booking, actor, onBack, onRecordTip }: Screen13CheckoutTipProps) {
  const [tip, setTip] = useState<number>(booking?.billing?.tipAmount || 50000);

  const assignedStaffName = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaffName = booking?.checkInStaffName || actor?.name || 'Thảo Ly';
  const checkOutStaffName = booking?.checkOutStaffName || actor?.name || 'Thảo Ly';

  const isSameStaffAllThree = assignedStaffName === checkInStaffName && assignedStaffName === checkOutStaffName;

  const techShare70 = Math.round(tip * 0.7);
  const checkInShare10 = Math.round(tip * 0.1);
  const checkOutShare10 = Math.round(tip * 0.1);
  const fundShare10 = tip - techShare70 - checkInShare10 - checkOutShare10;
  const totalCvEarnedTip = isSameStaffAllThree
    ? techShare70 + checkInShare10 + checkOutShare10
    : checkOutStaffName === assignedStaffName
      ? techShare70 + checkOutShare10
      : techShare70;

  const comboTotal =
    (booking?.selectedCombo ? Number(booking.selectedCombo.price || 0) : 0) +
    (booking?.selectedUnderCombo ? Number(booking.selectedUnderCombo.price || 0) : 0);
  const comboBonus = calculateCvComboTierBonus(comboTotal);
  const serumBonus = (booking?.cartProducts || []).reduce((s, p) => s + (p.cvBonus || 100000) * p.quantity, 0);
  const subtotal = booking?.billing?.subtotal || 1650000;
  const vatRate = booking?.billing?.vatRate ?? 0.08;
  const vatAmount = booking?.billing?.vatAmount ?? Math.round(subtotal * vatRate);
  const grandTotalWithVatAndTip = subtotal + vatAmount + tip;

  return (
    <div className="flex-1 flex flex-col justify-end bg-black/85 select-none overflow-y-auto">
      {/* Top Navbar Header */}
      <div className="pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 px-4 flex items-center justify-between">
        <button onClick={onBack} className="text-[#FFB400] text-sm font-semibold">
          &lt; Quay lại
        </button>
        <h1 className="text-[#FFB400] font-bold text-[16px] tracking-tight">Chia Tip & Thưởng CV🪶</h1>
        <span className="w-12" />
      </div>

      {/* iOS Bottom Sheet Card */}
      <div className="bg-white rounded-t-3xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] shadow-2xl space-y-3">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />

        <div className="text-center">
          <h2 className="text-[17px] font-black text-black">Ghi Nhận Tiền Tip & Tổng Kết Thưởng</h2>
          <div className="text-[12px] text-gray-500 mt-0.5 font-medium">
            Khách hàng: {booking?.customerName || 'Chị Trúc'} · {booking?.orderNumber || '#BK-336695'}
          </div>
        </div>

        {/* 4 Preset Tips */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 20000, label: '20.000 đ' },
            { value: 50000, label: '50.000 đ' },
            { value: 100000, label: '100.000 đ' },
            { value: 200000, label: '200.000 đ' },
          ].map((p) => {
            const isSelected = tip === p.value;
            return (
              <button
                key={p.label}
                onClick={() => setTip(p.value)}
                className={`py-2.5 rounded-2xl text-[12px] font-bold text-center transition-all tabular-nums ${
                  isSelected ? 'bg-[#FFB400] text-black shadow-xs' : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {isSelected ? `✓ ${p.label}` : p.label}
              </button>
            );
          })}
        </div>

        {/* Tip Amount Highlight Box */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-2.5 text-center shadow-xs flex items-center justify-between px-4">
          <div className="text-left">
            <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">TIỀN TIP KHÁCH CHO</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">✓ Tip ≥ 20K (+1 lượt Tip Rate)</div>
          </div>
          <div className="text-[24px] font-black text-[#FF9500] tabular-nums">{tip.toLocaleString('vi-VN')} đ</div>
        </div>

        {/* TIP-001 & CV-002 50/50 Check-in & Check-out Breakdown Box */}
        <div className="bg-white border-2 border-[#FFB400] rounded-2xl p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide">
              PHÂN BỔ TIỀN TIP THEO QUY ĐỊNH
            </span>
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {isSameStaffAllThree ? 'Trọn 90% Tip' : 'Chia 50/50 In/Out'}
            </span>
          </div>

          <div className="space-y-1.5 text-[12px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                1. Chuyên Viên làm mi · <strong className="text-black">{assignedStaffName}</strong>:
              </span>
              <span className="font-bold text-black tabular-nums">{techShare70.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                2. Người Check-in · <strong className="text-black">{checkInStaffName}</strong>:
              </span>
              <span className="font-bold text-emerald-700 tabular-nums">
                +{checkInShare10.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                3. Người Check-out · <strong className="text-black">{checkOutStaffName}</strong>:
              </span>
              <span className="font-bold text-emerald-700 tabular-nums">
                +{checkOutShare10.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-500">
              <span>4. Quỹ chung / CS:</span>
              <span className="font-semibold tabular-nums">{fundShare10.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>

          {/* Total CV🪶 Reward Box */}
          <div className="pt-2 border-t border-amber-200 space-y-1 text-[12px]">
            <div className="flex justify-between items-center text-emerald-800 font-bold">
              <span>Tổng Tip {checkOutStaffName} (CV🪶) nhận:</span>
              <span className="tabular-nums">
                {totalCvEarnedTip.toLocaleString('vi-VN')} đ ({isSameStaffAllThree ? '90%' : '80%'})
              </span>
            </div>
            {(comboBonus > 0 || serumBonus > 0) && (
              <div className="flex justify-between items-center text-[#D97706] font-extrabold">
                <span>Thưởng Combo + Dưỡng mi ({checkOutStaffName} Checkout):</span>
                <span className="tabular-nums">+{Math.round((comboBonus + serumBonus) / 1000)}🪶</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Grand Bill */}
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[13px] font-semibold text-gray-700 block">Tổng thanh toán sau tip:</span>
            <span className="text-[10px] text-gray-500 font-medium">Đã bao gồm 8% thuế VAT</span>
          </div>
          <span className="text-[19px] font-black text-black tabular-nums">
            {grandTotalWithVatAndTip.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => onRecordTip(tip)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform text-center"
          >
            XÁC NHẬN HOÀN TẤT & XUẤT HÓA ĐƠN NHIỆT
          </button>
        </div>
      </div>
    </div>
  );
}
