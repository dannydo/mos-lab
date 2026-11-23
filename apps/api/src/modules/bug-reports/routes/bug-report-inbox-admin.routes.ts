import type { FastifyInstance } from 'fastify';
import {
  getExecutionOwnerDisplayName,
  type ApproveBugReportImplementationCommitRequest,
  type ApproveBugReportImplementationDeployRequest,
  type ApproveBugReportImplementationRequest,
  type BugReportListQuery,
  type ConfirmCloseBugReportRequest,
  type InboxExecutionDashboardQuery,
  type InboxImplementationExecutionOwner,
  type RecordInboxIdeCommitReceiptRequest,
  type RecordInboxIdeImplementationReceiptRequest,
  type RequestBugReportImplementationChangesRequest,
  type RequestBugReportPlanChangesRequest,
  type RetryBugReportImplementationRequest,
  type TriageBugReportRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { BugReportService } from '../bug-report.service.js';
import { InboxExecutionTimeService } from '../inbox-execution-time.service.js';
import { InboxImplementationError, InboxImplementationService } from '../inbox-implementation.service.js';
import { InboxPlanService } from '../inbox-plan.service.js';
import { InboxWorkerStatusService } from '../inbox-worker-status.service.js';
import { RequestClassifierWorkerHealthService } from '../request-classifier-worker-health.service.js';
import { RequestClassifierWorkerHub } from '../request-classifier-worker-hub.js';
import { numericParam, requireBugInboxRead, requireDanny, sendError } from './bug-report-route-guards.js';

interface RecoveryRetryRouteSpec {
  path: string;
  ackErrorMessage: string;
  authorize: (fastify: FastifyInstance, reportId: number, actorStaffId: number) => Promise<boolean>;
  successMessage: string;
  emptyMessage: string;
  errorContext: string;
}

const RECOVERY_RETRY_ROUTES: RecoveryRetryRouteSpec[] = [
  {
    path: '/bug-reports/:id/implementation-schema-recovery-retry',
    ackErrorMessage: 'Cần xác nhận rõ ràng trước khi cấp retry sau khi sửa schema.',
    authorize: (fastify, reportId, actorStaffId) =>
      InboxImplementationService.authorizeSchemaRecoveryRetry(fastify, reportId, actorStaffId),
    successMessage: 'Đã cấp đúng một retry sau khi sửa schema, liên kết với chẩn đoán đã xác minh.',
    emptyMessage: 'Retry sau khi sửa schema không được tạo.',
    errorContext: 'Authorize schema recovery retry failed',
  },
  {
    path: '/bug-reports/:id/implementation-quality-gate-recovery-retry',
    ackErrorMessage: 'Cần xác nhận rõ ràng trước khi cấp retry sau khi sửa cổng kiểm thử.',
    authorize: (fastify, reportId, actorStaffId) =>
      InboxImplementationService.authorizeQualityGateRecoveryRetry(fastify, reportId, actorStaffId),
    successMessage: 'Đã cấp đúng một retry cuối sau khi cổng kiểm thử được sửa và xác minh.',
    emptyMessage: 'Retry sau khi sửa cổng kiểm thử không được tạo.',
    errorContext: 'Authorize quality-gate recovery retry failed',
  },
  {
    path: '/bug-reports/:id/implementation-build-lock-recovery-retry',
    ackErrorMessage: 'Cần xác nhận rõ ràng trước khi cấp retry sau khi sửa lock build.',
    authorize: (fastify, reportId, actorStaffId) =>
      InboxImplementationService.authorizeBuildLockRecoveryRetry(fastify, reportId, actorStaffId),
    successMessage: 'Đã cấp đúng một retry sau khi sửa lock build riêng và kiểm chứng.',
    emptyMessage: 'Retry sau khi sửa lock build không được tạo.',
    errorContext: 'Authorize build-lock recovery retry failed',
  },
  {
    path: '/bug-reports/:id/implementation-worker-recovery-retry',
    ackErrorMessage: 'Cần xác nhận rõ ràng trước khi cấp retry khôi phục Worker.',
    authorize: (fastify, reportId, actorStaffId) =>
      InboxImplementationService.authorizeWorkerRecoveryRetry(fastify, reportId, actorStaffId),
    successMessage: 'Đã cấp đúng một retry khôi phục Worker, liên kết với lỗi hạ tầng đã được ghi nhận.',
    emptyMessage: 'Retry khôi phục Worker không được tạo.',
    errorContext: 'Authorize Worker recovery retry failed',
  },
];

export function registerBugReportInboxAdminRoutes(fastify: FastifyInstance) {
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
        const [health, dualWorkers] = await Promise.all([
          RequestClassifierWorkerHealthService.read(fastify),
          InboxWorkerStatusService.getDualWorkersStatus(fastify),
        ]);
        const overallState = dualWorkers.ag.isOnline || dualWorkers.codex.isOnline ? 'ONLINE' : health.state;
        return reply.send({
          data: {
            ...health,
            state: overallState,
            workers: dualWorkers,
          },
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Read request classifier worker health failed');
      }
    }
  );

  fastify.get(
    '/bug-reports/timing/dashboard',
    { preHandler: [requireAuth, requireBugInboxRead] },
    async (request, reply) => {
      try {
        const timingService = new InboxExecutionTimeService(fastify);
        const data = await timingService.getDashboardSummary(request.query as InboxExecutionDashboardQuery);
        return reply.send({ data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Get bug report timing dashboard failed');
      }
    }
  );

  fastify.get('/bug-reports/:id/timing', { preHandler: [requireAuth, requireBugInboxRead] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const timingService = new InboxExecutionTimeService(fastify);
      const timing = await timingService.getTicketTiming(id);
      if (!timing) {
        return reply.status(404).send({ error: 'NotFound', message: 'Không tìm thấy ticket.' });
      }
      return reply.send({ data: timing });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get bug report timing failed');
    }
  });

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
        const rawOwner = body.executionOwner ? String(body.executionOwner).toUpperCase() : 'AG_WIN';
        const executionOwner: InboxImplementationExecutionOwner =
          rawOwner === 'AG_WIN' ||
          rawOwner === 'AG_MAC' ||
          rawOwner === 'AG' ||
          rawOwner === 'IDE' ||
          rawOwner === 'AUTO'
            ? rawOwner
            : 'AG_WIN';
        const outcome = await InboxImplementationService.approve(
          fastify,
          id,
          request.user.id,
          body.planReview,
          executionOwner,
          body.modelTier
        );
        if (outcome.planRequested && (await InboxPlanService.enqueue(fastify, id, 'IMPLEMENTATION_APPROVAL'))) {
          RequestClassifierWorkerHub.notify('inbox_plan_available');
        }
        return reply.send({
          success: true,
          data: { reportId: id, ...outcome },
          message: outcome.implementationQueued
            ? executionOwner === 'AG_WIN' || executionOwner === 'AG_MAC' || executionOwner === 'AG'
              ? `Đã tạo handoff cho ${getExecutionOwnerDisplayName(executionOwner)}. Hãy thực hiện code/test trong Antigravity.`
              : executionOwner === 'AUTO'
                ? 'Đã xếp hàng code/test tự động (Win AG ưu tiên, tràn sang Mac AG nếu đầy slot/offline).'
                : 'Đã tạo IDE handoff. Hãy thực hiện code/test trong Codex IDE hiển thị.'
            : outcome.planRequested
              ? 'Đã lưu duyệt triển khai; worker đang tạo plan native khớp source hiện hành.'
              : 'Đã lưu duyệt triển khai.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Approve inbox implementation failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/implementation-retry',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const body = request.body as RetryBugReportImplementationRequest;
        if (body?.acknowledged !== true) {
          throw new InboxImplementationError('Cần xác nhận rõ ràng trước khi retry implementation.', 422);
        }
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const implementationQueued = await InboxImplementationService.retryFailed(fastify, id, request.user.id);
        return reply.send({
          success: true,
          data: { reportId: id, implementationQueued, planRequested: false },
          message: implementationQueued
            ? 'Đã tạo đúng một handoff Codex IDE liên kết job terminal cũ.'
            : 'Retry implementation không được tạo.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Retry inbox implementation failed');
      }
    }
  );

  for (const spec of RECOVERY_RETRY_ROUTES) {
    fastify.post(spec.path, { preHandler: [requireAuth, requireDanny] }, async (request, reply) => {
      try {
        const body = request.body as { acknowledged?: unknown };
        if (body?.acknowledged !== true) {
          throw new InboxImplementationError(spec.ackErrorMessage, 422);
        }
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const implementationQueued = await spec.authorize(fastify, id, request.user.id);
        if (implementationQueued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
        return reply.send({
          success: true,
          data: { reportId: id, implementationQueued, planRequested: false },
          message: implementationQueued ? spec.successMessage : spec.emptyMessage,
        });
      } catch (error) {
        return sendError(fastify, reply, error, spec.errorContext);
      }
    });
  }

  fastify.post(
    '/bug-reports/:id/ide-implementation-receipt',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const outcome = await InboxImplementationService.recordIdeReceipt(
          fastify,
          id,
          request.user.id,
          request.body as RecordInboxIdeImplementationReceiptRequest
        );
        return reply.send({
          success: true,
          data: { reportId: id, outcome },
          message:
            outcome === 'DUPLICATE'
              ? 'IDE receipt này đã được ghi trước đó; không tạo thêm audit hay checkpoint.'
              : 'Đã ghi IDE receipt. Ticket đang chờ review commit; Worker Mac không được chạy bước tiếp theo.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record IDE implementation receipt failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/ide-handoff-cancel',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const cancelled = await InboxImplementationService.cancelIdeHandoff(fastify, id, request.user.id);
        return reply.send({ success: true, data: { reportId: id, cancelled } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Cancel IDE handoff failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/ide-commit-receipt',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const recorded = await InboxImplementationService.recordIdeCommitReceipt(
          fastify,
          id,
          request.user.id,
          request.body as RecordInboxIdeCommitReceiptRequest
        );
        return reply.send({
          success: true,
          data: { reportId: id, outcome: recorded },
          message:
            recorded === 'DUPLICATE'
              ? 'Commit receipt này đã được ghi trước đó; không tạo thêm audit hay checkpoint.'
              : 'Đã ghi commit receipt. Ticket đang chờ Danny duyệt deploy.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record IDE commit receipt failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/implementation-commit-approval',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const body = request.body as ApproveBugReportImplementationCommitRequest;
        if (body?.acknowledged !== true) {
          throw new InboxImplementationError('Cần xác nhận rõ ràng trước khi duyệt commit.', 422);
        }
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const commitQueued = await InboxImplementationService.approveCommit(fastify, id, request.user.id);
        if (commitQueued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
        return reply.send({
          success: true,
          data: { reportId: id, commitQueued },
          message: commitQueued
            ? 'Đã ghi nhận duyệt commit; worker Mac chỉ commit bản diff đã review vào branch riêng.'
            : 'Duyệt commit không được ghi nhận vì checkpoint đã thay đổi.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Approve inbox implementation commit failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/implementation-deploy-approval',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const body = request.body as ApproveBugReportImplementationDeployRequest;
        if (body?.acknowledged !== true) {
          throw new InboxImplementationError('Cần xác nhận rõ ràng trước khi duyệt deploy.', 422);
        }
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        const deploymentQueued = await InboxImplementationService.approveDeploy(fastify, id, request.user.id);
        if (deploymentQueued) RequestClassifierWorkerHub.notify('inbox_implementation_available');
        return reply.send({
          success: true,
          data: { reportId: id, deploymentQueued },
          message: deploymentQueued
            ? 'Đã ghi nhận duyệt deploy; worker Mac sẽ merge, push và chạy pipeline production cho đúng commit đã duyệt.'
            : 'Duyệt deploy không được ghi nhận vì checkpoint đã thay đổi.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Approve inbox implementation deploy failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/implementation-request-changes',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        await InboxImplementationService.requestChanges(
          fastify,
          id,
          request.user.id,
          request.body as RequestBugReportImplementationChangesRequest
        );
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        return reply.send({
          success: true,
          data: await BugReportService.detail(fastify, id),
          message: 'Đã yêu cầu sửa lại. Agent lập plan mới; code/test cần Danny duyệt mới.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Request implementation changes failed');
      }
    }
  );

  fastify.post(
    '/bug-reports/:id/plan-request-changes',
    { preHandler: [requireAuth, requireDanny] },
    async (request, reply) => {
      try {
        const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
        await InboxImplementationService.requestPlanChanges(
          fastify,
          id,
          request.user.id,
          request.body as RequestBugReportPlanChangesRequest
        );
        RequestClassifierWorkerHub.notify('inbox_follow_up_available');
        return reply.send({
          success: true,
          data: await BugReportService.detail(fastify, id),
          message: 'Đã yêu cầu Agent sửa lại plan. Chưa duyệt code/test.',
        });
      } catch (error) {
        return sendError(fastify, reply, error, 'Request plan changes failed');
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
}
