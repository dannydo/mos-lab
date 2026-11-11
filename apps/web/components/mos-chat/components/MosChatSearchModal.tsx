'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Input, Spin, Empty, Tooltip, theme } from 'antd';
import {
  Search,
  X,
  MessageSquare,
  CornerDownRight,
  FileText,
  Clock,
  Sparkles,
  Paperclip,
  Check,
  Hash,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { chatApi } from '../../../lib/api/chat.api';
import { MosChatAvatar } from '../MosChatAvatar';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import type { MosChatConversation, MosChatSearchResultItem, SearchMosChatMessagesQuery } from '@mos-lab/shared';
import dayjs from 'dayjs';

export interface MosChatSearchModalProps {
  open: boolean;
  onClose: () => void;
  activeConversation?: MosChatConversation | null;
  onSelectMessage: (item: MosChatSearchResultItem) => void;
}

type FilterScope = 'ALL' | 'CURRENT_CONV' | 'THREAD_ONLY' | 'HAS_ATTACHMENT';

export const MosChatSearchModal: React.FC<MosChatSearchModalProps> = ({
  open,
  onClose,
  activeConversation,
  onSelectMessage,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { token } = theme.useToken();

  const [query, setQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MosChatSearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus?.();
        inputRef.current?.select?.();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
      setFilterScope('ALL');
      setSelectedIndex(0);
    }
  }, [open]);

  // Execute search API with debounce
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
          limit: 40,
        };

        const res = await chatApi.chat.searchMessages(params);
        if (res && res.success && Array.isArray(res.items)) {
          setResults(res.items);
          setSelectedIndex(0);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Failed to search chat messages:', err);
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

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectMessage(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listContainerRef.current && results.length > 0) {
      const selectedEl = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results.length]);

  // Highlight search keyword in text
  const renderHighlightedSnippet = (text: string, highlight: string) => {
    if (!highlight.trim() || !text) {
      return text;
    }
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark
          key={i}
          className="rounded px-0.5 font-semibold"
          style={{
            backgroundColor: isDark ? 'rgba(234, 179, 8, 0.35)' : 'rgba(250, 204, 21, 0.45)',
            color: isDark ? '#fef08a' : '#854d0e',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      zIndex={1500}
      width={680}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: isDark ? '#141414' : '#ffffff',
          border: `1px solid ${isDark ? '#2a2a2a' : '#e5e7eb'}`,
          boxShadow: isDark
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      }}
      closable={false}
    >
      <div className="flex flex-col max-h-[82vh]" onKeyDown={handleKeyDown}>
        {/* Top Search Input Bar */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{
            borderColor: isDark ? '#262626' : '#f0f0f0',
            backgroundColor: isDark ? '#18181b' : '#fafafa',
          }}
        >
          <Search size={18} className="text-amber-500 shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Tìm kiếm nội dung tin nhắn, người gửi, tệp đính kèm... (⌘K)"
            className="w-full bg-transparent border-none outline-none text-[14.5px] font-medium placeholder:text-slate-400"
            style={{ color: token.colorText }}
          />
          {isLoading && <Spin size="small" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-500/10 border border-slate-500/20 rounded tabular-nums select-none">
            ESC
          </kbd>
        </div>

        {/* Quick Filter Scope Tabs */}
        <div
          className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto text-[12px]"
          style={{ borderColor: isDark ? '#262626' : '#f3f4f6' }}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Lọc:</span>
          <button
            type="button"
            onClick={() => handleScopeChange('ALL')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              filterScope === 'ALL'
                ? 'bg-amber-500 text-white shadow-sm'
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                filterScope === 'CURRENT_CONV'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Hash size={11} />
              <span className="truncate max-w-[140px]">{activeConversation.name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleScopeChange('THREAD_ONLY')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              filterScope === 'THREAD_ONLY'
                ? 'bg-amber-500 text-white shadow-sm'
                : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CornerDownRight size={11} />
            <span>Chỉ trong Luồng (Thread)</span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange('HAS_ATTACHMENT')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              filterScope === 'HAS_ATTACHMENT'
                ? 'bg-amber-500 text-white shadow-sm'
                : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Paperclip size={11} />
            <span>Có đính kèm</span>
          </button>
        </div>

        {/* Results List or Empty State */}
        <div ref={listContainerRef} className="overflow-y-auto max-h-[58vh] divide-y divide-zinc-800/20">
          {isLoading && results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Spin size="default" />
              <span className="text-xs">Đang tìm kiếm tin nhắn trên toàn bộ không gian...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => onSelectMessage(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : 'bg-amber-50/80 border-l-4 border-amber-500'
                      : isDark
                        ? 'hover:bg-zinc-800/40 border-l-4 border-transparent'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  {/* Meta Bar: Conversation Tag + Thread Indicator + Timestamp */}
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[10.5px]"
                        style={{
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                        }}
                      >
                        {item.conversationType === 'space' ? <Hash size={11} /> : '@'}
                        <span>{item.conversationName}</span>
                      </span>

                      {item.isThreadReply && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: isDark ? 'rgba(212, 168, 75, 0.18)' : 'rgba(212, 168, 75, 0.12)',
                            color: '#d4a84b',
                          }}
                        >
                          <CornerDownRight size={10} />
                          <span>Luồng trao đổi</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {item.createdAt ? dayjs(item.createdAt).format('DD/MM HH:mm') : item.timeLabel}
                    </span>
                  </div>

                  {/* Sender & Message Preview */}
                  <div className="flex items-start gap-2.5">
                    <MosChatAvatar name={item.senderName} src={item.senderAvatar || undefined} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{item.senderName}</span>
                        {item.senderRole && (
                          <span className="text-[10px] text-slate-400 font-medium">({item.senderRole})</span>
                        )}
                      </div>

                      {/* Text Snippet */}
                      <p
                        className="text-[13px] leading-relaxed line-clamp-2 mt-0.5 break-words font-normal"
                        style={{ color: isDark ? '#e4e4e7' : '#3f3f46' }}
                      >
                        {renderHighlightedSnippet(item.text, query)}
                      </p>

                      {/* Attachments preview */}
                      {item.hasAttachments && item.attachmentNames && item.attachmentNames.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {item.attachmentNames.map((name, attIdx) => (
                            <span
                              key={attIdx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] bg-slate-500/10 text-slate-300 border border-slate-500/20"
                            >
                              <Paperclip size={10} className="text-amber-400" />
                              <span className="truncate max-w-[180px]">{name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : query.trim() ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <MessageSquare size={36} className="text-slate-500 mb-2 opacity-60" />
              <div className="text-sm font-semibold text-slate-300">Không tìm thấy tin nhắn nào</div>
              <div className="text-xs text-slate-500 mt-1 max-w-sm">
                Không có kết quả khớp với từ khóa &ldquo;{query}&rdquo;. Thử kiểm tra lại chính tả hoặc chọn tab
                &ldquo;Tất cả&rdquo;.
              </div>
            </div>
          ) : (
            <div className="py-8 px-6 text-center text-slate-400">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400 mb-3">
                <Sparkles size={20} />
              </div>
              <div className="text-sm font-semibold text-slate-300">Tìm kiếm nhanh mọi lúc</div>
              <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Nhập từ khóa bất kỳ để tìm nội dung tin nhắn, người gửi hoặc tên tệp đính kèm trên tất cả các Space, DM
                và Luồng thảo luận.
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 flex-wrap">
                <span className="px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 font-mono">↑ / ↓</span>
                <span>Di chuyển</span>
                <span className="px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 font-mono ml-2">Enter</span>
                <span>Mở tin nhắn</span>
                <span className="px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/60 font-mono ml-2">ESC</span>
                <span>Đóng</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        {results.length > 0 && (
          <div
            className="px-4 py-2 border-t flex items-center justify-between text-[11px] text-slate-400"
            style={{
              borderColor: isDark ? '#262626' : '#f0f0f0',
              backgroundColor: isDark ? '#18181b' : '#fafafa',
            }}
          >
            <span>
              Tìm thấy <strong className="text-amber-400 tabular-nums">{results.length}</strong> kết quả
            </span>
            <div className="flex items-center gap-1.5">
              <span>Bấm</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                Enter
              </kbd>
              <span>để cuộn tới tin nhắn</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
