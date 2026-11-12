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
}: IncomingBookingCardProps) {
  const isComboLive = Boolean(b.comboLiveStatus?.isComboLive);
  const remainingSessions = b.comboLiveStatus?.remainingSessions ?? 0;

  const cleanCustomerName = (b.customerName || 'Khách Hàng').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const displayPhone = (b.customerPhone || '').replace(/\*+\s*/g, '').trim();
  const visits = b.customerVisits || 1;
  const typeMeta = resolveCustomerTypeMeta(b);
  const lastVisitDateStr = b.lastVisitDate || b.lashHistory?.[0]?.date;
  const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDateStr);
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
  if (isComboLive && remainingSessions > 0) {
    avatarRingClass =
      remainingSessions <= 2
        ? 'border-2 border-amber-400 ring-2 ring-amber-400/30' // Còn 1-2 lần
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

  const cardBgStyle = isCurrentActiveServicing
    ? 'bg-[#221C0E] border-2 border-amber-400 ring-2 ring-amber-400/30'
    : isOtherCustomerLocked
      ? 'bg-[#18181A] opacity-60 border-neutral-800/80 cursor-not-allowed'
      : 'bg-[#1C1C1E] active:bg-[#2C2C2E] border border-neutral-800/90 hover:border-neutral-700';

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
      className={`rounded-2xl p-3 flex items-start gap-3 transition-all cursor-pointer shadow-xs select-none ${cardBgStyle}`}
    >
      {/* 3.1 Avatar with Number Badge & Dual Corner Badges (Booker bottom-left & CV bottom-right) */}
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
            <span className="text-[12px] text-neutral-400 font-bold tabular-nums flex-shrink-0">{displayPhone}</span>
          ) : null}
          <span className="text-[14px] font-extrabold text-white truncate tracking-tight">{cleanCustomerName}</span>
        </div>

        {/* LINE 2: HyperLight 5X 770 60 (Lược bỏ chi tiết cong, dày, dài) */}
        <div className="text-[11.5px] font-bold text-amber-400/90 tracking-tight leading-tight mt-0.5 truncate">
          {formatLashSpecLine(b)}
        </div>

        {/* LINE 3: [Combo Info nếu có] Lần X · 23N */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {isComboLive && remainingSessions > 0 && (
            <div className="shrink-0 flex items-center">
              <ComboSessionBadge
                normalRemaining={b.comboLiveStatus?.normalRemaining}
                retainRemaining={b.comboLiveStatus?.retainRemaining}
                remainingSessions={remainingSessions}
                comboName={b.comboLiveStatus?.comboName}
              />
            </div>
          )}

          <span className="text-[11px] text-neutral-400 font-medium tabular-nums">
            Lần {visits}
            {daysText}
          </span>

          {isOtherCustomerLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold leading-none">
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
          className="text-[10.5px] text-neutral-400 hover:text-amber-300 leading-tight mt-1 line-clamp-1 italic font-normal cursor-pointer flex items-center justify-between group pt-0.5"
          title="Bấm để xem chi tiết ghi chú & thông tin khách hàng"
        >
          <span className="truncate">{b.customerNote ? `“${b.customerNote}”` : 'Hồ sơ & thông số khách'}</span>
          <span className="ml-1.5 shrink-0 not-italic flex items-center text-amber-400/90 group-hover:text-amber-300 transition-colors">
            <Info className="w-3.5 h-3.5 stroke-[2.2]" />
          </span>
        </div>
      </div>

      {/* 3.3 Right Column */}
      {isDone && doneSummary ? (
        <div className="w-[104px] flex-shrink-0 border-l border-neutral-800/80 pl-2.5 flex flex-col justify-center text-left self-stretch space-y-1">
          {/* TẦNG 1: THỜI GIAN (09:00 · 55p) */}
          <div className="text-neutral-400 text-[11px] font-bold tabular-nums tracking-tight leading-none">
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
              <span className="text-purple-400 font-black text-[12.5px] tabular-nums tracking-tight inline-flex items-center">
                <Package className="w-3.5 h-3.5 stroke-[2.2] text-purple-400 shrink-0 mr-1" />
                {formatShortMoney(doneSummary.soldComboPrice)}
              </span>
            ) : doneSummary.upgradeOrPaidAmount > 0 ? (
              <span className="text-emerald-400 font-black text-[12.5px] tabular-nums tracking-tight">
                +{formatShortMoney(doneSummary.upgradeOrPaidAmount)}
              </span>
            ) : (
              <span className="text-neutral-400 font-bold text-[12px] tabular-nums">0đ</span>
            )}
          </div>

          {/* TẦNG 3: ĐIỂM CVL & TIP (↻ +41 pts · Heart 50K) */}
          <div className="text-[10px] font-bold text-amber-400 tabular-nums tracking-tight leading-none whitespace-nowrap inline-flex items-center">
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
              <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60 text-[9px] font-extrabold tracking-tight">
                Chờ Quầy chốt
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-[88px] flex-shrink-0 border-l border-neutral-800/80 pl-2.5 flex flex-col justify-center text-left self-stretch">
          {/* HÀNG 1: THỜI GIAN 24H (Bỏ AM/PM để rộng chỗ) */}
          <span className="text-amber-400 text-[14px] font-black tabular-nums leading-tight">
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
