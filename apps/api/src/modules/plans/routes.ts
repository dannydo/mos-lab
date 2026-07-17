import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import fs from 'fs';
import path from 'path';

export async function planRoutes(fastify: FastifyInstance) {
  // POST /api/plans
  // Add a customer to a staff's daily plan
  fastify.post('/plans', { preHandler: [requireAuth] }, async (request, reply) => {
    const { legacyUserId, date } = request.body as { legacyUserId: number; date?: string };
    const user = request.user as { id: number };

    if (!legacyUserId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'legacyUserId is required',
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
    const user = request.user as { id: number };
    const dateStr = new Date().toLocaleDateString('en-CA');
    const today = new Date(dateStr + 'T00:00:00.000Z');

    try {
      const plans = await fastify.prisma.crm.crmDailyPlan.findMany({
        where: {
          staffId: user.id,
          plannedDate: today,
        },
      });
      return plans;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch today plans error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch today plans',
      });
    }
  });

  // GET /api/plans/weekly
  // Fetch weekly timeline grid (Mon-Sun) of plans for currently logged in staff
  fastify.get('/plans/weekly', { preHandler: [requireAuth] }, async (request, reply) => {
    const { weekStart } = request.query as { weekStart?: string };
    const user = request.user as { id: number };

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
      const plans = await fastify.prisma.crm.crmDailyPlan.findMany({
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
          totalSpent: Number(row.totalSpent || 0),
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

  // GET /api/plans/suggest
  // Auto-suggest customers matching touchpoint buckets and campaigns
  fastify.get('/plans/suggest', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number };
    try {
      // 1. Read cached campaign IDs from JSON
      let comboT7Ids: number[] = [];
      let promoIds: number[] = [];

      try {
        const cachePath = path.join(__dirname, '../../data/campaign-clients.json');
        if (fs.existsSync(cachePath)) {
          const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          comboT7Ids = cacheData.combo_t7 || [];
          promoIds = cacheData.nlc_promo_2 || [];
        }
      } catch (err) {
        fastify.log.warn('Could not read campaign cache: ' + err);
      }

      // Helper function to build lists
      const queryList = async (sql: string, params: SafeAny[] = []) => {
        const data = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ...params);
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          comboBalance:
            row.bucket !== 'SINGLE'
              ? {
                  normalCount: Number(row.normalCount || 0),
                  retainCount: Number(row.retainCount || 0),
                  expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
                }
              : null,
        }));
      };

      // Query builders
      const happyCallSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
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
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE DATEDIFF(NOW(), up.last_order_booking) = 1
        LIMIT 10
      `;

      const single21dSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'SINGLE' as bucket,
          null as normalCount,
          null as retainCount,
          null as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE usb.id IS NULL AND DATEDIFF(NOW(), up.last_order_booking) BETWEEN 19 AND 21
        LIMIT 10
      `;

      const combo25dSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'COMBO_LIVE' as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE (usb.normal_count + usb.retain_count) > 0 
          AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) 
          AND DATEDIFF(NOW(), up.last_order_booking) BETWEEN 23 AND 25
        LIMIT 10
      `;

      const singleLostSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'SINGLE' as bucket,
          null as normalCount,
          null as retainCount,
          null as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE usb.id IS NULL AND DATEDIFF(NOW(), up.last_order_booking) >= 22
        ORDER BY daysSinceLastVisit ASC
        LIMIT 10
      `;

      const [happyCall, single21d, combo25d, singleLost] = await Promise.all([
        queryList(happyCallSql),
        queryList(single21dSql),
        queryList(combo25dSql),
        queryList(singleLostSql),
      ]);

      // Fetch active campaigns
      let campaignComboT7: SafeAny[] = [];
      let campaignPromo2: SafeAny[] = [];

      if (comboT7Ids.length > 0) {
        const sliceIds = comboT7Ids.slice(0, 50); // Fetch smaller list
        const place = sliceIds.map(() => '?').join(',');
        campaignComboT7 = await queryList(
          `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
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
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${place})
          LIMIT 10
        `,
          sliceIds
        );
      }

      if (promoIds.length > 0) {
        const sliceIds = promoIds.slice(0, 50);
        const place = sliceIds.map(() => '?').join(',');
        campaignPromo2 = await queryList(
          `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
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
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${place})
          LIMIT 10
        `,
          sliceIds
        );
      }

      // Fetch planned user IDs this week to exclude them
      const currentMonday = new Date();
      const day = currentMonday.getDay();
      const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
      currentMonday.setDate(diff);
      currentMonday.setHours(0, 0, 0, 0);

      const currentSunday = new Date(currentMonday);
      currentSunday.setDate(currentMonday.getDate() + 6);
      currentSunday.setHours(23, 59, 59, 999);

      const plannedThisWeek = await fastify.prisma.crm.crmDailyPlan.findMany({
        where: {
          plannedDate: {
            gte: currentMonday,
            lte: currentSunday,
          },
        },
        select: { legacyUserId: true },
      });
      const plannedUserIds = plannedThisWeek.map((p) => p.legacyUserId);

      const myAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          staffId: user.id,
          NOT: {
            legacyUserId: { in: plannedUserIds },
          },
        },
        take: 30,
        select: { legacyUserId: true },
      });
      const mySuggestedUserIds = myAssignments.map((a) => a.legacyUserId);

      let myCustomers: SafeAny[] = [];
      if (mySuggestedUserIds.length > 0) {
        const placeholder = mySuggestedUserIds.map(() => '?').join(',');
        const myCustomersSql = `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
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
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${placeholder})
        `;
        myCustomers = await queryList(myCustomersSql, mySuggestedUserIds);
      }

      return {
        happyCall,
        single21d,
        combo25d,
        singleLost,
        campaignComboT7,
        campaignPromo2,
        myCustomers,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get suggests error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve suggestions',
      });
    }
  });

  // PUT /api/plans/:id/confirm
  // Confirm an appointment booking on a plan
  fastify.put('/plans/:id/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isConfirmed } = request.body as { isConfirmed: boolean };
    const user = request.user as { id: number };

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
