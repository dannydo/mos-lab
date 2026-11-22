'use client';

import React, { useCallback, useLayoutEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { MermaidCanvas } from './mermaid-viewer/MermaidCanvas';
import { MermaidToolbar } from './mermaid-viewer/MermaidToolbar';
import { NodeCommentsDrawer } from './mermaid-viewer/NodeCommentsDrawer';
import { NodeCommentsModal } from './mermaid-viewer/NodeCommentsModal';
import { downloadMermaidSvg } from './mermaid-viewer/mermaidSvgUtils';
import type { MermaidViewerProps } from './mermaid-viewer/mermaidViewerTypes';
import { useMermaidChartRenderer } from './mermaid-viewer/useMermaidChartRenderer';
import { useMermaidNodeComments } from './mermaid-viewer/useMermaidNodeComments';
import { useMermaidViewport } from './mermaid-viewer/useMermaidViewport';

export { getAuthorColor } from './mermaid-viewer/mermaidViewerConstants';
export type {
  AvailableMermaidNode,
  CommentCategory,
  MermaidViewerProps,
  NodeComment,
  PanPosition,
  SelectedMermaidNode,
} from './mermaid-viewer/mermaidViewerTypes';

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  chart,
  title = 'Sơ Đồ Quy Trình Systems',
  height = '600px',
  showToolbar = true,
  diagramId = 'cs-warranty',
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const { svgContent, loading, error } = useMermaidChartRenderer({ chart, isDark });

  const {
    containerRef,
    svgWrapperRef,
    zoom,
    pan,
    isDragging,
    isFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    toggleFullscreen,
    openIn4KWindow,
  } = useMermaidViewport({ diagramId });

  const {
    selectedNode,
    modalOpen,
    setModalOpen,
    drawerOpen,
    setDrawerOpen,
    availableNodes,
    nodeComments,
    commentInput,
    setCommentInput,
    commentCategory,
    setCommentCategory,
    authorName,
    setAuthorName,
    currentNodeComments,
    totalCommentsCount,
    handleAddComment,
    handleOpenCommentsFromToolbar,
    handleSelectNodeById,
  } = useMermaidNodeComments({
    svgWrapperRef,
    svgContent,
    loading,
    diagramId,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.height = isFullscreen ? '100vh' : typeof height === 'number' ? `${height}px` : height;
  }, [containerRef, height, isFullscreen]);

  const handleDownloadSvg = useCallback(() => {
    downloadMermaidSvg(svgContent, title);
  }, [svgContent, title]);

  return (
    <div
      ref={containerRef}
      className={`h-[600px] rounded-2xl border transition-all relative overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-900 text-white' : ''
      } ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
    >
      {showToolbar && (
        <MermaidToolbar
          title={title}
          zoom={zoom}
          isFullscreen={isFullscreen}
          totalCommentsCount={totalCommentsCount}
          onOpenComments={handleOpenCommentsFromToolbar}
          onFitToScreen={handleFitToScreen}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onOpen4KWindow={openIn4KWindow}
          onToggleFullscreen={toggleFullscreen}
          onDownloadSvg={handleDownloadSvg}
        />
      )}

      <MermaidCanvas
        svgWrapperRef={svgWrapperRef}
        svgContent={svgContent}
        loading={loading}
        error={error}
        zoom={zoom}
        pan={pan}
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      <NodeCommentsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        availableNodes={availableNodes}
        selectedNode={selectedNode}
        nodeComments={nodeComments}
        diagramId={diagramId}
        currentNodeComments={currentNodeComments}
        authorName={authorName}
        commentCategory={commentCategory}
        commentInput={commentInput}
        onSelectNode={handleSelectNodeById}
        onAuthorNameChange={setAuthorName}
        onCategoryChange={setCommentCategory}
        onCommentInputChange={setCommentInput}
        onSubmitComment={handleAddComment}
      />

      <NodeCommentsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableNodes={availableNodes}
        selectedNode={selectedNode}
        nodeComments={nodeComments}
        diagramId={diagramId}
        currentNodeComments={currentNodeComments}
        authorName={authorName}
        commentCategory={commentCategory}
        commentInput={commentInput}
        onSelectNode={handleSelectNodeById}
        onAuthorNameChange={setAuthorName}
        onCategoryChange={setCommentCategory}
        onCommentInputChange={setCommentInput}
        onSubmitComment={handleAddComment}
      />
    </div>
  );
};
