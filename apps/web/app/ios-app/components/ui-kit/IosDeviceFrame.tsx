'use client';

import React from 'react';
import { Smartphone, Tablet, Maximize2, RotateCcw, UserCheck, Scissors } from 'lucide-react';

interface IosDeviceFrameProps {
  deviceMode: 'iphone' | 'ipad' | 'fullscreen';
  setDeviceMode: (mode: 'iphone' | 'ipad' | 'fullscreen') => void;
  role: 'CC' | 'CV';
  setRole: (role: 'CC' | 'CV') => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onReset: () => void;
  children: React.ReactNode;
}

const STEP_TITLES = [
  '1. Lịch Hẹn Incoming (CC)',
  '2. Xem Hồ Sơ & Check In (CC)',
  '3. Khám Mi & Ma Trận Dáng (CC)',
  '4. Gán Chuyên Viên & Giường (CC)',
  '5. Bàn Giao Servicing (CC)',
  '6. CV Nhận Ca Trên App (CV)',
  '7. Chụp Ảnh Before (CV)',
  '8. Bấm Giờ Phục Vụ (CV)',
  '9. Chụp Ảnh After (CV)',
  '10. Khảo Sát 4 Khuôn Mặt (Khách)',
  '11. Bán Lẻ Yeppeum 6ml (CC)',
  '12. Bảng Kê & Thanh Toán QR (CC)',
  '13. Ghi Nhận Tip 50K (CC)',
  '14. In Bill Nhiệt & Hoàn Tất (CC)',
];

export function IosDeviceFrame({
  deviceMode,
  setDeviceMode,
  role,
  setRole,
  currentStep,
  setCurrentStep,
  onReset,
  children,
}: IosDeviceFrameProps) {
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center justify-start pb-12 font-sans">
      {/* Top Controller Bar for Danny */}
      <header className="w-full bg-[#141416] border-b border-neutral-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFB400] text-black font-black flex items-center justify-center text-sm shadow-md">
            W
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">Wings Beauty iOS App</span>
              <span className="text-[11px] bg-neutral-800 border border-neutral-700 text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                Clone Web 1:1
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Chi nhánh Đề Thám · Flow chuẩn: CC $\rightarrow$ CV $\rightarrow$ CC
            </p>
          </div>
        </div>

        {/* Step Quick Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-neutral-400 font-medium hidden sm:inline">Màn hình:</span>
          <select
            value={currentStep}
            onChange={(e) => {
              const step = Number(e.target.value);
              setCurrentStep(step);
              if (step >= 6 && step <= 10) {
                setRole('CV');
              } else {
                setRole('CC');
              }
            }}
            className="bg-[#1f1f23] text-amber-400 text-xs font-semibold border border-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 max-w-[210px] truncate"
          >
            {STEP_TITLES.map((title, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {title}
              </option>
            ))}
          </select>
        </div>

        {/* Device & Role Controls */}
        <div className="flex items-center space-x-2">
          {/* Role toggle */}
          <div className="bg-[#1f1f23] p-1 rounded-lg border border-neutral-700 flex items-center space-x-1">
            <button
              onClick={() => setRole('CC')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium flex items-center space-x-1 transition-colors ${
                role === 'CC' ? 'bg-[#FFB400] text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>CC Tiếp Tân</span>
            </button>
            <button
              onClick={() => setRole('CV')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium flex items-center space-x-1 transition-colors ${
                role === 'CV' ? 'bg-[#FFB400] text-black font-bold shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Chuyên Viên</span>
            </button>
          </div>

          {/* Device mode toggle */}
          <div className="bg-[#1f1f23] p-1 rounded-lg border border-neutral-700 flex items-center space-x-1">
            <button
              onClick={() => setDeviceMode('iphone')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'iphone' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Khung iPhone 14 Pro"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('ipad')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'ipad' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Khung iPad"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('fullscreen')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                deviceMode === 'fullscreen' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Tràn màn hình"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="p-1.5 bg-[#1f1f23] border border-neutral-700 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Làm mới lại dữ liệu demo ban đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="w-full flex-1 flex items-center justify-center p-4 sm:p-6">
        {deviceMode === 'fullscreen' ? (
          <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col min-h-[700px]">
            {children}
          </div>
        ) : (
          <div
            className={`relative transition-all duration-300 ${
              deviceMode === 'iphone' ? 'w-[390px] h-[844px] rounded-[52px]' : 'w-[820px] h-[880px] rounded-[36px]'
            } bg-black p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[10px] border-[#2c2c2e] ring-1 ring-neutral-700 flex flex-col overflow-hidden`}
          >
            {/* Inner Screen Content */}
            <div className="w-full h-full rounded-[40px] overflow-hidden flex flex-col bg-black relative">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
