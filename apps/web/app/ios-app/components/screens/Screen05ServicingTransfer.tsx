'use client';

import React from 'react';
import { Calendar, Phone, ShoppingCart, ArrowRight } from 'lucide-react';
import { BookingItem } from '../../state/mockData';

interface Screen05ServicingTransferProps {
  booking: BookingItem;
  onTransferToCv: () => void;
}

export function Screen05ServicingTransfer({ booking, onTransferToCv }: Screen05ServicingTransferProps) {
  const customerName = booking?.customerName || 'Quyên';
  const customerPhone = booking?.customerPhone || '0937.554.430';
  const assignedStaff = booking?.assignedStaffName || 'Thảo Ly';
  const assignedBed = booking?.assignedBed || 'GIƯỜNG 03';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* Top Navigation Bar on Black */}
      <header className="w-full pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 px-4 flex items-center justify-between bg-black border-b border-neutral-900 select-none z-40 relative min-h-[50px] shrink-0">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-[#FFB400]" />
        </div>
        <div className="text-[#FFB400] font-bold text-[17px] tracking-tight">De Tham</div>
        <div className="flex items-center gap-3.5">
          <Phone className="w-5 h-5 text-[#FFB400]" />
          <ShoppingCart className="w-5 h-5 text-[#FFB400]" />
        </div>
      </header>

      {/* Sub-navbar Category Tabs on Black */}
      <div className="bg-black px-4 pt-1 pb-2 flex items-center border-b border-neutral-900 shrink-0">
        <div className="mr-8 pb-1 relative">
          <span className="text-[14px] font-bold text-[#FFB400] tracking-tight">LASHES</span>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFB400]" />
        </div>
        <div className="mr-8 pb-1 text-neutral-400 text-[14px] font-medium">SAUNA</div>
        <div className="pb-1 text-neutral-400 text-[14px] font-medium">ALL</div>
      </div>

      {/* Segmented Control on Black */}
      <div className="bg-black px-3 py-2 flex items-center gap-1 shrink-0 border-b border-neutral-900">
        <div className="flex-1 py-1.5 text-center text-[12px] font-medium text-neutral-400 rounded-md">INCOMING</div>
        <div className="flex-[1.4] py-1.5 text-center text-[12px] font-extrabold bg-[#FFB400] text-black rounded-md shadow-xs">
          SERVICING (ĐANG LÀM)
        </div>
        <div className="flex-1 py-1.5 text-center text-[12px] font-medium text-neutral-400 rounded-md">DONE</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        {/* Booking Items */}
        <div className="bg-white divide-y divide-gray-100 border-b border-gray-200">
          {/* Row 1: Current Booking (Quyên) */}
          <div
            onClick={onTransferToCv}
            className="p-3.5 flex items-center gap-3 cursor-pointer active:bg-amber-50/50 transition-colors"
          >
            <span className="text-gray-400 font-bold text-sm w-4 text-center">1</span>
            <div className="w-12 h-12 rounded-full bg-[#FFB400] border-2 border-[#34C759] p-0.5 flex items-center justify-center text-black font-extrabold text-base shrink-0 shadow-xs">
              {customerName.charAt(0) || 'Q'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-black truncate">{customerName}</span>
                <span className="text-[13px] font-bold text-[#FF3B30]">10:35 am</span>
              </div>
              <div className="text-[12px] text-gray-500 font-normal">{customerPhone}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="bg-[#22C55E] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {assignedBed}
                </span>
                <span className="text-[12px] text-[#FF9500] font-semibold">CV: {assignedStaff}</span>
              </div>
              <div className="text-[12px] text-gray-700 font-medium mt-0.5">New Flawless 550 · Bắt đầu 10:35 am</div>
            </div>
          </div>

          {/* Row 2: Second Servicing Booking (Chi) */}
          <div className="p-3.5 flex items-center gap-3 opacity-80">
            <span className="text-gray-400 font-bold text-sm w-4 text-center">2</span>
            <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-[#34C759] p-0.5 flex items-center justify-center text-emerald-800 font-extrabold text-base shrink-0 shadow-xs">
              C
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-black truncate">Chi</span>
                <span className="text-[13px] font-bold text-[#FF3B30]">09:00 am</span>
              </div>
              <div className="text-[12px] text-gray-500 font-normal">0938.133.636</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="bg-[#22C55E] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  GIƯỜNG 01
                </span>
                <span className="text-[12px] text-[#FF9500] font-semibold">CV: Diễm My</span>
              </div>
              <div className="text-[12px] text-gray-700 font-medium mt-0.5">New Hyperlight 550 · Dặm mi</div>
            </div>
          </div>
        </div>

        {/* Green Notification Card & Handover button */}
        <div className="p-4 space-y-3">
          <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl p-4 shadow-xs">
            <p className="text-[13px] text-[#15803D] font-medium leading-relaxed">
              ✓ CC Diễm Hương đã dẫn khách vào Giường 03 và bàn giao thông số nối mi New Flawless cho CV Thảo Ly.
            </p>
          </div>

          <button
            onClick={onTransferToCv}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
          >
            <span>CHUYỂN SANG MÀN HÌNH CHUYÊN VIÊN (CV THẢO LY)</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
