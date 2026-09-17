import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { resolveIsForeign } from '../services/foreign-customer.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { BookingReschedulePermissionService } from '../services/booking-reschedule-permission.service.js';
import { ComboRecognitionService } from '../services/combo-recognition.service.js';
import { TeamService } from '../../teams/team.service.js';
import { createRouteHelpers } from './helpers.js';

export async function registerCustomerDetailRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // DELETE /api/customers/:id
  // Soft delete a customer by setting is_deleted = 1
  fastify.delete('/customers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number };
    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép xóa khách hàng.' });
    }

    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    try {
      // 1. Verify user exists in the user table
      const users = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`user\` WHERE id = ?`,
        customerId
      );

      if (users.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy khách hàng trên hệ thống.' });
      }

      // 2. Check if user_profile row exists
      const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user_profile WHERE user_id = ?`,
        customerId
      );

      if (profiles.length > 0) {
        // Update is_deleted to 1
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE user_profile SET is_deleted = 1 WHERE user_id = ?`,
          customerId
        );
      } else {
        // Insert a new user_profile row with is_deleted = 1
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user_profile (
            client_id, 
            user_id, 
            language_id, 
            user_group_id, 
            access_user_group_ids, 
            provider, 
            is_academy, 
            is_temporary, 
            is_disabled, 
            is_leaved, 
            is_deleted, 
            date_created
          ) VALUES (
            11, ?, 1, 12, '12', 'System', 0, 0, 0, 0, 1, NOW()
          )`,
          customerId
        );
      }

      return reply.send({ success: true, customerId });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Delete customer error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể xóa khách hàng.' });
    }
  });

  // POST /api/customers/bulk-delete
  // Soft delete multiple customers by setting is_deleted = 1
  fastify.post('/customers/bulk-delete', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number };
    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép xóa khách hàng.' });
    }

    const { ids } = request.body as { ids: number[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Danh sách ID khách hàng không hợp lệ.' });
    }

    const customerIds = ids.map((id) => parseInt(id as SafeAny, 10)).filter((id) => !isNaN(id));
    if (customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Danh sách ID khách hàng không chứa ID hợp lệ.' });
    }

    try {
      const count = await fastify.prisma.legacy.$transaction(async (tx) => {
        let deletedCount = 0;
        for (const customerId of customerIds) {
          // 1. Verify user exists in the user table
          const users = await tx.$queryRawUnsafe<SafeAny[]>(`SELECT id FROM \`user\` WHERE id = ?`, customerId);

          if (users.length === 0) {
            continue;
          }

          // 2. Check if user_profile row exists
          const profiles = await tx.$queryRawUnsafe<SafeAny[]>(
            `SELECT id FROM user_profile WHERE user_id = ?`,
            customerId
          );

          if (profiles.length > 0) {
            // Update is_deleted to 1
            await tx.$executeRawUnsafe(`UPDATE user_profile SET is_deleted = 1 WHERE user_id = ?`, customerId);
          } else {
            // Insert a new user_profile row with is_deleted = 1
            await tx.$executeRawUnsafe(
              `INSERT INTO user_profile (
                client_id, 
                user_id, 
                language_id, 
                user_group_id, 
                access_user_group_ids, 
                provider, 
                is_academy, 
                is_temporary, 
                is_disabled, 
                is_leaved, 
                is_deleted, 
                date_created
              ) VALUES (
                11, ?, 1, 12, '12', 'System', 0, 0, 0, 0, 1, NOW()
              )`,
              customerId
            );
          }
          deletedCount++;
        }
        return deletedCount;
      });

      return reply.send({ success: true, count });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Bulk delete customers error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể xóa hàng loạt khách hàng.',
      });
    }
  });

  // POST /api/customers/:id/restore
  // Restore a soft-deleted customer by setting is_deleted = 0
  fastify.post('/customers/:id/restore', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number };
    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép khôi phục khách hàng.' });
    }

    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    try {
      // 1. Verify user exists in the user table
      const users = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`user\` WHERE id = ?`,
        customerId
      );

      if (users.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy khách hàng trên hệ thống.' });
      }

      // 2. Check if user_profile row exists
      const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user_profile WHERE user_id = ?`,
        customerId
      );

      if (profiles.length > 0) {
        // Update is_deleted to 0
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE user_profile SET is_deleted = 0 WHERE user_id = ?`,
          customerId
        );
      } else {
        // Insert a new user_profile row with is_deleted = 0
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user_profile (
            client_id, 
            user_id, 
            language_id, 
            user_group_id, 
            access_user_group_ids, 
            provider, 
            is_academy, 
            is_temporary, 
            is_disabled, 
            is_leaved, 
            is_deleted, 
            date_created
          ) VALUES (
            11, ?, 1, 12, '12', 'System', 0, 0, 0, 0, 0, NOW()
          )`,
          customerId
        );
      }

      return reply.send({ success: true, customerId });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Restore customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể khôi phục khách hàng.',
      });
    }
  });

  // GET /api/customers/:id
  // Return detailed customer info
  fastify.get('/customers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const sql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
          COALESCE(up.is_deleted, 0) as isDeleted,
          COALESCE(uc.phone_number, '') as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          CASE
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE u.id = ?
        LIMIT 1
      `;

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, customerId);

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }

      const row = result[0];
      const customer = {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        gender: row.gender,
        dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
        lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
        daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
        bucket: row.bucket as BucketType,
        comboBalance:
          row.bucket !== 'SINGLE'
            ? {
                normalCount: Number(row.normalCount || 0),
                retainCount: Number(row.retainCount || 0),
                expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
              }
            : null,
        avatar: row.avatar,
        isDeleted: row.isDeleted === 1,
      };

      return customer;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer by id error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer',
      });
    }
  });

  // GET /api/customers/:id/history
  // Lịch sử order + dịch vụ tương ứng
  fastify.get('/customers/:id/history', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      // Query completed orders for the customer
      const sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as dateCreated,
          o.total_price as totalPrice,
          o.order_state as orderState,
          o.booking_channels as bookingChannel
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.user_id = ? AND o.order_state = 'Completed'
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 50
      `;

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, customerId);

      const history = result.map((row: SafeAny) => ({
        id: row.id,
        orderKey: row.orderKey,
        dateCreated: new Date(row.dateCreated).toISOString(),
        totalPrice: Number(row.totalPrice || 0),
        orderState: row.orderState,
        bookingChannel: row.bookingChannel,
      }));

      return history;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer order history error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer order history',
      });
    }
  });

  // PUT /api/customers/:id
  // Update customer details in legacy DB (name, email, gender, dob, phones list)
  fastify.put('/customers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    const { name, email, gender, dob, phones, isForeign, is_foreign } = request.body as {
      name: string;
      email: string | null;
      gender: string | null;
      dob: string | null;
      phones: Array<{ id?: number; phone_number: string; is_disabled?: boolean; is_deleted?: boolean }>;
      isForeign?: boolean;
      is_foreign?: boolean;
    };

    if (!name || name.trim() === '') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tên khách hàng không được để trống' });
    }

    try {
      const nameParts = name.trim().split(/\s+/);
      const lastName = nameParts[0] || '';
      const firstName = nameParts.slice(1).join(' ') || '';

      let dobDate: Date | null = null;
      if (dob) {
        dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          dobDate = null;
        }
      }

      const explicitForeign = isForeign !== undefined ? isForeign : is_foreign;
      const profileCount = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, is_foreign_overridden FROM user_profile WHERE user_id = ? LIMIT 1`,
        customerId
      );

      if (profileCount.length > 0) {
        if (typeof explicitForeign === 'boolean') {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE user_profile SET full_name = ?, first_name = ?, last_name = ?, is_foreign = ?, is_foreign_overridden = 1 WHERE user_id = ?`,
            name,
            firstName,
            lastName,
            explicitForeign ? 1 : 0,
            customerId
          );
        } else {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE user_profile SET full_name = ?, first_name = ?, last_name = ? WHERE user_id = ?`,
            name,
            firstName,
            lastName,
            customerId
          );
        }
      } else {
        const randPasscode = Math.random().toString(36).substring(2, 8);
        const initIsForeign = typeof explicitForeign === 'boolean' ? (explicitForeign ? 1 : 0) : 0;
        const initIsOverridden = typeof explicitForeign === 'boolean' ? 1 : 0;
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user_profile (
            user_id, client_id, client_business_id, user_group_id, passcode, provider, 
            first_name, last_name, full_name, client_store_id, is_disabled, 
            is_leaved, is_deleted, date_created, language_id, access_user_group_ids,
            is_academy, is_temporary, is_foreign, is_foreign_overridden
          ) VALUES (?, 11, 1, 1, ?, 'Client', ?, ?, ?, 1, 0, 0, 0, NOW(), 1, '', 0, 0, ?, ?)`,
          customerId,
          randPasscode,
          firstName,
          lastName,
          name,
          initIsForeign,
          initIsOverridden
        );
      }

      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user SET email = ?, gender = ?, date_of_birth = ? WHERE id = ?`,
        email || null,
        gender || null,
        dobDate,
        customerId
      );

      if (Array.isArray(phones)) {
        for (const p of phones) {
          if (p.is_deleted) {
            if (p.id) {
              await fastify.prisma.legacy.$executeRawUnsafe(
                `DELETE FROM user_contact WHERE id = ? AND user_id = ?`,
                p.id,
                customerId
              );
            }
          } else if (p.id) {
            await fastify.prisma.legacy.$executeRawUnsafe(
              `UPDATE user_contact SET phone_number = ?, is_disabled = ? WHERE id = ? AND user_id = ?`,
              p.phone_number,
              p.is_disabled ? 1 : 0,
              p.id,
              customerId
            );
          } else {
            await fastify.prisma.legacy.$executeRawUnsafe(
              `INSERT INTO user_contact (user_id, phone_number, is_disabled, date_created) VALUES (?, ?, ?, NOW())`,
              customerId,
              p.phone_number,
              p.is_disabled ? 1 : 0
            );
          }
        }
      }

      return reply.send({ success: true, message: 'Cập nhật thông tin khách hàng thành công!' });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Update customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi cập nhật thông tin khách hàng.',
      });
    }
  });

  // GET /api/customers/:id/detailed
  // Return complete detailed customer profile, stats, bookings, notes, and call logs
  fastify.get('/customers/:id/detailed', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    let resolvedCustomerId = customerId;

    try {
      // 0. Resolve legacyUserId if customerId is a campaign or assignment record ID
      const userDirect = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`user\` WHERE id = ? LIMIT 1`,
        customerId
      );
      if (userDirect.length === 0) {
        const campCust = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
          where: { id: customerId },
        });
        if (campCust?.legacyUserId) {
          resolvedCustomerId = campCust.legacyUserId;
        } else {
          const assignCust = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
            where: { id: customerId },
          });
          if (assignCust?.legacyUserId) {
            resolvedCustomerId = assignCust.legacyUserId;
          }
        }
      }

      const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
        fastify,
        request.user
      );
      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, resolvedCustomerId)))
        return;

      // 1. Fetch CRM Assignment for Online Consultant
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: resolvedCustomerId },
        include: { staff: true },
      });
      const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

      // 2. Fetch Customer Profile details
      const customerSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
          COALESCE(up.is_deleted, 0) as isDeleted,
          up.is_foreign as is_foreign,
          up.is_foreign_overridden as is_foreign_overridden,
          COALESCE(uc.phone_number, '') as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          CASE
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE u.id = ?
        LIMIT 1
      `;
      const customerResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, resolvedCustomerId);
      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      // Fetch all phone numbers associated with the customer
      const userContacts = await fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: resolvedCustomerId },
      });

      // 3. Fetch Completed Orders for financial and frequency metrics
      const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT o.id, o.order_key as orderKey, o.booking_date_start as bookingDate, o.total_price as totalPrice, o.assigned_staff_id as technicianId, o.created_staff_id as createdStaffId
         FROM \`order\` o
         WHERE o.user_id = ? AND o.order_state = 'Completed'
         ORDER BY o.booking_date_start DESC`,
        customerId
      );

      const totalSpent = Math.round(completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0));
      const totalVisits = completedOrders.length;

      // 4. Calculate Average Visit Frequency (in days)
      let avgFrequency = 0;
      if (completedOrders.length > 1) {
        // Chronological order for calculating distance between consecutive dates
        const sortedBookingDates = [...completedOrders]
          .map((o) => new Date(o.bookingDate).getTime())
          .sort((a, b) => a - b);
        let totalDays = 0;
        for (let i = 1; i < sortedBookingDates.length; i++) {
          totalDays += (sortedBookingDates[i] - sortedBookingDates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Number((totalDays / (sortedBookingDates.length - 1)).toFixed(1));
      }

      // 4b. Fetch tips information from order_payment
      const completedOrderIds = completedOrders.map((o) => Number(o.id));
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

      let totalTips = 0;
      let tipCount = 0;
      completedOrders.forEach((o) => {
        const payInfo = orderPaymentMap.get(Number(o.id));
        if (payInfo && payInfo.tips > 0) {
          totalTips += payInfo.tips;
          tipCount += 1;
        }
      });
      const tipRate = totalVisits > 0 ? Number(((tipCount / totalVisits) * 100).toFixed(1)) : 0;
      const avgTip = tipCount > 0 ? Math.round(totalTips / tipCount) : 0;

      // 5. Fetch Combo Balances & Real Purchase Transactions
      const balanceSql = `
        WITH latest_combo AS (
          SELECT combo_sales.user_id, combo_sales.service_id, MAX(combo_sales.date_created) AS latest_date
          FROM (
            SELECT o3.date_created, osc3.service_id, o3.user_id
            FROM order_service_combo osc3
            JOIN \`order\` o3 ON osc3.order_id = o3.id
            LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
            WHERE o3.user_id = ? AND o3.order_state = 'Completed' AND osc3.total_price > 0
              AND (sp3.service_price_package_key IS NULL OR (
                LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
              ))
            UNION ALL
            SELECT o3.date_created, os3.service_id, o3.user_id
            FROM order_service os3
            JOIN \`order\` o3 ON os3.order_id = o3.id
            LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
            WHERE o3.user_id = ? AND o3.order_state = 'Completed' AND os3.total_price > 0
              AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
              AND (sp3.service_price_package_key IS NULL OR (
                LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
              ))
          ) combo_sales
          GROUP BY combo_sales.user_id, combo_sales.service_id
        )
        SELECT 
          CONCAT('osc_', osc.id) as id,
          osc.service_id as serviceId,
          osc.service_group as serviceGroup,
          CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
          CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
          usb.date_expired as dateExpired,
          o.date_created as dateCreated,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          sp.normal_count as packageNormalCount,
          sp.service_price_package_key as packageKey,
          usb.total_normal_balance_amount as totalNormalBalanceAmount,
          usb.total_retain_balance_amount as totalRetainBalanceAmount,
          osc.total_price as packagePrice,
          up.full_name as creatorStaffName
        FROM order_service_combo osc
        JOIN \`order\` o ON osc.order_id = o.id
        LEFT JOIN service s ON osc.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON osc.service_price_id = sp.id
        LEFT JOIN (
          SELECT order_id, MAX(check_in_staff_id) as check_in_staff_id, MAX(check_out_staff_id) as check_out_staff_id
          FROM order_service
          GROUP BY order_id
        ) os_cc ON os_cc.order_id = o.id
        LEFT JOIN user_profile up ON COALESCE(os_cc.check_out_staff_id, os_cc.check_in_staff_id, o.created_staff_id) = up.user_id
        LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = osc.service_id AND usb.service_price_id = osc.service_price_id
        LEFT JOIN latest_combo ON latest_combo.user_id = o.user_id AND latest_combo.service_id = osc.service_id
        WHERE o.user_id = ? AND o.order_state = 'Completed' AND osc.total_price > 0
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))

        UNION ALL

        SELECT 
          CONCAT('os_', os.id) as id,
          os.service_id as serviceId,
          os.service_group as serviceGroup,
          CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
          CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
          usb.date_expired as dateExpired,
          o.date_created as dateCreated,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          sp.normal_count as packageNormalCount,
          sp.service_price_package_key as packageKey,
          usb.total_normal_balance_amount as totalNormalBalanceAmount,
          usb.total_retain_balance_amount as totalRetainBalanceAmount,
          os.total_price as packagePrice,
          up.full_name as creatorStaffName
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        LEFT JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON os.service_price_id = sp.id
        LEFT JOIN user_profile up ON COALESCE(os.check_out_staff_id, os.check_in_staff_id, o.created_staff_id) = up.user_id
        LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = os.service_id AND usb.service_price_id = os.service_price_id
        LEFT JOIN latest_combo ON latest_combo.user_id = o.user_id AND latest_combo.service_id = os.service_id
        WHERE o.user_id = ? AND o.order_state = 'Completed'
          AND (os.user_service_type = 'combo' OR s.service_group = 'combo')
          AND os.total_price > 0
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))

        UNION ALL

        SELECT 
          CONCAT('usb_', usb.id) as id,
          usb.service_id as serviceId,
          usb.service_group as serviceGroup,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as dateExpired,
          usb.date_created as dateCreated,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          sp.normal_count as packageNormalCount,
          sp.service_price_package_key as packageKey,
          usb.total_normal_balance_amount as totalNormalBalanceAmount,
          usb.total_retain_balance_amount as totalRetainBalanceAmount,
          sp.service_price as packagePrice,
          up.full_name as creatorStaffName
        FROM user_service_balance usb
        LEFT JOIN service s ON usb.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON usb.service_price_id = sp.id
        LEFT JOIN user_profile up ON COALESCE(usb.updated_staff_id, usb.created_staff_id) = up.user_id
        WHERE usb.user_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM order_service_combo osc2 
            JOIN \`order\` o2 ON osc2.order_id = o2.id 
            LEFT JOIN service_price sp2 ON osc2.service_price_id = sp2.id
            WHERE o2.user_id = usb.user_id AND osc2.service_id = usb.service_id AND osc2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND osc2.total_price > 0
              AND (sp2.service_price_package_key IS NULL OR (
                LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
              ))
          )
          AND NOT EXISTS (
            SELECT 1 FROM order_service os2 
            JOIN \`order\` o2 ON os2.order_id = o2.id 
            LEFT JOIN service_price sp2 ON os2.service_price_id = sp2.id
            WHERE o2.user_id = usb.user_id AND os2.service_id = usb.service_id AND os2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND os2.total_price > 0
              AND (os2.user_service_type = 'combo' OR os2.service_group = 'combo')
              AND (sp2.service_price_package_key IS NULL OR (
                LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
              ))
          )
        ORDER BY dateCreated DESC
      `;
      const comboBalances = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        balanceSql,
        customerId,
        customerId,
        customerId,
        customerId,
        customerId
      );

      // Fetch Gem Balance and transactions
      const gemBalanceRow = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
        customerId
      );
      const gemBalance = gemBalanceRow.length > 0 ? Number(gemBalanceRow[0].amount) : 0;

      const gemTransactionsSql = `
        SELECT 
          ubt.id,
          ubt.method,
          ubt.amount,
          ubt.balance,
          ubt.description,
          ubt.template_id as templateId,
          ubt.date_created as dateCreated,
          up.full_name as staffName,
          o.booking_date_start as bookingDateStart,
          up_referred.full_name as referredName
        FROM user_balance_transaction ubt
        LEFT JOIN user_profile up ON ubt.created_staff_id = up.user_id
        LEFT JOIN \`order\` o ON 
          ubt.tracking_key IS NOT NULL AND 
          JSON_VALID(ubt.tracking_key) AND 
          o.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ubt.tracking_key, '$.order_id')) AS UNSIGNED)
        LEFT JOIN user_profile up_referred ON 
          ubt.tracking_key IS NOT NULL AND 
          JSON_VALID(ubt.tracking_key) AND 
          up_referred.user_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ubt.tracking_key, '$.user_id')) AS UNSIGNED)
        WHERE ubt.user_id = ? AND ubt.currency_id = 3
        ORDER BY ubt.date_created DESC
      `;
      const gemTransactions = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(gemTransactionsSql, customerId);

      // Fetch Referrer details (Who referred this customer)
      const referrerRow = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           u.id, 
           up.full_name as name, 
           COALESCE(uc.phone_number, '') as phone
         FROM user u
         LEFT JOIN user_profile up ON u.id = up.user_id
         LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
         WHERE u.id = (SELECT referrer_user_id FROM user_profile WHERE user_id = ? LIMIT 1)
         LIMIT 1`,
        customerId
      );
      const referrer =
        referrerRow.length > 0
          ? {
              id: Number(referrerRow[0].id),
              name: referrerRow[0].name,
              phone: referrerRow[0].phone,
            }
          : null;

      // Fetch Referred Users list (Who this customer referred)
      const referredUsers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           u.id, 
           up.full_name as name, 
           COALESCE(uc.phone_number, '') as phone,
           u.date_created as dateCreated
         FROM user u
         LEFT JOIN user_profile up ON u.id = up.user_id
         LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
         WHERE up.referrer_user_id = ?
         ORDER BY u.id DESC`,
        customerId
      );

      // Fetch referral transactions for this user (where they acted as referrer)
      const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT amount, tracking_key FROM user_balance_transaction 
         WHERE user_id = ? AND template_id = 7 AND currency_id = 3`,
        customerId
      );

      // Map referred user ID to reward amount
      const rewardMap = new Map<number, number>();
      for (const tx of referralTxs) {
        try {
          if (tx.tracking_key) {
            const keyObj = JSON.parse(tx.tracking_key);
            const referredId = Number(keyObj.user_id);
            if (referredId) {
              rewardMap.set(referredId, Number(tx.amount));
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      // Collapse duplicate contacts by user ID
      const friendsGrouped = new Map<number, SafeAny>();
      for (const ru of referredUsers) {
        const friendId = Number(ru.id);
        if (!friendId) continue;

        if (friendsGrouped.has(friendId)) {
          const existing = friendsGrouped.get(friendId);
          if (ru.phone && !existing.phone.includes(ru.phone)) {
            existing.phone = existing.phone ? `${existing.phone}, ${ru.phone}` : ru.phone;
          }
        } else {
          friendsGrouped.set(friendId, {
            id: friendId,
            name: ru.name || 'Khách hàng',
            phone: ru.phone || '',
            dateCreated: ru.dateCreated ? new Date(ru.dateCreated).toISOString() : null,
            rewardDiamonds: rewardMap.get(friendId) || 0,
          });
        }
      }

      const formattedReferred = Array.from(friendsGrouped.values());

      // 6. Fetch Bookings and order services (Optimized)
      const bookingsSql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.booking_date_start as bookingDate,
          o.booking_note as bookingNote,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.assigned_staff_id as technicianId,
          o.client_store_id as storeId,
          o.created_staff_id as createdStaffId,
          COALESCE(csl.client_store_name, 'Estella Place') as branchName,
          up.full_name as assignedTechnicianName
        FROM \`order\` o
        LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN user_profile up ON o.assigned_staff_id = up.user_id
        WHERE o.user_id = ?
        ORDER BY o.booking_date_start DESC
        LIMIT 50
      `;
      const servicesSql = `
        SELECT 
          os.order_id as orderId,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          os.user_service_type as userServiceType
        FROM order_service os
        LEFT JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
        WHERE os.user_id = ?
      `;

      const orderServicesSql = `
        SELECT 
          os.order_id as orderId,
          os.total_price as totalPrice,
          os.service_id as serviceId,
          COALESCE(sl.service_name, s.service_key) as serviceName
        FROM order_service os
        LEFT JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
        WHERE os.user_id = ?
      `;

      const orderCombosSql = `
        SELECT 
          osc.order_id as orderId,
          osc.total_price as totalPrice,
          osc.service_id as serviceId,
          COALESCE(sl.service_name, s.service_key) as serviceName
        FROM order_service_combo osc
        LEFT JOIN service s ON osc.service_id = s.id
        LEFT JOIN service_language sl ON osc.service_id = sl.service_id AND sl.language_id = 1
        WHERE osc.user_id = ?
      `;

      const orderProductsSql = `
        SELECT 
          op.order_id as orderId,
          op.total_price as totalPrice,
          op.product_id as productId,
          COALESCE(pl.product_name, 'Sản phẩm') as productName
        FROM order_product op
        LEFT JOIN product_language pl ON op.product_id = pl.product_id AND pl.language_id = 1
        WHERE op.user_id = ?
      `;

      const [bookingsRaw, servicesRaw, orderServicesRaw, orderCombosRaw, orderProductsRaw] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(bookingsSql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(servicesSql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderServicesSql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderCombosSql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderProductsSql, customerId),
      ]);
      const bookingComboLiveByOrderId = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
        fastify,
        bookingsRaw.map((booking) => Number(booking.id))
      );

      const servicesByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
      for (const os of orderServicesRaw) {
        const orderId = Number(os.orderId);
        const list = servicesByOrderIdDetail.get(orderId) || [];
        list.push({ name: os.serviceName, price: Number(os.totalPrice || 0) });
        servicesByOrderIdDetail.set(orderId, list);
      }

      const combosByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
      for (const oc of orderCombosRaw) {
        const orderId = Number(oc.orderId);
        const list = combosByOrderIdDetail.get(orderId) || [];
        list.push({ name: oc.serviceName, price: Number(oc.totalPrice || 0) });
        combosByOrderIdDetail.set(orderId, list);
      }

      const productsByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
      for (const op of orderProductsRaw) {
        const orderId = Number(op.orderId);
        const list = productsByOrderIdDetail.get(orderId) || [];
        list.push({ name: op.productName, price: Number(op.totalPrice || 0) });
        productsByOrderIdDetail.set(orderId, list);
      }

      const allOrderIds = Array.from(
        new Set([...bookingsRaw.map((b) => Number(b.id)), ...completedOrders.map((o) => Number(o.id))])
      );

      const [orderServicesDetails, auditLogCounts] = await Promise.all([
        allOrderIds.length > 0
          ? fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: allOrderIds } },
              select: {
                order_id: true,
                assigned_staff_id: true,
                check_in_staff_id: true,
                check_out_staff_id: true,
              },
            })
          : Promise.resolve([]),
        allOrderIds.length > 0
          ? fastify.prisma.crm.crmBookingLog.groupBy({
              by: ['orderId'],
              _count: { id: true },
              where: { orderId: { in: allOrderIds } },
            })
          : Promise.resolve([]),
      ]);

      const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));
      const orderServicesByOrderId = new Map<number, SafeAny[]>();
      for (const orderService of orderServicesDetails) {
        const orderId = Number(orderService.order_id);
        const services = orderServicesByOrderId.get(orderId) || [];
        services.push(orderService);
        orderServicesByOrderId.set(orderId, services);
      }

      const staffUserIds = new Set<number>();
      for (const b of bookingsRaw) {
        if (b.technicianId) staffUserIds.add(Number(b.technicianId));
        if (b.createdStaffId) staffUserIds.add(Number(b.createdStaffId));
      }
      for (const o of completedOrders) {
        if (o.technicianId) staffUserIds.add(Number(o.technicianId));
        if (o.createdStaffId) staffUserIds.add(Number(o.createdStaffId));
      }
      for (const os of orderServicesDetails) {
        if (os.assigned_staff_id) staffUserIds.add(Number(os.assigned_staff_id));
        if (os.check_in_staff_id) staffUserIds.add(Number(os.check_in_staff_id));
        if (os.check_out_staff_id) staffUserIds.add(Number(os.check_out_staff_id));
      }

      const staffIdArray = Array.from(staffUserIds);
      const staffProfiles =
        staffIdArray.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, is_disabled as isDisabled, is_leaved as isLeaved, avatar
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `)
          : [];
      const staffNamesMap = new Map<number, string>(staffProfiles.map((s) => [Number(s.userId), s.fullName]));
      const staffAvatarMap = new Map<number, string | null>(
        staffProfiles.map((s) => [Number(s.userId), s.avatar || null])
      );
      const staffInactiveMap = new Map<number, boolean>(
        staffProfiles.map((s) => [
          Number(s.userId),
          s.isDisabled === 1 || s.isDisabled === true || s.isLeaved === 1 || s.isLeaved === true,
        ])
      );

      // Map services to bookings
      const servicesByOrderId = new Map<number, string[]>();
      const serviceStatusesByOrderId = new Map<number, { serviceName: string; userServiceType: string | null }[]>();
      for (const s of servicesRaw) {
        const orderId = Number(s.orderId);
        const list = servicesByOrderId.get(orderId) || [];
        list.push(s.serviceName);
        servicesByOrderId.set(orderId, list);

        const statuses = serviceStatusesByOrderId.get(orderId) || [];
        statuses.push({
          serviceName: String(s.serviceName || 'Dịch vụ'),
          userServiceType: s.userServiceType ? String(s.userServiceType) : null,
        });
        serviceStatusesByOrderId.set(orderId, statuses);
      }

      const formattedBookings = bookingsRaw.map((b) => {
        const orderSvs = orderServicesByOrderId.get(Number(b.id)) || [];
        const rawCheckIn = orderSvs.find((os) => os.check_in_staff_id && os.check_in_staff_id > 0)?.check_in_staff_id;
        const rawCheckOut = orderSvs.find(
          (os) => os.check_out_staff_id && os.check_out_staff_id > 0
        )?.check_out_staff_id;
        const firstCvStaffId =
          b.technicianId || orderSvs.find((os) => os.assigned_staff_id && os.assigned_staff_id > 0)?.assigned_staff_id;
        const rawBooker = b.createdStaffId;

        const isCheckedIn = [
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'ServiceCompleted',
          'CheckOut',
          'Parking',
          'Completed',
        ].includes(b.orderState);
        const isCheckedOut = ['CheckOut', 'Completed'].includes(b.orderState);

        const finalCheckInId = isCheckedIn ? rawCheckIn || rawCheckOut || null : null;
        const finalCheckOutId = isCheckedOut ? rawCheckOut || rawCheckIn || null : null;
        const finalBookerId = rawBooker || null;

        const getStaffDisplayName = (staffId: number | null | undefined) => {
          if (!staffId) return null;
          const name = staffNamesMap.get(Number(staffId));
          if (!name) return null;
          const isInactive = staffInactiveMap.get(Number(staffId));
          return isInactive ? `${name} (Đã nghỉ)` : name;
        };

        const checkinName = getStaffDisplayName(finalCheckInId);
        const checkoutName = getStaffDisplayName(finalCheckOutId);
        const bookerDisplayName = getStaffDisplayName(finalBookerId);
        const technicianName =
          getStaffDisplayName(firstCvStaffId) ||
          (b.assignedTechnicianName &&
          b.assignedTechnicianName !== 'Kỹ thuật viên' &&
          b.assignedTechnicianName !== 'Chuyên viên'
            ? b.assignedTechnicianName
            : null);

        return {
          id: b.id,
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || '',
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          branchName: b.branchName,
          technicianName,
          ccInName: checkinName,
          checkinStaffName: checkinName,
          ccOutName: checkoutName,
          checkoutStaffName: checkoutName,
          bookerName: bookerDisplayName,
          bookerStaffName: bookerDisplayName,
          ccInAvatar: finalCheckInId ? staffAvatarMap.get(Number(finalCheckInId)) || null : null,
          ccOutAvatar: finalCheckOutId ? staffAvatarMap.get(Number(finalCheckOutId)) || null : null,
          bookerAvatar: finalBookerId ? staffAvatarMap.get(Number(finalBookerId)) || null : null,
          technicianId: firstCvStaffId ? Number(firstCvStaffId) : null,
          storeId: b.storeId ? Number(b.storeId) : null,
          services: servicesByOrderId.get(Number(b.id)) || [],
          serviceStatuses: serviceStatusesByOrderId.get(Number(b.id)) || [],
          hasLiveComboAtBooking: bookingComboLiveByOrderId.get(Number(b.id)) || false,
          auditLogCount: auditCountMap.get(Number(b.id)) || 0,
        };
      });

      // 7. Fetch Notes from user_note
      const notesSql = `
        SELECT 
          un.id,
          un.note,
          un.note_field_key as noteFieldKey,
          un.is_sticky as isSticky,
          un.is_issue as isIssue,
          un.date_created as dateCreated,
          COALESCE(up.full_name, 'System') as staffName,
          up.avatar as staffAvatar
        FROM user_note un
        LEFT JOIN user_profile up ON un.created_staff_id = up.user_id
        WHERE un.user_id = ? AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
        ORDER BY un.date_created DESC
      `;
      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, resolvedCustomerId);
      const formattedNotes = notesRaw.map((n) => {
        let safeIsoDate: string | null = null;
        if (n.dateCreated) {
          if (n.dateCreated instanceof Date) {
            safeIsoDate = isNaN(n.dateCreated.getTime()) ? null : n.dateCreated.toISOString();
          } else if (typeof n.dateCreated === 'string') {
            const parsed = new Date(n.dateCreated.replace(' ', 'T'));
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          } else {
            const parsed = new Date(n.dateCreated);
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
        }
        return {
          id: Number(n.id),
          note: n.note || '',
          noteFieldKey: n.noteFieldKey || 'note',
          isSticky: Boolean(n.isSticky),
          isIssue: Boolean(n.isIssue),
          dateCreated: safeIsoDate,
          staffName: n.staffName,
          staffAvatar: n.staffAvatar || null,
        };
      });

      // 8. Fetch CRM Call Logs
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId: resolvedCustomerId },
        orderBy: { createdAt: 'desc' },
      });
      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      });
      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const staffAvatarUrlMap = new Map(staffList.map((s) => [s.id, s.avatarUrl || null]));
      const formattedCalls = logs.map((log) => ({
        id: log.id,
        planId: log.planId,
        callType: log.callType,
        callResult: log.callResult,
        durationSec: log.durationSec,
        note: log.note,
        outcome: log.outcome,
        callbackDate: log.callbackDate ? new Date(log.callbackDate).toISOString().split('T')[0] : null,
        createdAt: log.createdAt.toISOString(),
        staffName: staffMap.get(log.staffId) || 'Unknown Staff',
        staffAvatar: staffAvatarUrlMap.get(log.staffId) || null,
      }));

      const comboWalletBalance = comboBalances.reduce((sum, cb) => {
        return sum + Number(cb.totalNormalBalanceAmount || 0) + Number(cb.totalRetainBalanceAmount || 0);
      }, 0);

      return {
        customer: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          phones: userContacts.map((uc) => ({
            id: uc.id,
            phone_number: uc.phone_number,
            is_disabled: uc.is_disabled,
          })),
          email: row.email,
          gender: row.gender,
          dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          lastCompletedVisit:
            completedOrders.length > 0 && completedOrders[0].bookingDate
              ? new Date(completedOrders[0].bookingDate).toISOString()
              : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          avatar: row.avatar,
          onlineConsultant: onlineConsultantName,
          onlineConsultantId: assigned?.staffId || null,
          isDeleted: row.isDeleted === 1,
          isForeign: resolveIsForeign(row.is_foreign, row.is_foreign_overridden, row.phone),
          isForeignOverridden: Boolean(row.is_foreign_overridden),
        },
        stats: {
          totalSpent: totalSpent,
          totalVisits: totalVisits,
          comboCount: Number(row.normalCount || 0) + Number(row.retainCount || 0),
          comboWalletBalance: comboWalletBalance,
          gemBalance: gemBalance,
          avgFrequency: avgFrequency,
          totalTips: totalTips,
          tipRate: tipRate,
          avgTip: avgTip,
        },
        comboBalances: comboBalances.map((cb) => ({
          id: String(cb.id),
          serviceId: cb.serviceId,
          serviceGroup: cb.serviceGroup,
          normalCount: Number(cb.normalCount),
          retainCount: Number(cb.retainCount),
          dateExpired: cb.dateExpired ? new Date(cb.dateExpired).toISOString() : null,
          dateCreated: cb.dateCreated ? new Date(cb.dateCreated).toISOString() : null,
          serviceKey: cb.serviceKey,
          serviceName: cb.serviceName,
          packageNormalCount: cb.packageNormalCount ? Number(cb.packageNormalCount) : null,
          packageKey: cb.packageKey,
          creatorStaffName: cb.creatorStaffName || null,
          packagePrice: cb.packagePrice ? Number(cb.packagePrice) : null,
        })),
        bookings: formattedBookings,
        notes: formattedNotes,
        calls: formattedCalls,
        gemTransactions: (() => {
          const formatDate = (dateInput: SafeAny) => {
            if (!dateInput) return '';
            const d = new Date(dateInput);
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
          };

          const formatGemDescription = (trans: SafeAny) => {
            if (trans.description && trans.description.trim()) {
              return trans.description;
            }

            const tid = trans.templateId ? Number(trans.templateId) : null;
            const amt = Number(trans.amount || 0);

            switch (tid) {
              case 6:
                return 'Cám ơn đã sử dụng dịch vụ tại Wings (Lần đầu)';
              case 7:
                return trans.referredName
                  ? `Thưởng giới thiệu bạn ${trans.referredName.trim()}`
                  : 'Bạn vừa nhận được kim cương từ việc giới thiệu bạn';
              case 8:
                return trans.bookingDateStart
                  ? `Thanh toán lịch hẹn ngày ${formatDate(trans.bookingDateStart)}`
                  : 'Bạn vừa sử dụng kim cương cho dịch vụ';
              case 12:
                return 'Đăng ký thành công chương trình giới thiệu nhận Kim Cương';
              case 17:
                return 'Trừ kim cương do khách hàng phản hồi cần điều chỉnh (Fix)';
              case 22:
              case 28:
                return trans.staffName
                  ? `Nhận kim cương từ nhân viên ${trans.staffName}`
                  : 'Nhận kim cương từ cửa hàng';
              case 29:
                return 'Chuyển kim cương cho tài khoản khác';
              case 58:
                return 'Mua gói Combo dịch vụ';
              case 60:
                if (trans.bookingDateStart) {
                  return `Tích lũy từ lịch hẹn ngày ${formatDate(trans.bookingDateStart)}`;
                }
                return 'Tích lũy từ lịch hẹn hoàn thành';
              case 91:
                return 'Trừ kim cương từ phản hồi khiếu nại';
              case 92:
              case 93:
                return 'Khấu trừ tài khoản quyết toán định kỳ';
              case 99:
                return 'Thưởng hoàn thành nhiệm vụ nhân viên';
              case 102:
                return 'Hoàn lại kim cương giao dịch';
              case 160:
                return 'Tham gia chương trình/game tích điểm';
              case 164:
                return 'Thưởng hoàn thành game tích điểm';
              case 168:
                return 'Thưởng khách hàng quay lại sớm';
              case 198:
                return 'Quà tặng chúc mừng sinh nhật';
              default:
                return amt < 0 ? 'Giao dịch trừ kim cương' : 'Tích lũy kim cương';
            }
          };

          return gemTransactions.map((t) => ({
            id: Number(t.id),
            method: t.method,
            amount: Number(t.amount),
            balance: Number(t.balance),
            description: formatGemDescription(t),
            dateCreated: t.dateCreated ? new Date(t.dateCreated).toISOString() : null,
            staffName: t.staffName || 'Hệ thống',
          }));
        })(),
        tipTransactions: completedOrders.map((o) => {
          const payInfo = orderPaymentMap.get(Number(o.id));
          const orderSvs = orderServicesByOrderId.get(Number(o.id)) || [];
          const checkOutStaffId = orderSvs.find((os) => os.check_out_staff_id)?.check_out_staff_id;
          const firstCvStaffId = o.technicianId || orderSvs.find((os) => os.assigned_staff_id)?.assigned_staff_id;

          return {
            id: Number(o.id),
            orderKey: o.orderKey,
            bookingDate: o.bookingDate ? new Date(o.bookingDate).toISOString().replace('Z', '+07:00') : null,
            totalPrice: Number(o.totalPrice || 0),
            tipAmount: payInfo ? payInfo.tips : 0,
            technicianName: (() => {
              if (!firstCvStaffId) return null;
              const name = staffNamesMap.get(Number(firstCvStaffId));
              if (!name) return null;
              const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
              return isInactive ? `${name} (Đã nghỉ)` : name;
            })(),
            ccOutName: checkOutStaffId ? staffNamesMap.get(Number(checkOutStaffId)) || null : null,
          };
        }),
        revenueTransactions: completedOrders.map((o) => {
          const payInfo = orderPaymentMap.get(Number(o.id));
          const orderSvs = orderServicesByOrderId.get(Number(o.id)) || [];
          const checkOutStaffId = orderSvs.find((os) => os.check_out_staff_id)?.check_out_staff_id;
          const firstCvStaffId = o.technicianId || orderSvs.find((os) => os.assigned_staff_id)?.assigned_staff_id;

          return {
            id: Number(o.id),
            orderKey: o.orderKey,
            bookingDate: o.bookingDate ? new Date(o.bookingDate).toISOString().replace('Z', '+07:00') : null,
            totalPrice: Number(o.totalPrice || 0),
            tipAmount: payInfo ? payInfo.tips : 0,
            debtAmount: payInfo ? payInfo.debt : 0,
            technicianName: (() => {
              if (!firstCvStaffId) return null;
              const name = staffNamesMap.get(Number(firstCvStaffId));
              if (!name) return null;
              const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
              return isInactive ? `${name} (Đã nghỉ)` : name;
            })(),
            ccOutName: checkOutStaffId ? staffNamesMap.get(Number(checkOutStaffId)) || null : null,
            services: servicesByOrderIdDetail.get(Number(o.id)) || [],
            combos: combosByOrderIdDetail.get(Number(o.id)) || [],
            products: productsByOrderIdDetail.get(Number(o.id)) || [],
          };
        }),
        referrer: referrer,
        referredUsers: formattedReferred,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get detailed customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve detailed customer profile',
      });
    }
  });

  // GET /api/customers/:id/summary
  // Lightweight endpoint returning Customer Profile, KPI stats, and Tab Counts in <150ms
  fastify.get('/customers/:id/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      // 1. Permission check
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: customerId },
        include: { staff: true },
      });
      const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

      // Super Admin inherits the complete Admin customer-detail scope. Keep
      // the assignment boundary only for roles that are not administrators.
      const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
        fastify,
        user
      );
      if (!canRescheduleAnyCustomer) {
        if (
          CustomerAccessService.isTelesales(user) &&
          !(await ensureTelesalesCustomerAccess(request, reply, customerId))
        ) {
          return;
        }

        const isAssignedConsultant = assigned?.staffId === user.id;
        if (!isAssignedConsultant) {
          const isBkCsMember = await TeamService.isActiveCrmStaffMember(
            fastify,
            'BK_CS',
            user.id,
            'ACTIVE_BK_CS_STAFF_CONFIG'
          );

          if (!isBkCsMember) {
            return reply
              .status(403)
              .send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin chi tiết khách hàng này.' });
          }
        }
      }

      // 2. Parallel queries for maximum speed
      const customerSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
          COALESCE(up.is_deleted, 0) as isDeleted,
          up.is_foreign as is_foreign,
          up.is_foreign_overridden as is_foreign_overridden,
          COALESCE(uc.phone_number, '') as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          CASE
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE u.id = ?
        LIMIT 1
      `;

      const [
        customerResult,
        userContacts,
        completedOrders,
        gemBalanceRow,
        bookingCountResult,
        noteCountResult,
        callCount,
        timelineCount,
        referrerRow,
        referredUsers,
        activeComboBalances,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, customerId),
        fastify.prisma.legacy.user_contact.findMany({ where: { user_id: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT o.id, o.booking_date_start as bookingDate, o.total_price as totalPrice
           FROM \`order\` o
           WHERE o.user_id = ? AND o.order_state = 'Completed'
           ORDER BY o.booking_date_start DESC`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM user_note WHERE user_id = ? AND (is_disabled = 0 OR note_field_key = 'order_note')`,
          customerId
        ),
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmAllocationLedgerEvent.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE u.id = (SELECT referrer_user_id FROM user_profile WHERE user_id = ? LIMIT 1)
           LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone, u.date_created as dateCreated
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE up.referrer_user_id = ?
           ORDER BY u.id DESC`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT
             CONCAT('usb_', usb.id) as id,
             usb.service_id as serviceId,
             usb.service_group as serviceGroup,
             usb.normal_count as normalCount,
             usb.retain_count as retainCount,
             usb.date_expired as dateExpired,
             usb.date_created as dateCreated,
             s.service_key as serviceKey,
             COALESCE(sl.service_name, s.service_key) as serviceName,
             sp.normal_count as packageNormalCount,
             sp.service_price_package_key as packageKey,
             usb.total_normal_balance_amount as totalNormalBalanceAmount,
             usb.total_retain_balance_amount as totalRetainBalanceAmount,
             sp.service_price as packagePrice,
             up.full_name as creatorStaffName
           FROM user_service_balance usb
           LEFT JOIN service s ON usb.service_id = s.id
           LEFT JOIN service_language sl ON usb.service_id = sl.service_id AND sl.language_id = 1
           LEFT JOIN service_price sp ON usb.service_price_id = sp.id
           LEFT JOIN user_profile up ON COALESCE(usb.updated_staff_id, usb.created_staff_id) = up.user_id
           WHERE usb.user_id = ?
             AND (COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0
           ORDER BY usb.date_created DESC`,
          customerId
        ),
      ]);

      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      const totalSpent = Math.round(completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0));
      const totalVisits = completedOrders.length;

      let avgFrequency = 0;
      if (completedOrders.length > 1) {
        const sortedBookingDates = [...completedOrders]
          .map((o) => new Date(o.bookingDate).getTime())
          .sort((a, b) => a - b);
        let totalDays = 0;
        for (let i = 1; i < sortedBookingDates.length; i++) {
          totalDays += (sortedBookingDates[i] - sortedBookingDates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Number((totalDays / (sortedBookingDates.length - 1)).toFixed(1));
      }

      // Fetch tip summary from order_payment
      const completedOrderIds = completedOrders.map((o) => Number(o.id));
      let totalTips = 0;
      let tipCount = 0;
      if (completedOrderIds.length > 0) {
        const tipRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT SUM(tip_amount) as totalTips, COUNT(CASE WHEN tip_amount > 0 THEN 1 END) as tipCount
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        if (tipRows.length > 0 && tipRows[0].totalTips) {
          totalTips = Number(tipRows[0].totalTips || 0);
          tipCount = Number(tipRows[0].tipCount || 0);
        }
      }

      const tipRate = totalVisits > 0 ? Number(((tipCount / totalVisits) * 100).toFixed(1)) : 0;
      const avgTip = tipCount > 0 ? Math.round(totalTips / tipCount) : 0;
      const gemBalance = gemBalanceRow.length > 0 ? Number(gemBalanceRow[0].amount) : 0;
      const comboWalletBalance = activeComboBalances.reduce(
        (sum, combo) => sum + Number(combo.totalNormalBalanceAmount || 0) + Number(combo.totalRetainBalanceAmount || 0),
        0
      );

      const bookingCount = Number(bookingCountResult[0]?.cnt || 0);
      const noteCount = Number(noteCountResult[0]?.cnt || 0);

      const referrer =
        referrerRow.length > 0
          ? {
              id: Number(referrerRow[0].id),
              name: referrerRow[0].name,
              phone: referrerRow[0].phone,
            }
          : null;

      const friendsGrouped = new Map<number, SafeAny>();
      for (const ru of referredUsers) {
        const friendId = Number(ru.id);
        if (!friendId) continue;
        if (!friendsGrouped.has(friendId)) {
          friendsGrouped.set(friendId, {
            id: friendId,
            name: ru.name || 'Khách hàng',
            phone: ru.phone || '',
            dateCreated: ru.dateCreated ? new Date(ru.dateCreated).toISOString() : null,
            rewardDiamonds: 0,
          });
        }
      }

      return {
        customer: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          phones: userContacts.map((uc) => ({
            id: uc.id,
            phone_number: uc.phone_number,
            is_disabled: uc.is_disabled,
          })),
          email: row.email,
          gender: row.gender,
          dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          lastCompletedVisit: completedOrders[0]?.bookingDate
            ? new Date(completedOrders[0].bookingDate).toISOString()
            : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          avatar: row.avatar,
          onlineConsultant: onlineConsultantName,
          onlineConsultantId: assigned?.staffId || null,
          isDeleted: row.isDeleted === 1,
          isForeign: resolveIsForeign(row.is_foreign, row.is_foreign_overridden, row.phone),
          isForeignOverridden: Boolean(row.is_foreign_overridden),
        },
        stats: {
          totalSpent,
          totalVisits,
          comboCount: Number(row.normalCount || 0) + Number(row.retainCount || 0),
          comboWalletBalance,
          gemBalance,
          avgFrequency,
          totalTips,
          tipRate,
          avgTip,
        },
        counts: {
          bookingCount,
          noteCount,
          callCount,
          timelineCount,
        },
        comboBalances: activeComboBalances.map((combo) => ({
          ...combo,
          normalCount: Number(combo.normalCount || 0),
          retainCount: Number(combo.retainCount || 0),
          packageNormalCount: combo.packageNormalCount ? Number(combo.packageNormalCount) : null,
          packagePrice: combo.packagePrice ? Math.round(Number(combo.packagePrice)) : null,
          dateExpired: combo.dateExpired ? new Date(combo.dateExpired).toISOString() : null,
          dateCreated: combo.dateCreated ? new Date(combo.dateCreated).toISOString() : null,
        })),
        referrer,
        referredUsers: Array.from(friendsGrouped.values()),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get summary customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer summary',
      });
    }
  });

  // GET /api/customers/:id/bookings
  // Paginated bookings endpoint
  fastify.get('/customers/:id/bookings', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
      fastify,
      request.user
    );
    if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
        customerId
      );
      const totalCount = Number(countResult[0]?.cnt || 0);

      const bookingsSql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.booking_date_start as bookingDate,
          o.booking_note as bookingNote,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.assigned_staff_id as technicianId,
          o.client_store_id as storeId,
          o.created_staff_id as createdStaffId,
          COALESCE(csl.client_store_name, 'Estella Place') as branchName,
          up.full_name as assignedTechnicianName
        FROM \`order\` o
        LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN user_profile up ON o.assigned_staff_id = up.user_id
        WHERE o.user_id = ?
        ORDER BY o.booking_date_start DESC
        LIMIT ? OFFSET ?
      `;

      const bookingsRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        bookingsSql,
        customerId,
        limitNum,
        offset
      );

      const bookingIds = bookingsRaw.map((b) => Number(b.id));
      const bookingComboLiveByOrderId = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(
        fastify,
        bookingIds
      );
      const servicesByOrderId = new Map<number, string[]>();
      const serviceStatusesByOrderId = new Map<number, { serviceName: string; userServiceType: string | null }[]>();
      let orderServicesDetails: SafeAny[] = [];
      let auditLogCounts: SafeAny[] = [];

      if (bookingIds.length > 0) {
        const [servicesRaw, osDetails, logsRes] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT
              os.order_id as orderId,
              COALESCE(sl.service_name, s.service_key) as serviceName,
              os.user_service_type as userServiceType
            FROM order_service os
            LEFT JOIN service s ON os.service_id = s.id
            LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
            WHERE os.order_id IN (${bookingIds.join(',')})
          `),
          fastify.prisma.legacy.order_service.findMany({
            where: { order_id: { in: bookingIds } },
            select: {
              order_id: true,
              assigned_staff_id: true,
              check_in_staff_id: true,
              check_out_staff_id: true,
            },
          }),
          fastify.prisma.crm.crmBookingLog.groupBy({
            by: ['orderId'],
            _count: { id: true },
            where: { orderId: { in: bookingIds } },
          }),
        ]);

        orderServicesDetails = osDetails;
        auditLogCounts = logsRes;
        for (const s of servicesRaw) {
          const orderId = Number(s.orderId);
          const list = servicesByOrderId.get(orderId) || [];
          list.push(s.serviceName);
          servicesByOrderId.set(orderId, list);

          const statuses = serviceStatusesByOrderId.get(orderId) || [];
          statuses.push({
            serviceName: String(s.serviceName || 'Dịch vụ'),
            userServiceType: s.userServiceType ? String(s.userServiceType) : null,
          });
          serviceStatusesByOrderId.set(orderId, statuses);
        }
      }

      const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));
      const orderServicesByOrderId = new Map<number, SafeAny[]>();
      for (const orderService of orderServicesDetails) {
        const orderId = Number(orderService.order_id);
        const services = orderServicesByOrderId.get(orderId) || [];
        services.push(orderService);
        orderServicesByOrderId.set(orderId, services);
      }

      // Collect staff IDs for name lookup
      const staffUserIds = new Set<number>();
      for (const b of bookingsRaw) {
        if (b.technicianId) staffUserIds.add(Number(b.technicianId));
        if (b.createdStaffId) staffUserIds.add(Number(b.createdStaffId));
      }
      for (const os of orderServicesDetails) {
        if (os.assigned_staff_id) staffUserIds.add(Number(os.assigned_staff_id));
        if (os.check_in_staff_id) staffUserIds.add(Number(os.check_in_staff_id));
        if (os.check_out_staff_id) staffUserIds.add(Number(os.check_out_staff_id));
      }

      const staffIdArray = Array.from(staffUserIds);
      const staffProfiles =
        staffIdArray.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, is_disabled as isDisabled, is_leaved as isLeaved
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `)
          : [];

      const staffNamesMap = new Map<number, string>(staffProfiles.map((s) => [Number(s.userId), s.fullName]));
      const staffInactiveMap = new Map<number, boolean>(
        staffProfiles.map((s) => [
          Number(s.userId),
          s.isDisabled === 1 || s.isDisabled === true || s.isLeaved === 1 || s.isLeaved === true,
        ])
      );

      const items = bookingsRaw.map((b) => {
        const orderSvs = orderServicesByOrderId.get(Number(b.id)) || [];
        const rawCheckIn = orderSvs.find((os) => os.check_in_staff_id && os.check_in_staff_id > 0)?.check_in_staff_id;
        const rawCheckOut = orderSvs.find(
          (os) => os.check_out_staff_id && os.check_out_staff_id > 0
        )?.check_out_staff_id;
        const firstCvStaffId =
          b.technicianId || orderSvs.find((os) => os.assigned_staff_id && os.assigned_staff_id > 0)?.assigned_staff_id;
        const rawBooker = b.createdStaffId;

        const isCheckedIn = [
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'Checkout',
          'Payment',
          'ServiceCompleted',
          'Completed',
        ].includes(b.orderState);

        const ccInName = isCheckedIn && rawCheckIn ? staffNamesMap.get(Number(rawCheckIn)) || null : null;
        const ccOutName = isCheckedIn && rawCheckOut ? staffNamesMap.get(Number(rawCheckOut)) || null : null;
        const bookerName = rawBooker ? staffNamesMap.get(Number(rawBooker)) || null : null;

        const technicianName = (() => {
          if (!firstCvStaffId) return null;
          const name = staffNamesMap.get(Number(firstCvStaffId));
          if (!name) return null;
          const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
          return isInactive ? `${name} (Đã nghỉ)` : name;
        })();

        return {
          id: Number(b.id),
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || null,
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          technicianId: firstCvStaffId ? Number(firstCvStaffId) : null,
          technicianName,
          ccInName,
          ccOutName,
          bookerName,
          storeId: b.storeId ? Number(b.storeId) : null,
          branchName: b.branchName,
          services: servicesByOrderId.get(Number(b.id)) || [],
          serviceStatuses: serviceStatusesByOrderId.get(Number(b.id)) || [],
          hasLiveComboAtBooking: bookingComboLiveByOrderId.get(Number(b.id)) || false,
          auditLogCount: auditCountMap.get(Number(b.id)) || 0,
        };
      });

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer bookings error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer bookings',
      });
    }
  });

  // GET /api/customers/:id/calls
  // Paginated call logs endpoint
  fastify.get('/customers/:id/calls', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const [totalCount, logs] = await Promise.all([
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmCallLog.findMany({
          where: { legacyUserId: customerId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        }),
      ]);

      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList =
        staffIds.length > 0
          ? await fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: staffIds } },
              select: { id: true, displayName: true, avatarUrl: true },
            })
          : [];

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const staffAvatarUrlMap = new Map(staffList.map((s) => [s.id, s.avatarUrl || null]));

      const items = logs.map((log) => ({
        id: log.id,
        planId: log.planId,
        callType: log.callType,
        callResult: log.callResult,
        durationSec: log.durationSec,
        note: log.note,
        outcome: log.outcome,
        callbackDate: log.callbackDate ? new Date(log.callbackDate).toISOString().split('T')[0] : null,
        createdAt: log.createdAt.toISOString(),
        staffName: staffMap.get(log.staffId) || 'Unknown Staff',
        staffAvatar: staffAvatarUrlMap.get(log.staffId) || null,
      }));

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer calls error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer calls',
      });
    }
  });
}
