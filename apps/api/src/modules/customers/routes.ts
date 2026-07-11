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

      // 2. Filter by Bucket (using EXISTS/NOT EXISTS to avoid GROUP BY)
      if (bucket && bucket !== 'ALL') {
        if (bucket === 'SINGLE') {
          innerWhereClauses.push(`NOT EXISTS (
            SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id
          )`);
        } else if (bucket === 'COMBO_LIVE') {
          innerWhereClauses.push(`(
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 1`);
        } else if (bucket === 'COMBO_DEAD') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id
          ) AND (
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 0`);
        } else if (bucket === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push(`(
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 0`);
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

      // 4. Main Query (Optimized raw query using dynamic Deferred Join pagination)
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
          (
            SELECT 
              CASE
                WHEN COUNT(usb.id) = 0 THEN 'SINGLE'
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 'COMBO_LIVE'
                ELSE 'COMBO_DEAD'
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) as bucket,
          (
            SELECT COALESCE(SUM(usb.normal_count), 0)
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) as normalCount,
          (
            SELECT COALESCE(SUM(usb.retain_count), 0)
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) as retainCount,
          (
            SELECT MAX(usb.date_expired)
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) as expiryDate
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
        SELECT bucket, COUNT(*) as count
        FROM (
          SELECT 
            (
              SELECT 
                CASE
                  WHEN COUNT(usb.id) = 0 THEN 'SINGLE'
                  WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                    AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 'COMBO_LIVE'
                  ELSE 'COMBO_DEAD'
                END
              FROM user_service_balance usb
              WHERE usb.user_id = u.id
            ) as bucket
          FROM user u
          ${statsInnerJoins}
          ${innerWhereString}
        ) as stats_sub
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
          innerWhereClauses.push(`NOT EXISTS (
            SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id
          )`);
        } else if (bucket === 'COMBO_LIVE') {
          innerWhereClauses.push(`(
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 1`);
        } else if (bucket === 'COMBO_DEAD') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id
          ) AND (
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 0`);
        } else if (bucket === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push(`(
            SELECT 
              CASE 
                WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 
                  AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 1
                ELSE 0
              END
            FROM user_service_balance usb
            WHERE usb.user_id = u.id
          ) = 0`);
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

  // GET /api/customers/staff
  // Get list of active staff members
  fastify.get('/customers/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập danh sách nhân viên.' });
    }
    try {
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true
        },
        orderBy: { displayName: 'asc' }
      });
      return staffList;
    } catch (error: any) {
      fastify.log.error('Get staff list error:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve staff list' });
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
            SELECT user_id as userId
            FROM \`user_profile\`
            WHERE full_name = ? OR full_name = ?
            ORDER BY user_id DESC
            LIMIT 1
          `, cleanName, cleanName + ' ');

          if (profiles.length > 0) {
            staffLegacyId = Number(profiles[0].userId);
          }
        }
        
        // If staff selected but no corresponding legacy user found, return empty list
        if (!staffLegacyId) {
          return { data: [], total: 0 };
        }
      }

      // 2. Query total count matching filters
      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
      `;
      const countParams: any[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          countSql += ` AND o.assigned_staff_id = ?`;
        } else {
          countSql += ` AND o.created_staff_id = ?`;
        }
        countParams.push(staffLegacyId);
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

      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          sql += ` AND o.assigned_staff_id = ?`;
          params.push(staffLegacyId);
        } else {
          sql += ` AND o.created_staff_id = ?`;
          params.push(staffLegacyId);
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
          o.booking_date_start as bookingDateStart
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
            const isCombo = serviceName.toLowerCase().includes('combo') || (primaryService.service_type || '').toLowerCase().includes('combo');

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
            const isCombo = serviceName.toLowerCase().includes('combo') || (primaryService.service_type || '').toLowerCase().includes('combo');

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
          bookingBonus: Number(bookingBonus || 0)
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

}
