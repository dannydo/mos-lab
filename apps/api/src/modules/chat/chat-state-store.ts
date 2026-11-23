import type { FastifyInstance } from 'fastify';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatThreadReply,
  MosChatUnreadSummaryResponse,
  MosChatUserSidebarPrefs,
} from '@mos-lab/shared';
import { invalidateNotificationsCache } from '../notifications/routes.js';
import { createCoalescedBulkSync } from './chat-bulk-sync.js';
import {
  deleteChatMessagesFromRelationalDb,
  deleteSingleTaskFromRelationalDb,
  loadOrMigrateRelationalChatData,
  syncConversationsToRelationalDb,
  syncTasksToRelationalDb,
  syncUserPrefsToRelationalDb,
  upsertMessageWithThreadToRelationalDb,
  upsertSingleConversationHeaderToRelationalDb,
  upsertSingleMessageToRelationalDb,
  upsertSingleTaskToRelationalDb,
  upsertSingleThreadReplyToRelationalDb,
} from './chat-repository.service.js';
import {
  buildDefaultAccessConfig,
  buildDefaultConversations,
  buildDefaultTasks,
  CHAT_ACCESS_CONFIG_KEY,
  CHAT_CONVERSATIONS_CONFIG_KEY,
  CHAT_TASKS_CONFIG_KEY,
  CHAT_USER_PREFS_CONFIG_KEY,
  normalizeAccessConfig,
  normalizeUserSidebarPrefs,
  STATE_DB_SYNC_TTL_MS,
  trimConversationsRetention,
} from './chat-state-defaults.js';
import { deduplicateTasks, trimTasksRetention } from './chat-thread-task-helpers.js';

type CachedChatState = {
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  accessConfig: MosChatAccessConfig;
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  version: number;
  lastSyncedFromDbAt: number;
};

let memoryChatCache: CachedChatState | null = null;
let writeChain: Promise<void> = Promise.resolve();
let jsonBackupChain: Promise<void> = Promise.resolve();

const loadChatStateInFlightByFastify = new WeakMap<FastifyInstance, Promise<CachedChatState>>();
const unreadSummaryCacheByFastify = new WeakMap<
  FastifyInstance,
  Map<string, { version: number; staffFetchedAt: number; payload: MosChatUnreadSummaryResponse }>
>();

export function hasMemoryChatCache(): boolean {
  return memoryChatCache !== null;
}

export function getMemoryChatVersion(): number | undefined {
  return memoryChatCache?.version;
}

export function getUnreadSummaryCacheForFastify(fastify: FastifyInstance) {
  let cache = unreadSummaryCacheByFastify.get(fastify);
  if (!cache) {
    cache = new Map();
    unreadSummaryCacheByFastify.set(fastify, cache);
  }
  return cache;
}

