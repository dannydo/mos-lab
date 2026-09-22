import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  FrontendIssueClusterKey,
  FrontendIssueListQuery,
  FrontendIssuePayload,
  UpdateFrontendIssueStatusRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../middlewares/auth.js';
import { FrontendTelemetryService } from './telemetry.service.js';

export async function frontendTelemetryRoutes(fastify: FastifyInstance) {
  // Ingest frontend issues (allows unauthenticated beacon from browser)
  fastify.post(
    '/telemetry/frontend-issues',
    {
      schema: {
        description: 'Ingest frontend user issue and interaction telemetry',
        tags: ['Telemetry'],
      },
    },
    async (request: FastifyRequest<{ Body: FrontendIssuePayload }>, reply: FastifyReply) => {
      const payload = request.body;

      if (!payload || !payload.issueType) {
        return reply.status(400).send({ error: 'Invalid telemetry payload' });
      }

      fastify.log.warn(
        {
          issueType: payload.issueType,
          path: payload.path,
          userId: payload.userId,
          breadcrumbsCount: payload.breadcrumbs?.length || 0,
          error: payload.error?.message || payload.error?.name,
        },
        `[FrontendIssue] ${payload.issueType} on ${payload.path}`
      );

      const result = await FrontendTelemetryService.recordIssue(payload, fastify);
      return reply.status(200).send(result);
    }
  );

  // List frontend issues with database filtering & metrics
  fastify.get(
    '/telemetry/frontend-issues',
    {
      schema: {
        description: 'Get paginated frontend issues with tracking status and metrics',
        tags: ['Telemetry'],
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: FrontendIssueListQuery;
      }>,
      reply: FastifyReply
    ) => {
      const result = await FrontendTelemetryService.list(fastify, request.query);
      return reply.status(200).send(result);
    }
  );

  // Get metrics summary directly
  fastify.get(
    '/telemetry/frontend-issues/metrics',
    {
      schema: {
        description: 'Get KPI metrics for frontend issues resolution',
        tags: ['Telemetry'],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = await FrontendTelemetryService.getMetrics(fastify);
      return reply.status(200).send({ data: metrics });
    }
  );

  // Update issue tracking status (requires auth)
  fastify.patch(
    '/telemetry/frontend-issues/:id/status',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Update the resolution status and notes of a frontend issue',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        return reply.status(400).send({ error: 'ID sự cố không hợp lệ' });
      }

      const { status, resolutionNotes } = (request.body as UpdateFrontendIssueStatusRequest) || {};
      if (!status) {
        return reply.status(400).send({ error: 'Trạng thái là bắt buộc' });
      }

      try {
        const result = await FrontendTelemetryService.updateStatus(
          fastify,
          parsedId,
          status,
          resolutionNotes,
          request.user?.id
        );
        return reply.status(200).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể cập nhật trạng thái sự cố',
        });
      }
    }
  );

  // Convert a frontend issue to an official Bug Report
  fastify.post(
    '/telemetry/frontend-issues/:id/convert-bug-report',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Convert a frontend issue into an official bug report',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        return reply.status(400).send({ error: 'ID sự cố không hợp lệ' });
      }

      try {
        const result = await FrontendTelemetryService.convertToBugReport(fastify, parsedId, request.user.id);
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể chuyển thành Bug Report',
        });
      }
    }
  );

  // Auto-analyze issue with AG AI
  fastify.post(
    '/telemetry/frontend-issues/:id/ag-analyze',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Auto-analyze a frontend telemetry issue using AG engine',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        return reply.status(400).send({ error: 'ID sự cố không hợp lệ' });
      }

      try {
        const result = await FrontendTelemetryService.agAnalyze(fastify, parsedId);
        return reply.status(200).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể phân tích sự cố bằng AG',
        });
      }
    }
  );

  // Approve and dispatch issue to AG via mOS Inbox workflow
  fastify.post(
    '/telemetry/frontend-issues/:id/ag-dispatch',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Approve and dispatch frontend issue to Antigravity via mOS Inbox',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        return reply.status(400).send({ error: 'ID sự cố không hợp lệ' });
      }

      try {
        const result = await FrontendTelemetryService.agDispatch(fastify, parsedId, request.user.id);
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể duyệt và giao cho AG xử lý',
        });
      }
    }
  );

  // Get clustered telemetry issues
  fastify.get(
    '/telemetry/frontend-issues/clusters',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Get telemetry issues grouped into smart root-cause clusters',
        tags: ['Telemetry'],
      },
    },
    async (_request, reply) => {
      try {
        const result = await FrontendTelemetryService.getClusters(fastify);
        return reply.status(200).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể lấy danh sách cụm sự cố',
        });
      }
    }
  );

  // Approve and dispatch entire cluster to AG (creates 1 ticket)
  fastify.post(
    '/telemetry/frontend-issues/clusters/:clusterKey/dispatch',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Approve and dispatch entire issue cluster to Antigravity as 1 ticket',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      const { clusterKey } = request.params as { clusterKey: string };
      if (!clusterKey) {
        return reply.status(400).send({ error: 'Mã cụm sự cố không hợp lệ' });
      }

      try {
        const result = await FrontendTelemetryService.dispatchCluster(
          fastify,
          clusterKey as FrontendIssueClusterKey,
          request.user.id
        );
        return reply.status(201).send({ data: result });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể phê duyệt cụm sự cố cho AG',
        });
      }
    }
  );

  // Batch dispatch priority clusters (P0/P1) in one click
  fastify.post(
    '/telemetry/frontend-issues/clusters/batch-dispatch-priority',
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Batch dispatch all high-priority clusters to Antigravity',
        tags: ['Telemetry'],
      },
    },
    async (request, reply) => {
      try {
        const results = await FrontendTelemetryService.batchDispatchPriorityClusters(fastify, request.user.id);
        return reply.status(201).send({ data: results });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        return reply.status(error.statusCode || 500).send({
          error: error.message || 'Không thể phê duyệt hàng loạt các cụm trọng tâm',
        });
      }
    }
  );
}
