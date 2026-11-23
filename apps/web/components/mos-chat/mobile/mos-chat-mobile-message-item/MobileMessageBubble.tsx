'use client';

import React from 'react';
import { Check, CheckCheck, Pin, Trash2 } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionActionType,
  MosChatMissionSummary,
  MosChatQuotedMessage,
  MosChatReadReceiptEntry,
  MosChatStaffMember,
  SafeAny,
} from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { MosChatRichText } from '../../MosChatRichText';
import { MosChatCustomerCardAttachment } from '../../components/MosChatCustomerCardAttachment';
import { MosChatForwardedHeader } from '../../components/MosChatForwardedHeader';
import { MosChatGoogleWorkspaceCardList } from '../../components/MosChatGoogleWorkspaceCard';
import { jumpToForwardedSource, scrollToMessageElement } from './mobileMessageItemHelpers';
import { MobileInlineMissionCard } from './MobileInlineMissionCard';
import { MobileMessageAttachments } from './MobileMessageAttachments';
import { MobileMessageAiActionsAndVoice, MobileMessageAiReasoning } from './MobileMessageAiExtras';

export interface MobileMessageBubbleProps {
  message: MosChatMessage;
  quotedMessage: MosChatMessage | MosChatQuotedMessage | null | undefined;
  isMe: boolean;
  isAiBot: boolean;
  isDark: boolean;
  timeFormatted: string;
  isSeen: boolean;
  seenBy: MosChatReadReceiptEntry[];
  staffDirectory: MosChatStaffMember[];
  conversations?: MosChatConversation[];
  activeConversationId?: string;
  setActiveConvId?: (id: string) => void;
  openCustomerDetail?: (customerId: number) => void;
  onOpenCustomer?: (customerId: number) => void;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
  openSeenUsersSheetForMessage?: (msg: MosChatMessage) => void;
  currentUser?: SafeAny;
  executeMissionAction?: (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => Promise<SafeAny>;
}

export const MobileMessageBubble: React.FC<MobileMessageBubbleProps> = ({
  message,
  quotedMessage,
  isMe,
  isAiBot,
  isDark,
  timeFormatted,
  isSeen,
  seenBy,
  staffDirectory,
  conversations,
  activeConversationId,
  setActiveConvId,
  openCustomerDetail,
  onOpenCustomer,
  onOpenGallery,
  openSeenUsersSheetForMessage,
  currentUser,
  executeMissionAction,
}) => {
  if (message.isDeleted) {
    return (
      <div
        className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic break-words shadow-sm transition-colors flex items-center gap-2 select-none ${
          isMe
            ? `bg-amber-500/10 border border-dashed border-amber-500/30 rounded-tr-sm ${
                isDark ? 'text-amber-300/80' : 'text-amber-800/80'
              }`
            : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-dashed border-[var(--mos-surface-border)] rounded-tl-sm'
        }`}
      >
        <Trash2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
        <span>Tin nhắn này đã bị xoá</span>
        {message.deletedByName && <span className="opacity-75">({message.deletedByName})</span>}
      </div>
    );
  }

  return (
    <div
      data-testid="mos-chat-message-bubble"
      className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm transition-colors ${
        isMe
          ? `bg-[var(--mos-accent-soft)] text-[var(--mos-text)] border border-[var(--mos-accent-border)] font-normal rounded-tr-sm ${
              isDark ? 'shadow-amber-500/5' : 'shadow-amber-900/5'
            }`
          : isAiBot
            ? 'bg-[var(--mos-surface)] text-[var(--mos-text)] border border-purple-500/40 rounded-tl-sm shadow-md'
            : 'bg-[var(--mos-surface)] text-[var(--mos-text)] border border-[var(--mos-surface-border)] rounded-tl-sm'
      }`}
    >
      {/* Pinned Badge */}
      {message.pinned && (
        <div
          className={`flex items-center gap-1 text-[11px] font-semibold mb-1 pb-1 border-b ${
            isDark ? 'text-amber-300 border-white/15' : 'text-amber-700 border-black/10'
          }`}
        >
          <Pin className="w-3 h-3 fill-current" />
          Đã ghim trong kênh
        </div>
      )}

      {message.forwardedFrom && (
        <MosChatForwardedHeader
          forwardedFrom={message.forwardedFrom}
          isDark={isDark}
          compact={true}
          canJumpToSource={Boolean(conversations?.some((c) => c.id === message.forwardedFrom?.sourceConversationId))}
          onJumpToSource={(srcConvId, srcMsgId) => {
            if (!setActiveConvId) return;
            jumpToForwardedSource({
              sourceConversationId: srcConvId,
              sourceMessageId: srcMsgId,
              activeConversationId,
              setActiveConvId,
            });
          }}
        />
      )}

      {/* Quoted Message Preview */}
      {quotedMessage && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Đi tới tin nhắn gốc của ${quotedMessage.senderName}`}
          onClick={(e) => {
            e.stopPropagation();
            scrollToMessageElement(quotedMessage.id, { flash: true });
          }}
          className={`text-xs px-2.5 py-1.5 rounded-lg mb-2 border-l-2 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
            isMe
              ? isDark
                ? 'bg-black/25 border-amber-400 text-[var(--mos-text)] hover:opacity-90'
                : 'bg-black/5 border-amber-600 text-[var(--mos-text)] hover:opacity-90'
              : 'bg-[var(--mos-surface-muted)] border-[var(--mos-accent)] text-[var(--mos-text)] hover:opacity-90'
          }`}
        >
          <MosChatAvatar
            size="xs"
            src={quotedMessage.senderAvatar}
            name={quotedMessage.senderName}
            staffId={quotedMessage.senderId}
            staffDirectory={staffDirectory}
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[11px] truncate">{quotedMessage.senderName}</p>
            <p className="line-clamp-1 text-[11px] opacity-80">{quotedMessage.text}</p>
          </div>
        </div>
      )}

      {/* Collapsible AI Reasoning (<thinking>) Block */}
      <MobileMessageAiReasoning aiThinking={message.aiThinking} isDark={isDark} />

      {/* Rich Text / Markdown / Mermaid / Sticker Render */}
      <MosChatRichText content={message.text} isMe={isMe} isDark={isDark} />

      {/* Google Sheets & Docs Mini Workspace Card */}
      {!message.isDeleted && message.text && (
        <MosChatGoogleWorkspaceCardList
          text={message.text}
          conversationId={message.conversationId}
          messageId={message.id}
          isDark={isDark}
          isMe={isMe}
          compact={true}
        />
      )}

      {/* Customer Card Attachment */}
      {message.customerCard && (
        <MosChatCustomerCardAttachment
          card={message.customerCard}
          isMe={isMe}
          onOpenCustomer={onOpenCustomer || openCustomerDetail}
        />
      )}

      {/* Attachments */}
      <MobileMessageAttachments message={message} isMe={isMe} isDark={isDark} onOpenGallery={onOpenGallery} />

      {/* Live / Shared mOS Mission Card */}
      {message.mission && !message.taskId && (
        <MobileInlineMissionCard
          mission={message.mission}
          isDark={isDark}
          currentUser={currentUser}
          executeMissionAction={executeMissionAction}
        />
      )}

      {/* AI Action Buttons & Quick Voice TTS / Copy */}
      <MobileMessageAiActionsAndVoice message={message} isAiBot={isAiBot} isDark={isDark} />

      {/* Time & Read status */}
      <div
        className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums ${
          isMe ? (isDark ? 'text-amber-300/80' : 'text-amber-800/80') : 'text-[var(--mos-text-muted)]'
        }`}
      >
        {message.editedAt && <span className="italic mr-0.5">đã sửa</span>}
        <span>{timeFormatted}</span>
        {isMe && !message.isDeleted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSeenUsersSheetForMessage?.(message);
            }}
            className={`inline-flex items-center gap-0.5 active:scale-90 transition-transform cursor-pointer select-none leading-none ${
              isSeen ? 'text-emerald-500 dark:text-emerald-400 font-bold' : isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
            title={
              isSeen
                ? `Đã xem bởi ${seenBy.map((s) => s.displayName).join(', ')} (Nhấn để xem)`
                : 'Đã gửi · Chưa có người xem'
            }
            aria-label="Xem người đã đọc tin nhắn"
          >
            {isSeen ? (
              <CheckCheck className="w-3.5 h-3.5 stroke-[2.3]" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
            {seenBy.length > 1 && <span className="text-[9.5px] tabular-nums font-bold">{seenBy.length}</span>}
          </button>
        )}
      </div>
    </div>
  );
};
