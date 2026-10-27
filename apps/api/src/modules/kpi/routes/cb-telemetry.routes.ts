import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CbLiveTelemetryService } from '../services/cb-live-telemetry.service.js';
import { CbTargetConfig, CbTelemetryQueryParams } from '@mos-lab/shared';

export async function registerCbTelemetryRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: CbTelemetryQueryParams }>(
    '/kpi/cb-live-telemetry',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const data = await CbLiveTelemetryService.getTelemetry(fastify, request.query);
      return reply.send({ success: true, data });
    }
  );

  fastify.post<{ Body: Partial<CbTargetConfig> & { month: string; storeScope?: string } }>(
    '/kpi/cb-live-telemetry/target-config',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = (request as unknown as { user?: { name?: string; username?: string } }).user;
      const staffName = user?.name || user?.username || 'Admin';
      const updated = await CbLiveTelemetryService.saveTargetConfig(fastify, {
        ...request.body,
        userStaffName: staffName,
      });
      return reply.send({ success: true, data: updated });
    }
  );

  fastify.get<{
    Querystring: {
      category: 'COMBO' | 'PRODUCT' | 'GREEN_FUNNEL' | 'PACKAGE_USAGE';
      month?: string;
      storeScope?: string;
      limit?: string;
    };
  }>('/kpi/cb-live-telemetry/drilldown', { preHandler: [requireAuth] }, async (request, reply) => {
    const category = request.query.category || 'COMBO';
    const month = request.query.month || '2026-11';
    const storeScope = request.query.storeScope;
    const limit = request.query.limit ? Number(request.query.limit) : 50;

    const data = await CbLiveTelemetryService.getDrilldown(fastify, {
      category,
      month,
      storeScope,
      limit,
    });
    return reply.send({ success: true, data });
  });
}
