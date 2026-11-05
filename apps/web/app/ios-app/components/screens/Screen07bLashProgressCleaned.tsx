'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { LashServicingStepper } from '../ui-kit/LashServicingStepper';
import { BookingItem } from '../../state/mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
} from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import {
  EyeOff,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  CloudUpload,
  CloudCheck,
  CloudOff,
} from 'lucide-react';

interface Screen07bLashProgressCleanedProps {
  booking?: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => Promise<any> | void;
}

export function Screen07bLashProgressCleaned({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
}: Screen07bLashProgressCleanedProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [autoSavedToast, setAutoSavedToast] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'offline'>('idle');

  // Khôi phục ảnh đã chụp/lưu trước đó nếu có
  const bookingId = booking?.id;
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    if (!bookingId) return null;
    const cached = getLocalProgressSnapshot(bookingId);
    return booking?.progress?.cleanedPhotoUrl || cached?.cleanedPhotoUrl || null;
  });

  // Tự động khôi phục ảnh từ IndexedDB và đồng bộ currentStep = 8
  useEffect(() => {
    if (!bookingId) return;
    saveLocalProgressSnapshot(bookingId, { currentStep: 8 });
    if (!photoPreview) {
      void getLocalProgressSnapshotAsync(bookingId).then((cached) => {
        if (cached?.cleanedPhotoUrl) {
          setPhotoPreview(cached.cleanedPhotoUrl);
        }
      });
    }
  }, [bookingId, photoPreview]);

  // Đồng bộ đa thiết bị tức thì khi server cập nhật ảnh Vệ sinh mới
  useEffect(() => {
    if (booking?.progress?.cleanedPhotoUrl && booking.progress.cleanedPhotoUrl !== photoPreview) {
      setPhotoPreview(booking.progress.cleanedPhotoUrl);
    }
  }, [booking?.progress?.cleanedPhotoUrl, photoPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const isRetake = Boolean(photoPreview);
        const compressed = await compressLashImage(file, 1024, 0.72);
        setPhotoPreview(compressed);
        if (bookingId) {
          saveLocalProgressSnapshot(bookingId, {
            cleanedPhotoUrl: compressed,
            cleanedPhotoSavedAt: new Date().toISOString(),
            bookingId,
            currentStep: 8,
          });
        }
        // Hiển thị lưu local tức thì và bắt đầu đẩy lên Cloud
        setCloudSyncStatus('uploading');
        setAutoSavedToast('📱 Đã lưu máy · Đang đẩy lên Cloud...');

        // Tự động đẩy lên Cloud ngay sau khi lưu local xong
        if (onAutoSavePhoto) {
          const res = await onAutoSavePhoto(compressed);
          if (res && res.success) {
            setCloudSyncStatus('synced');
            setAutoSavedToast(isRetake ? '✓ Đã ghi đè & lưu lên Cloud!' : '✓ Đã tự động lưu lên Cloud!');
          } else {
            setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
            setAutoSavedToast(
              navigator.onLine ? '✓ Đã tự động lưu ảnh!' : '📱 Đã lưu máy · Sẽ đẩy lên Cloud khi có mạng'
            );
          }
        }
        setTimeout(() => setAutoSavedToast(null), 4000);
      } catch (err) {
        console.warn('[Screen07b] Failed to compress image:', err);
      }
    }
    e.target.value = '';
  };

  const handleSave = () => {
    const finalPhoto = photoPreview || '/assets/lash_cleaned.jpg';
    if (bookingId) {
      saveLocalProgressSnapshot(bookingId, {
        cleanedPhotoUrl: finalPhoto,
        cleanedPhotoSavedAt: new Date().toISOString(),
        bookingId,
        currentStep: 9,
      });
    }
    onSavePhoto(finalPhoto);
  };

  const customerName = booking?.customerName || 'Chị Quyên';
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
      {/* 1. Header Navigation */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Ảnh Before" />

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

      {/* 2. Steps Subheader (Gom thành 1 thanh ngang Segmented Stepper chuẩn iOS) */}
      <LashServicingStepper activeStep={2} />

      <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto pb-6">
        {/* 3. Customer Info Header Card */}
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
          CHỤP ẢNH VỆ SINH NHẮM (BẮT BUỘC)
        </div>

        {/* 4. Camera Viewfinder Card with Real Capture & Photo Upload */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-3">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] flex flex-col items-center justify-center border border-neutral-800 shadow-inner group">
            {photoPreview ? (
              <img src={photoPreview} alt="Lash Cleaned Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 mb-3 shadow-md">
                  <EyeOff className="w-8 h-8" />
                </div>
                <div className="text-white font-extrabold text-[15px] mb-1">
                  Ảnh Vệ Sinh & Dán Gel Pad {customerName}
                </div>
                <div className="text-neutral-400 text-[12px] max-w-[280px] leading-relaxed">
                  Chụp mắt khách đã nhắm kín, vệ sinh mi sạch và dán gel pad / băng keo chuẩn bị nối
                </div>
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  <span>Đồng hồ tự động tính giờ từ lúc nhận ca</span>
                </div>
              </div>
            )}

            {/* Bottom Tag overlay & Cloud Sync status */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <span className="bg-black/75 backdrop-blur-md text-[10.5px] font-mono text-neutral-300 px-2.5 py-1 rounded-md border border-white/10">
                10:38:15 AM · Salon Đề Thám
              </span>
              {photoPreview && (
                <span
                  className={`${
                    cloudSyncStatus === 'uploading'
                      ? 'bg-sky-600/95 text-white'
                      : cloudSyncStatus === 'offline'
                        ? 'bg-amber-600/95 text-white'
                        : 'bg-emerald-600/95 text-white'
                  } backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm`}
                >
                  {cloudSyncStatus === 'uploading' ? (
                    <>
                      <CloudUpload className="w-3 h-3 animate-pulse" />
                      <span>{autoSavedToast || 'Đang đẩy lên Cloud...'}</span>
                    </>
                  ) : cloudSyncStatus === 'offline' ? (
                    <>
                      <CloudOff className="w-3 h-3" />
                      <span>{autoSavedToast || 'Đã lưu máy · Chờ mạng'}</span>
                    </>
                  ) : (
                    <>
                      <CloudCheck className="w-3 h-3" />
                      <span>{autoSavedToast || '☁️ Đã lưu lên Cloud'}</span>
                    </>
                  )}
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
            <span>{photoPreview ? 'BẮT ĐẦU NỐI MI & BẤM GIỜ →' : 'TIẾP TỤC →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
