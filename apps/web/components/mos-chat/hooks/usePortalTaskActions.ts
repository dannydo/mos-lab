'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  summarizeAndExtractChecklistFromText,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatPresenceStatus,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type MosChatTaskPriority,
  type MosChatUserSidebarPrefs,
  type SafeAny,
  type UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { playWebAudioReminderChime } from '../utils/chat-helpers';
import { applyOptimisticAutoSummarizeTask, resolveTaskReminderSchedule } from '../utils/portal-task-helpers';
import {
  computeTaskCounts,
  filterPortalTasks,
  isTaskAssignedToUser,
  partitionSpaceTasks,
} from '../utils/portal-task-selectors';

export interface UsePortalTaskActionsParams {
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  staffDirectory: MosChatStaffMember[];
  conversations: MosChatConversation[];
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  activeConversation?: MosChatConversation;
  uniqueTasks: MosChatTaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  setExpandedChecklistTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  presence: MosChatPresenceStatus;
  userPrefs: MosChatUserSidebarPrefs;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
  taskForm: {
    editingTask: MosChatTaskItem | null;
    setEditingTask: (t: MosChatTaskItem | null) => void;
    taskModalSourceMsg: MosChatMessage | null;
    setTaskModalOpen: (open: boolean) => void;
    taskTitle: string;
    taskAssignee: string;
    taskPriority: MosChatTaskPriority;
    taskDoneState: boolean;
    taskArchivedState: boolean;
    taskRemindMode: 'preset' | 'custom';
    selectedPresetId: string;
    taskRemindSeconds: number;
    customRemindDate: dayjs.Dayjs | null;
    taskDeadline: dayjs.Dayjs | null;
    taskNegotiatedDeadline: dayjs.Dayjs | null;
    taskNegotiationNote: string;
  };
}

