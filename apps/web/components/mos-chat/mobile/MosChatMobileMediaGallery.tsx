'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveMediaUrl } from '../../../lib/api-base-url';

export interface MosChatGalleryImage {
  id: string;
  url: string;
  name?: string;
  senderName?: string;
  senderRole?: string;
  createdAt?: string;
}

export interface MosChatMobileMediaGalleryProps {
  open: boolean;
  images: MosChatGalleryImage[];
  initialIndex?: number;
  onClose: () => void;
}

export const MosChatMobileMediaGallery: React.FC<MosChatMobileMediaGalleryProps> = ({
  open,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Swipe & Pull-to-dismiss gesture state
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [pullDownOffsetY, setPullDownOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Gesture tracking refs
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const gestureDirectionRef = useRef<'horizontal' | 'vertical' | 'undecided'>('undecided');
  const lastTapRef = useRef<number>(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Pinch-to-zoom tracking refs
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const isPinchingRef = useRef<boolean>(false);

  // Pan tracking refs
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef<boolean>(false);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Sync initialIndex on open
  useEffect(() => {
    if (open) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(validIndex);
      resetZoom();
      setDragOffsetX(0);
      setPullDownOffsetY(0);
      setShowControls(true);

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open, initialIndex, images.length, resetZoom]);

  // Auto-scroll thumbnail strip to active image
  useEffect(() => {
    if (!open || !thumbnailsRef.current) return;
    const activeThumb = thumbnailsRef.current.children[currentIndex] as HTMLElement | undefined;
    if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex, open]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape, +, -, 0)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          resetZoom();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < images.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          resetZoom();
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((prev) => Math.min(4, prev + 0.5));
      } else if (e.key === '-' || e.key === '_') {
        setZoomScale((prev) => {
          const next = Math.max(1, prev - 0.5);
          if (next <= 1) setPanOffset({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, images.length, currentIndex, onClose, resetZoom]);

  const currentImage = images[currentIndex] || images[0];

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      setCurrentIndex((prev) => prev - 1);
      resetZoom();
    }
  }, [currentIndex, resetZoom]);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      setCurrentIndex((prev) => prev + 1);
      resetZoom();
    }
  }, [currentIndex, images.length, resetZoom]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Touch handlers for Pinch-to-zoom, Pan, Swipe, and Pull-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches) return;

    if (e.touches.length === 2) {
      // 2 fingers: Pinch-to-zoom
      isPinchingRef.current = true;
      isPanningRef.current = false;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;
      setIsDragging(true);
      return;
    }

    if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];

      if (zoomScale > 1.05) {
        // Zoomed in: 1 finger pans the image
        isPanningRef.current = true;
        panStartRef.current = {
          x: touch.clientX - panOffset.x,
          y: touch.clientY - panOffset.y,
        };
        setIsDragging(true);
        return;
      }

      // Normal scale: horizontal slide or pull-down
      isPanningRef.current = false;
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      gestureDirectionRef.current = 'undecided';
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches) return;

    // 1. Two-finger pinch
    if (isPinchingRef.current && e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinchStartDistRef.current > 0) {
        const factor = dist / pinchStartDistRef.current;
        const newScale = Math.max(0.85, Math.min(4.5, pinchStartScaleRef.current * factor));
        setZoomScale(newScale);
      }
      return;
    }

    // 2. One-finger pan when zoomed in
    if (isPanningRef.current && e.touches.length === 1 && zoomScale > 1.05) {
      const touch = e.touches[0];
      const newPanX = touch.clientX - panStartRef.current.x;
      const newPanY = touch.clientY - panStartRef.current.y;

      const viewportW = typeof window !== 'undefined' ? window.innerWidth : 375;
      const viewportH = typeof window !== 'undefined' ? window.innerHeight : 667;
      const maxPanX = (viewportW * (zoomScale - 1)) / 2 + 50;
      const maxPanY = (viewportH * (zoomScale - 1)) / 2 + 50;

      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
      });
      return;
    }

    // 3. Normal scale (1x) swipe / pull down
    if (e.touches.length === 1 && zoomScale <= 1.05) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartRef.current.x;
      const deltaY = currentY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (gestureDirectionRef.current === 'undecided') {
        if (absY > 7 && absY > absX) {
          if (deltaY > 0) {
            gestureDirectionRef.current = 'vertical';
          }
        } else if (absX > 7 && absX > absY) {
          gestureDirectionRef.current = 'horizontal';
        }
      }

      if (gestureDirectionRef.current === 'vertical') {
        const clampedY = Math.max(0, deltaY);
        setPullDownOffsetY(clampedY * 0.85);
      } else if (gestureDirectionRef.current === 'horizontal') {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === images.length - 1;
        if ((isFirst && deltaX > 0) || (isLast && deltaX < 0)) {
          setDragOffsetX(deltaX * 0.3);
        } else {
          setDragOffsetX(deltaX);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // If pinch finished, clamp to neat scale bounds
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      if (zoomScale < 1.05) {
        resetZoom();
      } else if (zoomScale > 4) {
        setZoomScale(4);
      }
      return;
    }

    // If panning finished
    if (isPanningRef.current) {
      isPanningRef.current = false;
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      if (timeSinceLastTap < 280) {
        // Double tap while zoomed: reset to 1x
        resetZoom();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
      return;
    }

    // Normal scale gestures
    if (gestureDirectionRef.current === 'vertical') {
      if (pullDownOffsetY > 90) {
        onClose();
      } else {
        setPullDownOffsetY(0);
      }
    } else if (gestureDirectionRef.current === 'horizontal') {
      const threshold = 45;
      if (dragOffsetX < -threshold && currentIndex < images.length - 1) {
        goNext();
      } else if (dragOffsetX > threshold && currentIndex > 0) {
        goPrev();
      }
      setDragOffsetX(0);
    } else {
      // Tap or double tap
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      if (timeSinceLastTap < 280) {
        // Double tap: zoom into 2.5x
        const tapX = touchStartRef.current.x;
        const tapY = touchStartRef.current.y;
        const viewportW = typeof window !== 'undefined' ? window.innerWidth : 375;
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 667;
        const offsetX = (viewportW / 2 - tapX) * 1.2;
        const offsetY = (viewportH / 2 - tapY) * 1.2;

        setPanOffset({ x: offsetX, y: offsetY });
        setZoomScale(2.5);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 280) {
            setShowControls((prev) => !prev);
          }
        }, 290);
      }
    }

    gestureDirectionRef.current = 'undecided';
  };

  // Wheel zoom support for desktop / trackpad
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.003;
    setZoomScale((prev) => {
      const next = Math.max(1, Math.min(4, Math.round((prev + delta) * 10) / 10));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  if (!open || !currentImage) return null;

  const totalImages = images.length;
  const dismissProgress = Math.min(1, pullDownOffsetY / 250);
  const backdropOpacity = Math.max(0.15, 1 - dismissProgress * 0.85);
  const containerScale = Math.max(0.75, 1 - dismissProgress * 0.25);
  const isZoomedIn = zoomScale > 1.05;

  return (
    <div
      role="dialog"
      aria-label="Xem hình ảnh đính kèm"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none bg-black/95"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        backdropFilter: 'blur(20px)',
        transition: isDragging ? 'none' : 'background-color 0.25s ease-out',
      }}
    >
      {/* Floating Minimalist Top Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 pointer-events-none transition-all duration-200 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {/* Left: Minimal Sender Chip */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md max-w-[45%] shadow-lg">
          <span className="text-xs font-semibold text-white/95 truncate">{currentImage.senderName || 'Người gửi'}</span>
          {totalImages > 1 && (
            <span className="text-[11px] font-bold text-amber-400 tabular-nums shrink-0 ml-0.5">
              {currentIndex + 1} / {totalImages}
            </span>
          )}
        </div>

        {/* Right: Compact Floating Glass Controls Capsule */}
        <div className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md shadow-lg">
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 1}
            className="w-7 h-7 rounded-full text-white/80 hover:text-white active:scale-90 flex items-center justify-center transition-all disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Thu nhỏ ảnh"
            title="Thu nhỏ (-0.5x)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Percentage Badge / Reset */}
          <button
            type="button"
            onClick={resetZoom}
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums transition-all active:scale-95 ${
              isZoomedIn ? 'text-amber-400 bg-amber-400/20' : 'text-slate-300 hover:text-white'
            }`}
            aria-label="Đặt lại thu phóng"
            title="Đặt lại về 100%"
          >
            {Math.round(zoomScale * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 4}
            className="w-7 h-7 rounded-full text-white/80 hover:text-white active:scale-90 flex items-center justify-center transition-all disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Phóng to ảnh"
            title="Phóng to (+0.5x)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

          {/* Download Original Link */}
          <a
            href={resolveMediaUrl(currentImage.url)}
            target="_blank"
            rel="noopener noreferrer"
            download={currentImage.name || `photo-${currentIndex + 1}.jpg`}
            className="w-7 h-7 rounded-full text-white/80 hover:text-white active:scale-90 flex items-center justify-center transition-all"
            aria-label="Mở hoặc tải ảnh gốc"
            title="Mở hoặc tải ảnh gốc"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-white/80 hover:text-white active:scale-90 flex items-center justify-center transition-all ml-0.5"
            aria-label="Đóng xem hình"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Full-Viewport Image Area (100% Height & Width, Zero Outer Padding) */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center touch-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          transform: `translateY(${pullDownOffsetY}px) scale(${containerScale})`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Carousel Track containing all images side-by-side */}
        <div
          className="flex h-full w-full items-center"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffsetX}px))`,
            transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          {images.map((img, idx) => {
            const isCurrent = idx === currentIndex;
            const fullUrl = resolveMediaUrl(img.url);

            return (
              <div
                key={img.id || idx}
                className="w-screen h-full flex-shrink-0 flex items-center justify-center p-0 overflow-hidden"
                style={{ width: '100vw' }}
              >
                <img
                  src={fullUrl}
                  alt={img.name || `Hình ảnh ${idx + 1}`}
                  draggable={false}
                  className="w-full h-full max-w-full max-h-full object-contain select-none"
                  style={{
                    transform: isCurrent
                      ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`
                      : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: isCurrent ? (isZoomedIn ? 'grab' : 'zoom-in') : 'default',
                    touchAction: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Minimal Chevron Previous (Edge Tap) */}
        {totalImages > 1 && currentIndex > 0 && showControls && !isZoomedIn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            aria-label="Xem hình trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Minimal Chevron Next (Edge Tap) */}
        {totalImages > 1 && currentIndex < totalImages - 1 && showControls && !isZoomedIn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
            aria-label="Xem hình tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Minimal Floating Mini-Thumbnails Strip (Only when multiple images, ZERO redundant text) */}
      {totalImages > 1 && (
        <div
          className={`absolute bottom-0 inset-x-0 z-30 pb-[max(env(safe-area-inset-bottom),12px)] pt-1 pointer-events-none flex justify-center transition-all duration-200 ${
            showControls && !isZoomedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div
            ref={thumbnailsRef}
            className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md max-w-[85vw] overflow-x-auto no-scrollbar shadow-lg"
          >
            {images.map((img, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={img.id || idx}
                  type="button"
                  aria-label={`Xem hình ${idx + 1}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    resetZoom();
                  }}
                  className={`relative w-8 h-8 rounded-xl overflow-hidden shrink-0 transition-all active:scale-90 ${
                    isSelected ? 'ring-2 ring-amber-400 scale-105 opacity-100' : 'opacity-40 hover:opacity-75'
                  }`}
                >
                  <img
                    src={resolveMediaUrl(img.url)}
                    alt={img.name || `Hình thu nhỏ ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
