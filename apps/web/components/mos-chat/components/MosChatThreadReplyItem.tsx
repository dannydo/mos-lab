'use client';

import React from 'react';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Copy, RotateCcw, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatStaffMember,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { MosChatCustomerCardAttachment } from './MosChatCustomerCardAttachment';
import { MosChatGoogleWorkspaceCardList } from './MosChatGoogleWorkspaceCard';
import { MosChatStickerVisual, parseStickerReactionKey } from '../mos-chat-stickers';
import { buildMaiUrgentVoiceAnnouncement, formatReactionUsersTooltip } from '../utils/chat-helpers';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import { findSourceMessage, scrollToMessageAndFlash, cleanQuotedText } from '../utils/quoteUtils';
import { ThreadReplyInlineEditor } from './MosChatThreadReplyInlineEditor';
import { MosChatThreadReplyActionBar } from './MosChatThreadReplyActionBar';

export interface MosChatThreadReplyItemProps {
  r: MosChatThreadReply;
  activeThreadMessage: MosChatMessage;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  uniqueTasks: MosChatTaskItem[];
  isReplyMine: boolean;
  isAiReply: boolean;
  replyBreakdown: { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  stoppedReadersForReply: SafeAny[];
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  highlightedMsgId: string | null;
  AI_COPILOT_CONV_ID: string;
  canManageChatThreads: boolean;
  isDannyAccount: boolean;
  isMessageFromCurrentUser: (m: SafeAny) => boolean;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  renderReadStatusCheckmark: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderMiniSeenAvatarStack: (seenBy: SafeAny[], unseenBy: SafeAny[], opts?: SafeAny) => React.ReactNode;
  renderRichTextMessage: (
    text?: string,
    isMine?: boolean,
    opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
  ) => React.ReactNode;
  renderMessageAttachments: (attachments?: SafeAny[], isThumb?: boolean, isMine?: boolean) => React.ReactNode;
  getMemberNickname: (staffId: string | number) => string | undefined;
  threadMessagesContainerRef: React.RefObject<HTMLDivElement | null>;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  setReplyingToReply: (reply: { id: string; senderName: string; text: string } | null) => void;
  editingReplyId: string | null;
  editingText: string;
  setEditingText: (text: string) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => void;
  isSavingEdit: boolean;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleRestoreMessage: (msgId: string, replyId?: string) => void;
  speakingMsgId: string | null;
  ttsSpeed: number;
  handleSpeakAiMessage: (msg: SafeAny) => void;
  antdMessage: SafeAny;
  openCustomerDetail?: (customerId: number) => void;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string, replyId?: string) => void;
  handleOpenReactionUsers?: (target: SafeAny, initialEmoji?: string) => void;
  openMovePopoverKey: string | null;
  openMoreReplyId: string | null;
  setOpenMoreReplyId: React.Dispatch<React.SetStateAction<string | null>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderReactionPickerContent: (msgId: string, m: SafeAny, replyId?: string) => React.ReactNode;
  handleOpenForwardModal?: (m: MosChatMessage, reply?: MosChatThreadReply | null) => void;
  movingThreadItemKey: string | null;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  handleUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  openTaskModalFromMessage?: (msg: MosChatMessage | null, reply?: SafeAny) => void;
  handleBuzzMessage: (msgId: string, replyId?: string) => void;
  handleStartEdit: (msg: MosChatMessage, replyId?: string) => void;
  handleDeleteMessage: (msgId: string, replyId?: string) => void;
  setHistoryModalMessage: (m: SafeAny) => void;
  setHistoryModalOpen: (open: boolean) => void;
  quickReactionEmojis?: readonly string[];
}

