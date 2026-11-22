import React from 'react';
import type { MenuProps } from 'antd';
import { Check, Copy, Download, Link2, Maximize2, RotateCw } from 'lucide-react';

export interface BuildLightboxContextMenuParams {
  onCopyImage: () => void;
  onCopyUrl: () => void;
  onDownload: () => void;
  onRotate: () => void;
  onFitZoom: () => void;
  onActualSizeZoom: () => void;
}

export function buildLightboxContextMenuItems({
  onCopyImage,
  onCopyUrl,
  onDownload,
  onRotate,
  onFitZoom,
  onActualSizeZoom,
}: BuildLightboxContextMenuParams): MenuProps['items'] {
  return [
    {
      key: 'copy-img',
      icon: <Copy size={14} className="text-amber-400" />,
      label: 'Sao chép hình ảnh (Phím C)',
      onClick: onCopyImage,
    },
    {
      key: 'copy-link',
      icon: <Link2 size={14} className="text-sky-400" />,
      label: 'Sao chép liên kết hình ảnh',
      onClick: onCopyUrl,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'download',
      icon: <Download size={14} className="text-emerald-400" />,
      label: 'Tải hình ảnh về máy',
      onClick: onDownload,
    },
    {
      key: 'rotate',
      icon: <RotateCw size={14} className="text-indigo-400" />,
      label: 'Xoay ảnh 90° (Phím R)',
      onClick: onRotate,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'fit',
      icon: <Maximize2 size={14} />,
      label: 'Vừa khung hình (Phím F)',
      onClick: onFitZoom,
    },
    {
      key: 'actual',
      icon: <Check size={14} />,
      label: 'Kích thước gốc 100% (Phím 1)',
      onClick: onActualSizeZoom,
    },
  ];
}
