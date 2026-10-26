'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ArrowDown, MessageSquare, Sparkles, Hash, Lock, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import type { MosChatMessage } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { MosChatMobileMessageItem } from './MosChatMobileMessageItem';

export interface MosChatMobileStreamProps {
  onOpenThread: (msg: MosChatMessage) => void;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
}

export const MosChatMobileStream: React.FC<MosChatMobileStreamProps> = ({ onOpenThread, onOpenGallery }) => {
  const { messages, activeConversation, activeConvId, isAiThinking } = useMosChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState<number>(0);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  // Group messages by day
  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: MosChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const dayStr = dayjs(msg.createdAt).format('YYYY-MM-DD');
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dayStr) {
        lastGroup.items.push(msg);
      } else {
        groups.push({ date: dayStr, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  // Handle scroll detection
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 120;
    setShowScrollBottom(isUp);
    if (!isUp) {
      setUnreadBelowCount(0);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView?.({ behavior });
    setUnreadBelowCount(0);
  };

  // Auto scroll on new messages
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    // If near bottom, scroll down automatically
    if (distanceFromBottom < 150) {
      scrollToBottom('smooth');
    } else if (isNewMessage) {
      setUnreadBelowCount((c) => c + 1);
    }
  }, [messages.length, isAiThinking]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    scrollToBottom('auto');
  }, [activeConvId]);

  const isSpace = activeConversation?.type === 'space';

  return (
    <div className="relative flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Scrollable Message Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2 select-none"
      >
        {/* Welcome Header */}
        {activeConversation?.id === AI_COPILOT_CONV_ID ? (
          <div className="pt-6 pb-4 text-center border-b border-purple-500/30 mb-4 bg-gradient-to-b from-purple-950/20 to-transparent rounded-2xl">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white mb-2.5 shadow-lg shadow-purple-500/25">
              <Sparkles className="w-7 h-7 animate-pulse text-white" />
            </div>
            <h2 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
              <span>Trợ lý mOS AI (MAI)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase border border-purple-500/40">
                mOS AI
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Kênh 1-1 riêng tư · Mọi trao đổi và phân tích dữ liệu chỉ một mình bạn nhìn thấy.
            </p>
          </div>
        ) : (
          <div className="pt-6 pb-4 text-center border-b border-slate-800/40 mb-4">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-2.5 shadow-sm">
              {isSpace ? <Hash className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
            </div>
            <h2 className="text-base font-bold text-white">
              Chào mừng bạn đến với #{activeConversation?.name || 'cuộc trò chuyện'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {activeConversation?.subtitle || 'Không gian trao đổi công việc và điều phối vận hành'}
            </p>
          </div>
        )}

        {/* Message Groups */}
        {groupedMessages.map((group) => {
          const dateLabel = (() => {
            const dt = dayjs(group.date);
            const now = dayjs();
            if (dt.isSame(now, 'day')) return 'Hôm nay';
            if (dt.isSame(now.subtract(1, 'day'), 'day')) return 'Hôm qua';
            return dt.format('DD [tháng] MM, YYYY');
          })();

          return (
            <div key={group.date} className="space-y-1">
              {/* Date Divider Pill */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50 shadow-sm">
                  {dateLabel}
                </span>
              </div>

              {/* Messages in date group */}
              {group.items.map((msg, idx) => (
                <MosChatMobileMessageItem
                  key={msg.id}
                  message={msg}
                  prevMessage={idx > 0 ? group.items[idx - 1] : undefined}
                  onOpenThread={onOpenThread}
                  onOpenGallery={onOpenGallery}
                />
              ))}
            </div>
          );
        })}

        {/* MAI Copilot Thinking Shimmer Pill */}
        {isAiThinking && (
          <div className="flex items-center gap-2.5 p-3 my-2 mx-1 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70 border border-purple-500/40 text-xs text-purple-200 animate-pulse shadow-lg">
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-purple-300">MAI Copilot:</span> Đang suy nghĩ và trả lời vào nhóm...
            </div>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute right-4 bottom-20 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800/95 border border-slate-700/90 text-white shadow-xl backdrop-blur-md active:scale-95 transition-transform"
          aria-label="Cuộn xuống tin nhắn mới"
        >
          <ArrowDown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold">Tin mới</span>
          {unreadBelowCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-bold text-white tabular-nums">
              {unreadBelowCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
