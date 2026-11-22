'use client';

import { useState, useRef } from 'react';
import type React from 'react';
import type { MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';
import { cleanQuotedText } from '../../utils/quoteUtils';

export interface UseChatSwipeAndDoubleTapParams {
  activeThreadMsg: MosChatMessage | null;
  threadReplies: MosChatThreadReply[];
  reactToMessage: (messageId: string, emoji: string, replyId?: string) => void | Promise<void>;
  setReplyingToReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  setActionSheetReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
}

export function useChatSwipeAndDoubleTap({
  activeThreadMsg,
  threadReplies,
  reactToMessage,
  setReplyingToReply,
  setActionSheetReply,
}: UseChatSwipeAndDoubleTapParams) {
  const lastTapParentRef = useRef<number>(0);
  const [showHeartFlyParent, setShowHeartFlyParent] = useState<boolean>(false);
  const [parentSwipeOffset, setParentSwipeOffset] = useState<number>(0);
  const parentSwipeOffsetRef = useRef<number>(0);
  const parentTouchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isParentSwipingRef = useRef<boolean>(false);
  const isParentScrollingRef = useRef<boolean>(false);

  const lastTapReplyRef = useRef<Record<string, number>>({});
  const [showHeartFlyReplyId, setShowHeartFlyReplyId] = useState<string | null>(null);
  const [swipeOffsetMap, setSwipeOffsetMap] = useState<Record<string, number>>({});
  const replySwipeOffsetRef = useRef<Record<string, number>>({});
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isReplySwipingRef = useRef<Record<string, boolean>>({});
  const isReplyScrollingRef = useRef<Record<string, boolean>>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStartParent = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    parentTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    parentSwipeOffsetRef.current = 0;
    isParentSwipingRef.current = false;
    isParentScrollingRef.current = false;
  };

  const handleTouchMoveParent = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - parentTouchStartRef.current.x;
    const deltaY = currentY - parentTouchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (isParentScrollingRef.current) return;

    if (!isParentSwipingRef.current) {
      if (absY > 7 && absY > absX) {
        isParentScrollingRef.current = true;
        return;
      }
      if (absX > 7 && absX > absY) {
        isParentSwipingRef.current = true;
      }
    }

    if (isParentSwipingRef.current) {
      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);
      parentSwipeOffsetRef.current = damped;
      setParentSwipeOffset(damped);
    }
  };

  const handleTouchEndParent = () => {
    if (!activeThreadMsg) return;

    const currentOffset = parentSwipeOffsetRef.current;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToReply({
        id: activeThreadMsg.id,
        senderId: activeThreadMsg.senderId,
        senderName: activeThreadMsg.senderName,
        text: cleanQuotedText(activeThreadMsg.text),
        createdAt: activeThreadMsg.createdAt,
      } as MosChatThreadReply);
    }

    parentSwipeOffsetRef.current = 0;
    setParentSwipeOffset(0);
    isParentSwipingRef.current = false;
    isParentScrollingRef.current = false;

    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      if (now - lastTapParentRef.current < 280) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(10);
        }
        void reactToMessage(activeThreadMsg.id, '❤️');
        setShowHeartFlyParent(true);
        setTimeout(() => setShowHeartFlyParent(false), 900);
        lastTapParentRef.current = 0;
      } else {
        lastTapParentRef.current = now;
      }
    }
  };

  const handleTouchStartReply = (e: React.TouchEvent, reply: MosChatThreadReply) => {
    if (reply.isDeleted) return;
    if (!e.touches || e.touches.length === 0) return;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    replySwipeOffsetRef.current[reply.id] = 0;
    isReplySwipingRef.current[reply.id] = false;
    isReplyScrollingRef.current[reply.id] = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(20);
      }
      setActionSheetReply(reply);
    }, 450);
  };

  const handleTouchMoveReply = (e: React.TouchEvent, replyId: string) => {
    const r = threadReplies.find((item) => item.id === replyId);
    if (r?.isDeleted) return;
    if (!e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartPosRef.current.x;
    const deltaY = currentY - touchStartPosRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (isReplyScrollingRef.current[replyId]) return;

    if (!isReplySwipingRef.current[replyId]) {
      if (absY > 7 && absY > absX) {
        isReplyScrollingRef.current[replyId] = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }
      if (absX > 7 && absX > absY) {
        isReplySwipingRef.current[replyId] = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    if (isReplySwipingRef.current[replyId]) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);
      replySwipeOffsetRef.current[replyId] = damped;
      setSwipeOffsetMap((prev) => ({ ...prev, [replyId]: damped }));
    }
  };

  const handleTouchEndReply = (reply: MosChatThreadReply) => {
    if (reply.isDeleted) return;
    if (!activeThreadMsg) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const currentOffset = replySwipeOffsetRef.current[reply.id] || 0;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToReply({
        ...reply,
        text: cleanQuotedText(reply.text),
      });
    }

    replySwipeOffsetRef.current[reply.id] = 0;
    setSwipeOffsetMap((prev) => ({ ...prev, [reply.id]: 0 }));
    isReplySwipingRef.current[reply.id] = false;
    isReplyScrollingRef.current[reply.id] = false;

    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      const lastTap = lastTapReplyRef.current[reply.id] || 0;
      if (now - lastTap < 280) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(10);
        }
        void reactToMessage(activeThreadMsg.id, '❤️', reply.id);
        setShowHeartFlyReplyId(reply.id);
        setTimeout(() => setShowHeartFlyReplyId(null), 900);
        lastTapReplyRef.current[reply.id] = 0;
      } else {
        lastTapReplyRef.current[reply.id] = now;
      }
    }
  };

  return {
    showHeartFlyParent,
    parentSwipeOffset,
    showHeartFlyReplyId,
    swipeOffsetMap,
    handleTouchStartParent,
    handleTouchMoveParent,
    handleTouchEndParent,
    handleTouchStartReply,
    handleTouchMoveReply,
    handleTouchEndReply,
  };
}
