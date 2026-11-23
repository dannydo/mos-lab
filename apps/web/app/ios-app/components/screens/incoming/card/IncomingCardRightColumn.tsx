'use client';

import React from 'react';
import { Heart, Package, RotateCcw } from 'lucide-react';
import type { BookingItem, resolveServicingSubStatus } from '../../../../state/mockData';
import {
  formatShortMoney,
  formatTime24h,
  getBookingCompletionInfo,
  getDoneBookingSummary,
  type formatArrivalCountdownInMins,
} from '../incomingBookingHelpers';

export interface IncomingCardRightColumnProps {
  booking: BookingItem;
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  isDark: boolean;
  isAdmin: boolean;
  isDone: boolean;
  isPendingPostAdj: boolean;
  isDoneCardPendingCounter: boolean;
  cleanCustomerName: string;
  doneSummary: ReturnType<typeof getDoneBookingSummary> | null;
  servicingSubStatus: ReturnType<typeof resolveServicingSubStatus>;
  completionInfo: ReturnType<typeof getBookingCompletionInfo>;
  countdown: ReturnType<typeof formatArrivalCountdownInMins>;
  onOpenRevertModal: (bookingId: number, customerName: string) => void;
}

export function IncomingCardRightColumn({
  booking: b,
  bookingSegment,
  isDark,
  isAdmin,
  isDone,
  isPendingPostAdj,
  isDoneCardPendingCounter,
  cleanCustomerName,
  doneSummary,
  servicingSubStatus,
  completionInfo,
  countdown,
  onOpenRevertModal,
}: IncomingCardRightColumnProps) {
  if (isDone && doneSummary) {
    return (
      <div className="w-[104px] flex-shrink-0 border-l border-[var(--mos-surface-border)] pl-2.5 flex flex-col justify-center items-end text-right self-stretch space-y-1 tabular-nums">
        {isDoneCardPendingCounter ? (
          <>
            {/* TẦNG 1: TRẠNG THÁI CHỜ QUẦY CHỐT (Pinned on top) */}
            <span
              className={`inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold tracking-tight whitespace-nowrap ${
                isDark
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isPendingPostAdj && !doneSummary.isPendingCheckout ? 'Chờ Quầy điều chỉnh' : 'Chờ Quầy chốt'}
            </span>

            {/* TẦNG 2: THỜI GIAN (09:00 · 84p) */}
            <div className="text-[11px] font-bold tabular-nums tracking-tight leading-none text-[var(--mos-text-muted)]">
              {doneSummary.timeAndDurationStr}
            </div>

            {/* TẦNG 3: SỐ TIỀN DỰ KIẾN THU (Ẩn +pts và Tip cho tới khi Quầy hoàn tất) */}
            <div className="flex items-center justify-end gap-1 leading-none">
              {doneSummary.hasDebt ? (
                <span
                  className={`font-black text-[12px] tabular-nums tracking-tight inline-flex items-center ${
                    isDark ? 'text-rose-400' : 'text-rose-600'
                  }`}
                >
                  -{formatShortMoney(doneSummary.debtAmount)}
                </span>
              ) : doneSummary.soldComboPrice > 0 ? (
                <span
                  className={`font-black text-[12px] tabular-nums tracking-tight inline-flex items-center ${
                    isDark ? 'text-purple-400' : 'text-purple-700'
                  }`}
                >
                  <Package className="w-3 h-3 stroke-[2.2] shrink-0 mr-1" />
                  {formatShortMoney(doneSummary.soldComboPrice)}
                </span>
              ) : doneSummary.upgradeOrPaidAmount > 0 ? (
                <span
                  className={`font-black text-[12px] tabular-nums tracking-tight ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  {formatShortMoney(doneSummary.upgradeOrPaidAmount)}
                </span>
              ) : (
                <span className="font-bold text-[11.5px] tabular-nums text-[var(--mos-text-muted)]">0đ</span>
              )}
            </div>
          </>
        ) : (
          <>
            {/* TẦNG 1: THỜI GIAN (09:00 · 84p) */}
            <div className="text-[11px] font-bold tabular-nums tracking-tight leading-none text-[var(--mos-text-muted)]">
              {doneSummary.timeAndDurationStr}
            </div>

            {/* TẦNG 2: TIỀN (Quan trọng nhất: Nợ / Combo / Phụ thu / 0đ) */}
            <div className="flex items-center justify-end gap-1 leading-none flex-wrap">
              {doneSummary.hasDebt ? (
                <span
                  className={`font-black text-[12.5px] tabular-nums tracking-tight animate-pulse inline-flex items-center ${
                    isDark ? 'text-rose-400' : 'text-rose-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block mr-1" />-
                  {formatShortMoney(doneSummary.debtAmount)}
                </span>
              ) : doneSummary.soldComboPrice > 0 ? (
                <span
                  className={`font-black text-[12.5px] tabular-nums tracking-tight inline-flex items-center ${
                    isDark ? 'text-purple-400' : 'text-purple-700'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 stroke-[2.2] shrink-0 mr-1" />
                  {formatShortMoney(doneSummary.soldComboPrice)}
                </span>
              ) : doneSummary.upgradeOrPaidAmount > 0 ? (
                <span
                  className={`font-black text-[12.5px] tabular-nums tracking-tight ${
                    isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  +{formatShortMoney(doneSummary.upgradeOrPaidAmount)}
                </span>
              ) : (
                <span className="font-bold text-[12px] tabular-nums text-[var(--mos-text-muted)]">0đ</span>
              )}
            </div>

            {/* TẦNG 3: ĐIỂM CVL & TIP (+41 pts · Heart 50K) */}
            <div className="text-[10px] font-bold tabular-nums tracking-tight leading-none whitespace-nowrap inline-flex items-center justify-end text-[var(--mos-accent)]">
              <span>↻ +{doneSummary.cvPoints}</span>
              {doneSummary.tipAmount > 0 ? (
                <span className="inline-flex items-center ml-0.5">
                  p ·{' '}
                  <Heart
                    className={`w-2.5 h-2.5 shrink-0 mx-0.5 ${
                      isDark ? 'fill-rose-400 text-rose-400' : 'fill-rose-600 text-rose-600'
                    }`}
                  />
                  {formatShortMoney(doneSummary.tipAmount)}
                </span>
              ) : (
                ' pts'
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-[104px] flex-shrink-0 border-l border-[var(--mos-surface-border)] pl-2.5 flex flex-col justify-center items-end text-right self-stretch tabular-nums">
      {bookingSegment === 'SERVICING' ? (
        <>
          {/* TẦNG 1: BADGE TRẠNG THÁI ĐANG LÀM (Check-in, Cleaning, Lashing, Survey, Checkout) */}
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black border tracking-tight leading-none whitespace-nowrap ${servicingSubStatus.colorClass}`}
          >
            {servicingSubStatus.label}
          </span>

          {/* TẦNG 2: THỜI GIAN DỰ KIẾN XONG + ĐẾM NGƯỢC */}
          <div className="mt-1 flex flex-col items-end leading-tight">
            <span className="text-[12.5px] font-black tabular-nums leading-tight text-[var(--mos-accent)]">
              Xong {completionInfo.completionTimeStr}
            </span>
            <span
              className={`mt-0.5 text-[10.5px] tabular-nums tracking-tight leading-none ${completionInfo.colorClass}`}
            >
              {completionInfo.shortCountdownText}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* TẦNG 1: GIỜ HẸN 24H */}
          <span className="text-[14px] font-black tabular-nums leading-tight text-[var(--mos-accent)]">
            {formatTime24h(b.time12h || b.timeSlot)}
          </span>

          {/* TẦNG 2: ĐẾM NGƯỢC GIỜ ĐẾN */}
          <div
            className={`mt-1 text-[11.5px] font-extrabold tabular-nums tracking-tight leading-tight ${countdown.colorClass}`}
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
        </>
      )}

      {/* Nút Admin: Hoàn tác đưa khách hàng về Chờ đón (chỉ hiện khi Admin đang ở tab SERVICING) */}
      {b.status === 'SERVICING' && isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenRevertModal(b.id, cleanCustomerName);
          }}
          className={`mt-1.5 inline-flex items-center justify-center gap-1 py-0.5 px-2 rounded-md border text-[9.5px] font-bold leading-none active:scale-95 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
            isDark
              ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
              : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700'
          }`}
          title="Quyền Admin: Trả khách hàng này về danh sách Chờ đón"
        >
          <RotateCcw className="w-2.5 h-2.5 shrink-0" />
          <span>Về Chờ đón</span>
        </button>
      )}
    </div>
  );
}
