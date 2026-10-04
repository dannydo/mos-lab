'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
}

export function Screen09LashProgressAfter({ booking, onBack, onSavePhoto }: Screen09LashProgressAfterProps) {
  const handleProceed = () => {
    onSavePhoto('/assets/lash_after.jpg');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Tiến Trình Nối Mi"
        onBack={onBack}
        backTitle="Ca Làm"
        rightAction={<span className="text-[#FFB400] font-bold text-base px-1">G03</span>}
      />

      {/* Steps subheader on black */}
      <div className="bg-black select-none shrink-0 border-b border-neutral-900">
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">1. Ảnh Before</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Bấm Giờ</div>
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 pb-1.5 flex items-center justify-between">
          <span>3. Ảnh After ✓</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Section 1: Comparison */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
            SO SÁNH ĐỐI CHIẾU BEFORE / AFTER
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Before Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-neutral-100 flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#FFB400] mb-2 flex items-center justify-center text-black font-bold text-sm shadow-xs">
                  ●
                </div>
                <span className="text-white font-medium text-[12px] leading-tight">Mắt Mộc Trước Nối</span>
              </div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mt-2.5">BEFORE</span>
            </div>

            {/* After Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border-2 border-[#22C55E] flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#22C55E] mb-2 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  ●
                </div>
                <span className="text-[#22C55E] font-semibold text-[12px] leading-tight">New Flawless Hoàn Thiện</span>
              </div>
              <span className="text-[11px] font-extrabold text-[#22C55E] uppercase tracking-wider mt-2.5">
                AFTER (ĐẠT CHUẨN)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Technical Acceptance */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            NGHIỆM THU KỸ THUẬT
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3.5 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">✓ Chải mi tơi mướt, không dính chân mi</span>
              <span className="text-[#22C55E] font-bold">Đạt</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">✓ Không đỏ mắt, không cay mắt</span>
              <span className="text-[#22C55E] font-bold">Đạt</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">✓ Khách soi gương và ưng ý form mi</span>
              <span className="text-[#22C55E] font-bold">Đạt</span>
            </div>
            <div className="p-3.5 flex items-center justify-between text-[13px]">
              <span className="text-black font-medium">Thời gian hoàn thành thực tế</span>
              <span className="text-[#FF9500] font-bold">76 phút</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleProceed}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[14px] shadow-md active:scale-98 transition-transform text-center"
          >
            CHUYỂN MÁY CHO KHÁCH KHẢO SÁT CẢM XÚC
          </button>
        </div>
      </div>
    </div>
  );
}
