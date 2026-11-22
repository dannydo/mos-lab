'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  Check,
  Copy,
  Download,
  Maximize,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface MermaidZoomModalToolbarProps {
  isDark: boolean;
  zoom: number;
  isFullscreenWindow: boolean;
  isCopied: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onToggleFullscreenWindow: () => void;
  onDownloadSvg: () => void;
  onCopy: () => void;
}

export const MermaidZoomModalToolbar: React.FC<MermaidZoomModalToolbarProps> = ({
  isDark,
  zoom,
  isFullscreenWindow,
  isCopied,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onFitToScreen,
  onToggleFullscreenWindow,
  onDownloadSvg,
  onCopy,
}) => {
  const iconButtonClass = `p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
    isDark
      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`;

  return (
    <div className="flex items-center justify-between gap-3 text-[14px] font-bold pr-6 select-none flex-wrap">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-purple-500" />
        <span className={isDark ? 'text-slate-50' : 'text-slate-900'}>Sơ đồ quy trình (Toàn màn hình & Phóng to)</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-normal">
        <Tooltip title="Thu nhỏ (Phím -)">
          <button type="button" aria-label="Thu nhỏ sơ đồ" onClick={onZoomOut} className={iconButtonClass}>
            <ZoomOut size={14} />
          </button>
        </Tooltip>

        <Tooltip title="Bấm để đặt lại 100%">
          <button
            type="button"
            onClick={onResetZoom}
            className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-mono tabular-nums transition-all cursor-pointer font-bold ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-purple-400 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-purple-600 hover:bg-slate-100'
            }`}
          >
            {Math.round(zoom * 100)}%
          </button>
        </Tooltip>

        <Tooltip title="Phóng to (Phím +)">
          <button type="button" aria-label="Phóng to sơ đồ" onClick={onZoomIn} className={iconButtonClass}>
            <ZoomIn size={14} />
          </button>
        </Tooltip>

        <Tooltip title="Vừa khung hình (Phím 0)">
          <button
            type="button"
            aria-label="Vừa khung hình"
            onClick={onFitToScreen}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Maximize size={13} />
            <span className="hidden sm:inline">Vừa khung</span>
          </button>
        </Tooltip>

        <Tooltip title="Đặt lại kích thước gốc 100% & giữa màn hình">
          <button type="button" aria-label="Đặt lại 100%" onClick={onResetZoom} className={iconButtonClass}>
            <RotateCcw size={13} />
          </button>
        </Tooltip>

        <div className="w-[1px] h-4 bg-slate-500/20 mx-0.5" />

        <Tooltip title={isFullscreenWindow ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình duyệt'}>
          <button
            type="button"
            aria-label={isFullscreenWindow ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình duyệt'}
            onClick={onToggleFullscreenWindow}
            className={iconButtonClass}
          >
            {isFullscreenWindow ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </Tooltip>

        <Tooltip title="Tải xuống tệp đồ họa vector (SVG)">
          <button type="button" aria-label="Tải xuống tệp SVG" onClick={onDownloadSvg} className={iconButtonClass}>
            <Download size={13} />
          </button>
        </Tooltip>

        <Tooltip title={isCopied ? 'Đã sao chép' : 'Sao chép mã nguồn Mermaid'}>
          <button type="button" aria-label="Sao chép mã Mermaid" onClick={onCopy} className={iconButtonClass}>
            {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
