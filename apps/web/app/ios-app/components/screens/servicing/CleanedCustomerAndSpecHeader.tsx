'use client';

import React from 'react';
import { BookingItem } from '../../../state/mockData';
import { ClipboardList } from 'lucide-react';

interface CleanedCustomerAndSpecHeaderProps {
  booking?: BookingItem;
  customerName: string;
  displayServiceName: string;
  lashSpecDetail: string;
  isRefill: boolean;
  isDark: boolean;
}

export function CleanedCustomerAndSpecHeader({
  booking,
  customerName,
  displayServiceName,
  lashSpecDetail,
  isRefill,
  isDark,
}: CleanedCustomerAndSpecHeaderProps) {
  return (
    <>
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
              <span className={`text-[8.5px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'} uppercase block`}>
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
    </>
  );
}
