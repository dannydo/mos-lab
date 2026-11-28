'use client';

import React from 'react';
import { Avatar } from 'antd';
import { MessageSquareReply, X } from 'lucide-react';
import type { MosChatConversation, MosChatCustomerCard, MosChatMessage, SafeAny } from '@mos-lab/shared';
import { MosChatThreadComposerMobile } from './MosChatThreadComposerMobile';
import { MosChatThreadComposerDesktop } from './MosChatThreadComposerDesktop';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';

export interface MosChatThreadComposerProps {
  isMobile: boolean;
  activeThreadMessage: MosChatMessage;
  activeConversation: MosChatConversation | null;
  AI_COPILOT_CONV_ID: string;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  accentBorder: string;
  draggingRootMsgId: string | null;
  isDraggingOverThread: boolean;
  setIsDraggingOverThread: (val: boolean) => void;
  isDraggingOver: boolean;
  setIsDraggingOver: (val: boolean) => void;
  handleProcessImageFiles: (
    files: FileList | File[],
    source: SafeAny,
    scope?: SafeAny,
    convId?: string
  ) => Promise<void>;
  renderStagedAttachmentsStrip: (attachments: SafeAny[], scope: SafeAny) => React.ReactNode;
  renderMentionAutocompleteDropdown: (scope: SafeAny) => React.ReactNode;
  threadAttachments: SafeAny[];
  pendingUploads?: PendingChatUploadItem[];
  stagedCustomerCard?: MosChatCustomerCard | null;
  setStagedCustomerCard?: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;
  replyingToReply: { id: string; senderName: string; text: string } | null;
  setReplyingToReply: React.Dispatch<React.SetStateAction<{ id: string; senderName: string; text: string } | null>>;
  mobileActionOpen: boolean;
  setMobileActionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formatBarOpenThread: boolean;
  setFormatBarOpenThread: React.Dispatch<React.SetStateAction<boolean>>;
  isPreviewModeThread: boolean;
  setIsPreviewModeThread: React.Dispatch<React.SetStateAction<boolean>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  localThreadHasText: boolean;
  setLocalThreadHasText: React.Dispatch<React.SetStateAction<boolean>>;
  isUrgent: boolean;
  setIsUrgent: React.Dispatch<React.SetStateAction<boolean>>;
  effectiveThreadTextRef: React.MutableRefObject<string>;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  setThreadInput: React.Dispatch<React.SetStateAction<string>>;
  setThreadCursorPos: (pos: number) => void;
  applyThreadTextUpdate: (updater: string | ((prev: string) => string)) => void;
  handleThreadSubmit: () => void;
  triggerFilePicker: (scope: 'main' | 'thread') => void;
  setDriveLinkModalOpen?: (open: boolean) => void;
  uploadTargetRef?: React.MutableRefObject<SafeAny>;
  handleOpenCustomerPicker?: (scope?: 'main' | 'thread') => void;
  openTaskModalFromMessage?: (msg: MosChatMessage | null, reply?: SafeAny) => void;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  setTriggerWorkflowModalOpen?: (open: boolean) => void;
  setInitialWorkflowCode?: (code: string) => void;
  setRichEditorModalState: (state: SafeAny) => void;
  renderAppleNotesFormatToolbar: (scope: SafeAny, variant?: SafeAny) => React.ReactNode;
  renderComposerEmojiPickerContent: (scope?: SafeAny) => React.ReactNode;
  renderRichTextMessage: (
    text?: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  checkForMentionTrigger: (text: string, cursorPos: number, scope: SafeAny) => void;
  handleMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: SafeAny) => boolean;
  handleApplyFormat: (formatType: SafeAny, scope: SafeAny, extraValue?: string) => void;
  handleSmartListEnterKey: (
    text: string,
    selectionStart: number,
    selectionEnd: number
  ) => { handled: boolean; nextText: string; nextCursor: number };
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
}

