'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem } from '../../state/mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
} from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import { Camera, Image as ImageIcon, Zap, CheckCircle2, Award, Clock } from 'lucide-react';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => void;
}

export function Screen09LashProgressAfter({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
}: Screen09LashProgressAfterProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [autoSavedToast, setAutoSavedToast] = useState<string | null>(null);

  const bookingId = booking.id;
  const progressSeconds = booking.progress?.elapsedSeconds;

  // Lấy snapshot đã lưu (ảnh Before, thời gian timer)
  const cachedSnapshot = useMemo(() => {
    return getLocalProgressSnapshot(bookingId);
  }, [bookingId]);

  const [asyncSnapshot, setAsyncSnapshot] = useState<any>(null);

  useEffect(() => {
    void getLocalProgressSnapshotAsync(bookingId).then((data) => {
      if (data) setAsyncSnapshot(data);
    });
  }, [bookingId]);

  const beforePhotoUrl =
    cachedSnapshot?.beforePhotoUrl ||
    asyncSnapshot?.beforePhotoUrl ||
    booking.progress?.beforePhotoUrl ||
    '/assets/lash_before.jpg';
  const cleanedPhotoUrl =
    cachedSnapshot?.cleanedPhotoUrl ||
    asyncSnapshot?.cleanedPhotoUrl ||
    booking.progress?.cleanedPhotoUrl ||
    '/assets/lash_cleaned.jpg';

  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(() => {
    return cachedSnapshot?.afterPhotoUrl || booking.progress?.afterPhotoUrl || null;
  });

  useEffect(() => {
    if (!afterPhotoPreview && asyncSnapshot?.afterPhotoUrl) {
      setAfterPhotoPreview(asyncSnapshot.afterPhotoUrl);
    }
  }, [afterPhotoPreview, asyncSnapshot]);

  useEffect(() => {
    if (booking.progress?.afterPhotoUrl && booking.progress.afterPhotoUrl !== afterPhotoPreview) {
      setAfterPhotoPreview(booking.progress.afterPhotoUrl);
    }
  }, [booking.progress?.afterPhotoUrl, afterPhotoPreview]);

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
        impact: (
          <span>
            +5 Điểm Thăng Cấp (Đạt chuẩn <CvFeather2Badge />)
          </span>
        ),
        color: 'text-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    }
    if (diffMinutes <= 5) {
      return {
        rating: 'CHUẨN TIẾN ĐỘ (NORMAL)',
        title: 'Đúng khung giờ tư vấn',
        impact: <span>Duy trì chuẩn kỹ năng tay nghề</span>,
        color: 'text-blue-700',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    }
    return {
      rating: 'CHẬM TIẾN ĐỘ (SLOW)',
      title: `Trễ hơn cam kết +${diffMinutes} phút`,
      impact: (
        <span>
          Cần nâng cao tốc độ để xét thăng cấp <CvFeather2Badge />
        </span>
      ),
      color: 'text-amber-700',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }, [diffMinutes]);

  // Khởi tạo và đồng bộ step 10 vào local snapshot
  useEffect(() => {
    saveLocalProgressSnapshot(bookingId, {
      currentStep: 10,
    });
  }, [bookingId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const isRetake = Boolean(afterPhotoPreview);
        const compressed = await compressLashImage(file, 1024, 0.72);
        setAfterPhotoPreview(compressed);
        saveLocalProgressSnapshot(bookingId, {
          afterPhotoUrl: compressed,
          actualMinutes,
          targetMinutes,
          currentStep: 10,
          afterPhotoSavedAt: new Date().toISOString(),
        });
        // Tự động lưu tức thì lên state/server ngay khi chụp, ghi đè nếu chụp lại
        onAutoSavePhoto?.(compressed);
        setAutoSavedToast(isRetake ? 'Đã ghi đè ảnh After mới!' : 'Đã tự động lưu ảnh After!');
        setTimeout(() => setAutoSavedToast(null), 3500);
      } catch (err) {
        console.warn('[Screen09] Failed to compress image:', err);
      }
    }
    e.target.value = '';
  };

  const handleProceed = () => {
    const photoUrl = afterPhotoPreview || '/assets/lash_after.jpg';
    saveLocalProgressSnapshot(bookingId, {
      afterPhotoUrl: photoUrl,
      actualMinutes,
      targetMinutes,
      currentStep: 11,
      afterPhotoSavedAt: new Date().toISOString(),
    });
    onSavePhoto(photoUrl);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* 1. Header Navigation: Bỏ thông tin Giường và Online */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Giờ Phục Vụ" />

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
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Ảnh Vệ Sinh</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">3. Giờ Phục Vụ ({actualMinutes}p)</div>
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 pb-1.5 flex items-center justify-between">
          <span>4. Ảnh After Hoàn Thiện ✓</span>
          <span className="text-[11px] font-mono">Đạt tiêu chuẩn</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        {/* Section 1: Đối chiếu tiến trình 3 bước (3 hàng dọc riêng biệt theo yêu cầu) */}
        <div className="space-y-3.5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
            ĐỐI CHIẾU TIẾN TRÌNH 3 BƯỚC (BEFORE / VỆ SINH / AFTER)
          </div>

          {/* HÀNG 1: ẢNH BEFORE */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-[11px] font-black">
                  1
                </span>
                <span className="text-[13px] font-black text-black">1. ẢNH BEFORE · MẮT MỘC</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                Mắt mộc ban đầu
              </span>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-neutral-800 shadow-inner">
              {beforePhotoUrl && (beforePhotoUrl.startsWith('data:') || beforePhotoUrl.startsWith('http')) ? (
                <img src={beforePhotoUrl} alt="Before" className="w-full h-full object-cover" />
              ) : (
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <span className="text-white font-medium text-[12px]">Chưa có ảnh Before</span>
                </div>
              )}
            </div>
          </div>

          {/* HÀNG 2: ẢNH VỆ SINH */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[11px] font-black">
                  2
                </span>
                <span className="text-[13px] font-black text-black">2. ẢNH VỆ SINH · NHẮM MẮT</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Đã vệ sinh nhắm
              </span>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-neutral-800 shadow-inner">
              {cleanedPhotoUrl && (cleanedPhotoUrl.startsWith('data:') || cleanedPhotoUrl.startsWith('http')) ? (
                <img src={cleanedPhotoUrl} alt="Cleaned" className="w-full h-full object-cover" />
              ) : (
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <span className="text-white font-medium text-[12px]">Chưa có ảnh Vệ Sinh</span>
                </div>
              )}
            </div>
          </div>

          {/* HÀNG 3: ẢNH AFTER (HOÀN THIỆN) */}
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border-2 border-[#22C55E] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                  3
                </span>
                <span className="text-[13px] font-black text-emerald-800">3. ẢNH AFTER · HOÀN THIỆN</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                {autoSavedToast || (afterPhotoPreview ? '✓ Đã tự động lưu' : 'Chờ chụp ảnh')}
              </span>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-emerald-500/30 shadow-inner">
              {afterPhotoPreview && (afterPhotoPreview.startsWith('data:') || afterPhotoPreview.startsWith('http')) ? (
                <img src={afterPhotoPreview} alt="After" className="w-full h-full object-cover" />
              ) : (
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#22C55E] mb-1.5 flex items-center justify-center text-white font-black text-sm shadow-xs">
                    ✓
                  </div>
                  <span className="text-[#22C55E] font-bold text-[12px]">Chờ chụp ảnh After</span>
                </div>
              )}
              {afterPhotoPreview && (
                <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
                  <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.8 rounded flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{autoSavedToast || 'Đã tự động lưu · Chụp lại để ghi đè'}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Buttons to snap/upload real After photo */}
            <div className="grid grid-cols-2 gap-2 pt-1">
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
            className="w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[14.5px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight flex items-center justify-center gap-2"
          >
            {afterPhotoPreview ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>ĐÃ LƯU ẢNH AFTER · TIẾP TỤC KHẢO SÁT →</span>
              </>
            ) : (
              <span>CHUYỂN MÁY CHO KHÁCH KHẢO SÁT CẢM XÚC</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
