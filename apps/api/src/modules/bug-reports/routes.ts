import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  isAdminOrSuperAdminRole,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type AgentMarkBugFixedRequest,
  type AgentReviewBugReportRequest,
  type AgentUpdateBugProgressRequest,
  type ApproveBugReportImplementationRequest,
  type BugReportListQuery,
  type ConfirmCloseBugReportRequest,
  type CreateBugReportCommentRequest,
  type CreateBugReportRequest,
  type CreateRequestClassificationJobRequest,
  type CreateRequestConversationRequest,
  type ReplyRequestConversationRequest,
  type MarkBugReportNotificationsReadRequest,
  type ReviewBugReportRequest,
  type TriageBugReportRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../middlewares/auth.js';
import { BugReportError, BugReportService, parseBugReportKey } from './bug-report.service.js';
import { RequestClassificationError, RequestClassificationService } from './request-classification.service.js';
import { RequestConversationError, RequestConversationService } from './request-conversation.service.js';
import { RequestClassifierWorkerHub } from './request-classifier-worker-hub.js';
import { InboxFollowUpError, InboxFollowUpService } from './inbox-follow-up.service.js';
import { InboxPlanError, InboxPlanService } from './inbox-plan.service.js';
import { InboxImplementationError, InboxImplementationService } from './inbox-implementation.service.js';
import {
  RequestClassifierWorkerHealthError,
  RequestClassifierWorkerHealthService,
} from './request-classifier-worker-health.service.js';

const WORKER_RATE_LIMIT_WINDOW_MS = 60_000;
const WORKER_RATE_LIMIT_MAX_REQUESTS = 180;
const classifierWorkerRateBuckets = new Map<string, { startedAt: number; count: number }>();

function numericParam(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new BugReportError(`${label} không hợp lệ.`);
  return parsed;
}

async function requireDanny(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;
  if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Vui lòng đăng nhập.' });
  if (!canManageBugInbox(user)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Danny được quyền quản lý Bug Inbox.' });
  }
}

async function requireBugInboxRead(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUserPayload | undefined;
  if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Vui lòng đăng nhập.' });
  if (!canReadBugInbox(user)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ Admin được xem mOS Inbox.' });
  }
}

function agentToken(): string {
  return String(process.env.MOS_BUG_AGENT_TOKEN || '').trim();
}

function classifierWorkerToken(): string {
  return String(process.env.MOS_REQUEST_CLASSIFIER_WORKER_TOKEN || '').trim();
}

function secureTokenEqual(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function canManageBugInbox(user: Pick<JwtUserPayload, 'role' | 'username' | 'email'>): boolean {
  return isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user);
}

export function canReadBugInbox(user: Pick<JwtUserPayload, 'role'>): boolean {
  return isAdminOrSuperAdminRole(user.role);
}

export function isValidAgentAuthorization(header: string, expected: string): boolean {
  if (expected.trim().length < 32) return false;
  const actual =
    String(header || '')
      .match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim() || '';
  return Boolean(actual && secureTokenEqual(actual, expected.trim()));
}

