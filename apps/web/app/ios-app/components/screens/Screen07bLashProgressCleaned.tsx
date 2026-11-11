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
import { resolveDisplayServiceName, parseDaysSinceLastVisit } from './LashMaterialConstraintMatrix';
import { compressLashImage } from '../../utils/imageCompressor';
import { EyeOff, Camera, Sparkles, ClipboardList, Minus, Plus } from 'lucide-react';

interface Screen07bLashProgressCleanedProps {
  booking?: BookingItem;
  onBack: () => void;
  onSavePhoto: (photoUrl: string, retainLashes?: { left: number; right: number }) => void;
  onAutoSavePhoto?: (photoUrl: string, retainLashes?: { left: number; right: number }) => Promise<any> | void;
}

export function Screen07bLashProgressCleaned({
  booking,
  onBack,
  onSavePhoto,
  onAutoSavePhoto,
}: Screen07bLashProgressCleanedProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'offline'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Nhận diện ca Dặm mi (Refill / Retain)
  const detectedRefill = useMemo(() => {
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

  // Hỗ trợ nút bật/tắt chế độ Dặm để test trên bất kỳ ca nào
  const [manualRefillMode, setManualRefillMode] = useState<boolean | null>(null);
  const isRefill = manualRefillMode !== null ? manualRefillMode : detectedRefill;

  // Khôi phục ảnh đã chụp/lưu trước đó nếu có
  const bookingId = booking?.id;
  const [photoPreview, setPhotoPreview] = useState<string | null>(() => {
    if (!bookingId) return null;
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.cleanedPhotoUrl || cached?.cleanedPhotoUrl || null;
    return saved && !saved.startsWith('DECLINED:') ? saved : null;
  });
  const [isPhotoDeclined, setIsPhotoDeclined] = useState<boolean>(() => {
    if (!bookingId) return false;
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.cleanedPhotoUrl || cached?.cleanedPhotoUrl || '';
    return Boolean(saved.startsWith('DECLINED:'));
  });
  const [declineReason, setDeclineReason] = useState<string>(() => {
    if (!bookingId) return 'Khách nhạy cảm riêng tư';
    const cached = getLocalProgressSnapshot(bookingId);
    const saved = booking?.progress?.cleanedPhotoUrl || cached?.cleanedPhotoUrl || '';
    return saved.startsWith('DECLINED:') ? saved.replace('DECLINED:', '') : 'Khách nhạy cảm riêng tư';
  });

  // Số lượng mi còn lại mắt trái (#17: extension-lash-count-left) và mắt phải (#18: extension-lash-count-right)
  const [leftLashCount, setLeftLashCount] = useState<string>(() => {
    if (!bookingId) return '';
    const cached = getLocalProgressSnapshot(bookingId);
    const val = booking?.progress?.retainLashCountLeft ?? cached?.retainLashCountLeft;
    return val !== undefined && val !== null ? String(val) : '';
  });

  const [rightLashCount, setRightLashCount] = useState<string>(() => {
    if (!bookingId) return '';
    const cached = getLocalProgressSnapshot(bookingId);
    const val = booking?.progress?.retainLashCountRight ?? cached?.retainLashCountRight;
    return val !== undefined && val !== null ? String(val) : '';
  });

  // Tự động khôi phục ảnh và số lượng mi từ IndexedDB và đồng bộ currentStep = 8
  useEffect(() => {
    if (!bookingId) return;
    saveLocalProgressSnapshot(bookingId, { currentStep: 8 });
    if (!photoPreview) {
      void getLocalProgressSnapshotAsync(bookingId).then((cached) => {
        if (cached?.cleanedPhotoUrl) {
          setPhotoPreview(cached.cleanedPhotoUrl);
        }
        if (cached?.retainLashCountLeft !== undefined && !leftLashCount) {
          setLeftLashCount(String(cached.retainLashCountLeft));
        }
        if (cached?.retainLashCountRight !== undefined && !rightLashCount) {
          setRightLashCount(String(cached.retainLashCountRight));
        }
      });
    }
  }, [bookingId, photoPreview]);

  // Đồng bộ đa thiết bị tức thì khi server cập nhật ảnh Vệ sinh mới (chỉ khi không đang tự chọn ảnh)
  useEffect(() => {
    if (isSelectingRef.current) return;
    if (booking?.progress?.cleanedPhotoUrl && booking.progress.cleanedPhotoUrl !== photoPreview) {
      setPhotoPreview(booking.progress.cleanedPhotoUrl);
    }
    if (booking?.progress?.retainLashCountLeft !== undefined && !leftLashCount) {
      setLeftLashCount(String(booking.progress.retainLashCountLeft));
    }
    if (booking?.progress?.retainLashCountRight !== undefined && !rightLashCount) {
      setRightLashCount(String(booking.progress.retainLashCountRight));
    }
  }, [booking?.progress]);

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

        const currentLeft = leftLashCount !== '' ? parseInt(leftLashCount, 10) : undefined;
        const currentRight = rightLashCount !== '' ? parseInt(rightLashCount, 10) : undefined;
        const retainData =
          currentLeft !== undefined && currentRight !== undefined
            ? { left: currentLeft, right: currentRight }
            : undefined;

        if (bookingId) {
          saveLocalProgressSnapshot(bookingId, {
            cleanedPhotoUrl: compressed,
            cleanedPhotoSavedAt: new Date().toISOString(),
            bookingId,
            currentStep: 8,
            ...(retainData
              ? {
                  retainLashCountLeft: retainData.left,
                  retainLashCountRight: retainData.right,
                  retainLashes: retainData,
                  retainAttributeValues: {
                    '17': {
                      attribute_option_value: String(retainData.left),
                      attribute_key: 'extension-lash-count-left',
                    },
                    '18': {
                      attribute_option_value: String(retainData.right),
                      attribute_key: 'extension-lash-count-right',
                    },
                  },
                }
              : {}),
          });
        }

        // 3. Tự động đẩy lên Cloud kèm thời gian tối thiểu 850ms để mắt người nhận diện rõ animation xoay
        if (onAutoSavePhoto) {
          const uploadPromise = onAutoSavePhoto(compressed, retainData);
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
        console.warn('[Screen07b] Failed to compress image:', err);
        setCloudSyncStatus(navigator.onLine ? 'synced' : 'offline');
      } finally {
        isSelectingRef.current = false;
      }
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!photoPreview && !isPhotoDeclined) {
      setValidationError('Vui lòng chụp ảnh vệ sinh nhắm mắt hoặc chọn lý do khách từ chối chụp ảnh.');
      return;
    }
    const finalPhoto = photoPreview || `DECLINED:${declineReason}`;

    if (isRefill) {
      const leftNum = parseInt(leftLashCount, 10);
      const rightNum = parseInt(rightLashCount, 10);
      if (isNaN(leftNum) || isNaN(rightNum) || leftLashCount.trim() === '' || rightLashCount.trim() === '') {
        setValidationError(
          'Vui lòng đếm và nhập số sợi mi còn lại của cả 2 mắt (Trái & Phải) trước khi bắt đầu nối mi'
        );
        return;
      }
      setValidationError(null);

      const retainData = { left: leftNum, right: rightNum };
      if (bookingId) {
        saveLocalProgressSnapshot(bookingId, {
          cleanedPhotoUrl: finalPhoto,
          cleanedPhotoSavedAt: new Date().toISOString(),
          bookingId,
          currentStep: 9,
          retainLashCountLeft: leftNum,
          retainLashCountRight: rightNum,
          retainLashes: retainData,
          retainAttributeValues: {
            '17': {
              attribute_option_value: String(leftNum),
              attribute_key: 'extension-lash-count-left',
            },
            '18': {
              attribute_option_value: String(rightNum),
              attribute_key: 'extension-lash-count-right',
            },
          },
        });
      }
      onSavePhoto(finalPhoto, retainData);
      return;
    }

    // Ca nối mới tiêu chuẩn
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

  const customerName = (booking?.customerName || 'Chị Quyên').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
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

  // Tính số ngày kể từ lần ghé trước để đo tốc độ rụng mi
  const daysSinceLastVisit = useMemo(() => {
    const rawDate = booking?.lastVisitDate || booking?.lashHistory?.[0]?.date;
    const parsed = parseDaysSinceLastVisit(rawDate);
    if (parsed && parsed > 0) return parsed;
    const explicitDays = (booking as any)?.customerDaysSinceLastVisit || (booking as any)?.daysSinceLastVisit;
    if (typeof explicitDays === 'number' && explicitDays > 0) return explicitDays;
    return 14; // Mặc định chu kỳ dặm tiêu chuẩn 14 ngày nếu chưa có lịch sử
  }, [booking]);

  // Tổng số lượng sợi mi của bộ cũ (mặc định 140 sợi = 70 sợi/mắt)
  const initialFullSetCount = useMemo(() => {
    const countStr = booking?.attributes?.count || '';
    const match = countStr.match(/(\d+)/);
    if (match) {
      const perEye = parseInt(match[1], 10);
      if (perEye > 0 && perEye <= 200) return perEye * 2;
    }
    const sName = booking?.serviceName || '';
    const sMatch = sName.match(/(\d+)\s*(sợi|fan|nhịp)/i);
    if (sMatch) {
      const perEye = parseInt(sMatch[1], 10);
      if (perEye > 0 && perEye <= 200) return perEye * 2;
    }
    return 140;
  }, [booking]);

  // Tốc độ rụng mi trung bình mỗi ngày (Số sợi rụng / Số ngày)
  const dailyShedRate = useMemo(() => {
    if (leftLashCount === '' || rightLashCount === '') return 0;
    const totalRetained = (parseInt(leftLashCount, 10) || 0) + (parseInt(rightLashCount, 10) || 0);
    const totalShed = Math.max(0, initialFullSetCount - totalRetained);
    const safeDays = Math.max(1, daysSinceLastVisit);
    return Math.max(1, Math.round(totalShed / safeDays));
  }, [leftLashCount, rightLashCount, initialFullSetCount, daysSinceLastVisit]);

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex-1 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'} overflow-y-auto select-none`}
    >
      {/* 1. Header Navigation */}
      <IosNavigationBar title="Tiến Trình Nối Mi" onBack={onBack} backTitle="Ảnh Before" />

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
      <LashServicingStepper activeStep={2} />

      <div className="flex-1 px-4 py-3.5 space-y-3.5 overflow-y-auto pb-6">
        {/* 3. Customer Info Header Card: Refactored chuẩn iOS kèm Avatar & 3 dòng thông tin */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'} rounded-2xl p-3.5 shadow-sm border flex items-center gap-3`}
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
              <span
                className={`text-[15px] font-extrabold ${isDark ? 'text-white' : 'text-black'} truncate tracking-tight`}
              >
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
              <div
                className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} font-semibold truncate mt-0.5 tabular-nums`}
              >
                {lashSpecDetail}
              </div>
            )}
          </div>
        </div>

        {/* Tech Spec Card: Thông số kỹ thuật mi */}
        {booking && (
          <div
            className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'} rounded-2xl p-3 shadow-sm border space-y-2`}
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
                className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'} border rounded-xl py-1.5 px-1 text-center min-w-0`}
              >
                <span
                  className={`text-[8.5px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'} uppercase block`}
                >
                  Dáng
                </span>
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
        <div className="flex items-center justify-between px-1 pt-0.5">
          <div
            className={`text-[11px] font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'} uppercase tracking-wider`}
          >
            CHỤP ẢNH VỆ SINH NHẮM (BẮT BUỘC)
          </div>
          {!detectedRefill && (
            <button
              type="button"
              onClick={() => setManualRefillMode(!isRefill)}
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                isRefill
                  ? 'bg-amber-400 text-black shadow-xs'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-300'
              }`}
            >
              {isRefill ? '⚡ Ca Dặm Mi' : '+ Ca Dặm Mi'}
            </button>
          )}
        </div>

        {/* 4. Camera Viewfinder Card with Real Capture & Photo Upload */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'} rounded-2xl p-3.5 shadow-sm border space-y-3`}
        >
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

        {/* 5. KHỐI KIỂM ĐẾM SỐ LƯỢNG MI CÒN LẠI (BẮT BUỘC KHI DẶM - RETAIN LASHES) */}
        {isRefill && (
          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-gradient-to-b from-amber-50/70 to-white border-amber-200'
            } rounded-2xl p-4 shadow-sm border space-y-3.5`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <div
                className={`text-[12.5px] font-black ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-tight`}
              >
                Số Lượng Sợi mi Còn lại
              </div>
            </div>

            {/* Ẩn triệt để spin button mặc định để căn giữa số */}
            <style>{`
              input.no-spin-buttons::-webkit-outer-spin-button,
              input.no-spin-buttons::-webkit-inner-spin-button {
                -webkit-appearance: none !important;
                margin: 0 !important;
                display: none !important;
              }
              input.no-spin-buttons {
                -moz-appearance: textfield !important;
                appearance: textfield !important;
              }
            `}</style>

            {/* 2 Khung Mắt Trái & Mắt Phải */}
            <div className="grid grid-cols-2 gap-3">
              {/* Mắt Trái (Left Eye - #17 extension-lash-count-left) */}
              <div
                className={`${
                  isDark
                    ? 'bg-neutral-900/90 border-neutral-700/80 focus-within:border-amber-400'
                    : 'bg-white border-neutral-200 focus-within:border-amber-500'
                } rounded-xl p-3 border transition-colors space-y-2 shadow-2xs`}
              >
                <div className="flex items-center justify-center">
                  <span
                    className={`text-[11.5px] font-black ${isDark ? 'text-neutral-200' : 'text-neutral-800'} text-center`}
                  >
                    Mắt trái
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLeftLashCount((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)));
                      setValidationError(null);
                    }}
                    className={`w-8 h-8 rounded-lg ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                    } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                    aria-label="Giảm 1"
                    title="Giảm 1"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <div className="flex-1 flex items-center justify-center">
                    <input
                      type="number"
                      min="0"
                      max="250"
                      inputMode="numeric"
                      placeholder="—"
                      value={leftLashCount}
                      onChange={(e) => {
                        setLeftLashCount(e.target.value);
                        setValidationError(null);
                      }}
                      style={{ MozAppearance: 'textfield' }}
                      className={`no-spin-buttons [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-16 text-center font-black text-2xl tabular-nums bg-transparent ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      } focus:outline-none`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftLashCount((prev) => String(Math.min(250, (parseInt(prev, 10) || 0) + 1)));
                      setValidationError(null);
                    }}
                    className={`w-8 h-8 rounded-lg ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                    } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                    aria-label="Tăng 1"
                    title="Tăng 1"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  {['0', '20', '40', '60'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setLeftLashCount(val);
                        setValidationError(null);
                      }}
                      className={`flex-1 py-1 rounded text-[10.5px] font-bold tabular-nums transition-colors cursor-pointer ${
                        leftLashCount === val
                          ? 'bg-amber-400 text-black font-black shadow-xs'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mắt Phải (Right Eye - #18 extension-lash-count-right) */}
              <div
                className={`${
                  isDark
                    ? 'bg-neutral-900/90 border-neutral-700/80 focus-within:border-amber-400'
                    : 'bg-white border-neutral-200 focus-within:border-amber-500'
                } rounded-xl p-3 border transition-colors space-y-2 shadow-2xs`}
              >
                <div className="flex items-center justify-center">
                  <span
                    className={`text-[11.5px] font-black ${isDark ? 'text-neutral-200' : 'text-neutral-800'} text-center`}
                  >
                    Mắt phải
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRightLashCount((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)));
                      setValidationError(null);
                    }}
                    className={`w-8 h-8 rounded-lg ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                    } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                    aria-label="Giảm 1"
                    title="Giảm 1"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <div className="flex-1 flex items-center justify-center">
                    <input
                      type="number"
                      min="0"
                      max="250"
                      inputMode="numeric"
                      placeholder="—"
                      value={rightLashCount}
                      onChange={(e) => {
                        setRightLashCount(e.target.value);
                        setValidationError(null);
                      }}
                      style={{ MozAppearance: 'textfield' }}
                      className={`no-spin-buttons [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-16 text-center font-black text-2xl tabular-nums bg-transparent ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      } focus:outline-none`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRightLashCount((prev) => String(Math.min(250, (parseInt(prev, 10) || 0) + 1)));
                      setValidationError(null);
                    }}
                    className={`w-8 h-8 rounded-lg ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                    } font-black text-sm flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                    aria-label="Tăng 1"
                    title="Tăng 1"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  {['0', '20', '40', '60'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setRightLashCount(val);
                        setValidationError(null);
                      }}
                      className={`flex-1 py-1 rounded text-[10.5px] font-bold tabular-nums transition-colors cursor-pointer ${
                        rightLashCount === val
                          ? 'bg-amber-400 text-black font-black shadow-xs'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Badge hoặc Báo bắt buộc chọn */}
            {leftLashCount !== '' && rightLashCount !== '' ? (
              <div
                className={`p-2.5 rounded-xl ${
                  isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-neutral-200'
                } border flex items-center justify-between text-[11.5px]`}
              >
                <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>
                  Tổng mi còn lại:{' '}
                  <strong className="text-amber-400 tabular-nums">
                    {(parseInt(leftLashCount, 10) || 0) + (parseInt(rightLashCount, 10) || 0)} sợi
                  </strong>
                </span>
                <span
                  className={`text-[11px] font-bold tabular-nums flex items-center gap-1 ${
                    dailyShedRate > 12
                      ? isDark
                        ? 'text-amber-400'
                        : 'text-amber-600'
                      : isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                  }`}
                >
                  <span>Rụng ~{dailyShedRate} sợi/ngày</span>
                  <span
                    className={`text-[9.5px] font-normal opacity-70 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}
                  >
                    ({daysSinceLastVisit}N)
                  </span>
                </span>
              </div>
            ) : (
              <div
                className={`p-2.5 rounded-xl ${
                  isDark
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                } border flex items-center justify-center text-[11.5px] font-bold gap-1.5`}
              >
                <span>⚠️</span>
                <span>Bắt buộc chọn hoặc nhập số lượng mi còn lại của cả 2 mắt</span>
              </div>
            )}

            {validationError && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}

        {/* 6. Big CTA Button */}
        {(() => {
          const isRefillIncomplete = isRefill && (leftLashCount.trim() === '' || rightLashCount.trim() === '');
          const isPhotoMissing = !photoPreview && !isPhotoDeclined;
          const isBlocked = isRefillIncomplete || isPhotoMissing;
          return (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isBlocked}
                className={`w-full py-4 px-4 rounded-2xl ${
                  isBlocked
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                      : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                    : 'bg-[#FFB400] text-black hover:bg-[#E5A200] active:scale-98 shadow-md cursor-pointer'
                } font-black text-[15px] transition-all text-center uppercase tracking-tight flex items-center justify-center gap-2`}
              >
                {isBlocked && <span>🔒</span>}
                <span>
                  {isRefillIncomplete
                    ? 'BẮT BUỘC CHỌN SỐ LƯỢNG MI ĐỂ TIẾP TỤC'
                    : isPhotoMissing
                      ? 'BẮT BUỘC CHỤP ẢNH VỆ SINH HOẶC CHỌN LÝ DO'
                      : 'BẮT ĐẦU NỐI MI & BẤM GIỜ →'}
                </span>
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
