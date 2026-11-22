import type { FastifyInstance } from 'fastify';
import {
  AI_COPILOT_CONV_ID,
  type MosChatConversation,
  type SafeAny,
  type MosChatSearchResultItem,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';
import { chatRealtimeHub, computeDeltaFromSnapshot } from '../chat-realtime.hub.js';
import { ensureChatRelationalTables, paginateConversationMessages } from '../chat-repository.service.js';
import { canUserAccessConversation, evaluateCanUserAccessMosChat, resolveUserPrefKey } from '../chat-access.service.js';
import { formatConversationForUser } from '../chat-format.service.js';
import { buildDefaultUserSidebarPrefs } from '../chat-state-defaults.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks } from '../chat-state-store.js';

export async function registerChatRealtimeAndSearchRoutes(fastify: FastifyInstance) {
  // ================= ENTERPRISE SCALE: SSE STREAM, DELTA SYNC & LAZY ROOM PAGINATION =================

  // GET /api/chat/stream (Server-Sent Events real-time stream for 100+ concurrent staff)
  fastify.get(
    '/chat/stream',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as SafeAny).user as JwtUserPayload | undefined;
      chatRealtimeHub.registerSseClient(reply, user?.id ?? null);
      return reply;
    }
  );

  // GET /api/chat/sync?since=<isoTimestamp> (Incremental Delta Sync)
  fastify.get(
    '/chat/sync',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const query = (request.query || {}) as { since?: string };
        const [{ conversations, tasks, accessConfig, userPrefsByUserKey }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        if (!evaluateCanUserAccessMosChat(user, staffDirectory, accessConfig)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Tài khoản của bạn chưa được cấp quyền truy cập mOS Chat.',
          });
        }

        const didSyncMissions = await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(
          fastify,
          conversations,
          tasks
        );
        if (didSyncMissions) {
          // Polling endpoint: persist in the background lane so reads/writes never queue behind a full re-sync.
          await Promise.all([
            saveConversations(fastify, conversations, { bulkBackground: true }),
            saveTasks(fastify, tasks, { bulkBackground: true }),
          ]);
        }

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentUserPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();

        const visibleConversations = conversations
          .filter((c) => canUserAccessConversation(c, user, staffDirectory))
          .map((c) => formatConversationForUser(c, user, staffDirectory, currentUserPrefs, userPrefsByUserKey));

        const visibleConvIds = new Set(visibleConversations.map((c) => c.id));
        const visibleTasks = tasks.filter((t) => visibleConvIds.has(t.conversationId));

        const delta = computeDeltaFromSnapshot(
          {
            conversations: visibleConversations,
            tasks: visibleTasks,
          },
          query.since
        );

        return {
          success: true,
          ...delta,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/sync error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể đồng bộ dữ liệu mOS Chat.',
        });
      }
    }
  );

  // GET /api/chat/conversations/:conversationId/messages?before=<cursor>&after=<cursor>&limit=<n>
  fastify.get(
    '/chat/conversations/:conversationId/messages',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const { conversationId } = request.params as { conversationId: string };
        const query = (request.query || {}) as { before?: string; after?: string; limit?: string | number };

        const [{ conversations, userPrefsByUserKey }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        const conv = conversations.find((c) => c.id === conversationId);
        if (!conv) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Không tìm thấy cuộc trò chuyện.',
          });
        }

        if (!canUserAccessConversation(conv, user, staffDirectory)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền truy cập cuộc trò chuyện này.',
          });
        }

        const userPrefKey = resolveUserPrefKey(user, staffDirectory);
        const currentUserPrefs = userPrefsByUserKey[userPrefKey] || buildDefaultUserSidebarPrefs();
        const formattedConv = formatConversationForUser(
          conv,
          user,
          staffDirectory,
          currentUserPrefs,
          userPrefsByUserKey
        );

        const page = paginateConversationMessages(formattedConv.messages || [], {
          before: query.before || null,
          after: query.after || null,
          limit: query.limit != null ? Number(query.limit) : 50,
        });

        return {
          success: true,
          conversationId: conv.id,
          messages: page.messages,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/conversations/:conversationId/messages error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể tải lịch sử tin nhắn.',
        });
      }
    }
  );

  // GET /api/chat/messages/search?q=<query>&conversationId=<id>&inThreadOnly=<bool>&hasAttachment=<bool>&limit=<n>
  fastify.get(
    '/chat/messages/search',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = (request as SafeAny).user as JwtUserPayload | undefined;
        const query = (request.query || {}) as SafeAny;
        const rawQ = String(query.q || '').trim();
        const requestedConvId = query.conversationId ? String(query.conversationId).trim() : undefined;
        const inThreadOnly = query.inThreadOnly === 'true' || query.inThreadOnly === true;
        const hasAttachmentOnly = query.hasAttachment === 'true' || query.hasAttachment === true;
        const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100);

        // When no search keyword is given and no filter is active, return empty result
        if (!rawQ && !hasAttachmentOnly && !inThreadOnly && !requestedConvId) {
          return {
            success: true,
            query: '',
            totalMatches: 0,
            items: [],
          };
        }

        if (requestedConvId === AI_COPILOT_CONV_ID) {
          return {
            success: true,
            query: rawQ,
            totalMatches: 0,
            items: [],
          };
        }

        const [{ conversations, userPrefsByUserKey }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        const accessibleConvs = conversations.filter((c) => canUserAccessConversation(c, user, staffDirectory));
        const convMap = new Map<string, MosChatConversation>();
        for (const c of accessibleConvs) {
          const prefKey = resolveUserPrefKey(user, staffDirectory);
          const currentUserPrefs = userPrefsByUserKey[prefKey] || buildDefaultUserSidebarPrefs();
          const formatted = formatConversationForUser(c, user, staffDirectory, currentUserPrefs, userPrefsByUserKey);
          convMap.set(c.id, formatted);
        }

        if (requestedConvId && !convMap.has(requestedConvId)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền truy cập cuộc trò chuyện này.',
          });
        }

        const targetConvIds = requestedConvId ? [requestedConvId] : Array.from(convMap.keys());
        if (targetConvIds.length === 0) {
          return {
            success: true,
            query: rawQ,
            totalMatches: 0,
            items: [],
          };
        }

        const ready = await ensureChatRelationalTables(fastify);
        const crm = (fastify as SafeAny)?.prisma?.crm;
        const normQ = removeVietnameseTones(rawQ.toLowerCase());

        // Semantic attachment intent: "ảnh", "hình", "minh chứng", "file", "đính kèm 1 ảnh"...
        const ATTACHMENT_INTENT_TERMS = [
          'anh',
          'hinh',
          'hinh anh',
          'anh chup',
          'minh chung',
          'photo',
          'image',
          'picture',
          'file',
          'tep',
          'dinh kem',
          'dinh kem 1 anh',
          '1 anh',
          '2 anh',
          'tai lieu',
          'unc',
        ];
        const isAttachmentIntent =
          normQ.length > 0 && ATTACHMENT_INTENT_TERMS.some((kw) => normQ === kw || normQ.includes(kw));

        let matchedMessages: SafeAny[] = [];

        if (ready && crm?.crmChatMessage) {
          const searchConditions: SafeAny[] = [];
          if (rawQ) {
            searchConditions.push({ text: { contains: rawQ } }, { senderName: { contains: rawQ } });
            if (normQ !== rawQ.toLowerCase()) {
              searchConditions.push({ text: { contains: normQ } }, { senderName: { contains: normQ } });
            }
          }

          const whereClause: SafeAny = {
            conversationId: { in: targetConvIds },
            isDeleted: false,
          };
          if (inThreadOnly) {
            whereClause.parentMessageId = { not: null };
          }
          if (rawQ && !hasAttachmentOnly && searchConditions.length > 0) {
            whereClause.OR = searchConditions;
          }

          const selectFields = {
            id: true,
            conversationId: true,
            parentMessageId: true,
            senderId: true,
            senderName: true,
            senderRole: true,
            senderAvatar: true,
            roleColor: true,
            text: true,
            timeLabel: true,
            isDeleted: true,
            metadataJson: true,
            createdAt: true,
          };

          const [textResults, attachmentResults] = await Promise.all([
            crm.crmChatMessage.findMany({
              where: whereClause,
              orderBy: { createdAt: 'desc' },
              take: 300,
              select: selectFields,
            }),
            crm.crmChatMessage
              .findMany({
                where: {
                  conversationId: { in: targetConvIds },
                  isDeleted: false,
                  ...(inThreadOnly ? { parentMessageId: { not: null } } : {}),
                  metadataJson: {
                    path: '$.attachments[0]',
                    not: null,
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 150,
                select: selectFields,
              })
              .catch(() => []),
          ]);

          const combinedMap = new Map<string, SafeAny>();
          for (const row of textResults) {
            combinedMap.set(row.id, row);
          }
          for (const row of attachmentResults) {
            combinedMap.set(row.id, row);
          }
          const allCandidateRows = Array.from(combinedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          matchedMessages = allCandidateRows.filter((row: SafeAny) => {
            const meta = (row.metadataJson || {}) as SafeAny;
            const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
            if (hasAttachmentOnly && attachments.length === 0) {
              return false;
            }

            // If empty query, any row matching whereClause & attachment criteria is included
            if (!normQ) {
              return true;
            }

            const textMatch = removeVietnameseTones(String(row.text || '').toLowerCase()).includes(normQ);
            const senderMatch = removeVietnameseTones(String(row.senderName || '').toLowerCase()).includes(normQ);
            const attachmentMatch = attachments.some((att: SafeAny) =>
              removeVietnameseTones(String(att.name || att.fileName || '').toLowerCase()).includes(normQ)
            );
            const intentMatch = isAttachmentIntent && attachments.length > 0;

            return textMatch || senderMatch || attachmentMatch || intentMatch;
          });
        } else {
          for (const convId of targetConvIds) {
            const c = convMap.get(convId);
            if (!c) continue;
            for (const m of c.messages || []) {
              const meta = m as SafeAny;
              const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
              if (hasAttachmentOnly && attachments.length === 0) continue;
              if (inThreadOnly) continue;

              const textMatch = !normQ || removeVietnameseTones(String(m.text || '').toLowerCase()).includes(normQ);
              const senderMatch =
                !normQ || removeVietnameseTones(String(m.senderName || '').toLowerCase()).includes(normQ);
              const attMatch = attachments.some((att: SafeAny) =>
                removeVietnameseTones(String(att.name || att.fileName || '').toLowerCase()).includes(normQ)
              );
              const intentMatch = isAttachmentIntent && attachments.length > 0;

              if (textMatch || senderMatch || attMatch || intentMatch) {
                matchedMessages.push({
                  ...m,
                  conversationId: c.id,
                  parentMessageId: null,
                  metadataJson: m,
                });
              }
            }
            for (const m of c.messages || []) {
              for (const r of m.thread || []) {
                const rMeta = r as SafeAny;
                const rAtts = Array.isArray(rMeta.attachments) ? rMeta.attachments : [];
                if (hasAttachmentOnly && rAtts.length === 0) continue;

                const rTextMatch = !normQ || removeVietnameseTones(String(r.text || '').toLowerCase()).includes(normQ);
                const rSenderMatch =
                  !normQ || removeVietnameseTones(String(r.senderName || '').toLowerCase()).includes(normQ);
                const rAttMatch = rAtts.some((att: SafeAny) =>
                  removeVietnameseTones(String(att.name || att.fileName || '').toLowerCase()).includes(normQ)
                );
                const rIntentMatch = isAttachmentIntent && rAtts.length > 0;

                if (rTextMatch || rSenderMatch || rAttMatch || rIntentMatch) {
                  matchedMessages.push({
                    ...r,
                    conversationId: c.id,
                    parentMessageId: m.id,
                    metadataJson: r,
                  });
                }
              }
            }
          }
        }

        const totalMatches = matchedMessages.length;
        const sliced = matchedMessages.slice(0, limit);

        const items: MosChatSearchResultItem[] = sliced.map((row: SafeAny) => {
          const conv = convMap.get(row.conversationId);
          const meta = (row.metadataJson || {}) as SafeAny;
          const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
          const attNames = attachments.map((a: SafeAny) => String(a.name || a.fileName || '')).filter(Boolean);

          const rawText = String(row.text || '').trim();
          const displayText =
            rawText ||
            (attachments.length > 0
              ? `[Đính kèm ${attachments.length} ${attachments.length === 1 ? 'hình ảnh/tệp' : 'hình ảnh/tệp'}]`
              : '');

          return {
            id: row.id,
            conversationId: row.conversationId,
            conversationName: conv ? conv.name : row.conversationId,
            conversationType: conv ? conv.type : 'space',
            isThreadReply: Boolean(row.parentMessageId),
            parentMessageId: row.parentMessageId || null,
            senderId: String(row.senderId),
            senderName: row.senderName || 'Nhân sự',
            senderRole: row.senderRole,
            senderAvatar: row.senderAvatar || null,
            roleColor: row.roleColor || null,
            text: displayText,
            timeLabel: row.timeLabel || '',
            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ''),
            isDeleted: Boolean(row.isDeleted),
            deletedByName: meta.deletedByName || null,
            hasAttachments: attachments.length > 0,
            attachmentNames: attNames,
            attachments: attachments.map((a: SafeAny) => ({
              id: a.id,
              url: a.url,
              name: a.name || a.fileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            })),
          };
        });

        return {
          success: true,
          query: rawQ,
          totalMatches,
          items,
        };
      } catch (err: SafeAny) {
        fastify.log.error('GET /chat/messages/search error:', err);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể tìm kiếm tin nhắn lúc này.',
        });
      }
    }
  );
}
