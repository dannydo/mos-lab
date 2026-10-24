'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatThreadReply,
  MosChatTaskItem,
  MosChatStaffMember,
  MosChatImageAttachment,
  MosChatPresenceStatus,
  MosChatTaskPriority,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  MosChatMissionSummary,
  MosChatMissionActionType,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import {
  FALLBACK_CONVERSATIONS,
  FALLBACK_TASKS,
  getInitialStaffDirectory,
  STAFF_DIRECTORY_CACHE_KEY,
} from '../constants/chat-constants';
import { useMosChatBridgeListener } from '../store/mos-chat-bridge';
import type {
  MosChatActiveSubtab,
  MosChatContextValue,
  MosChatMobileView,
  MosChatSidebarFilter,
} from '../types/mos-chat-types';

export const MosChatContext = createContext<MosChatContextValue | null>(null);

export interface MosChatProviderProps {
  children: React.ReactNode;
  currentUser?: SafeAny;
  initialConvId?: string;
  onUnreadCountChange?: (unread: number, tasks: number) => void;
}

export const MosChatProvider: React.FC<MosChatProviderProps> = ({
  children,
  currentUser,
  initialConvId = 'space-cc',
  onUnreadCountChange,
}) => {
  // Sync currentUser with local storage fallback
  const [localUser, setLocalUser] = useState<SafeAny>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setLocalUser(currentUser);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('mos_user');
        if (stored) {
          setLocalUser(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }
  }, [currentUser]);

  const effectiveUser = currentUser || localUser;

  // Staff Directory
  const [staffDirectory, setStaffDirectory] = useState<MosChatStaffMember[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STAFF_DIRECTORY_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
    return getInitialStaffDirectory();
  });

  const [presence, setPresence] = useState<MosChatPresenceStatus>('active');
  const [conversations, setConversations] = useState<MosChatConversation[]>(FALLBACK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(initialConvId);
  const [sidebarFilter, setSidebarFilter] = useState<MosChatSidebarFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pinnedConvIds, setPinnedConvIds] = useState<Set<string>>(new Set());

  // Messages per conversation
  const [allMessagesByConv, setAllMessagesByConv] = useState<Record<string, MosChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  // Thread
  const [activeThreadMsg, setActiveThreadMsg] = useState<MosChatMessage | null>(null);

  // Tasks & Subtab
  const [activeSubtab, setActiveSubtab] = useState<MosChatActiveSubtab>('chat');
  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [workflowTemplates, setWorkflowTemplates] = useState<MosChatWorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<MosChatWorkflowInstance[]>([]);

  // Mobile navigation
  const [mobileView, setMobileView] = useState<MosChatMobileView>('inbox');
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<MosChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<MosChatMessage | null>(null);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0] || null;
  }, [conversations, activeConvId]);

  const messages = useMemo(() => {
    return allMessagesByConv[activeConvId] || activeConversation?.messages || [];
  }, [allMessagesByConv, activeConvId, activeConversation]);

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.pinned);
  }, [messages]);

  const threadReplies = useMemo(() => {
    return activeThreadMsg?.thread || [];
  }, [activeThreadMsg]);

  // Total unread count
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Total open task count
  const totalTaskCount = useMemo(() => {
    return tasks.filter((t) => !t.done).length;
  }, [tasks]);

  useEffect(() => {
    onUnreadCountChange?.(totalUnreadCount, totalTaskCount);
  }, [totalUnreadCount, totalTaskCount, onUnreadCountChange]);

  // Bootstrap data fetch
  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await apiClient.chat.bootstrap();
      if (res && res.conversations) {
        setConversations(res.conversations);
        const map: Record<string, MosChatMessage[]> = {};
        res.conversations.forEach((c) => {
          if (c.messages && c.messages.length > 0) {
            map[c.id] = c.messages;
          }
        });
        setAllMessagesByConv((prev) => ({ ...prev, ...map }));
      }
      if (res && res.userPrefs?.pinnedIds) {
        setPinnedConvIds(new Set(res.userPrefs.pinnedIds));
      }
      if (res && res.tasks) {
        setTasks(res.tasks);
      }
      if (res && res.workflowTemplates) {
        setWorkflowTemplates(res.workflowTemplates);
      }
      if (res && res.workflowInstances) {
        setWorkflowInstances(res.workflowInstances);
      }
      if (res && res.staffDirectory && res.staffDirectory.length > 0) {
        setStaffDirectory(res.staffDirectory);
        try {
          localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, JSON.stringify(res.staffDirectory));
        } catch {
          // ignore
        }
      }
    } catch {
      // offline or silent error
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
    const interval = setInterval(fetchBootstrap, 5000);
    return () => clearInterval(interval);
  }, [fetchBootstrap]);

  // Global Bridge listener
  useMosChatBridgeListener(
    useCallback((action) => {
      if (action.type === 'OPEN_CONVERSATION') {
        setActiveConvId(action.conversationId);
        setMobileView('room');
      }
    }, [])
  );

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (convId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    try {
      await apiClient.chat.markAsRead(convId);
    } catch {
      // ignore
    }
  }, []);

  // Toggle pin conversation
  const togglePinConversation = useCallback(async (convId: string) => {
    setPinnedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
    try {
      await apiClient.chat.togglePinConversation(convId);
    } catch {
      // ignore
    }
  }, []);

  // Start or open direct message with a staff member
  const startDirectMessage = useCallback(
    async (staff: MosChatStaffMember): Promise<string | null> => {
      const peerId = Number(staff.id);
      const myStaffId = Number(currentUser?.id) || 0;
      const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;

      // Check if conversation already exists
      const existing = conversations.find((c) => {
        if (c.type !== 'dm' || c.isSelf) return false;
        if (myStaffId > 0 && peerId > 0 && Array.isArray(c.memberIds)) {
          const nums = c.memberIds.map(Number);
          if (nums.includes(myStaffId) && nums.includes(peerId)) return true;
        }
        return Number(c.participantStaffId) === peerId || c.name === staffName;
      });

      if (existing) {
        setActiveConvId(existing.id);
        markConversationAsRead(existing.id);
        setMobileView('room');
        return existing.id;
      }

      try {
        const res = await apiClient.chat.createConversation({
          type: 'dm',
          name: staffName,
          participantStaffId: staff.id,
        });
        if (res?.conversation) {
          setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
          setActiveConvId(res.conversation.id);
          markConversationAsRead(res.conversation.id);
          setMobileView('room');
          return res.conversation.id;
        }
      } catch {
        // Fallback: create local conversation if offline or API returns error
        const localDmId = `dm-${staff.id}`;
        const newDm: MosChatConversation = {
          id: localDmId,
          type: 'dm',
          name: staffName,
          color: '#3b82f6',
          participantStaffId: staff.id,
          memberIds: [myStaffId, peerId],
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        setConversations((prev) => [newDm, ...prev]);
        setActiveConvId(localDmId);
        setMobileView('room');
        return localDmId;
      }
      return null;
    },
    [conversations, currentUser, markConversationAsRead]
  );

  // Add member to space
  const addMemberToSpace = useCallback(
    async (staffId: number, spaceId?: string): Promise<MosChatConversation | null> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return null;

      try {
        const res = await apiClient.chat.addMember(targetSpaceId, staffId);
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return res.conversation;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.addMember failed or mocked, applying optimistic fallback:', err);
      }

      // Optimistic fallback for mock/local environments
      let updatedConv: MosChatConversation | null = null;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetSpaceId) return c;
          const currentIds = Array.isArray(c.memberIds) ? c.memberIds.map(Number) : [];
          if (currentIds.includes(Number(staffId))) return c;
          const updatedIds = [...currentIds, Number(staffId)];
          const targetStaff = staffDirectory.find((s) => Number(s.id) === Number(staffId));
          const updatedMembers = Array.isArray(c.members) ? [...c.members] : [];
          if (targetStaff && !updatedMembers.some((m) => Number(m.id) === Number(staffId))) {
            updatedMembers.push(targetStaff);
          }
          updatedConv = {
            ...c,
            memberIds: updatedIds,
            members: updatedMembers,
            memberCount: updatedIds.length,
          };
          return updatedConv;
        })
      );
      return updatedConv;
    },
    [activeConvId, staffDirectory]
  );

  // Send message
  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        attachments?: MosChatImageAttachment[];
        targetConvId?: string;
        replyToId?: string;
      }
    ): Promise<boolean> => {
      const targetId = options?.targetConvId || activeConvId;
      const trimmed = text.trim();
      if (!trimmed && (!options?.attachments || options.attachments.length === 0)) return false;

      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: MosChatMessage = {
        id: tempId,
        conversationId: targetId,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: trimmed,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        attachments: options?.attachments,
        reactions: {},
        pinned: false,
      };

      setAllMessagesByConv((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), optimisticMsg],
      }));

      try {
        const res = await apiClient.chat.sendMessage({
          conversationId: targetId,
          text: trimmed,
          attachments: options?.attachments,
        });
        if (res && res.message) {
          setAllMessagesByConv((prev) => ({
            ...prev,
            [targetId]: (prev[targetId] || []).map((m) => (m.id === tempId ? res.message : m)),
          }));
        }
        setReplyingToMessage(null);
        return true;
      } catch {
        return false;
      }
    },
    [activeConvId, currentUser]
  );

  // Send thread reply
  const sendThreadReply = useCallback(
    async (text: string, options?: { attachments?: MosChatImageAttachment[] }): Promise<boolean> => {
      if (!activeThreadMsg) return false;
      const trimmed = text.trim();
      if (!trimmed && (!options?.attachments || options.attachments.length === 0)) return false;

      const tempReply: MosChatThreadReply = {
        id: `reply_${Date.now()}`,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: trimmed,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        attachments: options?.attachments,
        reactions: {},
      };

      setActiveThreadMsg((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          thread: [...(prev.thread || []), tempReply],
        };
      });

      try {
        const res = await apiClient.chat.sendThreadReply({
          conversationId: activeConvId,
          messageId: activeThreadMsg.id,
          text: trimmed,
          attachments: options?.attachments,
        });
        if (res && res.reply) {
          setActiveThreadMsg((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              thread: (prev.thread || []).map((r) => (r.id === tempReply.id ? res.reply : r)),
            };
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    [activeThreadMsg, activeConvId, currentUser]
  );

  // React to message
  const reactToMessage = useCallback(
    async (msgId: string, emoji: string, replyId?: string) => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }

      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || [];
        const nextList = currentList.map((m) => {
          if (m.id !== msgId) return m;

          // If reacting to a reply in thread
          if (replyId && m.thread) {
            const nextThread = m.thread.map((r) => {
              if (r.id !== replyId) return r;
              const currentCount = r.reactions?.[emoji] || 0;
              const nextReactions = { ...r.reactions };
              nextReactions[emoji] = currentCount > 0 ? currentCount + 1 : 1;
              return { ...r, reactions: nextReactions };
            });
            return { ...m, thread: nextThread };
          }

          const currentCount = m.reactions?.[emoji] || 0;
          const nextReactions = { ...m.reactions };
          nextReactions[emoji] = currentCount > 0 ? currentCount + 1 : 1;
          return { ...m, reactions: nextReactions };
        });
        return { ...prev, [activeConvId]: nextList };
      });

      setActiveThreadMsg((prev) => {
        if (!prev) return null;
        if (prev.id === msgId) {
          if (replyId && prev.thread) {
            const nextThread = prev.thread.map((r) => {
              if (r.id !== replyId) return r;
              const currentCount = r.reactions?.[emoji] || 0;
              const nextReactions = { ...r.reactions };
              nextReactions[emoji] = currentCount > 0 ? currentCount + 1 : 1;
              return { ...r, reactions: nextReactions };
            });
            return { ...prev, thread: nextThread };
          } else if (!replyId) {
            const currentCount = prev.reactions?.[emoji] || 0;
            const nextReactions = { ...prev.reactions };
            nextReactions[emoji] = currentCount > 0 ? currentCount + 1 : 1;
            return { ...prev, reactions: nextReactions };
          }
        }
        return prev;
      });

      try {
        await apiClient.chat.reactToMessage(msgId, activeConvId, emoji, replyId);
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Toggle pin message
  const togglePinMessage = useCallback(
    async (msgId: string) => {
      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || [];
        const nextList = currentList.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m));
        return { ...prev, [activeConvId]: nextList };
      });
      try {
        await apiClient.chat.togglePinMessage(msgId, activeConvId);
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (msgId: string) => {
      setAllMessagesByConv((prev) => ({
        ...prev,
        [activeConvId]: (prev[activeConvId] || []).filter((m) => m.id !== msgId),
      }));
      try {
        await apiClient.chat.deleteMessage(msgId, { conversationId: activeConvId });
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Delete thread reply
  const deleteThreadReply = useCallback(
    async (parentMsgId: string, replyId: string) => {
      setActiveThreadMsg((prev) => {
        if (!prev || prev.id !== parentMsgId) return prev;
        return {
          ...prev,
          thread: (prev.thread || []).filter((r) => r.id !== replyId),
        };
      });
      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || [];
        return {
          ...prev,
          [activeConvId]: currentList.map((m) =>
            m.id === parentMsgId ? { ...m, thread: (m.thread || []).filter((r) => r.id !== replyId) } : m
          ),
        };
      });
      try {
        await apiClient.chat.deleteMessage(replyId, { conversationId: activeConvId });
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Edit message
  const editMessage = useCallback(
    async (msgId: string, newText: string, options?: { replyId?: string }) => {
      const nowIso = new Date().toISOString();

      if (options?.replyId) {
        const replyId = options.replyId;
        setActiveThreadMsg((prev) => {
          if (!prev || prev.id !== msgId) return prev;
          return {
            ...prev,
            thread: (prev.thread || []).map((r) => (r.id === replyId ? { ...r, text: newText, editedAt: nowIso } : r)),
          };
        });
        setAllMessagesByConv((prev) => {
          const currentList = prev[activeConvId] || [];
          return {
            ...prev,
            [activeConvId]: currentList.map((m) => {
              if (m.id !== msgId) return m;
              return {
                ...m,
                thread: (m.thread || []).map((r) => (r.id === replyId ? { ...r, text: newText, editedAt: nowIso } : r)),
              };
            }),
          };
        });
      } else {
        setAllMessagesByConv((prev) => ({
          ...prev,
          [activeConvId]: (prev[activeConvId] || []).map((m) =>
            m.id === msgId ? { ...m, text: newText, editedAt: nowIso } : m
          ),
        }));
        setActiveThreadMsg((prev) => {
          if (!prev || prev.id !== msgId) return prev;
          return { ...prev, text: newText, editedAt: nowIso };
        });
      }

      try {
        await apiClient.chat.editMessage(msgId, {
          conversationId: activeConvId,
          text: newText,
          replyId: options?.replyId,
        });
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Buzz message
  const buzzMessage = useCallback(
    async (msgId: string) => {
      try {
        await apiClient.chat.buzzMessage(msgId, { conversationId: activeConvId });
      } catch {
        // ignore
      }
    },
    [activeConvId]
  );

  // Create task
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
        }
        return true;
      } catch (err: SafeAny) {
        console.error('Failed to create task in MosChatContext:', err?.response?.data || err?.message || err);
        setTasks((prev) => prev.filter((t) => t.id !== tempTask.id));
        return false;
      }
    },
    [activeConvId, activeConversation, effectiveUser]
  );

  // Toggle task done
  const toggleTaskDone = useCallback(async (taskId: string, done: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    try {
      await apiClient.chat.updateTask(taskId, { done });
    } catch {
      // ignore
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (taskId: string, payload: UpdateMosChatTaskRequest): Promise<boolean> => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          ...payload,
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
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await apiClient.chat.deleteTask(taskId);
      return true;
    } catch (err) {
      console.error('Failed to delete task:', err);
      return false;
    }
  }, []);

  // Accept negotiated deadline
  const acceptNegotiatedDeadline = useCallback(async (task: MosChatTaskItem): Promise<boolean> => {
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
  }, []);

  // Reject negotiated deadline
  const rejectNegotiatedDeadline = useCallback(async (task: MosChatTaskItem): Promise<boolean> => {
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
  }, []);

  // Dispatch mission from task
  const dispatchMissionFromTask = useCallback(
    async (
      task: MosChatTaskItem,
      payload: { title?: string; type?: 'BUG' | 'FEATURE'; note?: string }
    ): Promise<SafeAny> => {
      try {
        const res = await apiClient.chat.createMission({
          conversationId: task.conversationId || activeConvId,
          messageId: task.sourceMessageId || '',
          taskId: task.id,
          title: payload.title || task.title,
          type: payload.type || 'FEATURE',
          note: payload.note || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
        });
        if (res && res.mission) {
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
    [activeConvId]
  );

  // Execute mission action (Approve Cổng 1, Approve Commit Cổng 2, Approve Deploy Cổng 3, Nghiệm thu, Reopen)
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
          // Update task in state
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id === mission.taskId || t.missionId === mission.reportId || t.missionKey === mission.missionKey) {
                return {
                  ...t,
                  mission: res.mission,
                  done: action === 'REPORTER_ACCEPT' ? true : t.done,
                };
              }
              return t;
            })
          );
          // Also update conversation messages if messageId exists
          if (mission.messageId) {
            setAllMessagesByConv((prev) => {
              const currentList = prev[mission.conversationId || activeConvId] || [];
              return {
                ...prev,
                [mission.conversationId || activeConvId]: currentList.map((m) =>
                  m.id === mission.messageId ? res.message || { ...m, mission: res.mission } : m
                ),
              };
            });
          }
          return res.mission;
        }
        return null;
      } catch (err: SafeAny) {
        console.error('Failed to execute mission action:', err);
        throw err;
      }
    },
    [activeConvId]
  );

  // Trigger workflow
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
    [activeConvId]
  );

  const value = useMemo<MosChatContextValue>(
    () => ({
      currentUser: effectiveUser,
      staffDirectory,
      presence,
      setPresence,
      conversations,
      activeConvId,
      activeConversation,
      setActiveConvId: (id: string) => {
        setActiveConvId(id);
        markConversationAsRead(id);
      },
      sidebarFilter,
      setSidebarFilter,
      searchQuery,
      setSearchQuery,
      togglePinConversation,
      markConversationAsRead,
      startDirectMessage,
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      togglePinMessage,
      deleteMessage,
      deleteThreadReply,
      editMessage,
      buzzMessage,
      activeThreadMsg,
      setActiveThreadMsg,
      threadReplies,
      sendThreadReply,
      activeSubtab,
      setActiveSubtab,
      tasks,
      pinnedMessages,
      createTask,
      toggleTaskDone,
      updateTask,
      deleteTask,
      acceptNegotiatedDeadline,
      rejectNegotiatedDeadline,
      dispatchMissionFromTask,
      executeMissionAction,
      workflowTemplates,
      workflowInstances,
      triggerWorkflow,
      mobileView,
      setMobileView,
      selectedMsgForAction,
      setSelectedMsgForAction,
      replyingToMessage,
      setReplyingToMessage,
      totalUnreadCount,
      totalTaskCount,
      addMemberToSpace,
      refresh: fetchBootstrap,
    }),
    [
      effectiveUser,
      staffDirectory,
      presence,
      conversations,
      activeConvId,
      activeConversation,
      sidebarFilter,
      searchQuery,
      togglePinConversation,
      markConversationAsRead,
      startDirectMessage,
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      togglePinMessage,
      deleteMessage,
      deleteThreadReply,
      editMessage,
      buzzMessage,
      activeThreadMsg,
      threadReplies,
      sendThreadReply,
      activeSubtab,
      tasks,
      pinnedMessages,
      createTask,
      toggleTaskDone,
      updateTask,
      deleteTask,
      acceptNegotiatedDeadline,
      rejectNegotiatedDeadline,
      dispatchMissionFromTask,
      executeMissionAction,
      workflowTemplates,
      workflowInstances,
      triggerWorkflow,
      mobileView,
      selectedMsgForAction,
      replyingToMessage,
      totalUnreadCount,
      totalTaskCount,
      addMemberToSpace,
      fetchBootstrap,
    ]
  );

  return <MosChatContext.Provider value={value}>{children}</MosChatContext.Provider>;
};

export function useMosChat(): MosChatContextValue {
  const ctx = useContext(MosChatContext);
  if (!ctx) {
    throw new Error('useMosChat must be used within a MosChatProvider');
  }
  return ctx;
}
