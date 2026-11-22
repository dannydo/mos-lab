'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanPosition } from './mermaidViewerTypes';

export interface UseMermaidViewportOptions {
  diagramId: string;
}

export interface UseMermaidViewportResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  svgWrapperRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: PanPosition;
  isDragging: boolean;
  isFullscreen: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToScreen: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  toggleFullscreen: () => void;
  openIn4KWindow: () => void;
}

export function useMermaidViewport({ diagramId }: UseMermaidViewportOptions): UseMermaidViewportResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<PanPosition>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = useCallback(() => setZoom((prev) => Math.min(prev + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((prev) => Math.max(prev - 0.2, 0.2)), []);
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !svgWrapperRef.current) return;
    const svgEl = svgWrapperRef.current.querySelector('svg');
    if (!svgEl) return;

    const containerWidth = containerRef.current.clientWidth - 48;
    const containerHeight = containerRef.current.clientHeight - 80;

    let svgWidth = 1000;
    let svgHeight = 1200;

    const viewBox = svgEl.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        svgWidth = parts[2];
        svgHeight = parts[3];
      }
    }

    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    const fitScale = Math.min(scaleX, scaleY);

    setZoom(Math.max(fitScale, 0.15));
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.node')) {
        return;
      }
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan.x, pan.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [dragStart.x, dragStart.y, isDragging]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.1, 3));
    } else {
      setZoom((prev) => Math.max(prev - 0.1, 0.15));
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setTimeout(handleFitToScreen, 150);
        })
        .catch(console.error);
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          setTimeout(handleFitToScreen, 150);
        })
        .catch(console.error);
    }
  }, [handleFitToScreen]);

  const openIn4KWindow = useCallback(() => {
    const standaloneUrl = `/dashboard/diagrams?standalone=true&id=${encodeURIComponent(diagramId)}`;
    window.open(standaloneUrl, '_blank', 'width=3840,height=2160,menubar=no,toolbar=no,location=no,status=no');
  }, [diagramId]);

  return {
    containerRef,
    svgWrapperRef,
    zoom,
    pan,
    isDragging,
    isFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    toggleFullscreen,
    openIn4KWindow,
  };
}
