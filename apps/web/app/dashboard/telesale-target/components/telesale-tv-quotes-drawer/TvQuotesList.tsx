'use client';

import React from 'react';
import { Loader2, MessageSquareQuote } from 'lucide-react';
import type { TelesaleTvQuoteItem } from '@mos-lab/shared';
import { TvQuoteCard } from './TvQuoteCard';

interface TvQuotesListProps {
  loading: boolean;
  quotes: TelesaleTvQuoteItem[];
  isDark: boolean;
  zIndex: number;
  playingQuoteId: string | null;
  audioLoading: boolean;
  onToggleActive: (id: string, nextActive: boolean) => void;
  onPlayPreview: (quote: TelesaleTvQuoteItem) => void;
  onEdit: (quote: TelesaleTvQuoteItem) => void;
  onDelete: (id: string) => void;
}

/** Renders the loading indicator, filtered empty state, or scrollable quote card list. */
export const TvQuotesList: React.FC<TvQuotesListProps> = ({
  loading,
  quotes,
  isDark,
  zIndex,
  playingQuoteId,
  audioLoading,
  onToggleActive,
  onPlayPreview,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Đang tải kho câu thoại cổ vũ...
        </span>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div
        className={`py-16 px-4 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 text-center ${
          isDark ? 'border-zinc-800 text-zinc-400 bg-zinc-900/40' : 'border-slate-200 text-slate-500 bg-slate-50/60'
        }`}
      >
        <MessageSquareQuote className={`w-8 h-8 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
        <p className="text-xs m-0">Không tìm thấy câu thoại nào phù hợp bộ lọc</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
      {quotes.map((quote) => {
        const isPlaying = playingQuoteId === quote.id;
        return (
          <TvQuoteCard
            key={quote.id}
            quote={quote}
            isDark={isDark}
            zIndex={zIndex}
            isPlaying={isPlaying}
            audioLoading={audioLoading && isPlaying}
            onToggleActive={onToggleActive}
            onPlayPreview={onPlayPreview}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
};
