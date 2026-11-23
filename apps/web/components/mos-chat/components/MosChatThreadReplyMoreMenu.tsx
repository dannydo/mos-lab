'use client';

import React, { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import {
  AlarmClockPlus,
  ArrowLeft,
  ArrowUpRight,
  Copy,
  History,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { copyMessageToClipboard } from '../utils/chat-helpers';
import { MosChatThreadMoveReplyPopover } from './MosChatThreadMoveReplyPopover';

export interface MosChatThreadReplyMoreMenuProps {
  activeThreadMessage: MosChatMessage;
  r: MosChatThreadReply;
  activeConversation: MosChatConversation | null;
  uniqueTasks: MosChatTaskItem[];
  isReplyMine: boolean;
  isDannyAccount: boolean;
  canManageChatThreads: boolean;
  isMessageFromCurrentUser: (m: SafeAny) => boolean;
  openMoreReplyId: string | null;
  setOpenMoreReplyId: React.Dispatch<React.SetStateAction<string | null>>;
  movingThreadItemKey: string | null;
  handleMoveThreadItem: (args: SafeAny) => Promise<void> | void;
  getMemberNickname: (staffId: string | number) => string | undefined;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  handleUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  openTaskModalFromMessage?: (msg: MosChatMessage | null, reply?: SafeAny) => void;
  handleBuzzMessage: (msgId: string, replyId?: string) => void;
  handleStartEdit: (msg: MosChatMessage, replyId?: string) => void;
  handleDeleteMessage: (msgId: string, replyId?: string) => void;
  setHistoryModalMessage: (m: SafeAny) => void;
  setHistoryModalOpen: (open: boolean) => void;
  antdMessage: SafeAny;
  isDark: boolean;
  token: SafeAny;
  borderColor: string;
}

export const MosChatThreadReplyMoreMenu: React.FC<MosChatThreadReplyMoreMenuProps> = ({
  activeThreadMessage,
  r,
  activeConversation,
  uniqueTasks,
  isReplyMine,
  isDannyAccount,
  canManageChatThreads,
  isMessageFromCurrentUser,
  openMoreReplyId,
  setOpenMoreReplyId,
  movingThreadItemKey,
  handleMoveThreadItem,
  getMemberNickname,
  formatMoveTargetSnippet,
  handleUpdateTask,
  openTaskModalFromMessage,
  handleBuzzMessage,
  handleStartEdit,
  handleDeleteMessage,
  setHistoryModalMessage,
  setHistoryModalOpen,
  antdMessage,
  isDark,
  token,
  borderColor,
}) => {
  const [replyMoreView, setReplyMoreView] = useState<'menu' | 'move' | 'confirm-buzz' | 'confirm-delete'>('menu');
  const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');

  const linkedTask = uniqueTasks?.find(
    (t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
  );
  const canMoveReply =
    (isReplyMine || isMessageFromCurrentUser(activeThreadMessage) || canManageChatThreads) && !r.isMissionMilestone;
  const canDeleteReply = isReplyMine || isDannyAccount;
  const hasReplyHistory = Boolean(r.editHistory && r.editHistory.length > 0);
  const hasGroup1 = Boolean(linkedTask || openTaskModalFromMessage);
  const hasGroup3 = Boolean(isReplyMine || hasReplyHistory || canDeleteReply);

  const renderReplyMoreContent = () => {
    if (replyMoreView === 'move' && canMoveReply) {
      return (
        <div data-no-chat-autofocus="true" onClick={(e) => e.stopPropagation()} className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setReplyMoreView('menu');
              setMoveThreadSearchQuery('');
            }}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-500 hover:underline cursor-pointer"
          >
            <ArrowLeft size={12} />
            <span>Quay lại</span>
          </button>
          <MosChatThreadMoveReplyPopover
            parentMsg={activeThreadMessage}
            reply={r}
            activeConversation={activeConversation}
            moveThreadSearchQuery={moveThreadSearchQuery}
            setMoveThreadSearchQuery={setMoveThreadSearchQuery}
            movingThreadItemKey={movingThreadItemKey}
            getMemberNickname={getMemberNickname}
            formatMoveTargetSnippet={formatMoveTargetSnippet}
            isDark={isDark}
            token={token}
            borderColor={borderColor}
            onPromoteToRoot={() => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              void handleMoveThreadItem({
                mode: 'PROMOTE_REPLY_TO_ROOT',
                sourceMessageId: activeThreadMessage.id,
                replyId: r.id,
              });
            }}
            onMoveToTarget={(targetMessageId) => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              void handleMoveThreadItem({
                mode: 'MOVE_REPLY_TO_THREAD',
                sourceMessageId: activeThreadMessage.id,
                replyId: r.id,
                targetMessageId,
              });
            }}
          />
        </div>
      );
    }

    if (replyMoreView === 'confirm-buzz') {
      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[228px] space-y-2.5 p-0.5 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div className="flex items-start gap-2">
            <Zap size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[12px]">Buzz / Bump phản hồi khẩn cấp?</div>
              <div className="text-[11px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                Gửi cảnh báo nổi bật kèm âm thanh &amp; rung để người nhận xử lý ngay.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setReplyMoreView('menu')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenMoreReplyId(null);
                setReplyMoreView('menu');
                handleBuzzMessage(activeThreadMessage.id, r.id);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              ⚡ Buzz ngay
            </button>
          </div>
        </div>
      );
    }

    if (replyMoreView === 'confirm-delete' && canDeleteReply) {
      return (
        <div
          data-no-chat-autofocus="true"
          onClick={(e) => e.stopPropagation()}
          className="w-[228px] space-y-2.5 p-0.5 text-[12px]"
          style={{ color: token.colorText }}
        >
          <div className="flex items-start gap-2">
            <Trash2 size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[12px]">Xoá câu trả lời này?</div>
              <div className="text-[11px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                Lịch sử chỉnh sửa &amp; xoá vẫn được lưu an toàn.
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setReplyMoreView('menu')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorTextSecondary }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenMoreReplyId(null);
                setReplyMoreView('menu');
                handleDeleteMessage(activeThreadMessage.id, r.id);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
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
        className="w-[224px] py-0.5 space-y-0.5"
        style={{ color: token.colorText }}
      >
        {linkedTask && (
          <button
            type="button"
            aria-label="Thêm vào Checklist của Task"
            onClick={async () => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              const replyText = (r.text || '').trim().slice(0, 150);
              if (replyText) {
                await handleUpdateTask?.(linkedTask.id, {
                  checklistAction: 'add',
                  checklistItem: { title: replyText, sourceReplyId: r.id },
                });
                antdMessage.success('Đã thêm phản hồi vào Checklist của Task');
              }
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <ListTodo size={13} className="text-amber-500" />
              <span>Thêm vào Checklist Task</span>
            </span>
          </button>
        )}

        {openTaskModalFromMessage && (
          <button
            type="button"
            aria-label="Tạo Task & Hẹn giờ nhắc từ phản hồi này"
            onClick={() => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              openTaskModalFromMessage(activeThreadMessage, r);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <AlarmClockPlus size={13} className="text-amber-500" />
              <span>Tạo Task &amp; Hẹn giờ nhắc</span>
            </span>
          </button>
        )}

        {hasGroup1 && <div className="my-1 border-t" style={{ borderColor }} />}

        <button
          type="button"
          aria-label="Sao chép phản hồi trong luồng"
          onClick={async () => {
            setOpenMoreReplyId(null);
            setReplyMoreView('menu');
            await copyMessageToClipboard(r.text, r.attachments, {
              customSuccessMsg: 'Đã sao chép phản hồi',
            });
          }}
          className={itemCls}
        >
          <span className="inline-flex items-center gap-2">
            <Copy size={13} style={{ color: token.colorTextSecondary }} />
            <span>Sao chép phản hồi</span>
          </span>
        </button>

        <button
          type="button"
          aria-label="Buzz / Bump phản hồi khẩn cấp"
          onClick={() => setReplyMoreView('confirm-buzz')}
          className={itemCls}
        >
          <span className="inline-flex items-center gap-2">
            <Zap size={13} className={r.isBuzzed ? 'fill-amber-500 text-amber-500' : 'text-amber-500'} />
            <span>Buzz / Bump khẩn cấp</span>
          </span>
          {r.isBuzzed && (
            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold tabular-nums">
              x{r.buzzCount || 1}
            </span>
          )}
        </button>

        {canMoveReply && (
          <button
            type="button"
            aria-label="Tách hoặc chuyển câu trả lời sang luồng khác"
            onClick={() => {
              setMoveThreadSearchQuery('');
              setReplyMoreView('move');
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <ArrowUpRight size={13} className="text-amber-500" />
              <span>Tách / Chuyển luồng</span>
            </span>
          </button>
        )}

        {hasGroup3 && <div className="my-1 border-t" style={{ borderColor }} />}

        {isReplyMine && (
          <button
            type="button"
            aria-label="Chỉnh sửa phản hồi"
            onClick={() => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              handleStartEdit(activeThreadMessage, r.id);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2">
              <Pencil size={13} style={{ color: token.colorTextSecondary }} />
              <span>Chỉnh sửa phản hồi</span>
            </span>
          </button>
        )}

        {hasReplyHistory && (
          <button
            type="button"
            aria-label="Xem lịch sử phản hồi"
            onClick={() => {
              setOpenMoreReplyId(null);
              setReplyMoreView('menu');
              setHistoryModalMessage(r as SafeAny);
              setHistoryModalOpen(true);
            }}
            className={itemCls}
          >
            <span className="inline-flex items-center gap-2 text-amber-500">
              <History size={13} />
              <span>Xem lịch sử</span>
            </span>
          </button>
        )}

        {canDeleteReply && (
          <button
            type="button"
            aria-label="Xoá câu trả lời"
            onClick={() => setReplyMoreView('confirm-delete')}
            className={`${itemCls} text-rose-500 hover:bg-rose-500/10`}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 size={13} />
              <span>Xoá câu trả lời</span>
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <Tooltip title={openMoreReplyId === r.id ? undefined : 'Thêm thao tác'}>
      <Popover
        trigger="click"
        placement="topRight"
        zIndex={1500}
        destroyOnHidden
        open={openMoreReplyId === r.id}
        onOpenChange={(vis) => {
          setOpenMoreReplyId(vis ? r.id : null);
          setReplyMoreView('menu');
          if (!vis) setMoveThreadSearchQuery('');
        }}
        content={openMoreReplyId === r.id ? renderReplyMoreContent() : null}
      >
        <button
          type="button"
          aria-label="Thêm thao tác phản hồi"
          onClick={(e) => {
            e.stopPropagation();
            const nextOpen = openMoreReplyId === r.id ? null : r.id;
            setOpenMoreReplyId(nextOpen);
            setReplyMoreView('menu');
            if (!nextOpen) setMoveThreadSearchQuery('');
          }}
          className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          style={{
            background: openMoreReplyId === r.id ? 'rgba(212, 168, 75, 0.16)' : 'transparent',
            color: openMoreReplyId === r.id ? '#d4a84b' : token.colorTextSecondary,
          }}
        >
          <MoreHorizontal size={11} />
        </button>
      </Popover>
    </Tooltip>
  );
};
