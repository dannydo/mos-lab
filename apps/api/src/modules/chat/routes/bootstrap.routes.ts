import type { FastifyInstance } from 'fastify';
import type {
  MosChatAccessConfig,
  MosChatBootstrapResponse,
  MosChatUnreadSummaryResponse,
  MosChatUserSidebarPrefs,
  MosChatWorkflowInstance,
  SafeAny,
  UpdateMosChatAccessConfigRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';
import { loadWorkflowState } from '../chat-workflow.service.js';
import {
  isDannyOrSuperAdminUser,
  canUserAccessConversation,
  evaluateCanUserAccessMosChat,
  computeUnreadCountForUser,
  resolveUserPrefKey,
} from '../chat-access.service.js';
import { filterAndFormatConversationsForUser, filterTasksForUser } from '../chat-format.service.js';
import {
  MAX_UNREAD_SUMMARY_CACHE_ENTRIES,
  normalizeAccessConfig,
  buildDefaultUserSidebarPrefs,
} from '../chat-state-defaults.js';
import { loadStaffDirectoryCached, getMemoryStaffFetchedAt } from '../chat-staff-directory.service.js';
import {
  loadChatState,
  saveUserSidebarPrefs,
  saveAccessConfig,
  saveConversations,
  saveTasks,
  hasMemoryChatCache,
  getMemoryChatVersion,
  getUnreadSummaryCacheForFastify,
} from '../chat-state-store.js';

const DEFAULT_BOOTSTRAP_MESSAGE_LIMIT = 30;
const MAX_BOOTSTRAP_MESSAGE_LIMIT = 500;
const MAX_BOOTSTRAP_CACHE_ENTRIES = 60;

interface BootstrapCacheEntry {
  version: number;
  staffFetchedAt: number;
  accessUpdatedAt: string;
  payload: MosChatBootstrapResponse;
}

const bootstrapCacheByFastify = new WeakMap<FastifyInstance, Map<string, BootstrapCacheEntry>>();

function getBootstrapCacheForFastify(fastify: FastifyInstance): Map<string, BootstrapCacheEntry> {
  let cache = bootstrapCacheByFastify.get(fastify);
  if (!cache) {
    cache = new Map();
    bootstrapCacheByFastify.set(fastify, cache);
  }
  return cache;
}

function parseBootstrapMessageLimit(raw?: string): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_BOOTSTRAP_MESSAGE_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BOOTSTRAP_MESSAGE_LIMIT;
  }
  if (parsed === 0) {
    return 0;
  }
  return Math.min(MAX_BOOTSTRAP_MESSAGE_LIMIT, Math.max(1, Math.floor(parsed)));
}

