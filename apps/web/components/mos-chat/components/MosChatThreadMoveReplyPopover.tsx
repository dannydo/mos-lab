'use client';

import React from 'react';
import { Input } from 'antd';
import { ArrowUpRight, Search } from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatThreadReply,
  type SafeAny,
} from '@mos-lab/shared';

export interface MosChatThreadMoveReplyPopoverProps {
  parentMsg: MosChatMessage;
  reply: MosChatThreadReply;
  activeConversation: MosChatConversation | null;
  moveThreadSearchQuery: string;
  setMoveThreadSearchQuery: (q: string) => void;
  movingThreadItemKey: string | null;
  getMemberNickname: (staffId: string | number) => string | undefined;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  isDark: boolean;
  token: SafeAny;
  borderColor: string;
  onPromoteToRoot: () => void;
  onMoveToTarget: (targetMessageId: string) => void;
}

export const MosChatThreadMoveReplyPopover: React.FC<MosChatThreadMoveReplyPopoverProps> = ({
  parentMsg,
  reply,
  activeConversation,
  moveThreadSearchQuery,
  setMoveThreadSearchQuery,
  movingThreadItemKey,
  getMemberNickname,
  formatMoveTargetSnippet,
  isDark,
  token,
  borderColor,
  onPromoteToRoot,
  onMoveToTarget,
}) => {
  const allMsgs = (activeConversation?.messages || []).filter(
    (m) =>
      m.id !== parentMsg.id &&
      !m.isDeleted &&
      !m.isSystemReminder &&
      m.senderId !== 'system-reminder' &&
      m.senderName !== 'mOS Reminder'
  );
  const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
  const candidates = allMsgs
    .slice()
    .reverse()
    .filter((m) => {
      if (!qNorm) return true;
      const nick = getMemberNickname(m.senderId);
      const hay = removeVietnameseTones(
        `${nick || ''} ${m.senderName} ${m.text || ''} ${m.mission?.missionKey || ''}`.toLowerCase()
      );
      return hay.includes(qNorm);
    });

  const isBusy =
    movingThreadItemKey === `PROMOTE_REPLY_TO_ROOT:${parentMsg.id}:${reply.id}` ||
    movingThreadItemKey === `MOVE_REPLY_TO_THREAD:${parentMsg.id}:${reply.id}`;

  return (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="w-[300px] space-y-2 text-[12px]"
      style={{ color: token.colorText }}
    >
      <div
        className="font-extrabold flex items-center gap-1.5 text-[12px] pb-1"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <ArrowUpRight size={14} className="text-amber-500 shrink-0" />
        <span>Tách hoặc chuyển câu trả lời sang luồng khác</span>
      </div>

      {/* 1-Click Promote Reply to Standalone Root Message */}
      <button
        type="button"
        disabled={isBusy}
        onClick={onPromoteToRoot}
        className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
        style={{
          background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(212, 168, 75, 0.45)',
        }}
      >
        <div className="font-extrabold text-[11.5px] flex items-center gap-1" style={{ color: '#d4a84b' }}>
          <ArrowUpRight size={13} />
          <span>Tách ra thành tin nhắn riêng ở luồng chính</span>
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: token.colorTextSecondary }}>
          Đưa câu trả lời này (kèm hình ảnh) ra ngoài cuộc trò chuyện chính
        </div>
      </button>

      {/* Move Reply to another message's thread */}
      <div className="space-y-1.5 pt-0.5">
        <div className="text-[10.5px] font-bold uppercase text-slate-400">
          Hoặc chuyển sang luồng của tin nhắn khác:
        </div>
        <Input
          size="small"
          allowClear
          placeholder="Tìm tin nhắn đích..."
          value={moveThreadSearchQuery}
          onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
          prefix={<Search size={12} className="text-slate-400" />}
        />
        <div className="max-h-[165px] overflow-y-auto space-y-1 pr-0.5">
          {candidates.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-slate-400">Không có tin nhắn đích khác</div>
          ) : (
            candidates.slice(0, 20).map((target) => {
              const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
              const targetNick = getMemberNickname(target.senderId);
              const targetDisplayName =
                targetNick && targetNick !== target.senderName
                  ? `${targetNick} (${target.senderName})`
                  : target.senderName;
              return (
                <button
                  key={target.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => onMoveToTarget(target.id)}
                  className="w-full px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 flex flex-col gap-0.5"
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center justify-between gap-1.5 text-[11px]">
                    <span className="font-bold truncate">
                      {targetDisplayName}{' '}
                      <span className="text-slate-400 font-normal tabular-nums">· {target.timeLabel}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[10px] font-bold text-blue-400">💬 {replyCount}</span>
                  </div>
                  <div className="text-[11px] truncate" style={{ color: token.colorTextSecondary }}>
                    {formatMoveTargetSnippet(target)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
