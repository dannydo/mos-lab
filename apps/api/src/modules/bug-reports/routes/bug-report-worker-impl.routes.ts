import type { FastifyInstance } from 'fastify';
import {
  classifyAgNodeFromProvisionerId,
  type RecordInboxImplementationQualityGateSelfCheckRequest,
  type RenewInboxImplementationLeaseRequest,
} from '@mos-lab/shared';
import { InboxImplementationError, InboxImplementationService } from '../inbox-implementation.service.js';
import { InboxPlanService } from '../inbox-plan.service.js';
import { InboxWorkerStatusService } from '../inbox-worker-status.service.js';
import { RequestClassificationService } from '../request-classification.service.js';
import { RequestClassifierWorkerHub } from '../request-classifier-worker-hub.js';
import { requireClassifierWorker, sendError } from './bug-report-route-guards.js';

export function registerBugReportWorkerImplRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/request-classifier/inbox-plans/claim',
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
        return reply
          .code(410)
          .send({ error: 'IDE_EXECUTION_REQUIRED', message: 'Implementation chỉ được thực hiện trong Codex IDE.' });
      } catch (error) {
        return sendError(fastify, reply, error, 'Inbox implementation claim failed');
      }
    }
  );

  fastify.get(
    '/request-classifier/inbox-implementations/quality-gate-recovery-self-checks',
    { preHandler: [requireClassifierWorker] },
    async (_request, reply) => {
      try {
        return reply.send({ data: await InboxImplementationService.qualityGateRecoverySelfCheckCandidates(fastify) });
      } catch (error) {
        return sendError(fastify, reply, error, 'List quality-gate recovery self-checks failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/quality-gate-recovery-self-check',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const recorded = await InboxImplementationService.recordQualityGateRecoverySelfCheck(
          fastify,
          String((request.params as { id: string }).id || ''),
          request.body as RecordInboxImplementationQualityGateSelfCheckRequest
        );
        return reply.send({ success: true, data: { recorded } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record quality-gate recovery self-check failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/start',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; worktreePath?: string; processId?: number };
        const started = await InboxImplementationService.start(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          String(request.headers['x-worker-id'] || ''),
          body?.worktreePath,
          body?.processId
        );
        return reply.send({ success: true, data: { started } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Start inbox implementation failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/renew',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as Partial<RenewInboxImplementationLeaseRequest>;
        const workerId = String(request.headers['x-worker-id'] || '');
        if (String(body?.workerId || '') !== workerId) {
          throw new InboxImplementationError('Worker renewal identity không khớp.', 409, 'LEASE_RENEW_REJECTED');
        }
        const renewed = await InboxImplementationService.renew(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          workerId,
          body?.processId
        );
        return reply.send({ success: true, data: { renewed } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Renew inbox implementation lease failed');
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
          baseCommit?: unknown;
          patchHash?: unknown;
        };
        await InboxImplementationService.complete(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.result,
          {
            changedFiles: body?.changedFiles,
            diffStat: body?.diffStat,
            baseCommit: body?.baseCommit,
            patchHash: body?.patchHash,
          }
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete inbox implementation failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/commit-complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; commitSha?: string };
        await InboxImplementationService.completeCommit(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.commitSha
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete inbox implementation commit failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/deploy-complete',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string };
        await InboxImplementationService.completeDeployment(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || '')
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Complete inbox implementation deploy failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/progress',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as {
          leaseToken?: string;
          workerId?: string;
          processId?: number;
          phase?: string;
          hasEvidence?: boolean;
        };
        const workerId = String(request.headers['x-worker-id'] || '');
        if (String(body?.workerId || '') !== workerId) {
          throw new InboxImplementationError('Worker progress identity không khớp.', 409, 'LEASE_RENEW_REJECTED');
        }
        const progressed = await InboxImplementationService.progress(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          workerId,
          body?.processId,
          body?.phase,
          body?.hasEvidence
        );
        return reply.send({ success: true, data: { progressed } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Record inbox implementation progress failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/continue',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as {
          leaseToken?: string;
          workerId?: string;
          worktreePath?: string;
          processId?: number;
        };
        const workerId = String(request.headers['x-worker-id'] || '');
        if (String(body?.workerId || '') !== workerId) {
          throw new InboxImplementationError('Worker checkpoint identity không khớp.', 409, 'CHECKPOINT_REJECTED');
        }
        const continued = await InboxImplementationService.continueAfterCheckpoint(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          workerId,
          body?.worktreePath,
          body?.processId
        );
        return reply.send({ success: true, data: { continued } });
      } catch (error) {
        return sendError(fastify, reply, error, 'Continue inbox implementation checkpoint failed');
      }
    }
  );

  fastify.post(
    '/request-classifier/inbox-implementations/:id/fail',
    { preHandler: [requireClassifierWorker] },
    async (request, reply) => {
      try {
        const body = request.body as { leaseToken?: string; code?: string; failureSummary?: string };
        await InboxImplementationService.fail(
          fastify,
          String((request.params as { id: string }).id || ''),
          String(body?.leaseToken || ''),
          body?.code,
          body?.failureSummary
        );
        return reply.send({ success: true });
      } catch (error) {
        return sendError(fastify, reply, error, 'Fail inbox implementation failed');
      }
    }
  );
}
