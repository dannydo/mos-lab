'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatStaffMember,
  MosChatPresenceStatus,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { message as antdMessage } from 'antd';
import { apiClient } from '../../../lib/api-client';
import { tabNotificationManager } from '../../../lib/tab-notification';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import {
  AI_COPILOT_CONV_ID,
  FALLBACK_CONVERSATIONS,
  FALLBACK_TASKS,
  getInitialStaffDirectory,
  STAFF_DIRECTORY_CACHE_KEY,
} from '../constants/chat-constants';
import { formatBackendAiMessage } from '../utils/chat-helpers';
import { useChatAiCopilotState } from '../shared/hooks/useChatAiCopilotState';
import { useChatReadReceipts } from '../shared/hooks/useChatReadReceipts';
import { useMosChatBootstrapAndSync } from './useMosChatBootstrapAndSync';
import { useMosChatSpaceActions } from './useMosChatSpaceActions';
import { useMosChatMessageSendAndMedia } from './useMosChatMessageSendAndMedia';
import { useMosChatMessageMutations } from './useMosChatMessageMutations';
import { useMosChatTaskAndMissionActions } from './useMosChatTaskAndMissionActions';
import type {
  MosChatActiveSubtab,
  MosChatContextValue,
  MosChatMobileView,
  MosChatSidebarFilter,
  MosChatReactionUsersTarget,
  MosChatSeenUsersTarget,
} from '../types/mos-chat-types';

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
  const [localUser, setLocalUser] = useState<SafeAny>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setLocalUser(currentUser);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('mos_user');
        if (stored) setLocalUser(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, [currentUser]);

  const effectiveUser = currentUser || localUser;

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
    if (initialConvId) setActiveConvId(initialConvId);
  }, [initialConvId]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pinnedConvIds, setPinnedConvIds] = useState<Set<string>>(new Set());
  const [allMessagesByConv, setAllMessagesByConv] = useState<Record<string, MosChatMessage[]>>({});
  const [isLoadingMessages] = useState<boolean>(false);
  const [activeThreadMsg, setActiveThreadMsg] = useState<MosChatMessage | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const openCustomerDetail = useCallback((customerId: number | string) => {
    const parsedId = typeof customerId === 'number' ? customerId : parseInt(String(customerId), 10);
    if (parsedId && !isNaN(parsedId) && parsedId > 0) {
      setSelectedCustomerId(parsedId);
      setCustomerDrawerOpen(true);
    }
  }, []);

  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const {
    aiPersonalStorageKey,
    aiSessionId,
    setAiSessionId,
    aiMessages,
    setAiMessages,
    buildInitialAiWelcomeMessage,
    syncAiChatSession,
    aiCopilotConversation: nullableAiConv,
  } = useChatAiCopilotState({
    currentUser: effectiveUser,
    activeConvId,
    canUseAiCopilot: true,
    defaultUserDisplayName: 'Bạn',
  });

  const aiCopilotConversation = useMemo<MosChatConversation>(
    () =>
      nullableAiConv || {
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
      },
    [aiMessages, nullableAiConv]
  );

  const displayConversations = useMemo<MosChatConversation[]>(() => {
    const hasAi = conversations.some((c) => c.id === AI_COPILOT_CONV_ID);
    if (hasAi) return conversations;
    return [aiCopilotConversation, ...conversations];
  }, [conversations, aiCopilotConversation]);

  const [activeSubtab, setActiveSubtab] = useState<MosChatActiveSubtab>(initialSubtab || 'chat');
  useEffect(() => {
    if (initialSubtab) setActiveSubtab(initialSubtab);
  }, [initialSubtab]);

  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [workflowTemplates, setWorkflowTemplates] = useState<MosChatWorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<MosChatWorkflowInstance[]>([]);

  const [mobileView, setMobileView] = useState<MosChatMobileView>('inbox');
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<MosChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<MosChatMessage | null>(null);
  const [reactionUsersTarget, setReactionUsersTarget] = useState<MosChatReactionUsersTarget | null>(null);

  const openReactionUsersSheet = useCallback(
    (
      target: {
        id?: string;
        messageId?: string;
        replyId?: string;
        reactions?: Record<string, number>;
        reactionUsers?: Record<string, Array<number | string>>;
      },
      initialEmoji?: string
    ) => {
      const resolvedMsgId = target.messageId || target.id || '';
      setReactionUsersTarget({
        messageId: resolvedMsgId,
        replyId: target.replyId,
        reactions: target.reactions || {},
        reactionUsers: target.reactionUsers || {},
        initialEmoji,
      });
    },
    []
  );

  const closeReactionUsersSheet = useCallback(() => {
    setReactionUsersTarget(null);
  }, []);

  const [seenUsersTarget, setSeenUsersTarget] = useState<MosChatSeenUsersTarget | null>(null);
  const openSeenUsersSheet = useCallback((target: MosChatSeenUsersTarget) => setSeenUsersTarget(target), []);
  const closeSeenUsersSheet = useCallback(() => setSeenUsersTarget(null), []);

  const activeConversation = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) return aiCopilotConversation;
    return conversations.find((c) => c.id === activeConvId) || aiCopilotConversation || conversations[0] || null;
  }, [conversations, activeConvId, aiCopilotConversation]);

  const messages = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) return aiMessages;
    return allMessagesByConv[activeConvId] || activeConversation?.messages || [];
  }, [allMessagesByConv, activeConvId, activeConversation, aiMessages]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned), [messages]);
  const threadReplies = useMemo(() => activeThreadMsg?.thread || [], [activeThreadMsg]);

  const { getMessageReadBreakdown, getThreadReplyReadBreakdown, stoppedReadersByMsgId, stoppedReadersByReplyId } =
    useChatReadReceipts({
      activeConversation,
      activeThreadMessage: activeThreadMsg,
      currentUserId: effectiveUser?.id,
    });

  const openSeenUsersSheetForMessage = useCallback(
    (msg: MosChatMessage) => {
      const breakdown = getMessageReadBreakdown(activeConversation, msg);
      setSeenUsersTarget({
        messageId: msg.id,
        scopeLabel: 'Người đã xem tin nhắn',
        seenBy: breakdown.seenBy,
        unseenBy: breakdown.unseenBy,
      });
    },
    [activeConversation, getMessageReadBreakdown]
  );

  const openSeenUsersSheetForReply = useCallback(
    (parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
      const breakdown = getThreadReplyReadBreakdown(parentMsg, reply);
      setSeenUsersTarget({
        messageId: parentMsg.id,
        replyId: reply.id,
        scopeLabel: 'Người đã xem phản hồi',
        seenBy: breakdown.seenBy,
        unseenBy: breakdown.unseenBy,
      });
    },
    [getThreadReplyReadBreakdown]
  );

  const totalUnreadCount = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations]
  );
  const totalTaskCount = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);

  useEffect(() => {
    onUnreadCountChange?.(totalUnreadCount, totalTaskCount);
    tabNotificationManager.setUnreadCount('chat-context', totalUnreadCount);
  }, [totalUnreadCount, totalTaskCount, onUnreadCountChange]);

  const lastVersionRef = useRef<number | undefined>(undefined);

  const { fetchBootstrap, markConversationAsRead, markThreadAsRead, isPinnedConversation, togglePinConversation } =
    useMosChatBootstrapAndSync({
      activeConvId,
      pinnedConvIds,
      lastVersionRef,
      setStaffDirectory,
      setPinnedConvIds,
      setConversations,
      setAllMessagesByConv,
      setActiveThreadMsg,
      setTasks,
      setWorkflowTemplates,
      setWorkflowInstances,
      setActiveConvId,
      setMobileView,
      setActiveSubtab,
      syncAiChatSession,
    });

  const { startDirectMessage, addMemberToSpace, removeMemberFromSpace, updateMemberNickname, updateSpaceConfig } =
    useMosChatSpaceActions({
      currentUser,
      staffDirectory,
      conversations,
      activeConvId,
      setConversations,
      setActiveConvId,
      setMobileView,
      markConversationAsRead,
    });

  const { sendMessage, sendThreadReply, forwardMessage, editMessage, buzzMessage } = useMosChatMessageSendAndMedia({
    currentUser,
    effectiveUser,
    activeConvId,
    activeConversation,
    activeThreadMsg,
    allMessagesByConv,
    aiSessionId,
    lastVersionRef,
    setAiSessionId,
    setAiMessages,
    setIsAiThinking,
    setAllMessagesByConv,
    setConversations,
    setActiveThreadMsg,
    setReplyingToMessage,
    fetchBootstrap,
  });

  const { hasUserReactedMsg, reactToMessage, togglePinMessage, deleteMessage, deleteThreadReply, moveThreadItem } =
    useMosChatMessageMutations({
      currentUser,
      effectiveUser,
      activeConvId,
      activeConversation,
      activeThreadMsg,
      messages,
      setAllMessagesByConv,
      setConversations,
      setActiveThreadMsg,
      setReactionUsersTarget,
      setTasks,
      setMobileView,
    });

  const {
    createTask,
    toggleTaskDone,
    updateTask,
    deleteTask,
    acceptNegotiatedDeadline,
    rejectNegotiatedDeadline,
    dispatchMissionFromTask,
    executeMissionAction,
    triggerWorkflow,
  } = useMosChatTaskAndMissionActions({
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
  });

  const resetAiChat = useCallback(async () => {
    setAiSessionId(null);
    setAiMessages([buildInitialAiWelcomeMessage()]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(aiPersonalStorageKey);
      } catch {}
    }
  }, [aiPersonalStorageKey, buildInitialAiWelcomeMessage, setAiMessages, setAiSessionId]);

  const openAiSessionById = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const res = await apiClient.ai.getSession(sessionId);
        const myId = Number(effectiveUser?.id) || 0;
        if (myId > 0 && Number(res.session.staffId) !== myId) {
          antdMessage.warning('Phiên hội thoại này thuộc người khác. Vui lòng mở liên kết trên máy tính để xem.');
          return false;
        }
        const mapped = (res.messages || []).map((bm) => formatBackendAiMessage(bm, effectiveUser));
        setAiMessages([buildInitialAiWelcomeMessage(), ...mapped]);
        setAiSessionId(res.session.id);
        setActiveConvId(AI_COPILOT_CONV_ID);
        return true;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          antdMessage.warning('Bạn không có quyền xem phiên hội thoại này.');
        } else if (status === 404) {
          antdMessage.warning('Không tìm thấy phiên hội thoại. Liên kết có thể đã bị xóa hoặc không đúng.');
        } else {
          antdMessage.error('Không tải được phiên hội thoại. Vui lòng thử lại.');
        }
        return false;
      }
    },
    [effectiveUser, buildInitialAiWelcomeMessage, setAiMessages, setAiSessionId]
  );

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
      pinnedConvIds,
      isPinnedConversation,
      togglePinConversation,
      markConversationAsRead,
      startDirectMessage,
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      hasUserReacted: hasUserReactedMsg,
      reactionUsersTarget,
      openReactionUsersSheet,
      closeReactionUsersSheet,
      seenUsersTarget,
      openSeenUsersSheet,
      openSeenUsersSheetForMessage,
      openSeenUsersSheetForReply,
      closeSeenUsersSheet,
      getMessageReadBreakdown,
      getThreadReplyReadBreakdown,
      stoppedReadersByMsgId,
      stoppedReadersByReplyId,
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
      forwardMessage,
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
      openAiSessionById,
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
      pinnedConvIds,
      isPinnedConversation,
      togglePinConversation,
      markConversationAsRead,
      startDirectMessage,
      messages,
      allMessagesByConv,
      isLoadingMessages,
      sendMessage,
      reactToMessage,
      hasUserReactedMsg,
      reactionUsersTarget,
      openReactionUsersSheet,
      closeReactionUsersSheet,
      seenUsersTarget,
      openSeenUsersSheet,
      openSeenUsersSheetForMessage,
      openSeenUsersSheetForReply,
      closeSeenUsersSheet,
      getMessageReadBreakdown,
      getThreadReplyReadBreakdown,
      stoppedReadersByMsgId,
      stoppedReadersByReplyId,
      togglePinMessage,
      deleteMessage,
      deleteThreadReply,
      editMessage,
      buzzMessage,
      activeThreadMsg,
      threadReplies,
      sendThreadReply,
      moveThreadItem,
      forwardMessage,
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
      resetAiChat,
      openAiSessionById,
      fetchBootstrap,
      openCustomerDetail,
    ]
  );

  return (
    <MosChatContext.Provider value={value}>
      {children}
      {customerDrawerOpen && selectedCustomerId && (
        <ErrorBoundary fallback={null}>
          <CustomerDetailDrawer
            open={customerDrawerOpen}
            customerId={selectedCustomerId}
            zIndex={2000}
            onClose={() => {
              setCustomerDrawerOpen(false);
              setSelectedCustomerId(null);
            }}
          />
        </ErrorBoundary>
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
