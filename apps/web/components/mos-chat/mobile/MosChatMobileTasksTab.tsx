'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  User,
  Plus,
  CheckCircle2,
  Search,
  X,
  Hash,
  Handshake,
  Rocket,
  PenLine,
  Send,
  UserCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import type { MosChatTaskItem } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { MosChatAvatar } from '../MosChatAvatar';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export type MosChatTaskScope = 'all' | 'mine' | 'channel';
export type MosChatTaskStatusFilter = 'pending' | 'overdue' | 'completed' | 'archived' | 'all';

export interface MosChatMobileTasksTabProps {
  onOpenCreateTaskModal: () => void;
  onSelectTask?: (task: MosChatTaskItem) => void;
}

export const MosChatMobileTasksTab: React.FC<MosChatMobileTasksTabProps> = ({
  onOpenCreateTaskModal,
  onSelectTask,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const { tasks, toggleTaskDone, activeConvId, currentUser, activeConversation, staffDirectory } = useMosChat();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<MosChatTaskScope>('all');
  const [statusFilter, setStatusFilter] = useState<MosChatTaskStatusFilter>('pending');

  const myName =
    currentUser?.displayName || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Danny Do';
  const myId = currentUser?.id ? String(currentUser.id) : '';

  // Filter tasks based on scope, status, and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Scope filter
      if (scopeFilter === 'channel') {
        if (t.conversationId && t.conversationId !== activeConvId) return false;
      } else if (scopeFilter === 'mine') {
        const isAssignedToMe =
          (myId && String(t.assigneeId) === myId) ||
          (t.assigneeName && t.assigneeName.toLowerCase().includes(myName.toLowerCase()));
        const isCreatedByMe =
          (t.creatorName && t.creatorName.toLowerCase().includes(myName.toLowerCase())) ||
          (t.sourceAuthorName && t.sourceAuthorName.toLowerCase().includes(myName.toLowerCase())) ||
          (t.assignerName && t.assignerName.toLowerCase().includes(myName.toLowerCase()));
        if (!isAssignedToMe && !isCreatedByMe) return false;
      }

      // 2. Status filter
      const deadline = t.dueAt || t.deadline;
      const isOverdue = deadline && !t.done && dayjs(deadline).isBefore(dayjs());

      if (statusFilter === 'pending') {
        if (t.done || t.archived) return false;
      } else if (statusFilter === 'overdue') {
        if (t.done || t.archived || !isOverdue) return false;
      } else if (statusFilter === 'completed') {
        if (!t.done || t.archived) return false;
      } else if (statusFilter === 'archived') {
        if (!t.archived) return false;
      } else if (statusFilter === 'all') {
        // If not in archived view, by default hide archived unless user chose 'archived' or search is active
        if (t.archived && !searchQuery.trim()) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const code = `#TASK-${t.id
          .replace(/^task_/, '')
          .slice(-6)
          .toLowerCase()}`;
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchCode = code.includes(q);
        const matchAssignee = (t.assigneeName || '').toLowerCase().includes(q);
        const matchCreator = (t.creatorName || '').toLowerCase().includes(q);
        const matchSourceAuthor = (t.sourceAuthorName || '').toLowerCase().includes(q);
        const matchAssigner = (t.assignerName || '').toLowerCase().includes(q);
        const matchSpace = (t.conversationName || '').toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchCode &&
          !matchAssignee &&
          !matchCreator &&
          !matchSourceAuthor &&
          !matchAssigner &&
          !matchSpace
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, scopeFilter, statusFilter, searchQuery, activeConvId, myId, myName]);

  // Sort tasks: In channel view or all, tasks belonging to current active conversation come first
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aInChannel = a.conversationId === activeConvId ? 1 : 0;
      const bInChannel = b.conversationId === activeConvId ? 1 : 0;
      if (aInChannel !== bInChannel) return bInChannel - aInChannel;

      // Pending tasks first, then by priority (URGENT > HIGH > NORMAL), then by deadline
      if (a.done !== b.done) return a.done ? 1 : -1;

      const priorityWeight: Record<string, number> = { URGENT: 3, HIGH: 2, NORMAL: 1 };
      const pA = priorityWeight[a.priority || 'NORMAL'] || 1;
      const pB = priorityWeight[b.priority || 'NORMAL'] || 1;
      if (pA !== pB) return pB - pA;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredTasks, activeConvId]);

  // Counts for pills
  const counts = useMemo(() => {
    const spaceTasks = tasks.filter((t) => !t.conversationId || t.conversationId === activeConvId);
    const myTasks = tasks.filter((t) => {
      const isAssigned =
        (myId && String(t.assigneeId) === myId) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(myName.toLowerCase()));
      const isCreated =
        (t.creatorName && t.creatorName.toLowerCase().includes(myName.toLowerCase())) ||
        (t.sourceAuthorName && t.sourceAuthorName.toLowerCase().includes(myName.toLowerCase())) ||
        (t.assignerName && t.assignerName.toLowerCase().includes(myName.toLowerCase()));
      return isAssigned || isCreated;
    });

    const pendingCount = tasks.filter((t) => !t.done && !t.archived).length;
    const overdueCount = tasks.filter((t) => {
      const d = t.dueAt || t.deadline;
      return d && !t.done && !t.archived && dayjs(d).isBefore(dayjs());
    }).length;
    const completedCount = tasks.filter((t) => t.done && !t.archived).length;
    const archivedCount = tasks.filter((t) => t.archived).length;

    return {
      all: tasks.filter((t) => !t.archived).length,
      mine: myTasks.filter((t) => !t.archived).length,
      channel: spaceTasks.filter((t) => !t.archived).length,
      pending: pendingCount,
      overdue: overdueCount,
      completed: completedCount,
      archived: archivedCount,
    };
  }, [tasks, activeConvId, myId, myName]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      {/* Title Header with New Task Button */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--mos-text)] tracking-tight flex items-center gap-1.5">
            <span>Kho Công Việc & Nhắc Hẹn</span>
            <span className="text-xs font-mono font-normal text-[var(--mos-text-muted)]">({counts.all})</span>
          </h2>
          <p className="text-[11px] text-[var(--mos-text-muted)]">
            {activeConversation?.name ? `Không gian: ${activeConversation.name}` : 'Toàn bộ công việc'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateTaskModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] text-xs font-bold shadow-md active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Giao việc</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 pb-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--mos-text-muted)] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên việc, mã #TASK, người nhận..."
            className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] text-xs focus:outline-none focus:border-[var(--mos-accent)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-0.5 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scope Filter Pill Strip */}
      <div className="px-4 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setScopeFilter('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            scopeFilter === 'all'
              ? 'bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border border-[var(--mos-surface-border-strong)] shadow-xs'
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Tất cả ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setScopeFilter('mine')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            scopeFilter === 'mine'
              ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold'
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Của tôi ({counts.mine})
        </button>
        <button
          type="button"
          onClick={() => setScopeFilter('channel')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            scopeFilter === 'channel'
              ? 'bg-blue-600 text-white font-bold'
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Kênh này ({counts.channel})
        </button>
      </div>

      {/* Status Filter Pill Strip */}
      <div className="px-4 pb-2.5 border-b border-[var(--mos-surface-border)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
            statusFilter === 'pending'
              ? `bg-amber-500/20 border border-amber-500/40 ${isDark ? 'text-amber-300' : 'text-amber-800'}`
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Đang làm ({counts.pending})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('overdue')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
            statusFilter === 'overdue'
              ? `bg-rose-500/20 border border-rose-500/40 font-bold ${isDark ? 'text-rose-300' : 'text-rose-700'}`
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Quá hạn ({counts.overdue})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
            statusFilter === 'completed'
              ? `bg-emerald-500/20 border border-emerald-500/40 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Đã xong ({counts.completed})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('archived')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
            statusFilter === 'archived'
              ? 'bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border border-[var(--mos-surface-border-strong)]'
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Lưu trữ ({counts.archived})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
            statusFilter === 'all'
              ? 'bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border border-[var(--mos-surface-border-strong)]'
              : 'text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] hover:text-[var(--mos-text)]'
          }`}
        >
          Tất cả
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2.5">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--mos-text-muted)] mt-8">
            <CheckCircle2 className="w-12 h-12 opacity-40 mb-2" />
            <p className="text-sm font-medium text-[var(--mos-text)]">
              {searchQuery
                ? 'Không tìm thấy công việc nào khớp từ khóa'
                : statusFilter === 'completed'
                  ? 'Chưa có công việc nào hoàn thành'
                  : statusFilter === 'overdue'
                    ? 'Tuyệt vời! Không có công việc nào bị quá hạn'
                    : statusFilter === 'archived'
                      ? 'Không có công việc nào trong kho lưu trữ'
                      : 'Không có công việc nào đang chờ thực hiện'}
            </p>
            <p className="text-xs text-[var(--mos-text-muted)] mt-1">Bấm nút Giao việc để tạo việc mới</p>
          </div>
        ) : (
          sortedTasks.map((t) => {
            const deadline = t.dueAt || t.deadline;
            const isOverdue = deadline && !t.done && dayjs(deadline).isBefore(dayjs());
            const hasNegotiation = Boolean(t.negotiatedDeadline);
            const taskCode = `#TASK-${t.id
              .replace(/^task_/, '')
              .slice(-6)
              .toUpperCase()}`;

            const creator = t.sourceAuthorName || t.creatorName || 'Hệ thống';
            const assigner = t.assignerName || t.creatorName || t.sourceAuthorName || 'Hệ thống';
            const assignee = t.assigneeName || 'Chung';

            const isMissionAwaitingCommit = Boolean(
              t.mission &&
              (t.mission.canSuperAdminApproveCommit ||
                t.mission.superAdminActions?.canApproveCommit ||
                t.mission.status === 'AWAITING_DANNY_COMMIT_REVIEW' ||
                t.mission.superAdminActions?.executionPhase === 'AWAITING_COMMIT_REVIEW')
            );

            const isMissionAwaitingDeploy = Boolean(
              t.mission &&
              (t.mission.canSuperAdminApproveDeploy ||
                t.mission.superAdminActions?.canApproveDeploy ||
                t.mission.status === 'AWAITING_DANNY_DEPLOY_APPROVAL' ||
                t.mission.superAdminActions?.executionPhase === 'AWAITING_DEPLOY_REVIEW')
            );

            const isMissionAwaitingAccept = Boolean(
              t.mission &&
              (t.mission.canReporterAccept ||
                t.mission.reporterActions?.canAcceptOrReopen ||
                t.mission.status === 'FIXED' ||
                t.mission.status === 'AWAITING_REPORTER_ACCEPTANCE')
            );

            return (
              <div
                key={t.id}
                onClick={() => onSelectTask?.(t)}
                role="button"
                tabIndex={0}
                aria-label={`Mở chi tiết công việc: ${t.title}`}
                className={`p-3.5 rounded-2xl border transition-all active:scale-[0.99] select-none cursor-pointer ${
                  t.done
                    ? 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] opacity-60'
                    : 'bg-[var(--mos-surface)] border-[var(--mos-surface-border)] hover:border-[var(--mos-surface-border-strong)] shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox button - strictly isolated to toggle done */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskDone(t.id, !t.done);
                    }}
                    className="mt-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform p-0.5 shrink-0"
                    aria-label={t.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                  >
                    {t.done ? (
                      <CheckSquare
                        className={`w-5 h-5 fill-emerald-400/20 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                      />
                    ) : (
                      <Square className="w-5 h-5 text-[var(--mos-text-muted)]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Top Row: Code, Space pill & Priority */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1 text-[10px]">
                      <span className={`font-mono font-bold ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
                        {taskCode}
                      </span>

                      {t.conversationName && scopeFilter !== 'channel' && (
                        <span className="px-1.5 py-0.2 rounded bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] truncate max-w-[120px]">
                          {t.conversationName}
                        </span>
                      )}

                      {/* Priority Tag */}
                      {t.priority === 'URGENT' && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold bg-rose-500/20 border border-rose-500/30 ${
                            isDark ? 'text-rose-400' : 'text-rose-700'
                          }`}
                        >
                          P0 Khẩn cấp
                        </span>
                      )}
                      {t.priority === 'HIGH' && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold bg-amber-500/20 border border-amber-500/30 ${
                            isDark ? 'text-amber-400' : 'text-amber-800'
                          }`}
                        >
                          P1 Ưu tiên
                        </span>
                      )}

                      {/* Negotiation Pending Tag */}
                      {hasNegotiation && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold bg-amber-500/20 border border-amber-500/40 flex items-center gap-1 ${
                            isDark ? 'text-amber-300' : 'text-amber-800'
                          }`}
                        >
                          <Handshake className="w-2.5 h-2.5" />
                          <span>Xin dời hạn</span>
                        </span>
                      )}

                      {/* Mission Linked Tag */}
                      {t.mission && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold bg-purple-500/20 border border-purple-500/30 flex items-center gap-1 ${
                            isDark ? 'text-purple-300' : 'text-purple-700'
                          }`}
                        >
                          <Rocket className="w-2.5 h-2.5" />
                          <span>#{t.mission.missionKey}</span>
                        </span>
                      )}

                      {/* Gate 2: Duyệt Commit Badge */}
                      {isMissionAwaitingCommit && (
                        <span className="px-1.5 py-0.2 rounded font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm shadow-amber-500/30 animate-pulse">
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Duyệt Commit</span>
                        </span>
                      )}

                      {/* Gate 3: Duyệt Deploy Badge */}
                      {isMissionAwaitingDeploy && (
                        <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm shadow-emerald-500/30 animate-pulse">
                          <Rocket className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Duyệt Deploy</span>
                        </span>
                      )}

                      {/* Awaiting Acceptance Badge */}
                      {isMissionAwaitingAccept && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold bg-sky-500/20 border border-sky-500/30 flex items-center gap-1 ${
                            isDark ? 'text-sky-300' : 'text-sky-700'
                          }`}
                        >
                          <span>Chờ nghiệm thu</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className={`text-sm font-medium leading-snug line-clamp-2 break-words ${
                        t.done ? 'line-through text-[var(--mos-text-muted)]' : 'text-[var(--mos-text)]'
                      }`}
                    >
                      {t.title}
                    </p>

                    {/* Due date if present */}
                    {deadline && (
                      <div className="flex items-center gap-1 mt-2 text-[11px] font-medium tabular-nums">
                        <Clock
                          className={`w-3 h-3 shrink-0 ${
                            isOverdue
                              ? isDark
                                ? 'text-rose-400'
                                : 'text-rose-600'
                              : 'text-[var(--mos-text-muted)]'
                          }`}
                        />
                        <span
                          className={
                            isOverdue
                              ? `${isDark ? 'text-rose-400' : 'text-rose-600'} font-bold`
                              : 'text-[var(--mos-text-muted)]'
                          }
                        >
                          {dayjs(deadline).format('HH:mm DD/MM')}
                        </span>
                        {isOverdue && !t.done && (
                          <span
                            className={`text-[10px] font-bold bg-rose-500/15 px-1 py-0.2 rounded border border-rose-500/30 ${
                              isDark ? 'text-rose-400' : 'text-rose-600'
                            }`}
                          >
                            Quá hạn
                          </span>
                        )}
                      </div>
                    )}

                    {/* 3 Cột trên 1 dòng: Người tạo · Người giao · Người nhận (Minimalist, Avatar & Icon là chính) */}
                    <div className="grid grid-cols-3 divide-x divide-[var(--mos-surface-border)] items-center mt-2 pt-2 border-t border-[var(--mos-surface-border)] text-[11px]">
                      {/* Cột 1: Người tạo */}
                      <div className="flex items-center gap-1 min-w-0 pr-1" title={`Người tạo: ${creator}`}>
                        <PenLine className={`w-2.5 h-2.5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <MosChatAvatar size="xs" name={creator} staffDirectory={staffDirectory} />
                        <span className="truncate text-[11px] text-[var(--mos-text)]">{creator}</span>
                      </div>

                      {/* Cột 2: Người giao */}
                      <div className="flex items-center gap-1 min-w-0 px-1" title={`Người giao: ${assigner}`}>
                        <Send className={`w-2.5 h-2.5 shrink-0 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                        <MosChatAvatar size="xs" name={assigner} staffDirectory={staffDirectory} />
                        <span className="truncate text-[11px] text-[var(--mos-text)]">{assigner}</span>
                      </div>

                      {/* Cột 3: Người nhận */}
                      <div className="flex items-center gap-1 min-w-0 pl-1" title={`Người nhận: ${assignee}`}>
                        <UserCheck className={`w-2.5 h-2.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        <MosChatAvatar
                          size="xs"
                          name={assignee}
                          staffId={t.assigneeId}
                          staffDirectory={staffDirectory}
                        />
                        <span
                          className={`truncate text-[11px] font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}
                        >
                          {assignee}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
