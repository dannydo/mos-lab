import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { BookingAuditService } from '../../services/booking-audit.service.js';
import { BookingPromotionService } from '../../services/booking-promotion.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { CustomerCreationService } from '../../services/customer-creation.service.js';
import { createRouteHelpers } from '../helpers.js';

const BOOKING_LIFECYCLE_ALLOWED_ROLES = ['telesales', 'booker', 'manager', 'control', 'cs', 'oc'];

export async function registerBookingLifecycleRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerMutateAccess } = createRouteHelpers(fastify);

  // GET /api/customers/booking/:id/promotions
  // A custom-campaign booking is deliberately scoped to the promotion list of its originating campaign.
  fastify.get('/customers/booking/:id/promotions', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number };
    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(fastify, user);
    const role = String(user.role || '').toLowerCase();
    if (
      !canRescheduleAnyCustomer &&
      !isAdminOrSuperAdminRole(role) &&
      !BOOKING_LIFECYCLE_ALLOWED_ROLES.includes(role)
    ) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xem ưu đãi của lịch hẹn này.' });
    }

    const orderId = Number((request.params as { id: string }).id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ.' });
    }

    try {
      const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, promotion_id, selected_promotion_id,
                DATE_FORMAT(booking_date_start, '%Y-%m-%d') as bookingDate
         FROM \`order\` WHERE id = ? LIMIT 1`,
        orderId
      );
      const order = orders[0];
      if (!order)
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });

      const customerId = Number(order.user_id);
      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerMutateAccess(request, reply, customerId))) return;

      const currentPromotionId = Number(order.selected_promotion_id || order.promotion_id || 0) || null;
      return reply.send(
        await BookingPromotionService.getAvailableOptions(fastify, {
          customerId,
          currentPromotionId,
          bookingDate: order.bookingDate || null,
        })
      );
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get booking promotion options error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tải danh sách khuyến mãi cho lịch hẹn.',
      });
    }
  });

  // GET /api/customers/booking/:id/reschedule-eligibility
  // Check whether the authenticated user has permission to reschedule this booking.
  fastify.get(
    '/customers/booking/:id/reschedule-eligibility',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { role: string; id: number };
      const orderId = Number((request.params as { id: string }).id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ.' });
      }

      try {
        const orders = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ user_id: number | string }>>(
          'SELECT user_id FROM `order` WHERE id = ? LIMIT 1',
          orderId
        );
        const order = orders[0];
        if (!order) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
        }

        return reply.send(await BookingReschedulePermissionService.evaluate(fastify, user, Number(order.user_id)));
      } catch (err: SafeAny) {
        fastify.log.error(err, 'Check booking reschedule eligibility error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể kiểm tra quyền dời lịch. Vui lòng thử lại.',
        });
      }
    }
  );

  // DELETE /api/customers/booking/:id
  // Cancel a booking (soft delete by setting order_state = 'Cancelled')
  fastify.delete('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(fastify, user);
    const role = String(user.role || '').toLowerCase();
    if (
      !canRescheduleAnyCustomer &&
      !isAdminOrSuperAdminRole(role) &&
      !BOOKING_LIFECYCLE_ALLOWED_ROLES.includes(role)
    ) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ' });
    }

    const { reasonCategory, reasonNote } = (request.body || {}) as {
      reasonCategory?: string | null;
      reasonNote?: string | null;
    };

    try {
      const actorLegacyStaffId = await CustomerCreationService.resolveLegacyStaffId(fastify, user);

      // 1. Fetch the order details first to verify existence & original creator
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, user_id, created_staff_id, booking_date_start, client_store_id, assigned_staff_id, booking_note FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const finalCustomerId = Number(order.user_id);
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerMutateAccess(request, reply, finalCustomerId)))
        return;

      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
      };

      // 2. Perform soft delete / update status to 'Cancelled'
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET order_state = 'Cancelled', 
             date_updated = NOW() 
         WHERE id = ?`,
        orderId
      );

      // 3. Audit Log Recording
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType: 'CANCEL',
        actorStaffId: actorLegacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData: { orderState: 'Cancelled' },
        ipAddress: request.ip,
      });

      const isCrossAction = Boolean(originalStaffId && actorLegacyStaffId !== originalStaffId);

      return reply.send({ success: true, orderId, isCrossAction });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Cancel booking error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể hủy lịch hẹn.' });
    }
  });
}
