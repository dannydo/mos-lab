'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { AiSessionAccessInfo, MosChatConversation, MosChatMessage, SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { formatBackendAiMessage } from '../../utils/chat-helpers';

export interface UseChatAiCopilotStateParams {
  currentUser: SafeAny;
  activeConvId: string;
  canUseAiCopilot?: boolean;
  defaultUserDisplayName?: string;
  initialPendingPermalinkSessionId?: string | null;
}

function sanitizeStoredAiMessages(messages: MosChatMessage[]): MosChatMessage[] {
  return messages.map((m) => {
    if (m.text && /<action/i.test(m.text)) {
      const actionMatches: NonNullable<MosChatMessage['aiAction']>[] = [];
      const regex = /<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/gi;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(m.text)) !== null) {
        try {
          actionMatches.push({
            type: match[1]?.trim() || 'APPLY_FILTER',
            label: match[2]?.trim() || 'Áp dụng bộ lọc gợi ý',
            payload: JSON.parse(match[3]?.trim() || '{}'),
          });
        } catch {
          // ignore malformed action payload
        }
      }
      const cleanText = m.text
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const existingActions =
        m.aiActions || (m.aiAction?.actions ? m.aiAction.actions : m.aiAction ? [m.aiAction] : []);
      const allActions = [...existingActions, ...actionMatches].filter(
        (act, index, self) =>
          index ===
          self.findIndex((a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload))
      );
      return {
        ...m,
        text: cleanText,
        aiAction: allActions[0] || m.aiAction,
        aiActions: allActions.length > 0 ? allActions : m.aiActions,
      };
    }
    return m;
  });
}

/**
 * Shared Desktop & Mobile state hook for personal 1-1 MAI Copilot sessions:
 * localStorage hydration/persistence, welcome builder, backend session sync, and conversation object.
 */
