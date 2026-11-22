'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { PanOffset, SvgDimensions } from './mermaidBlockTypes';
import { clampZoom, computeAutoFitZoom, KEYBOARD_PAN_STEP, ZOOM_STEP } from './mermaidBlockUtils';

export interface UseMermaidZoomPanOptions {
  svgHtml: string | null;
  svgDimensions: SvgDimensions;
  cleanCode: string;
}

export interface UseMermaidZoomPanResult {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  isCopied: boolean;
  zoom: number;
  pan: PanOffset;
  isDragging: boolean;
  isFullscreenWindow: boolean;
  toggleFullscreenWindow: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  handleCopy: () => Promise<void>;
  handleFitToScreen: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleSetPresetZoom: (preset: number) => void;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleDownloadSvg: () => void;
}

/**
 * Manages modal visibility, clipboard copy, SVG file export, and interactive zoom/pan gestures
 * (mouse wheel, drag panning, auto-fit, and keyboard shortcuts).
 */
export function useMermaidZoomPan({
  svgHtml,
  svgDimensions,
  cleanCode,
}: UseMermaidZoomPanOptions): UseMermaidZoomPanResult {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreenWindow, setIsFullscreenWindow] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<PanOffset>({ x: 0, y: 0 });
  const panStartRef = useRef<PanOffset>({ x: 0, y: 0 });
  const copyTimerRef = useRef<number | null>(null);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const toggleFullscreenWindow = useCallback(() => setIsFullscreenWindow((prev) => !prev), []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setIsCopied(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore clipboard errors when permission is unavailable
    }
  }, [cleanCode]);

  const handleFitToScreen = useCallback(() => {
    if (!canvasRef.current) return;
    const targetZoom = computeAutoFitZoom(canvasRef.current.clientWidth, canvasRef.current.clientHeight, svgDimensions);
    if (targetZoom === null) return;
    setZoom(targetZoom);
    setPan({ x: 0, y: 0 });
  }, [svgDimensions]);

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        handleFitToScreen();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setIsDragging(false);
      setIsFullscreenWindow(false);
    }
  }, [isModalOpen, handleFitToScreen]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => clampZoom(prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => clampZoom(prev - ZOOM_STEP));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleSetPresetZoom = useCallback((preset: number) => {
    setZoom(preset);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom via non-passive listener so scrolling scales instead of scrolling page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isModalOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      setZoom((prev) => clampZoom(prev * zoomFactor));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, y: prev.y + KEYBOARD_PAN_STEP }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, y: prev.y - KEYBOARD_PAN_STEP }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, x: prev.x + KEYBOARD_PAN_STEP }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPan((prev) => ({ ...prev, x: prev.x - KEYBOARD_PAN_STEP }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleZoomIn, handleZoomOut, handleFitToScreen]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture unavailability in synthetic events
      }
      setIsDragging(true);
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore pointer capture unavailability in synthetic events
    }
  }, []);

  const handleDownloadSvg = useCallback(() => {
    if (!svgHtml) return;
    try {
      const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-diagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Đã tải xuống tệp SVG thành công');
    } catch {
      message.error('Không thể tải tệp SVG');
    }
  }, [svgHtml]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    isCopied,
    zoom,
    pan,
    isDragging,
    isFullscreenWindow,
    toggleFullscreenWindow,
    canvasRef,
    handleCopy,
    handleFitToScreen,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSetPresetZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDownloadSvg,
  };
}
