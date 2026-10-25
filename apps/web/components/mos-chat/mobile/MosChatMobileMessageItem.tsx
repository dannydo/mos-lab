'use client';

import React, { useRef, useState } from 'react';
import { Pin, MessageSquareReply, CheckCheck, Heart } from 'lucide-react';
import dayjs from 'dayjs';
import type { MosChatMessage } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { parsePureStickerMessage, MosChatStickerVisual } from '../mos-chat-stickers';
import { MosChatRichText } from '../MosChatRichText';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { isUserMessageOwner } from '../utils/chat-helpers';

export interface MosChatMobileMessageItemProps {
  message: MosChatMessage;
  prevMessage?: MosChatMessage;
  onOpenThread?: (msg: MosChatMessage) => void;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
}

export const MosChatMobileMessageItem: React.FC<MosChatMobileMessageItemProps> = ({
  message,
  prevMessage,
  onOpenThread,
  onOpenGallery,
}) => {
  const { currentUser, reactToMessage, setSelectedMsgForAction, setReplyingToMessage, messages } = useMosChat();

  const isMe = isUserMessageOwner(message, currentUser);

  // Grouping consecutive messages from same sender within 2 minutes
  const isConsecutive =
    prevMessage &&
    prevMessage.senderId === message.senderId &&
    Math.abs(dayjs(message.createdAt).diff(dayjs(prevMessage.createdAt), 'minute')) < 2;

  // Touch Gesture: Swipe to reply
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const swipeOffsetRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const isScrollingRef = useRef<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const [showHeartFly, setShowHeartFly] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    swipeOffsetRef.current = 0;
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    // Start long-press timer for context menu (450ms)
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(25);
      }
      setSelectedMsgForAction(message);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (isScrollingRef.current) return;

    if (!isSwipingRef.current) {
      if (absY > 7 && absY > absX) {
        isScrollingRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }
      if (absX > 7 && absX > absY) {
        isSwipingRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    if (isSwipingRef.current) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);

      swipeOffsetRef.current = damped;
      setSwipeOffset(damped);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const currentOffset = swipeOffsetRef.current;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToMessage(message);
    }

    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    // Double-tap to heart (only when not performing a swipe)
    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        reactToMessage(message.id, '❤️');
        setShowHeartFly(true);
        setTimeout(() => setShowHeartFly(false), 900);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  // Find quoted message if replying
  const quotedMessage = (message as any).replyToId ? messages.find((m) => m.id === (message as any).replyToId) : null;

  // Check pure sticker message
  const stickerItem = parsePureStickerMessage(message.text);

  // Time format
  const timeFormatted = message.timeLabel || dayjs(message.createdAt).format('HH:mm');
  const threadCount = message.thread?.length || 0;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        setSelectedMsgForAction(message);
      }}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: swipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        touchAction: 'pan-y',
      }}
      className={`relative flex flex-col my-1 select-none ${isMe ? 'items-end' : 'items-start'}`}
    >
      {/* Swipe Right Indicator */}
      {swipeOffset > 10 && (
        <div
          style={{
            opacity: Math.min(1, swipeOffset / 35),
            transform: `scale(${Math.min(1, 0.5 + swipeOffset / 70)}) translateY(-50%)`,
          }}
          className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md z-30 pointer-events-none"
        >
          <MessageSquareReply className="w-4 h-4" />
        </div>
      )}

      {/* Swipe Left Indicator */}
      {swipeOffset < -10 && (
        <div
          style={{
            opacity: Math.min(1, Math.abs(swipeOffset) / 35),
            transform: `scale(${Math.min(1, 0.5 + Math.abs(swipeOffset) / 70)}) translateY(-50%)`,
          }}
          className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md z-30 pointer-events-none"
        >
          <MessageSquareReply className="w-4 h-4" />
        </div>
      )}

      {/* Floating Heart Fly Animation */}
      {showHeartFly && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500 drop-shadow-lg" />
        </div>
      )}

      {/* Sender info for others */}
      {!isMe && !isConsecutive && (
        <div className="flex items-center gap-2 mb-1 px-1">
          <div className="w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] text-white font-bold uppercase">
            {message.senderName?.charAt(0) || 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-300">{message.senderName}</span>
          {message.senderRole && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium uppercase border border-slate-700/50">
              {message.senderRole}
            </span>
          )}
        </div>
      )}

      {/* Message Bubble Box */}
      <div
        className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm transition-colors ${
          isMe
            ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm shadow-amber-500/10'
            : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-sm'
        }`}
      >
        {/* Pinned Badge */}
        {message.pinned && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 mb-1 pb-1 border-b border-white/20">
            <Pin className="w-3 h-3 fill-amber-300" />
            Đã ghim trong kênh
          </div>
        )}

        {/* Quoted Message Preview */}
        {quotedMessage && (
          <div
            className={`text-xs px-2.5 py-1.5 rounded-lg mb-2 border-l-2 ${
              isMe
                ? 'bg-amber-600/30 border-amber-900 text-slate-900'
                : 'bg-slate-900/60 border-amber-500 text-slate-300'
            }`}
          >
            <p className="font-bold text-[11px] truncate">{quotedMessage.senderName}</p>
            <p className="line-clamp-1 text-[11px] opacity-80">{quotedMessage.text}</p>
          </div>
        )}

        {/* Rich Text / Markdown / Mermaid / Sticker Render */}
        <MosChatRichText content={message.text} isMe={isMe} isDark={true} />

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2">
            {message.attachments.length === 1 ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGallery?.(message, 0);
                }}
                className="rounded-xl overflow-hidden border border-black/10 cursor-pointer active:opacity-90 transition-opacity"
              >
                <img
                  src={resolveMediaUrl(message.attachments[0].url)}
                  alt="Đính kèm"
                  className="max-h-60 w-full object-cover rounded-xl"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                {message.attachments.slice(0, 4).map((att, idx) => {
                  const total = message.attachments!.length;
                  const isFirstOfThree = total === 3 && idx === 0;
                  const isFourthInMany = total > 4 && idx === 3;
                  const remaining = total - 3;

                  return (
                    <div
                      key={att.id || idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenGallery?.(message, idx);
                      }}
                      className={`relative overflow-hidden cursor-pointer active:opacity-90 transition-opacity rounded-lg ${
                        isFirstOfThree ? 'col-span-2 h-36' : 'h-28'
                      }`}
                    >
                      <img
                        src={resolveMediaUrl(att.url)}
                        alt={att.name || `Hình ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isFourthInMany && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-base">
                          +{remaining}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Time & Read status */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
            isMe ? 'text-slate-800' : 'text-slate-400'
          }`}
        >
          {message.editedAt && <span className="italic mr-0.5">đã sửa</span>}
          <span>{timeFormatted}</span>
          {isMe && <CheckCheck className="w-3.5 h-3.5 text-slate-800" />}
        </div>
      </div>

      {/* Reactions Bar Below Bubble */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className={`flex flex-wrap items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(message.reactions).map(([emoji, count]) => {
            if (count <= 0) return null;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => reactToMessage(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800/90 border border-slate-700 text-slate-200 shadow-sm active:scale-90 transition-transform"
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-semibold tabular-nums text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Thread reply counter badge (Google Chat style) */}
      {threadCount > 0 && (() => {
        const unreadThreadCount = message.unreadThreadReplyCount || 0;
        return (
          <button
            type="button"
            onClick={() => onOpenThread?.(message)}
            className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              unreadThreadCount > 0
                ? 'bg-indigo-900/90 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
                : 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
            } border active:scale-95 transition-all ${
              isMe ? 'self-end' : 'self-start'
            }`}
          >
            <MessageSquareReply className={`w-3.5 h-3.5 ${unreadThreadCount > 0 ? 'text-indigo-300' : 'text-indigo-400'}`} />
            <span>{threadCount} câu trả lời trong luồng</span>
            {unreadThreadCount > 0 && (
              <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
                +{unreadThreadCount} mới
              </span>
            )}
          </button>
        );
      })()}
    </div>
  );
};
