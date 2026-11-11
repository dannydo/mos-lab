'use client';

import React from 'react';
import { Bell, BellRing, CheckCircle2, Share, PlusSquare, Smartphone, Sparkles, PhoneCall, X } from 'lucide-react';

export interface MosChatPushNotificationModalProps {
  open: boolean;
  onClose: () => void;
  isSupported: boolean;
  isIos: boolean;
  isStandalonePwa: boolean;
  needsIosHomeScreen: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribedCount: number;
  isLoading: boolean;
  testCountdown: number;
  onEnablePush: () => void;
  onDisablePush: () => void;
  onSendTestPush: () => void;
  onSendTestCallPush?: () => void;
}

export const MosChatPushNotificationModal: React.FC<MosChatPushNotificationModalProps> = ({
  open,
  onClose,
  isSupported,
  isIos,
  isStandalonePwa,
  needsIosHomeScreen,
  permission,
  isSubscribed,
  subscribedCount,
  isLoading,
  testCountdown,
  onEnablePush,
  onDisablePush,
  onSendTestPush,
  onSendTestCallPush,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10090] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl bg-[#111726] border border-white/15 text-white p-5 pb-7 sm:pb-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isSubscribed ? <BellRing size={22} /> : <Bell size={22} />}
            </div>
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">Chuông báo Cuộc gọi khi Khóa máy</div>
              <div className="text-[12px] text-white/60 mt-0.5">
                Nhận thông báo Tin nhắn riêng (DM), @Mention, Cuộc gọi &amp; BUZZ trên iPhone / MacBook
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Card */}
        <div
          className={`rounded-2xl p-3.5 border ${
            isSubscribed ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.04] border-white/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${isSubscribed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
              />
              <span className="text-[13px] font-semibold text-white">
                {isSubscribed ? 'Đã bật nhận cuộc gọi khi khóa màn hình' : 'Chưa bật trên thiết bị này'}
              </span>
            </div>
            {subscribedCount > 0 && (
              <span className="inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/80 tabular-nums">
                {subscribedCount} thiết bị
              </span>
            )}
          </div>
          <p className="text-[12px] text-white/65 mt-1.5 leading-relaxed mb-0">
            {isSubscribed
              ? 'Khi có tin nhắn riêng (DM), được @Mention, cuộc gọi đến hoặc BUZZ khẩn cấp, màn hình khóa sẽ sáng lên và báo ngay cả khi bạn đang thoát Safari.'
              : 'Bật tính năng này để nhận thông báo Tin nhắn riêng (DM), @Mention và cuộc gọi nội bộ ngay cả khi khóa màn hình iPhone hoặc chuyển sang ứng dụng khác.'}
          </p>
        </div>

        {/* iOS Safari Not-Added-To-Home-Screen Guide */}
        {needsIosHomeScreen && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-[13px]">
              <Smartphone size={16} />
              <span>Hướng dẫn 10 giây cho iPhone (Chuẩn Apple iOS)</span>
            </div>
            <p className="text-[12px] text-white/80 leading-relaxed mb-0">
              Trên iPhone, Apple yêu cầu mở <b>mOS</b> từ ngoài Màn hình chính để cấp quyền đổ chuông khi khóa máy
              (không cần cài qua App Store):
            </p>
            <div className="space-y-2 text-[12px] text-white/90">
              <div className="flex items-center gap-2.5 bg-black/25 rounded-xl px-3 py-2">
                <Share size={15} className="text-sky-400 shrink-0" />
                <span>
                  <b>Bước 1:</b> Bấm nút <b>Chia sẻ (Share)</b> ở thanh dưới cùng của Safari
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-black/25 rounded-xl px-3 py-2">
                <PlusSquare size={15} className="text-emerald-400 shrink-0" />
                <span>
                  <b>Bước 2:</b> Chọn <b>&ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)</b>
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-black/25 rounded-xl px-3 py-2">
                <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                <span>
                  <b>Bước 3:</b> Mở biểu tượng <b>mOS</b> ngoài màn hình chính và bấm nút Bật bên dưới!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied Warning */}
        {permission === 'denied' && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-[12px] text-rose-200">
            Trình duyệt đang chặn quyền Thông báo. Hãy vào <b>Cài đặt → Thông báo → mOS (hoặc Safari)</b> và bật{' '}
            <b>Cho phép thông báo</b>.
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {!isSubscribed ? (
            <button
              type="button"
              disabled={isLoading || (!isSupported && needsIosHomeScreen)}
              onClick={onEnablePush}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <BellRing size={18} />
              <span>{isLoading ? 'Đang kích hoạt...' : 'Bật thông báo cuộc gọi ngay'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              {onSendTestCallPush && (
                <button
                  type="button"
                  onClick={onSendTestCallPush}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <PhoneCall size={17} />
                  <span>📞 Bắn chuông gọi thử nghiệm ngay (Test Call)</span>
                </button>
              )}

              <button
                type="button"
                disabled={testCountdown > 0}
                onClick={onSendTestPush}
                className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 text-slate-950 font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer tabular-nums"
              >
                <Sparkles size={17} />
                <span>
                  {testCountdown > 0
                    ? `Hãy khóa màn hình iPhone ngay! Đang bắn sau ${testCountdown}s...`
                    : '📲 Test thử: Bấm rồi khóa màn hình iPhone (4 giây)'}
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={onDisablePush}
                className="w-full py-2.5 px-4 rounded-2xl bg-white/8 hover:bg-white/12 text-white/75 font-medium text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Tắt thông báo trên thiết bị này</span>
              </button>
            </div>
          )}
        </div>

        {isIos && isStandalonePwa && (
          <div className="text-[11px] text-emerald-400/80 text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>Đang chạy ở chế độ iOS Home Screen App chuẩn PWA</span>
          </div>
        )}
      </div>
    </div>
  );
};
