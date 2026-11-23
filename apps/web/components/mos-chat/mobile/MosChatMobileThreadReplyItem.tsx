'use client';

import React from 'react';
import { Check, CheckCheck, File, FileText, MessageSquareReply, Sparkles, Trash2, Users } from 'lucide-react';
import dayjs from 'dayjs';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatRichText } from '../MosChatRichText';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { MosChatGoogleWorkspaceCardList } from '../components/MosChatGoogleWorkspaceCard';
import { MosChatVideoPlayer } from '../components/MosChatVideoPlayer';
import { getFileExtension, isImageAttachment } from '../utils/chat-helpers';
import { isVideoAttachment } from '../utils/chat-video';

export interface MosChatMobileThreadReplyItemProps {
  reply: MosChatThreadReply;
  activeThreadMsg: MosChatMessage;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  isDark: boolean;
  replyOffset: number;
  showHeartFly: boolean;
  replyBreakdown: { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersForReply: SafeAny[];
  handleTouchStartReply: (e: React.TouchEvent, reply: MosChatThreadReply) => void;
  handleTouchMoveReply: (e: React.TouchEvent, replyId: string) => void;
  handleTouchEndReply: (reply: MosChatThreadReply) => void;
  setActionSheetReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  handleOpenGallery: (targetUrl: string, targetId?: string) => void;
  openCustomerDetail?: (customerId: number) => void;
  openSeenUsersSheetForReply?: (msg: MosChatMessage, reply: MosChatThreadReply) => void;
  hasUserReacted: (msg: SafeAny, emoji: string) => boolean;
  reactToMessage: (messageId: string, emoji: string, replyId?: string) => void | Promise<void>;
  openReactionUsersSheet: (target: SafeAny, initialEmoji?: string) => void;
}

export const MosChatMobileThreadReplyItem: React.FC<MosChatMobileThreadReplyItemProps> = React.memo(
  ({
    reply,
    activeThreadMsg,
    activeConversation,
    currentUser,
    staffDirectory,
    isDark,
    replyOffset,
    showHeartFly,
    replyBreakdown,
    stoppedReadersForReply,
    handleTouchStartReply,
    handleTouchMoveReply,
    handleTouchEndReply,
    setActionSheetReply,
    handleOpenGallery,
    openCustomerDetail,
    openSeenUsersSheetForReply,
    hasUserReacted,
    reactToMessage,
    openReactionUsersSheet,
  }) => {
    const isMe =
      String(reply.senderId) === String(currentUser?.id) ||
      String(reply.senderName) === String(currentUser?.fullName || currentUser?.name);
    const isReplySeen = replyBreakdown.seenBy.length > 0;

    const replyVideos = reply.attachments?.filter(isVideoAttachment) || [];
    const replyImages = reply.attachments?.filter((att) => isImageAttachment(att) && !isVideoAttachment(att)) || [];
    const replyFiles = reply.attachments?.filter((att) => !isImageAttachment(att) && !isVideoAttachment(att)) || [];

    return (
      <div
        id={`thread-reply-${reply.id}`}
        data-reply-id={reply.id}
        onTouchStart={(e) => handleTouchStartReply(e, reply)}
        onTouchMove={(e) => handleTouchMoveReply(e, reply.id)}
        onTouchEnd={() => handleTouchEndReply(reply)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (reply.isDeleted) return;
          setActionSheetReply(reply);
        }}
        style={{
          transform: `translateX(${replyOffset}px)`,
          transition: replyOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        className={`relative flex flex-col my-1 select-none ${isMe ? 'items-end' : 'items-start'}`}
      >
        {replyOffset > 10 && (
          <div
            style={{
              opacity: Math.min(1, replyOffset / 35),
              transform: `scale(${Math.min(1, 0.5 + replyOffset / 70)}) translateY(-50%)`,
            }}
            className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {replyOffset < -10 && (
          <div
            style={{
              opacity: Math.min(1, Math.abs(replyOffset) / 35),
              transform: `scale(${Math.min(1, 0.5 + Math.abs(replyOffset) / 70)}) translateY(-50%)`,
            }}
            className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {showHeartFly && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
            <span className="text-3xl filter drop-shadow-md">❤️</span>
          </div>
        )}

        {!reply.isDeleted && (
          <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            {reply.isAiBot || reply.senderId === 'wings-ai-copilot' ? (
              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles className="w-3 h-3" />
              </div>
            ) : reply.senderId === 'mos-mission-bot' ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500/30 to-indigo-500/30 border border-amber-500/50 flex items-center justify-center text-[10px] shadow-sm shrink-0">
                🚀
              </div>
            ) : (
              <MosChatAvatar
                size="xs"
                src={reply.senderAvatar}
                name={reply.senderName}
                staffId={reply.senderId}
                staffDirectory={staffDirectory}
              />
            )}
            <span
              className={`text-[11px] font-semibold ${
                reply.isAiBot || reply.senderId === 'wings-ai-copilot'
                  ? isDark
                    ? 'text-purple-300'
                    : 'text-purple-700'
                  : isMe
                    ? isDark
                      ? 'text-amber-300'
                      : 'text-amber-700'
                    : 'text-[var(--mos-text)]'
              }`}
            >
              {reply.senderName}
            </span>
            {reply.senderRole && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)]">
                {reply.senderRole}
              </span>
            )}
          </div>
        )}

        {reply.isDeleted ? (
          <div
            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic break-words flex items-center gap-2 select-none ${
              isMe
                ? `bg-amber-500/10 border border-dashed border-amber-500/30 rounded-tr-sm self-end ${
                    isDark ? 'text-amber-300/80' : 'text-amber-800/80'
                  }`
                : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-dashed border-[var(--mos-surface-border)] rounded-tl-sm self-start'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span>Phản hồi này đã bị xoá</span>
            {reply.deletedByName && <span className="opacity-75">({reply.deletedByName})</span>}
          </div>
        ) : (
          <div
            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
              isMe
                ? `bg-[var(--mos-accent-soft)] text-[var(--mos-text)] border border-[var(--mos-accent-border)] font-normal rounded-tr-sm ${
                    isDark ? 'shadow-amber-500/5' : 'shadow-amber-900/5'
                  }`
                : 'bg-[var(--mos-surface)] text-[var(--mos-text)] border border-[var(--mos-surface-border)] rounded-tl-sm'
            }`}
          >
            {reply.attachments && reply.attachments.length > 0 && (
              <div className="mb-1.5 space-y-1.5">
                {replyVideos.length > 0 && (
                  <div className="space-y-1.5">
                    {replyVideos.map((att) => (
                      <MosChatVideoPlayer key={att.id} attachment={att} compact={true} isMine={isMe} />
                    ))}
                  </div>
                )}

                {replyImages.length === 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenGallery(replyImages[0].url, replyImages[0].id);
                    }}
                    className="rounded-xl overflow-hidden bg-black/15 cursor-pointer active:opacity-90 transition-opacity"
                  >
                    <img
                      src={resolveMediaUrl(replyImages[0].url)}
                      alt={replyImages[0].name || 'Ảnh đính kèm'}
                      className="max-h-56 w-full object-cover"
                    />
                  </div>
                )}
                {replyImages.length > 1 && (
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                    {replyImages.slice(0, 4).map((att, idx) => {
                      const total = replyImages.length;
                      const isFirstOfThree = total === 3 && idx === 0;
                      const isFourthInMany = total > 4 && idx === 3;
                      const remaining = total - 3;

                      return (
                        <div
                          key={att.id || idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGallery(att.url, att.id);
                          }}
                          className={`relative overflow-hidden cursor-pointer active:opacity-90 transition-opacity rounded-lg ${
                            isFirstOfThree ? 'col-span-2 h-36' : 'h-24'
                          }`}
                        >
                          <img
                            src={resolveMediaUrl(att.url)}
                            alt={att.name || `Hình ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isFourthInMany && (
                            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm">
                              +{remaining}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {replyFiles.length > 0 && (
                  <div className="space-y-1">
                    {replyFiles.map((att) => {
                      const fullUrl = resolveMediaUrl(att.url);
                      const ext = getFileExtension(att.name || att.url).toLowerCase();
                      const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
                      return (
                        <div
                          key={att.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(fullUrl, '_blank');
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform ${
                            isMe
                              ? isDark
                                ? 'bg-black/25 border-amber-400/30 text-[var(--mos-text)]'
                                : 'bg-black/5 border-amber-600/30 text-[var(--mos-text)]'
                              : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded flex items-center justify-center shrink-0 font-bold text-[10px] ${
                              isPdf
                                ? `bg-rose-500/20 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                                : `bg-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                            }`}
                          >
                            {isPdf ? <FileText size={14} /> : <File size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold truncate leading-tight">{att.name}</p>
                            <span className="text-[9px] opacity-75 uppercase font-bold">{ext}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="select-text">
              <MosChatRichText content={reply.text} isMe={isMe} isDark={isDark} />
              {reply.text && (
                <MosChatGoogleWorkspaceCardList
                  text={reply.text}
                  conversationId={activeConversation?.id}
                  messageId={reply.id}
                  isDark={isDark}
                  isMe={isMe}
                  compact={true}
                />
              )}
            </div>

            {!reply.isDeleted && reply.customerCard && (
              <MosChatCustomerCardAttachment
                card={reply.customerCard}
                isMe={isMe}
                onOpenCustomer={openCustomerDetail}
              />
            )}

            <div
              className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
                isMe ? (isDark ? 'text-amber-300/80' : 'text-amber-800/80') : 'text-[var(--mos-text-muted)]'
              }`}
            >
              {reply.editedAt && <span className="italic mr-0.5">đã sửa</span>}
              <span>{dayjs(reply.createdAt).format('HH:mm')}</span>
              {isMe && !reply.isDeleted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeThreadMsg && openSeenUsersSheetForReply) {
                      openSeenUsersSheetForReply(activeThreadMsg, reply);
                    }
                  }}
                  className={`inline-flex items-center gap-0.5 active:scale-90 transition-transform cursor-pointer select-none leading-none ${
                    isReplySeen
                      ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                      : isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                  }`}
                  title={
                    isReplySeen
                      ? `Đã xem bởi ${replyBreakdown.seenBy.map((s) => s.displayName).join(', ')} (Nhấn để xem)`
                      : 'Đã gửi · Chưa có người xem'
                  }
                  aria-label="Xem người đã đọc phản hồi này"
                >
                  {isReplySeen ? (
                    <CheckCheck className="w-3.5 h-3.5 stroke-[2.3]" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  )}
                  {replyBreakdown.seenBy.length > 1 && (
                    <span className="text-[9.5px] tabular-nums font-bold">{replyBreakdown.seenBy.length}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {!reply.isDeleted && reply.reactions && Object.keys(reply.reactions).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1">
            {Object.entries(reply.reactions).map(([emoji, count]) => {
              if (count <= 0) return null;
              const isReacted = hasUserReacted(reply, emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void reactToMessage(activeThreadMsg.id, emoji, reply.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openReactionUsersSheet(
                      {
                        messageId: activeThreadMsg.id,
                        replyId: reply.id,
                        reactions: reply.reactions,
                        reactionUsers: reply.reactionUsers,
                      },
                      emoji
                    );
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
                    isReacted
                      ? `bg-amber-500/20 border border-amber-500/60 ring-1 ring-amber-500/40 font-semibold ${
                          isDark ? 'text-amber-300' : 'text-amber-800'
                        }`
                      : 'bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)]'
                  }`}
                  title={isReacted ? `Đã thả ${emoji} (Nhấn để gỡ / huỷ react)` : `Thả ${emoji}`}
                >
                  <span>{emoji}</span>
                  <span
                    className={`tabular-nums text-[11px] font-semibold ${isReacted ? (isDark ? 'text-amber-400' : 'text-amber-700') : 'text-[var(--mos-text-muted)]'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openReactionUsersSheet({
                  messageId: activeThreadMsg.id,
                  replyId: reply.id,
                  reactions: reply.reactions,
                  reactionUsers: reply.reactionUsers,
                });
              }}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface)] hover:bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
              title="Xem người đã thả cảm xúc"
              aria-label="Xem người thả cảm xúc"
            >
              <Users className="w-3 h-3" />
            </button>
          </div>
        )}

        {!reply.isDeleted && stoppedReadersForReply.length > 0 && (
          <div className={`mt-1 flex items-center gap-1 select-none px-1 ${isMe ? 'self-end' : 'self-start'}`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activeThreadMsg && openSeenUsersSheetForReply) {
                  openSeenUsersSheetForReply(activeThreadMsg, reply);
                }
              }}
              className="inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
              title={`Đã xem đến đây: ${stoppedReadersForReply.map((s) => s.displayName).join(', ')}`}
              aria-label="Xem người đã đọc đến phản hồi này"
            >
              <div className="flex items-center -space-x-1.5">
                {stoppedReadersForReply.slice(0, 4).map((r) => (
                  <div
                    key={`mobile-reply-mini-seen-${reply.id}-${r.staffId}-${r.displayName}`}
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
                {stoppedReadersForReply.length > 4 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-extrabold bg-[var(--mos-surface-muted)] text-[var(--mos-text)] ring-1.5 ring-[var(--mos-surface)] tabular-nums">
                    +{stoppedReadersForReply.length - 4}
                  </span>
                )}
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }
);

MosChatMobileThreadReplyItem.displayName = 'MosChatMobileThreadReplyItem';
