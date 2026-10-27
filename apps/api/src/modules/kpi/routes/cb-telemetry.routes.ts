import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CbTelemetryQueryParams } from '@mos-lab/shared';
import { CbLiveTelemetryService } from '../services/cb-live-telemetry.service.js';

export async function registerCbTelemetryRoutes(fastify: FastifyInstance) {
  fastify.get('/kpi/cb-live-telemetry', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as CbTelemetryQueryParams;
      const telemetry = await CbLiveTelemetryService.getTelemetry(fastify, query);
      return {
        success: true,
        data: telemetry,
      };
    } catch (err) {
      fastify.log.error(err as Error, 'Get CB live telemetry error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy dữ liệu live telemetry của Dashboard $CB.',
      });
    }
  });
}
