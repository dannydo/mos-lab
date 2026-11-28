'use client';

import React from 'react';
import { Popover, Tooltip } from 'antd';
import { Forward, History, MessageSquareReply, SmilePlus } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  SafeAny,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { cleanQuotedText } from '../utils/quoteUtils';
import { MosChatThreadReplyMoreMenu } from './MosChatThreadReplyMoreMenu';

export interface MosChatThreadReplyActionBarProps {
  r: MosChatThreadReply;
  activeThreadMessage: MosChatMessage;
  activeConversation: MosChatConversation | null;
  uniqueTasks: MosChatTaskItem[];
  isReplyMine: boolean;
  isDannyAccount: boolean;
  canManageChatThreads: boolean;
  AI_COPILOT_CONV_ID: string;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  isMessageFromCurrentUser: (m: SafeAny) => boolean;
  getMemberNickname: (staffId: string | number) => string | undefined;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  setReplyingToReply: (reply: { id: string; senderName: string; text: string } | null) => void;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string, replyId?: string) => void;
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
  antdMessage: SafeAny;
  quickReactionEmojis?: readonly string[];
}

/**
 * Compact hover action toolbar rendered on each thread reply bubble inside MosChatThreadDrawer.
 */
export const MosChatThreadReplyActionBar: React.FC<MosChatThreadReplyActionBarProps> = ({
  r,
  activeThreadMessage,
  activeConversation,
  uniqueTasks,
  isReplyMine,
  isDannyAccount,
  canManageChatThreads,
  AI_COPILOT_CONV_ID,
  isDark,
  token,
  surfaceRaised,
  borderColor,
  borderStrong,
  isMessageFromCurrentUser,
  getMemberNickname,
  threadInputRef,
  setReplyingToReply,
  hasUserReacted,
  handleToggleReaction,
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
  antdMessage,
  quickReactionEmojis,
}) => {
  return (
    <div
      className={`${
        openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}` ||
        openMoreReplyId === r.id ||
        openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
          ? 'opacity-100 pointer-events-auto ring-1 ring-amber-500/50'
          : 'opacity-0'
      } group-hover:opacity-100 transition-opacity absolute -top-3.5 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
      style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
    >
      {!r.isDeleted ? (
        <>
          {(quickReactionEmojis && quickReactionEmojis.length > 0 ? quickReactionEmojis : GOOGLE_CHAT_QUICK_EMOJIS)
            .slice(0, 3)
            .map((emoji) => {
              const reactedByMe = hasUserReacted(r, emoji);
              return (
                <Tooltip key={emoji} title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ` : `Thả nhanh ${emoji}`}>
                  <button
                    type="button"
                    aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                    onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                    className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
                    style={{
                      background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                      boxShadow: reactedByMe ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                    }}
                  >
                    {emoji}
                  </button>
                </Tooltip>
              );
            })}

          <Tooltip
            title={
              openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                ? undefined
                : 'Chọn biểu tượng cảm xúc'
            }
          >
            <Popover
              trigger="click"
              placement={isReplyMine ? 'topRight' : 'topLeft'}
              zIndex={1500}
              open={openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`}
              onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `reply:${activeThreadMessage.id}:${r.id}` : null)}
              content={
                openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                  ? renderReactionPickerContent(activeThreadMessage.id, r, r.id)
                  : null
              }
            >
              <button
                type="button"
                aria-label="Chọn biểu tượng cảm xúc"
                onClick={(e) => {
                  e.stopPropagation();
                  const stickerKey = `reply:${activeThreadMessage.id}:${r.id}`;
                  setOpenStickerPopoverKey(openStickerPopoverKey === stickerKey ? null : stickerKey);
                }}
                className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                style={{ color: token.colorTextSecondary }}
              >
                <SmilePlus size={11} />
              </button>
            </Popover>
          </Tooltip>

          <span className="w-px h-3 mx-0.5" style={{ background: borderStrong }} />

          <Tooltip title="Trả lời phản hồi này">
            <button
              type="button"
              aria-label="Trả lời phản hồi này trong luồng"
              onClick={() => {
                setReplyingToReply({
                  id: r.id,
                  senderName: getMemberNickname(r.senderId) || r.senderName,
                  text: cleanQuotedText(r.text || ''),
                });
                setTimeout(() => {
                  threadInputRef.current?.focus();
                }, 50);
              }}
              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
            >
              <MessageSquareReply size={11} />
            </button>
          </Tooltip>

          {activeConversation?.id !== AI_COPILOT_CONV_ID && handleOpenForwardModal && (
            <Tooltip title="Chuyển tiếp riêng phản hồi này">
              <button
                type="button"
                aria-label="Chuyển tiếp phản hồi này"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenForwardModal(activeThreadMessage, r);
                }}
                className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-slate-400 hover:text-amber-400 transition-transform hover:scale-110"
              >
                <Forward size={11} />
              </button>
            </Tooltip>
          )}

          <MosChatThreadReplyMoreMenu
            activeThreadMessage={activeThreadMessage}
            r={r}
            activeConversation={activeConversation}
            uniqueTasks={uniqueTasks}
            isReplyMine={isReplyMine}
            isDannyAccount={isDannyAccount}
            canManageChatThreads={canManageChatThreads}
            isMessageFromCurrentUser={isMessageFromCurrentUser}
            openMoreReplyId={openMoreReplyId}
            setOpenMoreReplyId={setOpenMoreReplyId}
            movingThreadItemKey={movingThreadItemKey}
            handleMoveThreadItem={handleMoveThreadItem}
            getMemberNickname={getMemberNickname}
            formatMoveTargetSnippet={formatMoveTargetSnippet}
            handleUpdateTask={handleUpdateTask}
            openTaskModalFromMessage={openTaskModalFromMessage}
            handleBuzzMessage={handleBuzzMessage}
            handleStartEdit={handleStartEdit}
            handleDeleteMessage={handleDeleteMessage}
            setHistoryModalMessage={setHistoryModalMessage}
            setHistoryModalOpen={setHistoryModalOpen}
            antdMessage={antdMessage}
            isDark={isDark}
            token={token}
            borderColor={borderColor}
          />
        </>
      ) : (
        <Tooltip title="Lịch sử">
          <button
            type="button"
            aria-label="Xem lịch sử phản hồi"
            onClick={() => {
              setHistoryModalMessage(r as SafeAny);
              setHistoryModalOpen(true);
            }}
            className="w-5 h-5 rounded-full inline-flex items-center justify-center text-amber-400 cursor-pointer hover:bg-amber-500/10"
          >
            <History size={11} />
          </button>
        </Tooltip>
      )}
    </div>
  );
};