export async function loadChatState(fastify: FastifyInstance): Promise<{
  conversations: MosChatConversation[];
  tasks: MosChatTaskItem[];
  accessConfig: MosChatAccessConfig;
  userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs>;
  version: number;
}> {
  const now = Date.now();
  if (memoryChatCache && now - memoryChatCache.lastSyncedFromDbAt < STATE_DB_SYNC_TTL_MS) {
    return memoryChatCache;
  }

  const inFlight = loadChatStateInFlightByFastify.get(fastify);
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = (async () => {
    const syncStartedAt = Date.now();
    const [convRecord, taskRecord, accessRecord, prefsRecord] = await Promise.all([
      fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_CONVERSATIONS_CONFIG_KEY } }),
      fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_TASKS_CONFIG_KEY } }),
      fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_ACCESS_CONFIG_KEY } }),
      fastify.prisma.crm.crmConfig.findUnique({ where: { key: CHAT_USER_PREFS_CONFIG_KEY } }),
    ]);

    let conversations: MosChatConversation[] | null = null;
    let tasks: MosChatTaskItem[] | null = null;
    let accessConfig: MosChatAccessConfig | null = null;
    const userPrefsByUserKey: Record<string, MosChatUserSidebarPrefs> = {};

    if (convRecord?.value) {
      try {
        const parsed = JSON.parse(convRecord.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          conversations = trimConversationsRetention(parsed);
        }
      } catch {
        // ignore invalid legacy JSON
      }
    }

    if (taskRecord?.value) {
      try {
        const parsed = JSON.parse(taskRecord.value);
        if (Array.isArray(parsed)) {
          tasks = parsed;
        }
      } catch {
        // ignore invalid legacy JSON
      }
    }

    if (accessRecord?.value) {
      try {
        const parsed = JSON.parse(accessRecord.value);
        accessConfig = normalizeAccessConfig(parsed);
      } catch {
        // ignore invalid legacy JSON
      }
    }

    if (prefsRecord?.value) {
      try {
        const parsed = JSON.parse(prefsRecord.value);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            userPrefsByUserKey[k] = normalizeUserSidebarPrefs(v);
          }
        }
      } catch {
        // ignore invalid legacy JSON
      }
    }

    if (!conversations) {
      conversations = buildDefaultConversations();
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
        update: { value: JSON.stringify(conversations) },
        create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(conversations) },
      });
    }

    if (!tasks) {
      tasks = buildDefaultTasks();
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_TASKS_CONFIG_KEY },
        update: { value: JSON.stringify(tasks) },
        create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(tasks) },
      });
    } else {
      const dedup = deduplicateTasks(tasks, conversations);
      tasks = dedup.tasks;
      if (dedup.changed) {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_TASKS_CONFIG_KEY },
          update: { value: JSON.stringify(tasks) },
          create: { key: CHAT_TASKS_CONFIG_KEY, value: JSON.stringify(tasks) },
        });
      }
      if (dedup.convChanged) {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
          update: { value: JSON.stringify(conversations) },
          create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: JSON.stringify(conversations) },
        });
      }
    }

    if (!accessConfig) {
      accessConfig = buildDefaultAccessConfig();
    }

    const relationalSynced = await loadOrMigrateRelationalChatData(fastify, {
      conversations,
      tasks,
      accessConfig,
      userPrefsByUserKey,
    });
    conversations = relationalSynced.conversations;
    tasks = relationalSynced.tasks;
    Object.assign(userPrefsByUserKey, relationalSynced.userPrefsByUserKey);

    const latestVersion = Math.max(
      convRecord?.updatedAt ? new Date(convRecord.updatedAt).getTime() : 0,
      taskRecord?.updatedAt ? new Date(taskRecord.updatedAt).getTime() : 0,
      accessRecord?.updatedAt ? new Date(accessRecord.updatedAt).getTime() : 0,
      prefsRecord?.updatedAt ? new Date(prefsRecord.updatedAt).getTime() : 0,
      memoryChatCache?.version || 1
    );

    memoryChatCache = {
      conversations,
      tasks,
      accessConfig,
      userPrefsByUserKey,
      version: latestVersion,
      lastSyncedFromDbAt: syncStartedAt,
    };

    return memoryChatCache;
  })().finally(() => {
    if (loadChatStateInFlightByFastify.get(fastify) === loadPromise) {
      loadChatStateInFlightByFastify.delete(fastify);
    }
  });

  loadChatStateInFlightByFastify.set(fastify, loadPromise);
  return loadPromise;
}

let userPrefsPersistTimeout: NodeJS.Timeout | null = null;
let latestUserPrefsSnapshot: Record<string, MosChatUserSidebarPrefs> | null = null;

function scheduleUserPrefsPersist(fastify: FastifyInstance, snapshot: Record<string, MosChatUserSidebarPrefs>) {
  latestUserPrefsSnapshot = snapshot;
  if (userPrefsPersistTimeout) return;
  userPrefsPersistTimeout = setTimeout(() => {
    userPrefsPersistTimeout = null;
    const toSave = latestUserPrefsSnapshot;
    if (!toSave) return;
    writeChain = writeChain
      .then(async () => {
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_USER_PREFS_CONFIG_KEY },
          update: { value: JSON.stringify(toSave) },
          create: { key: CHAT_USER_PREFS_CONFIG_KEY, value: JSON.stringify(toSave) },
        });
      })
      .catch((err) => {
        fastify.log.error(err, 'debounced saveUserSidebarPrefs crmConfig error:');
      });
  }, 200);
}

