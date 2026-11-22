import { useMemo, useState } from 'react';
import { message as antdMessage } from 'antd';
import dayjs from 'dayjs';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatTaskPriority,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';

export interface MobileTaskAssigneeOption {
  value: string;
  label: string;
  staffId: number;
  displayName: string;
  avatarUrl: string | null;
  role: string | null;
  isMe: boolean;
}

interface UseMobileTaskWorkflowParams {
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  activeConversation: MosChatConversation | null | undefined;
  conversations: MosChatConversation[];
  activeThreadMsg: MosChatMessage | null;
  tasks: MosChatTaskItem[];
  createTask: (
    title: string,
    opts?: {
      assigneeStaffId?: string;
      assigneeName?: string;
      dueAt?: string | null;
      priority?: MosChatTaskPriority;
      sourceMessageId?: string;
    }
  ) => Promise<boolean>;
  updateTask: (taskId: string, updates: SafeAny) => Promise<boolean>;
  dispatchMissionFromTask: (
    task: MosChatTaskItem,
    missionData: { title: string; type: 'BUG' | 'FEATURE'; note: string }
  ) => Promise<SafeAny>;
  sendThreadReply: (text: string) => Promise<SafeAny>;
  setActiveConvId: (cid: string) => void;
  setActiveThreadMsg: (msg: MosChatMessage | null) => void;
  setMobileView: (view: 'inbox' | 'room' | 'thread') => void;
}