export async function registerChatBootstrapRoutes(fastify: FastifyInstance) {
  // GET /api/chat/bootstrap
  fastify.get(
    '/chat/bootstrap',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const query = (request.query || {}) as { sinceVersion?: string; messageLimit?: string };
        const clientVersion = Number(query.sinceVersion) || 0;
        const messageLimit = parseBootstrapMessageLimit(query.messageLimit);

        const [state, staffDirectory, wfState] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
          loadWorkflowState(fastify),
        ]);
        const { conversations, tasks, accessConfig, userPrefsByUserKey } = state;
        const missionMutated = await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(
          fastify,
          conversations,
          tasks
        );
        if (missionMutated) {
          // Polling endpoint: persist in the background lane so reads/writes never queue behind a full re-sync.
          await Promise.all([
            saveConversations(fastify, conversations, { bulkBackground: true }),
            saveTasks(fastify, tasks, { bulkBackground: true }),
          ]);
        }
        const version = getMemoryChatVersion() || state.version;
        const staffFetchedAt = getMemoryStaffFetchedAt() || 0;
        const accessUpdatedAt = String(accessConfig?.updatedAt || '');

        const canAccessChat = evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig);
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const userPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        // Pinned Trumps Hidden Invariant (MOS-BUG-216): Cuộc hội thoại đã ghim thì tuyệt đối không bị ẩn
        if (userPrefs && Array.isArray(userPrefs.pinnedIds) && userPrefs.pinnedIds.length > 0) {
          const pinnedSet = new Set(userPrefs.pinnedIds);
          userPrefs.hiddenIds = (userPrefs.hiddenIds || []).filter((id) => !pinnedSet.has(id));
        }

        // Zero-DB, lightweight short-circuit when conversations/tasks unchanged (still returns fresh staffDirectory presence!)
        if (!missionMutated && clientVersion > 0 && clientVersion === version) {
          return {
            version,
            unchanged: true,
            conversations: [],
            tasks: [],
            staffDirectory,
            accessConfig,
            canAccessChat,
            userPrefs,
          } satisfies MosChatBootstrapResponse;
        }

        const bootstrapCache = getBootstrapCacheForFastify(fastify);
        const cacheKey = `${Number(user?.id || 0)}:${String(user?.username || '').toLowerCase()}:${String(user?.role || '').toLowerCase()}:${messageLimit}`;
        const cached = !missionMutated && hasMemoryChatCache() ? bootstrapCache.get(cacheKey) : undefined;
        if (
          cached &&
          cached.version === version &&
          cached.staffFetchedAt === staffFetchedAt &&
          cached.accessUpdatedAt === accessUpdatedAt
        ) {
          return cached.payload;
        }

        const userConversations = filterAndFormatConversationsForUser(
          conversations,
          user,
          staffDirectory,
          userPrefs,
          userPrefsByUserKey,
          { messageLimit }
        );
        const userTasks = filterTasksForUser(tasks, conversations, user, staffDirectory);
        const wfInstanceMap = new Map<string, MosChatWorkflowInstance>();
        for (const inst of wfState.instances) {
          wfInstanceMap.set(inst.id, inst);
        }
        for (const conv of userConversations) {
          for (const msg of conv.messages || []) {
            if (msg.workflowInstanceId && wfInstanceMap.has(msg.workflowInstanceId)) {
              msg.workflow = wfInstanceMap.get(msg.workflowInstanceId) || null;
            }
          }
        }

        const payload: MosChatBootstrapResponse = {
          version,
          unchanged: false,
          conversations: userConversations,
          tasks: userTasks,
          staffDirectory,
          accessConfig,
          canAccessChat,
          userPrefs,
          workflowTemplates: wfState.templates,
          workflowInstances: wfState.instances,
          storageEngine: 'PRISMA_RELATIONAL',
        };

        if (hasMemoryChatCache()) {
          if (bootstrapCache.size >= MAX_BOOTSTRAP_CACHE_ENTRIES) {
            const oldestKey = bootstrapCache.keys().next().value;
            if (oldestKey !== undefined) bootstrapCache.delete(oldestKey);
          }
          bootstrapCache.set(cacheKey, {
            version,
            staffFetchedAt,
            accessUpdatedAt,
            payload,
          });
        }

        return payload;
      } catch (err: SafeAny) {
        fastify.log.error('Chat bootstrap error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải dữ liệu mOS Chat' });
      }
    }
  );

  // GET /api/chat/unread-summary (Ultra-lightweight endpoint for CRM header badge: < 3ms, no full bootstrap)
  fastify.get(
    '/chat/unread-summary',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const state = await loadChatState(fastify);
        const { conversations, tasks, accessConfig, userPrefsByUserKey } = state;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const stateVersion = getMemoryChatVersion() || state.version;
        const staffFetchedAt = getMemoryStaffFetchedAt() || 0;
        const summaryCacheKey = `${Number(user?.id || 0)}:${String(user?.username || '').toLowerCase()}:${String(user?.role || '').toLowerCase()}`;

        const fastifySummaryCache = getUnreadSummaryCacheForFastify(fastify);
        const cachedSummary = fastifySummaryCache.get(summaryCacheKey);
        if (
          hasMemoryChatCache() &&
          cachedSummary &&
          cachedSummary.version === stateVersion &&
          cachedSummary.staffFetchedAt === staffFetchedAt
        ) {
          return cachedSummary.payload;
        }

        const setSummaryCache = (payload: MosChatUnreadSummaryResponse): MosChatUnreadSummaryResponse => {
          if (hasMemoryChatCache() && fastifySummaryCache) {
            if (fastifySummaryCache.size >= MAX_UNREAD_SUMMARY_CACHE_ENTRIES) {
              const oldestKey = fastifySummaryCache.keys().next().value;
              if (oldestKey !== undefined) fastifySummaryCache.delete(oldestKey);
            }
            fastifySummaryCache.set(summaryCacheKey, {
              version: stateVersion,
              staffFetchedAt,
              payload,
            });
          }
          return payload;
        };

        const canAccess = evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig);
        if (!canAccess) {
          return setSummaryCache({
            unreadCount: 0,
            urgentTaskCount: 0,
            hasUnread: false,
            version: stateVersion,
          });
        }

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const userPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        let totalUnread = 0;
        let lastMessageAt: string | null = null;
        for (const conv of conversations) {
          if (!canUserAccessConversation(conv, user, staffDirectory)) continue;
          const unread = computeUnreadCountForUser(conv, user, staffDirectory, userPrefs);
          if (unread > 0) {
            totalUnread += unread;
          }
          if (conv.updatedAt && (!lastMessageAt || conv.updatedAt > lastMessageAt)) {
            lastMessageAt = conv.updatedAt;
          }
        }

        const userTasks = filterTasksForUser(tasks, conversations, user, staffDirectory);
        const urgentTaskCount = userTasks.filter(
          (t) => !t.done && (t.priority === 'URGENT' || t.priority === 'HIGH')
        ).length;

        return setSummaryCache({
          unreadCount: totalUnread,
          urgentTaskCount,
          hasUnread: totalUnread > 0 || urgentTaskCount > 0,
          version: stateVersion,
          lastMessageAt,
        });
      } catch (err: SafeAny) {
        fastify.log.error('Chat unread-summary error:', err);
        return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể đếm tin nhắn chưa đọc' });
      }
    }
  );

  // PUT /api/chat/user-prefs (Personal Sidebar Customization for any authenticated user)
  fastify.put(
    '/chat/user-prefs',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const body = (request.body || {}) as Partial<MosChatUserSidebarPrefs>;
        const { userPrefsByUserKey } = await loadChatState(fastify);
        const current = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        const mergedReadMessageCountByConv: Record<string, number> = {
          ...(current.readMessageCountByConv || {}),
        };
        if (body.readMessageCountByConv && typeof body.readMessageCountByConv === 'object') {
          for (const [k, v] of Object.entries(body.readMessageCountByConv)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) {
              mergedReadMessageCountByConv[k] = Math.max(mergedReadMessageCountByConv[k] || 0, n);
            }
          }
        }

        const mergedReadThreadReplyCountByMsg: Record<string, number> = {
          ...(current.readThreadReplyCountByMsg || {}),
        };
        if (body.readThreadReplyCountByMsg && typeof body.readThreadReplyCountByMsg === 'object') {
          for (const [k, v] of Object.entries(body.readThreadReplyCountByMsg)) {
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) {
              mergedReadThreadReplyCountByMsg[k] = Math.max(mergedReadThreadReplyCountByMsg[k] || 0, n);
            }
          }
        }

        const rawPinned = Array.isArray(body.pinnedIds) ? body.pinnedIds : current.pinnedIds || [];
        const nextPinned = Array.from(new Set(rawPinned));
        // Pinned Trumps Hidden Invariant (MOS-BUG-216): Cuộc hội thoại đã ghim thì tuyệt đối không bị ẩn
        const rawHidden = Array.isArray(body.hiddenIds) ? body.hiddenIds : current.hiddenIds || [];
        const nextHidden = rawHidden.filter((id) => !nextPinned.includes(id));

        const saved = await saveUserSidebarPrefs(fastify, userPrefKey, {
          ...current,
          ...body,
          pinnedIds: nextPinned,
          hiddenIds: nextHidden,
          readMessageCountByConv: mergedReadMessageCountByConv,
          readAtByConv: {
            ...(current.readAtByConv || {}),
            ...(body.readAtByConv || {}),
          },
          lastReadMessageIdByConv: {
            ...(current.lastReadMessageIdByConv || {}),
            ...(body.lastReadMessageIdByConv || {}),
          },
          readThreadReplyCountByMsg: mergedReadThreadReplyCountByMsg,
          readThreadAtByMsg: {
            ...(current.readThreadAtByMsg || {}),
            ...(body.readThreadAtByMsg || {}),
          },
          lastReadThreadReplyIdByMsg: {
            ...(current.lastReadThreadReplyIdByMsg || {}),
            ...(body.lastReadThreadReplyIdByMsg || {}),
          },
          updatedAt: new Date().toISOString(),
        });
        return {
          success: true,
          userPrefs: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Update chat user prefs error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu tuỳ chỉnh cá nhân mOS Chat' });
      }
    }
  );

  // GET /api/chat/access-config
  fastify.get(
    '/chat/access-config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { accessConfig } = await loadChatState(fastify);
        const staffDirectory = await loadStaffDirectoryCached(fastify);
        const canAccessChat = evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig);
        return {
          success: true,
          accessConfig,
          canAccessChat,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Get chat access config error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể tải cấu hình truy cập mOS Chat' });
      }
    }
  );

  // PUT /api/chat/access-config
  fastify.put(
    '/chat/access-config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        if (!isDannyOrSuperAdminUser(user)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ quản trị viên cấp cao (Danny / Admin) mới được phép thay đổi phân quyền truy cập mOS Chat.',
          });
        }
        const body = (request.body || {}) as UpdateMosChatAccessConfigRequest;
        const { accessConfig: current } = await loadChatState(fastify);

        const nextConfig: MosChatAccessConfig = normalizeAccessConfig({
          ...current,
          allowAllStaff: body.allowAllStaff !== undefined ? Boolean(body.allowAllStaff) : current.allowAllStaff,
          allowedGroupKeys: body.allowedGroupKeys !== undefined ? body.allowedGroupKeys : current.allowedGroupKeys,
          allowedStaffIds: body.allowedStaffIds !== undefined ? body.allowedStaffIds : current.allowedStaffIds,
          aiCopilotAllowedGroupKeys:
            body.aiCopilotAllowedGroupKeys !== undefined
              ? body.aiCopilotAllowedGroupKeys
              : current.aiCopilotAllowedGroupKeys,
          aiCopilotAllowedStaffIds:
            body.aiCopilotAllowedStaffIds !== undefined
              ? body.aiCopilotAllowedStaffIds
              : current.aiCopilotAllowedStaffIds,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.displayName || user?.username || 'Danny',
        });

        const saved = await saveAccessConfig(fastify, nextConfig);
        return {
          success: true,
          accessConfig: saved,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Update chat access config error:', err);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Không thể lưu cấu hình phân quyền mOS Chat' });
      }
    }
  );
}
