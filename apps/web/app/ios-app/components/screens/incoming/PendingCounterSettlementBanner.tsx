'use client';

import React, { useMemo } from 'react';
import { Clock3, ArrowRight } from 'lucide-react';
import { BookingItem, isDoneBookingPendingCheckout } from '../../../state/mockData';
import { formatPendingCounterMethodShort, formatShortMoney, getDoneBookingSummary } from './incomingBookingHelpers';

export interface PendingCounterSettlementBannerProps {
  bookings: BookingItem[];
  bookingSegment: 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
  isDark: boolean;
  canDirectCounterSettle: boolean;
  onSelectDoneTab: () => void;
  onSelectBooking: (bookingId: number) => void;
}

/**
 * Hiển thị nhắc việc rõ ràng khi có ca đã checkout ở mOS (Tiền mặt/POS > 0đ do CVL thao tác)
 * nên app cũ WingsBeauty vẫn giữ ở trạng thái CheckOut chờ Quầy/CC xác nhận thu tiền.
 */
export function PendingCounterSettlementBanner({
  bookings,
  bookingSegment,
  isDark,
  canDirectCounterSettle,
  onSelectDoneTab,
  onSelectBooking,
}: PendingCounterSettlementBannerProps) {
  const summary = useMemo(() => {
    const pending = bookings.filter((b) => isDoneBookingPendingCheckout(b));
    if (pending.length === 0) return null;

    let totalCounterAmount = 0;
    let totalTipAmount = 0;
    for (const item of pending) {
      const done = getDoneBookingSummary(item);
      totalCounterAmount += done.pendingCounterAmount;
      totalTipAmount += done.tipAmount;
    }

    const first = pending[0];
    const firstMethod = formatPendingCounterMethodShort(first.billing?.paymentMethod);

    return {
      count: pending.length,
      firstId: first.id,
      firstName: first.customerName,
      firstMethod,
      totalCounterAmount,
      totalTipAmount,
    };
  }, [bookings]);

  if (!summary || bookingSegment === 'CANCEL') return null;

  const isOnDoneTab = bookingSegment === 'DONE';
  const tipSuffix = summary.totalTipAmount > 0 ? ` · Tip ${formatShortMoney(summary.totalTipAmount)}` : '';
  const amountLabel = formatShortMoney(summary.totalCounterAmount);

  const handleAction = () => {
    if (!isOnDoneTab) {
      onSelectDoneTab();
      return;
    }
    onSelectBooking(summary.firstId);
  };

  return (
    <div className="px-3 pb-1.5 flex-shrink-0" data-testid="pending-counter-settlement-banner">
      <button
        type="button"
        onClick={handleAction}
        className={`w-full rounded-xl border px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
          isDark
            ? 'bg-amber-950/50 hover:bg-amber-950/75 border-amber-700/60 text-amber-100'
            : 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-2 min-w-0">
          <Clock3 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
          <div className="min-w-0 leading-snug">
            <div className="text-[11.5px] font-extrabold truncate tabular-nums">
              {summary.count} ca Chờ Quầy chốt ({amountLabel}
              {tipSuffix})
            </div>
            <div className={`text-[10.5px] leading-tight mt-0.5 ${isDark ? 'text-amber-200/85' : 'text-amber-900/85'}`}>
              {canDirectCounterSettle
                ? `${summary.firstName}${summary.firstMethod ? ` (${summary.firstMethod})` : ''} đang ở CheckOut trên app cũ — bấm để Quầy thu tiền & hoàn tất.`
                : 'App cũ (WingsBeauty) giữ ở CheckOut tới khi Quầy/CC xác nhận thu Tiền mặt/POS.'}
            </div>
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap border ${
            isDark
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-amber-200/70 text-amber-900 border-amber-400/70'
          }`}
        >
          <span>{isOnDoneTab ? (canDirectCounterSettle ? 'Chốt ngay' : 'Mở bill') : 'Xem ca chờ'}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </button>
    </div>
  );
}
