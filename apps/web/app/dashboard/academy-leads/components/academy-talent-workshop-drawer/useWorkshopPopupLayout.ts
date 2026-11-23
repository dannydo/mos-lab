'use client';

import React from 'react';

export function useWorkshopPopupLayout() {
  const [layoutMode, setLayoutMode] = React.useState<'viewport' | 'custom'>('viewport');
  const [customPopupWidth, setCustomPopupWidth] = React.useState(1280);
  const [customPopupHeight, setCustomPopupHeight] = React.useState(900);
  const [isResizingPopup, setIsResizingPopup] = React.useState(false);

  React.useEffect(() => {
    const savedMode = window.localStorage.getItem('mos_academy_talent_workshop_layout_mode');
    const savedWidth = Number(window.localStorage.getItem('mos_academy_talent_workshop_custom_width'));
    if (savedMode === 'custom') setLayoutMode('custom');
    if (Number.isFinite(savedWidth) && savedWidth >= 760) {
      setCustomPopupWidth(Math.min(savedWidth, Math.max(760, window.innerWidth - 24)));
    }
    const savedHeight = Number(window.localStorage.getItem('mos_academy_talent_workshop_custom_height'));
    if (Number.isFinite(savedHeight) && savedHeight >= 560) {
      setCustomPopupHeight(Math.min(savedHeight, Math.max(560, window.innerHeight - 24)));
    }
  }, []);

  const setWorkshopLayoutMode = React.useCallback((nextMode: 'viewport' | 'custom') => {
    setLayoutMode(nextMode);
    window.localStorage.setItem('mos_academy_talent_workshop_layout_mode', nextMode);
  }, []);

  const startPopupResize = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = customPopupWidth;
      const startHeight = customPopupHeight;
      setIsResizingPopup(true);

      const onMove = (moveEvent: MouseEvent) => {
        const maxWidth = Math.max(760, window.innerWidth - 24);
        const maxHeight = Math.max(560, window.innerHeight - 24);
        setCustomPopupWidth(Math.round(Math.min(Math.max(startWidth + moveEvent.clientX - startX, 760), maxWidth)));
        setCustomPopupHeight(Math.round(Math.min(Math.max(startHeight + moveEvent.clientY - startY, 560), maxHeight)));
      };
      const onUp = () => {
        setIsResizingPopup(false);
        setCustomPopupWidth((width) => {
          window.localStorage.setItem('mos_academy_talent_workshop_custom_width', String(width));
          return width;
        });
        setCustomPopupHeight((height) => {
          window.localStorage.setItem('mos_academy_talent_workshop_custom_height', String(height));
          return height;
        });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [customPopupHeight, customPopupWidth]
  );

  return {
    layoutMode,
    isAutoScaleLayout: layoutMode === 'viewport',
    customPopupWidth,
    customPopupHeight,
    isResizingPopup,
    setWorkshopLayoutMode,
    startPopupResize,
  };
}
