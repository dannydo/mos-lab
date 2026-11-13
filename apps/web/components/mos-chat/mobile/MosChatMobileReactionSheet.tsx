'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquareReply,
  Copy,
  Pin,
  CheckSquare,
  Trash2,
  Share2,
  X,
  Pencil,
  CornerDownRight,
  Users,
  ChevronRight,
  SmilePlus,
  ArrowLeft,
} from 'lucide-react';
import { message as antdMessage } from 'antd';
import type { MosChatMessage } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import {
  GOOGLE_CHAT_QUICK_EMOJIS,
  WINGS_SIGNATURE_EMOJIS,
  GOOGLE_CHAT_REACTION_EMOJIS,
} from '../constants/chat-constants';
import { isUserMessageOwner, isImageAttachment } from '../utils/chat-helpers';
import { copyImageToClipboard } from '../utils/chat-image-copy';
import { MosChatStickerAndEmojiPicker, formatStickerToken } from '../mos-chat-stickers';
import { useTheme } from '../../../context/ThemeContext';

export interface MosChatMobileReactionSheetProps {
  message: MosChatMessage | null;
  onClose: () => void;
  onOpenThread: (msg: MosChatMessage) => void;
  onCreateTaskFromMsg: (msg: MosChatMessage) => void;
  onEditMessage?: (msg: MosChatMessage) => void;
  onOpenMoveThread?: (msg: MosChatMessage) => void;
}

