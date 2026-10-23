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

const MosChatContext = createContext<MosChatContextValue | null>(null);

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
          const currentCount = m.reactions?.[emoji] || 0;
          const nextReactions = { ...m.reactions };
          nextReactions[emoji] = currentCount > 0 ? currentCount + 1 : 1;
          return { ...m, reactions: nextReactions };
        });
        return { ...prev, [activeConvId]: nextList };
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

  // Edit message
  const editMessage = useCallback(
    async (msgId: string, newText: string) => {
      setAllMessagesByConv((prev) => ({
        ...prev,
        [activeConvId]: (prev[activeConvId] || []).map((m) => (m.id === msgId ? { ...m, text: newText } : m)),
      }));
      try {
        await apiClient.chat.editMessage(msgId, {
          conversationId: activeConvId,
          text: newText,
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

      const tempTask: MosChatTaskItem = {
        id: `task_${Date.now()}`,
        conversationId: activeConvId,
        conversationName: activeConversation?.name || 'Không gian',
        title: trimmed,
        done: false,
        assigneeId: options?.assigneeStaffId,
        assigneeName: options?.assigneeName || 'Thành viên',
        creatorName: currentUser?.fullName || currentUser?.name || 'Tôi',
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
          assigneeId: options?.assigneeStaffId,
          assigneeName: options?.assigneeName || 'Thành viên',
          dueAt: options?.dueAt || null,
          priority: options?.priority || 'NORMAL',
          sourceMessageId: options?.sourceMessageId,
        });
        if (res && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === tempTask.id ? res.task : t)));
        }
        return true;
      } catch {
        return false;
      }
    },
    [activeConvId, activeConversation, currentUser]
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
      currentUser,
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
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      togglePinMessage,
      deleteMessage,
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
      refresh: fetchBootstrap,
    }),
    [
      currentUser,
      staffDirectory,
      presence,
      conversations,
      activeConvId,
      activeConversation,
      sidebarFilter,
      searchQuery,
      togglePinConversation,
      markConversationAsRead,
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      togglePinMessage,
      deleteMessage,
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
      workflowTemplates,
      workflowInstances,
      triggerWorkflow,
      mobileView,
      selectedMsgForAction,
      replyingToMessage,
      totalUnreadCount,
      totalTaskCount,
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
