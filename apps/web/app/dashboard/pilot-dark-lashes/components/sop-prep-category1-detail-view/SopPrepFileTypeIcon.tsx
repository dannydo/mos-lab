'use client';

import React from 'react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import type { SopPrepFileType } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

interface SopPrepFileTypeIconProps {
  fileType: SopPrepFileType;
  size?: number;
}

export function SopPrepFileTypeIcon({ fileType, size = 16 }: SopPrepFileTypeIconProps) {
  switch (fileType) {
    case 'image':
      return <AppIcon icon={ImageIcon} size={size} className="text-emerald-500" />;
    case 'video':
      return <AppIcon icon={VideoIcon} size={size} className="text-purple-500" />;
    case 'document':
      return <AppIcon icon={FileText} size={size} className="text-blue-500" />;
    default:
      return <AppIcon icon={FileSpreadsheet} size={size} className="text-amber-500" />;
  }
}
