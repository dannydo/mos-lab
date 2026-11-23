import React from 'react';
import { getViewportSize } from '~/hooks/useResponsiveTier';
import {
  DEFAULT_FILTER_DRAWER_WIDTH,
  DRAWER_VIEWPORT_MARGIN,
  FILTER_DRAWER_WIDTH_STORAGE_KEY,
  MAX_DRAG_DRAWER_WIDTH,
  MAX_FILTER_DRAWER_WIDTH,
  MIN_FILTER_DRAWER_WIDTH,
} from './constants';

export function useFilterDrawerResize() {
  const [drawerWidth, setDrawerWidth] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FILTER_DRAWER_WIDTH_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_FILTER_DRAWER_WIDTH && parsed <= MAX_FILTER_DRAWER_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_FILTER_DRAWER_WIDTH;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const isResizingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(DEFAULT_FILTER_DRAWER_WIDTH);
  const cleanupRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = drawerWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const deltaX = startXRef.current - moveEvent.clientX;
        const maxAllowed = Math.min(MAX_DRAG_DRAWER_WIDTH, getViewportSize().width - DRAWER_VIEWPORT_MARGIN);
        const newWidth = Math.max(MIN_FILTER_DRAWER_WIDTH, Math.min(maxAllowed, startWidthRef.current + deltaX));
        setDrawerWidth(newWidth);
      };

      const cleanupListeners = () => {
        if (isResizingRef.current) {
          isResizingRef.current = false;
          setIsResizing(false);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          cleanupRef.current = null;
        }
      };

      const handleMouseUp = () => {
        if (!isResizingRef.current) return;
        cleanupListeners();
        setDrawerWidth((currentWidth) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(FILTER_DRAWER_WIDTH_STORAGE_KEY, String(currentWidth));
          }
          return currentWidth;
        });
      };

      cleanupRef.current = cleanupListeners;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [drawerWidth]
  );

  return {
    drawerWidth,
    isResizing,
    handleMouseDown,
  };
}
