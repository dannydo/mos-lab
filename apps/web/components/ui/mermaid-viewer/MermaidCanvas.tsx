'use client';

import React, { useLayoutEffect } from 'react';
import { Typography } from 'antd';
import { Loader2 } from 'lucide-react';
import type { PanPosition } from './mermaidViewerTypes';

const { Text } = Typography;

export interface MermaidCanvasProps {
  svgWrapperRef: React.RefObject<HTMLDivElement | null>;
  svgContent: string;
  loading: boolean;
  error: string | null;
  zoom: number;
  pan: PanPosition;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

export const MermaidCanvas: React.FC<MermaidCanvasProps> = ({
  svgWrapperRef,
  svgContent,
  loading,
  error,
  zoom,
  pan,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}) => {
  useLayoutEffect(() => {
    const el = svgWrapperRef.current;
    if (!el) return;
    el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    el.style.transformOrigin = 'center top';
  }, [svgWrapperRef, pan.x, pan.y, zoom, loading, svgContent]);

  return (
    <div
      className={`flex-1 overflow-hidden relative select-none flex items-start justify-center pt-6 p-4 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 my-auto">
          <Loader2 size={28} className="animate-spin text-purple-500" />
          <Text type="secondary" className="text-xs">
            Đang render sơ đồ Mermaid SVG chuẩn 4K...
          </Text>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs my-auto">
          ⚠️ <strong>Lỗi render sơ đồ:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div
          ref={svgWrapperRef}
          className="transition-transform duration-75 ease-out flex justify-center [&_svg]:max-w-none"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
};
