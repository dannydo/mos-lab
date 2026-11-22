'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Popconfirm, Tooltip, type GlobalToken } from 'antd';
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellRing,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Handshake,
  Hash,
  ListTodo,
  MessageSquare,
  MessageSquareReply,
  Pencil,
  Rocket,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionSummary,
  MosChatStaffMember,
  MosChatTaskItem,
  SafeAny,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { formatCountdown, getTaskDeadlineInfo } from '../utils/chat-helpers';
import { MosChatTaskInlineChecklist } from './MosChatTaskInlineChecklist';
import { MosChatTaskNegotiationBanner } from './MosChatTaskNegotiationBanner';

export const LiveTaskCountdownBadge: React.FC<{ remindAt: string }> = React.memo(({ remindAt }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{formatCountdown(remindAt, now)}</span>;
});
LiveTaskCountdownBadge.displayName = 'LiveTaskCountdownBadge';

export interface MosChatTaskCardProps {
  task: MosChatTaskItem;
  sourceMsg?: MosChatMessage | null;
  mode?: 'inline' | 'list' | 'thread';
  isDark: boolean;
  token: GlobalToken;
  surfaceRaised: string;
  borderColor: string;
  currentUser: SafeAny;
  isStrictDannySuperAdmin: boolean;
  conversations: MosChatConversation[];
  activeConversation: MosChatConversation | null | undefined;
  staffDirectory: MosChatStaffMember[];
  expandedChecklistTaskIds: Record<string, boolean>;
  setExpandedChecklistTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  renderLiveMissionCard: (
    mission: MosChatMissionSummary,
    msg?: MosChatMessage | null,
    mode?: 'thread' | 'inline' | 'task' | 'embedded'
  ) => React.ReactNode;
  handleToggleTaskDone: (taskId: string) => void;
  selectConversation: (convId: string) => void;
  handleOpenThread: (msgId: string, convId?: string, opts?: { autoFocus?: boolean }) => void;
  handleUpdateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<boolean> | Promise<void> | void;
  openEditTaskModal: (task: MosChatTaskItem) => void;
  handleAcceptNegotiatedDeadline: (task: MosChatTaskItem) => void;
  handleRejectNegotiatedDeadline: (task: MosChatTaskItem) => void;
  handleOpenNegotiateModal: (task: MosChatTaskItem) => void;
  openMissionModalFromChat: (msg: MosChatMessage | null, task?: MosChatTaskItem | null, convId?: string) => void;
  handleToggleArchiveTask: (taskId: string, archived: boolean) => void;
  handleDeleteTask: (taskId: string) => void;
  triggerTaskReminderAlert: (task: MosChatTaskItem) => void;
}

