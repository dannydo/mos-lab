import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { BookingPromotionError, BookingPromotionService } from '../../services/booking-promotion.service.js';
import { CustomerCreationError, CustomerCreationService } from '../../services/customer-creation.service.js';
import { createRouteHelpers } from '../helpers.js';
import {
  autoAssignBookingCustomerIfUnowned,
  BookingAuthUser,
  buildCreateBookingNote,
  computeCreateBookingWindow,
  CreateBookingBody,
  fetchBookerProfileName,
  parseExplicitForeignStatus,
  parseNumericCustomerId,
  persistNewLegacyBooking,
  recordCampaignBookingActivity,
  resolveCreateServiceInfo,
} from './booking-create.helper.js';

export async function registerBookingCreateRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerMutateAccess } = createRouteHelpers(fastify);

  // POST /api/customers/booking
  // Create a new booking (order and order_service) in the legacy core database
  fastify.post('/customers/booking', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as BookingAuthUser;
    const allowedRoles = ['admin', 'manager', 'control', 'oc', 'cc', 'ls', 'telesales', 'booker'];
    if (!isAdminOrSuperAdminRole(user.role) && !allowedRoles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    const {
      customerId,
      newCustomerName,
      newCustomerPhone,
      storeId,
      storeName: _storeName,
      serviceId,
      serviceName: _serviceName,
      technicianId,
      technicianName: _technicianName,
      bookingDate,
      bookingTime,
      bookingChannel,
      bookingNote,
      promotionId,
      campaignPromotionId,
      referralPhone,
      isForeign,
      is_foreign,
    } = request.body as CreateBookingBody;

    const explicitForeignStatus = parseExplicitForeignStatus(isForeign, is_foreign);

    try {
      const validStaffId = await CustomerCreationService.resolveLegacyStaffId(fastify, user);
      const referrerUserId = await CustomerCreationService.resolveReferrerUserId(fastify, referralPhone);

      let finalCustomerId = parseNumericCustomerId(customerId);
      if (!finalCustomerId) {
        finalCustomerId = await CustomerCreationService.findCustomerIdByPhone(fastify, newCustomerPhone);
      }

      if (finalCustomerId && !(await ensureTelesalesCustomerMutateAccess(request, reply, finalCustomerId))) return;

      // 1. New leads use the same customer-creation service as the standalone
      // flow, keeping referrer attribution and legacy profile records aligned.
      if (!finalCustomerId) {
        const created = await CustomerCreationService.create(fastify, user, {
          name: newCustomerName || 'Khách Hàng Mới',
          phone: newCustomerPhone || '',
          referrerPhone: referralPhone || null,
          // The existing booking flow historically defaults this field to Nữ.
          genderAttributeId: 202,
          storeId: Number(storeId) || 1,
          isForeign: explicitForeignStatus,
        });
        finalCustomerId = created.customer.id;
      } else {
        await CustomerCreationService.attachReferrerIfMissing(fastify, finalCustomerId, user, referrerUserId);
        if (typeof explicitForeignStatus === 'boolean') {
          await CustomerCreationService.setForeignStatus(fastify, finalCustomerId, explicitForeignStatus);
        }
      }

      // 2. Query service price and standard duration
      const { finalServiceId, srvPrice, srvDuration, serviceGroup } = await resolveCreateServiceInfo(
        fastify,
        serviceId
      );

      // 3. Resolve promotions
      const promotionResolution = await BookingPromotionService.resolve(fastify, {
        customerId: finalCustomerId,
        serviceId: finalServiceId,
        basePrice: srvPrice,
        bookingDate: bookingDate || null,
        promotionId: promotionId ? Number(promotionId) : null,
        campaignPromotionId: campaignPromotionId ? Number(campaignPromotionId) : null,
      });
      const campaignPromotionTag = promotionResolution.campaignPromotionTag || '';

      // 4. Calculate booking date start & end
      const { startDate, mysqlStart, mysqlEnd } = computeCreateBookingWindow(bookingDate, bookingTime, srvDuration);

      // 5. Determine booker name and format final booking note to render correctly on legacy client
      await fetchBookerProfileName(fastify, validStaffId, user.displayName);
      const finalBookingNote = buildCreateBookingNote(bookingNote, campaignPromotionTag);

      // 6. Insert order, order_booking_date_change, and order_service
      const orderId = await persistNewLegacyBooking({
        fastify,
        validStaffId,
        storeId,
        finalCustomerId,
        finalServiceId,
        technicianId,
        bookingChannel,
        finalBookingNote,
        srvDuration,
        srvPrice,
        serviceGroup,
        startDate,
        mysqlStart,
        mysqlEnd,
        promotionResolution,
      });

      // 7. Assign customer to the logged-in CRM staff member if not already assigned
      await autoAssignBookingCustomerIfUnowned(fastify, finalCustomerId, user.id);

      // 8. Record campaign touchpoint log and call log if campaignPromotionId was selected
      await recordCampaignBookingActivity(fastify, {
        campaignPromotionId,
        finalCustomerId,
        user,
        campaignPromotionTag,
      });

      return { success: true, orderId, customerId: finalCustomerId };
    } catch (error: unknown) {
      if (error instanceof BookingPromotionError) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      if (error instanceof CustomerCreationError) {
        return reply.status(error.statusCode).send({ error: 'Bad Request', message: error.message });
      }
      const err = error as { message?: string; stack?: string };
      fastify.log.error(error as Error, '[Booking] Failed to create booking:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err?.message || 'Có lỗi xảy ra trong quá trình đặt lịch. Vui lòng thử lại.',
        details: err?.stack || String(error),
      });
    }
  });
}
