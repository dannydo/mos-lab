'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, theme } from 'antd';
import { Sparkles, X } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatImageAttachment,
  MosChatCustomerCard,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, AI_QUICK_PROMPTS } from '../constants/chat-constants';
import { cleanQuotedText } from '../utils/quoteUtils';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import { MosChatComposerMobile } from './MosChatComposerMobile';
import { MosChatComposerDesktop } from './MosChatComposerDesktop';

/**
 * Zero-thrash textarea auto-resizer:
 * Avoids collapsing `style.height = 'auto'` on every single character typed,
 * preventing forced synchronous layout reflows across the chat flex container.
 */
export function syncTextareaHeightSmart(
  el: HTMLTextAreaElement | null,
  maxHeight: number,
  prevLenRefOrMinHeight?: React.MutableRefObject<number> | number,
  singleLineMaxHeight = 46
): void {
  if (!el) return;
  const val = el.value || '';
  const len = val.length;
  const prevLenRef =
    typeof prevLenRefOrMinHeight === 'object' && prevLenRefOrMinHeight !== null ? prevLenRefOrMinHeight : undefined;
  const effectiveSingleLineMax =
    typeof prevLenRefOrMinHeight === 'number' ? Math.max(prevLenRefOrMinHeight, 44) : singleLineMaxHeight;
  const prevLen = prevLenRef ? prevLenRef.current : len;
  if (prevLenRef) prevLenRef.current = len;

  if (len === 0) {
    if (el.style.height && el.style.height !== 'auto') {
      el.style.height = 'auto';
    }
    return;
  }

  // Fast path: short single-line typing never wraps, skip layout read/write completely
  if (len >= prevLen && len < 45 && !val.includes('\n') && el.clientHeight <= effectiveSingleLineMax) {
    return;
  }

  // Growing text: expand directly if scrollHeight exceeds clientHeight without collapsing to 'auto'
  if (len >= prevLen) {
    const sh = el.scrollHeight;
    if (sh > el.clientHeight) {
      el.style.height = `${Math.min(sh, maxHeight)}px`;
    }
    return;
  }

  // Shrinking text (backspace/delete): only collapse to 'auto' if currently taller than single line
  if (el.clientHeight > effectiveSingleLineMax || val.includes('\n')) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }
}

export interface MosChatComposerProps {
  isMobile: boolean;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  aiThinkingActive: boolean;
  isDark: boolean;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;

  /** Ref-based text for perf: read composerTextRef.current instead of state */
  composerTextRef: React.RefObject<string>;
  /** Lightweight boolean state for send-button styling */
  composerHasText: boolean;
  /** Write to ref + sync DOM + debounce hasText boolean */
  updateComposerText: (val: string) => void;
  /** Legacy setter (wraps updateComposerText for callback pattern) */
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  composerCursorPos?: number; // deprecated — now ref-based in parent, kept for compat
  setComposerCursorPos: (v: React.SetStateAction<number>) => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;

  stagedAttachments: MosChatImageAttachment[];
  pendingUploads?: PendingChatUploadItem[];
  renderStagedAttachmentsStrip: (attachments: MosChatImageAttachment[], scope: 'main') => React.ReactNode;
  stagedCustomerCard?: MosChatCustomerCard | null;
  setStagedCustomerCard?: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;

  isUrgentSend: boolean;
  setIsUrgentSend: React.Dispatch<React.SetStateAction<boolean>>;

  handleSendMessage: (convId: string, text: string) => Promise<SafeAny>;
  handleSendMain: () => void;
  triggerFilePicker: (scope: 'main') => void;
  handleSendQuickCustomerCard?: () => void;
  handleOpenCustomerPicker?: () => void;
  openTaskModalFromMessage: (msg: MosChatMessage | null) => void;
  checkForMentionTrigger: (text: string, cursor: number, scope: 'main') => void;
  handleClipboardPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>, scope: 'main') => void;
  handleMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: 'main') => boolean;
  handleApplyFormat: (format: SafeAny, scope: 'main') => void;

  renderMentionAutocompleteDropdown: (scope: 'main') => React.ReactNode;
  renderAppleNotesFormatToolbar: (scope: 'main', mode?: 'inline') => React.ReactNode;
  renderComposerEmojiPickerContent: (scope: 'main') => React.ReactNode;
  renderRichTextMessage: (text: string, isBubble: boolean) => React.ReactNode;

  setDriveLinkModalOpen: (open: boolean) => void;
  uploadTargetRef: React.MutableRefObject<SafeAny>;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  setInitialWorkflowCode: (code: string) => void;
  setRichEditorModalState: (state: SafeAny) => void;

  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  composerHasTextListenerRef?: React.MutableRefObject<((hasText: boolean) => void) | null>;
  mentionRenderKey?: string;
  replyingToMessage?: MosChatMessage | null;
  setReplyingToMessage?:
    React.Dispatch<React.SetStateAction<MosChatMessage | null>> | ((msg: MosChatMessage | null) => void);
}

