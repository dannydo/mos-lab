import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { TelesalePipelineStageKey, TelesaleTargetConfigDto } from '@mos-lab/shared';
import { TelesaleTargetService } from '../services/telesale-target.service.js';

export async function registerTelesaleTargetRoutes(fastify: FastifyInstance) {
  // 1. Get Overview Metrics
  fastify.get('/kpi/telesale-target', { preHandler: [requireAuth] }, async (request, reply) => {
    const { month } = request.query as { month?: string };
    const user = (request as any).user;
    const currentStaffId = user?.staffId || user?.id;

    try {
      const data = await TelesaleTargetService.getOverview(fastify, month || '2026-10', currentStaffId);
      return reply.send(data);
    } catch (err: any) {
      fastify.log.error(`Failed to get telesale target overview: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 2. Save Target Config (Manager/Admin)
  fastify.post('/kpi/telesale-target/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as TelesaleTargetConfigDto;

    try {
      if (!body.month || !body.teamDoneTarget || !body.stageTargets) {
        return reply.status(400).send({ error: 'Thiếu thông tin cấu hình bắt buộc' });
      }

      const saved = await TelesaleTargetService.saveConfig(fastify, body);
      return reply.send({ success: true, config: saved });
    } catch (err: any) {
      fastify.log.error(`Failed to save telesale target config: ${err.message}`);
      return reply.status(400).send({ error: err.message });
    }
  });

  // 3. Get Customer Pool for Stage
  fastify.get('/kpi/telesale-target/pool', { preHandler: [requireAuth] }, async (request, reply) => {
    const { stage, bookerId, limit, offset } = request.query as {
      stage?: TelesalePipelineStageKey;
      bookerId?: string;
      limit?: string;
      offset?: string;
    };

    if (!stage || !['0_30', '31_60', '61_120', 'gt_120'].includes(stage)) {
      return reply.status(400).send({ error: 'Stage không hợp lệ' });
    }

    const parsedBookerId = bookerId && bookerId !== 'ALL' ? parseInt(bookerId, 10) : undefined;
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    try {
      const pool = await TelesaleTargetService.getCustomerPool(
        fastify,
        stage,
        parsedBookerId,
        parsedLimit,
        parsedOffset
      );
      return reply.send(pool);
    } catch (err: any) {
      fastify.log.error(`Failed to get customer pool: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });
}
