'use client';

import React from 'react';
import { Tooltip, Popover } from 'antd';
import type { GlobalToken } from 'antd';
import {
  ImagePlus,
  Film,
  HardDrive,
  UserRoundPlus,
  AlarmClockPlus,
  AtSign,
  FilePenLine,
  SmilePlus,
  SendHorizontal,
  Eye,
  Zap,
  Paperclip,
  Bot,
  Activity,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatImageAttachment,
  MosChatCustomerCard,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';
import { syncTextareaHeightSmart } from './MosChatComposer';

export interface MosChatComposerDesktopProps {
  token: GlobalToken;
  isDark: boolean;
  activeConversation: MosChatConversation | null;
  canUseAiCopilot: boolean;
  isStrictDannySuperAdmin: boolean;
  surfaceRaised: string;
  borderStrong: string;
  formatBarOpenMain: boolean;
  setFormatBarOpenMain: React.Dispatch<React.SetStateAction<boolean>>;
  isPreviewModeMain: boolean;
  setIsPreviewModeMain: React.Dispatch<React.SetStateAction<boolean>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: React.Dispatch<React.SetStateAction<string | null>>;
  localHasText: boolean;
  setLocalHasText: React.Dispatch<React.SetStateAction<boolean>>;
  effectiveHasText: boolean;
  prevLenRef: React.MutableRefObject<number>;
  composerTextRef: React.RefObject<string>;
  updateComposerText: (val: string) => void;
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  setComposerCursorPos: (v: React.SetStateAction<number>) => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  stagedAttachments: MosChatImageAttachment[];
  hasPendingUpload?: boolean;
  stagedCustomerCard?: MosChatCustomerCard | null;
  isUrgentSend: boolean;
  setIsUrgentSend: React.Dispatch<React.SetStateAction<boolean>>;
  replyingToMessage?: MosChatMessage | null;
  setReplyingToMessage?:
    React.Dispatch<React.SetStateAction<MosChatMessage | null>> | ((msg: MosChatMessage | null) => void);
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
}

export const MosChatComposerDesktop: React.FC<MosChatComposerDesktopProps> = ({
  token,
  isDark,
  activeConversation,
  canUseAiCopilot,
  isStrictDannySuperAdmin,
  surfaceRaised,
  borderStrong,
  formatBarOpenMain,
  setFormatBarOpenMain,
  isPreviewModeMain,
  setIsPreviewModeMain,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  localHasText,
  setLocalHasText,
  effectiveHasText,
  prevLenRef,
  composerTextRef,
  updateComposerText,
  setComposerText,
  setComposerCursorPos,
  composerInputRef,
  stagedAttachments,
  hasPendingUpload = false,
  stagedCustomerCard,
  isUrgentSend,
  setIsUrgentSend,
  replyingToMessage,
  setReplyingToMessage,
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
}) => {
  return (
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
            {composerTextRef.current.trim() ? (
              <div className="prose max-w-none text-[13.5px]">
                {renderRichTextMessage(composerTextRef.current, false)}
              </div>
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
            defaultValue={composerTextRef.current}
            onChange={(e) => {
              const val = e.target.value;
              const cur = e.target.selectionStart ?? val.length;
              const nextHasText = val.trim().length > 0;
              if (nextHasText !== localHasText) {
                setLocalHasText(nextHasText);
              }
              updateComposerText(val);
              setComposerCursorPos(cur);
              syncTextareaHeightSmart(e.target, 180, prevLenRef, 46);
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
              if (e.key === 'Escape' && replyingToMessage) {
                e.preventDefault();
                setReplyingToMessage?.(null);
                return;
              }
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
                const currentText = el.value;
                const smart = handleSmartListEnterKey(
                  currentText,
                  el.selectionStart ?? currentText.length,
                  el.selectionEnd ?? currentText.length
                );
                if (smart.handled) {
                  e.preventDefault();
                  updateComposerText(smart.nextText);
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
            className="w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[13.5px] resize-none leading-relaxed px-0.5 py-1 min-h-[42px]"
            style={{ color: token.colorText, maxHeight: 180, outline: 'none', boxShadow: 'none' }}
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

            <Tooltip
              title={openStickerPopoverKey === 'composer:main:desktop' ? undefined : 'Chèn biểu tượng cảm xúc Wings'}
            >
              <Popover
                trigger="click"
                placement="topRight"
                zIndex={1500}
                destroyOnHidden
                open={openStickerPopoverKey === 'composer:main:desktop'}
                onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:desktop' : null)}
                content={renderComposerEmojiPickerContent('main')}
              >
                <button
                  type="button"
                  aria-label="Chèn biểu tượng cảm xúc Wings"
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  style={{ color: token.colorTextSecondary }}
                >
                  <SmilePlus size={16} />
                </button>
              </Popover>
            </Tooltip>

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

            {/* [Film] Đính kèm Video vào khung chat (MOS-CHAT-VIDEO) */}
            <Tooltip title="Đính kèm video (MP4, MOV, WebM, M4V tối đa 100MB)">
              <button
                type="button"
                aria-label="Đính kèm video"
                onClick={() => triggerFilePicker('main')}
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-amber-500 hover:text-amber-400"
              >
                <Film size={16} />
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
                onClick={handleOpenCustomerPicker || handleSendQuickCustomerCard}
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                style={{ color: stagedCustomerCard ? '#d4a84b' : token.colorTextSecondary }}
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
            <Tooltip title={hasPendingUpload ? 'Video đang được tải lên...' : 'Gửi tin nhắn (Enter)'}>
              <button
                type="button"
                aria-label="Gửi tin nhắn"
                onClick={handleSendMain}
                disabled={hasPendingUpload}
                className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                style={{
                  background:
                    (effectiveHasText || stagedAttachments.length > 0 || stagedCustomerCard) && !hasPendingUpload
                      ? '#d4a84b'
                      : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                  color:
                    (effectiveHasText || stagedAttachments.length > 0 || stagedCustomerCard) && !hasPendingUpload
                      ? '#000'
                      : token.colorTextQuaternary,
                }}
              >
                <SendHorizontal size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
