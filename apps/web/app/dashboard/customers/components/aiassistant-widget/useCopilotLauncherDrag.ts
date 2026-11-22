'use client';

import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import {
  AI_LAUNCHER_MARGIN,
  AI_LAUNCHER_SIZE,
  DRAG_THRESHOLD,
  clampAiLauncherPosition,
  persistAiLauncherPosition,
  readAiLauncherPosition,
  subscribeAiLauncherPosition,
  readAiCopilotVisible,
  subscribeAiCopilotVisibility,
  type AiLauncherPosition,
} from '../../../../../lib/ai-assistant-launcher';

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  latest: AiLauncherPosition;
}

/**
 * Manages Copilot launcher visibility, persisted screen coordinates, and pointer drag-and-drop.
 */
export function useCopilotLauncherDrag() {
  const [copilotVisible, setCopilotVisible] = useState(() => readAiCopilotVisible());
  const [launcherPosition, setLauncherPosition] = useState<AiLauncherPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickUntilRef = useRef(0);

  // Sync Copilot visibility from user preferences and cross-tab storage events
  useEffect(() => {
    return subscribeAiCopilotVisibility(() => {
      setCopilotVisible(readAiCopilotVisible());
    });
  }, []);

  // Sync persisted launcher coordinates and clamp on viewport resize
  useEffect(() => {
    const syncPosition = () => {
      if (typeof window === 'undefined') return;
      const saved = readAiLauncherPosition();
      if (saved) {
        const clamped = clampAiLauncherPosition(
          saved,
          { width: window.innerWidth, height: window.innerHeight },
          AI_LAUNCHER_SIZE,
          AI_LAUNCHER_MARGIN
        );
        setLauncherPosition(clamped);
      }
    };

    syncPosition();
    const unsubscribe = subscribeAiLauncherPosition(syncPosition);

    const onResize = () => {
      setLauncherPosition((current) => {
        if (!current || typeof window === 'undefined') return current;
        const clamped = clampAiLauncherPosition(
          current,
          { width: window.innerWidth, height: window.innerHeight },
          AI_LAUNCHER_SIZE,
          AI_LAUNCHER_MARGIN
        );
        if (clamped.x !== current.x || clamped.y !== current.y) {
          persistAiLauncherPosition(clamped);
        }
        return clamped;
      });
    };

    window.addEventListener('resize', onResize);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = { x: rect.left, y: rect.top };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
      latest: origin,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
      return;
    }

    if (!drag.moved) {
      drag.moved = true;
      setIsDragging(true);
    }

    const nextPos = clampAiLauncherPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      { width: window.innerWidth, height: window.innerHeight },
      AI_LAUNCHER_SIZE,
      AI_LAUNCHER_MARGIN
    );
    drag.latest = nextPos;
    setLauncherPosition(nextPos);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      persistAiLauncherPosition(drag.latest);
      suppressClickUntilRef.current = Date.now() + 200;
    }

    setIsDragging(false);
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const shouldSuppressClick = () => Date.now() < suppressClickUntilRef.current;

  return {
    copilotVisible,
    launcherPosition,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    shouldSuppressClick,
  };
}
