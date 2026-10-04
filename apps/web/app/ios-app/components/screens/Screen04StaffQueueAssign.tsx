'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { Check } from 'lucide-react';

interface Screen04StaffQueueAssignProps {
  onBack: () => void;
  onAssign: (staffId: number, staffName: string, bed: string) => void;
}

export function Screen04StaffQueueAssign({ onBack, onAssign }: Screen04StaffQueueAssignProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number>(46272); // Thảo Ly
  const [activeTab, setActiveTab] = useState<'LASHES' | 'SAUNA' | 'ALL'>('LASHES');

  const handleConfirm = () => {
    onAssign(46272, 'Thảo Ly', 'Giường 03');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Assign Technician"
        onBack={onBack}
        backTitle="Consultation"
        rightAction={
          <button
            onClick={handleConfirm}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60"
          >
            Done
          </button>
        }
      />

      {/* Sub-navbar Category Tabs on Black */}
      <div className="bg-black px-4 pt-1 pb-2 flex items-center border-b border-neutral-900 shrink-0">
        <button onClick={() => setActiveTab('LASHES')} className="mr-6 pb-1 relative">
          <span className="text-[13px] font-bold text-[#FFB400] tracking-tight">LASHES (CHUYÊN VIÊN MI)</span>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFB400]" />
        </button>
        <button onClick={() => setActiveTab('SAUNA')} className="mr-6 pb-1 text-neutral-400 text-[13px] font-medium">
          SAUNA
        </button>
        <button onClick={() => setActiveTab('ALL')} className="pb-1 text-neutral-400 text-[13px] font-medium">
          ALL
        </button>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Amber Notification Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[13px] font-bold text-amber-900 leading-snug">
            Khách yêu cầu đích danh: CHUYÊN VIÊN THẢO LY
          </div>
          <div className="text-[12px] text-amber-700/90 mt-0.5 font-medium">
            Ca hẹn lúc 10:30 am · Dịch vụ New Flawless 550K
          </div>
        </div>

        {/* Section Header */}
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 pt-1">
          HÀNG ĐỢI CHUYÊN VIÊN TẠI SALON ĐỀ THÁM
        </div>

        {/* Technician Queue List */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
          {/* Row 1: Thảo Ly */}
          <div
            onClick={() => setSelectedStaffId(46272)}
            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FFB400] border-2 border-[#34C759] p-0.5 flex items-center justify-center text-black font-extrabold text-base shrink-0 shadow-xs">
                TL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-black">Thảo Ly (CV+)</span>
                  <span className="bg-[#FF9500] text-black font-black text-[10px] px-1.5 py-0.5 rounded tracking-wider">
                    BOOKED
                  </span>
                </div>
                <div className="text-[12px] text-[#34C759] font-medium mt-0.5">● Sẵn sàng · Giường 03</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Đánh giá: 5.0 ★ · 24 ca hoàn thành</div>
              </div>
            </div>

            <div className="w-6 h-6 rounded-full bg-[#FF9500] text-white flex items-center justify-center shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>

          {/* Row 2: Diễm My */}
          <div
            onClick={() => setSelectedStaffId(46273)}
            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-base shrink-0">
                DM
              </div>
              <div>
                <span className="text-[15px] font-bold text-gray-800">Diễm My</span>
                <div className="text-[12px] text-amber-600 font-medium mt-0.5">
                  Đang làm mi (Còn ~20 phút) · Giường 01
                </div>
              </div>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
          </div>

          {/* Row 3: Bích Ngọc */}
          <div
            onClick={() => setSelectedStaffId(46274)}
            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-base shrink-0">
                BN
              </div>
              <div>
                <span className="text-[15px] font-bold text-gray-800">Bích Ngọc</span>
                <div className="text-[12px] text-gray-400 font-medium mt-0.5">Chờ ca tiếp theo</div>
              </div>
            </div>

            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-3">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center"
          >
            XÁC NHẬN GÁN CV THẢO LY (GIƯỜNG 03)
          </button>
        </div>
      </div>
    </div>
  );
}
