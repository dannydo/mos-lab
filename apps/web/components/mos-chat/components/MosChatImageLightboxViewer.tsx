'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dropdown, Tooltip } from 'antd';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  X,
  Maximize2,
  Copy,
  Link2,
  Check,
} from 'lucide-react';
import {
  copyImageToClipboard,
  copyImageUrlToClipboard,
  downloadImage,
} from '../utils/chat-image-copy';

export interface MosChatImageLightboxItem {
  id?: string;
  url: string;
  name?: string;
}

export interface MosChatImageLightboxViewerProps {
  lightboxImage: {
    items: MosChatImageLightboxItem[];
    currentIndex: number;
    zoom: number;
    rotate: number;
  };
  setLightboxImage: React.Dispatch<
    React.SetStateAction<{
      items: MosChatImageLightboxItem[];
      currentIndex: number;
      zoom: number;
      rotate: number;
    } | null>
  >;
}

export const MosChatImageLightboxViewer: React.FC<MosChatImageLightboxViewerProps> = ({
  lightboxImage,
  setLightboxImage,
}) => {
  const totalItems = lightboxImage.items.length;
  const currentItem = lightboxImage.items[lightboxImage.currentIndex] || lightboxImage.items[0];

  // Pan & Drag state for smooth navigation when zoomed in
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didDragRef = useRef<boolean>(false);

  // Natural image dimensions & dynamic calculated Fit zoom
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [fitZoom, setFitZoom] = useState<number>(1);

  // Immediate visual feedback toast inside Lightbox when copying
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showCopyFeedback = useCallback((msg: string) => {
    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }
    setCopiedFeedback(msg);
    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopiedFeedback(null);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  // Compute fit scale factor relative to viewport with generous padding
  const calcFitZoom = useCallback((nw: number, nh: number) => {
    if (!nw || !nh || typeof window === 'undefined') return 1;
    const availW = Math.max(200, window.innerWidth - 48);
    const availH = Math.max(200, window.innerHeight - 130);
    const scale = Math.min(availW / nw, availH / nh);
    return Number(Math.min(1, scale).toFixed(2));
  }, []);

  // Reset pan & dimensions when switching image
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setImageDims(null);
  }, [lightboxImage.currentIndex]);

  // Handle image load: capture natural dimensions & auto-fit on load if large
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (nw && nh) {
      setImageDims({ width: nw, height: nh });
      const fit = calcFitZoom(nw, nh);
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
  };

  // Recalculate fitZoom on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageDims) {
        const fit = calcFitZoom(imageDims.width, imageDims.height);
        setFitZoom(fit);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDims, calcFitZoom]);

  const goPrev = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setImageDims(null);
    setLightboxImage((prev) =>
      prev
        ? {
            ...prev,
            currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
            zoom: 1,
            rotate: 0,
          }
        : null
    );
  }, [setLightboxImage]);

  const goNext = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setImageDims(null);
    setLightboxImage((prev) =>
      prev
        ? {
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.items.length,
            zoom: 1,
            rotate: 0,
          }
        : null
    );
  }, [setLightboxImage]);

  const handleZoomIn = useCallback(() => {
    setLightboxImage((prev) => (prev ? { ...prev, zoom: Math.min(5, Number((prev.zoom + 0.25).toFixed(2))) } : null));
  }, [setLightboxImage]);

  const handleZoomOut = useCallback(() => {
    setLightboxImage((prev) => {
      if (!prev) return null;
      const nextZoom = Math.max(0.1, Number((prev.zoom - 0.25).toFixed(2)));
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

  // Context menu items on right-click
  const contextMenuItems = useMemo(
    () => [
      {
        key: 'copy-img',
        icon: <Copy size={14} style={{ color: '#fbbf24' }} />,
        label: 'Sao chép hình ảnh (Phím C)',
        onClick: handleCopyImage,
      },
      {
        key: 'copy-link',
        icon: <Link2 size={14} style={{ color: '#38bdf8' }} />,
        label: 'Sao chép liên kết hình ảnh',
        onClick: handleCopyUrl,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'download',
        icon: <Download size={14} style={{ color: '#34d399' }} />,
        label: 'Tải hình ảnh về máy',
        onClick: () => currentItem?.url && downloadImage(currentItem.url, currentItem.name),
      },
      {
        key: 'rotate',
        icon: <RotateCw size={14} style={{ color: '#818cf8' }} />,
        label: 'Xoay ảnh 90° (Phím R)',
        onClick: handleRotate,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'fit',
        icon: <Maximize2 size={14} />,
        label: 'Vừa khung hình (Phím F)',
        onClick: handleFitZoom,
      },
      {
        key: 'actual',
        icon: <Check size={14} />,
        label: 'Kích thước gốc 100% (Phím 1)',
        onClick: handleActualSizeZoom,
      },
    ],
    [handleCopyImage, handleCopyUrl, currentItem, handleRotate, handleFitZoom, handleActualSizeZoom]
  );

  // Check if current zoom is within tolerance of Fit or 100%
  const isCurrentFit = Math.abs(lightboxImage.zoom - fitZoom) < 0.03;
  const isCurrent100 = Math.abs(lightboxImage.zoom - 1) < 0.03;

  // Double click toggles between Fit to Screen and 100% Original Size (macOS Preview / Figma convention)
  const handleDoubleClick = useCallback(() => {
    if (isCurrentFit) {
      handleActualSizeZoom();
    } else {
      handleFitZoom();
    }
  }, [isCurrentFit, handleActualSizeZoom, handleFitZoom]);

  // Pointer drag events for smooth pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click
    didDragRef.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + pan.x));
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + pan.y));
    if (dx > 4 || dy > 4) {
      didDragRef.current = true;
    }
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setIsDragging(false);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setLightboxImage((prev) => {
      if (!prev) return null;
      const nextZoom = Math.min(5, Math.max(0.1, Number((prev.zoom + delta).toFixed(2))));
      if (nextZoom <= fitZoom) setPan({ x: 0, y: 0 });
      return {
        ...prev,
        zoom: nextZoom,
      };
    });
  };

  // Backdrop click closes viewer only if user didn't drag
  const handleBackdropClick = () => {
    if (didDragRef.current) return;
    setLightboxImage(null);
  };

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
        setLightboxImage(null);
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
        handleCopyImage();
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
    handleFitZoom,
    handleActualSizeZoom,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handleCopyImage,
    goPrev,
    goNext,
    setLightboxImage,
    totalItems,
  ]);

  if (!currentItem) return null;

  return (
    <div
      role="dialog"
      aria-label="Xem phóng to hình ảnh"
      data-no-chat-autofocus="true"
      onClick={handleBackdropClick}
      onWheel={handleWheel}
      className="fixed inset-0 z-[2200] flex flex-col items-center justify-center select-none overflow-hidden touch-none"
      style={{
        background: 'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Top Floating Lightbox Toolbar - Inset-X-0 flex container for 100% robust horizontal centering */}
      <div className="fixed top-3 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl max-w-[96vw] overflow-x-auto"
          style={{
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#f8fafc',
          }}
        >
          {totalItems > 1 && (
            <div className="flex items-center gap-1 pr-2 border-r border-white/15 shrink-0">
              <Tooltip title="Hình trước (Phím ←)">
                <button
                  type="button"
                  aria-label="Hình trước"
                  onClick={goPrev}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                >
                  <ChevronLeft size={15} />
                </button>
              </Tooltip>
              <span className="px-1.5 text-[11.5px] font-extrabold tabular-nums" style={{ color: '#fbbf24' }}>
                {lightboxImage.currentIndex + 1} / {totalItems}
              </span>
              <Tooltip title="Hình tiếp theo (Phím →)">
                <button
                  type="button"
                  aria-label="Hình tiếp theo"
                  onClick={goNext}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                >
                  <ChevronRight size={15} />
                </button>
              </Tooltip>
            </div>
          )}

          <span className="text-[12px] font-bold max-w-[240px] truncate pr-2 border-r border-white/15 shrink-0">
            {currentItem.name || 'Hình ảnh'}
          </span>

          {/* Zoom Out */}
          <Tooltip title="Thu nhỏ (Phím -)">
            <button
              type="button"
              aria-label="Thu nhỏ"
              onClick={handleZoomOut}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
            >
              <ZoomOut size={15} />
            </button>
          </Tooltip>

          {/* Zoom Percentage Badge / Quick Double-Click Toggle */}
          <Tooltip title="Nhấp để chuyển đổi Vừa khung hình (Fit) ↔ Kích thước gốc (100%)">
            <button
              type="button"
              onClick={handleDoubleClick}
              className={`px-2 h-6 rounded-md text-[11.5px] font-extrabold tabular-nums cursor-pointer shrink-0 transition-colors ${
                isCurrentFit ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/15 text-white'
              }`}
            >
              {isCurrentFit
                ? `Fit (${Math.round(lightboxImage.zoom * 100)}%)`
                : `${Math.round(lightboxImage.zoom * 100)}%`}
            </button>
          </Tooltip>

          {/* Zoom In */}
          <Tooltip title="Phóng to (+ hoặc lăn chuột)">
            <button
              type="button"
              aria-label="Phóng to"
              onClick={handleZoomIn}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
            >
              <ZoomIn size={15} />
            </button>
          </Tooltip>

          {/* Zoom Fit Button */}
          <Tooltip title="Vừa khung hình (Phím F hoặc 0)">
            <button
              type="button"
              aria-label="Vừa khung hình"
              onClick={handleFitZoom}
              className={`w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                isCurrentFit ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:bg-white/15 text-white'
              }`}
            >
              <Maximize2 size={14} />
            </button>
          </Tooltip>

          {/* 100% Actual Size Button */}
          <Tooltip title="Kích thước gốc 100% (Phím 1)">
            <button
              type="button"
              aria-label="Kích thước gốc 100%"
              onClick={handleActualSizeZoom}
              className={`px-1.5 h-6 rounded-md text-[11px] font-extrabold tabular-nums cursor-pointer shrink-0 transition-colors ${
                isCurrent100 ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'hover:bg-white/15 text-slate-200'
              }`}
            >
              100%
            </button>
          </Tooltip>

          {/* Rotate 90 deg */}
          <Tooltip title="Xoay ảnh 90° (Phím R)">
            <button
              type="button"
              aria-label="Xoay ảnh 90°"
              onClick={handleRotate}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
            >
              <RotateCw size={14} />
            </button>
          </Tooltip>

          {/* Copy Image to Clipboard */}
          <Tooltip title={copiedFeedback?.includes('hình ảnh') ? 'Đã sao chép ảnh!' : 'Sao chép hình ảnh (Phím C hoặc Ctrl+C / ⌘C)'}>
            <button
              type="button"
              aria-label="Sao chép hình ảnh"
              onClick={handleCopyImage}
              className={`w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                copiedFeedback?.includes('hình ảnh')
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'hover:bg-white/15 text-white'
              }`}
            >
              {copiedFeedback?.includes('hình ảnh') ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </Tooltip>

          {/* Copy Image Link */}
          <Tooltip title="Sao chép liên kết hình ảnh">
            <button
              type="button"
              aria-label="Sao chép liên kết hình ảnh"
              onClick={handleCopyUrl}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
            >
              <Link2 size={14} />
            </button>
          </Tooltip>

          {/* Download */}
          <Tooltip title="Tải hình về máy">
            <a
              href={currentItem.url}
              download={currentItem.name || 'image'}
              target="_blank"
              rel="noreferrer"
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
            >
              <Download size={14} />
            </a>
          </Tooltip>

          {/* Close Button */}
          <Tooltip title="Đóng (Phím Esc)">
            <button
              type="button"
              aria-label="Đóng xem ảnh"
              onClick={() => setLightboxImage(null)}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-rose-500/80 cursor-pointer text-white ml-1 shrink-0"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Floating Copy Feedback Banner inside Lightbox Viewport (MOS-BUG-199) */}
      {copiedFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 inset-x-0 z-[2220] flex justify-center pointer-events-none transition-all duration-200"
        >
          <div
            className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
            style={{
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.5)',
            }}
          >
            <Check size={14} className="text-white shrink-0" />
            <span>{copiedFeedback}</span>
          </div>
        </div>
      )}

      {/* Prev Navigation Floating Button */}
      {totalItems > 1 && (
        <button
          type="button"
          aria-label="Hình trước"
          title={`Hình trước (${((lightboxImage.currentIndex - 1 + totalItems) % totalItems) + 1}/${totalItems}) · Phím ←`}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next Navigation Floating Button */}
      {totalItems > 1 && (
        <button
          type="button"
          aria-label="Hình tiếp theo"
          title={`Hình tiếp theo (${((lightboxImage.currentIndex + 1) % totalItems) + 1}/${totalItems}) · Phím →`}
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Main Image Stage - Maximized viewport with smooth Drag & Pan & Right-click Context Menu */}
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={`w-full h-full flex items-center justify-center overflow-hidden touch-none select-none ${
            isDragging ? 'cursor-grabbing' : lightboxImage.zoom > fitZoom ? 'cursor-grab' : 'cursor-zoom-in'
          }`}
          style={{
            paddingTop: '52px',
            paddingBottom: totalItems > 1 ? '72px' : '48px',
          }}
        >
          <img
            src={currentItem.url}
            alt={currentItem.name || 'Hình ảnh'}
            onLoad={handleImageLoad}
            className="max-w-[98.5vw] max-h-[calc(100vh-80px)] object-contain select-none pointer-events-auto"
            style={{
              maxWidth: imageDims ? 'none' : undefined,
              maxHeight: imageDims ? 'none' : undefined,
              width: imageDims ? `${imageDims.width}px` : undefined,
              height: imageDims ? `${imageDims.height}px` : undefined,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${lightboxImage.zoom}) rotate(${lightboxImage.rotate}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
            }}
            draggable={false}
          />
        </div>
      </Dropdown>

      {/* Bottom Floating Quick Preset Bar & Helper Hint - Inset-X-0 flex container for 100% robust horizontal centering */}
      <div className="fixed bottom-3 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl border text-[11px] select-none backdrop-blur-md"
          style={{
            background: 'rgba(15, 23, 42, 0.90)',
            borderColor: 'rgba(255, 255, 255, 0.16)',
            color: '#cbd5e1',
          }}
        >
          <span className="hidden md:inline font-medium">
            💡 Chuột phải / Phím C để sao chép ảnh • Cuộn chuột / Phím +/- để phóng to • Kéo rê để di chuyển • Phím F: Vừa khung • Phím 1: 100%
          </span>

          <div className="flex items-center gap-1 pl-1 font-mono text-[10.5px]">
            {/* Fit Preset Pill */}
            <button
              type="button"
              onClick={handleFitZoom}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-bold ${
                isCurrentFit ? 'bg-amber-500 text-slate-950 shadow-xs' : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              Fit
            </button>

            {[0.5, 0.75, 1, 1.5, 2, 3].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPresetZoom(preset)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  !isCurrentFit && Math.abs(lightboxImage.zoom - preset) < 0.05
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) - Inset-X-0 flex container for 100% robust horizontal centering */}
      {totalItems > 1 && (
        <div className="fixed bottom-12 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl max-w-[85vw] overflow-x-auto shadow-2xl backdrop-blur-md"
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
            }}
          >
            {lightboxImage.items.map((item, idx) => {
              const isActive = idx === lightboxImage.currentIndex;
              return (
                <button
                  key={item.url || idx}
                  type="button"
                  aria-label={`Xem ảnh ${idx + 1}`}
                  onClick={() => {
                    setPan({ x: 0, y: 0 });
                    setImageDims(null);
                    setLightboxImage((prev) => (prev ? { ...prev, currentIndex: idx, zoom: 1, rotate: 0 } : null));
                  }}
                  className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                    isActive
                      ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt={item.name || `Hình ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
