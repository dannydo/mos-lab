import type { FastifyInstance } from 'fastify';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { deduplicateMovedMessagesInConversation, ensureChatRelationalTables } from './repo-schema-and-lock.js';
import {
  deleteChatMessagesFromRelationalDb,
  syncConversationsToRelationalDb,
  syncTasksToRelationalDb,
  syncUserPrefsToRelationalDb,
} from './repo-bulk-sync.js';

let initialMigrationDone = false;

/**
 * Cursor-based pagination for a conversation's message history.
 * Supports `before` (message ID or ISO timestamp) and `limit` (default 50, max 200).
 */
export function paginateConversationMessages(
  allMessages: MosChatMessage[],
  options?: {
    before?: string | null;
    after?: string | null;
    limit?: number | null;
  }
): {
  messages: MosChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const safeLimit = Math.max(1, Math.min(200, Number(options?.limit) || 50));
  const sorted = [...(allMessages || [])].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  let filtered = sorted;

  if (options?.before) {
    const beforeIdIdx = filtered.findIndex((m) => m.id === options.before);
    if (beforeIdIdx >= 0) {
      filtered = filtered.slice(0, beforeIdIdx);
    } else {
      const beforeMs = new Date(options.before).getTime();
      if (!Number.isNaN(beforeMs)) {
        filtered = filtered.filter((m) => new Date(m.createdAt || 0).getTime() < beforeMs);
      }
    }
  }

  if (options?.after) {
    const afterIdIdx = filtered.findIndex((m) => m.id === options.after);
    if (afterIdIdx >= 0) {
      filtered = filtered.slice(afterIdIdx + 1);
    } else {
      const afterMs = new Date(options.after).getTime();
      if (!Number.isNaN(afterMs)) {
        filtered = filtered.filter((m) => new Date(m.createdAt || 0).getTime() > afterMs);
      }
    }
  }

  const hasMore = filtered.length > safeLimit;
  const sliced = hasMore ? filtered.slice(filtered.length - safeLimit) : filtered;
  const nextCursor = hasMore && sliced.length > 0 ? sliced[0].id : null;

  return {
    messages: sliced,
    nextCursor,
    hasMore,
  };
}

/**
 * Loads conversations, tasks, and userPrefs from relational Prisma tables if populated,
 * or performs automatic one-time migration from `crm_config` JSON blobs.
 */
