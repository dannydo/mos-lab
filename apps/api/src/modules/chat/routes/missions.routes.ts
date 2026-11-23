import type { FastifyInstance } from 'fastify';
import {
  type ActionMosChatMissionRequest,
  type CreateMosChatMissionRequest,
  isAiCopilotConversationId,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';
import { chatRealtimeHub } from '../chat-realtime.hub.js';
import { mosChatMediaRoot } from '../chat-file.service.js';
import { canUserAccessConversation } from '../chat-access.service.js';
import { loadStaffDirectoryCached } from '../chat-staff-directory.service.js';
import { loadChatState, saveConversations, saveTasks } from '../chat-state-store.js';

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
}
