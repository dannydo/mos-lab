'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import type { MessageInstance } from 'antd/es/message/interface';
import type {
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatTaskPriority,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { DEADLINE_PRESETS } from '../constants/chat-constants';
import { ensureStaffDirectoryLoaded } from '../utils/portal-task-helpers';

export interface UsePortalTaskModalsParams {
  currentUser?: SafeAny;
  staffDirectory: MosChatStaffMember[];
  setStaffDirectory: React.Dispatch<React.SetStateAction<MosChatStaffMember[]>>;
  uniqueTasks: MosChatTaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  composerTextRef: React.MutableRefObject<string>;
  fetchBootstrap: (forceFull?: boolean) => Promise<void>;
  notifyLivePeers: () => void;
  antdMessage: MessageInstance;
}

export function usePortalTaskModals({
  currentUser,
  staffDirectory,
  setStaffDirectory,
  uniqueTasks,
  setTasks,
  composerTextRef,
  fetchBootstrap,
  notifyLivePeers,
  antdMessage,
}: UsePortalTaskModalsParams) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalSourceMsg, setTaskModalSourceMsg] = useState<MosChatMessage | null>(null);
  const [editingTask, setEditingTask] = useState<MosChatTaskItem | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('HIGH');
  const [taskDoneState, setTaskDoneState] = useState(false);
  const [taskArchivedState, setTaskArchivedState] = useState(false);
  const [taskRemindMode, setTaskRemindMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('none');
  const [taskRemindSeconds, setTaskRemindSeconds] = useState<number>(0);
  const [customRemindDate, setCustomRemindDate] = useState<dayjs.Dayjs | null>(null);

  const [taskDeadlineMode, setTaskDeadlineMode] = useState<'preset' | 'custom' | 'none'>('preset');
  const [selectedDeadlinePresetId, setSelectedDeadlinePresetId] = useState<string>('today-1730');
  const [taskDeadline, setTaskDeadline] = useState<dayjs.Dayjs | null>(null);
  const [taskNegotiatedDeadline, setTaskNegotiatedDeadline] = useState<dayjs.Dayjs | null>(null);
  const [taskNegotiationNote, setTaskNegotiationNote] = useState<string>('');

  const [negotiateModalOpen, setNegotiateModalOpen] = useState(false);
  const [negotiatingTask, setNegotiatingTask] = useState<MosChatTaskItem | null>(null);
  const [negotiateProposedDeadline, setNegotiateProposedDeadline] = useState<dayjs.Dayjs | null>(null);
  const [negotiateReason, setNegotiateReason] = useState('');
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);

  const openTaskModalFromMessage = (msg: MosChatMessage | null, reply?: SafeAny) => {
    setEditingTask(null);
    if (reply && msg) {
      setTaskModalSourceMsg({
        ...msg,
        id: `${msg.id}#${reply.id}`,
        text: reply.text || msg.text,
        senderId: reply.senderId || msg.senderId,
        senderName: reply.senderName || msg.senderName,
        senderAvatar: reply.senderAvatar || msg.senderAvatar,
      });
    } else {
      setTaskModalSourceMsg(msg);
    }
    setTaskDoneState(false);
    setTaskArchivedState(false);
    ensureStaffDirectoryLoaded(staffDirectory.length, fetchBootstrap, setStaffDirectory);

    const existingTask = msg ? uniqueTasks.find((t) => t.sourceMessageId === msg.id || t.id === msg.taskId) : null;
    setTaskTitle(
      existingTask?.title ||
        (msg ? msg.text : composerTextRef.current.trim() || 'Kiểm tra lịch hẹn & chuẩn bị đón khách VIP')
    );
    const existingAssignee =
      existingTask?.assigneeName &&
      !String(existingTask.assigneeName).includes('Hà My') &&
      existingTask.assigneeName !== 'Chưa phân công'
        ? existingTask.assigneeName
        : currentUser?.displayName || '';
    setTaskAssignee(existingAssignee);
    if (existingTask?.priority) {
      setTaskPriority(existingTask.priority);
    }
    setTaskRemindMode('preset');
    setSelectedPresetId('none');
    setTaskRemindSeconds(0);
    setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));

    if (existingTask?.deadline || existingTask?.dueAt) {
      const d = dayjs(existingTask.deadline || existingTask.dueAt);
      setTaskDeadline(d.isValid() ? d : null);
      setTaskDeadlineMode('custom');
      setSelectedDeadlinePresetId('custom');
    } else {
      setTaskDeadline(DEADLINE_PRESETS[0].getDate());
      setTaskDeadlineMode('preset');
      setSelectedDeadlinePresetId('today-1730');
    }
    setTaskNegotiatedDeadline(existingTask?.negotiatedDeadline ? dayjs(existingTask.negotiatedDeadline) : null);
    setTaskNegotiationNote(existingTask?.negotiationNote || '');
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: MosChatTaskItem) => {
    setEditingTask(task);
    setTaskModalSourceMsg(null);
    ensureStaffDirectoryLoaded(staffDirectory.length, fetchBootstrap, setStaffDirectory);

    setTaskTitle(task.title || '');
    setTaskAssignee(task.assigneeName || currentUser?.displayName || '');
    setTaskPriority(task.priority || 'HIGH');
    setTaskDoneState(Boolean(task.done));
    setTaskArchivedState(Boolean(task.archived));

    const remindDate = dayjs(task.remindAt);
    if (remindDate.isValid() && remindDate.isAfter(dayjs())) {
      setTaskRemindMode('custom');
      setCustomRemindDate(remindDate);
      setSelectedPresetId('custom');
      setTaskRemindSeconds(Math.max(60, remindDate.diff(dayjs(), 'second')));
    } else {
      setTaskRemindMode('preset');
      setSelectedPresetId('none');
      setTaskRemindSeconds(0);
      setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
    }

    if (task.deadline || task.dueAt) {
      const d = dayjs(task.deadline || task.dueAt);
      setTaskDeadline(d.isValid() ? d : null);
      setTaskDeadlineMode('custom');
      setSelectedDeadlinePresetId('custom');
    } else {
      setTaskDeadline(null);
      setTaskDeadlineMode('none');
      setSelectedDeadlinePresetId('none');
    }
    setTaskNegotiatedDeadline(task.negotiatedDeadline ? dayjs(task.negotiatedDeadline) : null);
    setTaskNegotiationNote(task.negotiationNote || '');
    setTaskModalOpen(true);
  };

  const handleOpenNegotiateModal = (task: MosChatTaskItem) => {
    setNegotiatingTask(task);
    const initialProposed = task.deadline ? dayjs(task.deadline).add(2, 'hour') : dayjs().hour(17).minute(30).second(0);
    setNegotiateProposedDeadline(initialProposed);
    setNegotiateReason(task.negotiationNote || '');
    setNegotiateModalOpen(true);
  };

  const handleSubmitNegotiation = async () => {
    if (!negotiatingTask) return;
    if (!negotiateProposedDeadline || !negotiateProposedDeadline.isValid()) {
      antdMessage.warning('Vui lòng chọn thời hạn bạn đề xuất dời sang');
      return;
    }
    if (!negotiateReason.trim()) {
      antdMessage.warning('Vui lòng nhập lý do / giải trình thương lượng dời hạn');
      return;
    }

    setIsSubmittingNegotiation(true);
    const proposedIso = negotiateProposedDeadline.toISOString();
    const cleanReason = negotiateReason.trim();
    const myName = currentUser?.displayName || 'Nhân sự';
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === negotiatingTask.id
          ? {
              ...t,
              negotiatedDeadline: proposedIso,
              negotiationNote: cleanReason,
              negotiatedBy: myName,
              negotiatedAt: nowIso,
            }
          : t
      )
    );

    setNegotiateModalOpen(false);
    antdMessage.success('Đã gửi đề xuất thương lượng dời hạn chót thành công!');

    try {
      await apiClient.chat.updateTask(negotiatingTask.id, {
        negotiatedDeadline: proposedIso,
        negotiationNote: cleanReason,
        negotiatedBy: myName,
        negotiatedAt: nowIso,
      });
      notifyLivePeers();
    } catch {
      antdMessage.error('Không thể gửi đề xuất thương lượng');
    } finally {
      setIsSubmittingNegotiation(false);
      setNegotiatingTask(null);
    }
  };

  const handleAcceptNegotiatedDeadline = async (task: MosChatTaskItem) => {
    if (!task.negotiatedDeadline) return;
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

    antdMessage.success(`Đã chấp thuận dời hạn sang ${dayjs(newDeadline).format('HH:mm DD/MM/YYYY')}!`);

    try {
      await apiClient.chat.updateTask(task.id, { acceptNegotiatedDeadline: true });
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  const handleRejectNegotiatedDeadline = async (task: MosChatTaskItem) => {
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

    antdMessage.info('Đã từ chối đề xuất dời hạn và giữ nguyên hạn cũ');

    try {
      await apiClient.chat.updateTask(task.id, { rejectNegotiatedDeadline: true });
      notifyLivePeers();
    } catch {
      // ignore
    }
  };

  return {
    taskModalOpen,
    setTaskModalOpen,
    taskModalSourceMsg,
    editingTask,
    setEditingTask,
    taskTitle,
    setTaskTitle,
    taskAssignee,
    setTaskAssignee,
    taskPriority,
    setTaskPriority,
    taskDoneState,
    setTaskDoneState,
    taskArchivedState,
    setTaskArchivedState,
    taskRemindMode,
    setTaskRemindMode,
    selectedPresetId,
    setSelectedPresetId,
    taskRemindSeconds,
    setTaskRemindSeconds,
    customRemindDate,
    setCustomRemindDate,
    taskDeadlineMode,
    setTaskDeadlineMode,
    selectedDeadlinePresetId,
    setSelectedDeadlinePresetId,
    taskDeadline,
    setTaskDeadline,
    taskNegotiatedDeadline,
    setTaskNegotiatedDeadline,
    taskNegotiationNote,
    setTaskNegotiationNote,
    negotiateModalOpen,
    setNegotiateModalOpen,
    negotiatingTask,
    setNegotiatingTask,
    negotiateProposedDeadline,
    setNegotiateProposedDeadline,
    negotiateReason,
    setNegotiateReason,
    isSubmittingNegotiation,
    openTaskModalFromMessage,
    openEditTaskModal,
    handleOpenNegotiateModal,
    handleSubmitNegotiation,
    handleAcceptNegotiatedDeadline,
    handleRejectNegotiatedDeadline,
  };
}
