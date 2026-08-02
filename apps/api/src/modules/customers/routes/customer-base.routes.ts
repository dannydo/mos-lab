import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BucketType } from '@mos-lab/shared';

export async function registerCustomerBaseRoutes(fastify: FastifyInstance) {
  // GET /api/customers
  // Query legs DB, compute buckets, handle pagination, search, sorting
  fastify.get(
    '/customers',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Customers'],
        summary: 'Get paginated customers list with bucket filters',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            bucket: { type: 'string' },
            search: { type: 'string' },
            page: { type: 'string' },
            limit: { type: 'string' },
            sort: { type: 'string' },
            daysSinceLastVisitMin: { type: 'string' },
            daysSinceLastVisitMax: { type: 'string' },
            totalSpentMin: { type: 'string' },
            totalSpentMax: { type: 'string' },
            assignedStaffId: { type: 'string' },
            assignedDaysMin: { type: 'string' },
            assignedDaysMax: { type: 'string' },
            dobMonth: { type: 'string' },
            birthdayPreset: { type: 'string' },
            ageMin: { type: 'string' },
            ageMax: { type: 'string' },
            trash: { type: 'string' },
            ids: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        bucket,
        search,
        page = '1',
        limit = '20',
        sort = 'id_desc',
        daysSinceLastVisitMin,
        daysSinceLastVisitMax,
        totalSpentMin,
        totalSpentMax,
        totalVisitsMin,
        totalVisitsMax,
        promoUsed,
        promoCountMin,
        promoCountMax,
        referralUsed,
        referralCountMin,
        referralCountMax,
        assignedStaffId,
        assignedDaysMin,
        assignedDaysMax,
        dobMonth,
        birthdayPreset,
        ageMin,
        ageMax,
        retainedOnly,
        trash,
        ids,
      } = request.query as {
        bucket?: BucketType | 'ALL';
        search?: string;
        page?: string;
        limit?: string;
        sort?: string;
        daysSinceLastVisitMin?: string;
        daysSinceLastVisitMax?: string;
        totalSpentMin?: string;
        totalSpentMax?: string;
        totalVisitsMin?: string;
        totalVisitsMax?: string;
        promoUsed?: 'yes' | 'no' | 'all';
        promoCountMin?: string;
        promoCountMax?: string;
        referralUsed?: 'yes' | 'no' | 'all';
        referralCountMin?: string;
        referralCountMax?: string;
        assignedStaffId?: string;
        assignedDaysMin?: string;
        assignedDaysMax?: string;
        dobMonth?: string;
        birthdayPreset?: 'today' | 'this_month' | 'next_month';
        ageMin?: string;
        ageMax?: string;
        retainedOnly?: string;
        trash?: string;
        ids?: string;
      };

      let limitNum = parseInt(limit, 10) || 20;
      if (ids && ids.trim() !== '') {
        limitNum = ids.split(',').length;
      }
      const pageNum = parseInt(page, 10) || 1;
      const offsetNum = (pageNum - 1) * limitNum;
      const adminUser = request.user as { id: number; role: string };

      // Force telesales to only query their own customers
      let effectiveAssignedStaffId = assignedStaffId;
      if (adminUser.role !== 'admin' && assignedStaffId !== 'unassigned') {
        effectiveAssignedStaffId = 'me';
      }

      try {
        // Determine what joins and select fields we need in the inner query to optimize performance
        const _needContact = search && search.trim() !== '';
        const needServiceBalance = bucket && bucket !== 'ALL';

        const needSpent =
          (totalSpentMin !== undefined && totalSpentMin !== '') ||
          (totalSpentMax !== undefined && totalSpentMax !== '') ||
          sort === 'totalSpent_desc' ||
          sort === 'totalSpent_asc';

        const needVisits =
          (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
          (totalVisitsMax !== undefined && totalVisitsMax !== '');

        const needPromo =
          (promoUsed !== undefined && promoUsed !== 'all') ||
          (promoCountMin !== undefined && promoCountMin !== '') ||
          (promoCountMax !== undefined && promoCountMax !== '');

        const needReferrals =
          (referralUsed !== undefined && referralUsed !== 'all') ||
          (referralCountMin !== undefined && referralCountMin !== '') ||
          (referralCountMax !== undefined && referralCountMax !== '');

        const needOrderCounts = needSpent || needVisits;

        let innerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
        if (needServiceBalance) {
          innerJoins += ` LEFT JOIN (
          SELECT 
            user_id,
            SUM(
              CASE 
                WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
                ELSE 0 
              END
            ) as live_count,
            SUM(normal_count) as normalCount,
            SUM(retain_count) as retainCount,
            MAX(date_expired) as expiryDate
          FROM user_service_balance
          GROUP BY user_id
        ) as usb_agg ON u.id = usb_agg.user_id`;
        }
        if (needOrderCounts) {
          innerJoins += ` LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent, 
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`;
        }
        if (needPromo) {
          innerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
        }
        if (needReferrals) {
          innerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
        }

        let allowedUserIds: number[] | null = null;
        let excludedUserIds: number[] | null = null;

        if (ids && ids.trim() !== '') {
          allowedUserIds = ids
            .split(',')
            .map(Number)
            .filter((n) => !isNaN(n));
        }

        if (
          (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') ||
          (assignedDaysMin !== undefined && assignedDaysMin !== '') ||
          (assignedDaysMax !== undefined && assignedDaysMax !== '')
        ) {
          if (effectiveAssignedStaffId === 'unassigned') {
            const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              select: { legacyUserId: true },
            });
            excludedUserIds = allAssignments.map((a) => a.legacyUserId);
            if (allowedUserIds !== null && excludedUserIds.length > 0) {
              const exSet = new Set(excludedUserIds);
              allowedUserIds = allowedUserIds.filter((id) => !exSet.has(id));
            }
          } else {
            const assignedWhere: SafeAny = {};
            if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
              let targetStaffId = adminUser.id;
              if (effectiveAssignedStaffId !== 'me') {
                targetStaffId = parseInt(effectiveAssignedStaffId, 10);
              }
              if (!isNaN(targetStaffId)) {
                assignedWhere.staffId = targetStaffId;
              }
            } else {
              assignedWhere.staffId = { not: null };
            }
            if (assignedDaysMin !== undefined && assignedDaysMin !== '') {
              const minDays = parseInt(assignedDaysMin, 10);
              if (!isNaN(minDays)) {
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() - minDays);
                maxDate.setHours(23, 59, 59, 999);
                if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
                assignedWhere.assignedAt.lte = maxDate;
              }
            }
            if (assignedDaysMax !== undefined && assignedDaysMax !== '') {
              const maxDays = parseInt(assignedDaysMax, 10);
              if (!isNaN(maxDays)) {
                const minDate = new Date();
                minDate.setDate(minDate.getDate() - maxDays);
                minDate.setHours(0, 0, 0, 0);
                if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
                assignedWhere.assignedAt.gte = minDate;
              }
            }

            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: assignedWhere,
              select: { legacyUserId: true },
            });
            const filterUserIds = assignments.map((a) => a.legacyUserId);
            if (allowedUserIds !== null) {
              const filterSet = new Set(filterUserIds);
              allowedUserIds = allowedUserIds.filter((id) => filterSet.has(id));
            } else {
              allowedUserIds = filterUserIds;
            }
          }
        }

        if (retainedOnly === 'true') {
          const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: { isRetained: true },
            select: { legacyUserId: true },
          });
          const retainedUserIds = retainedAssignments.map((a) => a.legacyUserId);
          if (allowedUserIds !== null) {
            const retSet = new Set(retainedUserIds);
            allowedUserIds = allowedUserIds.filter((id) => retSet.has(id));
          } else {
            allowedUserIds = retainedUserIds;
          }
        }

        if (allowedUserIds !== null && allowedUserIds.length === 0) {
          return {
            data: [],
            pagination: {
              total: 0,
              page: pageNum,
              limit: limitNum,
              pages: 0,
            },
          };
        }

        const innerWhereClauses: string[] = [];
        const innerParams: SafeAny[] = [];

        // Filter out or in deleted users based on trash flag
        if (trash === 'true') {
          innerWhereClauses.push('up.is_deleted = 1');
        } else {
          innerWhereClauses.push('COALESCE(up.is_deleted, 0) = 0');
        }

        if (allowedUserIds !== null) {
          innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
        }
        if (excludedUserIds !== null && excludedUserIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
        }

        // 1. Filter by Search (Name or Phone using EXISTS for contact to avoid GROUP BY)
        if (search && search.trim() !== '') {
          const searchLike = `%${search.trim()}%`;
          innerWhereClauses.push(`(
          up.full_name LIKE ? OR EXISTS (
            SELECT 1 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
          )
        )`);
          innerParams.push(searchLike, searchLike);
        }

        // 2. Filter by Bucket (Optimized using usb_agg joins)
        if (bucket && bucket !== 'ALL') {
          if (bucket === 'SINGLE') {
            innerWhereClauses.push('usb_agg.user_id IS NULL');
          } else if (bucket === 'COMBO_LIVE') {
            innerWhereClauses.push('usb_agg.live_count > 0');
          } else if (bucket === 'COMBO_DEAD') {
            innerWhereClauses.push('usb_agg.user_id IS NOT NULL AND COALESCE(usb_agg.live_count, 0) = 0');
          } else if (bucket === 'NOT_COMBO_LIVE') {
            innerWhereClauses.push(
              "(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0) AND NOT EXISTS (SELECT 1 FROM mos_lab.crm_campaign_customers cc_cust JOIN mos_lab.crm_custom_campaigns cc ON cc.id = cc_cust.campaign_id WHERE cc_cust.legacy_user_id = u.id AND cc_cust.removed_at IS NULL AND cc.status = 'ACTIVE')"
            );
          }
        }

        // 3. daysSinceLastVisit Filters
        if (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') {
          innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) >= ?');
          innerParams.push(parseInt(daysSinceLastVisitMin, 10));
        }
        if (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '') {
          innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) <= ?');
          innerParams.push(parseInt(daysSinceLastVisitMax, 10));
        }

        // 4. totalSpent & totalVisits Filters (using pre-aggregated joins)
        if (totalSpentMin !== undefined && totalSpentMin !== '') {
          innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) >= ?');
          innerParams.push(parseFloat(totalSpentMin));
        }
        if (totalSpentMax !== undefined && totalSpentMax !== '') {
          innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) <= ?');
          innerParams.push(parseFloat(totalSpentMax));
        }

        if (totalVisitsMin !== undefined && totalVisitsMin !== '') {
          innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) >= ?');
          innerParams.push(parseInt(totalVisitsMin, 10));
        }
        if (totalVisitsMax !== undefined && totalVisitsMax !== '') {
          innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) <= ?');
          innerParams.push(parseInt(totalVisitsMax, 10));
        }

        // 5. Promotions and Referrals Filters (using pre-aggregated joins)
        if (promoUsed === 'yes') {
          innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= 1');
        } else if (promoUsed === 'no') {
          innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) = 0');
        }
        if (promoCountMin !== undefined && promoCountMin !== '') {
          innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= ?');
          innerParams.push(parseInt(promoCountMin, 10));
        }
        if (promoCountMax !== undefined && promoCountMax !== '') {
          innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) <= ?');
          innerParams.push(parseInt(promoCountMax, 10));
        }

        if (referralUsed === 'yes') {
          innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= 1');
        } else if (referralUsed === 'no') {
          innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) = 0');
        }
        if (referralCountMin !== undefined && referralCountMin !== '') {
          innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= ?');
          innerParams.push(parseInt(referralCountMin, 10));
        }
        if (referralCountMax !== undefined && referralCountMax !== '') {
          innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) <= ?');
          innerParams.push(parseInt(referralCountMax, 10));
        }

        // 6. Birthday & Age Filters
        if (dobMonth !== undefined && dobMonth !== '' && dobMonth !== 'ALL') {
          innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = ?');
          innerParams.push(parseInt(String(dobMonth), 10));
        }

        if (birthdayPreset === 'today') {
          innerWhereClauses.push(
            'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE()) AND DAY(u.date_of_birth) = DAY(CURDATE())'
          );
        } else if (birthdayPreset === 'this_month') {
          innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE())');
        } else if (birthdayPreset === 'next_month') {
          innerWhereClauses.push(
            'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(ADDDATE(CURDATE(), INTERVAL 1 MONTH))'
          );
        }

        if (ageMin !== undefined && ageMin !== '') {
          innerWhereClauses.push(
            'u.date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) >= ?'
          );
          innerParams.push(parseInt(String(ageMin), 10));
        }
        if (ageMax !== undefined && ageMax !== '') {
          innerWhereClauses.push(
            'u.date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) <= ?'
          );
          innerParams.push(parseInt(String(ageMax), 10));
        }

        const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

        // Sorting
        let innerOrderBy = 'ORDER BY u.id DESC';
        let outerOrderBy = 'ORDER BY id DESC';
        if (sort === 'daysSinceLastVisit_desc') {
          innerOrderBy = 'ORDER BY up.last_order_booking ASC';
          outerOrderBy = 'ORDER BY daysSinceLastVisit DESC';
        } else if (sort === 'daysSinceLastVisit_asc') {
          innerOrderBy = 'ORDER BY up.last_order_booking DESC';
          outerOrderBy = 'ORDER BY daysSinceLastVisit ASC';
        } else if (sort === 'totalSpent_desc') {
          innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) DESC';
          outerOrderBy = 'ORDER BY totalSpent DESC';
        } else if (sort === 'totalSpent_asc') {
          innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) ASC';
          outerOrderBy = 'ORDER BY totalSpent ASC';
        } else if (sort === 'name_asc') {
          innerOrderBy = 'ORDER BY up.full_name ASC';
          outerOrderBy = 'ORDER BY name ASC';
        } else if (sort === 'name_desc') {
          innerOrderBy = 'ORDER BY up.full_name DESC';
          outerOrderBy = 'ORDER BY name DESC';
        }

        const innerQuerySql = `
        SELECT u.id
        FROM user u
        ${innerJoins}
        ${innerWhereString}
        ${innerOrderBy}
      `;

        // 4. Main Query (Optimized raw query using dynamic Deferred Join pagination & usb_agg)
        const querySql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar, 
          (
            SELECT COALESCE(MAX(uc.phone_number), '') 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0
          ) as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          COALESCE(order_counts.totalSpent, 0) as totalSpent,
          COALESCE(order_counts.totalVisits, 0) as totalVisits,
          COALESCE(promo_counts.totalPromotionsUsed, 0) as totalPromotionsUsed,
          COALESCE(ref_counts.totalReferrals, 0) as totalReferrals,
          CASE
            WHEN usb_agg.user_id IS NULL THEN 'SINGLE'
            WHEN usb_agg.live_count > 0 THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          COALESCE(usb_agg.normalCount, 0) as normalCount,
          COALESCE(usb_agg.retainCount, 0) as retainCount,
          usb_agg.expiryDate as expiryDate
        FROM (
          ${innerQuerySql}
          LIMIT ? OFFSET ?
        ) as p
        JOIN user u ON u.id = p.id
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent, 
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id
        LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id
        LEFT JOIN (
          SELECT 
            user_id,
            SUM(
              CASE 
                WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
                ELSE 0 
              END
            ) as live_count,
            SUM(normal_count) as normalCount,
            SUM(retain_count) as retainCount,
            MAX(date_expired) as expiryDate
          FROM user_service_balance
          GROUP BY user_id
        ) as usb_agg ON u.id = usb_agg.user_id
        ${outerOrderBy}
      `;

        // Count Query for Pagination using subquery
        const countSql = `
        SELECT COUNT(*) as total FROM (
          ${innerQuerySql}
        ) as p
      `;

        // Add LIMIT and OFFSET parameters
        const dataParams = [...innerParams, limitNum, offsetNum];
        const countParams = [...innerParams];

        const [dataResult, countResult] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(querySql, ...dataParams),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql, ...countParams),
        ]);

        const total = Number(countResult[0]?.total || 0);

        // Fetch assignments for the returned customers
        const customerIds = dataResult.map((row: SafeAny) => Number(row.id));
        const assignments =
          customerIds.length > 0
            ? await fastify.prisma.crm.crmCustomerAssignment.findMany({
                where: { legacyUserId: { in: customerIds } },
                include: { staff: true },
              })
            : [];

        const assignmentMap = new Map();
        assignments.forEach((a) => {
          if (a.staff) {
            assignmentMap.set(a.legacyUserId, {
              id: a.staff.id,
              displayName: a.staff.displayName,
              username: a.staff.username,
            });
          }
        });

        // Fetch latest bookings for the returned customers
        const latestBookings =
          customerIds.length > 0
            ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
                `SELECT o.user_id as userId, o.booking_date_start as bookingDate, o.order_state as orderState
         FROM \`order\` o
         WHERE o.id IN (
           SELECT MAX(id)
           FROM \`order\`
           WHERE user_id IN (${customerIds.join(',')})
           GROUP BY user_id
           )
         )`
              )
            : [];

        const bookingMap = new Map();
        latestBookings.forEach((b) => {
          bookingMap.set(Number(b.userId), {
            bookingDate: b.bookingDate,
            orderState: b.orderState,
          });
        });

        // Fetch latest call logs with callbacks for the returned customers
        const latestCallbacks =
          customerIds.length > 0
            ? await fastify.prisma.crm.crmCallLog.findMany({
                where: {
                  legacyUserId: { in: customerIds },
                  callbackDate: { not: null },
                },
                orderBy: { createdAt: 'desc' },
              })
            : [];

        const callbackMap = new Map();
        latestCallbacks.forEach((c) => {
          if (!callbackMap.has(c.legacyUserId)) {
            callbackMap.set(c.legacyUserId, c.callbackDate);
          }
        });

        // Fetch latest call logs for the returned customers
        const latestCalls =
          customerIds.length > 0
            ? await fastify.prisma.crm.crmCallLog.findMany({
                where: {
                  legacyUserId: { in: customerIds },
                },
                orderBy: { createdAt: 'desc' },
              })
            : [];

        const latestCallMap = new Map();
        latestCalls.forEach((c) => {
          if (!latestCallMap.has(c.legacyUserId)) {
            latestCallMap.set(c.legacyUserId, {
              createdAt: c.createdAt.toISOString(),
              durationSec: c.durationSec,
              callResult: c.callResult,
              note: c.note,
            });
          }
        });

        // Map raw SQL outputs to clean Customer interface types
        const customers = dataResult.map((row: SafeAny) => {
          const assigned = assignmentMap.get(Number(row.id)) || null;
          const booking = bookingMap.get(Number(row.id)) || null;
          const callbackDateVal = callbackMap.get(Number(row.id)) || null;
          const lastCallVal = latestCallMap.get(Number(row.id)) || null;

          return {
            id: Number(row.id),
            name: row.name,
            phone: row.phone,
            email: row.email,
            gender: row.gender,
            dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
            age: row.age !== null && row.age !== undefined ? Number(row.age) : null,
            lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
            daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
            totalSpent: Number(row.totalSpent || 0),
            totalVisits: Number(row.totalVisits || 0),
            totalPromotionsUsed: Number(row.totalPromotionsUsed || 0),
            totalReferrals: Number(row.totalReferrals || 0),
            bucket: row.bucket as BucketType,
            comboBalance:
              row.bucket !== 'SINGLE'
                ? {
                    normalCount: Number(row.normalCount || 0),
                    retainCount: Number(row.retainCount || 0),
                    expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
                  }
                : null,
            assignedStaff: assigned,
            avatar: row.avatar,
            lastBookingState: booking ? booking.orderState : null,
            lastBookingDate:
              booking && booking.bookingDate
                ? new Date(booking.bookingDate).toISOString().replace('Z', '+07:00')
                : null,
            callbackDate: callbackDateVal ? new Date(callbackDateVal).toISOString().split('T')[0] : null,
            lastCall: lastCallVal,
          };
        });

        return {
          data: customers,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
        };
      } catch (error) {
        fastify.log.error(error as Error, 'Get customers list error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve customers',
        });
      }
    }
  );

  // GET /api/customers/stats
  // Return count per bucket (COMBO_LIVE, COMBO_DEAD, SINGLE)
  fastify.get('/customers/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      bucket,
      search,
      ids,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      trash,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
    } = request.query as {
      bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE';
      search?: string;
      ids?: string;
      daysSinceLastVisitMin?: string;
      daysSinceLastVisitMax?: string;
      totalSpentMin?: string;
      totalSpentMax?: string;
      totalVisitsMin?: string;
      totalVisitsMax?: string;
      promoUsed?: 'yes' | 'no' | 'all';
      promoCountMin?: string;
      promoCountMax?: string;
      referralUsed?: 'yes' | 'no' | 'all';
      referralCountMin?: string;
      referralCountMax?: string;
      assignedStaffId?: string;
      assignedDaysMin?: string;
      assignedDaysMax?: string;
      retainedOnly?: string;
      trash?: string;
      dobMonth?: string;
      birthdayPreset?: 'today' | 'this_month' | 'next_month';
      ageMin?: string;
      ageMax?: string;
    };

    const adminUser = request.user as { id: number; role: string };

    // Force telesales to only query stats for their own customers
    let effectiveAssignedStaffId = assignedStaffId;
    if (adminUser.role !== 'admin' && assignedStaffId !== 'unassigned') {
      effectiveAssignedStaffId = 'me';
    }

    try {
      // Determine what joins and select fields we need in the inner query to optimize performance
      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') || (totalSpentMax !== undefined && totalSpentMax !== '');

      const needVisits =
        (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
        (totalVisitsMax !== undefined && totalVisitsMax !== '');

      const needPromo =
        (promoUsed !== undefined && promoUsed !== 'all') ||
        (promoCountMin !== undefined && promoCountMin !== '') ||
        (promoCountMax !== undefined && promoCountMax !== '');

      const needReferrals =
        (referralUsed !== undefined && referralUsed !== 'all') ||
        (referralCountMin !== undefined && referralCountMin !== '') ||
        (referralCountMax !== undefined && referralCountMax !== '');

      const needOrderCounts = needSpent || needVisits;

      let statsInnerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
      statsInnerJoins += ` LEFT JOIN (
        SELECT 
          user_id,
          SUM(
            CASE 
              WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
              ELSE 0 
            END
          ) as live_count
        FROM user_service_balance
        GROUP BY user_id
      ) as usb_agg ON u.id = usb_agg.user_id`;
      if (needOrderCounts) {
        statsInnerJoins += ` LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent, 
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`;
      }
      if (needPromo) {
        statsInnerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
      }
      if (needReferrals) {
        statsInnerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
      }

      let allowedUserIds: number[] | null = null;
      let excludedUserIds: number[] | null = null;

      if (ids && ids.trim() !== '') {
        allowedUserIds = ids
          .split(',')
          .map(Number)
          .filter((n) => !isNaN(n));
      }

      if (
        (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') ||
        (assignedDaysMin !== undefined && assignedDaysMin !== '') ||
        (assignedDaysMax !== undefined && assignedDaysMax !== '')
      ) {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          excludedUserIds = allAssignments.map((a) => a.legacyUserId);
          if (allowedUserIds !== null && excludedUserIds.length > 0) {
            const exSet = new Set(excludedUserIds);
            allowedUserIds = allowedUserIds.filter((id) => !exSet.has(id));
          }
        } else {
          const assignedWhere: SafeAny = {};
          if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
            let targetStaffId = adminUser.id;
            if (effectiveAssignedStaffId !== 'me') {
              targetStaffId = parseInt(effectiveAssignedStaffId, 10);
            }
            if (!isNaN(targetStaffId)) {
              assignedWhere.staffId = targetStaffId;
            }
          } else {
            assignedWhere.staffId = { not: null };
          }
          if (assignedDaysMin !== undefined && assignedDaysMin !== '') {
            const minDays = parseInt(assignedDaysMin, 10);
            if (!isNaN(minDays)) {
              const maxDate = new Date();
              maxDate.setDate(maxDate.getDate() - minDays);
              maxDate.setHours(23, 59, 59, 999);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.lte = maxDate;
            }
          }
          if (assignedDaysMax !== undefined && assignedDaysMax !== '') {
            const maxDays = parseInt(assignedDaysMax, 10);
            if (!isNaN(maxDays)) {
              const minDate = new Date();
              minDate.setDate(minDate.getDate() - maxDays);
              minDate.setHours(0, 0, 0, 0);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.gte = minDate;
            }
          }

          const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: assignedWhere,
            select: { legacyUserId: true },
          });
          const filterUserIds = assignments.map((a) => a.legacyUserId);
          if (allowedUserIds !== null) {
            const filterSet = new Set(filterUserIds);
            allowedUserIds = allowedUserIds.filter((id) => filterSet.has(id));
          } else {
            allowedUserIds = filterUserIds;
          }
        }
      }

      if (retainedOnly === 'true') {
        const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { isRetained: true },
          select: { legacyUserId: true },
        });
        const retainedUserIds = retainedAssignments.map((a) => a.legacyUserId);
        if (allowedUserIds !== null) {
          const retSet = new Set(retainedUserIds);
          allowedUserIds = allowedUserIds.filter((id) => retSet.has(id));
        } else {
          allowedUserIds = retainedUserIds;
        }
      }

      if (allowedUserIds !== null && allowedUserIds.length === 0) {
        return {
          total: 0,
          comboLive: 0,
          comboDead: 0,
          single: 0,
          notComboLive: 0,
        };
      }

      const innerWhereClauses: string[] = [];
      const innerParams: SafeAny[] = [];

      // Filter out or in deleted users based on trash flag
      if (trash === 'true') {
        innerWhereClauses.push('up.is_deleted = 1');
      } else {
        innerWhereClauses.push('COALESCE(up.is_deleted, 0) = 0');
      }

      if (allowedUserIds !== null) {
        innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
      }
      if (excludedUserIds !== null && excludedUserIds.length > 0) {
        innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
      }

      // 1. Filter by Search (Name or Phone using EXISTS for contact to avoid GROUP BY)
      if (search && search.trim() !== '') {
        const searchLike = `%${search.trim()}%`;
        innerWhereClauses.push(`(
          up.full_name LIKE ? OR EXISTS (
            SELECT 1 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
          )
        )`);
        innerParams.push(searchLike, searchLike);
      }

      // 2. Filter by Bucket (Optimized using usb_agg joins)
      if (bucket && bucket !== 'ALL') {
        if (bucket === 'SINGLE') {
          innerWhereClauses.push('usb_agg.user_id IS NULL');
        } else if (bucket === 'COMBO_LIVE') {
          innerWhereClauses.push('usb_agg.live_count > 0');
        } else if (bucket === 'COMBO_DEAD') {
          innerWhereClauses.push('usb_agg.user_id IS NOT NULL AND COALESCE(usb_agg.live_count, 0) = 0');
        } else if (bucket === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push('(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)');
        }
      }

      // 3. daysSinceLastVisit Filters
      if (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') {
        innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) >= ?');
        innerParams.push(parseInt(daysSinceLastVisitMin, 10));
      }
      if (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '') {
        innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) <= ?');
        innerParams.push(parseInt(daysSinceLastVisitMax, 10));
      }

      // 4. totalSpent & totalVisits Filters (using pre-aggregated joins)
      if (totalSpentMin !== undefined && totalSpentMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) >= ?');
        innerParams.push(parseFloat(totalSpentMin));
      }
      if (totalSpentMax !== undefined && totalSpentMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) <= ?');
        innerParams.push(parseFloat(totalSpentMax));
      }

      if (totalVisitsMin !== undefined && totalVisitsMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) >= ?');
        innerParams.push(parseInt(totalVisitsMin, 10));
      }
      if (totalVisitsMax !== undefined && totalVisitsMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) <= ?');
        innerParams.push(parseInt(totalVisitsMax, 10));
      }

      // 5. Promotions and Referrals Filters (using pre-aggregated joins)
      if (promoUsed === 'yes') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= 1');
      } else if (promoUsed === 'no') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) = 0');
      }
      if (promoCountMin !== undefined && promoCountMin !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= ?');
        innerParams.push(parseInt(promoCountMin, 10));
      }
      if (promoCountMax !== undefined && promoCountMax !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) <= ?');
        innerParams.push(parseInt(promoCountMax, 10));
      }

      if (referralUsed === 'yes') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= 1');
      } else if (referralUsed === 'no') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) = 0');
      }
      if (referralCountMin !== undefined && referralCountMin !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= ?');
        innerParams.push(parseInt(referralCountMin, 10));
      }
      if (referralCountMax !== undefined && referralCountMax !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) <= ?');
        innerParams.push(parseInt(referralCountMax, 10));
      }

      // Birthday & Age Filters
      if (dobMonth !== undefined && dobMonth !== '' && dobMonth !== 'ALL') {
        innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = ?');
        innerParams.push(parseInt(String(dobMonth), 10));
      }

      if (birthdayPreset === 'today') {
        innerWhereClauses.push(
          'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE()) AND DAY(u.date_of_birth) = DAY(CURDATE())'
        );
      } else if (birthdayPreset === 'this_month') {
        innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE())');
      } else if (birthdayPreset === 'next_month') {
        innerWhereClauses.push(
          'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(ADDDATE(CURDATE(), INTERVAL 1 MONTH))'
        );
      }

      if (ageMin !== undefined && ageMin !== '') {
        innerWhereClauses.push(
          'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) >= ?'
        );
        innerParams.push(parseInt(String(ageMin), 10));
      }
      if (ageMax !== undefined && ageMax !== '') {
        innerWhereClauses.push(
          'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) <= ?'
        );
        innerParams.push(parseInt(String(ageMax), 10));
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      const statsSql = `
        SELECT 
          CASE
            WHEN usb_agg.user_id IS NULL THEN 'SINGLE'
            WHEN usb_agg.live_count > 0 THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          COUNT(*) as count
        FROM user u
        ${statsInnerJoins}
        ${innerWhereString}
        GROUP BY bucket
      `;

      const statsResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(statsSql, ...innerParams);

      const stats = {
        total: 0,
        comboLive: 0,
        comboDead: 0,
        single: 0,
        notComboLive: 0,
      };

      statsResult.forEach((row: SafeAny) => {
        const count = Number(row.count || 0);
        stats.total += count;
        if (row.bucket === 'COMBO_LIVE') stats.comboLive = count;
        if (row.bucket === 'COMBO_DEAD') stats.comboDead = count;
        if (row.bucket === 'SINGLE') stats.single = count;
      });

      stats.notComboLive = stats.total - stats.comboLive;

      return stats;
    } catch (error) {
      fastify.log.error(error as Error, 'Get customers stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve stats',
      });
    }
  });

  // GET /api/customers/random-ids
  // Retrieve random customer IDs matching the current filters (only unassigned by default)
  fastify.get('/customers/random-ids', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      bucket,
      search,
      limit = '20',
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      excludeAssigned = 'true',
      excludeFutureBooking = 'true',
      excludeUnconfirmedAllocation = 'true',
      hasFutureBooking,
    } = request.query as SafeAny;

    const limitNum = parseInt(limit, 10) || 20;

    try {
      const _needContact = search && search.trim() !== '';
      const needServiceBalance = bucket && bucket !== 'ALL';
      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') || (totalSpentMax !== undefined && totalSpentMax !== '');
      const needVisits =
        (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
        (totalVisitsMax !== undefined && totalVisitsMax !== '');
      const needPromo =
        (promoUsed !== undefined && promoUsed !== 'all') ||
        (promoCountMin !== undefined && promoCountMin !== '') ||
        (promoCountMax !== undefined && promoCountMax !== '');
      const needReferrals =
        (referralUsed !== undefined && referralUsed !== 'all') ||
        (referralCountMin !== undefined && referralCountMin !== '') ||
        (referralCountMax !== undefined && referralCountMax !== '');

      const needOrderCounts = needSpent || needVisits;

      let innerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
      if (needServiceBalance) {
        innerJoins += ` LEFT JOIN (
          SELECT 
            user_id,
            SUM(
              CASE 
                WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
                ELSE 0 
              END
            ) as live_count
          FROM user_service_balance
          GROUP BY user_id
        ) as usb_agg ON u.id = usb_agg.user_id`;
      }
      if (needOrderCounts) {
        innerJoins += ` LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent, 
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`;
      }
      if (needPromo) {
        innerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
      }
      if (needReferrals) {
        innerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
      }

      const innerWhereClauses: string[] = [];
      const innerParams: SafeAny[] = [];

      const currentUser = (request as SafeAny).user;
      const adminUser = await fastify.prisma.crm.crmStaff.findFirst({
        where: {
          OR: [{ username: currentUser?.username }, { email: currentUser?.email }],
        },
      });

      const effectiveAssignedStaffId = currentUser?.role === 'telesales' && adminUser ? 'me' : assignedStaffId;

      if (
        (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') ||
        (assignedDaysMin !== undefined && assignedDaysMin !== '') ||
        (assignedDaysMax !== undefined && assignedDaysMax !== '')
      ) {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          const excludedUserIds = allAssignments.map((a) => a.legacyUserId);
          if (excludedUserIds.length > 0) {
            innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
          }
        } else {
          const assignedWhere: SafeAny = {};
          if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
            let targetStaffId = adminUser ? adminUser.id : 0;
            if (effectiveAssignedStaffId !== 'me') {
              targetStaffId = parseInt(effectiveAssignedStaffId, 10);
            }
            if (!isNaN(targetStaffId)) {
              assignedWhere.staffId = targetStaffId;
            }
          } else {
            assignedWhere.staffId = { not: null };
          }
          if (assignedDaysMin !== undefined && assignedDaysMin !== '') {
            const minDays = parseInt(assignedDaysMin, 10);
            if (!isNaN(minDays)) {
              const maxDate = new Date();
              maxDate.setDate(maxDate.getDate() - minDays);
              maxDate.setHours(23, 59, 59, 999);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.lte = maxDate;
            }
          }
          if (assignedDaysMax !== undefined && assignedDaysMax !== '') {
            const maxDays = parseInt(assignedDaysMax, 10);
            if (!isNaN(maxDays)) {
              const minDate = new Date();
              minDate.setDate(minDate.getDate() - maxDays);
              minDate.setHours(0, 0, 0, 0);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.gte = minDate;
            }
          }

          const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: assignedWhere,
            select: { legacyUserId: true },
          });
          const filterUserIds = assignments.map((a) => a.legacyUserId);
          if (filterUserIds.length === 0) {
            return { ids: [], batchId: `rand_${Date.now()}` };
          }
          innerWhereClauses.push(`u.id IN (${filterUserIds.join(',')})`);
        }
      } else if (excludeAssigned === 'true') {
        const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          select: { legacyUserId: true },
        });
        const excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        if (excludedUserIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
        }
      }

      if (excludeUnconfirmedAllocation === 'true') {
        const pendingBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
          where: {
            status: 'PENDING_ACCEPT',
            batch: {
              status: 'PENDING_ACCEPT',
            },
          },
          select: { customerId: true },
        });
        const pendingCustomerIds = Array.from(new Set(pendingBatchItems.map((i) => i.customerId)));
        if (pendingCustomerIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${pendingCustomerIds.join(',')})`);
        }
      }

      if (retainedOnly === 'true') {
        const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { isRetained: true },
          select: { legacyUserId: true },
        });
        const retainedUserIds = retainedAssignments.map((a) => a.legacyUserId);
        if (retainedUserIds.length === 0) {
          return { ids: [], batchId: `rand_${Date.now()}` };
        }
        innerWhereClauses.push(`u.id IN (${retainedUserIds.join(',')})`);
      }

      if (excludeFutureBooking === 'true' || hasFutureBooking === 'false') {
        innerWhereClauses.push(`NOT EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      } else if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      }

      // Apply other filters (search, bucket, stats, etc.)
      if (search && search.trim() !== '') {
        const searchLike = `%${search.trim()}%`;
        innerWhereClauses.push(`(
          up.full_name LIKE ? OR EXISTS (
            SELECT 1 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
          )
        )`);
        innerParams.push(searchLike, searchLike);
      }

      if (bucket && bucket !== 'ALL') {
        if (bucket === 'SINGLE') {
          innerWhereClauses.push('usb_agg.user_id IS NULL');
        } else if (bucket === 'COMBO_LIVE') {
          innerWhereClauses.push('usb_agg.live_count > 0');
        } else if (bucket === 'COMBO_DEAD') {
          innerWhereClauses.push('usb_agg.user_id IS NOT NULL AND COALESCE(usb_agg.live_count, 0) = 0');
        } else if (bucket === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push('(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)');
        }
      }

      if (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') {
        innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) >= ?');
        innerParams.push(parseInt(daysSinceLastVisitMin, 10));
      }
      if (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '') {
        innerWhereClauses.push('up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) <= ?');
        innerParams.push(parseInt(daysSinceLastVisitMax, 10));
      }
      if (totalSpentMin !== undefined && totalSpentMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) >= ?');
        innerParams.push(parseFloat(totalSpentMin));
      }
      if (totalSpentMax !== undefined && totalSpentMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) <= ?');
        innerParams.push(parseFloat(totalSpentMax));
      }
      if (totalVisitsMin !== undefined && totalVisitsMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) >= ?');
        innerParams.push(parseInt(totalVisitsMin, 10));
      }
      if (totalVisitsMax !== undefined && totalVisitsMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) <= ?');
        innerParams.push(parseInt(totalVisitsMax, 10));
      }
      if (promoUsed === 'yes') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= 1');
      } else if (promoUsed === 'no') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) = 0');
      }
      if (promoCountMin !== undefined && promoCountMin !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= ?');
        innerParams.push(parseInt(promoCountMin, 10));
      }
      if (promoCountMax !== undefined && promoCountMax !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) <= ?');
        innerParams.push(parseInt(promoCountMax, 10));
      }
      if (referralUsed === 'yes') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= 1');
      } else if (referralUsed === 'no') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) = 0');
      }
      if (referralCountMin !== undefined && referralCountMin !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= ?');
        innerParams.push(parseInt(referralCountMin, 10));
      }
      if (referralCountMax !== undefined && referralCountMax !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) <= ?');
        innerParams.push(parseInt(referralCountMax, 10));
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      const query = `
        SELECT u.id
        FROM user u
        ${innerJoins}
        ${innerWhereString}
        ORDER BY RAND()
        LIMIT ?
      `;
      innerParams.push(limitNum);

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(query, ...innerParams);
      const ids = rows.map((r) => Number(r.id));

      return { ids };
    } catch (error) {
      fastify.log.error(error as Error, 'Get random customer ids error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve random customer IDs',
      });
    }
  });

  // GET /api/customers/services
  // Get list of active services from legacy core database
  fastify.get('/customers/services', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = `
        SELECT 
          s.id,
          sl.service_name as name,
          sp.service_price as price,
          s.duration_minute_standard as duration
        FROM service s
        JOIN service_language sl ON s.id = sl.service_id
        LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
        WHERE s.is_disabled = 0 
          AND s.is_temporary = 0
          AND sl.language_id = 1
          AND s.service_key NOT LIKE 'classic-%'
          AND s.service_key NOT LIKE 'volume-%'
          AND s.service_key NOT LIKE 'ultralight-%'
          AND s.service_key NOT LIKE 'mink-%'
          AND s.service_key NOT LIKE 'under-mink-%'
          AND s.service_key NOT LIKE 'infrared-sauna-%'
        ORDER BY s.position ASC, s.id ASC
      `;

      const dbServices = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(query);

      const mappedServices = dbServices.map((s) => ({
        id: Number(s.id),
        name: s.name,
        price: s.price !== null && s.price !== undefined ? Number(s.price) : 0,
        duration: s.duration !== null && s.duration !== undefined ? Number(s.duration) : 90,
      }));

      const finalServices = [{ id: 0, name: 'Any Lashes / Any Services', price: 0, duration: 90 }, ...mappedServices];

      return finalServices;
    } catch (err) {
      request.log.error(err, 'Failed to fetch services list');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể tải danh sách dịch vụ từ hệ thống.' });
    }
  });

  // GET /api/customers/staff
  // Get list of active staff members
  fastify.get('/customers/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date, role } = request.query as { date?: string; role?: string };
    try {
      // 1. Fetch CRM Staff
      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
        },
        orderBy: { displayName: 'asc' },
      });

      // 2. Fetch KTVs from legacy core tables
      let mappedKTVs: SafeAny[] = [];

      // Query active schedules to compute weekly off days
      const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, type, type_value 
         FROM staff_working_shift_schedule 
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );

      const schedulesByUserId: { [uid: number]: SafeAny[] } = {};
      for (const s of allSchedules) {
        const uid = Number(s.user_id);
        if (!schedulesByUserId[uid]) schedulesByUserId[uid] = [];
        schedulesByUserId[uid].push(s);
      }

      // Query approved week-off requests from staff_day_off
      const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
         FROM staff_day_off
         WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL
         GROUP BY from_user_id, weekday`
      );

      const weekOffsByUserId: { [uid: number]: { weekday: number; cnt: number }[] } = {};
      for (const r of weekOffRows) {
        const uid = Number(r.userId);
        const day = Number(r.weekday);
        const cnt = Number(r.cnt);
        if (!weekOffsByUserId[uid]) weekOffsByUserId[uid] = [];
        weekOffsByUserId[uid].push({ weekday: day, cnt });
      }

      const getKTVOffDays = (userId: number) => {
        const weekOffs = weekOffsByUserId[userId] || [];
        if (weekOffs.length > 0) {
          const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
          return [String(sorted[0].weekday)];
        }

        const list = schedulesByUserId[userId] || [];
        const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
        if (worksAll) return [];
        const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => s.type_value);
        if (workingWeekdays.length === 0) return [];
        const allWeekdays = ['1', '2', '3', '4', '5', '6', '7'];
        return allWeekdays.filter((w) => !workingWeekdays.includes(w));
      };

      if (date) {
        // Query scheduled KTVs for this date
        const dayOfWeek = new Date(date).getDay();
        const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

        // First check if actual instantiated shifts exist for this date
        const instantiatedShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT DISTINCT sws.user_id, up.full_name, up.client_store_id, up.avatar
           FROM staff_working_shift sws
           JOIN user_profile up ON sws.user_id = up.user_id
           WHERE sws.date = ? AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
          date
        );

        let activeKTVs = instantiatedShifts;

        if (activeKTVs.length === 0) {
          // Fallback to schedule templates
          const schedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT DISTINCT s.user_id, up.full_name, up.client_store_id, up.avatar
              FROM staff_working_shift_schedule s
              JOIN user_profile up ON s.user_id = up.user_id
              WHERE s.is_disabled = 0 
                AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0
                AND (s.type = 'Day' AND s.type_value = 'All' OR s.type = 'Weekday' AND s.type_value = ?)`,
            weekdayStr
          );

          // Filter out KTVs who requested day-off
          const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved'`,
            date
          );
          const offUserIds = dayOffs.map((d) => Number(d.from_user_id));

          activeKTVs = schedules.filter((s) => !offUserIds.includes(Number(s.user_id)));
        }

        mappedKTVs = activeKTVs.map((ktv) => {
          const storeId = Number(ktv.client_store_id);
          let storeNotes = 'Estella Place';
          if (storeId === 6) storeNotes = 'De Tham';
          if (storeId === 2) storeNotes = 'Phan Xích Long';

          return {
            id: Number(ktv.user_id),
            username: `ktv_${ktv.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            displayName: ktv.full_name,
            role: 'technician',
            notes: storeNotes,
            avatar: ktv.avatar,
            offDays: getKTVOffDays(Number(ktv.user_id)),
          };
        });
      } else {
        // General active KTVs
        const activeKTVs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT DISTINCT user_id, full_name, client_store_id, avatar 
           FROM user_profile 
           WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0`
        );

        mappedKTVs = activeKTVs.map((ktv) => {
          const storeId = Number(ktv.client_store_id);
          let storeNotes = 'Estella Place';
          if (storeId === 6) storeNotes = 'De Tham';
          if (storeId === 2) storeNotes = 'Phan Xích Long';

          return {
            id: Number(ktv.user_id),
            username: `ktv_${ktv.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            displayName: ktv.full_name,
            role: 'technician',
            notes: storeNotes,
            avatar: ktv.avatar,
            offDays: getKTVOffDays(Number(ktv.user_id)),
          };
        });
      }

      // Deduplicate CRM staff by displayName
      const uniqueStaffMap = new Map<string, SafeAny>();
      crmStaffList.forEach((s) => {
        const key = (s.displayName || '').trim().toLowerCase();
        if (key && !uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, s);
        }
      });
      const dedupedCrmStaffList = Array.from(uniqueStaffMap.values());

      if (!date) {
        if (role === 'booker' || role === 'telesales') {
          return dedupedCrmStaffList.filter(
            (s) => ['telesales', 'booker'].includes(s.role?.toLowerCase() || '') || s.displayName === 'Tâm Nguyễn'
          );
        }
        return dedupedCrmStaffList.filter((s) =>
          ['telesales', 'executive', 'manager', 'admin'].includes(s.role?.toLowerCase() || '')
        );
      }

      return [...dedupedCrmStaffList, ...mappedKTVs];
    } catch (error) {
      fastify.log.error(error as Error, 'Get staff list error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve staff list' });
    }
  });

  // GET /api/customers/promotions
  // Fetch active promotions for selection during booking
  fastify.get('/customers/promotions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const promotions = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT p.id, pl.promotion_name as name, p.promotion_key as promotionKey, p.discount_percentage as discountPercentage, p.discount_amount as discountAmount
         FROM promotion p
         LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
         WHERE p.is_disabled = 0
         ORDER BY p.id DESC`
      );
      return promotions.map((p) => ({
        id: Number(p.id),
        name: p.name || p.promotionKey || `Khuyến mãi #${p.id}`,
        promotionKey: p.promotionKey,
        discountPercentage: Number(p.discountPercentage),
        discountAmount: Number(p.discountAmount),
      }));
    } catch (error) {
      fastify.log.error(error as Error, 'Get promotions error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve promotions list' });
    }
  });

  // GET /api/customers/referrals
  // Get list of all customers who referred someone and their details (Optimized)
  fastify.get('/customers/referrals', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // 1. Fetch referrers summary
      const referrers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           up.referrer_user_id as referrerId,
           r_up.full_name as referrerName,
           COALESCE(r_uc.phone_number, '') as referrerPhone,
           COUNT(*) as totalReferred
         FROM user_profile up
         INNER JOIN user r_u ON up.referrer_user_id = r_u.id
         INNER JOIN user_profile r_up ON r_u.id = r_up.user_id
         LEFT JOIN user_contact r_uc ON r_u.id = r_uc.user_id AND r_uc.is_disabled = 0
         WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0
         GROUP BY up.referrer_user_id
         ORDER BY totalReferred DESC`
      );

      // 2. Fetch all referred friends at once
      const referredFriends = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           u.id as referredId,
           up.full_name as referredName,
           COALESCE(uc.phone_number, '') as referredPhone,
           u.date_created as dateCreated,
           up.referrer_user_id as referrerId
         FROM user u
         INNER JOIN user_profile up ON u.id = up.user_id
         LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
         WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0
         ORDER BY u.id DESC`
      );

      // 3. Fetch all referral transactions at once using indexed template_id and currency_id
      const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as referrerId, amount, tracking_key FROM user_balance_transaction 
         WHERE template_id = 7 AND currency_id = 3`
      );

      // Map of referrerId -> Map of referredId -> rewardAmount
      const referrerRewardMaps = new Map<number, Map<number, number>>();
      // Map of referrerId -> totalRewardDiamonds
      const referrerTotalRewards = new Map<number, number>();

      for (const tx of referralTxs) {
        const refId = Number(tx.referrerId);
        try {
          if (tx.tracking_key) {
            const keyObj = JSON.parse(tx.tracking_key);
            const referredId = Number(keyObj.user_id);
            if (referredId && refId) {
              const amt = Number(tx.amount);

              if (!referrerRewardMaps.has(refId)) {
                referrerRewardMaps.set(refId, new Map<number, number>());
              }
              referrerRewardMaps.get(refId)!.set(referredId, amt);

              referrerTotalRewards.set(refId, (referrerTotalRewards.get(refId) || 0) + amt);
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      // Map of referrerId -> Map of referredId -> friend_info (to collapse duplicate contacts)
      const friendsGrouped = new Map<number, Map<number, SafeAny>>();

      for (const rf of referredFriends) {
        const refId = Number(rf.referrerId);
        const friendId = Number(rf.referredId);
        if (!refId || !friendId) continue;

        if (!friendsGrouped.has(refId)) {
          friendsGrouped.set(refId, new Map<number, SafeAny>());
        }

        const refMap = friendsGrouped.get(refId)!;
        if (refMap.has(friendId)) {
          const existing = refMap.get(friendId);
          if (rf.referredPhone && !existing.phone.includes(rf.referredPhone)) {
            existing.phone = existing.phone ? `${existing.phone}, ${rf.referredPhone}` : rf.referredPhone;
          }
        } else {
          const refRewardMap = referrerRewardMaps.get(refId);
          const rewardDiamonds = refRewardMap ? refRewardMap.get(friendId) || 0 : 0;

          refMap.set(friendId, {
            id: friendId,
            name: rf.referredName || 'Khách hàng',
            phone: rf.referredPhone || '',
            dateCreated: rf.dateCreated ? new Date(rf.dateCreated).toISOString() : null,
            rewardDiamonds,
          });
        }
      }

      const friendsMap = new Map<number, SafeAny[]>();
      for (const [refId, refMap] of friendsGrouped.entries()) {
        friendsMap.set(refId, Array.from(refMap.values()));
      }

      const result = referrers.map((r) => {
        const refId = Number(r.referrerId);
        return {
          referrerId: refId,
          referrerName: r.referrerName || 'Khách hàng',
          referrerPhone: r.referrerPhone || '',
          totalReferred: Number(r.totalReferred),
          totalRewardDiamonds: referrerTotalRewards.get(refId) || 0,
          referredUsers: friendsMap.get(refId) || [],
        };
      });

      return result;
    } catch (error) {
      fastify.log.error(error as Error, 'Get referrals list error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve referrals list' });
    }
  });

  // GET /api/customers/:id
  // Return detailed customer info
  fastify.get('/customers/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

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
    } catch (error) {
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
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      // Query completed orders for the customer
      const sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.date_created as dateCreated,
          o.total_price as totalPrice,
          o.order_state as orderState,
          o.booking_channels as bookingChannel
        FROM \`order\` o
        WHERE o.user_id = ? AND o.order_state = 'Completed'
        ORDER BY o.date_created DESC
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
    } catch (error) {
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

    const { name, email, gender, dob, phones } = request.body as {
      name: string;
      email: string | null;
      gender: string | null;
      dob: string | null;
      phones: Array<{ id?: number; phone_number: string; is_disabled?: boolean; is_deleted?: boolean }>;
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

      const profileCount = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user_profile WHERE user_id = ? LIMIT 1`,
        customerId
      );

      if (profileCount.length > 0) {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE user_profile SET full_name = ?, first_name = ?, last_name = ? WHERE user_id = ?`,
          name,
          firstName,
          lastName,
          customerId
        );
      } else {
        const randPasscode = Math.random().toString(36).substring(2, 8);
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user_profile (
            user_id, client_id, client_business_id, user_group_id, passcode, provider, 
            first_name, last_name, full_name, client_store_id, is_disabled, 
            is_leaved, is_deleted, date_created, language_id, access_user_group_ids,
            is_academy, is_temporary
          ) VALUES (?, 11, 1, 1, ?, 'Client', ?, ?, ?, 1, 0, 0, 0, NOW(), 1, '', 0, 0)`,
          customerId,
          randPasscode,
          firstName,
          lastName,
          name
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
    } catch (error) {
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
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      // 1. Fetch CRM Assignment for Online Consultant
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: customerId },
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
      const customerResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, customerId);
      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      // Fetch all phone numbers associated with the customer
      const userContacts = await fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: customerId },
      });

      // 3. Fetch Completed Orders for financial and frequency metrics
      const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT o.id, o.order_key as orderKey, o.booking_date_start as bookingDate, o.total_price as totalPrice, o.assigned_staff_id as technicianId, o.created_staff_id as createdStaffId
         FROM \`order\` o
         WHERE o.user_id = ? AND o.order_state = 'Completed'
         ORDER BY o.booking_date_start DESC`,
        customerId
      );

      const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
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

      // 5. Fetch Combo Balances
      const balanceSql = `
        SELECT 
          usb.id,
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
        LEFT JOIN user_profile up ON usb.created_staff_id = up.user_id
        WHERE usb.user_id = ?
        ORDER BY usb.date_created DESC
      `;
      const comboBalances = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(balanceSql, customerId);

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
          COALESCE(sl.service_name, s.service_key) as serviceName
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
      const orderServicesDetails =
        allOrderIds.length > 0
          ? await fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: allOrderIds } },
              select: {
                order_id: true,
                assigned_staff_id: true,
                check_in_staff_id: true,
                check_out_staff_id: true,
              },
            })
          : [];

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
      for (const s of servicesRaw) {
        const list = servicesByOrderId.get(Number(s.orderId)) || [];
        list.push(s.serviceName);
        servicesByOrderId.set(Number(s.orderId), list);
      }

      const formattedBookings = bookingsRaw.map((b) => {
        const orderSvs = orderServicesDetails.filter((os) => Number(os.order_id) === Number(b.id));
        const checkInStaffId = orderSvs.find((os) => os.check_in_staff_id)?.check_in_staff_id;
        const checkOutStaffId = orderSvs.find((os) => os.check_out_staff_id)?.check_out_staff_id;
        const firstCvStaffId = b.technicianId || orderSvs.find((os) => os.assigned_staff_id)?.assigned_staff_id;

        return {
          id: b.id,
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || '',
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          branchName: b.branchName,
          technicianName: (() => {
            if (!firstCvStaffId) return null;
            const name = staffNamesMap.get(Number(firstCvStaffId));
            if (!name) return null;
            const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
            return isInactive ? `${name} (Đã nghỉ)` : name;
          })(),
          ccInName: checkInStaffId ? staffNamesMap.get(Number(checkInStaffId)) || null : null,
          ccOutName: checkOutStaffId ? staffNamesMap.get(Number(checkOutStaffId)) || null : null,
          bookerName: b.createdStaffId ? staffNamesMap.get(Number(b.createdStaffId)) || null : null,
          ccInAvatar: checkInStaffId ? staffAvatarMap.get(Number(checkInStaffId)) || null : null,
          ccOutAvatar: checkOutStaffId ? staffAvatarMap.get(Number(checkOutStaffId)) || null : null,
          bookerAvatar: b.createdStaffId ? staffAvatarMap.get(Number(b.createdStaffId)) || null : null,
          technicianId: firstCvStaffId ? Number(firstCvStaffId) : null,
          storeId: b.storeId ? Number(b.storeId) : null,
          services: servicesByOrderId.get(Number(b.id)) || [],
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
        WHERE un.user_id = ? AND un.is_disabled = 0
        ORDER BY un.date_created DESC
      `;
      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, customerId);
      const formattedNotes = notesRaw.map((n) => ({
        id: Number(n.id),
        note: n.note || '',
        noteFieldKey: n.noteFieldKey || 'note',
        isSticky: Boolean(n.isSticky),
        isIssue: Boolean(n.isIssue),
        dateCreated: n.dateCreated ? new Date(n.dateCreated).toISOString() : null,
        staffName: n.staffName,
        staffAvatar: n.staffAvatar || null,
      }));

      // 8. Fetch CRM Call Logs
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId: customerId },
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
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          avatar: row.avatar,
          onlineConsultant: onlineConsultantName,
          onlineConsultantId: assigned?.staffId || null,
          isDeleted: row.isDeleted === 1,
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
          id: Number(cb.id),
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
          const orderSvs = orderServicesDetails.filter((os) => Number(os.order_id) === Number(o.id));
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
          const orderSvs = orderServicesDetails.filter((os) => Number(os.order_id) === Number(o.id));
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
    } catch (error) {
      fastify.log.error(error as Error, 'Get detailed customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve detailed customer profile',
      });
    }
  });

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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      fastify.log.error(err, 'Restore customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể khôi phục khách hàng.',
      });
    }
  });
}
