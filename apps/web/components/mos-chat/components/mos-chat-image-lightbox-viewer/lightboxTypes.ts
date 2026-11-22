import type React from 'react';

export interface MosChatImageLightboxItem {
  id?: string;
  url: string;
  name?: string;
}

export interface MosChatImageLightboxState {
  items: MosChatImageLightboxItem[];
  currentIndex: number;
  zoom: number;
  rotate: number;
}

export interface MosChatImageLightboxViewerProps {
  lightboxImage: MosChatImageLightboxState;
  setLightboxImage: React.Dispatch<React.SetStateAction<MosChatImageLightboxState | null>>;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2, 3] as const;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.25;
export const WHEEL_ZOOM_STEP = 0.15;
export const ZOOM_FIT_TOLERANCE = 0.03;
export const ZOOM_PRESET_TOLERANCE = 0.05;
export const COPY_FEEDBACK_DURATION_MS = 2500;
export const DRAG_THRESHOLD_PX = 4;

/**
 * Compute fit scale factor relative to the viewport with generous toolbar/strip padding.
 */
export function calcLightboxFitZoom(naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight || typeof window === 'undefined') return 1;
  const availW = Math.max(200, window.innerWidth - 48);
  const availH = Math.max(200, window.innerHeight - 130);
  const scale = Math.min(availW / naturalWidth, availH / naturalHeight);
  return Number(Math.min(1, scale).toFixed(2));
}

export function clampLightboxZoom(nextZoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))));
}
