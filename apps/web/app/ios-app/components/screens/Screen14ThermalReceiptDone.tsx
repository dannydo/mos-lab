'use client';

import React from 'react';
import { BookingItem } from '../../state/mockData';

interface Screen14ThermalReceiptDoneProps {
  booking: BookingItem;
  onFinishOrder: () => void;
}

export function Screen14ThermalReceiptDone({ booking, onFinishOrder }: Screen14ThermalReceiptDoneProps) {
  const customerName = booking?.customerName || 'Chị Quyên';
  const customerPhone = booking?.customerPhone || '0937.554.430';
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';

  return (
    <div className="flex-1 flex flex-col justify-between bg-black select-none px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] overflow-y-auto">
      {/* Top Header */}
      <div className="text-center pb-3">
        <h1 className="text-[#FFB400] font-bold text-[17px] tracking-tight">Booking Done</h1>
      </div>

      {/* White Thermal Receipt */}
      <div className="bg-white rounded-2xl p-5 text-black space-y-2.5 shadow-2xl my-auto">
        {/* Salon Header */}
        <div className="text-center">
          <div className="text-[15px] font-black tracking-wide">WINGS LASHES & BEAUTY</div>
          <div className="text-[11px] text-gray-600 mt-0.5">CN ĐỀ THÁM · 68 Đề Thám, Q.1, TP.HCM</div>
          <div className="text-[11px] text-gray-600">Hotline: 1800 8154</div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Invoice Title */}
        <div className="text-center">
          <div className="text-[13px] font-black uppercase tracking-wider">PHIẾU THANH TOÁN (HÓA ĐƠN)</div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-mono">HĐ: #ORD-2026-6819 · 19/01/2026 12:05 PM</div>
        </div>

        {/* Customer & Staff */}
        <div className="text-[12px] space-y-0.5">
          <div>
            Khách: <strong className="font-bold">{customerName}</strong> ({customerPhone})
          </div>
          <div className="text-gray-600">CC: Diễm Hương · CV: {assignedStaff}</div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Items Table */}
        <div className="space-y-1 text-[12px]">
          <div className="flex justify-between font-bold text-black uppercase text-[11px]">
            <span>TÊN MẶT HÀNG</span>
            <span>THÀNH TIỀN</span>
          </div>
          <div className="flex justify-between text-gray-800">
            <span>1. Nối mi New Flawless</span>
            <span className="tabular-nums font-medium">550.000</span>
          </div>
          <div className="flex justify-between text-gray-800">
            <span>2. Cây dưỡng mi Yeppeum</span>
            <span className="tabular-nums font-medium">1.100.000</span>
          </div>
          <div className="flex justify-between text-gray-800">
            <span>3. Tiền tip (70% CV, 20% CC)</span>
            <span className="tabular-nums font-medium">50.000</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Total */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[15px] font-black text-black">
            <span>TỔNG CỘNG:</span>
            <span className="tabular-nums text-[16px]">1.700.000 đ</span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-600">
            <span>Hình thức thanh toán:</span>
            <span className="font-medium">QR Bank Transfer</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400" />

        {/* Footer Notes */}
        <div className="text-center text-[11px] text-gray-600 space-y-1 pt-1">
          <div className="font-bold text-black">HƯỚNG DẪN DƯỠNG MI YEPPEUM:</div>
          <div>Chải dưỡng chất 2 lần/ngày sáng & tối.</div>
          <div className="italic text-gray-500 pt-1">Cảm ơn {customerName} đã luôn tin yêu Wings!</div>
          <div className="font-bold text-black pt-1">*** ĐÃ IN HOÀN TẤT & ĐÓNG ĐƠN ***</div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="pt-4 space-y-3">
        <div className="text-center text-[13px] font-bold text-[#22C55E]">
          ✓ Đơn hàng đã chuyển sang Tab DONE (Hoàn Tất)
        </div>
        <button
          onClick={onFinishOrder}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
        >
          ĐÓNG & QUAY VỀ LỊCH HẸN
        </button>
      </div>
    </div>
  );
}
