'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, SendHorizontal, Mic, Smile, X, Loader2, FileText, File, Sparkles, User, Film, Play } from 'lucide-react';
import { message as antdMessage, Avatar } from 'antd';
import type { MosChatImageAttachment, MosChatCustomerCard, SafeAny } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import type { MosChatStickerPackId } from '../mos-chat-stickers';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';
import { handleSmartListEnterKey } from '../MosChatRichEditorModal';
import { syncTextareaHeightSmart } from '../components/MosChatComposer';
import {
  extractMentionedStaff,
  isStaffInConversationMembers,
  isImageAttachment,
  isVideoAttachment,
  formatVideoDuration,
  getFileExtension,
} from '../utils/chat-helpers';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { AI_COPILOT_CONV_ID, AI_QUICK_PROMPTS } from '../constants/chat-constants';
import { MosChatAvatar } from '../MosChatAvatar';
import { cleanQuotedText } from '../utils/quoteUtils';

export interface MosChatMobileComposerProps {
  onOpenActionSheet: () => void;
  onOpenStickerSheet: (pack?: MosChatStickerPackId) => void;
  attachedImages?: MosChatImageAttachment[];
  onRemoveAttachment?: (id: string) => void;
  isUploadingImages?: boolean;
  onSendSuccess?: () => void;
  text?: string;
  onTextChange?: (text: string) => void;
  stagedCustomerCard?: MosChatCustomerCard | null;
  onRemoveCustomerCard?: () => void;
}

