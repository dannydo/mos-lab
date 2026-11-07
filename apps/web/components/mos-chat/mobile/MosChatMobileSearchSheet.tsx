'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, X, CornerDownRight, Hash, Paperclip, Loader2, MessageSquare } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { chatApi } from '../../../lib/api/chat.api';
import { MosChatAvatar } from '../MosChatAvatar';
import type { MosChatConversation, MosChatSearchResultItem, SearchMosChatMessagesQuery } from '@mos-lab/shared';
import dayjs from 'dayjs';

export interface MosChatMobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
  activeConversation?: MosChatConversation | null;
  onSelectMessage: (item: MosChatSearchResultItem) => void;
}

type FilterScope = 'ALL' | 'CURRENT_CONV' | 'THREAD_ONLY' | 'HAS_ATTACHMENT';

export const MosChatMobileSearchSheet: React.FC<MosChatMobileSearchSheetProps> = ({
  open,
  onClose,
  activeConversation,
  onSelectMessage,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [query, setQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MosChatSearchResultItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
      setFilterScope('ALL');
    }
  }, [open]);

  const executeSearch = useCallback(
    async (keyword: string, scope: FilterScope) => {
      const trimmed = keyword.trim();
      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params: SearchMosChatMessagesQuery = {
          q: trimmed,
          conversationId: scope === 'CURRENT_CONV' ? activeConversation?.id : undefined,
          inThreadOnly: scope === 'THREAD_ONLY' ? true : undefined,
          hasAttachment: scope === 'HAS_ATTACHMENT' ? true : undefined,
          limit: 35,
        };

        const res = await chatApi.chat.searchMessages(params);
        if (res && res.success && Array.isArray(res.items)) {
          setResults(res.items);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Mobile search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversation]
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      void executeSearch(val, filterScope);
    }, 280);
  };

  const handleScopeChange = (scope: FilterScope) => {
    setFilterScope(scope);
    if (query.trim()) {
      void executeSearch(query, scope);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: isDark ? '#121212' : '#ffffff' }}>
      {/* Top Mobile Bar with Back button & Input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b"
        style={{
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          backgroundColor: isDark ? '#18181b' : '#f4f4f5',
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 active:bg-slate-500/20"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
          <Search size={16} className="text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm tin nhắn, người gửi, tệp..."
            className="w-full bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-400"
          />
          {isLoading && <Loader2 size={15} className="animate-spin text-amber-500 shrink-0" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Scope Pills */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b overflow-x-auto text-xs no-scrollbar"
        style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
      >
        <button
          type="button"
          onClick={() => handleScopeChange('ALL')}
          className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
            filterScope === 'ALL'
              ? 'bg-amber-500 text-white'
              : isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          Tất cả
        </button>

        {activeConversation && (
          <button
            type="button"
            onClick={() => handleScopeChange('CURRENT_CONV')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
              filterScope === 'CURRENT_CONV'
                ? 'bg-amber-500 text-white'
                : isDark
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Hash size={12} />
            <span className="truncate max-w-[130px]">{activeConversation.name}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleScopeChange('THREAD_ONLY')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
            filterScope === 'THREAD_ONLY'
              ? 'bg-amber-500 text-white'
              : isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          <CornerDownRight size={12} />
          <span>Trong Luồng (Thread)</span>
        </button>

        <button
          type="button"
          onClick={() => handleScopeChange('HAS_ATTACHMENT')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
            filterScope === 'HAS_ATTACHMENT'
              ? 'bg-amber-500 text-white'
              : isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Paperclip size={12} />
          <span>Có đính kèm</span>
        </button>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/30">
        {results.length > 0 ? (
          results.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onSelectMessage(item);
                onClose();
              }}
              className="p-3 active:bg-zinc-800/50 cursor-pointer"
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-blue-400">
                    {item.conversationType === 'space' ? '#' : '@'}
                    {item.conversationName}
                  </span>
                  {item.isThreadReply && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                      <CornerDownRight size={9} />
                      Luồng
                    </span>
                  )}
                </div>
                <span className="text-slate-400 tabular-nums text-[10px]">
                  {item.createdAt ? dayjs(item.createdAt).format('DD/MM HH:mm') : item.timeLabel}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <MosChatAvatar name={item.senderName} src={item.senderAvatar || undefined} size={26} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-200">{item.senderName}</span>
                  <p className="text-[12.5px] leading-relaxed line-clamp-2 text-slate-300 mt-0.5 break-words">
                    {item.text}
                  </p>
                  {item.hasAttachments && item.attachmentNames && item.attachmentNames.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {item.attachmentNames.map((n, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded"
                        >
                          <Paperclip size={9} />
                          <span className="truncate max-w-[140px]">{n}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : query.trim() ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <div className="text-sm font-semibold">Không tìm thấy kết quả nào</div>
            <div className="text-xs text-slate-500 mt-1">Thử từ khóa khác hoặc chuyển sang tab Tất cả</div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 px-6 text-xs leading-relaxed">
            Nhập từ khóa để tìm kiếm tin nhắn trên tất cả các Space, Direct Messages và Luồng trao đổi.
          </div>
        )}
      </div>
    </div>
  );
};
