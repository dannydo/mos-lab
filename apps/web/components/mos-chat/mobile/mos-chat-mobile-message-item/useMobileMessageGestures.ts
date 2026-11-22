'use client';

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { MosChatMessage } from '@mos-lab/shared';

export interface UseMobileMessageGesturesParams {
  message: MosChatMessage;
  reactToMessage?: (msgId: string, emoji: string, replyId?: string) => Promise<void> | void;
  setSelectedMsgForAction?: (msg: MosChatMessage | null) => void;
  setReplyingToMessage?: (msg: MosChatMessage | null) => void;
}

export function useMobileMessageGestures({
  message,
  reactToMessage,
  setSelectedMsgForAction,
  setReplyingToMessage,
}: UseMobileMessageGesturesParams) {
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const swipeOffsetRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const isScrollingRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartFlyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [showHeartFly, setShowHeartFly] = useState<boolean>(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      if (heartFlyTimerRef.current) {
        clearTimeout(heartFlyTimerRef.current);
        heartFlyTimerRef.current = null;
      }
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (message.isDeleted) return;
    if (!e.touches || e.touches.length === 0) return;

    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    swipeOffsetRef.current = 0;
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    // Start long-press timer for context menu (450ms)
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(25);
      }
      setSelectedMsgForAction?.(message);
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (message.isDeleted) return;
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
        clearLongPressTimer();
        return;
      }
      if (absX > 7 && absX > absY) {
        isSwipingRef.current = true;
        clearLongPressTimer();
      }
    }

    if (isSwipingRef.current) {
      clearLongPressTimer();
      const direction = deltaX > 0 ? 1 : -1;
      const clampedDist = Math.min(absX, 90);
      const damped = direction * (clampedDist * 0.85);

      swipeOffsetRef.current = damped;
      setSwipeOffset(damped);
    }
  };

  const handleTouchEnd = () => {
    if (message.isDeleted) return;
    clearLongPressTimer();

    const currentOffset = swipeOffsetRef.current;
    if (Math.abs(currentOffset) >= 35) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setReplyingToMessage?.(message);
    }

    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    isSwipingRef.current = false;
    isScrollingRef.current = false;

    // Double-tap to heart (only when not performing a swipe)
    if (Math.abs(currentOffset) < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        void reactToMessage?.(message.id, '❤️');
        setShowHeartFly(true);
        if (heartFlyTimerRef.current) clearTimeout(heartFlyTimerRef.current);
        heartFlyTimerRef.current = setTimeout(() => setShowHeartFly(false), 900);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  };

  return {
    swipeOffset,
    showHeartFly,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
