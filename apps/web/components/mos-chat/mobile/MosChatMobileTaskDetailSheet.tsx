'use client';

import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Rocket,
  Handshake,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Hash,
  Loader2,
  RotateCcw,
  ExternalLink,
  Check,
  PenLine,
  Send,
  UserCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import type { MosChatTaskItem, MosChatMissionActionType, SafeAny } from '@mos-lab/shared';
import { isCanonicalSuperAdminIdentity, isCvRole, isSuperAdminRole } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { Popconfirm, message as antdMessage } from 'antd';
import { MosChatAvatar } from '../MosChatAvatar';

dayjs.extend(relativeTime);
dayjs.locale('vi');

export interface MosChatMobileTaskDetailSheetProps {
  task: MosChatTaskItem | null;
  open: boolean;
  onClose: () => void;
  onEditTask: (task: MosChatTaskItem) => void;
  onNegotiateDeadline: (task: MosChatTaskItem) => void;
  onDispatchMission: (task: MosChatTaskItem) => void;
  onGoToSourceMessage?: (task: MosChatTaskItem) => void;
}

export const MosChatMobileTaskDetailSheet: React.FC<MosChatMobileTaskDetailSheetProps> = ({
  task,
  open,
  onClose,
  onEditTask,
  onNegotiateDeadline,
  onDispatchMission,
  onGoToSourceMessage,
}) => {
  const {
    currentUser,
    toggleTaskDone,
    updateTask,
    deleteTask,
    acceptNegotiatedDeadline,
    rejectNegotiatedDeadline,
    executeMissionAction,
    staffDirectory,
  } = useMosChat();

  const [actionLoading, setActionLoading] = useState<MosChatMissionActionType | null>(null);
  const [isReopenOpen, setIsReopenOpen] = useState<boolean>(false);
  const [reopenFeedback, setReopenFeedback] = useState<string>('');

  if (!open || !task) return null;

  const myName =
    currentUser?.displayName || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Danny Do';

  const isStrictDannySuperAdmin = Boolean(
    (isSuperAdminRole(currentUser?.role) && isCanonicalSuperAdminIdentity(currentUser)) ||
    isCanonicalSuperAdminIdentity(currentUser) ||
    Number(currentUser?.id) === 1
  );

  const isCreator = Boolean(task.creatorName && task.creatorName === myName);
  const canApproveNegotiation = isCreator || isStrictDannySuperAdmin;
  const hasNegotiation = Boolean(task.negotiatedDeadline);

  const deadlineDate = task.dueAt || task.deadline;
  const isOverdue = deadlineDate && !task.done && dayjs(deadlineDate).isBefore(dayjs());
  const isDueSoon = deadlineDate && !task.done && !isOverdue && dayjs(deadlineDate).diff(dayjs(), 'hour') <= 24;

  const taskCode = `#TASK-${task.id
    .replace(/^task_/, '')
    .slice(-6)
    .toUpperCase()}`;

  const formatCountdown = (dateStr: string) => {
    const diffHours = dayjs(dateStr).diff(dayjs(), 'hour');
    const diffDays = dayjs(dateStr).diff(dayjs(), 'day');
    if (dayjs(dateStr).isBefore(dayjs())) {
      const pastHours = Math.abs(diffHours);
      if (pastHours < 24) return `Quá hạn ${pastHours} giờ`;
      return `Quá hạn ${Math.abs(diffDays)} ngày`;
    }
    if (diffHours < 24) return `Còn ${diffHours} giờ`;
    return `Còn ${diffDays} ngày`;
  };

  const handleToggleArchive = async () => {
    const nextArchived = !task.archived;
    await updateTask(task.id, { archived: nextArchived });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  const handleAcceptNegotiation = async () => {
    await acceptNegotiatedDeadline(task);
  };

  const handleRejectNegotiation = async () => {
    await rejectNegotiatedDeadline(task);
  };

  const mission = task.mission;

  const canApproveImplementation = Boolean(
    mission &&
    (mission.superAdminActions?.canApproveImplementation ||
      mission.status === 'NEW' ||
      (mission.status === 'APPROVED' && !mission.superAdminActions?.activeJobId))
  );

  const canSuperAdminApproveCommit = Boolean(
    mission &&
    (mission.canSuperAdminApproveCommit ||
      mission.superAdminActions?.canApproveCommit ||
      mission.status === 'AWAITING_DANNY_COMMIT_REVIEW' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_COMMIT_REVIEW')
  );

  const canSuperAdminApproveDeploy = Boolean(
    mission &&
    (mission.canSuperAdminApproveDeploy ||
      mission.superAdminActions?.canApproveDeploy ||
      mission.status === 'AWAITING_DANNY_DEPLOY_APPROVAL' ||
      mission.superAdminActions?.executionPhase === 'AWAITING_DEPLOY_REVIEW')
  );

  const canReporterAccept = Boolean(
    mission &&
    (mission.canReporterAccept ||
      mission.reporterActions?.canAcceptOrReopen ||
      mission.status === 'FIXED' ||
      mission.status === 'AWAITING_REPORTER_ACCEPTANCE')
  );

  const canRequestUpgradeOrRework = Boolean(
    mission && (canReporterAccept || mission.stage === 'COMPLETED' || mission.status === 'CLOSED')
  );

  const handleExecuteMissionAction = async (action: MosChatMissionActionType, feedback?: string) => {
    if (!mission) return;
    setActionLoading(action);
    try {
      await executeMissionAction(mission, action, feedback);
      if (action === 'APPROVE_COMMIT') {
        antdMessage.success(`✅ Đã duyệt Commit (Cổng 2) cho #${mission.missionKey}!`);
      } else if (action === 'APPROVE_DEPLOY') {
        antdMessage.success(`🚀 Đã duyệt Deploy lên Web (Cổng 3) cho #${mission.missionKey}!`);
      } else if (action === 'APPROVE_IMPLEMENTATION') {
        antdMessage.success(`🚀 Đã duyệt Cổng 1 mOS Mission #${mission.missionKey}!`);
      } else if (action === 'REPORTER_ACCEPT') {
        antdMessage.success(`🎉 Đã nghiệm thu hoàn tất #${mission.missionKey}!`);
      } else if (action === 'REPORTER_REOPEN') {
        antdMessage.info(`🔄 Đã gửi yêu cầu chỉnh sửa tiếp cho #${mission.missionKey}!`);
        setIsReopenOpen(false);
        setReopenFeedback('');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200">
      {/* Background dismissal overlay */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Đóng bảng chi tiết công việc"
        role="button"
        tabIndex={0}
      />

      {/* iOS Bottom Sheet Container */}
      <div
        className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden select-none animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết công việc mOS"
      >
        {/* Drag handle pill */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700/80" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
              <Hash className="w-3 h-3 text-amber-500" />
              <span>{taskCode}</span>
            </span>

            {task.conversationName && (
              <span className="text-[11px] font-medium text-slate-400 truncate max-w-[140px]">
                {task.conversationName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Priority Badge */}
            {task.priority === 'URGENT' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                P0 · Khẩn cấp
              </span>
            )}
            {task.priority === 'HIGH' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                P1 · Ưu tiên cao
              </span>
            )}
            {(!task.priority || task.priority === 'NORMAL') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                P2 · Bình thường
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 active:scale-95 transition-transform"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {/* Status & Completion Banner */}
          <div
            onClick={() => toggleTaskDone(task.id, !task.done)}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors active:scale-[0.99] ${
              task.done
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {task.done ? (
                <CheckSquare className="w-6 h-6 text-emerald-400 fill-emerald-400/20 shrink-0" />
              ) : (
                <Square className="w-6 h-6 text-slate-400 shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold">{task.done ? 'Đã hoàn thành công việc' : 'Đang thực hiện'}</p>
                <p className="text-[11px] text-slate-400">
                  {task.done ? 'Chạm vào đây để mở lại công việc' : 'Chạm vào đây để đánh dấu hoàn thành'}
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                task.done
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isOverdue
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : isDueSoon
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {task.done ? 'Hoàn thành' : isOverdue ? 'Quá hạn' : isDueSoon ? 'Sắp đến hạn' : 'Đang làm'}
            </span>
          </div>

          {/* Task Title */}
          <div>
            <h3
              className={`text-base font-bold leading-relaxed break-words ${
                task.done ? 'line-through text-slate-400' : 'text-white'
              }`}
            >
              {task.title}
            </h3>
          </div>

          {/* Metadata Grid */}
          {(() => {
            const creator = task.sourceAuthorName || task.creatorName || 'Hệ thống';
            const assigner = task.assignerName || task.creatorName || task.sourceAuthorName || 'Hệ thống';
            const assignee = task.assigneeName || 'Chính tôi';

            return (
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs">
                {/* Người tạo */}
                <div className="space-y-1 min-w-0" title={`Người tạo: ${creator}`}>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    <PenLine className="w-2.5 h-2.5 shrink-0" />
                    <span>Người tạo</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-200 font-medium min-w-0">
                    <MosChatAvatar size="xs" name={creator} staffDirectory={staffDirectory} />
                    <span className="truncate text-[11px]">{creator}</span>
                  </div>
                </div>

                {/* Người giao (Giao bởi) */}
                <div className="space-y-1 min-w-0" title={`Người giao: ${assigner}`}>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                    <Send className="w-2.5 h-2.5 shrink-0" />
                    <span>Giao bởi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-200 font-medium min-w-0">
                    <MosChatAvatar size="xs" name={assigner} staffDirectory={staffDirectory} />
                    <span className="truncate text-[11px]">{assigner}</span>
                  </div>
                </div>

                {/* Người nhận */}
                <div className="space-y-1 min-w-0" title={`Người nhận: ${assignee}`}>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    <UserCheck className="w-2.5 h-2.5 shrink-0" />
                    <span>Người nhận</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-200 font-medium min-w-0">
                    <MosChatAvatar
                      size="xs"
                      name={assignee}
                      staffId={task.assigneeId}
                      staffDirectory={staffDirectory}
                    />
                    <span className="truncate text-[11px] text-amber-300">{assignee}</span>
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-1 col-span-3 pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Hạn hoàn thành (Deadline)
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium tabular-nums">
                      <Clock
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{deadlineDate ? dayjs(deadlineDate).format('HH:mm DD/MM/YYYY') : 'Không giới hạn'}</span>
                    </div>
                    {deadlineDate && !task.done && (
                      <span
                        className={`text-[11px] font-bold ${
                          isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        ({formatCountdown(deadlineDate)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Created At */}
                <div className="space-y-1 col-span-3 pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Ngày tạo việc
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{dayjs(task.createdAt).format('HH:mm DD/MM/YYYY')}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Negotiation Banner if requested */}
          {hasNegotiation && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Handshake className="w-4 h-4 shrink-0" />
                <span>Yêu cầu thương lượng dời hạn chót</span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-slate-300">
                  <span className="text-slate-400">Đề xuất hạn mới:</span>{' '}
                  <strong className="text-amber-300 tabular-nums font-bold">
                    {dayjs(task.negotiatedDeadline).format('HH:mm DD/MM/YYYY')}
                  </strong>{' '}
                  <span className="text-[11px] text-slate-400">({formatCountdown(task.negotiatedDeadline!)})</span>
                </p>

                {task.negotiationNote && (
                  <p className="text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800 italic text-[11px]">
                    &ldquo;{task.negotiationNote}&rdquo;
                  </p>
                )}

                <p className="text-[10px] text-slate-400">
                  Gửi bởi <strong className="text-slate-300">{task.negotiatedBy || 'Người nhận'}</strong>
                  {task.negotiatedAt && <span> vào lúc {dayjs(task.negotiatedAt).format('HH:mm DD/MM')}</span>}
                </p>
              </div>

              {/* Action buttons for creator / Super Admin */}
              {canApproveNegotiation ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAcceptNegotiation}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Duyệt dời hạn</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRejectNegotiation}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-amber-400/90 font-medium">
                  ⏳ Đang chờ người giao việc ({task.creatorName || 'người tạo'}) phê duyệt đề xuất này.
                </p>
              )}
            </div>
          )}

          {/* mOS Mission Card & Gate Controls (if linked) */}
          {mission && !isCvRole(currentUser?.role) && (
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2.5">
              {/* Top Row: Mission Key, Type, Stage Badge, Link */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-bold text-purple-300">
                    <Rocket className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>mOS Mission #{mission.missionKey}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {mission.requestType || 'FEATURE'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    {mission.stageLabel || mission.humanBadge || mission.status}
                  </span>
                  <a
                    href={`/dashboard/bug-reports?reportId=${mission.reportId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-purple-300 hover:text-white bg-purple-900/40 border border-purple-500/30"
                    aria-label="Xem chi tiết trên mOS Mission"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Title */}
              <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{mission.title}</p>

              {/* 4-Step Progress Bar */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { idx: 1, label: '1. Tiếp nhận' },
                  { idx: 2, label: '2. Đang xử lý' },
                  { idx: 3, label: '3. Nghiệm thu' },
                  { idx: 4, label: '4. Hoàn tất' },
                ].map((s) => {
                  const active = (mission.stepIndex || 1) >= s.idx;
                  const current = (mission.stepIndex || 1) === s.idx;
                  return (
                    <div key={s.idx} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          active ? 'bg-purple-500' : 'bg-slate-800'
                        } ${current ? 'ring-2 ring-purple-400/60 shadow-sm shadow-purple-500/50' : ''}`}
                      />
                      <div
                        className={`text-[9.5px] truncate font-medium ${
                          active ? 'text-purple-300 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Human Explanation Box */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                {mission.humanStatusSummary ||
                  mission.humanSummary ||
                  'Nhiệm vụ đang được triển khai trên hệ thống mOS Mission.'}
              </div>

              {/* Super Admin Inline Gate Controls (Cổng 1, Cổng 2, Cổng 3) */}
              {isStrictDannySuperAdmin && (
                <div className="space-y-2 pt-1">
                  {/* Gate 1: Approve Implementation */}
                  {canApproveImplementation && (
                    <button
                      type="button"
                      disabled={actionLoading === 'APPROVE_IMPLEMENTATION'}
                      onClick={() => handleExecuteMissionAction('APPROVE_IMPLEMENTATION')}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40 active:scale-98 transition-transform disabled:opacity-50"
                    >
                      {actionLoading === 'APPROVE_IMPLEMENTATION' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
                    </button>
                  )}

                  {/* Gate 2: Approve Commit */}
                  {canSuperAdminApproveCommit && (
                    <button
                      type="button"
                      disabled={actionLoading === 'APPROVE_COMMIT'}
                      onClick={() => handleExecuteMissionAction('APPROVE_COMMIT')}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform disabled:opacity-50"
                    >
                      {actionLoading === 'APPROVE_COMMIT' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                      )}
                      <span>✅ Duyệt Commit (Cổng 2)</span>
                    </button>
                  )}

                  {/* Gate 3: Approve Deploy */}
                  {canSuperAdminApproveDeploy && (
                    <button
                      type="button"
                      disabled={actionLoading === 'APPROVE_DEPLOY'}
                      onClick={() => handleExecuteMissionAction('APPROVE_DEPLOY')}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-98 transition-transform disabled:opacity-50"
                    >
                      {actionLoading === 'APPROVE_DEPLOY' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Rocket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                      )}
                      <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Reporter & Staff Acceptance & Rework Controls */}
              {canReporterAccept && (
                <button
                  type="button"
                  disabled={actionLoading === 'REPORTER_ACCEPT'}
                  onClick={() => handleExecuteMissionAction('REPORTER_ACCEPT')}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-transform disabled:opacity-50"
                >
                  {actionLoading === 'REPORTER_ACCEPT' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>🎉 Đã đúng ý (Nghiệm thu hoàn tất)</span>
                </button>
              )}

              {canRequestUpgradeOrRework && (
                <div className="pt-1">
                  {!isReopenOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsReopenOpen(true)}
                      className="w-full py-1.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>🔄 Yêu cầu chỉnh sửa thêm / Nâng cấp tiếp</span>
                    </button>
                  ) : (
                    <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <label className="text-[11px] font-semibold text-slate-300 block">
                        Nội dung cần chỉnh thêm hoặc nâng cấp:
                      </label>
                      <textarea
                        rows={2}
                        value={reopenFeedback}
                        onChange={(e) => setReopenFeedback(e.target.value)}
                        placeholder="Nhập chi tiết cần chỉnh sửa..."
                        className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoading === 'REPORTER_REOPEN' || !reopenFeedback.trim()}
                          onClick={() => handleExecuteMissionAction('REPORTER_REOPEN', reopenFeedback.trim())}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
                        >
                          Gửi yêu cầu
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsReopenOpen(false)}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium active:scale-95 transition-transform"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {/* Super Admin Danny: Dispatch to mOS Mission (Điều răn UI-009) */}
            {isStrictDannySuperAdmin && !task.mission && (
              <button
                type="button"
                onClick={() => onDispatchMission(task)}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 active:scale-98 transition-transform"
              >
                <Rocket className="w-4 h-4" />
                <span>Chuyển vào mOS Mission (Super Admin Danny)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {/* Negotiate deadline button */}
              <button
                type="button"
                onClick={() => onNegotiateDeadline(task)}
                className="py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>{hasNegotiation ? 'Sửa đề xuất hạn' : 'Xin dời hạn'}</span>
              </button>

              {/* Edit task button */}
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Chỉnh sửa</span>
              </button>
            </div>

            {/* Jump to source message if available */}
            {task.sourceMessageId && onGoToSourceMessage && (
              <button
                type="button"
                onClick={() => onGoToSourceMessage(task)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mở luồng tin nhắn gốc</span>
              </button>
            )}

            {/* Secondary actions: Archive & Delete */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleToggleArchive}
                className="py-1.5 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {task.archived ? (
                  <>
                    <ArchiveRestore className="w-3.5 h-3.5 text-blue-400" />
                    <span>Khôi phục việc</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lưu trữ việc</span>
                  </>
                )}
              </button>

              <Popconfirm
                title="Xoá công việc này?"
                description="Bạn có chắc chắn muốn xoá vĩnh viễn công việc này không?"
                onConfirm={handleDelete}
                okText="Xoá"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <button
                  type="button"
                  className="py-1.5 px-3 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá việc</span>
                </button>
              </Popconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
