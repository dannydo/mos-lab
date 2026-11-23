'use client';

import React from 'react';
import { isBookingCompleted, safeParseDate } from './bookingsTabHelpers';

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
  const isCompleted = isBookingCompleted(booking?.orderState);
  const directCcNote = isCompleted ? String(booking?.ccNote || '').trim() : '';

  const filteredAttachedNotes = attachedNotes.filter(
    (n: SafeAny) => !hasBookingNote || (n.note || '').trim() !== (booking.bookingNote || '').trim()
  );
  const hasAttachedCcNoteMatchingDirect =
    Boolean(directCcNote) &&
    filteredAttachedNotes.some(
      (n: SafeAny) => n.noteFieldKey === 'order_note' && String(n.note || '').trim() === directCcNote
    );
  const hasDirectCcNote = Boolean(directCcNote) && !hasAttachedCcNoteMatchingDirect;
  const hasAttachedNotes = filteredAttachedNotes.length > 0;

  if (!hasBookingNote && !hasAttachedNotes && !hasDirectCcNote) return null;

  const isDark = themeMode === 'dark';

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

      {hasDirectCcNote && (
        <div
          data-testid={`drawer-cc-note-${booking.id}`}
          className={`flex items-start gap-1.5 rounded border px-2 py-1.5 text-[13px] ${
            isDark
              ? 'border-indigo-500/30 bg-indigo-950/30 text-slate-200'
              : 'border-indigo-200 bg-indigo-50/70 text-slate-700'
          }`}
        >
          <span
            className={`mt-0.5 shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-bold ${
              isDark ? 'bg-indigo-500/25 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            CC
          </span>
          <div className="min-w-0 flex-1">
            <strong className={isDark ? 'text-slate-100' : 'text-slate-800'}>
              Ghi chú CC / Tư vấn viên
              {booking.ccNoteStaffName ? ` (${booking.ccNoteStaffName})` : ''}:
            </strong>
            <div
              className={`mt-0.5 whitespace-pre-line break-words touch-pan-y leading-normal ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {directCcNote}
            </div>
          </div>
        </div>
      )}

      {filteredAttachedNotes.map((n: SafeAny) => {
        const isCcNote = n.noteFieldKey === 'order_note';
        const isCvlNote = n.noteFieldKey === 'cvl_note';
        const isPinned = Boolean(n.isSticky);
        const badgeLabel = isCcNote ? 'CC' : isCvlNote ? 'CVL' : isPinned ? 'Note' : 'CS';
        const staffAuthor = isCcNote
          ? `Ghi chú CC / Tư vấn viên${n.staffName && n.staffName !== 'System' ? ` (${n.staffName})` : ''}`
          : n.staffName || 'Nhân viên';
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
            data-testid={isCcNote ? `drawer-cc-note-attached-${booking.id}-${n.id}` : undefined}
            className={`flex items-start gap-1.5 text-[13px] ${
              isCcNote
                ? isDark
                  ? 'rounded border border-indigo-500/30 bg-indigo-950/30 px-2 py-1.5 text-slate-200'
                  : 'rounded border border-indigo-200 bg-indigo-50/70 px-2 py-1.5 text-slate-700'
                : isDark
                  ? 'text-slate-300'
                  : 'text-gray-600'
            }`}
          >
            <span className={`mt-0.5 shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-bold ${badgeClasses}`}>
              {badgeLabel}
            </span>
            <div className="min-w-0 flex-1">
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
                className={`mt-0.5 whitespace-pre-line break-words touch-pan-y leading-normal ${
                  isCcNote ? '' : 'italic '
                }${isDark ? 'text-slate-200' : 'text-slate-700'}`}
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
