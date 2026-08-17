import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BookingAuditService } from '../services/booking-audit.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';

import { BookingAuditLogFilter, SafeAny } from '@mos-lab/shared';

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
      const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id FROM \`order\` WHERE id = ? LIMIT 1`,
        orderId
      );
      const legacyUserId = Number(orderRows[0]?.user_id);
      if (!legacyUserId) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }
      if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, request.user, legacyUserId))) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình.',
        });
      }

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

    if (CustomerAccessService.isTelesales(request.user)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Telesales không có quyền xem báo cáo lịch hẹn của toàn hệ thống.',
      });
    }

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