export const MosChatMobileComposer: React.FC<MosChatMobileComposerProps> = ({
  onOpenActionSheet,
  onOpenStickerSheet,
  attachedImages = [],
  onRemoveAttachment,
  isUploadingImages = false,
  onSendSuccess,
  text: controlledText,
  onTextChange,
  stagedCustomerCard,
  onRemoveCustomerCard,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    sendMessage,
    replyingToMessage,
    setReplyingToMessage,
    activeConversation,
    staffDirectory,
    openCustomerDetail,
  } = useMosChat();

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

  // Auto-resize textarea height without layout thrashing
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    syncTextareaHeightSmart(el, 120);
  }, [text]);

  const hasAttachments = attachedImages.length > 0;
  const hasCustomerCard = Boolean(stagedCustomerCard);
  const hasSendableContent = Boolean(text.trim() || hasAttachments || hasCustomerCard);

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !hasAttachments && !hasCustomerCard) || isSending || isUploadingImages) return;

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
    const sendText = trimmed || (stagedCustomerCard?.name ? `Đính kèm thẻ khách hàng ${stagedCustomerCard.name}` : '');
    const replyMeta = replyingToMessage
      ? {
          id: replyingToMessage.id,
          senderId: replyingToMessage.senderId,
          senderName: replyingToMessage.senderName,
          senderAvatar: replyingToMessage.senderAvatar,
          text: cleanQuotedText(replyingToMessage.text),
        }
      : undefined;

    const success = await sendMessage(sendText, {
      replyToId: replyingToMessage?.id,
      replyTo: replyMeta,
      attachments: hasAttachments ? attachedImages : undefined,
      customerCard: stagedCustomerCard || undefined,
    });
    setIsSending(false);

    if (success) {
      setText('');
      onRemoveCustomerCard?.();
      onSendSuccess?.();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || (e as SafeAny).keyCode === 229) {
        return;
      }
      // Khi đang gõ danh sách tự động (•, 1., - [ ]), cho phép Enter tiếp tục danh sách
      const el = e.currentTarget;
      const smart = handleSmartListEnterKey(text, el.selectionStart || 0, el.selectionEnd || 0);
      if (smart?.handled) {
        e.preventDefault();
        setText(smart.nextText);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(smart.nextCursor, smart.nextCursor);
        }, 0);
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const isAiChat = activeConversation?.id === AI_COPILOT_CONV_ID;
  const isKeyboardOpen = keyboardOffset > 50;
  const placeholder = isAiChat
    ? 'Hỏi MAI...'
    : replyingToMessage
      ? 'Nhập câu trả lời...'
      : activeConversation?.name
        ? `Nhắn tin #${activeConversation.name}...`
        : 'Nhắn tin...';

  return (
    <div
      style={{
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
        transition: 'transform 0.15s ease-out',
        paddingBottom: isKeyboardOpen ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
      }}
      className="sticky bottom-0 z-30 bg-[var(--mos-surface)] backdrop-blur-md border-t border-[var(--mos-surface-border)] px-3 pt-2 shadow-lg"
    >
      {/* Autocomplete when typing @mention */}
      <MosChatMobileMentionAutocomplete
        text={text}
        onSelectMention={(nextText) => setText(nextText)}
        textareaRef={textareaRef}
      />

      {/* Quoted Message Preview Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-xl px-3 py-1.5 mb-2 text-xs">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="w-1 h-3.5 rounded-full bg-[var(--mos-accent)] shrink-0" />
            <MosChatAvatar
              size="xs"
              src={replyingToMessage.senderAvatar}
              name={replyingToMessage.senderName}
              staffId={replyingToMessage.senderId}
              staffDirectory={staffDirectory}
            />
            <div className="truncate min-w-0">
              <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Trả lời {replyingToMessage.senderName}:
              </span>{' '}
              <span className="text-[var(--mos-text)] truncate">{cleanQuotedText(replyingToMessage.text)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staged Customer Card Preview */}
      {stagedCustomerCard && (
        <div
          data-testid="mos-chat-mobile-staged-customer"
          onClick={() => {
            const cid = stagedCustomerCard.customerId;
            if (cid && openCustomerDetail) {
              openCustomerDetail(cid);
            }
          }}
          className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-between text-xs animate-in fade-in duration-200 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              size={22}
              src={stagedCustomerCard.avatarUrl || undefined}
              className="shrink-0 font-bold text-[10px] border border-amber-400/40 select-none shadow-sm"
              style={{
                backgroundColor: '#d97706',
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
            <span className="font-bold text-[var(--mos-text)] truncate">{stagedCustomerCard.name}</span>
            <span className={`font-medium truncate ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ({stagedCustomerCard.meta})
            </span>
            {stagedCustomerCard.cvName && (
              <span className="text-[var(--mos-text-muted)] truncate hidden sm:inline">
                · {stagedCustomerCard.cvName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCustomerCard?.();
            }}
            className="text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] p-1 rounded-lg hover:bg-[var(--mos-surface-muted)] active:scale-95 transition-all shrink-0"
            title="Bỏ đính kèm thẻ khách hàng"
            aria-label="Bỏ đính kèm thẻ khách hàng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attached Files & Images Preview Strip */}
      {hasAttachments && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
          {attachedImages.map((att, idx) => {
            const isVid = isVideoAttachment(att);
            const isImg = !isVid && isImageAttachment(att);
            const ext = getFileExtension(att.name || att.url);
            const isPdf = ext.toLowerCase() === 'pdf' || att.mimeType === 'application/pdf';

            if (isVid) {
              return (
                <div
                  key={att.id || idx}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-500/50 shrink-0 group bg-[var(--mos-surface-raised)] shadow-sm flex items-center justify-center"
                >
                  {att.posterUrl ? (
                    <img src={att.posterUrl} alt={att.name || 'Video'} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className={`w-full h-full bg-[var(--background)] flex items-center justify-center ${
                        isDark ? 'text-purple-400' : 'text-purple-600'
                      }`}
                    >
                      <Film size={22} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow">
                      <Play size={10} className="fill-white translate-x-0.5" />
                    </div>
                  </div>
                  {att.durationSec ? (
                    <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[9px] text-white font-mono leading-tight">
                      {formatVideoDuration(att.durationSec)}
                    </span>
                  ) : null}
                  {onRemoveAttachment && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(att.id)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                      aria-label={`Xóa video ${idx + 1}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            }

            if (isImg) {
              return (
                <div
                  key={att.id || idx}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 group bg-[var(--mos-surface-raised)] shadow-sm"
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
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                      aria-label={`Xóa ảnh ${idx + 1}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={att.id || idx}
                className="relative h-14 min-w-[120px] max-w-[170px] px-2.5 rounded-xl border border-amber-500/40 shrink-0 flex items-center gap-2 bg-[var(--mos-surface-raised)] shadow-sm"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] ${
                    isPdf
                      ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                      : `bg-emerald-500/20 border border-emerald-500/30 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                  }`}
                >
                  {isPdf ? <FileText size={16} /> : <File size={16} />}
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[11px] font-semibold text-[var(--mos-text)] truncate" title={att.name}>
                    {att.name}
                  </p>
                  <span className="text-[9.5px] text-[var(--mos-text-muted)] uppercase font-extrabold">{ext}</span>
                </div>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                    aria-label={`Xóa tệp ${idx + 1}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          {isUploadingImages && (
            <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center shrink-0">
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className={`text-[9px] mt-0.5 font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Tải...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Uploading Banner when no images are ready yet */}
      {isUploadingImages && !hasAttachments && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs ${
            isDark ? 'text-amber-300' : 'text-amber-800'
          }`}
        >
          <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>Đang tải hình ảnh lên...</span>
        </div>
      )}

      {/* AI Quick Prompts Bar on Mobile */}
      {isAiChat && (
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
          {AI_QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={async () => {
                if (isSending || isUploadingImages) return;
                setIsSending(true);
                await sendMessage(item.prompt);
                setIsSending(false);
                onSendSuccess?.();
              }}
              className={`shrink-0 px-2.5 py-1 text-xs rounded-full border active:scale-95 transition-all shadow-sm flex items-center gap-1 ${
                isDark
                  ? 'bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 border-purple-500/30'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 border-purple-500/30'
              }`}
            >
              <Sparkles className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end gap-2">
        {/* [+] Action Sheet Button */}
        <button
          type="button"
          onClick={onOpenActionSheet}
          className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-text)] active:scale-90 transition-transform shrink-0 mb-0.5"
          aria-label="Tác vụ đính kèm"
        >
          <Plus className="w-5 h-5 text-[var(--mos-accent)]" />
        </button>

        {/* Text Input Box */}
        <div className="flex-1 min-h-[38px] max-h-[120px] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-2xl px-3 py-1.5 flex items-center gap-2 focus-within:border-[var(--mos-accent)] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-sm text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] resize-none max-h-[110px] py-1 leading-snug"
            style={{ outline: 'none', boxShadow: 'none' }}
          />

          {/* Quick Emoji / Sticker Icon */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOpenStickerSheet('emoji')}
            className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform shrink-0"
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
            className="w-9 h-9 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md active:scale-90 transition-transform shrink-0 mb-0.5 disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            {isSending || isUploadingImages ? (
              <Loader2 className="w-4 h-4 text-[var(--mos-accent-contrast)] animate-spin" />
            ) : (
              <SendHorizontal className="w-4 h-4 text-[var(--mos-accent-contrast)] font-bold" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenActionSheet}
            className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-text-muted)] active:scale-90 transition-transform shrink-0 mb-0.5"
            aria-label="Ghi âm giọng nói"
          >
            <Mic className="w-4 h-4 text-[var(--mos-text-muted)]" />
          </button>
        )}
      </div>
    </div>
  );
};
