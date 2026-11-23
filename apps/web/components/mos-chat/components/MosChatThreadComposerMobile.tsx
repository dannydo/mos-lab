'use client';

import React from 'react';
import { Popover } from 'antd';
import {
  AlarmClockPlus,
  AtSign,
  FilePenLine,
  HardDrive,
  ImagePlus,
  Plus,
  SendHorizontal,
  SmilePlus,
  UserRoundPlus,
  X,
} from 'lucide-react';
import type { MosChatCustomerCard, MosChatMessage, SafeAny } from '@mos-lab/shared';
import { syncTextareaHeightSmart } from './MosChatComposer';

export interface MosChatThreadComposerMobileProps {
  activeThreadMessage: MosChatMessage;
  token: SafeAny;
  surfaceRaised: string;
  borderStrong: string;
  mobileActionOpen: boolean;
  setMobileActionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formatBarOpenThread: boolean;
  setFormatBarOpenThread: React.Dispatch<React.SetStateAction<boolean>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  localThreadHasText: boolean;
  setLocalThreadHasText: React.Dispatch<React.SetStateAction<boolean>>;
  threadAttachments: SafeAny[];
  stagedCustomerCard?: MosChatCustomerCard | null;
  replyingToReply: { id: string; senderName: string; text: string } | null;
  setReplyingToReply: React.Dispatch<React.SetStateAction<{ id: string; senderName: string; text: string } | null>>;
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
  setRichEditorModalState: (state: SafeAny) => void;
  renderAppleNotesFormatToolbar: (scope: SafeAny, variant?: SafeAny) => React.ReactNode;
  renderComposerEmojiPickerContent: (scope?: SafeAny) => React.ReactNode;
  checkForMentionTrigger: (text: string, cursorPos: number, scope: SafeAny) => void;
  handleMentionKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: SafeAny) => boolean;
  handleApplyFormat: (formatType: SafeAny, scope: SafeAny, extraValue?: string) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
}

export const MosChatThreadComposerMobile: React.FC<MosChatThreadComposerMobileProps> = ({
  activeThreadMessage,
  token,
  surfaceRaised,
  borderStrong,
  mobileActionOpen,
  setMobileActionOpen,
  formatBarOpenThread,
  setFormatBarOpenThread,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  localThreadHasText,
  setLocalThreadHasText,
  threadAttachments,
  stagedCustomerCard,
  replyingToReply,
  setReplyingToReply,
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
  setRichEditorModalState,
  renderAppleNotesFormatToolbar,
  renderComposerEmojiPickerContent,
  checkForMentionTrigger,
  handleMentionKeyDown,
  handleApplyFormat,
  isComposingRef,
  lastCompositionEndMsRef,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {mobileActionOpen && (
        <div
          className="p-3 rounded-2xl grid grid-cols-3 gap-2.5 transition-all shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 mb-1"
          style={{
            background: surfaceRaised,
            border: `1px solid ${borderStrong}`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              triggerFilePicker('thread');
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 overflow-hidden shrink-0">
              <ImagePlus size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Gửi ảnh
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (uploadTargetRef) uploadTargetRef.current = { scope: 'thread' };
              setDriveLinkModalOpen?.(true);
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 overflow-hidden shrink-0">
              <HardDrive size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Drive
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleOpenCustomerPicker?.('thread');
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 overflow-hidden shrink-0">
              <UserRoundPlus size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Thẻ khách
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              openTaskModalFromMessage?.(activeThreadMessage);
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-400/15 text-[#d4a84b] border border-[#d4a84b]/30 overflow-hidden shrink-0">
              <AlarmClockPlus size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Giao việc
            </span>
          </button>

          <button
            type="button"
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
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/20 overflow-hidden shrink-0">
              <AtSign size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Nhắc tên
            </span>
          </button>

          {canUseAiCopilot && (
            <button
              type="button"
              onClick={() => {
                applyThreadTextUpdate((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                setMobileActionOpen(false);
                threadInputRef.current?.focus();
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/30 overflow-hidden shrink-0 font-black text-[11px]">
                MAI
              </div>
              <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
                Gọi @MAI
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRichEditorModalState({
                open: true,
                scope: 'thread',
                title: 'Soạn thảo phản hồi (CKEditor)',
              });
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30 overflow-hidden shrink-0">
              <FilePenLine size={16} />
            </div>
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              CKEditor
            </span>
          </button>
        </div>
      )}

      {formatBarOpenThread && renderAppleNotesFormatToolbar('thread', 'inline')}

      <div className="flex items-center gap-1.5">
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

        <button
          type="button"
          aria-label="Định dạng chữ Apple Notes trong luồng"
          onClick={() => setFormatBarOpenThread((prev) => !prev)}
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
          style={{
            background: formatBarOpenThread ? '#d4a84b' : surfaceRaised,
            border: `1px solid ${formatBarOpenThread ? '#d4a84b' : borderStrong}`,
            color: formatBarOpenThread ? '#000' : token.colorTextSecondary,
          }}
        >
          <span className="font-serif font-bold text-[13px] tracking-tight">Aa</span>
        </button>

        <div
          className="relative flex-1 min-h-[38px] max-h-[120px] rounded-2xl px-3 py-1 flex items-center gap-1.5"
          style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
        >
          <textarea
            ref={threadInputRef}
            rows={1}
            defaultValue={effectiveThreadTextRef.current}
            onChange={(e) => {
              const next = e.target.value;
              effectiveThreadTextRef.current = next;
              const nextHas = Boolean(next.trim());
              setLocalThreadHasText((old) => (old === nextHas ? old : nextHas));
              syncTextareaHeightSmart(e.target, 120, 36);
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
            placeholder="Trả lời vào luồng..."
            className="w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[13px] resize-none leading-relaxed px-0.5 py-1 min-h-[36px]"
            style={{ color: token.colorText, maxHeight: 120, outline: 'none', boxShadow: 'none' }}
          />

          <Popover
            trigger="click"
            placement="topRight"
            zIndex={1500}
            open={openStickerPopoverKey === 'composer:thread'}
            onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:thread' : null)}
            content={openStickerPopoverKey === 'composer:thread' ? renderComposerEmojiPickerContent('thread') : null}
          >
            <button
              type="button"
              aria-label="Chọn biểu tượng cảm xúc vào luồng"
              onClick={(e) => {
                e.stopPropagation();
                const key = 'composer:thread';
                setOpenStickerPopoverKey(openStickerPopoverKey === key ? null : key);
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              <SmilePlus size={16} />
            </button>
          </Popover>
        </div>

        <button
          type="button"
          aria-label="Gửi phản hồi vào luồng"
          onClick={() => void handleThreadSubmit()}
          disabled={!localThreadHasText && threadAttachments.length === 0 && !stagedCustomerCard}
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
          style={{
            background:
              localThreadHasText || threadAttachments.length > 0 || stagedCustomerCard ? '#d4a84b' : surfaceRaised,
            color:
              localThreadHasText || threadAttachments.length > 0 || stagedCustomerCard
                ? '#000'
                : token.colorTextQuaternary,
            border: `1px solid ${borderStrong}`,
          }}
        >
          <SendHorizontal size={15} />
        </button>
      </div>
    </div>
  );
};