export const MosChatComposer: React.FC<MosChatComposerProps> = React.memo(
  ({
    isMobile,
    activeConversation,
    canUseAiCopilot,
    isStrictDannySuperAdmin,
    aiThinkingActive,
    isDark,
    surfaceBg,
    surfaceRaised,
    borderColor,
    borderStrong,
    composerTextRef,
    composerHasText,
    updateComposerText,
    setComposerText,
    setComposerCursorPos,
    composerInputRef,
    stagedAttachments,
    pendingUploads = [],
    renderStagedAttachmentsStrip,
    stagedCustomerCard,
    setStagedCustomerCard,
    isUrgentSend,
    setIsUrgentSend,
    handleSendMessage,
    handleSendMain,
    triggerFilePicker,
    handleSendQuickCustomerCard,
    handleOpenCustomerPicker,
    openTaskModalFromMessage,
    checkForMentionTrigger,
    handleClipboardPaste,
    handleMentionKeyDown,
    handleApplyFormat,
    renderMentionAutocompleteDropdown,
    renderAppleNotesFormatToolbar,
    renderComposerEmojiPickerContent,
    renderRichTextMessage,
    setDriveLinkModalOpen,
    uploadTargetRef,
    setTriggerWorkflowModalOpen,
    setInitialWorkflowCode,
    setRichEditorModalState,
    isComposingRef,
    lastCompositionEndMsRef,
    composerHasTextListenerRef,
    replyingToMessage,
    setReplyingToMessage,
  }) => {
    // Performance: get token locally via hook instead of receiving as prop
    // (parent's token object has a new identity on every render, defeating React.memo)
    const { token } = theme.useToken();

    const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
    const [formatBarOpenMain, setFormatBarOpenMain] = useState<boolean>(true);
    const [isPreviewModeMain, setIsPreviewModeMain] = useState<boolean>(false);
    const [openStickerPopoverKey, setOpenStickerPopoverKey] = useState<string | null>(null);
    const [localHasText, setLocalHasText] = useState<boolean>(() =>
      Boolean(composerHasText || (composerTextRef.current && composerTextRef.current.trim().length > 0))
    );
    const prevLenRef = useRef<number>((composerTextRef.current || '').length);

    useEffect(() => {
      setLocalHasText(
        Boolean(composerHasText || (composerTextRef.current && composerTextRef.current.trim().length > 0))
      );
    }, [composerHasText, composerTextRef]);

    const syncLocalHasText = useCallback(
      (nextHasText: boolean) => {
        setLocalHasText((prev) => (prev === nextHasText ? prev : nextHasText));
        syncTextareaHeightSmart(composerInputRef?.current || null, isMobile ? 120 : 180, prevLenRef);
      },
      [composerInputRef, isMobile]
    );

    useEffect(() => {
      if (!composerHasTextListenerRef) return;
      composerHasTextListenerRef.current = syncLocalHasText;
      return () => {
        if (composerHasTextListenerRef.current === syncLocalHasText) {
          composerHasTextListenerRef.current = null;
        }
      };
    }, [composerHasTextListenerRef, syncLocalHasText]);

    // Format quote preview label gracefully with fallback for cards & media
    const quotedPreviewText = useMemo(() => {
      if (!replyingToMessage) return '';
      if (replyingToMessage.text?.trim()) {
        return cleanQuotedText(replyingToMessage.text);
      }
      if (replyingToMessage.customerCard?.name) {
        return `[Thẻ KH: ${replyingToMessage.customerCard.name}]`;
      }
      if (replyingToMessage.attachments && replyingToMessage.attachments.length > 0) {
        return `[${replyingToMessage.attachments.length} hình ảnh]`;
      }
      return '[Tin nhắn]';
    }, [replyingToMessage]);

    // Ensure textarea is immediately focused and visible when quoting a message
    useEffect(() => {
      if (replyingToMessage) {
        setIsPreviewModeMain(false);
        requestAnimationFrame(() => {
          composerInputRef?.current?.focus();
        });
      }
    }, [replyingToMessage, composerInputRef]);

    const effectiveHasText = localHasText || composerHasText;

    return (
      <div className="p-3" style={{ background: surfaceBg, borderTop: `1px solid ${borderColor}` }}>
        {activeConversation?.id === AI_COPILOT_CONV_ID && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 no-scrollbar">
            {AI_QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={aiThinkingActive}
                onClick={() => void handleSendMessage(AI_COPILOT_CONV_ID, item.prompt)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors hover:scale-[1.02]"
                style={{
                  background: isDark ? 'rgba(139, 92, 246, 0.14)' : 'rgba(139, 92, 246, 0.09)',
                  border: '1px solid rgba(139, 92, 246, 0.32)',
                  color: isDark ? '#c4b5fd' : '#6d28d9',
                }}
              >
                <Sparkles size={11} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {renderStagedAttachmentsStrip(stagedAttachments, 'main')}

        {stagedCustomerCard && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl border text-xs animate-in fade-in transition-all"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.1)',
              borderColor: 'rgba(212, 168, 75, 0.35)',
            }}
          >
            <Avatar
              size={22}
              src={stagedCustomerCard.avatarUrl || undefined}
              className="shrink-0 font-bold text-[10px] border border-amber-400/40 select-none shadow-sm"
              style={{
                backgroundColor: isDark ? '#b45309' : '#d97706',
                color: '#ffffff',
              }}
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
            <span className="font-semibold truncate" style={{ color: token.colorText }}>
              {stagedCustomerCard.name}
            </span>
            <span className="truncate text-amber-500 font-medium">({stagedCustomerCard.meta})</span>
            {stagedCustomerCard.cvName && (
              <span className="text-slate-400 truncate hidden sm:inline">· {stagedCustomerCard.cvName}</span>
            )}
            <button
              type="button"
              onClick={() => setStagedCustomerCard?.(null)}
              className="ml-auto w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: token.colorTextSecondary }}
              title="Bỏ đính kèm thẻ khách hàng"
              aria-label="Bỏ đính kèm thẻ khách hàng"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Replying quote preview banner (MOS-BUG-214) */}
        {replyingToMessage && (
          <div
            className="mb-2 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 border-l-4"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.14)',
              borderColor: '#d4a84b',
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <span className="font-semibold text-amber-500 dark:text-amber-400">
                Trả lời {replyingToMessage.senderName}:
              </span>
              <span className="truncate opacity-80" style={{ color: token.colorText }}>
                {quotedPreviewText}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToMessage?.(null)}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 transition-colors"
              aria-label="Hủy trích dẫn"
              title="Hủy trích dẫn (Esc)"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {isMobile ? (
          <MosChatComposerMobile
            token={token}
            activeConversation={activeConversation}
            canUseAiCopilot={canUseAiCopilot}
            surfaceRaised={surfaceRaised}
            borderStrong={borderStrong}
            mobileActionOpen={mobileActionOpen}
            setMobileActionOpen={setMobileActionOpen}
            formatBarOpenMain={formatBarOpenMain}
            setFormatBarOpenMain={setFormatBarOpenMain}
            openStickerPopoverKey={openStickerPopoverKey}
            setOpenStickerPopoverKey={setOpenStickerPopoverKey}
            localHasText={localHasText}
            setLocalHasText={setLocalHasText}
            effectiveHasText={effectiveHasText}
            prevLenRef={prevLenRef}
            composerTextRef={composerTextRef}
            updateComposerText={updateComposerText}
            setComposerText={setComposerText}
            setComposerCursorPos={setComposerCursorPos}
            composerInputRef={composerInputRef}
            stagedAttachments={stagedAttachments}
            stagedCustomerCard={stagedCustomerCard}
            replyingToMessage={replyingToMessage}
            setReplyingToMessage={setReplyingToMessage}
            handleSendMain={handleSendMain}
            triggerFilePicker={triggerFilePicker}
            handleSendQuickCustomerCard={handleSendQuickCustomerCard}
            handleOpenCustomerPicker={handleOpenCustomerPicker}
            openTaskModalFromMessage={openTaskModalFromMessage}
            checkForMentionTrigger={checkForMentionTrigger}
            handleClipboardPaste={handleClipboardPaste}
            handleMentionKeyDown={handleMentionKeyDown}
            handleApplyFormat={handleApplyFormat}
            renderMentionAutocompleteDropdown={renderMentionAutocompleteDropdown}
            renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
            renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
            setDriveLinkModalOpen={setDriveLinkModalOpen}
            uploadTargetRef={uploadTargetRef}
            setRichEditorModalState={setRichEditorModalState}
            isComposingRef={isComposingRef}
            lastCompositionEndMsRef={lastCompositionEndMsRef}
          />
        ) : (
          <MosChatComposerDesktop
            token={token}
            isDark={isDark}
            activeConversation={activeConversation}
            canUseAiCopilot={canUseAiCopilot}
            isStrictDannySuperAdmin={isStrictDannySuperAdmin}
            surfaceRaised={surfaceRaised}
            borderStrong={borderStrong}
            formatBarOpenMain={formatBarOpenMain}
            setFormatBarOpenMain={setFormatBarOpenMain}
            isPreviewModeMain={isPreviewModeMain}
            setIsPreviewModeMain={setIsPreviewModeMain}
            openStickerPopoverKey={openStickerPopoverKey}
            setOpenStickerPopoverKey={setOpenStickerPopoverKey}
            localHasText={localHasText}
            setLocalHasText={setLocalHasText}
            effectiveHasText={effectiveHasText}
            prevLenRef={prevLenRef}
            composerTextRef={composerTextRef}
            updateComposerText={updateComposerText}
            setComposerText={setComposerText}
            setComposerCursorPos={setComposerCursorPos}
            composerInputRef={composerInputRef}
            stagedAttachments={stagedAttachments}
            hasPendingUpload={pendingUploads.some((p) => p.scope === 'main' && p.phase !== 'error')}
            stagedCustomerCard={stagedCustomerCard}
            isUrgentSend={isUrgentSend}
            setIsUrgentSend={setIsUrgentSend}
            replyingToMessage={replyingToMessage}
            setReplyingToMessage={setReplyingToMessage}
            handleSendMain={handleSendMain}
            triggerFilePicker={triggerFilePicker}
            handleSendQuickCustomerCard={handleSendQuickCustomerCard}
            handleOpenCustomerPicker={handleOpenCustomerPicker}
            openTaskModalFromMessage={openTaskModalFromMessage}
            checkForMentionTrigger={checkForMentionTrigger}
            handleClipboardPaste={handleClipboardPaste}
            handleMentionKeyDown={handleMentionKeyDown}
            handleApplyFormat={handleApplyFormat}
            renderMentionAutocompleteDropdown={renderMentionAutocompleteDropdown}
            renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
            renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
            renderRichTextMessage={renderRichTextMessage}
            setDriveLinkModalOpen={setDriveLinkModalOpen}
            uploadTargetRef={uploadTargetRef}
            setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
            setInitialWorkflowCode={setInitialWorkflowCode}
            setRichEditorModalState={setRichEditorModalState}
            isComposingRef={isComposingRef}
            lastCompositionEndMsRef={lastCompositionEndMsRef}
          />
        )}
      </div>
    );
  },
  // Performance: custom comparator — only re-render when DATA props change.
  // Skip function/ref/render props (they change identity on every parent render
  // but are behaviorally stable). Token is now sourced internally via useToken().
  (prev, next) => {
    return (
      prev.isMobile === next.isMobile &&
      prev.isDark === next.isDark &&
      prev.surfaceBg === next.surfaceBg &&
      prev.surfaceRaised === next.surfaceRaised &&
      prev.borderColor === next.borderColor &&
      prev.borderStrong === next.borderStrong &&
      prev.composerHasText === next.composerHasText &&
      prev.canUseAiCopilot === next.canUseAiCopilot &&
      prev.isStrictDannySuperAdmin === next.isStrictDannySuperAdmin &&
      prev.aiThinkingActive === next.aiThinkingActive &&
      prev.isUrgentSend === next.isUrgentSend &&
      prev.activeConversation?.id === next.activeConversation?.id &&
      prev.stagedAttachments === next.stagedAttachments &&
      prev.pendingUploads === next.pendingUploads &&
      prev.stagedCustomerCard === next.stagedCustomerCard &&
      prev.mentionRenderKey === next.mentionRenderKey &&
      prev.replyingToMessage === next.replyingToMessage
    );
  }
);

MosChatComposer.displayName = 'MosChatComposer';