export async function saveUserSidebarPrefs(
  fastify: FastifyInstance,
  userPrefKey: string,
  prefs: MosChatUserSidebarPrefs
): Promise<MosChatUserSidebarPrefs> {
  const state = await loadChatState(fastify);
  const normalized = normalizeUserSidebarPrefs({
    ...prefs,
    updatedAt: new Date().toISOString(),
  });
  state.userPrefsByUserKey[userPrefKey] = normalized;
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.userPrefsByUserKey[userPrefKey] = normalized;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  const snapshot = { ...state.userPrefsByUserKey };
  invalidateNotificationsCache();

  // Debounce the heavy JSON crmConfig persist, and run relational DB sync asynchronously without blocking request
  scheduleUserPrefsPersist(fastify, snapshot);
  writeChain = writeChain
    .then(async () => {
      await syncUserPrefsToRelationalDb(fastify, userPrefKey, normalized);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveUserSidebarPrefs relational sync error:');
    });

  return normalized;
}

export async function saveAccessConfig(fastify: FastifyInstance, accessConfig: MosChatAccessConfig) {
  const normalized = normalizeAccessConfig(accessConfig);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.accessConfig = normalized;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  writeChain = writeChain
    .then(async () => {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: CHAT_ACCESS_CONFIG_KEY },
        update: { value: JSON.stringify(normalized) },
        create: { key: CHAT_ACCESS_CONFIG_KEY, value: JSON.stringify(normalized) },
      });
    })
    .catch((err) => {
      fastify.log.error(err, 'saveAccessConfig error:');
    });
  return normalized;
}

let conversationsJsonPersistTimeout: NodeJS.Timeout | null = null;
let latestConversationsSnapshot: MosChatConversation[] | null = null;
let tasksJsonPersistTimeout: NodeJS.Timeout | null = null;
let latestTasksSnapshot: MosChatTaskItem[] | null = null;

function scheduleConversationsJsonPersist(fastify: FastifyInstance, snapshot: MosChatConversation[]) {
  latestConversationsSnapshot = snapshot;
  if (conversationsJsonPersistTimeout) return;
  conversationsJsonPersistTimeout = setTimeout(() => {
    conversationsJsonPersistTimeout = null;
    const toSave = latestConversationsSnapshot;
    if (!toSave) return;
    jsonBackupChain = jsonBackupChain
      .then(async () => {
        const serialized = JSON.stringify(toSave);
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_CONVERSATIONS_CONFIG_KEY },
          update: { value: serialized },
          create: { key: CHAT_CONVERSATIONS_CONFIG_KEY, value: serialized },
        });
      })
      .catch((err) => {
        fastify.log.error(err, 'debounced saveConversations crmConfig backup error:');
      });
  }, 3000);
  conversationsJsonPersistTimeout.unref?.();
}

function scheduleTasksJsonPersist(fastify: FastifyInstance, snapshot: MosChatTaskItem[]) {
  latestTasksSnapshot = snapshot;
  if (tasksJsonPersistTimeout) return;
  tasksJsonPersistTimeout = setTimeout(() => {
    tasksJsonPersistTimeout = null;
    const toSave = latestTasksSnapshot;
    if (!toSave) return;
    jsonBackupChain = jsonBackupChain
      .then(async () => {
        const serialized = JSON.stringify(toSave);
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: CHAT_TASKS_CONFIG_KEY },
          update: { value: serialized },
          create: { key: CHAT_TASKS_CONFIG_KEY, value: serialized },
        });
      })
      .catch((err) => {
        fastify.log.error(err, 'debounced saveTasks crmConfig backup error:');
      });
  }, 3000);
  tasksJsonPersistTimeout.unref?.();
}

function scheduleBulkConversationsSync(fastify: FastifyInstance): void {
  if (!bulkConversationsSyncRunner) {
    bulkConversationsSyncRunner = createCoalescedBulkSync(
      async () => {
        const latest = memoryChatCache?.conversations;
        if (latest) await syncConversationsToRelationalDb(fastify, latest);
      },
      (err) => fastify.log.error(err, 'bulk conversations sync error:')
    );
  }
  bulkConversationsSyncRunner();
}

function scheduleBulkTasksSync(fastify: FastifyInstance): void {
  if (!bulkTasksSyncRunner) {
    bulkTasksSyncRunner = createCoalescedBulkSync(
      async () => {
        const latest = memoryChatCache?.tasks;
        if (latest) await syncTasksToRelationalDb(fastify, latest);
      },
      (err) => fastify.log.error(err, 'bulk tasks sync error:')
    );
  }
  bulkTasksSyncRunner();
}

let bulkConversationsSyncRunner: (() => void) | null = null;
let bulkTasksSyncRunner: (() => void) | null = null;

