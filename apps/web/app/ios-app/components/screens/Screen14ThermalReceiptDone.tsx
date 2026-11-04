'use client';

import React from 'react';
import { BookingItem } from '../../state/mockData';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';

interface Screen14ThermalReceiptDoneProps {
  booking: BookingItem;
  onFinishOrder: () => void;
}

export function Screen14ThermalReceiptDone({ booking, onFinishOrder }: Screen14ThermalReceiptDoneProps) {
  const customerName = booking?.customerName || 'Chị Trúc';
  const customerPhone = booking?.customerPhone || '0933.779.207';
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const checkInStaff = booking?.checkInStaffName || assignedStaff;
  const checkOutStaff = booking?.checkOutStaffName || assignedStaff;
  const serviceName = resolveDisplayServiceName(booking);
  const servicePrice = booking?.servicePrice || 770000;
  const selectedCombo = booking?.selectedCombo || null;
  const cartProducts = booking?.cartProducts || [];
  const tipAmount = booking?.billing?.tipAmount ?? 50000;
  const grandTotal =
    booking?.billing?.grandTotal ||
    servicePrice +
      (selectedCombo ? selectedCombo.price : 0) +
      cartProducts.reduce((s, p) => s + p.price * p.quantity, 0) +
      tipAmount;

  const comboBonus = selectedCombo?.bonus || 0;
  const serumBonus = cartProducts.reduce((s, p) => s + (p.cvBonus || 100000) * p.quantity, 0);
  const tipEarned90 = Math.round(tipAmount * 0.9);

  return (
    <div className="flex-1 flex flex-col justify-between bg-black select-none px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] overflow-y-auto">
      {/* Top Header */}
      <div className="text-center pb-2">
        <h1 className="text-[#FFB400] font-bold text-[17px] tracking-tight">Hoàn Tất Ca Làm & Ghi Nhận Thưởng CV🪶</h1>
      </div>

      {/* White Thermal Receipt */}
      <div className="bg-white rounded-2xl p-4 text-black space-y-2 shadow-2xl my-auto">
        <div className="text-center">
          <div className="text-[15px] font-black tracking-wide">WINGS LASHES & BEAUTY</div>
          <div className="text-[11px] text-gray-600 mt-0.5">CN ĐỀ THÁM · 112 Đề Thám, Q.1, TP.HCM</div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        <div className="text-center">
          <div className="text-[13px] font-black uppercase tracking-wider">PHIẾU THANH TOÁN & GHI NHẬN CA</div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
            HĐ: #{booking?.orderNumber || 'BK-336695'} · Hoàn tất
          </div>
        </div>

        <div className="text-[11px] space-y-0.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
          <div>
            Khách hàng: <strong className="font-bold">{customerName}</strong> ({customerPhone})
          </div>
          <div>
            Chuyên Viên làm mi: <strong className="font-bold">{assignedStaff} (CV🪶)</strong>
          </div>
          <div>
            Check-in: <strong className="font-bold text-emerald-700">{checkInStaff}</strong> · Check-out:{' '}
            <strong className="font-bold text-emerald-700">{checkOutStaff}</strong>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Items Table */}
        <div className="space-y-1 text-[12px]">
          <div className="flex justify-between font-bold text-black uppercase text-[11px]">
            <span>TÊN MẶT HÀNG</span>
            <span>THÀNH TIỀN</span>
          </div>
          <div className="flex justify-between text-gray-800">
            <span>1. {serviceName}</span>
            <span className="tabular-nums font-medium">{servicePrice.toLocaleString('vi-VN')}</span>
          </div>
          {selectedCombo && (
            <div className="flex justify-between text-gray-800">
              <span>2. {selectedCombo.name}</span>
              <span className="tabular-nums font-medium">{selectedCombo.price.toLocaleString('vi-VN')}</span>
            </div>
          )}
          {cartProducts.map((p, idx) => (
            <div key={idx} className="flex justify-between text-gray-800">
              <span>
                {selectedCombo ? idx + 3 : idx + 2}. {p.productName} (x{p.quantity})
              </span>
              <span className="tabular-nums font-medium">{(p.price * p.quantity).toLocaleString('vi-VN')}</span>
            </div>
          ))}
          <div className="flex justify-between text-gray-800">
            <span>Tiền Tip khách thưởng</span>
            <span className="tabular-nums font-medium">{tipAmount.toLocaleString('vi-VN')}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Total */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[15px] font-black text-black">
            <span>TỔNG THANH TOÁN:</span>
            <span className="tabular-nums text-[16px]">{grandTotal.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* CV🪶 Reward Summary Box */}
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 space-y-1 text-[11px]">
          <div className="font-extrabold text-emerald-900 uppercase">
            🎉 QUYỀN LỢI GHI NHẬN CHO {checkOutStaff.toUpperCase()} (CV🪶):
          </div>
          <div className="flex justify-between text-emerald-800">
            <span>• Tiền Tip phân bổ nhận được:</span>
            <span className="font-bold tabular-nums">+{tipEarned90.toLocaleString('vi-VN')} đ</span>
          </div>
          {comboBonus > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>• Thưởng chốt Gói Combo bậc thang CV🪶:</span>
              <span className="font-bold tabular-nums">+{comboBonus.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          {serumBonus > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>• Thưởng bán Dưỡng mi Yeppeum 6ml:</span>
              <span className="font-bold tabular-nums">+{serumBonus.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          <div className="pt-1 border-t border-emerald-200 flex justify-between font-black text-emerald-950 text-[12px]">
            <span>TỔNG THU NHẬP THƯỞNG CA NÀY:</span>
            <span className="tabular-nums">+{(tipEarned90 + comboBonus + serumBonus).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="pt-3 space-y-2">
        <div className="text-center text-[12px] font-bold text-[#22C55E]">
          ✓ Đã ghi nhận check_in_staff_id & check_out_staff_id = {checkOutStaff} (CV🪶)
        </div>
        <button
          onClick={onFinishOrder}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[15px] shadow-md active:scale-98 transition-transform text-center"
        >
          ĐÓNG & QUAY VỀ DANH SÁCH KHÁCH HÀNG
        </button>
      </div>
    </div>
  );
}
