'use client';

import React from 'react';
import type { IosCustomerNoteItem } from '@mos-lab/shared';
import { PenLine, Pin } from 'lucide-react';
import { CvFeather1Badge } from './CvFeatherLabels';

export interface CvlCustomerNotesBannerProps {
  notes?: IosCustomerNoteItem[];
  isDark: boolean;
  compact?: boolean;
  maxItems?: number;
}

export function CvlCustomerNotesBanner({ notes, isDark, compact = false, maxItems = 3 }: CvlCustomerNotesBannerProps) {
  if (!notes || notes.length === 0) return null;

  const sorted = [...notes].sort((a, b) => Number(b.isSticky) - Number(a.isSticky)).slice(0, maxItems);

  return (
    <div data-testid="cvl-customer-notes-banner" className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-500">
        <PenLine className="w-3 h-3 shrink-0" strokeWidth={1.8} />
        <span>Lưu ý CVL ({notes.length})</span>
      </div>

      <div
        className={`rounded-2xl border divide-y ${
          isDark
            ? 'border-amber-500/35 bg-amber-500/8 divide-amber-500/15 text-neutral-100'
            : 'border-amber-300/70 bg-amber-50/70 divide-amber-200/70 text-neutral-900'
        }`}
      >
        {sorted.map((item) => (
          <div key={item.id} className={compact ? 'px-3 py-2 space-y-0.5' : 'px-3 py-2.5 space-y-1'}>
            <div className="flex items-center justify-between gap-2 text-[10.5px]">
              <div className="flex items-center gap-1.5 font-semibold min-w-0">
                <CvFeather1Badge className="text-[9.5px]" />
                <span className="truncate">{item.staffName}</span>
                {item.isSticky && <Pin className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2} />}
              </div>
              <span className={`tabular-nums shrink-0 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {item.dateDisplay}
              </span>
            </div>
            <p className="text-[12px] leading-snug whitespace-pre-line">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
