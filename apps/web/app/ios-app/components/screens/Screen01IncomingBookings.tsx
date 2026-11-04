'use client';

import React from 'react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile, BookingScopeMode, IosUserRole } from '../../state/useIosAppState';
import { CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { Camera, RefreshCw } from 'lucide-react';

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

export function Screen01IncomingBookings({
  bookings,
  bookingSegment,
  setBookingSegment,
  onSelectBooking,
  counts,
  isRefreshing,
  onRefreshDb,
  role = 'CVL',
  actor,
  onOpenProfileMenu,
}: Screen01IncomingBookingsProps) {
  const filteredBookings = bookings.filter((b) => {
    if (bookingSegment === 'INCOMING') return b.status === 'INCOMING' || b.status === 'CHECKED_IN';
    if (bookingSegment === 'SERVICING') return b.status === 'SERVICING';
    if (bookingSegment === 'DONE') return b.status === 'DONE';
    return b.status === 'CANCELLED';
  });

  const actorName = actor?.name || 'Thảo Ly';
  const isCvll = role === 'CVLL';

  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-hidden select-none">
      {/* 1. Single Native iOS Navigation Bar (Clean 1-row layout) */}
      <div className="h-12 px-3.5 bg-black border-b border-neutral-900 flex items-center justify-between z-10 flex-shrink-0">
        {/* Left: Branch & Live Refresh Pill */}
        <button
          onClick={onRefreshDb}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1C1E] border border-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Làm mới dữ liệu từ máy chủ"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11.5px] font-bold text-neutral-200">Đề Thám</span>
          <RefreshCw className={`w-3 h-3 text-neutral-400 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Center: Clean Title */}
        <div className="flex flex-col items-center">
          <span className="text-[13px] font-black tracking-tight text-white">Lịch Hẹn Hôm Nay</span>
          <span className="text-[10px] text-neutral-400 tabular-nums">Hôm nay · Đang nhận khách</span>
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

      {/* 2. Native iOS Dark Segmented Control (Minimalist, zero clutter) */}
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

      {/* 3. Customer Booking Cards (Inset Grouped iOS Dark style) */}
      <div className="flex-1 bg-black overflow-y-auto px-3 py-1 space-y-2.5 pb-20">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-xs px-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              ✓
            </div>
            <p>{isRefreshing ? 'Đang đồng bộ dữ liệu từ hệ thống...' : 'Hiện tại chưa có khách trong mục này.'}</p>
          </div>
        ) : (
          filteredBookings.map((b, idx) => {
            const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
            const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

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

            return (
              <div
                key={b.id}
                onClick={() => onSelectBooking(b.id)}
                className="bg-[#1C1C1E] active:bg-[#2C2C2E] border border-neutral-800/90 rounded-2xl p-3 flex items-start gap-2.5 transition-all cursor-pointer shadow-xs select-none hover:border-neutral-700"
              >
                {/* 3.1 Numeric Index */}
                <span className="text-neutral-600 text-[13px] font-black w-3.5 pt-2 text-center flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                {/* 3.2 Avatar with Ring & Camera Icon */}
                <div className="relative w-12 h-12 flex-shrink-0">
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

                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-neutral-800 bg-[#2C2C2E] flex items-center justify-center shadow-xs">
                    <Camera className="w-2.5 h-2.5 text-neutral-300" />
                  </div>
                </div>

                {/* 3.3 Middle: Customer Identity & Compact Icon Badges */}
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
                    {isNextQueue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-extrabold leading-none">
                        ⚡ Đầu tua
                      </span>
                    ) : (
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

                {/* 3.4 Right Column: Appointment Time & Status Pill */}
                <div className="w-[105px] flex-shrink-0 border-l border-neutral-800/80 pl-2 flex flex-col justify-start text-left">
                  <span className="text-amber-400 text-[13.5px] font-black tabular-nums leading-tight">
                    {b.time12h || b.timeSlot}
                  </span>
                  <span
                    className="text-neutral-300 text-[11px] font-semibold truncate leading-tight mt-0.5"
                    title={b.serviceName}
                  >
                    {b.serviceName?.toLowerCase().includes('any') ? 'Chưa chọn mẫu mi' : b.serviceName}
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
    </div>
  );
}
