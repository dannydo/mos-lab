'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, X, Maximize2 } from 'lucide-react';

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

  // Reset pan when switching image
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [lightboxImage.currentIndex]);

  const goPrev = useCallback(() => {
    setPan({ x: 0, y: 0 });
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
      const nextZoom = Math.max(0.35, Number((prev.zoom - 0.25).toFixed(2)));
      if (nextZoom <= 1) setPan({ x: 0, y: 0 });
      return { ...prev, zoom: nextZoom };
    });
  }, [setLightboxImage]);

  const handleResetZoom = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setLightboxImage((prev) => (prev ? { ...prev, zoom: 1, rotate: 0 } : null));
  }, [setLightboxImage]);

  const handleSetPresetZoom = useCallback(
    (preset: number) => {
      if (preset <= 1) setPan({ x: 0, y: 0 });
      setLightboxImage((prev) => (prev ? { ...prev, zoom: preset } : null));
    },
    [setLightboxImage]
  );

  const handleRotate = useCallback(() => {
    setLightboxImage((prev) => (prev ? { ...prev, rotate: (prev.rotate + 90) % 360 } : null));
  }, [setLightboxImage]);

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

  // Double click toggles between 1x (reset) and 2x zoom
  const handleDoubleClick = () => {
    if (lightboxImage.zoom > 1 || pan.x !== 0 || pan.y !== 0) {
      handleResetZoom();
    } else {
      handleSetPresetZoom(2);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setLightboxImage((prev) => {
      if (!prev) return null;
      const nextZoom = Math.min(5, Math.max(0.35, Number((prev.zoom + delta).toFixed(2))));
      if (nextZoom <= 1) setPan({ x: 0, y: 0 });
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
      {/* Top Floating Lightbox Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl max-w-[96vw] overflow-x-auto"
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

        {/* Zoom Percentage Badge / Reset */}
        <Tooltip title="Nhấn để đưa về kích thước gốc 100%">
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 h-6 rounded-md text-[11.5px] font-extrabold tabular-nums hover:bg-white/15 cursor-pointer shrink-0"
            style={{ color: '#fbbf24' }}
          >
            {Math.round(lightboxImage.zoom * 100)}%
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

        {/* Fit / Reset */}
        <Tooltip title="Vừa khung hình (Đặt lại 100% & giữa màn hình)">
          <button
            type="button"
            aria-label="Vừa khung hình"
            onClick={handleResetZoom}
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
          >
            <RotateCcw size={14} />
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

      {/* Main Image Stage - Maximized viewport with smooth Drag & Pan */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full flex items-center justify-center overflow-hidden touch-none select-none ${
          isDragging ? 'cursor-grabbing' : lightboxImage.zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        }`}
        style={{
          paddingTop: '52px',
          paddingBottom: totalItems > 1 ? '72px' : '48px',
        }}
      >
        <img
          src={currentItem.url}
          alt={currentItem.name || 'Hình ảnh'}
          className="max-w-[98.5vw] max-h-[calc(100vh-80px)] object-contain select-none pointer-events-none"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${lightboxImage.zoom}) rotate(${lightboxImage.rotate}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
          }}
          draggable={false}
        />
      </div>

      {/* Bottom Floating Quick Preset Bar & Helper Hint */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl border text-[11px] select-none backdrop-blur-md"
        style={{
          background: 'rgba(15, 23, 42, 0.90)',
          borderColor: 'rgba(255, 255, 255, 0.16)',
          color: '#cbd5e1',
        }}
      >
        <span className="hidden md:inline font-medium">
          💡 Cuộn chuột / Phím +/- để phóng to • Kéo rê để di chuyển • Nhấp đúp để đặt lại
        </span>

        <div className="flex items-center gap-1 pl-1 font-mono text-[10.5px]">
          {[0.5, 0.75, 1, 1.5, 2, 3].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSetPresetZoom(preset)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                Math.abs(lightboxImage.zoom - preset) < 0.05
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {totalItems > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-2 px-3 py-1.5 rounded-2xl max-w-[85vw] overflow-x-auto shadow-2xl backdrop-blur-md"
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
      )}
    </div>
  );
};
