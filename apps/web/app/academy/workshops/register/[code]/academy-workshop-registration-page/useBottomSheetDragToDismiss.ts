'use client';

import React from 'react';

export function useBottomSheetDragToDismiss(onDismiss: () => void, isOpen: boolean) {
  const pointerStartY = React.useRef<number | null>(null);
  const dragOffsetRef = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const resetDrag = React.useCallback(() => {
    pointerStartY.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (!isOpen) resetDrag();
  }, [isOpen, resetDrag]);

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartY.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile() || pointerStartY.current == null) return;
    const offset = Math.max(0, event.clientY - pointerStartY.current);
    if (!offset) return;
    event.preventDefault();
    const nextOffset = Math.min(offset, 180);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const onPointerUp = () => {
    const shouldDismiss = dragOffsetRef.current >= 88;
    if (shouldDismiss) onDismiss();
    resetDrag();
  };

  const contentStyle = React.useMemo<React.CSSProperties>(
    () => ({
      transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    }),
    [dragOffset, isDragging]
  );

  return {
    contentStyle,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: resetDrag,
    },
  };
}
