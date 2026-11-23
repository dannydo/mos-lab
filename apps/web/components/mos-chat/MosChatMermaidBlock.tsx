'use client';

import React from 'react';
import { MermaidCardBody } from './mos-chat-mermaid-block/MermaidCardBody';
import { MermaidCardToolbar } from './mos-chat-mermaid-block/MermaidCardToolbar';
import type { MosChatMermaidBlockProps } from './mos-chat-mermaid-block/mermaidBlockTypes';
import { MermaidZoomModal } from './mos-chat-mermaid-block/MermaidZoomModal';
import { useMermaidRenderer } from './mos-chat-mermaid-block/useMermaidRenderer';
import { useMermaidZoomPan } from './mos-chat-mermaid-block/useMermaidZoomPan';

export type { MosChatMermaidBlockProps } from './mos-chat-mermaid-block/mermaidBlockTypes';

export const MosChatMermaidBlock: React.FC<MosChatMermaidBlockProps> = ({ code, isDark = false }) => {
  const { cleanCode, svgHtml, processedSvgHtml, svgDimensions, isLoading, renderError, viewMode, setViewMode } =
    useMermaidRenderer({ code, isDark });

  const {
    isModalOpen,
    openModal,
    closeModal,
    isCopied,
    zoom,
    pan,
    isDragging,
    isFullscreenWindow,
    toggleFullscreenWindow,
    canvasRef,
    handleCopy,
    handleFitToScreen,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleSetPresetZoom,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDownloadSvg,
  } = useMermaidZoomPan({ svgHtml, svgDimensions, cleanCode });

  return (
    <>
      <div
        className={`my-3 rounded-2xl overflow-hidden shadow-sm transition-all text-left border ${
          isDark ? 'bg-[rgb(9,13,22)] border-violet-500/25' : 'bg-white border-violet-500/20'
        }`}
      >
        <MermaidCardToolbar
          isDark={isDark}
          renderError={renderError}
          viewMode={viewMode}
          hasSvg={Boolean(svgHtml)}
          isCopied={isCopied}
          onViewModeChange={setViewMode}
          onOpenModal={openModal}
          onCopy={handleCopy}
        />

        <MermaidCardBody
          isDark={isDark}
          viewMode={viewMode}
          isLoading={isLoading}
          svgHtml={svgHtml}
          processedSvgHtml={processedSvgHtml}
          renderError={renderError}
          cleanCode={cleanCode}
          onOpenModal={openModal}
        />
      </div>

      <MermaidZoomModal
        open={isModalOpen}
        isDark={isDark}
        zoom={zoom}
        pan={pan}
        isDragging={isDragging}
        isFullscreenWindow={isFullscreenWindow}
        isCopied={isCopied}
        svgDimensions={svgDimensions}
        svgMarkup={processedSvgHtml || ''}
        canvasRef={canvasRef}
        onClose={closeModal}
        onZoomOut={handleZoomOut}
        onZoomIn={handleZoomIn}
        onResetZoom={handleResetZoom}
        onFitToScreen={handleFitToScreen}
        onSetPresetZoom={handleSetPresetZoom}
        onToggleFullscreenWindow={toggleFullscreenWindow}
        onDownloadSvg={handleDownloadSvg}
        onCopy={handleCopy}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </>
  );
};

export default MosChatMermaidBlock;
