import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';

export async function registerLocaTouchpointRoutes(fastify: FastifyInstance) {
  // POST /api/customers/loca-touchpoint
  fastify.post('/customers/loca-touchpoint', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string; displayName?: string; username?: string };
    const { customerId, touchpointKey, isChecked, note, cycleDate } = request.body as {
      customerId: number;
      touchpointKey: string;
      isChecked: boolean;
      note?: string;
      cycleDate?: string;
    };

    if (!customerId || !touchpointKey) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Thiếu customerId hoặc touchpointKey' });
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
            isChecked,
            checkedAt: isChecked ? new Date() : existing.checkedAt,
            checkedByStaffId: isChecked ? user.id : existing.checkedByStaffId,
            checkedByStaffName: isChecked ? staffName : existing.checkedByStaffName,
            note: note !== undefined ? note : existing.note,
          },
        });
      } else {
        updated = await fastify.prisma.crm.crmLocaTouchpoint.create({
          data: {
            legacyUserId: customerId,
            touchpointKey,
            isChecked,
            checkedAt: isChecked ? new Date() : null,
            checkedByStaffId: isChecked ? user.id : null,
            checkedByStaffName: isChecked ? staffName : null,
            note: note || null,
            cycleDate: new Date(cycleDateStr),
          },
        });
      }

      return reply.send({
        success: true,
        touchpoint: {
          id: updated.id,
          legacyUserId: updated.legacyUserId,
          touchpointKey: updated.touchpointKey,
          isChecked: updated.isChecked,
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
    const { customerIds } = request.query as { customerIds?: string };
    if (!customerIds) {
      return reply.send({ touchpoints: {} });
    }

    const ids = customerIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      return reply.send({ touchpoints: {} });
    }

    try {
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
