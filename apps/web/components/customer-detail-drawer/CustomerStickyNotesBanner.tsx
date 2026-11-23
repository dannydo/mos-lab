'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Pin, PinOff } from 'lucide-react';

export interface CustomerStickyNotesBannerProps {
  notes: SafeAny[];
  themeMode: 'light' | 'dark';
  isManagerOrAdmin: boolean;
  unpinLoading: boolean;
  onUnpinNote: (noteId: number) => void;
}

export const CustomerStickyNotesBanner: React.FC<CustomerStickyNotesBannerProps> = ({
  notes,
  themeMode,
  isManagerOrAdmin,
  unpinLoading,
  onUnpinNote,
}) => {
  const stickyNotes = (notes || []).filter((n: SafeAny) => n.isSticky);
  if (stickyNotes.length === 0) return null;

  const isDark = themeMode === 'dark';

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 ${
        isDark ? 'border-red-500/20 bg-red-500/5' : 'border-rose-200 bg-rose-50'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Pin className={`h-[15px] w-[15px] shrink-0 ${isDark ? 'text-red-400' : 'text-red-700'}`} />
        <strong className={`text-[13px] uppercase tracking-[0.5px] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          Ghi chú quan trọng
        </strong>
      </div>

      <div className="flex flex-col gap-2">
        {stickyNotes.map((n: SafeAny) => {
          let formattedDate = '';
          if (n.dateCreated) {
            const d = new Date(n.dateCreated);
            formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
          }

          return (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-3 border-l-2 pl-2.5 ${
                isDark ? 'border-red-500/40' : 'border-rose-300'
              }`}
            >
              <div className="flex-1">
                <div
                  className={`whitespace-pre-wrap text-[13px] font-medium leading-normal ${
                    isDark ? 'text-slate-300' : 'text-zinc-700'
                  }`}
                >
                  {n.note}
                </div>
                <div className={`mt-0.5 text-[11px] tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Bởi: <strong>{n.staffName}</strong> ({formattedDate})
                </div>
              </div>

              {isManagerOrAdmin && (
                <Tooltip title="Bỏ ghim ghi chú">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<PinOff className="h-3.5 w-3.5" />}
                    loading={unpinLoading}
                    onClick={() => onUnpinNote(n.id)}
                    className="flex h-[22px] items-center justify-center px-1 py-0"
                  />
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
