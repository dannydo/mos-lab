'use client';

import React, { useState, useEffect } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { saveLocalProgressSnapshot } from '../../state/offlineSync';
import { Eye, Check, Wifi, WifiOff, Camera, Sparkles } from 'lucide-react';

interface Screen07LashProgressBeforeProps {
  booking?: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
}

export function Screen07LashProgressBefore({ booking, onBack, onSavePhoto }: Screen07LashProgressBeforeProps) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSave = () => {
    const photoUrl = '/assets/lash_before.jpg';
    if (booking?.id) {
      saveLocalProgressSnapshot(booking.id, {
        beforePhotoUrl: photoUrl,
        beforePhotoSavedAt: new Date().toISOString(),
        bookingId: booking.id,
      });
    }
    onSavePhoto(photoUrl);
  };

  const customerName = booking?.customerName || 'Chị Quyên';
  const bedLabel = booking?.assignedBed || 'Giường 03';
  const serviceName = booking?.serviceName || 'Dáng Flawless · Cong C · Dài 10-12mm';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Tiến Trình Nối Mi"
        onBack={onBack}
        backTitle="Ca Làm"
        rightAction={
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border tabular-nums ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
              }`}
              title={isOnline ? 'Đã kết nối máy chủ' : 'Đang lưu tạm Offline'}
            >
              {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
            <span className="text-[#FFB400] font-black text-sm px-1 tabular-nums">{bedLabel}</span>
          </div>
        }
      />

      {/* Steps subheader on black */}
      <div className="bg-black select-none shrink-0 border-b border-neutral-900">
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 flex items-center justify-between">
          <span>1. Ảnh Before Mắt Mộc ✓</span>
          <span className="text-[11px] font-mono">Bắt buộc</span>
        </div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Bấm Giờ Phục Vụ</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1 pb-1.5">3. Ảnh After Hoàn Thiện</div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-black">
              {customerName} · {bedLabel}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">{serviceName}</div>
          </div>
          <span className="bg-[#22C55E] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
            Đang phục vụ
          </span>
        </div>

        {/* Section title */}
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 pt-1 flex items-center justify-between">
          <span>CHỤP ẢNH BEFORE MẮT MỘC (BẮT BUỘC)</span>
          {!isOnline && (
            <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1">💾 Tự động lưu offline</span>
          )}
        </div>

        {/* Camera Viewfinder Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-3">
          <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-4 overflow-hidden border border-neutral-800">
            <div className="w-16 h-16 rounded-full bg-[#FFB400]/20 flex items-center justify-center mb-3">
              <Eye className="w-10 h-10 text-[#FFB400]" />
            </div>
            <div className="text-white font-black text-[15px] text-center">Ảnh Before Mắt Mộc {customerName}</div>
            <div className="text-[#34C759] text-[12px] font-semibold mt-1">✓ Độ nét cao · Đủ ánh sáng</div>

            <div className="absolute bottom-3 left-3 bg-black/80 text-white text-[10.5px] font-mono px-2 py-0.5 rounded border border-neutral-700">
              10:38:15 AM · Salon Đề Thám · {bedLabel}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button className="flex-1 py-3 bg-[#E5E7EB] text-gray-800 font-bold text-[13px] rounded-xl text-center active:scale-98 transition-transform cursor-pointer">
              Chụp lại
            </button>
            <button className="flex-1 py-3 bg-[#DCFCE7] text-[#16A34A] font-black text-[13px] rounded-xl text-center flex items-center justify-center gap-1 active:scale-98 transition-transform cursor-pointer">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Đạt tiêu chuẩn</span>
            </button>
          </div>
        </div>

        {/* Bottom Big Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight"
          >
            LƯU ẢNH BEFORE & BẮT ĐẦU BẤM GIỜ
          </button>
        </div>
      </div>
    </div>
  );
}