/** A small process-local guard for the single outbound worker bridge. */
export function consumeClassifierWorkerRateLimit(clientKey: string, now = Date.now()): boolean {
  const key = clippedRateLimitKey(clientKey);
  const current = classifierWorkerRateBuckets.get(key);
  if (!current || now - current.startedAt >= WORKER_RATE_LIMIT_WINDOW_MS) {
    classifierWorkerRateBuckets.set(key, { startedAt: now, count: 1 });
    if (classifierWorkerRateBuckets.size > 500) {
      for (const [candidate, bucket] of classifierWorkerRateBuckets) {
        if (now - bucket.startedAt >= WORKER_RATE_LIMIT_WINDOW_MS) classifierWorkerRateBuckets.delete(candidate);
      }
    }
    return true;
  }
  if (current.count >= WORKER_RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function clippedRateLimitKey(value: unknown): string {
  return (
    String(value || 'unknown')
      .trim()
      .slice(0, 160) || 'unknown'
  );
}

function workerClientKey(request: FastifyRequest): string {
  return `${request.ip || 'unknown'}:${String(request.headers['x-worker-id'] || 'worker').slice(0, 100)}`;
}

async function requireAgent(request: FastifyRequest, reply: FastifyReply) {
  const expected = agentToken();
  if (expected.length < 32) {
    request.log.error('MOS_BUG_AGENT_TOKEN is missing or shorter than 32 characters');
    return reply.status(503).send({ error: 'Agent Bridge Unavailable', message: 'Agent Bridge chưa được cấu hình.' });
  }
  const header = String(request.headers.authorization || '');
  if (!isValidAgentAuthorization(header, expected)) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Agent token không hợp lệ.' });
  }
}

async function requireClassifierWorker(request: FastifyRequest, reply: FastifyReply) {
  const expected = classifierWorkerToken();
  if (expected.length < 32) {
    request.log.error('MOS_REQUEST_CLASSIFIER_WORKER_TOKEN is missing or shorter than 32 characters');
    return reply
      .status(503)
      .send({ error: 'Classifier Worker Unavailable', message: 'Worker phân loại chưa được cấu hình.' });
  }
  if (!isValidAgentAuthorization(String(request.headers.authorization || ''), expected)) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Worker token không hợp lệ.' });
  }
  if (!consumeClassifierWorkerRateLimit(workerClientKey(request))) {
    return reply.status(429).send({ error: 'Too Many Requests', message: 'Worker bridge đang gửi quá nhiều yêu cầu.' });
  }
}

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string) {
  if (
    error instanceof BugReportError ||
    error instanceof RequestClassificationError ||
    error instanceof RequestConversationError ||
    error instanceof InboxFollowUpError ||
    error instanceof InboxPlanError ||
    error instanceof InboxImplementationError ||
    error instanceof RequestClassifierWorkerHealthError
  ) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message, code: error.code });
  }
  fastify.log.error(error, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý Bug Inbox.' });
}

function sendAttachment(reply: FastifyReply, value: Awaited<ReturnType<typeof BugReportService.attachment>>) {
  const safeName = encodeURIComponent(value.attachment.originalName || `attachment-${value.attachment.id}`);
  return reply
    .header('Content-Type', value.attachment.mimeType)
    .header('Content-Length', String(value.buffer.length))
    .header('Cache-Control', 'private, no-store')
    .header('Content-Disposition', `inline; filename*=UTF-8''${safeName}`)
    .send(value.buffer);
}

