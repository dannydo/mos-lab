import type { FastifyInstance } from 'fastify';
import {
  type ActionMosChatMissionRequest,
  type CreateMosChatMissionRequest,
  type ShareMosChatMissionRequest,
  isAiCopilotConversationId,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { mosChatMediaRoot } from '../chat-file.service.js';
import { canUserAccessConversation } from '../chat-access.service.js';
import { formatConversationForUser } from '../chat-format.service.js';
import { withChatMutationLock } from '../chat-repository.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks, saveUserSidebarPrefs } from '../chat-state-store.js';
import { advanceSenderReadPrefsForTargets } from '../chat-target-resolver.js';
import { dispatchChatMessageWebPush } from '../chat-web-push.service.js';

export async function registerChatMissionRoutes(fastify: FastifyInstance) {
  // POST /api/chat/missions (1-Click Dispatch from mOS Chat Message/Thread/Task to mOS Mission for AG)
  // Exclusively restricted to Super Admin Danny
  fastify.post(
    '/chat/missions',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const body = (request.body || {}) as CreateMosChatMissionRequest;
        if (!body.conversationId || (!body.messageId && !body.taskId)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Thiếu thông tin cuộc trò chuyện hoặc tin nhắn gốc để tạo mOS Mission.',
          });
        }

        const [{ conversations, tasks }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);
        const isAiConv = isAiCopilotConversationId(body.conversationId);
        let conv = conversations.find((c) => c.id === body.conversationId);
        if (!conv && isAiConv) {
          conv = {
            id: body.conversationId,
            name: '🤖 MAI',
            type: 'dm',
            roleTag: 'mOS AI',
            color: '#8b5cf6',
            unreadCount: 0,
            messages: body.sourceMessage ? [body.sourceMessage] : [],
            updatedAt: new Date().toISOString(),
          };
        }
        if (!conv) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy cuộc hội thoại' });
        }
        if (!isAiConv && !canUserAccessConversation(conv, user, staffDirectory)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Bạn không có quyền truy cập cuộc hội thoại này.',
          });
        }

        const result = await ChatMissionBridgeService.createMissionFromChat(
          fastify,
          user,
          body,
          conversations,
          tasks,
          staffDirectory,
          mosChatMediaRoot()
        );

        if (!isAiConv) {
          await Promise.all([
            saveConversations(fastify, conversations, {
              touchedConversation: conv,
              touchedMessage: result.message,
            }),
            saveTasks(fastify, tasks, {
              touchedTask: result.task || undefined,
            }),
          ]);
        } else {
          if (result.task) {
            await saveTasks(fastify, tasks, {
              touchedTask: result.task || undefined,
            });
          }
        }

        chatRealtimeHub.publish({
          type: 'MISSION_UPDATED',
          conversationId: conv.id,
          actorStaffId: user.id,
          payload: {
            conversationId: conv.id,
            mission: result.mission,
            message: result.message || null,
            task: result.task || null,
          },
        });

        return {
          success: true,
          mission: result.mission,
          message: result.message,
          task: result.task,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Create mOS Mission from chat error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: err?.message || 'Không thể giao nhiệm vụ sang mOS Mission.',
        });
      }
    }
  );

  // POST /api/chat/missions/:reportId/action (Inline Super Admin & Reporter actions directly inside mOS Chat)
  fastify.post(
    '/chat/missions/:reportId/action',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { reportId: rawReportId } = request.params as { reportId: string };
        const reportId = Number(rawReportId);
        if (!reportId || reportId <= 0) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Mã mOS Mission không hợp lệ.' });
        }

        const body = (request.body || {}) as ActionMosChatMissionRequest;
        if (!body.action) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Thiếu hành động thực thi mOS Mission.' });
        }

        const { conversations, tasks } = await loadChatState(fastify);
        const result = await ChatMissionBridgeService.executeMissionActionFromChat(
          fastify,
          user,
          reportId,
          body,
          conversations,
          tasks
        );

        await Promise.all([
          saveConversations(fastify, conversations),
          saveTasks(fastify, tasks, {
            touchedTask: result.task || undefined,
          }),
        ]);

        chatRealtimeHub.publish({
          type: 'MISSION_UPDATED',
          conversationId: result.mission.conversationId || body.conversationId || null,
          actorStaffId: user.id,
          payload: {
            conversationId: result.mission.conversationId || body.conversationId || null,
            mission: result.mission,
            message: result.message || null,
            task: result.task || null,
            systemReply: result.systemReply || null,
          },
        });

        return {
          success: true,
          mission: result.mission,
          message: result.message,
          statusMessage: result.statusMessage,
          task: result.task,
          systemReply: result.systemReply,
        };
      } catch (err: SafeAny) {
        fastify.log.error('Execute mOS Mission action from chat error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: err?.message || 'Không thể thực thi thao tác trên mOS Mission.',
        });
      }
    }
  );

  // POST /api/chat/missions/share (Instagram-style Share Ticket/Request into mOS Chat)
  fastify.post(
    '/chat/missions/share',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const body = (request.body || {}) as ShareMosChatMissionRequest;

        return await withChatMutationLock(async () => {
          const [{ conversations, userPrefsByUserKey, accessConfig }, staffDirectory] = await Promise.all([
            loadChatState(fastify),
            loadStaffDirectoryCached(fastify),
          ]);

          const shared = await ChatMissionBridgeService.shareMissionToChat(
            fastify,
            user,
            body,
            conversations,
            staffDirectory
          );

          await saveConversations(fastify, conversations, {
            touchedMessagesWithThreads: shared.deliveries.map((d) => ({
              conversation: d.conv,
              message: d.message,
            })),
          });

          const { userPrefKey, updatedSenderPrefs } = advanceSenderReadPrefsForTargets({
            user,
            staffDirectory,
            userPrefsByUserKey,
            deliveries: shared.deliveries,
            nowIso: shared.nowIso,
          });
          const savedPrefs = await saveUserSidebarPrefs(fastify, userPrefKey, updatedSenderPrefs);

          for (const delivery of shared.deliveries) {
            chatRealtimeHub.publish({
              type: 'MESSAGE_CREATED',
              conversationId: delivery.conv.id,
              actorStaffId: user.id,
              payload: {
                conversationId: delivery.conv.id,
                message: delivery.message,
              },
            });

            const summaryText = shared.cleanNote
              ? `${shared.cleanNote} · Đã chia sẻ ${shared.mission.key}: ${shared.mission.title}`
              : `Đã chia sẻ ${shared.mission.key}: ${shared.mission.title}`;

            void dispatchChatMessageWebPush(fastify, {
              conv: delivery.conv,
              senderUser: user,
              senderName: delivery.message.senderName || shared.senderName,
              messageId: delivery.message.id,
              text: summaryText,
              customerCardName: null,
              attachmentCount: 0,
              staffDirectory,
              accessConfig,
              userPrefsByUserKey,
            });
          }

          return {
            success: true,
            mission: shared.mission,
            results: shared.results,
            updatedConversations: shared.deliveries.map((d) =>
              formatConversationForUser(d.conv, user, staffDirectory, savedPrefs, userPrefsByUserKey)
            ),
            userPrefs: savedPrefs,
          };
        });
      } catch (err: SafeAny) {
        fastify.log.error('Share mission to mOS Chat error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Bad Request',
          message: err?.message || 'Không thể chia sẻ yêu cầu vào mOS Chat.',
        });
      }
    }
  );

  // GET /api/chat/missions/:reportId/preview (Read-only shared ticket preview for mOS Chat participants)
  fastify.get(
    '/chat/missions/:reportId/preview',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const user = request.user as JwtUserPayload;
        const { reportId: rawReportId } = request.params as { reportId: string };
        const reportId = Number(rawReportId);
        if (!Number.isInteger(reportId) || reportId <= 0) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Mã yêu cầu không hợp lệ.' });
        }

        const [{ conversations, tasks }, staffDirectory] = await Promise.all([
          loadChatState(fastify),
          loadStaffDirectoryCached(fastify),
        ]);

        const preview = await ChatMissionBridgeService.getSharedMissionPreview(
          fastify,
          user,
          reportId,
          conversations,
          tasks,
          staffDirectory
        );

        return { success: true, data: preview };
      } catch (err: SafeAny) {
        fastify.log.error('Preview shared mOS Mission error:', err);
        const statusCode = Number(err?.statusCode) || 400;
        return reply.status(statusCode).send({
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Bad Request',
          message: err?.message || 'Không thể tải chi tiết yêu cầu.',
        });
      }
    }
  );
}
