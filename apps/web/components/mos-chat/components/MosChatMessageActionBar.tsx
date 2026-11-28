'use client';

import React, { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import {
  AlarmClockPlus,
  ArrowLeft,
  ChevronRight,
  Copy,
  CornerDownRight,
  Forward,
  History,
  MessageSquareReply,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  Rocket,
  SmilePlus,
  Trash2,
  Zap,
} from 'lucide-react';
import type { MosChatConversation, MosChatMessage, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../constants/chat-constants';
import { copyMessageToClipboard } from '../utils/chat-helpers';
import { MosChatMoveToThreadPopover } from './MosChatMoveToThreadPopover';

export interface MosChatMessageActionBarProps {
  m: MosChatMessage;
  prevMsg: MosChatMessage | null;
  allVisibleMessages: MosChatMessage[];
  activeConversation: MosChatConversation | null;
  linkedTask?: MosChatTaskItem;
  isMine: boolean;
  isDannyAccount: boolean;
  isStrictDannySuperAdmin: boolean;
  canMoveThisMsg: boolean;
  AI_COPILOT_CONV_ID: string;
  isDark: boolean;
  token: SafeAny;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  mobileActiveMsgId: string | null;
  openMovePopoverKey: string | null;
  openMoreMenuMsgId: string | null;
  setOpenMoreMenuMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  hasUserReacted: (m: SafeAny, emoji: string) => boolean;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  renderReactionPickerContent: (msgId: string, m: SafeAny, replyId?: string) => React.ReactNode;
  handleOpenThread: (msgId: string) => void;
  handleReplyToMessage?: (m: MosChatMessage) => void;
  handleOpenForwardModal?: (m: MosChatMessage) => void;
  openTaskModalFromMessage: (m: MosChatMessage) => void;
  handleTogglePin: (msgId: string) => void;
  handleBuzzMessage: (msgId: string) => void;
  openMissionModalFromChat: (m: MosChatMessage, linkedTask?: SafeAny) => void;
  handleStartEdit: (m: MosChatMessage) => void;
  setHistoryModalMessage: (m: MosChatMessage | null) => void;
  setHistoryModalOpen: (open: boolean) => void;
  handleDeleteMessage: (msgId: string) => void;
  taskByMsgOrTaskId: Map<string, MosChatTaskItem>;
  getMemberNickname: (staffId: string | number) => string | undefined;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  movingThreadItemKey: string | null;
  threadOpen: boolean;
  activeThreadMessage: MosChatMessage | null;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  quickReactionEmojis?: readonly string[];
}

export const MosChatMessageActionBar: React.FC<MosChatMessageActionBarProps> = ({
  m,
  prevMsg,
  allVisibleMessages,
  activeConversation,
  linkedTask,
  isMine,
  isDannyAccount,
  isStrictDannySuperAdmin,
  canMoveThisMsg,
  AI_COPILOT_CONV_ID,
  isDark,
  token,
  surfaceRaised,
  borderColor,
  borderStrong,
  mobileActiveMsgId,
  openMovePopoverKey,
  openMoreMenuMsgId,
  setOpenMoreMenuMsgId,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  hasUserReacted,
  handleToggleReaction,
  renderReactionPickerContent,
  handleOpenThread,
  handleReplyToMessage,
  handleOpenForwardModal,
  openTaskModalFromMessage,
  handleTogglePin,
  handleBuzzMessage,
  openMissionModalFromChat,
  handleStartEdit,
  setHistoryModalMessage,
  setHistoryModalOpen,
  handleDeleteMessage,
  taskByMsgOrTaskId,
  getMemberNickname,
  formatMoveTargetSnippet,
  movingThreadItemKey,
  threadOpen,
  activeThreadMessage,
  handleMoveThreadItem,
  quickReactionEmojis,
}) => {
  const [moreMenuView, setMoreMenuView] = useState<'menu' | 'move' | 'confirm-buzz' | 'confirm-delete'>('menu');
  const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');

  const isHighlightedBar =
    mobileActiveMsgId === m.id ||
    openMovePopoverKey === `root:${m.id}` ||
    openMoreMenuMsgId === m.id ||
    openStickerPopoverKey === `react:${m.id}`;

  const canShowCopy = !m.isDeleted;
  const canShowBuzz = !m.isDeleted;
  const canShowMove = canMoveThisMsg && allVisibleMessages.length > 1;
  const canShowMission = isStrictDannySuperAdmin;
  const canShowEdit = isMine && !m.isDeleted;
  const canShowHistory = Boolean(m.isDeleted || (m.editHistory && m.editHistory.length > 0));
  const canShowDelete = (isMine || isDannyAccount) && !m.isDeleted;
  const hasGroup2 = canShowMove || canShowMission;
  const hasGroup3 = canShowEdit || canShowHistory || canShowDelete;

  const renderMoreMenuContent = () => {
    if (moreMenuView === 'move' && canShowMove) {
      return (
        <div data-no-chat-autofocus="true" onClick={(e) => e.stopPropagation()} className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setMoreMenuView('menu');
              setMoveThreadSearchQuery('');
            }}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-500 hover:underline cursor-pointer"
          >
            <ArrowLeft size={12} />
            <span>Quay lại</span>
          </button>
          <MosChatMoveToThreadPopover
            sourceMsg={m}
            prevMsg={prevMsg}
            allVisibleMessages={allVisibleMessages}
            moveThreadSearchQuery={moveThreadSearchQuery}
            setMoveThreadSearchQuery={setMoveThreadSearchQuery}
            taskByMsgOrTaskId={taskByMsgOrTaskId}
            getMemberNickname={getMemberNickname}
            formatMoveTargetSnippet={formatMoveTargetSnippet}
            movingThreadItemKey={movingThreadItemKey}
            threadOpen={threadOpen}
            activeThreadMessage={activeThreadMessage}
            isDark={isDark}
            token={token}
            borderColor={borderColor}
            onSelectTarget={(targetMessageId) => {
              setOpenMoreMenuMsgId(null);
              setMoreMenuView('menu');
              void handleMoveThreadItem({
                mode: 'MERGE_ROOT_TO_THREAD',
                sourceMessageId: m.id,
                targetMessageId,
              });
            }}
          />
        </div>
      );
    }

    if (moreMenuView === 'confirm-buzz' && canShowBuzz) {
      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[236px] space-y-2.5 p-0.5 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div className="flex items-start gap-2">
            <Zap size={15} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[12.5px]">Buzz / Bump tin nhắn khẩn cấp?</div>
              <div className="text-[11px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                Gửi tín hiệu cảnh báo nổi bật kèm âm thanh &amp; rung để người nhận xử lý ngay.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setMoreMenuView('menu')}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenMoreMenuMsgId(null);
                setMoreMenuView('menu');
                handleBuzzMessage(m.id);
              }}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              ⚡ Buzz ngay
            </button>
          </div>
        </div>
      );
    }

    if (moreMenuView === 'confirm-delete' && canShowDelete) {
      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[236px] space-y-2.5 p-0.5 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div className="flex items-start gap-2">
            <Trash2 size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[12.5px]">Xoá tin nhắn này?</div>
              <div className="text-[11px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                Tin nhắn sẽ chuyển sang trạng thái đã xoá. Lịch sử trước khi xoá vẫn được lưu an toàn.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setMoreMenuView('menu')}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenMoreMenuMsgId(null);
                setMoreMenuView('menu');
                handleDeleteMessage(m.id);
              }}
              className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
            >
              Xoá
            </button>
          </div>
        </div>
      );
    }

    const itemCls =
      'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-left';

    return (
      <div
        data-no-chat-autofocus="true"
        onClick={(e) => e.stopPropagation()}
        className="w-[232px] py-0.5 space-y-0.5"
        style={{ color: token.colorText }}
      >
        {canShowCopy && (
          <button
            type="button"
            aria-label="Sao chép tin nhắn"
            onClick={async () => {
              setOpenMoreMenuMsgId(null);
              setMoreMenuView('menu');
              await copyMessageToClipboard(m.text, m.attachments);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <Copy size={13} style={{ color: token.colorTextSecondary }} />
              <span>Sao chép tin nhắn</span>
            </span>
          </button>
        )}

        <button
          type="button"
          aria-label="Ghim tin nhắn"
          onClick={() => {
            setOpenMoreMenuMsgId(null);
            setMoreMenuView('menu');
            handleTogglePin(m.id);
          }}
          className={itemCls}
        >
          <span className="inline-flex items-center gap-2">
            <Pin size={13} style={{ color: m.pinned ? '#d4a84b' : token.colorTextSecondary }} />
            <span>{m.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}</span>
          </span>
        </button>

        {canShowBuzz && (
          <button
            type="button"
            aria-label="Buzz / Bump tin nhắn khẩn cấp"
            onClick={() => setMoreMenuView('confirm-buzz')}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <Zap size={13} className={m.isBuzzed ? 'fill-amber-500 text-amber-500' : 'text-amber-500'} />
              <span>Buzz / Bump khẩn cấp</span>
            </span>
            {m.isBuzzed && (
              <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold tabular-nums">
                x{m.buzzCount || 1}
              </span>
            )}
          </button>
        )}

        {hasGroup2 && <div className="my-1 border-t" style={{ borderColor }} />}

        {canShowMove && (
          <button
            type="button"
            aria-label="Gộp tin nhắn vào luồng trả lời phụ"
            onClick={() => {
              setMoveThreadSearchQuery('');
              setMoreMenuView('move');
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <CornerDownRight size={13} className="text-amber-500" />
              <span>Gộp vào luồng phụ (Subthread)</span>
            </span>
            <ChevronRight size={12} style={{ color: token.colorTextSecondary }} />
          </button>
        )}

        {canShowMission && (
          <button
            type="button"
            aria-label="Chuyển vào mOS Mission"
            onClick={() => {
              setOpenMoreMenuMsgId(null);
              setMoreMenuView('menu');
              openMissionModalFromChat(m, linkedTask);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <Rocket size={13} style={{ color: m.mission || linkedTask?.mission ? '#10b981' : '#a78bfa' }} />
              <span>
                {m.mission || linkedTask?.mission
                  ? `Mở Mission #${(m.mission || linkedTask?.mission)?.missionKey}`
                  : 'Chuyển vào mOS Mission'}
              </span>
            </span>
          </button>
        )}

        {hasGroup3 && <div className="my-1 border-t" style={{ borderColor }} />}

        {canShowEdit && (
          <button
            type="button"
            aria-label="Chỉnh sửa tin nhắn"
            onClick={() => {
              setOpenMoreMenuMsgId(null);
              setMoreMenuView('menu');
              handleStartEdit(m);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <Pencil size={13} style={{ color: token.colorTextSecondary }} />
              <span>Chỉnh sửa tin nhắn</span>
            </span>
          </button>
        )}

        {canShowHistory && (
          <button
            type="button"
            aria-label="Xem lịch sử chỉnh sửa & xoá"
            onClick={() => {
              setOpenMoreMenuMsgId(null);
              setMoreMenuView('menu');
              setHistoryModalMessage(m);
              setHistoryModalOpen(true);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2 text-amber-500">
              <History size={13} />
              <span>Xem lịch sử chỉnh sửa &amp; xoá</span>
            </span>
          </button>
        )}

        {canShowDelete && (
          <button
            type="button"
            aria-label="Xoá tin nhắn"
            onClick={() => setMoreMenuView('confirm-delete')}
            className={`${itemCls} text-rose-500 hover:bg-rose-500/10`}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 size={13} />
              <span>Xoá tin nhắn</span>
            </span>
          </button>
        )}
      </div>
    );
  };

  const forwardReplyCount = (m.thread || []).filter((r) => !r.isDeleted).length;

  return (
    <div
      className={`${
        isHighlightedBar
          ? 'opacity-100 pointer-events-auto scale-100 ring-1 ring-amber-500/50 shadow-md'
          : 'opacity-0 pointer-events-none'
      } group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
      style={{
        background: surfaceRaised,
        border: `1px solid ${isHighlightedBar ? 'rgba(212, 168, 75, 0.6)' : borderStrong}`,
      }}
    >
      {(quickReactionEmojis && quickReactionEmojis.length > 0 ? quickReactionEmojis : GOOGLE_CHAT_QUICK_EMOJIS)
        .slice(0, 3)
        .map((emoji) => {
          const reactedByMe = hasUserReacted(m, emoji);
          return (
            <Tooltip key={emoji} title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả nhanh ${emoji}`}>
              <button
                type="button"
                aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                onClick={() => handleToggleReaction(m.id, emoji)}
                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[13px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
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
          openStickerPopoverKey === `react:${m.id}` ? undefined : 'Chọn thêm biểu tượng cảm xúc (Wings & phổ biến)'
        }
      >
        <Popover
          trigger="click"
          placement={isMine ? 'topRight' : 'topLeft'}
          zIndex={1500}
          destroyOnHidden
          open={openStickerPopoverKey === `react:${m.id}`}
          onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `react:${m.id}` : null)}
          content={openStickerPopoverKey === `react:${m.id}` ? renderReactionPickerContent(m.id, m) : null}
        >
          <button
            type="button"
            aria-label="Chọn biểu tượng cảm xúc"
            onClick={(e) => {
              e.stopPropagation();
              const key = `react:${m.id}`;
              setOpenStickerPopoverKey(openStickerPopoverKey === key ? null : key);
            }}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: token.colorTextSecondary }}
          >
            <SmilePlus size={13} />
          </button>
        </Popover>
      </Tooltip>

      <span className="w-px h-3.5 mx-0.5" style={{ background: borderStrong }} />

      <Tooltip title="Trả lời theo luồng (Thread)">
        <button
          type="button"
          aria-label="Trả lời theo luồng"
          onClick={() => handleOpenThread(m.id)}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          style={{ color: token.colorTextSecondary }}
        >
          <MessageSquareReply size={13} />
        </button>
      </Tooltip>

      {!m.isDeleted && (
        <Tooltip title="Trả lời tin nhắn này">
          <button
            type="button"
            aria-label="Trả lời tin nhắn này"
            onClick={(e) => {
              e.stopPropagation();
              handleReplyToMessage?.(m);
            }}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
            style={{ color: token.colorTextSecondary }}
          >
            <Reply size={13} />
          </button>
        </Tooltip>
      )}

      {!m.isDeleted && activeConversation?.id !== AI_COPILOT_CONV_ID && handleOpenForwardModal && (
        <Tooltip
          title={
            forwardReplyCount > 0
              ? `Chuyển tiếp tin nhắn & cả luồng (${forwardReplyCount} phản hồi)`
              : 'Chuyển tiếp tin nhắn (Forward)'
          }
        >
          <button
            type="button"
            aria-label="Chuyển tiếp tin nhắn"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenForwardModal(m);
            }}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer transition-colors"
            style={{ color: token.colorTextSecondary }}
          >
            <Forward size={13} />
          </button>
        </Tooltip>
      )}

      <Tooltip title="Tạo Task & Hẹn giờ nhắc từ tin nhắn">
        <button
          type="button"
          aria-label="Tạo Task & Hẹn giờ nhắc từ tin nhắn"
          onClick={() => openTaskModalFromMessage(m)}
          className="w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer"
          style={{
            background: 'rgba(212, 168, 75, 0.16)',
            color: '#d4a84b',
          }}
        >
          <AlarmClockPlus size={13} />
        </button>
      </Tooltip>

      <Tooltip title={openMoreMenuMsgId === m.id ? undefined : 'Thêm thao tác'}>
        <Popover
          trigger="click"
          placement={isMine ? 'topRight' : 'topLeft'}
          zIndex={1500}
          destroyOnHidden
          open={openMoreMenuMsgId === m.id}
          onOpenChange={(vis) => {
            setOpenMoreMenuMsgId(vis ? m.id : null);
            setMoreMenuView('menu');
            if (!vis) setMoveThreadSearchQuery('');
          }}
          content={openMoreMenuMsgId === m.id ? renderMoreMenuContent() : null}
        >
          <button
            type="button"
            aria-label="Thêm thao tác tin nhắn"
            onClick={(e) => {
              e.stopPropagation();
              const nextOpen = openMoreMenuMsgId === m.id ? null : m.id;
              setOpenMoreMenuMsgId(nextOpen);
              setMoreMenuView('menu');
              if (!nextOpen) setMoveThreadSearchQuery('');
            }}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
            style={{
              background: openMoreMenuMsgId === m.id ? 'rgba(212, 168, 75, 0.16)' : 'transparent',
              color: openMoreMenuMsgId === m.id ? '#d4a84b' : token.colorTextSecondary,
            }}
          >
            <MoreHorizontal size={13} />
          </button>
        </Popover>
      </Tooltip>
    </div>
  );
};
