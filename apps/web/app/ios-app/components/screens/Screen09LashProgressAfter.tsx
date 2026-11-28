'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  bookingRequiresUnderLashRound,
  isPureUnderLashServiceName,
  resolveActiveServicingRound,
  splitUpperAndUnderTargetDuration,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { LashServicingStepper } from '../ui-kit/LashServicingStepper';
import { IosCloudSyncBadge } from '../ui-kit/IosCloudSyncBadge';
import { ServicingRoundHeaderPill } from './servicing/ServicingRoundHeaderPill';
import { AfterRoundComparisonStrip } from './servicing/AfterRoundComparisonStrip';
import { AfterTimeReportCard } from './servicing/AfterTimeReportCard';
import { CustomerPortfolioTriggerButton } from '../ui-kit/CustomerPortfolioTriggerButton';
import { BookingItem } from '../../state/mockData';
import {
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  getLocalProgressSnapshotAsync,
} from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import { getClientTrainingSamplePhoto } from '../simulation/IosSimulationWorkspaceBar';
import { Camera, CheckCircle2, Maximize2, Sparkles } from 'lucide-react';

interface Screen09LashProgressAfterProps {
  booking: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string) => void;
  onAutoSavePhoto?: (photoUrl: string) => Promise<any> | void;
  onOpenAddUnderMink?: (afterPhotoUrl?: string) => void;
  isSimulationMode?: boolean;
}

