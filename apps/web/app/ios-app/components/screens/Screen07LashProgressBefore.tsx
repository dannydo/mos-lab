'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { BookingItem } from '../../state/mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
} from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import { Eye, Camera, Image as ImageIcon, RotateCw, CheckCircle2 } from 'lucide-react';

interface Screen07LashProgressBeforeProps {
  booking?: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => void;
}

export function Screen07LashProgressBefore({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
}: Screen07LashProgressBeforeProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [autoSavedToast, setAutoSavedToast] = useState<string | null>(null);

  // Khôi phục ảnh đã chụp/lưu trước đó nếu có
  const bookingId = booking?.id;
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    if (!bookingId) return null;
    const cached = getLocalProgressSnapshot(bookingId);
    return booking?.progress?.beforePhotoUrl || cached?.beforePhotoUrl || null;
  });

  // Tự động khôi phục ảnh từ IndexedDB và đồng bộ currentStep = 7
  useEffect(() => {
    if (!bookingId) return;
    saveLocalProgressSnapshot(bookingId, { currentStep: 7 });
    if (!photoPreview) {
      void getLocalProgressSnapshotAsync(bookingId).then((cached) => {
        if (cached?.beforePhotoUrl) {
          setPhotoPreview(cached.beforePhotoUrl);
        }
      });
    }
  }, [bookingId, photoPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const isRetake = Boolean(photoPreview);
        // Nén ảnh canvas theo chuẩn iOS native toJpegData (tối đa 1024px, giảm từ 5MB -> ~60KB)
        const compressed = await compressLashImage(file, 1024, 0.72);
        setPhotoPreview(compressed);
        if (bookingId) {
          saveLocalProgressSnapshot(bookingId, {
            beforePhotoUrl: compressed,
            beforePhotoSavedAt: new Date().toISOString(),
            bookingId,
            currentStep: 7,
          });
        }
        // Tự động lưu tức thì lên state/server ngay khi chụp, ghi đè nếu chụp lại
        onAutoSavePhoto?.(compressed);
        setAutoSavedToast(isRetake ? 'Đã ghi đè ảnh Before mới!' : 'Đã tự động lưu ảnh Before!');
        setTimeout(() => setAutoSavedToast(null), 3500);
      } catch (err) {
        console.warn('[Screen07] Failed to compress image:', err);
      }
    }
    e.target.value = '';
  };

  const handleSave = () => {
    const finalPhoto = photoPreview || '/assets/lash_before.jpg';
    if (bookingId) {
      saveLocalProgressSnapshot(bookingId, {
        beforePhotoUrl: finalPhoto,
        beforePhotoSavedAt: new Date().toISOString(),
        bookingId,
        currentStep: 8,
      });
    }
    onSavePhoto(finalPhoto);
  };

  const customerName = booking?.customerName || 'Chị Quyên';
  // Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn Any - Lashes
  const displayServiceName = resolveDisplayServiceName(booking);
  const lashSpecDetail = useMemo(() => {
    const parts: string[] = [];
    if (booking?.attributes?.style) parts.push(`Dáng ${booking.attributes.style}`);
    if (booking?.attributes?.curl) parts.push(`Cong ${booking.attributes.curl}`);
    if (booking?.attributes?.length) parts.push(`Dài ${booking.attributes.length}`);
    if (booking?.attributes?.thickness) parts.push(`${booking.attributes.thickness}`);
    return parts.length > 0 ? parts.join(' · ') : '';
  }, [booking]);

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* 1. Header Navigation: Bỏ hoàn toàn thông tin Giường và Online theo yêu cầu */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Ca Làm" />

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

      {/* 2. Steps Subheader (Black Bar) */}
      <div className="bg-black select-none shrink-0 border-b border-neutral-900">
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 flex items-center justify-between">
          <span>1. Ảnh Before Mắt Mộc ✓</span>
          <span className="text-[11px] font-mono">Bắt buộc</span>
        </div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Ảnh Vệ Sinh Nhắm</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">3. Giờ Phục Vụ (Tự động)</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1 pb-1.5">4. Ảnh After Hoàn Thiện</div>
      </div>

      <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto pb-6">
        {/* 3. Header Card: Bỏ thông tin Giường */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-extrabold text-black">{customerName}</div>
            <div className="text-[12px] text-gray-500 mt-0.5 font-medium">
              {displayServiceName}
              {lashSpecDetail ? ` (${lashSpecDetail})` : ''}
            </div>
          </div>
          <span className="bg-[#22C55E] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
            Đang phục vụ
          </span>
        </div>

        {/* Section title */}
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 pt-0.5">
          CHỤP ẢNH BEFORE MẮT MỘC (BẮT BUỘC)
        </div>

        {/* 4. Camera Viewfinder Card with Real Capture & Photo Upload */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-3.5">
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-neutral-800 shadow-inner group">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Before photo preview"
                className="w-full h-full object-cover animate-in fade-in duration-200"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#FFB400]/20 flex items-center justify-center mb-3 shadow-xs">
                  <Eye className="w-9 h-9 text-[#FFB400]" />
                </div>
                <div className="text-white font-black text-[15px]">Ảnh Before Mắt Mộc {customerName}</div>
                <div className="text-neutral-400 text-[12px] mt-1">Chụp góc thẳng hoặc 45° từ trên mí xuống</div>
              </div>
            )}

            {/* Watermark overlay & Auto-save status */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-0.8 rounded border border-neutral-700/80">
                10:38:15 AM · Salon Đề Thám
              </span>
              {photoPreview && (
                <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.8 rounded flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{autoSavedToast || 'Đã tự động lưu · Chụp lại để ghi đè'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons to Trigger iPhone Camera or Photo Library */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-3 bg-neutral-900 text-white hover:bg-black font-extrabold text-[13px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>{photoPreview ? 'Chụp lại Camera' : 'Chụp Bằng Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="py-3 px-3 bg-[#E5E7EB] hover:bg-neutral-300 text-gray-800 font-extrabold text-[13px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>Chọn Từ Thư Viện</span>
            </button>
          </div>
        </div>

        {/* 5. Big CTA Button */}
        <div className="pt-1">
          <button
            onClick={handleSave}
            className="w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight flex items-center justify-center gap-2"
          >
            <span>{photoPreview ? 'TIẾP TỤC SANG ẢNH VỆ SINH →' : 'TIẾP TỤC →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
