'use client';

import { useEffect, useRef, useCallback } from 'react';
import type {
  MosChatConversation,
  MosChatDeltaSyncResponse,
  MosChatMessage,
  MosChatMissionSummary,
  MosChatRealtimeEvent,
  MosChatTaskItem,
  MosChatThreadReply,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

export function sanitizeMovedThreadDuplicates(messages: MosChatMessage[]): MosChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  const movedRootCandidateIds = new Set<string>();
  const promotedReplyCandidateIds = new Set<string>();

  for (const msg of messages) {
    if (msg.id.startsWith('msg-pr-') && !msg.isDeleted) {
      const suffix = msg.id.slice('msg-pr-'.length);
      if (suffix) {
        promotedReplyCandidateIds.add(`th-${suffix}`);
        promotedReplyCandidateIds.add(suffix);
      }
    }
    for (const reply of msg.thread || []) {
      if (reply.id.startsWith('th-mv-') && !reply.isDeleted) {
        const suffix = reply.id.slice('th-mv-'.length);
        if (suffix) {
          movedRootCandidateIds.add(`msg-${suffix}`);
          movedRootCandidateIds.add(suffix);
        }
      }
    }
  }

  if (movedRootCandidateIds.size === 0 && promotedReplyCandidateIds.size === 0) {
    return messages;
  }

  const nextMessages: MosChatMessage[] = [];
  for (const msg of messages) {
    const hasOwnActiveThread = Array.isArray(msg.thread) && msg.thread.some((r) => !r.isDeleted);
    const hasOwnTask = Boolean(msg.taskId);
    if (movedRootCandidateIds.has(msg.id) && !hasOwnActiveThread && !hasOwnTask) {
      continue;
    }

    if (promotedReplyCandidateIds.size > 0 && Array.isArray(msg.thread) && msg.thread.length > 0) {
      const filteredThread = msg.thread.filter((r) => !promotedReplyCandidateIds.has(r.id));
      if (filteredThread.length !== msg.thread.length) {
        nextMessages.push({ ...msg, thread: filteredThread });
        continue;
      }
    }

    nextMessages.push(msg);
  }

  return nextMessages;
}

export function mergeDeltaConversations(
  prevConversations: MosChatConversation[],
  deltaConversations: MosChatConversation[],
  deltaMessages: MosChatMessage[],
  deltaMissions: MosChatMissionSummary[]
): MosChatConversation[] {
  if (deltaConversations.length === 0 && deltaMessages.length === 0 && deltaMissions.length === 0) {
    return prevConversations;
  }

  const missionByReportId = new Map<number, MosChatMissionSummary>();
  for (const msn of deltaMissions) {
    missionByReportId.set(msn.reportId, msn);
  }

  const messagesByConvId = new Map<string, MosChatMessage[]>();
  for (const msg of deltaMessages) {
    const list = messagesByConvId.get(msg.conversationId) || [];
    list.push(msg);
    messagesByConvId.set(msg.conversationId, list);
  }

  const deltaConvById = new Map<string, MosChatConversation>();
  for (const conv of deltaConversations) {
    deltaConvById.set(conv.id, conv);
  }

  const next = prevConversations.map((conv) => {
    const incomingConv = deltaConvById.get(conv.id);
    const incomingMsgs = messagesByConvId.get(conv.id) || [];

    if (!incomingConv && incomingMsgs.length === 0 && missionByReportId.size === 0) {
      return conv;
    }

    const incomingConvMsgs = incomingConv?.messages || [];
    const incomingConvMsgIds = new Set(incomingConvMsgs.map((m) => m.id));
    const incomingDeltaMsgIds = new Set(incomingMsgs.map((m) => m.id));
    const isFullTailSnapshot = Boolean(incomingConv && incomingConvMsgs.length < 30);
    const oldestIncomingWindowMs =
      incomingConvMsgs.length > 0
        ? Math.min(
            ...incomingConvMsgs
              .map((m) => (m.createdAt ? new Date(m.createdAt).getTime() : Number.POSITIVE_INFINITY))
              .filter(Number.isFinite)
          )
        : Number.POSITIVE_INFINITY;

    const msgMap = new Map<string, MosChatMessage>();
    for (const m of conv.messages || []) {
      if (incomingConv && !incomingConvMsgIds.has(m.id) && !incomingDeltaMsgIds.has(m.id)) {
        const msgCreatedMs = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        if (isFullTailSnapshot || (Number.isFinite(oldestIncomingWindowMs) && msgCreatedMs >= oldestIncomingWindowMs)) {
          continue;
        }
      }
      const updatedMsn = m.missionId ? missionByReportId.get(m.missionId) : undefined;
      msgMap.set(m.id, updatedMsn ? { ...m, mission: updatedMsn } : m);
    }

    for (const m of incomingConvMsgs) {
      const existing = msgMap.get(m.id);
      msgMap.set(m.id, existing ? { ...existing, ...m } : m);
    }

    for (const m of incomingMsgs) {
      const existing = msgMap.get(m.id);
      msgMap.set(m.id, existing ? { ...existing, ...m } : m);
    }

    const mergedMessages = sanitizeMovedThreadDuplicates(
      Array.from(msgMap.values()).sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      )
    );

    return {
      ...conv,
      ...(incomingConv ? { ...incomingConv, messages: mergedMessages } : { messages: mergedMessages }),
    };
  });

  // Add any brand-new conversations not previously in state
  const existingIds = new Set(prevConversations.map((c) => c.id));
  for (const incomingConv of deltaConversations) {
    if (!existingIds.has(incomingConv.id)) {
      next.unshift(incomingConv);
    }
  }

  return next;
}

