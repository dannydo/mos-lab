'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { getViewportSize } from '~/hooks/useResponsiveTier';
import { clampTraceDrawerWidth } from './falPageHelpers';
import { TRACE_DRAWER_DEFAULT_WIDTH, TRACE_DRAWER_WIDTH_STORAGE_KEY } from './falPageTypes';

export function useTraceDrawerResize() {
  const [traceDrawerWidth, setTraceDrawerWidth] = useState(TRACE_DRAWER_DEFAULT_WIDTH);
  const [isTraceResizing, setIsTraceResizing] = useState(false);
  const [traceDrawerWidthRestored, setTraceDrawerWidthRestored] = useState(false);
  const traceResizeStartX = useRef<number | null>(null);
  const traceResizeStartWidth = useRef(TRACE_DRAWER_DEFAULT_WIDTH);

  useEffect(() => {
    try {
      const savedWidth = Number(localStorage.getItem(TRACE_DRAWER_WIDTH_STORAGE_KEY));
      if (Number.isFinite(savedWidth) && savedWidth > 0) setTraceDrawerWidth(clampTraceDrawerWidth(savedWidth));
      else setTraceDrawerWidth(clampTraceDrawerWidth(TRACE_DRAWER_DEFAULT_WIDTH));
    } catch {
      setTraceDrawerWidth(clampTraceDrawerWidth(TRACE_DRAWER_DEFAULT_WIDTH));
    } finally {
      setTraceDrawerWidthRestored(true);
    }
  }, []);

  useEffect(() => {
    const keepDrawerInViewport = () => setTraceDrawerWidth((value) => clampTraceDrawerWidth(value));
    window.addEventListener('resize', keepDrawerInViewport);
    return () => window.removeEventListener('resize', keepDrawerInViewport);
  }, []);

  useEffect(() => {
    if (!isTraceResizing) return;
    const resize = (event: MouseEvent) => {
      if (traceResizeStartX.current === null) return;
      setTraceDrawerWidth(
        clampTraceDrawerWidth(traceResizeStartWidth.current + traceResizeStartX.current - event.clientX)
      );
    };
    const finishResize = () => {
      setIsTraceResizing(false);
      traceResizeStartX.current = null;
    };
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', finishResize);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', finishResize);
    };
  }, [isTraceResizing]);

  useEffect(() => {
    if (traceDrawerWidthRestored && !isTraceResizing) {
      try {
        localStorage.setItem(TRACE_DRAWER_WIDTH_STORAGE_KEY, String(traceDrawerWidth));
      } catch {
        // Storage can be unavailable in private browser contexts; resizing still works for this session.
      }
    }
  }, [isTraceResizing, traceDrawerWidth, traceDrawerWidthRestored]);

  const startTraceResize = (event: React.MouseEvent<HTMLDivElement>) => {
    if (getViewportSize().width < 640) return;
    event.preventDefault();
    traceResizeStartX.current = event.clientX;
    traceResizeStartWidth.current = traceDrawerWidth;
    setIsTraceResizing(true);
  };

  return {
    traceDrawerWidth,
    isTraceResizing,
    startTraceResize,
  };
}
