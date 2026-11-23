'use client';

import React from 'react';
import { safeParseDate } from './bookingsTabHelpers';

export interface BookingNotesPanelProps {
  booking: SafeAny;
  cleanNoteText: string;
  attachedNotes: SafeAny[];
  themeMode: 'light' | 'dark';
}

export const BookingNotesPanel: React.FC<BookingNotesPanelProps> = ({
  booking,
  cleanNoteText,
  attachedNotes,
  themeMode,
}) => {
  const hasBookingNote = Boolean(cleanNoteText && cleanNoteText.trim() !== '');
  const hasAttachedNotes = attachedNotes.length > 0;

  if (!hasBookingNote && !hasAttachedNotes) return null;

  const isDark = themeMode === 'dark';

  const filteredAttachedNotes = attachedNotes.filter(
    (n: SafeAny) => !hasBookingNote || (n.note || '').trim() !== (booking.bookingNote || '').trim()
  );

  return (
    <div
      className={`mt-2 flex flex-col gap-2 rounded-md border border-l-[3px] px-3 py-2 ${
        isDark
          ? 'border-slate-800 border-l-[var(--color-gold)] bg-slate-950'
          : 'border-slate-200 border-l-yellow-500 bg-slate-50'
      }`}
    >
      {hasBookingNote && (
        <div className={`flex items-start gap-1.5 text-[13px] ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          <span
            className={`mt-0.5 shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-bold ${
              isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            CC
          </span>
          <div className="flex-1">
            <strong className={isDark ? 'text-slate-100' : 'text-slate-800'}>
              {booking.ccInName || booking.ccOutName || booking.bookerStaffName || 'CC'}:
            </strong>
            <div
              className={`mt-0.5 whitespace-pre-wrap break-words italic leading-normal ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {cleanNoteText}
            </div>
          </div>
        </div>
      )}

      {filteredAttachedNotes.map((n: SafeAny) => {
        const isCcNote = n.noteFieldKey === 'order_note';
        const isCvlNote = n.noteFieldKey === 'cvl_note';
        const isPinned = Boolean(n.isSticky);
        const badgeLabel = isCcNote ? 'CC' : isCvlNote ? 'CVL' : isPinned ? 'Note' : 'CS';
        const staffAuthor = n.staffName || (isCcNote ? 'CC' : 'Nhân viên');
        const parsedNDate = safeParseDate(n.dateCreated);

        const badgeClasses = isPinned
          ? isDark
            ? 'bg-red-500/20 text-red-400'
            : 'bg-rose-50 text-red-600'
          : isCcNote
            ? isDark
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'bg-indigo-100 text-indigo-700'
            : isDark
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-emerald-100 text-emerald-700';

        return (
          <div
            key={n.id}
            className={`flex items-start gap-1.5 text-[13px] ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
          >
            <span className={`mt-0.5 shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-bold ${badgeClasses}`}>
              {badgeLabel}
            </span>
            <div className="flex-1">
              <strong className={isDark ? 'text-slate-100' : 'text-slate-800'}>
                {staffAuthor}
                {parsedNDate && (
                  <span className="ml-1 text-[11px] font-normal tabular-nums opacity-70">
                    ({parsedNDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
                  </span>
                )}
                :
              </strong>
              <div
                className={`mt-0.5 whitespace-pre-wrap break-words italic leading-normal ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {n.note}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
