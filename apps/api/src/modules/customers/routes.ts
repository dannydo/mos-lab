import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { BucketType } from '@mos-lab/shared';

export async function customerRoutes(fastify: FastifyInstance) {
  // GET /api/customers
  // Query legs DB, compute buckets, handle pagination, search, sorting
  fastify.get('/customers', { preHandler: [requireAuth] }, async (request, reply) => {
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
      ids
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
    if (adminUser.role !== 'admin') {
      effectiveAssignedStaffId = 'me';
    }

    try {
      // Determine what joins and select fields we need in the inner query to optimize performance
      const needContact = (search && search.trim() !== '');
      const needServiceBalance = (bucket && bucket !== 'ALL');
      
      const needSpent = (totalSpentMin !== undefined && totalSpentMin !== '') || 
                        (totalSpentMax !== undefined && totalSpentMax !== '') || 
                        (sort === 'totalSpent_desc' || sort === 'totalSpent_asc');
      
      const needVisits = (totalVisitsMin !== undefined && totalVisitsMin !== '') || 
                         (totalVisitsMax !== undefined && totalVisitsMax !== '');
      
      const needPromo = (promoUsed !== undefined && promoUsed !== 'all') || 
                        (promoCountMin !== undefined && promoCountMin !== '') || 
                        (promoCountMax !== undefined && promoCountMax !== '');
      
      const needReferrals = (referralUsed !== undefined && referralUsed !== 'all') || 
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
        allowedUserIds = ids.split(',').map(Number).filter(n => !isNaN(n));
      } else if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true }
          });
          excludedUserIds = allAssignments.map(a => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true }
            });
            allowedUserIds = assignments.map(a => a.legacyUserId);
            if (allowedUserIds.length === 0) {
              return {
                data: [],
                pagination: {
                  total: 0,
                  page: pageNum,
                  limit: limitNum,
                  pages: 0
                }
              };
            }
          }
        }
      }

      const innerWhereClauses: string[] = [];
      const innerParams: any[] = [];

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

      const innerWhereString = innerWhereClauses.length > 0 
        ? `WHERE ${innerWhereClauses.join(' AND ')}` 
        : '';

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
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(querySql, ...dataParams),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(countSql, ...countParams)
      ]);

      const total = Number(countResult[0]?.total || 0);

      // Fetch assignments for the returned customers
      const customerIds = dataResult.map((row: any) => Number(row.id));
      const assignments = customerIds.length > 0
        ? await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: { legacyUserId: { in: customerIds } },
            include: { staff: true }
          })
        : [];

      const assignmentMap = new Map();
      assignments.forEach(a => {
        assignmentMap.set(a.legacyUserId, {
          id: a.staff.id,
          displayName: a.staff.displayName,
          username: a.staff.username
        });
      });

      // Map raw SQL outputs to clean Customer interface types
      const customers = dataResult.map((row: any) => {
        const assigned = assignmentMap.get(Number(row.id)) || null;
        return {
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
          totalPromotionsUsed: Number(row.totalPromotionsUsed || 0),
          totalReferrals: Number(row.totalReferrals || 0),
          bucket: row.bucket as BucketType,
          comboBalance: row.bucket !== 'SINGLE' ? {
            normalCount: Number(row.normalCount || 0),
            retainCount: Number(row.retainCount || 0),
            expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null
          } : null,
          assignedStaff: assigned,
          avatar: row.avatar
        };
      });

      return {
        data: customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      };
    } catch (error: any) {
      fastify.log.error('Get customers list error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve customers' 
      });
    }
  });

  // GET /api/customers/stats
  // Return count per bucket (COMBO_LIVE, COMBO_DEAD, SINGLE)
  fastify.get('/customers/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const { 
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
      assignedStaffId
    } = request.query as { 
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
    };

    const adminUser = request.user as { id: number; role: string };

    // Force telesales to only query stats for their own customers
    let effectiveAssignedStaffId = assignedStaffId;
    if (adminUser.role !== 'admin') {
      effectiveAssignedStaffId = 'me';
    }

    try {
      // Determine what joins and select fields we need in the inner query to optimize performance
      const needSpent = (totalSpentMin !== undefined && totalSpentMin !== '') || 
                        (totalSpentMax !== undefined && totalSpentMax !== '');
      
      const needVisits = (totalVisitsMin !== undefined && totalVisitsMin !== '') || 
                         (totalVisitsMax !== undefined && totalVisitsMax !== '');
      
      const needPromo = (promoUsed !== undefined && promoUsed !== 'all') || 
                        (promoCountMin !== undefined && promoCountMin !== '') || 
                        (promoCountMax !== undefined && promoCountMax !== '');
      
      const needReferrals = (referralUsed !== undefined && referralUsed !== 'all') || 
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
        allowedUserIds = ids.split(',').map(Number).filter(n => !isNaN(n));
      } else if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true }
          });
          excludedUserIds = allAssignments.map(a => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true }
            });
            allowedUserIds = assignments.map(a => a.legacyUserId);
            if (allowedUserIds.length === 0) {
              return {
                total: 0,
                comboLive: 0,
                comboDead: 0,
                single: 0
              };
            }
          }
        }
      }

      const innerWhereClauses: string[] = [];
      const innerParams: any[] = [];

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

      const innerWhereString = innerWhereClauses.length > 0 
        ? `WHERE ${innerWhereClauses.join(' AND ')}` 
        : '';

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

      const statsResult = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(statsSql, ...innerParams);
      
      const stats = {
        total: 0,
        comboLive: 0,
        comboDead: 0,
        single: 0,
        notComboLive: 0
      };

      statsResult.forEach((row: any) => {
        const count = Number(row.count || 0);
        stats.total += count;
        if (row.bucket === 'COMBO_LIVE') stats.comboLive = count;
        if (row.bucket === 'COMBO_DEAD') stats.comboDead = count;
        if (row.bucket === 'SINGLE') stats.single = count;
      });

      stats.notComboLive = stats.total - stats.comboLive;

      return stats;
    } catch (error: any) {
      fastify.log.error('Get customers stats error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve stats' 
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
      excludeAssigned = 'true'
    } = request.query as any;

    const limitNum = parseInt(limit, 10) || 20;

    try {
      const needContact = (search && search.trim() !== '');
      const needServiceBalance = (bucket && bucket !== 'ALL');
      const needSpent = (totalSpentMin !== undefined && totalSpentMin !== '') || 
                        (totalSpentMax !== undefined && totalSpentMax !== '');
      const needVisits = (totalVisitsMin !== undefined && totalVisitsMin !== '') || 
                         (totalVisitsMax !== undefined && totalVisitsMax !== '');
      const needPromo = (promoUsed !== undefined && promoUsed !== 'all') || 
                        (promoCountMin !== undefined && promoCountMin !== '') || 
                        (promoCountMax !== undefined && promoCountMax !== '');
      const needReferrals = (referralUsed !== undefined && referralUsed !== 'all') || 
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
      const innerParams: any[] = [];

      if (excludeAssigned === 'true') {
        const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          select: { legacyUserId: true }
        });
        const excludedUserIds = allAssignments.map(a => a.legacyUserId);
        if (excludedUserIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
        }
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

      const innerWhereString = innerWhereClauses.length > 0 
        ? `WHERE ${innerWhereClauses.join(' AND ')}` 
        : '';

      const query = `
        SELECT u.id
        FROM user u
        ${innerJoins}
        ${innerWhereString}
        ORDER BY RAND()
        LIMIT ?
      `;
      innerParams.push(limitNum);

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(query, ...innerParams);
      const ids = rows.map(r => Number(r.id));

      return { ids };
    } catch (error: any) {
      fastify.log.error('Get random customer ids error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve random customer IDs' 
      });
    }
  });


  // GET /api/saved-filters
  // Retrieve saved customer filters
  fastify.get('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' }
      });
      if (!config) {
        return [];
      }
      return JSON.parse(config.value);
    } catch (error: any) {
      fastify.log.error('Get saved filters error:', error);
      return [];
    }
  });

  // POST /api/saved-filters
  // Save or update a filter
  fastify.post('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, name, criteria } = request.body as {
      id?: string;
      name: string;
      criteria: any;
    };

    if (!name || !criteria) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Name and criteria are required' });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' }
      });

      let filters: any[] = [];
      if (config) {
        filters = JSON.parse(config.value);
      }

      const filterId = id || Math.random().toString(36).substring(2, 9);
      const newFilter = {
        id: filterId,
        name,
        criteria,
        createdAt: new Date().toISOString()
      };

      if (id) {
        const idx = filters.findIndex(f => f.id === id);
        if (idx > -1) {
          filters[idx] = newFilter;
        } else {
          filters.push(newFilter);
        }
      } else {
        filters.push(newFilter);
      }

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        update: { value: JSON.stringify(filters) },
        create: { key: 'CUSTOMER_SAVED_FILTERS', value: JSON.stringify(filters) }
      });

      return newFilter;
    } catch (error: any) {
      fastify.log.error('Save filter error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to save filter' });
    }
  });

  // DELETE /api/saved-filters/:id
  // Delete a saved filter
  fastify.delete('/saved-filters/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' }
      });

      if (!config) {
        return reply.status(404).send({ error: 'Not Found', message: 'Filters not found' });
      }

      let filters: any[] = JSON.parse(config.value);
      filters = filters.filter(f => f.id !== id);

      await fastify.prisma.crm.crmConfig.update({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        data: { value: JSON.stringify(filters) }
      });

      return { success: true };
    } catch (error: any) {
      fastify.log.error('Delete filter error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete filter' });
    }
  });

  // GET /api/customers/services
  // Get list of active services from legacy core database
  fastify.get('/customers/services', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập danh sách dịch vụ.' });
    }
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
        ORDER BY s.position ASC, s.id ASC
      `;

      const dbServices = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(query);
      
      const mappedServices = dbServices.map(s => ({
        id: Number(s.id),
        name: s.name,
        price: s.price !== null && s.price !== undefined ? Number(s.price) : 0,
        duration: s.duration !== null && s.duration !== undefined ? Number(s.duration) : 90
      }));

      const finalServices = [
        { id: 0, name: 'Any Lashes / Any Services', price: 0, duration: 90 },
        ...mappedServices
      ];

      return finalServices;
    } catch (err) {
      request.log.error(err, 'Failed to fetch services list');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải danh sách dịch vụ từ hệ thống.' });
    }
  });

  // GET /api/customers/staff
  // Get list of active staff members
  fastify.get('/customers/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập danh sách nhân viên.' });
    }
    const { date } = request.query as { date?: string };
    try {
      // 1. Fetch CRM Staff
      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true
        },
        orderBy: { displayName: 'asc' }
      });

      // 2. Fetch KTVs from legacy core tables
      let mappedKTVs: any[] = [];

      // Query active schedules to compute weekly off days
      const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT user_id, type, type_value 
         FROM staff_working_shift_schedule 
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );
      
      const schedulesByUserId: { [uid: number]: any[] } = {};
      for (const s of allSchedules) {
        const uid = Number(s.user_id);
        if (!schedulesByUserId[uid]) schedulesByUserId[uid] = [];
        schedulesByUserId[uid].push(s);
      }

      // Query approved week-off requests from staff_day_off
      const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
         FROM staff_day_off
         WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL
         GROUP BY from_user_id, weekday`
      );

      const weekOffsByUserId: { [uid: number]: { weekday: number, cnt: number }[] } = {};
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
        const worksAll = list.some(s => s.type === 'Day' && s.type_value === 'All');
        if (worksAll) return [];
        const workingWeekdays = list
          .filter(s => s.type === 'Weekday')
          .map(s => s.type_value);
        if (workingWeekdays.length === 0) return [];
        const allWeekdays = ['1', '2', '3', '4', '5', '6', '7'];
        return allWeekdays.filter(w => !workingWeekdays.includes(w));
      };

      if (date) {
        // Query scheduled KTVs for this date
        const dayOfWeek = new Date(date).getDay();
        const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

        // First check if actual instantiated shifts exist for this date
        const instantiatedShifts = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT DISTINCT sws.user_id, up.full_name, up.client_store_id, up.avatar
           FROM staff_working_shift sws
           JOIN user_profile up ON sws.user_id = up.user_id
           WHERE sws.date = ? AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
          date
        );

        let activeKTVs = instantiatedShifts;

        if (activeKTVs.length === 0) {
          // Fallback to schedule templates
          const schedules = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT DISTINCT s.user_id, up.full_name, up.client_store_id, up.avatar
             FROM staff_working_shift_schedule s
             JOIN user_profile up ON s.user_id = up.user_id
             WHERE s.is_disabled = 0 
               AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0
               AND (s.type = 'Day' AND s.type_value = 'All' OR s.type = 'Weekday' AND s.type_value = ?)`,
            weekdayStr
          );

          // Filter out KTVs who requested day-off
          const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
            `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved'`,
            date
          );
          const offUserIds = dayOffs.map(d => Number(d.from_user_id));

          activeKTVs = schedules.filter(s => !offUserIds.includes(Number(s.user_id)));
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
            offDays: getKTVOffDays(Number(ktv.user_id))
          };
        });
      } else {
        // General active KTVs
        const activeKTVs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
            offDays: getKTVOffDays(Number(ktv.user_id))
          };
        });
      }

      return [...crmStaffList, ...mappedKTVs];
    } catch (error: any) {
      fastify.log.error('Get staff list error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve staff list' });
    }
  });

  // GET /api/customers/promotions
  // Fetch active promotions for selection during booking
  fastify.get('/customers/promotions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const promotions = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT p.id, pl.promotion_name as name, p.promotion_key as promotionKey, p.discount_percentage as discountPercentage, p.discount_amount as discountAmount
         FROM promotion p
         LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
         WHERE p.is_disabled = 0
         ORDER BY p.id DESC`
      );
      return promotions.map(p => ({
        id: Number(p.id),
        name: p.name || p.promotionKey || `Khuyến mãi #${p.id}`,
        promotionKey: p.promotionKey,
        discountPercentage: Number(p.discountPercentage),
        discountAmount: Number(p.discountAmount)
      }));
    } catch (error: any) {
      fastify.log.error('Get promotions error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve promotions list' });
    }
  });

  // GET /api/customers/referrals
  // Get list of all customers who referred someone and their details (Optimized)
  fastify.get('/customers/referrals', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // 1. Fetch referrers summary
      const referrers = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
      const referredFriends = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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

      // 3. Fetch all referral transactions at once for active referrers only
      const referrerIds = referrers.map(r => Number(r.referrerId));
      const referralTxs = referrerIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT user_id as referrerId, amount, tracking_key FROM user_balance_transaction 
         WHERE template_id = 7 AND currency_id = 3 AND user_id IN (${referrerIds.join(',')})`
      ) : [];

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
        } catch (e) {
          // ignore parsing error
        }
      }

      // Map of referrerId -> Map of referredId -> friend_info (to collapse duplicate contacts)
      const friendsGrouped = new Map<number, Map<number, any>>();

      for (const rf of referredFriends) {
        const refId = Number(rf.referrerId);
        const friendId = Number(rf.referredId);
        if (!refId || !friendId) continue;

        if (!friendsGrouped.has(refId)) {
          friendsGrouped.set(refId, new Map<number, any>());
        }

        const refMap = friendsGrouped.get(refId)!;
        if (refMap.has(friendId)) {
          const existing = refMap.get(friendId);
          if (rf.referredPhone && !existing.phone.includes(rf.referredPhone)) {
            existing.phone = existing.phone ? `${existing.phone}, ${rf.referredPhone}` : rf.referredPhone;
          }
        } else {
          const refRewardMap = referrerRewardMaps.get(refId);
          const rewardDiamonds = refRewardMap ? (refRewardMap.get(friendId) || 0) : 0;

          refMap.set(friendId, {
            id: friendId,
            name: rf.referredName || 'Khách hàng',
            phone: rf.referredPhone || '',
            dateCreated: rf.dateCreated ? new Date(rf.dateCreated).toISOString() : null,
            rewardDiamonds
          });
        }
      }

      const friendsMap = new Map<number, any[]>();
      for (const [refId, refMap] of friendsGrouped.entries()) {
        friendsMap.set(refId, Array.from(refMap.values()));
      }

      const result = referrers.map(r => {
        const refId = Number(r.referrerId);
        return {
          referrerId: refId,
          referrerName: r.referrerName || 'Khách hàng',
          referrerPhone: r.referrerPhone || '',
          totalReferred: Number(r.totalReferred),
          totalRewardDiamonds: referrerTotalRewards.get(refId) || 0,
          referredUsers: friendsMap.get(refId) || []
        };
      });

      return result;
    } catch (error: any) {
      fastify.log.error('Get referrals list error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve referrals list' });
    }
  });

    // POST /api/customers/booking
  // Create a new booking (order and order_service) in the legacy core database
  fastify.post('/customers/booking', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    const {
      customerId,
      newCustomerName,
      newCustomerPhone,
      storeId,
      storeName,
      serviceId,
      serviceName,
      technicianId,
      technicianName,
      bookingDate,
      bookingTime,
      bookingChannel,
      bookingNote,
      promotionId,
      referralPhone
    } = request.body as any;

    try {
      // Find matching legacy user ID by CRM user (Direct link first, then exact name matching fallback)
      let legacyStaffId: number | null = null;
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true }
      });
      if (crmStaff?.legacyStaffId) {
        legacyStaffId = crmStaff.legacyStaffId;
      } else if (user.displayName) {
        const legacyStaffs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT user_id, full_name FROM user_profile 
           WHERE provider = 'Staff' AND is_disabled = 0
           ORDER BY user_id ASC`
        );
        const exactMatch = legacyStaffs.find(
          (s: any) => s.full_name?.trim() === user.displayName?.trim()
        );
        if (exactMatch) {
          legacyStaffId = Number(exactMatch.user_id);
        }
      }

      let validStaffId: number | null = null;
      if (legacyStaffId) {
        const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT id FROM user WHERE id = ? LIMIT 1`,
          legacyStaffId
        );
        if (staffExists.length > 0) {
          validStaffId = legacyStaffId;
        }
      }

      // Check referrer phone
      let referrerUserId: number | null = null;
      if (referralPhone && referralPhone.trim()) {
        const referrerContact = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
          referralPhone.trim()
        );
        if (referrerContact.length > 0) {
          referrerUserId = Number(referrerContact[0].user_id);
        } else {
          return reply.status(400).send({ 
            error: 'Bad Request', 
            message: `Không tìm thấy tài khoản người giới thiệu với SĐT: ${referralPhone}. Vui lòng kiểm tra lại.` 
          });
        }
      }

      let finalCustomerId = customerId;

      // 1. If it's a new customer, create parent user, user_profile, and user_contact records
      if (!finalCustomerId) {
        // Insert parent user record
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user (created_staff_id, date_created) VALUES (?, NOW())`,
          validStaffId
        );

        const lastInsertedUser = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT LAST_INSERT_ID() as id`
        );
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
          finalCustomerId, 11, 1, 1, randPasscode, 'Client', firstName, lastName, newCustomerName, storeId, 0, 
          0, 0, 1, '', 0, 0, referrerUserId
        );

        if (newCustomerPhone) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `INSERT INTO user_contact (user_id, phone_number, is_disabled, date_created)
             VALUES (?, ?, 0, NOW())`,
            finalCustomerId, newCustomerPhone
          );
        }
      } else {
        // If existing customer, update referrer if they don't have one yet
        if (referrerUserId) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE user_profile SET referrer_user_id = ? WHERE user_id = ? AND referrer_user_id IS NULL`,
            referrerUserId, finalCustomerId
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
      const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
        const promoRows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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

      // Adjust date timezone for SQL representation
      const mysqlStart = startDate.toISOString().slice(0, 19).replace('T', ' ');
      const mysqlEnd = endDate.toISOString().slice(0, 19).replace('T', ' ');

      // 5. Create the booking order
      const orderKey = 'booking_' + Math.random().toString(36).substring(2, 12);
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO \`order\` (
          client_id, client_business_id, created_staff_id, order_key, client_store_id, 
          user_id, currency_id, booking_note, booking_channels, booking_duration_minute, 
          booking_date_start, booking_date_end, total_quantity, total_price, order_state, 
          last_day_order_completed, combo_sale_required, is_new, is_debt, date_created, date_updated,
          promotion_id, selected_promotion_id, campaign_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
        11, 1, validStaffId, orderKey, storeId, finalCustomerId, 1, bookingNote || '', bookingChannel || 'FB', srvDuration,
        mysqlStart, mysqlEnd, 1, finalPrice, 'Confirmed', 0, 0, 1, 0, selectedPromoId, selectedPromoId, campaignId
      );

      // Get inserted order ID
      const insertedOrder = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT id FROM \`order\` WHERE order_key = ? LIMIT 1`,
        orderKey
      );
      if (insertedOrder.length === 0) {
        throw new Error('Failed to create booking order.');
      }
      const orderId = Number(insertedOrder[0].id);

      // 5. Create order_service record
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_service (
          client_id, client_business_id, user_id, order_id, service_id, 
          service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id, 
          duration_minute, quantity, service_price, discount_amount, paid_credit_amount, 
          tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        11, 1, finalCustomerId, orderId, finalServiceId, 'Normal', 'LashesTop', 'new', technicianId, technicianId,
        srvDuration, 1, srvPrice, discountAmount, 0, 0, 0, 0, 0, 0, finalPrice
      );

      // 6. Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart, finalCustomerId
      );

      // 7. Check and assign customer to the logged-in CRM staff member if not already assigned
      const existingAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
        where: { legacyUserId: finalCustomerId }
      });

      if (!existingAssignment) {
        const crmStaffExists = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: user.id }
        });
        
        if (crmStaffExists) {
          await fastify.prisma.crm.crmCustomerAssignment.create({
            data: {
              legacyUserId: finalCustomerId,
              staffId: user.id,
              assignedBy: user.id
            }
          });
          
          const batchId = `alloc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: finalCustomerId,
              prevStaffId: null,
              newStaffId: user.id,
              assignedBy: user.id
            }
          });
        }
      }

      return { success: true, orderId, customerId: finalCustomerId };
    } catch (error: any) {
      fastify.log.error('[Booking] Failed to create booking:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create booking'
      });
    }
  });

  
  // PUT /api/customers/booking/:id
  // Reschedule an existing booking
  fastify.put('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ' });
    }

    const {
      storeId,
      storeName,
      technicianId,
      technicianName,
      bookingDate,
      bookingTime,
      bookingNote
    } = request.body as {
      storeId: number;
      storeName: string;
      technicianId: number | null;
      technicianName?: string;
      bookingDate: string; // YYYY-MM-DD
      bookingTime: string; // HH:mm
      bookingNote?: string | null;
    };

    if (!storeId || !bookingDate || !bookingTime) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Các thông tin Chi nhánh, Ngày đặt và Khung giờ trống là bắt buộc'
      });
    }

    try {
      // 1. Fetch current order details (like duration and user_id)
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT user_id, booking_duration_minute FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const duration = Number(order.booking_duration_minute) || 90;
      const finalCustomerId = Number(order.user_id);

      // 2. Calculate new dates
      const startStr = `${bookingDate} ${bookingTime}:00`;
      const startDate = new Date(startStr);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      const mysqlStart = startDate.toISOString().slice(0, 19).replace('T', ' ');
      const mysqlEnd = endDate.toISOString().slice(0, 19).replace('T', ' ');

      // 3. Update order in legacy database
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET booking_date_start = ?, 
             booking_date_end = ?, 
             assigned_staff_id = ?, 
             client_store_id = ?, 
             booking_note = ?, 
             date_updated = NOW()
         WHERE id = ?`,
        mysqlStart,
        mysqlEnd,
        technicianId || null,
        storeId,
        bookingNote || null,
        orderId
      );

      // 4. Update order_service record KTV assignment
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE order_service 
         SET assigned_staff_id = ?, booked_staff_id = ? 
         WHERE order_id = ?`,
        technicianId || null,
        technicianId || null,
        orderId
      );

      // 5. Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart, finalCustomerId
      );

      return reply.send({ success: true, orderId });
    } catch (err: any) {
      fastify.log.error(err, 'Reschedule booking error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message || 'Không thể dời lịch hẹn.' });
    }
  });

  // DELETE /api/customers/booking/:id
  // Cancel a booking (soft delete by setting order_state = 'Cancelled')
  fastify.delete('/customers/booking/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID lịch hẹn không hợp lệ' });
    }

    try {
      // 1. Fetch the order details first to verify existence
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT id FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      // 2. Perform soft delete / update status to 'Cancelled'
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET order_state = 'Cancelled', 
             date_updated = NOW() 
         WHERE id = ?`,
        orderId
      );

      return reply.send({ success: true, orderId });
    } catch (err: any) {
      fastify.log.error(err, 'Cancel booking error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message || 'Không thể hủy lịch hẹn.' });
    }
  });

  // POST /api/customers/assign
  // Assign multiple customers to a staff member
  fastify.post('/customers/assign', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, staffId } = request.body as { customerIds: number[]; staffId: number };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !staffId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds and staffId are required' });
    }

    try {
      // 1. Get current assignments for all selected customerIds to know prevStaffId
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } }
      });
      const assignmentMap = new Map(currentAssignments.map(a => [a.legacyUserId, a.staffId]));

      // 2. Generate a unique batch ID
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 3. Perform upserts and create history entries in a transaction
      await fastify.prisma.crm.$transaction([
        ...customerIds.map(cid => 
          fastify.prisma.crm.crmCustomerAssignment.upsert({
            where: { legacyUserId: cid },
            update: { staffId, assignedBy: adminUser.id },
            create: { legacyUserId: cid, staffId, assignedBy: adminUser.id }
          })
        ),
        ...customerIds.map(cid => 
          fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: assignmentMap.get(cid) ?? null,
              newStaffId: staffId,
              assignedBy: adminUser.id
            }
          })
        )
      ]);

      return { success: true, count: customerIds.length, batchId };
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Assign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to assign customers' });
    }
  });

  // POST /api/customers/unassign
  // Unassign multiple customers (remove their assignments)
  fastify.post('/customers/unassign', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds } = request.body as { customerIds: number[] };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hủy phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      // 1. Get current assignments for all selected customerIds
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } }
      });
      const assignmentMap = new Map(currentAssignments.map(a => [a.legacyUserId, a.staffId]));

      // 2. Generate a unique batch ID
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 3. Perform deletes and create history entries in a transaction
      await fastify.prisma.crm.$transaction([
        fastify.prisma.crm.crmCustomerAssignment.deleteMany({
          where: { legacyUserId: { in: customerIds } }
        }),
        ...customerIds.map(cid => 
          fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: assignmentMap.get(cid) ?? null,
              newStaffId: null,
              assignedBy: adminUser.id
            }
          })
        )
      ]);

      return { success: true, count: customerIds.length, batchId };
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Unassign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to unassign customers' });
    }
  });

  // GET /api/customers/assignment-history
  // Get history of allocations grouped by batchId
  fastify.get('/customers/assignment-history', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem lịch sử phân bổ.' });
    }

    const { page = '1', limit = '10' } = request.query as { page?: string; limit?: string };
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    try {
      // 1. Get unique batchIds with pagination (ordered by assignedAt desc)
      const distinctHistory = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        distinct: ['batchId'],
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          newStaff: { select: { displayName: true } },
          assigner: { select: { displayName: true } }
        }
      });

      // 2. Fetch total count of distinct batches
      const allBatches = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId']
      });
      const total = allBatches.length;

      if (distinctHistory.length === 0) {
        return {
          data: [],
          pagination: {
            total: 0,
            page: pageNum,
            limit: limitNum,
            pages: 0
          }
        };
      }

      // 3. For each distinct batch, fetch the total count of customers and if the batch is undone
      const batchIds = distinctHistory.map(h => h.batchId);
      const batchStats = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId', 'isUndone'],
        where: { batchId: { in: batchIds } },
        _count: { id: true }
      });

      // Group stats by batchId
      const statsMap = new Map<string, { count: number; isUndone: boolean }>();
      batchStats.forEach(stat => {
        const existing = statsMap.get(stat.batchId);
        if (existing) {
          existing.count += stat._count.id;
          if (stat.isUndone) existing.isUndone = true;
        } else {
          statsMap.set(stat.batchId, {
            count: stat._count.id,
            isUndone: !!stat.isUndone
          });
        }
      });

      const data = distinctHistory.map(h => {
        const stat = statsMap.get(h.batchId) || { count: 0, isUndone: false };
        return {
          batchId: h.batchId,
          assignedAt: h.assignedAt,
          assignedBy: h.assigner?.displayName || 'Hệ thống',
          newStaffName: h.newStaff?.displayName || null,
          customerCount: stat.count,
          isUndone: !!h.isUndone || stat.isUndone,
          undoneAt: h.undoneAt
        };
      });

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      };
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Get assignment history error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history' });
    }
  });

  // GET /api/customers/assignment-history/:batchId/details
  // Get detailed list of customers assigned in a batch
  fastify.get('/customers/assignment-history/:batchId/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem chi tiết phân bổ.' });
    }

    const { batchId } = request.params as { batchId: string };
    if (!batchId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
    }

    try {
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { batchId },
        include: {
          prevStaff: { select: { displayName: true } },
          newStaff: { select: { displayName: true } }
        },
        orderBy: { id: 'asc' }
      });

      if (historyRecords.length === 0) {
        return { data: [] };
      }

      const customerIds = historyRecords.map(r => r.legacyUserId);

      // Fetch customer names and phones from legacy database using queryRawUnsafe
      const legacyCustomers = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          u.id,
          up.full_name as fullName,
          (
            SELECT uc.phone_number 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 
            LIMIT 1
          ) as phone
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        WHERE u.id IN (${customerIds.join(',')})
      `);

      const customerMap = new Map(legacyCustomers.map(c => [Number(c.id), c]));

      const data = historyRecords.map(r => {
        const legacyCust = customerMap.get(r.legacyUserId) || { fullName: `Khách hàng #${r.legacyUserId}`, phone: 'N/A' };
        return {
          id: r.id,
          legacyUserId: r.legacyUserId,
          fullName: legacyCust.fullName || `Khách hàng #${r.legacyUserId}`,
          phone: legacyCust.phone || 'N/A',
          prevStaffName: r.prevStaff?.displayName || 'Chưa phân bổ',
          newStaffName: r.newStaff?.displayName || 'Gỡ Booker',
          isUndone: r.isUndone === true || (r.isUndone as any) === 1,
          undoneAt: r.undoneAt
        };
      });

      return { data };
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Get assignment history details error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history details' });
    }
  });

  // POST /api/customers/assignment-history/undo
  // Undo a batch of assignments
  fastify.post('/customers/assignment-history/undo', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hoàn tác phân bổ.' });
    }

    const { batchId } = request.body as { batchId: string };
    if (!batchId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
    }

    try {
      // 1. Find all history records for this batch that are not undone
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { batchId, isUndone: false }
      });

      if (historyRecords.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Đợt phân bổ này không tồn tại hoặc đã được hoàn tác trước đó.' });
      }

      const customerIds = historyRecords.map(r => r.legacyUserId);
      const newStaffId = historyRecords[0].newStaffId;

      // 2. Fetch current assignments of these customers to check if they've changed
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } }
      });
      const currentMap = new Map(currentAssignments.map(a => [a.legacyUserId, a.staffId]));

      // 3. Determine which assignments can be safely reverted (where current staff matches newStaffId of the batch)
      const assignmentsToRevert: typeof historyRecords = [];
      for (const record of historyRecords) {
        const currentStaffId = currentMap.get(record.legacyUserId);
        
        const isCurrentMatch = (newStaffId === null && currentStaffId === undefined) || 
                              (newStaffId !== null && currentStaffId === newStaffId);
                              
        if (isCurrentMatch) {
          assignmentsToRevert.push(record);
        }
      }

      // 4. Run the reversion in a transaction
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const record of assignmentsToRevert) {
          if (record.prevStaffId === null) {
            await tx.crmCustomerAssignment.deleteMany({
              where: { legacyUserId: record.legacyUserId }
            });
          } else {
            await tx.crmCustomerAssignment.upsert({
              where: { legacyUserId: record.legacyUserId },
              update: { staffId: record.prevStaffId, assignedBy: adminUser.id },
              create: { legacyUserId: record.legacyUserId, staffId: record.prevStaffId, assignedBy: adminUser.id }
            });
          }
        }

        // Mark the entire batch in history as undone
        await tx.crmAssignmentHistory.updateMany({
          where: { batchId },
          data: {
            isUndone: true,
            undoneAt: new Date()
          }
        });
      });

      return { 
        success: true, 
        revertedCount: assignmentsToRevert.length, 
        totalCount: historyRecords.length,
        skippedCount: historyRecords.length - assignmentsToRevert.length
      };
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Undo assignment error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to undo assignments' });
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
      if (user.role !== 'admin') {
        const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
          where: {
            legacyUserId: customerId,
            staffId: user.id
          }
        });
        if (!assigned) {
          return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin khách hàng này.' });
        }
      }
      const sql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
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

      const result = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(sql, customerId);

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
        comboBalance: row.bucket !== 'SINGLE' ? {
          normalCount: Number(row.normalCount || 0),
          retainCount: Number(row.retainCount || 0),
          expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null
        } : null,
        avatar: row.avatar
      };

      return customer;
    } catch (error: any) {
      fastify.log.error('Get customer by id error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve customer' 
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
      if (user.role !== 'admin') {
        const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
          where: {
            legacyUserId: customerId,
            staffId: user.id
          }
        });
        if (!assigned) {
          return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xem lịch sử của khách hàng này.' });
        }
      }
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

      const result = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(sql, customerId);

      const history = result.map((row: any) => ({
        id: row.id,
        orderKey: row.orderKey,
        dateCreated: new Date(row.dateCreated).toISOString(),
        totalPrice: Number(row.totalPrice || 0),
        orderState: row.orderState,
        bookingChannel: row.bookingChannel
      }));

      return history;
    } catch (error: any) {
      fastify.log.error('Get customer order history error:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve customer order history' 
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
      // 1. Authorization check & Fetch CRM Assignment for Online Consultant
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: customerId },
        include: { staff: true }
      });
      const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

      if (user.role !== 'admin') {
        if (!assigned || assigned.staffId !== user.id) {
          return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin chi tiết khách hàng này.' });
        }
      }

      // 2. Fetch Customer Profile details
      const customerSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
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
      const customerResult = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(customerSql, customerId);
      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      // 3. Fetch LTV and Total Visits in a single query
      const statsSql = `SELECT SUM(total_price) as totalSpent, COUNT(*) as totalVisits FROM \`order\` WHERE user_id = ? AND order_state = 'Completed'`;
      const statsResult = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(statsSql, customerId);
      const statsRow = statsResult[0] || {};
      const totalSpent = Number(statsRow.totalSpent || 0);
      const totalVisits = Number(statsRow.totalVisits || 0);

      // 4. Calculate Average Visit Frequency (in days)
      const bookingDatesResult = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT booking_date_start as date FROM \`order\` WHERE user_id = ? AND order_state = 'Completed' ORDER BY booking_date_start ASC`,
        customerId
      );
      let avgFrequency = 0;
      if (bookingDatesResult.length > 1) {
        let totalDays = 0;
        for (let i = 1; i < bookingDatesResult.length; i++) {
          const prev = new Date(bookingDatesResult[i - 1].date).getTime();
          const curr = new Date(bookingDatesResult[i].date).getTime();
          totalDays += (curr - prev) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Number((totalDays / (bookingDatesResult.length - 1)).toFixed(1));
      }

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
      const comboBalances = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(balanceSql, customerId);

      // Fetch Gem Balance and transactions
      const gemBalanceRow = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
      const gemTransactions = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(gemTransactionsSql, customerId);

      // Fetch Referrer details (Who referred this customer)
      const referrerRow = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
      const referrer = referrerRow.length > 0 ? {
        id: Number(referrerRow[0].id),
        name: referrerRow[0].name,
        phone: referrerRow[0].phone
      } : null;

      // Fetch Referred Users list (Who this customer referred)
      const referredUsers = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
      const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
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
        } catch (e) {
          // ignore parsing error
        }
      }

      // Collapse duplicate contacts by user ID
      const friendsGrouped = new Map<number, any>();
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
            rewardDiamonds: rewardMap.get(friendId) || 0
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

      const [bookingsRaw, servicesRaw] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(bookingsSql, customerId),
        fastify.prisma.legacy.$queryRawUnsafe<any[]>(servicesSql, customerId)
      ]);

      const bookingIds = bookingsRaw.map(b => Number(b.id));
      const orderServicesDetails = bookingIds.length > 0 ? await fastify.prisma.legacy.order_service.findMany({
        where: { order_id: { in: bookingIds } },
        select: {
          order_id: true,
          assigned_staff_id: true,
          check_in_staff_id: true,
          check_out_staff_id: true
        }
      }) : [];

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
      const staffProfiles = staffIdArray.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT user_id as userId, full_name as fullName
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `) : [];
      const staffNamesMap = new Map<number, string>(staffProfiles.map(s => [Number(s.userId), s.fullName]));

      // Map services to bookings
      const servicesByOrderId = new Map<number, string[]>();
      for (const s of servicesRaw) {
        const list = servicesByOrderId.get(Number(s.orderId)) || [];
        list.push(s.serviceName);
        servicesByOrderId.set(Number(s.orderId), list);
      }

      const formattedBookings = bookingsRaw.map(b => {
        const orderSvs = orderServicesDetails.filter(os => os.order_id === b.id);
        const checkInStaffId = orderSvs.find(os => os.check_in_staff_id)?.check_in_staff_id;
        const checkOutStaffId = orderSvs.find(os => os.check_out_staff_id)?.check_out_staff_id;
        const firstCvStaffId = b.technicianId || orderSvs.find(os => os.assigned_staff_id)?.assigned_staff_id;

        return {
          id: b.id,
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString() : null,
          bookingNote: b.bookingNote || '',
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          branchName: b.branchName,
          technicianName: firstCvStaffId ? (staffNamesMap.get(Number(firstCvStaffId)) || 'Kỹ thuật viên') : (b.assignedTechnicianName || 'Unknown'),
          ccInName: checkInStaffId ? (staffNamesMap.get(Number(checkInStaffId)) || 'Tư vấn viên') : 'Unknown',
          ccOutName: checkOutStaffId ? (staffNamesMap.get(Number(checkOutStaffId)) || 'Tư vấn viên') : 'Unknown',
          bookerName: b.createdStaffId ? (staffNamesMap.get(Number(b.createdStaffId)) || 'Unknown') : 'Unknown',
          technicianId: b.technicianId ? Number(b.technicianId) : null,
          storeId: b.storeId ? Number(b.storeId) : null,
          services: servicesByOrderId.get(Number(b.id)) || []
        };
      });

      // 7. Fetch Notes from user_note
      const notesSql = `
        SELECT 
          un.id,
          un.note,
          un.is_sticky as isSticky,
          un.is_issue as isIssue,
          un.date_created as dateCreated,
          COALESCE(up.full_name, 'System') as staffName
        FROM user_note un
        LEFT JOIN user_profile up ON un.created_staff_id = up.user_id
        WHERE un.user_id = ? AND un.is_disabled = 0
        ORDER BY un.date_created DESC
      `;
      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(notesSql, customerId);
      const formattedNotes = notesRaw.map(n => ({
        id: Number(n.id),
        note: n.note || '',
        isSticky: Boolean(n.isSticky),
        isIssue: Boolean(n.isIssue),
        dateCreated: n.dateCreated ? new Date(n.dateCreated).toISOString() : null,
        staffName: n.staffName
      }));

      // 8. Fetch CRM Call Logs
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId: customerId },
        orderBy: { createdAt: 'desc' }
      });
      const staffIds = Array.from(new Set(logs.map(l => l.staffId)));
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true }
      });
      const staffMap = new Map(staffList.map(s => [s.id, s.displayName]));
      const formattedCalls = logs.map(log => ({
        id: log.id,
        planId: log.planId,
        callType: log.callType,
        callResult: log.callResult,
        durationSec: log.durationSec,
        note: log.note,
        outcome: log.outcome,
        callbackDate: log.callbackDate ? new Date(log.callbackDate).toISOString().split('T')[0] : null,
        createdAt: log.createdAt.toISOString(),
        staffName: staffMap.get(log.staffId) || 'Unknown Staff'
      }));

      const comboWalletBalance = comboBalances.reduce((sum, cb) => {
        return sum + Number(cb.totalNormalBalanceAmount || 0) + Number(cb.totalRetainBalanceAmount || 0);
      }, 0);

      return {
        customer: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          gender: row.gender,
          dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          avatar: row.avatar,
          onlineConsultant: onlineConsultantName
        },
        stats: {
          totalSpent: totalSpent,
          totalVisits: totalVisits,
          comboCount: Number(row.normalCount || 0) + Number(row.retainCount || 0),
          comboWalletBalance: comboWalletBalance,
          gemBalance: gemBalance,
          avgFrequency: avgFrequency
        },
        comboBalances: comboBalances.map(cb => ({
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
          packagePrice: cb.packagePrice ? Number(cb.packagePrice) : null
        })),
        bookings: formattedBookings,
        notes: formattedNotes,
        calls: formattedCalls,
        gemTransactions: (() => {
          const formatDate = (dateInput: any) => {
            if (!dateInput) return '';
            const d = new Date(dateInput);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          };

          const formatGemDescription = (trans: any) => {
            if (trans.description && trans.description.trim()) {
              return trans.description;
            }

            const tid = trans.templateId;
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

          return gemTransactions.map(t => ({
            id: Number(t.id),
            method: t.method,
            amount: Number(t.amount),
            balance: Number(t.balance),
            description: formatGemDescription(t),
            dateCreated: t.dateCreated ? new Date(t.dateCreated).toISOString() : null,
            staffName: t.staffName || 'Hệ thống'
          }));
        })(),
        referrer: referrer,
        referredUsers: formattedReferred
      };

    } catch (error: any) {
      fastify.log.error('Get detailed customer error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve detailed customer profile'
      });
    }
  });

  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, type, staffId, page, limit } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      type?: 'pending' | 'completed';
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
          where: { id: targetStaffId }
        });

        if (staff) {
          staffRole = staff.role;
          // Strip " CC" suffix from name if it exists to match legacy user full_name
          const cleanName = staff.displayName.replace(/\s+CC$/i, '').trim();

          const profiles = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
            SELECT up.user_id as userId
            FROM \`staff_profile\` sp
            JOIN \`user_profile\` up ON sp.user_id = up.user_id
            WHERE up.provider = 'Staff' AND up.is_disabled = 0
              AND (up.full_name = ? OR up.full_name = ?)
            ORDER BY up.user_id DESC
            LIMIT 1
          `, cleanName, cleanName + ' ');

          if (profiles.length > 0) {
            staffLegacyId = Number(profiles[0].userId);
          }
        }
      }

      // Query assigned customer IDs for this staff
      let assignedCustomerIds: number[] = [];
      if (filterByStaff) {
        const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { staffId: targetStaffId },
          select: { legacyUserId: true }
        });
        assignedCustomerIds = assignments.map(a => Number(a.legacyUserId));
      }

      // If staff selected but no corresponding legacy user found AND no assigned customers, return empty list
      if (filterByStaff && !staffLegacyId && assignedCustomerIds.length === 0) {
        return { data: [], total: 0 };
      }

      // 2. Query total count matching filters
      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
      `;
      const countParams: any[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff) {
        if (assignedCustomerIds.length > 0) {
          if (staffLegacyId) {
            countSql += ` AND (o.user_id IN (${assignedCustomerIds.join(',')}) OR o.created_staff_id = ?)`;
            countParams.push(staffLegacyId);
          } else {
            countSql += ` AND o.user_id IN (${assignedCustomerIds.join(',')})`;
          }
        } else {
          if (staffLegacyId) {
            countSql += ` AND o.created_staff_id = ?`;
            countParams.push(staffLegacyId);
          } else {
            countSql += ` AND 1=0`;
          }
        }
      }

      if (type === 'completed') {
        countSql += ` AND o.order_state = 'Completed'`;
      } else {
        countSql += ` AND o.order_state NOT IN ('Completed', 'Cancelled')`;
      }

      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(countSql, ...countParams);
      const total = Number(countResult[0]?.total || 0);

      // 3. Query orders/bookings in range with pagination
      let sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.booking_date_start as bookingDateStart,
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
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
      `;

      const params: any[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff) {
        if (assignedCustomerIds.length > 0) {
          if (staffLegacyId) {
            sql += ` AND (o.user_id IN (${assignedCustomerIds.join(',')}) OR o.created_staff_id = ?)`;
            params.push(staffLegacyId);
          } else {
            sql += ` AND o.user_id IN (${assignedCustomerIds.join(',')})`;
          }
        } else {
          if (staffLegacyId) {
            sql += ` AND o.created_staff_id = ?`;
            params.push(staffLegacyId);
          } else {
            sql += ` AND 1=0`;
          }
        }
      }

      if (type === 'completed') {
        sql += ` AND o.order_state = 'Completed'`;
      } else {
        sql += ` AND o.order_state NOT IN ('Completed', 'Cancelled')`;
      }

      sql += ` ORDER BY o.booking_date_start ASC LIMIT ? OFFSET ?`;
      params.push(limitNum, offsetNum);

      const result = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(sql, ...params);

      // 4. Fetch payment details and service details for completed/active orders to calculate financial metrics
      const orderIds = result.map(o => Number(o.id));
      const completedOrderIds = result.filter(o => o.orderState === 'Completed').map(o => Number(o.id));

      const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
      if (completedOrderIds.length > 0) {
        const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        orderPayments.forEach((op: any) => {
          const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
          const paidSum = Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
          orderPaymentMap.set(Number(op.orderId), {
            tips: existing.tips + Number(op.tipAmount || 0),
            debt: existing.debt + Number(op.debt || 0),
            totalPaid: existing.totalPaid + paidSum
          });
        });
      }

      const orderServicesMap = new Map<number, any[]>();
      const serviceNameMap = new Map<number, string>();
      if (orderIds.length > 0) {
        const orderServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: orderIds } }
        });
        orderServices.forEach(os => {
          const l = orderServicesMap.get(os.order_id) || [];
          l.push(os);
          orderServicesMap.set(os.order_id, l);
        });

        const serviceIds = Array.from(new Set(orderServices.map(os => os.service_id)));
        if (serviceIds.length > 0) {
          const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: serviceIds } }
          });
          serviceLanguages.forEach(sl => {
            serviceNameMap.set(sl.service_id, sl.service_name);
          });
        }
      }

      // Fetch config
      const conf = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_SALARY_CONFIG' }
      });
      let config: any = {
        baseSalary: 5500000,
        tipsPercent: 7,
        clientBonusFullSet: { discount0: 35000, discount30: 12000, discount50: 6000, discountMore: 1000 },
        clientBonusRefill: { discount30: 9000, discount50: 6000, discountMore: 1000 },
        doneBonusTiers: [],
        missedBonusTiers: [],
        revBonusTiers: []
      };
      if (conf) {
        try {
          config = JSON.parse(conf.value);
        } catch (e) {}
      }

      // 3.5. Query all orders in range to calculate summary KPIs (without pagination)
      let allOrdersSql = `
        SELECT 
          o.id,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.booking_date_start as bookingDateStart,
          o.user_id as userId,
          o.date_created as dateCreated
        FROM \`order\` o
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
          AND o.order_state != 'Cancelled'
      `;
      const allOrdersParams: any[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          allOrdersSql += ` AND o.assigned_staff_id = ?`;
        } else {
          allOrdersSql += ` AND o.created_staff_id = ?`;
        }
        allOrdersParams.push(staffLegacyId);
      }

      const allOrdersInRange = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(allOrdersSql, ...allOrdersParams);

      // Collect all customer IDs from both allOrdersInRange and the paginated result
      const allRangeUserIds = allOrdersInRange.map(o => Number(o.userId)).filter(id => !isNaN(id));
      const paginatedUserIds = result.map(o => Number(o.userId)).filter(id => !isNaN(id));
      const customerIds = Array.from(new Set([...allRangeUserIds, ...paginatedUserIds]));

      const userBalances = customerIds.length > 0 ? await fastify.prisma.legacy.user_service_balance.findMany({
        where: { user_id: { in: customerIds } }
      }) : [];

      const balanceIds = userBalances.map(b => b.id);
      const userBalanceTransactions = balanceIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT usbt.*, o.booking_date_start as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `) : [];

      const txnsByBalanceId = new Map<number, any[]>();
      for (const t of userBalanceTransactions) {
        const bid = Number(t.user_service_balance_id);
        let list = txnsByBalanceId.get(bid);
        if (!list) {
          list = [];
          txnsByBalanceId.set(bid, list);
        }
        list.push(t);
      }

      const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
        const bTime = bookingDateStart || orderCreatedDate;
        const userBals = userBalances.filter(b => b.user_id === userId);
        
        for (const usb of userBals) {
          if (new Date(usb.date_created) >= new Date(bTime)) {
            continue;
          }

          const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(t => 
            new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
          );

          txnsBefore.sort((a, b) => {
            const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
            const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.id - a.id;
          });

          const lastTxnBefore = txnsBefore[0];

          const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
          const isNotExpired = !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));

          let countLeft = 0;
          if (lastTxnBefore && lastTxnBefore.total_normal_count_left !== null && lastTxnBefore.total_retain_count_left !== null) {
            countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
          } else {
            const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(t => 
              new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
            );
            
            let usedAfter = 0;
            txnsAfterOrAt.forEach(t => {
              if (t.used_staff_id !== null) {
                usedAfter += (t.normal_count || 0) + (t.retain_count || 0);
              }
            });

            countLeft = (usb.normal_count || 0) + (usb.retain_count || 0) + usedAfter;
          }

          if (isNotExpired && countLeft > 0) {
            return true;
          }
        }
        return false;
      };

      const summaryCompletedOrders = allOrdersInRange.filter(o => o.orderState === 'Completed');
      const summaryCompletedOrderIds = summaryCompletedOrders.map(o => Number(o.id));

      let summaryTotalTips = 0;
      let summaryClientBonus = 0;
      let summaryTotalNetRev = 0;

      if (summaryCompletedOrderIds.length > 0) {
        const summaryPayments = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT order_id as orderId, tip_amount as tipAmount
          FROM \`order_payment\`
          WHERE order_id IN (${summaryCompletedOrderIds.join(',')})
        `);
        summaryPayments.forEach(p => {
          summaryTotalTips += Number(p.tipAmount || 0);
        });

        const summaryServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: summaryCompletedOrderIds } }
        });

        const summaryServiceIds = Array.from(new Set(summaryServices.map(os => os.service_id)));
        const summaryServiceNameMap = new Map<number, string>();
        if (summaryServiceIds.length > 0) {
          const summaryServiceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: summaryServiceIds } }
          });
          summaryServiceLanguages.forEach(sl => {
            summaryServiceNameMap.set(sl.service_id, sl.service_name);
          });
        }

        const summaryServicesMap = new Map<number, any[]>();
        summaryServices.forEach(os => {
          const list = summaryServicesMap.get(os.order_id) || [];
          list.push(os);
          summaryServicesMap.set(os.order_id, list);
        });

        summaryCompletedOrders.forEach(o => {
          summaryTotalNetRev += Number(o.totalPrice || 0);
          const list = summaryServicesMap.get(Number(o.id)) || [];
          if (list.length > 0) {
            let primaryService = list[0];
            for (const os of list) {
              if (os.service_price > (primaryService?.service_price || 0)) {
                primaryService = os;
              }
            }
            const serviceName = summaryServiceNameMap.get(primaryService.service_id) || "Unknown";
            let discountPercent = 0;
            if (primaryService.service_price > 0) {
              discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            const isRefill = serviceName.toLowerCase().includes('refill');
            const isCombo = checkHasLiveCombo(
              Number(o.userId),
              o.bookingDateStart ? new Date(o.bookingDateStart) : null,
              o.dateCreated ? new Date(o.dateCreated) : new Date()
            );

            let bonus = 0;
            if (isCombo) {
              bonus = 0;
            } else if (isRefill) {
              if (discountPercent === 0) bonus = config.clientBonusRefill.discount30 || 0;
              else if (discountPercent <= 30) bonus = config.clientBonusRefill.discount30 || 0;
              else if (discountPercent <= 50) bonus = config.clientBonusRefill.discount50 || 0;
              else bonus = config.clientBonusRefill.discountMore || 0;
            } else {
              if (discountPercent === 0) bonus = config.clientBonusFullSet.discount0 || 0;
              else if (discountPercent <= 30) bonus = config.clientBonusFullSet.discount30 || 0;
              else if (discountPercent <= 50) bonus = config.clientBonusFullSet.discount50 || 0;
              else bonus = config.clientBonusFullSet.discountMore || 0;
            }

            summaryClientBonus += bonus;
          }
        });
      }

      const now = new Date();
      // Filter for past or present bookings (up to today/now) to calculate rates
      const pastOrPresentOrders = allOrdersInRange.filter(o => o.bookingDateStart ? new Date(o.bookingDateStart) <= now : true);
      const totalPlanned = pastOrPresentOrders.length;
      const totalCheckin = pastOrPresentOrders.filter(o => o.orderState === 'Completed').length;
      const checkInRate = totalPlanned > 0 ? (totalCheckin / totalPlanned) * 100 : 0;
      const baseSalary = config.baseSalary || 0;

      let doneBonus = 0;
      let doneLevelCount = 0;
      const sortedDoneTiers = [...(config.doneBonusTiers || [])].sort((a, b) => b.minCount - a.minCount);
      // Wait: doneCount should still be based on overall completed orders in the range or only past/present?
      // Since it's done count, completed orders in the future (if any) are already done, so we can use overall completed count in the range or just completed.
      // Usually, it's completed count in the selected period, so using summaryCompletedOrders.length (which is overall completed count) is correct.
      // Let's use overall completed orders for Done bonus tiers.
      const overallCompletedCount = summaryCompletedOrders.length;
      const matchedDone = sortedDoneTiers.find(t => overallCompletedCount >= t.minCount);
      if (matchedDone) {
        doneBonus = matchedDone.bonus;
        doneLevelCount = matchedDone.minCount;
      }

      let missedBonus = 0;
      let missedLevelRate = 0;
      const missedCount = totalPlanned - totalCheckin;
      const missedRatePct = totalPlanned > 0 ? (missedCount / totalPlanned) * 100 : 0;
      const sortedMissedTiers = [...(config.missedBonusTiers || [])].sort((a, b) => a.maxRate - b.maxRate);
      if (totalPlanned > 0) {
        const matchedMissed = sortedMissedTiers.find(t => missedRatePct <= t.maxRate);
        if (matchedMissed) {
          missedBonus = matchedMissed.bonus;
          missedLevelRate = matchedMissed.maxRate;
        }
      }

      const tipBonus = Math.round(summaryTotalTips * ((config.tipsPercent || 7) / 100));

      let revBonus = 0;
      let revLevelRate = 0;
      let revLevelMin = 0;
      const sortedRevTiers = [...(config.revBonusTiers || [])].sort((a, b) => b.minRev - a.minRev);
      const matchedRev = sortedRevTiers.find(t => summaryTotalNetRev >= t.minRev);
      if (matchedRev) {
        revBonus = Math.round(summaryTotalNetRev * matchedRev.rate);
        revLevelRate = matchedRev.rate;
        revLevelMin = matchedRev.minRev;
      }

      const totalSalary = baseSalary + summaryClientBonus + doneBonus + missedBonus + tipBonus + revBonus;

      const appointments = result.map((row: any) => {
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

            const isRefill = serviceName.toLowerCase().includes('refill');
            const isCombo = checkHasLiveCombo(
              Number(row.userId),
              row.bookingDateStart ? new Date(row.bookingDateStart) : null,
              row.dateCreated ? new Date(row.dateCreated) : new Date()
            );

            if (isCombo) {
              bookingBonus = 0;
              serviceName += ' (Combo - Không hoa hồng)';
            } else if (isRefill) {
              if (discountPercent === 0) bookingBonus = config.clientBonusRefill.discount30 || 0;
              else if (discountPercent <= 30) bookingBonus = config.clientBonusRefill.discount30 || 0;
              else if (discountPercent <= 50) bookingBonus = config.clientBonusRefill.discount50 || 0;
              else bookingBonus = config.clientBonusRefill.discountMore || 0;
            } else {
              if (discountPercent === 0) bookingBonus = config.clientBonusFullSet.discount0 || 0;
              else if (discountPercent <= 30) bookingBonus = config.clientBonusFullSet.discount30 || 0;
              else if (discountPercent <= 50) bookingBonus = config.clientBonusFullSet.discount50 || 0;
              else bookingBonus = config.clientBonusFullSet.discountMore || 0;
            }
          }
        }

        return {
          id: Number(row.id),
          orderKey: row.orderKey,
          bookingDateStart: row.bookingDateStart ? new Date(row.bookingDateStart).toISOString() : null,
          bookingDateEnd: row.bookingDateEnd ? new Date(row.bookingDateEnd).toISOString() : null,
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
          storeId: row.storeId ? Number(row.storeId) : null
        };
      });

      return {
        data: appointments,
        total,
        summary: {
          totalPlanned,
          totalCheckin,
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
          totalSalary
        }
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Internal Server Error', 
        message: error.message || 'Failed to retrieve appointments' 
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
        'PXL': 2
      };
      const storeId = storeNameToIdMap[storeName] || 6;

      // 1. Fetch Roster from core shift tables
      let roster: any[] = [];
      const dayOfWeek = new Date(date).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      // Check if actual instantiated shifts exist for this date and store
      const instantiatedShifts = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT sws.user_id, CAST(sws.start_time AS CHAR) as start_time_str, CAST(sws.end_time AS CHAR) as end_time_str, up.full_name
         FROM staff_working_shift sws
         JOIN user_profile up ON sws.user_id = up.user_id
         WHERE sws.date = ? AND sws.client_store_id = ? AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
        date, storeId
      );

      if (instantiatedShifts.length > 0) {
        roster = instantiatedShifts.map(s => ({
          staff_name: s.full_name,
          shift_start: s.start_time_str,
          shift_end: s.end_time_str
        }));
      } else {
        // Fall back to schedule templates
        const schedules = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT s.user_id, s.type, s.type_value, CAST(s.start_time AS CHAR) as start_time_str, CAST(s.end_time AS CHAR) as end_time_str, up.full_name
           FROM staff_working_shift_schedule s
           JOIN user_profile up ON s.user_id = up.user_id
           WHERE s.is_disabled = 0 
             AND (s.client_store_id = ? OR ((s.client_store_id = 4 OR s.client_store_id IS NULL) AND up.client_store_id = ?))
             AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
          storeId, storeId
        );

        // Filter schedules matching today's weekday / all days
        const matchedSchedules = schedules.filter(s => {
          if (s.type === 'Day' && s.type_value === 'All') return true;
          if (s.type === 'Weekday' && s.type_value === weekdayStr) return true;
          return false;
        });

        // Filter out KTVs who requested day-off
        const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved'`,
          date
        );
        const offUserIds = dayOffs.map(d => Number(d.from_user_id));

        roster = matchedSchedules
          .filter(s => !offUserIds.includes(Number(s.user_id)))
          .map(s => ({
            staff_name: s.full_name,
            shift_start: s.start_time_str,
            shift_end: s.end_time_str
          }));
      }

      // If technicianId is provided, filter the roster to only contain that KTV
      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          roster = roster.filter(r => r.staff_name === ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) }
          });
          if (staff) {
            roster = roster.filter(r => r.staff_name === staff.displayName);
          }
        }
      }

      // 2. Fetch Appointments
      let apptsQuery = `SELECT time_start, duration 
                        FROM wingsctrl_appointments 
                        WHERE store = ? AND DATE(time_start) = ? AND status != 'cancelled'`;
      let apptsParams: any[] = [storeName, date];

      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          apptsQuery += ` AND specialist_name = ?`;
          apptsParams.push(ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) }
          });
          if (staff) {
            apptsQuery += ` AND specialist_name = ?`;
            apptsParams.push(staff.displayName);
          }
        }
      }

      const appointments = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(apptsQuery, ...apptsParams);

      // 3. Generate slots (09:00 to 20:00, every 15m)
      const matrix: { [time: string]: { available: number; roster: number } } = {};
      let current = new Date(`${date}T09:00:00Z`);
      const end = new Date(`${date}T20:15:00Z`);

      while (current < end) {
        const timeStr = current.toISOString().split('T')[1].slice(0, 5);

        // Calculate active roster count at this slot time
        const activeRoster = roster.filter(r => {
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
        const activeAppointments = appointments.filter(a => {
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
          roster: rosterCount
        };

        // Advance by 15 mins
        current = new Date(current.getTime() + 15 * 60000);
      }

      return matrix;
    } catch (error: any) {
      fastify.log.error('Calculate booking slots error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to calculate booking slots' });
    }
  });

  // GET /nyc/config
  // Get touchpoint config for NYC campaign
  fastify.get('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' }
      });
      if (config) {
        return JSON.parse(config.value);
      }
      // Return defaults if not configured
      const defaultConfigs = {
        NYC_30: [
          { key: 'now', label: 'Chạm Now', daysMin: 0, daysMax: 1, color: 'blue' },
          { key: '3', label: 'Chạm 3', daysMin: 3, daysMax: 3, color: 'cyan' },
          { key: '7', label: 'Chạm 7', daysMin: 7, daysMax: 7, color: 'green' },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'orange' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' }
        ],
        NYC_60: [
          { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
          { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
          { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' }
        ],
        NYC_90: [
          { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
          { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' }
        ],
        NYC_180: [
          { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
          { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' }
        ],
        NYC_365: [
          { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
          { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' }
        ],
        NYC_365plus: [
          { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
          { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' }
        ]
      };
      return defaultConfigs;
    } catch (error: any) {
      fastify.log.error('Get NYC config error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config'
      });
    }
  });

  // PUT /nyc/config
  // Save touchpoint config for NYC campaign (Admins only)
  fastify.put('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.'
      });
    }

    const configs = request.body as Record<string, any[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object'
      });
    }

    // Validate structure
    for (const [tabKey, touchpoints] of Object.entries(configs)) {
      if (!Array.isArray(touchpoints)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Touchpoints for tab ${tabKey} must be an array`
        });
      }
      for (const tp of touchpoints) {
        if (!tp.key || !tp.label || typeof tp.daysMin !== 'number' || typeof tp.daysMax !== 'number') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Mỗi touchpoint trong tab ${tabKey} phải có key, label, daysMin, và daysMax hợp lệ.`
          });
        }
      }
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'NYC_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs)
        },
        update: {
          value: JSON.stringify(configs)
        }
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error: any) {
      fastify.log.error('Save NYC config error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config'
      });
    }
  });

  // GET /api/dashboard/today - Real operational data for the "today" dashboard
  fastify.get('/dashboard/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    const getVnDateStr = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(new Date());
    };
    const targetDateStr = date || getVnDateStr();
    
    // booking_date_only needs timezone-naive date at UTC midnight
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');

    // Since database datetimes are local and Prisma reads them as UTC,
    // we query using timezone-naive start/end bounds directly
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

    const toActualDate = (dbDate: Date | null | undefined) => {
      if (!dbDate) return new Date(0);
      return new Date(Date.UTC(
        dbDate.getUTCFullYear(),
        dbDate.getUTCMonth(),
        dbDate.getUTCDate(),
        dbDate.getUTCHours(),
        dbDate.getUTCMinutes(),
        dbDate.getUTCSeconds()
      ) - 7 * 3600 * 1000);
    };

    const formatDbTime = (dbDate: Date | null | undefined) => {
      if (!dbDate) return '00:00';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}`;
    };

    try {
      // Get active Telesales/OC names from CRM database (including Tâm Nguyễn who also does telesales)
      const crmTelesales = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          OR: [
            { role: 'telesales' },
            { displayName: { in: ['Tâm Nguyễn'] } }
          ],
          isActive: true
        },
        select: { displayName: true }
      });
      const telesalesNames = new Set(crmTelesales.map(s => s.displayName.trim().toLowerCase()));
      // 1. Query bookings created today
      const bookingsOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          date_created: {
            gte: startOfDay,
            lte: endOfDay
          },
          order_state: { not: 'Cancelled' }
        },
        orderBy: { date_created: 'desc' }
      });

      // 2. Query coming today
      const comingOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          OR: [
            { booking_date_only: bookingDateOnlyDate },
            { booking_date_start: { gte: startOfDay, lte: endOfDay } }
          ],
          order_state: { not: 'Cancelled' }
        },
        orderBy: { booking_date_start: 'asc' }
      });

      const userIds = Array.from(new Set([
        ...bookingsOrders.map(o => o.user_id),
        ...comingOrders.map(o => o.user_id)
      ]));
      
      const userProfiles = userIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT up.user_id as userId, up.full_name as fullName, up.avatar, u.email, u.gender, u.date_of_birth as dob
        FROM \`user_profile\` up
        LEFT JOIN \`user\` u ON up.user_id = u.id
        WHERE up.user_id IN (${userIds.join(',')})
      `) : [];

      const userContacts = userIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT user_id as userId, phone_number as phoneNumber
        FROM \`user_contact\`
        WHERE user_id IN (${userIds.join(',')}) AND is_disabled = 0
      `) : [];

      const userBalances = userIds.length > 0 ? await fastify.prisma.legacy.user_service_balance.findMany({
        where: { user_id: { in: userIds } }
      }) : [];

      const balanceIds = userBalances.map(b => b.id);
      const userBalanceTransactions = balanceIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT usbt.*, o.booking_date_start as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `) : [];

      // Index transactions by balance ID for O(1) lookups
      const txnsByBalanceId = new Map<number, any[]>();
      for (const t of userBalanceTransactions) {
        const bid = Number(t.user_service_balance_id);
        let list = txnsByBalanceId.get(bid);
        if (!list) {
          list = [];
          txnsByBalanceId.set(bid, list);
        }
        list.push(t);
      }

      const allOrderIds = Array.from(new Set([
        ...bookingsOrders.map(o => o.id),
        ...comingOrders.map(o => o.id)
      ]));

      const allOrderServices = allOrderIds.length > 0 ? await fastify.prisma.legacy.order_service.findMany({
        where: { order_id: { in: allOrderIds } }
      }) : [];

      const profileMap = new Map(userProfiles.map(p => [Number(p.userId), p]));
      const contactMap = new Map(userContacts.map(c => [Number(c.userId), c.phoneNumber]));

      // Query promotions used by orders
      const promoIds = Array.from(new Set([
        ...bookingsOrders.map(o => o.promotion_id).filter(id => id !== null && id !== undefined),
        ...bookingsOrders.map(o => o.selected_promotion_id).filter(id => id !== null && id !== undefined),
        ...comingOrders.map(o => o.promotion_id).filter(id => id !== null && id !== undefined),
        ...comingOrders.map(o => o.selected_promotion_id).filter(id => id !== null && id !== undefined),
        ...allOrderServices.map(os => os.promotion_id).filter(id => id !== null && id !== undefined)
      ].map(id => Number(id))));

      const promotions = promoIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT p.id, p.promotion_key as promotionKey, pl.promotion_name as name
        FROM promotion p
        LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
        WHERE p.id IN (${promoIds.join(',')})
      `) : [];

      const promoMap = new Map(promotions.map(p => [Number(p.id), p.name || p.promotionKey || `PROMO-${p.id}`]));

      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT up.user_id as userId, up.full_name as fullName
        FROM \`staff_profile\` sp
        JOIN \`user_profile\` up ON sp.user_id = up.user_id
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
      `);
      const staffMap = new Map(staffProfiles.map(s => [Number(s.userId), s.fullName]));

      // Exact legacy PHP combo active helper function
      const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
        const bTime = bookingDateStart || orderCreatedDate;
        const userBals = userBalances.filter(b => b.user_id === userId);
        
        for (const usb of userBals) {
          // Condition 1: usb.date_created < booking_date_start
          if (new Date(usb.date_created) >= new Date(bTime)) {
            continue;
          }

          // Get all transactions for this balance before this booking
          const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(t => 
            new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
          );

          // Order them desc by time, then id desc
          txnsBefore.sort((a, b) => {
            const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
            const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.id - a.id;
          });

          const lastTxnBefore = txnsBefore[0];

          // Condition 2: date_expired at that time is null or >= booking_date_start
          const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
          const isNotExpired = !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));

          // Condition 3: count left at that time > 0
          let countLeft = 0;
          if (lastTxnBefore && lastTxnBefore.total_normal_count_left !== null && lastTxnBefore.total_retain_count_left !== null) {
            countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
          } else {
            // If no transaction before or counts are null, calculate based on current count + all transactions that used sessions after or at the booking
            const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(t => 
              new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
            );
            
            let usedAfter = 0;
            txnsAfterOrAt.forEach(t => {
              if (t.used_staff_id !== null) {
                usedAfter += (t.normal_count || 0) + (t.retain_count || 0);
              }
            });

            countLeft = (usb.normal_count || 0) + (usb.retain_count || 0) + usedAfter;
          }

          if (isNotExpired && countLeft > 0) {
            return true;
          }
        }
        return false;
      };

      const bookingsCombo: any[] = [];
      const bookingsOc: any[] = [];
      const bookingsOther: any[] = [];

      const formatBookingDateTime = (d: Date | null) => {
        if (!d) return 'N/A';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
      };

      bookingsOrders.forEach((o, index) => {
        const uProfile = profileMap.get(o.user_id);
        const phone = contactMap.get(o.user_id) || '';
        const name = uProfile?.fullName || 'Khách hàng';
        const email = uProfile?.email || '';
        const dob = uProfile?.dob ? new Date(uProfile.dob).toLocaleDateString('en-CA') : 'N/A';
        const gender = uProfile?.gender || 'N/A';

        // Check active combo using exact legacy logic
        const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
        const userBal = userBalances.filter(b => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : (userBal.length > 0 ? 'combo_dead' : 'single');

        const booker = staffMap.get(Number(o.created_staff_id)) || o.booking_channels || 'System';

        const orderSvs = allOrderServices.filter(cs => cs.order_id === o.id);
        const firstPromoSv = orderSvs.find(cs => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? (promoMap.get(Number(pId)) || `PROMO-${pId}`) : null;

        const firstCvStaffId = o.assigned_staff_id || (orderSvs.length > 0 ? orderSvs.find(cs => cs.assigned_staff_id !== null)?.assigned_staff_id : null);
        const cvRequested = firstCvStaffId ? (staffMap.get(Number(firstCvStaffId)) || 'Kỹ thuật viên') : 'Chưa phân công';

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if ([
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'ServiceCompleted',
          'CheckOut',
          'Parking'
        ].includes(o.order_state)) {
          status = 'serving';
        } else if (o.order_state === 'Confirmed' || o.order_state === 'New' || o.order_state === 'Approved') {
          const now = new Date();
          const actualStart = toActualDate(o.booking_date_start);
          if (o.booking_date_start && actualStart < new Date(now.getTime() - 15 * 60000)) {
            status = 'late';
          } else {
            status = o.order_state === 'New' ? 'pending' : 'confirmed';
          }
        }

        const record = {
          key: String(o.id),
          customerId: o.user_id,
          customer: name,
          avatar: uProfile?.avatar || null,
          phone,
          group,
          promo: promoName,
          booker,
          channel: o.booking_channels || 'N/A',
          branchName: o.client_store_id === 2 ? 'PXL' : (o.client_store_id === 16 ? 'Estella' : 'Đề Thám'),
          bookingDateTime: formatBookingDateTime(o.booking_date_start),
          requestedCv: cvRequested,
          status,
          bookingNote: o.booking_note || '',
          createdTime: new Date(o.date_created).toLocaleTimeString('vi-VN', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }),
          avatarColor: ['#1890ff', '#722ed1', '#f5222d', '#fa8c16', '#52c41a', '#13c2c2', '#eb2f96'][index % 7],
          code: String(o.id),
          email,
          ltv: (o.total_price || 0).toLocaleString('vi-VN') + ' đ',
          bookingsCount: 1,
          diamonds: 50,
          frequency: 'N/A',
          gender,
          dob,
          daysAway: 'Hôm nay',
          oc: booker,
          historyService: o.booking_note || 'Nối mi',
          historyBranch: o.client_store_id === 1 ? 'Đề Thám' : (o.client_store_id === 2 ? 'PXL' : 'Estella Place'),
          historyCv: 'N/A',
          historyCcIn: booker,
          historyCcOut: booker,
          historyBooker: booker,
          historyDate: new Date(o.date_created).toLocaleString('vi-VN', { timeZone: 'UTC' }),
          historyStatus: o.order_state === 'Completed' ? 'Hoàn thành' : 'Đã xác nhận',
          historyNote: o.booking_note || ''
        };

        const isOc = telesalesNames.has(booker.trim().toLowerCase());
        if (group === 'combo_live') {
          bookingsCombo.push(record);
        } else if (isOc) {
          bookingsOc.push(record);
        } else {
          bookingsOther.push(record);
        }
      });

      const comingOrderIds = comingOrders.map(o => o.id);
      
      const comingServices = comingOrderIds.length > 0 ? await fastify.prisma.legacy.order_service.findMany({
        where: { order_id: { in: comingOrderIds } }
      }) : [];

      const comingServiceIds = Array.from(new Set(comingServices.map(cs => cs.service_id)));
      const serviceLangs = comingServiceIds.length > 0 ? await fastify.prisma.legacy.service_language.findMany({
        where: { service_id: { in: comingServiceIds } }
      }) : [];
      const serviceLangMap = new Map(serviceLangs.map(sl => [sl.service_id, sl.service_name]));

      const comingProducts = comingOrderIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM \`order_product\` WHERE order_id IN (${comingOrderIds.join(',')})
      `) : [];

      const comingCombos = comingOrderIds.length > 0 ? await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM \`order_service_combo\` WHERE order_id IN (${comingOrderIds.join(',')})
      `) : [];

      // Get active CCs (check-in/out in the last 30 days and user_profile.is_disabled = 0)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeCcRows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT s.staffId
        FROM (
          SELECT DISTINCT check_in_staff_id as staffId FROM \`order_service\` WHERE check_in_staff_id IS NOT NULL AND check_in_staff_id > 0 AND date_created >= ?
          UNION
          SELECT DISTINCT check_out_staff_id as staffId FROM \`order_service\` WHERE check_out_staff_id IS NOT NULL AND check_out_staff_id > 0 AND date_created >= ?
        ) s
      `, thirtyDaysAgo, thirtyDaysAgo);

      const activeCcIds = activeCcRows.map(r => Number(r.staffId));
      let activeCcs: { id: number; name: string; branch: 'detham' | 'pxl' | 'estella' }[] = [];

      if (activeCcIds.length > 0) {
        const ccProfiles = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT user_id as userId, full_name as fullName
          FROM \`user_profile\`
          WHERE user_id IN (${activeCcIds.join(',')}) AND provider = 'Staff' AND is_disabled = 0
        `);

        // Map each CC to their preferred store in a single grouped query (Batch CC preference fetch)
        const prefStores = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
          SELECT s.staffId, o.client_store_id as storeId, COUNT(*) as count
          FROM (
            SELECT check_in_staff_id as staffId, order_id 
            FROM \`order_service\` 
            WHERE check_in_staff_id IN (${activeCcIds.join(',')})
            UNION ALL
            SELECT check_out_staff_id as staffId, order_id 
            FROM \`order_service\` 
            WHERE check_out_staff_id IN (${activeCcIds.join(',')})
          ) s
          JOIN \`order\` o ON s.order_id = o.id
          GROUP BY s.staffId, o.client_store_id
        `);

        const ccCountsMap = new Map<number, { storeId: number; count: number }>();
        for (const row of prefStores) {
          const ccId = Number(row.staffId);
          const storeId = Number(row.storeId);
          const count = Number(row.count);
          const existing = ccCountsMap.get(ccId);
          if (!existing || count > existing.count) {
            ccCountsMap.set(ccId, { storeId, count });
          }
        }

        for (const p of ccProfiles) {
          const ccId = Number(p.userId);
          const pref = ccCountsMap.get(ccId);
          const prefStoreId = pref ? pref.storeId : null;
          
          let branch: 'detham' | 'pxl' | 'estella' | null = null;
          if (prefStoreId === 6) branch = 'detham';
          else if (prefStoreId === 2) branch = 'pxl';
          else if (prefStoreId === 16) branch = 'estella';

          if (branch) {
            activeCcs.push({
              id: ccId,
              name: p.fullName.trim(),
              branch
            });
          }
        }
      }

      // 1. Query schedules for weekly off calculations
      const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT user_id, type, type_value, start_time, end_time 
         FROM staff_working_shift_schedule 
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );
      
      const schedulesByUserId: { [uid: number]: any[] } = {};
      for (const s of allSchedules) {
        const uid = Number(s.user_id);
        if (!schedulesByUserId[uid]) schedulesByUserId[uid] = [];
        schedulesByUserId[uid].push(s);
      }

      // 2. Query approved week-off requests
      const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
         FROM staff_day_off
         WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL
         GROUP BY from_user_id, weekday`
      );

      const weekOffsByUserId: { [uid: number]: { weekday: number, cnt: number }[] } = {};
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
        const worksAll = list.some(s => s.type === 'Day' && s.type_value === 'All');
        if (worksAll) return [];
        const workingWeekdays = list
          .filter(s => s.type === 'Weekday')
          .map(s => s.type_value);
        if (workingWeekdays.length === 0) return [];
        const allWeekdays = ['1', '2', '3', '4', '5', '6', '7'];
        return allWeekdays.filter(w => !workingWeekdays.includes(w));
      };

      // 3. Query specific day-offs for target date
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT from_user_id FROM staff_day_off 
         WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved' AND from_user_id IS NOT NULL`,
        targetDateStr
      );
      const offUserIds = new Set(dayOffs.map(d => Number(d.from_user_id)));

      // 4. Query active CVs (technicians)
      const activeCvs = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT user_id as userId, full_name as fullName, client_store_id as storeId
        FROM \`user_profile\`
        WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0
      `);

      const dayOfWeek = new Date(targetDateStr).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      const branchDetailMap: Record<string, any> = {
        detham: { revLe: 0, revCombo: 0, revProduct: 0, netLe: 0, netCombo: 0, netProduct: 0, cc: [], cv: [], coming: [] },
        pxl: { revLe: 0, revCombo: 0, revProduct: 0, netLe: 0, netCombo: 0, netProduct: 0, cc: [], cv: [], coming: [] },
        estella: { revLe: 0, revCombo: 0, revProduct: 0, netLe: 0, netCombo: 0, netProduct: 0, cc: [], cv: [], coming: [] }
      };

      // Pre-populate active CCs for each branch
      activeCcs.forEach(cc => {
        branchDetailMap[cc.branch].cc.push({
          id: cc.id,
          name: cc.name,
          doing: 'Nghỉ phép tuần',
          clients: 0,
          combos: 0,
          revenue: 0,
          revLe: 0,
          revCombo: 0,
          revProduct: 0,
          netRevenue: 0,
          netLe: 0,
          netCombo: 0,
          netProduct: 0,
          shift: 'off',
          attendance: 'none'
        });
      });

      comingOrders.forEach((o, index) => {
        let branchKey = 'detham';
        if (o.client_store_id === 2) branchKey = 'pxl';
        else if (o.client_store_id === 16) branchKey = 'estella';

        const uProfile = profileMap.get(o.user_id);
        const phone = contactMap.get(o.user_id) || '';
        const name = uProfile?.fullName || 'Khách hàng';

        const orderSvs = comingServices.filter(cs => cs.order_id === o.id);
        const serviceName = orderSvs.length > 0 ? (serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ') : 'Dịch vụ';
        
        let cvName = 'Chưa phân công';
        if (o.assigned_staff_id) {
          cvName = staffMap.get(Number(o.assigned_staff_id)) || 'Kỹ thuật viên';
        } else if (orderSvs.length > 0 && orderSvs[0].assigned_staff_id) {
          cvName = staffMap.get(Number(orderSvs[0].assigned_staff_id)) || 'Kỹ thuật viên';
        }

        const booker = staffMap.get(Number(o.created_staff_id)) || o.booking_channels || 'System';

        let ccName = 'Chưa nhận';
        const checkInStaffId = orderSvs.find(cs => cs.check_in_staff_id)?.check_in_staff_id || orderSvs.find(cs => cs.check_out_staff_id)?.check_out_staff_id;
        if (checkInStaffId) {
          ccName = staffMap.get(Number(checkInStaffId)) || 'Tư vấn viên';
        }

        const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
        const userBal = userBalances.filter(b => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : (userBal.length > 0 ? 'combo_dead' : 'single');

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if ([
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'ServiceCompleted',
          'CheckOut',
          'Parking'
        ].includes(o.order_state)) {
          status = 'serving';
        } else if (o.order_state === 'Confirmed' || o.order_state === 'New' || o.order_state === 'Approved') {
          const now = new Date();
          const actualStart = toActualDate(o.booking_date_start);
          if (o.booking_date_start && actualStart < new Date(now.getTime() - 15 * 60000)) {
            status = 'late';
          } else {
            status = o.order_state === 'New' ? 'pending' : 'confirmed';
          }
        }

        const orderServices = comingServices.filter(cs => cs.order_id === o.id);
        const orderCombos = comingCombos.filter(c => Number(c.order_id) === o.id);
        const orderProducts = comingProducts.filter(p => Number(p.order_id) === o.id);

        const totalTax = orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
                         orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
                         orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

        const firstPromoSv = orderSvs.find(cs => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? (promoMap.get(Number(pId)) || `PROMO-${pId}`) : null;

        const isOc = telesalesNames.has(booker.trim().toLowerCase());
        const category = group === 'combo_live' ? 'combo' : (isOc ? 'oc' : 'other');

        const comingItem = {
          key: String(o.id),
          customerId: o.user_id,
          time: formatDbTime(o.booking_date_start),
          customer: name,
          avatar: uProfile?.avatar || null,
          phone,
          group,
          promo: promoName,
          booker,
          channel: o.booking_channels || 'N/A',
          category,
          cc: ccName,
          cv: cvName,
          service: serviceName,
          status,
          avatarColor: ['#1890ff', '#722ed1', '#f5222d', '#fa8c16', '#52c41a', '#13c2c2', '#eb2f96'][index % 7],
          code: String(o.id),
          email: uProfile?.email || '',
          ltv: (o.total_price || 0).toLocaleString('vi-VN') + ' đ',
          price: Number(o.total_price || 0),
          tax: Number(totalTax || 0),
          bookingsCount: 1,
          diamonds: 50,
          frequency: 'N/A',
          gender: uProfile?.gender || 'N/A',
          dob: uProfile?.dob ? new Date(uProfile.dob).toLocaleDateString('en-CA') : 'N/A',
          daysAway: 'Hôm nay',
          favoriteDay: 'N/A',
          oc: booker
        };

        branchDetailMap[branchKey].coming.push(comingItem);

        if (o.order_state === 'Completed') {
          const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
          const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
          const leRev = Math.max(0, (o.total_price || 0) - comboRev - productRev);

          const comboNet = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0), 0);
          const productNet = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0), 0);
          const orderNet = Math.max(0, (o.total_price || 0) - totalTax);
          const leNet = Math.max(0, orderNet - comboNet - productNet);

          branchDetailMap[branchKey].revCombo += comboRev;
          branchDetailMap[branchKey].revProduct += productRev;
          branchDetailMap[branchKey].revLe += leRev;

          branchDetailMap[branchKey].netCombo += comboNet;
          branchDetailMap[branchKey].netProduct += productNet;
          branchDetailMap[branchKey].netLe += leNet;
        }
      });

      const refTime = new Date();
      const normalizeName = (name: string) => (name || '').trim().toLowerCase();

      // Fetch working shifts for today
      const workingShifts = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM \`staff_working_shift\` WHERE \`date\` = ?
      `, targetDateStr);

      const shiftMap = new Map<number, any>();
      workingShifts.forEach(ws => {
        shiftMap.set(Number(ws.user_id), ws);
      });

      const getShiftType = (startTime: any, endTime: any): 'sáng' | 'chiều' | 'full' => {
        if (!startTime) return 'full';
        
        let startStr = '';
        if (typeof startTime === 'string') {
          startStr = startTime;
        } else if (startTime instanceof Date) {
          startStr = startTime.toISOString().substr(11, 8);
        } else if (startTime && typeof startTime === 'object' && startTime.toISOString) {
          startStr = startTime.toISOString().substr(11, 8);
        }

        let endStr = '';
        if (typeof endTime === 'string') {
          endStr = endTime;
        } else if (endTime instanceof Date) {
          endStr = endTime.toISOString().substr(11, 8);
        } else if (endTime && typeof endTime === 'object' && endTime.toISOString) {
          endStr = endTime.toISOString().substr(11, 8);
        }

        if (startStr.startsWith('09:00') || startStr.startsWith('08:30')) {
          if (endStr.startsWith('18:00') || endStr.startsWith('17:00')) {
            return 'sáng';
          }
          return 'full';
        } else if (startStr >= '10:30') {
          return 'chiều';
        }
        return 'full';
      };

      // Update CCs' shift, attendance, and doing from actual check-in records (workingShifts)
      Object.keys(branchDetailMap).forEach(bKey => {
        branchDetailMap[bKey].cc.forEach((cc: any) => {
          const wsRecord = shiftMap.get(cc.id);
          
          let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
          const list = schedulesByUserId[cc.id] || [];
          const todaySchedule = list.find(s => s.type === 'Weekday' && s.type_value === weekdayStr) ||
                                list.find(s => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }

          let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
          let doing = 'Nghỉ phép tuần'; // default if off

          if (wsRecord) {
            shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
            if (wsRecord.check_out_staff_task_id !== null) {
              attendance = 'checked_out';
              doing = 'Đã về';
            } else if (wsRecord.check_in_staff_task_id !== null) {
              attendance = 'checked_in';
              doing = 'Trống (Sẵn sàng đón khách)';
            }
          } else {
            const weekOffs = weekOffsByUserId[cc.id] || [];
            let isWeekOff = false;
            if (weekOffs.length > 0) {
              const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
              isWeekOff = String(sorted[0].weekday) === weekdayStr;
            } else if (list.length > 0) {
              const worksAll = list.some(s => s.type === 'Day' && s.type_value === 'All');
              if (!worksAll) {
                const workingWeekdays = list.filter(s => s.type === 'Weekday').map(s => s.type_value);
                if (workingWeekdays.length > 0 && !workingWeekdays.includes(weekdayStr)) {
                  isWeekOff = true;
                }
              }
            }

            const hasSpecificDayOff = offUserIds.has(cc.id);
            if (isWeekOff || hasSpecificDayOff) {
              shift = 'off';
              doing = 'Nghỉ phép tuần';
            } else {
              doing = 'Chưa check-in';
            }
          }

          cc.shift = shift;
          cc.attendance = attendance;
          cc.doing = doing;
        });
      });

      // Calculate and populate Chuyên viên (CV) list for each branch
      activeCvs.forEach(cv => {
        const storeId = Number(cv.storeId);
        let bKey = 'estella';
        if (storeId === 6) bKey = 'detham';
        else if (storeId === 2) bKey = 'pxl';

        const cvId = Number(cv.userId);
        const normName = normalizeName(cv.fullName);

        // Check if weekly off or specific day off
        const offDays = getKTVOffDays(cvId);
        const isWeeklyOff = offDays.includes(weekdayStr);
        const hasSpecificDayOff = offUserIds.has(cvId);
        const isOff = isWeeklyOff || hasSpecificDayOff;

        // Check actual check-in/out record (workingShifts)
        const wsRecord = shiftMap.get(cvId);
        
        let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
        if (isOff) {
          shift = 'off';
        } else {
          // Determine scheduled shift from staff_working_shift_schedule
          const list = schedulesByUserId[cvId] || [];
          const todaySchedule = list.find(s => s.type === 'Weekday' && s.type_value === weekdayStr) ||
                                list.find(s => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }
        }

        let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
        let doing = isOff ? 'Nghỉ phép' : 'Chưa check-in';

        if (wsRecord) {
          shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
          if (wsRecord.check_out_staff_task_id !== null) {
            attendance = 'checked_out';
            doing = 'Đã về';
          } else if (wsRecord.check_in_staff_task_id !== null) {
            attendance = 'checked_in';
            doing = 'Đang trống';
          }
        }

        // Get orders assigned to this CV
        const staffOrders = comingOrders.filter(o => {
          if (o.assigned_staff_id === cvId) return true;
          const assignedName = staffMap.get(Number(o.assigned_staff_id));
          if (assignedName && normalizeName(assignedName) === normName) return true;
          const orderSvs = comingServices.filter(cs => cs.order_id === o.id);
          for (const cs of orderSvs) {
            if (cs.assigned_staff_id === cvId) return true;
            const csAssignedName = staffMap.get(Number(cs.assigned_staff_id));
            if (csAssignedName && normalizeName(csAssignedName) === normName) return true;
          }
          return false;
        });

        let status: 'available' | 'busy' = 'available';

        if (!isOff && attendance === 'checked_in') {
          // Find active order
          const activeOrder = staffOrders.find(o => {
            if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
            if (!o.booking_date_start || !o.booking_date_end) return false;
            const start = toActualDate(o.booking_date_start);
            const end = toActualDate(o.booking_date_end);
            return refTime >= start && refTime <= end;
          });

          if (activeOrder) {
            const custProfile = profileMap.get(activeOrder.user_id);
            const custName = custProfile?.fullName ? custProfile.fullName.trim() : 'Khách hàng';
            const parts = custName.split(' ');
            const shortCustName = parts.length > 2 ? parts.slice(-2).join(' ') : custName;

            const orderSvs = comingServices.filter(cs => cs.order_id === activeOrder.id);
            const svName = orderSvs.length > 0 ? (serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ') : 'Dịch vụ';

            const start = toActualDate(activeOrder.booking_date_start);
            const end = toActualDate(activeOrder.booking_date_end);
            const totalMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
            const elapsedMin = Math.max(0, Math.min(totalMin, Math.round((refTime.getTime() - start.getTime()) / 60000)));

            doing = `[${elapsedMin}/${totalMin}] ${shortCustName}: ${svName}`;
            status = 'busy';
          } else {
            // Find next upcoming order
            const upcoming = staffOrders
              .filter(o => {
                if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
                if (!o.booking_date_start) return false;
                return toActualDate(o.booking_date_start) > refTime;
              })
              .sort((a, b) => toActualDate(a.booking_date_start).getTime() - toActualDate(b.booking_date_start).getTime());

            if (upcoming.length > 0) {
              const nextOrder = upcoming[0];
              const timeStr = formatDbTime(nextOrder.booking_date_start);
              const orderSvs = comingServices.filter(cs => cs.order_id === nextOrder.id);
              const svName = orderSvs.length > 0 ? (serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ') : 'Dịch vụ';
              doing = `Chờ khách: ${svName} (${timeStr})`;
            }
          }
        }

        branchDetailMap[bKey].cv.push({
          name: cv.fullName.trim(),
          doing,
          clients: isOff ? 0 : staffOrders.length,
          shift,
          attendance,
          status
        });
      });

      // Helper function to find and move CC to their active branch today
      const getOrMoveCC = (ccId: number, targetBranchKey: string) => {
        let ccObj: any = null;
        Object.keys(branchDetailMap).forEach(k => {
          const foundIdx = branchDetailMap[k].cc.findIndex((c: any) => c.id === ccId);
          if (foundIdx !== -1) {
            ccObj = branchDetailMap[k].cc[foundIdx];
            if (k !== targetBranchKey) {
              // Remove from old branch
              branchDetailMap[k].cc.splice(foundIdx, 1);
            }
          }
        });

        if (!ccObj) {
          const staffName = staffMap.get(ccId) || 'Tư vấn viên';
          ccObj = {
            id: ccId,
            name: staffName,
            doing: 'Đang hoạt động',
            clients: 0,
            combos: 0,
            revenue: 0,
            revLe: 0,
            revCombo: 0,
            revProduct: 0,
            netRevenue: 0,
            netLe: 0,
            netCombo: 0,
            netProduct: 0,
            shift: 'full',
            attendance: 'checked_in'
          };
        }

        // Ensure CC is in target branch
        const exists = branchDetailMap[targetBranchKey].cc.some((c: any) => c.id === ccId);
        if (!exists) {
          branchDetailMap[targetBranchKey].cc.push(ccObj);
        }

        return ccObj;
      };

      // Calculate today's CC statistics from today's orders
      comingOrders.forEach(o => {
        let bKey = 'detham';
        if (o.client_store_id === 2) bKey = 'pxl';
        else if (o.client_store_id === 16) bKey = 'estella';

        const orderSvs = comingServices.filter(cs => cs.order_id === o.id);
        if (orderSvs.length === 0) return;

        // Check-in CC
        const checkInStaffId = orderSvs.find(cs => cs.check_in_staff_id)?.check_in_staff_id;
        if (checkInStaffId) {
          const ccId = Number(checkInStaffId);
          const cc = getOrMoveCC(ccId, bKey);
          
          if (['CheckIn', 'Parking', 'Consultation', 'Preparation'].includes(o.order_state)) {
            cc.doing = 'Đang hỗ trợ khách check-in';
            if (cc.attendance !== 'checked_out') {
              cc.attendance = 'checked_in';
            }
          }
        }

        // Check-out CC
        const checkOutStaffId = orderSvs.find(cs => cs.check_out_staff_id)?.check_out_staff_id;
        if (checkOutStaffId) {
          const ccId = Number(checkOutStaffId);
          const cc = getOrMoveCC(ccId, bKey);

          if (o.order_state === 'CheckOut') {
            cc.doing = 'Đang thanh toán cho khách';
            if (cc.attendance !== 'checked_out') {
              cc.attendance = 'checked_in';
            }
          }

          if (o.order_state === 'Completed') {
            const orderServices = comingServices.filter(cs => cs.order_id === o.id);
            const orderCombos = comingCombos.filter(c => Number(c.order_id) === o.id);
            const orderProducts = comingProducts.filter(p => Number(p.order_id) === o.id);

            const totalTax = orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
                             orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
                             orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

            const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
            const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
            const leRev = Math.max(0, (o.total_price || 0) - comboRev - productRev);

            const comboNet = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0), 0);
            const productNet = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0), 0);
            const orderNet = Math.max(0, (o.total_price || 0) - totalTax);
            const leNet = Math.max(0, orderNet - comboNet - productNet);

            cc.revCombo += comboRev;
            cc.revProduct += productRev;
            cc.revLe += leRev;
            cc.revenue += o.total_price || 0;

            cc.netCombo += comboNet;
            cc.netProduct += productNet;
            cc.netLe += leNet;
            cc.netRevenue += orderNet;

            cc.combos += orderCombos.length;
          }
        }
      });

      // Compute unique clients count for each CC today, and set default idle states
      Object.keys(branchDetailMap).forEach(bKey => {
        branchDetailMap[bKey].cc.forEach((cc: any) => {
          const ccId = cc.id;
          const ccServices = comingServices.filter(s => s.check_in_staff_id === ccId || s.check_out_staff_id === ccId);
          const uniqueOrders = new Set(ccServices.map(s => s.order_id));
          cc.clients = uniqueOrders.size;

          if (cc.clients > 0 && cc.doing === 'Nghỉ phép tuần') {
            cc.doing = 'Trống (Sẵn sàng đón khách)';
            cc.shift = 'full';
            cc.attendance = 'checked_in';
          }
        });
      });

      // No fallback mock data needed, return actual database records.

      return reply.send({
        branchesData: branchDetailMap,
        bookingsCombo,
        bookingsOc,
        bookingsOther
      });

    } catch (error: any) {
      fastify.log.error('Fetch dashboard today error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu vận hành hôm nay.'
      });
    }
  });

}
