import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BookingAuditService } from '../services/booking-audit.service.js';

import { BookingAuditLogFilter } from '@mos-lab/shared';

export async function bookingAuditRoutes(fastify: FastifyInstance) {
  // GET /api/customers/booking/:id/logs
  // Get history logs for a specific order
  fastify.get('/customers/booking/:id/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid order ID' });
    }

    try {
      const logs = await BookingAuditService.getLogsForOrder(fastify, orderId);
      return reply.send({ success: true, logs });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get booking audit logs error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: err.message || 'Failed to fetch booking logs' });
    }
  });

  // GET /api/kpi/booking-audit-logs
  // Manager report endpoint for listing and filtering audit logs
  fastify.get('/kpi/booking-audit-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const filter = request.query as BookingAuditLogFilter;

    try {
      const result = await BookingAuditService.getAuditLogReport(fastify, filter);
      return reply.send(result);
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get booking audit report error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: err.message || 'Failed to fetch booking audit report' });
    }
  });
}
