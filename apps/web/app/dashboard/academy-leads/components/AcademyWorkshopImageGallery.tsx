'use client';

import React from 'react';
import { Image } from 'antd';
import type { ImageProps } from 'antd';
import { ZoomIn } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';

export interface WorkshopImageProps extends Omit<ImageProps, 'preview'> {
  preview?: boolean | ImageProps['preview'];
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  objectFit?: 'cover' | 'contain';
}

export function WorkshopImage({
  src,
  alt = 'Hình ảnh workshop',
  className = '',
  wrapperClassName = '',
  style,
  aspectRatio = 'square',
  objectFit = 'cover',
  preview = true,
  ...props
}: WorkshopImageProps) {
  const previewConfig = React.useMemo(() => {
    if (preview === false) return false;
    const baseConfig = typeof preview === 'object' ? preview : {};
    return {
      mask: (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white drop-shadow-sm">
          <AppIcon icon={ZoomIn} size="sm" />
          <span>Phóng to</span>
        </span>
      ),
      maskClassName: '!rounded-inherit backdrop-blur-[2px]',
      ...baseConfig,
    };
  }, [preview]);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[4/3]',
    auto: '',
  }[aspectRatio];

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <Image
      src={src}
      alt={alt}
      className={`h-full w-full ${aspectClasses} ${fitClass} ${className}`}
      wrapperClassName={`block overflow-hidden ${wrapperClassName}`}
      style={style}
      preview={previewConfig}
      {...props}
    />
  );
}

export interface WorkshopImageGalleryProps {
  children?: React.ReactNode;
  items?: string[];
  preview?: React.ComponentProps<typeof Image.PreviewGroup>['preview'];
}

export function WorkshopImageGallery({ children, items, preview }: WorkshopImageGalleryProps) {
  const previewConfig = React.useMemo(() => {
    if (preview === false) return false;
    const baseConfig = typeof preview === 'object' ? preview : {};
    return {
      countRender: (current: number, total: number) => (
        <span className="tabular-nums font-semibold tracking-wide">
          {current} / {total}
        </span>
      ),
      ...baseConfig,
    };
  }, [preview]);

  return (
    <Image.PreviewGroup items={items} preview={previewConfig}>
      {children}
    </Image.PreviewGroup>
  );
}

export default WorkshopImageGallery;
