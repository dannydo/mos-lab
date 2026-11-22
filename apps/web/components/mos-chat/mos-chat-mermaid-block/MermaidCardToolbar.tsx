'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { AlertCircle, Check, Code2, Copy, Eye, Maximize2, Sparkles } from 'lucide-react';
import type { MermaidViewMode } from './mermaidBlockTypes';

export interface MermaidCardToolbarProps {
  isDark: boolean;
  renderError: string | null;
  viewMode: MermaidViewMode;
  hasSvg: boolean;
  isCopied: boolean;
  onViewModeChange: (mode: MermaidViewMode) => void;
  onOpenModal: () => void;
  onCopy: () => void;
}

export const MermaidCardToolbar: React.FC<MermaidCardToolbarProps> = ({
  isDark,
  renderError,
  viewMode,
  hasSvg,
  isCopied,
  onViewModeChange,
  onOpenModal,
  onCopy,
}) => {
  const inactiveModeClass = isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/5'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60';

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 text-[11px] select-none border-b ${
        isDark ? 'bg-slate-900/80 border-slate-400/15 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
      }`}
    >
      <div className="flex items-center gap-1.5 font-bold">
        <Sparkles size={13} className="text-purple-500" />
        <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>Sơ đồ luồng (Mermaid)</span>
        {renderError && (
          <span className="inline-flex items-center justify-center leading-none gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <AlertCircle size={10} />
            Lỗi cú pháp
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!renderError && (
          <div
            className={`flex items-center p-0.5 rounded-lg border text-[10.5px] ${
              isDark ? 'bg-black/30 border-slate-400/15' : 'bg-white/80 border-slate-200/80'
            }`}
          >
            <Tooltip title="Xem sơ đồ trực quan">
              <button
                type="button"
                aria-label="Xem sơ đồ trực quan"
                onClick={() => onViewModeChange('diagram')}
                className={`p-1.5 rounded-md font-medium flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'diagram' ? 'bg-purple-600 text-white shadow-xs' : inactiveModeClass
                }`}
              >
                <Eye size={13} />
              </button>
            </Tooltip>
            <Tooltip title="Xem mã nguồn Mermaid">
              <button
                type="button"
                aria-label="Xem mã nguồn Mermaid"
                onClick={() => onViewModeChange('code')}
                className={`p-1.5 rounded-md font-medium flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'code' ? 'bg-purple-600 text-white shadow-xs' : inactiveModeClass
                }`}
              >
                <Code2 size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        {viewMode === 'diagram' && hasSvg && (
          <Tooltip title="Xem toàn màn hình & Phóng to sơ đồ (Zoom & Pan)">
            <button
              type="button"
              aria-label="Xem toàn màn hình"
              onClick={onOpenModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Maximize2 size={13} />
            </button>
          </Tooltip>
        )}

        <Tooltip title={isCopied ? 'Đã sao chép mã Mermaid' : 'Sao chép mã nguồn Mermaid'}>
          <button
            type="button"
            aria-label="Sao chép mã nguồn Mermaid"
            onClick={onCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer flex items-center justify-center"
          >
            {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
