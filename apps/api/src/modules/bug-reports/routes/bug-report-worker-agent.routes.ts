import type { FastifyInstance } from 'fastify';
import {
  classifyAgNodeFromProvisionerId,
  type AgentMarkBugFixedRequest,
  type AgentReviewBugReportRequest,
  type AgentUpdateBugProgressRequest,
} from '@mos-lab/shared';
import { BugReportService, parseBugReportKey } from '../bug-report.service.js';
import { InboxFollowUpService } from '../inbox-follow-up.service.js';
import { InboxPlanService } from '../inbox-plan.service.js';
import { InboxWorkerStatusService } from '../inbox-worker-status.service.js';
import { RequestClassificationService } from '../request-classification.service.js';
import { RequestClassifierWorkerHealthService } from '../request-classifier-worker-health.service.js';
import { RequestClassifierWorkerHub } from '../request-classifier-worker-hub.js';
import { RequestConversationService } from '../request-conversation.service.js';
import {
  classifierWorkerToken,
  consumeClassifierWorkerRateLimit,
  isValidAgentAuthorization,
  numericParam,
  requireAgent,
  requireClassifierWorker,
  sendAttachment,
  sendError,
  workerClientKey,
} from './bug-report-route-guards.js';

export function registerBugReportWorkerAgentRoutes(fastify: FastifyInstance) {
  fastify.get('/agent/bug-reports', { preHandler: [requireAgent] }, async (_request, reply) => {
    try {
      return reply.send({ data: await BugReportService.agentQueue(fastify) });
    } catch (error) {
      return sendError(fastify, reply, error, 'List Agent bug queue failed');
    }
  });

  fastify.get('/agent/bug-reports/:key', { preHandler: [requireAgent] }, async (request, reply) => {
    try {
      const key = (request.params as { key: string }).key;
      return reply.send({ data: await BugReportService.agentBundle(fastify, key) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get Agent bug bundle failed');
    }
  });

  fastify.post('/agent/bug-reports/:key/clarification', { preHandler: [requireAgent] }, async (request, reply) => {
    try {
      const key = (request.params as { key: string }).key;
      const data = await BugReportService.reviewClarificationByAgent(
        fastify,
        key,
        request.body as AgentReviewBugReportRequest
      );
      if (
        (request.body as AgentReviewBugReportRequest)?.decision === 'READY_FOR_TRIAGE' &&
        (await InboxPlanService.enqueue(fastify, data.id, 'CLARITY_READY'))
      )
        RequestClassifierWorkerHub.notify('inbox_plan_available');
      return reply.send({ success: true, data, message: 'Đã cập nhật bước làm rõ ticket.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Review Agent bug clarification failed');
    }
  });

  fastify.patch('/agent/bug-reports/:key/progress', { preHandler: [requireAgent] }, async (request, reply) => {
    try {
      const key = (request.params as { key: string }).key;
      const data = await BugReportService.updateAgentProgress(
        fastify,
        key,
        request.body as AgentUpdateBugProgressRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật tiến độ Agent.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Update Agent bug progress failed');
    }
  });

  fastify.patch('/agent/bug-reports/:key/fixed', { preHandler: [requireAgent] }, async (request, reply) => {
    try {
      const key = (request.params as { key: string }).key;
      const data = await BugReportService.markFixedByAgent(fastify, key, request.body as AgentMarkBugFixedRequest);
      return reply.send({ success: true, data, message: 'Đã gửi bản sửa cho người báo duyệt.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Mark Agent bug fixed failed');
    }
  });

  fastify.get(
    '/agent/bug-reports/:key/attachments/:attachmentId',
    { preHandler: [requireAgent] },
    async (request, reply) => {
      try {
        const params = request.params as { key: string; attachmentId: string };
        const id = parseBugReportKey(params.key);
        await BugReportService.agentBundle(fastify, params.key);
        return sendAttachment(
          reply,
          await BugReportService.attachment(fastify, id, numericParam(params.attachmentId, 'Attachment ID'))
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Read Agent bug attachment failed');
      }
    }
  );

  fastify.get('/request-classifier/stream', { websocket: true }, (socket, request) => {
    if (!isValidAgentAuthorization(String(request.headers.authorization || ''), classifierWorkerToken())) {
      socket.close(1008, 'Unauthorized');
      return;
    }
    if (!consumeClassifierWorkerRateLimit(workerClientKey(request))) {
      socket.close(1013, 'Rate limited');
      return;
    }
    RequestClassifierWorkerHub.add(String(request.headers['x-worker-id'] || ''), socket);
    socket.send(JSON.stringify({ type: 'connected' }));
    socket.on('close', () => RequestClassifierWorkerHub.remove(socket));
    socket.on('error', () => RequestClassifierWorkerHub.remove(socket));
  });

  fastify.post('/request-classifier/heartbeat', { preHandler: [requireClassifierWorker] }, async (request, reply) => {
    try {
      await RequestClassificationService.heartbeat(
        fastify,
        String((request.body as { workerId?: string })?.workerId || '')
      );
      return reply.send({ success: true });
    } catch (error) {
      return sendError(fastify, reply, error, 'Request classifier heartbeat failed');
    }
  });

  fastify.post(
    '/request-classifier/health/heartbeat',
    { bodyLimit: 8 * 1024, preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const result = await RequestClassifierWorkerHealthService.heartbeat(fastify, request.body);
        return reply.send({ success: true, accepted: result.accepted, data: result.health });
      } catch (error) {
        return sendError(fastify, reply, error, 'Request classifier worker health heartbeat failed');
      }
    }
  );

  fastify.post('/request-classifier/claim', { preHandler: [requireClassifierWorker] }, async (request, reply) => {
    try {
      const workerId = String((request.body as { workerId?: string })?.workerId || '');
      await RequestClassificationService.heartbeat(fastify, workerId);
      return reply.send({ data: await RequestClassificationService.claim(fastify, workerId) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Request classifier claim failed');
    }
  });

  fastify.post(
    '/request-classifier/conversations/claim',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const workerId = String((request.body as { workerId?: string })?.workerId || '');
        await RequestClassificationService.heartbeat(fastify, workerId);
        return reply.send({ data: await RequestConversationService.claim(fastify, workerId) });
      } catch (error) {
        return sendError(fastify, reply, error, 'Request conversation claim failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/conversations/:id/complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; result?: unknown };
        return reply.send({
          success: true,
          data: await RequestConversationService.complete(
            fastify,
            String((request.params as { id: string }).id || ''),
            String(body?.leaseToken || ''),
            body?.result
          ),
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete request conversation failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/conversations/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; reason?: string };
        await RequestConversationService.fail(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.reason
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Fail request conversation failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-follow-ups/claim',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const workerId = String((request.body as { workerId?: string })?.workerId || '');
        const provisionerHeader = String(
          request.headers['x-ag-provisioner-id'] || request.headers['x-ide-provisioner-id'] || ''
        );
        if (provisionerHeader) {
          InboxWorkerStatusService.recordHeartbeat('AG', provisionerHeader, fastify);
        }
        await RequestClassificationService.heartbeat(fastify, workerId);
        if (
          classifyAgNodeFromProvisionerId(provisionerHeader) !== 'AG_WIN' &&
          (await InboxWorkerStatusService.isNodeOnline(fastify, 'AG_WIN'))
        ) {
          return reply.send({ data: null });
        }
        return reply.send({ data: await InboxFollowUpService.claim(fastify, workerId) });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox follow-up claim failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-follow-ups/:id/complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; result?: unknown };
        const readyEvent = await InboxFollowUpService.complete(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body.leaseToken || ''),
          body.result
        );
        if (
          readyEvent &&
          (await InboxPlanService.enqueue(
            fastify,
            readyEvent.reportId,
            readyEvent.eventKind === 'REPORTER_REOPENED' ? 'REOPEN_REANALYZED' : 'CLARITY_READY',
            readyEvent.reopen
          ))
        ) {
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox follow-up complete failed');
      }
    }
  );

  fastify.get(
    '/request-classifier/inbox-follow-ups/:id/attachments/:attachmentId',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const params = request.params as { id: string; attachmentId: string };
        return sendAttachment(
          reply,
          await InboxFollowUpService.originalEvidenceAttachment(
            fastify,
            String(params.id || ''),
            String(request.headers['x-inbox-follow-up-lease'] || ''),
            numericParam(params.attachmentId, 'Attachment ID')
          )
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Read reopen evidence failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-follow-ups/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string };
        await InboxFollowUpService.fail(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body.leaseToken || '')
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox follow-up fail failed');
      }
    }
  );

  fastify.get(
    '/request-classifier/jobs/:id/attachments/:attachmentId',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const params = request.params as { id: string; attachmentId: string };
        const leaseToken = String(request.headers['x-classification-lease'] || '');
        const value = await RequestClassificationService.attachment(
          fastify,
          params.id,
          numericParam(params.attachmentId, 'Attachment ID'),
          leaseToken
        );
        return reply
          .header('Content-Type', value.mimeType)
          .header('Cache-Control', 'private, no-store')
          .send(value.buffer);
      } catch (error) {
        return sendError(fastify, reply, error, 'Read classifier attachment failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/jobs/:id/complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const id = String((request.params as { id: string }).id || '');
        const body = request.body as { leaseToken?: string; result?: unknown };
        const data = await RequestClassificationService.complete(
          fastify,
          id,
          String(body?.leaseToken || ''),
          body?.result
        );
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete request classification failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/jobs/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const id = String((request.params as { id: string }).id || '');
        const body = request.body as { leaseToken?: string; reason?: string };
        await RequestClassificationService.fail(fastify, id, String(body?.leaseToken || ''), body?.reason);
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Fail request classification failed');
      }
    }
  );
}