export function usePortalTaskActions({
  currentUser,
  currentUserStaffMember,
  staffDirectory,
  conversations,
  setConversations,
  activeConversation,
  uniqueTasks,
  setTasks,
  setExpandedChecklistTaskIds,
  presence,
  userPrefs,
  notifyLivePeers,
  antdMessage,
  taskForm,
}: UsePortalTaskActionsParams) {
  const [activeAlertTask, setActiveAlertTask] = useState<MosChatTaskItem | null>(null);
  const firedTaskIdsRef = useRef<Set<string>>(new Set());

  const [taskFilter, setTaskFilter] = useState<'ACTIVE' | 'MINE' | 'OVERDUE' | 'DONE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [taskScopeFilter, setTaskScopeFilter] = useState<'ALL' | 'MINE' | 'SPACE'>('ALL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [collapseOtherSpaces, setCollapseOtherSpaces] = useState(false);

  const triggerTaskReminderAlert = useCallback(
    async (task: MosChatTaskItem) => {
      firedTaskIdsRef.current.add(task.id);
      const isConvMuted = (userPrefs.mutedIds || []).includes(task.conversationId);
      if (presence !== 'dnd' && !isConvMuted) {
        playWebAudioReminderChime();
      }
      setActiveAlertTask(task);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, fired: true } : t)));

      try {
        await apiClient.chat.updateTask(task.id, { triggerReminderNow: true });
        notifyLivePeers();
      } catch {
        // ignore
      }
    },
    [presence, userPrefs.mutedIds, notifyLivePeers, setTasks]
  );

  useEffect(() => {
    const pendingReminderTasks = uniqueTasks.filter(
      (t) => !t.done && !t.archived && !t.fired && Boolean(t.remindAt) && !firedTaskIdsRef.current.has(t.id)
    );
    if (pendingReminderTasks.length === 0) return;

    const timer = setInterval(() => {
      const currentNow = Date.now();
      pendingReminderTasks.forEach((t) => {
        if (!t.done && !t.archived && !t.fired && !firedTaskIdsRef.current.has(t.id)) {
          const remainMs = new Date(t.remindAt).getTime() - currentNow;
          if (remainMs <= 0) {
            void triggerTaskReminderAlert(t);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [uniqueTasks, triggerTaskReminderAlert]);

  const isMyTask = useCallback(
    (t: MosChatTaskItem): boolean => isTaskAssignedToUser(t, currentUser, currentUserStaffMember),
    [currentUser, currentUserStaffMember]
  );

  const taskCounts = useMemo(
    () => computeTaskCounts(uniqueTasks, isMyTask, activeConversation),
    [uniqueTasks, isMyTask, activeConversation]
  );

  const filteredTasks = useMemo(
    () =>
      filterPortalTasks({
        uniqueTasks,
        taskFilter,
        taskScopeFilter,
        taskSearchQuery,
        isMyTaskFn: isMyTask,
        activeConversation,
      }),
    [uniqueTasks, taskFilter, taskScopeFilter, taskSearchQuery, isMyTask, activeConversation]
  );

  const { currentSpaceTasks, otherSpaceTasks } = useMemo(
    () => partitionSpaceTasks(filteredTasks, activeConversation),
    [filteredTasks, activeConversation]
  );

  const handleToggleArchiveTask = async (taskId: string, archived: boolean) => {
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, archived, archivedAt: archived ? nowIso : null, fired: archived ? true : t.fired } : t
      )
    );
    if (activeAlertTask?.id === taskId && archived) {
      setActiveAlertTask(null);
    }
    antdMessage.success(archived ? 'Đã chuyển công việc vào Lưu trữ' : 'Đã khôi phục công việc');
    try {
      await apiClient.chat.updateTask(taskId, { archived });
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeAlertTask?.id === taskId) {
      setActiveAlertTask(null);
    }
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.taskId === taskId ? { ...m, taskId: undefined } : m)),
      }))
    );
    antdMessage.success('Đã xoá công việc thành công');
    try {
      await apiClient.chat.deleteTask(taskId);
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleConfirmCreateTask = async () => {
    const cleanTitle = taskForm.taskTitle.trim();
    const cleanAssignee = taskForm.taskAssignee.trim();
    if (!cleanTitle) {
      antdMessage.warning('Vui lòng nhập tên công việc');
      return;
    }
    if (!cleanAssignee) {
      antdMessage.warning('Vui lòng chọn Người phụ trách công việc từ danh sách nhân sự đang hoạt động');
      return;
    }

    const matchedAssignee = staffDirectory.find(
      (s) => s.displayName === cleanAssignee || `${s.displayName} (${s.role})` === cleanAssignee
    );
    const resolvedAssigneeName = matchedAssignee?.displayName || cleanAssignee;
    const { isNoReminder, remindAtIso, remindSecondsToSend } = resolveTaskReminderSchedule({
      taskRemindMode: taskForm.taskRemindMode,
      selectedPresetId: taskForm.selectedPresetId,
      taskRemindSeconds: taskForm.taskRemindSeconds,
      customRemindDate: taskForm.customRemindDate,
    });

    const deadlineIso =
      taskForm.taskDeadline && taskForm.taskDeadline.isValid() ? taskForm.taskDeadline.toISOString() : null;
    const negotiatedDeadlineIso =
      taskForm.taskNegotiatedDeadline && taskForm.taskNegotiatedDeadline.isValid()
        ? taskForm.taskNegotiatedDeadline.toISOString()
        : null;
    const cleanNegotiationNote = taskForm.taskNegotiationNote.trim() || null;

    if (taskForm.editingTask) {
      const updatedTask: MosChatTaskItem = {
        ...taskForm.editingTask,
        title: cleanTitle,
        assigneeId: matchedAssignee?.id ?? taskForm.editingTask.assigneeId,
        assigneeName: resolvedAssigneeName,
        priority: taskForm.taskPriority,
        done: taskForm.taskDoneState,
        archived: taskForm.taskArchivedState,
        archivedAt: taskForm.taskArchivedState ? taskForm.editingTask.archivedAt || new Date().toISOString() : null,
        remindAt: remindAtIso,
        deadline: deadlineIso,
        dueAt: deadlineIso,
        negotiatedDeadline: negotiatedDeadlineIso,
        negotiationNote: cleanNegotiationNote,
        fired: isNoReminder || taskForm.taskDoneState || taskForm.taskArchivedState,
        updatedAt: new Date().toISOString(),
      };

      setTasks((prev) => prev.map((t) => (t.id === taskForm.editingTask!.id ? updatedTask : t)));
      taskForm.setTaskModalOpen(false);
      taskForm.setEditingTask(null);
      antdMessage.success(`Đã cập nhật công việc "${cleanTitle}"`);

      try {
        await apiClient.chat.updateTask(taskForm.editingTask.id, {
          title: cleanTitle,
          assigneeId: matchedAssignee?.id ?? taskForm.editingTask.assigneeId,
          assigneeName: resolvedAssigneeName,
          priority: taskForm.taskPriority,
          done: taskForm.taskDoneState,
          archived: taskForm.taskArchivedState,
          remindInSeconds: remindSecondsToSend,
          remindAt: remindAtIso,
          deadline: deadlineIso,
          dueAt: deadlineIso,
          negotiatedDeadline: negotiatedDeadlineIso,
          negotiationNote: cleanNegotiationNote,
        });
        notifyLivePeers();
      } catch {
        // ignore
      }
      return;
    }

    if (!activeConversation) return;

    const normalizedTitle = cleanTitle.replace(/\s+/g, ' ').toLowerCase();
    const existingTask = uniqueTasks.find(
      (t) =>
        (taskForm.taskModalSourceMsg?.id && t.sourceMessageId === taskForm.taskModalSourceMsg.id) ||
        (t.conversationId === activeConversation.id &&
          (t.title || '').trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTitle)
    );

    const tempTaskId = existingTask?.id || `task-${Date.now()}`;
    const autoSummarized =
      taskForm.taskModalSourceMsg && !existingTask?.checklist?.length
        ? summarizeAndExtractChecklistFromText({
            rootText: taskForm.taskModalSourceMsg.text,
            rootSenderName: taskForm.taskModalSourceMsg.senderName,
            rootSenderId: taskForm.taskModalSourceMsg.senderId,
            replies: taskForm.taskModalSourceMsg.thread || [],
          })
        : null;

    const autoChecklistItems =
      autoSummarized && autoSummarized.suggestions.length >= 2
        ? autoSummarized.suggestions.map((s, idx) => ({
            id: `chk-opt-${Date.now()}-${idx}`,
            title: s.title,
            done: false,
            assigneeId: s.assigneeId ?? matchedAssignee?.id ?? null,
            assigneeName: s.assigneeName ?? resolvedAssigneeName ?? null,
            sourceReplyId: s.sourceReplyId ?? null,
            createdBy: currentUser?.displayName || 'Danny Do',
            createdAt: new Date().toISOString(),
          }))
        : existingTask?.checklist || [];

    const newTask: MosChatTaskItem = {
      ...(existingTask || {}),
      id: tempTaskId,
      conversationId: activeConversation.id,
      conversationName: activeConversation.name,
      sourceMessageId: taskForm.taskModalSourceMsg?.id || existingTask?.sourceMessageId || null,
      sourceAuthorName:
        taskForm.taskModalSourceMsg?.senderName ||
        existingTask?.sourceAuthorName ||
        currentUser?.displayName ||
        'Danny Do',
      title: cleanTitle,
      summary:
        autoSummarized && autoSummarized.suggestions.length >= 2
          ? autoSummarized.summary
          : existingTask?.summary || null,
      assigneeId: matchedAssignee?.id,
      assigneeName: resolvedAssigneeName,
      creatorName: currentUser?.displayName || 'Danny Do',
      priority: taskForm.taskPriority,
      remindAt: remindAtIso,
      deadline: deadlineIso,
      dueAt: deadlineIso,
      negotiatedDeadline: negotiatedDeadlineIso,
      negotiationNote: cleanNegotiationNote,
      done: false,
      fired: isNoReminder,
      createdAt: existingTask?.createdAt || new Date().toISOString(),
      checklist: autoChecklistItems,
    };

    if (autoChecklistItems.length > 0) {
      setExpandedChecklistTaskIds((prev) => ({
        ...prev,
        [tempTaskId]: true,
      }));
    }

    setTasks((prev) => (existingTask ? prev.map((t) => (t.id === existingTask.id ? newTask : t)) : [newTask, ...prev]));
    if (taskForm.taskModalSourceMsg) {
      const srcId = taskForm.taskModalSourceMsg.id;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === srcId ? { ...m, taskId: tempTaskId } : m)),
              }
            : c
        )
      );
    } else if (!existingTask) {
      const taskMsg: MosChatMessage = {
        id: `msg-task-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.displayName || 'Danny Do',
        senderRole: 'Super Admin',
        senderAvatar: 'DD',
        roleColor: '#d4a84b',
        text: `Giao việc cho ${resolvedAssigneeName}:`,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        taskId: tempTaskId,
        reactions: {},
        thread: [],
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: [...c.messages, taskMsg] } : c))
      );
    }

    taskForm.setTaskModalOpen(false);
    antdMessage.success(
      existingTask
        ? `Đã cập nhật Task (${resolvedAssigneeName})`
        : autoChecklistItems.length > 0
          ? `Đã giao Task & tự động tạo ${autoChecklistItems.length} mục Checklist (${resolvedAssigneeName})`
          : isNoReminder
            ? `Đã giao Task cho ${resolvedAssigneeName}`
            : `Đã giao Task & bật nhắc hẹn (${resolvedAssigneeName})`
    );

    try {
      const res = await apiClient.chat.createTask({
        conversationId: activeConversation.id,
        sourceMessageId: taskForm.taskModalSourceMsg?.id || existingTask?.sourceMessageId || null,
        title: cleanTitle,
        assigneeId: matchedAssignee?.id,
        assigneeName: resolvedAssigneeName,
        priority: taskForm.taskPriority,
        remindInSeconds: remindSecondsToSend,
        remindAt: remindAtIso,
        deadline: deadlineIso,
        dueAt: deadlineIso,
        negotiationNote: cleanNegotiationNote,
        autoSummarizeChecklist: true,
      });
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempTaskId || t.id === res.task.id ? res.task : t)));
        if (res.task.checklist && res.task.checklist.length > 0) {
          setExpandedChecklistTaskIds((prev) => ({
            ...prev,
            [res.task.id]: true,
          }));
        }
      }
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleToggleTaskDone = async (taskId: string) => {
    let nextDone = true;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        nextDone = !t.done;
        return { ...t, done: nextDone };
      })
    );
    if (activeAlertTask?.id === taskId) {
      setActiveAlertTask(null);
    }
    try {
      const res = await apiClient.chat.updateTask(taskId, { done: nextDone });
      if (res && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateTask = useCallback(
    async (taskId: string, payload: UpdateMosChatTaskRequest) => {
      try {
        if (payload.checklistAction === 'auto_summarize') {
          setExpandedChecklistTaskIds((prev) => ({ ...prev, [taskId]: true }));
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? applyOptimisticAutoSummarizeTask(
                    t,
                    conversations,
                    activeConversation,
                    currentUser?.displayName || 'Danny Do'
                  )
                : t
            )
          );
        } else if (payload.checklistAction === 'edit' && payload.checklistItemId && payload.checklistItem) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id !== taskId
                ? t
                : {
                    ...t,
                    checklist: (t.checklist || []).map((c) =>
                      c.id === payload.checklistItemId ? { ...c, ...payload.checklistItem } : c
                    ),
                  }
            )
          );
        } else if (payload.checklistAction === 'delete' && payload.checklistItemId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id !== taskId
                ? t
                : { ...t, checklist: (t.checklist || []).filter((c) => c.id !== payload.checklistItemId) }
            )
          );
        } else if (payload.checklistAction === 'toggle' && payload.checklistItemId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id !== taskId
                ? t
                : {
                    ...t,
                    checklist: (t.checklist || []).map((c) =>
                      c.id === payload.checklistItemId ? { ...c, done: !c.done } : c
                    ),
                  }
            )
          );
        }

        const res = await apiClient.chat.updateTask(taskId, payload);
        if (res && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
          if (payload.checklistAction === 'auto_summarize') {
            const count = res.task.checklist?.length || 0;
            antdMessage.success(
              count > 0
                ? `Đã tóm tắt công việc & cập nhật ${count} đầu việc vào Checklist!`
                : 'Đã cập nhật bản tóm tắt công việc!'
            );
          }
        }
      } catch (err: SafeAny) {
        console.error('handleUpdateTask error:', err);
        antdMessage.error(err?.message || 'Không thể cập nhật công việc');
      }
    },
    [antdMessage, conversations, activeConversation, currentUser?.displayName, setExpandedChecklistTaskIds, setTasks]
  );

  const handleSnoozeTask = async (taskId: string, snoozeSec = 600) => {
    const nextRemindAt = new Date(Date.now() + snoozeSec * 1000).toISOString();
    firedTaskIdsRef.current.delete(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, remindAt: nextRemindAt, fired: false, done: false } : t))
    );
    setActiveAlertTask(null);
    antdMessage.info('Đã dời lịch nhắc lại sau 10 phút');
    try {
      await apiClient.chat.updateTask(taskId, { snoozeSeconds: snoozeSec });
    } catch {
      // ignore
    }
  };

  return {
    activeAlertTask,
    setActiveAlertTask,
    triggerTaskReminderAlert,
    taskFilter,
    setTaskFilter,
    taskScopeFilter,
    setTaskScopeFilter,
    taskSearchQuery,
    setTaskSearchQuery,
    collapseOtherSpaces,
    setCollapseOtherSpaces,
    taskCounts,
    filteredTasks,
    currentSpaceTasks,
    otherSpaceTasks,
    handleToggleArchiveTask,
    handleDeleteTask,
    handleConfirmCreateTask,
    handleToggleTaskDone,
    handleUpdateTask,
    handleSnoozeTask,
  };
}
