'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ModalDimensions {
  width: number;
  height: number;
  isMaximized: boolean;
}

export interface UseResizableModalOptions {
  storageKey?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useResizableModal(options: UseResizableModalOptions = {}) {
  const {
    storageKey = 'cv_speed_modal_dimensions',
    defaultWidth = 850,
    defaultHeight = 650,
    minWidth = 620,
    maxWidth = 1400,
    minHeight = 450,
    maxHeight = 920,
  } = options;

  const [dimensions, setDimensions] = useState<ModalDimensions>({
    width: defaultWidth,
    height: defaultHeight,
    isMaximized: false,
  });

  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: defaultWidth,
    h: defaultHeight,
  });

  // 1. Load saved dimensions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const windowMaxW = typeof window !== 'undefined' ? window.innerWidth - 40 : maxWidth;
      const windowMaxH = typeof window !== 'undefined' ? window.innerHeight - 60 : maxHeight;

      const effectiveMaxW = Math.min(maxWidth, windowMaxW);
      const effectiveMaxH = Math.min(maxHeight, windowMaxH);

      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          setDimensions({
            width: Math.max(minWidth, Math.min(effectiveMaxW, parsed.width)),
            height: Math.max(minHeight, Math.min(effectiveMaxH, parsed.height)),
            isMaximized: !!parsed.isMaximized,
          });
          return;
        }
      }

      // Default clamp if no saved state
      setDimensions((prev) => ({
        ...prev,
        width: Math.min(prev.width, effectiveMaxW),
        height: Math.min(prev.height, effectiveMaxH),
      }));
    } catch (e) {
      console.warn('Failed to load modal dimensions from localStorage', e);
    }
  }, [storageKey, minWidth, maxWidth, minHeight, maxHeight]);

  // 2. Save dimensions to localStorage when changed
  const saveDimensions = useCallback(
    (dims: ModalDimensions) => {
      setDimensions(dims);
      try {
        localStorage.setItem(storageKey, JSON.stringify(dims));
      } catch (e) {
        console.warn('Failed to save modal dimensions to localStorage', e);
      }
    },
    [storageKey]
  );

  // 3. Reset to default dimensions
  const resetDimensions = useCallback(() => {
    saveDimensions({
      width: defaultWidth,
      height: defaultHeight,
      isMaximized: false,
    });
  }, [defaultWidth, defaultHeight, saveDimensions]);

  // 4. Toggle Maximize / Restore
  const toggleMaximize = useCallback(() => {
    saveDimensions({
      ...dimensions,
      isMaximized: !dimensions.isMaximized,
    });
  }, [dimensions, saveDimensions]);

  // 5. Mouse Drag Resizing logic
  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: dimensions.width,
        h: dimensions.height,
      };

      setIsResizing(true);
    },
    [dimensions.width, dimensions.height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, startPosRef.current.w + deltaX));
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startPosRef.current.h + deltaY));

      setDimensions((prev) => ({
        ...prev,
        width: newWidth,
        height: newHeight,
        isMaximized: false,
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setDimensions((current) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(current));
        } catch (err) {
          // ignore
        }
        return current;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, minHeight, maxHeight, storageKey]);

  return {
    width: dimensions.isMaximized ? '95vw' : `${dimensions.width}px`,
    height: dimensions.isMaximized ? '90vh' : `${dimensions.height}px`,
    numericWidth: dimensions.width,
    numericHeight: dimensions.height,
    isMaximized: dimensions.isMaximized,
    isResizing,
    resetDimensions,
    toggleMaximize,
    startResizing,
  };
}
