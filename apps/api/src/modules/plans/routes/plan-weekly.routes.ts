import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CustomerAccessService } from '../../customers/services/customer-access.service.js';

export function registerPlanWeeklyRoutes(fastify: FastifyInstance): void {
  // GET /api/plans/weekly
  // Fetch weekly timeline grid (Mon-Sun) of plans for currently logged in staff
  fastify.get('/plans/weekly', { preHandler: [requireAuth] }, async (request, reply) => {
    const { weekStart } = request.query as { weekStart?: string };
    const user = request.user as { id: number; role?: string };

    // Parse weekStart date, default to current week's Monday
    let monday = new Date();
    if (weekStart) {
      monday = new Date(weekStart);
    } else {
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      monday.setDate(diff);
    }
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    try {
      // 1. Get all daily plans of this staff in this week
      let plans = await fastify.prisma.crm.crmDailyPlan.findMany({
        where: {
          staffId: user.id,
          plannedDate: {
            gte: monday,
            lte: sunday,
          },
        },
        orderBy: {
          plannedDate: 'asc',
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

      if (plans.length === 0) {
        return [];
      }

      // Unique user IDs from plans
      const legacyUserIds = Array.from(new Set(plans.map((p) => p.legacyUserId)));

      // 2. Fetch customer details from legacy DB in batch
      const placeholder = legacyUserIds.map(() => '?').join(',');
      const customersQuery = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          (
            SELECT COALESCE(SUM(o.total_price), 0)
            FROM \`order\` o
            WHERE o.user_id = u.id AND o.order_state = 'Completed'
          ) as totalSpent,
          (
            SELECT COUNT(*)
            FROM \`order\` o
            WHERE o.user_id = u.id AND o.order_state = 'Completed'
          ) as totalVisits,
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
        WHERE u.id IN (${placeholder})
      `;

      const customersData = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customersQuery, ...legacyUserIds);

      // 3. Fetch call logs created in this week for these users
      const callLogs = await fastify.prisma.crm.crmCallLog.findMany({
        where: {
          legacyUserId: { in: legacyUserIds },
          createdAt: {
            gte: monday,
            lte: sunday,
          },
        },
        orderBy: {
          createdAt: 'asc', // Oldest to newest so that latest call log is mapped last
        },
      });

      // 4. Fetch order checkins in this week for these users
      // Formulate week range in YYYY-MM-DD
      const startStr = monday.toLocaleDateString('en-CA');
      const endStr = sunday.toLocaleDateString('en-CA');
      const ordersQuery = `
        SELECT id, user_id, date_created
        FROM \`order\`
        WHERE user_id IN (${placeholder})
          AND order_state = 'Completed'
          AND date_created >= ?
          AND date_created <= ?
      `;
      const ordersData = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        ordersQuery,
        ...legacyUserIds,
        `${startStr} 00:00:00`,
        `${endStr} 23:59:59`
      );

      // Create a map of user profiles for fast lookup
      const customerMap = new Map();
      customersData.forEach((row) => {
        customerMap.set(Number(row.id), {
          id: Number(row.id),
          name: row.name,
          phone: row.phone,
          email: row.email,
          gender: row.gender,
          dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          totalSpent: Math.round(Number(row.totalSpent || 0)),
          totalVisits: Number(row.totalVisits || 0),
          bucket: row.bucket,
          comboBalance:
            row.bucket !== 'SINGLE'
              ? {
                  normalCount: Number(row.normalCount || 0),
                  retainCount: Number(row.retainCount || 0),
                  expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
                }
              : null,
        });
      });

      // Map everything to CustomerWeeklyProgress
      // Group plans by user first
      const userPlansMap = new Map<number, typeof plans>();
      plans.forEach((p) => {
        const uPlans = userPlansMap.get(p.legacyUserId) || [];
        uPlans.push(p);
        userPlansMap.set(p.legacyUserId, uPlans);
      });

      const result = legacyUserIds.map((uid) => {
        const customer = customerMap.get(uid) || {
          id: uid,
          name: 'Khách hàng #' + uid,
          phone: '',
          email: null,
          gender: null,
          dob: null,
          lastVisit: null,
          daysSinceLastVisit: null,
          totalSpent: 0,
          totalVisits: 0,
          bucket: 'SINGLE',
          comboBalance: null,
        };

        const uPlans = userPlansMap.get(uid) || [];
        // Is confirmed if any plan for this user this week has status === 'CONFIRM'
        const isConfirmed = uPlans.some((p) => p.status === 'CONFIRM');
        const confirmPlan = uPlans.find((p) => p.status === 'CONFIRM');

        // Build 7 daily activities (Monday = 0, Sunday = 6)
        const dailyActivities = Array.from({ length: 7 }).map((_, idx) => {
          const currentDate = new Date(monday);
          currentDate.setDate(monday.getDate() + idx);
          const dateStr = currentDate.toLocaleDateString('en-CA');

          // Check if there was a call on this date
          const dateCallLogs = callLogs.filter((cl) => {
            const clDateStr = new Date(cl.createdAt).toLocaleDateString('en-CA');
            return cl.legacyUserId === uid && clDateStr === dateStr;
          });

          const hasCall = dateCallLogs.length > 0;
          const latestCall = hasCall ? dateCallLogs[dateCallLogs.length - 1] : null;

          // Check checkin
          const dateOrders = ordersData.filter((o) => {
            const oDateStr = new Date(o.date_created).toLocaleDateString('en-CA');
            return Number(o.user_id) === uid && oDateStr === dateStr;
          });

          const hasCheckin = dateOrders.length > 0;
          const orderId = hasCheckin ? Number(dateOrders[0].id) : null;

          return {
            date: dateStr,
            hasCall,
            callOutcome: latestCall?.outcome,
            callResult: latestCall?.callResult,
            note: latestCall?.note,
            hasCheckin,
            orderId,
          };
        });

        return {
          customer,
          dailyActivities,
          isConfirmed,
          confirmTime: confirmPlan ? confirmPlan.createdAt.toISOString() : null,
          planId: uPlans[0]?.id, // Return the first plan ID found for this week
        };
      });

      return result;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Weekly timeline error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve weekly timeline',
      });
    }
  });
}
