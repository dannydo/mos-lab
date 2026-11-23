'use client';

import React from 'react';
import { Input } from 'antd';
import { CornerDownRight, Search } from 'lucide-react';
import { removeVietnameseTones, type MosChatMessage, type MosChatTaskItem, type SafeAny } from '@mos-lab/shared';

export interface MosChatMoveToThreadPopoverProps {
  sourceMsg: MosChatMessage;
  prevMsg: MosChatMessage | null;
  allVisibleMessages: MosChatMessage[];
  moveThreadSearchQuery: string;
  setMoveThreadSearchQuery: (q: string) => void;
  taskByMsgOrTaskId: Map<string, MosChatTaskItem>;
  getMemberNickname: (staffId: string | number) => string | undefined;
  formatMoveTargetSnippet: (msg: MosChatMessage) => string;
  movingThreadItemKey: string | null;
  threadOpen: boolean;
  activeThreadMessage: MosChatMessage | null;
  isDark: boolean;
  token: SafeAny;
  borderColor: string;
  onSelectTarget: (targetMessageId: string) => void;
}

export const MosChatMoveToThreadPopover: React.FC<MosChatMoveToThreadPopoverProps> = ({
  sourceMsg,
  prevMsg,
  allVisibleMessages,
  moveThreadSearchQuery,
  setMoveThreadSearchQuery,
  taskByMsgOrTaskId,
  getMemberNickname,
  formatMoveTargetSnippet,
  movingThreadItemKey,
  threadOpen,
  activeThreadMessage,
  isDark,
  token,
  borderColor,
  onSelectTarget,
}) => {
  const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
  const candidates = allVisibleMessages
    .filter((m) => m.id !== sourceMsg.id && !m.isDeleted && !m.isSystemReminder)
    .slice()
    .reverse()
    .filter((m) => {
      if (!qNorm) return true;
      const linkedTask = (m.taskId ? taskByMsgOrTaskId.get(m.taskId) : undefined) || taskByMsgOrTaskId.get(m.id);
      const taskCode = linkedTask?.id ? `TASK-${linkedTask.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5)}` : '';
      const nick = getMemberNickname(m.senderId);
      const hay = removeVietnameseTones(
        `${nick || ''} ${m.senderName} ${m.text || ''} ${linkedTask?.title || ''} ${taskCode} ${m.mission?.missionKey || ''}`.toLowerCase()
      );
      return hay.includes(qNorm);
    });

  const isBusy = movingThreadItemKey === `MERGE_ROOT_TO_THREAD:${sourceMsg.id}:`;
  const openThreadTarget =
    threadOpen && activeThreadMessage && activeThreadMessage.id !== sourceMsg.id && !activeThreadMessage.isDeleted
      ? activeThreadMessage
      : null;

  return (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="w-[320px] space-y-2 text-[12px]"
      style={{ color: token.colorText }}
    >
      <div
        className="flex items-center justify-between gap-2 pb-1"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="font-extrabold flex items-center gap-1.5 text-[12.5px]">
          <CornerDownRight size={14} className="text-amber-500 shrink-0" />
          <span>Gộp tin nhắn vào luồng phụ (Subthread)</span>
        </div>
      </div>

      {/* 1-Click Primary Action: Merge into the message immediately above */}
      {prevMsg && !prevMsg.isDeleted && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSelectTarget(prevMsg.id)}
          className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
          style={{
            background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(212, 168, 75, 0.45)',
          }}
        >
          <div
            className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px]"
            style={{ color: '#d4a84b' }}
          >
            <span>⚡ Gộp vào luồng ngay phía trên (1-Click)</span>
            <span className="tabular-nums text-[10.5px]">
              {(prevMsg.thread || []).filter((r) => !r.deletedAt).length} trả lời
            </span>
          </div>
          <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
            <span className="font-bold">{getMemberNickname(prevMsg.senderId) || prevMsg.senderName}:</span>{' '}
            {formatMoveTargetSnippet(prevMsg)}
          </div>
        </button>
      )}

      {/* 1-Click Secondary Action: Merge into the currently open Right-Side Thread */}
      {openThreadTarget && openThreadTarget.id !== prevMsg?.id && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onSelectTarget(openThreadTarget.id)}
          className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
          style={{
            background: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.42)',
          }}
        >
          <div className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px] text-indigo-400">
            <span>👉 Gộp vào luồng đang mở bên phải</span>
            <span className="tabular-nums text-[10.5px]">
              {(openThreadTarget.thread || []).filter((r) => !r.deletedAt).length} trả lời
            </span>
          </div>
          <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
            <span className="font-bold">
              {getMemberNickname(openThreadTarget.senderId) || openThreadTarget.senderName}:
            </span>{' '}
            {formatMoveTargetSnippet(openThreadTarget)}
          </div>
        </button>
      )}

      {/* Search & Pick any other message / thread in conversation */}
      <div className="space-y-1.5 pt-0.5">
        <Input
          size="small"
          allowClear
          placeholder="Tìm luồng / tin nhắn đích..."
          value={moveThreadSearchQuery}
          onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
          prefix={<Search size={12} className="text-slate-400" />}
        />
        <div className="max-h-[190px] overflow-y-auto space-y-1 pr-0.5">
          {candidates.length === 0 ? (
            <div className="py-3 text-center text-[11px] text-slate-400">Không tìm thấy tin nhắn đích phù hợp</div>
          ) : (
            candidates.slice(0, 25).map((target) => {
              const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
              const missionKey = target.mission?.missionKey;
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
                  onClick={() => onSelectTarget(target.id)}
                  className="w-full px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 flex flex-col gap-0.5"
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center justify-between gap-1.5 text-[11px]">
                    <span className="font-bold truncate">
                      {targetDisplayName}{' '}
                      <span className="text-slate-400 font-normal tabular-nums">· {target.timeLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0 tabular-nums text-[10px] font-bold text-blue-400">
                      {missionKey && (
                        <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">#{missionKey}</span>
                      )}
                      <span>💬 {replyCount}</span>
                    </span>
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