export function mergeDeltaTasks(
  prevTasks: MosChatTaskItem[],
  deltaTasks: MosChatTaskItem[],
  deltaMissions: MosChatMissionSummary[]
): MosChatTaskItem[] {
  if (deltaTasks.length === 0 && deltaMissions.length === 0) {
    return prevTasks;
  }

  const missionByReportId = new Map<number, MosChatMissionSummary>();
  for (const msn of deltaMissions) {
    missionByReportId.set(msn.reportId, msn);
  }

  const taskMap = new Map<string, MosChatTaskItem>();
  for (const t of prevTasks) {
    const updatedMsn = t.missionId ? missionByReportId.get(t.missionId) : undefined;
    taskMap.set(t.id, updatedMsn ? { ...t, mission: updatedMsn } : t);
  }

  for (const incoming of deltaTasks) {
    const existing = taskMap.get(incoming.id);
    taskMap.set(incoming.id, existing ? { ...existing, ...incoming } : incoming);
  }

  return Array.from(taskMap.values());
}

export function applyRealtimeEventToConversations(
  prevConversations: MosChatConversation[],
  event: MosChatRealtimeEvent
): MosChatConversation[] {
  const payload = event.payload || {};
  const convId = event.conversationId || (payload.conversationId as string | undefined);
  if (!convId) return prevConversations;

  if (event.type === 'MESSAGE_CREATED' && payload.message) {
    const newMsg = payload.message as MosChatMessage;
    return prevConversations.map((conv) => {
      if (conv.id !== convId) return conv;
      const exists = (conv.messages || []).some((m) => m.id === newMsg.id);
      if (exists) {
        return {
          ...conv,
          updatedAt: event.timestamp,
          messages: (conv.messages || []).map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m)),
        };
      }
      return {
        ...conv,
        updatedAt: event.timestamp,
        messages: [...(conv.messages || []), newMsg],
      };
    });
  }

  if (event.type === 'THREAD_REPLY_CREATED' && payload.messageId && payload.reply) {
    const parentMsgId = String(payload.messageId);
    const newReply = payload.reply as MosChatThreadReply;
    return prevConversations.map((conv) => {
      if (conv.id !== convId) return conv;
      return {
        ...conv,
        updatedAt: event.timestamp,
        messages: (conv.messages || []).map((m) => {
          if (m.id !== parentMsgId) return m;
          const thread = m.thread || [];
          const exists = thread.some((r) => r.id === newReply.id);
          return {
            ...m,
            thread: exists
              ? thread.map((r) => (r.id === newReply.id ? { ...r, ...newReply } : r))
              : [...thread, newReply],
          };
        }),
      };
    });
  }

  if (event.type === 'MISSION_UPDATED' && payload.mission) {
    const mission = payload.mission as MosChatMissionSummary;
    return prevConversations.map((conv) => {
      if (conv.id !== convId) return conv;
      return {
        ...conv,
        messages: (conv.messages || []).map((m) => {
          if (m.id === mission.messageId || m.missionId === mission.reportId) {
            return {
              ...m,
              missionId: mission.reportId,
              missionKey: mission.missionKey,
              mission,
            };
          }
          return m;
        }),
      };
    });
  }

  return prevConversations;
}

export interface UseChatRealtimeSyncOptions {
  enabled?: boolean;
  intervalMs?: number;
  onDeltaSynced?: (delta: MosChatDeltaSyncResponse) => void;
  onRealtimeEvent?: (event: MosChatRealtimeEvent) => void;
}

export function useChatRealtimeSync(options: UseChatRealtimeSyncOptions) {
  const { enabled = true, intervalMs = 15_000, onDeltaSynced, onRealtimeEvent } = options;
  const cursorRef = useRef<string | undefined>(undefined);
  const onDeltaRef = useRef(onDeltaSynced);
  const onEventRef = useRef(onRealtimeEvent);
  onDeltaRef.current = onDeltaSynced;
  onEventRef.current = onRealtimeEvent;

  const triggerDeltaSync = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await apiClient.chat.syncDelta(cursorRef.current);
      if (res?.success) {
        cursorRef.current = res.cursor;
        onDeltaRef.current?.(res);
      }
    } catch {
      // Ignore transient offline errors
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void triggerDeltaSync();
    }, intervalMs);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void triggerDeltaSync();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [enabled, intervalMs, triggerDeltaSync]);

  return {
    triggerDeltaSync,
    getLastCursor: () => cursorRef.current,
  };
}
