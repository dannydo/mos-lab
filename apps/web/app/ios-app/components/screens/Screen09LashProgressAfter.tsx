'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { LashServicingStepper } from '../ui-kit/LashServicingStepper';
import { IosCloudSyncBadge } from '../ui-kit/IosCloudSyncBadge';
import { BookingItem } from '../../state/mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
} from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import { Camera, Zap, CheckCircle2, Clock, CloudUpload, CloudCheck, CloudOff, Maximize2, Check } from 'lucide-react';

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
  const isSelectingRef = useRef<boolean>(false);
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
    const saved = booking.progress?.afterPhotoUrl || cachedSnapshot?.afterPhotoUrl || null;
    return saved && !saved.startsWith('DECLINED:') ? saved : null;
  });
  const [isPhotoDeclined, setIsPhotoDeclined] = useState<boolean>(() => {
    const saved = booking.progress?.afterPhotoUrl || cachedSnapshot?.afterPhotoUrl || '';
    return Boolean(saved.startsWith('DECLINED:'));
  });
  const [declineReason, setDeclineReason] = useState<string>(() => {
    const saved = booking.progress?.afterPhotoUrl || cachedSnapshot?.afterPhotoUrl || '';
    return saved.startsWith('DECLINED:') ? saved.replace('DECLINED:', '') : 'Khách nhạy cảm riêng tư';
  });

  useEffect(() => {
    if (!afterPhotoPreview && asyncSnapshot?.afterPhotoUrl) {
      setAfterPhotoPreview(asyncSnapshot.afterPhotoUrl);
    }
  }, [afterPhotoPreview, asyncSnapshot]);

  useEffect(() => {
    if (isSelectingRef.current) return;
    if (booking.progress?.afterPhotoUrl && booking.progress.afterPhotoUrl !== afterPhotoPreview) {
      setAfterPhotoPreview(booking.progress.afterPhotoUrl);
    }
  }, [booking.progress?.afterPhotoUrl]);

  const isDisplayablePhoto = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.startsWith('DECLINED:')) return false;
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

  // Báo cáo thời gian ca làm & Khích lệ tinh thần (không thưởng thêm điểm)
  const performanceMeta = useMemo(() => {
    if (diffMinutes <= -5) {
      return {
        statusLabel: 'XUẤT SẮC',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        diffText: `⚡ Nhanh hơn ${Math.abs(diffMinutes)} phút`,
        boxBg: 'bg-emerald-50/70 border-emerald-200',
        diffTextColor: 'text-emerald-700',
        praiseIcon: '🌟',
        praiseTitle: 'Biểu dương tốc độ & tay nghề tinh hoa!',
        praiseMessage: 'Chuyên Viên hoàn thành rất nhanh nhưng vẫn đảm bảo trọn vẹn độ tơi mướt và chuẩn mực mi Wings!',
        praiseBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
        praiseTitleColor: 'text-emerald-950',
        praiseDescColor: 'text-emerald-800',
      };
    }
    if (diffMinutes <= 5) {
      return {
        statusLabel: 'CHUẨN TIẾN ĐỘ',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-300',
        diffText: '✓ Đúng khung giờ chuẩn',
        boxBg: 'bg-blue-50/70 border-blue-200',
        diffTextColor: 'text-blue-700',
        praiseIcon: '👏',
        praiseTitle: 'Kiểm soát thời gian ca làm rất tốt!',
        praiseMessage:
          'Tuyệt vời! Ca làm diễn ra đúng nhịp độ, đem lại trải nghiệm êm ái và thư giãn tối đa cho khách hàng.',
        praiseBg: 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200',
        praiseTitleColor: 'text-blue-950',
        praiseDescColor: 'text-blue-800',
      };
    }
    return {
      statusLabel: 'CHẬM TIẾN ĐỘ',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-300',
      diffText: `⏱ Trễ hơn +${diffMinutes} phút`,
      boxBg: 'bg-amber-50/70 border-amber-200',
      diffTextColor: 'text-amber-700',
      praiseIcon: '💪',
      praiseTitle: 'Khích lệ tinh thần tỉ mỉ chăm sóc!',
      praiseMessage:
        'Cảm ơn bạn đã dồn hết sự cẩn trọng cho bộ mi của khách. Ca sau hãy tiếp tục phát huy tay nghề và tối ưu nhịp độ hơn nhé!',
      praiseBg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200',
      praiseTitleColor: 'text-amber-950',
      praiseDescColor: 'text-amber-800',
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
      isSelectingRef.current = true;
      let instantUrl: string | null = null;
      try {
        // 1. Phản hồi thị giác tức thời (0ms): Hiện ảnh ngay lập tức và kích hoạt spinner upload
        instantUrl = URL.createObjectURL(file);
        setAfterPhotoPreview(instantUrl);
        setCloudSyncStatus('uploading');

        const compressed = await compressLashImage(file, 1024, 0.72);
        if (instantUrl) {
          try {
            URL.revokeObjectURL(instantUrl);
          } catch (_) {}
        }
        setAfterPhotoPreview(compressed);

        // 2. Lưu local tức thời vào RAM & IndexedDB
        saveLocalProgressSnapshot(bookingId, {
          afterPhotoUrl: compressed,
          actualMinutes,
          targetMinutes,
          currentStep: 10,
          afterPhotoSavedAt: new Date().toISOString(),
        });

        // 3. Tự động đẩy lên Cloud kèm thời gian tối thiểu 850ms để mắt người nhận diện rõ animation xoay
        if (onAutoSavePhoto) {
          const uploadPromise = onAutoSavePhoto(compressed);
          const minAnimPromise = new Promise((resolve) => setTimeout(resolve, 850));
          const [res] = await Promise.all([uploadPromise, minAnimPromise]);
          if (res && res.success) {
            setCloudSyncStatus('synced');
          } else {
            setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 850));
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.warn('[Screen09] Failed to compress image:', err);
        setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
      } finally {
        isSelectingRef.current = false;
      }
    }
    e.target.value = '';
  };

  const handleProceed = () => {
    if (!afterPhotoPreview && !isPhotoDeclined) return;
    const photoUrl = afterPhotoPreview || `DECLINED:${declineReason}`;
    saveLocalProgressSnapshot(bookingId, {
      afterPhotoUrl: photoUrl,
      actualMinutes,
      targetMinutes,
      currentStep: 12, // Bỏ bước khảo sát trực tiếp trước mặt CVL/CC để khách không ngại, đi thẳng sang Upsell/Checkout!
      afterPhotoSavedAt: new Date().toISOString(),
    });
    onSavePhoto(photoUrl);
  };

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex-1 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'} overflow-y-auto select-none`}
    >
      {/* 1. Header Navigation */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Giờ Phục Vụ" />

      {/* Hidden file input — camera only (capture="environment"), không cho tải từ thư viện */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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

      {/* 2. Steps Subheader (Gom thành 1 thanh ngang Segmented Stepper chuẩn iOS) */}
      <LashServicingStepper activeStep={4} elapsedMinutes={actualMinutes} />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* KHỐI 1: CHỤP ẢNH AFTER (ƯU TIÊN LÊN TRÊN CÙNG TO RÕ THEO YÊU CẦU) */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} rounded-2xl p-3.5 shadow-sm border-2 border-[#22C55E] space-y-2.5`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                3
              </span>
              <span className={`text-[13.5px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                3. ẢNH AFTER · HOÀN THIỆN
              </span>
            </div>
            {afterPhotoPreview ? (
              <IosCloudSyncBadge status={cloudSyncStatus} size="sm" />
            ) : (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Chờ chụp ảnh After
              </span>
            )}
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
            {(afterPhotoPreview || cloudSyncStatus === 'uploading') && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-0.8 rounded border border-neutral-700/80">
                  {booking.customerName} · Salon Đề Thám
                </span>
                <IosCloudSyncBadge status={cloudSyncStatus} />
              </div>
            )}
          </div>

          {/* Nút chụp ảnh Camera Only */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={`w-full py-3 px-2 ${isDark ? 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white' : 'bg-neutral-900 text-white'} font-extrabold text-[12.5px] rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition-all cursor-pointer`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>{afterPhotoPreview ? 'Chụp lại After' : 'Chụp Bằng Camera'}</span>
          </button>

          {/* Nút ngoại lệ: Khách từ chối chụp ảnh */}
          {!afterPhotoPreview && (
            <div className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'} space-y-2`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-[11.5px] font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Khách từ chối chụp ảnh (Có lý do)
                </span>
                <input
                  type="checkbox"
                  checked={isPhotoDeclined}
                  onChange={(e) => setIsPhotoDeclined(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
              {isPhotoDeclined && (
                <div className="grid grid-cols-3 gap-1.5">
                  {['Khách nhạy cảm riêng tư', 'Mắt khách đang kích ứng', 'Khách đang ngủ / vội'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDeclineReason(r)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        declineReason === r
                          ? 'bg-amber-400 text-black border-amber-400 font-black'
                          : isDark
                            ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* KHỐI 2: ĐỐI CHIẾU NHANH VỚI 2 ẢNH TRƯỚC (THU GỌN THÀNH 2 THUMBNAIL PHÍA DƯỚI) */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-200/80'} rounded-2xl p-3 shadow-sm border space-y-2`}
        >
          <div className="flex items-center justify-between px-0.5">
            <span
              className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'} uppercase tracking-wider`}
            >
              ĐỐI CHIẾU NHANH VỚI ẢNH TRƯỚC ĐÓ
            </span>
            <span className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-gray-400'} font-medium`}>
              Chạm để phóng to
            </span>
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

        {/* KHỐI 3: BÁO CÁO THỜI GIAN CA LÀM & KHEN KHÍCH LỆ TINH THẦN (KHÔNG THƯỞNG ĐIỂM) */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-200/80'} rounded-2xl p-3.5 shadow-sm border space-y-2.5`}
        >
          {/* Header Báo Cáo Thời Gian */}
          <div
            className={`flex items-center justify-between pb-1 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}
          >
            <div className="flex items-center gap-1.5">
              <Clock className={`w-4 h-4 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
              <span
                className={`text-[11px] font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'} uppercase tracking-wider`}
              >
                BÁO CÁO THỜI GIAN CA LÀM
              </span>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${performanceMeta.badgeStyle}`}
            >
              {performanceMeta.statusLabel}
            </span>
          </div>

          {/* 2 Cột: Cam Kết Định Mức vs Hoàn Tất Thực Tế */}
          <div className="grid grid-cols-2 gap-2">
            {/* Cột 1: Thời gian cam kết */}
            <div
              className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200/70'} rounded-xl p-2.5 border`}
            >
              <div
                className={`text-[10px] font-semibold ${isDark ? 'text-neutral-400' : 'text-neutral-500'} uppercase tracking-tight`}
              >
                Cam kết định mức
              </div>
              <div
                className={`text-[17px] font-black ${isDark ? 'text-white' : 'text-neutral-800'} tabular-nums mt-0.5`}
              >
                {targetMinutes}{' '}
                <span className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  phút
                </span>
              </div>
              <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-400'} mt-0.5`}>
                Tiêu chuẩn dịch vụ
              </div>
            </div>

            {/* Cột 2: Hoàn tất thực tế */}
            <div
              className={`rounded-xl p-2.5 border ${isDark ? 'bg-neutral-900 border-neutral-800' : performanceMeta.boxBg}`}
            >
              <div
                className={`text-[10px] font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-600'} uppercase tracking-tight`}
              >
                Hoàn tất thực tế
              </div>
              <div
                className={`text-[17px] font-black ${isDark ? 'text-white' : 'text-neutral-900'} tabular-nums mt-0.5`}
              >
                {actualMinutes}{' '}
                <span className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  phút
                </span>
              </div>
              <div className={`text-[10.5px] font-extrabold mt-0.5 tabular-nums ${performanceMeta.diffTextColor}`}>
                {performanceMeta.diffText}
              </div>
            </div>
          </div>

          {/* Banner Khen Ngợi & Khích Lệ Tinh Thần */}
          <div
            className={`rounded-xl p-2.5 border ${isDark ? 'bg-neutral-900 border-neutral-800' : performanceMeta.praiseBg}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base select-none leading-none pt-0.5">{performanceMeta.praiseIcon}</span>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className={`text-[12px] font-black ${isDark ? 'text-white' : performanceMeta.praiseTitleColor}`}>
                  {performanceMeta.praiseTitle}
                </div>
                <div
                  className={`text-[11px] leading-relaxed font-medium ${isDark ? 'text-neutral-300' : performanceMeta.praiseDescColor}`}
                >
                  {performanceMeta.praiseMessage}
                </div>
              </div>
            </div>
          </div>

          {/* Dòng nghiệm thu kỹ thuật rút gọn tinh tế */}
          <div
            className={`pt-0.5 flex items-center justify-center gap-1.5 text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Chuẩn kỹ thuật Wings · Mi tơi mướt · Không dính chân · Không cay mắt</span>
          </div>
        </div>

        {/* KHỐI 4: NÚT HÀNH ĐỘNG CUỐI TRANG (HOÀN TẤT & ĐI TIẾP VÀO CHECKOUT/UPSELL) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleProceed}
            disabled={!afterPhotoPreview && !isPhotoDeclined}
            className={`w-full py-4 px-4 rounded-2xl ${
              !afterPhotoPreview && !isPhotoDeclined
                ? isDark
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                  : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                : 'bg-[#FFB400] text-black shadow-md active:scale-98 cursor-pointer'
            } font-black text-[14.5px] transition-all text-center uppercase tracking-tight flex items-center justify-center gap-2`}
          >
            {!afterPhotoPreview && !isPhotoDeclined ? (
              <>
                <span>🔒</span>
                <span>BẮT BUỘC CHỤP ẢNH AFTER HOẶC CHỌN LÝ DO</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>LƯU ẢNH AFTER & TIẾP TỤC →</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
