'use client';

import React, { useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionActionType,
  MosChatMissionSummary,
  MosChatTaskItem,
} from '@mos-lab/shared';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface UsePortalMissionActionsParams {
  isStrictDannySuperAdmin: boolean;
  aiSessionId: string | null;
  conversations: MosChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setAiMessages: React.Dispatch<React.SetStateAction<MosChatMessage[]>>;
  activeConversation?: MosChatConversation;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  selectConversation: (convId: string) => void;
  handleOpenThread: (msgId: string, convIdOverride?: string, options?: { autoFocus?: boolean }) => void;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

/**
 * Manages dispatching Chat messages/tasks into mOS Mission and executing inline Gate 1/2/3/Reporter actions.
 */
export function usePortalMissionActions({
  isStrictDannySuperAdmin,
  aiSessionId,
  conversations,
  setConversations,
  setAiMessages,
  activeConversation,
  setTasks,
  selectConversation,
  handleOpenThread,
  notifyLivePeers,
  antdMessage,
}: UsePortalMissionActionsParams) {
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [missionSourceMsg, setMissionSourceMsg] = useState<MosChatMessage | null>(null);
  const [missionSourceTask, setMissionSourceTask] = useState<MosChatTaskItem | null>(null);
  const [missionSourceConvId, setMissionSourceConvId] = useState<string>('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionType, setMissionType] = useState<'BUG' | 'FEATURE'>('FEATURE');
  const [missionNote, setMissionNote] = useState('');
  const [isDispatchingMission, setIsDispatchingMission] = useState(false);
  const [missionActionLoadingKey, setMissionActionLoadingKey] = useState<string | null>(null);
  const [missionReopenInputOpenByReportId, setMissionReopenInputOpenByReportId] = useState<Record<number, boolean>>({});
  const [missionReopenFeedbackByReportId, setMissionReopenFeedbackByReportId] = useState<Record<number, string>>({});

  const openMissionModalFromChat = (
    msg: MosChatMessage | null,
    task?: MosChatTaskItem | null,
    convIdOverride?: string
  ) => {
    if (!isStrictDannySuperAdmin) {
      return;
    }

    const targetConvId = convIdOverride || task?.conversationId || msg?.conversationId || activeConversation?.id || '';
    const targetConv = conversations.find((c) => c.id === targetConvId) || activeConversation;
    const resolvedMsg =
      msg ||
      (task?.sourceMessageId ? targetConv?.messages.find((m) => m.id === task.sourceMessageId) || null : null) ||
      (task ? targetConv?.messages.find((m) => m.taskId === task.id) || null : null);

    const existingMission = resolvedMsg?.mission || task?.mission;
    if (existingMission && resolvedMsg) {
      if (targetConvId && targetConvId !== activeConversation?.id) {
        selectConversation(targetConvId);
      }
      handleOpenThread(resolvedMsg.id);
      return;
    }

    const baseRaw = String(task?.title || resolvedMsg?.text || '').trim();
    const firstLine = (baseRaw.split('\n')[0] || 'Yêu cầu từ mOS Chat').trim().slice(0, 140);
    const lowerAll = `${baseRaw} ${(resolvedMsg?.thread || []).map((r) => r.text).join(' ')}`.toLowerCase();
    const isLikelyBug = /(lỗi|sai|hư|không bấm|không chạy|trắng trang|crash|500|404)/i.test(lowerAll);

    setMissionSourceMsg(resolvedMsg);
    setMissionSourceTask(task || null);
    setMissionSourceConvId(targetConvId);
    setMissionTitle(firstLine || 'Nâng cấp tính năng từ mOS Chat');
    setMissionType(isLikelyBug ? 'BUG' : 'FEATURE');
    setMissionNote('');
    setMissionModalOpen(true);
  };

  const handleConfirmDispatchMission = async () => {
    if (!isStrictDannySuperAdmin) {
      antdMessage.error('Chỉ Super Admin Danny mới có quyền gửi công việc vào mOS Mission.');
      return;
    }

    const convId = missionSourceConvId || activeConversation?.id || '';
    const msgId = missionSourceMsg?.id || missionSourceTask?.sourceMessageId || '';
    if (!convId || !msgId) {
      antdMessage.warning('Không tìm thấy tin nhắn gốc để đóng gói ngữ cảnh chuyển vào mOS Mission.');
      return;
    }

    setIsDispatchingMission(true);
    try {
      const res = await apiClient.chat.createMission({
        conversationId: convId,
        messageId: msgId,
        taskId: missionSourceTask?.id || missionSourceMsg?.taskId || null,
        title: missionTitle.trim() || undefined,
        type: missionType,
        note: missionNote.trim() || undefined,
        pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
        sourceMessage: missionSourceMsg || undefined,
        aiSessionId: convId === AI_COPILOT_CONV_ID ? aiSessionId : undefined,
      });

      if (res?.mission) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === msgId ? res.message || { ...m, mission: res.mission } : m)),
            };
          })
        );
        if (convId === AI_COPILOT_CONV_ID) {
          setAiMessages((prev) =>
            prev.map((m) => (m.id === msgId ? res.message || { ...m, mission: res.mission } : m))
          );
        }
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task?.id ? res.task : t)));
        }
        setMissionModalOpen(false);
        if (convId !== activeConversation?.id) {
          selectConversation(convId);
        }
        handleOpenThread(msgId);
        notifyLivePeers();
        antdMessage.success(
          `🚀 Đã chuyển vào mOS Mission #${res.mission.missionKey} (${res.mission.missionCode}) & duyệt Cổng 1!`
        );
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển nhiệm vụ sang mOS Mission.');
    } finally {
      setIsDispatchingMission(false);
    }
  };

  const handleMissionInlineAction = async (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => {
    const loadingKey = `${mission.reportId}:${action}`;
    setMissionActionLoadingKey(loadingKey);
    try {
      const res = await apiClient.chat.missionAction(mission.reportId, {
        conversationId: mission.conversationId,
        messageId: mission.messageId,
        taskId: mission.taskId || null,
        action,
        feedback,
      });

      if (res?.mission) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== mission.conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === mission.messageId ? res.message || { ...m, mission: res.mission } : m
              ),
            };
          })
        );
        if (mission.conversationId === AI_COPILOT_CONV_ID) {
          setAiMessages((prev) =>
            prev.map((m) => (m.id === mission.messageId ? res.message || { ...m, mission: res.mission } : m))
          );
        }
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task?.id ? res.task : t)));
        } else if (action === 'REPORTER_ACCEPT' && mission.taskId) {
          setTasks((prev) =>
            prev.map((t) => (t.id === mission.taskId ? { ...t, done: true, mission: res.mission } : t))
          );
        }
        setMissionReopenInputOpenByReportId((prev) => ({ ...prev, [mission.reportId]: false }));
        setMissionReopenFeedbackByReportId((prev) => ({ ...prev, [mission.reportId]: '' }));
        notifyLivePeers();

        if (action === 'APPROVE_IMPLEMENTATION') {
          antdMessage.success(
            `🚀 Đã duyệt Cổng 1 & chuyển #${mission.missionKey} vào hàng đợi thực thi của mOS Mission!`
          );
        } else if (action === 'APPROVE_COMMIT') {
          antdMessage.success(`✅ Đã duyệt Commit (Cổng 2) cho #${mission.missionKey}!`);
        } else if (action === 'APPROVE_DEPLOY') {
          antdMessage.success(`🚀 Đã duyệt Deploy lên Web (Cổng 3) cho #${mission.missionKey}!`);
        } else if (action === 'REPORTER_ACCEPT') {
          antdMessage.success(`🎉 Đã xác nhận nghiệm thu #${mission.missionKey} & tự động hoàn tất Task!`);
        } else if (action === 'REPORTER_REOPEN') {
          antdMessage.info(
            `🔄 Đã ghi nhận yêu cầu nâng cấp / chỉnh thêm trên #${mission.missionKey} (chờ anh Danny duyệt Cổng 1 mOS Mission)!`
          );
        }
      }
    } catch (err: SafeAny) {
      antdMessage.error(
        err?.response?.data?.message || err?.message || 'Không thể thực thi thao tác trên mOS Mission.'
      );
    } finally {
      setMissionActionLoadingKey(null);
    }
  };

  return {
    missionModalOpen,
    setMissionModalOpen,
    missionSourceMsg,
    missionTitle,
    setMissionTitle,
    missionType,
    setMissionType,
    missionNote,
    setMissionNote,
    isDispatchingMission,
    missionActionLoadingKey,
    missionReopenInputOpenByReportId,
    setMissionReopenInputOpenByReportId,
    missionReopenFeedbackByReportId,
    setMissionReopenFeedbackByReportId,
    openMissionModalFromChat,
    handleConfirmDispatchMission,
    handleMissionInlineAction,
  };
}
