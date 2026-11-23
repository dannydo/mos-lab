import { FastifyInstance } from 'fastify';
import { SafeAny, UpdateBookingRequest } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { BookingAuditService } from '../../services/booking-audit.service.js';
import { BookingPromotionError } from '../../services/booking-promotion.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { BookingSaleClassificationService } from '../../services/booking-sale-classification.service.js';
import {
  BookingUpdateValidationError,
  buildLegacyBookingWindow,
  resolveBookingUpdateFields,
  resolveFinalOrderState,
} from '../../services/booking-update.service.js';
import { CustomerCreationService } from '../../services/customer-creation.service.js';
import { UserServiceTypeService } from '../../services/user-service-type.service.js';
import {
  buildUpdatedBookingNote,
  determineBookingActionType,
  persistBookingUpdateTransaction,
  resolveUpdatePromotionState,
  resolveUpdateServiceState,
} from './booking-update.helper.js';

export async function registerBookingUpdateRoutes(fastify: FastifyInstance) {
  // PUT /api/customers/booking/:id
  // Partially update an existing booking; omitted branch/date/time fields are preserved.
  fastify.put('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };

    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ' });
    }

    const updateInput = (request.body || {}) as UpdateBookingRequest;
    const { serviceId, promotionId, campaignPromotionId } = updateInput;

    try {
      const actorLegacyStaffId = await CustomerCreationService.resolveLegacyStaffId(fastify, user);

      // 1. Fetch current order details before updating
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, user_id, created_staff_id, client_store_id, assigned_staff_id, booking_date_start, booking_note, booking_duration_minute, total_price, order_state,
                promotion_id, selected_promotion_id, campaign_id
         FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const finalCustomerId = Number(order.user_id);
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

      const permission = await BookingReschedulePermissionService.evaluate(fastify, user, finalCustomerId);
      if (!permission.allowed) {
        return reply.status(403).send({ error: 'Forbidden', message: permission.message });
      }

      const resolvedUpdate = resolveBookingUpdateFields(
        {
          storeId: Number(order.client_store_id),
          technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
          bookingDateStart: new Date(order.booking_date_start ?? Number.NaN),
          bookingNote: order.booking_note || null,
        },
        updateInput
      );
      const finalStoreId = resolvedUpdate.storeId;
      const finalTechnicianId = resolvedUpdate.technicianId;
      const currentOrderState = String(order.order_state || 'New');

      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
        promotionId: order.selected_promotion_id ? Number(order.selected_promotion_id) : null,
        campaignId: order.campaign_id ? Number(order.campaign_id) : null,
        orderState: currentOrderState,
      };

      const { reasonCategory, reasonNote } = (request.body || {}) as {
        reasonCategory?: string | null;
        reasonNote?: string | null;
      };

      // 2. Resolve the base service and promotion from one authoritative service.
      // This is required when a promotion changes: order.total_price may already be discounted.
      const { existingService, finalServiceId, srvPrice, srvDuration, serviceGroup } = await resolveUpdateServiceState(
        fastify,
        {
          orderId,
          orderTotalPrice: order.total_price,
          orderDurationMinutes: order.booking_duration_minute,
          requestedServiceIdRaw: serviceId,
        }
      );

      const { currentCustomCampaign, promotionResolution } = await resolveUpdatePromotionState(fastify, {
        requestBody: (request.body || {}) as object,
        order,
        existingService,
        finalCustomerId,
        finalServiceId,
        srvPrice,
        bookingDate: resolvedUpdate.bookingDate,
        promotionId,
        campaignPromotionId,
      });

      const duration = srvDuration;
      const totalPrice = promotionResolution.finalPrice;
      const finalBookingNote = buildUpdatedBookingNote(
        resolvedUpdate.bookingNote,
        currentCustomCampaign?.tag,
        promotionResolution.campaignPromotionTag
      );

      // 3. Calculate the legacy wall-clock window without applying the server timezone.
      const { bookingDateStart: mysqlStart, bookingDateEnd: mysqlEnd } = buildLegacyBookingWindow(
        resolvedUpdate.bookingDate,
        resolvedUpdate.bookingTime,
        duration
      );

      const newData = {
        bookingDateStart: mysqlStart,
        storeId: finalStoreId,
        technicianId: finalTechnicianId,
        bookingNote: finalBookingNote || null,
        promotionId: promotionResolution.legacyPromotionId,
        campaignPromotionId: promotionResolution.campaignPromotionId,
        totalPrice,
      };

      const actionType = determineBookingActionType({
        oldStartStr: resolvedUpdate.currentBookingDateStart,
        mysqlStart,
        oldTechnicianId: order.assigned_staff_id,
        finalTechnicianId,
        oldStoreId: order.client_store_id,
        finalStoreId,
      });

      // State Machine Guard Invariant (MOS-BUG-144):
      // An order that has already been received at the salon, is in service, is in checkout,
      // or has reached a terminal state must NEVER be degraded back to 'New'.
      // Only initial pre-service appointments ('New', 'Confirmed') can be reset to 'New' upon rescheduling.
      const finalOrderState = resolveFinalOrderState(currentOrderState, resolvedUpdate.isLockedScheduleUpdateRequested);

      const auditNewData = {
        ...newData,
        orderState: finalOrderState,
      };

      const didTechnicianChange = Number(order.assigned_staff_id || 0) !== Number(finalTechnicianId || 0);
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart,
        serviceGroup
      );

      const { isNew, comboSaleRequired } = await BookingSaleClassificationService.determineBookingSaleClassification(
        fastify,
        finalCustomerId,
        mysqlStart,
        serviceGroup
      );

      await persistBookingUpdateTransaction({
        fastify,
        orderId,
        actorLegacyStaffId,
        mysqlStart,
        mysqlEnd,
        finalTechnicianId,
        finalStoreId,
        finalBookingNote,
        duration,
        totalPrice,
        legacyPromotionId: promotionResolution.legacyPromotionId,
        legacyCampaignId: promotionResolution.legacyCampaignId,
        discountAmount: promotionResolution.discountAmount,
        finalOrderState,
        comboSaleRequired,
        isNew,
        isLockedScheduleUpdateRequested: resolvedUpdate.isLockedScheduleUpdateRequested,
        didTechnicianChange,
        existingService,
        finalServiceId,
        serviceGroup,
        srvPrice,
        userServiceType,
      });

      // 6. Audit Log Recording
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType,
        actorStaffId: actorLegacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData: auditNewData,
        ipAddress: request.ip,
      });

      return reply.send({ success: true, orderId });
    } catch (err: SafeAny) {
      if (err instanceof BookingPromotionError || err instanceof BookingUpdateValidationError) {
        return reply.status(400).send({ error: 'Bad Request', message: err.message });
      }
      fastify.log.error(err, 'Reschedule booking error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể dời lịch hẹn.' });
    }
  });
}
