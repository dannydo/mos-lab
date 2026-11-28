import { FastifyInstance } from 'fastify';
import { SafeAny, classifyAgNodeFromProvisionerId } from '@mos-lab/shared';
import { AgChatBridgeService } from '../ag-chat-bridge.service.js';
import { updateRemoteAgModels, type LiveCascadeModelInput } from '../ag-models-registry.js';
import { InboxWorkerStatusService } from '../../bug-reports/inbox-worker-status.service.js';
import {
  appendBotMessageToChatConversation,
  appendBotThreadReplyToChatConversation,
} from '../../chat/chat-repository.service.js';

function isValidBridgeAuth(authHeader: unknown): boolean {
  const bridgeToken = (process.env.MOS_AG_TASK_BRIDGE_TOKEN || process.env.MOS_IDE_TASK_BRIDGE_TOKEN || '').trim();
  const auth = String(authHeader || '');
  return Boolean(
    bridgeToken && bridgeToken.length >= 32 && auth.startsWith('Bearer ') && auth.slice(7).trim() === bridgeToken
  );
}

export function registerAgTaskBridgeRoutes(fastify: FastifyInstance) {
  // AG Task Bridge: Long-polling endpoint for Danny's Mac daemon to claim pending chat jobs
  fastify.get('/ag-task-bridge/chat/next', async (request, reply) => {
    if (isValidBridgeAuth(request.headers.authorization)) {
      const provisionerHeader = String(
        request.headers['x-ag-provisioner-id'] || request.headers['x-ide-provisioner-id'] || ''
      );
      if (provisionerHeader) {
        InboxWorkerStatusService.recordHeartbeat('AG', provisionerHeader, fastify);
      }
      if (
        classifyAgNodeFromProvisionerId(provisionerHeader) !== 'AG_WIN' &&
        (await InboxWorkerStatusService.isNodeOnline(fastify, 'AG_WIN'))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        return reply.send({ success: true, data: null });
      }
      const job = await AgChatBridgeService.getNextRemoteChatJob(20_000);
      return reply.send({ success: true, data: job });
    }
    return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
  });

  // AG Task Bridge: Danny's Mac daemon completes the chat job
  fastify.post<{
    Params: { jobId: string };
    Body: {
      conversationId: string;
      response: { content: string; thinking?: string | null; suggestedAction?: SafeAny };
    };
  }>('/ag-task-bridge/chat/:jobId/complete', async (request, reply) => {
    if (!isValidBridgeAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
    }
    const { jobId } = request.params;
    const { conversationId, response } = request.body || {};
    const ok = AgChatBridgeService.completeRemoteChatJob(jobId, {
      conversationId: conversationId || '',
      response: {
        content: response?.content || '',
        thinking: response?.thinking || null,
        suggestedAction: response?.suggestedAction || null,
      },
    });

    const archivedJob = AgChatBridgeService.getArchivedJob(jobId);

    // Late completion recovery & auto-delivery to chat space ONLY if the job had timed out (!ok)
    // When ok is true, the active in-flight AiAssistantService.sendMessage is awaiting this job and will deliver the response.
    if (!ok && !archivedJob?.delivered && response?.content) {
      try {
        if (archivedJob?.targetChatConvId) {
          if (archivedJob.targetChatThreadId) {
            await appendBotThreadReplyToChatConversation(
              fastify,
              archivedJob.targetChatConvId,
              archivedJob.targetChatThreadId,
              {
                text: response.content,
                thinking: response.thinking,
                suggestedAction: response.suggestedAction,
                recipientName: archivedJob.userName,
              }
            );
          } else {
            await appendBotMessageToChatConversation(fastify, archivedJob.targetChatConvId, {
              text: response.content,
              thinking: response.thinking,
              suggestedAction: response.suggestedAction,
              recipientName: archivedJob.userName,
            });
          }
        }
        if (archivedJob?.sessionId) {
          const lastMsg = await fastify.prisma.crm.crmAiChatMessage.findFirst({
            where: { sessionId: archivedJob.sessionId, role: 'assistant' },
            orderBy: { createdAt: 'desc' },
          });
          if (lastMsg) {
            await fastify.prisma.crm.crmAiChatMessage.update({
              where: { id: lastMsg.id },
              data: {
                content: response.content,
                thinking: response.thinking || null,
                suggestedActionJson: response.suggestedAction ? JSON.stringify(response.suggestedAction) : null,
              },
            });
          }
        }
        if (archivedJob) {
          archivedJob.delivered = true;
        }
      } catch (recoveryErr) {
        fastify.log.warn({ err: recoveryErr }, 'Failed to deliver late AG response to chat space');
      }
    }

    return reply.send({ success: ok });
  });

  // AG Task Bridge: the daemon reports it cannot execute the chat job so the API can fall back immediately
  fastify.post<{
    Params: { jobId: string };
    Body: { reason?: string };
  }>('/ag-task-bridge/chat/:jobId/fail', async (request, reply) => {
    if (!isValidBridgeAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
    }
    const ok = AgChatBridgeService.failRemoteChatJob(request.params.jobId, request.body?.reason);
    return reply.send({ success: ok });
  });

  // AG Task Bridge: sync live cascade model catalog from Danny's Antigravity daemon
  fastify.post<{
    Body: { models?: LiveCascadeModelInput[] };
  }>('/ag-task-bridge/models', async (request, reply) => {
    if (!isValidBridgeAuth(request.headers.authorization)) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Bridge token không hợp lệ' });
    }
    const models = Array.isArray(request.body?.models) ? request.body.models : [];
    const normalized = updateRemoteAgModels(models);
    return reply.send({ success: true, count: normalized.length });
  });
}
