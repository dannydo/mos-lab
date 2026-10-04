'use client';

import React from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { Eye, Check } from 'lucide-react';

interface Screen07LashProgressBeforeProps {
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
}

export function Screen07LashProgressBefore({ onBack, onSavePhoto }: Screen07LashProgressBeforeProps) {
  const handleSave = () => {
    onSavePhoto('/assets/lash_before.jpg');
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
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 flex items-center justify-between">
          <span>1. Ảnh Before ✓</span>
        </div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Bấm Giờ</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1 pb-1.5">3. Ảnh After</div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold text-black">Chị Quyên · Giường 03</div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">Dáng Flawless · Cong C · Dài 10-12mm</div>
          </div>
          <span className="bg-[#22C55E] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
            Đang phục vụ
          </span>
        </div>

        {/* Section title */}
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 pt-1">
          CHỤP ẢNH BEFORE MẮT MỘC (BẮT BUỘC)
        </div>

        {/* Camera Viewfinder Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-3">
          <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#FFB400]/20 flex items-center justify-center mb-3">
              <Eye className="w-10 h-10 text-[#FFB400]" />
            </div>
            <div className="text-white font-bold text-[15px] text-center">Ảnh Before Mắt Mộc Chị Quyên</div>
            <div className="text-[#34C759] text-[12px] font-semibold mt-1">✓ Độ nét cao · Đủ ánh sáng</div>

            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] font-mono px-2 py-0.5 rounded">
              10:38:15 AM · Salon Đề Thám · G03
            </div>
          </div>

          <div className="flex gap-2.5">
            <button className="flex-1 py-3 bg-[#E5E7EB] text-gray-800 font-semibold text-[13px] rounded-xl text-center active:scale-98 transition-transform">
              Chụp lại
            </button>
            <button className="flex-1 py-3 bg-[#DCFCE7] text-[#16A34A] font-bold text-[13px] rounded-xl text-center flex items-center justify-center gap-1 active:scale-98 transition-transform">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Đạt tiêu chuẩn</span>
            </button>
          </div>
        </div>

        {/* Bottom Big Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            LƯU ẢNH BEFORE & BẮT ĐẦU BẤM GIỜ
          </button>
        </div>
      </div>
    </div>
  );
}
