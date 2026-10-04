'use client';

import React, { useState } from 'react';

interface Screen13CheckoutTipProps {
  onBack: () => void;
  onRecordTip: (tipAmount: number) => void;
}

export function Screen13CheckoutTip({ onBack, onRecordTip }: Screen13CheckoutTipProps) {
  const [tip, setTip] = useState<number>(50000);

  const cvShare = Math.round(tip * 0.7);
  const ccShare = Math.round(tip * 0.2);
  const fundShare = tip - cvShare - ccShare;

  return (
    <div className="flex-1 flex flex-col justify-end bg-black/80 select-none">
      {/* Top Navbar Header placeholder on black */}
      <div className="pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3 px-4 flex items-center justify-center">
        <h1 className="text-[#FFB400] font-bold text-[17px] tracking-tight">Check Out</h1>
      </div>

      <div className="flex-1" onClick={onBack} />

      {/* iOS Bottom Sheet Card */}
      <div className="bg-white rounded-t-3xl px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-2xl space-y-4">
        {/* Grabber bar */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />

        {/* Title */}
        <div className="text-center">
          <h2 className="text-[18px] font-black text-black">Ghi Nhận Tiền Tip Của Khách</h2>
          <div className="text-[12px] text-gray-500 mt-0.5 font-medium">Khách hàng: Chị Quyên · Đơn hàng #6819</div>
        </div>

        {/* 4 Preset Tips */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { value: 20000, label: '20.000 đ' },
            { value: 50000, label: '50.000 đ' },
            { value: 100000, label: '100.000 đ' },
            { value: 0, label: 'Khác' },
          ].map((p) => {
            const isSelected = tip === p.value;
            return (
              <button
                key={p.label}
                onClick={() => setTip(p.value)}
                className={`py-3 rounded-2xl text-[13px] font-bold text-center transition-all ${
                  isSelected ? 'bg-[#FFB400] text-black shadow-xs' : 'bg-[#F2F2F7] text-gray-800'
                }`}
              >
                {isSelected && p.value > 0 ? `✓ ${p.label}` : p.label}
              </button>
            );
          })}
        </div>

        {/* Tip Amount Highlight Box */}
        <div className="bg-white border border-amber-300 rounded-2xl p-3.5 text-center shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">TIỀN TIP KHÁCH CHO</div>
          <div className="text-[32px] font-black text-[#FF9500] tabular-nums mt-0.5">
            {tip.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* TIP-001 Breakdown Box */}
        <div className="bg-white border border-amber-300 rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="text-[12px] font-bold text-amber-800 uppercase tracking-wide">
            PHÂN BỔ TIỀN TIP (ĐIỀU RĂN TIP-001)
          </div>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-800 font-medium">CV Thảo Ly (70%):</span>
              <span className="font-bold text-black tabular-nums">{cvShare.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-800 font-medium">CC Diễm Hương (20%):</span>
              <span className="font-bold text-black tabular-nums">{ccShare.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-800 font-medium">Quỹ chung (10%):</span>
              <span className="font-bold text-black tabular-nums">{fundShare.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
          <div className="pt-2 border-t border-amber-100 text-[11px] text-[#15803D] font-semibold leading-relaxed">
            ✓ Mức tip ≥ 20K: Tính +1 lượt Tip Rate cho Salon & Chuyên viên.
          </div>
        </div>

        {/* Total Grand Bill */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[14px] font-medium text-gray-500">Tổng thanh toán sau tip:</span>
          <span className="text-[20px] font-black text-black tabular-nums">
            {(1650000 + tip).toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={() => onRecordTip(tip)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            XÁC NHẬN & IN HÓA ĐƠN NHIỆT
          </button>
        </div>
      </div>
    </div>
  );
}