export const MosChatMobileReactionSheet: React.FC<MosChatMobileReactionSheetProps> = ({
  message,
  onClose,
  onOpenThread,
  onCreateTaskFromMsg,
  onEditMessage,
  onOpenMoveThread,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    reactToMessage,
    hasUserReacted,
    openReactionUsersSheet,
    togglePinMessage,
    deleteMessage,
    setReplyingToMessage,
    currentUser,
  } = useMosChat();
  const [showFullPicker, setShowFullPicker] = useState<boolean>(false);

  useEffect(() => {
    setShowFullPicker(false);
  }, [message?.id]);

  if (!message) return null;

  const totalReactions = Object.values(message.reactions || {}).reduce((sum, count) => sum + count, 0);

  const isMe = isUserMessageOwner(message, currentUser);
  const isDannyAccount =
    String(currentUser?.id) === '1' ||
    String(currentUser?.username || '').toLowerCase() === 'dannydo' ||
    String(currentUser?.role || '')
      .toLowerCase()
      .includes('admin');
  const canEdit = isMe || isDannyAccount;
  const canDelete = isMe || isDannyAccount;

  const handleEmojiClick = (emoji: string) => {
    reactToMessage(message.id, emoji);
    onClose();
  };

  const handleCopy = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message.text);
      antdMessage.success('Đã sao chép nội dung tin nhắn');
    }
    onClose();
  };

  const handleReply = () => {
    setReplyingToMessage(message);
    onClose();
  };

  const handleThread = () => {
    onClose();
    onOpenThread(message);
  };

  const handlePin = () => {
    togglePinMessage(message.id);
    onClose();
  };

  const handleDelete = async () => {
    onClose();
    try {
      await deleteMessage(message.id);
      antdMessage.success('Đã xoá tin nhắn');
    } catch {
      antdMessage.error('Không thể xoá tin nhắn');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}
      />

      {/* Slide-up Sheet */}
      <div className="relative bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border-t border-[var(--mos-surface-border)] rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-3" />

        {showFullPicker ? (
          <div>
            {/* Header with Back & Close */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--mos-surface-border)]">
              <button
                type="button"
                onClick={() => setShowFullPicker(false)}
                className="flex items-center gap-1.5 text-xs text-[var(--mos-accent)] font-semibold active:scale-95 px-2 py-1 rounded-lg hover:bg-[var(--mos-surface-muted)]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
              <span className="text-xs font-bold text-[var(--mos-text)]">Kho biểu cảm & nhãn dán</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] active:scale-95"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Picker Container */}
            <div className="max-h-[58vh] overflow-y-auto">
              <MosChatStickerAndEmojiPicker
                isDark={isDark}
                borderColor="var(--mos-surface-border)"
                surfaceRaised="var(--mos-surface)"
                wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
                popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
                defaultPack="wings"
                width="100%"
                mode="reaction"
                hasUserReacted={(key) => hasUserReacted(message, key)}
                onSelectEmoji={(emoji) => {
                  handleEmojiClick(emoji);
                }}
                onSelectSticker={(sticker) => {
                  handleEmojiClick(formatStickerToken(sticker.id));
                }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Quick Reaction Pills + Full Library Trigger */}
            <div className="flex items-center justify-between gap-1 bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] rounded-2xl py-2 px-3 mb-4 shadow-sm">
              <div className="flex items-center justify-around flex-1">
                {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                  const isReacted = hasUserReacted(message, emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className={`text-2xl p-1.5 rounded-xl active:scale-125 transition-all ${
                        isReacted
                          ? 'bg-[var(--mos-surface-muted)] ring-2 ring-[var(--mos-accent)] shadow-sm'
                          : 'hover:bg-[var(--mos-surface-muted)]'
                      }`}
                      aria-label={isReacted ? `Gỡ cảm xúc ${emoji}` : `Thả cảm xúc ${emoji}`}
                      title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowFullPicker(true)}
                className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-accent)] active:scale-110 transition-transform shadow-sm ml-1 shrink-0"
                aria-label="Mở kho biểu cảm và nhãn dán"
                title="Mở thư viện biểu cảm & icon"
              >
                <SmilePlus className="w-5 h-5" />
              </button>
            </div>

            {/* Actions List */}
            <div className="space-y-1 divide-y divide-[var(--mos-surface-border)]">
              {totalReactions > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openReactionUsersSheet(message);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-[var(--mos-text)] bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98 border border-[var(--mos-surface-border)] mb-1"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-[var(--mos-accent)]" />
                    <span className="font-semibold text-[var(--mos-accent)]">Xem người đã thả cảm xúc</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--mos-text-muted)]">
                    <span className="tabular-nums font-bold text-[var(--mos-accent)]">{totalReactions}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFullPicker(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <SmilePlus className="w-4 h-4 text-[var(--mos-accent)]" />
                <span className="font-medium">Thả biểu cảm khác (Emoji & Nhãn dán)...</span>
              </button>

              <button
                type="button"
                onClick={handleReply}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <MessageSquareReply className="w-4 h-4 text-[var(--mos-accent)]" />
                <span className="font-medium">Trả lời tin nhắn</span>
              </button>

              <button
                type="button"
                onClick={handleThread}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <MessageSquareReply className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span className="font-medium">Thảo luận trong luồng (Thread)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMoveThread?.(message);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <CornerDownRight className="w-4 h-4 text-[var(--mos-accent)]" />
                <span className="font-medium">Gộp tin nhắn vào luồng khác...</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <Copy className="w-4 h-4 text-[var(--mos-text-muted)]" />
                <span className="font-medium">Sao chép văn bản</span>
              </button>

              {message.attachments?.some(isImageAttachment) && (
                <button
                  type="button"
                  onClick={async () => {
                    onClose();
                    const img = message.attachments?.find(isImageAttachment);
                    if (img?.url) {
                      await copyImageToClipboard(img.url);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
                >
                  <Copy className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Sao chép hình ảnh</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePin}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <Pin className={`w-4 h-4 ${message.pinned ? 'text-[var(--mos-accent)] fill-[var(--mos-accent)]' : 'text-[var(--mos-text-muted)]'}`} />
                <span className="font-medium">{message.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateTaskFromMsg(message);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
              >
                <CheckSquare className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className="font-medium">Giao việc từ tin nhắn này</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditMessage?.(message);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] rounded-xl transition-colors active:scale-98"
                >
                  <Pencil className="w-4 h-4 text-[var(--mos-accent)]" />
                  <span className="font-medium">Chỉnh sửa tin nhắn</span>
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-rose-500/10 rounded-xl transition-colors active:scale-98 ${
                    isDark ? 'text-rose-400' : 'text-rose-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium">Xóa tin nhắn</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
