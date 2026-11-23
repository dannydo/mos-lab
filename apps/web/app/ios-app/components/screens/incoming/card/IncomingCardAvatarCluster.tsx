'use client';

import React from 'react';
import type { getCustomerBirthdayThisMonthStatus } from '@mos-lab/shared';
import type { BookingItem } from '../../../../state/mockData';

export interface IncomingCardAvatarClusterProps {
  booking: BookingItem;
  idx: number;
  isDark: boolean;
  avatarRingClass: string;
  birthdayStatus: ReturnType<typeof getCustomerBirthdayThisMonthStatus>;
  cvStaffAvatar?: string;
  effectiveStaffName?: string;
  isNextQueue: boolean;
  isServicingOrDone: boolean;
  isServicingActive: boolean;
  isBookedInAdvance: boolean;
}

export function IncomingCardAvatarCluster({
  booking: b,
  idx,
  isDark,
  avatarRingClass,
  birthdayStatus,
  cvStaffAvatar,
  effectiveStaffName,
  isNextQueue,
  isServicingOrDone,
  isServicingActive,
  isBookedInAdvance,
}: IncomingCardAvatarClusterProps) {
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      {/* Badge số thứ tự 1, 2, 3... gắn ở góc trên bên trái của Avatar */}
      <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full border text-[9.5px] font-black flex items-center justify-center tabular-nums shadow-sm leading-none z-10 bg-[var(--mos-surface-raised,var(--mos-surface))] border-[var(--mos-surface-border-strong)] text-[var(--mos-accent)]">
        {idx + 1}
      </span>

      {/* Badge ngày sinh nhật: góc trên bên phải Avatar khi khách sinh nhật trong tháng */}
      {birthdayStatus.isBirthdayThisMonth && (
        <span
          data-testid={`card-birthday-badge-${b.id}`}
          className={`absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full border-2 border-[var(--mos-accent)] bg-white text-neutral-950 text-[10px] font-black flex items-center justify-center tabular-nums shadow-md leading-none z-10 ${
            birthdayStatus.isBirthdayToday ? 'ring-2 ring-amber-400/60' : ''
          }`}
          title={
            birthdayStatus.isBirthdayToday
              ? `Hôm nay là sinh nhật khách hàng (${birthdayStatus.ddMm})`
              : `Sinh nhật trong tháng này (${birthdayStatus.ddMm})`
          }
        >
          {birthdayStatus.day}
        </span>
      )}

      <div
        className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-sm bg-[var(--mos-surface-muted)] ${avatarRingClass}`}
      >
        {b.customerAvatar ? (
          <img
            src={b.customerAvatar}
            alt={b.customerName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.classList.add('hidden');
            }}
          />
        ) : (
          <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Góc dưới bên trái: Avatar Người đặt lịch (Booker / Telesales) hoặc Logo 1 cánh trái Wings khi đặt online */}
      <div
        className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full overflow-hidden border flex items-center justify-center shadow-md z-10 ${
          isDark ? 'border-neutral-700 bg-neutral-900' : 'border-stone-300 bg-stone-50'
        }`}
        title={b.bookerName ? `Người đặt lịch: ${b.bookerName}` : 'Khách đặt lịch online (Wings)'}
      >
        {b.bookerAvatar ? (
          <img
            src={b.bookerAvatar}
            alt={b.bookerName || 'Booker'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.classList.add('hidden');
            }}
          />
        ) : (
          <div className="w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden">
            <img
              src="/images/combo-cards/wings-logo-gold.png"
              alt="Wings Online"
              className="w-[180%] max-w-none h-full object-cover object-left"
            />
          </div>
        )}
      </div>

      {/* Góc dưới bên phải: Avatar Chuyên Viên (CV/CVL) đang làm hoặc được phân công */}
      {cvStaffAvatar && (!isNextQueue || isServicingOrDone) && (
        <div
          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden shadow-md z-10 ${
            isBookedInAdvance
              ? 'border border-emerald-500 ring-1 ring-emerald-500/40'
              : isServicingActive
                ? 'border-2 border-amber-400 ring-1 ring-amber-400/50'
                : isDark
                  ? 'border border-neutral-500'
                  : 'border border-stone-400'
          } ${isDark ? 'bg-neutral-900' : 'bg-stone-50'} flex items-center justify-center`}
          title={
            isBookedInAdvance
              ? `Book riêng trước: ${effectiveStaffName || 'Chuyên Viên'}`
              : `Chuyên Viên: ${effectiveStaffName || 'Chuyên Viên'}`
          }
        >
          <img
            src={cvStaffAvatar}
            alt={effectiveStaffName || 'Chuyên Viên'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.classList.add('hidden');
            }}
          />
        </div>
      )}
    </div>
  );
}
