'use client';

import React from 'react';
import { AlertCircle, Maximize2 } from 'lucide-react';
import type { MermaidViewMode } from './mermaidBlockTypes';

export interface MermaidCardBodyProps {
  isDark: boolean;
  viewMode: MermaidViewMode;
  isLoading: boolean;
  svgHtml: string | null;
  processedSvgHtml: string | null;
  renderError: string | null;
  cleanCode: string;
  onOpenModal: () => void;
}

export const MermaidCardBody: React.FC<MermaidCardBodyProps> = ({
  isDark,
  viewMode,
  isLoading,
  svgHtml,
  processedSvgHtml,
  renderError,
  cleanCode,
  onOpenModal,
}) => {
  if (viewMode === 'diagram') {
    return (
      <div
        className={`p-4 overflow-x-auto min-h-[140px] flex items-center justify-center transition-all select-text ${
          isDark ? 'bg-[rgb(11,17,32)]' : 'bg-white'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-slate-400 py-6">
            <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span>Đang kết xuất sơ đồ...</span>
          </div>
        ) : svgHtml ? (
          <div
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto cursor-pointer group relative transition-transform hover:scale-[1.005]"
            onClick={onOpenModal}
            title="Bấm để mở to và phóng to sơ đồ (Zoom & Pan)"
          >
            <div
              className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: processedSvgHtml || svgHtml }}
            />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none">
              <Maximize2 size={12} className="text-purple-400" />
              <span>Phóng to & Zoom</span>
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-slate-400 py-6">Không có dữ liệu sơ đồ</div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {renderError && (
        <div className="px-3 py-1.5 text-[11px] bg-amber-500/10 text-amber-400 border-b border-amber-500/20 flex items-center gap-1.5">
          <AlertCircle size={12} className="shrink-0" />
          <span>Không thể kết xuất sơ đồ dạng đồ họa. Hiển thị mã nguồn gốc bên dưới.</span>
        </div>
      )}
      <pre
        className={`p-3 text-[11.5px] font-mono leading-relaxed overflow-x-auto m-0 select-text ${
          isDark ? 'bg-[rgb(11,17,32)] text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <code>{cleanCode}</code>
      </pre>
    </div>
  );
};
