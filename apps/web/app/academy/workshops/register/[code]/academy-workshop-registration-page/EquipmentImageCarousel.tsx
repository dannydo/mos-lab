'use client';

import React from 'react';
import { Image as AntdImage } from 'antd';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export interface EquipmentImageCarouselProps {
  images: Array<{ id: number; imageUrl: string; altText?: string | null }>;
  label: string;
}

export function EquipmentImageCarousel({ images, label }: EquipmentImageCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);
  const count = images.length;
  const safeIndex = count ? Math.min(activeIndex, count - 1) : 0;
  const image = images[safeIndex];

  React.useEffect(() => {
    if (activeIndex >= count) setActiveIndex(0);
  }, [activeIndex, count]);

  if (!image) return null;

  const goTo = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((index + count) % count);
  };

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        const endX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (startX == null || endX == null || Math.abs(endX - startX) < 36 || count < 2) return;
        setActiveIndex((current) => (endX < startX ? (current + 1) % count : (current - 1 + count) % count));
      }}
    >
      <AntdImage.PreviewGroup
        items={images.map((img) => img.imageUrl)}
        preview={{
          current: safeIndex,
          countRender: (current, total) => (
            <span className="tabular-nums font-semibold tracking-wide">
              {current} / {total}
            </span>
          ),
        }}
      >
        <AntdImage
          src={image.imageUrl}
          alt={image.altText || label}
          className="h-36 w-full object-cover sm:h-40"
          wrapperClassName="!h-36 !w-full sm:!h-40 block"
          preview={{
            mask: (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white drop-shadow-sm">
                <ZoomIn size={14} />
                <span>Phóng to</span>
              </span>
            ),
          }}
        />
      </AntdImage.PreviewGroup>
      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-slate-950"
            onClick={(event) => goTo(event, safeIndex - 1)}
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-slate-950"
            onClick={(event) => goTo(event, safeIndex + 1)}
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {images.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === safeIndex}
                className={`h-1.5 rounded-full transition-all ${index === safeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                onClick={(event) => goTo(event, index)}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs font-bold tabular-nums text-white">
            {safeIndex + 1}/{count}
          </span>
        </>
      ) : null}
    </div>
  );
}
