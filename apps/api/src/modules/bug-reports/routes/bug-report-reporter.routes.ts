import type { FastifyInstance } from 'fastify';
import type {
  BugReportBadgeSummaryResponse,
  CancelBugReportRequest,
  CreateBugReportCommentRequest,
  CreateBugReportRequest,
  CreateRequestClassificationJobRequest,
  CreateRequestConversationRequest,
  MarkBugReportNotificationsReadRequest,
  MyBugReportsResponse,
  ReplyRequestConversationRequest,
  ReviewBugReportImplementationAcceptanceRequest,
  ReviewBugReportRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { BugReportError, BugReportService } from '../bug-report.service.js';
import { InboxFollowUpService } from '../inbox-follow-up.service.js';
import { InboxImplementationService } from '../inbox-implementation.service.js';
import { InboxPlanService } from '../inbox-plan.service.js';
import { RequestClassificationService } from '../request-classification.service.js';
import { RequestClassifierWorkerHub } from '../request-classifier-worker-hub.js';
import { RequestConversationService } from '../request-conversation.service.js';
import {
  BUG_REPORT_BODY_LIMIT,
  canManageBugInbox,
  canReadBugInbox,
  numericParam,
  sendAttachment,
  sendError,
} from './bug-report-route-guards.js';

export function registerBugReportReporterRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/request-classifications',
    { bodyLimit: BUG_REPORT_BODY_LIMIT, preHandler: [requireAuth] },
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

  fastify.post(
    '/bug-reports',
    { bodyLimit: BUG_REPORT_BODY_LIMIT, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const input = request.body as CreateBugReportRequest;
        const data = await BugReportService.create(fastify, request.user.id, input);
        fastify.cache?.invalidatePattern('^bug-reports:(mine|badge):');
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
    }
  );

  fastify.get('/bug-reports/badge-summary', { preHandler: [requireAuth] }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    const includeInboxSummary = canReadBugInbox(request.user);
    const cacheKey = `bug-reports:badge:${request.user.id}:${includeInboxSummary ? 1 : 0}`;
    const cached = fastify.cache?.get<BugReportBadgeSummaryResponse>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }
    try {
      const data = await BugReportService.badgeSummary(fastify, request.user.id, includeInboxSummary);
      fastify.cache?.set(cacheKey, data, 30_000);
      return reply.send(data);
    } catch (error) {
      return sendError(fastify, reply, error, 'Read bug report badge summary failed');
    }
  });

  fastify.get('/bug-reports/mine', { preHandler: [requireAuth] }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    const bypassCache = Boolean((request.query as { _t?: string })?._t);
    const cacheKey = `bug-reports:mine:${request.user.id}`;
    if (!bypassCache) {
      const cached = fastify.cache?.get<MyBugReportsResponse>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }
    }
    try {
      const data = await BugReportService.mine(fastify, request.user.id);
      if (!bypassCache) {
        fastify.cache?.set(cacheKey, data, 30_000);
      } else {
        fastify.cache?.invalidatePattern(`^bug-reports:(mine|badge):${request.user.id}(:|$)`);
      }
      return reply.send(data);
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
      fastify.cache?.invalidatePattern(`^bug-reports:(mine|badge):${request.user.id}(:|$)`);
      return reply.send({ success: true, data: { updatedCount }, message: 'Đã đọc thông báo.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Mark bug notifications read failed');
    }
  });

  fastify.patch(
    '/bug-reports/:id/review',
    { bodyLimit: BUG_REPORT_BODY_LIMIT, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const data = await BugReportService.review(
          fastify,
          request.user.id,
          id,
          request.body as ReviewBugReportRequest
        );
        fastify.cache?.invalidatePattern('^bug-reports:(mine|badge):');
        if (
          (request.body as ReviewBugReportRequest)?.decision === 'REOPEN' &&
          (await InboxFollowUpService.enqueue(fastify, id, 'REPORTER_REOPENED', data.updatedAt))
        )
          RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        return reply.send({ success: true, data, message: 'Đã ghi nhận phản hồi bản sửa.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Review fixed bug report failed');
      }
    }
  );

  fastify.post('/bug-reports/:id/cancel', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const data = await BugReportService.cancel(
        fastify,
        request.user.id,
        id,
        canManageBugInbox(request.user),
        request.body as CancelBugReportRequest
      );
      return reply.send({ success: true, data, message: 'Đã huỷ yêu cầu thành công.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Cancel bug report failed');
    }
  });

  fastify.patch('/bug-reports/:id/cancel', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const data = await BugReportService.cancel(
        fastify,
        request.user.id,
        id,
        canManageBugInbox(request.user),
        request.body as CancelBugReportRequest
      );
      return reply.send({ success: true, data, message: 'Đã huỷ yêu cầu thành công.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Cancel bug report failed');
    }
  });

  fastify.post(
    '/bug-reports/:id/comments',
    { bodyLimit: BUG_REPORT_BODY_LIMIT, preHandler: [requireAuth] },
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
        fastify.cache?.invalidatePattern('^bug-reports:(mine|badge):');
        if (data.report.clarification?.status === 'PENDING_AGENT') {
          if (await InboxFollowUpService.enqueue(fastify, id, 'REPORTER_COMMENT', data.report.updatedAt))
            RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        }
        if (data.report.status === 'NEW' && data.report.clarification?.status === 'READY' && !data.report.approvedAt) {
          if (await InboxPlanService.enqueue(fastify, id, 'REPORTER_COMMENT'))
            RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        return reply.status(201).send({ success: true, data, message: 'Đã gửi bình luận.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create bug report comment failed');
      }
    }
  );

  fastify.post('/bug-reports/:id/retry-clarification', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      if (!canManageBugInbox(request.user)) {
        throw new BugReportError('Bạn không có quyền yêu cầu làm rõ lại.', 403);
      }
      const data = await BugReportService.retryClarification(fastify, id, request.user.id);
      if (await InboxFollowUpService.enqueue(fastify, id, 'CREATED', `retry:${Date.now()}`)) {
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
      }
      return reply.send({ success: true, data, message: 'Đã kích hoạt AG làm rõ lại ticket.' });
    } catch (error) {
      return sendError(fastify, reply, error, 'Retry clarification failed');
    }
  });

  fastify.patch('/bug-reports/:id/implementation-acceptance', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const body = request.body as ReviewBugReportImplementationAcceptanceRequest;
      await InboxImplementationService.reviewReporterAcceptance(fastify, id, request.user.id, body);
      return reply.send({
        success: true,
        data: await BugReportService.detail(fastify, id),
        message:
          body?.decision === 'APPROVE'
            ? 'Người báo đã nghiệm thu bản sửa và hoàn tất ticket.'
            : 'Đã mở lại ticket theo yêu cầu người báo.',
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Review Danny implementation acceptance failed');
    }
  });

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
}