export const MosChatThreadComposer: React.FC<MosChatThreadComposerProps> = (props) => {
  const {
    isMobile,
    activeThreadMessage,
    activeConversation,
    AI_COPILOT_CONV_ID,
    isDark,
    token,
    surfaceRaised,
    borderColor,
    borderStrong,
    accentBorder,
    draggingRootMsgId,
    isDraggingOverThread,
    setIsDraggingOverThread,
    isDraggingOver,
    setIsDraggingOver,
    handleProcessImageFiles,
    renderStagedAttachmentsStrip,
    renderMentionAutocompleteDropdown,
    threadAttachments,
    pendingUploads = [],
    stagedCustomerCard,
    setStagedCustomerCard,
    replyingToReply,
    setReplyingToReply,
    mobileActionOpen,
    setMobileActionOpen,
    formatBarOpenThread,
    setFormatBarOpenThread,
    isPreviewModeThread,
    setIsPreviewModeThread,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    localThreadHasText,
    setLocalThreadHasText,
    isUrgent,
    setIsUrgent,
    effectiveThreadTextRef,
    threadInputRef,
    setThreadInput,
    setThreadCursorPos,
    applyThreadTextUpdate,
    handleThreadSubmit,
    triggerFilePicker,
    setDriveLinkModalOpen,
    uploadTargetRef,
    handleOpenCustomerPicker,
    openTaskModalFromMessage,
    canUseAiCopilot,
    isStrictDannySuperAdmin,
    setTriggerWorkflowModalOpen,
    setInitialWorkflowCode,
    setRichEditorModalState,
    renderAppleNotesFormatToolbar,
    renderComposerEmojiPickerContent,
    renderRichTextMessage,
    checkForMentionTrigger,
    handleMentionKeyDown,
    handleApplyFormat,
    handleSmartListEnterKey,
    isComposingRef,
    lastCompositionEndMsRef,
  } = props;

  const handleDragOverFiles = (e: React.DragEvent) => {
    if (draggingRootMsgId) return;
    const hasFiles = Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
    if (hasFiles) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDraggingOverThread) setIsDraggingOverThread(true);
      if (isDraggingOver) setIsDraggingOver(false);
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    if (draggingRootMsgId) return;
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      setIsDraggingOverThread(false);
      void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
    }
  };

  return (
    <div
      className="p-2.5 space-y-1.5"
      style={{ borderTop: `1px solid ${borderColor}` }}
      onDragOver={handleDragOverFiles}
      onDrop={handleDropFiles}
    >
      {renderStagedAttachmentsStrip(threadAttachments, 'thread')}
      <div
        className={`relative rounded-2xl px-3 pt-2 pb-1.5 flex flex-col transition-all shadow-sm focus-within:shadow-md focus-within:border-[#d4a84b]/60 ${
          isDraggingOverThread ? 'ring-2 ring-amber-500/70 border-[#d4a84b]' : ''
        }`}
        style={{
          background: surfaceRaised,
          border: `1px solid ${isDraggingOverThread ? '#d4a84b' : borderStrong}`,
        }}
        onDragOver={handleDragOverFiles}
        onDrop={handleDropFiles}
      >
        {renderMentionAutocompleteDropdown('thread')}

        {stagedCustomerCard && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1.5"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
              border: `1px solid ${accentBorder}`,
            }}
          >
            <Avatar
              size={20}
              className="shrink-0 font-bold text-[10px]"
              style={{ backgroundColor: '#d4a84b', color: '#000' }}
            >
              {(stagedCustomerCard.name || 'KH')
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .filter(Boolean)
                .slice(-2)
                .join('')
                .toUpperCase()}
            </Avatar>
            <span className="font-semibold truncate text-[11.5px]" style={{ color: token.colorText }}>
              {stagedCustomerCard.name}
            </span>
            <span className="truncate text-amber-500 font-medium text-[11px]">({stagedCustomerCard.meta})</span>
            {stagedCustomerCard.cvName && (
              <span className="text-slate-400 truncate hidden sm:inline text-[11px]">
                · {stagedCustomerCard.cvName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setStagedCustomerCard?.(null)}
              className="ml-auto w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              style={{ color: token.colorTextSecondary }}
              title="Bỏ đính kèm thẻ khách hàng khỏi luồng"
              aria-label="Bỏ đính kèm thẻ khách hàng khỏi luồng"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {replyingToReply && (
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1.5"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
              border: `1px solid ${accentBorder}`,
            }}
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <MessageSquareReply size={13} className="text-amber-500 shrink-0" />
              <div className="truncate text-[11.5px]">
                <span className="font-bold text-amber-500">Trả lời {replyingToReply.senderName}:</span>{' '}
                <span className="truncate opacity-80" style={{ color: token.colorTextSecondary }}>
                  {replyingToReply.text}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToReply(null)}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 transition-colors"
              aria-label="Hủy trích dẫn"
              title="Hủy trích dẫn (Esc)"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {isMobile ? (
          <MosChatThreadComposerMobile
            activeThreadMessage={activeThreadMessage}
            activeConversation={activeConversation}
            AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
            isDark={isDark}
            isStrictDannySuperAdmin={isStrictDannySuperAdmin}
            token={token}
            surfaceRaised={surfaceRaised}
            borderStrong={borderStrong}
            mobileActionOpen={mobileActionOpen}
            setMobileActionOpen={setMobileActionOpen}
            formatBarOpenThread={formatBarOpenThread}
            setFormatBarOpenThread={setFormatBarOpenThread}
            openStickerPopoverKey={openStickerPopoverKey}
            setOpenStickerPopoverKey={setOpenStickerPopoverKey}
            localThreadHasText={localThreadHasText}
            setLocalThreadHasText={setLocalThreadHasText}
            threadAttachments={threadAttachments}
            stagedCustomerCard={stagedCustomerCard}
            replyingToReply={replyingToReply}
            setReplyingToReply={setReplyingToReply}
            effectiveThreadTextRef={effectiveThreadTextRef}
            threadInputRef={threadInputRef}
            setThreadInput={setThreadInput}
            setThreadCursorPos={setThreadCursorPos}
            applyThreadTextUpdate={applyThreadTextUpdate}
            handleThreadSubmit={handleThreadSubmit}
            triggerFilePicker={triggerFilePicker}
            setDriveLinkModalOpen={setDriveLinkModalOpen}
            uploadTargetRef={uploadTargetRef}
            handleOpenCustomerPicker={handleOpenCustomerPicker}
            openTaskModalFromMessage={openTaskModalFromMessage}
            canUseAiCopilot={canUseAiCopilot}
            setRichEditorModalState={setRichEditorModalState}
            renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
            renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
            checkForMentionTrigger={checkForMentionTrigger}
            handleMentionKeyDown={handleMentionKeyDown}
            handleApplyFormat={handleApplyFormat}
            isComposingRef={isComposingRef}
            lastCompositionEndMsRef={lastCompositionEndMsRef}
          />
        ) : (
          <MosChatThreadComposerDesktop
            activeThreadMessage={activeThreadMessage}
            activeConversation={activeConversation}
            AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
            isDark={isDark}
            token={token}
            surfaceRaised={surfaceRaised}
            draggingRootMsgId={draggingRootMsgId}
            isDraggingOverThread={isDraggingOverThread}
            setIsDraggingOverThread={setIsDraggingOverThread}
            isDraggingOver={isDraggingOver}
            setIsDraggingOver={setIsDraggingOver}
            handleProcessImageFiles={handleProcessImageFiles}
            formatBarOpenThread={formatBarOpenThread}
            setFormatBarOpenThread={setFormatBarOpenThread}
            isPreviewModeThread={isPreviewModeThread}
            setIsPreviewModeThread={setIsPreviewModeThread}
            openStickerPopoverKey={openStickerPopoverKey}
            setOpenStickerPopoverKey={setOpenStickerPopoverKey}
            localThreadHasText={localThreadHasText}
            setLocalThreadHasText={setLocalThreadHasText}
            threadAttachments={threadAttachments}
            stagedCustomerCard={stagedCustomerCard}
            replyingToReply={replyingToReply}
            setReplyingToReply={setReplyingToReply}
            isUrgent={isUrgent}
            setIsUrgent={setIsUrgent}
            effectiveThreadTextRef={effectiveThreadTextRef}
            threadInputRef={threadInputRef}
            setThreadInput={setThreadInput}
            setThreadCursorPos={setThreadCursorPos}
            applyThreadTextUpdate={applyThreadTextUpdate}
            handleThreadSubmit={handleThreadSubmit}
            triggerFilePicker={triggerFilePicker}
            setDriveLinkModalOpen={setDriveLinkModalOpen}
            uploadTargetRef={uploadTargetRef}
            handleOpenCustomerPicker={handleOpenCustomerPicker}
            openTaskModalFromMessage={openTaskModalFromMessage}
            canUseAiCopilot={canUseAiCopilot}
            isStrictDannySuperAdmin={isStrictDannySuperAdmin}
            setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
            setInitialWorkflowCode={setInitialWorkflowCode}
            setRichEditorModalState={setRichEditorModalState}
            renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
            renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
            renderRichTextMessage={renderRichTextMessage}
            checkForMentionTrigger={checkForMentionTrigger}
            handleMentionKeyDown={handleMentionKeyDown}
            handleApplyFormat={handleApplyFormat}
            handleSmartListEnterKey={handleSmartListEnterKey}
            isComposingRef={isComposingRef}
            lastCompositionEndMsRef={lastCompositionEndMsRef}
          />
        )}
      </div>
    </div>
  );
};
