'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';
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
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Swipe & Pull-to-dismiss gesture state
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [pullDownOffsetY, setPullDownOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const gestureDirectionRef = useRef<'horizontal' | 'vertical' | 'undecided'>('undecided');
  const lastTapRef = useRef<number>(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Sync initialIndex on open
  useEffect(() => {
    if (open) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(validIndex);
      setIsZoomed(false);
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
  }, [open, initialIndex, images.length]);

  // Auto-scroll thumbnail strip to active image
  useEffect(() => {
    if (!open || !thumbnailsRef.current) return;
    const activeThumb = thumbnailsRef.current.children[currentIndex] as HTMLElement | undefined;
    if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex, open]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, images.length, onClose]);

  const currentImage = images[currentIndex] || images[0];

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      setCurrentIndex((prev) => prev - 1);
      setIsZoomed(false);
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      setCurrentIndex((prev) => prev + 1);
      setIsZoomed(false);
    }
  }, [currentIndex, images.length]);

  // Touch handlers for Messenger-style swipe & pull-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    gestureDirectionRef.current = 'undecided';
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches || e.touches.length === 0 || isZoomed) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (gestureDirectionRef.current === 'undecided') {
      if (absY > 7 && absY > absX) {
        // Vertical gesture: only pull down if moving downwards
        if (deltaY > 0) {
          gestureDirectionRef.current = 'vertical';
        }
      } else if (absX > 7 && absX > absY) {
        gestureDirectionRef.current = 'horizontal';
      }
    }

    if (gestureDirectionRef.current === 'vertical') {
      // Pull-down to dismiss
      const clampedY = Math.max(0, deltaY);
      setPullDownOffsetY(clampedY * 0.85);
    } else if (gestureDirectionRef.current === 'horizontal') {
      // Horizontal slide between images
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === images.length - 1;

      if ((isFirst && deltaX > 0) || (isLast && deltaX < 0)) {
        // Resistance at boundaries
        setDragOffsetX(deltaX * 0.3);
      } else {
        setDragOffsetX(deltaX);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (gestureDirectionRef.current === 'vertical') {
      if (pullDownOffsetY > 90) {
        // Dismiss gallery
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
      // Handle tap / double-tap when not swiping
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      if (timeSinceLastTap < 280) {
        // Double tap: toggle zoom
        setIsZoomed((prev) => !prev);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        // Single tap: toggle controls after small delay if not double tap
        setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 280) {
            setShowControls((prev) => !prev);
          }
        }, 290);
      }
    }

    gestureDirectionRef.current = 'undecided';
  };

  if (!open || !currentImage) return null;

  const totalImages = images.length;
  const dismissProgress = Math.min(1, pullDownOffsetY / 250);
  const backdropOpacity = Math.max(0.15, 1 - dismissProgress * 0.85);
  const containerScale = Math.max(0.75, 1 - dismissProgress * 0.25);

  return (
    <div
      role="dialog"
      aria-label="Xem hình ảnh đính kèm"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        backdropFilter: 'blur(16px)',
        transition: isDragging ? 'none' : 'background-color 0.25s ease-out',
      }}
    >
      {/* Top Header Bar */}
      <div
        className={`relative z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3 transition-all duration-200 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Sender Information */}
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-sm font-bold text-white truncate drop-shadow-sm">
            {currentImage.senderName || 'Người gửi'}
          </span>
          {currentImage.createdAt && (
            <span className="text-[11px] text-slate-300 tabular-nums drop-shadow-sm">
              {dayjs(currentImage.createdAt).format('HH:mm DD/MM/YYYY')}
            </span>
          )}
        </div>

        {/* Center: Image Count Indicator */}
        {totalImages > 1 && (
          <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs font-bold text-amber-400 tabular-nums shadow-lg backdrop-blur-md">
            {currentIndex + 1} / {totalImages}
          </div>
        )}

        {/* Right: Actions (Download & Close) */}
        <div className="flex items-center gap-2">
          <a
            href={resolveMediaUrl(currentImage.url)}
            target="_blank"
            rel="noopener noreferrer"
            download={currentImage.name || `photo-${currentIndex + 1}.jpg`}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white backdrop-blur-md transition-all shadow-sm"
            aria-label="Mở hoặc tải ảnh gốc"
            title="Mở hoặc tải ảnh gốc"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white backdrop-blur-md transition-all shadow-sm"
            aria-label="Đóng xem hình"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Swipeable Slides Viewport */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                className="w-screen h-full flex-shrink-0 flex items-center justify-center p-2"
                style={{ width: '100vw' }}
              >
                <img
                  src={fullUrl}
                  alt={img.name || `Hình ảnh ${idx + 1}`}
                  draggable={false}
                  className={`max-w-full max-h-[82vh] object-contain rounded-lg transition-transform duration-200 ${
                    isCurrent && isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                  }`}
                  style={{
                    filter: isCurrent ? 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))' : 'none',
                    pointerEvents: 'auto',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Previous Chevron Button (Mobile Edge Tap) */}
        {totalImages > 1 && currentIndex > 0 && showControls && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-800/90 border border-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform shadow-xl"
            aria-label="Xem hình trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Chevron Button (Mobile Edge Tap) */}
        {totalImages > 1 && currentIndex < totalImages - 1 && showControls && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-800/90 border border-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform shadow-xl"
            aria-label="Xem hình tiếp theo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails & Swipe Helper */}
      <div
        className={`relative z-20 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 transition-all duration-200 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {totalImages > 1 ? (
          <div className="flex flex-col items-center gap-2">
            {/* Horizontal Mini Thumbnails Strip */}
            <div
              ref={thumbnailsRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full px-2 py-1 scroll-smooth"
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
                      setIsZoomed(false);
                    }}
                    className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 transition-all active:scale-95 ${
                      isSelected ? 'ring-2 ring-amber-400 scale-105 opacity-100' : 'opacity-50 hover:opacity-80'
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

            <p className="text-[11px] text-slate-400 font-medium tracking-tight">
              Vuốt ngang để đổi hình · Vuốt xuống để đóng
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Chạm 2 lần để phóng to · Vuốt xuống để đóng
          </p>
        )}
      </div>
    </div>
  );
};
