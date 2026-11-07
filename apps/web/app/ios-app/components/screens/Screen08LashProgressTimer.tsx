'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  // Đánh giá tốc độ và tác động thăng hạng CV🪶 theo chuẩn cv-speed-model
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

  const bedLabel = booking.assignedBed || 'G03';

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-y-auto select-none">
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
          <div className="bg-white/90 p-1 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setTimerMode('COUNTDOWN')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'COUNTDOWN' ? 'bg-[#FFB400] text-black shadow-xs' : 'text-neutral-500 hover:text-black'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Đếm Ngược (Còn Lại)</span>
            </button>
            <button
              onClick={() => setTimerMode('ELAPSED')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'ELAPSED' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-black'
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
            className={`w-[250px] h-[250px] rounded-full border-[7px] ${speedEvaluation.ringColor} bg-white flex flex-col items-center justify-center shadow-xl transition-all duration-300 relative`}
          >
            {/* Speed Pill on top of clock */}
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${speedEvaluation.bg} ${speedEvaluation.color} mb-1 border shadow-2xs`}
            >
              {speedEvaluation.badge}
            </span>

            {/* Sub label */}
            <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider">
              {timerMode === 'COUNTDOWN'
                ? isOvertime
                  ? 'QUÁ GIỜ CAM KẾT'
                  : 'THỜI GIAN CÒN LẠI'
                : 'THỜI GIAN ĐÃ PHỤC VỤ'}
            </span>

            {/* Big Digit Display */}
            <span
              className={`text-[46px] font-black tabular-nums tracking-tight my-0.5 leading-none ${
                isOvertime ? 'text-rose-600' : 'text-black'
              }`}
            >
              {timerMode === 'COUNTDOWN'
                ? isOvertime
                  ? `+${formatTime(Math.abs(remainingSeconds))}`
                  : formatTime(remainingSeconds)
                : formatTime(seconds)}
            </span>

            {/* Sub info: Dual indicator */}
            <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-neutral-500 tabular-nums">
              <span>Đã làm: {formatTime(seconds)}</span>
              <span>/</span>
              <span className="font-bold text-neutral-800">{targetMinutes}:00</span>
            </div>

            {/* Live pulsing dot */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-600">
              <span
                className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}
              />
              <span>{isRunning ? 'Đang chạy tự động' : 'Đang tạm dừng'}</span>
            </div>
          </div>
        </div>

        {/* Speed & Career Promotion Impact Card */}
        <div className={`rounded-2xl p-3.5 border ${speedEvaluation.bg} shadow-xs space-y-1 mx-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold ${speedEvaluation.color} flex items-center gap-1.5`}>
              <Zap className="w-3.5 h-3.5" />
              <span>{speedEvaluation.title}</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-500 tabular-nums">Tiến độ {progressPercent}%</span>
          </div>
          <p className="text-[11.5px] text-neutral-600 leading-snug font-medium">{speedEvaluation.sub}</p>
        </div>

        {/* Progress Card (Lash Specs) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-neutral-100 space-y-2 mx-1">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-gray-500 font-medium">Dịch vụ đang làm</span>
            <div className="flex items-center gap-2">
              <span className="text-black font-extrabold">{displayServiceName}</span>
              {onEditService && (
                <button
                  type="button"
                  onClick={onEditService}
                  aria-label="Sửa thông số mi"
                  title="Sửa thông số mi"
                  className="p-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1 text-[11.5px]">
            <div className="flex items-center justify-between text-gray-500">
              <span>Khay 1 · Mi trên:</span>
              <span className="font-bold text-gray-900">
                {[
                  booking?.attributes?.style || 'Natural',
                  booking?.attributes?.curl || 'C',
                  booking?.attributes?.length || '10-12 mm',
                  booking?.attributes?.thickness || '0.07 mm',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            {booking?.attributes?.hasUnderMink && (
              <div className="flex items-center justify-between text-purple-700 bg-purple-50 rounded-lg px-2 py-1 border border-purple-200">
                <span className="font-bold text-[10.5px]">Khay 2 · Mi dưới:</span>
                <span className="font-black text-[11px] text-purple-900">
                  1D · Cong {booking?.attributes?.underMinkCurl || 'B'} ·{' '}
                  {booking?.attributes?.underMinkThickness || '0.10 mm'} ·{' '}
                  {booking?.attributes?.underMinkLength || '7 mm'} · {booking?.attributes?.underMinkCount || '30 sợi'}
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
                isRunning ? 'bg-[#E5E7EB] text-gray-800' : 'bg-emerald-600 text-white shadow-md'
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
