'use client';

import React from 'react';
import { getCustomerBirthdayThisMonthStatus, isDoneBookingPendingPostCheckoutAdjustment } from '@mos-lab/shared';
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
} from './incomingBookingHelpers';
import { IncomingCardAvatarCluster } from './card/IncomingCardAvatarCluster';
import { IncomingCardRightColumn } from './card/IncomingCardRightColumn';
import { Info, Lock, Camera, PenLine, Cake } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';

export interface IncomingBookingCardProps {
  booking: BookingItem;
  idx: number;
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  activeServicingBooking?: BookingItem | null;
  dateOffset: number;
  now: Date;
  isCvll: boolean;
  canMultiCheckIn?: boolean;
  isAdmin: boolean;
  actor?: ActiveActorProfile;
  onSelectBooking: (bookingId: number) => void;
  onResumeServicing?: (bookingId: number) => void;
  onOpenLockedModal: (attemptedCustomerName: string) => void;
  onOpenCustomerDetail: (b: BookingItem) => void;
  onOpenCustomerNotes?: (b: BookingItem) => void;
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
  canMultiCheckIn = false,
  isAdmin,
  actor,
  onSelectBooking,
  onResumeServicing,
  onOpenLockedModal,
  onOpenCustomerDetail,
  onOpenCustomerNotes,
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
  const typeMeta = resolveCustomerTypeMeta(b, themeMode);
  const lastVisitDateStr = b.lastVisitDate || b.lashHistory?.[0]?.date;
  const viewRefDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dateOffset, 12, 0, 0);
  const viewRefDateStr = `${String(viewRefDate.getDate()).padStart(2, '0')}/${String(viewRefDate.getMonth() + 1).padStart(2, '0')}/${viewRefDate.getFullYear()}`;
  const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDateStr, viewRefDateStr);
  const daysText = visits > 1 && daysSinceLastVisit !== null ? ` · ${daysSinceLastVisit}N` : '';
  const isServicingActive = b.status === 'SERVICING' || bookingSegment === 'SERVICING';
  const birthdayStatus = getCustomerBirthdayThisMonthStatus(b.customerDateOfBirth, now);
  const countdown = formatArrivalCountdownInMins(b.time12h || b.timeSlot, dateOffset, now, isDark);
  const completionInfo = getBookingCompletionInfo(b, now, isDark);
  const isDone = bookingSegment === 'DONE' || b.status === 'DONE';
  const doneSummary = isDone ? getDoneBookingSummary(b) : null;
  const isPendingPostAdj = isDone && isDoneBookingPendingPostCheckoutAdjustment(b);
  const isDoneCardPendingCounter = Boolean(doneSummary && (doneSummary.isPendingCheckout || isPendingPostAdj));

  const isCurrentActiveServicing = Boolean(
    activeServicingBooking && Number(b.id) === Number(activeServicingBooking.id)
  );
  const isOtherCustomerLocked = Boolean(
    activeServicingBooking &&
    Number(b.id) !== Number(activeServicingBooking.id) &&
    !isCvll &&
    !isAdmin &&
    !canMultiCheckIn
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

  const servicingSubStatus = resolveServicingSubStatus(b, themeMode);
  const prog = b.progress;
  const todayPhotoCount = [
    prog?.beforePhotoUrl,
    prog?.cleanedPhotoUrl,
    prog?.afterPhotoUrl,
    prog?.underBeforePhotoUrl,
    prog?.underCleanedPhotoUrl,
    prog?.underAfterPhotoUrl,
  ].filter((u) => typeof u === 'string' && u.trim().length > 0 && !u.trim().startsWith('DECLINED:')).length;

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
      <IncomingCardAvatarCluster
        booking={b}
        idx={idx}
        isDark={isDark}
        avatarRingClass={avatarRingClass}
        birthdayStatus={birthdayStatus}
        cvStaffAvatar={cvStaffAvatar}
        effectiveStaffName={effectiveStaffName}
        isNextQueue={isNextQueue}
        isServicingOrDone={isServicingOrDone}
        isServicingActive={isServicingActive}
        isBookedInAdvance={isBookedInAdvance}
      />

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
            <span
              className="text-[12px] font-bold tabular-nums flex-shrink-0"
              style={{ color: 'var(--mos-text-muted)' }}
            >
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
              theme={themeMode}
              onClick={onOpenWalletModal ? () => onOpenWalletModal(b) : undefined}
            />
          )}

          <button
            type="button"
            data-testid={`card-open-portfolio-visit-${b.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCustomerDetail(b);
            }}
            className="text-[11px] font-semibold tabular-nums inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:opacity-80 active:scale-95 transition-all cursor-pointer border"
            style={{
              backgroundColor: 'var(--mos-surface-muted)',
              borderColor: 'var(--mos-surface-border)',
              color: 'var(--mos-text-muted)',
            }}
            title="Bấm để xem Hồ Sơ Ảnh & Lịch Sử Bộ Mi"
          >
            <Camera className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--mos-accent)' }} />
            <span>
              Lần {visits}
              {daysText}
            </span>
          </button>

          {birthdayStatus.isBirthdayThisMonth && (
            <span
              data-testid={`card-birthday-pill-${b.id}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10.5px] font-bold tabular-nums leading-none ${
                birthdayStatus.isBirthdayToday
                  ? isDark
                    ? 'bg-amber-500/25 border-amber-400/60 text-amber-300'
                    : 'bg-amber-100 border-amber-400 text-amber-800'
                  : isDark
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
              title={
                birthdayStatus.isBirthdayToday
                  ? `Hôm nay là sinh nhật khách hàng (${birthdayStatus.ddMm})`
                  : `Sinh nhật trong tháng này (${birthdayStatus.ddMm})`
              }
            >
              <Cake className="w-2.5 h-2.5 shrink-0" />
              <span>
                {birthdayStatus.isBirthdayToday ? `Hôm nay SN (${birthdayStatus.ddMm})` : `SN ${birthdayStatus.ddMm}`}
              </span>
            </span>
          )}

          {b.bookingAccessTag === 'MENTEE_CUSTOMER' && (
            <span
              data-testid={`card-mentee-pill-${b.id}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold leading-none bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/35"
            >
              <span>Mentee · {b.assignedStaffName || 'CVL'}</span>
            </span>
          )}

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

        {/* LINE 4: notes + Ký hiệu xem Hồ Sơ Ảnh & Bộ Mi */}
        <div
          data-testid={`card-open-portfolio-${b.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenCustomerDetail(b);
          }}
          className="text-[10.5px] leading-tight mt-1 line-clamp-1 italic font-normal cursor-pointer flex items-center justify-between group pt-0.5 gap-1.5"
          style={{ color: 'var(--mos-text-muted)' }}
          title="Bấm để xem ảnh Before/Cleaning/After & thông số bộ mi"
        >
          <span className="truncate">{b.customerNote ? `“${b.customerNote}”` : 'Ảnh B/C/A & bộ mi các lần trước'}</span>
          <div className="shrink-0 not-italic flex items-center gap-2 transition-colors">
            {isDone && b.customerId > 0 && onOpenCustomerNotes && (
              <button
                type="button"
                data-testid={`card-open-notes-${b.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCustomerNotes(b);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9.5px] font-bold leading-none cursor-pointer ${
                  (b.cvlNotes?.length || 0) > 0
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                    : isDark
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
                title="Ghi chú CVL"
              >
                <PenLine className="w-2.5 h-2.5" strokeWidth={1.9} />
                <span className="tabular-nums">{(b.cvlNotes?.length || 0) > 0 ? b.cvlNotes!.length : 'Note'}</span>
              </button>
            )}
            <span className="flex items-center gap-1" style={{ color: 'var(--mos-accent)' }}>
              <span className="text-[9.5px] font-extrabold tabular-nums">
                {todayPhotoCount > 0 ? `${todayPhotoCount} ảnh` : 'Bộ mi'}
              </span>
              <Info className="w-3.5 h-3.5 stroke-[2.2]" />
            </span>
          </div>
        </div>
      </div>

      <IncomingCardRightColumn
        booking={b}
        bookingSegment={bookingSegment}
        isDark={isDark}
        isAdmin={isAdmin}
        isDone={isDone}
        isPendingPostAdj={isPendingPostAdj}
        isDoneCardPendingCounter={isDoneCardPendingCounter}
        cleanCustomerName={cleanCustomerName}
        doneSummary={doneSummary}
        servicingSubStatus={servicingSubStatus}
        completionInfo={completionInfo}
        countdown={countdown}
        onOpenRevertModal={onOpenRevertModal}
      />
    </div>
  );
}
