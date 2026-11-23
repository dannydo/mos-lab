'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { MessageSquareReply, Users } from 'lucide-react';
import type { MosChatConversation, MosChatMessage, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { MosChatStickerVisual, parseStickerReactionKey } from '../mos-chat-stickers';
import { formatReactionUsersTooltip } from '../utils/chat-helpers';

export interface MosChatMessageThreadChipProps {
  m: MosChatMessage;
  activeConversation: MosChatConversation | null;
  isMine: boolean;
  isMessageFromCurrentUser: (m: MosChatMessage | SafeAny) => boolean;
  getThreadReplyReadBreakdown: (
    conv: SafeAny,
    rootMsg: SafeAny,
    reply: SafeAny
  ) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderMiniSeenAvatarStack: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  handleOpenThread: (msgId: string) => void;
}

export const MosChatMessageThreadChip: React.FC<MosChatMessageThreadChipProps> = ({
  m,
  activeConversation,
  isMine,
  isMessageFromCurrentUser,
  getThreadReplyReadBreakdown,
  renderReadStatusCheckmark,
  renderMiniSeenAvatarStack,
  handleOpenThread,
}) => {
  if (!m.thread || m.thread.length === 0) return null;

  const visibleThreadReplies = m.thread.filter((r) => !r.deletedAt);
  const lastThreadReply =
    visibleThreadReplies.length > 0 ? visibleThreadReplies[visibleThreadReplies.length - 1] : undefined;
  const unreadReplyCount = m.unreadThreadReplyCount || 0;
  const lastReplyBreakdown = lastThreadReply
    ? getThreadReplyReadBreakdown(activeConversation, m, lastThreadReply)
    : { seenBy: [], unseenBy: [] };
  const isLastReplyMine = lastThreadReply ? isMessageFromCurrentUser(lastThreadReply) : false;

  return (
    <div className={`mt-1.5 flex items-center gap-1.5 flex-wrap ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <Tooltip title="Xem luồng trả lời phụ bên phải (Sub-thread)">
        <button
          type="button"
          onClick={() => handleOpenThread(m.id)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer tabular-nums transition-all hover:brightness-110"
          style={{
            background: unreadReplyCount > 0 ? 'rgba(99, 102, 241, 0.22)' : 'rgba(59, 130, 246, 0.14)',
            border: unreadReplyCount > 0 ? '1px solid rgba(99, 102, 241, 0.55)' : '1px solid rgba(59, 130, 246, 0.3)',
            color: unreadReplyCount > 0 ? '#818cf8' : '#60a5fa',
          }}
        >
          <MessageSquareReply size={13} />
          <span>{visibleThreadReplies.length} trả lời</span>
          {unreadReplyCount > 0 && (
            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold tabular-nums">
              +{unreadReplyCount} mới
            </span>
          )}
        </button>
      </Tooltip>

      {lastThreadReply && (
        <div className="inline-flex items-center gap-1">
          {isLastReplyMine &&
            renderReadStatusCheckmark(lastReplyBreakdown.seenBy, lastReplyBreakdown.unseenBy, {
              compact: true,
              scopeLabel: 'Trạng thái đọc luồng trả lời phụ',
            })}
          {lastReplyBreakdown.seenBy.length > 0 &&
            renderMiniSeenAvatarStack(lastReplyBreakdown.seenBy, lastReplyBreakdown.unseenBy, {
              compact: true,
              align: isMine ? 'right' : 'left',
              scopeLabel: 'Đã xem phản hồi mới nhất trong luồng phụ',
            })}
        </div>
      )}
    </div>
  );
};

export interface MosChatMessageReactionsRowProps {
  m: MosChatMessage;
  staffDirectory: MosChatStaffMember[];
  currentUser: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  colorText: string;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
}

export const MosChatMessageReactionsRow: React.FC<MosChatMessageReactionsRowProps> = ({
  m,
  staffDirectory,
  currentUser,
  surfaceRaised,
  borderColor,
  colorText,
  hasUserReacted,
  handleToggleReaction,
  handleOpenReactionUsers,
}) => {
  return (
    <>
      {m.reactions &&
        Object.entries(m.reactions)
          .filter(([, count]) => count > 0)
          .map(([emoji, count]) => {
            const reactedByMe = hasUserReacted(m, emoji);
            const stickerReaction = parseStickerReactionKey(emoji);
            const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
            const tooltipTitle =
              formatReactionUsersTooltip(m, emoji, staffDirectory, currentUser) ||
              (reactedByMe ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc (Undo)` : `Nhấn để thả cùng ${label}`);
            return (
              <Tooltip key={emoji} title={tooltipTitle}>
                <button
                  type="button"
                  onClick={() => handleToggleReaction(m.id, emoji)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleOpenReactionUsers?.(m, emoji);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                  style={{
                    background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : surfaceRaised,
                    border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                    color: reactedByMe ? '#d4a84b' : colorText,
                  }}
                >
                  {stickerReaction ? (
                    <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                  ) : (
                    <span>{emoji}</span>
                  )}
                  <span>{count}</span>
                </button>
              </Tooltip>
            );
          })}

      {m.reactions && Object.values(m.reactions).some((count) => count > 0) && handleOpenReactionUsers && (
        <Tooltip title="Xem những ai đã thả cảm xúc">
          <button
            type="button"
            onClick={() => handleOpenReactionUsers(m)}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-amber-400 active:scale-95 transition-all cursor-pointer shadow-sm hover:scale-105"
            style={{
              background: surfaceRaised,
              border: `1px solid ${borderColor}`,
            }}
            title="Xem những ai đã thả cảm xúc"
            aria-label="Xem người thả cảm xúc"
          >
            <Users size={11} />
          </button>
        </Tooltip>
      )}
    </>
  );
};