export const MosChatThreadReplyItem: React.FC<MosChatThreadReplyItemProps> = React.memo(
  ({
    r,
    activeThreadMessage,
    activeConversation,
    currentUser,
    staffDirectory,
    uniqueTasks,
    isReplyMine,
    isAiReply,
    replyBreakdown,
    stoppedReadersForReply,
    isDark,
    token,
    surfaceRaised,
    canvasBg,
    borderColor,
    borderStrong,
    accentColor,
    accentSoftBg,
    accentBorder,
    highlightedMsgId,
    AI_COPILOT_CONV_ID,
    canManageChatThreads,
    isDannyAccount,
    isMessageFromCurrentUser,
    renderUserAvatarNode,
    renderReadStatusCheckmark,
    renderMiniSeenAvatarStack,
    renderRichTextMessage,
    renderMessageAttachments,
    getMemberNickname,
    threadMessagesContainerRef,
    threadInputRef,
    setReplyingToReply,
    editingReplyId,
    editingText,
    setEditingText,
    handleCancelEdit,
    handleSaveEdit,
    isSavingEdit,
    isComposingRef,
    lastCompositionEndMsRef,
    handleRestoreMessage,
    speakingMsgId,
    ttsSpeed,
    handleSpeakAiMessage,
    antdMessage,
    openCustomerDetail,
    hasUserReacted,
    handleToggleReaction,
    handleOpenReactionUsers,
    openMovePopoverKey,
    openMoreReplyId,
    setOpenMoreReplyId,
    openStickerPopoverKey,
    setOpenStickerPopoverKey,
    renderReactionPickerContent,
    handleOpenForwardModal,
    movingThreadItemKey,
    handleMoveThreadItem,
    formatMoveTargetSnippet,
    handleUpdateTask,
    openTaskModalFromMessage,
    handleBuzzMessage,
    handleStartEdit,
    handleDeleteMessage,
    setHistoryModalMessage,
    setHistoryModalOpen,
    quickReactionEmojis,
  }) => {
    const nick = getMemberNickname(r.senderId);

    return (
      <div data-message-id={r.id} id={`mos-chat-reply-${r.id}`} className="space-y-1">
        <div className={`flex gap-2 items-start ${isReplyMine ? 'flex-row-reverse' : 'flex-row'}`}>
          {renderUserAvatarNode({
            name: r.senderName,
            avatarUrl: r.senderAvatar,
            sizeClass: 'w-6 h-6 mt-0.5',
            textClass: 'text-[9.5px]',
            bgStyle: isReplyMine
              ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)'
              : isAiReply
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)'
                : '#2563eb',
            textColor: isReplyMine ? '#000' : '#fff',
            isAiBot: isAiReply,
          })}
          <div
            onDoubleClick={() => {
              if (!r.isDeleted) {
                setReplyingToReply({
                  id: r.id,
                  senderName: getMemberNickname(r.senderId) || r.senderName,
                  text: cleanQuotedText(r.text || ''),
                });
                setTimeout(() => {
                  threadInputRef.current?.focus();
                }, 50);
              }
            }}
            className={`max-w-[85%] p-2 rounded-xl text-[12px] text-left group relative transition-all ${
              isReplyMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
            }`}
            style={{
              background: isReplyMine
                ? accentSoftBg
                : isAiReply
                  ? isDark
                    ? 'rgba(139, 92, 246, 0.12)'
                    : 'rgba(139, 92, 246, 0.08)'
                  : canvasBg,
              border: `1px solid ${
                isReplyMine
                  ? accentBorder
                  : isAiReply
                    ? isDark
                      ? 'rgba(139, 92, 246, 0.4)'
                      : 'rgba(139, 92, 246, 0.3)'
                    : borderColor
              }`,
              boxShadow: highlightedMsgId === r.id ? `0 0 0 2px ${accentColor}, 0 0 14px ${accentBorder}` : undefined,
            }}
          >
            <div
              className={`font-bold text-[10.5px] mb-0.5 flex items-center gap-1 ${isReplyMine ? 'justify-end' : 'justify-start'}`}
            >
              {nick && nick !== r.senderName ? (
                <span className="inline-flex items-center gap-1">
                  <span style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : '#10b981' }}>{nick}</span>
                  <span className="text-slate-400 font-normal">({r.senderName})</span>
                </span>
              ) : (
                <span style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : token.colorText }}>
                  {r.senderName}
                </span>
              )}
              <span className="text-slate-400 tabular-nums">· {r.timeLabel}</span>
              {isReplyMine &&
                !r.isDeleted &&
                renderReadStatusCheckmark(replyBreakdown.seenBy, replyBreakdown.unseenBy, {
                  compact: true,
                  scopeLabel: 'Trạng thái đọc phản hồi',
                })}
            </div>

            {editingReplyId === r.id ? (
              <ThreadReplyInlineEditor
                initialText={editingText}
                setEditingText={setEditingText}
                handleCancelEdit={handleCancelEdit}
                handleSaveEdit={handleSaveEdit}
                isSavingEdit={isSavingEdit}
                isComposingRef={isComposingRef}
                lastCompositionEndMsRef={lastCompositionEndMsRef}
                surfaceRaised={surfaceRaised}
                colorText={token.colorText}
              />
            ) : r.isDeleted ? (
              <div className="text-[11.5px] italic text-slate-400 select-none">
                <span>💬 Phản hồi này đã bị xoá</span>
                {(isReplyMine || isDannyAccount) && (
                  <button
                    type="button"
                    onClick={() => handleRestoreMessage(activeThreadMessage.id, r.id)}
                    className="ml-1.5 inline-flex items-center gap-0.5 text-[10.5px] font-bold not-italic hover:underline cursor-pointer text-emerald-400"
                  >
                    <RotateCcw size={10} />
                    <span>Khôi phục</span>
                  </button>
                )}
                {r.deletedByName && (
                  <div className="text-[9.5px] not-italic mt-0.5 tabular-nums">
                    Bởi {r.deletedByName} · {r.deletedAt ? dayjs(r.deletedAt).format('HH:mm') : r.timeLabel}
                  </div>
                )}
              </div>
            ) : (
              <>
                {r.isBuzzed && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mb-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 flex items-center justify-between gap-1 text-[10px] font-bold text-amber-500 select-none animate-pulse"
                  >
                    <div className="flex items-center gap-1">
                      <Zap size={11} className="fill-amber-500" />
                      <span>
                        BUZZ {r.buzzCount && r.buzzCount > 1 ? `(x${r.buzzCount})` : ''}
                        {r.latestBuzz?.senderName ? ` · ${r.latestBuzz.senderName}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Nghe @MAI đọc tin nhắn khẩn cấp"
                      onClick={() => {
                        const spokenText = buildMaiUrgentVoiceAnnouncement({
                          senderName: r.latestBuzz?.senderName || r.senderName || 'Đồng nghiệp',
                          conversationName: activeConversation?.name,
                          isSpace: activeConversation?.type === 'space',
                          messageText: r.text || '',
                          note: r.latestBuzz?.note,
                        });
                        void playNeuralSpeech(spokenText, {
                          voice: 'vi-VN-HoaiMyNeural',
                          speed: ttsSpeed || 1.0,
                        });
                      }}
                      className="text-[9.5px] font-semibold text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-0.5 ml-1 px-1 rounded bg-amber-500/10"
                      title="Nghe @MAI đọc tin nhắn khẩn cấp"
                    >
                      <Volume2 size={9} />
                      <span>@MAI</span>
                    </button>
                  </div>
                )}

                {r.text && (
                  <div className="leading-relaxed break-words text-left">
                    {renderRichTextMessage(r.text, isReplyMine, {
                      onQuoteClick: (senderName, quotedContent) => {
                        const threadRepliesList = (activeThreadMessage?.thread ?? []) as Array<{
                          id: string;
                          senderName?: string;
                          text?: string | null;
                        }>;
                        const foundId = findSourceMessage(threadRepliesList, {
                          senderName,
                          content: quotedContent,
                        });
                        if (foundId) scrollToMessageAndFlash(foundId, threadMessagesContainerRef.current);
                      },
                    })}
                  </div>
                )}

                {isAiReply && r.text && (
                  <div className="mt-1 flex items-center gap-1">
                    <Tooltip
                      title={
                        speakingMsgId === r.id
                          ? 'Dừng đọc giọng nói'
                          : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                      }
                    >
                      <button
                        type="button"
                        aria-label="Đọc câu trả lời AI"
                        onClick={() => handleSpeakAiMessage(r)}
                        className="inline-flex items-center justify-center p-1 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                          border: `1px solid ${speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.5)' : borderColor}`,
                          color: speakingMsgId === r.id ? '#a78bfa' : token.colorTextSecondary,
                        }}
                      >
                        {speakingMsgId === r.id ? (
                          <VolumeX size={11} className="animate-pulse" />
                        ) : (
                          <Volume2 size={11} />
                        )}
                      </button>
                    </Tooltip>

                    <Tooltip title="Sao chép nội dung">
                      <button
                        type="button"
                        aria-label="Sao chép nội dung AI"
                        onClick={() => {
                          void navigator.clipboard?.writeText(r.text || '');
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
              </>
            )}

            {r.text && (
              <MosChatGoogleWorkspaceCardList
                text={r.text}
                conversationId={activeConversation?.id}
                messageId={r.id}
                isDark={isDark}
                isMe={isReplyMine}
                compact={true}
              />
            )}

            {renderMessageAttachments(r.attachments, true, isReplyMine)}

            {!r.isDeleted && r.customerCard && (
              <div className="mt-1.5">
                <MosChatCustomerCardAttachment
                  card={r.customerCard}
                  isMe={isReplyMine}
                  onOpenCustomer={openCustomerDetail}
                />
              </div>
            )}

            {r.reactions && Object.entries(r.reactions).filter(([, count]) => count > 0).length > 0 && (
              <div
                className={`mt-1.5 flex flex-wrap items-center gap-1 ${isReplyMine ? 'justify-end' : 'justify-start'}`}
              >
                {Object.entries(r.reactions)
                  .filter(([, count]) => count > 0)
                  .map(([emoji, count]) => {
                    const reactedByMe = hasUserReacted(r, emoji);
                    const stickerReaction = parseStickerReactionKey(emoji);
                    const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                    const tooltipTitle =
                      formatReactionUsersTooltip(r, emoji, staffDirectory, currentUser) ||
                      (reactedByMe ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc` : `Nhấn để thả cùng ${label}`);
                    return (
                      <Tooltip key={emoji} title={tooltipTitle}>
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleOpenReactionUsers?.(
                              {
                                id: r.id,
                                messageId: activeThreadMessage.id,
                                replyId: r.id,
                                reactions: r.reactions,
                                reactionUsers: r.reactionUsers,
                              },
                              emoji
                            );
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                          style={{
                            background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : surfaceRaised,
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
                      onClick={() =>
                        handleOpenReactionUsers({
                          id: r.id,
                          messageId: activeThreadMessage.id,
                          replyId: r.id,
                          reactions: r.reactions,
                          reactionUsers: r.reactionUsers,
                        })
                      }
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
              </div>
            )}

            <MosChatThreadReplyActionBar
              r={r}
              activeThreadMessage={activeThreadMessage}
              activeConversation={activeConversation}
              uniqueTasks={uniqueTasks}
              isReplyMine={isReplyMine}
              isDannyAccount={isDannyAccount}
              canManageChatThreads={canManageChatThreads}
              AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
              isDark={isDark}
              token={token}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              borderStrong={borderStrong}
              isMessageFromCurrentUser={isMessageFromCurrentUser}
              getMemberNickname={getMemberNickname}
              threadInputRef={threadInputRef}
              setReplyingToReply={setReplyingToReply}
              hasUserReacted={hasUserReacted}
              handleToggleReaction={handleToggleReaction}
              openMovePopoverKey={openMovePopoverKey}
              openMoreReplyId={openMoreReplyId}
              setOpenMoreReplyId={setOpenMoreReplyId}
              openStickerPopoverKey={openStickerPopoverKey}
              setOpenStickerPopoverKey={setOpenStickerPopoverKey}
              renderReactionPickerContent={renderReactionPickerContent}
              handleOpenForwardModal={handleOpenForwardModal}
              movingThreadItemKey={movingThreadItemKey}
              handleMoveThreadItem={handleMoveThreadItem}
              formatMoveTargetSnippet={formatMoveTargetSnippet}
              handleUpdateTask={handleUpdateTask}
              openTaskModalFromMessage={openTaskModalFromMessage}
              handleBuzzMessage={handleBuzzMessage}
              handleStartEdit={handleStartEdit}
              handleDeleteMessage={handleDeleteMessage}
              setHistoryModalMessage={setHistoryModalMessage}
              setHistoryModalOpen={setHistoryModalOpen}
              antdMessage={antdMessage}
              quickReactionEmojis={quickReactionEmojis}
            />
          </div>
        </div>
        {stoppedReadersForReply.length > 0 && (
          <div className={`w-full flex ${isReplyMine ? 'justify-end pr-8' : 'justify-start pl-8'}`}>
            {renderMiniSeenAvatarStack(stoppedReadersForReply, replyBreakdown.unseenBy, {
              align: isReplyMine ? 'right' : 'left',
              scopeLabel: 'Đã xem đến phản hồi này trong luồng',
            })}
          </div>
        )}
      </div>
    );
  }
);

MosChatThreadReplyItem.displayName = 'MosChatThreadReplyItem';
