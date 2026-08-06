import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
import { getBkPaystubData } from '../../kpi/services/bk-salary.service.js';
import { BookingAuditService } from '../services/booking-audit.service.js';
import { UserServiceTypeService } from '../services/user-service-type.service.js';

const ALLOWED_BOOKING_LEGACY_GROUPS = [2, 5, 14, 31, 32, 33, 34, 45];

async function validateLegacyStaffBookingPermission(
  fastify: FastifyInstance,
  legacyStaffId: number
): Promise<{ valid: boolean; statusCode?: number; message?: string }> {
  const staffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT user_group_id, access_user_group_ids FROM user_profile WHERE user_id = ? AND is_disabled = 0 LIMIT 1`,
    legacyStaffId
  );

  if (staffRows.length === 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Tài khoản liên kết bên hệ thống cũ không tồn tại hoặc đã bị vô hiệu hóa. Vui lòng liên hệ Admin.',
    };
  }

  const profile = staffRows[0];
  const primaryGroup = Number(profile.user_group_id || 0);
  const accessGroups = (profile.access_user_group_ids || '')
    .split(',')
    .map((g: string) => parseInt(g.trim(), 10))
    .filter((g: number) => !isNaN(g));

  const hasPermission =
    ALLOWED_BOOKING_LEGACY_GROUPS.includes(primaryGroup) ||
    accessGroups.some((g: number) => ALLOWED_BOOKING_LEGACY_GROUPS.includes(g));

  if (!hasPermission) {
    return {
      valid: false,
      statusCode: 403,
      message: `Tài khoản legacy của bạn (Nhóm quyền #${primaryGroup}) không có quyền thực hiện đặt lịch. Vui lòng liên hệ Admin.`,
    };
  }

  return { valid: true };
}

