'use client';

import React, { useMemo } from 'react';
import { Dropdown } from 'antd';
import { LightboxBottomBar } from './mos-chat-image-lightbox-viewer/LightboxBottomBar';
import { buildLightboxContextMenuItems } from './mos-chat-image-lightbox-viewer/lightboxContextMenu';
import { LightboxOverlays } from './mos-chat-image-lightbox-viewer/LightboxOverlays';
import { LightboxTopToolbar } from './mos-chat-image-lightbox-viewer/LightboxTopToolbar';
import type {
  MosChatImageLightboxItem,
  MosChatImageLightboxState,
  MosChatImageLightboxViewerProps,
} from './mos-chat-image-lightbox-viewer/lightboxTypes';
import { useMosChatImageLightbox } from './mos-chat-image-lightbox-viewer/useMosChatImageLightbox';

export type { MosChatImageLightboxItem, MosChatImageLightboxState, MosChatImageLightboxViewerProps };

export const MosChatImageLightboxViewer: React.FC<MosChatImageLightboxViewerProps> = ({
  lightboxImage,
  setLightboxImage,
}) => {
  const {
    totalItems,
    currentItem,
    pan,
    isDragging,
    imageDims,
    fitZoom,
    copiedFeedback,
    isCurrentFit,
    isCurrent100,
    handleImageLoad,
    goPrev,
    goNext,
    selectImageIndex,
    handleZoomIn,
    handleZoomOut,
    handleFitZoom,
    handleActualSizeZoom,
    handleSetPresetZoom,
    handleRotate,
    handleCopyImage,
    handleCopyUrl,
    handleDownloadImage,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleBackdropClick,
    handleClose,
  } = useMosChatImageLightbox({ lightboxImage, setLightboxImage });

  const contextMenuItems = useMemo(
    () =>
      buildLightboxContextMenuItems({
        onCopyImage: handleCopyImage,
        onCopyUrl: handleCopyUrl,
        onDownload: handleDownloadImage,
        onRotate: handleRotate,
        onFitZoom: handleFitZoom,
        onActualSizeZoom: handleActualSizeZoom,
      }),
    [handleCopyImage, handleCopyUrl, handleDownloadImage, handleRotate, handleFitZoom, handleActualSizeZoom]
  );

  if (!currentItem) return null;

  return (
    <div
      role="dialog"
      aria-label="Xem phóng to hình ảnh"
      data-no-chat-autofocus="true"
      onClick={handleBackdropClick}
      onWheel={handleWheel}
      className="fixed inset-0 z-[2200] flex flex-col items-center justify-center select-none overflow-hidden touch-none bg-[rgba(2,6,23,0.94)] backdrop-blur-[10px]"
    >
      <LightboxTopToolbar
        totalItems={totalItems}
        currentIndex={lightboxImage.currentIndex}
        currentName={currentItem.name}
        currentUrl={currentItem.url}
        zoom={lightboxImage.zoom}
        isCurrentFit={isCurrentFit}
        isCurrent100={isCurrent100}
        copiedFeedback={copiedFeedback}
        onPrev={goPrev}
        onNext={goNext}
        onZoomOut={handleZoomOut}
        onZoomIn={handleZoomIn}
        onToggleFitOrActual={handleDoubleClick}
        onFitZoom={handleFitZoom}
        onActualSizeZoom={handleActualSizeZoom}
        onRotate={handleRotate}
        onCopyImage={handleCopyImage}
        onCopyUrl={handleCopyUrl}
        onClose={handleClose}
      />

      <LightboxOverlays
        copiedFeedback={copiedFeedback}
        totalItems={totalItems}
        currentIndex={lightboxImage.currentIndex}
        onPrev={goPrev}
        onNext={goNext}
      />

      {/* Main Image Stage - Maximized viewport with smooth Drag & Pan & Right-click Context Menu */}
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={`w-full h-full flex items-center justify-center overflow-hidden touch-none select-none pt-[52px] ${
            totalItems > 1 ? 'pb-[72px]' : 'pb-[48px]'
          } ${isDragging ? 'cursor-grabbing' : lightboxImage.zoom > fitZoom ? 'cursor-grab' : 'cursor-zoom-in'}`}
        >
          <img
            src={currentItem.url}
            alt={currentItem.name || 'Hình ảnh'}
            onLoad={handleImageLoad}
            className="max-w-[98.5vw] max-h-[calc(100vh-80px)] object-contain select-none pointer-events-auto"
            style={{
              maxWidth: imageDims ? 'none' : undefined,
              maxHeight: imageDims ? 'none' : undefined,
              width: imageDims ? `${imageDims.width}px` : undefined,
              height: imageDims ? `${imageDims.height}px` : undefined,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${lightboxImage.zoom}) rotate(${lightboxImage.rotate}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
            }}
            draggable={false}
          />
        </div>
      </Dropdown>

      <LightboxBottomBar
        items={lightboxImage.items}
        currentIndex={lightboxImage.currentIndex}
        zoom={lightboxImage.zoom}
        isCurrentFit={isCurrentFit}
        onFitZoom={handleFitZoom}
        onSelectPresetZoom={handleSetPresetZoom}
        onSelectIndex={selectImageIndex}
      />
    </div>
  );
};
