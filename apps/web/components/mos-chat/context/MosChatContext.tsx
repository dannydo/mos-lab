'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatThreadReply,
  MosChatTaskItem,
  MosChatStaffMember,
  MosChatImageAttachment,
  MosChatCustomerCard,
  MosChatPresenceStatus,
  MosChatTaskPriority,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  MosChatMissionSummary,
  MosChatMissionActionType,
  MosChatThreadMoveMode,
  UpdateMosChatTaskRequest,
  SafeAny,
} from '@mos-lab/shared';
import { message as antdMessage } from 'antd';
import { apiClient } from '../../../lib/api-client';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { tabNotificationManager } from '../../../lib/tab-notification';
import {
  AI_COPILOT_CONV_ID,
  FALLBACK_CONVERSATIONS,
  FALLBACK_TASKS,
  getInitialStaffDirectory,
  STAFF_DIRECTORY_CACHE_KEY,
} from '../constants/chat-constants';
import { useMosChatBridgeListener } from '../store/mos-chat-bridge';
import { mergeDeltaConversations, mergeDeltaTasks, useChatRealtimeSync } from '../store/useChatRealtimeSync';
import { formatBackendAiMessage } from '../utils/chat-helpers';
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

const CustomerDetailDrawer = dynamic(() => import('../../CustomerDetailDrawer'), { ssr: false });

export const MosChatContext = createContext<MosChatContextValue | null>(null);

export interface MosChatProviderProps {
  children: React.ReactNode;
  currentUser?: SafeAny;
  initialConvId?: string;
  initialSubtab?: MosChatActiveSubtab;
  onUnreadCountChange?: (unread: number, tasks: number) => void;
}

