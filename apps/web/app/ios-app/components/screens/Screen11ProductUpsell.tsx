'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';

interface Screen11ProductUpsellProps {
  onBack: () => void;
  onGoToBilling: () => void;
}

export function Screen11ProductUpsell({ onBack, onGoToBilling }: Screen11ProductUpsellProps) {
  const [yeppeumCount, setYeppeumCount] = useState<number>(1);

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Bán Lẻ Sản Phẩm"
        onBack={onBack}
        backTitle="Order #6819"
        rightAction={
          <button
            onClick={onGoToBilling}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            Done
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Amber Notification Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[13px] font-bold text-gray-900 leading-snug">
            Tư vấn chăm sóc mi sau nối cho Chị Quyên
          </div>
          <div className="text-[12px] text-gray-500 mt-0.5 font-medium">Tư vấn viên: Diễm Hương · Salon Đề Thám</div>
        </div>

        {/* Section 1: SẢN PHẨM ĐỘC QUYỀN KHUYÊN DÙNG */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            SẢN PHẨM ĐỘC QUYỀN KHUYÊN DÙNG
          </div>

          <div className="bg-white border-2 border-[#FFB400] rounded-2xl p-3.5 shadow-sm flex gap-3.5">
            {/* Box Placeholder */}
            <div className="w-20 h-24 rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-2 shrink-0">
              <span className="text-[#FFB400] font-black text-[11px] tracking-wider text-center">YEPPEUM</span>
              <span className="text-white text-[10px] font-semibold mt-1">6ml</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <span className="text-[14px] font-bold text-black leading-snug">Cây dưỡng mi Yeppeum 6ml</span>
                <span className="bg-[#22C55E] text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-xs shrink-0">
                  ĐÃ CHỌN
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">Mã SP: #36 · Xuất xứ Hàn Quốc</div>
              <div className="text-[11px] text-gray-600 mt-1 leading-tight">
                Dưỡng chất peptide phục hồi nang mi thật, khóa gốc keo, giữ độ bền mi nối lâu hơn 2 tuần.
              </div>

              <div className="flex items-center justify-between mt-2 pt-1">
                <span className="text-[#FF9500] font-black text-[15px] tabular-nums">1.100.000 đ</span>
                <div className="bg-[#F2F2F7] rounded-lg px-2 py-0.5 flex items-center gap-2 text-[12px] font-bold text-gray-800">
                  <button
                    onClick={() => setYeppeumCount((c) => Math.max(1, c - 1))}
                    className="px-1 text-gray-500 active:scale-90"
                  >
                    -
                  </button>
                  <span>{yeppeumCount}</span>
                  <button onClick={() => setYeppeumCount((c) => c + 1)} className="px-1 text-gray-500 active:scale-90">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: SẢN PHẨM KHÁC TRONG KHO */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            SẢN PHẨM KHÁC TRONG KHO
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">Bọt vệ sinh mi Lash Foam 50ml</div>
                <div className="text-[12px] text-gray-400 mt-0.5">180.000 đ</div>
              </div>
              <button className="bg-[#E5E7EB] text-gray-800 font-bold text-[12px] px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                + Thêm
              </button>
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">Chổi chải mi pha lê Wings</div>
                <div className="text-[12px] text-gray-400 mt-0.5">35.000 đ</div>
              </div>
              <button className="bg-[#E5E7EB] text-gray-800 font-bold text-[12px] px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                + Thêm
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Summary card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Dịch vụ New Flawless:</span>
            <span className="text-gray-800 font-medium">550.000 đ</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Sản phẩm Yeppeum 6ml:</span>
            <span className="text-gray-800 font-medium">1.100.000 đ</span>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[15px] font-bold text-black">Tổng tạm tính:</span>
            <span className="text-[17px] font-black text-[#FF9500] tabular-nums">1.650.000 đ</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={onGoToBilling}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            THÊM VÀO HÓA ĐƠN & SANG THANH TOÁN
          </button>
        </div>
      </div>
    </div>
  );
}
