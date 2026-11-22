'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { copyImageToClipboard, copyImageUrlToClipboard, downloadImage } from '../../utils/chat-image-copy';
import {
  COPY_FEEDBACK_DURATION_MS,
  DRAG_THRESHOLD_PX,
  WHEEL_ZOOM_STEP,
  ZOOM_FIT_TOLERANCE,
  ZOOM_STEP,
  calcLightboxFitZoom,
  clampLightboxZoom,
  type ImageDimensions,
  type MosChatImageLightboxState,
  type PanOffset,
} from './lightboxTypes';

export interface UseMosChatImageLightboxParams {
  lightboxImage: MosChatImageLightboxState;
  setLightboxImage: React.Dispatch<React.SetStateAction<MosChatImageLightboxState | null>>;
}

export function useMosChatImageLightbox({ lightboxImage, setLightboxImage }: UseMosChatImageLightboxParams) {
  const totalItems = lightboxImage.items.length;
  const currentItem = lightboxImage.items[lightboxImage.currentIndex] || lightboxImage.items[0];

  // Pan & Drag state for smooth navigation when zoomed in
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<PanOffset>({ x: 0, y: 0 });
  const didDragRef = useRef<boolean>(false);

  // Natural image dimensions & dynamic calculated Fit zoom
  const [imageDims, setImageDims] = useState<ImageDimensions | null>(null);
  const [fitZoom, setFitZoom] = useState<number>(1);

  // Immediate visual feedback toast inside Lightbox when copying
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyFeedback = useCallback((msg: string) => {
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }
    setCopiedFeedback(msg);
    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopiedFeedback(null);
    }, COPY_FEEDBACK_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  // Reset pan & dimensions when switching image
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setImageDims(null);
  }, [lightboxImage.currentIndex]);

  // Handle image load: capture natural dimensions & auto-fit on load if large
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      if (nw && nh) {
        setImageDims({ width: nw, height: nh });
        const fit = calcLightboxFitZoom(nw, nh);
        setFitZoom(fit);
        // Auto-fit if image exceeds viewport and zoom is default 1
        setLightboxImage((prev) => {
          if (!prev) return null;
          if (prev.zoom === 1 && fit < 1) {
            return { ...prev, zoom: fit };
          }
          return prev;
        });
      }
    },
    [setLightboxImage]
  );

  // Recalculate fitZoom on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageDims) {
        setFitZoom(calcLightboxFitZoom(imageDims.width, imageDims.height));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDims]);

  const stepImageIndex = useCallback(
    (delta: number) => {
      setPan({ x: 0, y: 0 });
      setImageDims(null);
      setLightboxImage((prev) =>
        prev
          ? {
              ...prev,
              currentIndex: (prev.currentIndex + delta + prev.items.length) % prev.items.length,
              zoom: 1,
              rotate: 0,
            }
          : null
      );
    },
    [setLightboxImage]
  );

  const goPrev = useCallback(() => stepImageIndex(-1), [stepImageIndex]);
  const goNext = useCallback(() => stepImageIndex(1), [stepImageIndex]);

  const selectImageIndex = useCallback(
    (idx: number) => {
      setPan({ x: 0, y: 0 });
      setImageDims(null);
      setLightboxImage((prev) => (prev ? { ...prev, currentIndex: idx, zoom: 1, rotate: 0 } : null));
    },
    [setLightboxImage]
  );

  const handleZoomIn = useCallback(() => {
    setLightboxImage((prev) => (prev ? { ...prev, zoom: clampLightboxZoom(prev.zoom + ZOOM_STEP) } : null));
  }, [setLightboxImage]);

  const handleZoomOut = useCallback(() => {
    setLightboxImage((prev) => {
      if (!prev) return null;
      const nextZoom = clampLightboxZoom(prev.zoom - ZOOM_STEP);
      if (nextZoom <= fitZoom) setPan({ x: 0, y: 0 });
      return { ...prev, zoom: nextZoom };
    });
  }, [fitZoom, setLightboxImage]);

  // Fit to screen action
  const handleFitZoom = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setLightboxImage((prev) => (prev ? { ...prev, zoom: fitZoom, rotate: 0 } : null));
  }, [fitZoom, setLightboxImage]);

  // 100% 1:1 original size action
  const handleActualSizeZoom = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setLightboxImage((prev) => (prev ? { ...prev, zoom: 1 } : null));
  }, [setLightboxImage]);

  const handleSetPresetZoom = useCallback(
    (preset: number) => {
      if (preset <= fitZoom) setPan({ x: 0, y: 0 });
      setLightboxImage((prev) => (prev ? { ...prev, zoom: preset } : null));
    },
    [fitZoom, setLightboxImage]
  );

  const handleRotate = useCallback(() => {
    setLightboxImage((prev) => (prev ? { ...prev, rotate: (prev.rotate + 90) % 360 } : null));
  }, [setLightboxImage]);

  const handleCopyImage = useCallback(async () => {
    if (!currentItem?.url) return;
    const ok = await copyImageToClipboard(currentItem.url);
    if (ok) {
      showCopyFeedback('Đã sao chép hình ảnh vào bộ nhớ tạm');
    }
  }, [currentItem, showCopyFeedback]);

  const handleCopyUrl = useCallback(async () => {
    if (!currentItem?.url) return;
    const ok = await copyImageUrlToClipboard(currentItem.url);
    if (ok) {
      showCopyFeedback('Đã sao chép liên kết hình ảnh');
    }
  }, [currentItem, showCopyFeedback]);

  const handleDownloadImage = useCallback(() => {
    if (currentItem?.url) {
      downloadImage(currentItem.url, currentItem.name);
    }
  }, [currentItem]);

  // Check if current zoom is within tolerance of Fit or 100%
  const isCurrentFit = Math.abs(lightboxImage.zoom - fitZoom) < ZOOM_FIT_TOLERANCE;
  const isCurrent100 = Math.abs(lightboxImage.zoom - 1) < ZOOM_FIT_TOLERANCE;

  // Double click toggles between Fit to Screen and 100% Original Size (macOS Preview / Figma convention)
  const handleDoubleClick = useCallback(() => {
    if (isCurrentFit) {
      handleActualSizeZoom();
    } else {
      handleFitZoom();
    }
  }, [isCurrentFit, handleActualSizeZoom, handleFitZoom]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left click
      didDragRef.current = false;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failures on detached or synthetic nodes
      }
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    },
    [pan.x, pan.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
      const dy = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
      if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
        didDragRef.current = true;
      }
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging, pan.x, pan.y]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Ignore release failures on detached or synthetic nodes
        }
        setIsDragging(false);
      }
    },
    [isDragging]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP;
      setLightboxImage((prev) => {
        if (!prev) return null;
        const nextZoom = clampLightboxZoom(prev.zoom + delta);
        if (nextZoom <= fitZoom) setPan({ x: 0, y: 0 });
        return { ...prev, zoom: nextZoom };
      });
    },
    [fitZoom, setLightboxImage]
  );

  const handleClose = useCallback(() => {
    setLightboxImage(null);
  }, [setLightboxImage]);

  // Backdrop click closes viewer only if user didn't drag
  const handleBackdropClick = useCallback(() => {
    if (didDragRef.current) return;
    handleClose();
  }, [handleClose]);

  // Comprehensive keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      // F or 0: Zoom Fit
      if (e.key.toLowerCase() === 'f' || e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        handleFitZoom();
        return;
      }

      // 1: 100% Original Size
      if (e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        handleActualSizeZoom();
        return;
      }

      // + or =: Zoom In
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        handleZoomIn();
        return;
      }

      // -: Zoom Out
      if (e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        handleZoomOut();
        return;
      }

      // R: Rotate 90 deg
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopPropagation();
        handleRotate();
        return;
      }

      // C or Ctrl+C / Cmd+C: Copy image to clipboard
      if (
        (e.key.toLowerCase() === 'c' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        void handleCopyImage();
        return;
      }

      // Arrows for Prev / Next
      if (totalItems > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          goPrev();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          goNext();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    handleClose,
    handleFitZoom,
    handleActualSizeZoom,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handleCopyImage,
    goPrev,
    goNext,
    totalItems,
  ]);

  return {
    totalItems,
    currentItem,
    pan,
    isDragging,
    imageDims,
    fitZoom,
    copiedFeedback,
    isCurrentFit,
    isCurrent100,
    handleImageLoad,
    goPrev,
    goNext,
    selectImageIndex,
    handleZoomIn,
    handleZoomOut,
    handleFitZoom,
    handleActualSizeZoom,
    handleSetPresetZoom,
    handleRotate,
    handleCopyImage,
    handleCopyUrl,
    handleDownloadImage,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleBackdropClick,
    handleClose,
  };
}
