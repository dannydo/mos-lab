import type { FastifyInstance } from 'fastify';
import {
  classifyAgNodeFromProvisionerId,
  formatBugReportKey,
  type BindInboxIdeTaskRequest,
  type CompleteInboxIdeTaskProvisioningRequest,
  type DeferInboxIdeTaskProvisioningRequest,
  type InboxIdeReleaseCheckpointMetadata,
  type RecordInboxIdeCommitReceiptRequest,
  type RecordInboxIdeTaskReceiptRequest,
} from '@mos-lab/shared';
import { InboxIdeReleaseService } from '../inbox-ide-release.service.js';
import { InboxImplementationError, InboxImplementationService } from '../inbox-implementation.service.js';
import { InboxWorkerStatusService } from '../inbox-worker-status.service.js';
import {
  numericParam,
  requireIdeReleasePublisher,
  requireIdeTaskBridge,
  sendError,
} from './bug-report-route-guards.js';

export function registerBugReportIdeBridgeRoutes(fastify: FastifyInstance) {
  fastify.get('/ide-task-bridge/provisioning/next', { preHandler: [requireIdeTaskBridge] }, async (request, reply) => {
    try {
      const engine = (request.headers['x-execution-engine'] || (request.query as { engine?: string })?.engine || '')
        .toString()
        .toUpperCase();
      const provisionerId = String(
        request.headers['x-ide-provisioner-id'] || request.headers['x-ag-provisioner-id'] || ''
      );
      if (engine === 'AG') {
        InboxWorkerStatusService.recordHeartbeat('AG', provisionerId, fastify);
      } else {
        InboxWorkerStatusService.recordHeartbeat('IDE', provisionerId, fastify);
      }
      const requestData =
        engine === 'AG'
          ? await InboxImplementationService.claimAgTaskProvisioning(
              fastify,
              request.headers['x-ide-provisioner-id'] || request.headers['x-ag-provisioner-id']
            )
          : await InboxImplementationService.claimIdeTaskProvisioning(fastify, request.headers['x-ide-provisioner-id']);
      return reply.send({ success: true, data: requestData });
    } catch (error) {
      return sendError(fastify, reply, error, 'Claim IDE task provisioning failed');
    }
  });

  fastify.get('/ag-task-bridge/provisioning/next', { preHandler: [requireIdeTaskBridge] }, async (request, reply) => {
    try {
      const provisionerId = String(
        request.headers['x-ag-provisioner-id'] || request.headers['x-ide-provisioner-id'] || ''
      );
      InboxWorkerStatusService.recordHeartbeat('AG', provisionerId, fastify);
      const requestData = await InboxImplementationService.claimAgTaskProvisioning(
        fastify,
        request.headers['x-ide-provisioner-id'] || request.headers['x-ag-provisioner-id']
      );
      return reply.send({ success: true, data: requestData });
    } catch (error) {
      return sendError(fastify, reply, error, 'Claim AG task provisioning failed');
    }
  });

  fastify.get('/ag-task-bridge/deploy/next', { preHandler: [requireIdeTaskBridge] }, async (request, reply) => {
    try {
      const provisionerId = String(
        request.headers['x-ag-provisioner-id'] || request.headers['x-ide-provisioner-id'] || ''
      );
      InboxWorkerStatusService.recordHeartbeat('AG', provisionerId, fastify);
      const callerNode = classifyAgNodeFromProvisionerId(provisionerId);
      const jobs = await fastify.prisma.crm.crmInboxImplementationJob.findMany({
        where: {
          status: 'AWAITING_DEPLOY_REVIEW',
          executionPhase: 'DEPLOY_APPROVED',
          commitSha: { not: null },
        },
        include: {
          report: { select: { id: true, requestType: true, title: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
      });
      let job: (typeof jobs)[number] | null = null;
      for (const candidate of jobs) {
        const ownerNode: 'AG_WIN' | 'AG_MAC' = candidate.executionOwner === 'AG_WIN' ? 'AG_WIN' : 'AG_MAC';
        if (ownerNode === callerNode || !(await InboxWorkerStatusService.isNodeOnline(fastify, ownerNode))) {
          job = candidate;
          break;
        }
      }
      if (!job || !job.commitSha) {
        return reply.send({ success: true, data: null });
      }
      return reply.send({
        success: true,
        data: {
          jobId: job.id,
          reportId: job.reportId,
          ticketKey: formatBugReportKey(job.reportId, job.report?.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'),
          title: job.report?.title || '',
          commitSha: job.commitSha,
          branchName: job.branchName,
        },
      });
    } catch (error) {
      return sendError(fastify, reply, error, 'Get next auto-deploy job failed');
    }
  });

  fastify.get(
    '/ag-task-bridge/reports/:reportId/release-preview',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const reportId = numericParam((request.params as { reportId: string }).reportId, 'Report ID');
        const preview = await InboxIdeReleaseService.preview(fastify, reportId);
        return reply.send({ success: true, data: { ...preview, reportId } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Preview AG report release failed');
      }
    }
  );

  fastify.post(
    '/ide-task-bridge/provisioning/:jobId/complete',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const body = request.body as CompleteInboxIdeTaskProvisioningRequest;
        const result = await InboxImplementationService.completeIdeTaskProvisioning(
          fastify,
          (request.params as { jobId: string }).jobId,
          body?.requestId,
          body?.taskId
        );
        return reply.send({ success: true, data: result });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete IDE task provisioning failed');
      }
    }
  );

  fastify.post(
    '/ide-task-bridge/provisioning/:jobId/defer',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const body = request.body as DeferInboxIdeTaskProvisioningRequest;
        const outcome = await InboxImplementationService.deferIdeTaskProvisioning(
          fastify,
          (request.params as { jobId: string }).jobId,
          body?.requestId,
          body?.failureCode
        );
        return reply.send({ success: true, data: { outcome } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Defer IDE task provisioning failed');
      }
    }
  );

  fastify.post('/ide-task-bridge/:id/bind', { preHandler: [requireIdeTaskBridge] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      const result = await InboxImplementationService.bindIdeTask(
        fastify,
        id,
        (request.body as BindInboxIdeTaskRequest)?.taskId
      );
      return reply.send({ success: true, data: result });
    } catch (error) {
      return sendError(fastify, reply, error, 'Bind IDE task failed');
    }
  });

  fastify.get(
    '/ide-task-bridge/tasks/:taskId/handoff',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const handoff = await InboxImplementationService.receiveIdeTaskHandoff(
          fastify,
          (request.params as { taskId: string }).taskId
        );
        return reply.send({ success: true, data: handoff });
      } catch (error) {
        return sendError(fastify, reply, error, 'Receive IDE task handoff failed');
      }
    }
  );

  fastify.get(
    '/ide-task-bridge/tasks/:taskId/release-preview',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const taskId = (request.params as { taskId: string }).taskId;
        const job = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
          where: {
            OR: [{ ideTaskId: taskId }, { id: taskId }],
          },
        });
        if (!job)
          throw new InboxImplementationError(
            'IDE task không có handoff đang hiệu lực.',
            409,
            'IDE_TASK_HANDOFF_UNAVAILABLE'
          );
        const preview = await InboxIdeReleaseService.preview(fastify, job.reportId);
        return reply.send({ success: true, data: { ...preview, reportId: job.reportId } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Preview IDE task release failed');
      }
    }
  );

  fastify.post(
    '/ide-task-bridge/tasks/:taskId/receipt',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const outcome = await InboxImplementationService.recordIdeTaskReceipt(
          fastify,
          (request.params as { taskId: string }).taskId,
          (request.body as RecordInboxIdeTaskReceiptRequest)?.receipt
        );
        return reply.send({ success: true, data: { outcome } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record IDE task receipt failed');
      }
    }
  );

  fastify.post(
    '/ide-task-bridge/tasks/:taskId/commit-receipt',
    { preHandler: [requireIdeTaskBridge] },
    async (request, reply) => {
      try {
        const outcome = await InboxImplementationService.recordIdeTaskCommitReceipt(
          fastify,
          (request.params as { taskId: string }).taskId,
          (request.body as { receipt?: RecordInboxIdeCommitReceiptRequest })
            ?.receipt as RecordInboxIdeCommitReceiptRequest
        );
        return reply.send({ success: true, data: { outcome } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record IDE task commit receipt failed');
      }
    }
  );

  fastify.post('/ide-release-checkpoints/:id', { preHandler: [requireIdeReleasePublisher] }, async (request, reply) => {
    try {
      const id = numericParam((request.params as { id: string }).id, 'Ticket ID');
      await InboxIdeReleaseService.recordOfficialCheckpoint(
        fastify,
        id,
        request.body as InboxIdeReleaseCheckpointMetadata
      );
      return reply.send({ success: true, data: { recorded: true } });
    } catch (error) {
      return sendError(fastify, reply, error, 'Record IDE release checkpoint failed');
    }
  });
}
