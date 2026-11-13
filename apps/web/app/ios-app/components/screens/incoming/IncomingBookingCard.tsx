'use client';

import React from 'react';
import {
  BookingItem,
  KNOWN_STAFF_AVATARS,
  resolveStaffAvatarUrl,
  resolveServicingSubStatus,
} from '../../../state/mockData';
import { ActiveActorProfile } from '../../../state/useIosAppState';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { parseDaysSinceLastVisit, resolveCustomerTypeMeta } from '../LashMaterialConstraintMatrix';
import {
  formatLashSpecLine,
  formatArrivalCountdownInMins,
  getBookingCompletionInfo,
  getDoneBookingSummary,
  formatShortMoney,
  formatTime24h,
} from './incomingBookingHelpers';
import { RotateCcw, Info, Package, Heart, Lock } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';

interface IncomingBookingCardProps {
  booking: BookingItem;
  idx: number;
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  activeServicingBooking?: BookingItem | null;
  dateOffset: number;
  now: Date;
  isCvll: boolean;
  isAdmin: boolean;
  actor?: ActiveActorProfile;
  onSelectBooking: (bookingId: number) => void;
  onResumeServicing?: (bookingId: number) => void;
  onOpenLockedModal: (attemptedCustomerName: string) => void;
  onOpenCustomerDetail: (b: BookingItem) => void;
  onOpenRevertModal: (bookingId: number, customerName: string) => void;
  onOpenWalletModal?: (b: BookingItem) => void;
}

