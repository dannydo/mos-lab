'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Check, Gift, History, XCircle } from 'lucide-react';
import { StatusTag } from '~/components/ui';
import CalendarRescheduleIcon from '~/components/icons/CalendarRescheduleIcon';
import {
  formatBookingDateTime,
  getDaysDiffText,
  isBookingCompleted,
  parseBookingPromoInfo,
} from './bookingsTabHelpers';
import { BookingCycleBadge } from './BookingCycleBadge';
import { BookingLashSpecsPanel } from './BookingLashSpecsPanel';
import { BookingNotesPanel } from './BookingNotesPanel';
import { LegacyBookingStatusTags } from './LegacyBookingStatusTags';
import type { BookingCycleInfo } from './types';

export interface BookingCardProps {
  booking: SafeAny;
  attachedNotes: SafeAny[];
  cycleInfo?: BookingCycleInfo;
  hasCombo: boolean;
  themeMode: 'light' | 'dark';
  onOpenAudit: (booking: SafeAny) => void;
  onOpenCancel: (booking: SafeAny) => void;
  onRequestReschedule: (booking: SafeAny) => void | Promise<void>;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  attachedNotes,
  cycleInfo,
  hasCombo,
  themeMode,
  onOpenAudit,
  onOpenCancel,
  onRequestReschedule,
}) => {
  const isDark = themeMode === 'dark';
  const isCompleted = isBookingCompleted(booking.orderState);
  const formattedDate = formatBookingDateTime(booking.bookingDate);
  const promoInfo = parseBookingPromoInfo(booking.bookingNote, booking.promotionName || booking.campaignPromotion);

  const technicianDisplayName =
    booking.technicianName && booking.technicianName !== 'Kỹ thuật viên' && booking.technicianName !== 'Chuyên viên'
      ? booking.technicianName
      : '-';

  const cardContainerClasses = isCompleted
    ? isDark
      ? 'border-slate-700 border-l-4 border-l-green-500 bg-white/[0.02]'
      : 'border-gray-200 border-l-4 border-l-green-500 bg-gray-50'
    : isDark
      ? 'border-red-500 border-l-4 border-l-red-500 bg-red-500/[0.03] shadow-[0_0_10px_rgba(255,77,79,0.15)]'
      : 'border-red-500 border-l-4 border-l-red-500 bg-rose-50/70 shadow-[0_0_10px_rgba(255,77,79,0.15)]';

  return (
    <div className={`rounded-lg border p-3 ${cardContainerClasses}`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold">
            {booking.services && booking.services.length > 0 ? booking.services.join(', ') : 'Dịch vụ'}
          </span>
          <LegacyBookingStatusTags
            statuses={booking.serviceStatuses}
            hasLiveComboAtBooking={Boolean(booking.hasLiveComboAtBooking)}
            themeMode={themeMode}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {promoInfo.promoTitle && (
            <Tooltip title={promoInfo.fullPromoText || promoInfo.promoTitle}>
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-xs ${
                  isDark
                    ? 'border-purple-400/35 bg-purple-500/20 text-purple-300'
                    : 'border-purple-200 bg-purple-50 text-purple-700'
                }`}
              >
                <Gift className="h-3 w-3 shrink-0" />
                <span>{promoInfo.promoTitle}</span>
              </span>
            </Tooltip>
          )}

          <span className={`text-xs tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {formattedDate}
          </span>

          {booking.bookingDate && (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-sky-50 text-blue-700'
              }`}
            >
              {getDaysDiffText(booking.bookingDate)}
            </span>
          )}

          <BookingCycleBadge cycleInfo={cycleInfo} hasCombo={hasCombo} themeMode={themeMode} />

          {isCompleted ? (
            <Check className="h-4 w-4 stroke-[2.5] text-green-500" />
          ) : (
            <StatusTag status="error" label={booking.orderState} />
          )}
        </div>
      </div>

      <div className={`mt-1 flex flex-col gap-0.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        <div>
          CN: <strong>{booking.branchName || '-'}</strong> | CV: <strong>{technicianDisplayName}</strong>
        </div>
        <div className="flex flex-wrap gap-3 opacity-85">
          <span>
            CC IN: <strong>{booking.checkinStaffName || booking.ccInName || '-'}</strong>
          </span>
          <span>
            CC OUT: <strong>{booking.checkoutStaffName || booking.ccOutName || '-'}</strong>
          </span>
          <span>
            BK: <strong>{booking.bookerStaffName || booking.bookerName || '-'}</strong>
          </span>
        </div>
      </div>

      <BookingLashSpecsPanel specs={booking.lashSpecifications || booking.lashSpecs} themeMode={themeMode} />

      <BookingNotesPanel
        booking={booking}
        cleanNoteText={promoInfo.cleanBookingNote}
        attachedNotes={attachedNotes}
        themeMode={themeMode}
      />

      <div className="mt-2.5 flex justify-end gap-2">
        <Button
          type="default"
          size="small"
          icon={<History className="h-3.5 w-3.5" />}
          className="inline-flex items-center gap-1 rounded text-xs tabular-nums"
          onClick={() => onOpenAudit(booking)}
        >
          Nhật ký thao tác{booking.auditLogCount !== undefined ? ` (${booking.auditLogCount})` : ''}
        </Button>

        {!isCompleted && booking.orderState !== 'Cancelled' && (
          <>
            <Button
              type="default"
              danger
              size="small"
              icon={<XCircle className="h-3.5 w-3.5" />}
              className="inline-flex items-center gap-1 rounded font-semibold"
              onClick={() => onOpenCancel(booking)}
            >
              Hủy lịch
            </Button>

            <Button
              type="primary"
              size="small"
              icon={<CalendarRescheduleIcon fontSize={15} />}
              className="inline-flex items-center gap-1 rounded-md border-[var(--color-gold)] bg-[var(--color-gold)] font-bold text-slate-900 hover:opacity-90"
              onClick={() => {
                void onRequestReschedule(booking);
              }}
            >
              Đổi lịch / Cập nhật
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
