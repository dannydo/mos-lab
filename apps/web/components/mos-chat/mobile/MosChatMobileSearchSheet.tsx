'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, X, CornerDownRight, Hash, Paperclip, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { chatApi } from '../../../lib/api/chat.api';
import { MosChatAvatar } from '../MosChatAvatar';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatConversation, MosChatSearchResultItem, SearchMosChatMessagesQuery } from '@mos-lab/shared';
import dayjs from 'dayjs';

export type FilterScope = 'ALL' | 'CURRENT_CONV' | 'THREAD_ONLY' | 'HAS_ATTACHMENT';

export interface MosChatMobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
  activeConversation?: MosChatConversation | null;
  onSelectMessage: (item: MosChatSearchResultItem) => void;
  initialQuery?: string;
  initialScope?: FilterScope;
}

export const MosChatMobileSearchSheet: React.FC<MosChatMobileSearchSheetProps> = ({
  open,
  onClose,
  activeConversation,
  onSelectMessage,
  initialQuery,
  initialScope,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [query, setQuery] = useState(initialQuery || '');
  const [filterScope, setFilterScope] = useState<FilterScope>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MosChatSearchResultItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(
    async (keyword: string, scope: FilterScope) => {
      const trimmed = keyword.trim();
      const targetConvId = scope === 'CURRENT_CONV' ? activeConversation?.id : undefined;

      // When query is empty and searching ALL, show discovery dashboard instead of requesting empty
      if (!trimmed && scope === 'ALL') {
        setResults([]);
        setIsLoading(false);
        return;
      }

      if (!trimmed && scope === 'CURRENT_CONV' && !targetConvId) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const params: SearchMosChatMessagesQuery = {
          q: trimmed,
          conversationId: targetConvId,
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

  useEffect(() => {
    if (open) {
      const defaultScope: FilterScope =
        initialScope ||
        (activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID ? 'CURRENT_CONV' : 'ALL');
      setFilterScope(defaultScope);
      const q = initialQuery || '';
      setQuery(q);
      void executeSearch(q, defaultScope);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
      setFilterScope('ALL');
    }
  }, [open, initialQuery, initialScope, activeConversation, executeSearch]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() && filterScope === 'ALL') {
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
    void executeSearch(query, scope);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1600] flex flex-col pt-[max(env(safe-area-inset-top),14px)] pb-[max(env(safe-area-inset-bottom),12px)]"
      style={{
        backgroundColor: isDark ? '#121212' : '#ffffff',
      }}
    >
      {/* Top Mobile Bar with Back button & Input */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          backgroundColor: isDark ? '#18181b' : '#f4f4f5',
        }}
      >
        <button
          type="button"
          aria-label="Quay lại"
          onClick={onClose}
          className="w-10 h-10 -ml-1 rounded-full text-slate-300 hover:text-white active:bg-slate-700/60 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
        >
          <ArrowLeft size={22} className="text-amber-400" />
        </button>

        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-500/10 border border-slate-500/20 focus-within:border-amber-400/80 transition-colors">
          <Search size={16} className="text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={
              filterScope === 'CURRENT_CONV' && activeConversation
                ? `Tìm trong ${activeConversation.name}...`
                : 'Tìm tin nhắn, người gửi, tệp...'
            }
            className="w-full bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-400"
          />
          {isLoading && <Loader2 size={15} className="animate-spin text-amber-500 shrink-0" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                if (filterScope === 'ALL') {
                  setResults([]);
                } else {
                  void executeSearch('', filterScope);
                }
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Scope Pills */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b overflow-x-auto text-xs no-scrollbar shrink-0"
        style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
      >
        <button
          type="button"
          onClick={() => handleScopeChange('ALL')}
          className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
            filterScope === 'ALL'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả
        </button>

        {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
          <button
            type="button"
            onClick={() => handleScopeChange('CURRENT_CONV')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
              filterScope === 'CURRENT_CONV'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Hash size={13} />
            <span className="truncate max-w-[140px]">{activeConversation.name}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleScopeChange('THREAD_ONLY')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
            filterScope === 'THREAD_ONLY'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CornerDownRight size={13} />
          <span>Trong Luồng (Thread)</span>
        </button>

        <button
          type="button"
          onClick={() => handleScopeChange('HAS_ATTACHMENT')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
            filterScope === 'HAS_ATTACHMENT'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : isDark
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Paperclip size={13} />
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
              className="p-3 active:bg-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
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
                    {item.text || (item.hasAttachments ? '[Đính kèm 1 hình ảnh/tệp]' : '')}
                  </p>
                  {/* Image thumbnails preview */}
                  {item.attachments &&
                    item.attachments.filter(
                      (a) => a.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.url)
                    ).length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
                        {item.attachments
                          .filter(
                            (a) => a.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.url)
                          )
                          .slice(0, 3)
                          .map((att, i) => (
                            <div
                              key={att.id || i}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-amber-500/30 bg-slate-900 shrink-0"
                            >
                              <img
                                src={att.url}
                                alt={att.name || 'Ảnh đính kèm'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                      </div>
                    )}
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
        ) : query.trim() || filterScope !== 'ALL' ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50 text-amber-400" />
            <div className="text-sm font-semibold text-slate-200">Không tìm thấy kết quả nào</div>
            <div className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {filterScope === 'HAS_ATTACHMENT'
                ? 'Không có tin nhắn nào có tệp hoặc ảnh đính kèm'
                : filterScope === 'THREAD_ONLY'
                  ? 'Không có tin nhắn nào trong luồng thảo luận'
                  : filterScope === 'CURRENT_CONV' && activeConversation
                    ? `Không tìm thấy tin nhắn nào trong "${activeConversation.name}"`
                    : 'Thử kiểm tra lại từ khóa hoặc chuyển sang tab Tất cả'}
            </div>
            {query.trim() && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  if (filterScope !== 'ALL') {
                    void executeSearch('', filterScope);
                  }
                }}
                className="mt-3 px-3 py-1 text-xs rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 cursor-pointer"
              >
                Xóa từ khóa
              </button>
            )}
          </div>
        ) : (
          <div className="py-12 px-5 text-center text-slate-400">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-3 border border-amber-500/20">
              <Search size={22} />
            </div>
            <div className="text-sm font-bold text-slate-200">Tìm kiếm tin nhắn trong Chat</div>
            <div className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Nhập từ khóa bất kỳ để tra cứu tin nhắn, người gửi hoặc tệp đính kèm trên toàn hệ thống.
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="mt-5 flex flex-col gap-2 max-w-xs mx-auto text-left">
              {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
                <button
                  type="button"
                  onClick={() => handleScopeChange('CURRENT_CONV')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-200 active:scale-98 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Hash size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">Tìm trong <strong>{activeConversation.name}</strong></span>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold shrink-0">
                    Xem ngay ➔
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleScopeChange('HAS_ATTACHMENT')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-200 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Paperclip size={14} className="text-amber-400 shrink-0" />
                  <span>Tin nhắn có ảnh hoặc tệp đính kèm</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold shrink-0">
                  Xem ngay ➔
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleScopeChange('THREAD_ONLY')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-200 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <CornerDownRight size={14} className="text-amber-400 shrink-0" />
                  <span>Tin nhắn trong các luồng thảo luận</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold shrink-0">
                  Xem ngay ➔
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
