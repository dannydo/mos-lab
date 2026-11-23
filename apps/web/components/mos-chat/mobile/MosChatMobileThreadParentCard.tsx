'use client';

import React from 'react';
import { Check, CheckCheck, File, FileText, Forward, MessageSquareReply, Sparkles, Trash2, Users } from 'lucide-react';
import dayjs from 'dayjs';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatThreadReply,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { MosChatAvatar } from '../MosChatAvatar';
import { MosChatRichText } from '../MosChatRichText';
import { MosChatCustomerCardAttachment } from '../components/MosChatCustomerCardAttachment';
import { MosChatGoogleWorkspaceCardList } from '../components/MosChatGoogleWorkspaceCard';
import { MosChatForwardedHeader } from '../components/MosChatForwardedHeader';
import { MosChatVideoPlayer } from '../components/MosChatVideoPlayer';
import { getFileExtension, isImageAttachment, isUserMessageOwner } from '../utils/chat-helpers';
import { isVideoAttachment } from '../utils/chat-video';
import { MosChatMobileThreadParentTaskCard } from './MosChatMobileThreadParentTaskCard';

export interface MosChatMobileThreadParentCardProps {
  activeThreadMsg: MosChatMessage;
  liveThreadMsg: MosChatMessage | null;
  linkedTask: MosChatTaskItem | null;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  isDark: boolean;
  parentSwipeOffset: number;
  showHeartFlyParent: boolean;
  handleTouchStartParent: (e: React.TouchEvent) => void;
  handleTouchMoveParent: (e: React.TouchEvent) => void;
  handleTouchEndParent: () => void;
  isParentFromMe: boolean;
  parentBreakdown: { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersForParent: SafeAny[];
  isParentSeen: boolean;
  openSeenUsersSheetForMessage?: (msg: MosChatMessage) => void;
  onForwardMessage?: (sourceMsg: MosChatMessage, reply?: MosChatThreadReply | null) => void;
  openCustomerDetail?: (customerId: number) => void;
  handleOpenGallery: (targetUrl: string, targetId?: string) => void;
  hasUserReacted: (msg: SafeAny, emoji: string) => boolean;
  reactToMessage: (messageId: string, emoji: string, replyId?: string) => void | Promise<void>;
  openReactionUsersSheet: (target: SafeAny, initialEmoji?: string) => void;
  toggleTaskDone: (taskId: string, done: boolean) => SafeAny;
  updateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => SafeAny;
  onOpenTaskModal?: (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => void;
}

export const MosChatMobileThreadParentCard: React.FC<MosChatMobileThreadParentCardProps> = ({
  activeThreadMsg,
  liveThreadMsg,
  linkedTask,
  activeConversation,
  currentUser,
  staffDirectory,
  isDark,
  parentSwipeOffset,
  showHeartFlyParent,
  handleTouchStartParent,
  handleTouchMoveParent,
  handleTouchEndParent,
  isParentFromMe,
  parentBreakdown,
  stoppedReadersForParent,
  isParentSeen,
  openSeenUsersSheetForMessage,
  onForwardMessage,
  openCustomerDetail,
  handleOpenGallery,
  hasUserReacted,
  reactToMessage,
  openReactionUsersSheet,
  toggleTaskDone,
  updateTask,
  onOpenTaskModal,
}) => {
  const parentVideos = activeThreadMsg.attachments?.filter(isVideoAttachment) || [];
  const parentImages =
    activeThreadMsg.attachments?.filter((att) => isImageAttachment(att) && !isVideoAttachment(att)) || [];
  const parentFiles =
    activeThreadMsg.attachments?.filter((att) => !isImageAttachment(att) && !isVideoAttachment(att)) || [];

  return (
    <div
      onTouchStart={handleTouchStartParent}
      onTouchMove={handleTouchMoveParent}
      onTouchEnd={handleTouchEndParent}
      style={{
        transform: `translateX(${parentSwipeOffset}px)`,
        transition: parentSwipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        touchAction: 'pan-y',
      }}
      data-testid="mos-thread-parent-card"
      className="relative bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer select-none"
    >
      {parentSwipeOffset > 10 && (
        <div
          style={{
            opacity: Math.min(1, parentSwipeOffset / 35),
            transform: `scale(${Math.min(1, 0.5 + parentSwipeOffset / 70)}) translateY(-50%)`,
          }}
          className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
        >
          <MessageSquareReply className="w-4 h-4" />
        </div>
      )}

      {parentSwipeOffset < -10 && (
        <div
          style={{
            opacity: Math.min(1, Math.abs(parentSwipeOffset) / 35),
            transform: `scale(${Math.min(1, 0.5 + Math.abs(parentSwipeOffset) / 70)}) translateY(-50%)`,
          }}
          className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
        >
          <MessageSquareReply className="w-4 h-4" />
        </div>
      )}

      {showHeartFlyParent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
          <span className="text-4xl filter drop-shadow-md">❤️</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-1.5">
        {activeThreadMsg.isAiBot || activeThreadMsg.senderId === 'wings-ai-copilot' ? (
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        ) : (
          <MosChatAvatar
            size="sm"
            src={activeThreadMsg.senderAvatar}
            name={activeThreadMsg.senderName}
            staffId={activeThreadMsg.senderId}
            staffDirectory={staffDirectory}
          />
        )}
        <span className="text-xs font-bold text-[var(--mos-text)]">{activeThreadMsg.senderName}</span>
        {activeThreadMsg.senderRole && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] font-medium uppercase border border-[var(--mos-surface-border)]">
            {activeThreadMsg.senderRole}
          </span>
        )}
        <span className="text-[10px] text-[var(--mos-text-muted)] tabular-nums flex items-center gap-1">
          {activeThreadMsg.editedAt && <span className="italic">đã sửa</span>}
          <span>{dayjs(activeThreadMsg.createdAt).format('HH:mm DD/MM')}</span>
          {isParentFromMe && !activeThreadMsg.isDeleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openSeenUsersSheetForMessage?.(activeThreadMsg);
              }}
              className={`inline-flex items-center gap-0.5 active:scale-90 transition-transform cursor-pointer select-none leading-none ${
                isParentSeen
                  ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                  : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
              }`}
              title={
                isParentSeen
                  ? `Đã xem bởi ${parentBreakdown.seenBy.map((s) => s.displayName).join(', ')} (Nhấn để xem)`
                  : 'Đã gửi · Chưa có người xem'
              }
              aria-label="Xem người đã đọc tin nhắn gốc"
            >
              {isParentSeen ? (
                <CheckCheck className="w-3.5 h-3.5 stroke-[2.3]" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[2.2]" />
              )}
              {parentBreakdown.seenBy.length > 1 && (
                <span className="text-[9.5px] tabular-nums font-bold">{parentBreakdown.seenBy.length}</span>
              )}
            </button>
          )}
        </span>
        {!activeThreadMsg.isDeleted && activeConversation?.id !== 'ai-copilot' && onForwardMessage && (
          <button
            type="button"
            aria-label="Chuyển tiếp luồng thảo luận"
            onClick={(e) => {
              e.stopPropagation();
              onForwardMessage(activeThreadMsg);
            }}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--mos-surface-muted)] text-[var(--mos-accent)] active:scale-95 shrink-0"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Chuyển tiếp</span>
          </button>
        )}
      </div>

      {activeThreadMsg.forwardedFrom && (
        <MosChatForwardedHeader forwardedFrom={activeThreadMsg.forwardedFrom} isDark={isDark} compact={true} />
      )}

      {activeThreadMsg.isDeleted ? (
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] border border-dashed border-[var(--mos-surface-border)] text-xs italic text-[var(--mos-text-muted)] select-none">
          <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
          <span>Tin nhắn gốc đã bị xoá</span>
          {activeThreadMsg.deletedByName && <span className="opacity-75">({activeThreadMsg.deletedByName})</span>}
        </div>
      ) : (
        <div className="text-sm text-[var(--mos-text)] select-text">
          <MosChatRichText
            content={activeThreadMsg.text}
            isMe={
              String(activeThreadMsg.senderId) === String(currentUser?.id) ||
              String(activeThreadMsg.senderName) === String(currentUser?.fullName || currentUser?.name)
            }
            isDark={isDark}
          />
          {activeThreadMsg.text && (
            <MosChatGoogleWorkspaceCardList
              text={activeThreadMsg.text}
              conversationId={activeConversation?.id}
              messageId={activeThreadMsg.id}
              isDark={isDark}
              compact={true}
            />
          )}
        </div>
      )}

      {!activeThreadMsg.isDeleted && activeThreadMsg.customerCard && (
        <MosChatCustomerCardAttachment card={activeThreadMsg.customerCard} onOpenCustomer={openCustomerDetail} />
      )}

      {!activeThreadMsg.isDeleted && activeThreadMsg.attachments && activeThreadMsg.attachments.length > 0 && (
        <div className="mt-2.5 space-y-2">
          {parentVideos.length > 0 && (
            <div className="space-y-2">
              {parentVideos.map((att) => (
                <MosChatVideoPlayer
                  key={att.id}
                  attachment={att}
                  compact={true}
                  isMine={isUserMessageOwner(activeThreadMsg, currentUser)}
                />
              ))}
            </div>
          )}

          {parentImages.length === 1 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleOpenGallery(parentImages[0].url, parentImages[0].id);
              }}
              className="rounded-xl overflow-hidden bg-[var(--mos-surface-muted)] cursor-pointer active:opacity-90 transition-opacity"
            >
              <img
                src={resolveMediaUrl(parentImages[0].url)}
                alt={parentImages[0].name || 'Ảnh đính kèm'}
                className="max-h-60 w-full object-cover rounded-xl"
                loading="lazy"
              />
            </div>
          )}

          {parentImages.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
              {parentImages.slice(0, 4).map((att, idx) => {
                const total = parentImages.length;
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
                      isFirstOfThree ? 'col-span-2 h-36' : 'h-28'
                    }`}
                  >
                    <img
                      src={resolveMediaUrl(att.url)}
                      alt={att.name || `Hình ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isFourthInMany && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-base">
                        +{remaining}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {parentFiles.length > 0 && (
            <div className="space-y-1.5">
              {parentFiles.map((att) => {
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
                    className="flex items-center gap-2 p-2 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isPdf
                          ? `bg-rose-500/20 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                          : `bg-emerald-500/20 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                      }`}
                    >
                      {isPdf ? <FileText size={16} /> : <File size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{att.name}</p>
                      <span className="text-[10px] text-[var(--mos-text-muted)] uppercase font-bold">{ext}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!activeThreadMsg.isDeleted && activeThreadMsg.reactions && Object.keys(activeThreadMsg.reactions).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[var(--mos-surface-border)]">
          {Object.entries(activeThreadMsg.reactions).map(([emoji, count]) => {
            if (count <= 0) return null;
            const isReacted = hasUserReacted(activeThreadMsg, emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void reactToMessage(activeThreadMsg.id, emoji);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openReactionUsersSheet(activeThreadMsg, emoji);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
                  isReacted
                    ? `bg-amber-500/20 border border-amber-500/60 ring-1 ring-amber-500/40 font-semibold ${
                        isDark ? 'text-amber-300' : 'text-amber-800'
                      }`
                    : 'bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] text-[var(--mos-text)]'
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
              openReactionUsersSheet(activeThreadMsg);
            }}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-95 transition-all shadow-sm"
            title="Xem người đã thả cảm xúc"
            aria-label="Xem người thả cảm xúc"
          >
            <Users className="w-3 h-3" />
          </button>
        </div>
      )}

      {!activeThreadMsg.isDeleted && stoppedReadersForParent.length > 0 && (
        <div className="mt-2 pt-1.5 flex items-center gap-1 select-none border-t border-[var(--mos-surface-border)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSeenUsersSheetForMessage?.(activeThreadMsg);
            }}
            className="inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
            title={`Đã xem đến đây: ${stoppedReadersForParent.map((s) => s.displayName).join(', ')}`}
            aria-label="Xem người đã đọc đến tin nhắn gốc này"
          >
            <div className="flex items-center -space-x-1.5">
              {stoppedReadersForParent.slice(0, 4).map((r) => (
                <div
                  key={`mobile-parent-mini-seen-${r.staffId}-${r.displayName}`}
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
              {stoppedReadersForParent.length > 4 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-extrabold bg-[var(--mos-surface-muted)] text-[var(--mos-text)] ring-1.5 ring-[var(--mos-surface)] tabular-nums">
                  +{stoppedReadersForParent.length - 4}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      <MosChatMobileThreadParentTaskCard
        linkedTask={linkedTask}
        liveThreadMsg={liveThreadMsg}
        staffDirectory={staffDirectory}
        isDark={isDark}
        toggleTaskDone={toggleTaskDone}
        updateTask={updateTask}
        onOpenTaskModal={onOpenTaskModal}
      />
    </div>
  );
};
