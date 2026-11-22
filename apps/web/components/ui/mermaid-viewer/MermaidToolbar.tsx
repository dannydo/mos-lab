'use client';

import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { Download, Maximize2, MessageSquare, Minimize2, Monitor, MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { StatusTag } from '../StatusTag';

const { Text } = Typography;

export interface MermaidToolbarProps {
  title: string;
  zoom: number;
  isFullscreen: boolean;
  totalCommentsCount: number;
  onOpenComments: () => void;
  onFitToScreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpen4KWindow: () => void;
  onToggleFullscreen: () => void;
  onDownloadSvg: () => void;
}

export const MermaidToolbar: React.FC<MermaidToolbarProps> = ({
  title,
  zoom,
  isFullscreen,
  totalCommentsCount,
  onOpenComments,
  onFitToScreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpen4KWindow,
  onToggleFullscreen,
  onDownloadSvg,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur z-20 shrink-0">
      <div className="flex items-center gap-2">
        <Text className="font-extrabold text-sm text-slate-800 dark:text-slate-100">📊 {title}</Text>
        <StatusTag
          status="cyan"
          bordered={false}
          className="font-semibold text-[11px]"
          label={<span className="tabular-nums">{Math.round(zoom * 100)}%</span>}
        />
        <Button
          size="small"
          type="primary"
          icon={<MessageSquare size={13} />}
          onClick={onOpenComments}
          className="bg-purple-600 hover:bg-purple-700 border-none font-medium text-xs inline-flex items-center"
        >
          💬 Quản Lý Ghi Chú Node (<span className="tabular-nums">{totalCommentsCount}</span>)
        </Button>
      </div>

      <Space size="small" className="flex-wrap mermaid-viewer-toolbar-actions">
        <Tooltip title="Fit to Screen (Tự động co vừa 100% màn 4K)">
          <Button
            size="small"
            type="primary"
            icon={<Minimize2 size={13} />}
            onClick={onFitToScreen}
            className="bg-emerald-600 hover:bg-emerald-700 border-none font-medium text-xs inline-flex items-center"
          >
            📐 Fit to Screen
          </Button>
        </Tooltip>

        <Tooltip title="Phóng to (Zoom In)">
          <Button size="small" icon={<ZoomIn size={13} />} onClick={onZoomIn} aria-label="Phóng to" />
        </Tooltip>
        <Tooltip title="Thu nhỏ (Zoom Out)">
          <Button size="small" icon={<ZoomOut size={13} />} onClick={onZoomOut} aria-label="Thu nhỏ" />
        </Tooltip>
        <Tooltip title="Về chuẩn 100%">
          <Button
            size="small"
            icon={<MoveHorizontal size={13} />}
            onClick={onResetZoom}
            className="inline-flex items-center"
          >
            Reset
          </Button>
        </Tooltip>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <Tooltip title="Mở Cửa Sổ Độc Lập Kéo Sang Màn 4K Thứ 2">
          <Button
            size="small"
            type="primary"
            icon={<Monitor size={13} />}
            onClick={onOpen4KWindow}
            className="bg-indigo-600 hover:bg-indigo-700 border-none font-medium text-xs inline-flex items-center"
          >
            🖥️ Mở Cửa Sổ Riêng 4K
          </Button>
        </Tooltip>

        <Tooltip title={isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình 4K'}>
          <Button
            size="small"
            icon={isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình 4K'}
          />
        </Tooltip>

        <Tooltip title="Tải File SVG Sắc Nét">
          <Button size="small" icon={<Download size={13} />} onClick={onDownloadSvg} aria-label="Tải File SVG" />
        </Tooltip>
      </Space>
    </div>
  );
};
