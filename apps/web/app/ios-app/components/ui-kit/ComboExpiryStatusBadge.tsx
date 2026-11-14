'use client';

import React from 'react';
import { formatExpiryDateDdMmYyyy, formatExpiryDateShortDdMm, type ComboExpiryState } from '@mos-lab/shared';
import { AlertTriangle, CalendarClock, Snowflake } from 'lucide-react';

export interface ComboExpiryBadgeStatusInput {
  dateExpired?: string | null;
  isExpired?: boolean;
  isFrozen?: boolean;
  isExpiringSoon?: boolean;
  daysRemaining?: number | null;
  avgDaysPerSession?: number | null;
  expiryState?: ComboExpiryState | string;
  remainingSessions?: number;
}

export interface ComboExpiryStatusBadgeProps {
  status?: ComboExpiryBadgeStatusInput | null;
  compact?: boolean;
  showPace?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ComboExpiryStatusBadge({
  status,
  compact = false,
  showPace = false,
  theme = 'dark',
  className = '',
  onClick,
}: ComboExpiryStatusBadgeProps) {
  if (!status) return null;

  const remaining = Number(status.remainingSessions ?? 0);
  const isExpired = Boolean(status.isExpired || status.expiryState === 'EXPIRED');
  const isFrozen = Boolean(!isExpired && (status.isFrozen || status.expiryState === 'FROZEN'));
  const isExpiringSoon = Boolean(
    !isExpired && !isFrozen && (status.isExpiringSoon || status.expiryState === 'EXPIRING_SOON')
  );

  if (!isExpired && !isFrozen && !status.dateExpired && remaining <= 0) {
    return null;
  }

  const fullDate = formatExpiryDateDdMmYyyy(status.dateExpired);
  const shortDate = formatExpiryDateShortDdMm(status.dateExpired);
  const displayDate = compact ? shortDate || fullDate : fullDate;
  const paceStr =
    showPace && typeof status.avgDaysPerSession === 'number' && status.avgDaysPerSession > 0
      ? ` · Avg ${status.avgDaysPerSession}N/b`
      : '';

  const basePill =
    'inline-flex items-center justify-center gap-1 leading-none py-1 px-2 rounded-full font-extrabold tabular-nums select-none transition-all';

  let styleClass = '';
  let content: React.ReactNode = null;

  if (isExpired) {
    // Quy chuẩn Legacy iOS App: Hết hạn -> Nền ĐỎ ĐẶC chữ TRẮNG nổi bật tuyệt đối
    styleClass = 'bg-rose-600 text-white border border-rose-400 shadow-xs text-[10.5px]';
    content = (
      <>
        <AlertTriangle className="w-3 h-3 stroke-[2.5] shrink-0" />
        <span>HẾT HẠN {displayDate || 'COMBO'}</span>
      </>
    );
  } else if (isFrozen) {
    styleClass =
      theme === 'light'
        ? 'bg-sky-100 text-sky-900 border border-sky-300 text-[10.5px]'
        : 'bg-sky-950/80 text-sky-300 border border-sky-500/50 text-[10.5px]';
    content = (
      <>
        <Snowflake className="w-3 h-3 stroke-[2.3] shrink-0" />
        <span>Bảo lưu</span>
      </>
    );
  } else if (isExpiringSoon) {
    styleClass =
      theme === 'light'
        ? 'bg-amber-100 text-amber-950 border border-amber-400 text-[10.5px]'
        : 'bg-amber-950/80 text-amber-300 border border-amber-500/60 text-[10.5px]';
    const daysLabel =
      typeof status.daysRemaining === 'number' && status.daysRemaining >= 0
        ? `Còn ${status.daysRemaining}N`
        : 'Sắp hết';
    content = (
      <>
        <CalendarClock className="w-3 h-3 stroke-[2.3] shrink-0" />
        <span>
          {daysLabel}
          {displayDate ? ` · ${displayDate}` : ''}
          {paceStr}
        </span>
      </>
    );
  } else if (displayDate) {
    styleClass =
      theme === 'light'
        ? 'bg-neutral-100 text-neutral-800 border border-neutral-300 text-[10.5px]'
        : 'bg-[#18181B] text-neutral-300 border border-neutral-700/80 text-[10.5px]';
    content = (
      <>
        <CalendarClock
          className={`w-3 h-3 stroke-[2.1] shrink-0 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}
        />
        <span>
          HSD {displayDate}
          {paceStr}
        </span>
      </>
    );
  } else {
    return null;
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        title="Bấm để xem Chi tiết Gói Combo & Hạn sử dụng"
        className={`${basePill} ${styleClass} hover:brightness-110 active:scale-95 cursor-pointer ${className}`}
      >
        {content}
      </button>
    );
  }

  return <span className={`${basePill} ${styleClass} ${className}`}>{content}</span>;
}
