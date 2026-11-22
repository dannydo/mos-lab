'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import type { PanOffset, SvgDimensions } from './mermaidBlockTypes';
import { MERMAID_ZOOM_PRESETS } from './mermaidBlockUtils';
import { MermaidZoomModalToolbar } from './MermaidZoomModalToolbar';

interface MermaidTransformSurfaceProps {
  pan: PanOffset;
  zoom: number;
  isDragging: boolean;
  svgDimensions: SvgDimensions;
  svgMarkup: string;
}

const MermaidTransformSurface: React.FC<MermaidTransformSurfaceProps> = ({
  pan,
  zoom,
  isDragging,
  svgDimensions,
  svgMarkup,
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Imperatively sync continuous drag and zoom coordinates before paint
  useLayoutEffect(() => {
    const node = surfaceRef.current;
    if (!node) return;
    node.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    node.style.transformOrigin = 'center center';
    node.style.transition = isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
    node.style.width = `${svgDimensions.width}px`;
    node.style.height = `${svgDimensions.height}px`;
  }, [pan.x, pan.y, zoom, isDragging, svgDimensions.width, svgDimensions.height]);

  return (
    <div
      ref={surfaceRef}
      className="pointer-events-auto flex items-center justify-center shrink-0 [&_svg]:max-w-none [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};

export interface MermaidZoomModalProps {
  open: boolean;
  isDark: boolean;
  zoom: number;
  pan: PanOffset;
  isDragging: boolean;
  isFullscreenWindow: boolean;
  isCopied: boolean;
  svgDimensions: SvgDimensions;
  svgMarkup: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onSetPresetZoom: (preset: number) => void;
  onToggleFullscreenWindow: () => void;
  onDownloadSvg: () => void;
  onCopy: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const MermaidZoomModal: React.FC<MermaidZoomModalProps> = ({
  open,
  isDark,
  zoom,
  pan,
  isDragging,
  isFullscreenWindow,
  isCopied,
  svgDimensions,
  svgMarkup,
  canvasRef,
  onClose,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onFitToScreen,
  onSetPresetZoom,
  onToggleFullscreenWindow,
  onDownloadSvg,
  onCopy,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      intent="data"
      width={isFullscreenWindow ? '100vw' : 'calc(100vw - 24px)'}
      centered={!isFullscreenWindow}
      destroyOnHidden
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      className={
        isFullscreenWindow
          ? '[&.ant-modal]:top-0 [&.ant-modal]:m-0 [&.ant-modal]:p-0 [&.ant-modal]:max-w-none'
          : '[&.ant-modal]:top-3 [&.ant-modal]:pb-3 [&.ant-modal]:mx-auto [&.ant-modal]:max-w-[calc(100vw-24px)]'
      }
      closable={{
        closeIcon: (
          <span
            aria-label="Đóng xem sơ đồ toàn màn hình"
            className={`inline-flex items-center justify-center p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </span>
        ),
      }}
      styles={{
        content: {
          padding: '12px 16px',
          background: isDark ? 'rgb(11, 17, 32)' : 'rgb(255, 255, 255)',
          borderRadius: isFullscreenWindow ? '0px' : '14px',
          border: isDark ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        },
      }}
      title={
        <MermaidZoomModalToolbar
          isDark={isDark}
          zoom={zoom}
          isFullscreenWindow={isFullscreenWindow}
          isCopied={isCopied}
          onZoomOut={onZoomOut}
          onZoomIn={onZoomIn}
          onResetZoom={onResetZoom}
          onFitToScreen={onFitToScreen}
          onToggleFullscreenWindow={onToggleFullscreenWindow}
          onDownloadSvg={onDownloadSvg}
          onCopy={onCopy}
        />
      }
    >
      <div
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onFitToScreen}
        className={`relative w-full overflow-hidden rounded-xl select-none transition-all touch-none [background-size:24px_24px] ${
          isFullscreenWindow ? 'h-[calc(100vh-68px)]' : 'h-[calc(100vh-96px)]'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
          isDark
            ? 'border border-slate-400/15 bg-[rgb(11,17,32)] bg-[radial-gradient(circle,rgba(148,163,184,0.18)_1.2px,transparent_1.2px)]'
            : 'border border-slate-200/90 bg-slate-50 bg-[radial-gradient(circle,rgba(100,116,139,0.22)_1.2px,transparent_1.2px)]'
        }`}
      >
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          <MermaidTransformSurface
            pan={pan}
            zoom={zoom}
            isDragging={isDragging}
            svgDimensions={svgDimensions}
            svgMarkup={svgMarkup}
          />
        </div>

        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border text-[11px] select-none pointer-events-auto ${
            isDark
              ? 'bg-slate-900/85 border-slate-400/20 text-slate-300'
              : 'bg-white/90 border-slate-300/80 text-slate-600'
          }`}
        >
          <span className="hidden md:inline font-medium">
            💡 Cuộn chuột / Phím +/- để phóng to • Kéo rê để di chuyển • Nhấp đúp để vừa khung
          </span>

          <div className="flex items-center gap-1 pl-1 font-mono text-[10.5px] tabular-nums">
            {MERMAID_ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSetPresetZoom(preset)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  Math.abs(zoom - preset) < 0.05
                    ? 'bg-purple-600 text-white font-bold'
                    : isDark
                      ? 'hover:bg-slate-700 text-slate-400'
                      : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
};
