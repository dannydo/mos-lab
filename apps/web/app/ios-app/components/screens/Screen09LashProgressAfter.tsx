'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { saveLocalProgressSnapshot, getLocalProgressSnapshot } from '../../state/offlineSync';
import { Wifi, WifiOff, Zap, CheckCircle2, Award, Clock } from 'lucide-react';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
}

export function Screen09LashProgressAfter({ booking, onBack, onSavePhoto }: Screen09LashProgressAfterProps) {
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

  // Tính toán thời gian thực hiện thực tế từ timer
  const bookingId = booking.id;
  const progressSeconds = booking.progress?.elapsedSeconds;
  const actualMinutes = useMemo(() => {
    const cached = getLocalProgressSnapshot(bookingId);
    if (cached && typeof cached.elapsedSeconds === 'number' && cached.elapsedSeconds > 0) {
      return Math.max(1, Math.round(cached.elapsedSeconds / 60));
    }
    if (progressSeconds) {
      return Math.max(1, Math.round(progressSeconds / 60));
    }
    return 68; // Mocked realistic default (68 phút)
  }, [bookingId, progressSeconds]);

  // Thời gian cam kết / định mức
  const targetMinutes = useMemo(() => {
    if (booking.serviceDuration && booking.serviceDuration > 0) return booking.serviceDuration;
    let base = 65;
    const sName = (booking.serviceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) base = 50;
    if (booking.attributes?.hasUnderMink || sName.includes('mi dưới')) base += 25;
    return base;
  }, [booking]);

  const diffMinutes = actualMinutes - targetMinutes;
  const isFast = diffMinutes <= 0;

  // Đánh giá thăng cấp
  const promotionAudit = useMemo(() => {
    if (diffMinutes <= -5) {
      return {
        rating: 'XUẤT SẮC (FAST)',
        title: `Nhanh hơn cam kết ${Math.abs(diffMinutes)} phút`,
        impact: '+5 Điểm Thăng Cấp (Đạt chuẩn CV🪶)',
        color: 'text-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    }
    if (diffMinutes <= 5) {
      return {
        rating: 'CHUẨN TIẾN ĐỘ (NORMAL)',
        title: 'Đúng khung giờ tư vấn',
        impact: 'Duy trì chuẩn kỹ năng tay nghề',
        color: 'text-blue-700',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    }
    return {
      rating: 'CHẬM TIẾN ĐỘ (SLOW)',
      title: `Trễ hơn cam kết +${diffMinutes} phút`,
      impact: 'Cần nâng cao tốc độ để xét thăng cấp 🪶CV🪶',
      color: 'text-amber-700',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }, [diffMinutes]);

  const handleProceed = () => {
    const photoUrl = '/assets/lash_after.jpg';
    if (booking?.id) {
      saveLocalProgressSnapshot(booking.id, {
        afterPhotoUrl: photoUrl,
        actualMinutes,
        targetMinutes,
        afterPhotoSavedAt: new Date().toISOString(),
      });
    }
    onSavePhoto(photoUrl);
  };

  const bedLabel = booking.assignedBed || 'G03';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      <IosNavigationBar
        title="Tiến Trình Nối Mi"
        onBack={onBack}
        backTitle="Bấm Giờ"
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
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">1. Ảnh Before</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Bấm Giờ ({actualMinutes}p)</div>
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 pb-1.5 flex items-center justify-between">
          <span>3. Ảnh After Hoàn Thiện ✓</span>
          <span className="text-[11px] font-mono">Đạt tiêu chuẩn</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Section 1: Comparison */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">
            SO SÁNH ĐỐI CHIẾU BEFORE / AFTER
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Before Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-neutral-100 flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-3 text-center border border-neutral-800">
                <div className="w-10 h-10 rounded-full bg-[#FFB400] mb-2 flex items-center justify-center text-black font-black text-xs shadow-xs">
                  ●
                </div>
                <span className="text-white font-medium text-[12px] leading-tight">Mắt Mộc Trước Nối</span>
              </div>
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider mt-2">BEFORE</span>
            </div>

            {/* After Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border-2 border-[#22C55E] flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center p-3 text-center border border-emerald-500/30">
                <div className="w-10 h-10 rounded-full bg-[#22C55E] mb-2 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  ✓
                </div>
                <span className="text-[#22C55E] font-bold text-[12px] leading-tight">
                  {booking.serviceName || 'Hoàn Thiện'}
                </span>
              </div>
              <span className="text-[11px] font-black text-[#22C55E] uppercase tracking-wider mt-2">
                AFTER (ĐẠT CHUẨN)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Speed Audit & Career Promotion Impact */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              ĐÁNH GIÁ TỐC ĐỘ & ĐIỀU KIỆN THĂNG CẤP
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${promotionAudit.badgeBg}`}>
              {promotionAudit.rating}
            </span>
          </div>

          <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-neutral-500 font-medium">Thời gian thực tế:</span>
              <span className="font-extrabold text-neutral-900 tabular-nums">
                {actualMinutes} phút <span className="text-neutral-400 font-normal">/ định mức {targetMinutes}p</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-neutral-500 font-medium">Đánh giá tiến độ:</span>
              <span className={`font-black ${promotionAudit.color} flex items-center gap-1`}>
                <Zap className="w-3.5 h-3.5" />
                <span>{promotionAudit.title}</span>
              </span>
            </div>
            <div className="pt-1 border-t border-neutral-200/80 flex items-center justify-between text-[11.5px]">
              <span className="text-neutral-500">Tác động thăng cấp CV:</span>
              <span className="font-bold text-amber-600 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>{promotionAudit.impact}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Technical Acceptance */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-1.5">
            NGHIỆM THU KỸ THUẬT
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden divide-y divide-gray-100">
            <div className="p-3 flex items-center justify-between text-[12.5px]">
              <span className="text-black font-medium">✓ Chải mi tơi mướt, không dính chân mi</span>
              <span className="text-[#22C55E] font-extrabold">Đạt</span>
            </div>
            <div className="p-3 flex items-center justify-between text-[12.5px]">
              <span className="text-black font-medium">✓ Không đỏ mắt, không cay mắt</span>
              <span className="text-[#22C55E] font-extrabold">Đạt</span>
            </div>
            <div className="p-3 flex items-center justify-between text-[12.5px]">
              <span className="text-black font-medium">✓ Khách soi gương và ưng ý form mi</span>
              <span className="text-[#22C55E] font-extrabold">Đạt</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={handleProceed}
            className="w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[14.5px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight"
          >
            CHUYỂN MÁY CHO KHÁCH KHẢO SÁT CẢM XÚC
          </button>
        </div>
      </div>
    </div>
  );
}
