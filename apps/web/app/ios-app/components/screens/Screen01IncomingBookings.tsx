'use client';

import React, { useState } from 'react';
import { BookingItem } from '../../state/mockData';
import { Calendar, Phone, ShoppingCart, RotateCw, CheckCircle2, Camera } from 'lucide-react';

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
        <button
          onClick={onRefreshDb}
          className="text-[#FFB400] active:opacity-70 transition-opacity"
          title="Làm mới dữ liệu từ MySQL"
        >
          <Calendar className="w-5 h-5" />
        </button>
        <div className="text-[#FFB400] font-bold text-base tracking-wide">
          <span>De Tham</span>
        </div>
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onRefreshDb}
            className="text-[#FFB400] active:opacity-70 transition-opacity"
            title="Làm mới dữ liệu từ MySQL"
          >
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

      {/* 3. Sub-navbar Row 2 (INCOMING | SERVICING | DONE) - Amber Header Bar without count clutter */}
      <div className="bg-[#FFA000] h-9 grid grid-cols-3 items-center text-center font-bold text-[12px] tracking-wider flex-shrink-0 shadow-sm">
        <button
          onClick={() => setBookingSegment('INCOMING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'INCOMING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          INCOMING
        </button>
        <button
          onClick={() => setBookingSegment('SERVICING')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'SERVICING' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          SERVICING
        </button>
        <button
          onClick={() => setBookingSegment('DONE')}
          className={`h-full flex items-center justify-center uppercase transition-all px-1 ${
            bookingSegment === 'DONE' ? 'bg-[#FF9500] text-white font-black' : 'text-[#7C2D12] hover:text-white/80'
          }`}
        >
          DONE
        </button>
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
                className="flex items-start px-3 py-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer border-b border-[#E5E5EA]"
              >
                {/* 4.1 Index Number (iOS light thin font) */}
                <span className="text-[#C7C7CC] text-[18px] font-light w-4 pt-3 text-center flex-shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                {/* 4.2 Avatar with Green Border, Discount Tag & Camera Overlay */}
                <div className="relative w-14 h-14 flex-shrink-0 mx-2">
                  {/* Yellow Discount Tag top-left */}
                  {b.hasDiscountTag && (
                    <div className="absolute -top-1.5 -left-1.5 z-10 select-none text-[15px] leading-none drop-shadow-xs">
                      🏷️
                    </div>
                  )}

                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-xs ${
                      (b as any).customerAvatar ? 'border-2 border-[#34C759]' : 'border border-[#D1D1D6]'
                    }`}
                  >
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
                      <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Corner Camera Badge bottom-left */}
                  <div className="absolute -bottom-1 -left-1 w-4.5 h-4.5 rounded-full border border-[#D1D1D6] bg-white flex items-center justify-center shadow-xs">
                    <Camera className="w-2.5 h-2.5 text-[#3A3A3C]" />
                  </div>
                </div>

                {/* 4.3 Center Info (Customer Name with Emoji, Phone, Multi-line Notes) */}
                <div className="flex-1 min-w-0 pr-2 flex flex-col justify-start">
                  <div className="flex items-center space-x-1">
                    <span className="text-[13px] flex-shrink-0 select-none">{b.customerTypeIcon || '🔄'}</span>
                    <span className="text-[15px] font-bold text-black truncate tracking-tight">{b.customerName}</span>
                  </div>
                  <div className="text-[13px] text-[#636366] font-normal leading-tight mt-0.5 tabular-nums">
                    {b.customerPhone}
                  </div>
                  {b.customerNote && (
                    <div className="text-[11px] text-[#8E8E93] leading-[15px] mt-1 line-clamp-3 whitespace-pre-line font-normal">
                      {b.customerNote}
                    </div>
                  )}
                </div>

                {/* 4.4 Right Column (Red Line, Red Time, Red Service, Normal, Booker) */}
                <div className="w-[125px] flex-shrink-0 border-l border-[#FF3B30]/35 pl-2.5 flex flex-col justify-start text-left">
                  <span className="text-[#FF3B30] text-[14px] font-medium tabular-nums leading-tight">
                    {b.time12h || b.timeSlot}
                  </span>
                  <span
                    className="text-[#FF3B30] text-[12px] font-normal truncate leading-tight mt-1"
                    title={b.serviceName}
                  >
                    {b.serviceName}
                  </span>
                  <span className="text-[#8E8E93] text-[10px] leading-tight mt-0.5">{b.serviceType || 'Normal'}</span>
                  <span className="text-[#FFA000] text-[11px] font-medium truncate leading-tight mt-0.5">
                    {b.bookerName || 'Tư vấn'}
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