export async function loadOrMigrateRelationalChatData(
  fastify: FastifyInstance,
  legacyData: {
    conversations: MosChatConversation[];
    tasks: MosChatTaskItem[];
    accessConfig: MosChatAccessConfig;
    userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  }
): Promise<{
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
}> {
  const ready = await ensureChatRelationalTables(fastify);
  const crm = (fastify as SafeAny)?.prisma?.crm;
  if (!ready || !crm?.crmChatConversation) {
    return {
      conversations: legacyData.conversations,
      tasks: legacyData.tasks,
      userPrefsByUserKey: legacyData.userPrefsByUserKey,
    };
  }

  try {
    const convCount = await crm.crmChatConversation.count();
    if (convCount === 0 && !initialMigrationDone) {
      initialMigrationDone = true;
      await syncConversationsToRelationalDb(fastify, legacyData.conversations);
      await syncTasksToRelationalDb(fastify, legacyData.tasks);
      for (const [userKey, prefs] of Object.entries(legacyData.userPrefsByUserKey)) {
        await syncUserPrefsToRelationalDb(fastify, userKey, prefs);
      }
      return {
        conversations: legacyData.conversations,
        tasks: legacyData.tasks,
        userPrefsByUserKey: legacyData.userPrefsByUserKey,
      };
    }

    // Load from relational tables and merge with in-memory / legacy state so no data is ever lost
    const [dbConvs, dbMessages, dbTasks, dbPrefs] = await Promise.all([
      crm.crmChatConversation.findMany({ orderBy: { updatedAt: 'desc' } }),
      crm.crmChatMessage.findMany({ orderBy: { createdAt: 'asc' } }),
      crm.crmChatTask.findMany({ orderBy: { createdAt: 'desc' } }),
      crm.crmChatUserPref.findMany(),
    ]);

    if (dbConvs.length === 0) {
      return {
        conversations: legacyData.conversations,
        tasks: legacyData.tasks,
        userPrefsByUserKey: legacyData.userPrefsByUserKey,
      };
    }

    const repliesByParentId = new Map<string, MosChatThreadReply[]>();
    const rootMessagesByConvId = new Map<string, MosChatMessage[]>();

    for (const row of dbMessages) {
      const meta = (row.metadataJson || {}) as SafeAny;
      if (row.parentMessageId) {
        const isDeleted = Boolean(row.isDeleted || meta.isDeleted);
        const reply: MosChatThreadReply = {
          ...meta,
          id: row.id,
          senderId: meta.senderId ?? row.senderId,
          senderName: row.senderName,
          senderRole: row.senderRole,
          senderAvatar: row.senderAvatar,
          roleColor: row.roleColor ?? meta.roleColor,
          text: row.text,
          timeLabel: row.timeLabel,
          createdAt: meta.createdAt || row.createdAt.toISOString(),
          isDeleted,
          deletedAt: meta.deletedAt ?? (isDeleted && row.updatedAt ? row.updatedAt.toISOString() : undefined),
          deletedBy: meta.deletedBy,
          deletedByName: meta.deletedByName,
          originalText: meta.originalText,
          editHistory: meta.editHistory,
          missionId: row.missionId ?? meta.missionId ?? null,
        };
        const list = repliesByParentId.get(row.parentMessageId) || [];
        list.push(reply);
        repliesByParentId.set(row.parentMessageId, list);
      } else {
        const isDeleted = Boolean(row.isDeleted || meta.isDeleted);
        const msg: MosChatMessage = {
          ...meta,
          id: row.id,
          conversationId: row.conversationId,
          senderId: meta.senderId ?? row.senderId,
          senderName: row.senderName,
          senderRole: row.senderRole,
          senderAvatar: row.senderAvatar,
          roleColor: row.roleColor ?? meta.roleColor,
          text: row.text,
          timeLabel: row.timeLabel,
          createdAt: meta.createdAt || row.createdAt.toISOString(),
          pinned: Boolean(row.pinned),
          isDeleted,
          deletedAt: meta.deletedAt ?? (isDeleted && row.updatedAt ? row.updatedAt.toISOString() : undefined),
          deletedBy: meta.deletedBy,
          deletedByName: meta.deletedByName,
          originalText: meta.originalText,
          editHistory: meta.editHistory,
          taskId: row.taskId ?? meta.taskId ?? null,
          missionId: row.missionId ?? meta.missionId ?? null,
          missionKey: row.missionKey ?? meta.missionKey ?? null,
          workflowInstanceId: row.workflowInstanceId ?? meta.workflowInstanceId ?? null,
          thread: [],
        };
        const list = rootMessagesByConvId.get(row.conversationId) || [];
        list.push(msg);
        rootMessagesByConvId.set(row.conversationId, list);
      }
    }

    const zombieMessageIdsToPurge: string[] = [];
    const reconstructedConvs: MosChatConversation[] = dbConvs.map((row: SafeAny) => {
      const payload = (row.payloadJson || {}) as SafeAny;
      const rootMsgs = (rootMessagesByConvId.get(row.id) || []).map((m) => ({
        ...m,
        thread: repliesByParentId.get(m.id) || m.thread || [],
      }));
      const convObj: MosChatConversation = {
        ...payload,
        id: row.id,
        type: (row.type as 'dm' | 'space') || 'space',
        name: row.name,
        subtitle: row.subtitle ?? payload.subtitle,
        roleTag: row.roleTag ?? payload.roleTag,
        color: row.color || payload.color || '#1a73e8',
        avatar: row.avatar ?? payload.avatar,
        participantStaffId: row.participantStaffId ?? payload.participantStaffId,
        isSelf: Boolean(row.isSelf ?? payload.isSelf),
        memberIds: Array.isArray(row.memberIdsJson) ? row.memberIdsJson : payload.memberIds,
        memberNicknames: (row.memberNicknamesJson as Record<string, string>) || payload.memberNicknames || {},
        unreadCount: payload.unreadCount || 0,
        messages: rootMsgs,
        updatedAt: payload.updatedAt || row.updatedAt.toISOString(),
      };
      const dedup = deduplicateMovedMessagesInConversation(convObj);
      if (dedup.removedMessageIds.length > 0) {
        zombieMessageIdsToPurge.push(...dedup.removedMessageIds);
      }
      return convObj;
    });

    if (zombieMessageIdsToPurge.length > 0) {
      await deleteChatMessagesFromRelationalDb(fastify, zombieMessageIdsToPurge);
    }

    // Ensure any new conversations in legacyData not yet in DB are preserved
    const dbConvIds = new Set(reconstructedConvs.map((c) => c.id));
    for (const legacyConv of legacyData.conversations) {
      if (!dbConvIds.has(legacyConv.id)) {
        reconstructedConvs.push(legacyConv);
      }
    }

    const reconstructedTasks: MosChatTaskItem[] =
      dbTasks.length > 0
        ? dbTasks.map((row: SafeAny) => {
            const payload = (row.payloadJson || {}) as SafeAny;
            return {
              ...payload,
              id: row.id,
              conversationId: row.conversationId,
              conversationName: row.conversationName,
              sourceMessageId: row.sourceMessageId ?? payload.sourceMessageId ?? null,
              sourceAuthorName: payload.sourceAuthorName || null,
              title: row.title,
              assigneeId: payload.assigneeId ?? row.assigneeId,
              assigneeName: row.assigneeName,
              creatorName: row.creatorName,
              assignerName: payload.assignerName || row.creatorName,
              priority: row.priority || 'HIGH',
              remindAt: payload.remindAt || row.remindAt.toISOString(),
              dueAt: payload.dueAt ?? (row.dueAt ? row.dueAt.toISOString() : null),
              deadline: payload.deadline ?? (row.deadline ? row.deadline.toISOString() : null),
              done: Boolean(row.done),
              archived: Boolean(row.archived),
              missionId: row.missionId ?? payload.missionId ?? null,
              createdAt: payload.createdAt || row.createdAt.toISOString(),
            };
          })
        : legacyData.tasks;

    const mergedPrefs: Record<string, MosChatUserSidebarPrefs> = {
      ...legacyData.userPrefsByUserKey,
    };
    for (const prefRow of dbPrefs) {
      if (prefRow.prefsJson && typeof prefRow.prefsJson === 'object') {
        mergedPrefs[prefRow.userKey] = prefRow.prefsJson as MosChatUserSidebarPrefs;
      }
    }

    return {
      conversations: reconstructedConvs,
      tasks: reconstructedTasks,
      userPrefsByUserKey: mergedPrefs,
    };
  } catch (err) {
    fastify.log?.warn?.({ err }, 'loadOrMigrateRelationalChatData fallback');
    return {
      conversations: legacyData.conversations,
      tasks: legacyData.tasks,
      userPrefsByUserKey: legacyData.userPrefsByUserKey,
    };
  }
}
