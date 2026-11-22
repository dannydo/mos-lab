'use client';

import React from 'react';
import { Tooltip, Popover, Dropdown } from 'antd';
import { ChevronDown, Copy, Forward, MessageSquareReply, SmilePlus, Users, Volume2, VolumeX } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatStaffMember,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { MosChatThreadChecklist } from './MosChatThreadChecklist';
import { MosChatCustomerCardAttachment } from './MosChatCustomerCardAttachment';
import { MosChatGoogleWorkspaceCardList } from './MosChatGoogleWorkspaceCard';
import { MosChatForwardedHeader } from './MosChatForwardedHeader';
import { MosChatStickerVisual, parseStickerReactionKey } from '../mos-chat-stickers';
import { copyMessageToClipboard, formatReactionUsersTooltip } from '../utils/chat-helpers';
import { cleanQuotedText } from '../utils/quoteUtils';

export interface MosChatThreadRootHeaderProps {
  activeThreadMessage: MosChatMessage;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  isMobile: boolean;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  threadWidth: number;
  setThreadWidth: (w: number) => void;
  persistPersonalLayout: (layout: SafeAny) => void;
  setThreadOpen: (open: boolean) => void;
  setMobileActiveView: (v: SafeAny) => void;
  isStrictDannySuperAdmin: boolean;
  openMissionModalFromChat: (m: MosChatMessage, linkedTask?: SafeAny) => void;
  uniqueTasks: MosChatTaskItem[];
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
  highlightedMsgId: string | null;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  getMemberNickname: (staffId: string | number) => string | undefined;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderReactionPickerContent: (msgId: string, m: SafeAny, replyId?: string) => React.ReactNode;
  setReplyingToReply: (reply: { id: string; senderName: string; text: string } | null) => void;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  AI_COPILOT_CONV_ID: string;
  handleOpenForwardModal?: (m: MosChatMessage) => void;
  accessibleConversationIds?: Set<string>;
  onJumpToForwardedSource?: (sourceConversationId: string, sourceMessageId: string) => void;
  renderRichTextMessage: (
    text?: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  speakingMsgId: string | null;
  ttsSpeed: number;
  handleSpeakAiMessage: (msg: SafeAny) => void;
  handleSetTtsSpeed: (speed: number) => void;
  antdMessage: SafeAny;
  renderMessageAttachments: (attachments?: SafeAny[], isThumb?: boolean, isMine?: boolean) => React.ReactNode;
  openCustomerDetail?: (customerId: number) => void;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string, replyId?: string) => void;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
  handleUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  renderTaskCard?: (
    task: MosChatTaskItem,
    sourceMsg?: MosChatMessage | null,
    mode?: 'inline' | 'list' | 'thread'
  ) => React.ReactNode;
  renderLiveMissionCard: (mission: SafeAny, msg?: MosChatMessage | null, mode?: SafeAny) => React.ReactNode;
}

export const MosChatThreadRootContent: React.FC<
  Pick<
    MosChatThreadRootHeaderProps,
    | 'activeThreadMessage'
    | 'activeConversation'
    | 'currentUser'
    | 'staffDirectory'
    | 'isDark'
    | 'token'
    | 'surfaceRaised'
    | 'canvasBg'
    | 'borderColor'
    | 'uniqueTasks'
    | 'highlightedMsgId'
    | 'renderUserAvatarNode'
    | 'getMemberNickname'
    | 'openStickerPopoverKey'
    | 'setOpenStickerPopoverKey'
    | 'renderReactionPickerContent'
    | 'setReplyingToReply'
    | 'threadInputRef'
    | 'AI_COPILOT_CONV_ID'
    | 'handleOpenForwardModal'
    | 'accessibleConversationIds'
    | 'onJumpToForwardedSource'
    | 'renderRichTextMessage'
    | 'speakingMsgId'
    | 'ttsSpeed'
    | 'handleSpeakAiMessage'
    | 'handleSetTtsSpeed'
    | 'antdMessage'
    | 'renderMessageAttachments'
    | 'openCustomerDetail'
    | 'hasUserReacted'
    | 'handleToggleReaction'
    | 'handleOpenReactionUsers'
    | 'handleUpdateTask'
    | 'renderTaskCard'
    | 'renderLiveMissionCard'
  >
