'use client';

import React, { useState } from 'react';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile, BookingScopeMode, IosUserRole } from '../../state/useIosAppState';
import { Calendar, ShoppingCart, Camera, Sparkles, Users, UserCheck } from 'lucide-react';

interface SegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

interface Screen01IncomingBookingsProps {
  bookings: BookingItem[];
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  setBookingSegment: (seg: any) => void;
  onSelectBooking: (bookingId: number) => void;
  counts?: SegmentCounts;
  isRefreshing?: boolean;
  lastRefreshedAt?: string | null;
  isLiveDb?: boolean;
  onRefreshDb?: () => void;
  role?: IosUserRole;
  onRoleChange?: (role: IosUserRole) => void;
  actor?: ActiveActorProfile;
  scopeMode?: BookingScopeMode;
  onScopeModeChange?: (scope: BookingScopeMode) => void;
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
  onRoleChange,
  actor,
  scopeMode = 'MY_CUSTOMERS',
  onScopeModeChange,
}: Screen01IncomingBookingsProps) {
  const [activeCategory, setActiveCategory] = useState<'LASHES' | 'SAUNA' | 'ALL'>('LASHES');

  const filteredBookings = bookings.filter((b) => {
    if (bookingSegment === 'INCOMING') return b.status === 'INCOMING' || b.status === 'CHECKED_IN';
    if (bookingSegment === 'SERVICING') return b.status === 'SERVICING';
    if (bookingSegment === 'DONE') return b.status === 'DONE';
    return b.status === 'CANCELLED';
  });

  const actorName = actor?.name || 'Thảo Ly';
  const actorTierBadge = role === 'CVLL' ? '🪶CV🪶' : role === 'CVL' ? 'CV🪶' : role;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Header Navigation Bar (Black background, Gold icons & title) */}
      <div className="bg-black h-11 px-3.5 flex items-center justify-between z-10 flex-shrink-0">
        <button
          onClick={onRefreshDb}
          className="text-[#FFB400] active:opacity-70 transition-opacity flex items-center gap-1.5"
          title="Làm mới dữ liệu từ MySQL"
        >
          <Calendar className="w-4.5 h-4.5" />
          <span className="text-[11px] font-bold text-amber-400/90">Đề Thám</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="bg-[#FFB400] text-black text-[11px] font-black px-2 py-0.5 rounded-full">
            {actorTierBadge}
          </span>
          <span className="text-white font-bold text-[13px] truncate max-w-[130px]">{actorName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshDb}
            className="text-[#FFB400] active:opacity-70 transition-opacity"
            title="Làm mới dữ liệu từ MySQL"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 1.5 Quick Role & Scope Bar for CV🪶 (1 Lông) & 🪶CV🪶 (2 Lông) */}
      <div className="bg-[#121214] px-3 py-2 border-b border-neutral-800 space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chế độ vận hành:</span>
          <div className="flex items-center gap-1">
            {(['CVL', 'CVLL', 'CC'] as const).map((r) => {
              const active = role === r;
              const label = r === 'CVL' ? 'CV🪶 (1 Lông)' : r === 'CVLL' ? '🪶CV🪶 (2 Lông)' : 'CC Sảnh';
              return (
                <button
                  key={r}
                  onClick={() => onRoleChange?.(r)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                    active ? 'bg-[#FFB400] text-black shadow-xs' : 'bg-[#2C2C2E] text-neutral-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {role === 'CVL' && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-[#FFB400] shrink-0" />
              <span>Khách của {actorName} (CV🪶 tự Tư vấn & Checkout)</span>
            </div>
            <span className="text-[#34C759] font-extrabold text-[10px] shrink-0">Tip + Thưởng Combo</span>
          </div>
        )}

        {role === 'CVLL' && (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              onClick={() => onScopeModeChange?.('MY_CUSTOMERS')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                scopeMode === 'MY_CUSTOMERS' ? 'bg-[#FFB400] text-black' : 'bg-[#2C2C2E] text-neutral-300'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Khách Của Tôi</span>
            </button>
            <button
              onClick={() => onScopeModeChange?.('STORE_ALL')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                scopeMode === 'STORE_ALL' ? 'bg-[#FFB400] text-black' : 'bg-[#2C2C2E] text-neutral-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Toàn Tiệm (Checkout Chéo)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Sub-navbar Row 1 (LASHES | SAUNA | ALL) */}
      <div className="bg-[#1C1C1E] h-8.5 px-4 flex items-center justify-around text-[12px] font-bold tracking-wider flex-shrink-0">
        <button
          onClick={() => setActiveCategory('LASHES')}
          className={`h-full flex items-center justify-center px-4 transition-colors ${
            activeCategory === 'LASHES'
              ? 'text-[#FFB400] border-b-2 border-[#FFB400]'
              : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          LASHES
        </button>
        <button
          onClick={() => setActiveCategory('SAUNA')}
          className={`h-full flex items-center justify-center px-4 transition-colors ${
            activeCategory === 'SAUNA'
              ? 'text-[#FFB400] border-b-2 border-[#FFB400]'
              : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          SAUNA
        </button>
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`h-full flex items-center justify-center px-4 transition-colors ${
            activeCategory === 'ALL' ? 'text-[#FFB400] border-b-2 border-[#FFB400]' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          ALL
        </button>
      </div>

      {/* 3. Sub-navbar Row 2 (INCOMING | SERVICING | DONE) */}
      <div className="bg-[#FFA000] h-9 grid grid-cols-3 items-center text-center font-bold text-[12px] tracking-wider flex-shrink-0 shadow-sm">
        <button
          onClick={() => setBookingSegment('INCOMING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'INCOMING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          INCOMING ({counts?.incoming ?? filteredBookings.length})
        </button>
        <button
          onClick={() => setBookingSegment('SERVICING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'SERVICING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          SERVICING ({counts?.servicing ?? 0})
        </button>
        <button
          onClick={() => setBookingSegment('DONE')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'DONE' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          DONE ({counts?.done ?? 0})
        </button>
      </div>

      {/* 3.1 Mini Avatar Ring Status Legend */}
      <div className="bg-[#F2F2F7] px-3 py-1 border-b border-[#E5E5EA] flex items-center justify-between text-[10px] text-[#636366]">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#34C759] bg-white inline-block" />
            <span>Not Combo</span>
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#8E8E93] bg-white inline-block" />
            <span>Combo Live</span>
          </span>
          <span className="flex items-center gap-1 font-bold text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#FF9500] bg-white inline-block" />
            <span>Còn 1-2 lần</span>
          </span>
        </div>
        <span className="text-[9.5px] text-[#8E8E93] font-medium">Viền avatar</span>
      </div>

      {/* 4. Booking List */}
      <div className="flex-1 bg-white overflow-y-auto divide-y divide-[#E5E5EA]">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-[#8E8E93] text-sm px-4">
            {isRefreshing
              ? 'Đang tải dữ liệu khách hàng từ cơ sở dữ liệu MySQL...'
              : 'Chưa có khách trong tab này. Hãy chọn tab INCOMING hoặc SERVICING.'}
          </div>
        ) : (
          filteredBookings.map((b, idx) => {
            const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
            const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

            // Quy tắc màu viền avatar (Avatar Ring Color Invariant theo chỉ đạo Danny):
            // -> vòng xanh quanh ngoài avatar -> not combo live
            // -> vòng xám -> combo live
            // -> còn 1-2 lần -> vòng vàng
            let avatarRingClass = 'border-[2.5px] border-[#34C759]'; // Vòng xanh (Not combo live)
            if (isComboLive && remainingSessions > 0) {
              if (remainingSessions <= 2) {
                avatarRingClass = 'border-[2.5px] border-[#FF9500] ring-1 ring-[#FF9500]/40'; // Vòng vàng (Còn 1-2 lần)
              } else {
                avatarRingClass = 'border-[2.5px] border-[#8E8E93]'; // Vòng xám (Combo live)
              }
            }

            return (
              <div
                key={b.id}
                onClick={() => onSelectBooking(b.id)}
                className="flex items-start px-3 py-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer border-b border-[#E5E5EA]"
              >
                {/* 4.1 Index Number */}
                <span className="text-[#C7C7CC] text-[17px] font-light w-4 pt-3 text-center flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                {/* 4.2 Avatar */}
                <div className="relative w-13 h-13 flex-shrink-0 mx-2">
                  {b.hasDiscountTag && (
                    <div className="absolute -top-1.5 -left-1.5 z-10 select-none text-[14px] leading-none drop-shadow-xs">
                      🏷️
                    </div>
                  )}

                  <div
                    className={`w-13 h-13 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-xs ${avatarRingClass}`}
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

                  <div className="absolute -bottom-1 -left-1 w-4.5 h-4.5 rounded-full border border-[#D1D1D6] bg-white flex items-center justify-center shadow-xs">
                    <Camera className="w-2.5 h-2.5 text-[#3A3A3C]" />
                  </div>
                </div>

                {/* 4.3 Center Info */}
                <div className="flex-1 min-w-0 pr-2 flex flex-col justify-start">
                  <div className="flex items-center space-x-1">
                    <span className="text-[13px] flex-shrink-0 select-none">{b.customerTypeIcon || '🔄'}</span>
                    <span className="text-[15px] font-bold text-black truncate tracking-tight">{b.customerName}</span>
                  </div>
                  <div className="text-[12px] text-[#636366] font-normal leading-tight mt-0.5 tabular-nums">
                    {b.customerPhone} · Lần {b.customerVisits || 1}
                  </div>

                  {/* Đã bỏ box Not Combo Live theo chỉ đạo anh Danny. Chỉ hiển thị nhẹ nhàng số lượt còn nếu đang có Combo Live */}
                  {isComboLive && remainingSessions > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          remainingSessions <= 2
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        💎 Còn {remainingSessions} lượt
                      </span>
                    </div>
                  )}

                  {b.customerNote && (
                    <div className="text-[11px] text-[#8E8E93] leading-[14px] mt-1 line-clamp-2 whitespace-pre-line font-normal">
                      {b.customerNote}
                    </div>
                  )}
                </div>

                {/* 4.4 Right Column */}
                <div className="w-[122px] flex-shrink-0 border-l border-[#FF3B30]/35 pl-2 flex flex-col justify-start text-left">
                  <span className="text-[#FF3B30] text-[13px] font-bold tabular-nums leading-tight">
                    {b.time12h || b.timeSlot}
                  </span>
                  <span
                    className="text-[#FF3B30] text-[11px] font-medium truncate leading-tight mt-0.5"
                    title={b.serviceName}
                  >
                    {b.serviceName}
                  </span>
                  <span className="text-[#1C1C1E] text-[10px] font-bold leading-tight mt-1 truncate">
                    Mi: {b.assignedStaffName || 'Thảo Ly'}
                  </span>
                  <span className="text-emerald-700 text-[10px] font-semibold truncate leading-tight mt-0.5">
                    {b.checkOutStaffName
                      ? `Out: ${b.checkOutStaffName}`
                      : b.checkInStaffName
                        ? `In: ${b.checkInStaffName}`
                        : 'Chờ Check-in'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
