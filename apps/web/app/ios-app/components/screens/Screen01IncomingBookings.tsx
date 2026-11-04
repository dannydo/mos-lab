'use client';

import React, { useState, useMemo } from 'react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile, BookingScopeMode, IosUserRole } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { resolveDisplayServiceName } from './LashMaterialConstraintMatrix';
import { Camera, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

interface Screen01IncomingBookingsProps {
  bookings: BookingItem[];
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  setBookingSegment: (seg: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL') => void;
  onSelectBooking: (bookingId: number) => void;
  activeServicingBooking?: BookingItem | null;
  onResumeServicing?: (bookingId: number) => void;
  counts?: SegmentCounts;
  isRefreshing?: boolean;
  lastRefreshedAt?: string | null;
  isLiveDb?: boolean;
  onRefreshDb?: () => void;
  role?: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  actor?: ActiveActorProfile;
  scopeMode?: BookingScopeMode;
  onScopeModeChange?: (scope: BookingScopeMode) => void;
  onOpenProfileMenu?: () => void;
}

function getStepShortTitle(step?: number): string {
  switch (step) {
    case 6:
      return 'Nhận ca';
    case 7:
      return 'Ảnh Before';
    case 8:
      return 'Ảnh Vệ Sinh';
    case 9:
      return 'Giờ Phục Vụ';
    case 10:
      return 'Ảnh After';
    case 11:
      return 'Khảo sát';
    case 12:
      return 'Tư vấn Dưỡng mi / Combo';
    case 13:
      return 'Thanh toán';
    case 14:
      return 'Ghi nhận Tip';
    case 15:
      return 'VietQR & Hoàn tất';
    default:
      return 'Tiến trình nối mi';
  }
}

export function Screen01IncomingBookings({
  bookings,
  bookingSegment,
  setBookingSegment,
  onSelectBooking,
  activeServicingBooking,
  onResumeServicing,
  counts,
  isRefreshing,
  onRefreshDb,
  role = 'CVL',
  actor,
  onOpenProfileMenu,
}: Screen01IncomingBookingsProps) {
  // Modal cảnh báo khi cố tình bấm check-in khách khác lúc đang có ca làm dở dang
  const [lockedCustomerModal, setLockedCustomerModal] = useState<{
    isOpen: boolean;
    attemptedCustomerName: string;
  } | null>(null);

  // 1. Quản lý ngày xem lịch hẹn (Hôm qua < Hôm nay > Ngày mai)
  const [dateOffset, setDateOffset] = useState<number>(0);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d;
  }, [dateOffset]);

  const dateLabel = useMemo(() => {
    if (dateOffset === 0) return 'Hôm nay';
    if (dateOffset === -1) return 'Hôm qua';
    if (dateOffset === 1) return 'Ngày mai';
    const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return dayNames[targetDate.getDay()];
  }, [dateOffset, targetDate]);

  const subDateLabel = useMemo(() => {
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }, [targetDate]);

  const filteredBookings = useMemo(() => {
    // Nếu chuyển sang ngày khác mà chưa có dữ liệu lịch hẹn mock cho ngày đó
    if (dateOffset !== 0) {
      return [];
    }

    return bookings.filter((b) => {
      if (bookingSegment === 'INCOMING') return b.status === 'INCOMING' || b.status === 'CHECKED_IN';
      if (bookingSegment === 'SERVICING') return b.status === 'SERVICING';
      if (bookingSegment === 'DONE') return b.status === 'DONE';
      return b.status === 'CANCELLED';
    });
  }, [bookings, bookingSegment, dateOffset]);

  const actorName = actor?.name || 'Thảo Ly';
  const isCvll = role === 'CVLL';

  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-hidden select-none">
      {/* 1. Single Native iOS Navigation Bar (Clean 1-row layout) */}
      <div className="h-12 px-3 bg-black border-b border-neutral-900 flex items-center justify-between z-10 flex-shrink-0">
        {/* Left: Tên chi nhánh viết tắt siêu gọn "ĐT" + Live Refresh Indicator */}
        <button
          onClick={onRefreshDb}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1C1C1E] border border-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Làm mới dữ liệu từ máy chủ (Chi nhánh Đề Thám · ĐT)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11.5px] font-black text-neutral-200 tracking-wider">ĐT</span>
          <RefreshCw className={`w-3 h-3 text-neutral-400 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Center: Chuyển ngày < Hôm nay > mượt mà */}
        <div className="flex items-center gap-0.5 bg-[#1C1C1E] px-1 py-0.5 rounded-full border border-neutral-800 shadow-inner">
          <button
            onClick={() => setDateOffset((prev) => prev - 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Xem ngày trước"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setDateOffset(0)}
            className="px-2 py-0.5 flex items-center gap-1.5 cursor-pointer active:opacity-75"
            title={dateOffset !== 0 ? 'Bấm để về lại Hôm nay' : undefined}
          >
            <span
              className={`text-[12px] font-black leading-tight ${
                dateOffset === 0 ? 'text-amber-400' : 'text-neutral-200'
              }`}
            >
              {dateLabel}
            </span>
            <span className="text-[10px] text-neutral-400 font-semibold tabular-nums leading-none">{subDateLabel}</span>
          </button>

          <button
            onClick={() => setDateOffset((prev) => prev + 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Xem ngày kế tiếp"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Right: Quick Profile Trigger (Tapping opens iOS Action Sheet) */}
        <button
          onClick={onOpenProfileMenu}
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-[#1C1C1E] border border-neutral-800 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Mở hồ sơ & chuyển vai trò"
        >
          <span className="text-[10.5px] font-black text-amber-400">{isCvll ? <CvFeather2Badge /> : 'CV🪶'}</span>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400/80 bg-neutral-800 shrink-0">
            <img
              src={actor?.avatar || 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png'}
              alt={actorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </button>
      </div>

      {/* 2. Native iOS Dark Segmented Control */}
      <div className="px-3 pt-2.5 pb-2 flex-shrink-0 bg-black">
        <div className="bg-[#1C1C1E] p-1 rounded-2xl border border-neutral-800/90 grid grid-cols-3 gap-1 shadow-inner">
          <button
            onClick={() => setBookingSegment('INCOMING')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'INCOMING'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Chờ đón</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'INCOMING' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.incoming ?? filteredBookings.length}
            </span>
          </button>

          <button
            onClick={() => setBookingSegment('SERVICING')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'SERVICING'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Đang làm</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'SERVICING' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.servicing ?? 0}
            </span>
          </button>

          <button
            onClick={() => setBookingSegment('DONE')}
            className={`py-1.5 px-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              bookingSegment === 'DONE'
                ? 'bg-[#2C2C2E] text-amber-400 shadow-sm font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Đã xong</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black tabular-nums leading-none ${
                bookingSegment === 'DONE' ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {counts?.done ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Customer Booking Cards (Số thứ tự đặt góc Avatar, không tốn diện tích card!) */}
      <div className="flex-1 bg-black overflow-y-auto px-3 py-1 space-y-2.5 pb-20">
        {/* Banner Ca Làm Đang Diễn Ra (Khóa không cho checkin người khác) */}
        {activeServicingBooking && (
          <div
            onClick={() => {
              if (onResumeServicing) onResumeServicing(activeServicingBooking.id);
              else onSelectBooking(activeServicingBooking.id);
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-[#252015] to-emerald-500/20 border-2 border-amber-400 shadow-xl cursor-pointer active:scale-98 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400 bg-neutral-900 shadow-md">
                  {activeServicingBooking.customerAvatar ? (
                    <img
                      src={activeServicingBooking.customerAvatar}
                      alt={activeServicingBooking.customerName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <img src="/ios-assets/no-image.png" alt="No image" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-black leading-none">
                    ⚡ ĐANG PHỤC VỤ
                  </span>
                  <span className="text-[10.5px] font-bold text-amber-300">
                    {getStepShortTitle(activeServicingBooking.progress?.currentStep)}
                  </span>
                </div>
                <div className="text-[14px] font-black text-white truncate mt-0.5">
                  {activeServicingBooking.customerName} · {resolveDisplayServiceName(activeServicingBooking)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-black text-[11.5px] shrink-0 active:scale-95 shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Vào ca</span>
              <span>→</span>
            </button>
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-xs px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1C1C1E] border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 text-base font-bold">
              🗓️
            </div>
            <p className="text-neutral-400 font-medium">
              {dateOffset !== 0
                ? `Chưa có lịch hẹn nào cho ngày ${subDateLabel} (${dateLabel}).`
                : isRefreshing
                  ? 'Đang đồng bộ dữ liệu từ hệ thống...'
                  : 'Hiện tại chưa có khách trong mục này.'}
            </p>
            {dateOffset !== 0 && (
              <button
                onClick={() => setDateOffset(0)}
                className="px-3.5 py-1.5 rounded-full bg-amber-400 text-black font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                Về lại Hôm nay
              </button>
            )}
          </div>
        ) : (
          filteredBookings.map((b, idx) => {
            const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
            const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

            const isCurrentActiveServicing = Boolean(activeServicingBooking && b.id === activeServicingBooking.id);
            const isOtherCustomerLocked = Boolean(activeServicingBooking && b.id !== activeServicingBooking.id);

            // Avatar Ring Indicator
            let avatarRingClass = 'border-2 border-emerald-500'; // Not Combo Live
            if (isComboLive && remainingSessions > 0) {
              avatarRingClass =
                remainingSessions <= 2
                  ? 'border-2 border-amber-400 ring-2 ring-amber-400/30' // Còn 1-2 lần
                  : 'border-2 border-neutral-500'; // Combo Live bình thường
            }

            const isNextQueue =
              b.isNextQueueCustomer || b.isUnassignedQueue || b.bookingAccessTag === 'NEXT_QUEUE_CUSTOMER';

            const cardBgStyle = isCurrentActiveServicing
              ? 'bg-[#221C0E] border-2 border-amber-400 ring-2 ring-amber-400/30'
              : isOtherCustomerLocked
                ? 'bg-[#18181A] opacity-60 border-neutral-800/80 cursor-not-allowed'
                : 'bg-[#1C1C1E] active:bg-[#2C2C2E] border border-neutral-800/90 hover:border-neutral-700';

            return (
              <div
                key={b.id}
                onClick={() => {
                  if (isCurrentActiveServicing) {
                    if (onResumeServicing) onResumeServicing(b.id);
                    else onSelectBooking(b.id);
                    return;
                  }
                  if (isOtherCustomerLocked) {
                    setLockedCustomerModal({
                      isOpen: true,
                      attemptedCustomerName: b.customerName,
                    });
                    return;
                  }
                  onSelectBooking(b.id);
                }}
                className={`rounded-2xl p-3 flex items-start gap-3 transition-all cursor-pointer shadow-xs select-none ${cardBgStyle}`}
              >
                {/* 3.1 Avatar with Number Badge directly attached to top-left (Zero card horizontal space lost!) */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  {/* Badge số thứ tự 1, 2, 3... gắn ở góc trên bên trái của Avatar */}
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2C2C2E] border border-neutral-700 text-[9.5px] font-black text-amber-400 flex items-center justify-center tabular-nums shadow-sm leading-none z-10">
                    {idx + 1}
                  </span>

                  <div
                    className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 shadow-sm ${avatarRingClass}`}
                  >
                    {b.customerAvatar ? (
                      <img
                        src={b.customerAvatar}
                        alt={b.customerName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Icon Camera chụp ảnh gắn góc dưới bên phải */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-neutral-800 bg-[#2C2C2E] flex items-center justify-center shadow-xs">
                    <Camera className="w-2.5 h-2.5 text-neutral-300" />
                  </div>
                </div>

                {/* 3.2 Middle: Customer Identity & Compact Icon Badges (Full Width!) */}
                <div className="flex-1 min-w-0 pr-1 flex flex-col justify-start">
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] flex-shrink-0 select-none">{b.customerTypeIcon || '🌟'}</span>
                    <span className="text-[14px] font-extrabold text-white truncate tracking-tight">
                      {b.customerName}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 font-medium leading-tight mt-0.5 tabular-nums">
                    {b.customerPhone} · Lần {b.customerVisits || 1}
                  </div>

                  {/* Badges Row: Icons instead of verbose words */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {isCurrentActiveServicing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black leading-none animate-pulse">
                        ⚡ Đang phục vụ
                      </span>
                    )}

                    {isOtherCustomerLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold leading-none">
                        🔒 Chưa thể check-in
                      </span>
                    )}

                    {!isCurrentActiveServicing && !isOtherCustomerLocked && isNextQueue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-extrabold leading-none">
                        ⚡ Đầu tua
                      </span>
                    )}

                    {!isCurrentActiveServicing && !isOtherCustomerLocked && !isNextQueue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold leading-none">
                        📌 Book riêng
                      </span>
                    )}

                    {isComboLive && remainingSessions > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                          remainingSessions <= 2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        💎 {remainingSessions} lượt
                      </span>
                    )}
                  </div>

                  {/* Compact Note Quote */}
                  {b.customerNote && (
                    <div className="text-[10.5px] text-neutral-400 leading-tight mt-1 line-clamp-1 italic font-normal">
                      &ldquo;{b.customerNote}&rdquo;
                    </div>
                  )}
                </div>

                {/* 3.3 Right Column: Appointment Time & Status Pill */}
                <div className="w-[105px] flex-shrink-0 border-l border-neutral-800/80 pl-2 flex flex-col justify-start text-left">
                  <span className="text-amber-400 text-[13.5px] font-black tabular-nums leading-tight">
                    {b.time12h || b.timeSlot}
                  </span>
                  <span
                    className="text-neutral-300 text-[11px] font-semibold truncate leading-tight mt-0.5"
                    title={resolveDisplayServiceName(b)}
                  >
                    {resolveDisplayServiceName(b)}
                  </span>
                  <span className="text-neutral-400 text-[10px] font-medium leading-tight mt-1 truncate">
                    Mi: {b.assignedStaffName || 'Thảo Ly'}
                  </span>

                  <div className="mt-1">
                    {b.status === 'DONE' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[9.5px] font-bold">
                        Đã xong
                      </span>
                    ) : b.status === 'SERVICING' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-bold">
                        Đang làm
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30 text-[9.5px] font-bold">
                        Chờ Check-in
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Cảnh Báo Khóa Check-in khi đang có ca làm dở dang */}
      {lockedCustomerModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[340px] bg-[#1C1C1E] border border-neutral-700 rounded-3xl p-5 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400/70 flex items-center justify-center mx-auto text-amber-400 text-2xl shadow-inner">
              🔒
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-extrabold text-[16px] tracking-tight">Đang Trong Ca Phục Vụ!</h3>
              <p className="text-neutral-300 text-[12.5px] leading-relaxed font-medium">
                Chuyên Viên đang phục vụ{' '}
                <strong className="text-amber-400">{activeServicingBooking?.customerName}</strong>.
              </p>
              <p className="text-neutral-400 text-[11.5px] leading-relaxed">
                Theo quy trình của Wings, bạn không thể check-in cho{' '}
                <strong className="text-white">{lockedCustomerModal.attemptedCustomerName}</strong> cho đến khi hoàn
                thành checkout cho ca làm hiện tại.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLockedCustomerModal(null);
                  if (activeServicingBooking && onResumeServicing) {
                    onResumeServicing(activeServicingBooking.id);
                  } else if (activeServicingBooking) {
                    onSelectBooking(activeServicingBooking.id);
                  }
                }}
                className="w-full py-3 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-black text-[13px] shadow-md active:scale-98 transition-all cursor-pointer"
              >
                Quay lại ca làm {activeServicingBooking?.customerName}
              </button>
              <button
                type="button"
                onClick={() => setLockedCustomerModal(null)}
                className="w-full py-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-neutral-300 font-bold text-[12px] active:scale-98 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
