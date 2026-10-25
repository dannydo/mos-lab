'use client';

import React, { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import {
  Sparkles,
  ImagePlus,
  HardDrive,
  UserRoundPlus,
  AlarmClockPlus,
  AtSign,
  FilePenLine,
  X,
  Plus,
  SmilePlus,
  SendHorizontal,
  Eye,
  Zap,
  Paperclip,
  Bot,
  Activity,
} from 'lucide-react';
import type { MosChatConversation, MosChatMessage, MosChatImageAttachment, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, AI_QUICK_PROMPTS } from '../constants/chat-constants';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';

export interface MosChatComposerProps {
  isMobile: boolean;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  aiThinkingActive: boolean;
  isDark: boolean;
  token: SafeAny;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;

  composerText: string;
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  composerCursorPos: number;
  setComposerCursorPos: React.Dispatch<React.SetStateAction<number>>;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;

  stagedAttachments: MosChatImageAttachment[];
  renderStagedAttachmentsStrip: (attachments: MosChatImageAttachment[], scope: 'main') => React.ReactNode;

  isUrgentSend: boolean;
  setIsUrgentSend: React.Dispatch<React.SetStateAction<boolean>>;

  handleSendMessage: (convId: string, text: string) => Promise<SafeAny>;
  handleSendMain: () => void;
  triggerFilePicker: (scope: 'main') => void;
  handleSendQuickCustomerCard: () => void;
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
}

export const MosChatComposer: React.FC<MosChatComposerProps> = ({
  isMobile,
  activeConversation,
  currentUser,
  canUseAiCopilot,
  isStrictDannySuperAdmin,
  aiThinkingActive,
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  borderStrong,
  composerText,
  setComposerText,
  composerCursorPos,
  setComposerCursorPos,
  composerInputRef,
  stagedAttachments,
  renderStagedAttachmentsStrip,
  isUrgentSend,
  setIsUrgentSend,
  handleSendMessage,
  handleSendMain,
  triggerFilePicker,
  handleSendQuickCustomerCard,
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
}) => {
  const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
  const [formatBarOpenMain, setFormatBarOpenMain] = useState<boolean>(true);
  const [isPreviewModeMain, setIsPreviewModeMain] = useState<boolean>(false);
  const [openStickerPopoverKey, setOpenStickerPopoverKey] = useState<string | null>(null);

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

      {isMobile ? (
        <div className="flex flex-col gap-2">
          {/* Quick action grid drawer on mobile */}
          {mobileActionOpen && (
            <div
              className="p-3 rounded-2xl grid grid-cols-3 gap-2.5 transition-all shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderStrong}`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerFilePicker('main');
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 overflow-hidden shrink-0">
                  <ImagePlus size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  Gửi ảnh
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  uploadTargetRef.current = { scope: 'main' };
                  setDriveLinkModalOpen(true);
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 overflow-hidden shrink-0">
                  <HardDrive size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  Drive
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSendQuickCustomerCard();
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 overflow-hidden shrink-0">
                  <UserRoundPlus size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  Thẻ khách
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openTaskModalFromMessage(null);
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-400/15 text-[#d4a84b] border border-[#d4a84b]/30 overflow-hidden shrink-0">
                  <AlarmClockPlus size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  Giao việc
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setComposerText((prev) => {
                    const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                    setTimeout(() => {
                      composerInputRef.current?.focus();
                      const len = next.length;
                      composerInputRef.current?.setSelectionRange(len, len);
                      checkForMentionTrigger(next, len, 'main');
                    }, 20);
                    return next;
                  });
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/20 overflow-hidden shrink-0">
                  <AtSign size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  Nhắc tên
                </span>
              </button>

              {canUseAiCopilot && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                <button
                  type="button"
                  onClick={() => {
                    setComposerText((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                    setMobileActionOpen(false);
                    composerInputRef.current?.focus();
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/30 overflow-hidden shrink-0 font-black text-[11px]">
                    MAI
                  </div>
                  <span
                    className="text-[10.5px] font-medium text-center leading-tight"
                    style={{ color: token.colorText }}
                  >
                    Gọi @MAI
                  </span>
                </button>
              )}

              {/* CKEditor Mobile Button */}
              <button
                type="button"
                onClick={() => {
                  setRichEditorModalState({
                    open: true,
                    scope: 'main',
                    title: 'Soạn thảo phong phú (CKEditor)',
                  });
                  setMobileActionOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30 overflow-hidden shrink-0">
                  <FilePenLine size={16} />
                </div>
                <span
                  className="text-[10.5px] font-medium text-center leading-tight"
                  style={{ color: token.colorText }}
                >
                  CKEditor
                </span>
              </button>
            </div>
          )}

          {/* Apple Notes Style Format Toolbar for Mobile */}
          {formatBarOpenMain && renderAppleNotesFormatToolbar('main')}

          {/* Mobile Main Row */}
          <div className="flex items-center gap-1.5">
            {/* [+] Action expander button */}
            <button
              type="button"
              aria-label={mobileActionOpen ? 'Đóng tiện ích đính kèm' : 'Mở tiện ích đính kèm'}
              onClick={() => setMobileActionOpen((prev) => !prev)}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
              style={{
                background: mobileActionOpen ? '#d4a84b' : surfaceRaised,
                border: `1px solid ${mobileActionOpen ? '#d4a84b' : borderStrong}`,
                color: mobileActionOpen ? '#000' : token.colorTextSecondary,
              }}
            >
              {mobileActionOpen ? <X size={15} /> : <Plus size={15} />}
            </button>

            {/* [Aa] Apple Notes Format Button for Mobile */}
            <button
              type="button"
              aria-label="Định dạng chữ Apple Notes"
              onClick={() => setFormatBarOpenMain((prev) => !prev)}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
              style={{
                background: formatBarOpenMain ? '#d4a84b' : surfaceRaised,
                border: `1px solid ${formatBarOpenMain ? '#d4a84b' : borderStrong}`,
                color: formatBarOpenMain ? '#000' : token.colorTextSecondary,
              }}
            >
              <span className="font-serif font-bold text-[13px] tracking-tight">Aa</span>
            </button>

            {/* Text Input Pill with Floating @Mention Autocomplete */}
            <div
              className="relative flex-1 min-h-[38px] max-h-[120px] rounded-2xl px-3 py-1 flex items-center gap-1.5"
              style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
            >
              {renderMentionAutocompleteDropdown('main')}

              <textarea
                ref={composerInputRef}
                rows={1}
                value={composerText}
                onChange={(e) => {
                  const val = e.target.value;
                  setComposerText(val);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  checkForMentionTrigger(val, e.target.selectionStart ?? val.length, 'main');
                }}
                onClick={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  checkForMentionTrigger(target.value, target.selectionStart ?? target.value.length, 'main');
                }}
                onKeyUp={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
                    const target = e.target as HTMLTextAreaElement;
                    checkForMentionTrigger(target.value, target.selectionStart ?? target.value.length, 'main');
                  }
                }}
                onPaste={(e) => handleClipboardPaste(e, 'main')}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  lastCompositionEndMsRef.current = Date.now();
                  setTimeout(() => {
                    isComposingRef.current = false;
                  }, 50);
                }}
                onKeyDown={(e) => {
                  if (handleMentionKeyDown(e, 'main')) return;
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    handleApplyFormat('bold', 'main');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                    e.preventDefault();
                    handleApplyFormat('italic', 'main');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    handleApplyFormat('underline', 'main');
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (
                      e.nativeEvent.isComposing ||
                      isComposingRef.current ||
                      e.keyCode === 229 ||
                      Date.now() - lastCompositionEndMsRef.current < 60
                    ) {
                      return;
                    }
                    e.preventDefault();
                    handleSendMain();
                  }
                }}
                placeholder="Nhắn tin... (Shift+Enter để xuống dòng)"
                className="flex-1 bg-transparent border-0 outline-none text-[13.5px] resize-none leading-relaxed py-1"
                style={{ color: token.colorText, maxHeight: 110 }}
              />

              <Popover
                trigger="click"
                placement="topRight"
                open={openStickerPopoverKey === 'composer:main:mobile'}
                onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:mobile' : null)}
                content={renderComposerEmojiPickerContent('main')}
              >
                <button
                  type="button"
                  aria-label="Chèn biểu tượng cảm xúc Wings"
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/10 active:scale-95"
                  style={{ color: token.colorTextSecondary }}
                >
                  <SmilePlus size={16} />
                </button>
              </Popover>
            </div>

            {/* Send Button */}
            <button
              type="button"
              aria-label="Gửi tin nhắn"
              onClick={handleSendMain}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
              style={{
                background: composerText.trim() || stagedAttachments.length > 0 ? '#d4a84b' : surfaceRaised,
                border: `1px solid ${composerText.trim() || stagedAttachments.length > 0 ? '#d4a84b' : borderStrong}`,
                color: composerText.trim() || stagedAttachments.length > 0 ? '#000' : token.colorTextSecondary,
              }}
            >
              <SendHorizontal size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Layout: Spacious, 2-Tier Modern Google Chat Workspace Composer Card */
        <div className="space-y-1.5">
          <div
            className="relative rounded-2xl px-3.5 pt-2.5 pb-2 flex flex-col transition-all shadow-sm focus-within:shadow-md focus-within:border-[#d4a84b]/60"
            style={{
              background: surfaceRaised,
              border: `1px solid ${borderStrong}`,
            }}
          >
            {renderMentionAutocompleteDropdown('main')}

            {/* Inline Compact Format Toolbar */}
            {formatBarOpenMain && renderAppleNotesFormatToolbar('main', 'inline')}

            {/* Top: Live Preview or 100% Full-Width Textarea */}
            {isPreviewModeMain ? (
              <div
                className="w-full min-h-[58px] max-h-[220px] overflow-y-auto px-1 py-1 rounded-lg select-text mb-1"
                style={{ color: token.colorText }}
              >
                <div className="flex items-center justify-between pb-1 mb-2 border-b border-amber-500/20 text-[11px] font-bold text-amber-500">
                  <div className="flex items-center gap-1.5">
                    <Eye size={13} />
                    <span>Đang xem trước trực quan (WYSIWYG)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreviewModeMain(false)}
                    className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-medium transition-colors cursor-pointer"
                  >
                    Quay lại chỉnh sửa
                  </button>
                </div>
                {composerText.trim() ? (
                  <div className="prose max-w-none text-[13.5px]">{renderRichTextMessage(composerText, false)}</div>
                ) : (
                  <div className="text-zinc-500 text-[12px] italic py-2">
                    Chưa có nội dung để xem trước... Nhập văn bản để xem hiển thị định dạng.
                  </div>
                )}
              </div>
            ) : (
              <textarea
                ref={composerInputRef}
                rows={1}
                value={composerText}
                onChange={(e) => {
                  const val = e.target.value;
                  const cur = e.target.selectionStart ?? val.length;
                  setComposerText(val);
                  setComposerCursorPos(cur);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                  checkForMentionTrigger(val, cur, 'main');
                }}
                onClick={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const cur = target.selectionStart ?? target.value.length;
                  setComposerCursorPos(cur);
                  checkForMentionTrigger(target.value, cur, 'main');
                }}
                onKeyUp={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const cur = target.selectionStart ?? target.value.length;
                  setComposerCursorPos(cur);
                  if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
                    checkForMentionTrigger(target.value, cur, 'main');
                  }
                }}
                onPaste={(e) => handleClipboardPaste(e, 'main')}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  lastCompositionEndMsRef.current = Date.now();
                  setTimeout(() => {
                    isComposingRef.current = false;
                  }, 50);
                }}
                onKeyDown={(e) => {
                  if (handleMentionKeyDown(e, 'main')) return;
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    handleApplyFormat('bold', 'main');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                    e.preventDefault();
                    handleApplyFormat('italic', 'main');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    handleApplyFormat('underline', 'main');
                    return;
                  }
                  if (e.key === 'Enter' && e.shiftKey) {
                    const el = e.currentTarget;
                    const smart = handleSmartListEnterKey(
                      composerText,
                      el.selectionStart ?? composerText.length,
                      el.selectionEnd ?? composerText.length
                    );
                    if (smart.handled) {
                      e.preventDefault();
                      setComposerText(smart.nextText);
                      setComposerCursorPos(smart.nextCursor);
                      setTimeout(() => {
                        el.focus();
                        el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                      }, 0);
                      return;
                    }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (
                      e.nativeEvent.isComposing ||
                      isComposingRef.current ||
                      e.keyCode === 229 ||
                      Date.now() - lastCompositionEndMsRef.current < 60
                    ) {
                      return;
                    }
                    e.preventDefault();
                    handleSendMain();
                  }
                }}
                placeholder={
                  activeConversation?.id === AI_COPILOT_CONV_ID
                    ? 'Hỏi MAI, Paste hình (⌘V) hoặc yêu cầu phân tích khách hàng... (Shift+Enter để xuống dòng)'
                    : canUseAiCopilot
                      ? 'Nhắn tin, gõ @MAI để gọi mOS AI, Paste hình (⌘V)... (Shift+Enter để xuống dòng)'
                      : 'Nhắn tin, Paste hình (⌘V) hoặc dán link Google Drive... (Shift+Enter để xuống dòng)'
                }
                className="w-full bg-transparent border-0 outline-none text-[13.5px] resize-none leading-relaxed px-0.5 py-1 min-h-[42px]"
                style={{ color: token.colorText, maxHeight: 180 }}
              />
            )}

            {/* Bottom Toolbar: Action Icons on Left, Send Button on Right */}
            <div
              className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t"
              style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
            >
              <div className="flex items-center gap-1 flex-wrap">
                {/* [Aa] Inline Quick-Type Format Bar Toggle */}
                <Tooltip title="Thanh định dạng gọn gõ nhanh (B, I, U, Màu chữ, Danh sách •)">
                  <button
                    type="button"
                    aria-label="Định dạng chữ Apple Notes"
                    onClick={() => setFormatBarOpenMain((prev) => !prev)}
                    className="w-7 h-7 rounded-lg inline-flex flex-col items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all"
                    style={{
                      background: formatBarOpenMain ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                      color: formatBarOpenMain ? '#f472b6' : token.colorTextSecondary,
                      border: formatBarOpenMain ? '1px solid rgba(236, 72, 153, 0.35)' : 'none',
                    }}
                  >
                    <span className="font-serif font-bold text-[12px] leading-none tracking-tight">Aa</span>
                    <span
                      className="w-3.5 h-[2px] rounded-full mt-0.5"
                      style={{
                        background: formatBarOpenMain ? '#f472b6' : 'currentColor',
                        opacity: 0.75,
                      }}
                    />
                  </button>
                </Tooltip>

                {/* [⚡ Gọn] Compact Quick-Type Editor Button */}
                <Tooltip title="Mở Bản gọn (Type nhanh) — Nhấn Enter tự động xuống dòng dấu • như Google Chat">
                  <button
                    type="button"
                    aria-label="Mở trình soạn thảo Bản gọn Type nhanh"
                    onClick={() => {
                      setRichEditorModalState({
                        open: true,
                        scope: 'main',
                        title: 'Soạn thảo phong phú (CKEditor)',
                        initialMode: 'compact',
                      });
                    }}
                    className="h-7 px-2 rounded-lg inline-flex items-center gap-1 hover:bg-pink-500/15 cursor-pointer transition-colors text-[11px] font-bold text-pink-400 border border-pink-500/30"
                  >
                    <Zap size={12} />
                    <span className="hidden xl:inline">Bản gọn</span>
                  </button>
                </Tooltip>

                {/* [CKEditor] Full Studio Rich Editor Modal Button */}
                <Tooltip title="Mở rộng trình soạn thảo phong phú (CKEditor Mode) với mẫu văn bản & bảng biểu">
                  <button
                    type="button"
                    aria-label="Mở trình soạn thảo phong phú CKEditor"
                    onClick={() => {
                      setRichEditorModalState({
                        open: true,
                        scope: 'main',
                        title: 'Soạn thảo phong phú (CKEditor)',
                        initialMode: 'split',
                      });
                    }}
                    className="h-7 px-2 rounded-lg inline-flex items-center gap-1 hover:bg-amber-500/15 cursor-pointer transition-colors text-[11px] font-bold text-amber-500 border border-amber-500/30"
                  >
                    <FilePenLine size={13} />
                    <span className="hidden xl:inline">CKEditor</span>
                  </button>
                </Tooltip>

                <Popover
                  trigger="click"
                  placement="topRight"
                  open={openStickerPopoverKey === 'composer:main:desktop'}
                  onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:desktop' : null)}
                  content={renderComposerEmojiPickerContent('main')}
                >
                  <Tooltip title="Chèn biểu tượng cảm xúc Wings">
                    <button
                      type="button"
                      aria-label="Chèn biểu tượng cảm xúc Wings"
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <SmilePlus size={16} />
                    </button>
                  </Tooltip>
                </Popover>

                <Tooltip title="Đính kèm tệp tin & tài liệu (PDF, Excel, Word, ZIP...)">
                  <button
                    type="button"
                    aria-label="Đính kèm tệp tin & tài liệu"
                    onClick={() => triggerFilePicker('main')}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <Paperclip size={16} />
                  </button>
                </Tooltip>

                <Tooltip title="Tải hình từ Ổ đĩa / Google Drive Desktop hoặc Paste ảnh (⌘V)">
                  <button
                    type="button"
                    aria-label="Tải hình từ ổ đĩa hoặc Google Drive"
                    onClick={() => triggerFilePicker('main')}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <ImagePlus size={16} />
                  </button>
                </Tooltip>

                <Tooltip title="Đính kèm hình từ link Google Drive">
                  <button
                    type="button"
                    aria-label="Đính kèm hình từ link Google Drive"
                    onClick={() => {
                      uploadTargetRef.current = { scope: 'main' };
                      setDriveLinkModalOpen(true);
                    }}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <HardDrive size={16} />
                  </button>
                </Tooltip>

                <Tooltip title="Đính kèm thẻ Khách hàng / Booking mOS">
                  <button
                    type="button"
                    aria-label="Đính kèm thẻ Khách hàng"
                    onClick={handleSendQuickCustomerCard}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <UserRoundPlus size={16} />
                  </button>
                </Tooltip>

                {canUseAiCopilot && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                  <Tooltip title="Gọi @MAI để mOS AI phân tích & trả lời công khai vào nhóm này">
                    <button
                      type="button"
                      aria-label="Gọi @MAI trong nhóm"
                      onClick={() => {
                        setComposerText((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                        composerInputRef.current?.focus();
                      }}
                      className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 hover:bg-purple-500/15 cursor-pointer transition-colors text-[11px] font-black"
                      style={{ color: '#a78bfa' }}
                    >
                      <Bot size={15} />
                      <span>@MAI</span>
                    </button>
                  </Tooltip>
                )}

                <Tooltip title="Nhắc tên đồng nghiệp (@)">
                  <button
                    type="button"
                    aria-label="Nhắc tên đồng nghiệp"
                    onClick={() => {
                      setComposerText((prev) => {
                        const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                        setTimeout(() => {
                          composerInputRef.current?.focus();
                          const len = next.length;
                          composerInputRef.current?.setSelectionRange(len, len);
                          checkForMentionTrigger(next, len, 'main');
                        }, 20);
                        return next;
                      });
                    }}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <AtSign size={16} />
                  </button>
                </Tooltip>

                <Tooltip
                  title={
                    isUrgentSend
                      ? 'Đang bật chế độ khẩn cấp (Buzz): Nhấp để tắt'
                      : 'Bật chế độ khẩn cấp (Buzz): Gửi và tự động phát âm thanh thông báo @MAI đến người được tag'
                  }
                >
                  <button
                    type="button"
                    aria-label="Chế độ khẩn cấp"
                    onClick={() => setIsUrgentSend((prev) => !prev)}
                    className={`h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all ${
                      isUrgentSend
                        ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                        : 'hover:bg-amber-500/15 text-amber-500/80 border border-amber-500/30'
                    }`}
                  >
                    <Zap size={13} className={isUrgentSend ? 'animate-bounce' : ''} />
                    <span>Khẩn cấp</span>
                  </button>
                </Tooltip>

                <Tooltip title="Giao Task & Cài nhắc hẹn mới">
                  <button
                    type="button"
                    aria-label="Giao Task & Cài nhắc hẹn mới"
                    onClick={() => openTaskModalFromMessage(null)}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer transition-colors"
                    style={{ color: '#d4a84b' }}
                  >
                    <AlarmClockPlus size={16} />
                  </button>
                </Tooltip>

                {/* Super Admin Only: [⚡ Quy trình] Trigger Button */}
                {isStrictDannySuperAdmin && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                  <Tooltip title="⚡ Khởi tạo Quy trình Sống (/tam-ung, /kiem-kho, /tao-quy-trinh) — Chỉ dành cho Super Admin">
                    <button
                      type="button"
                      aria-label="Khởi tạo Quy trình Sống"
                      onClick={() => {
                        setInitialWorkflowCode('WF_CASH_ADVANCE');
                        setTriggerWorkflowModalOpen(true);
                      }}
                      className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold hover:bg-blue-500/15 cursor-pointer transition-colors"
                      style={{
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      <Activity size={13} />
                      <span>⚡ Quy trình</span>
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Send button with hint */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] select-none hidden sm:inline" style={{ color: token.colorTextQuaternary }}>
                  Enter gửi · Shift+Enter xuống dòng
                </span>
                <Tooltip title="Gửi tin nhắn (Enter)">
                  <button
                    type="button"
                    aria-label="Gửi tin nhắn"
                    onClick={handleSendMain}
                    className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
                    style={{
                      background:
                        composerText.trim() || stagedAttachments.length > 0
                          ? '#d4a84b'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.06)',
                      color: composerText.trim() || stagedAttachments.length > 0 ? '#000' : token.colorTextQuaternary,
                    }}
                  >
                    <SendHorizontal size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
