import { FastifyInstance } from 'fastify';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { daysSinceVisit } from '../../../projections/customer-visit-projection.service.js';
import { createRouteHelpers } from '../helpers.js';

export async function registerCustomerCrudRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess, ensureTelesalesCustomerMutateAccess } = createRouteHelpers(fastify);

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
            WHEN elsa_res.id IS NOT NULL THEN 'COMBO_ELSA'
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
        LEFT JOIN mos_lab.crm_customer_elsa_reservations elsa_res ON elsa_res.legacy_user_id = u.id AND elsa_res.status = 'ACTIVE' AND (elsa_res.end_date IS NULL OR elsa_res.end_date >= NOW())
        WHERE u.id = ?
        LIMIT 1
      `;

      const [result, lastCompletedOrder, elsaReservation] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDate
           FROM \`order\` o
           LEFT JOIN report_order ro ON o.id = ro.order_id
           WHERE o.user_id = ? AND o.order_state = 'Completed'
           ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
           LIMIT 1`,
          customerId
        ),
        fastify.prisma.crm.crmCustomerElsaReservation.findFirst({
          where: {
            legacyUserId: customerId,
            status: 'ACTIVE',
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          orderBy: { id: 'desc' },
        }),
      ]);

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }

      const row = result[0];
      const latestVisitDate =
        lastCompletedOrder.length > 0 && lastCompletedOrder[0]?.bookingDate ? lastCompletedOrder[0].bookingDate : null;
      const daysSince = latestVisitDate ? daysSinceVisit(latestVisitDate) : null;

      const customer = {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        gender: row.gender,
        dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
        lastVisit: latestVisitDate ? new Date(latestVisitDate).toISOString() : null,
        daysSinceLastVisit: daysSince !== null ? Number(daysSince) : null,
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
        elsaReservation: elsaReservation
          ? {
              id: elsaReservation.id,
              legacyUserId: elsaReservation.legacyUserId,
              status: elsaReservation.status,
              reservationType: elsaReservation.reservationType,
              reason: elsaReservation.reason,
              startDate: elsaReservation.startDate.toISOString(),
              endDate: elsaReservation.endDate ? elsaReservation.endDate.toISOString() : null,
              reminderDate: elsaReservation.reminderDate ? elsaReservation.reminderDate.toISOString() : null,
              reminderNote: elsaReservation.reminderNote,
              isReminderDismissed: elsaReservation.isReminderDismissed,
              createdByStaffId: elsaReservation.createdByStaffId,
              createdByStaffName: elsaReservation.createdByStaffName,
              createdAt: elsaReservation.createdAt.toISOString(),
              updatedAt: elsaReservation.updatedAt.toISOString(),
            }
          : null,
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

    if (!(await ensureTelesalesCustomerMutateAccess(request, reply, customerId))) return;

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
}
