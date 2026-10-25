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
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { tabNotificationManager } from '../../../lib/tab-notification';
import {
  FALLBACK_CONVERSATIONS,
  FALLBACK_TASKS,
  getInitialStaffDirectory,
  STAFF_DIRECTORY_CACHE_KEY,
} from '../constants/chat-constants';
import { useMosChatBridgeListener } from '../store/mos-chat-bridge';
import { mergeDeltaConversations, mergeDeltaTasks, useChatRealtimeSync } from '../store/useChatRealtimeSync';
import type {
  MosChatActiveSubtab,
  MosChatContextValue,
  MosChatMobileView,
  MosChatSidebarFilter,
} from '../types/mos-chat-types';

async function convertAttachmentToDataUrl(attachment?: MosChatImageAttachment): Promise<string | undefined> {
  if (!attachment?.url) return undefined;
  try {
    const resolvedUrl = resolveMediaUrl(attachment.url);
    const resp = await fetch(resolvedUrl);
    if (!resp.ok) return undefined;
    const blob = await resp.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

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

  useEffect(() => {
    if (initialConvId) {
      setActiveConvId(initialConvId);
    }
  }, [initialConvId]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pinnedConvIds, setPinnedConvIds] = useState<Set<string>>(new Set());

  // Messages per conversation
  const [allMessagesByConv, setAllMessagesByConv] = useState<Record<string, MosChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  // Thread
  const [activeThreadMsg, setActiveThreadMsg] = useState<MosChatMessage | null>(null);

  // AI Copilot
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

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
    tabNotificationManager.setUnreadCount('chat-context', totalUnreadCount);
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

        // Keep activeThreadMsg synced with the latest server thread data!
        setActiveThreadMsg((current) => {
          if (!current) return null;
          for (const c of res.conversations) {
            const found = c.messages?.find((m) => m.id === current.id);
            if (found) {
              return found;
            }
          }
          return current;
        });
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

  // Enterprise Incremental Delta Sync on visibility / background cadence
  useChatRealtimeSync({
    enabled: true,
    intervalMs: 12_000,
    onDeltaSynced: (delta) => {
      if (
        delta.updatedConversations.length > 0 ||
        delta.updatedMessages.length > 0 ||
        delta.updatedMissions.length > 0
      ) {
        setConversations((prev) =>
          mergeDeltaConversations(prev, delta.updatedConversations, delta.updatedMessages, delta.updatedMissions)
        );
      }
      if (delta.updatedTasks.length > 0 || delta.updatedMissions.length > 0) {
        setTasks((prev) => mergeDeltaTasks(prev, delta.updatedTasks, delta.updatedMissions));
      }
    },
  });

  // Global Bridge listener
  useMosChatBridgeListener(
    useCallback((action) => {
      if (action.type === 'OPEN_CONVERSATION') {
        setActiveConvId(action.conversationId);
        setMobileView('room');
      }
    }, [])
  );

  // Also listen to global 'mos-chat:open' event for mobile / context-driven views
  useEffect(() => {
    const handleGlobalOpen = (ev: Event) => {
      const customEv = ev as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        openTab?: MosChatActiveSubtab;
      }>;
      const detail = customEv.detail || {};
      if (detail.openTab) {
        setActiveSubtab(detail.openTab);
      }
      if (detail.conversationId) {
        setActiveConvId(detail.conversationId);
        setMobileView('room');
      }
    };
    window.addEventListener('mos-chat:open', handleGlobalOpen);
    return () => window.removeEventListener('mos-chat:open', handleGlobalOpen);
  }, []);

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

  // Update space config
  const updateSpaceConfig = useCallback(
    async (
      convId: string,
      payload: { name?: string; subtitle?: string; avatar?: string; color?: string }
    ): Promise<boolean> => {
      try {
        const res = await apiClient.chat.updateSpaceConfig(convId, payload);
        if (res?.success && res.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return true;
        }
      } catch (err) {
        console.error('Failed to update space config:', err);
      }
      return false;
    },
    []
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

        // If user tagged @MAI, invoke MAI Copilot
        if (/(?:^|\s)@\s*mai\b/i.test(trimmed)) {
          const cleanedPrompt =
            trimmed.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung trên giúp nhóm.';
          setIsAiThinking(true);
          void (async () => {
            try {
              const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
              await apiClient.ai.sendMessage({
                message: cleanedPrompt,
                scope: `mos-chat-space:${targetId}`,
                imageDataUrl,
                context: {
                  page: `mos-chat-space:${targetId}`,
                  userName: currentUser?.fullName || currentUser?.name || 'Tôi',
                  myRole: currentUser?.role || 'super_admin',
                },
              });
              await fetchBootstrap();
            } catch {
              // ignore
            } finally {
              setIsAiThinking(false);
            }
          })();
        }

        return true;
      } catch {
        return false;
      }
    },
    [activeConvId, currentUser, fetchBootstrap]
  );

  // Send thread reply
  const sendThreadReply = useCallback(
    async (text: string, options?: { attachments?: MosChatImageAttachment[] }): Promise<boolean> => {
      if (!activeThreadMsg) return false;
      const trimmed = text.trim();
      if (!trimmed && (!options?.attachments || options.attachments.length === 0)) return false;

      const currentThreadMsg = activeThreadMsg;
      const targetConv = activeConversation;

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
          messageId: currentThreadMsg.id,
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

        // If user tagged @MAI, invoke MAI Copilot with full thread context!
        if (/(?:^|\s)@\s*mai\b/i.test(trimmed)) {
          const cleanedPrompt =
            trimmed.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() ||
            'Hãy phân tích nội dung luồng thảo luận trên giúp nhóm.';
          const rootContent = currentThreadMsg
            ? `[Tin nhắn gốc từ ${currentThreadMsg.senderName}]: ${currentThreadMsg.text || ''}`
            : '';
          const threadRepliesText = (currentThreadMsg?.thread || [])
            .slice(-10)
            .map((r) => `- ${r.senderName}: ${r.text || ''}`)
            .join('\n');
          const contextPayload = [
            `[Bối cảnh Luồng thảo luận (Thread) trong không gian "${targetConv?.name || activeConvId}"]:`,
            rootContent,
            threadRepliesText ? `[Các phản hồi trước đó trong luồng]:\n${threadRepliesText}` : '',
            `[Câu hỏi từ ${currentUser?.fullName || currentUser?.name || 'Tôi'}]: ${cleanedPrompt}`,
          ]
            .filter(Boolean)
            .join('\n\n');

          setIsAiThinking(true);
          void (async () => {
            try {
              const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
              await apiClient.ai.sendMessage({
                message: contextPayload,
                scope: `mos-chat-thread:${activeConvId}:${currentThreadMsg.id}`,
                imageDataUrl,
                context: {
                  page: `mos-chat-thread:${activeConvId}:${currentThreadMsg.id}`,
                  userName: currentUser?.fullName || currentUser?.name || 'Tôi',
                  myRole: currentUser?.role || 'super_admin',
                },
              });
              await fetchBootstrap();
            } catch {
              // ignore
            } finally {
              setIsAiThinking(false);
            }
          })();
        }

        return true;
      } catch {
        return false;
      }
    },
    [activeThreadMsg, activeConvId, activeConversation, currentUser, fetchBootstrap]
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
      const now = new Date();
      const myId = effectiveUser?.id || currentUser?.id || 'me';
      const myName =
        effectiveUser?.displayName ||
        effectiveUser?.fullName ||
        effectiveUser?.name ||
        currentUser?.displayName ||
        currentUser?.fullName ||
        currentUser?.name ||
        'Bạn';

      setActiveThreadMsg((prev) => {
        if (!prev || prev.id !== msgId) return prev;
        return {
          ...prev,
          originalText: prev.originalText || prev.text,
          isDeleted: true,
          deletedAt: now.toISOString(),
          deletedBy: myId,
          deletedByName: myName,
        };
      });

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          return {
            ...c,
            messages: (c.messages || []).map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    originalText: m.originalText || m.text,
                    isDeleted: true,
                    deletedAt: now.toISOString(),
                    deletedBy: myId,
                    deletedByName: myName,
                  }
                : m
            ),
          };
        })
      );

      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || [];
        return {
          ...prev,
          [activeConvId]: currentList.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  originalText: m.originalText || m.text,
                  isDeleted: true,
                  deletedAt: now.toISOString(),
                  deletedBy: myId,
                  deletedByName: myName,
                }
              : m
          ),
        };
      });

      try {
        await apiClient.chat.deleteMessage(msgId, { conversationId: activeConvId });
      } catch (err) {
        console.error('Failed to delete message:', err);
        throw err;
      }
    },
    [activeConvId, currentUser, effectiveUser]
  );

  // Delete thread reply
  const deleteThreadReply = useCallback(
    async (parentMsgId: string, replyId: string) => {
      const now = new Date();
      const myId = effectiveUser?.id || currentUser?.id || 'me';
      const myName =
        effectiveUser?.displayName ||
        effectiveUser?.fullName ||
        effectiveUser?.name ||
        currentUser?.displayName ||
        currentUser?.fullName ||
        currentUser?.name ||
        'Bạn';

      setActiveThreadMsg((prev) => {
        if (!prev || prev.id !== parentMsgId) return prev;
        return {
          ...prev,
          thread: (prev.thread || []).map((r) =>
            r.id === replyId
              ? {
                  ...r,
                  originalText: r.originalText || r.text,
                  isDeleted: true,
                  deletedAt: now.toISOString(),
                  deletedBy: myId,
                  deletedByName: myName,
                }
              : r
          ),
        };
      });

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          return {
            ...c,
            messages: (c.messages || []).map((m) =>
              m.id === parentMsgId
                ? {
                    ...m,
                    thread: (m.thread || []).map((r) =>
                      r.id === replyId
                        ? {
                            ...r,
                            originalText: r.originalText || r.text,
                            isDeleted: true,
                            deletedAt: now.toISOString(),
                            deletedBy: myId,
                            deletedByName: myName,
                          }
                        : r
                    ),
                  }
                : m
            ),
          };
        })
      );

      setAllMessagesByConv((prev) => {
        const currentList = prev[activeConvId] || [];
        return {
          ...prev,
          [activeConvId]: currentList.map((m) =>
            m.id === parentMsgId
              ? {
                  ...m,
                  thread: (m.thread || []).map((r) =>
                    r.id === replyId
                      ? {
                          ...r,
                          originalText: r.originalText || r.text,
                          isDeleted: true,
                          deletedAt: now.toISOString(),
                          deletedBy: myId,
                          deletedByName: myName,
                        }
                      : r
                  ),
                }
              : m
          ),
        };
      });

      try {
        await apiClient.chat.deleteMessage(parentMsgId, { conversationId: activeConvId, replyId });
      } catch (err) {
        console.error('Failed to delete thread reply:', err);
        throw err;
      }
    },
    [activeConvId, currentUser, effectiveUser]
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
      isAiThinking,
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
      updateSpaceConfig,
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
      isAiThinking,
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
      updateSpaceConfig,
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
