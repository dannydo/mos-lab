'use client';

import React, { useState } from 'react';
import { BookingItem } from '../../state/mockData';
import { Calendar, Phone, ShoppingCart, RotateCw, CheckCircle2 } from 'lucide-react';

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
}

export function Screen01IncomingBookings({
  bookings,
  bookingSegment,
  setBookingSegment,
  onSelectBooking,
  counts,
  isRefreshing,
  lastRefreshedAt,
  isLiveDb,
  onRefreshDb,
}: Screen01IncomingBookingsProps) {
  const [activeCategory, setActiveCategory] = useState<'LASHES' | 'SAUNA' | 'ALL'>('LASHES');

  const filteredBookings = bookings.filter((b) => {
    if (bookingSegment === 'INCOMING') return b.status === 'INCOMING' || b.status === 'CHECKED_IN';
    if (bookingSegment === 'SERVICING') return b.status === 'SERVICING';
    if (bookingSegment === 'DONE') return b.status === 'DONE';
    return b.status === 'CANCELLED';
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none">
      {/* 1. Header Navigation Bar (Black background, Gold icons & title) */}
      <div className="bg-black h-11 px-4 flex items-center justify-between z-10 flex-shrink-0">
        <button className="text-[#FFB400] active:opacity-70 transition-opacity">
          <Calendar className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-1.5 text-[#FFB400] font-bold text-base tracking-wide">
          <span>De Tham</span>
          {isLiveDb && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" title="MySQL Live" />
          )}
        </div>
        <div className="flex items-center space-x-3.5">
          {/* Refresh DB Button */}
          <button
            onClick={onRefreshDb}
            disabled={isRefreshing}
            className={`text-[#FFB400] active:opacity-70 transition-all p-0.5 rounded-full ${
              isRefreshing ? 'opacity-80' : 'hover:bg-neutral-800'
            }`}
            title="Làm mới dữ liệu từ MySQL"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="text-[#FFB400] active:opacity-70 transition-opacity">
            <Phone className="w-5 h-5" />
          </button>
          <button className="text-[#FFB400] active:opacity-70 transition-opacity">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Sub-navbar Row 1 (LASHES | SAUNA | ALL) */}
      <div className="bg-[#1C1C1E] h-9 px-4 flex items-center justify-around text-[13px] font-bold tracking-wider flex-shrink-0">
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

      {/* 3. Sub-navbar Row 2 (INCOMING | SERVICING | DONE) - Amber Header Bar with dynamic counts */}
      <div className="bg-[#FFA000] h-9 grid grid-cols-3 items-center text-center font-bold text-[12px] tracking-wider flex-shrink-0 shadow-sm">
        <button
          onClick={() => setBookingSegment('INCOMING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'INCOMING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          INCOMING {counts?.incoming !== undefined ? `(${counts.incoming})` : ''}
        </button>
        <button
          onClick={() => setBookingSegment('SERVICING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'SERVICING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          SERVICING {counts?.servicing !== undefined ? `(${counts.servicing})` : ''}
        </button>
        <button
          onClick={() => setBookingSegment('DONE')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'DONE' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          DONE {counts?.done !== undefined ? `(${counts.done})` : ''}
        </button>
      </div>

      {/* 3.1 Live DB Freshness Status Bar */}
      <div className="bg-[#F8F9FA] border-b border-[#E5E5EA] px-3 py-1 flex items-center justify-between text-[11px] text-[#636366]">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="font-semibold text-[#1C1C1E]">Live MySQL</span>
          <span>•</span>
          <span className="truncate">Chi nhánh Đề Thám</span>
        </div>
        <div className="flex items-center space-x-1 text-[10px] text-[#8E8E93]">
          {isRefreshing ? (
            <span className="text-[#FF9500] font-medium flex items-center gap-1">
              <RotateCw className="w-2.5 h-2.5 animate-spin" />
              Đang làm mới...
            </span>
          ) : lastRefreshedAt ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              Làm mới lúc {lastRefreshedAt}
            </span>
          ) : null}
        </div>
      </div>

      {/* 4. Booking List (Pure White background, hair-line dividers) */}
      <div className="flex-1 bg-white overflow-y-auto divide-y divide-[#E5E5EA]">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-[#8E8E93] text-sm">
            {isRefreshing ? 'Đang tải dữ liệu từ cơ sở dữ liệu MySQL...' : 'Không có lịch hẹn trong mục này'}
          </div>
        ) : (
          filteredBookings.map((b, idx) => {
            return (
              <div
                key={b.id}
                onClick={() => onSelectBooking(b.id)}
                className="flex items-center px-3 py-2.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
              >
                {/* 4.1 Index Number */}
                <span className="text-[#C7C7CC] text-[18px] font-light w-5 text-center flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                {/* 4.2 Avatar with Green Border and Badges */}
                <div className="relative w-14 h-14 flex-shrink-0 mx-2">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-[#34C759] bg-neutral-100 shadow-xs">
                    {(b as any).customerAvatar ? (
                      <img
                        src={(b as any).customerAvatar}
                        alt={b.customerName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#f4ece1] flex items-center justify-center text-[#78350f] font-bold text-base">
                        {b.customerName ? b.customerName.charAt(0) : 'K'}
                      </div>
                    )}
                  </div>

                  {/* Visit count badge top-right */}
                  {b.customerVisits > 1 && (
                    <span className="absolute -top-1 -right-1 bg-white border border-neutral-300 rounded-full px-1.5 text-[9px] font-bold text-black shadow-xs leading-tight">
                      {b.customerVisits}
                    </span>
                  )}

                  {/* Corner overlapping badge bottom-left */}
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full overflow-hidden border border-white bg-neutral-700 flex items-center justify-center text-[10px] text-white shadow-xs">
                    {(b as any).assignedStaffAvatar ? (
                      <img src={(b as any).assignedStaffAvatar} alt="staff" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px]">📷</span>
                    )}
                  </div>
                </div>

                {/* 4.3 Center Info (Customer Name, Phone, Notes) */}
                <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs flex-shrink-0">{(b as any).customerEmoji || '🔄'}</span>
                    <span className="text-[14px] font-bold text-black truncate tracking-tight">{b.customerName}</span>
                  </div>
                  <div className="text-[12px] text-[#8E8E93] font-medium leading-tight mt-0.5 tabular-nums">
                    {b.customerPhone}
                  </div>
                  {b.customerNote && (
                    <div className="text-[10px] text-[#8E8E93] leading-[13px] mt-0.5 line-clamp-3 whitespace-pre-line">
                      {b.customerNote}
                    </div>
                  )}
                </div>

                {/* 4.4 Right Column (Red Line, Red Time, Red Service, Normal, Booker) */}
                <div className="w-[110px] flex-shrink-0 border-l border-[#FF3B30] pl-2 flex flex-col justify-center text-left">
                  <span className="text-[#FF3B30] text-[12px] font-normal tabular-nums leading-tight">
                    {b.timeSlot}
                  </span>
                  <span
                    className="text-[#FF3B30] text-[11px] font-normal truncate leading-tight mt-0.5"
                    title={b.serviceName}
                  >
                    {b.serviceName}
                  </span>
                  <span className="text-[#8E8E93] text-[10px] leading-tight mt-0.5">Normal</span>
                  <span className="text-[#FF9500] text-[10px] font-medium truncate leading-tight mt-0.5">
                    {(b as any).bookerName || 'Thuỳ Trang 🌸'}
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
