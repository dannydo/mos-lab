'use client';

import React, { useMemo } from 'react';
import { Search, X, Hash, Pin, MessageSquare, Users, Sparkles, CheckSquare } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatConversation } from '@mos-lab/shared';
import { formatChatPreviewWithStickers } from '../mos-chat-stickers';

dayjs.extend(relativeTime);

export const MosChatMobileInbox: React.FC = () => {
  const {
    conversations,
    activeConvId,
    setActiveConvId,
    sidebarFilter,
    setSidebarFilter,
    searchQuery,
    setSearchQuery,
    setMobileView,
    setActiveSubtab,
  } = useMosChat();

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSubtitle = c.subtitle?.toLowerCase().includes(q);
        const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].text : '';
        const matchLast = lastMsg.toLowerCase().includes(q);
        if (!matchName && !matchSubtitle && !matchLast) return false;
      }

      // Tab filter
      if (sidebarFilter === 'unread') return (c.unreadCount || 0) > 0;
      if (sidebarFilter === 'spaces') return c.type === 'space';
      if (sidebarFilter === 'dms') return c.type === 'dm';

      return true;
    });
  }, [conversations, searchQuery, sidebarFilter]);

  const handleSelectConv = (convId: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(10);
    }
    setActiveConvId(convId);
    setMobileView('room');
  };

  const renderConversationItem = (c: MosChatConversation) => {
    const isSelected = c.id === activeConvId;
    const isSpace = c.type === 'space';
    const isAiCopilot = c.id === 'dm-wings-ai-copilot';
    const unread = c.unreadCount || 0;

    // Time formatting from last message or updatedAt
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    let timeStr = '';
    if (lastMsg?.createdAt || c.updatedAt) {
      const dt = dayjs(lastMsg?.createdAt || c.updatedAt);
      const isToday = dt.isSame(dayjs(), 'day');
      timeStr = isToday ? dt.format('HH:mm') : dt.format('DD/MM');
    }

    const previewRaw = lastMsg?.text || c.subtitle || 'Chưa có tin nhắn mới';
    const preview = formatChatPreviewWithStickers(previewRaw);

    return (
      <div
        key={c.id}
        onClick={() => handleSelectConv(c.id)}
        role="button"
        tabIndex={0}
        className={`w-full px-4 py-3 flex items-center gap-3 active:bg-slate-800/80 transition-colors border-b border-slate-800/40 select-none ${
          isSelected ? 'bg-slate-800/50' : 'bg-transparent'
        }`}
      >
        {/* Avatar or Icon */}
        <div className="relative shrink-0">
          {isAiCopilot ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          ) : isSpace ? (
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
              <Hash className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-700/80 border border-slate-600/50 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {c.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Online presence indicator */}
          {!isSpace && !isAiCopilot && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className={`text-sm font-semibold truncate ${unread > 0 ? 'text-white' : 'text-slate-200'}`}>
                {c.name}
              </h3>
            </div>
            {timeStr && (
              <span
                className={`text-[11px] shrink-0 tabular-nums ${unread > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}
              >
                {timeStr}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate ${unread > 0 ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
              {preview}
            </p>
            {unread > 0 && (
              <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full tabular-nums shadow-sm shadow-rose-500/40 shrink-0">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Search Input Bar */}
      <div className="px-4 pt-2.5 pb-2">
        <div className="relative flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus-within:border-amber-400/80 transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm kênh, đồng nghiệp, tin nhắn..."
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-800/60">
        <button
          type="button"
          aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
          onClick={() => {
            setActiveSubtab('tasks');
            setMobileView('room');
          }}
          className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Kho Công việc</span>
        </button>
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'unread', label: 'Chưa đọc' },
            { id: 'spaces', label: 'Kênh Không Gian' },
            { id: 'dms', label: 'Tin Trực Tiếp' },
          ] as const
        ).map((chip) => {
          const active = sidebarFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setSidebarFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                active
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/40'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-800/30">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 mt-12">
            <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300">Không tìm thấy cuộc trò chuyện nào</p>
            <p className="text-xs text-slate-500 mt-1">Thử đổi từ khóa hoặc bộ lọc phía trên</p>
          </div>
        ) : (
          filteredConversations.map(renderConversationItem)
        )}
      </div>
    </div>
  );
};
