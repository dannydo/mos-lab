import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { canAccessLoca, SafeAny } from '@mos-lab/shared';
import { CustomerAccessService } from '../services/customer-access.service.js';

function isLocaRoleAllowed(role?: string): boolean {
  return canAccessLoca(role);
}

export async function registerLocaTouchpointRoutes(fastify: FastifyInstance) {
  // POST /api/customers/loca-touchpoint
  fastify.post('/customers/loca-touchpoint', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string; displayName?: string; username?: string };

    if (!isLocaRoleAllowed(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Bạn không có quyền truy cập Chiến dịch LoCa. Chỉ dành cho Admin, Manager, CS và Control.',
      });
    }
    const { customerId, touchpointKey, isChecked, status, note, cycleDate, callbackDate } = request.body as {
      customerId: number;
      touchpointKey: string;
      isChecked: boolean;
      status?: string | null;
      note?: string;
      cycleDate?: string;
      callbackDate?: string;
    };

    if (!customerId || !touchpointKey) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Thiếu customerId hoặc touchpointKey' });
    }

    if (CustomerAccessService.isTelesales(user)) {
      const canAccessCustomer = await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, customerId);
      if (!canAccessCustomer) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
        });
      }
    }

    try {
      let cycleDateVal: Date | null = cycleDate ? new Date(cycleDate) : null;
      if (!cycleDateVal || isNaN(cycleDateVal.getTime())) {
        // Fallback to customer's last visit date from legacy order table if not provided
        const lastOrder = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COALESCE(ro.actual_booking_date_start, o.booking_date_start) as lastVisit
           FROM \`order\` o
           LEFT JOIN report_order ro ON o.id = ro.order_id
           WHERE o.user_id = ? AND o.order_state = 'Completed'
           ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
           LIMIT 1`,
          customerId
        );
        if (lastOrder && lastOrder.length > 0 && lastOrder[0].lastVisit) {
          cycleDateVal = new Date(lastOrder[0].lastVisit);
        } else {
          cycleDateVal = new Date('1970-01-01');
        }
      }

      // Format cycleDate as YYYY-MM-DD
      const cycleDateStr = cycleDateVal.toISOString().split('T')[0];

      // Find staff name
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { id: true, displayName: true, username: true },
      });
      const staffName = crmStaff?.displayName || crmStaff?.username || user.displayName || user.username || 'Staff';

      // Determine boolean isChecked and status string
      const finalStatus = status === null || status === '' ? null : status || (isChecked ? 'SUCCESS' : null);
      const finalIsChecked = finalStatus !== null || isChecked;

      // Upsert touchpoint record
      const existing = await fastify.prisma.crm.crmLocaTouchpoint.findFirst({
        where: {
          legacyUserId: customerId,
          touchpointKey,
          cycleDate: new Date(cycleDateStr),
        },
      });

      let updated;
      if (existing) {
        updated = await fastify.prisma.crm.crmLocaTouchpoint.update({
          where: { id: existing.id },
          data: {
            isChecked: finalIsChecked,
            status: finalStatus,
            checkedAt: finalIsChecked ? new Date() : null,
            checkedByStaffId: finalIsChecked ? user.id : null,
            checkedByStaffName: finalIsChecked ? staffName : null,
            note: note !== undefined ? note : existing.note,
          },
        });
      } else {
        updated = await fastify.prisma.crm.crmLocaTouchpoint.create({
          data: {
            legacyUserId: customerId,
            touchpointKey,
            isChecked: finalIsChecked,
            status: finalStatus,
            checkedAt: finalIsChecked ? new Date() : null,
            checkedByStaffId: finalIsChecked ? user.id : null,
            checkedByStaffName: finalIsChecked ? staffName : null,
            note: note || null,
            cycleDate: new Date(cycleDateStr),
          },
        });
      }

      // Automatically sync callbackDate to CRM Daily Plan if provided
      if (callbackDate && !isNaN(new Date(callbackDate).getTime())) {
        const cbDate = new Date(callbackDate);
        try {
          await fastify.prisma.crm.crmDailyPlan.upsert({
            where: {
              legacyUserId_plannedDate: {
                legacyUserId: customerId,
                plannedDate: cbDate,
              },
            },
            create: {
              legacyUserId: customerId,
              staffId: user.id,
              plannedDate: cbDate,
              bucket: 'LOCA_CALLBACK',
              priority: 1,
              status: 'PLANNED',
            },
            update: {
              staffId: user.id,
              status: 'PLANNED',
            },
          });
        } catch (e) {
          request.log.error(e, 'Failed to upsert daily plan for loca touchpoint callback');
        }
      }

      return reply.send({
        success: true,
        touchpoint: {
          id: updated.id,
          legacyUserId: updated.legacyUserId,
          touchpointKey: updated.touchpointKey,
          isChecked: updated.isChecked,
          status: updated.status || (updated.isChecked ? 'SUCCESS' : null),
          checkedAt: updated.checkedAt ? updated.checkedAt.toISOString() : null,
          checkedByStaffId: updated.checkedByStaffId,
          checkedByStaffName: updated.checkedByStaffName,
          note: updated.note,
          cycleDate: updated.cycleDate ? updated.cycleDate.toISOString().split('T')[0] : null,
        },
      });
    } catch (err: SafeAny) {
      request.log.error(err, 'Failed to update LoCa touchpoint');
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });

  // GET /api/customers/loca-touchpoints
  fastify.get('/customers/loca-touchpoints', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };
    if (!isLocaRoleAllowed(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Bạn không có quyền truy cập Chiến dịch LoCa. Chỉ dành cho Admin, Manager, CS và Control.',
      });
    }

    const { customerIds } = request.query as { customerIds?: string };
    if (!customerIds) {
      return reply.send({ touchpoints: {} });
    }

    let ids = customerIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      return reply.send({ touchpoints: {} });
    }

    try {
      if (CustomerAccessService.isTelesales(user)) {
        const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: {
            staffId: user.id,
            legacyUserId: { in: ids },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { legacyUserId: true },
        });
        const allowedCustomerIds = new Set(assignments.map((assignment) => assignment.legacyUserId));
        ids = ids.filter((id) => allowedCustomerIds.has(id));
        if (ids.length === 0) {
          return reply.send({ touchpoints: {} });
        }
      }

      const touchpointsList = await fastify.prisma.crm.crmLocaTouchpoint.findMany({
        where: { legacyUserId: { in: ids } },
        orderBy: { updatedAt: 'desc' },
      });

      const touchpointsMap: Record<number, Record<string, SafeAny>> = {};
      touchpointsList.forEach((tp) => {
        if (!touchpointsMap[tp.legacyUserId]) {
          touchpointsMap[tp.legacyUserId] = {};
        }
        if (!touchpointsMap[tp.legacyUserId][tp.touchpointKey]) {
          touchpointsMap[tp.legacyUserId][tp.touchpointKey] = {
            isChecked: tp.isChecked,
            status: tp.status || (tp.isChecked ? 'SUCCESS' : null),
            checkedAt: tp.checkedAt ? tp.checkedAt.toISOString() : null,
            checkedByStaffId: tp.checkedByStaffId,
            checkedByStaffName: tp.checkedByStaffName,
            note: tp.note,
          };
        }
      });

      return reply.send({ touchpoints: touchpointsMap });
    } catch (err: SafeAny) {
      request.log.error(err, 'Failed to get LoCa touchpoints');
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });
}
