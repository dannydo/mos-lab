'use client';

import React from 'react';
import { isCvRole } from '@mos-lab/shared';
import { MosChatTaskInlineChecklist } from '../components/MosChatTaskInlineChecklist';
import type { MosChatMobileTaskDetailSheetProps } from './mos-chat-mobile-task-detail-sheet/taskDetailTypes';
import { useTaskDetailSheetActions } from './mos-chat-mobile-task-detail-sheet/useTaskDetailSheetActions';
import { TaskDetailSheetHeader } from './mos-chat-mobile-task-detail-sheet/TaskDetailSheetHeader';
import { TaskDetailOverviewSection } from './mos-chat-mobile-task-detail-sheet/TaskDetailOverviewSection';
import { TaskDetailNegotiationBanner } from './mos-chat-mobile-task-detail-sheet/TaskDetailNegotiationBanner';
import { TaskDetailMissionSection } from './mos-chat-mobile-task-detail-sheet/TaskDetailMissionSection';
import { TaskDetailActionFooter } from './mos-chat-mobile-task-detail-sheet/TaskDetailActionFooter';

export type { MosChatMobileTaskDetailSheetProps } from './mos-chat-mobile-task-detail-sheet/taskDetailTypes';

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
    isDark,
    currentUser,
    staffDirectory,
    updateTask,
    isStrictDannySuperAdmin,
    canApproveNegotiation,
    hasNegotiation,
    deadlineState,
    taskCode,
    mission,
    missionPermissions,
    actionLoading,
    isReopenOpen,
    setIsReopenOpen,
    reopenFeedback,
    setReopenFeedback,
    handleToggleDone,
    handleToggleArchive,
    handleDelete,
    handleAcceptNegotiation,
    handleRejectNegotiation,
    handleExecuteMissionAction,
  } = useTaskDetailSheetActions({ task, onClose });

  if (!open || !task) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm transition-opacity duration-200 ${
        isDark ? 'bg-black/70' : 'bg-slate-900/45'
      }`}
    >
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
        className="relative w-full max-w-lg bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border-t border-[var(--mos-surface-border)] rounded-t-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden select-none animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết công việc mOS"
      >
        <TaskDetailSheetHeader
          taskCode={taskCode}
          conversationName={task.conversationName}
          priority={task.priority}
          isDark={isDark}
          onClose={onClose}
        />

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <TaskDetailOverviewSection
            task={task}
            deadlineState={deadlineState}
            staffDirectory={staffDirectory}
            isDark={isDark}
            onToggleDone={() => void handleToggleDone()}
          />

          {/* Inline Checklist & Auto-Summarizer */}
          <MosChatTaskInlineChecklist
            task={task}
            onUpdateTask={updateTask}
            isDark={isDark}
            staffList={staffDirectory || []}
          />

          {/* Negotiation Banner if requested */}
          {hasNegotiation && (
            <TaskDetailNegotiationBanner
              task={task}
              isDark={isDark}
              canApproveNegotiation={canApproveNegotiation}
              onAccept={() => void handleAcceptNegotiation()}
              onReject={() => void handleRejectNegotiation()}
            />
          )}

          {/* mOS Mission Card & Gate Controls (if linked) */}
          {mission && !isCvRole(currentUser?.role) && (
            <TaskDetailMissionSection
              mission={mission}
              permissions={missionPermissions}
              isDark={isDark}
              isStrictDannySuperAdmin={isStrictDannySuperAdmin}
              actionLoading={actionLoading}
              isReopenOpen={isReopenOpen}
              setIsReopenOpen={setIsReopenOpen}
              reopenFeedback={reopenFeedback}
              setReopenFeedback={setReopenFeedback}
              onExecuteMissionAction={handleExecuteMissionAction}
            />
          )}

          {/* Primary & Secondary Action Buttons */}
          <TaskDetailActionFooter
            task={task}
            isDark={isDark}
            isStrictDannySuperAdmin={isStrictDannySuperAdmin}
            hasNegotiation={hasNegotiation}
            onDispatchMission={onDispatchMission}
            onNegotiateDeadline={onNegotiateDeadline}
            onEditTask={onEditTask}
            onGoToSourceMessage={onGoToSourceMessage}
            onToggleArchive={() => void handleToggleArchive()}
            onDelete={() => void handleDelete()}
          />
        </div>
      </div>
    </div>
  );
};
