'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { MosChatSidebarFilter } from '../../types/mos-chat-types';
import { SIDEBAR_FILTER_CHIPS } from './inboxHelpers';

export interface InboxSearchAndFilterBarProps {
  isDark: boolean;
  searchQuery: string;
  sidebarFilter: MosChatSidebarFilter;
  onChangeSearchQuery: (value: string) => void;
  onSelectFilter: (filter: MosChatSidebarFilter) => void;
  onOpenSearchSheet?: (initialQuery?: string) => void;
}

export const InboxSearchAndFilterBar: React.FC<InboxSearchAndFilterBarProps> = ({
  isDark,
  searchQuery,
  sidebarFilter,
  onChangeSearchQuery,
  onSelectFilter,
  onOpenSearchSheet,
}) => {
  const trimmedQuery = searchQuery.trim();

  return (
    <>
      {/* Slim Apple-Style Search Input Bar */}
      <div className="px-3.5 pt-2 pb-1.5">
        <div className="relative h-9 flex items-center bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-xl px-3 text-sm text-[var(--mos-text)] focus-within:border-[var(--mos-accent)] transition-colors">
          <button
            type="button"
            onClick={() => onOpenSearchSheet?.(trimmedQuery)}
            className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-transform cursor-pointer mr-2 shrink-0"
            aria-label="Tìm kiếm tin nhắn sâu"
            title="Tìm kiếm tin nhắn sâu"
          >
            <Search className="w-4 h-4 text-[var(--mos-text-muted)]" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmedQuery) {
                onOpenSearchSheet?.(trimmedQuery);
              }
            }}
            placeholder="Tìm kiếm..."
            className="w-full bg-transparent border-none outline-none text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery('')}
              className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Deep Message Search Banner when typing */}
      {trimmedQuery && (
        <div className="px-3.5 pb-1.5">
          <button
            type="button"
            onClick={() => onOpenSearchSheet?.(trimmedQuery)}
            className={`w-full px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs active:scale-[0.98] transition-all cursor-pointer shadow-xs shadow-amber-500/10 text-left ${
              isDark ? 'text-amber-300' : 'text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="truncate">
                Tìm{' '}
                <strong className={isDark ? 'text-amber-200' : 'text-amber-900'}>&ldquo;{trimmedQuery}&rdquo;</strong>{' '}
                trong toàn bộ tin nhắn...
              </span>
            </div>
            <span
              className={`inline-flex items-center justify-center leading-none text-[11px] font-bold bg-amber-500/20 px-2 py-1 rounded-full shrink-0 ml-2 ${
                isDark ? 'text-amber-400' : 'text-amber-700'
              }`}
            >
              Tìm sâu ➔
            </span>
          </button>
        </div>
      )}

      {/* Minimal 3 Filter Pills + Dismissible Pinned/DM Pill when active */}
      <div className="px-3.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--mos-surface-border)]">
        {SIDEBAR_FILTER_CHIPS.map((chip) => {
          const active = sidebarFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSelectFilter(chip.id)}
              className={`inline-flex items-center justify-center leading-none px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                active
                  ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold shadow-xs'
                  : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}

        {(sidebarFilter === 'pinned' || sidebarFilter === 'dms') && (
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className="inline-flex items-center justify-center gap-1 leading-none px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] shadow-xs transition-all active:scale-95 cursor-pointer"
            aria-label={sidebarFilter === 'pinned' ? 'Bỏ lọc đã ghim' : 'Bỏ lọc tin trực tiếp'}
          >
            <span>{sidebarFilter === 'pinned' ? 'Đã ghim' : 'Tin trực tiếp'}</span>
            <X className="w-3 h-3 shrink-0" />
          </button>
        )}
      </div>
    </>
  );
};
