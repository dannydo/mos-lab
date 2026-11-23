'use client';

import { useState, useMemo } from 'react';
import { message as antdMessage } from 'antd';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionActionType,
  MosChatTaskItem,
  SafeAny,
} from '@mos-lab/shared';
import { resolveMissionActionFlags } from '../missions/mission-action-flags';

export interface UseChatThreadMissionStateParams {
  activeConversation: MosChatConversation | null;
  activeThreadMsg: MosChatMessage | null;
  tasks: MosChatTaskItem[];
  currentUser: SafeAny;
  executeMissionAction?: (
    mission: NonNullable<MosChatMessage['mission']>,
    action: MosChatMissionActionType,
    feedback?: string
  ) => Promise<void>;
}

export function useChatThreadMissionState({
  activeConversation,
  activeThreadMsg,
  tasks,
  currentUser,
  executeMissionAction,
}: UseChatThreadMissionStateParams) {
  const liveThreadMsg = useMemo(() => {
    if (!activeThreadMsg) return null;
    const found = activeConversation?.messages?.find((m) => m.id === activeThreadMsg.id);
    return found || activeThreadMsg;
  }, [activeConversation, activeThreadMsg]);

  const linkedTask = useMemo(() => {
    if (!liveThreadMsg) return null;
    return (
      (tasks || []).find(
        (t) => t.sourceMessageId === liveThreadMsg.id || (liveThreadMsg.taskId && t.id === liveThreadMsg.taskId)
      ) || null
    );
  }, [tasks, liveThreadMsg]);

  const mission = useMemo(() => {
    return liveThreadMsg?.mission || linkedTask?.mission || null;
  }, [liveThreadMsg, linkedTask]);

  const isStrictDannySuperAdmin = useMemo(() => {
    const username = (currentUser?.username || '').toLowerCase().trim();
    const email = (currentUser?.email || '').toLowerCase().trim();
    const displayName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();
    const role = (currentUser?.role || '').toLowerCase().trim();
    const id = Number(currentUser?.id) || 0;
    return (
      username === 'dannydo' ||
      email.includes('danhdo') ||
      displayName.includes('danny') ||
      (role === 'admin' && id === 1) ||
      role === 'super_admin'
    );
  }, [currentUser]);

  const {
    canApproveImplementation,
    canSuperAdminApproveCommit,
    canSuperAdminApproveDeploy,
    canReporterAccept,
    canRequestUpgradeOrRework,
  } = resolveMissionActionFlags(mission);

  const hasAnyPendingAction = Boolean(
    (isStrictDannySuperAdmin &&
      (canApproveImplementation || canSuperAdminApproveCommit || canSuperAdminApproveDeploy)) ||
    canReporterAccept
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isReopenOpen, setIsReopenOpen] = useState<boolean>(false);
  const [reopenFeedback, setReopenFeedback] = useState<string>('');

  const handleExecuteMissionAction = async (action: MosChatMissionActionType, feedback?: string) => {
    if (!mission || !executeMissionAction) return;
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

  return {
    liveThreadMsg,
    linkedTask,
    mission,
    isStrictDannySuperAdmin,
    canApproveImplementation,
    canSuperAdminApproveCommit,
    canSuperAdminApproveDeploy,
    canReporterAccept,
    canRequestUpgradeOrRework,
    hasAnyPendingAction,
    actionLoading,
    isReopenOpen,
    setIsReopenOpen,
    reopenFeedback,
    setReopenFeedback,
    handleExecuteMissionAction,
  };
}
