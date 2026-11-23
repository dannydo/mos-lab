'use client';

import React from 'react';
import { Modal, theme as antdTheme } from 'antd';
import {
  type EditorFormatType,
  type MosChatRichEditorModalProps,
  QUICK_TEXT_COLORS,
  type RichEditorViewMode,
  detectActiveFormatsAtCursor,
  handleSmartListEnterKey,
} from './rich-editor/richEditorUtils';
import { useRichEditorActions } from './rich-editor/useRichEditorActions';
import { RichEditorHeader } from './rich-editor/RichEditorHeader';
import { RichEditorToolbar } from './rich-editor/RichEditorToolbar';
import { RichEditorWorkspace } from './rich-editor/RichEditorWorkspace';
import { RichEditorFooter, RichEditorLinkModal } from './rich-editor/RichEditorFooterAndLinkModal';

export {
  QUICK_TEXT_COLORS,
  detectActiveFormatsAtCursor,
  handleSmartListEnterKey,
  type EditorFormatType,
  type MosChatRichEditorModalProps,
  type RichEditorViewMode,
};

export const MosChatRichEditorModal: React.FC<MosChatRichEditorModalProps> = ({
  open,
  onClose,
  initialValue,
  onApply,
  onSend,
  title = 'Soạn thảo phong phú (CKEditor)',
  isDark = true,
  canUseAiCopilot = true,
  initialMode,
  zIndex = 2000,
}) => {
  const { token } = antdTheme.useToken();
  const editor = useRichEditorActions({ open, initialValue, initialMode, onSend, onClose });

  const surfaceBg = isDark ? '#18181b' : '#ffffff';
  const toolbarBg = isDark ? 'rgba(39, 39, 42, 0.7)' : 'rgba(244, 244, 245, 0.8)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        zIndex={zIndex}
        className={editor.isMobile ? 'adaptive-overlay mos-rich-editor-mobile-modal' : undefined}
        wrapClassName={editor.isMobile ? 'mos-rich-editor-mobile-wrap' : undefined}
        width={
          editor.isMobile
            ? '100%'
            : editor.isFullscreen
              ? '98vw'
              : editor.isCompactMode
                ? 'min(580px, calc(100vw - 16px))'
                : 'min(1000px, calc(100vw - 16px))'
        }
        style={
          editor.isMobile
            ? {
                top: 0,
                maxWidth: '100vw',
                margin: 0,
                paddingBottom: 0,
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
              }
            : {
                top: editor.isFullscreen ? 10 : editor.isCompactMode ? 16 : 28,
                maxWidth: 'calc(100vw - 16px)',
                margin: '0 auto',
                paddingBottom: editor.keyboardOffset > 0 ? `${editor.keyboardOffset}px` : undefined,
              }
        }
        styles={{
          wrapper: editor.isMobile
            ? {
                position: 'fixed',
                top: `${editor.visualViewportOffsetTop}px`,
                left: 0,
                right: 0,
                bottom: 'auto',
                height: editor.visibleHeight > 0 ? `${editor.visibleHeight}px` : '100dvh',
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
              }
            : undefined,
          content: {
            padding: 0,
            borderRadius: editor.isMobile ? '20px 20px 0 0' : editor.isFullscreen ? 12 : 20,
            overflow: 'hidden',
            background: surfaceBg,
            border: `1px solid ${borderCol}`,
            borderBottom: editor.isMobile ? 'none' : `1px solid ${borderCol}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: editor.isMobile ? 'flex' : undefined,
            flexDirection: editor.isMobile ? 'column' : undefined,
            maxHeight: editor.isMobile
              ? editor.mobileMaxModalHeight !== undefined
                ? `${editor.mobileMaxModalHeight}px`
                : 'calc(100dvh - 56px)'
              : undefined,
          },
          body: editor.isMobile
            ? {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                padding: 0,
              }
            : undefined,
        }}
        closable={true}
        destroyOnHidden
      >
        <div
          className={`flex flex-col select-text transition-all ${
            editor.isMobile
              ? 'flex-1 min-h-0'
              : editor.isCompactMode
                ? 'min-h-[280px] max-h-[72vh]'
                : 'h-[82vh] max-h-[900px]'
          }`}
          style={{
            height:
              editor.isMobile && !editor.isCompactMode && editor.mobileMaxModalHeight !== undefined
                ? `${editor.isFullscreen ? editor.mobileMaxModalHeight : Math.min(editor.mobileMaxModalHeight, Math.round((editor.visibleHeight || 800) * 0.82))}px`
                : editor.isMobile && editor.isFullscreen && editor.mobileMaxModalHeight !== undefined
                  ? `${editor.mobileMaxModalHeight}px`
                  : undefined,
            maxHeight: editor.isMobile
              ? editor.mobileMaxModalHeight !== undefined
                ? `${editor.mobileMaxModalHeight}px`
                : 'calc(100dvh - 56px)'
              : undefined,
          }}
        >
          <RichEditorHeader
            title={title}
            isCompactMode={editor.isCompactMode}
            isMobile={editor.isMobile}
            isDark={isDark}
            isFullscreen={editor.isFullscreen}
            viewMode={editor.viewMode}
            stats={editor.stats}
            templatePopoverOpen={editor.templatePopoverOpen}
            zIndex={zIndex}
            borderCol={borderCol}
            toolbarBg={toolbarBg}
            textColor={token.colorText}
            secondaryTextColor={token.colorTextSecondary}
            onTemplatePopoverOpenChange={editor.setTemplatePopoverOpen}
            onSelectTemplate={editor.handleSelectTemplate}
            onViewModeChange={editor.setViewMode}
            onToggleFullscreen={() => editor.setIsFullscreen((prev) => !prev)}
          />

          <RichEditorToolbar
            isDark={isDark}
            isMobile={editor.isMobile}
            isCompactMode={editor.isCompactMode}
            canUseAiCopilot={canUseAiCopilot}
            borderCol={borderCol}
            textColor={token.colorText}
            secondaryTextColor={token.colorTextSecondary}
            activeColor={editor.activeColor}
            colorPopoverOpen={editor.colorPopoverOpen}
            zIndex={zIndex}
            activeFormats={editor.activeFormats}
            onColorPopoverOpenChange={editor.setColorPopoverOpen}
            onCaptureSelection={editor.captureSelection}
            onFormat={editor.handleFormat}
            onApplyColor={editor.handleApplyColor}
            onTagMai={editor.handleTagMai}
          />

          <RichEditorWorkspace
            isCompactMode={editor.isCompactMode}
            viewMode={editor.viewMode}
            isDark={isDark}
            content={editor.content}
            showCompactPreview={editor.showCompactPreview}
            textareaRef={editor.textareaRef}
            borderCol={borderCol}
            toolbarBg={toolbarBg}
            textColor={token.colorText}
            secondaryTextColor={token.colorTextSecondary}
            onChangeContent={editor.setContent}
            onUpdateSelection={editor.updateSelectionState}
            onKeyDown={editor.handleTextareaKeyDown}
            onToggleCompactPreview={() => editor.setShowCompactPreview((prev) => !prev)}
          />

          <RichEditorFooter
            isMobile={editor.isMobile}
            isKeyboardOpen={editor.isKeyboardOpen}
            isCompactMode={editor.isCompactMode}
            content={editor.content}
            borderCol={borderCol}
            toolbarBg={toolbarBg}
            textColor={token.colorText}
            secondaryTextColor={token.colorTextSecondary}
            onClose={onClose}
            onApply={() => {
              onApply(editor.content);
              onClose();
            }}
            onSend={() => {
              if (!editor.content.trim()) return;
              onSend(editor.content);
              onClose();
            }}
          />
        </div>
      </Modal>

      <RichEditorLinkModal
        open={editor.linkModalOpen}
        zIndex={zIndex}
        isMobile={editor.isMobile}
        linkText={editor.linkText}
        linkUrl={editor.linkUrl}
        borderCol={borderCol}
        textColor={token.colorText}
        onCancel={() => editor.setLinkModalOpen(false)}
        onOk={editor.handleInsertLink}
        onChangeLinkText={editor.setLinkText}
        onChangeLinkUrl={editor.setLinkUrl}
      />
    </>
  );
};
