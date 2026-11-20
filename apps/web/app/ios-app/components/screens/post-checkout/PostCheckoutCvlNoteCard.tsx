'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { IosCustomerNoteItem } from '@mos-lab/shared';
import { CheckCircle2, Lock, PenLine, Pin, Plus } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import { PostCheckoutCvlNoteModal } from './PostCheckoutCvlNoteModal';

export interface PostCheckoutCvlNoteCardProps {
  booking: BookingItem;
  isDark: boolean;
  showStaffRewards: boolean;
  isSimulationMode?: boolean;
  onNoteCreated?: (note: IosCustomerNoteItem) => void;
}

export function PostCheckoutCvlNoteCard({
  booking,
  isDark,
  showStaffRewards,
  isSimulationMode = false,
  onNoteCreated,
}: PostCheckoutCvlNoteCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addedNotes, setAddedNotes] = useState<IosCustomerNoteItem[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setAddedNotes([]);
    setIsModalOpen(false);
    setSavedToast(false);
  }, [booking?.id]);

  const mergedCvlNotes = useMemo(() => {
    const base = booking?.cvlNotes || [];
    const seen = new Set<number>();
    const out: IosCustomerNoteItem[] = [];
    for (const item of [...addedNotes, ...base]) {
      if (item.id && seen.has(item.id)) continue;
      if (item.id) seen.add(item.id);
      out.push(item);
    }
    return out;
  }, [addedNotes, booking?.cvlNotes]);

  const customerId = Number(booking?.customerId || 0);
  if (!customerId || customerId <= 0) {
    return null;
  }

  const handleCreated = (created: IosCustomerNoteItem) => {
    setAddedNotes((prev) => [created, ...prev]);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
    onNoteCreated?.(created);
  };

  return (
    <>
      <div
        data-testid="post-checkout-cvl-note-card"
        className={`mt-2.5 rounded-2xl border p-3 space-y-2.5 transition-colors ${
          isDark ? 'bg-[#18181B] border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <PenLine className="w-3.5 h-3.5" strokeWidth={1.75} />
            </span>
            <div className="flex items-center gap-1.5 min-w-0 text-[12px] font-semibold">
              <span className="truncate">Ghi chú cho lần sau</span>
              {showStaffRewards ? (
                <span className="text-[11px] font-bold text-amber-500 tabular-nums shrink-0">
                  ({mergedCvlNotes.length})
                </span>
              ) : (
                <Lock
                  className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
                  strokeWidth={1.75}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="open-post-checkout-note-btn"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFB400] text-black text-[11.5px] font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer leading-none"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Thêm</span>
          </button>
        </div>

        {savedToast && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
            <span>Đã lưu ghi chú</span>
          </div>
        )}

        {showStaffRewards && mergedCvlNotes.length > 0 && (
          <div
            data-testid="post-checkout-cvl-notes-list"
            className={`space-y-2 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}
          >
            {mergedCvlNotes.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-2.5 space-y-1 ${
                  item.isSticky
                    ? isDark
                      ? 'border-amber-500/40 bg-amber-500/8'
                      : 'border-amber-400/60 bg-amber-50/70'
                    : isDark
                      ? 'border-neutral-800 bg-neutral-900/70'
                      : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold min-w-0">
                    <CvFeather1Badge className="text-[10px]" />
                    <span className="truncate">{item.staffName}</span>
                    {item.isSticky && <Pin className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2} />}
                  </div>
                  <span className={`tabular-nums shrink-0 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {item.dateDisplay}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed whitespace-pre-line">{item.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <PostCheckoutCvlNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerId={customerId}
        customerName={booking?.customerName || 'Khách hàng'}
        bookingId={booking?.id}
        orderNumber={booking?.orderNumber}
        isSimulationMode={isSimulationMode || Boolean(booking?.isSimulationBooking)}
        onNoteCreated={handleCreated}
      />
    </>
  );
}
