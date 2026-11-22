'use client';

import React from 'react';
import { Popover } from 'antd';
import type { GlobalToken } from 'antd';
import {
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
  CornerDownLeft,
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

export interface MosChatComposerMobileProps {
  token: GlobalToken;
  activeConversation: MosChatConversation | null;
  canUseAiCopilot: boolean;
  surfaceRaised: string;
  borderStrong: string;
  mobileActionOpen: boolean;
  setMobileActionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formatBarOpenMain: boolean;
  setFormatBarOpenMain: React.Dispatch<React.SetStateAction<boolean>>;
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
  stagedCustomerCard?: MosChatCustomerCard | null;
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
  setDriveLinkModalOpen: (open: boolean) => void;
  uploadTargetRef: React.MutableRefObject<SafeAny>;
  setRichEditorModalState: (state: SafeAny) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
}

export const MosChatComposerMobile: React.FC<MosChatComposerMobileProps> = ({
  token,
  activeConversation,
  canUseAiCopilot,
  surfaceRaised,
  borderStrong,
  mobileActionOpen,
  setMobileActionOpen,
  formatBarOpenMain,
  setFormatBarOpenMain,
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
  stagedCustomerCard,
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
  setDriveLinkModalOpen,
  uploadTargetRef,
  setRichEditorModalState,
  isComposingRef,
  lastCompositionEndMsRef,
}) => {
  return (
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
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
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
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
              Drive
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (handleOpenCustomerPicker) {
                handleOpenCustomerPicker();
              } else if (handleSendQuickCustomerCard) {
                handleSendQuickCustomerCard();
              }
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
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
              openTaskModalFromMessage(null);
              setMobileActionOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
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
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
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
              <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
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
            <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: token.colorText }}>
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
            defaultValue={composerTextRef.current}
            onChange={(e) => {
              const val = e.target.value;
              const nextHasText = val.trim().length > 0;
              if (nextHasText !== localHasText) {
                setLocalHasText(nextHasText);
              }
              updateComposerText(val);
              syncTextareaHeightSmart(e.target, 120, prevLenRef, 42);
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
                if (smart?.handled) {
                  e.preventDefault();
                  updateComposerText(smart.nextText);
                  setComposerCursorPos(smart.nextCursor);
                  setTimeout(() => {
                    el.focus();
                    el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                  }, 0);
                  return;
                }
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
                // Khi đang trong danh sách tự động (•, 1., - [ ]), cho phép Enter tiếp tục danh sách
                const el = e.currentTarget;
                const currentText = el.value;
                const smart = handleSmartListEnterKey(
                  currentText,
                  el.selectionStart ?? currentText.length,
                  el.selectionEnd ?? currentText.length
                );
                if (smart?.handled) {
                  e.preventDefault();
                  updateComposerText(smart.nextText);
                  setComposerCursorPos(smart.nextCursor);
                  setTimeout(() => {
                    el.focus();
                    el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                  }, 0);
                  return;
                }
                e.preventDefault();
                handleSendMain();
              }
            }}
            placeholder="Nhắn tin... (Shift+Enter để xuống dòng)"
            className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[13.5px] resize-none leading-relaxed py-1"
            style={{ color: token.colorText, maxHeight: 110, outline: 'none', boxShadow: 'none' }}
          />

          {/* Quick Xuống dòng (Shift+Enter) button on mobile */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const el = composerInputRef.current;
              if (!el) return;
              const currentText = el.value;
              const isFocused = typeof document !== 'undefined' && document.activeElement === el;
              const start = isFocused ? (el.selectionStart ?? currentText.length) : currentText.length;
              const end = isFocused ? (el.selectionEnd ?? currentText.length) : currentText.length;
              const smart = handleSmartListEnterKey(currentText, start, end);
              if (smart?.handled) {
                updateComposerText(smart.nextText);
                setComposerCursorPos(smart.nextCursor);
                setTimeout(() => {
                  el.focus();
                  el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                }, 0);
              } else {
                const next = currentText.substring(0, start) + '\n' + currentText.substring(end);
                updateComposerText(next);
                setComposerCursorPos(start + 1);
                setTimeout(() => {
                  el.focus();
                  el.setSelectionRange(start + 1, start + 1);
                }, 0);
              }
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/10 active:scale-95"
            style={{ color: token.colorTextSecondary }}
            aria-label="Xuống dòng (Shift+Enter)"
            title="Xuống dòng (Shift+Enter)"
          >
            <CornerDownLeft size={14} />
          </button>

          <Popover
            trigger="click"
            placement="topRight"
            open={openStickerPopoverKey === 'composer:main:mobile'}
            onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:mobile' : null)}
            content={openStickerPopoverKey === 'composer:main:mobile' ? renderComposerEmojiPickerContent('main') : null}
          >
            <button
              type="button"
              aria-label="Chèn biểu tượng cảm xúc Wings"
              onClick={(e) => {
                e.stopPropagation();
                const key = 'composer:main:mobile';
                setOpenStickerPopoverKey((prev) => (prev === key ? null : key));
              }}
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
            background:
              effectiveHasText || stagedAttachments.length > 0 || stagedCustomerCard ? '#d4a84b' : surfaceRaised,
            border: `1px solid ${effectiveHasText || stagedAttachments.length > 0 || stagedCustomerCard ? '#d4a84b' : borderStrong}`,
            color:
              effectiveHasText || stagedAttachments.length > 0 || stagedCustomerCard
                ? '#000'
                : token.colorTextSecondary,
          }}
        >
          <SendHorizontal size={14} />
        </button>
      </div>
    </div>
  );
};