export function useChatAiCopilotState({
  currentUser,
  activeConvId,
  canUseAiCopilot = true,
  defaultUserDisplayName = 'Bạn',
  initialPendingPermalinkSessionId = null,
}: UseChatAiCopilotStateParams) {
  const aiPersonalStorageKey = useMemo(
    () => `mos_chat_ai_private_conv_v1_${currentUser?.id || currentUser?.username || 'default'}`,
    [currentUser?.id, currentUser?.username]
  );

  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiSessionOwnerId, setAiSessionOwnerId] = useState<number | null>(null);
  const [aiSessionAccess, setAiSessionAccess] = useState<AiSessionAccessInfo | null>(null);
  const [aiMessages, setAiMessages] = useState<MosChatMessage[]>([]);

  const aiPermalinkPendingRef = useRef<string | null>(initialPendingPermalinkSessionId);
  const aiHydratedRef = useRef<boolean>(false);
  const isSyncingAiRef = useRef<boolean>(false);

  const currentUserNumericId = Number(currentUser?.id) || 0;
  const isAiSessionReadOnly = aiSessionAccess
    ? aiSessionAccess.readOnly
    : aiSessionOwnerId !== null && currentUserNumericId > 0 && aiSessionOwnerId !== currentUserNumericId;

  const aiSessionReadOnlyRef = useRef<boolean>(false);
  aiSessionReadOnlyRef.current = isAiSessionReadOnly;

  const aiSessionIdRef = useRef<string | null>(null);
  aiSessionIdRef.current = aiSessionId;

  const buildInitialAiWelcomeMessage = useCallback((): MosChatMessage => {
    const userDisplayName =
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.name ||
      currentUser?.username ||
      defaultUserDisplayName;
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
        '• **Kênh 1-1 riêng tư**: Mặc định chỉ bạn xem được phiên này. Bạn có thể chia sẻ từng phiên bằng liên kết (người khác chỉ xem). Super Admin chỉ xem phiên gắn với mOS Mission, và Quản trị chỉ xem khi rà soát bảo mật (có ghi nhật ký để bạn biết).\n' +
        '• **Gọi @MAI trong #Space**: Gõ `@MAI` kèm câu hỏi trong bất kỳ nhóm Space nào để MAI phân tích và trả lời công khai cho cả nhóm.',
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
      reactions: {},
      thread: [],
    };
  }, [
    currentUser?.displayName,
    currentUser?.fullName,
    currentUser?.name,
    currentUser?.username,
    defaultUserDisplayName,
  ]);

  // Hydrate personal private 1-1 AI chat history from localStorage
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
          setAiMessages(sanitizeStoredAiMessages(parsedAi.messages));
          aiHydratedRef.current = true;
          return;
        }
      }
    } catch {
      // ignore storage error
    }
    setAiMessages([buildInitialAiWelcomeMessage()]);
    aiHydratedRef.current = true;
  }, [aiPersonalStorageKey, buildInitialAiWelcomeMessage]);

  // Persist personal private AI chat history to localStorage
  useEffect(() => {
    if (!aiHydratedRef.current || typeof window === 'undefined') return;
    // Never persist someone else's session (read-only permalink view) into this user's private cache.
    if (aiSessionReadOnlyRef.current) return;
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
      // ignore storage error
    }
  }, [aiPersonalStorageKey, aiSessionId, aiMessages]);

  // Synchronize latest messages from backend if aiSessionId exists or discover active session (MOS-BUG-170)
  const syncAiChatSession = useCallback(
    async (targetSessionId?: string | null) => {
      if (!currentUser?.id && !currentUser?.username) return;
      if (isSyncingAiRef.current) return;
      // A read-only (shared / mission / audit) view is loaded once; polling would re-log every view.
      if (aiSessionReadOnlyRef.current && !targetSessionId) return;
      isSyncingAiRef.current = true;
      try {
        let resolvedSessionId = targetSessionId || aiSessionId;

        if (!resolvedSessionId) {
          const sessionsRes = await apiClient.ai.listSessions({ scope: 'mos-chat-private' });
          if (sessionsRes?.sessions && sessionsRes.sessions.length > 0) {
            resolvedSessionId = sessionsRes.sessions[0].id;
            setAiSessionId(resolvedSessionId);
          }
        }

        if (!resolvedSessionId) return;

        const sessRes = await apiClient.ai.getSession(resolvedSessionId);
        if (sessRes?.session?.staffId !== undefined) {
          setAiSessionOwnerId(Number(sessRes.session.staffId) || null);
        }
        if (sessRes?.access) setAiSessionAccess(sessRes.access);
        if (!sessRes?.messages || sessRes.messages.length === 0) return;

        const mappedBackend: MosChatMessage[] = sessRes.messages.map((bm) => formatBackendAiMessage(bm, currentUser));
        const welcome = buildInitialAiWelcomeMessage();

        setAiMessages((prev) => {
          const serverMsgIds = new Set(mappedBackend.map((m) => m.id));
          const pendingOptimistic = prev.filter(
            (m) => (m.id.startsWith('temp_') || m.id.startsWith('msg-user-')) && !serverMsgIds.has(m.id)
          );
          return [welcome, ...mappedBackend, ...pendingOptimistic];
        });
      } catch {
        // ignore transient sync error
      } finally {
        isSyncingAiRef.current = false;
      }
    },
    [aiSessionId, buildInitialAiWelcomeMessage, currentUser]
  );

  useEffect(() => {
    void syncAiChatSession();
  }, [syncAiChatSession]);

  useEffect(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) {
      void syncAiChatSession();
    }
  }, [activeConvId, syncAiChatSession]);

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

  const aiCopilotConversation = useMemo<MosChatConversation | null>(() => {
    if (!canUseAiCopilot) return null;
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
  }, [canUseAiCopilot, aiMessages]);

  return {
    aiPersonalStorageKey,
    aiSessionId,
    setAiSessionId,
    aiSessionIdRef,
    aiSessionOwnerId,
    setAiSessionOwnerId,
    aiSessionAccess,
    setAiSessionAccess,
    isAiSessionReadOnly,
    aiSessionReadOnlyRef,
    aiPermalinkPendingRef,
    aiHydratedRef,
    aiMessages,
    setAiMessages,
    buildInitialAiWelcomeMessage,
    syncAiChatSession,
    aiCopilotConversation,
  };
}
