'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { LashServicingStepper } from '../ui-kit/LashServicingStepper';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem } from '../../state/mockData';
import { saveLocalProgressSnapshot, getLocalProgressSnapshot } from '../../state/offlineSync';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import {
  Hourglass,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Play,
  Pause,
  Edit3,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface Screen08LashProgressTimerProps {
  booking: BookingItem;
  onBack: () => void;
  onFinishTimer: () => void;
  onEditService?: () => void;
  isAdmin?: boolean;
  onRevertToIncoming?: (bookingId: number) => void;
}

export function Screen08LashProgressTimer({
  booking,
  onBack,
  onFinishTimer,
  onEditService,
  isAdmin = false,
  onRevertToIncoming,
}: Screen08LashProgressTimerProps) {
  // 1. Tính toán thời gian định mức (Target Duration) chuẩn xác theo dịch vụ
  const displayServiceName = resolveDisplayServiceName(booking);
  const targetMinutes = useMemo(() => {
    if (booking.serviceDuration && booking.serviceDuration > 0) return booking.serviceDuration;
    let base = 65;
    const sName = (displayServiceName || '').toLowerCase();
    if (sName.includes('dặm') || sName.includes('refill')) base = 50;
    if (booking.attributes?.hasUnderMink || sName.includes('mi dưới')) base += 25;
    return base;
  }, [booking, displayServiceName]);

  const targetSeconds = targetMinutes * 60;

  // 2. Khôi phục tiến độ từ Local Storage nếu có (Chống rớt mạng / vô tình thoát trang)
  const bookingId = booking.id;
  const progressElapsed = booking.progress?.elapsedSeconds;
  const startedAt = booking.progress?.startedAt;

  const [seconds, setSeconds] = useState<number>(() => {
    if (startedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }
    const cached = getLocalProgressSnapshot(bookingId);
    if (cached?.startedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(cached.startedAt).getTime()) / 1000));
    }
    if (cached && typeof cached.elapsedSeconds === 'number' && cached.elapsedSeconds > 0) {
      return cached.elapsedSeconds;
    }
    return progressElapsed || 0;
  });
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timerMode, setTimerMode] = useState<'COUNTDOWN' | 'ELAPSED'>('COUNTDOWN');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Lắng nghe trạng thái mạng để cảnh báo offline
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

  // Đồng bộ bước 9 vào local snapshot ngay khi mở màn hình Bấm giờ
  useEffect(() => {
    saveLocalProgressSnapshot(booking.id, {
      currentStep: 9,
      bookingId: booking.id,
      startedAt: booking.progress?.startedAt || new Date().toISOString(),
    });
  }, [booking.id, booking.progress?.startedAt]);

  // Timer loop & tự động lưu local snapshot (chạy ngầm tự động liên tục từ lúc bấm nhận ca / prepare)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          let next = prev + 1;
          if (booking.progress?.startedAt) {
            const realElapsed = Math.floor((Date.now() - new Date(booking.progress.startedAt).getTime()) / 1000);
            if (realElapsed > next) next = realElapsed;
          }
          if (next % 5 === 0) {
            saveLocalProgressSnapshot(booking.id, {
              elapsedSeconds: next,
              targetSeconds,
              isRunning: true,
              startedAt: booking.progress?.startedAt,
              bookingId: booking.id,
              serviceName: booking.serviceName,
              currentStep: 9,
            });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, booking.id, booking.progress?.startedAt, targetSeconds, booking.serviceName]);

  const formatTime = (totalSec: number) => {
    const absSec = Math.abs(totalSec);
    const hrs = Math.floor(absSec / 3600);
    const mins = Math.floor((absSec % 3600) / 60);
    const secs = absSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Tính toán thời gian còn lại (Countdown) & Quá giờ (Overtime)
  const remainingSeconds = targetSeconds - seconds;
  const isOvertime = remainingSeconds < 0;
  const progressPercent = Math.min(100, Math.round((seconds / targetSeconds) * 100));

  // Đánh giá tốc độ và tác động thăng hạng CVL theo chuẩn cv-speed-model
  const speedEvaluation = useMemo(() => {
    if (isOvertime) {
      return {
        level: 'SLOW',
        badge: '⚠️ Chậm tiến độ',
        title: 'Đã quá giờ cam kết',
        sub: (
          <span>
            Ảnh hưởng thăng hạng <CvFeather2Badge />
          </span>
        ),
        color: 'text-rose-600',
        bg: 'bg-rose-50 border-rose-200',
        ringColor: 'border-rose-500 shadow-rose-500/20',
      };
    }
    if (remainingSeconds <= 15 * 60) {
      return {
        level: 'WARNING',
        badge: '⚡ Gần hết giờ',
        title: 'Chuẩn bị hoàn tất (≤ 15p)',
        sub: 'Chải tơi mi & sấy khô',
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200',
        ringColor: 'border-amber-400 shadow-amber-500/20',
      };
    }
    return {
      level: 'FAST',
      badge: '🚀 Tốc độ xuất sắc',
      title: 'Đúng tiến độ cam kết',
      sub: (
        <span>
          Tích lũy điều kiện thăng cấp <CvFeather2Badge />
        </span>
      ),
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      ringColor: 'border-emerald-500 shadow-emerald-500/20',
    };
  }, [isOvertime, remainingSeconds]);

  const isComboNewFullSet =
    Boolean(booking?.comboLiveStatus?.isComboLive) &&
    (booking?.serviceType === 'Normal' ||
      Boolean(booking?.attributes?.overrideReason?.includes('gỡ toàn bộ')) ||
      Boolean(booking?.attributes?.overrideReason?.includes('Nối Mới Combo')));

  const bedLabel = booking.assignedBed || 'G03';
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      className={`flex-1 flex flex-col ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'} overflow-y-auto select-none`}
    >
      {/* 1. Header Navigation: Bỏ thông tin Giường và Online */}
      <IosNavigationBar
        title="Tiến Trình Nối Mi"
        onBack={onBack}
        backTitle="Ảnh Vệ Sinh"
        rightAction={
          isAdmin && onRevertToIncoming ? (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Admin: Bạn có chắc chắn muốn hủy ca làm của ${booking.customerName} và đưa về danh sách Chờ đón không?`
                  )
                ) {
                  onRevertToIncoming(booking.id);
                }
              }}
              className="text-rose-500 font-bold text-[12px] px-1 py-1 active:opacity-60 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Về Chờ đón</span>
            </button>
          ) : undefined
        }
      />

      {/* 2. Steps Subheader (Gom thành 1 thanh ngang Segmented Stepper chuẩn iOS) */}
      <LashServicingStepper activeStep={3} />

      {/* 3. Main Body */}
      <div className="flex-1 flex flex-col justify-around px-4 py-4 overflow-y-auto space-y-3">
        {/* Toggle Mode: Countdown vs Elapsed */}
        <div className="flex justify-center">
          <div
            className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white/90 border-neutral-200/80'} p-1 rounded-2xl border shadow-xs flex items-center gap-1`}
          >
            <button
              onClick={() => setTimerMode('COUNTDOWN')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'COUNTDOWN'
                  ? 'bg-[#FFB400] text-black shadow-xs'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-black'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Đếm Ngược (Còn Lại)</span>
            </button>
            <button
              onClick={() => setTimerMode('ELAPSED')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'ELAPSED'
                  ? isDark
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'bg-neutral-900 text-white shadow-xs'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-500 hover:text-black'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Đếm Xuôi (Đã Làm)</span>
            </button>
          </div>
        </div>

        {/* Big Circular Timer (Dinamically colored by speed / countdown state) */}
        <div className="flex flex-col justify-center items-center my-1">
          <div
            className={`w-[250px] h-[250px] rounded-full border-[7px] ${speedEvaluation.ringColor} ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'} flex flex-col items-center justify-center shadow-xl transition-all duration-300 relative`}
          >
            {/* Speed Pill on top of clock */}
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${speedEvaluation.bg} ${speedEvaluation.color} mb-1 border shadow-2xs`}
            >
              {speedEvaluation.badge}
            </span>

            {/* Sub label */}
            <span
              className={`text-[11.5px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-400'} uppercase tracking-wider`}
            >
              {timerMode === 'COUNTDOWN'
                ? isOvertime
                  ? 'QUÁ GIỜ CAM KẾT'
                  : 'THỜI GIAN CÒN LẠI'
                : 'THỜI GIAN ĐÃ PHỤC VỤ'}
            </span>

            {/* Big Digit Display */}
            <span
              className={`text-[46px] font-black tabular-nums tracking-tight my-0.5 leading-none ${
                isOvertime ? 'text-rose-500' : isDark ? 'text-white' : 'text-black'
              }`}
            >
              {timerMode === 'COUNTDOWN'
                ? isOvertime
                  ? `+${formatTime(Math.abs(remainingSeconds))}`
                  : formatTime(remainingSeconds)
                : formatTime(seconds)}
            </span>

            {/* Sub info: Dual indicator */}
            <div
              className={`flex items-center gap-1 mt-1 text-[11px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'} tabular-nums`}
            >
              <span>Đã làm: {formatTime(seconds)}</span>
              <span>/</span>
              <span className={`font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                {targetMinutes}:00
              </span>
            </div>

            {/* Live pulsing dot */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-500">
              <span
                className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`}
              />
              <span>{isRunning ? 'Đang chạy tự động' : 'Đang tạm dừng'}</span>
            </div>
          </div>
        </div>

        {/* Speed & Career Promotion Impact Card */}
        <div
          className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#1C1C1E] border-neutral-800' : speedEvaluation.bg} shadow-xs space-y-1 mx-1`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold ${speedEvaluation.color} flex items-center gap-1.5`}>
              <Zap className="w-3.5 h-3.5" />
              <span>{speedEvaluation.title}</span>
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'} tabular-nums`}>
              Tiến độ {progressPercent}%
            </span>
          </div>
          <p className={`text-[11.5px] ${isDark ? 'text-neutral-300' : 'text-neutral-600'} leading-snug font-medium`}>
            {speedEvaluation.sub}
          </p>
        </div>

        {/* Tech Invariant Banner: Ca Nối Mới Combo bắt buộc gỡ sạch 100% mi cũ */}
        {isComboNewFullSet && (
          <div
            className={`${isDark ? 'bg-amber-950/30 border-amber-600/70' : 'bg-amber-500/10 border-amber-500'} border-2 rounded-2xl p-3 flex items-start gap-2.5 mx-1 shadow-xs`}
          >
            <div
              className={`w-8 h-8 rounded-xl ${isDark ? 'bg-amber-500/30 text-amber-400' : 'bg-amber-500/20 text-amber-600'} flex items-center justify-center shrink-0 mt-0.5`}
            >
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[11.5px] font-black ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-tight`}
              >
                QUY CHUẨN KỸ THUẬT: CA TRỪ SUẤT NỐI MỚI (COMBO)
              </div>
              <div
                className={`text-[11px] font-bold ${isDark ? 'text-amber-200' : 'text-amber-950'} leading-snug mt-0.5`}
              >
                Chuyên viên BẮT BUỘC phải gỡ ra toàn bộ mi cũ và nối mới 100% cho khách hàng (không được dặm đè lên mi
                cũ khi trừ suất nối mới)!
              </div>
            </div>
          </div>
        )}

        {/* Progress Card (Lash Specs) */}
        <div
          className={`${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'} rounded-2xl p-3.5 shadow-sm border space-y-2 mx-1`}
        >
          <div className="flex items-center justify-between text-[13.5px]">
            <span className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>Dịch vụ đang làm</span>
            <div className="flex items-center gap-2">
              <span className={`${isDark ? 'text-white' : 'text-black'} font-extrabold`}>{displayServiceName}</span>
              {onEditService && (
                <button
                  type="button"
                  onClick={onEditService}
                  aria-label="Sửa thông số mi"
                  title="Sửa thông số mi"
                  className={`p-1 rounded-full ${isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'} border transition-colors flex items-center justify-center active:scale-95 cursor-pointer`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1 text-[11.5px]">
            <div className={`flex items-center justify-between ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              <span>Mi trên:</span>
              <span className={`font-bold ${isDark ? 'text-neutral-200' : 'text-gray-900'}`}>
                {[
                  booking?.attributes?.style || 'Natural',
                  (booking?.attributes?.curl || 'C').replace(/^Cong\s+/i, ''),
                  (booking?.attributes?.length || '10-12 mm').replace(/\s*mm/gi, ''),
                  (booking?.attributes?.thickness || '0.07 mm').replace(/\s*mm/gi, ''),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            {booking?.attributes?.hasUnderMink && (
              <div
                className={`flex items-center justify-between ${isDark ? 'text-purple-300 bg-purple-950/50 border-purple-800' : 'text-purple-700 bg-purple-50 border-purple-200'} rounded-lg px-2 py-1 border`}
              >
                <span className="font-bold text-[10.5px]">Mi dưới:</span>
                <span className={`font-black text-[11px] ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                  1D · {(booking?.attributes?.underMinkCurl || 'B').replace(/^Cong\s+/i, '')} ·{' '}
                  {(booking?.attributes?.underMinkThickness || '0.10').replace(/\s*mm/gi, '')} ·{' '}
                  {(booking?.attributes?.underMinkLength || '7').replace(/\s*mm/gi, '')} ·{' '}
                  {booking?.attributes?.underMinkCount || '30 sợi'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Pause/Resume (Admin Only) & Finish */}
        <div className="flex gap-2.5 pt-1 mx-1">
          {isAdmin && (
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`py-3.5 px-4 rounded-2xl font-bold text-[13.5px] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isRunning
                  ? isDark
                    ? 'bg-neutral-800 text-neutral-200'
                    : 'bg-[#E5E7EB] text-gray-800'
                  : 'bg-emerald-600 text-white shadow-md'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}</span>
            </button>
          )}
          <button
            onClick={onFinishTimer}
            className="flex-1 w-full py-4 px-4 rounded-2xl bg-[#FFB400] text-black font-black text-[14.5px] shadow-md active:scale-98 transition-transform text-center flex items-center justify-center gap-2 cursor-pointer uppercase tracking-tight"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>HOÀN TẤT NỐI MI & CHỤP AFTER</span>
          </button>
        </div>
      </div>
    </div>
  );
}
