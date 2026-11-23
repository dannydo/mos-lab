'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Link2,
  Maximize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface LightboxTopToolbarProps {
  totalItems: number;
  currentIndex: number;
  currentName?: string;
  currentUrl: string;
  zoom: number;
  isCurrentFit: boolean;
  isCurrent100: boolean;
  copiedFeedback: string | null;
  onPrev: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleFitOrActual: () => void;
  onFitZoom: () => void;
  onActualSizeZoom: () => void;
  onRotate: () => void;
  onCopyImage: () => void;
  onCopyUrl: () => void;
  onClose: () => void;
}

export const LightboxTopToolbar: React.FC<LightboxTopToolbarProps> = ({
  totalItems,
  currentIndex,
  currentName,
  currentUrl,
  zoom,
  isCurrentFit,
  isCurrent100,
  copiedFeedback,
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  onToggleFitOrActual,
  onFitZoom,
  onActualSizeZoom,
  onRotate,
  onCopyImage,
  onCopyUrl,
  onClose,
}) => {
  const isImageCopied = Boolean(copiedFeedback?.includes('hình ảnh'));

  return (
    <div className="fixed top-3 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl max-w-[96vw] overflow-x-auto bg-[rgba(15,23,42,0.94)] border border-white/[0.16] text-slate-50"
      >
        {totalItems > 1 && (
          <div className="flex items-center gap-1 pr-2 border-r border-white/15 shrink-0">
            <Tooltip title="Hình trước (Phím ←)">
              <button
                type="button"
                aria-label="Hình trước"
                onClick={onPrev}
                className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
              >
                <ChevronLeft size={15} />
              </button>
            </Tooltip>
            <span className="px-1.5 text-[11.5px] font-extrabold tabular-nums text-amber-400">
              {currentIndex + 1} / {totalItems}
            </span>
            <Tooltip title="Hình tiếp theo (Phím →)">
              <button
                type="button"
                aria-label="Hình tiếp theo"
                onClick={onNext}
                className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
              >
                <ChevronRight size={15} />
              </button>
            </Tooltip>
          </div>
        )}

        <span className="text-[12px] font-bold max-w-[240px] truncate pr-2 border-r border-white/15 shrink-0">
          {currentName || 'Hình ảnh'}
        </span>

        {/* Zoom Out */}
        <Tooltip title="Thu nhỏ (Phím -)">
          <button
            type="button"
            aria-label="Thu nhỏ"
            onClick={onZoomOut}
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
          >
            <ZoomOut size={15} />
          </button>
        </Tooltip>

        {/* Zoom Percentage Badge / Quick Double-Click Toggle */}
        <Tooltip title="Nhấp để chuyển đổi Vừa khung hình (Fit) ↔ Kích thước gốc (100%)">
          <button
            type="button"
            onClick={onToggleFitOrActual}
            className={`px-2 h-6 rounded-md text-[11.5px] font-extrabold tabular-nums cursor-pointer shrink-0 transition-colors ${
              isCurrentFit ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/15 text-white'
            }`}
          >
            {isCurrentFit ? `Fit (${Math.round(zoom * 100)}%)` : `${Math.round(zoom * 100)}%`}
          </button>
        </Tooltip>

        {/* Zoom In */}
        <Tooltip title="Phóng to (+ hoặc lăn chuột)">
          <button
            type="button"
            aria-label="Phóng to"
            onClick={onZoomIn}
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
            onClick={onFitZoom}
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
            onClick={onActualSizeZoom}
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
            onClick={onRotate}
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
          >
            <RotateCw size={14} />
          </button>
        </Tooltip>

        {/* Copy Image to Clipboard */}
        <Tooltip title={isImageCopied ? 'Đã sao chép ảnh!' : 'Sao chép hình ảnh (Phím C hoặc Ctrl+C / ⌘C)'}>
          <button
            type="button"
            aria-label="Sao chép hình ảnh"
            onClick={onCopyImage}
            className={`w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
              isImageCopied ? 'bg-emerald-500 text-slate-950 font-bold shadow-md' : 'hover:bg-white/15 text-white'
            }`}
          >
            {isImageCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </Tooltip>

        {/* Copy Image Link */}
        <Tooltip title="Sao chép liên kết hình ảnh">
          <button
            type="button"
            aria-label="Sao chép liên kết hình ảnh"
            onClick={onCopyUrl}
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white shrink-0"
          >
            <Link2 size={14} />
          </button>
        </Tooltip>

        {/* Download */}
        <Tooltip title="Tải hình về máy">
          <a
            href={currentUrl}
            download={currentName || 'image'}
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
            onClick={onClose}
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-rose-500/80 cursor-pointer text-white ml-1 shrink-0"
          >
            <X size={15} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
