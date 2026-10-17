import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
import { createRouteHelpers } from './helpers.js';

export async function registerCustomerElsaRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess, ensureTelesalesCustomerMutateAccess } = createRouteHelpers(fastify);

  // POST /api/customers/:id/elsa-reservation
  // Bảo lưu gói combo cho khách hàng (Đưa vào tệp Combo Elsa)
  fastify.post('/customers/:id/elsa-reservation', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!(await ensureTelesalesCustomerMutateAccess(request, reply, customerId))) return;

    const { reason, reservationType = 'FIXED_TERM', endDate, reminderDate, reminderNote } = request.body as {
      reason?: string;
      reservationType?: 'FIXED_TERM' | 'INDEFINITE';
      endDate?: string | null;
      reminderDate?: string;
      reminderNote?: string | null;
    };

    if (!reason || !reason.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Lý do bảo lưu gói combo là bắt buộc' });
    }

    if (reservationType === 'FIXED_TERM' && (!endDate || !endDate.trim())) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Bảo lưu có thời hạn bắt buộc phải có ngày hết hạn bảo lưu',
      });
    }

    if (!reminderDate || !reminderDate.trim()) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Combo Elsa bắt buộc phải có ngày nhắc hẹn (reminder) để chăm sóc đặc biệt',
      });
    }

    try {
      const user = request.user as { id: number; displayName?: string; username?: string };
      const staffName = user.displayName || user.username || 'Hệ thống';

      // 1. Cancel any existing ACTIVE reservation for this customer
      await fastify.prisma.crm.crmCustomerElsaReservation.updateMany({
        where: { legacyUserId: customerId, status: 'ACTIVE' },
        data: {
          status: 'CANCELLED',
          releaseNote: 'Hệ thống ghi nhận lượt bảo lưu Elsa mới',
        },
      });

      // 2. Create new active reservation
      const reservation = await fastify.prisma.crm.crmCustomerElsaReservation.create({
        data: {
          legacyUserId: customerId,
          status: 'ACTIVE',
          reservationType,
          reason: reason.trim(),
          startDate: new Date(),
          endDate: reservationType === 'INDEFINITE' ? null : new Date(endDate!),
          reminderDate: new Date(reminderDate),
          reminderNote: reminderNote ? reminderNote.trim() : null,
          createdByStaffId: user.id || null,
          createdByStaffName: staffName,
        },
      });

      // Clear customer caches
      fastify.cache?.clear?.();

      return reply.status(201).send({
        success: true,
        data: reservation,
        message: 'Đã bảo lưu gói combo và chuyển khách hàng sang tệp Combo Elsa thành công',
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Create Elsa reservation error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tạo bảo lưu Combo Elsa',
      });
    }
  });

  // PUT /api/customers/:id/elsa-reservation
  // Cập nhật thông tin bảo lưu Elsa đang hoạt động
  fastify.put('/customers/:id/elsa-reservation', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!(await ensureTelesalesCustomerMutateAccess(request, reply, customerId))) return;

    const { reason, reservationType, endDate, reminderDate, reminderNote, isReminderDismissed } = request.body as {
      reason?: string;
      reservationType?: 'FIXED_TERM' | 'INDEFINITE';
      endDate?: string | null;
      reminderDate?: string;
      reminderNote?: string | null;
      isReminderDismissed?: boolean;
    };

    try {
      const active = await fastify.prisma.crm.crmCustomerElsaReservation.findFirst({
        where: { legacyUserId: customerId, status: 'ACTIVE' },
        orderBy: { id: 'desc' },
      });

      if (!active) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Khách hàng hiện không có gói bảo lưu Elsa nào đang hoạt động',
        });
      }

      const updateData: SafeAny = {};
      if (reason !== undefined) updateData.reason = reason.trim();
      if (reservationType !== undefined) {
        updateData.reservationType = reservationType;
        if (reservationType === 'INDEFINITE') {
          updateData.endDate = null;
        }
      }
      if (endDate !== undefined) {
        updateData.endDate = endDate ? new Date(endDate) : null;
      }
      if (reminderDate !== undefined) {
        updateData.reminderDate = new Date(reminderDate);
      }
      if (reminderNote !== undefined) {
        updateData.reminderNote = reminderNote ? reminderNote.trim() : null;
      }
      if (isReminderDismissed !== undefined) {
        updateData.isReminderDismissed = Boolean(isReminderDismissed);
      }

      const updated = await fastify.prisma.crm.crmCustomerElsaReservation.update({
        where: { id: active.id },
        data: updateData,
      });

      fastify.cache?.clear?.();

      return reply.send({
        success: true,
        data: updated,
        message: 'Đã cập nhật thông tin bảo lưu Combo Elsa thành công',
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Update Elsa reservation error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể cập nhật bảo lưu Combo Elsa',
      });
    }
  });

  // POST /api/customers/:id/elsa-reservation/release
  // Rã đông / Mở lại combo cho khách hàng
  fastify.post('/customers/:id/elsa-reservation/release', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!(await ensureTelesalesCustomerMutateAccess(request, reply, customerId))) return;

    const { releaseNote } = (request.body as { releaseNote?: string }) || {};

    try {
      const user = request.user as { id: number; displayName?: string; username?: string };
      const staffName = user.displayName || user.username || 'Hệ thống';

      const result = await fastify.prisma.crm.crmCustomerElsaReservation.updateMany({
        where: { legacyUserId: customerId, status: 'ACTIVE' },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releasedByStaffId: user.id || null,
          releasedByStaffName: staffName,
          releaseNote: releaseNote ? releaseNote.trim() : 'Mở lại gói combo (Rã đông)',
        },
      });

      if (result.count === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Khách hàng không có lượt bảo lưu Combo Elsa nào đang kích hoạt',
        });
      }

      fastify.cache?.clear?.();

      return reply.send({
        success: true,
        message: 'Đã mở lại gói combo (rã đông Elsa) thành công',
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Release Elsa reservation error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể mở lại gói bảo lưu Combo Elsa',
      });
    }
  });

  // GET /api/customers/:id/elsa-reservation
  // Lấy chi tiết bảo lưu hiện tại và lịch sử bảo lưu của khách
  fastify.get('/customers/:id/elsa-reservation', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const active = await fastify.prisma.crm.crmCustomerElsaReservation.findFirst({
        where: {
          legacyUserId: customerId,
          status: 'ACTIVE',
        },
        orderBy: { id: 'desc' },
      });

      const history = await fastify.prisma.crm.crmCustomerElsaReservation.findMany({
        where: { legacyUserId: customerId },
        orderBy: { id: 'desc' },
        take: 20,
      });

      return reply.send({
        success: true,
        data: {
          active,
          history,
        },
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer Elsa reservation error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy thông tin bảo lưu Elsa',
      });
    }
  });

  // GET /api/customers/elsa/reminders
  // Lấy danh sách lịch nhắc chăm sóc đặc biệt khách hàng Elsa
  fastify.get('/customers/elsa/reminders', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dueOnly, limit = '20', page = '1' } = request.query as {
      dueOnly?: string;
      limit?: string;
      page?: string;
    };

    const limitNum = parseInt(limit, 10) || 20;
    const pageNum = parseInt(page, 10) || 1;
    const offset = (pageNum - 1) * limitNum;

    try {
      const whereClause: SafeAny = {
        status: 'ACTIVE',
      };

      if (dueOnly === 'true') {
        whereClause.reminderDate = { lte: new Date() };
        whereClause.isReminderDismissed = false;
      }

      const [reservations, total] = await Promise.all([
        fastify.prisma.crm.crmCustomerElsaReservation.findMany({
          where: whereClause,
          orderBy: { reminderDate: 'asc' },
          skip: offset,
          take: limitNum,
        }),
        fastify.prisma.crm.crmCustomerElsaReservation.count({ where: whereClause }),
      ]);

      const userIds = reservations.map((r) => r.legacyUserId);
      const customerProfiles =
        userIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT u.id, up.full_name as name, uc.phone_number as phone
               FROM user u
               LEFT JOIN user_profile up ON u.id = up.user_id
               LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
               WHERE u.id IN (${userIds.join(',')})`
            )
          : [];

      const profileMap = new Map(customerProfiles.map((p) => [Number(p.id), p]));

      const data = reservations.map((r) => {
        const profile = profileMap.get(r.legacyUserId);
        return {
          ...r,
          customerName: profile?.name || 'Khách hàng',
          customerPhone: profile?.phone || '',
        };
      });

      return reply.send({
        success: true,
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get Elsa reminders error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy danh sách nhắc hẹn Elsa',
      });
    }
  });
}
