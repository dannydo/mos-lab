'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getResponsiveTier, type ResponsiveTier } from '@mos-lab/shared';

type StoreListener = () => void;
export type ViewportSize = { width: number; height: number };

const SERVER_VIEWPORT_SIZE: ViewportSize = { width: 1200, height: 800 };
let viewportSize: ViewportSize = SERVER_VIEWPORT_SIZE;

/**
 * Central source for CSS-pixel viewport dimensions. Feature components use
 * this helper for one-off geometry (such as drag clamping) rather than
 * reading browser globals independently.
 */
export function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') return SERVER_VIEWPORT_SIZE;

  const visualViewport = window.visualViewport;
  return {
    width: Math.round(visualViewport?.width || window.innerWidth || document.documentElement.clientWidth),
    height: Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight),
  };
}

function refreshViewportSize() {
  const next = getViewportSize();
  if (next.width !== viewportSize.width || next.height !== viewportSize.height) {
    viewportSize = next;
  }
}

/**
 * A single resize subscription is shared by every consumer. Feature code must
 * use this hook instead of attaching its own window resize listener.
 */
const listeners = new Set<StoreListener>();
let stopListening: (() => void) | null = null;

function emitChange() {
  refreshViewportSize();
  listeners.forEach((listener) => listener());
}

function startListening() {
  if (typeof window === 'undefined' || stopListening) return;

  refreshViewportSize();
  const viewport = window.visualViewport;
  window.addEventListener('resize', emitChange, { passive: true });
  viewport?.addEventListener('resize', emitChange, { passive: true });
  viewport?.addEventListener('scroll', emitChange, { passive: true });

  stopListening = () => {
    window.removeEventListener('resize', emitChange);
    viewport?.removeEventListener('resize', emitChange);
    viewport?.removeEventListener('scroll', emitChange);
    stopListening = null;
  };
}

function subscribe(listener: StoreListener) {
  listeners.add(listener);
  startListening();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopListening?.();
  };
}

function getClientTierSnapshot(): ResponsiveTier {
  const { width, height } = getViewportSize();
  return getResponsiveTier(width, height);
}

function getClientViewportSnapshot(): ViewportSize {
  refreshViewportSize();
  return viewportSize;
}

/**
 * The SSR value is intentionally desktop: it keeps the server markup useful
 * for internal users while React reconciles to the actual browser tier after
 * hydration without reading browser globals during render.
 */
function getServerTierSnapshot(): ResponsiveTier {
  return 'desktop';
}

export function useResponsiveTier(): ResponsiveTier {
  return useSyncExternalStore(subscribe, getClientTierSnapshot, getServerTierSnapshot);
}

export function useViewportSize(): ViewportSize {
  return useSyncExternalStore(subscribe, getClientViewportSnapshot, () => SERVER_VIEWPORT_SIZE);
}

export function useMediaQuery(query: string): boolean {
  const subscribeToQuery = useCallback(
    (listener: StoreListener) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribeToQuery, getSnapshot, getServerSnapshot);
}

export function useIsCompactViewport(): boolean {
  const tier = useResponsiveTier();
  return tier === 'mobile' || tier === 'tablet';
}
