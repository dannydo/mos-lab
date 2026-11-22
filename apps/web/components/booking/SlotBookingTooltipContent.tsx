'use client';

import React, { useState } from 'react';
import { Avatar, Button } from 'antd';
import { Eye } from 'lucide-react';
import { maskPhoneNumber, shouldMaskCustomerPhone, type SlotBookingInfo } from '@mos-lab/shared';
import dayjs from 'dayjs';

export interface SlotBookingTooltipContentProps {
  booking: SlotBookingInfo;
  onOpenDetail: (booking: SlotBookingInfo) => void;
  themeMode: string;
}

export function SlotBookingTooltipContent({ booking, onOpenDetail, themeMode }: SlotBookingTooltipContentProps) {
  const isDark = themeMode === 'dark';
  const [copied, setCopied] = useState(false);
  const isMaskedRole =
    typeof window !== 'undefined'
      ? shouldMaskCustomerPhone(JSON.parse(window.localStorage.getItem('mos_user') || '{}')?.role)
      : true;
  const displayPhone = isMaskedRole ? maskPhoneNumber(booking.customerPhone) : booking.customerPhone;

  const handleCopy = (e: React.MouseEvent, text?: string | null) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-[340px] max-w-[90vw] rounded-xl p-4 text-xs leading-snug ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* 1. Header with customer avatar, name, phone, slot */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          size={42}
          src={booking.customerAvatar || undefined}
          className="bg-amber-500 text-white font-bold text-base border-2 border-amber-500 shrink-0"
        >
          {booking.customerName.trim().charAt(0).toUpperCase()}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {booking.customerName}
          </div>
          {displayPhone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                📞 {displayPhone}
              </span>
              {!isMaskedRole && (
                <Button
                  type="text"
                  size="small"
                  onClick={(e) => handleCopy(e, displayPhone)}
                  className={`h-[18px] px-1 text-[10px] ${
                    copied ? 'text-emerald-500' : isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {copied ? 'Đã chép' : 'Chép'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current booking info badge */}
      <div
        className={`rounded-lg px-2.5 py-2 mb-2.5 flex justify-between items-center border ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đang đặt vào slot:</div>
          <div className="font-semibold text-amber-500 text-xs">{booking.serviceName || 'Dịch vụ nối mi'}</div>
        </div>
        <div
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums border border-amber-500 text-amber-500 ${
            isDark ? 'bg-amber-500/20' : 'bg-amber-50'
          }`}
        >
          {booking.bookingTime} ({booking.duration}p)
        </div>
      </div>

      {/* 2. Chu kỳ giữa 2 lịch */}
      <div
        className={`rounded-lg px-2.5 py-2 mb-2.5 border border-amber-500/40 ${
          isDark ? 'bg-amber-500/12' : 'bg-amber-50/70'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            🔁 Chu kỳ giữa 2 lịch:
          </span>
          <span className={`font-bold text-[13px] tabular-nums ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            {booking.cycleDays !== null ? `${booking.cycleDays} ngày` : 'Khách mới'}
          </span>
        </div>
        {booking.nextBooking?.inDays && (
          <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-amber-900'}`}>
            📅 Lịch kế tiếp sau: <span className="tabular-nums font-semibold">{booking.nextBooking.inDays} ngày</span>
          </div>
        )}
      </div>

      {/* 3. Lịch vừa rồi và Lịch kế tiếp */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {/* Lịch vừa rồi */}
        <div
          className={`rounded-lg p-2 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ⏮️ Lịch vừa rồi
          </div>
          {booking.previousBooking ? (
            <div>
              <div className={`font-bold text-[11px] tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {dayjs(booking.previousBooking.date).format('DD/MM/YYYY')}
              </div>
              <div className="text-[11px] text-amber-500 truncate">{booking.previousBooking.serviceName}</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                CV: {booking.previousBooking.technicianName}
              </div>
            </div>
          ) : (
            <div className={`text-[11px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Chưa có lịch trước
            </div>
          )}
        </div>

        {/* Lịch kế tiếp */}
        <div
          className={`rounded-lg p-2 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ⏭️ Lịch kế tiếp
          </div>
          {booking.nextBooking ? (
            <div>
              <div className={`font-bold text-[11px] tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {dayjs(booking.nextBooking.date).format('DD/MM/YYYY')}
              </div>
              <div className="text-[11px] text-emerald-500 truncate">{booking.nextBooking.serviceName}</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                CV: {booking.nextBooking.technicianName}
              </div>
            </div>
          ) : (
            <div className={`text-[11px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Chưa đặt lịch tới
            </div>
          )}
        </div>
      </div>

      {/* 4. Bộ mi đã nối gần nhất và trượt xuống để xem những bộ kế tiếp */}
      <div className="mb-3">
        <div
          className={`text-[11px] font-bold mb-1.5 flex justify-between items-center ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>👁️ CÁC BỘ MI ĐÃ NỐI ({booking.recentLashSets?.length || 0})</span>
          <span className={`text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Cuộn xuống để xem
          </span>
        </div>

        <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1.5 pr-1">
          {!booking.recentLashSets || booking.recentLashSets.length === 0 ? (
            <div className={`text-[11px] py-1.5 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Chưa có dữ liệu bộ mi hoàn tất
            </div>
          ) : (
            booking.recentLashSets.map((set, idx) => (
              <div
                key={set.orderId}
                className={`rounded-md px-2 py-1.5 flex justify-between items-center gap-2 border ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold rounded-[3px] px-1 py-px">
                        Gần nhất
                      </span>
                    )}
                    <span className={`text-[11px] font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {set.serviceName}
                    </span>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className="tabular-nums">{dayjs(set.bookingDate).format('DD/MM/YYYY')}</span>
                    {' · '}CV: {set.technicianName}
                  </div>
                </div>

                {/* Photo indicator badges */}
                {set.beforePhotoUrl || set.afterPhotoUrl ? (
                  <span
                    className={`border border-cyan-500 text-cyan-500 rounded px-1.5 py-px text-[10px] font-semibold shrink-0 ${
                      isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'
                    }`}
                  >
                    📸 Có ảnh
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Detail button */}
      <Button
        type="primary"
        block
        icon={<Eye className="w-3.5 h-3.5" />}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail(booking);
        }}
        className="bg-gradient-to-br from-amber-500 to-amber-700 border-amber-700 font-semibold rounded-lg h-[34px] text-white"
      >
        Xem chi tiết &amp; ảnh Before / After
      </Button>
    </div>
  );
}
