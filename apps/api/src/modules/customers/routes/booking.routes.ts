import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { isAdminOrSuperAdminRole, SafeAny, UpdateBookingRequest } from '@mos-lab/shared';
import { BookingPromotionError, BookingPromotionService } from '../services/booking-promotion.service.js';
import {
  BookingUpdateValidationError,
  buildLegacyBookingWindow,
  resolveBookingUpdateFields,
} from '../services/booking-update.service.js';
import { BookingAuditService } from '../services/booking-audit.service.js';
import { CustomerCreationError, CustomerCreationService } from '../services/customer-creation.service.js';
import { UserServiceTypeService } from '../services/user-service-type.service.js';
import { BookingSaleClassificationService } from '../services/booking-sale-classification.service.js';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';
import { BookingReschedulePermissionService } from '../services/booking-reschedule-permission.service.js';
import { createRouteHelpers } from './helpers.js';
import { TeamService } from '../../teams/team.service.js';

export async function registerBookingRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // POST /api/customers/booking
  // Create a new booking (order and order_service) in the legacy core database
  fastify.post('/customers/booking', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
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
    } = request.body as SafeAny;

    const explicitForeignStatus =
      typeof isForeign === 'boolean' ? isForeign : typeof is_foreign === 'boolean' ? is_foreign : undefined;

    try {
      const validStaffId = await CustomerCreationService.resolveLegacyStaffId(fastify, user);
      const referrerUserId = await CustomerCreationService.resolveReferrerUserId(fastify, referralPhone);

      let finalCustomerId: number | null = null;
      if (customerId !== undefined && customerId !== null && customerId !== '') {
        const parsed = Number(String(customerId).replace(/\D/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          finalCustomerId = parsed;
        }
      }

      if (!finalCustomerId) {
        finalCustomerId = await CustomerCreationService.findCustomerIdByPhone(fastify, newCustomerPhone);
      }

      if (finalCustomerId && !(await ensureTelesalesCustomerAccess(request, reply, finalCustomerId))) return;

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
      let finalServiceId = serviceId;
      if (finalServiceId === 0) {
        finalServiceId = 1; // Map to "Any - Lashes 2" to satisfy foreign key constraint
      }

      let srvPrice = 0;
      let srvDuration = 90;
      let serviceGroup = 'LashesTop';
      const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT s.duration_minute_standard as duration,
                sp.service_price as price,
                COALESCE(NULLIF(s.service_group, ''), 'LashesTop') as serviceGroup
         FROM service s
         LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
         WHERE s.id = ? LIMIT 1`,
        finalServiceId
      );
      if (srvInfo.length > 0) {
        srvPrice = Number(srvInfo[0].price || 0);
        srvDuration = Number(srvInfo[0].duration || 90);
        serviceGroup = String(srvInfo[0].serviceGroup || serviceGroup);
      }

      // If virtual service 0 was selected, keep the price 0 and duration 90
      if (serviceId === 0) {
        srvPrice = 0;
        srvDuration = 90;
      }

      const promotionResolution = await BookingPromotionService.resolve(fastify, {
        customerId: finalCustomerId,
        serviceId: finalServiceId,
        basePrice: srvPrice,
        bookingDate: bookingDate || null,
        promotionId: promotionId ? Number(promotionId) : null,
        campaignPromotionId: campaignPromotionId ? Number(campaignPromotionId) : null,
      });
      const selectedPromoId = promotionResolution.legacyPromotionId;
      const campaignId = promotionResolution.legacyCampaignId;
      const discountAmount = promotionResolution.discountAmount;
      const finalPrice = promotionResolution.finalPrice;
      const campaignPromotionTag = promotionResolution.campaignPromotionTag || '';

      // 4. Calculate booking date start & end
      const dateClean = (bookingDate || new Date().toISOString().slice(0, 10)).trim();
      const timeClean = (bookingTime || '09:00').trim();
      const timeWithSec = timeClean.length === 5 ? `${timeClean}:00` : timeClean;
      const startStr = `${dateClean}T${timeWithSec}`;
      let startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
      const endDate = new Date(startDate.getTime() + srvDuration * 60 * 1000);

      // Adjust date timezone for SQL representation using timezone-naive local format
      const formatLocalMySQL = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const mysqlStart = formatLocalMySQL(startDate);
      const mysqlEnd = formatLocalMySQL(endDate);

      // 5. Determine booker name and format final booking note to render correctly on legacy client
      let _bookerName = user.displayName || '';
      if (validStaffId) {
        const staffProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          validStaffId
        );
        if (staffProfile.length > 0 && staffProfile[0].full_name) {
          _bookerName = staffProfile[0].full_name;
        }
      }

      let finalBookingNote = (bookingNote || '').trim();
      if (campaignPromotionTag && !finalBookingNote.includes(campaignPromotionTag)) {
        finalBookingNote = finalBookingNote ? `${finalBookingNote}\n${campaignPromotionTag}` : campaignPromotionTag;
      }

      // 6. Calculate booking sale classification (is_new and combo_sale_required)
      const { isNew, comboSaleRequired } = await BookingSaleClassificationService.determineBookingSaleClassification(
        fastify,
        Number(finalCustomerId),
        startDate,
        serviceGroup
      );

      // 7. Create the booking order
      const orderKey = 'booking_' + Math.random().toString(36).substring(2, 12);
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO \`order\` (
          client_id, client_business_id, created_staff_id, order_key, client_store_id, 
          user_id, currency_id, booking_note, booking_channels, booking_duration_minute, 
          booking_date_start, booking_date_end, total_quantity, total_price, order_state, 
          last_day_order_completed, combo_sale_required, is_new, is_debt, date_created, date_updated,
          promotion_id, selected_promotion_id, campaign_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
        11,
        1,
        validStaffId || null,
        orderKey,
        Number(storeId) || 1,
        Number(finalCustomerId),
        1,
        finalBookingNote || '',
        bookingChannel || 'FB',
        Number(srvDuration) || 90,
        mysqlStart,
        mysqlEnd,
        1,
        Number(finalPrice) || 0,
        'New',
        0,
        comboSaleRequired,
        isNew,
        0,
        selectedPromoId ? Number(selectedPromoId) : null,
        selectedPromoId ? Number(selectedPromoId) : null,
        campaignId ? Number(campaignId) : null
      );

      // Get inserted order ID
      const insertedOrder = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`order\` WHERE order_key = ? LIMIT 1`,
        orderKey
      );
      if (insertedOrder.length === 0) {
        throw new Error('Failed to create booking order.');
      }
      const orderId = Number(insertedOrder[0].id);

      // Insert log record into order_booking_date_change to sync booker details and time on legacy frontend
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_booking_date_change (
          created_staff_id, order_id, client_store_id, assigned_staff_id, 
          booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        validStaffId || null,
        orderId,
        Number(storeId) || 1,
        technicianId ? Number(technicianId) : null,
        finalBookingNote || '',
        Number(srvDuration) || 90,
        mysqlStart,
        mysqlEnd
      );

      // 5. Create order_service record
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart,
        serviceGroup
      );

      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_service (
          client_id, client_business_id, user_id, order_id, service_id, 
          service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id, 
          duration_minute, quantity, service_price, discount_amount, paid_credit_amount, 
          tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        11,
        1,
        Number(finalCustomerId),
        orderId,
        Number(finalServiceId) || 1,
        'Normal',
        serviceGroup,
        userServiceType || 'new',
        technicianId ? Number(technicianId) : null,
        technicianId ? Number(technicianId) : null,
        Number(srvDuration) || 90,
        1,
        Number(srvPrice) || 0,
        Number(discountAmount) || 0,
        0,
        0,
        0,
        0,
        0,
        0,
        Number(finalPrice) || 0
      );

      // 6. Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart,
        finalCustomerId
      );

      // 7. Check and assign customer to the logged-in CRM staff member if not already assigned
      const existingAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
        where: { legacyUserId: finalCustomerId },
      });

      if (!existingAssignment) {
        const crmStaffExists = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: user.id },
        });

        if (crmStaffExists) {
          const batchId = `alloc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await fastify.prisma.crm.$transaction(async (tx) => {
            await AllocationLedgerService.setOwner(tx, {
              customerId: finalCustomerId,
              nextStaffId: user.id,
              actorStaffId: user.id,
              eventType: 'ACCEPTED',
              previousStaffId: null,
              reason: 'Booker tạo lịch hẹn cho khách chưa có chủ sở hữu',
              sourceType: 'BOOKING',
              actionContext: 'BOOKING_AUTO_ASSIGN',
              batchId,
            });
            await tx.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: finalCustomerId,
                prevStaffId: null,
                newStaffId: user.id,
                assignedBy: user.id,
              },
            });
          });
        }
      }

      // 8. Record campaign touchpoint log and call log for accounting & reporting if campaignPromotionId was selected
      if (campaignPromotionId) {
        try {
          const campaignPromo = await fastify.prisma.crm.crmCampaignPromotion.findUnique({
            where: { id: Number(campaignPromotionId) },
            include: { campaign: true },
          });

          if (campaignPromo) {
            const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
              where: {
                campaignId: campaignPromo.campaignId,
                legacyUserId: finalCustomerId,
                removedAt: null,
              },
            });

            if (campaignCustomer) {
              const firstTouchpoint = await fastify.prisma.crm.crmCampaignTouchpoint.findFirst({
                where: { campaignId: campaignPromo.campaignId },
                orderBy: { sortOrder: 'asc' },
              });

              if (firstTouchpoint) {
                await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
                  where: {
                    campaignCustomerId_touchpointId: {
                      campaignCustomerId: campaignCustomer.id,
                      touchpointId: firstTouchpoint.id,
                    },
                  },
                  create: {
                    campaignCustomerId: campaignCustomer.id,
                    touchpointId: firstTouchpoint.id,
                    isChecked: true,
                    completedAt: new Date(),
                    completedByStaffId: user.id,
                    completedByStaffName: user.displayName || `Staff #${user.id}`,
                    note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
                  },
                  update: {
                    isChecked: true,
                    completedAt: new Date(),
                    completedByStaffId: user.id,
                    completedByStaffName: user.displayName || `Staff #${user.id}`,
                    note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
                  },
                });
              }
            }

            await fastify.prisma.crm.crmCallLog.create({
              data: {
                legacyUserId: finalCustomerId,
                staffId: user.id,
                callType: 'CAMPAIGN_BOOKING',
                callResult: 'BOOKED',
                note: `Tạo lịch thành công kèm ưu đãi ${campaignPromotionTag}`,
              },
            });
          }
        } catch (logErr) {
          fastify.log.warn({ err: logErr }, 'Failed to record campaign touchpoint/call log');
        }
      }

      return { success: true, orderId, customerId: finalCustomerId };
    } catch (error: SafeAny) {
      if (error instanceof BookingPromotionError) {
        return reply.status(400).send({ error: 'Bad Request', message: error.message });
      }
      if (error instanceof CustomerCreationError) {
        return reply.status(error.statusCode).send({ error: 'Bad Request', message: error.message });
      }
      fastify.log.error(error as Error, '[Booking] Failed to create booking:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error?.message || 'Có lỗi xảy ra trong quá trình đặt lịch. Vui lòng thử lại.',
        details: error?.stack || String(error),
      });
    }
  });

  // GET /api/customers/booking/:id/promotions
  // A custom-campaign booking is deliberately scoped to the promotion list of its originating campaign.
  fastify.get('/customers/booking/:id/promotions', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number };
    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(fastify, user);
    const role = String(user.role || '').toLowerCase();
    const allowedRoles = ['telesales', 'booker', 'manager', 'control', 'cs', 'oc'];
    if (!canRescheduleAnyCustomer && !isAdminOrSuperAdminRole(role) && !allowedRoles.includes(role)) {
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
      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

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

  // PUT /api/customers/booking/:id
  // Partially update an existing booking; omitted branch/date/time fields are preserved.
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
      // Verify that the current user has linked legacy staff account
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      if (!crmStaff || !crmStaff.legacyStaffId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message:
            'Tài khoản của bạn chưa được liên kết với hệ thống cũ. Vui lòng liên hệ Admin để cấu hình liên kết tài khoản trước khi thực hiện đặt lịch.',
        });
      }

      const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user WHERE id = ? LIMIT 1`,
        crmStaff.legacyStaffId
      );
      if (staffExists.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tài khoản liên kết bên hệ thống cũ không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Admin.',
        });
      }

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

      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
        promotionId: order.selected_promotion_id ? Number(order.selected_promotion_id) : null,
        campaignId: order.campaign_id ? Number(order.campaign_id) : null,
      };

      const { reasonCategory, reasonNote } = (request.body || {}) as {
        reasonCategory?: string | null;
        reasonNote?: string | null;
      };

      // 2. Resolve the base service and promotion from one authoritative service.
      // This is required when a promotion changes: order.total_price may already be discounted.
      const existingServices = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, service_id, service_group, service_price, discount_amount, total_price, promotion_id
         FROM order_service WHERE order_id = ? ORDER BY service_price DESC LIMIT 1`,
        orderId
      );
      const existingService = existingServices[0] || null;
      const hasServiceChange = serviceId !== undefined && serviceId !== null;
      const requestedServiceId = hasServiceChange ? Number(serviceId) : null;
      if (
        hasServiceChange &&
        (requestedServiceId === null || !Number.isInteger(requestedServiceId) || requestedServiceId < 0)
      ) {
        throw new BookingUpdateValidationError('Dịch vụ được chọn không hợp lệ. Vui lòng chọn lại dịch vụ.');
      }

      let finalServiceId = hasServiceChange ? requestedServiceId! : Number(existingService?.service_id || 0) || null;
      if (finalServiceId === 0) finalServiceId = 1; // Map virtual "Any - Lashes 2" to the legacy service.

      let srvPrice = Number(existingService?.service_price || order.total_price || 0);
      let srvDuration = Number(order.booking_duration_minute) || 90;
      let serviceGroup = String(existingService?.service_group || 'LashesTop');
      if (finalServiceId) {
        const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT s.duration_minute_standard as duration,
                  sp.service_price as price,
                  COALESCE(NULLIF(s.service_group, ''), 'LashesTop') as serviceGroup
           FROM service s
           LEFT JOIN service_price sp
             ON s.id = sp.service_id
             AND sp.service_price_package_key = 'single'
             AND sp.currency_id = 2
             AND sp.is_disabled = 0
           WHERE s.id = ? LIMIT 1`,
          finalServiceId
        );
        if (srvInfo.length > 0) {
          srvPrice = Math.round(Number(srvInfo[0].price || 0));
          srvDuration = Number(srvInfo[0].duration || 90);
          serviceGroup = String(srvInfo[0].serviceGroup || serviceGroup);
        } else if (hasServiceChange) {
          throw new BookingUpdateValidationError('Dịch vụ đã chọn không còn tồn tại. Vui lòng chọn lại dịch vụ.');
        }
      }

      const currentPromotionId = Number(order.selected_promotion_id || order.promotion_id || 0) || null;
      const currentCustomCampaign = await BookingPromotionService.getCustomCampaignContext(fastify, currentPromotionId);
      const hasPromotionSelection =
        Object.prototype.hasOwnProperty.call(request.body || {}, 'promotionId') ||
        Object.prototype.hasOwnProperty.call(request.body || {}, 'campaignPromotionId');
      const selectedPromotionId = hasPromotionSelection
        ? (promotionId ?? null)
        : currentCustomCampaign
          ? null
          : currentPromotionId;
      const selectedCampaignPromotionId = hasPromotionSelection
        ? (campaignPromotionId ?? null)
        : (currentCustomCampaign?.campaignPromotionId ?? null);

      const isKeepingCurrentService = Number(existingService?.service_id || 0) === Number(finalServiceId || 0);
      const mayKeepInactiveLegacyPromotion = Boolean(
        !hasPromotionSelection && currentPromotionId && !currentCustomCampaign && isKeepingCurrentService
      );
      const activeCurrentPromotion = mayKeepInactiveLegacyPromotion
        ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            'SELECT id FROM promotion WHERE id = ? AND is_disabled = 0 LIMIT 1',
            currentPromotionId
          )
        : [];
      const shouldKeepInactiveLegacyPromotion = mayKeepInactiveLegacyPromotion && activeCurrentPromotion.length === 0;

      // A historical appointment can reference a legacy campaign promotion whose CRM campaign
      // has already been retired. Moving its time without changing its service must retain the
      // booked price instead of rejecting the reschedule for an offer that is no longer selectable.
      const promotionResolution = shouldKeepInactiveLegacyPromotion
        ? {
            source: 'NONE' as const,
            legacyPromotionId: currentPromotionId,
            legacyCampaignId: Number(order.campaign_id || 0) || null,
            discountAmount: Math.round(Number(existingService?.discount_amount || 0)),
            finalPrice: Math.round(Number(existingService?.total_price ?? order.total_price ?? 0)),
            campaignPromotionTag: null,
            campaignPromotionId: null,
          }
        : await BookingPromotionService.resolve(fastify, {
            customerId: finalCustomerId,
            serviceId: finalServiceId,
            basePrice: srvPrice,
            bookingDate: resolvedUpdate.bookingDate,
            promotionId: selectedPromotionId,
            campaignPromotionId: selectedCampaignPromotionId,
            allowedCampaignId: currentCustomCampaign?.campaignId ?? null,
          });
      const duration = srvDuration;
      const totalPrice = promotionResolution.finalPrice;

      let finalBookingNote = String(resolvedUpdate.bookingNote || '').trim();
      if (currentCustomCampaign?.tag) {
        finalBookingNote = finalBookingNote
          .split(/\r?\n/)
          .filter((line) => line.trim() !== currentCustomCampaign.tag)
          .join('\n')
          .trim();
      }
      if (promotionResolution.campaignPromotionTag) {
        finalBookingNote = finalBookingNote
          ? `${finalBookingNote}\n${promotionResolution.campaignPromotionTag}`
          : promotionResolution.campaignPromotionTag;
      }

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

      let actionType: 'RESCHEDULE' | 'CHANGE_CV' | 'CHANGE_STORE' | 'EDIT' = 'EDIT';
      const oldStartStr = resolvedUpdate.currentBookingDateStart;
      if (oldStartStr !== mysqlStart) {
        actionType = 'RESCHEDULE';
      } else if (Number(order.assigned_staff_id || 0) !== Number(finalTechnicianId || 0)) {
        actionType = 'CHANGE_CV';
      } else if (Number(order.client_store_id) !== Number(finalStoreId)) {
        actionType = 'CHANGE_STORE';
      }

      const finalOrderState = resolvedUpdate.isLockedScheduleUpdateRequested ? 'New' : String(order.order_state);

      const didTechnicianChange = Number(order.assigned_staff_id || 0) !== Number(finalTechnicianId || 0);
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart,
        serviceGroup
      );

      // Keep all legacy writes atomic. A rejected service or a later write failure
      // must not leave the appointment time updated while its service is unchanged.
      await fastify.prisma.legacy.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE \`order\`
           SET booking_date_start = ?,
               booking_date_end = ?,
               assigned_staff_id = ?,
               client_store_id = ?,
               booking_note = ?,
               booking_duration_minute = ?,
               total_price = ?,
               promotion_id = ?,
               selected_promotion_id = ?,
               campaign_id = ?,
               order_state = ?,
               date_updated = NOW()
           WHERE id = ?`,
          mysqlStart,
          mysqlEnd,
          finalTechnicianId,
          finalStoreId,
          finalBookingNote || null,
          duration,
          totalPrice,
          promotionResolution.legacyPromotionId,
          promotionResolution.legacyPromotionId,
          promotionResolution.legacyCampaignId,
          finalOrderState,
          orderId
        );

        if (resolvedUpdate.isLockedScheduleUpdateRequested || didTechnicianChange) {
          await tx.$executeRawUnsafe(
            `INSERT INTO order_booking_date_change (
              created_staff_id, order_id, client_store_id, assigned_staff_id,
              booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            crmStaff.legacyStaffId,
            orderId,
            finalStoreId,
            finalTechnicianId,
            finalBookingNote || null,
            duration,
            mysqlStart,
            mysqlEnd
          );
        }

        if (existingService && finalServiceId) {
          await tx.$executeRawUnsafe(
            `UPDATE order_service
             SET service_id = ?,
                 service_group = ?,
                 duration_minute = ?,
                 service_price = ?,
                 discount_amount = ?,
                 total_price = ?,
                 promotion_id = ?,
                 assigned_staff_id = ?,
                 booked_staff_id = ?,
                 user_service_type = ?
             WHERE id = ?`,
            finalServiceId,
            serviceGroup,
            duration,
            srvPrice,
            promotionResolution.discountAmount,
            totalPrice,
            promotionResolution.legacyPromotionId,
            finalTechnicianId,
            finalTechnicianId,
            userServiceType,
            existingService.id
          );
        } else if (finalServiceId) {
          await tx.$executeRawUnsafe(
            `INSERT INTO order_service (
               order_id, service_id, duration_minute, service_price, discount_amount, total_price,
               promotion_id, service_group, assigned_staff_id, booked_staff_id, user_service_type, date_created
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            orderId,
            finalServiceId,
            duration,
            srvPrice,
            promotionResolution.discountAmount,
            totalPrice,
            promotionResolution.legacyPromotionId,
            serviceGroup,
            finalTechnicianId,
            finalTechnicianId,
            userServiceType
          );
        } else {
          await tx.$executeRawUnsafe(
            `UPDATE order_service
             SET assigned_staff_id = ?, booked_staff_id = ?, user_service_type = ?
             WHERE order_id = ?`,
            finalTechnicianId,
            finalTechnicianId,
            userServiceType,
            orderId
          );
        }

        await tx.$executeRawUnsafe(
          `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
          mysqlStart,
          finalCustomerId
        );
      });

      // 6. Audit Log Recording
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType,
        actorStaffId: crmStaff.legacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData,
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

  // DELETE /api/customers/booking/:id
  // Cancel a booking (soft delete by setting order_state = 'Cancelled')
  fastify.delete('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(fastify, user);
    const role = String(user.role || '').toLowerCase();
    const allowedRoles = ['telesales', 'booker', 'manager', 'control', 'cs', 'oc'];
    if (!canRescheduleAnyCustomer && !isAdminOrSuperAdminRole(role) && !allowedRoles.includes(role)) {
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
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      if (!crmStaff || !crmStaff.legacyStaffId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message:
            'Tài khoản của bạn chưa được liên kết với hệ thống cũ. Vui lòng liên hệ Admin để cấu hình liên kết tài khoản trước khi thực hiện đặt lịch.',
        });
      }

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

      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, finalCustomerId))) return;

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
        actorStaffId: crmStaff.legacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData: { orderState: 'Cancelled' },
        ipAddress: request.ip,
      });

      const isCrossAction = Boolean(originalStaffId && crmStaff.legacyStaffId !== originalStaffId);

      return reply.send({ success: true, orderId, isCrossAction });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Cancel booking error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể hủy lịch hẹn.' });
    }
  });

  // GET /api/customers/booking-slots
  // Calculate slot available matrix based on core shift tables, weekly/requested day-offs, and live orders
  fastify.get('/customers/booking-slots', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      date,
      storeName,
      storeId: queryStoreId,
      technicianId,
    } = request.query as {
      date?: string;
      storeName?: string;
      storeId?: string | number;
      technicianId?: string;
    };

    if (!date || (!storeName && !queryStoreId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'date and storeName/storeId are required' });
    }

    try {
      let storeId = 6;
      if (queryStoreId) {
        storeId = Number(queryStoreId);
      } else {
        const storeLower = String(storeName || '')
          .trim()
          .toLowerCase();
        if (storeLower.includes('estella') || storeLower === 'ep') {
          storeId = 16;
        } else if (storeLower.includes('phan xích long') || storeLower.includes('pxl')) {
          storeId = 2;
        } else {
          storeId = 6;
        }
      }

      // 1. Fetch active CV pool from TeamService / ACTIVE_CV_STAFF_CONFIG
      const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
      if (cvStaffIds.length === 0) {
        return reply.send({});
      }

      // 2. Fetch CV profiles and store mappings
      const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as id, full_name as name, client_store_id
         FROM user_profile
         WHERE user_id IN (${cvStaffIds.join(',')}) AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0`
      );

      const dayOffStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, client_store_id
         FROM staff_day_off_schedule
         WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
         GROUP BY user_id`
      );

      const cvProfileStoreMap = new Map<number, number>();
      cvProfiles.forEach((p) => {
        if (p.client_store_id) cvProfileStoreMap.set(Number(p.id), Number(p.client_store_id));
      });

      // Filter active CVs belonging to this store
      let activeStoreCvIds = cvStaffIds.filter((uid) => {
        const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
        const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
        return finalStoreId === storeId;
      });

      if (technicianId) {
        const techIdNum = parseInt(technicianId, 10);
        activeStoreCvIds = activeStoreCvIds.filter((uid) => uid === techIdNum);
      }

      // 3. Weekly Offs & Date Leave Requests
      const dayOfWeek = new Date(date).getDay();
      const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Check weekly recurring day-offs from staff_day_off_schedule
      const weeklyOffs =
        activeStoreCvIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT user_id FROM staff_day_off_schedule
             WHERE is_disabled = 0 AND weekday = ? AND user_id IN (${activeStoreCvIds.join(',')})`,
              weekday
            )
          : [];
      const weeklyOffUserIds = new Set(weeklyOffs.map((w) => Number(w.user_id)));

      // Check date-specific approved leave from staff_day_off
      const dateOffs =
        activeStoreCvIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT from_user_id FROM staff_day_off
             WHERE from_date <= ? AND ? <= COALESCE(to_date, from_date)
               AND request_state = 'Approved'
               AND from_user_id IN (${activeStoreCvIds.join(',')})`,
              date,
              date
            )
          : [];
      const leaveOffUserIds = new Set(dateOffs.map((l) => Number(l.from_user_id)));

      const workingCvIds = activeStoreCvIds.filter((uid) => !weeklyOffUserIds.has(uid) && !leaveOffUserIds.has(uid));

      // 4. Instantiated Shifts vs Schedule Templates
      const instantiatedShifts =
        workingCvIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT user_id, CAST(start_time AS CHAR) as start_time_str, CAST(end_time AS CHAR) as end_time_str
             FROM staff_working_shift
             WHERE date = ? AND user_id IN (${workingCvIds.join(',')})`,
              date
            )
          : [];

      const shiftScheduleRows =
        workingCvIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT user_id, type, type_value, CAST(start_time AS CHAR) as start_time_str, CAST(end_time AS CHAR) as end_time_str
             FROM staff_working_shift_schedule
             WHERE is_disabled = 0 AND user_id IN (${workingCvIds.join(',')})
             ORDER BY user_id, type DESC`
            )
          : [];

      const roster = workingCvIds.map((uid) => {
        const p = cvProfiles.find((cp) => Number(cp.id) === uid);
        const inst = instantiatedShifts.find((s) => Number(s.user_id) === uid);

        let shiftStart = '09:00';
        let shiftEnd = '20:00';

        if (inst?.start_time_str && inst?.end_time_str) {
          shiftStart = inst.start_time_str.split(' ')[1]?.slice(0, 5) || inst.start_time_str.slice(0, 5);
          shiftEnd = inst.end_time_str.split(' ')[1]?.slice(0, 5) || inst.end_time_str.slice(0, 5);
        } else {
          const userSchedules = shiftScheduleRows.filter((r) => Number(r.user_id) === uid);
          const matched =
            userSchedules.find((r) => String(r.type) === 'Weekday' && String(r.type_value) === String(weekday)) ||
            userSchedules.find((r) => String(r.type) === 'Day' && String(r.type_value) === 'All');

          if (matched?.start_time_str && matched?.end_time_str) {
            shiftStart = matched.start_time_str.split(' ')[1]?.slice(0, 5) || matched.start_time_str.slice(0, 5);
            shiftEnd = matched.end_time_str.split(' ')[1]?.slice(0, 5) || matched.end_time_str.slice(0, 5);
          }
        }

        return {
          userId: uid,
          staff_name: p?.name || `CV #${uid}`,
          shift_start: shiftStart,
          shift_end: shiftEnd,
        };
      });

      // 5. Fetch live active appointments from core `order` table
      let orderQuery = `
        SELECT 
          o.id,
          CAST(o.booking_date_start AS CHAR) as start_str,
          COALESCE(o.booking_duration_minute, 90) as duration,
          obdc.assigned_staff_id
        FROM \`order\` o
        LEFT JOIN (
          SELECT order_id, assigned_staff_id 
          FROM order_booking_date_change 
          WHERE id IN (
            SELECT MAX(id) FROM order_booking_date_change GROUP BY order_id
          )
        ) obdc ON o.id = obdc.order_id
        WHERE o.client_store_id = ?
          AND DATE(o.booking_date_start) = ?
          AND o.order_state != 'Cancelled'
      `;
      const orderParams: SafeAny[] = [storeId, date];

      if (technicianId) {
        orderQuery += ` AND obdc.assigned_staff_id = ?`;
        orderParams.push(parseInt(technicianId, 10));
      }

      const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderQuery, ...orderParams);

      // 6. Generate 15-minute slot matrix (09:00 to 20:00)
      const matrix: { [time: string]: { available: number; roster: number; booked: number } } = {};
      let currentMin = 9 * 60; // 09:00
      const endMin = 20 * 60 + 15; // 20:15

      while (currentMin < endMin) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // Active roster count at this slot
        const activeRoster = roster.filter((r) => {
          const [sh, sm] = r.shift_start.split(':').map(Number);
          const [eh, em] = r.shift_end.split(':').map(Number);
          const rStart = (sh || 9) * 60 + (sm || 0);
          const rEnd = (eh || 20) * 60 + (em || 0);
          return rStart <= currentMin && currentMin < rEnd;
        });

        // Active appointments overlapping this slot
        const activeOrders = orders.filter((o) => {
          const timePart = o.start_str ? o.start_str.split(' ')[1] : '09:00';
          const [oh, om] = (timePart || '09:00').split(':').map(Number);
          const oStart = (oh || 0) * 60 + (om || 0);
          const dur = Number(o.duration || 90);
          const oEnd = oStart + dur;
          return oStart <= currentMin && currentMin < oEnd;
        });

        const rosterCount = activeRoster.length;
        const bookedCount = activeOrders.length;
        const available = rosterCount - bookedCount;

        matrix[timeStr] = {
          available,
          roster: rosterCount,
          booked: bookedCount,
        };

        currentMin += 15;
      }

      return matrix;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Calculate booking slots error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to calculate booking slots' });
    }
  });
}
