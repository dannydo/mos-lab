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
import {
  Eye,
  Camera,
  Image as ImageIcon,
  RotateCw,
  CheckCircle2,
  CloudUpload,
  CloudCheck,
  CloudOff,
  ClipboardList,
} from 'lucide-react';

interface Screen07LashProgressBeforeProps {
  booking?: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => Promise<any> | void;
}

export function Screen07LashProgressBefore({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
}: Screen07LashProgressBeforeProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef<boolean>(false);
  const [autoSavedToast, setAutoSavedToast] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'offline'>('idle');

  // Khôi phục ảnh đã chụp/lưu trước đó nếu có
  const bookingId = booking?.id;
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    if (!bookingId) return null;
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.beforePhotoUrl || cached?.beforePhotoUrl || null;
    return saved && !saved.startsWith('DECLINED:') ? saved : null;
  });
  const [isPhotoDeclined, setIsPhotoDeclined] = useState<boolean>(() => {
    if (!bookingId) return false;
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.beforePhotoUrl || cached?.beforePhotoUrl || '';
    return Boolean(saved.startsWith('DECLINED:'));
  });
  const [declineReason, setDeclineReason] = useState<string>(() => {
    if (!bookingId) return 'Khách nhạy cảm riêng tư';
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.beforePhotoUrl || cached?.beforePhotoUrl || '';
    return saved.startsWith('DECLINED:') ? saved.replace('DECLINED:', '') : 'Khách nhạy cảm riêng tư';
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

  // Đồng bộ đa thiết bị tức thì khi server cập nhật ảnh Before mới (chỉ khi không đang tự chọn ảnh)
  useEffect(() => {
    if (isSelectingRef.current) return;
    if (booking?.progress?.beforePhotoUrl && booking.progress.beforePhotoUrl !== photoPreview) {
      setPhotoPreview(booking.progress.beforePhotoUrl);
    }
  }, [booking?.progress?.beforePhotoUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      isSelectingRef.current = true;
      let instantUrl: string | null = null;
      try {
        // 1. Phản hồi thị giác tức thời (0ms): Hiện ảnh ngay lập tức và kích hoạt spinner upload
        instantUrl = URL.createObjectURL(file);
        setPhotoPreview(instantUrl);
        setCloudSyncStatus('uploading');

        // 2. Nén ảnh canvas chuẩn iOS native toJpegData (tối đa 1024px, giảm từ 5MB -> ~60KB)
        const compressed = await compressLashImage(file, 1024, 0.72);
        if (instantUrl) {
          try {
            URL.revokeObjectURL(instantUrl);
          } catch (_) {}
        }
        setPhotoPreview(compressed);
        if (bookingId) {
          saveLocalProgressSnapshot(bookingId, {
            beforePhotoUrl: compressed,
            beforePhotoSavedAt: new Date().toISOString(),
            bookingId,
            currentStep: 7,
          });
        }

        // 3. Tự động upload lên server kết hợp thời gian tối thiểu (850ms) để mắt người nhận diện rõ animation xoay
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
        console.warn('[Screen07] Failed to compress image:', err);
        setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
      } finally {
        isSelectingRef.current = false;
      }
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!photoPreview && !isPhotoDeclined) return;
    const finalPhoto = photoPreview || `DECLINED:${declineReason}`;
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

  const customerName = (booking?.customerName || 'Chị Quyên').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  // Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn Any - Lashes
  const displayServiceName = resolveDisplayServiceName(booking);
  const lashSpecDetail = useMemo(() => {
    const parts: string[] = [];
    const rawStyle = (booking?.attributes?.style || '')
      .replace(/sexy\s*\/?\s*cat|cat\s*\/?\s*sexy/gi, 'Natural')
      .trim();
    if (rawStyle) parts.push(rawStyle);
    if (booking?.attributes?.curl) {
      parts.push(booking.attributes.curl.replace(/^Cong\s+/i, '').trim());
    }
    if (booking?.attributes?.length) {
      parts.push(booking.attributes.length.replace(/\s*mm/gi, '').trim());
    }
    if (booking?.attributes?.thickness) {
      parts.push(booking.attributes.thickness.replace(/\s*mm/gi, '').trim());
    }
    return parts.length > 0 ? parts.join(' · ') : '';
  }, [booking]);

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const isRefill = useMemo(() => {
    const sName = (booking?.serviceName || '').toLowerCase();
    const sType = String(booking?.serviceType || '').toLowerCase();
    const bAny = booking as any;
    const sKey = (bAny?.serviceKey || '').toLowerCase();
    const cName = (bAny?.categoryName || '').toLowerCase();
    const isRetainService =
      sType.includes('retain') ||
      sName.includes('dặm') ||
      sName.includes('dam') ||
      sName.includes('refill') ||
      sKey.includes('retain') ||
      cName.includes('dặm') ||
      cName.includes('dam') ||
      cName.includes('refill') ||
      Boolean(bAny?.isRefill) ||
      Boolean(booking?.attributes && (booking.attributes as any).isRefill) ||
      Boolean(booking?.attributes && (booking.attributes as any).serviceType === 'Retain');

    const isComboNewFullSet =
      Boolean(booking?.comboLiveStatus?.isComboLive) &&
      (booking?.serviceType === 'Normal' ||
        Boolean(booking?.attributes?.overrideReason?.includes('gỡ toàn bộ')) ||
        Boolean(booking?.attributes?.overrideReason?.includes('Nối Mới Combo')));

    if (isComboNewFullSet || sType === 'normal' || sType === 'new') {
      return false;
    }
    return isRetainService;
  }, [booking]);

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      {/* 1. Header Navigation: Bỏ hoàn toàn thông tin Giường và Online theo yêu cầu */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Ca Làm" />

      {/* Hidden file input — camera only (capture="environment"), không cho tải từ thư viện */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 2. Steps Subheader (Gom thành 1 thanh ngang Segmented Stepper chuẩn iOS) */}
      <LashServicingStepper activeStep={1} />

      <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto pb-6">
        {/* 3. Header Card: Refactored chuẩn iOS kèm Avatar & 3 dòng thông tin */}
        <div
          className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm border flex items-center gap-3`}
        >
          <div className="relative w-11 h-11 flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 border ${isDark ? 'border-neutral-700' : 'border-neutral-200'} shadow-xs`}
            >
              {booking?.customerAvatar ? (
                <img
                  src={booking.customerAvatar}
                  alt={customerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 ${isDark ? 'border-[#1C1C1E]' : 'border-white'} animate-pulse`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[15px] font-extrabold text-[var(--mos-text)] truncate tracking-tight`}>
                {customerName}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[9.5px] font-black leading-none shrink-0 shadow-xs">
                ⚡ Đang phục vụ
              </span>
            </div>

            <div className={`text-[12px] ${isDark ? 'text-neutral-200' : 'text-gray-800'} font-bold truncate mt-0.5`}>
              {displayServiceName}
            </div>

            {lashSpecDetail && (
              <div className={`text-[11px] text-[var(--mos-text-muted)] font-semibold truncate mt-0.5 tabular-nums`}>
                {lashSpecDetail}
              </div>
            )}
          </div>
        </div>

        {/* Tech Spec Card: Thông số kỹ thuật mi */}
        {booking && (
          <div
            className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3 shadow-sm border space-y-2`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[11px] font-black ${isDark ? 'text-amber-400' : 'text-amber-600'} uppercase tracking-wider flex items-center gap-1.5`}
                >
                  <ClipboardList
                    className={`w-3.5 h-3.5 stroke-[2.2] ${isDark ? 'text-amber-400' : 'text-amber-600'} shrink-0`}
                  />
                  <span>NGUYÊN VẬT LIỆU</span>
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                    isRefill
                      ? 'bg-purple-500/25 text-purple-300 border-purple-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  }`}
                >
                  {isRefill ? 'Dặm' : 'Nối Mới'}
                </span>
              </div>
              <span
                className={`text-[9.5px] font-bold ${isDark ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-amber-700 bg-amber-50 border-amber-200'} px-2 py-0.5 rounded-md border`}
              >
                {booking.attributes?.material || 'UltraLight'} · {booking.attributes?.volume || '4D'} ·{' '}
                {booking.attributes?.count || '60 fan'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div
                className={`bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] border rounded-xl py-1.5 px-1 text-center min-w-0`}
              >
                <span className={`text-[8.5px] font-bold text-[var(--mos-text-muted)] uppercase block`}>Dáng</span>
                <span
                  className={`text-[11px] font-black ${isDark ? 'text-white' : 'text-neutral-800'} block mt-0.5 truncate`}
                >
                  {(booking.attributes?.style || 'Natural').replace(/sexy\s*\/?\s*cat|cat\s*\/?\s*sexy/gi, 'Natural')}
                </span>
              </div>
              <div
                className={`${isDark ? 'bg-blue-950/40 border-blue-900/60' : 'bg-blue-50 border-blue-200'} border rounded-xl py-1.5 px-1 text-center min-w-0`}
              >
                <span
                  className={`text-[8.5px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'} uppercase block`}
                >
                  Cong
                </span>
                <span
                  className={`text-[11px] font-black ${isDark ? 'text-blue-300' : 'text-blue-700'} block mt-0.5 truncate`}
                >
                  {(booking.attributes?.curl || 'CC').replace(/^Cong\s+/i, '')}
                </span>
              </div>
              <div
                className={`${isDark ? 'bg-emerald-950/40 border-emerald-900/60' : 'bg-emerald-50 border-emerald-200'} border rounded-xl py-1.5 px-1 text-center min-w-0`}
              >
                <span
                  className={`text-[8.5px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} uppercase block`}
                >
                  Độ dài
                </span>
                <span
                  className={`text-[11px] font-black ${isDark ? 'text-emerald-300' : 'text-emerald-700'} block mt-0.5 tabular-nums truncate`}
                >
                  {(booking.attributes?.length || '10-12').replace(/\s*mm/gi, '')}
                </span>
              </div>
              <div
                className={`${isDark ? 'bg-purple-950/40 border-purple-900/60' : 'bg-purple-50 border-purple-200'} border rounded-xl py-1.5 px-1 text-center min-w-0`}
              >
                <span
                  className={`text-[8.5px] font-bold ${isDark ? 'text-purple-400' : 'text-purple-500'} uppercase block`}
                >
                  Độ dày
                </span>
                <span
                  className={`text-[11px] font-black ${isDark ? 'text-purple-300' : 'text-purple-700'} block mt-0.5 tabular-nums truncate`}
                >
                  {(booking.attributes?.thickness || '0.07').replace(/\s*mm/gi, '')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section title */}
        <div className={`text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider px-1 pt-0.5`}>
          CHỤP ẢNH BEFORE MẮT MỘC (BẮT BUỘC)
        </div>

        {/* 4. Camera Viewfinder Card with Real Capture & Photo Upload */}
        <div
          className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-4 shadow-sm border space-y-3.5`}
        >
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

            {/* Watermark overlay & Auto-save / Cloud Sync status */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-0.8 rounded border border-neutral-700/80 tabular-nums">
                {booking?.time12h || 'Hôm nay'} · {booking?.branchName || 'Wings Lashes'}
              </span>
              {(photoPreview || cloudSyncStatus === 'uploading') && <IosCloudSyncBadge status={cloudSyncStatus} />}
            </div>
          </div>

          {/* Action Button — Camera Only */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={`w-full py-3 px-3 ${isDark ? 'bg-[#2C2C2E] hover:bg-[#3A3A3C]' : 'bg-neutral-900 hover:bg-black'} text-white font-extrabold text-[13px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>{photoPreview ? 'Chụp lại Camera' : 'Chụp Bằng Camera'}</span>
          </button>

          {/* Nút ngoại lệ: Khách từ chối chụp ảnh */}
          {!photoPreview && (
            <div className={`pt-2 border-t border-[var(--mos-surface-border)] space-y-2`}>
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

        {/* 5. Big CTA Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!photoPreview && !isPhotoDeclined}
            className={`w-full py-4 px-4 rounded-2xl ${
              !photoPreview && !isPhotoDeclined
                ? isDark
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                  : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                : 'bg-[#FFB400] text-black shadow-md active:scale-98 cursor-pointer'
            } font-black text-[15px] transition-all text-center uppercase tracking-tight flex items-center justify-center gap-2`}
          >
            {!photoPreview && !isPhotoDeclined ? (
              <>
                <span>🔒</span>
                <span>BẮT BUỘC CHỤP ẢNH BEFORE HOẶC CHỌN LÝ DO</span>
              </>
            ) : (
              <span>TIẾP TỤC SANG ẢNH VỆ SINH →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
