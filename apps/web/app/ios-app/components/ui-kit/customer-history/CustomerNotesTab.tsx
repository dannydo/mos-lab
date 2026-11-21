'use client';

import React, { useMemo, useState } from 'react';
import type { IosCustomerNoteItem } from '@mos-lab/shared';
import { PenLine, Pin, Plus } from 'lucide-react';
import { CvFeather1Badge } from '../CvFeatherLabels';

export interface CustomerNotesTabProps {
  notes: IosCustomerNoteItem[];
  isDark: boolean;
  canAddNote: boolean;
  onOpenAddModal: () => void;
}

export function CustomerNotesTab({ notes, isDark, canAddNote, onOpenAddModal }: CustomerNotesTabProps) {
  const [filter, setFilter] = useState<'CVL' | 'ALL'>('CVL');

  const filteredNotes = useMemo(() => {
    const base = filter === 'CVL' ? notes.filter((n) => n.source === 'CVL') : notes;
    return [...base].sort((a, b) => {
      if (a.isSticky !== b.isSticky) return a.isSticky ? -1 : 1;
      const ta = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
      const tb = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
      return tb - ta;
    });
  }, [filter, notes]);

  return (
    <div className="space-y-2.5" data-testid="customer-notes-tab">
      <div className="flex items-center justify-between gap-2">
        <div
          className={`inline-flex rounded-xl border p-0.5 text-[11px] font-semibold ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setFilter('CVL')}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
              filter === 'CVL'
                ? 'bg-[#FFB400] text-black font-bold'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CVL ({notes.filter((n) => n.source === 'CVL').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
              filter === 'ALL'
                ? 'bg-[#FFB400] text-black font-bold'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({notes.length})
          </button>
        </div>

        {canAddNote && (
          <button
            type="button"
            data-testid="history-add-cvl-note-btn"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFB400] text-black text-[11px] font-bold shadow-2xs active:scale-95 transition-transform cursor-pointer leading-none"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Thêm</span>
          </button>
        )}
      </div>

      {filteredNotes.length === 0 ? (
        <div
          className={`rounded-2xl border p-6 text-center space-y-2 ${
            isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <PenLine className="w-5 h-5 mx-auto text-amber-500 opacity-80" strokeWidth={1.75} />
          <p className="text-xs">{filter === 'CVL' ? 'Chưa có ghi chú Chuyên Viên nào.' : 'Chưa có ghi chú nào.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((item) => {
            const stickyCls = item.isSticky
              ? isDark
                ? 'border-amber-500/40 bg-amber-500/8'
                : 'border-amber-400/60 bg-amber-50/70'
              : isDark
                ? 'border-slate-800 bg-slate-900/75'
                : 'border-slate-200 bg-white shadow-xs';
            return (
              <div key={`${item.source}-${item.id}`} className={`rounded-2xl border p-3 space-y-1 ${stickyCls}`}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold min-w-0">
                    {item.source === 'CVL' ? (
                      <CvFeather1Badge className="text-[10px]" />
                    ) : (
                      <span className="text-[10px] font-bold text-sky-500">CRM</span>
                    )}
                    <span className="truncate">{item.staffName}</span>
                    {item.isSticky && <Pin className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2} />}
                  </div>
                  <span className={`tabular-nums shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.daysAgoLabel ? `${item.daysAgoLabel} · ` : ''}
                    {item.timeDisplay} {item.dateDisplay}
                  </span>
                </div>
                <p
                  className={`text-[12px] leading-relaxed whitespace-pre-line ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  {item.note}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
