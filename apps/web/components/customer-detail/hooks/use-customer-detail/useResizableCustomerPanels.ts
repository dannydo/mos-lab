'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getViewportSize } from '../../../../hooks/useResponsiveTier';
import type { DragStartInfo, ResizeDirection } from './types';

interface ResizableModalConfig {
  defaultWidth: number;
  minWidth: number;
  storageKey: string;
}

const DRAWER_WIDTH_STORAGE_KEY = 'customer_detail_drawer_width';

function useResizableModalWidth({ defaultWidth, minWidth, storageKey }: ResizableModalConfig) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState<DragStartInfo | null>(null);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setWidth(parseInt(saved, 10));
      }
    }
  }, [storageKey]);

  const handleDragStart = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    setDragStartInfo({
      x: e.clientX,
      width: widthRef.current,
      direction,
    });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging || !dragStartInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartInfo.direction === 'right' ? e.clientX - dragStartInfo.x : dragStartInfo.x - e.clientX;
      const newWidth = dragStartInfo.width + deltaX * 2;
      const maxWidth = getViewportSize().width * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartInfo(null);
      localStorage.setItem(storageKey, String(widthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartInfo, minWidth, storageKey]);

  return { width, handleDragStart };
}

export function useResizableCustomerPanels() {
  const [isDragging, setIsDragging] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(1100);
  const widthRef = useRef(drawerWidth);

  useEffect(() => {
    widthRef.current = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
      if (saved) {
        setDrawerWidth(parseInt(saved, 10));
      }
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewportWidth = getViewportSize().width;
      const newWidth = viewportWidth - e.clientX;
      const minWidth = 500;
      const maxWidth = viewportWidth * 0.95;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(widthRef.current));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const comboModal = useResizableModalWidth({
    defaultWidth: 800,
    minWidth: 500,
    storageKey: 'customer_combo_modal_width',
  });
  const gemModal = useResizableModalWidth({
    defaultWidth: 750,
    minWidth: 500,
    storageKey: 'customer_gem_modal_width',
  });
  const tipModal = useResizableModalWidth({
    defaultWidth: 750,
    minWidth: 500,
    storageKey: 'customer_tip_modal_width',
  });
  const revenueModal = useResizableModalWidth({
    defaultWidth: 1050,
    minWidth: 600,
    storageKey: 'customer_revenue_modal_width',
  });

  return {
    drawerWidth,
    isDragging,
    modalWidth: comboModal.width,
    gemModalWidth: gemModal.width,
    tipModalWidth: tipModal.width,
    revenueModalWidth: revenueModal.width,
    handleMouseDown,
    handleModalDragStart: comboModal.handleDragStart,
    handleGemModalDragStart: gemModal.handleDragStart,
    handleTipModalDragStart: tipModal.handleDragStart,
    handleRevenueModalDragStart: revenueModal.handleDragStart,
  };
}
