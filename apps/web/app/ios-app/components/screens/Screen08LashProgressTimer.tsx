'use client';

import React, { useState, useEffect } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';

interface Screen08LashProgressTimerProps {
  booking: BookingItem;
  onBack: () => void;
  onFinishTimer: () => void;
}

export function Screen08LashProgressTimer({ booking, onBack, onFinishTimer }: Screen08LashProgressTimerProps) {
  const [seconds, setSeconds] = useState(booking.progress?.elapsedSeconds || 4468); // 01:14:28
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 flex items-center justify-between">
          <span>2. Bấm Giờ ✓</span>
        </div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1 pb-1.5">3. Ảnh After</div>
      </div>

      <div className="flex-1 flex flex-col justify-around px-4 py-6 overflow-y-auto">
        {/* Big Circular Green Timer */}
        <div className="flex justify-center items-center my-4">
          <div className="w-[260px] h-[260px] rounded-full border-[7px] border-[#22C55E] bg-white flex flex-col items-center justify-center shadow-lg shadow-green-500/10">
            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              THỜI GIAN PHỤC VỤ
            </span>
            <span className="text-[44px] font-black text-black tabular-nums tracking-tight my-1">
              {formatTime(seconds)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[#22C55E] text-[13px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>Đang phục vụ trực tiếp</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-2.5 mx-1">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-gray-500">Định mức ca New Flawless</span>
            <span className="text-black font-bold">75 - 90 phút</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-gray-500">Tiến độ thực hiện</span>
            <span className="text-[#22C55E] font-bold">82% (Đúng tiến độ)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 mx-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="py-3.5 px-6 rounded-2xl bg-[#E5E7EB] text-gray-800 font-bold text-[14px] active:scale-98 transition-transform"
          >
            {isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}
          </button>
          <button
            onClick={onFinishTimer}
            className="flex-1 py-3.5 px-3 rounded-2xl bg-[#FFB400] text-black font-bold text-[14px] shadow-md active:scale-98 transition-transform text-center"
          >
            HOÀN TẤT NỐI MI & CHỤP AFTER
          </button>
        </div>
      </div>
    </div>
  );
}