export async function bugReportRoutes(fastify: FastifyInstance) {
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
  fastify.post(
    '/request-classifications',
    { bodyLimit: 14 * 1024 * 1024, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const data = await RequestClassificationService.create(
          fastify,
          request.user.id,
          request.body as CreateRequestClassificationJobRequest
        );
        RequestClassifierWorkerHub.notify('classification_available');
        return reply.status(202).send({ success: true, data, message: 'Đang hỏi AI đề xuất loại yêu cầu.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create request classification failed');
      }
    }
  );

  fastify.get('/request-classifications/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = String((request.params as { id: string }).id || '');
      return reply.send({ data: await RequestClassificationService.status(fastify, request.user.id, id) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Read request classification failed');
    }
  });

  fastify.post('/request-conversations', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const data = await RequestConversationService.create(
        fastify,
        request.user.id,
        request.body as CreateRequestConversationRequest
      );
      RequestClassifierWorkerHub.notify('conversation_available');
      return reply.status(202).send({ success: true, data, message: 'Đang chuẩn bị câu hỏi làm rõ.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create request conversation failed');
    }
  });
  fastify.get('/request-conversations/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send({
        data: await RequestConversationService.status(
          fastify,
          request.user.id,
          String((request.params as { id: string }).id || '')
        ),
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Read request conversation failed');
    }
  });
  fastify.post('/request-conversations/:id/replies', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const data = await RequestConversationService.reply(
        fastify,
        request.user.id,
        String((request.params as { id: string }).id || ''),
        request.body as ReplyRequestConversationRequest
      );
      RequestClassifierWorkerHub.notify('conversation_available');
      return reply.status(202).send({ success: true, data, message: 'Đang chuẩn bị câu hỏi tiếp theo.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Reply request conversation failed');
    }
  });

  fastify.post('/bug-reports', { bodyLimit: 14 * 1024 * 1024, preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const input = request.body as CreateBugReportRequest;
      const data = await BugReportService.create(fastify, request.user.id, input);
      if (await InboxFollowUpService.enqueue(fastify, data.id, 'CREATED', String(data.id)))
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
      if (await InboxPlanService.enqueue(fastify, data.id, 'CREATED'))
        RequestClassifierWorkerHub.notify('inbox_plan_available');
      return reply.status(201).send({
        success: true,
        data,
        message: input?.requestType === 'FEATURE' ? 'Đã ghi nhận yêu cầu chức năng.' : 'Đã ghi nhận báo lỗi.',
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Create bug report failed');
    }
  });

  fastify.get('/bug-reports/mine', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return reply.send(await BugReportService.mine(fastify, request.user.id));
    } catch (error) {
      return sendError(fastify, reply, error, 'List own bug reports failed');
    }
  });

  fastify.patch('/bug-reports/notifications/read', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const updatedCount = await BugReportService.markNotificationsRead(
        fastify,
        request.user.id,
        request.body as MarkBugReportNotificationsReadRequest
      );
      return reply.send({ success: true, data: { updatedCount }, message: 'Đã đọc thông báo.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Mark bug notifications read failed');
    }
  });

  fastify.patch('/bug-reports/:id/review', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const data = await BugReportService.review(fastify, request.user.id, id, request.body as ReviewBugReportRequest);
      if (
        (request.body as ReviewBugReportRequest)?.decision === 'REOPEN' &&
        (await InboxFollowUpService.enqueue(fastify, id, 'REPORTER_REOPENED', data.updatedAt))
      )
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
      if (await InboxPlanService.enqueue(fastify, id, 'REPORTER_COMMENT'))
        RequestClassifierWorkerHub.notify('inbox_plan_available');
      return reply.send({ success: true, data, message: 'Đã ghi nhận phản hồi bản sửa.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Review fixed bug report failed');
    }
  });

  fastify.post(
    '/bug-reports/:id/comments',
    { bodyLimit: 14 * 1024 * 1024, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const data = await BugReportService.addComment(
          fastify,
          request.user.id,
          id,
          canManageBugInbox(request.user),
          request.body as CreateBugReportCommentRequest
        );
        if (await InboxFollowUpService.enqueue(fastify, id, 'REPORTER_COMMENT', data.report.updatedAt))
          RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        if (await InboxPlanService.enqueue(fastify, id, 'REPORTER_COMMENT'))
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        return reply.status(201).send({ success: true, data, message: 'Đã gửi bình luận.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create bug report comment failed');
      }
    }
  );

  fastify.get('/bug-reports', { preHandler: [requireAuth, requireBugInboxRead] }, async (request, reply) => {
    try {
      return reply.send(await BugReportService.list(fastify, request.query as BugReportListQuery));
    } catch (error) {
      return sendError(fastify, reply, error, 'List bug reports failed');
    }
  });

  fastify.get(
    '/bug-reports/worker-health',
    { preHandler: [requireAuth, requireBugInboxRead] },
    async (_request, reply) => {
      try {
        return reply.send({ data: await RequestClassifierWorkerHealthService.read(fastify) });
      } catch (error) {
        return sendError(fastify, reply, error, 'Read request classifier worker health failed');
      }
    }
  );

  fastify.get('/bug-reports/:id', { preHandler: [requireAuth, requireBugInboxRead] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      return reply.send({ data: await BugReportService.detail(fastify, id) });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get bug report failed');
    }
  });

  fastify.patch('/bug-reports/:id/triage', { preHandler: [requireAuth, requireDanny] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const data = await BugReportService.triage(fastify, request.user.id, id, request.body as TriageBugReportRequest);
      if (await InboxPlanService.enqueue(fastify, id, 'TRIAGE_UPDATED'))
        RequestClassifierWorkerHub.notify('inbox_plan_available');
      return reply.send({ success: true, data, message: 'Đã cập nhật ticket.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Triage bug report failed');
    }
  });

  fastify.post(
    '/bug-reports/:id/implementation-approval',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const body = request.body as ApproveBugReportImplementationRequest;
        if (body?.acknowledged !== true) {
          throw new InboxImplementationError('Cần xác nhận rõ ràng trước khi duyệt implementation.', 422);
        }
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const outcome = await InboxImplementationService.approve(fastify, id, request.user.id);
        if (outcome.planRequested && (await InboxPlanService.enqueue(fastify, id, 'IMPLEMENTATION_APPROVAL'))) {
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        if (outcome.implementationQueued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
        return reply.send({
          success: true,
          data: { report: await BugReportService.detail(fastify, id), ...outcome },
          message: outcome.implementationQueued
            ? 'Đã tạo implementation job trong hàng đợi worker.'
            : outcome.planRequested
              ? 'Đã lưu duyệt triển khai; worker đang tạo plan native khớp source hiện hành.'
              : 'Đã lưu duyệt triển khai.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Approve inbox implementation failed');
      }
    }
  );

  fastify.patch(
    '/bug-reports/:id/confirm-close',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const data = await BugReportService.confirmClose(
          fastify,
          request.user.id,
          id,
          request.body as ConfirmCloseBugReportRequest
        );
        return reply.send({ success: true, data, message: 'Đã xác nhận sửa đúng và đóng ticket.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Confirm and close bug report failed');
      }
    }
  );

  fastify.get('/bug-reports/:id/attachments/:attachmentId', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const params = request.params as { id: string; attachmentId: string };
      return sendAttachment(
        reply,
        await BugReportService.attachmentForUser(
          fastify,
          request.user.id,
          numericParam(params.id, 'Ticket ID'),
          numericParam(params.attachmentId, 'Attachment ID'),
          canReadBugInbox(request.user)
        )
      );
    } catch (error) {
      return sendError(fastify, reply, error, 'Read bug report attachment failed');
    }
  });

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
        await RequestClassificationService.heartbeat(fastify, workerId);
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
        const readyReportId = await InboxFollowUpService.complete(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body.leaseToken || ''),
          body.result
        );
        if (readyReportId && (await InboxPlanService.enqueue(fastify, readyReportId, 'CLARITY_READY'))) {
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox follow-up complete failed');
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

  fastify.post(
    '/request-classifier/inbox-plans/claim',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const workerId = String((request.body as { workerId?: string })?.workerId || '');
        await RequestClassificationService.heartbeat(fastify, workerId);
        return reply.send({ data: await InboxPlanService.claim(fastify, workerId) });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox plan claim failed');
      }
    }
  );
  fastify.post(
    '/request-classifier/inbox-plans/:id/complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; result?: unknown };
        const readyImplementationReportId = await InboxPlanService.complete(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body.leaseToken || ''),
          body.result
        );
        if (
          readyImplementationReportId &&
          (await InboxImplementationService.enqueueApproved(fastify, readyImplementationReportId))
        ) {
          RequestClassifierWorkerHub.notify('inbox_implementation_available');
        }
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox plan complete failed');
      }
    }
  );
  fastify.post(
    '/request-classifier/inbox-plans/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string };
        await InboxPlanService.fail(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body.leaseToken || '')
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox plan fail failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/claim',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const workerId = String((request.body as { workerId?: string })?.workerId || '');
        await RequestClassificationService.heartbeat(fastify, workerId);
        if (await InboxImplementationService.recoverApprovedPlanEvents(fastify)) {
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        await InboxImplementationService.recoverInterruptedImplementationJobs(fastify);
        return reply.send({ data: await InboxImplementationService.claim(fastify, workerId) });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox implementation claim failed');
      }
    }
  );
  fastify.post(
    '/request-classifier/inbox-implementations/:id/start',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; worktreePath?: string };
        const started = await InboxImplementationService.start(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.worktreePath
        );
        return reply.send({ success: true, data: { started } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Start inbox implementation failed');
      }
    }
  );
  fastify.post(
    '/request-classifier/inbox-implementations/:id/complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as {
          leaseToken?: string;
          result?: unknown;
          changedFiles?: unknown;
          diffStat?: unknown;
        };
        await InboxImplementationService.complete(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.result,
          { changedFiles: body?.changedFiles, diffStat: body?.diffStat }
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete inbox implementation failed');
      }
    }
  );
  fastify.post(
    '/request-classifier/inbox-implementations/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; code?: string };
        await InboxImplementationService.fail(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.code
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Fail inbox implementation failed');
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
