'use client';

import React from 'react';
import { MessageSquareReply, SmilePlus, Users } from 'lucide-react';
import type { MosChatMessage, MosChatReadReceiptEntry, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { MosChatStickerVisual, parseStickerReactionKey } from '../../mos-chat-stickers';

export interface MobileMessageReactionsBarProps {
  message: MosChatMessage;
  isMe: boolean;
  isDark: boolean;
  hasUserReacted?: (target: SafeAny, emoji: string) => boolean;
  reactToMessage?: (msgId: string, emoji: string, replyId?: string) => Promise<void> | void;
  openReactionUsersSheet?: (target: SafeAny, initialEmoji?: string) => void;
  setSelectedMsgForAction?: (msg: MosChatMessage | null) => void;
}

export const MobileMessageReactionsBar: React.FC<MobileMessageReactionsBarProps> = ({
  message,
  isMe,
  isDark,
  hasUserReacted,
  reactToMessage,
  openReactionUsersSheet,
  setSelectedMsgForAction,
}) => {
  if (message.isDeleted || !message.reactions || Object.keys(message.reactions).length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(message.reactions).map(([emoji, count]) => {
        if (count <= 0) return null;
        const isReacted = hasUserReacted ? hasUserReacted(message, emoji) : false;
        const stickerReaction = parseStickerReactionKey(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => void reactToMessage?.(message.id, emoji)}
            onContextMenu={(e) => {
              e.preventDefault();
              openReactionUsersSheet?.(message, emoji);
            }}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs shadow-sm active:scale-90 transition-all ${
              isReacted
                ? `bg-amber-500/20 border border-amber-500/60 ring-1 ring-amber-500/40 font-semibold ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`
                : 'bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-[var(--mos-text)]'
            }`}
            title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
            aria-label={isReacted ? `Gỡ cảm xúc ${emoji}` : `Thả cảm xúc ${emoji}`}
          >
            {stickerReaction ? (
              <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
            ) : (
              <span>{emoji}</span>
            )}
            <span
              className={`text-[10px] font-semibold tabular-nums ${
                isReacted
                  ? isDark
                    ? 'text-amber-300 font-bold'
                    : 'text-amber-800 font-bold'
                  : 'text-[var(--mos-text-muted)]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}

      {/* Button to view who reacted */}
      <button
        type="button"
        onClick={() => openReactionUsersSheet?.(message)}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
        title="Xem những ai đã thả cảm xúc"
        aria-label="Xem người thả cảm xúc"
      >
        <Users className="w-3 h-3" />
      </button>

      {/* Button to add reaction */}
      <button
        type="button"
        onClick={() => setSelectedMsgForAction?.(message)}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
        aria-label="Thêm biểu cảm"
        title="Thêm biểu cảm"
      >
        <SmilePlus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export interface MobileMessageMiniSeenStackProps {
  message: MosChatMessage;
  stoppedReadersForMsg: MosChatReadReceiptEntry[];
  staffDirectory: MosChatStaffMember[];
  isMe: boolean;
  onOpenSeenUsersSheet?: (msg: MosChatMessage) => void;
}

export const MobileMessageMiniSeenStack: React.FC<MobileMessageMiniSeenStackProps> = ({
  message,
  stoppedReadersForMsg,
  staffDirectory,
  isMe,
  onOpenSeenUsersSheet,
}) => {
  if (message.isDeleted || stoppedReadersForMsg.length === 0) return null;

  return (
    <div className={`mt-1 flex items-center gap-1 select-none px-1 ${isMe ? 'self-end' : 'self-start'}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenSeenUsersSheet?.(message);
        }}
        className="inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
        title={`Đã xem đến đây: ${stoppedReadersForMsg.map((s) => s.displayName).join(', ')}`}
        aria-label="Xem người đã đọc đến tin nhắn này"
      >
        <div className="flex items-center -space-x-1.5">
          {stoppedReadersForMsg.slice(0, 4).map((r) => (
            <div
              key={`mobile-mini-seen-${r.staffId}-${r.displayName}`}
              className="rounded-full ring-1.5 ring-[var(--mos-surface)] shrink-0 overflow-hidden"
            >
              <MosChatAvatar
                size="xs"
                src={r.avatarUrl}
                name={r.displayName}
                staffId={r.staffId}
                staffDirectory={staffDirectory}
              />
            </div>
          ))}
          {stoppedReadersForMsg.length > 4 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-extrabold bg-[var(--mos-surface-muted)] text-[var(--mos-text)] ring-1.5 ring-[var(--mos-surface)] tabular-nums">
              +{stoppedReadersForMsg.length - 4}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};

export interface MobileMessageThreadBadgeProps {
  message: MosChatMessage;
  threadCount: number;
  isMe: boolean;
  isDark: boolean;
  onOpenThread?: (msg: MosChatMessage) => void;
}

export const MobileMessageThreadBadge: React.FC<MobileMessageThreadBadgeProps> = ({
  message,
  threadCount,
  isMe,
  isDark,
  onOpenThread,
}) => {
  if (threadCount <= 0) return null;

  const unreadThreadCount = message.unreadThreadReplyCount || 0;

  return (
    <button
      type="button"
      onClick={() => onOpenThread?.(message)}
      className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border active:scale-95 transition-all ${
        unreadThreadCount > 0
          ? isDark
            ? 'bg-indigo-900/90 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
            : 'bg-indigo-500/15 border-indigo-500 text-indigo-800 shadow-sm'
          : isDark
            ? 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
            : 'bg-indigo-500/10 border-indigo-500/35 text-indigo-700'
      } ${isMe ? 'self-end' : 'self-start'}`}
    >
      <MessageSquareReply
        className={`w-3.5 h-3.5 ${
          isDark ? (unreadThreadCount > 0 ? 'text-indigo-300' : 'text-indigo-400') : 'text-indigo-600'
        }`}
      />
      <span>{threadCount} câu trả lời trong luồng</span>
      {unreadThreadCount > 0 && (
        <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
          +{unreadThreadCount} mới
        </span>
      )}
    </button>
  );
};