> = ({
  activeThreadMessage,
  activeConversation,
  currentUser,
  staffDirectory,
  isDark,
  token,
  surfaceRaised,
  canvasBg,
  borderColor,
  uniqueTasks,
  highlightedMsgId,
  renderUserAvatarNode,
  getMemberNickname,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  renderReactionPickerContent,
  setReplyingToReply,
  threadInputRef,
  AI_COPILOT_CONV_ID,
  handleOpenForwardModal,
  accessibleConversationIds,
  onJumpToForwardedSource,
  renderRichTextMessage,
  speakingMsgId,
  ttsSpeed,
  handleSpeakAiMessage,
  handleSetTtsSpeed,
  antdMessage,
  renderMessageAttachments,
  openCustomerDetail,
  hasUserReacted,
  handleToggleReaction,
  handleOpenReactionUsers,
  handleUpdateTask,
  renderTaskCard,
  renderLiveMissionCard,
}) => {
  const linkedTask =
    uniqueTasks?.find((t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id) ||
    null;
  const nick = getMemberNickname(activeThreadMessage.senderId);

  return (
    <>
      {/* Linked Task & Interactive Checklist Pinned at Thread Top */}
      {linkedTask && (
        <div className="mb-2.5">
          {renderTaskCard ? renderTaskCard(linkedTask, activeThreadMessage, 'thread') : null}
          <MosChatThreadChecklist
            task={linkedTask}
            activeThreadMessage={activeThreadMessage}
            onUpdateTask={handleUpdateTask}
            staffList={activeConversation?.members || []}
            onToggleChecklistItem={async (itemId) => {
              await handleUpdateTask?.(linkedTask.id, {
                checklistAction: 'toggle',
                checklistItemId: itemId,
              });
            }}
            onAddChecklistItem={async (title, sourceReplyId) => {
              await handleUpdateTask?.(linkedTask.id, {
                checklistAction: 'add',
                checklistItem: { title, sourceReplyId: sourceReplyId || null },
              });
            }}
            onDeleteChecklistItem={async (itemId) => {
              await handleUpdateTask?.(linkedTask.id, {
                checklistAction: 'delete',
                checklistItemId: itemId,
              });
            }}
            onScrollToReply={(replyId) => {
              const el =
                document.getElementById(`mos-chat-thread-reply-${replyId}`) ||
                document.getElementById(`reply-bubble-${replyId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
              }
            }}
            isDark={isDark}
            token={token}
            isMobile={false}
          />
        </div>
      )}

      <div
        id={`mos-chat-thread-root-${activeThreadMessage.id}`}
        className="p-2.5 rounded-lg text-[12px] transition-all"
        style={{
          background: surfaceRaised,
          borderLeft: '3px solid #d4a84b',
          boxShadow:
            highlightedMsgId === activeThreadMessage.id
              ? '0 0 0 2px #d4a84b, 0 0 14px rgba(212, 168, 75, 0.4)'
              : undefined,
        }}
      >
        <div className="flex items-center justify-between font-bold mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {renderUserAvatarNode({
              name: activeThreadMessage.senderName,
              avatarUrl: activeThreadMessage.senderAvatar,
              sizeClass: 'w-5 h-5',
              textClass: 'text-[9px]',
            })}
            {nick && nick !== activeThreadMessage.senderName ? (
              <span className="inline-flex items-center gap-1 min-w-0">
                <span className="truncate text-emerald-500 dark:text-emerald-400">{nick}</span>
                <span className="text-slate-400 font-normal shrink-0">({activeThreadMessage.senderName})</span>
              </span>
            ) : (
              <span className="truncate">{activeThreadMessage.senderName}</span>
            )}
            <span className="text-slate-400 text-[10.5px] tabular-nums shrink-0">
              · {activeThreadMessage.timeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip
              title={
                openStickerPopoverKey === `thread-root:${activeThreadMessage.id}`
                  ? undefined
                  : 'Thả biểu cảm vào tin nhắn gốc'
              }
            >
              <Popover
                trigger="click"
                placement="bottomRight"
                zIndex={1500}
                destroyOnHidden
                open={openStickerPopoverKey === `thread-root:${activeThreadMessage.id}`}
                onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `thread-root:${activeThreadMessage.id}` : null)}
                content={
                  openStickerPopoverKey === `thread-root:${activeThreadMessage.id}`
                    ? renderReactionPickerContent(activeThreadMessage.id, activeThreadMessage)
                    : null
                }
              >
                <button
                  type="button"
                  aria-label="Thả biểu cảm vào tin nhắn gốc"
                  onClick={(e) => {
                    e.stopPropagation();
                    const key = `thread-root:${activeThreadMessage.id}`;
                    setOpenStickerPopoverKey(openStickerPopoverKey === key ? null : key);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <SmilePlus size={12} />
                  <span className="hidden sm:inline">Thả biểu cảm</span>
                </button>
              </Popover>
            </Tooltip>

            <Tooltip title="Trả lời / Trích dẫn tin nhắn gốc này">
              <button
                type="button"
                aria-label="Trả lời tin nhắn gốc trong luồng"
                onClick={() => {
                  setReplyingToReply({
                    id: activeThreadMessage.id,
                    senderName: getMemberNickname(activeThreadMessage.senderId) || activeThreadMessage.senderName,
                    text: cleanQuotedText(activeThreadMessage.text || ''),
                  });
                  setTimeout(() => {
                    threadInputRef.current?.focus();
                  }, 50);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors shrink-0"
              >
                <MessageSquareReply size={12} />
                <span>Trả lời</span>
              </button>
            </Tooltip>

            {!activeThreadMessage.isDeleted && (
              <Tooltip title="Sao chép tin nhắn gốc">
                <button
                  type="button"
                  aria-label="Sao chép tin nhắn gốc trong luồng"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await copyMessageToClipboard(activeThreadMessage.text, activeThreadMessage.attachments, {
                      customSuccessMsg: 'Đã sao chép nội dung tin nhắn gốc',
                    });
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors shrink-0"
                >
                  <Copy size={12} />
                  <span className="hidden sm:inline">Sao chép</span>
                </button>
              </Tooltip>
            )}

            {!activeThreadMessage.isDeleted &&
              activeConversation?.id !== AI_COPILOT_CONV_ID &&
              handleOpenForwardModal && (
                <Tooltip title="Chuyển tiếp cả luồng thảo luận này sang Space / DM khác">
                  <button
                    type="button"
                    aria-label="Chuyển tiếp luồng thảo luận"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenForwardModal(activeThreadMessage);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors shrink-0"
                  >
                    <Forward size={12} />
                    <span className="hidden sm:inline">Chuyển tiếp</span>
                  </button>
                </Tooltip>
              )}
          </div>
        </div>

        {activeThreadMessage.forwardedFrom && (
          <MosChatForwardedHeader
            forwardedFrom={activeThreadMessage.forwardedFrom}
            isDark={isDark}
            canJumpToSource={Boolean(
              onJumpToForwardedSource &&
              accessibleConversationIds?.has(activeThreadMessage.forwardedFrom.sourceConversationId)
            )}
            onJumpToSource={onJumpToForwardedSource}
            renderNoteText={(noteText) => renderRichTextMessage(noteText)}
          />
        )}
        {activeThreadMessage.text && (
          <div className="text-[13px] leading-relaxed break-words">
            {renderRichTextMessage(activeThreadMessage.text)}
          </div>
        )}
        {Boolean(activeThreadMessage.isAiBot || activeThreadMessage.senderId === 'wings-ai-copilot') &&
          activeThreadMessage.text && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Tooltip
                title={
                  speakingMsgId === activeThreadMessage.id
                    ? 'Dừng đọc giọng nói'
                    : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                }
              >
                <button
                  type="button"
                  aria-label="Đọc câu trả lời AI trong luồng"
                  onClick={() => handleSpeakAiMessage(activeThreadMessage)}
                  className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                    border: `1px solid ${
                      speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.5)' : borderColor
                    }`,
                    color: speakingMsgId === activeThreadMessage.id ? '#a78bfa' : token.colorTextSecondary,
                  }}
                >
                  {speakingMsgId === activeThreadMessage.id ? (
                    <VolumeX size={13} className="animate-pulse" />
                  ) : (
                    <Volume2 size={13} />
                  )}
                </button>
              </Tooltip>

              <Dropdown
                menu={{
                  items: [
                    { key: '0.8', label: '0.8x (Chậm)' },
                    { key: '1.0', label: '1.0x (Chuẩn)' },
                    { key: '1.25', label: '1.25x (Nhanh vừa)' },
                    { key: '1.5', label: '1.5x (Nhanh)' },
                    { key: '1.75', label: '1.75x (Rất nhanh)' },
                    { key: '2.0', label: '2.0x (Tối đa)' },
                  ],
                  selectedKeys: [String(ttsSpeed)],
                  onClick: ({ key }) => {
                    const s = parseFloat(key);
                    if (s) handleSetTtsSpeed(s);
                  },
                }}
                trigger={['click']}
                placement="bottomLeft"
              >
                <button
                  type="button"
                  aria-label="Tùy chỉnh tốc độ đọc"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors hover:text-violet-400"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color: token.colorTextSecondary,
                  }}
                  title={`Tốc độ đọc giọng nói cá nhân: ${ttsSpeed}x (nhấp để đổi)`}
                >
                  <span className="tabular-nums font-semibold">{ttsSpeed}x</span>
                  <ChevronDown size={10} />
                </button>
              </Dropdown>

              <Tooltip title="Sao chép nội dung">
                <button
                  type="button"
                  aria-label="Sao chép nội dung AI"
                  onClick={() => {
                    void navigator.clipboard?.writeText(activeThreadMessage.text || '');
                    antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                  }}
                  className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color: token.colorTextSecondary,
                  }}
                >
                  <Copy size={13} />
                </button>
              </Tooltip>
            </div>
          )}

        {!activeThreadMessage.isDeleted && activeThreadMessage.text && (
          <MosChatGoogleWorkspaceCardList
            text={activeThreadMessage.text}
            conversationId={activeConversation?.id}
            messageId={activeThreadMessage.id}
            isDark={isDark}
            compact={true}
          />
        )}
        {renderMessageAttachments(
          activeThreadMessage.attachments,
          true,
          activeThreadMessage.senderId === currentUser?.id
        )}
        {!activeThreadMessage.isDeleted && activeThreadMessage.customerCard && (
          <div className="mt-2">
            <MosChatCustomerCardAttachment
              card={activeThreadMessage.customerCard}
              onOpenCustomer={openCustomerDetail}
            />
          </div>
        )}
        {activeThreadMessage.reactions &&
          Object.entries(activeThreadMessage.reactions).filter(([, count]) => count > 0).length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {Object.entries(activeThreadMessage.reactions)
                .filter(([, count]) => count > 0)
                .map(([emoji, count]) => {
                  const reactedByMe = hasUserReacted(activeThreadMessage, emoji);
                  const stickerReaction = parseStickerReactionKey(emoji);
                  const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                  const tooltipTitle =
                    formatReactionUsersTooltip(activeThreadMessage, emoji, staffDirectory, currentUser) ||
                    (reactedByMe ? `Đã thả ${label} · Nhấn để gỡ cảm xúc` : `Thả cùng ${label}`);
                  return (
                    <Tooltip key={emoji} title={tooltipTitle}>
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(activeThreadMessage.id, emoji)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleOpenReactionUsers?.(activeThreadMessage, emoji);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                        style={{
                          background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : canvasBg,
                          border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                          color: reactedByMe ? '#d4a84b' : token.colorText,
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

              {handleOpenReactionUsers && (
                <Tooltip title="Xem những ai đã thả cảm xúc">
                  <button
                    type="button"
                    onClick={() => handleOpenReactionUsers(activeThreadMessage)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-amber-400 active:scale-95 transition-all cursor-pointer shadow-sm hover:scale-105"
                    style={{
                      background: canvasBg,
                      border: `1px solid ${borderColor}`,
                    }}
                    title="Xem những ai đã thả cảm xúc"
                    aria-label="Xem người thả cảm xúc"
                  >
                    <Users size={11} />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
      </div>

      {activeThreadMessage.mission && renderLiveMissionCard(activeThreadMessage.mission, activeThreadMessage, 'thread')}
    </>
  );
};
