import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CustomerAccessService } from '../../customers/services/customer-access.service.js';

export function registerPlanCrudRoutes(fastify: FastifyInstance): void {
  // POST /api/plans
  // Add a customer to a staff's daily plan
  fastify.post('/plans', { preHandler: [requireAuth] }, async (request, reply) => {
    const { legacyUserId, date } = request.body as { legacyUserId: number; date?: string };
    const user = request.user as { id: number; role?: string };

    if (!legacyUserId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'legacyUserId is required',
      });
    }

    if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, legacyUserId))) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
      });
    }

    const dateStr = (date ? new Date(date) : new Date()).toLocaleDateString('en-CA');
    const plannedDate = new Date(dateStr + 'T00:00:00.000Z');

    try {
      // 1. Check if already planned for this date
      const existing = await fastify.prisma.crm.crmDailyPlan.findFirst({
        where: {
          legacyUserId,
          plannedDate,
        },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Khách hàng này đã có trong kế hoạch gọi ngày hôm nay.',
        });
      }

      // 2. Fetch customer bucket from legacy DB
      const customerRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          CASE
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket
        FROM user u
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE u.id = ?
        LIMIT 1
      `,
        legacyUserId
      );

      const bucket = customerRows[0]?.bucket || 'SINGLE';

      // 3. Create daily plan
      const plan = await fastify.prisma.crm.crmDailyPlan.create({
        data: {
          legacyUserId,
          staffId: user.id,
          plannedDate,
          bucket,
          status: 'PLANNED',
        },
      });

      // 4. Update KPI total planned count using timezone-safe manual upsert
      const todayStr = plannedDate.toISOString().split('T')[0];
      const kpiDate = new Date(todayStr + 'T00:00:00.000Z');

      const kpi = await fastify.prisma.crm.crmStaffKpi.findFirst({
        where: {
          staffId: user.id,
          kpiDate,
        },
      });

      if (kpi) {
        await fastify.prisma.crm.crmStaffKpi.update({
          where: { id: kpi.id },
          data: {
            totalPlanned: { increment: 1 },
          },
        });
      } else {
        await fastify.prisma.crm.crmStaffKpi.create({
          data: {
            staffId: user.id,
            kpiDate,
            totalPlanned: 1,
            totalCalled: 0,
            totalAnswered: 0,
            totalBooked: 0,
            totalRenewed: 0,
          },
        });
      }

      return plan;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Create plan error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to add customer to plan',
      });
    }
  });

  // GET /api/plans/today
  // Fetch all daily plans of this staff for today
  fastify.get('/plans/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role?: string };
    const dateStr = new Date().toLocaleDateString('en-CA');
    const today = new Date(dateStr + 'T00:00:00.000Z');

    try {
      let plans = await fastify.prisma.crm.crmDailyPlan.findMany({
        where: {
          staffId: user.id,
          plannedDate: today,
        },
      });
      if (CustomerAccessService.isTelesales(user)) {
        const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: {
            staffId: user.id,
            legacyUserId: { in: plans.map((plan) => plan.legacyUserId) },
          },
          select: { legacyUserId: true },
        });
        const allowedCustomerIds = new Set(assignments.map((assignment) => assignment.legacyUserId));
        plans = plans.filter((plan) => allowedCustomerIds.has(plan.legacyUserId));
      }
      return plans;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch today plans error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch today plans',
      });
    }
  });

  // PUT /api/plans/:id/confirm
  // Confirm an appointment booking on a plan
  fastify.put('/plans/:id/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isConfirmed } = request.body as { isConfirmed: boolean };
    const user = request.user as { id: number; role?: string };

    const planId = parseInt(id, 10);
    if (isNaN(planId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid plan id',
      });
    }

    try {
      // 1. Find daily plan
      const plan = await fastify.prisma.crm.crmDailyPlan.findUnique({
        where: { id: planId },
      });

      if (!plan || plan.staffId !== user.id) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Plan not found or unauthorized',
        });
      }

      if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, plan.legacyUserId))) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
        });
      }

      const status = isConfirmed ? 'CONFIRM' : 'PLANNED';

      // 2. Update plan status
      const updatedPlan = await fastify.prisma.crm.crmDailyPlan.update({
        where: { id: planId },
        data: { status },
      });

      // 3. Update KPI total booked count using timezone-safe manual upsert
      const planDateStr = new Date(plan.plannedDate).toLocaleDateString('en-CA');
      const kpiDate = new Date(planDateStr + 'T00:00:00.000Z');

      const kpi = await fastify.prisma.crm.crmStaffKpi.findFirst({
        where: {
          staffId: user.id,
          kpiDate,
        },
      });

      if (kpi) {
        await fastify.prisma.crm.crmStaffKpi.update({
          where: { id: kpi.id },
          data: {
            totalBooked: isConfirmed ? { increment: 1 } : { decrement: 1 },
          },
        });
      } else {
        await fastify.prisma.crm.crmStaffKpi.create({
          data: {
            staffId: user.id,
            kpiDate,
            totalPlanned: 0,
            totalCalled: 0,
            totalAnswered: 0,
            totalBooked: isConfirmed ? 1 : 0,
            totalRenewed: 0,
          },
        });
      }

      return updatedPlan;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Confirm plan error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update plan confirmation',
      });
    }
  });
}
