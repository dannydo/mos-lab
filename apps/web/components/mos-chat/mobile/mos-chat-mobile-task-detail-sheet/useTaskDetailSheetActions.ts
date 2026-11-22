'use client';

import { useState } from 'react';
import { message as antdMessage } from 'antd';
import type { MosChatMissionActionType, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import { useMosChat } from '../../context/MosChatContext';
import { useTheme } from '../../../../context/ThemeContext';
import {
  formatTaskCode,
  getMissionActionToastNotice,
  isStrictSuperAdminUser,
  resolveMissionPermissions,
  resolveMyDisplayName,
  resolveTaskDeadlineState,
} from './taskDetailHelpers';

interface UseTaskDetailSheetActionsParams {
  task: MosChatTaskItem | null;
  onClose: () => void;
}

/**
 * Encapsulates theme, permissions, derived task state, and action handlers for MosChatMobileTaskDetailSheet.
 */
export function useTaskDetailSheetActions({ task, onClose }: UseTaskDetailSheetActionsParams) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
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

  const myName = resolveMyDisplayName(currentUser);
  const isStrictDannySuperAdmin = isStrictSuperAdminUser(currentUser);
  const isCreator = Boolean(task?.creatorName && task.creatorName === myName);
  const canApproveNegotiation = isCreator || isStrictDannySuperAdmin;
  const hasNegotiation = Boolean(task?.negotiatedDeadline);

  const deadlineState = task
    ? resolveTaskDeadlineState(task)
    : { deadlineDate: null, isOverdue: false, isDueSoon: false };
  const taskCode = task ? formatTaskCode(task.id) : '';
  const mission = task?.mission ?? null;
  const missionPermissions = resolveMissionPermissions(mission);

  const handleToggleDone = async () => {
    if (!task) return;
    await toggleTaskDone(task.id, !task.done);
  };

  const handleToggleArchive = async () => {
    if (!task) return;
    await updateTask(task.id, { archived: !task.archived });
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    onClose();
  };

  const handleAcceptNegotiation = async () => {
    if (!task) return;
    await acceptNegotiatedDeadline(task);
  };

  const handleRejectNegotiation = async () => {
    if (!task) return;
    await rejectNegotiatedDeadline(task);
  };

  const handleExecuteMissionAction = async (action: MosChatMissionActionType, feedback?: string) => {
    if (!mission) return;
    setActionLoading(action);
    try {
      await executeMissionAction(mission, action, feedback);
      const notice = getMissionActionToastNotice(action, mission.missionKey);
      if (notice) {
        if (notice.level === 'success') {
          antdMessage.success(notice.message);
        } else {
          antdMessage.info(notice.message);
        }
        if (notice.resetsReopenForm) {
          setIsReopenOpen(false);
          setReopenFeedback('');
        }
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện');
    } finally {
      setActionLoading(null);
    }
  };

  return {
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
  };
}