export const MosChatProvider: React.FC<MosChatProviderProps> = ({
  children,
  currentUser,
  initialConvId = 'space-cc',
  initialSubtab,
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

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const openCustomerDetail = useCallback((customerId: number) => {
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
  }, []);

  // AI Copilot
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const aiPersonalStorageKey = useMemo(
    () => `mos_chat_ai_private_conv_v1_${effectiveUser?.id || effectiveUser?.username || 'default'}`,
    [effectiveUser?.id, effectiveUser?.username]
  );
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<MosChatMessage[]>([]);
  const aiHydratedRef = useRef<boolean>(false);

  const buildInitialAiWelcomeMessage = useCallback((): MosChatMessage => {
    const userDisplayName =
      effectiveUser?.displayName || effectiveUser?.fullName || effectiveUser?.name || effectiveUser?.username || 'Bạn';
    return {
      id: 'msg-ai-welcome',
      conversationId: AI_COPILOT_CONV_ID,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 MAI',
      senderRole: 'mOS AI',
      senderAvatar: 'MAI',
      roleColor: '#8b5cf6',
      isAiBot: true,
      text:
        `Xin chào ${userDisplayName}! MAI là **mOS AI** đã được tích hợp trực tiếp vào **mOS Chat**.\n` +
        '• **Kênh 1-1 riêng tư**: Mọi trao đổi và phân tích dữ liệu tại đây chỉ một mình bạn nhìn thấy.\n' +
        '• **Gọi @MAI trong #Space**: Gõ `@MAI` kèm câu hỏi trong bất kỳ nhóm Space nào để MAI phân tích và trả lời công khai cho cả nhóm.',
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
      reactions: {},
      thread: [],
    };
  }, [effectiveUser]);

  // Hydrate AI messages from localStorage
  useEffect(() => {
    aiHydratedRef.current = false;
    if (typeof window === 'undefined') return;
    try {
      const rawAi = window.localStorage.getItem(aiPersonalStorageKey);
      if (rawAi) {
        const parsedAi = JSON.parse(rawAi) as {
          sessionId?: string | null;
          messages?: MosChatMessage[];
        };
        if (parsedAi.sessionId) setAiSessionId(parsedAi.sessionId);
        if (Array.isArray(parsedAi.messages) && parsedAi.messages.length > 0) {
          setAiMessages(parsedAi.messages);
          aiHydratedRef.current = true;
          return;
        }
      }
    } catch {
      // ignore
    }
    setAiMessages([buildInitialAiWelcomeMessage()]);
    aiHydratedRef.current = true;
  }, [aiPersonalStorageKey, buildInitialAiWelcomeMessage]);

  // Persist AI messages to localStorage
  useEffect(() => {
    if (!aiHydratedRef.current || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        aiPersonalStorageKey,
        JSON.stringify({
          sessionId: aiSessionId,
          messages: aiMessages.slice(-80),
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }, [aiPersonalStorageKey, aiSessionId, aiMessages]);

  // Synchronize AI chat session & messages with backend (MOS-BUG-170)
  const isSyncingAiRef = useRef<boolean>(false);
  const syncAiChatSession = useCallback(
    async (targetSessionId?: string | null) => {
      if (!effectiveUser?.id && !effectiveUser?.username) return;
      if (isSyncingAiRef.current) return;
      isSyncingAiRef.current = true;
      try {
        let resolvedSessionId = targetSessionId || aiSessionId;

        // Discover active mos-chat-private session if missing locally
        if (!resolvedSessionId) {
          const sessionsRes = await apiClient.ai.listSessions({ scope: 'mos-chat-private' });
          if (sessionsRes?.sessions && sessionsRes.sessions.length > 0) {
            resolvedSessionId = sessionsRes.sessions[0].id;
            setAiSessionId(resolvedSessionId);
          }
        }

        if (!resolvedSessionId) return;

        const sessRes = await apiClient.ai.getSession(resolvedSessionId);
        if (!sessRes?.messages || sessRes.messages.length === 0) return;

        const mappedBackend = sessRes.messages.map((bm) => formatBackendAiMessage(bm, effectiveUser));
        const welcome = buildInitialAiWelcomeMessage();

        setAiMessages((prev) => {
          const serverMsgIds = new Set(mappedBackend.map((m) => m.id));
          const pendingOptimistic = prev.filter(
            (m) => (m.id.startsWith('temp_') || m.id.startsWith('msg-user-')) && !serverMsgIds.has(m.id)
          );
          return [welcome, ...mappedBackend, ...pendingOptimistic];
        });
      } catch {
        // ignore transient network/sync error
      } finally {
        isSyncingAiRef.current = false;
      }
    },
    [effectiveUser, aiSessionId, buildInitialAiWelcomeMessage]
  );

  // Initial sync from backend when user is loaded or sessionId resolved
  useEffect(() => {
    void syncAiChatSession();
  }, [syncAiChatSession]);

  // Synchronize when switching into AI conversation on mobile
  useEffect(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) {
      void syncAiChatSession();
    }
  }, [activeConvId, syncAiChatSession]);

  // Re-sync on mobile tab visibility/focus
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (activeConvId === AI_COPILOT_CONV_ID || aiSessionId)) {
        void syncAiChatSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeConvId, aiSessionId, syncAiChatSession]);

  const aiCopilotConversation = useMemo<MosChatConversation>(() => {
    return {
      id: AI_COPILOT_CONV_ID,
      type: 'dm',
      name: '🤖 MAI',
      subtitle: 'mOS AI · Tra cứu dữ liệu & Phân tích riêng tư',
      roleTag: 'mOS AI',
      color: '#8b5cf6',
      avatar: 'MAI',
      unreadCount: 0,
      messages: aiMessages,
      updatedAt: aiMessages[aiMessages.length - 1]?.createdAt || new Date().toISOString(),
    };
  }, [aiMessages]);

  const displayConversations = useMemo<MosChatConversation[]>(() => {
    const hasAi = conversations.some((c) => c.id === AI_COPILOT_CONV_ID);
    if (hasAi) return conversations;
    return [aiCopilotConversation, ...conversations];
  }, [conversations, aiCopilotConversation]);

  // Tasks & Subtab
  const [activeSubtab, setActiveSubtab] = useState<MosChatActiveSubtab>(initialSubtab || 'chat');
  useEffect(() => {
    if (initialSubtab) {
      setActiveSubtab(initialSubtab);
    }
  }, [initialSubtab]);
  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [workflowTemplates, setWorkflowTemplates] = useState<MosChatWorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<MosChatWorkflowInstance[]>([]);

  // Mobile navigation
  const [mobileView, setMobileView] = useState<MosChatMobileView>('inbox');
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<MosChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<MosChatMessage | null>(null);

  const activeConversation = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) {
      return aiCopilotConversation;
    }
    return conversations.find((c) => c.id === activeConvId) || aiCopilotConversation || conversations[0] || null;
  }, [conversations, activeConvId, aiCopilotConversation]);

  const messages = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) {
      return aiMessages;
    }
    return allMessagesByConv[activeConvId] || activeConversation?.messages || [];
  }, [allMessagesByConv, activeConvId, activeConversation, aiMessages]);

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

  const lastVersionRef = useRef<number | undefined>(undefined);
  const staffDirectoryHashRef = useRef<string>('');

  // Bootstrap data fetch
  const fetchBootstrap = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && lastVersionRef.current) {
      return;
    }
    try {
      const res = await apiClient.chat.bootstrap({ sinceVersion: lastVersionRef.current }, { isPolling: true });
      if (res && res.staffDirectory && res.staffDirectory.length > 0) {
        try {
          const serialized = JSON.stringify(res.staffDirectory);
          if (staffDirectoryHashRef.current !== serialized) {
            staffDirectoryHashRef.current = serialized;
            setStaffDirectory(res.staffDirectory);
            if (localStorage.getItem(STAFF_DIRECTORY_CACHE_KEY) !== serialized) {
              localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, serialized);
            }
          }
        } catch {
          // ignore
        }
      }
      if (res?.unchanged) {
        return;
      }
      if (res?.version) {
        lastVersionRef.current = res.version;
      }
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
    } catch {
      // offline or silent error
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
    // Background fallback interval every 30s (incremental delta sync handles real-time updates every 12s)
    const interval = setInterval(fetchBootstrap, 30000);
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
        setConversations((prev) => {
          const merged = mergeDeltaConversations(
            prev,
            delta.updatedConversations,
            delta.updatedMessages,
            delta.updatedMissions
          );
          setAllMessagesByConv((prevMap) => {
            const nextMap = { ...prevMap };
            for (const c of merged) {
              if (c.messages && c.messages.length > 0) {
                nextMap[c.id] = c.messages;
              }
            }
            return nextMap;
          });
          return merged;
        });
      }
      if (delta.updatedTasks.length > 0 || delta.updatedMissions.length > 0) {
        setTasks((prev) => mergeDeltaTasks(prev, delta.updatedTasks, delta.updatedMissions));
      }
      if (activeConvId === AI_COPILOT_CONV_ID) {
        void syncAiChatSession();
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

  // Mark thread as read
  const markThreadAsRead = useCallback(async (convId: string, msgId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updatedMessages = (c.messages || []).map((m) =>
          m.id === msgId ? { ...m, unreadThreadReplyCount: 0 } : m
        );
        const newUnreadThreadCount = updatedMessages.reduce((sum, m) => sum + (m.unreadThreadReplyCount || 0), 0);
        return {
          ...c,
          messages: updatedMessages,
          unreadThreadCount: newUnreadThreadCount,
        };
      })
    );
    setAllMessagesByConv((prev) => {
      const list = prev[convId] || [];
      return {
        ...prev,
        [convId]: list.map((m) => (m.id === msgId ? { ...m, unreadThreadReplyCount: 0 } : m)),
      };
    });
    setActiveThreadMsg((current) => {
      if (!current || current.id !== msgId) return current;
      return { ...current, unreadThreadReplyCount: 0 };
    });
    try {
      await apiClient.chat.markThreadAsRead(convId, msgId);
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
    async (staffId: number | number[], spaceId?: string): Promise<MosChatConversation | null> => {
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
      const idsToAdd = Array.isArray(staffId) ? staffId.map(Number) : [Number(staffId)];
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetSpaceId) return c;
          const currentIds = Array.isArray(c.memberIds) ? c.memberIds.map(Number) : [];
          const newIds = idsToAdd.filter((id) => !currentIds.includes(id));
          if (newIds.length === 0) return c;
          const updatedIds = [...currentIds, ...newIds];
          const updatedMembers = Array.isArray(c.members) ? [...c.members] : [];
          for (const id of newIds) {
            const targetStaff = staffDirectory.find((s) => Number(s.id) === id);
            if (targetStaff && !updatedMembers.some((m) => Number(m.id) === id)) {
              updatedMembers.push(targetStaff);
            }
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

  // Remove member from space
  const removeMemberFromSpace = useCallback(
    async (staffId: number, spaceId?: string): Promise<MosChatConversation | null> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return null;

      try {
        const res = await apiClient.chat.removeMember(targetSpaceId, staffId);
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return res.conversation;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.removeMember failed or mocked, applying optimistic fallback:', err);
      }

      let updatedConv: MosChatConversation | null = null;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetSpaceId) return c;
          const currentIds = Array.isArray(c.memberIds) ? c.memberIds.map(Number) : [];
          const updatedIds = currentIds.filter((id) => id !== Number(staffId));
          const updatedMembers = (c.members || []).filter((m) => Number(m.id) !== Number(staffId));
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
    [activeConvId]
  );

  // Update member nickname in space
  const updateMemberNickname = useCallback(
    async (staffId: number, nickname: string, spaceId?: string): Promise<boolean> => {
      const targetSpaceId = spaceId || activeConvId;
      if (!targetSpaceId) return false;

      try {
        const res = await apiClient.chat.updateNickname(targetSpaceId, { targetStaffId: staffId, nickname });
        if (res?.success && res.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
          return true;
        }
      } catch (err: SafeAny) {
        console.warn('apiClient.chat.updateNickname failed or mocked:', err);
      }
      return false;
    },
    [activeConvId]
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
        customerCard?: MosChatCustomerCard | null;
        targetConvId?: string;
        replyToId?: string;
      }
    ): Promise<boolean> => {
      const targetId = options?.targetConvId || activeConvId;
      const trimmed = text.trim();
      if (!trimmed && (!options?.attachments || options.attachments.length === 0) && !options?.customerCard) return false;

      // Handle Private 1-on-1 AI Copilot (MAI) Conversation
      if (targetId === AI_COPILOT_CONV_ID) {
        const userMsg: MosChatMessage = {
          id: `msg-user-${Date.now()}`,
          conversationId: AI_COPILOT_CONV_ID,
          senderId: currentUser?.id || 'me',
          senderName: currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Tôi',
          senderRole: currentUser?.role || 'user',
          senderAvatar: currentUser?.avatarUrl,
          text: trimmed,
          timeLabel: dayjs().format('HH:mm'),
          createdAt: new Date().toISOString(),
          attachments: options?.attachments,
          reactions: {},
        };
        setAiMessages((prev) => [...prev, userMsg]);
        setIsAiThinking(true);

        try {
          const imageDataUrl = await convertAttachmentToDataUrl(options?.attachments?.[0]);
          const senderName = currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Tôi';
          const aiRes = await apiClient.ai.sendMessage({
            sessionId: aiSessionId || undefined,
            message: trimmed,
            scope: 'mos-chat-private',
            imageDataUrl,
            context: {
              page: 'mos-chat-private',
              userName: senderName,
              myRole: currentUser?.role || 'super_admin',
            },
          });

          if (aiRes?.session?.id) {
            setAiSessionId(aiRes.session.id);
          }

          const botMsg: MosChatMessage = aiRes?.message
            ? formatBackendAiMessage(aiRes.message, effectiveUser)
            : {
                id: `msg-ai-${Date.now()}`,
                conversationId: AI_COPILOT_CONV_ID,
                senderId: 'wings-ai-copilot',
                senderName: '🤖 MAI',
                senderRole: 'mOS AI',
                senderAvatar: 'MAI',
                roleColor: '#8b5cf6',
                isAiBot: true,
                text: 'MAI đã xử lý xong yêu cầu của bạn.',
                timeLabel: dayjs().format('HH:mm'),
                createdAt: new Date().toISOString(),
                reactions: {},
              };
          setAiMessages((prev) => [...prev, botMsg]);
        } catch {
          const errorMsg: MosChatMessage = {
            id: `msg-ai-err-${Date.now()}`,
            conversationId: AI_COPILOT_CONV_ID,
            senderId: 'wings-ai-copilot',
            senderName: '🤖 MAI',
            senderRole: 'mOS AI',
            senderAvatar: 'MAI',
            roleColor: '#8b5cf6',
            isAiBot: true,
            text: 'Rất tiếc, đã có lỗi kết nối đến máy chủ AI. Bạn vui lòng thử lại sau giây lát nhé.',
            timeLabel: dayjs().format('HH:mm'),
            createdAt: new Date().toISOString(),
            reactions: {},
          };
          setAiMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsAiThinking(false);
        }
        return true;
      }

      const tempId = `temp_${Date.now()}`;
      const effectiveText =
        trimmed || (options?.customerCard?.name ? `Đính kèm thẻ khách hàng ${options.customerCard.name}` : '');
      const optimisticMsg: MosChatMessage = {
        id: tempId,
        conversationId: targetId,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: effectiveText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        customerCard: options?.customerCard || null,
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
          text: effectiveText,
          customerCard: options?.customerCard || null,
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
    async (
      text: string,
      options?: { attachments?: MosChatImageAttachment[]; customerCard?: MosChatCustomerCard | null }
    ): Promise<boolean> => {
      if (!activeThreadMsg) return false;
      const trimmed = text.trim();
      const customerCard = options?.customerCard || undefined;
      const sendText = trimmed || (customerCard?.name ? `Đính kèm thẻ khách hàng ${customerCard.name}` : '');
      if (!sendText && (!options?.attachments || options.attachments.length === 0) && !customerCard) return false;

      const currentThreadMsg = activeThreadMsg;
      const targetConv = activeConversation;

      const tempReply: MosChatThreadReply = {
        id: `reply_${Date.now()}`,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.fullName || currentUser?.name || 'Tôi',
        senderRole: currentUser?.role || 'user',
        senderAvatar: currentUser?.avatarUrl,
        text: sendText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        attachments: options?.attachments,
        customerCard: customerCard || null,
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
          text: sendText,
          attachments: options?.attachments,
          customerCard: customerCard || undefined,
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
        const currentList = prev[activeConvId] || activeConversation?.messages || [];
        const nextList = currentList.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m));
        return { ...prev, [activeConvId]: nextList };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                messages: (c.messages || []).map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)),
              }
            : c
        )
      );
      try {
        await apiClient.chat.togglePinMessage(msgId, activeConvId);
      } catch {
        // ignore
      }
    },
    [activeConvId, activeConversation]
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

  // Move thread item (merge root to thread, promote reply to root, move reply between threads)
  const moveThreadItem = useCallback(
    async (params: {
      mode: MosChatThreadMoveMode;
      sourceMessageId: string;
      replyId?: string;
      targetMessageId?: string;
    }): Promise<boolean> => {
      if (!activeConvId || activeConvId === 'ai-copilot') return false;
      try {
        const res = await apiClient.chat.moveThreadItem({
          conversationId: activeConvId,
          mode: params.mode,
          sourceMessageId: params.sourceMessageId,
          replyId: params.replyId,
          targetMessageId: params.targetMessageId,
        });

        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === activeConvId ? res.conversation : c)));
          if (res.conversation.messages) {
            setAllMessagesByConv((prev) => ({
              ...prev,
              [activeConvId]: res.conversation.messages,
            }));
          }
        }
        if (res?.tasks) {
          setTasks(res.tasks);
        }
        if (
          (params.mode === 'MERGE_ROOT_TO_THREAD' || params.mode === 'MOVE_REPLY_TO_THREAD') &&
          params.targetMessageId
        ) {
          const targetMsg =
            res?.conversation?.messages?.find((m) => m.id === params.targetMessageId) ||
            messages.find((m) => m.id === params.targetMessageId);
          if (targetMsg) {
            setActiveThreadMsg(targetMsg);
            setMobileView('thread');
          }
        } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
          if (activeThreadMsg && res?.conversation?.messages) {
            const updatedParent = res.conversation.messages.find((m) => m.id === activeThreadMsg.id);
            if (updatedParent) setActiveThreadMsg(updatedParent);
          }
        }
        if (params.mode === 'MERGE_ROOT_TO_THREAD') {
          antdMessage.success('Đã gộp tin nhắn vào luồng trả lời phụ!');
        } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
          antdMessage.success('Đã tách phản hồi ra thành tin nhắn độc lập ở luồng chính!');
        } else {
          antdMessage.success('Đã chuyển phản hồi sang luồng trả lời đích!');
        }
        return true;
      } catch (err: SafeAny) {
        antdMessage.error(
          err?.response?.data?.message || err?.message || 'Không thể di chuyển tin nhắn / luồng trả lời.'
        );
        return false;
      }
    },
    [activeConvId, messages, activeThreadMsg]
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

  // Reset/Clear AI Chat Conversation
  const resetAiChat = useCallback(async () => {
    setAiSessionId(null);
    setAiMessages([buildInitialAiWelcomeMessage()]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(aiPersonalStorageKey);
      } catch {}
    }
  }, [aiPersonalStorageKey, buildInitialAiWelcomeMessage]);

  const value = useMemo<MosChatContextValue>(
    () => ({
      currentUser: effectiveUser,
      staffDirectory,
      presence,
      setPresence,
      conversations: displayConversations,
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
      moveThreadItem,
      markThreadAsRead,
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
      removeMemberFromSpace,
      updateMemberNickname,
      updateSpaceConfig,
      resetAiChat,
      refresh: fetchBootstrap,
      openCustomerDetail,
    }),
    [
      effectiveUser,
      staffDirectory,
      presence,
      displayConversations,
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
      moveThreadItem,
      markThreadAsRead,
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
      removeMemberFromSpace,
      updateMemberNickname,
      updateSpaceConfig,
      fetchBootstrap,
      openCustomerDetail,
    ]
  );

  return (
    <MosChatContext.Provider value={value}>
      {children}
      {customerDrawerOpen && selectedCustomerId && (
        <CustomerDetailDrawer
          open={customerDrawerOpen}
          customerId={selectedCustomerId}
          onClose={() => {
            setCustomerDrawerOpen(false);
            setSelectedCustomerId(null);
          }}
        />
      )}
    </MosChatContext.Provider>
  );
};

export function useMosChat(): MosChatContextValue {
  const ctx = useContext(MosChatContext);
  if (!ctx) {
    throw new Error('useMosChat must be used within a MosChatProvider');
  }
  return ctx;
}
