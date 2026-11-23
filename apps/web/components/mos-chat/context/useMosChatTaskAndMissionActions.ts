'use client';

import { useCallback } from 'react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionActionType,
  MosChatMissionSummary,
  MosChatTaskItem,
  MosChatTaskPriority,
  MosChatThreadReply,
  MosChatWorkflowInstance,
  SafeAny,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface UseMosChatTaskAndMissionActionsParams {
  effectiveUser: SafeAny;
  activeConvId: string;
  activeConversation: MosChatConversation | null;
  aiMessages: MosChatMessage[];
  allMessagesByConv: Record<string, MosChatMessage[]>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  setActiveThreadMsg: React.Dispatch<React.SetStateAction<MosChatMessage | null>>;
  setAiMessages: React.Dispatch<React.SetStateAction<MosChatMessage[]>>;
  setAllMessagesByConv: React.Dispatch<React.SetStateAction<Record<string, MosChatMessage[]>>>;
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
}

/**
 * Handles Context-layer Task CRUD, deadline negotiations, Mission dispatch/actions, and Workflows.
 */
export function useMosChatTaskAndMissionActions({
  effectiveUser,
  activeConvId,
  activeConversation,
  aiMessages,
  allMessagesByConv,
  setTasks,
  setConversations,
  setActiveThreadMsg,
  setAiMessages,
  setAllMessagesByConv,
  setWorkflowInstances,
}: UseMosChatTaskAndMissionActionsParams) {
  const createTask = useCallback(
    async (
      title: string,
      options?: {
        assigneeStaffId?: string;
        assigneeName?: string;
        dueAt?: string | null;
        priority?: MosChatTaskPriority;
        sourceMessageId?: string;
      }
    ): Promise<boolean> => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      const effectiveCreatorName =
        effectiveUser?.displayName ||
        effectiveUser?.fullName ||
        effectiveUser?.name ||
        effectiveUser?.username ||
        'Danny Do';

      const effectiveAssigneeName = options?.assigneeName || effectiveCreatorName;
      const effectiveAssigneeId =
        options?.assigneeStaffId || (effectiveUser?.id ? String(effectiveUser.id) : undefined);

      const tempTask: MosChatTaskItem = {
        id: `task_${Date.now()}`,
        conversationId: activeConvId,
        conversationName: activeConversation?.name || 'Không gian',
        title: trimmed,
        done: false,
        assigneeId: effectiveAssigneeId ? Number(effectiveAssigneeId) : undefined,
        assigneeName: effectiveAssigneeName,
        creatorName: effectiveCreatorName,
        dueAt: options?.dueAt || null,
        priority: options?.priority || 'NORMAL',
        sourceMessageId: options?.sourceMessageId,
        remindAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [tempTask, ...prev]);

      try {
        const res = await apiClient.chat.createTask({
          conversationId: activeConvId,
          title: trimmed,
          assigneeId: effectiveAssigneeId,
          assigneeName: effectiveAssigneeName,
          dueAt: options?.dueAt || null,
          priority: options?.priority || 'NORMAL',
          sourceMessageId: options?.sourceMessageId,
        });
        if (res && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === tempTask.id ? res.task : t)));
          if (options?.sourceMessageId) {
            setConversations((prev) =>
              prev.map((c) => ({
                ...c,
                messages: (c.messages || []).map((m) =>
                  m.id === options.sourceMessageId ? { ...m, taskId: res.task.id } : m
                ),
              }))
            );
            setActiveThreadMsg((prev) => {
              if (prev && prev.id === options.sourceMessageId) {
                return { ...prev, taskId: res.task.id };
              }
              return prev;
            });
          }
        }
        return true;
      } catch (err: SafeAny) {
        console.error('Failed to create task in MosChatContext:', err?.response?.data || err?.message || err);
        setTasks((prev) => prev.filter((t) => t.id !== tempTask.id));
        return false;
      }
    },
    [activeConvId, activeConversation, effectiveUser, setActiveThreadMsg, setConversations, setTasks]
  );

  const toggleTaskDone = useCallback(
    async (taskId: string, done: boolean) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
      try {
        await apiClient.chat.updateTask(taskId, { done });
      } catch {
        // ignore
      }
    },
    [setTasks]
  );

  const updateTask = useCallback(
    async (taskId: string, payload: UpdateMosChatTaskRequest): Promise<boolean> => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          let updatedChecklist = t.checklist;
          if (payload.checklistAction === 'delete' && payload.checklistItemId) {
            updatedChecklist = (t.checklist || []).filter((c) => c.id !== payload.checklistItemId);
          } else if (payload.checklistAction === 'toggle' && payload.checklistItemId) {
            updatedChecklist = (t.checklist || []).map((c) =>
              c.id === payload.checklistItemId ? { ...c, done: !c.done } : c
            );
          } else if (payload.checklistAction === 'edit' && payload.checklistItemId && payload.checklistItem) {
            updatedChecklist = (t.checklist || []).map((c) =>
              c.id === payload.checklistItemId ? { ...c, ...payload.checklistItem } : c
            );
          }
          return {
            ...t,
            ...payload,
            checklist: updatedChecklist,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      try {
        const res = await apiClient.chat.updateTask(taskId, payload);
        if (res && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
        }
        return true;
      } catch (err) {
        console.error('Failed to update task:', err);
        return false;
      }
    },
    [setTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        await apiClient.chat.deleteTask(taskId);
        return true;
      } catch (err) {
        console.error('Failed to delete task:', err);
        return false;
      }
    },
    [setTasks]
  );

  const acceptNegotiatedDeadline = useCallback(
    async (task: MosChatTaskItem): Promise<boolean> => {
      if (!task.negotiatedDeadline) return false;
      const newDeadline = task.negotiatedDeadline;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                deadline: newDeadline,
                dueAt: newDeadline,
                negotiatedDeadline: null,
                negotiationNote: null,
                negotiatedBy: null,
                negotiatedAt: null,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      try {
        await apiClient.chat.updateTask(task.id, { acceptNegotiatedDeadline: true });
        return true;
      } catch (err) {
        console.error('Failed to accept negotiated deadline:', err);
        return false;
      }
    },
    [setTasks]
  );

  const rejectNegotiatedDeadline = useCallback(
    async (task: MosChatTaskItem): Promise<boolean> => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                negotiatedDeadline: null,
                negotiationNote: null,
                negotiatedBy: null,
                negotiatedAt: null,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      try {
        await apiClient.chat.updateTask(task.id, { rejectNegotiatedDeadline: true });
        return true;
      } catch (err) {
        console.error('Failed to reject negotiated deadline:', err);
        return false;
      }
    },
    [setTasks]
  );

  const dispatchMissionFromTask = useCallback(
    async (
      task: MosChatTaskItem,
      payload: { title?: string; type?: 'BUG' | 'FEATURE'; note?: string }
    ): Promise<SafeAny> => {
      try {
        const convId = task.conversationId || activeConvId;
        const msgId = task.sourceMessageId || '';
        const sourceMessage =
          convId === AI_COPILOT_CONV_ID
            ? aiMessages.find((m) => m.id === msgId)
            : allMessagesByConv[convId]?.find((m) => m.id === msgId);

        const res = await apiClient.chat.createMission({
          conversationId: convId,
          messageId: msgId,
          taskId: task.id,
          title: payload.title || task.title,
          type: payload.type || 'FEATURE',
          note: payload.note || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
          sourceMessage: sourceMessage || undefined,
        });
        if (res && res.mission) {
          if (convId === AI_COPILOT_CONV_ID) {
            setAiMessages((prev) =>
              prev.map((m) => (m.id === msgId ? res.message || { ...m, mission: res.mission } : m))
            );
          }
          if (res.task) {
            const taskFromApi = res.task;
            setTasks((prev) => prev.map((t) => (t.id === taskFromApi.id ? taskFromApi : t)));
          } else {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      missionId: res.mission.reportId,
                      missionKey: res.mission.missionKey,
                      mission: res.mission,
                    }
                  : t
              )
            );
          }
          return res.mission;
        }
        return null;
      } catch (err) {
        console.error('Failed to dispatch mission from task:', err);
        throw err;
      }
    },
    [activeConvId, aiMessages, allMessagesByConv, setAiMessages, setTasks]
  );

  const executeMissionAction = useCallback(
    async (mission: MosChatMissionSummary, action: MosChatMissionActionType, feedback?: string): Promise<SafeAny> => {
      try {
        const res = await apiClient.chat.missionAction(mission.reportId, {
          conversationId: mission.conversationId || activeConvId,
          messageId: mission.messageId || null,
          taskId: mission.taskId || null,
          action,
          feedback,
        });

        if (res?.mission) {
          const updatedMission = res.mission;
          const systemReply = res.systemReply;
          const targetConvId = updatedMission.conversationId || mission.conversationId || activeConvId;
          const targetMsgId = res.message?.id || updatedMission.messageId || mission.messageId;
          const matchesMissionMsg = (m: MosChatMessage) =>
            (Boolean(targetMsgId) && m.id === targetMsgId) || m.missionId === mission.reportId;

          const applyUpdatedMsg = (m: MosChatMessage): MosChatMessage => {
            if (!matchesMissionMsg(m)) return m;
            if (res.message) return res.message;
            const nextThread =
              systemReply && !(m.thread || []).some((r: MosChatThreadReply) => r.id === systemReply.id)
                ? [...(m.thread || []), systemReply]
                : m.thread;
            return {
              ...m,
              missionId: updatedMission.reportId,
              missionKey: updatedMission.missionKey,
              mission: updatedMission,
              ...(nextThread ? { thread: nextThread } : {}),
            };
          };

          // Update task in state
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id === mission.taskId || t.missionId === mission.reportId || t.missionKey === mission.missionKey) {
                if (res.task && res.task.id === t.id) {
                  return {
                    ...res.task,
                    mission: updatedMission,
                    done: action === 'REPORTER_ACCEPT' ? true : res.task.done,
                  };
                }
                return {
                  ...t,
                  mission: updatedMission,
                  done: action === 'REPORTER_ACCEPT' ? true : t.done,
                };
              }
              return t;
            })
          );

          // Update conversations (activeConversation / liveThreadMsg source)
          setConversations((prev) =>
            prev.map((c) => {
              if (targetConvId && c.id !== targetConvId) return c;
              if (!(c.messages || []).some(matchesMissionMsg)) return c;
              return {
                ...c,
                messages: (c.messages || []).map(applyUpdatedMsg),
              };
            })
          );

          // Also update allMessagesByConv & AI messages
          if (targetConvId) {
            setAllMessagesByConv((prev) => {
              const currentList = prev[targetConvId] || [];
              if (!currentList.some(matchesMissionMsg)) return prev;
              return {
                ...prev,
                [targetConvId]: currentList.map(applyUpdatedMsg),
              };
            });
          }
          if (targetConvId === AI_COPILOT_CONV_ID) {
            setAiMessages((prev) => prev.map(applyUpdatedMsg));
          }

          // Immediately sync activeThreadMsg so ThreadSheet mission/replies reflect acceptance right away
          setActiveThreadMsg((current) => (current && matchesMissionMsg(current) ? applyUpdatedMsg(current) : current));

          return res.mission;
        }
        return null;
      } catch (err: SafeAny) {
        console.error('Failed to execute mission action:', err);
        throw err;
      }
    },
    [activeConvId, setActiveThreadMsg, setAiMessages, setAllMessagesByConv, setConversations, setTasks]
  );

  const triggerWorkflow = useCallback(
    async (templateCode: string, title?: string, formData?: Record<string, unknown>): Promise<boolean> => {
      try {
        const res = await apiClient.chat.createWorkflowInstance({
          conversationId: activeConvId,
          templateCode,
          title: title || 'Quy trình công việc',
          formData: formData || {},
        });
        if (res && res.workflow) {
          setWorkflowInstances((prev) => [res.workflow, ...prev]);
        }
        return true;
      } catch {
        return false;
      }
    },
    [activeConvId, setWorkflowInstances]
  );

  return {
    createTask,
    toggleTaskDone,
    updateTask,
    deleteTask,
    acceptNegotiatedDeadline,
    rejectNegotiatedDeadline,
    dispatchMissionFromTask,
    executeMissionAction,
    triggerWorkflow,
  };
}