export function Screen09LashProgressAfter({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
  onOpenAddUnderMink,
  isSimulationMode = false,
}: Screen09LashProgressAfterProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'offline'>('idle');
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);

  const bookingId = booking.id;
  const hasUnderMink = bookingRequiresUnderLashRound(booking);
  const activeRound = resolveActiveServicingRound(booking);
  const isUnderRound = hasUnderMink && activeRound === 'UNDER';
  const beforeField = isUnderRound ? 'underBeforePhotoUrl' : 'beforePhotoUrl';
  const cleanedField = isUnderRound ? 'underCleanedPhotoUrl' : 'cleanedPhotoUrl';
  const afterField = isUnderRound ? 'underAfterPhotoUrl' : 'afterPhotoUrl';
  const afterSavedAtField = isUnderRound ? 'underAfterPhotoSavedAt' : 'afterPhotoSavedAt';
  const progressSeconds = isUnderRound
    ? (booking.progress?.underElapsedSeconds ?? booking.progress?.elapsedSeconds)
    : (booking.progress?.upperElapsedSeconds ?? booking.progress?.elapsedSeconds);

  const cachedSnapshot = useMemo(() => {
    return getLocalProgressSnapshot(bookingId);
  }, [bookingId, isUnderRound]);

  const [asyncSnapshot, setAsyncSnapshot] = useState<any>(null);

  useEffect(() => {
    void getLocalProgressSnapshotAsync(bookingId).then((data) => {
      if (data) setAsyncSnapshot(data);
    });
  }, [bookingId, isUnderRound]);

  const beforePhotoUrl =
    (booking.progress?.[beforeField] as string | undefined) ||
    (cachedSnapshot?.[beforeField] as string | undefined) ||
    (asyncSnapshot?.[beforeField] as string | undefined) ||
    null;
  const cleanedPhotoUrl =
    (booking.progress?.[cleanedField] as string | undefined) ||
    (cachedSnapshot?.[cleanedField] as string | undefined) ||
    (asyncSnapshot?.[cleanedField] as string | undefined) ||
    null;

  const getSavedAfterValue = (): string => {
    return (
      (booking.progress?.[afterField] as string | undefined) ||
      (cachedSnapshot?.[afterField] as string | undefined) ||
      ''
    );
  };

  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(() => {
    const saved = getSavedAfterValue();
    return saved && !saved.startsWith('DECLINED:') ? saved : null;
  });
  const [isPhotoDeclined, setIsPhotoDeclined] = useState<boolean>(() => {
    return Boolean(getSavedAfterValue().startsWith('DECLINED:'));
  });
  const [declineReason, setDeclineReason] = useState<string>(() => {
    const saved = getSavedAfterValue();
    return saved.startsWith('DECLINED:') ? saved.replace('DECLINED:', '') : 'Khách nhạy cảm riêng tư';
  });

  // Reset state khi chuyển vòng (Vòng 1 -> Vòng 2) hoặc đổi booking
  useEffect(() => {
    const saved = getSavedAfterValue();
    const declined = saved.startsWith('DECLINED:');
    setAfterPhotoPreview(saved && !declined ? saved : null);
    setIsPhotoDeclined(declined);
    setDeclineReason(declined ? saved.replace('DECLINED:', '') : 'Khách nhạy cảm riêng tư');
    setCloudSyncStatus('idle');
  }, [bookingId, isUnderRound, afterField]);

  useEffect(() => {
    const asyncVal = asyncSnapshot?.[afterField] as string | undefined;
    if (!afterPhotoPreview && asyncVal && !asyncVal.startsWith('DECLINED:')) {
      setAfterPhotoPreview(asyncVal);
    }
  }, [afterPhotoPreview, asyncSnapshot, afterField]);

  useEffect(() => {
    if (isSelectingRef.current) return;
    const remoteVal = booking.progress?.[afterField] as string | undefined;
    if (remoteVal && !remoteVal.startsWith('DECLINED:') && remoteVal !== afterPhotoPreview) {
      setAfterPhotoPreview(remoteVal);
    }
  }, [booking.progress, afterField]);

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

  // Tính toán thời gian thực hiện thực tế theo vòng
  const actualMinutes = useMemo(() => {
    const snapSec = isUnderRound ? cachedSnapshot?.underElapsedSeconds : cachedSnapshot?.elapsedSeconds;
    if (typeof snapSec === 'number' && snapSec > 0) {
      return Math.max(1, Math.round(snapSec / 60));
    }
    if (progressSeconds && progressSeconds > 0) {
      return Math.max(1, Math.round(progressSeconds / 60));
    }
    return isUnderRound ? 20 : 45;
  }, [cachedSnapshot, progressSeconds, isUnderRound]);

  const displayServiceName = resolveDisplayServiceName(booking);

  // Thời gian cam kết / định mức theo vòng
  const targetMinutes = useMemo(() => {
    if (isUnderRound) {
      if (booking.progress?.underTargetDurationMinutes && booking.progress.underTargetDurationMinutes > 0) {
        return booking.progress.underTargetDurationMinutes;
      }
      if (booking.progress?.targetDurationMinutes && booking.progress.targetDurationMinutes > 0) {
        return splitUpperAndUnderTargetDuration(
          booking.progress.targetDurationMinutes,
          true,
          booking.attributes?.underMinkServiceType
        ).underMinutes;
      }
      return booking.attributes?.underMinkServiceType === 'Retain' ? 20 : 25;
    }
    if (hasUnderMink) {
      if (booking.progress?.upperTargetDurationMinutes && booking.progress.upperTargetDurationMinutes > 0) {
        return booking.progress.upperTargetDurationMinutes;
      }
      const total = booking.progress?.targetDurationMinutes || booking.serviceDuration || 85;
      return splitUpperAndUnderTargetDuration(total, true, booking.attributes?.underMinkServiceType).upperMinutes;
    }
    if (booking.serviceDuration && booking.serviceDuration > 0) return booking.serviceDuration;
    let base = 65;
    const sName = (displayServiceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) base = 50;
    if (sName.includes('mi dưới')) base += 25;
    return base;
  }, [booking, displayServiceName, hasUnderMink, isUnderRound]);

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
          [afterField]: compressed,
          actualMinutes,
          targetMinutes,
          currentStep: 10,
          [afterSavedAtField]: new Date().toISOString(),
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
      [afterField]: photoUrl,
      actualMinutes,
      targetMinutes,
      currentStep: hasUnderMink && !isUnderRound ? 7 : 12,
      [afterSavedAtField]: new Date().toISOString(),
    });
    onSavePhoto(photoUrl);
  };

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
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
        <ServicingRoundHeaderPill booking={booking} />
        <CustomerPortfolioTriggerButton booking={booking} isSimulationMode={isSimulationMode} compact />
        {/* KHỐI 1: CHỤP ẢNH AFTER (ƯU TIÊN LÊN TRÊN CÙNG TO RÕ THEO YÊU CẦU) */}
        <div className={`bg-[var(--mos-surface)] rounded-2xl p-3.5 shadow-sm border-2 border-[#22C55E] space-y-2.5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
                3
              </span>
              <span className={`text-[13.5px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                {isUnderRound
                  ? '3. ẢNH AFTER MI DƯỚI · HOÀN THIỆN'
                  : hasUnderMink
                    ? '3. ẢNH AFTER MI TRÊN · HOÀN THIỆN'
                    : '3. ẢNH AFTER · HOÀN THIỆN'}
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
                  {booking.customerName} · {booking.branchName || 'Wings Lashes'}
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

          {isSimulationMode && (
            <button
              type="button"
              onClick={() => {
                const sampleUrl = getClientTrainingSamplePhoto('after');
                setAfterPhotoPreview(sampleUrl);
                setIsPhotoDeclined(false);
                setCloudSyncStatus('uploading');
                saveLocalProgressSnapshot(bookingId, {
                  [afterField]: sampleUrl,
                  actualMinutes,
                  targetMinutes,
                  currentStep: 10,
                  [afterSavedAtField]: new Date().toISOString(),
                });
                if (onAutoSavePhoto) {
                  void Promise.resolve(onAutoSavePhoto(sampleUrl)).finally(() => setCloudSyncStatus('synced'));
                } else {
                  setCloudSyncStatus('synced');
                }
              }}
              className={`w-full py-2 px-3 rounded-xl border text-[12px] font-bold active:scale-98 transition-all cursor-pointer ${
                isDark
                  ? 'bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/40 text-amber-300'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
              }`}
            >
              Dùng ảnh mẫu tập luyện (After)
            </button>
          )}

          {/* Nút ngoại lệ: Khách từ chối chụp ảnh */}
          {!afterPhotoPreview && (
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

        {/* KHỐI 2: ĐỐI CHIẾU NHANH VỚI 2 ẢNH TRƯỚC */}
        <div className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3 shadow-sm border`}>
          <AfterRoundComparisonStrip
            activeRound={activeRound}
            hasUnderMink={hasUnderMink}
            isDark={isDark}
            beforePhotoUrl={beforePhotoUrl}
            cleanedPhotoUrl={cleanedPhotoUrl}
            upperBeforeUrl={
              (booking.progress?.beforePhotoUrl as string | undefined) ||
              (cachedSnapshot?.beforePhotoUrl as string | undefined) ||
              null
            }
            upperCleanedUrl={
              (booking.progress?.cleanedPhotoUrl as string | undefined) ||
              (cachedSnapshot?.cleanedPhotoUrl as string | undefined) ||
              null
            }
            upperAfterUrl={
              (booking.progress?.afterPhotoUrl as string | undefined) ||
              (cachedSnapshot?.afterPhotoUrl as string | undefined) ||
              null
            }
            isDisplayablePhoto={isDisplayablePhoto}
            onZoomPhoto={setZoomPhoto}
          />
        </div>

        {/* KHỐI 3: BÁO CÁO THỜI GIAN CA LÀM & KHEN KHÍCH LỆ TINH THẦN (KHÔNG THƯỞNG ĐIỂM) */}
        <AfterTimeReportCard isDark={isDark} targetMinutes={targetMinutes} actualMinutes={actualMinutes} />

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
                <span>
                  {hasUnderMink && !isUnderRound
                    ? 'LƯU AFTER MI TRÊN & SANG VÒNG 2 (MI DƯỚI) →'
                    : hasUnderMink && isUnderRound
                      ? 'LƯU AFTER MI DƯỚI & TIẾP TỤC →'
                      : 'LƯU ẢNH AFTER & TIẾP TỤC →'}
                </span>
              </>
            )}
          </button>

          {!hasUnderMink && !isPureUnderLashServiceName(booking?.serviceName) && onOpenAddUnderMink && (
            <button
              type="button"
              data-testid="add-under-mink-cta-after"
              onClick={() =>
                onOpenAddUnderMink(afterPhotoPreview || (isPhotoDeclined ? `DECLINED:${declineReason}` : undefined))
              }
              className={`mt-2 w-full py-3 px-4 rounded-2xl border font-bold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                isDark
                  ? 'bg-purple-950/35 border-purple-700/70 text-purple-200 hover:bg-purple-950/55'
                  : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>+ Khách muốn làm thêm Mi Dưới (Vòng 2)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
