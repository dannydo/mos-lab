'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import { saveLocalProgressSnapshot, getLocalProgressSnapshot } from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { Camera, Image as ImageIcon, Zap, CheckCircle2, Award, Clock } from 'lucide-react';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
}

export function Screen09LashProgressAfter({ booking, onBack, onSavePhoto }: Screen09LashProgressAfterProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const bookingId = booking.id;
  const progressSeconds = booking.progress?.elapsedSeconds;

  // Lấy snapshot đã lưu (ảnh Before, thời gian timer)
  const cachedSnapshot = useMemo(() => {
    return getLocalProgressSnapshot(bookingId);
  }, [bookingId]);

  const beforePhotoUrl =
    cachedSnapshot?.beforePhotoUrl || booking.progress?.beforePhotoUrl || '/assets/lash_before.jpg';

  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(() => {
    return cachedSnapshot?.afterPhotoUrl || booking.progress?.afterPhotoUrl || null;
  });

  // Tính toán thời gian thực hiện thực tế từ timer
  const actualMinutes = useMemo(() => {
    if (cachedSnapshot && typeof cachedSnapshot.elapsedSeconds === 'number' && cachedSnapshot.elapsedSeconds > 0) {
      return Math.max(1, Math.round(cachedSnapshot.elapsedSeconds / 60));
    }
    if (progressSeconds) {
      return Math.max(1, Math.round(progressSeconds / 60));
    }
    return 68; // Realistic default
  }, [cachedSnapshot, progressSeconds]);

  // Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn Any - Lashes
  const displayServiceName = resolveDisplayServiceName(booking);

  // Thời gian cam kết / định mức
  const targetMinutes = useMemo(() => {
    if (booking.serviceDuration && booking.serviceDuration > 0) return booking.serviceDuration;
    let base = 65;
    const sName = (displayServiceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) base = 50;
    if (booking.attributes?.hasUnderMink || sName.includes('mi dưới')) base += 25;
    return base;
  }, [booking, displayServiceName]);

  const diffMinutes = actualMinutes - targetMinutes;

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setAfterPhotoPreview(result);
          saveLocalProgressSnapshot(bookingId, {
            ...cachedSnapshot,
            afterPhotoUrl: result,
            actualMinutes,
            targetMinutes,
            afterPhotoSavedAt: new Date().toISOString(),
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleProceed = () => {
    const photoUrl = afterPhotoPreview || '/assets/lash_after.jpg';
    saveLocalProgressSnapshot(bookingId, {
      ...cachedSnapshot,
      afterPhotoUrl: photoUrl,
      actualMinutes,
      targetMinutes,
      afterPhotoSavedAt: new Date().toISOString(),
    });
    onSavePhoto(photoUrl);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* 1. Header Navigation: Bỏ thông tin Giường và Online */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Bấm Giờ" />

      {/* Hidden file inputs for iPhone Camera and Photo Library */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Steps subheader on black */}
      <div className="bg-black select-none shrink-0 border-b border-neutral-900">
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">1. Ảnh Before</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Bấm Giờ ({actualMinutes}p)</div>
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 pb-1.5 flex items-center justify-between">
          <span>3. Ảnh After Hoàn Thiện ✓</span>
          <span className="text-[11px] font-mono">Đạt tiêu chuẩn</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Section 1: Comparison with Real Photo Previews */}
        <div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">
            SO SÁNH ĐỐI CHIẾU BEFORE / AFTER
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Before Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-neutral-100 flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
                {beforePhotoUrl ? (
                  <img src={beforePhotoUrl} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-[#FFB400] mb-1.5 flex items-center justify-center text-black font-black text-xs shadow-xs mx-auto">
                      ●
                    </div>
                    <span className="text-white font-medium text-[11px] leading-tight">Mắt Mộc</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider mt-2">BEFORE</span>
            </div>

            {/* After Box */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border-2 border-[#22C55E] flex flex-col items-center">
              <div className="w-full aspect-[4/5] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-emerald-500/30">
                {afterPhotoPreview ? (
                  <img src={afterPhotoPreview} alt="After" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-[#22C55E] mb-1.5 flex items-center justify-center text-white font-black text-xs shadow-xs mx-auto">
                      ✓
                    </div>
                    <span className="text-[#22C55E] font-bold text-[11.5px] leading-tight">{displayServiceName}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-black text-[#22C55E] uppercase tracking-wider mt-2">
                AFTER (ĐẠT CHUẨN)
              </span>
            </div>
          </div>

          {/* Buttons to snap/upload real After photo */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-2 bg-neutral-900 text-white font-bold text-[12px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>{afterPhotoPreview ? 'Chụp lại After' : 'Chụp After Camera'}</span>
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="py-2.5 px-2 bg-[#E5E7EB] text-gray-800 font-bold text-[12px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Chọn Từ Thư Viện</span>
            </button>
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