export async function registerBookingRoutes(fastify: FastifyInstance) {
  // POST /api/customers/booking
  // Create a new booking (order and order_service) in the legacy core database
  fastify.post('/customers/booking', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };

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
      referralPhone,
    } = request.body as SafeAny;

    try {
      // Find matching legacy user ID by CRM user (Strictly require direct link)
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

      const legacyStaffId = crmStaff.legacyStaffId;
      const permCheck = await validateLegacyStaffBookingPermission(fastify, legacyStaffId);
      if (!permCheck.valid) {
        return reply.status(permCheck.statusCode || 400).send({
          error: permCheck.statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: permCheck.message,
        });
      }
      const validStaffId = legacyStaffId;

      // Check referrer phone
      let referrerUserId: number | null = null;
      if (referralPhone && referralPhone.trim()) {
        const referrerContact = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
          referralPhone.trim()
        );
        if (referrerContact.length > 0) {
          referrerUserId = Number(referrerContact[0].user_id);
        } else {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Không tìm thấy tài khoản người giới thiệu với SĐT: ${referralPhone}. Vui lòng kiểm tra lại.`,
          });
        }
      }

      let finalCustomerId = customerId;

      // 1. If it's a new customer, create parent user, user_profile, and user_contact records
      if (!finalCustomerId) {
        // Insert parent user record (default to Female 202 to avoid legacy system filtering)
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user (created_staff_id, attribute_gender_id, date_created) VALUES (?, 202, NOW())`,
          validStaffId
        );

        const lastInsertedUser =
          await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`SELECT LAST_INSERT_ID() as id`);
        if (lastInsertedUser.length === 0 || !lastInsertedUser[0].id) {
          throw new Error('Failed to create new user ID in legacy database.');
        }
        finalCustomerId = Number(lastInsertedUser[0].id);

        const randPasscode = Math.random().toString(36).substring(2, 8);
        const nameParts = (newCustomerName || 'Khách Hàng Mới').trim().split(/\s+/);
        const lastName = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || '';

        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user_profile (
            user_id, client_id, client_business_id, user_group_id, passcode, provider, 
            first_name, last_name, full_name, client_store_id, is_disabled, 
            is_leaved, is_deleted, date_created, language_id, access_user_group_ids,
            is_academy, is_temporary, referrer_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
          finalCustomerId,
          11,
          1,
          1,
          randPasscode,
          'Client',
          firstName,
          lastName,
          newCustomerName,
          storeId,
          0,
          0,
          0,
          1,
          '',
          0,
          0,
          referrerUserId
        );

        if (newCustomerPhone) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `INSERT INTO user_contact (user_id, phone_number, is_disabled, date_created)
             VALUES (?, ?, 0, NOW())`,
            finalCustomerId,
            newCustomerPhone
          );
        }
      } else {
        // If existing customer, update referrer if they don't have one yet
        if (referrerUserId) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE user_profile SET referrer_user_id = ? WHERE user_id = ? AND referrer_user_id IS NULL`,
            referrerUserId,
            finalCustomerId
          );
        }
      }

      // 2. Query service price and standard duration
      let finalServiceId = serviceId;
      if (finalServiceId === 0) {
        finalServiceId = 1; // Map to "Any - Lashes 2" to satisfy foreign key constraint
      }

      let srvPrice = 0;
      let srvDuration = 90;
      const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT s.duration_minute_standard as duration, sp.service_price as price
         FROM service s
         LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
         WHERE s.id = ? LIMIT 1`,
        finalServiceId
      );
      if (srvInfo.length > 0) {
        srvPrice = Number(srvInfo[0].price || 0);
        srvDuration = Number(srvInfo[0].duration || 90);
      }

      // If virtual service 0 was selected, keep the price 0 and duration 90
      if (serviceId === 0) {
        srvPrice = 0;
        srvDuration = 90;
      }

      // Calculate promotional discount if promotionId is provided
      let selectedPromoId: number | null = null;
      let campaignId: number | null = null;
      let discountAmount = 0;
      let finalPrice = srvPrice;

      if (promotionId) {
        const promoRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id, campaign_id, discount_percentage, discount_amount FROM promotion WHERE id = ? LIMIT 1`,
          promotionId
        );
        if (promoRows.length > 0) {
          selectedPromoId = Number(promoRows[0].id);
          campaignId = promoRows[0].campaign_id ? Number(promoRows[0].campaign_id) : null;
          const pct = Number(promoRows[0].discount_percentage || 0);
          const amt = Number(promoRows[0].discount_amount || 0);

          if (pct > 0) {
            discountAmount = Math.round((srvPrice * pct) / 100);
          } else if (amt > 0) {
            discountAmount = amt;
          }
          finalPrice = Math.max(0, srvPrice - discountAmount);
        }
      }

      // 4. Calculate booking date start & end
      const startStr = `${bookingDate} ${bookingTime}:00`;
      const startDate = new Date(startStr);
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

      const finalBookingNote = (bookingNote || '').trim();

      // 6. Create the booking order
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
        validStaffId,
        orderKey,
        storeId,
        finalCustomerId,
        1,
        finalBookingNote,
        bookingChannel || 'FB',
        srvDuration,
        mysqlStart,
        mysqlEnd,
        1,
        finalPrice,
        'New',
        0,
        0,
        1,
        0,
        selectedPromoId,
        selectedPromoId,
        campaignId
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
        validStaffId,
        orderId,
        storeId,
        technicianId || null,
        finalBookingNote,
        srvDuration,
        mysqlStart,
        mysqlEnd
      );

      // 5. Create order_service record
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart
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
        finalCustomerId,
        orderId,
        finalServiceId,
        'Normal',
        'LashesTop',
        userServiceType,
        technicianId,
        technicianId,
        srvDuration,
        1,
        srvPrice,
        discountAmount,
        0,
        0,
        0,
        0,
        0,
        0,
        finalPrice
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
          await fastify.prisma.crm.crmCustomerAssignment.create({
            data: {
              legacyUserId: finalCustomerId,
              staffId: user.id,
              assignedBy: user.id,
            },
          });
        }
      }

      // Audit Log Creation
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType: 'EDIT',
        actorStaffId: validStaffId,
        originalStaffId: validStaffId,
        reasonCategory: 'TẠO_LỊCH_MỚI',
        reasonNote: 'Tạo đơn đặt lịch hẹn mới',
        newData: {
          bookingDateStart: mysqlStart,
          storeId,
          technicianId,
          bookingNote: finalBookingNote,
        },
        ipAddress: request.ip,
      });

      return reply.send({ success: true, orderId, orderKey });
    } catch (error) {
      fastify.log.error(error as Error, '[Booking] Failed to create booking:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to create booking',
      });
    }
  });

  // PUT /api/customers/booking/:id
  // Reschedule or update an existing booking
  fastify.put('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };

    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ' });
    }

    const {
      storeId,
      storeName: _storeName,
      technicianId,
      technicianName: _technicianName,
      bookingDate,
      bookingTime,
      bookingNote,
      serviceId,
      reasonCategory,
      reasonNote,
    } = request.body as {
      storeId: number;
      storeName: string;
      technicianId: number | null;
      technicianName?: string;
      bookingDate: string; // YYYY-MM-DD
      bookingTime: string; // HH:mm
      bookingNote?: string | null;
      serviceId?: number | null;
      reasonCategory?: string | null;
      reasonNote?: string | null;
    };

    if (!storeId || !bookingDate || !bookingTime) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Các thông tin Chi nhánh, Ngày đặt và Khung giờ trống là bắt buộc',
      });
    }

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

      const permCheck = await validateLegacyStaffBookingPermission(fastify, crmStaff.legacyStaffId);
      if (!permCheck.valid) {
        return reply.status(permCheck.statusCode || 400).send({
          error: permCheck.statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: permCheck.message,
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
        `SELECT id, user_id, created_staff_id, client_store_id, assigned_staff_id, booking_date_start, booking_note, booking_duration_minute, total_price 
         FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const finalCustomerId = Number(order.user_id);
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

      // Old Data snapshot
      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
      };

      // 2. Fetch service price & duration if serviceId is provided
      let srvPrice = 0;
      let srvDuration = 90;
      let finalServiceId = serviceId;
      if (finalServiceId !== undefined && finalServiceId !== null) {
        if (finalServiceId === 0) finalServiceId = 1;
        const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT s.duration_minute_standard as duration, sp.service_price as price
           FROM service s
           LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
           WHERE s.id = ? LIMIT 1`,
          finalServiceId
        );
        if (srvInfo.length > 0) {
          srvPrice = Number(srvInfo[0].price || 0);
          srvDuration = Number(srvInfo[0].duration || 90);
        }
      }

      const duration =
        serviceId !== undefined && serviceId !== null ? srvDuration : Number(order.booking_duration_minute) || 90;
      const totalPrice = serviceId !== undefined && serviceId !== null ? srvPrice : Number(order.total_price || 0);

      // 3. Calculate new dates
      const startStr = `${bookingDate} ${bookingTime}:00`;
      const startDate = new Date(startStr);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      const formatLocalMySQL = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const mysqlStart = formatLocalMySQL(startDate);
      const mysqlEnd = formatLocalMySQL(endDate);

      const newData = {
        bookingDateStart: mysqlStart,
        storeId,
        technicianId: technicianId || null,
        bookingNote: bookingNote || null,
      };

      // 4. Determine action type
      let actionType: 'RESCHEDULE' | 'CHANGE_CV' | 'CHANGE_STORE' | 'EDIT' = 'EDIT';
      const oldStartStr = order.booking_date_start ? formatLocalMySQL(new Date(order.booking_date_start)) : '';
      if (oldStartStr !== mysqlStart) {
        actionType = 'RESCHEDULE';
      } else if (Number(order.assigned_staff_id || 0) !== Number(technicianId || 0)) {
        actionType = 'CHANGE_CV';
      } else if (Number(order.client_store_id) !== Number(storeId)) {
        actionType = 'CHANGE_STORE';
      }

      // Update order in legacy database
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET booking_date_start = ?, 
             booking_date_end = ?, 
             assigned_staff_id = ?, 
             client_store_id = ?, 
             booking_note = ?, 
             booking_duration_minute = ?,
             total_price = ?,
             order_state = 'New',
             date_updated = NOW()
         WHERE id = ?`,
        mysqlStart,
        mysqlEnd,
        technicianId || null,
        storeId,
        bookingNote || null,
        duration,
        totalPrice,
        orderId
      );

      // Insert log record into order_booking_date_change to sync booker details and time on legacy frontend
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_booking_date_change (
          created_staff_id, order_id, client_store_id, assigned_staff_id, 
          booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        crmStaff.legacyStaffId,
        orderId,
        storeId,
        technicianId || null,
        bookingNote || null,
        duration,
        mysqlStart,
        mysqlEnd
      );

      // 5. Update order_service record KTV assignment, service details, and recalculate user_service_type
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart
      );

      if (serviceId !== undefined && serviceId !== null) {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET service_id = ?,
               duration_minute = ?,
               service_price = ?,
               assigned_staff_id = ?, 
               booked_staff_id = ?,
               user_service_type = ?
           WHERE order_id = ?`,
          finalServiceId,
          duration,
          totalPrice,
          technicianId || null,
          technicianId || null,
          userServiceType,
          orderId
        );
      } else {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET assigned_staff_id = ?, booked_staff_id = ?, user_service_type = ?
           WHERE order_id = ?`,
          technicianId || null,
          technicianId || null,
          userServiceType,
          orderId
        );
      }

      // Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart,
        finalCustomerId
      );

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

      const permCheck = await validateLegacyStaffBookingPermission(fastify, crmStaff.legacyStaffId);
      if (!permCheck.valid) {
        return reply.status(permCheck.statusCode || 400).send({
          error: permCheck.statusCode === 403 ? 'Forbidden' : 'Bad Request',
          message: permCheck.message,
        });
      }

      // 1. Fetch the order details first to verify existence & capture original creator
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, created_staff_id, booking_date_start, client_store_id, assigned_staff_id, booking_note FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

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

      // 3. Create Audit Log
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

  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, type, staffId, page, limit } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      type?: 'pending' | 'missed' | 'completed';
      staffId?: string;
      page?: string;
      limit?: string;
    };

    const user = request.user as { id: number; role: string };

    if (!dateFrom || !dateTo) {
      return reply.status(400).send({ error: 'Bad Request', message: 'dateFrom and dateTo are required' });
    }

    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || '10', 10) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
      // 1. Determine the target staff assignments or appointment filters
      let filterByStaff = false;
      let targetStaffId = user.id;

      if (user.role === 'admin') {
        if (staffId && staffId !== 'all') {
          targetStaffId = parseInt(staffId, 10);
          filterByStaff = !isNaN(targetStaffId);
        }
      } else {
        filterByStaff = true;
      }

      let staffLegacyId: number | null = null;
      let staffRole: string = 'telesales';

      if (filterByStaff) {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: targetStaffId },
        });

        if (staff) {
          staffRole = staff.role;
          // Strip " CC" suffix from name if it exists to match legacy user full_name
          const cleanName = staff.displayName.replace(/\s+CC$/i, '').trim();

          const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `
            SELECT up.user_id as userId
            FROM \`staff_profile\` sp
            JOIN \`user_profile\` up ON sp.user_id = up.user_id
            WHERE up.provider = 'Staff' AND up.is_disabled = 0
              AND (up.full_name = ? OR up.full_name = ?)
            ORDER BY up.user_id DESC
            LIMIT 1
          `,
            cleanName,
            cleanName + ' '
          );

          if (profiles.length > 0) {
            staffLegacyId = Number(profiles[0].userId);
          }
        }
      }

      // If staff selected but no corresponding legacy user found, return empty list
      if (filterByStaff && !staffLegacyId) {
        return { data: [], total: 0 };
      }

      // 2. Query total count matching filters
      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;
      const countParams: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            countSql += ` AND o.assigned_staff_id = ?`;
          } else {
            countSql += ` AND o.created_staff_id = ?`;
          }
          countParams.push(staffLegacyId);
        } else {
          countSql += ` AND 1=0`;
        }
      }

      if (type === 'completed') {
        countSql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
      } else if (type === 'missed') {
        countSql += ` AND ((o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))`;
      } else {
        countSql += ` AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut') AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()`;
      }

      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql, ...countParams);
      const total = Number(countResult[0]?.total || 0);

      // 3. Query orders/bookings in range with pagination
      let sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.promotion_id as promotionId,
          o.selected_promotion_id as selectedPromotionId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDateStart,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i') as actualBookingTime,
          o.booking_date_end as bookingDateEnd,
          o.booking_note as bookingNote,
          o.booking_channels as bookingChannel,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.user_id as userId,
          o.date_created as dateCreated,
          o.assigned_staff_id as technicianId,
          o.client_store_id as storeId,
          COALESCE(up.full_name, 'No Name') as customerName,
          up.avatar as customerAvatar,
          (
            SELECT COALESCE(MAX(uc.phone_number), '')
            FROM user_contact uc
            WHERE uc.user_id = o.user_id AND uc.is_disabled = 0
          ) as customerPhone
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;

      const params: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            sql += ` AND o.assigned_staff_id = ?`;
          } else {
            sql += ` AND o.created_staff_id = ?`;
          }
          params.push(staffLegacyId);
        } else {
          sql += ` AND 1=0`;
        }
      }

      if (type === 'completed') {
        sql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
      } else if (type === 'missed') {
        sql += ` AND ((o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))`;
      } else {
        sql += ` AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut') AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()`;
      }

      sql += ` ORDER BY o.booking_date_start ASC LIMIT ? OFFSET ?`;
      params.push(limitNum, offsetNum);

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ...params);

      // 4. Fetch payment details and service details for completed/active orders to calculate financial metrics
      const orderIds = result.map((o) => Number(o.id));
      const completedOrderIds = result.filter((o) => o.orderState === 'Completed').map((o) => Number(o.id));

      const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
      if (completedOrderIds.length > 0) {
        const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        orderPayments.forEach((op: SafeAny) => {
          const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
          const paidSum =
            Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
          orderPaymentMap.set(Number(op.orderId), {
            tips: existing.tips + Number(op.tipAmount || 0),
            debt: existing.debt + Number(op.debt || 0),
            totalPaid: existing.totalPaid + paidSum,
          });
        });
      }

      const orderServicesMap = new Map<number, SafeAny[]>();
      const serviceNameMap = new Map<number, string>();
      if (orderIds.length > 0) {
        const orderServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: orderIds } },
        });
        orderServices.forEach((os) => {
          const l = orderServicesMap.get(os.order_id) || [];
          l.push(os);
          orderServicesMap.set(os.order_id, l);
        });

        const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
        if (serviceIds.length > 0) {
          const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: serviceIds } },
          });
          serviceLanguages.forEach((sl) => {
            serviceNameMap.set(sl.service_id, sl.service_name);
          });
        }
      }

      // Single Source of Truth paystub calculation (Rule #11)
      const startPart = String(dateFrom).split(' ')[0].split('T')[0];
      const endPart = String(dateTo).split(' ')[0].split('T')[0];

      const paystubRes = await getBkPaystubData(
        fastify,
        startPart,
        endPart,
        filterByStaff && staffLegacyId ? [staffLegacyId] : undefined
      );

      let baseSalary = 0;
      let summaryClientBonus = 0;
      let doneBonus = 0;
      let doneLevelCount = 0;
      let missedBonus = 0;
      let missedLevelRate = 0;
      let missedRatePct = 0;
      let tipBonus = 0;
      let summaryTotalTips = 0;
      let revBonus = 0;
      let revLevelRate = 0;
      let revLevelMin = 0;
      let summaryTotalNetRev = 0;
      let totalSalary = 0;
      let totalCompleted = 0;
      let totalMissed = 0;
      let totalPlanned = 0;
      let pendingValue = 0;
      let totalPending = 0;

      if (filterByStaff && staffLegacyId && paystubRes.detailsMap.has(staffLegacyId)) {
        const detail = paystubRes.detailsMap.get(staffLegacyId)!;
        baseSalary = detail.calculatedBaseSalary;
        summaryClientBonus = detail.basicCheckinBonus;
        doneBonus = detail.milestoneBonus;
        doneLevelCount = detail.doneLevelCount;
        missedBonus = detail.penaltyBonus;
        missedLevelRate = detail.missedLevelRate;
        missedRatePct = detail.missedRatePercent;
        tipBonus = detail.tipBonus;
        summaryTotalTips = detail.totalCustomerTip;
        revBonus = detail.revenueBonus;
        revLevelRate = detail.revCommissionRate;
        revLevelMin = detail.revLevelMin;
        summaryTotalNetRev = detail.totalRevenue;
        totalSalary = detail.totalIncome;
        totalCompleted = detail.doneCount;
        totalMissed = detail.missedCount;
        totalPlanned = detail.totalCount;
      } else {
        baseSalary = paystubRes.summary.totalBaseSalary;
        summaryClientBonus = paystubRes.summary.totalBasicCheckinBonus;
        doneBonus = paystubRes.summary.totalMilestoneBonus;
        missedBonus = paystubRes.summary.totalPenaltyBonus;
        tipBonus = paystubRes.summary.totalTipBonus;
        summaryTotalTips = paystubRes.summary.totalCustomerTip;
        revBonus = paystubRes.summary.totalRevenueBonus;
        summaryTotalNetRev = paystubRes.summary.totalRevenue;
        totalSalary = paystubRes.summary.grandTotalIncome;
        totalCompleted = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.doneCount, 0);
        totalMissed = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.missedCount, 0);
        totalPlanned = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.totalCount, 0);
        missedRatePct = totalPlanned > 0 ? Number(((totalMissed / totalPlanned) * 100).toFixed(1)) : 0;
      }

      // Query pending appointments count & value in range
      let pendingSql = `
        SELECT COUNT(*) as totalPending, COALESCE(SUM(o.total_price), 0) as pendingValue
        FROM \`order\` o
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
          AND o.order_state NOT IN ('Completed', 'Cancelled', 'Missed')
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()
      `;
      const pendingParams: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];
      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          pendingSql += ` AND o.assigned_staff_id = ?`;
        } else {
          pendingSql += ` AND o.created_staff_id = ?`;
        }
        pendingParams.push(staffLegacyId);
      }

      const pendingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(pendingSql, ...pendingParams);
      if (pendingRows.length > 0) {
        totalPending = Number(pendingRows[0].totalPending || 0);
        pendingValue = Number(pendingRows[0].pendingValue || 0);
      }

      const checkInRate = totalPlanned > 0 ? Number(((totalCompleted / totalPlanned) * 100).toFixed(1)) : 0;

      const appointments = result.map((row: SafeAny) => {
        let serviceName = 'Không có thông tin';
        let price = 0;
        let discountPercent = 0;
        let bookingBonus = 0;
        let netRevenue = 0;
        let tipAmount = 0;

        if (row.orderState === 'Completed') {
          netRevenue = row.totalPrice;
          const payInfo = orderPaymentMap.get(Number(row.id)) || { tips: 0, debt: 0, totalPaid: 0 };
          tipAmount = payInfo.tips;
        }

        const checkinInfo = paystubRes.orderCheckinMap.get(Number(row.id));
        if (checkinInfo) {
          bookingBonus = checkinInfo.bonus;
        }

        const orderServicesList = orderServicesMap.get(Number(row.id)) || [];
        if (orderServicesList.length > 0) {
          let primaryService = orderServicesList[0];
          for (const os of orderServicesList) {
            if (os.service_price > (primaryService?.service_price || 0)) {
              primaryService = os;
            }
          }

          if (primaryService) {
            serviceName = serviceNameMap.get(primaryService.service_id) || 'Không rõ';
            price = primaryService.service_price;

            if (primaryService.service_price > 0) {
              discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            if (checkinInfo?.isCombo) {
              serviceName += ' (Combo - Không hoa hồng)';
            }
          }
        }

        return {
          id: Number(row.id),
          orderKey: row.orderKey,
          bookingDateStart: row.bookingDateStart
            ? new Date(row.bookingDateStart).toISOString().replace('Z', '+07:00')
            : null,
          bookingDateEnd: row.bookingDateEnd ? new Date(row.bookingDateEnd).toISOString().replace('Z', '+07:00') : null,
          bookingNote: row.bookingNote,
          bookingChannel: row.bookingChannel,
          orderState: row.orderState,
          totalPrice: Number(row.totalPrice || 0),
          customerId: Number(row.userId),
          customerName: row.customerName,
          customerAvatar: row.customerAvatar,
          customerPhone: row.customerPhone,
          serviceName,
          servicePrice: Number(price || 0),
          discountPercent: Number(discountPercent || 0),
          netRevenue: Number(netRevenue || 0),
          tipAmount: Number(tipAmount || 0),
          bookingBonus: Number(bookingBonus || 0),
          technicianId: row.technicianId ? Number(row.technicianId) : null,
          storeId: row.storeId ? Number(row.storeId) : null,
        };
      });

      return {
        data: appointments,
        total,
        summary: {
          totalPending,
          totalMissed,
          totalCompleted,
          pendingValue,
          completedRevenue: summaryTotalNetRev,
          totalPlanned,
          totalCheckin: totalCompleted,
          checkInRate: Math.round(checkInRate * 10) / 10,
          baseSalary,
          clientBonus: summaryClientBonus,
          doneBonus,
          doneLevelCount,
          missedBonus,
          missedLevelRate,
          missedRatePct: Math.round(missedRatePct * 10) / 10,
          tipBonus,
          totalTips: summaryTotalTips,
          revBonus,
          revLevelRate,
          revLevelMin,
          totalNetRev: summaryTotalNetRev,
          totalSalary,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to retrieve appointments',
      });
    }
  });

  // GET /api/customers/booking-slots
  // Calculate slot available matrix based on core shift tables and wingsctrl_appointments
  fastify.get('/customers/booking-slots', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date, storeName, technicianId } = request.query as {
      date?: string;
      storeName?: string;
      technicianId?: string;
    };

    if (!date || !storeName) {
      return reply.status(400).send({ error: 'Bad Request', message: 'date and storeName are required' });
    }

    try {
      const storeNameToIdMap: { [name: string]: number } = {
        'De Tham': 6,
        'Estella Place': 16,
        'Phan Xích Long': 2,
        PXL: 2,
      };
      const storeId = storeNameToIdMap[storeName] || 6;

      // 1. Fetch Roster from core shift tables
      let roster: SafeAny[] = [];
      const dayOfWeek = new Date(date).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      // Check if actual instantiated shifts exist for this date and store
      const instantiatedShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT sws.user_id, CAST(sws.start_time AS CHAR) as start_time_str, CAST(sws.end_time AS CHAR) as end_time_str, up.full_name
         FROM staff_working_shift sws
         JOIN user_profile up ON sws.user_id = up.user_id
         WHERE sws.date = ? AND sws.client_store_id = ? AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
        date,
        storeId
      );

      if (instantiatedShifts.length > 0) {
        roster = instantiatedShifts.map((s) => ({
          staff_name: s.full_name,
          shift_start: s.start_time_str,
          shift_end: s.end_time_str,
        }));
      } else {
        // Fall back to schedule templates
        const schedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT s.user_id, s.type, s.type_value, CAST(s.start_time AS CHAR) as start_time_str, CAST(s.end_time AS CHAR) as end_time_str, up.full_name
           FROM staff_working_shift_schedule s
           JOIN user_profile up ON s.user_id = up.user_id
           WHERE s.is_disabled = 0 
             AND (s.client_store_id = ? OR ((s.client_store_id = 4 OR s.client_store_id IS NULL) AND up.client_store_id = ?))
             AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
          storeId,
          storeId
        );

        // Filter schedules matching today's weekday / all days
        const matchedSchedules = schedules.filter((s) => {
          if (s.type === 'Day' && s.type_value === 'All') return true;
          if (s.type === 'Weekday' && s.type_value === weekdayStr) return true;
          return false;
        });

        // Filter out KTVs who requested day-off
        const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved'`,
          date
        );
        const offUserIds = dayOffs.map((d) => Number(d.from_user_id));

        roster = matchedSchedules
          .filter((s) => !offUserIds.includes(Number(s.user_id)))
          .map((s) => ({
            staff_name: s.full_name,
            shift_start: s.start_time_str,
            shift_end: s.end_time_str,
          }));
      }

      // If technicianId is provided, filter the roster to only contain that KTV
      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          roster = roster.filter((r) => r.staff_name === ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) },
          });
          if (staff) {
            roster = roster.filter((r) => r.staff_name === staff.displayName);
          }
        }
      }

      // 2. Fetch Appointments
      let apptsQuery = `SELECT time_start, duration 
                        FROM wingsctrl_appointments 
                        WHERE store = ? AND DATE(time_start) = ? AND status != 'cancelled'`;
      const apptsParams: SafeAny[] = [storeName, date];

      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          apptsQuery += ` AND specialist_name = ?`;
          apptsParams.push(ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) },
          });
          if (staff) {
            apptsQuery += ` AND specialist_name = ?`;
            apptsParams.push(staff.displayName);
          }
        }
      }

      const appointments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(apptsQuery, ...apptsParams);

      // 3. Generate slots (09:00 to 20:00, every 15m)
      const matrix: { [time: string]: { available: number; roster: number } } = {};
      let current = new Date(`${date}T09:00:00Z`);
      const end = new Date(`${date}T20:15:00Z`);

      while (current < end) {
        const timeStr = current.toISOString().split('T')[1].slice(0, 5);

        // Calculate active roster count at this slot time
        const activeRoster = roster.filter((r) => {
          let rStart = '';
          if (r.shift_start instanceof Date) {
            rStart = r.shift_start.toISOString().split('T')[1].slice(0, 5);
          } else if (typeof r.shift_start === 'string') {
            rStart = r.shift_start.slice(0, 5);
          } else if (r.shift_start && typeof r.shift_start.toISOString === 'function') {
            rStart = r.shift_start.toISOString().split('T')[1].slice(0, 5);
          }

          let rEnd = '';
          if (r.shift_end instanceof Date) {
            rEnd = r.shift_end.toISOString().split('T')[1].slice(0, 5);
          } else if (typeof r.shift_end === 'string') {
            rEnd = r.shift_end.slice(0, 5);
          } else if (r.shift_end && typeof r.shift_end.toISOString === 'function') {
            rEnd = r.shift_end.toISOString().split('T')[1].slice(0, 5);
          }

          return rStart <= timeStr && timeStr < rEnd;
        });

        // Calculate active appointments at this slot time
        const activeAppointments = appointments.filter((a) => {
          const aStartStr = new Date(a.time_start).toISOString().split('T')[1].slice(0, 5);
          const aStart = new Date(a.time_start);
          const aEnd = new Date(aStart.getTime() + a.duration * 60000);
          const aEndStr = aEnd.toISOString().split('T')[1].slice(0, 5);
          return aStartStr <= timeStr && timeStr < aEndStr;
        });

        const rosterCount = activeRoster.length;
        const bookedCount = activeAppointments.length;
        const available = rosterCount - bookedCount;

        matrix[timeStr] = {
          available,
          roster: rosterCount,
        };

        // Advance by 15 mins
        current = new Date(current.getTime() + 15 * 60000);
      }

      return matrix;
    } catch (error) {
      fastify.log.error(error as Error, 'Calculate booking slots error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to calculate booking slots' });
    }
  });
}