export async function saveConversations(
  fastify: FastifyInstance,
  conversations: MosChatConversation[],
  hint?: {
    touchedConversation?: MosChatConversation;
    touchedMessage?: MosChatMessage;
    touchedReply?: {
      conversationId: string;
      parentMessageId: string;
      reply: MosChatThreadReply;
    };
    touchedMessagesWithThreads?: Array<{
      conversation: MosChatConversation;
      message: MosChatMessage;
    }>;
    deletedMessageIds?: string[];
    /** Persist the full relational re-sync in the background lane (does not block or queue behind user writes). */
    bulkBackground?: boolean;
  }
) {
  const trimmed = trimConversationsRetention(conversations);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.conversations = trimmed;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  invalidateNotificationsCache();
  // Keep relational DB O(1) upserts on the critical request path and debounce the 2.5MB crmConfig snapshot backup asynchronously.
  scheduleConversationsJsonPersist(fastify, trimmed);
  if (hint?.bulkBackground) {
    scheduleBulkConversationsSync(fastify);
    return;
  }
  writeChain = writeChain
    .then(async () => {
      if (hint?.deletedMessageIds && hint.deletedMessageIds.length > 0) {
        await deleteChatMessagesFromRelationalDb(fastify, hint.deletedMessageIds);
      }
      if (hint?.touchedMessagesWithThreads && hint.touchedMessagesWithThreads.length > 0) {
        await Promise.all(
          hint.touchedMessagesWithThreads.flatMap((item) => [
            upsertSingleConversationHeaderToRelationalDb(fastify, item.conversation),
            upsertMessageWithThreadToRelationalDb(fastify, item.conversation.id, item.message),
          ])
        );
        return;
      }
      if (hint?.touchedReply) {
        const relationalOps: Promise<void>[] = [
          upsertSingleThreadReplyToRelationalDb(
            fastify,
            hint.touchedReply.conversationId,
            hint.touchedReply.parentMessageId,
            hint.touchedReply.reply
          ),
        ];
        if (hint.touchedConversation) {
          relationalOps.push(upsertSingleConversationHeaderToRelationalDb(fastify, hint.touchedConversation));
        }
        if (hint.touchedMessage) {
          relationalOps.push(
            upsertSingleMessageToRelationalDb(
              fastify,
              hint.touchedConversation ? hint.touchedConversation.id : hint.touchedReply.conversationId,
              hint.touchedMessage
            )
          );
        }
        await Promise.all(relationalOps);
        return;
      }
      if (hint?.touchedMessage && hint.touchedConversation) {
        await Promise.all([
          upsertSingleConversationHeaderToRelationalDb(fastify, hint.touchedConversation),
          upsertSingleMessageToRelationalDb(fastify, hint.touchedConversation.id, hint.touchedMessage),
        ]);
        return;
      }
      if (hint?.touchedConversation && !hint.touchedMessage) {
        await upsertSingleConversationHeaderToRelationalDb(fastify, hint.touchedConversation);
        return;
      }
      await syncConversationsToRelationalDb(fastify, trimmed);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveConversations error:');
    });
  return writeChain;
}

export async function saveTasks(
  fastify: FastifyInstance,
  tasks: MosChatTaskItem[],
  hint?: {
    touchedTask?: MosChatTaskItem;
    deletedTaskId?: string;
    /** Persist the full relational re-sync in the background lane (does not block or queue behind user writes). */
    bulkBackground?: boolean;
  }
) {
  const trimmed = trimTasksRetention(tasks, memoryChatCache?.conversations);
  const nextVersion = Date.now();
  if (memoryChatCache) {
    memoryChatCache.tasks = trimmed;
    memoryChatCache.version = nextVersion;
    memoryChatCache.lastSyncedFromDbAt = nextVersion;
  }
  invalidateNotificationsCache();
  scheduleTasksJsonPersist(fastify, trimmed);
  if (hint?.bulkBackground) {
    scheduleBulkTasksSync(fastify);
    return;
  }
  writeChain = writeChain
    .then(async () => {
      if (hint?.deletedTaskId) {
        await deleteSingleTaskFromRelationalDb(fastify, hint.deletedTaskId);
        return;
      }
      if (hint?.touchedTask) {
        await upsertSingleTaskToRelationalDb(fastify, hint.touchedTask);
        return;
      }
      await syncTasksToRelationalDb(fastify, trimmed);
    })
    .catch((err) => {
      fastify.log.error(err, 'saveTasks error:');
    });
  return writeChain;
}