export function IncomingBookingCard({
  booking: b,
  idx,
  bookingSegment,
  activeServicingBooking,
  dateOffset,
  now,
  isCvll,
  isAdmin,
  actor,
  onSelectBooking,
  onResumeServicing,
  onOpenLockedModal,
  onOpenCustomerDetail,
  onOpenRevertModal,
  onOpenWalletModal,
}: IncomingBookingCardProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
  const isComboExpired = Boolean(b.comboLiveStatus?.isExpired);
  const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

  const cleanCustomerName = (b.customerName || 'Khách Hàng').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const displayPhone = (b.customerPhone || '').replace(/\*+\s*/g, '').trim();
  const visits = b.customerVisits || 1;
  const typeMeta = resolveCustomerTypeMeta(b);
  const lastVisitDateStr = b.lastVisitDate || b.lashHistory?.[0]?.date;
  const viewRefDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dateOffset, 12, 0, 0);
  const viewRefDateStr = `${String(viewRefDate.getDate()).padStart(2, '0')}/${String(viewRefDate.getMonth() + 1).padStart(2, '0')}/${viewRefDate.getFullYear()}`;
  const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDateStr, viewRefDateStr);
  const daysText = visits > 1 && daysSinceLastVisit !== null ? ` · ${daysSinceLastVisit}N` : '';
  const isServicingActive = b.status === 'SERVICING' || bookingSegment === 'SERVICING';
  const countdown = formatArrivalCountdownInMins(b.time12h || b.timeSlot, dateOffset, now);
  const completionInfo = getBookingCompletionInfo(b, now);
  const isDone = bookingSegment === 'DONE' || b.status === 'DONE';
  const doneSummary = isDone ? getDoneBookingSummary(b) : null;

  const isCurrentActiveServicing = Boolean(
    activeServicingBooking && Number(b.id) === Number(activeServicingBooking.id)
  );
  const isOtherCustomerLocked = Boolean(
    activeServicingBooking && Number(b.id) !== Number(activeServicingBooking.id) && !isCvll && !isAdmin
  );

  // Avatar Ring Indicator
  let avatarRingClass = 'border-2 border-emerald-500'; // Not Combo Live
  if (isComboExpired) {
    avatarRingClass = 'border-2 border-rose-500 ring-2 ring-rose-500/35'; // Combo đã hết hạn
  } else if (isComboLive && remainingSessions > 0) {
    avatarRingClass =
      remainingSessions <= 2 || b.comboLiveStatus?.isExpiringSoon
        ? 'border-2 border-amber-400 ring-2 ring-amber-400/30' // Còn 1-2 lần hoặc sắp hết hạn
        : 'border-2 border-neutral-500'; // Combo Live bình thường
  }

  const isServicingOrDone = isServicingActive || isDone;

  // Khi ở tab Đang làm hoặc Đã xong, khách không còn là "Đang đợi đầu tua" nữa mà đã được nhận ca làm
  const isNextQueue =
    !isServicingOrDone &&
    (b.isNextQueueCustomer || b.isUnassignedQueue || b.bookingAccessTag === 'NEXT_QUEUE_CUSTOMER');

  const isBookedInAdvance = Boolean(
    b.isBookedInAdvance ??
    (!isNextQueue &&
      b.assignedStaffId &&
      b.assignedStaffId > 0 &&
      (b.customerNote?.toLowerCase().includes('book') ||
        b.customerNote?.toLowerCase().includes('chỉ định') ||
        b.bookingAccessTag === 'MY_BOOKED_CUSTOMER'))
  );

  // Xác định chính xác CV/CVL đang làm hoặc phục vụ ca này:
  const effectiveStaffId =
    b.assignedStaffId && b.assignedStaffId > 0
      ? b.assignedStaffId
      : b.checkInStaffId && b.checkInStaffId > 0
        ? b.checkInStaffId
        : isCurrentActiveServicing || isServicingOrDone
          ? actor?.staffId || 46272
          : undefined;

  const effectiveStaffName =
    b.assignedStaffName && b.assignedStaffName !== 'Chưa phân công' && b.assignedStaffName !== 'Chờ phân công (Đầu tua)'
      ? b.assignedStaffName
      : b.checkInStaffName
        ? b.checkInStaffName
        : isCurrentActiveServicing || isServicingOrDone
          ? actor?.name || 'Thảo Ly'
          : undefined;

  const cvStaffAvatar =
    resolveStaffAvatarUrl(b.assignedStaffAvatar, effectiveStaffId, effectiveStaffName) ||
    resolveStaffAvatarUrl(b.checkInStaffAvatar, effectiveStaffId, effectiveStaffName) ||
    (isCurrentActiveServicing && actor?.avatar ? actor.avatar : undefined) ||
    (effectiveStaffId ? KNOWN_STAFF_AVATARS[String(effectiveStaffId)] : undefined) ||
    (isServicingOrDone ? actor?.avatar || KNOWN_STAFF_AVATARS['46272'] : undefined);

  const cardInlineStyle: React.CSSProperties = isCurrentActiveServicing
    ? {
        backgroundColor: isDark ? '#221C0E' : 'rgba(245, 158, 11, 0.12)',
        borderColor: 'var(--mos-accent)',
        boxShadow: '0 0 0 2px var(--mos-focus-ring)',
      }
    : isOtherCustomerLocked
      ? {
          backgroundColor: 'var(--mos-surface-muted)',
          borderColor: 'var(--mos-surface-border)',
          opacity: 0.6,
          cursor: 'not-allowed',
        }
      : {
          backgroundColor: 'var(--mos-surface)',
          borderColor: 'var(--mos-surface-border)',
        };

  const servicingSubStatus = resolveServicingSubStatus(b);

  return (
    <div
      onClick={() => {
        if (isCurrentActiveServicing) {
          if (onResumeServicing) onResumeServicing(b.id);
          else onSelectBooking(b.id);
          return;
        }
        if (isOtherCustomerLocked) {
          onOpenLockedModal(b.customerName);
          return;
        }
        onSelectBooking(b.id);
      }}
      className={`rounded-2xl p-3 flex items-start gap-3 transition-all cursor-pointer shadow-xs select-none ${
        isCurrentActiveServicing ? 'border-2' : 'border active:opacity-90'
      }`}
      style={cardInlineStyle}
    >
      {/* 3.1 Avatar with Number Badge & Dual Corner Badges (Booker bottom-left & CV bottom-right) */}
      <div className="relative w-12 h-12 flex-shrink-0">
        {/* Badge số thứ tự 1, 2, 3... gắn ở góc trên bên trái của Avatar */}
        <span
          className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full border text-[9.5px] font-black flex items-center justify-center tabular-nums shadow-sm leading-none z-10"
          style={{
            backgroundColor: 'var(--mos-surface-raised, var(--mos-surface))',
            borderColor: 'var(--mos-surface-border-strong)',
            color: 'var(--mos-accent)',
          }}
        >
          {idx + 1}
        </span>

        <div
          className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-sm ${avatarRingClass}`}
          style={{ backgroundColor: 'var(--mos-surface-muted)' }}
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

        {/* Góc dưới bên trái: Avatar Người đặt lịch (Booker / Telesales) hoặc Logo 1 cánh trái Wings khi đặt online */}
        <div
          className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full overflow-hidden border border-neutral-700 bg-neutral-900 flex items-center justify-center shadow-md z-10"
          title={b.bookerName ? `Người đặt lịch: ${b.bookerName}` : 'Khách đặt lịch online (Wings)'}
        >
          {b.bookerAvatar ? (
            <img
              src={b.bookerAvatar}
              alt={b.bookerName || 'Booker'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#1A1500] flex items-center justify-center overflow-hidden">
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
                  : 'border border-neutral-500'
            } bg-neutral-900 flex items-center justify-center`}
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
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* 3.2 Middle: 4 Lines Standardized by Danny */}
      <div className="flex-1 min-w-0 pr-1 flex flex-col justify-start">
        {/* LINE 1: icon 123456 Tên khách (Không còn ****) */}
        <div className="flex items-center gap-1.5 truncate">
          <span
            className={`text-[12.5px] font-black flex-shrink-0 select-none ${typeMeta.colorClass}`}
            title={typeMeta.label}
          >
            {typeMeta.symbol}
          </span>
          {displayPhone ? (
            <span className="text-[12px] font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--mos-text-muted)' }}>
              {displayPhone}
            </span>
          ) : null}
          <span className="text-[14px] font-extrabold truncate tracking-tight" style={{ color: 'var(--mos-text)' }}>
            {cleanCustomerName}
          </span>
        </div>

        {/* LINE 2: HyperLight 5X 770 60 (Lược bỏ chi tiết cong, dày, dài) */}
        <div
          className="text-[11.5px] font-bold tracking-tight leading-tight mt-0.5 truncate"
          style={{ color: 'var(--mos-accent)' }}
        >
          {formatLashSpecLine(b)}
        </div>

        {/* LINE 3: [Combo Info + HSD nếu có] Lần X · 23N */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {((isComboLive && remainingSessions > 0) || (isComboExpired && remainingSessions > 0)) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWalletModal?.(b);
              }}
              title="Bấm để xem Chi tiết Gói Combo & Hạn sử dụng"
              className="shrink-0 inline-flex items-center cursor-pointer active:scale-95 transition-transform"
            >
              <ComboSessionBadge
                theme={themeMode}
                normalRemaining={b.comboLiveStatus?.normalRemaining}
                retainRemaining={b.comboLiveStatus?.retainRemaining}
                remainingSessions={remainingSessions}
                comboName={b.comboLiveStatus?.comboName}
              />
            </button>
          )}

          {(isComboLive || isComboExpired) && b.comboLiveStatus && (
            <ComboExpiryStatusBadge
              status={b.comboLiveStatus}
              compact
              onClick={onOpenWalletModal ? () => onOpenWalletModal(b) : undefined}
            />
          )}

          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--mos-text-muted)' }}>
            Lần {visits}
            {daysText}
          </span>

          {isOtherCustomerLocked && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold leading-none"
              style={{
                backgroundColor: 'var(--mos-surface-muted)',
                borderColor: 'var(--mos-surface-border)',
                color: 'var(--mos-text-muted)',
              }}
            >
              <Lock className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
              <span>Chưa thể check-in</span>
            </span>
          )}
        </div>

        {/* LINE 4: notes + Ký hiệu xem chi tiết duy nhất */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenCustomerDetail(b);
          }}
          className="text-[10.5px] leading-tight mt-1 line-clamp-1 italic font-normal cursor-pointer flex items-center justify-between group pt-0.5"
          style={{ color: 'var(--mos-text-muted)' }}
          title="Bấm để xem chi tiết ghi chú & thông tin khách hàng"
        >
          <span className="truncate">{b.customerNote ? `“${b.customerNote}”` : 'Hồ sơ & thông số khách'}</span>
          <span className="ml-1.5 shrink-0 not-italic flex items-center transition-colors" style={{ color: 'var(--mos-accent)' }}>
            <Info className="w-3.5 h-3.5 stroke-[2.2]" />
          </span>
        </div>
      </div>

      {/* 3.3 Right Column */}
      {isDone && doneSummary ? (
        <div
          className="w-[104px] flex-shrink-0 border-l pl-2.5 flex flex-col justify-center text-left self-stretch space-y-1"
          style={{ borderColor: 'var(--mos-surface-border)' }}
        >
          {/* TẦNG 1: THỜI GIAN (09:00 · 55p) */}
          <div className="text-[11px] font-bold tabular-nums tracking-tight leading-none" style={{ color: 'var(--mos-text-muted)' }}>
            {doneSummary.timeAndDurationStr}
          </div>

          {/* TẦNG 2: TIỀN (Quan trọng nhất: Nợ / Combo / Phụ thu / 0đ) */}
          <div className="flex items-center gap-1 leading-none flex-wrap">
            {doneSummary.hasDebt ? (
              <span className="text-rose-500 font-black text-[12.5px] tabular-nums tracking-tight animate-pulse inline-flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block mr-1" />-
                {formatShortMoney(doneSummary.debtAmount)}
              </span>
            ) : doneSummary.soldComboPrice > 0 ? (
              <span className="text-purple-500 font-black text-[12.5px] tabular-nums tracking-tight inline-flex items-center">
                <Package className="w-3.5 h-3.5 stroke-[2.2] text-purple-500 shrink-0 mr-1" />
                {formatShortMoney(doneSummary.soldComboPrice)}
              </span>
            ) : doneSummary.upgradeOrPaidAmount > 0 ? (
              <span className="text-emerald-500 font-black text-[12.5px] tabular-nums tracking-tight">
                +{formatShortMoney(doneSummary.upgradeOrPaidAmount)}
              </span>
            ) : (
              <span className="font-bold text-[12px] tabular-nums" style={{ color: 'var(--mos-text-muted)' }}>
                0đ
              </span>
            )}
          </div>

          {/* TẦNG 3: ĐIỂM CVL & TIP (↻ +41 pts · Heart 50K) */}
          <div
            className="text-[10px] font-bold tabular-nums tracking-tight leading-none whitespace-nowrap inline-flex items-center"
            style={{ color: 'var(--mos-accent)' }}
          >
            <span>↻ +{doneSummary.cvPoints}</span>
            {doneSummary.tipAmount > 0 ? (
              <span className="inline-flex items-center ml-0.5">
                p · <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400 shrink-0 mx-0.5" />
                {formatShortMoney(doneSummary.tipAmount)}
              </span>
            ) : (
              ' pts'
            )}
          </div>

          {doneSummary.settlementStatus === 'PENDING_COUNTER_SETTLEMENT' && (
            <div className="pt-0.5">
              <span
                className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded border text-[9px] font-extrabold tracking-tight ${
                  isDark
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                Chờ Quầy chốt
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-[88px] flex-shrink-0 border-l pl-2.5 flex flex-col justify-center text-left self-stretch"
          style={{ borderColor: 'var(--mos-surface-border)' }}
        >
          {/* HÀNG 1: THỜI GIAN 24H (Bỏ AM/PM để rộng chỗ) */}
          <span className="text-[14px] font-black tabular-nums leading-tight" style={{ color: 'var(--mos-accent)' }}>
            {isServicingActive ? completionInfo.completionTimeStr : formatTime24h(b.time12h || b.timeSlot)}
          </span>

          {/* HÀNG 2: BADGE TRẠNG THÁI (Checkout, Lashing, Cleaning,...) HOẶC COUNTDOWN KHI Ở CHỜ ĐÓN */}
          {bookingSegment === 'SERVICING' ? (
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border tracking-tight leading-none ${servicingSubStatus.colorClass}`}
              >
                {servicingSubStatus.label}
              </span>
            </div>
          ) : (
            <div
              className={`mt-1 text-[12px] font-extrabold tabular-nums tracking-tight leading-tight ${countdown.colorClass}`}
              title={
                countdown.diffMins !== null
                  ? countdown.diffMins >= 0
                    ? `Khách sẽ đến trong ${countdown.diffMins} phút`
                    : `Khách trễ ${Math.abs(countdown.diffMins)} phút`
                  : undefined
              }
            >
              {countdown.text}
            </div>
          )}

          {/* Nút Admin: Hoàn tác đưa khách hàng về Chờ đón (chỉ hiện khi Admin đang ở tab SERVICING) */}
          {b.status === 'SERVICING' && isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRevertModal(b.id, cleanCustomerName);
              }}
              className="mt-1.5 w-full py-1 px-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[9.5px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Quyền Admin: Trả khách hàng này về danh sách Chờ đón"
            >
              <RotateCcw className="w-2.5 h-2.5 shrink-0" />
              <span>Về Chờ đón</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
