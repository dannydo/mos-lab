'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { persistSmsModalWidth, readSavedSmsModalWidth } from './smsModalHelpers';
import {
  SMS_MODAL_DEFAULT_WIDTH,
  SMS_MODAL_DRAG_MIN_WIDTH,
  SMS_MODAL_MAX_WIDTH,
  type SmsResizeDirection,
} from './smsModalTypes';

/** Manages SMS modal width presets, corner drag-resizing, and localStorage persistence. */
export function useSmsModalResize(isModalOpen: boolean) {
  const [modalWidth, setModalWidth] = useState<number>(SMS_MODAL_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const modalWidthRef = useRef<number>(SMS_MODAL_DEFAULT_WIDTH);
  const dragStartRef = useRef<{ x: number; width: number; direction: SmsResizeDirection } | null>(null);

  useEffect(() => {
    const savedWidth = readSavedSmsModalWidth();
    if (savedWidth !== null) {
      modalWidthRef.current = savedWidth;
      setModalWidth(savedWidth);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { x, width, direction } = dragStartRef.current;
      const deltaX = direction === 'right' ? e.clientX - x : x - e.clientX;
      const newWidth = Math.max(SMS_MODAL_DRAG_MIN_WIDTH, Math.min(SMS_MODAL_MAX_WIDTH, width + deltaX * 2));
      modalWidthRef.current = newWidth;
      setModalWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      persistSmsModalWidth(modalWidthRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, direction: SmsResizeDirection) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, width: modalWidth, direction };
    },
    [modalWidth]
  );

  const handleWidthChange = useCallback((width: number) => {
    modalWidthRef.current = width;
    setModalWidth(width);
    persistSmsModalWidth(width);
  }, []);

  return {
    modalWidth,
    isDragging,
    handleDragStart,
    handleWidthChange,
  };
}