export const MosChatTaskCard: React.FC<MosChatTaskCardProps> = ({
  task,
  sourceMsg,
  mode = 'inline',
  isDark,
  token,
  surfaceRaised,
  borderColor,
  currentUser,
  isStrictDannySuperAdmin,
  conversations,
  activeConversation,
  staffDirectory,
  expandedChecklistTaskIds,
  setExpandedChecklistTaskIds,
  renderUserAvatarNode,
  renderLiveMissionCard,
  handleToggleTaskDone,
  selectConversation,
  handleOpenThread,
  handleUpdateTask,
  openEditTaskModal,
  handleAcceptNegotiatedDeadline,
  handleRejectNegotiatedDeadline,
  handleOpenNegotiateModal,
  openMissionModalFromChat,
  handleToggleArchiveTask,
  handleDeleteTask,
  triggerTaskReminderAlert,
}) => {
  const isDone = Boolean(task.done);
  const deadlineInfo = getTaskDeadlineInfo(task.deadline, isDone);
  const hasNegotiation = Boolean(task.negotiatedDeadline);
  const taskCode = `#TASK-${
    (task.id || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-5)
      .toUpperCase() || 'CHAT'
  }`;

  let priorityBg = 'rgba(59, 130, 246, 0.15)';
  let priorityColor = '#60a5fa';
  let priorityBorder = 'rgba(59, 130, 246, 0.35)';
  let priorityCode = 'P2';
  let priorityLabel = 'P2 · Thường';

  if (task.priority === 'URGENT') {
    priorityBg = 'rgba(239, 68, 68, 0.18)';
    priorityColor = '#f87171';
    priorityBorder = 'rgba(239, 68, 68, 0.4)';
    priorityCode = 'P0';
    priorityLabel = 'P0 · Khẩn cấp';
  } else if (task.priority === 'HIGH') {
    priorityBg = 'rgba(245, 158, 11, 0.18)';
    priorityColor = '#fbbf24';
    priorityBorder = 'rgba(245, 158, 11, 0.4)';
    priorityCode = 'P1';
    priorityLabel = 'P1 · Quan trọng';
  }

  const isCreator = Boolean(
    task.creatorName && currentUser?.displayName && task.creatorName === currentUser.displayName
  );
  const canApproveNegotiation = isCreator || isStrictDannySuperAdmin;
  const taskConv = conversations.find((c) => c.id === task.conversationId);
  const taskMission = task.mission || sourceMsg?.mission || null;
  const threadReplyCount = sourceMsg?.thread?.length || 0;

  const creator = task.sourceAuthorName || task.creatorName || 'Hệ thống';
  const assigner = task.assignerName || task.creatorName || task.sourceAuthorName || 'Hệ thống';
  const assignee = task.assigneeName || 'Chung';
  const isSelfAssigned = creator === assignee && assigner === assignee;

  return (
    <div
      className={`group/task relative rounded-xl transition-all ${
        mode === 'inline' ? 'mt-2 max-w-[92%]' : 'w-full'
      } p-3 space-y-2 text-left`}
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.95)',
        border: `1.5px solid ${
          isDone
            ? 'rgba(16, 185, 129, 0.3)'
            : deadlineInfo?.isOverdue
              ? 'rgba(239, 68, 68, 0.45)'
              : isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.08)'
        }`,
        boxShadow: isDark ? '0 3px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(15, 23, 42, 0.05)',
        opacity: isDone ? 0.75 : 1,
      }}
    >
      {/* Header: Done Checkbox + Task Code + Space Badge + Priority Icon + Overdue Badge + Thread Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Tooltip title={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}>
            <button
              type="button"
              aria-label={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}
              onClick={() => handleToggleTaskDone(task.id)}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isDone
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'border border-slate-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-transparent hover:text-emerald-500'
              }`}
            >
              <Check size={11} strokeWidth={isDone ? 3 : 2} />
            </button>
          </Tooltip>

          <span className="font-mono text-[10.5px] font-black tracking-wider uppercase tabular-nums text-slate-400 select-all">
            {taskCode}
          </span>

          {taskConv && (
            <Tooltip title={`Thuộc không gian: ${taskConv.name} · Nhấp để mở hội thoại`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.conversationId && task.conversationId !== activeConversation?.id) {
                    selectConversation(task.conversationId);
                  }
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all hover:opacity-85"
                style={{
                  background:
                    taskConv.type === 'space'
                      ? isDark
                        ? 'rgba(59, 130, 246, 0.15)'
                        : '#eff6ff'
                      : isDark
                        ? 'rgba(168, 85, 247, 0.15)'
                        : '#faf5ff',
                  color: taskConv.type === 'space' ? (isDark ? '#93c5fd' : '#2563eb') : isDark ? '#c084fc' : '#7e22ce',
                }}
              >
                {taskConv.type === 'space' ? <Hash size={9} /> : <MessageSquare size={9} />}
                <span className="truncate max-w-[110px]">{taskConv.name || task.conversationName || 'Hội thoại'}</span>
              </button>
            </Tooltip>
          )}

          <Tooltip title={`Mức ưu tiên: ${priorityLabel}`}>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-default"
              style={{
                background: priorityBg,
                color: priorityColor,
                border: `1px solid ${priorityBorder}`,
              }}
            >
              <Flag size={9} fill={priorityColor} />
              <span>{priorityCode}</span>
            </span>
          </Tooltip>

          {task.checklist &&
            task.checklist.length > 0 &&
            (() => {
              const chkTotal = task.checklist.length;
              const chkDone = task.checklist.filter((c) => c.done).length;
              const isAllDone = chkDone === chkTotal;
              const isExpanded = Boolean(expandedChecklistTaskIds[task.id]);
              return (
                <Tooltip
                  title={
                    isExpanded
                      ? 'Bấm để thu gọn checklist'
                      : `Tiến độ checklist: ${chkDone}/${chkTotal} việc (Bấm để xem & thực thi)`
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedChecklistTaskIds((prev) => ({
                        ...prev,
                        [task.id]: !prev[task.id],
                      }));
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                      isAllDone
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                    }`}
                  >
                    <ListTodo size={9} />
                    <span>
                      {chkDone}/{chkTotal}
                    </span>
                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </Tooltip>
              );
            })()}

          {deadlineInfo?.isOverdue && !isDone && (
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              QUÁ HẠN
            </span>
          )}

          {task.archived && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
              Lưu trữ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {mode !== 'thread' && (sourceMsg || task.sourceMessageId || task.conversationId) && (
            <Tooltip title="Mở luồng trao đổi & gõ phản hồi tức thì">
              <button
                type="button"
                onClick={() => {
                  const targetConvId = task.conversationId;
                  if (targetConvId && targetConvId !== activeConversation?.id) {
                    selectConversation(targetConvId);
                  }
                  const msgId = sourceMsg?.id || task.sourceMessageId;
                  if (msgId) {
                    handleOpenThread(msgId, targetConvId, { autoFocus: true });
                  }
                }}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:bg-amber-500/15 text-slate-300 hover:text-amber-400"
                style={{
                  background: surfaceRaised,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <MessageSquareReply size={12} className="text-amber-400" />
                {threadReplyCount > 0 ? (
                  <span className="text-[10px] tabular-nums font-bold text-amber-400">{threadReplyCount}</span>
                ) : (
                  <span className="text-[10px] opacity-80">Luồng</span>
                )}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div
        className={`text-[13px] font-semibold leading-snug ${isDone ? 'line-through opacity-65' : ''}`}
        style={{ color: token.colorText }}
      >
        {task.title}
      </div>

      {task.summary && !expandedChecklistTaskIds[task.id] && (
        <div
          onClick={() =>
            setExpandedChecklistTaskIds((prev) => ({
              ...prev,
              [task.id]: true,
            }))
          }
          role="button"
          tabIndex={0}
          className="px-2 py-1 rounded-lg text-[11px] leading-snug flex items-start gap-1.5 cursor-pointer transition-all hover:opacity-90"
          style={{
            background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.07)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(139, 92, 246, 0.18)',
            color: isDark ? '#cbd5e1' : '#334155',
          }}
        >
          <Sparkles size={11} className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2 flex-1 min-w-0">
            <strong className="text-purple-500 dark:text-purple-300 mr-1">Tóm tắt:</strong>
            {task.summary}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] pt-0.5">
        <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
          <div className="flex items-center gap-1.5" title={`Người nhận việc: ${assignee}`}>
            {renderUserAvatarNode({
              staffId: task.assigneeId,
              name: assignee,
              sizeClass: 'w-[18px] h-[18px]',
              textSizeClass: 'text-[8.5px]',
              roundedClass: 'rounded-full',
              bgColor: '#d97706',
            })}
            <span className="font-semibold text-amber-400 truncate max-w-[130px]">{assignee}</span>
          </div>

          {!isSelfAssigned && (
            <span
              className="text-[10.5px] text-slate-400 opacity-75 truncate max-w-[110px]"
              title={`Giao bởi: ${assigner}`}
            >
              từ {assigner}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deadlineInfo ? (
            <Tooltip title={`Hạn chót: ${dayjs(task.deadline).format('HH:mm DD/MM/YYYY')}`}>
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold tabular-nums"
                style={{
                  background: isDone
                    ? 'rgba(16, 185, 129, 0.12)'
                    : deadlineInfo.isOverdue
                      ? 'rgba(239, 68, 68, 0.16)'
                      : deadlineInfo.isDueSoon
                        ? 'rgba(245, 158, 11, 0.16)'
                        : isDark
                          ? 'rgba(139, 92, 246, 0.12)'
                          : '#f5f3ff',
                  color: isDone
                    ? '#10b981'
                    : deadlineInfo.isOverdue
                      ? '#ef4444'
                      : deadlineInfo.isDueSoon
                        ? '#f59e0b'
                        : '#8b5cf6',
                  border: `1px solid ${
                    isDone
                      ? 'rgba(16, 185, 129, 0.3)'
                      : deadlineInfo.isOverdue
                        ? 'rgba(239, 68, 68, 0.35)'
                        : deadlineInfo.isDueSoon
                          ? 'rgba(245, 158, 11, 0.35)'
                          : 'rgba(139, 92, 246, 0.35)'
                  }`,
                }}
              >
                <CalendarClock size={11} className="shrink-0" />
                <span>{deadlineInfo.relative}</span>
              </div>
            </Tooltip>
          ) : (
            !isDone && (
              <Tooltip title="Đặt hạn chót cho công việc">
                <button
                  type="button"
                  onClick={() => openEditTaskModal(task)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                >
                  <CalendarClock size={11} className="opacity-60" />
                  <span className="opacity-75">Đặt hạn</span>
                </button>
              </Tooltip>
            )
          )}

          {task.remindAt && !isDone && (
            <Tooltip title={`Nhắc hẹn: ${dayjs(task.remindAt).format('HH:mm DD/MM')}`}>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 tabular-nums">
                <Bell size={10} />
                <LiveTaskCountdownBadge remindAt={task.remindAt} />
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {mode !== 'thread' && expandedChecklistTaskIds[task.id] && (
        <MosChatTaskInlineChecklist
          task={task}
          onUpdateTask={handleUpdateTask}
          isDark={isDark}
          token={token}
          staffList={staffDirectory}
        />
      )}

      {taskMission && <div className="pt-0.5">{renderLiveMissionCard(taskMission, sourceMsg || null, 'embedded')}</div>}

      {hasNegotiation && !isDone && (
        <MosChatTaskNegotiationBanner
          task={task}
          isDark={isDark}
          canApproveNegotiation={canApproveNegotiation}
          onAcceptNegotiatedDeadline={handleAcceptNegotiatedDeadline}
          onRejectNegotiatedDeadline={handleRejectNegotiatedDeadline}
        />
      )}

      <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {!isDone && (
            <Tooltip title={hasNegotiation ? 'Sửa đề xuất dời hạn' : 'Xin dời hạn chót'}>
              <button
                type="button"
                onClick={() => handleOpenNegotiateModal(task)}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                style={{ background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7' }}
              >
                <Handshake size={12} />
                <span>{hasNegotiation ? 'Đề xuất hạn' : 'Dời hạn'}</span>
              </button>
            </Tooltip>
          )}

          {isStrictDannySuperAdmin && !taskMission && (
            <Tooltip title="Chuyển công việc này thành mOS Mission">
              <button
                type="button"
                onClick={() => openMissionModalFromChat(sourceMsg || null, task, task.conversationId)}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
              >
                <Rocket size={11} />
                <span>mOS Mission</span>
              </button>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <Tooltip title="Đọc tin nhắn công việc, tự động tóm tắt & thêm Checklist">
              <button
                type="button"
                aria-label="Tự động tóm tắt và thêm checklist"
                onClick={() => handleUpdateTask(task.id, { checklistAction: 'auto_summarize' })}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-purple-500/20 text-purple-400"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <Sparkles size={11} />
              </button>
            </Tooltip>
          )}

          {(!task.checklist || task.checklist.length === 0) && !isDone && (
            <Tooltip title="Thêm checklist cho công việc">
              <button
                type="button"
                aria-label="Thêm checklist"
                onClick={() => {
                  setExpandedChecklistTaskIds((prev) => ({
                    ...prev,
                    [task.id]: true,
                  }));
                }}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-slate-400 hover:text-amber-400"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <ListTodo size={11} />
              </button>
            </Tooltip>
          )}

          <Tooltip title="Chỉnh sửa công việc">
            <button
              type="button"
              aria-label="Chỉnh sửa công việc"
              onClick={() => openEditTaskModal(task)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <Pencil size={11} />
            </button>
          </Tooltip>

          <Tooltip title={task.archived ? 'Khôi phục công việc' : 'Lưu trữ công việc'}>
            <button
              type="button"
              aria-label={task.archived ? 'Khôi phục công việc' : 'Lưu trữ công việc'}
              onClick={() => handleToggleArchiveTask(task.id, !task.archived)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              {task.archived ? (
                <ArchiveRestore size={11} className="text-emerald-400" />
              ) : (
                <Archive size={11} className="text-slate-400" />
              )}
            </button>
          </Tooltip>

          <Popconfirm
            title="Xoá vĩnh viễn công việc này?"
            description="Bạn có chắc chắn muốn xoá task này không?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteTask(task.id)}
          >
            <Tooltip title="Xoá task">
              <button
                type="button"
                aria-label="Xoá task"
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/20 text-rose-400"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <Trash2 size={11} />
              </button>
            </Tooltip>
          </Popconfirm>

          <Tooltip title="Thử chuông nhắc hẹn">
            <button
              type="button"
              aria-label="Thử chuông nhắc hẹn"
              onClick={() => triggerTaskReminderAlert(task)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <BellRing size={11} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