export function useMobileTaskWorkflow({
  currentUser,
  staffDirectory,
  activeConversation,
  conversations,
  activeThreadMsg,
  tasks,
  createTask,
  updateTask,
  dispatchMissionFromTask,
  sendThreadReply,
  setActiveConvId,
  setActiveThreadMsg,
  setMobileView,
}: UseMobileTaskWorkflowParams) {
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [negotiatingTaskId, setNegotiatingTaskId] = useState<string | null>(null);
  const [missionTaskId, setMissionTaskId] = useState<string | null>(null);

  const selectedDetailTask = useMemo(
    () => tasks.find((t) => t.id === selectedDetailTaskId) || null,
    [tasks, selectedDetailTaskId]
  );
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) || null, [tasks, editingTaskId]);
  const negotiatingTask = useMemo(
    () => tasks.find((t) => t.id === negotiatingTaskId) || null,
    [tasks, negotiatingTaskId]
  );
  const missionTask = useMemo(() => tasks.find((t) => t.id === missionTaskId) || null, [tasks, missionTaskId]);

  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [editingTaskForModal, setEditingTaskForModal] = useState<MosChatTaskItem | null>(null);
  const [taskThreadContext, setTaskThreadContext] = useState<{
    inThread: boolean;
    sourceReply?: MosChatThreadReply | null;
  } | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | undefined>(undefined);
  const [taskDueAt, setTaskDueAt] = useState<string | null>(null);
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('NORMAL');
  const [taskSourceMsg, setTaskSourceMsg] = useState<MosChatMessage | null>(null);

  const currentStaff = useMemo(() => {
    if (!currentUser) return undefined;
    const cid = Number(currentUser.id);
    const cUser = String(currentUser.username || '').toLowerCase();
    const cName = String(currentUser.fullName || currentUser.name || currentUser.displayName || '').toLowerCase();
    return staffDirectory.find(
      (s) =>
        (cid > 0 && Number(s.id) === cid) ||
        (cUser && String(s.username || '').toLowerCase() === cUser) ||
        (cName && String(s.displayName || '').toLowerCase() === cName)
    );
  }, [currentUser, staffDirectory]);

  const assigneeOptions: MobileTaskAssigneeOption[] = useMemo(() => {
    const list = [...staffDirectory];
    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    const myName =
      currentStaff?.displayName ||
      currentStaff?.username ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Danny Do';

    const hasMeInList = myId > 0 && list.some((s) => s.id === myId);

    list.sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      const nameA = a.displayName || a.username || '';
      const nameB = b.displayName || b.username || '';
      return nameA.localeCompare(nameB, 'vi');
    });

    const opts: MobileTaskAssigneeOption[] = list.map((s) => {
      const isMe = s.id === myId;
      const roleStr = s.role ? ` (${s.role})` : '';
      const name = s.displayName || s.username;
      const emailHint = s.username && s.displayName && s.username !== s.displayName ? ` · ${s.username}` : '';
      return {
        value: String(s.id),
        label: isMe ? `⭐ Chính tôi (${name})` : `${name}${emailHint}${roleStr}`,
        staffId: s.id,
        displayName: name,
        avatarUrl: s.avatarUrl || null,
        role: s.role || null,
        isMe,
      };
    });

    if (!hasMeInList && myId > 0) {
      opts.unshift({
        value: String(myId),
        label: `⭐ Chính tôi (${myName})`,
        staffId: myId,
        displayName: myName,
        avatarUrl: currentStaff?.avatarUrl || currentUser?.avatarUrl || currentUser?.avatar || null,
        role: currentStaff?.role || currentUser?.role || null,
        isMe: true,
      });
    }

    return opts;
  }, [staffDirectory, currentStaff, currentUser]);

  const resolveDefaultAssigneeId = (): string | undefined => {
    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    if (activeConversation?.isSelf) {
      return myId > 0 ? String(myId) : undefined;
    }
    if (activeConversation?.type === 'dm') {
      const peerId = activeConversation.memberIds?.find((id: SafeAny) => Number(id) !== myId);
      return peerId ? String(peerId) : myId > 0 ? String(myId) : undefined;
    }
    return myId > 0 ? String(myId) : undefined;
  };

  const openCreateTaskModal = (initialTitle = '', sourceMsg: MosChatMessage | null = null) => {
    setEditingTaskForModal(null);
    setTaskThreadContext(null);
    setTaskTitle(initialTitle);
    setTaskSourceMsg(sourceMsg);
    setTaskAssigneeId(resolveDefaultAssigneeId());
    setTaskDueAt(null);
    setTaskPriority('NORMAL');
    setTaskModalOpen(true);
  };

  const openTaskModalForThread = (params?: {
    initialTitle?: string;
    sourceMsg?: MosChatMessage | null;
    existingTask?: MosChatTaskItem | null;
    sourceReply?: MosChatThreadReply | null;
    isNew?: boolean;
  }) => {
    const sourceMsg = params?.sourceMsg || activeThreadMsg || null;
    const existing = params?.isNew ? null : params?.existingTask || null;

    setEditingTaskForModal(existing);
    setTaskSourceMsg(sourceMsg);
    setTaskThreadContext({
      inThread: true,
      sourceReply: params?.sourceReply || null,
    });

    if (existing) {
      setTaskTitle(params?.initialTitle || existing.title);
      setTaskAssigneeId(existing.assigneeId ? String(existing.assigneeId) : undefined);
      setTaskDueAt(existing.dueAt || existing.deadline || null);
      setTaskPriority(existing.priority || 'NORMAL');
    } else {
      setTaskTitle(params?.initialTitle || sourceMsg?.text.slice(0, 100) || '');
      setTaskAssigneeId(resolveDefaultAssigneeId());
      setTaskDueAt(null);
      setTaskPriority('NORMAL');
    }

    setTaskModalOpen(true);
  };

  const handleCreateTaskFromMsg = (msg: MosChatMessage) => {
    openCreateTaskModal(msg.text.slice(0, 100), msg);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setEditingTaskForModal(null);
    setTaskThreadContext(null);
  };

  const handleConfirmCreateTask = async () => {
    const trimmed = taskTitle.trim();
    if (!trimmed) {
      antdMessage.warning('Vui lòng nhập tên công việc');
      return;
    }

    const myId = currentStaff?.id || Number(currentUser?.id) || 0;
    const resolvedId = taskAssigneeId || (myId > 0 ? String(myId) : undefined);
    const assignee = staffDirectory.find((s) => String(s.id) === String(resolvedId)) || currentStaff;

    const resolvedAssigneeId = assignee ? String(assignee.id) : resolvedId;
    const resolvedAssigneeName =
      assignee?.displayName ||
      assignee?.username ||
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      'Danny Do';

    const isThreadContext = taskThreadContext?.inThread && activeThreadMsg;

    if (editingTaskForModal) {
      const success = await updateTask(editingTaskForModal.id, {
        title: trimmed,
        assigneeId: resolvedAssigneeId,
        assigneeName: resolvedAssigneeName,
        dueAt: taskDueAt,
        deadline: taskDueAt,
        priority: taskPriority,
      });

      if (success) {
        antdMessage.success(`Đã cập nhật Main Task cho ${resolvedAssigneeName}`);
        if (isThreadContext) {
          const dueFormatted = taskDueAt ? dayjs(taskDueAt).format('HH:mm DD/MM') : 'Không có';
          await sendThreadReply(
            `📌 Đã cập nhật Main Task: "${trimmed}" · Người nhận: @${resolvedAssigneeName} · Hạn chót: ${dueFormatted}`
          );
        }
        closeTaskModal();
        setTaskTitle('');
        setTaskAssigneeId(undefined);
        setTaskDueAt(null);
        setTaskSourceMsg(null);
      } else {
        antdMessage.error('Không thể cập nhật công việc, vui lòng thử lại');
      }
    } else {
      const success = await createTask(trimmed, {
        assigneeStaffId: resolvedAssigneeId,
        assigneeName: resolvedAssigneeName,
        dueAt: taskDueAt,
        priority: taskPriority,
        sourceMessageId: taskSourceMsg?.id,
      });

      if (success) {
        const isSelf = String(resolvedAssigneeId) === String(myId);
        antdMessage.success(
          isSelf
            ? `Đã tạo việc cho chính mình (${resolvedAssigneeName})`
            : `Đã giao việc thành công cho ${resolvedAssigneeName}`
        );
        if (isThreadContext) {
          const dueFormatted = taskDueAt ? dayjs(taskDueAt).format('HH:mm DD/MM') : 'Không có';
          await sendThreadReply(
            `📌 Đã giao việc cho Main Task: "${trimmed}" · Người nhận: @${resolvedAssigneeName} · Hạn chót: ${dueFormatted}`
          );
        }
        closeTaskModal();
        setTaskTitle('');
        setTaskAssigneeId(undefined);
        setTaskDueAt(null);
        setTaskSourceMsg(null);
      } else {
        antdMessage.error('Không thể tạo việc, vui lòng thử lại');
      }
    }
  };

  const handleSaveEditedTask = async (
    taskId: string,
    updates: {
      title: string;
      assigneeId?: string;
      assigneeName?: string;
      dueAt?: string | null;
      priority: MosChatTaskPriority;
    }
  ) => {
    const success = await updateTask(taskId, updates);
    if (success) {
      antdMessage.success('Đã lưu thay đổi công việc');
    } else {
      antdMessage.error('Không thể lưu thay đổi công việc');
    }
  };

  const handleSubmitNegotiation = async (task: MosChatTaskItem, proposedDeadline: string, reason: string) => {
    const myName =
      currentUser?.displayName || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Danny Do';
    const nowIso = new Date().toISOString();

    const success = await updateTask(task.id, {
      negotiatedDeadline: proposedDeadline,
      negotiationNote: reason,
      negotiatedBy: myName,
      negotiatedAt: nowIso,
    });
    if (success) {
      antdMessage.success('Đã gửi đề xuất thương lượng dời hạn chót thành công!');
    } else {
      antdMessage.error('Không thể gửi đề xuất thương lượng dời hạn');
    }
  };

  const handleSubmitMission = async (
    task: MosChatTaskItem,
    missionData: { title: string; type: 'BUG' | 'FEATURE'; note: string }
  ) => {
    try {
      const mission = await dispatchMissionFromTask(task, missionData);
      if (mission) {
        antdMessage.success(`🚀 Đã chuyển vào mOS Mission #${mission.missionKey} thành công!`);
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển vào mOS Mission');
    }
  };

  const handleGoToSourceMessage = (task: MosChatTaskItem) => {
    if (!task.sourceMessageId) return;
    if (task.conversationId && task.conversationId !== activeConversation?.id) {
      setActiveConvId(task.conversationId);
    }
    const targetConv = conversations.find((c) => c.id === task.conversationId) || activeConversation;
    const msg = targetConv?.messages?.find((m) => m.id === task.sourceMessageId);
    if (msg) {
      setActiveThreadMsg(msg);
      setMobileView('thread');
    } else {
      setMobileView('room');
    }
    setSelectedDetailTaskId(null);
  };

  return {
    selectedDetailTask,
    setSelectedDetailTaskId,
    editingTask,
    setEditingTaskId,
    negotiatingTask,
    setNegotiatingTaskId,
    missionTask,
    setMissionTaskId,
    taskModalOpen,
    editingTaskForModal,
    taskThreadContext,
    taskTitle,
    setTaskTitle,
    taskAssigneeId,
    setTaskAssigneeId,
    taskDueAt,
    setTaskDueAt,
    taskPriority,
    setTaskPriority,
    assigneeOptions,
    openCreateTaskModal,
    openTaskModalForThread,
    handleCreateTaskFromMsg,
    closeTaskModal,
    handleConfirmCreateTask,
    handleSaveEditedTask,
    handleSubmitNegotiation,
    handleSubmitMission,
    handleGoToSourceMessage,
  };
}
