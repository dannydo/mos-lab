'use client';

import React from 'react';
import { Tooltip, Popover } from 'antd';
import {
  Activity,
  AlarmClockPlus,
  AtSign,
  Bot,
  CornerDownLeft,
  Eye,
  FilePenLine,
  Film,
  HardDrive,
  ImagePlus,
  Paperclip,
  SendHorizontal,
  SmilePlus,
  UserRoundPlus,
  Zap,
} from 'lucide-react';
import type { MosChatConversation, MosChatCustomerCard, MosChatMessage, SafeAny } from '@mos-lab/shared';
import { syncTextareaHeightSmart } from './MosChatComposer';

export interface MosChatThreadComposerDesktopProps {
  activeThreadMessage: MosChatMessage;
  activeConversation: MosChatConversation | null;
  AI_COPILOT_CONV_ID: string;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
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
  formatBarOpenThread: boolean;
  setFormatBarOpenThread: React.Dispatch<React.SetStateAction<boolean>>;
  isPreviewModeThread: boolean;
  setIsPreviewModeThread: React.Dispatch<React.SetStateAction<boolean>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  localThreadHasText: boolean;
  setLocalThreadHasText: React.Dispatch<React.SetStateAction<boolean>>;
  threadAttachments: SafeAny[];
  hasPendingUpload?: boolean;
  stagedCustomerCard?: MosChatCustomerCard | null;
  replyingToReply: { id: string; senderName: string; text: string } | null;
  setReplyingToReply: React.Dispatch<React.SetStateAction<{ id: string; senderName: string; text: string } | null>>;
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

export const MosChatThreadComposerDesktop: React.FC<MosChatThreadComposerDesktopProps> = ({
  activeThreadMessage,
  activeConversation,
  AI_COPILOT_CONV_ID,
  isDark,
  token,
  surfaceRaised,
  draggingRootMsgId,
  isDraggingOverThread,
  setIsDraggingOverThread,
  isDraggingOver,
  setIsDraggingOver,
  handleProcessImageFiles,
  formatBarOpenThread,
  setFormatBarOpenThread,
  isPreviewModeThread,
  setIsPreviewModeThread,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  localThreadHasText,
  setLocalThreadHasText,
  threadAttachments,
  hasPendingUpload = false,
  stagedCustomerCard,
  replyingToReply,
  setReplyingToReply,
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
}) => {
  return (
    <div>
      {formatBarOpenThread && renderAppleNotesFormatToolbar('thread', 'inline')}

      {isPreviewModeThread ? (
        <div
          className="w-full min-h-[50px] max-h-[160px] overflow-y-auto px-1 py-1 rounded-lg select-text mb-1"
          style={{ color: token.colorText }}
        >
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-500/20 text-[10.5px] font-bold text-amber-500">
            <div className="flex items-center gap-1.5">
              <Eye size={12} />
              <span>Đang xem trước phản hồi luồng</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewModeThread(false)}
              className="text-[10.5px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-medium transition-colors cursor-pointer"
            >
              Quay lại sửa
            </button>
          </div>
          {(effectiveThreadTextRef.current || '').trim() ? (
            <div className="prose max-w-none text-[13px]">
              {renderRichTextMessage(effectiveThreadTextRef.current, false)}
            </div>
          ) : (
            <div className="text-zinc-500 text-[11.5px] italic py-1">Chưa có nội dung để xem trước...</div>
          )}
        </div>
      ) : (
        <textarea
          ref={threadInputRef}
          rows={1}
          defaultValue={effectiveThreadTextRef.current}
          onDragOver={(e) => {
            if (draggingRootMsgId) return;
            const hasFiles =
              Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
            if (hasFiles) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              if (!isDraggingOverThread) setIsDraggingOverThread(true);
              if (isDraggingOver) setIsDraggingOver(false);
            }
          }}
          onDrop={(e) => {
            if (draggingRootMsgId) return;
            if (e.dataTransfer?.files?.length) {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              setIsDraggingOverThread(false);
              void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
            }
          }}
          onChange={(e) => {
            const next = e.target.value;
            effectiveThreadTextRef.current = next;
            const nextHas = Boolean(next.trim());
            setLocalThreadHasText((old) => (old === nextHas ? old : nextHas));
            syncTextareaHeightSmart(e.target, 140, 36);
            setThreadInput(next);
            const pos = e.target.selectionEnd || 0;
            setThreadCursorPos(pos);
            checkForMentionTrigger(next, pos, 'thread');
          }}
          onSelect={(e) => {
            const el = e.target as HTMLTextAreaElement;
            const pos = el.selectionEnd || 0;
            setThreadCursorPos(pos);
            checkForMentionTrigger(el.value, pos, 'thread');
          }}
          onKeyDown={(e) => {
            if (handleMentionKeyDown(e, 'thread')) return;
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
              e.preventDefault();
              handleApplyFormat('bold', 'thread');
              return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
              e.preventDefault();
              handleApplyFormat('italic', 'thread');
              return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
              e.preventDefault();
              handleApplyFormat('underline', 'thread');
              return;
            }
            if (e.key === 'Enter' && e.shiftKey) {
              const el = e.currentTarget;
              const currentVal = effectiveThreadTextRef.current || el.value || '';
              const smart = handleSmartListEnterKey(currentVal, el.selectionStart || 0, el.selectionEnd || 0);
              if (smart?.handled) {
                e.preventDefault();
                applyThreadTextUpdate(smart.nextText);
                setThreadCursorPos(smart.nextCursor);
                setTimeout(() => {
                  el.focus();
                  el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                }, 0);
                return;
              }
            }
            if (e.key === 'Escape' && replyingToReply) {
              e.preventDefault();
              setReplyingToReply(null);
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
              handleThreadSubmit();
            }
          }}
          placeholder="Trả lời vào luồng... (gõ @MAI để gọi mOS AI, @ để nhắc tên, Shift+Enter xuống dòng)"
          className="w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[13px] resize-none leading-relaxed px-0.5 py-1 min-h-[36px]"
          style={{
            color: token.colorText,
            maxHeight: 140,
            outline: 'none',
            boxShadow: 'none',
          }}
        />
      )}

      {/* Bottom row: Tools on Left, Send on Right */}
      <div
        className="flex items-center justify-between gap-1.5 pt-1 mt-0.5 border-t"
        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex items-center gap-0.5 flex-wrap">
          <Tooltip title="Thanh định dạng gọn gõ nhanh (B, I, U, Màu chữ, Danh sách •)">
            <button
              type="button"
              aria-label="Định dạng chữ Apple Notes trong luồng"
              onClick={() => setFormatBarOpenThread((prev) => !prev)}
              className="w-7 h-7 rounded-lg inline-flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
              style={{
                background: formatBarOpenThread ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                color: formatBarOpenThread ? '#f472b6' : token.colorTextSecondary,
                border: formatBarOpenThread ? '1px solid rgba(236, 72, 153, 0.35)' : 'none',
              }}
            >
              <span className="font-serif font-bold text-[11.5px] leading-none tracking-tight">Aa</span>
              <span
                className="w-3 h-[2px] rounded-full mt-0.5"
                style={{ background: formatBarOpenThread ? '#f472b6' : 'currentColor', opacity: 0.75 }}
              />
            </button>
          </Tooltip>

          <Tooltip title="Mở Bản gọn (Type nhanh) cho luồng phản hồi">
            <button
              type="button"
              aria-label="Mở trình soạn thảo Bản gọn trong luồng"
              onClick={() => {
                setRichEditorModalState({
                  open: true,
                  scope: 'thread',
                  title: 'Soạn thảo phản hồi (CKEditor)',
                  initialMode: 'compact',
                });
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-pink-500/15 active:scale-95 transition-all text-pink-400"
            >
              <Zap size={13} />
            </button>
          </Tooltip>

          <Tooltip title="Mở rộng trình soạn thảo CKEditor cho luồng phản hồi">
            <button
              type="button"
              aria-label="Mở trình soạn thảo phong phú CKEditor trong luồng"
              onClick={() => {
                setRichEditorModalState({
                  open: true,
                  scope: 'thread',
                  title: 'Soạn thảo phản hồi (CKEditor)',
                  initialMode: 'split',
                });
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-amber-500/15 active:scale-95 transition-all text-amber-500"
            >
              <FilePenLine size={14} />
            </button>
          </Tooltip>

          <Tooltip
            title={
              openStickerPopoverKey === 'composer:thread' ? undefined : 'Gửi Sticker động / Meme / Emoji vào luồng'
            }
          >
            <Popover
              trigger="click"
              placement="topRight"
              zIndex={1500}
              destroyOnHidden
              open={openStickerPopoverKey === 'composer:thread'}
              onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:thread' : null)}
              content={renderComposerEmojiPickerContent('thread')}
            >
              <button
                type="button"
                aria-label="Gửi Sticker động hoặc Emoji vào luồng"
                onClick={(e) => {
                  e.stopPropagation();
                  const key = 'composer:thread';
                  setOpenStickerPopoverKey(openStickerPopoverKey === key ? null : key);
                }}
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                style={{ color: token.colorTextSecondary }}
              >
                <SmilePlus size={15} />
              </button>
            </Popover>
          </Tooltip>

          <Tooltip title="Đính kèm tệp tin (PDF, Excel, Word...)">
            <button
              type="button"
              aria-label="Đính kèm tệp tin vào luồng"
              onClick={() => triggerFilePicker('thread')}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
              style={{ color: token.colorTextSecondary }}
            >
              <Paperclip size={15} />
            </button>
          </Tooltip>

          <Tooltip title="Tải hình vào luồng">
            <button
              type="button"
              aria-label="Tải hình vào luồng"
              onClick={() => triggerFilePicker('thread')}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
              style={{ color: token.colorTextSecondary }}
            >
              <ImagePlus size={15} />
            </button>
          </Tooltip>

          <Tooltip title="Đính kèm video vào luồng (MP4, MOV, WebM, M4V tối đa 100MB)">
            <button
              type="button"
              aria-label="Đính kèm video vào luồng"
              onClick={() => triggerFilePicker('thread')}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform text-amber-500 hover:text-amber-400"
            >
              <Film size={15} />
            </button>
          </Tooltip>

          <Tooltip title="Đính kèm hình từ link Google Drive vào luồng">
            <button
              type="button"
              aria-label="Đính kèm hình từ link Google Drive vào luồng"
              onClick={() => {
                if (uploadTargetRef) uploadTargetRef.current = { scope: 'thread' };
                setDriveLinkModalOpen?.(true);
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
              style={{ color: token.colorTextSecondary }}
            >
              <HardDrive size={15} />
            </button>
          </Tooltip>

          <Tooltip title="Đính kèm thẻ Khách hàng / Booking mOS vào luồng">
            <button
              type="button"
              aria-label="Đính kèm thẻ Khách hàng vào luồng"
              onClick={() => handleOpenCustomerPicker?.('thread')}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
              style={{ color: stagedCustomerCard ? '#d4a84b' : token.colorTextSecondary }}
            >
              <UserRoundPlus size={15} />
            </button>
          </Tooltip>

          {canUseAiCopilot && (
            <Tooltip title="Gọi @MAI để mOS AI phân tích & tư vấn trực tiếp vào luồng này">
              <button
                type="button"
                aria-label="Gọi @MAI trong luồng"
                onClick={() => {
                  applyThreadTextUpdate((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                  setTimeout(() => {
                    threadInputRef.current?.focus();
                  }, 20);
                }}
                className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer hover:bg-purple-500/20 active:scale-95 transition-all text-purple-400 hover:text-purple-300 text-[11px] font-black"
              >
                <Bot size={14} />
                <span>@MAI</span>
              </button>
            </Tooltip>
          )}

          <Tooltip title="Nhắc tên đồng nghiệp (@)">
            <button
              type="button"
              aria-label="Nhắc tên đồng nghiệp trong luồng"
              onClick={() => {
                applyThreadTextUpdate((prev) => {
                  const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                  setTimeout(() => {
                    threadInputRef.current?.focus();
                    const len = next.length;
                    threadInputRef.current?.setSelectionRange(len, len);
                    checkForMentionTrigger(next, len, 'thread');
                  }, 20);
                  return next;
                });
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
              style={{ color: token.colorTextSecondary }}
            >
              <AtSign size={15} />
            </button>
          </Tooltip>

          <Tooltip
            title={
              isUrgent
                ? 'Đang bật chế độ khẩn cấp (Buzz) trong luồng: Nhấp để tắt'
                : 'Bật chế độ khẩn cấp (Buzz) trong luồng: Gửi và phát âm thanh cảnh báo @MAI'
            }
          >
            <button
              type="button"
              aria-label="Chế độ khẩn cấp trong luồng"
              onClick={() => setIsUrgent((prev) => !prev)}
              className={`h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all ${
                isUrgent
                  ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                  : 'hover:bg-amber-500/15 text-amber-500/80 border border-amber-500/30'
              }`}
            >
              <Zap size={13} className={isUrgent ? 'animate-bounce' : ''} />
              <span>Khẩn cấp</span>
            </button>
          </Tooltip>

          <Tooltip title="Giao Task & Cài nhắc hẹn mới từ tin nhắn luồng">
            <button
              type="button"
              aria-label="Giao Task & Cài nhắc hẹn mới từ tin nhắn luồng"
              onClick={() => openTaskModalFromMessage?.(activeThreadMessage)}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 hover:bg-amber-500/15 cursor-pointer transition-colors"
              style={{ color: '#d4a84b' }}
            >
              <AlarmClockPlus size={15} />
            </button>
          </Tooltip>

          {isStrictDannySuperAdmin && activeConversation?.id !== AI_COPILOT_CONV_ID && (
            <Tooltip title="⚡ Khởi tạo Quy trình Sống (/tam-ung, /kiem-kho, /tao-quy-trinh) — Chỉ dành cho Super Admin">
              <button
                type="button"
                aria-label="Khởi tạo Quy trình Sống trong luồng"
                onClick={() => {
                  if (setInitialWorkflowCode) setInitialWorkflowCode('WF_CASH_ADVANCE');
                  setTriggerWorkflowModalOpen?.(true);
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

          <Tooltip title="Xuống dòng (Shift+Enter)">
            <button
              type="button"
              aria-label="Xuống dòng trong luồng"
              onClick={() => {
                const el = threadInputRef.current;
                if (!el) return;
                const currentVal = effectiveThreadTextRef.current || el.value || '';
                const isFocused = typeof document !== 'undefined' && document.activeElement === el;
                const start = isFocused ? (el.selectionStart ?? currentVal.length) : currentVal.length;
                const end = isFocused ? (el.selectionEnd ?? currentVal.length) : currentVal.length;
                const smart = handleSmartListEnterKey(currentVal, start, end);
                if (smart?.handled) {
                  applyThreadTextUpdate(smart.nextText);
                  setThreadCursorPos(smart.nextCursor);
                  setTimeout(() => {
                    el.focus();
                    el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                  }, 0);
                } else {
                  const next = currentVal.substring(0, start) + '\n' + currentVal.substring(end);
                  applyThreadTextUpdate(next);
                  setThreadCursorPos(start + 1);
                  setTimeout(() => {
                    el.focus();
                    el.setSelectionRange(start + 1, start + 1);
                  }, 0);
                }
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
              style={{ color: token.colorTextSecondary }}
            >
              <CornerDownLeft size={14} />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] select-none hidden sm:inline" style={{ color: token.colorTextQuaternary }}>
            Enter gửi · Shift+Enter xuống dòng
          </span>
          <Tooltip title={hasPendingUpload ? 'Video đang được tải lên...' : 'Gửi vào luồng (Enter)'}>
            <button
              type="button"
              aria-label="Gửi vào luồng"
              onClick={() => void handleThreadSubmit()}
              disabled={
                (!localThreadHasText && threadAttachments.length === 0 && !stagedCustomerCard) || hasPendingUpload
              }
              className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  (localThreadHasText || threadAttachments.length > 0 || stagedCustomerCard) && !hasPendingUpload
                    ? '#d4a84b'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                color:
                  (localThreadHasText || threadAttachments.length > 0 || stagedCustomerCard) && !hasPendingUpload
                    ? '#000'
                    : token.colorTextQuaternary,
              }}
            >
              <SendHorizontal size={14} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
