'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';

interface Screen12CheckoutBillingProps {
  onBack: () => void;
  onChoosePayment: (method: 'CASH' | 'POS' | 'VIETQR') => void;
}

export function Screen12CheckoutBilling({ onBack, onChoosePayment }: Screen12CheckoutBillingProps) {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'POS' | 'VIETQR'>('VIETQR');

  const handleProceed = () => {
    onChoosePayment(selectedMethod);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Check Out / Thanh Toán"
        onBack={onBack}
        backTitle="Order #6819"
        rightAction={
          <button
            onClick={handleProceed}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            In Bill
          </button>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Customer Header Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold text-black">Chị Quyên · 0937.554.430</div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">CC In: Diễm Hương · CV: Thảo Ly</div>
          </div>
          <span className="bg-[#22C55E] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
            Hoàn thành
          </span>
        </div>

        {/* Section 1: Chi Tiết Hóa Đơn */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            CHI TIẾT HÓA ĐƠN
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            {/* Item 1 */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">1. Nối mi New Flawless</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Chuyên viên: Thảo Ly (CV+)</div>
              </div>
              <span className="text-[14px] text-gray-600 font-medium">550.000 đ</span>
            </div>

            {/* Item 2 */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold text-black">2. Cây dưỡng mi Yeppeum 6ml</div>
                <div className="text-[12px] text-gray-400 mt-0.5">SL: 1 · Tư vấn: Diễm Hương</div>
              </div>
              <span className="text-[14px] text-gray-600 font-medium">1.100.000 đ</span>
            </div>

            {/* Item 3: Discount */}
            <div className="p-3.5 flex items-center justify-between text-[14px]">
              <span className="text-black font-medium">Giảm giá / Ưu đãi</span>
              <span className="text-gray-500 font-medium">0 đ</span>
            </div>

            {/* Total Row */}
            <div className="p-3.5 bg-[#FFFBEB] flex items-center justify-between">
              <span className="text-[14px] font-extrabold text-black">TỔNG TIỀN ĐƠN HÀNG</span>
              <span className="text-[18px] font-black text-[#FF9500] tabular-nums">1.650.000 đ</span>
            </div>
          </div>
        </div>

        {/* Section 2: Hình Thức Thanh Toán */}
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            HÌNH THỨC THANH TOÁN
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div
              onClick={() => setSelectedMethod('CASH')}
              className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                selectedMethod === 'CASH' ? 'bg-[#F0FDF4]' : ''
              }`}
            >
              <span
                className={`text-[14px] font-medium ${selectedMethod === 'CASH' ? 'text-[#15803D] font-bold' : 'text-black'}`}
              >
                {selectedMethod === 'CASH' && '✓ '}Tiền mặt (Cash)
              </span>
              <span
                className={`text-[14px] ${selectedMethod === 'CASH' ? 'text-[#15803D] font-bold' : 'text-gray-500'}`}
              >
                {selectedMethod === 'CASH' ? '1.650.000 đ' : '0 đ'}
              </span>
            </div>

            <div
              onClick={() => setSelectedMethod('POS')}
              className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                selectedMethod === 'POS' ? 'bg-[#F0FDF4]' : ''
              }`}
            >
              <span
                className={`text-[14px] font-medium ${selectedMethod === 'POS' ? 'text-[#15803D] font-bold' : 'text-black'}`}
              >
                {selectedMethod === 'POS' && '✓ '}Thẻ ngân hàng (POS)
              </span>
              <span
                className={`text-[14px] ${selectedMethod === 'POS' ? 'text-[#15803D] font-bold' : 'text-gray-500'}`}
              >
                {selectedMethod === 'POS' ? '1.650.000 đ' : '0 đ'}
              </span>
            </div>

            <div
              onClick={() => setSelectedMethod('VIETQR')}
              className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                selectedMethod === 'VIETQR' ? 'bg-[#F0FDF4]' : ''
              }`}
            >
              <span
                className={`text-[14px] font-medium ${selectedMethod === 'VIETQR' ? 'text-[#15803D] font-bold' : 'text-black'}`}
              >
                {selectedMethod === 'VIETQR' && '✓ '}Chuyển khoản QR (Bank)
              </span>
              <span
                className={`text-[14px] ${selectedMethod === 'VIETQR' ? 'text-[#15803D] font-bold' : 'text-gray-500'}`}
              >
                {selectedMethod === 'VIETQR' ? '1.650.000 đ' : '0 đ'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleProceed}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            TIẾP TỤC: GHI NHẬN TIỀN TIP
          </button>
        </div>
      </div>
    </div>
  );
}
