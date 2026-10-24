'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, SendHorizontal, Mic, Smile, X, ImagePlus, Loader2 } from 'lucide-react';
import { message as antdMessage } from 'antd';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatStickerPackId } from '../mos-chat-stickers';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';
import { extractMentionedStaff, isStaffInConversationMembers } from '../utils/chat-helpers';
import { resolveMediaUrl } from '../../../lib/api-base-url';

export interface MosChatMobileComposerProps {
  onOpenActionSheet: () => void;
  onOpenStickerSheet: (pack?: MosChatStickerPackId) => void;
  onSelectImage?: () => void;
  attachedImages?: MosChatImageAttachment[];
  onRemoveAttachment?: (id: string) => void;
  isUploadingImages?: boolean;
  onSendSuccess?: () => void;
  text?: string;
  onTextChange?: (text: string) => void;
}

export const MosChatMobileComposer: React.FC<MosChatMobileComposerProps> = ({
  onOpenActionSheet,
  onOpenStickerSheet,
  onSelectImage,
  attachedImages = [],
  onRemoveAttachment,
  isUploadingImages = false,
  onSendSuccess,
  text: controlledText,
  onTextChange,
}) => {
  const { sendMessage, replyingToMessage, setReplyingToMessage, activeConversation, staffDirectory } = useMosChat();

  const [internalText, setInternalText] = useState<string>('');
  const text = controlledText !== undefined ? controlledText : internalText;
  const setText = (val: string | ((prev: string) => string)) => {
    const nextVal = typeof val === 'function' ? val(text) : val;
    if (onTextChange) {
      onTextChange(nextVal);
    } else {
      setInternalText(nextVal);
    }
  };

  const [isSending, setIsSending] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // iOS Safari Virtual Keyboard listener using visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Auto-focus when replying to a message
  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, el.scrollHeight)}px`;
  }, [text]);

  const hasAttachments = attachedImages.length > 0;
  const hasSendableContent = Boolean(text.trim() || hasAttachments);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !hasAttachments) || isSending || isUploadingImages) return;

    // Chỉ cho phép tag thành viên trong nhóm. Nếu có người ngoài nhóm, cảnh báo mời vào nhóm trước
    if (trimmed && activeConversation?.type?.toLowerCase() === 'space') {
      const mentionedStaff = extractMentionedStaff(trimmed, staffDirectory || [], {
        nicknames: activeConversation.memberNicknames,
      });

      const nonMemberMentions = mentionedStaff.filter(
        (s) => !isStaffInConversationMembers(s, activeConversation, staffDirectory)
      );

      if (nonMemberMentions.length > 0) {
        const names = nonMemberMentions.map((s) => s.displayName || s.username).join(', ');
        antdMessage.warning(
          `Đồng nghiệp ${names} chưa tham gia nhóm này. Bạn hãy mời vào nhóm trước khi nhắc tên nhé!`
        );
        return;
      }
    }

    setIsSending(true);
    const success = await sendMessage(trimmed, {
      replyToId: replyingToMessage?.id,
      attachments: hasAttachments ? attachedImages : undefined,
    });
    setIsSending(false);

    if (success) {
      setText('');
      onSendSuccess?.();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isKeyboardOpen = keyboardOffset > 50;
  const placeholder = activeConversation?.name ? `Nhắn tin trong #${activeConversation.name}...` : 'Nhập tin nhắn...';

  return (
    <div
      style={{
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
        transition: 'transform 0.15s ease-out',
        paddingBottom: isKeyboardOpen ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
      }}
      className="sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-3 pt-2 shadow-lg"
    >
      {/* Autocomplete when typing @mention */}
      <MosChatMobileMentionAutocomplete
        text={text}
        onSelectMention={(nextText) => setText(nextText)}
        textareaRef={textareaRef}
      />

      {/* Quoted Message Preview Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 mb-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1 h-3.5 rounded-full bg-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-amber-300">Trả lời {replyingToMessage.senderName}:</span>{' '}
              <span className="text-slate-300 truncate">{replyingToMessage.text}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attached Images Preview Strip */}
      {hasAttachments && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
          {attachedImages.map((att, idx) => (
            <div
              key={att.id || idx}
              className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 group bg-slate-800 shadow-sm"
            >
              <img
                src={resolveMediaUrl(att.url)}
                alt={att.name || 'Ảnh đính kèm'}
                className="w-full h-full object-cover"
              />
              {onRemoveAttachment && (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900/90 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                  aria-label={`Xóa ảnh ${idx + 1}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          {isUploadingImages && (
            <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-[9px] text-amber-300 mt-0.5 font-medium">Tải...</span>
            </div>
          )}
        </div>
      )}

      {/* Uploading Banner when no images are ready yet */}
      {isUploadingImages && !hasAttachments && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
          <span>Đang tải hình ảnh lên...</span>
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end gap-2">
        {/* [+] Action Sheet Button */}
        <button
          type="button"
          onClick={onOpenActionSheet}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-90 transition-transform shrink-0 mb-0.5"
          aria-label="Tác vụ đính kèm"
        >
          <Plus className="w-5 h-5 text-amber-400" />
        </button>

        {/* Quick Image Picker Button */}
        {onSelectImage && (
          <button
            type="button"
            onClick={onSelectImage}
            disabled={isUploadingImages}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Chọn nhiều hình ảnh"
            title="Chọn nhiều hình ảnh"
          >
            <ImagePlus className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Text Input Box */}
        <div className="flex-1 min-h-[38px] max-h-[120px] bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center gap-2 focus-within:border-amber-400/80 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 resize-none max-h-[110px] py-1 leading-snug"
          />

          {/* Quick Emoji / Sticker Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOpenStickerSheet('emoji')}
            className="p-1 text-slate-400 hover:text-amber-400 active:scale-90 transition-transform shrink-0"
            aria-label="Biểu cảm Emoji & Nhãn dán"
            title="Biểu cảm Emoji & Nhãn dán"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Send / Mic Button */}
        {hasSendableContent ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || isUploadingImages}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            {isSending || isUploadingImages ? (
              <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
            ) : (
              <SendHorizontal className="w-4 h-4 text-slate-950 font-bold" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenActionSheet}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-90 transition-transform shrink-0 mb-0.5"
            aria-label="Ghi âm giọng nói"
          >
            <Mic className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};
