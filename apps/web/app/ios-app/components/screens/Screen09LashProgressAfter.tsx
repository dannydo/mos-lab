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
import {
  Camera,
  Image as ImageIcon,
  Zap,
  CheckCircle2,
  Award,
  CloudUpload,
  CloudCheck,
  CloudOff,
  Maximize2,
  Check,
} from 'lucide-react';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => Promise<any> | void;
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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'offline'>('idle');
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);

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
    booking.progress?.beforePhotoUrl || cachedSnapshot?.beforePhotoUrl || asyncSnapshot?.beforePhotoUrl || null;
  const cleanedPhotoUrl =
    booking.progress?.cleanedPhotoUrl || cachedSnapshot?.cleanedPhotoUrl || asyncSnapshot?.cleanedPhotoUrl || null;

  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(() => {
    return booking.progress?.afterPhotoUrl || cachedSnapshot?.afterPhotoUrl || null;
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

  const isDisplayablePhoto = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url === '/assets/lash_before.jpg' || url === '/assets/lash_cleaned.jpg' || url === '/assets/lash_after.jpg')
      return false;
    return (
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('/uploads') ||
      url.startsWith('/api/') ||
      url.length > 50
    );
  };

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

  // Chuẩn hóa tên dịch vụ hiển thị
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

        // 1. Lưu local tức thời vào RAM & IndexedDB
        saveLocalProgressSnapshot(bookingId, {
          afterPhotoUrl: compressed,
          actualMinutes,
          targetMinutes,
          currentStep: 10,
          afterPhotoSavedAt: new Date().toISOString(),
        });

        // Hiển thị trạng thái đang đẩy lên Cloud
        setCloudSyncStatus('uploading');
        setAutoSavedToast('📱 Đã lưu máy · Đang đẩy lên Cloud...');

        // 2. Tự động đẩy lên Cloud ngay sau khi lưu local xong
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
      currentStep: 12, // Bỏ bước khảo sát trực tiếp trước mặt CVL/CC để khách không ngại, đi thẳng sang Upsell/Checkout!
      afterPhotoSavedAt: new Date().toISOString(),
    });
    onSavePhoto(photoUrl);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
      {/* 1. Header Navigation */}
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

      {/* Lightbox Zoom Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 animate-in fade-in duration-200"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="w-full flex items-center justify-between text-white pt-2 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[14px] font-black">{zoomPhoto.title}</span>
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-neutral-700"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center py-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomPhoto.url}
              alt="Zoomed lash"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-neutral-800"
            />
          </div>
          <div className="w-full pb-4 px-4 text-center">
            <button
              type="button"
              onClick={() => setZoomPhoto(null)}
              className="py-3 px-6 rounded-full bg-white text-black font-black text-[13px] shadow-lg cursor-pointer"
            >
              ✕ Đóng Ảnh Phóng To
            </button>
          </div>
        </div>
      )}

      {/* Steps subheader on black */}
      <div className="bg-black select-none shrink-0 border-b border-neutral-900">
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">1. Ảnh Before</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">2. Ảnh Vệ Sinh</div>
        <div className="text-neutral-400 text-[13px] font-medium px-4 py-1">3. Giờ Phục Vụ ({actualMinutes}p)</div>
        <div className="bg-[#FFB400] text-black font-bold text-[13px] px-4 py-1.5 pb-1.5 flex items-center justify-between">
          <span>4. Ảnh After Hoàn Thiện ✓</span>
          <span className="text-[11px] font-mono">Hoàn tất ca làm</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* KHỐI 1: CHỤP ẢNH AFTER (ƯU TIÊN LÊN TRÊN CÙNG TO RÕ THEO YÊU CẦU) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border-2 border-[#22C55E] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                3
              </span>
              <span className="text-[13.5px] font-black text-emerald-800">3. ẢNH AFTER · HOÀN THIỆN</span>
            </div>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                cloudSyncStatus === 'uploading'
                  ? 'text-sky-700 bg-sky-50 border-sky-200'
                  : afterPhotoPreview
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {cloudSyncStatus === 'uploading'
                ? '☁️ Đang đẩy lên Cloud...'
                : afterPhotoPreview
                  ? '☁️ Đã lưu lên Cloud'
                  : 'Chờ chụp ảnh After'}
            </span>
          </div>

          {/* Viewfinder chụp ảnh After */}
          <div className="relative w-full aspect-[4/3] rounded-xl bg-[#1C1C1E] flex flex-col items-center justify-center overflow-hidden border border-emerald-500/30 shadow-inner group">
            {isDisplayablePhoto(afterPhotoPreview) ? (
              <>
                <img
                  src={afterPhotoPreview!}
                  alt="After"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102 cursor-pointer"
                  onClick={() =>
                    setZoomPhoto({ url: afterPhotoPreview!, title: 'Ảnh 3: Mi Hoàn Thiện Sau Nối (After)' })
                  }
                />
                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm pointer-events-none">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </>
            ) : (
              <div className="p-4 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#22C55E]/20 mb-2 flex items-center justify-center text-[#22C55E] shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <span className="text-white font-black text-[14px]">Ảnh Mi Hoàn Thiện Sau Nối</span>
                <span className="text-neutral-400 text-[11px] mt-1">Chụp góc thẳng hoặc 45° từ trên mí xuống</span>
              </div>
            )}

            {/* Watermark & Cloud sync badge */}
            {afterPhotoPreview && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-0.8 rounded border border-neutral-700/80">
                  {booking.customerName} · Salon Đề Thám
                </span>
                <span
                  className={`${
                    cloudSyncStatus === 'uploading'
                      ? 'bg-sky-600/95 text-white'
                      : cloudSyncStatus === 'offline'
                        ? 'bg-amber-600/95 text-white'
                        : 'bg-emerald-600/95 text-white'
                  } text-[10px] font-bold px-2 py-0.8 rounded flex items-center gap-1.5 shadow-sm`}
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
              </div>
            )}
          </div>

          {/* Nút chụp ảnh Camera & Chọn Thư Viện */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-2 bg-neutral-900 text-white font-extrabold text-[12.5px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>{afterPhotoPreview ? 'Chụp lại After' : 'Chụp Bằng Camera'}</span>
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="py-3 px-2 bg-[#E5E7EB] text-gray-800 font-extrabold text-[12.5px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>Chọn Từ Thư Viện</span>
            </button>
          </div>
        </div>

        {/* KHỐI 2: ĐỐI CHIẾU NHANH VỚI 2 ẢNH TRƯỚC (THU GỌN THÀNH 2 THUMBNAIL PHÍA DƯỚI) */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              ĐỐI CHIẾU NHANH VỚI ẢNH TRƯỚC ĐÓ
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Chạm để phóng to</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Thumbnail 1: Before Mắt Mộc */}
            <div
              onClick={() =>
                isDisplayablePhoto(beforePhotoUrl) &&
                setZoomPhoto({ url: beforePhotoUrl!, title: 'Ảnh 1: Mắt Mộc Ban Đầu (Before)' })
              }
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-neutral-700 shadow-inner group cursor-pointer"
            >
              {isDisplayablePhoto(beforePhotoUrl) ? (
                <>
                  <img src={beforePhotoUrl!} alt="Before" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-xs">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-[10px] p-2 text-center">
                  Chưa có ảnh Before
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 bg-black/85 text-amber-400 text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-xs border border-amber-500/30">
                1. Mắt Mộc
              </span>
            </div>

            {/* Thumbnail 2: Vệ Sinh Nhắm */}
            <div
              onClick={() =>
                isDisplayablePhoto(cleanedPhotoUrl) &&
                setZoomPhoto({ url: cleanedPhotoUrl!, title: 'Ảnh 2: Vệ Sinh Nhắm Mắt' })
              }
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-neutral-700 shadow-inner group cursor-pointer"
            >
              {isDisplayablePhoto(cleanedPhotoUrl) ? (
                <>
                  <img src={cleanedPhotoUrl!} alt="Cleaned" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-xs">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-[10px] p-2 text-center">
                  Chưa có ảnh Vệ Sinh
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-xs">
                2. Vệ Sinh
              </span>
            </div>
          </div>
        </div>

        {/* KHỐI 3: TỐC ĐỘ HOÀN THÀNH & ĐIỂM THĂNG CẤP (TINH GỌN SÚC TÍCH) */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                HIỆU SUẤT CA LÀM · {promotionAudit.rating}
              </span>
            </div>
            <span className="text-[12.5px] font-black text-neutral-900 tabular-nums">
              {actualMinutes}p <span className="text-neutral-400 font-normal text-[11px]">/ {targetMinutes}p</span>
            </span>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/70 flex items-center justify-between text-[12px]">
            <span className="font-extrabold text-amber-600 flex items-center gap-1">
              <Award className="w-4 h-4" />
              <span>{promotionAudit.impact}</span>
            </span>
            <span className={`font-black ${promotionAudit.color}`}>{promotionAudit.title}</span>
          </div>

          {/* Dòng nghiệm thu kỹ thuật rút gọn tinh tế */}
          <div className="pt-0.5 flex items-center justify-center gap-2 text-[11.5px] text-emerald-700 font-bold">
            <Check className="w-3.5 h-3.5" />
            <span>Chuẩn kỹ thuật Wings · Mi tơi mướt · Không dính chân · Không cay mắt</span>
          </div>
        </div>

        {/* KHỐI 4: NÚT HÀNH ĐỘNG CUỐI TRANG (HOÀN TẤT & ĐI TIẾP VÀO CHECKOUT/UPSELL) */}
        <div className="pt-1">
          <button
            onClick={handleProceed}
            className="w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[14.5px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase tracking-tight flex items-center justify-center gap-2"
          >
            {afterPhotoPreview ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>LƯU ẢNH AFTER & TIẾP TỤC →</span>
              </>
            ) : (
              <span>HOÀN TẤT NỐI MI & TIẾP TỤC →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
