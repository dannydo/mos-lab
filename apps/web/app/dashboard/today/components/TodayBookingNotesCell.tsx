'use client';

import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

export interface TodayBookingNotesCellProps {
  bookingNote?: string | null;
  ccNote?: string | null;
  ccNoteStaffName?: string | null;
  status?: string | null;
  isMobile?: boolean;
}

export const TodayBookingNotesCell: React.FC<TodayBookingNotesCellProps> = ({
  bookingNote,
  ccNote,
  ccNoteStaffName,
  status,
  isMobile = false,
}) => {
  const cleanBookingNote = String(bookingNote || '').trim();
  const isCompleted = status === 'completed';
  const cleanCcNote = isCompleted ? String(ccNote || '').trim() : '';

  if (!cleanBookingNote && !cleanCcNote) {
    return isMobile ? null : <Text type="secondary">-</Text>;
  }

  return (
    <div
      className={
        isMobile
          ? 'mt-1 flex flex-col gap-1.5 text-xs'
          : 'max-h-36 min-w-[180px] max-w-[280px] overflow-y-auto overscroll-contain touch-pan-y pr-1 flex flex-col gap-1.5 text-xs'
      }
    >
      {cleanBookingNote && (
        <div className="whitespace-pre-line break-words leading-snug text-slate-700 dark:text-slate-200">
          {cleanBookingNote}
        </div>
      )}

      {cleanCcNote && (
        <div className="rounded-md border border-indigo-200/80 bg-indigo-50/75 px-2 py-1.5 text-[11px] leading-relaxed text-slate-700 dark:border-indigo-500/30 dark:bg-indigo-950/35 dark:text-slate-200">
          <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1">
            <span className="inline-flex items-center rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300">
              Ghi chú CC / Tư vấn viên
            </span>
            {ccNoteStaffName && (
              <span className="text-[10px] font-medium text-indigo-700/80 dark:text-indigo-300/80">
                {ccNoteStaffName}
              </span>
            )}
          </div>
          <div className="whitespace-pre-line break-words select-text">{cleanCcNote}</div>
        </div>
      )}
    </div>
  );
};
