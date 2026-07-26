import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { BucketType } from '@mos-lab/shared';
import { registerAllocationCron } from './services/allocation-cron.service.js';

export async function customerRoutes(fastify: FastifyInstance) {
  // Start automated allocation expiration cronjob
  registerAllocationCron(fastify);

  const getNewLocaUserIds = async (dFrom?: string, dTo?: string): Promise<number[]> => {
    const dFromStr = dFrom
      ? dFrom.slice(0, 19).replace('T', ' ')
      : new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
    const dToStr = dTo
      ? dTo.slice(0, 19).replace('T', ' ')
      : new Date(new Date().setHours(23, 59, 59, 999)).toISOString().slice(0, 19).replace('T', ' ');

    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
        `SELECT DISTINCT user_id FROM (
          SELECT o_nl.user_id FROM \`order\` o_nl
          JOIN order_service_combo osc_nl ON osc_nl.order_id = o_nl.id
          LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
          LEFT JOIN service_price sp_nl ON osc_nl.service_price_id = sp_nl.id
          LEFT JOIN service s_nl ON osc_nl.service_id = s_nl.id
          LEFT JOIN service_language sl_nl ON osc_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND osc_nl.total_price > 0
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) >= ? 
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) <= ?
            AND (sp_nl.service_price_package_key IS NULL OR (
              LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl_nl.service_name IS NULL OR (
              LOWER(sl_nl.service_name) NOT LIKE '%single%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%balance%'
            ))
          UNION
          SELECT o_nl.user_id FROM \`order\` o_nl
          JOIN order_service os_nl ON os_nl.order_id = o_nl.id
          LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
          LEFT JOIN service_price sp_nl ON os_nl.service_price_id = sp_nl.id
          LEFT JOIN service s_nl ON os_nl.service_id = s_nl.id
          LEFT JOIN service_language sl_nl ON os_nl.service_id = sl_nl.service_id AND sl_nl.language_id = 1
          WHERE o_nl.order_state = 'Completed'
            AND os_nl.total_price > 0
            AND (os_nl.user_service_type = 'combo' OR s_nl.service_group = 'combo')
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) >= ? 
            AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start, o_nl.date_created) <= ?
            AND (sp_nl.service_price_package_key IS NULL OR (
              LOWER(sp_nl.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp_nl.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl_nl.service_name IS NULL OR (
              LOWER(sl_nl.service_name) NOT LIKE '%single%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl_nl.service_name) NOT LIKE '%balance%'
            ))
        ) t`,
        dFromStr,
        dToStr,
        dFromStr,
        dToStr
      );
      return (rows || []).map((r) => Number(r.user_id)).filter((id) => !isNaN(id) && id > 0);
    } catch (err) {
      fastify.log.error(err as Error, 'getNewLocaUserIds error');
      return [];
    }
  };
  // GET /api/customers
  // Query legs DB, compute buckets, handle pagination, search, sorting
  fastify.get('/customers', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      bucket,
      search,
      page = '1',
      limit = '20',
      sort,
      sortField,
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
      trash,
      ids,
      hsd30,
      lsd1,
      hasProduct,
      contacted,
      contactType,
      hasCallback,
      hasFutureBooking,
      dateFrom,
      dateTo,
      retainedOnly,
    } = request.query as {
      bucket?: BucketType | 'ALL' | 'NEW_LOCA';
      search?: string;
      page?: string;
      limit?: string;
      sort?: string;
      sortField?: string;
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
      trash?: string;
      ids?: string;
      hsd30?: string;
      lsd1?: string;
      hasProduct?: string;
      contacted?: string;
      contactType?: string;
      hasCallback?: string;
      hasFutureBooking?: string;
      dateFrom?: string;
      dateTo?: string;
      retainedOnly?: string;
    };

    let limitNum = parseInt(limit, 10) || 20;
    if (ids && ids.trim() !== '') {
      limitNum = ids.split(',').length;
    }
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    const adminUser = request.user as { id: number; role: string };

    // Force telesales to only query their own customers (except for LoCa campaign)
    let effectiveAssignedStaffId = assignedStaffId;
    if (
      adminUser.role !== 'admin' &&
      bucket !== 'NEW_LOCA' &&
      bucket !== 'COMBO_LIVE' &&
      assignedStaffId !== 'unassigned'
    ) {
      effectiveAssignedStaffId = 'me';
    }

    try {
      const sortParam = (sortField || sort || 'id_desc') as string;

      // Determine what joins and select fields we need in the inner query to optimize performance
      const _needContact = search && search.trim() !== '';
      const needServiceBalance = bucket && bucket !== 'ALL';

      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') ||
        (totalSpentMax !== undefined && totalSpentMax !== '') ||
        sortParam === 'totalSpent_desc' ||
        sortParam === 'totalSpent_asc';

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

      // Pre-compute allowedUserIds before constructing innerJoins to push down predicates
      let allowedUserIds: number[] | null = null;
      let excludedUserIds: number[] | null = null;

      if (ids && ids.trim() !== '') {
        allowedUserIds = ids
          .split(',')
          .map(Number)
          .filter((n) => !isNaN(n));
      } else if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true },
            });
            allowedUserIds = assignments.map((a) => a.legacyUserId);
            if (allowedUserIds.length === 0) {
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
          allowedUserIds = allowedUserIds.filter((id) => retainedUserIds.includes(id));
        } else {
          allowedUserIds = retainedUserIds;
        }
        if (allowedUserIds.length === 0) {
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
      }

      if (bucket === 'NEW_LOCA') {
        const newLocaUserIds = await getNewLocaUserIds(dateFrom, dateTo);
        if (newLocaUserIds.length === 0) {
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
        if (allowedUserIds !== null) {
          allowedUserIds = allowedUserIds.filter((id) => newLocaUserIds.includes(id));
          if (allowedUserIds.length === 0) {
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
        } else {
          allowedUserIds = newLocaUserIds;
        }
      } else if (bucket === 'COMBO_LIVE' && allowedUserIds === null) {
        const comboLiveUserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT DISTINCT user_id
             FROM user_service_balance
             WHERE (normal_count + retain_count) > 0
               AND (date_expired IS NULL OR date_expired > NOW())`
          )
        ).map((r) => Number(r.user_id));

        if (comboLiveUserIds.length === 0) {
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
        allowedUserIds = comboLiveUserIds;
      }

      if (hsd30 === 'true') {
        const hsd30UserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT DISTINCT user_id
             FROM user_service_balance
             WHERE (normal_count + retain_count) > 0
               AND date_expired IS NOT NULL
               AND date_expired > NOW()
               AND date_expired <= DATE_ADD(NOW(), INTERVAL 30 DAY)`
          )
        ).map((r) => Number(r.user_id));

        if (hsd30UserIds.length === 0) {
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
        if (allowedUserIds !== null) {
          allowedUserIds = allowedUserIds.filter((id) => hsd30UserIds.includes(id));
        } else {
          allowedUserIds = hsd30UserIds;
        }
        if (allowedUserIds.length === 0) {
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
      }

      if (lsd1 === 'true') {
        const lsd1UserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT user_id
             FROM user_service_balance
             WHERE (normal_count + retain_count) > 0
               AND (date_expired IS NULL OR date_expired > NOW())
             GROUP BY user_id
             HAVING SUM(normal_count + retain_count) = 1`
          )
        ).map((r) => Number(r.user_id));

        if (lsd1UserIds.length === 0) {
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
        if (allowedUserIds !== null) {
          allowedUserIds = allowedUserIds.filter((id) => lsd1UserIds.includes(id));
        } else {
          allowedUserIds = lsd1UserIds;
        }
        if (allowedUserIds.length === 0) {
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
      }

      if (hasFutureBooking === 'true') {
        const bookedUserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT DISTINCT user_id
             FROM \`order\`
             WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed')`
          )
        ).map((r) => Number(r.user_id));

        if (bookedUserIds.length === 0) {
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
        if (allowedUserIds !== null) {
          allowedUserIds = allowedUserIds.filter((id) => bookedUserIds.includes(id));
        } else {
          allowedUserIds = bookedUserIds;
        }
        if (allowedUserIds.length === 0) {
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
      }

      const usbUserFilter =
        allowedUserIds !== null && allowedUserIds.length > 0 ? `WHERE user_id IN (${allowedUserIds.join(',')})` : '';
      const comboUserFilter =
        allowedUserIds !== null && allowedUserIds.length > 0 ? `WHERE o.user_id IN (${allowedUserIds.join(',')})` : '';

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
            MAX(date_expired) as expiryDate,
            MAX(date_created) as max_date_created
          FROM user_service_balance
          ${usbUserFilter}
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
          WHERE order_state = 'Completed' ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`;
      }
      if (needPromo) {
        innerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL) ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
      }
      if (needReferrals) {
        innerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND referrer_user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
      }
      if (hasFutureBooking === 'true') {
        innerJoins += ` LEFT JOIN (
          SELECT user_id, MIN(booking_date_start) as nextBookingDate
          FROM \`order\`
          WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed') ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY user_id
        ) as fb_agg ON u.id = fb_agg.user_id`;
      }

      const needComboPurchaseDate =
        sortParam === 'purchaseDate_desc' ||
        sortParam === 'purchaseDate_asc' ||
        sortParam === 'comboPurchaseDate_desc' ||
        sortParam === 'comboPurchaseDate_asc' ||
        (bucket === 'NEW_LOCA' &&
          (sortParam === 'daysSinceLastVisit_desc' || sortParam === 'daysSinceLastVisit' || !sortParam));

      if (needComboPurchaseDate) {
        innerJoins += ` LEFT JOIN (
          SELECT user_id, MAX(max_created) as latest_combo_date
          FROM (
            SELECT o.user_id, MAX(o.date_created) as max_created
            FROM \`order\` o
            JOIN order_service_combo osc ON osc.order_id = o.id
            ${comboUserFilter ? `${comboUserFilter} AND osc.total_price > 0` : 'WHERE osc.total_price > 0'}
            GROUP BY o.user_id
            UNION ALL
            SELECT user_id, MAX(date_created) as max_created
            FROM user_service_balance
            ${usbUserFilter ? `${usbUserFilter} AND (total_normal_balance_amount + total_retain_balance_amount) > 0` : 'WHERE (total_normal_balance_amount + total_retain_balance_amount) > 0'}
            GROUP BY user_id
            UNION ALL
            SELECT o.user_id, MAX(o.date_created) as max_created
            FROM \`order\` o
            JOIN order_service os ON os.order_id = o.id
            ${comboUserFilter ? `${comboUserFilter} AND (os.user_service_type = 'combo' OR os.service_group = 'combo') AND os.total_price > 0` : `WHERE (os.user_service_type = 'combo' OR os.service_group = 'combo') AND os.total_price > 0`}
            GROUP BY o.user_id
          ) t
          GROUP BY user_id
        ) as combo_dates ON u.id = combo_dates.user_id`;
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
      const bStr = bucket as string;
      if (bStr && bStr !== 'ALL') {
        if (bStr === 'SINGLE') {
          innerWhereClauses.push('usb_agg.user_id IS NULL');
        } else if (bStr === 'COMBO_LIVE') {
          innerWhereClauses.push('usb_agg.live_count > 0');
        } else if (bStr === 'COMBO_DEAD') {
          innerWhereClauses.push('usb_agg.user_id IS NOT NULL AND COALESCE(usb_agg.live_count, 0) = 0');
        } else if (bStr === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push('(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)');
        } else if (bStr === 'NEW_LOCA') {
          const newLocaUserIds = await getNewLocaUserIds(dateFrom, dateTo);
          if (newLocaUserIds.length === 0) {
            innerWhereClauses.push('1 = 0');
          } else {
            innerWhereClauses.push(`u.id IN (${newLocaUserIds.join(',')})`);
          }
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

      // LoCa Campaign Filters
      if (hsd30 === 'true') {
        innerWhereClauses.push(
          'usb_agg.expiryDate IS NOT NULL AND DATEDIFF(usb_agg.expiryDate, NOW()) BETWEEN 0 AND 30'
        );
      }
      if (lsd1 === 'true') {
        innerWhereClauses.push('(COALESCE(usb_agg.normalCount, 0) + COALESCE(usb_agg.retainCount, 0)) = 1');
      }
      if (hasProduct === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM order_service os_p 
          WHERE os_p.user_id = u.id AND (
            LOWER(COALESCE(os_p.service_group, '')) LIKE '%product%' OR 
            LOWER(COALESCE(os_p.service_type, '')) LIKE '%product%' OR 
            LOWER(COALESCE(os_p.user_service_type, '')) LIKE '%product%'
          )
        )`);
      }
      if (hasCallback === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl 
          WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
        )`);
      }
      if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      }
      if (contacted === 'true') {
        if (contactType === 'TEXT') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('TEXT', 'ZALO', 'MESSENGER', 'SMS')
          )`);
        } else if (contactType === 'CALL') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('CALL', 'OUTBOUND', 'INBOUND')
          )`);
        } else {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id
          )`);
        }
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      // Sorting
      let innerOrderBy = 'ORDER BY u.id DESC';
      let outerOrderBy = 'ORDER BY id DESC';
      if (
        sortParam === 'purchaseDate_desc' ||
        sortParam === 'comboPurchaseDate_desc' ||
        (bucket === 'NEW_LOCA' &&
          (sortParam === 'daysSinceLastVisit_desc' || sortParam === 'daysSinceLastVisit' || !sortParam))
      ) {
        innerOrderBy = 'ORDER BY COALESCE(combo_dates.latest_combo_date, u.date_created) DESC';
        outerOrderBy = '';
      } else if (sortParam === 'purchaseDate_asc' || sortParam === 'comboPurchaseDate_asc') {
        innerOrderBy = 'ORDER BY COALESCE(combo_dates.latest_combo_date, u.date_created) ASC';
        outerOrderBy = '';
      } else if (
        hasFutureBooking === 'true' &&
        (sortParam === 'daysSinceLastVisit_asc' || sortParam === 'daysSinceLastVisit_desc')
      ) {
        if (sortParam === 'daysSinceLastVisit_desc') {
          innerOrderBy = 'ORDER BY fb_agg.nextBookingDate DESC';
          outerOrderBy = 'ORDER BY fb_agg.nextBookingDate DESC';
        } else {
          innerOrderBy = 'ORDER BY fb_agg.nextBookingDate ASC';
          outerOrderBy = 'ORDER BY fb_agg.nextBookingDate ASC';
        }
      } else if (sortParam === 'daysSinceLastVisit_desc') {
        innerOrderBy = 'ORDER BY up.last_order_booking ASC';
        outerOrderBy = 'ORDER BY daysSinceLastVisit DESC';
      } else if (sortParam === 'daysSinceLastVisit_asc') {
        innerOrderBy = 'ORDER BY up.last_order_booking DESC';
        outerOrderBy = 'ORDER BY daysSinceLastVisit ASC';
      } else if (sortParam === 'id_asc') {
        innerOrderBy = 'ORDER BY u.id ASC';
        outerOrderBy = 'ORDER BY id ASC';
      } else if (sortParam === 'id_desc') {
        innerOrderBy = 'ORDER BY u.id DESC';
        outerOrderBy = 'ORDER BY id DESC';
      } else if (sortParam === 'totalSpent_desc') {
        innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) DESC';
        outerOrderBy = 'ORDER BY totalSpent DESC';
      } else if (sortParam === 'totalSpent_asc') {
        innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) ASC';
        outerOrderBy = 'ORDER BY totalSpent ASC';
      } else if (sortParam === 'name_asc') {
        innerOrderBy = 'ORDER BY up.full_name ASC';
        outerOrderBy = 'ORDER BY name ASC';
      } else if (sortParam === 'name_desc') {
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
            MAX(date_expired) as expiryDate,
            MAX(date_created) as max_date_created
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

      // Fetch latest allocation history for these customers
      const assignmentHistories =
        customerIds.length > 0
          ? await fastify.prisma.crm.crmAssignmentHistory.findMany({
              where: {
                legacyUserId: { in: customerIds },
                isUndone: false,
                newStaffId: { not: null },
              },
              include: { newStaff: true },
              orderBy: { assignedAt: 'desc' },
            })
          : [];

      const historyMap = new Map<number, { assignedAt: Date; staffName: string | null }>();
      assignmentHistories.forEach((h) => {
        if (!historyMap.has(h.legacyUserId)) {
          historyMap.set(h.legacyUserId, {
            assignedAt: h.assignedAt,
            staffName: h.newStaff ? h.newStaff.displayName : null,
          });
        }
      });

      const assignmentMap = new Map();
      assignments.forEach((a) => {
        const historyInfo = historyMap.get(a.legacyUserId);
        const assignedAtDate = historyInfo ? historyInfo.assignedAt : a.assignedAt || null;
        if (a.staff) {
          assignmentMap.set(a.legacyUserId, {
            id: a.staff.id,
            displayName: a.staff.displayName,
            username: a.staff.username,
            assignedAt: assignedAtDate ? assignedAtDate.toISOString() : null,
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

      const newComboMap = new Map<number, SafeAny>();
      if (customerIds.length > 0 && bucket === 'NEW_LOCA') {
        const dFromStr = dateFrom
          ? dateFrom.slice(0, 19).replace('T', ' ')
          : new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
        const dToStr = dateTo
          ? dateTo.slice(0, 19).replace('T', ' ')
          : new Date(new Date().setHours(23, 59, 59, 999)).toISOString().slice(0, 19).replace('T', ' ');

        // 1. Fetch user_service_balance records for combo purchased in date range per customer
        const usbRecords = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
          SELECT 
            usb.id,
            usb.user_id as userId,
            usb.date_created as dateCreated,
            usb.created_staff_id as createdStaffId,
            CONCAT(
              COALESCE(sl.service_name, s.service_key, usb.service_group, 'Combo Mới Mua'),
              IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
            ) as comboName,
            COALESCE(sp.service_price, usb.total_normal_balance_amount + usb.total_retain_balance_amount, 0) as comboPrice,
            up.full_name as creatorStaffName
          FROM user_service_balance usb
          LEFT JOIN service s ON usb.service_id = s.id
          LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
          LEFT JOIN service_price sp ON usb.service_price_id = sp.id
          LEFT JOIN user_profile up ON usb.created_staff_id = up.user_id
          WHERE usb.user_id IN (${customerIds.join(',')})
            AND usb.date_created >= ? AND usb.date_created <= ?
            AND (COALESCE(sp.service_price, 0) > 0 OR (usb.total_normal_balance_amount + usb.total_retain_balance_amount) > 0)
            AND (sp.service_price_package_key IS NULL OR (
              LOWER(sp.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl.service_name IS NULL OR (
              LOWER(sl.service_name) NOT LIKE '%single%'
              AND LOWER(sl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl.service_name) NOT LIKE '%balance%'
            ))
          ORDER BY usb.date_created DESC
        `,
          dFromStr,
          dToStr
        );

        // 2. Fetch combo orders per customer in date range (direct combo sales in order_service_combo and order_service)
        const comboOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `
          SELECT 
            o.id as orderId,
            o.user_id as userId,
            COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) as dateCreated,
            o.created_staff_id as createdStaffId,
            up_created.full_name as createdStaffName,
            COALESCE(NULLIF(osc.total_price, 0), sp.service_price, 0) as comboPrice,
            CONCAT(
              COALESCE(sl.service_name, s.service_key, osc.service_group, 'Combo Mới Mua'),
              IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
            ) as comboName,
            COALESCE(up_in_osc.full_name, up_in_os.full_name) as checkInName,
            COALESCE(up_out_osc.full_name, up_out_os.full_name) as checkOutName,
            up_cv.full_name as cvName
          FROM \`order\` o
          JOIN order_service_combo osc ON osc.order_id = o.id
          LEFT JOIN report_order ro ON o.id = ro.order_id
          LEFT JOIN service s ON osc.service_id = s.id
          LEFT JOIN service_language sl ON osc.service_id = sl.service_id AND sl.language_id = 1
          LEFT JOIN service_price sp ON osc.service_price_id = sp.id
          LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
          LEFT JOIN user_profile up_in_osc ON osc.check_in_staff_id = up_in_osc.user_id
          LEFT JOIN user_profile up_out_osc ON osc.check_out_staff_id = up_out_osc.user_id
          LEFT JOIN order_service os ON os.order_id = o.id
          LEFT JOIN user_profile up_in_os ON os.check_in_staff_id = up_in_os.user_id
          LEFT JOIN user_profile up_out_os ON os.check_out_staff_id = up_out_os.user_id
          LEFT JOIN user_profile up_cv ON os.assigned_staff_id = up_cv.user_id
          WHERE o.user_id IN (${customerIds.join(',')})
            AND o.order_state = 'Completed'
            AND COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(osc.date_created, ro.actual_booking_date_start, o.booking_date_start) <= ?
            AND COALESCE(NULLIF(osc.total_price, 0), sp.service_price, 0) > 0
            AND (sp.service_price_package_key IS NULL OR (
              LOWER(sp.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl.service_name IS NULL OR (
              LOWER(sl.service_name) NOT LIKE '%single%'
              AND LOWER(sl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl.service_name) NOT LIKE '%balance%'
            ))

          UNION

          SELECT 
            o.id as orderId,
            o.user_id as userId,
            COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) as dateCreated,
            o.created_staff_id as createdStaffId,
            up_created.full_name as createdStaffName,
            COALESCE(NULLIF(os.total_price, 0), sp.service_price, 0) as comboPrice,
            CONCAT(
              COALESCE(sl.service_name, s.service_key, os.service_group, 'Combo Mới Mua'),
              IF(sp.service_price_package_key IS NOT NULL AND sp.service_price_package_key != '', CONCAT(' (', sp.service_price_package_key, ')'), '')
            ) as comboName,
            up_in.full_name as checkInName,
            up_out.full_name as checkOutName,
            up_cv.full_name as cvName
          FROM \`order\` o
          JOIN order_service os ON os.order_id = o.id
          LEFT JOIN report_order ro ON o.id = ro.order_id
          LEFT JOIN service s ON os.service_id = s.id
          LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
          LEFT JOIN service_price sp ON os.service_price_id = sp.id
          LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
          LEFT JOIN user_profile up_in ON os.check_in_staff_id = up_in.user_id
          LEFT JOIN user_profile up_out ON os.check_out_staff_id = up_out.user_id
          LEFT JOIN user_profile up_cv ON os.assigned_staff_id = up_cv.user_id
          WHERE o.user_id IN (${customerIds.join(',')})
            AND o.order_state = 'Completed'
            AND COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(os.date_created, ro.actual_booking_date_start, o.booking_date_start) <= ?
            AND (os.user_service_type = 'combo' OR s.service_group = 'combo')
            AND COALESCE(NULLIF(os.total_price, 0), sp.service_price, 0) > 0
            AND (sp.service_price_package_key IS NULL OR (
              LOWER(sp.service_price_package_key) NOT LIKE '%single%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
              AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
            ))
            AND (sl.service_name IS NULL OR (
              LOWER(sl.service_name) NOT LIKE '%single%'
              AND LOWER(sl.service_name) NOT LIKE '%refill%'
              AND LOWER(sl.service_name) NOT LIKE '%balance%'
            ))
          ORDER BY dateCreated DESC
          `,
          dFromStr,
          dToStr,
          dFromStr,
          dToStr
        );

        const customerUsbMap = new Map<number, SafeAny>();
        usbRecords.forEach((u) => {
          const uid = Number(u.userId);
          if (!customerUsbMap.has(uid)) {
            customerUsbMap.set(uid, u);
          }
        });

        const customerOrderMap = new Map<number, SafeAny>();
        comboOrders.forEach((co) => {
          const uid = Number(co.userId);
          if (!customerOrderMap.has(uid)) {
            customerOrderMap.set(uid, co);
          }
        });

        customerIds.forEach((uid) => {
          const usb = customerUsbMap.get(uid);
          const ord = customerOrderMap.get(uid);
          if (usb || ord) {
            const creatorStaffName = (usb?.creatorStaffName || ord?.createdStaffName || '').trim();
            const bookerName = ord?.createdStaffName || creatorStaffName || 'System';

            // CC Out: CheckOut staff or creator staff (Người bán CC)
            const rawCcOut = ord?.checkOutName || creatorStaffName || '';
            const ccOutName = rawCcOut ? rawCcOut : 'Chưa nhận';

            // CC In: CheckIn staff or fallback to CC Out
            const rawCcIn = ord?.checkInName || (ccOutName !== 'Chưa nhận' ? ccOutName : '');
            const ccInName = rawCcIn ? rawCcIn : 'Chưa nhận';

            // CV (Chuyên viên): Assigned staff on service / order
            const rawCv = ord?.cvName || '';
            const cvName = rawCv ? rawCv : 'Chưa phân công';

            const comboName = usb?.comboName || ord?.comboName || 'Combo Mới Mua';
            const comboPrice = Number(usb?.comboPrice || ord?.comboPrice || 0);
            const purchaseDate = usb?.dateCreated
              ? new Date(usb.dateCreated).toISOString()
              : ord?.dateCreated
                ? new Date(ord.dateCreated).toISOString()
                : null;

            newComboMap.set(uid, {
              comboName,
              comboPrice,
              purchaseDate,
              bookerName,
              ccInName,
              ccOutName,
              cvName,
            });
          }
        });
      }

      // Map raw SQL outputs to clean Customer interface types
      const customers = dataResult.map((row: SafeAny) => {
        const assigned = assignmentMap.get(Number(row.id)) || null;
        const booking = bookingMap.get(Number(row.id)) || null;
        const callbackDateVal = callbackMap.get(Number(row.id)) || null;
        const lastCallVal = latestCallMap.get(Number(row.id)) || null;
        const newComboDetails = newComboMap.get(Number(row.id)) || null;

        const historyInfo = historyMap.get(Number(row.id)) || null;
        const lastAllocation = historyInfo
          ? {
              assignedAt: historyInfo.assignedAt.toISOString(),
              staffName: historyInfo.staffName,
            }
          : assigned
            ? {
                assignedAt: assigned.assignedAt,
                staffName: assigned.displayName,
              }
            : null;

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
          comboBalance:
            row.bucket !== 'SINGLE'
              ? {
                  normalCount: Number(row.normalCount || 0),
                  retainCount: Number(row.retainCount || 0),
                  expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
                }
              : null,
          assignedStaff: assigned,
          assignedAt: assigned?.assignedAt || lastAllocation?.assignedAt || null,
          lastAllocation,
          avatar: row.avatar,
          lastBookingState: booking ? booking.orderState : null,
          lastBookingDate: booking && booking.bookingDate ? new Date(booking.bookingDate).toISOString() : null,
          callbackDate: callbackDateVal ? new Date(callbackDateVal).toISOString().split('T')[0] : null,
          lastCall: lastCallVal,
          newComboDetails,
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
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customers list error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customers',
      });
    }
  });

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
      trash,
      hsd30,
      lsd1,
      hasProduct,
      contacted,
      contactType,
      hasCallback,
      hasFutureBooking,
      dateFrom,
      dateTo,
      retainedOnly,
    } = request.query as {
      bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE' | 'NEW_LOCA';
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
      trash?: string;
      hsd30?: string;
      lsd1?: string;
      hasProduct?: string;
      contacted?: string;
      contactType?: string;
      hasCallback?: string;
      hasFutureBooking?: string;
      dateFrom?: string;
      dateTo?: string;
      retainedOnly?: string;
    };

    const adminUser = request.user as { id: number; role: string };

    // Force telesales to only query stats for their own customers (except for LoCa campaign)
    let effectiveAssignedStaffId = assignedStaffId;
    if (
      adminUser.role !== 'admin' &&
      bucket !== 'NEW_LOCA' &&
      bucket !== 'COMBO_LIVE' &&
      assignedStaffId !== 'unassigned'
    ) {
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
          ) as live_count,
          SUM(normal_count) as normalCount,
          SUM(retain_count) as retainCount,
          MAX(date_expired) as expiryDate
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
      } else if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true },
            });
            allowedUserIds = assignments.map((a) => a.legacyUserId);
            if (allowedUserIds.length === 0) {
              return {
                total: 0,
                comboLive: 0,
                comboDead: 0,
                single: 0,
              };
            }
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
          allowedUserIds = allowedUserIds.filter((id) => retainedUserIds.includes(id));
        } else {
          allowedUserIds = retainedUserIds;
        }
        if (allowedUserIds.length === 0) {
          return {
            total: 0,
            comboLive: 0,
            comboDead: 0,
            single: 0,
            notComboLive: 0,
          };
        }
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
      const bStrStats = bucket as string;
      if (bStrStats && bStrStats !== 'ALL') {
        if (bStrStats === 'SINGLE') {
          innerWhereClauses.push('usb_agg.user_id IS NULL');
        } else if (bStrStats === 'COMBO_LIVE') {
          innerWhereClauses.push('usb_agg.live_count > 0');
        } else if (bStrStats === 'COMBO_DEAD') {
          innerWhereClauses.push('usb_agg.user_id IS NOT NULL AND COALESCE(usb_agg.live_count, 0) = 0');
        } else if (bStrStats === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push('(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)');
        } else if (bStrStats === 'NEW_LOCA') {
          const newLocaUserIds = await getNewLocaUserIds(dateFrom, dateTo);
          if (newLocaUserIds.length === 0) {
            innerWhereClauses.push('1 = 0');
          } else {
            innerWhereClauses.push(`u.id IN (${newLocaUserIds.join(',')})`);
          }
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

      // LoCa Campaign Filters
      if (hsd30 === 'true') {
        innerWhereClauses.push(
          'usb_agg.expiryDate IS NOT NULL AND DATEDIFF(usb_agg.expiryDate, NOW()) BETWEEN 0 AND 30'
        );
      }
      if (lsd1 === 'true') {
        innerWhereClauses.push('(COALESCE(usb_agg.normalCount, 0) + COALESCE(usb_agg.retainCount, 0)) = 1');
      }
      if (hasProduct === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM order_service os_p 
          WHERE os_p.user_id = u.id AND (
            LOWER(COALESCE(os_p.service_group, '')) LIKE '%product%' OR 
            LOWER(COALESCE(os_p.service_type, '')) LIKE '%product%' OR 
            LOWER(COALESCE(os_p.user_service_type, '')) LIKE '%product%'
          )
        )`);
      }
      if (hasCallback === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl 
          WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
        )`);
      }
      if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      }
      if (contacted === 'true') {
        if (contactType === 'TEXT') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('TEXT', 'ZALO', 'MESSENGER', 'SMS')
          )`);
        } else if (contactType === 'CALL') {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('CALL', 'OUTBOUND', 'INBOUND')
          )`);
        } else {
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id
          )`);
        }
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      const statsSql = `
        SELECT 
          CASE
            WHEN usb_agg.user_id IS NULL THEN 'SINGLE'
            WHEN usb_agg.live_count > 0 THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          COUNT(*) as count,
          SUM(CASE WHEN usb_agg.live_count > 0 AND usb_agg.expiryDate IS NOT NULL AND DATEDIFF(usb_agg.expiryDate, NOW()) BETWEEN 0 AND 30 THEN 1 ELSE 0 END) as hsd30Count,
          SUM(CASE WHEN usb_agg.live_count > 0 AND (COALESCE(usb_agg.normalCount, 0) + COALESCE(usb_agg.retainCount, 0)) = 1 THEN 1 ELSE 0 END) as lsd1Count
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
        hsd30: 0,
        lsd1: 0,
      };

      statsResult.forEach((row: SafeAny) => {
        const count = Number(row.count || 0);
        stats.total += count;
        if (row.bucket === 'COMBO_LIVE') {
          stats.comboLive = count;
          stats.hsd30 = Number(row.hsd30Count || 0);
          stats.lsd1 = Number(row.lsd1Count || 0);
        }
        if (row.bucket === 'COMBO_DEAD') stats.comboDead = count;
        if (row.bucket === 'SINGLE') stats.single = count;
      });

      stats.notComboLive = stats.total - stats.comboLive;

      return stats;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customers stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve stats',
      });
    }
  });

  // GET /api/customers/loca-stats
  // Batch stats endpoint for LoCa campaign: returns all tab counts and touchpoint counts in 1 SQL query
  fastify.get('/customers/loca-stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { search, assignedStaffId, dateFrom, dateTo } = request.query as SafeAny;

      const adminUser = request.user;
      let effectiveAssignedStaffId = assignedStaffId;

      if (adminUser.role === 'telesales') {
        if (!effectiveAssignedStaffId) {
          effectiveAssignedStaffId = 'me';
        }
      }

      let allowedUserIds: number[] | null = null;
      let excludedUserIds: number[] | null = null;

      if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all' && effectiveAssignedStaffId !== 'ALL') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true },
            });
            allowedUserIds = assignments.map((a) => a.legacyUserId);
            if (allowedUserIds.length === 0) {
              return {
                tabs: {
                  NEW_LOCA: 0,
                  LOCA_ALL: 0,
                  HSD_30: 0,
                  LSD_1: 0,
                  SP: 0,
                  CALLBACK: 0,
                  BOOKED: 0,
                  CONTACTED: 0,
                },
                touchpoints: {},
              };
            }
          }
        }
      }

      const comboLiveUserIds = (
        await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
          `SELECT DISTINCT user_id
           FROM user_service_balance
           WHERE (normal_count + retain_count) > 0
             AND (date_expired IS NULL OR date_expired > NOW())`
        )
      ).map((r) => Number(r.user_id));

      const newLocaUserIds = await getNewLocaUserIds(dateFrom, dateTo);
      const activeLocaUserIds = Array.from(new Set([...comboLiveUserIds, ...newLocaUserIds]));

      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter((id) => activeLocaUserIds.includes(id));
      } else {
        allowedUserIds = activeLocaUserIds;
      }

      if (allowedUserIds.length === 0) {
        return {
          tabs: {
            NEW_LOCA: 0,
            LOCA_ALL: 0,
            HSD_30: 0,
            LSD_1: 0,
            SP: 0,
            CALLBACK: 0,
            BOOKED: 0,
            CONTACTED: 0,
          },
          touchpoints: {},
        };
      }

      const innerWhereClauses: string[] = ['COALESCE(up.is_deleted, 0) = 0'];
      const innerParams: SafeAny[] = [];

      if (allowedUserIds !== null && allowedUserIds.length > 0) {
        innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
      }
      if (excludedUserIds !== null && excludedUserIds.length > 0) {
        innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
      }

      if (search && search.trim() !== '') {
        const searchLike = `%${search.trim()}%`;
        innerWhereClauses.push(`(
          up.full_name LIKE ? OR EXISTS (
            SELECT 1 FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
          )
        )`);
        innerParams.push(searchLike, searchLike);
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      // Get touchpoints config
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
      });
      const defaultTouchpoints = [
        { key: 'now', daysMin: 0, daysMax: 1 },
        { key: '17', daysMin: 17, daysMax: 17 },
        { key: '19', daysMin: 19, daysMax: 19 },
        { key: '21', daysMin: 21, daysMax: 21 },
        { key: '23', daysMin: 23, daysMax: 23 },
        { key: '25', daysMin: 25, daysMax: 25 },
        { key: '30', daysMin: 30, daysMax: 30 },
        { key: '35', daysMin: 35, daysMax: 35 },
        { key: '40', daysMin: 40, daysMax: 40 },
        { key: '45', daysMin: 45, daysMax: 45 },
        { key: '50', daysMin: 50, daysMax: 50 },
        { key: '55', daysMin: 55, daysMax: 55 },
        { key: '60', daysMin: 60, daysMax: 60 },
      ];
      const activeTouchpoints = config ? JSON.parse(config.value)?.LOCA_ALL || defaultTouchpoints : defaultTouchpoints;

      const newLocaExpr =
        newLocaUserIds.length > 0 ? `CASE WHEN u.id IN (${newLocaUserIds.join(',')}) THEN 1 ELSE 0 END` : '0';

      // Build dynamic SELECT for touchpoints
      const tpSelects = activeTouchpoints
        .map((tp: SafeAny) => {
          const min = tp.daysMin !== undefined ? Number(tp.daysMin) : 0;
          const max = tp.daysMax !== undefined ? Number(tp.daysMax) : min;
          if (min === max) {
            return `SUM(CASE WHEN is_combo_live = 1 AND daysSinceLastVisit = ${min} THEN 1 ELSE 0 END) as tp_${tp.key}`;
          }
          return `SUM(CASE WHEN is_combo_live = 1 AND daysSinceLastVisit BETWEEN ${min} AND ${max} THEN 1 ELSE 0 END) as tp_${tp.key}`;
        })
        .join(',\n          ');

      const usbFilterStr =
        allowedUserIds !== null && allowedUserIds.length > 0
          ? `WHERE user_id IN (${allowedUserIds.join(',')})`
          : 'WHERE (normal_count + retain_count) > 0';

      const batchSql = `
        SELECT
          SUM(CASE WHEN is_new_loca = 1 THEN 1 ELSE 0 END) as count_NEW_LOCA,
          SUM(CASE WHEN is_combo_live = 1 THEN 1 ELSE 0 END) as count_LOCA_ALL,
          SUM(CASE WHEN is_combo_live = 1 AND is_hsd30 = 1 THEN 1 ELSE 0 END) as count_HSD_30,
          SUM(CASE WHEN is_combo_live = 1 AND is_lsd1 = 1 THEN 1 ELSE 0 END) as count_LSD_1,
          SUM(CASE WHEN is_combo_live = 1 AND has_product = 1 THEN 1 ELSE 0 END) as count_SP,
          SUM(CASE WHEN is_combo_live = 1 AND has_callback = 1 THEN 1 ELSE 0 END) as count_CALLBACK,
          SUM(CASE WHEN is_combo_live = 1 AND has_future_booking = 1 THEN 1 ELSE 0 END) as count_BOOKED,
          SUM(CASE WHEN is_combo_live = 1 AND has_contacted = 1 THEN 1 ELSE 0 END) as count_CONTACTED,
          ${tpSelects ? tpSelects : '1 as dummy'}
        FROM (
          SELECT
            u.id,
            (usb_agg.live_count IS NOT NULL AND usb_agg.live_count > 0) as is_combo_live,
            CASE 
              WHEN usb_agg.expiryDate IS NOT NULL AND DATEDIFF(usb_agg.expiryDate, NOW()) BETWEEN 0 AND 30 THEN 1 
              ELSE 0 
            END as is_hsd30,
            CASE 
              WHEN (COALESCE(usb_agg.normalCount, 0) + COALESCE(usb_agg.retainCount, 0)) = 1 THEN 1 
              ELSE 0 
            END as is_lsd1,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
            EXISTS (
              SELECT 1 FROM order_service os_p 
              WHERE os_p.user_id = u.id AND (
                LOWER(COALESCE(os_p.service_group, '')) LIKE '%product%' OR 
                LOWER(COALESCE(os_p.service_type, '')) LIKE '%product%' OR 
                LOWER(COALESCE(os_p.user_service_type, '')) LIKE '%product%'
              )
            ) as has_product,
            EXISTS (
              SELECT 1 FROM mos_lab.crm_call_logs ccl
              WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
            ) as has_callback,
            EXISTS (
              SELECT 1 FROM \`order\` o_bk 
              WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
            ) as has_future_booking,
            EXISTS (
              SELECT 1 FROM mos_lab.crm_call_logs ccl
              WHERE ccl.legacy_user_id = u.id
            ) as has_contacted,
            ${newLocaExpr} as is_new_loca
          FROM user u
          LEFT JOIN user_profile up ON u.id = up.user_id
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
            ${usbFilterStr}
            GROUP BY user_id
          ) as usb_agg ON u.id = usb_agg.user_id
          ${innerWhereString}
        ) as loca_base
      `;

      const sqlParams = [...innerParams];
      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(batchSql, ...sqlParams);

      const row = result && result[0] ? result[0] : {};

      const tabs: Record<string, number> = {
        NEW_LOCA: Number(row.count_NEW_LOCA || 0),
        LOCA_ALL: Number(row.count_LOCA_ALL || 0),
        HSD_30: Number(row.count_HSD_30 || 0),
        LSD_1: Number(row.count_LSD_1 || 0),
        SP: Number(row.count_SP || 0),
        CALLBACK: Number(row.count_CALLBACK || 0),
        BOOKED: Number(row.count_BOOKED || 0),
        CONTACTED: Number(row.count_CONTACTED || 0),
      };

      const touchpoints: Record<string, number> = {
        ALL: Number(row.count_LOCA_ALL || 0),
      };
      activeTouchpoints.forEach((tp: SafeAny) => {
        touchpoints[tp.key] = Number(row[`tp_${tp.key}`] || 0);
      });

      return { tabs, touchpoints };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get LoCa stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve LoCa stats',
      });
    }
  });

  // GET /api/customers/nyc-stats
  // Batch stats endpoint for NYC campaign: returns all 6 NYC tab counts and all touchpoint counts in 1 SQL query
  fastify.get('/customers/nyc-stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { search, assignedStaffId } = request.query as SafeAny;

      const adminUser = request.user;
      let effectiveAssignedStaffId = assignedStaffId;

      if (adminUser.role === 'telesales') {
        if (!effectiveAssignedStaffId) {
          effectiveAssignedStaffId = 'me';
        }
      }

      let allowedUserIds: number[] | null = null;
      let excludedUserIds: number[] | null = null;

      if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all' && effectiveAssignedStaffId !== 'ALL') {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        } else {
          let targetStaffId = adminUser.id;
          if (effectiveAssignedStaffId !== 'me') {
            targetStaffId = parseInt(effectiveAssignedStaffId, 10);
          }
          if (!isNaN(targetStaffId)) {
            const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { staffId: targetStaffId },
              select: { legacyUserId: true },
            });
            allowedUserIds = assignments.map((a) => a.legacyUserId);
            if (allowedUserIds.length === 0) {
              return {
                tabs: {
                  NYC_30: 0,
                  NYC_60: 0,
                  NYC_90: 0,
                  NYC_180: 0,
                  NYC_365: 0,
                  NYC_365plus: 0,
                },
                touchpoints: {},
              };
            }
          }
        }
      }

      const innerWhereClauses: string[] = [
        'COALESCE(up.is_deleted, 0) = 0',
        '(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)',
        'up.last_order_booking IS NOT NULL',
      ];
      const innerParams: SafeAny[] = [];

      if (allowedUserIds !== null) {
        innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
      }
      if (excludedUserIds !== null && excludedUserIds.length > 0) {
        innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
      }

      if (search && search.trim() !== '') {
        const searchLike = `%${search.trim()}%`;
        innerWhereClauses.push(`(
          up.full_name LIKE ? OR EXISTS (
            SELECT 1 FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
          )
        )`);
        innerParams.push(searchLike, searchLike);
      }

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      // Get NYC touchpoints config
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
      });
      const defaultConfigs: Record<string, SafeAny[]> = {
        NYC_30: [
          { key: 'now', daysMin: 0, daysMax: 1 },
          { key: '3', daysMin: 3, daysMax: 3 },
          { key: '7', daysMin: 7, daysMax: 7 },
          { key: '17', daysMin: 17, daysMax: 17 },
          { key: '21', daysMin: 21, daysMax: 21 },
        ],
        NYC_60: [
          { key: '35', daysMin: 31, daysMax: 35 },
          { key: '45', daysMin: 41, daysMax: 45 },
          { key: '55', daysMin: 51, daysMax: 55 },
        ],
        NYC_90: [
          { key: '70', daysMin: 65, daysMax: 70 },
          { key: '80', daysMin: 75, daysMax: 80 },
        ],
        NYC_180: [
          { key: '100', daysMin: 95, daysMax: 100 },
          { key: '150', daysMin: 145, daysMax: 150 },
        ],
        NYC_365: [
          { key: '200', daysMin: 195, daysMax: 200 },
          { key: '300', daysMin: 295, daysMax: 300 },
        ],
        NYC_365plus: [
          { key: '400', daysMin: 395, daysMax: 400 },
          { key: '500', daysMin: 495, daysMax: 500 },
        ],
      };

      const activeConfigs: Record<string, SafeAny[]> = config ? JSON.parse(config.value) : defaultConfigs;

      // Extract all touchpoints across all NYC tabs
      const allTouchpoints: SafeAny[] = [];
      Object.values(activeConfigs).forEach((tps) => {
        if (Array.isArray(tps)) {
          allTouchpoints.push(...tps);
        }
      });

      const tpSelects = allTouchpoints
        .map((tp: SafeAny) => {
          const min = tp.daysMin !== undefined ? Number(tp.daysMin) : 0;
          const max = tp.daysMax !== undefined ? Number(tp.daysMax) : min;
          if (min === max) {
            return `SUM(CASE WHEN daysSinceLastVisit = ${min} THEN 1 ELSE 0 END) as tp_${tp.key}`;
          }
          return `SUM(CASE WHEN daysSinceLastVisit BETWEEN ${min} AND ${max} THEN 1 ELSE 0 END) as tp_${tp.key}`;
        })
        .join(',\n          ');

      const batchSql = `
        SELECT
          SUM(CASE WHEN daysSinceLastVisit BETWEEN 0 AND 30 THEN 1 ELSE 0 END) as count_NYC_30,
          SUM(CASE WHEN daysSinceLastVisit BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as count_NYC_60,
          SUM(CASE WHEN daysSinceLastVisit BETWEEN 61 AND 90 THEN 1 ELSE 0 END) as count_NYC_90,
          SUM(CASE WHEN daysSinceLastVisit BETWEEN 91 AND 180 THEN 1 ELSE 0 END) as count_NYC_180,
          SUM(CASE WHEN daysSinceLastVisit BETWEEN 181 AND 365 THEN 1 ELSE 0 END) as count_NYC_365,
          SUM(CASE WHEN daysSinceLastVisit > 365 THEN 1 ELSE 0 END) as count_NYC_365plus,
          ${tpSelects ? tpSelects : '1 as dummy'}
        FROM (
          SELECT
            u.id,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit
          FROM user u
          LEFT JOIN user_profile up ON u.id = up.user_id
          LEFT JOIN (
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
          ) as usb_agg ON u.id = usb_agg.user_id
          ${innerWhereString}
        ) as nyc_base
      `;

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(batchSql, ...innerParams);

      const row = result && result[0] ? result[0] : {};

      const tabs: Record<string, number> = {
        NYC_30: Number(row.count_NYC_30 || 0),
        NYC_60: Number(row.count_NYC_60 || 0),
        NYC_90: Number(row.count_NYC_90 || 0),
        NYC_180: Number(row.count_NYC_180 || 0),
        NYC_365: Number(row.count_NYC_365 || 0),
        NYC_365plus: Number(row.count_NYC_365plus || 0),
      };

      const touchpoints: Record<string, number> = {};
      allTouchpoints.forEach((tp: SafeAny) => {
        touchpoints[tp.key] = Number(row[`tp_${tp.key}`] || 0);
      });

      return { tabs, touchpoints };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get NYC stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve NYC stats',
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
      excludeAssigned = 'true',
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

      if (excludeAssigned === 'true') {
        const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          select: { legacyUserId: true },
        });
        const excludedUserIds = allAssignments.map((a) => a.legacyUserId);
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
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get random customer ids error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve random customer IDs',
      });
    }
  });

  // GET /api/saved-filters
  // Retrieve saved customer filters
  fastify.get('/saved-filters', { preHandler: [requireAuth] }, async (_request, _reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });
      if (!config) {
        return [];
      }
      return JSON.parse(config.value);
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get saved filters error:');
      return [];
    }
  });

  // POST /api/saved-filters
  // Save or update a filter
  fastify.post('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, name, criteria } = request.body as {
      id?: string;
      name: string;
      criteria: SafeAny;
    };

    if (!name || !criteria) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Name and criteria are required' });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      let filters: SafeAny[] = [];
      if (config) {
        filters = JSON.parse(config.value);
      }

      const filterId = id || Math.random().toString(36).substring(2, 9);
      const newFilter = {
        id: filterId,
        name,
        criteria,
        createdAt: new Date().toISOString(),
      };

      if (id) {
        const idx = filters.findIndex((f) => f.id === id);
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
        create: { key: 'CUSTOMER_SAVED_FILTERS', value: JSON.stringify(filters) },
      });

      return newFilter;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Save filter error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to save filter' });
    }
  });

  // DELETE /api/saved-filters/:id
  // Delete a saved filter
  fastify.delete('/saved-filters/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      if (!config) {
        return reply.status(404).send({ error: 'Not Found', message: 'Filters not found' });
      }

      let filters: SafeAny[] = JSON.parse(config.value);
      filters = filters.filter((f) => f.id !== id);

      await fastify.prisma.crm.crmConfig.update({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        data: { value: JSON.stringify(filters) },
      });

      return { success: true };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Delete filter error:');
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
    const user = request.user as { role: string };
    if (user.role !== 'admin' && user.role !== 'telesales' && user.role !== 'booker') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập danh sách nhân viên.' });
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
        return dedupedCrmStaffList.filter((s) =>
          ['telesales', 'executive', 'manager', 'admin'].includes(s.role?.toLowerCase() || '')
        );
      }

      return [...dedupedCrmStaffList, ...mappedKTVs];
    } catch (error: SafeAny) {
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
    } catch (error: SafeAny) {
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

      // 3. Fetch all referral transactions at once for active referrers only
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
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get referrals list error:');
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
      storeName: _storeName,
      serviceId,
      serviceName: _serviceName,
      technicianId,
      technicianName: _technicianName,
      bookingDate,
      bookingTime,
      bookingChannel,
      bookingNote,
      promotionId,
      referralPhone,
    } = request.body as SafeAny;

    try {
      // Find matching legacy user ID by CRM user (Strictly require direct link)
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      if (!crmStaff || !crmStaff.legacyStaffId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message:
            'Tài khoản của bạn chưa được liên kết với hệ thống cũ. Vui lòng liên hệ Admin để cấu hình liên kết tài khoản trước khi thực hiện đặt lịch.',
        });
      }

      const legacyStaffId = crmStaff.legacyStaffId;
      let validStaffId: number | null = null;
      if (legacyStaffId) {
        const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id FROM user WHERE id = ? LIMIT 1`,
          legacyStaffId
        );
        if (staffExists.length > 0) {
          validStaffId = legacyStaffId;
        }
      }

      if (!validStaffId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tài khoản liên kết bên hệ thống cũ không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Admin.',
        });
      }

      // Check referrer phone
      let referrerUserId: number | null = null;
      if (referralPhone && referralPhone.trim()) {
        const referrerContact = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
          referralPhone.trim()
        );
        if (referrerContact.length > 0) {
          referrerUserId = Number(referrerContact[0].user_id);
        } else {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Không tìm thấy tài khoản người giới thiệu với SĐT: ${referralPhone}. Vui lòng kiểm tra lại.`,
          });
        }
      }

      let finalCustomerId = customerId;

      // 1. If it's a new customer, create parent user, user_profile, and user_contact records
      if (!finalCustomerId) {
        // Insert parent user record (default to Female 202 to avoid legacy system filtering)
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO user (created_staff_id, attribute_gender_id, date_created) VALUES (?, 202, NOW())`,
          validStaffId
        );

        const lastInsertedUser =
          await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`SELECT LAST_INSERT_ID() as id`);
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
          finalCustomerId,
          11,
          1,
          1,
          randPasscode,
          'Client',
          firstName,
          lastName,
          newCustomerName,
          storeId,
          0,
          0,
          0,
          1,
          '',
          0,
          0,
          referrerUserId
        );

        if (newCustomerPhone) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `INSERT INTO user_contact (user_id, phone_number, is_disabled, date_created)
             VALUES (?, ?, 0, NOW())`,
            finalCustomerId,
            newCustomerPhone
          );
        }
      } else {
        // If existing customer, update referrer if they don't have one yet
        if (referrerUserId) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE user_profile SET referrer_user_id = ? WHERE user_id = ? AND referrer_user_id IS NULL`,
            referrerUserId,
            finalCustomerId
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
      const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
        const promoRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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

      // Adjust date timezone for SQL representation using timezone-naive local format
      const formatLocalMySQL = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const mysqlStart = formatLocalMySQL(startDate);
      const mysqlEnd = formatLocalMySQL(endDate);

      // 5. Determine booker name and format final booking note to render correctly on legacy client
      let _bookerName = user.displayName || '';
      if (validStaffId) {
        const staffProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          validStaffId
        );
        if (staffProfile.length > 0 && staffProfile[0].full_name) {
          _bookerName = staffProfile[0].full_name;
        }
      }

      const finalBookingNote = (bookingNote || '').trim();

      // 6. Create the booking order
      const orderKey = 'booking_' + Math.random().toString(36).substring(2, 12);
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO \`order\` (
          client_id, client_business_id, created_staff_id, order_key, client_store_id, 
          user_id, currency_id, booking_note, booking_channels, booking_duration_minute, 
          booking_date_start, booking_date_end, total_quantity, total_price, order_state, 
          last_day_order_completed, combo_sale_required, is_new, is_debt, date_created, date_updated,
          promotion_id, selected_promotion_id, campaign_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
        11,
        1,
        validStaffId,
        orderKey,
        storeId,
        finalCustomerId,
        1,
        finalBookingNote,
        bookingChannel || 'FB',
        srvDuration,
        mysqlStart,
        mysqlEnd,
        1,
        finalPrice,
        'New',
        0,
        0,
        1,
        0,
        selectedPromoId,
        selectedPromoId,
        campaignId
      );

      // Get inserted order ID
      const insertedOrder = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`order\` WHERE order_key = ? LIMIT 1`,
        orderKey
      );
      if (insertedOrder.length === 0) {
        throw new Error('Failed to create booking order.');
      }
      const orderId = Number(insertedOrder[0].id);

      // Insert log record into order_booking_date_change to sync booker details and time on legacy frontend
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_booking_date_change (
          created_staff_id, order_id, client_store_id, assigned_staff_id, 
          booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        validStaffId,
        orderId,
        storeId,
        technicianId || null,
        finalBookingNote,
        srvDuration,
        mysqlStart,
        mysqlEnd
      );

      // 5. Create order_service record
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_service (
          client_id, client_business_id, user_id, order_id, service_id, 
          service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id, 
          duration_minute, quantity, service_price, discount_amount, paid_credit_amount, 
          tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        11,
        1,
        finalCustomerId,
        orderId,
        finalServiceId,
        'Normal',
        'LashesTop',
        'new',
        technicianId,
        technicianId,
        srvDuration,
        1,
        srvPrice,
        discountAmount,
        0,
        0,
        0,
        0,
        0,
        0,
        finalPrice
      );

      // 6. Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart,
        finalCustomerId
      );

      // 7. Check and assign customer to the logged-in CRM staff member if not already assigned
      const existingAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
        where: { legacyUserId: finalCustomerId },
      });

      if (!existingAssignment) {
        const crmStaffExists = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: user.id },
        });

        if (crmStaffExists) {
          await fastify.prisma.crm.crmCustomerAssignment.create({
            data: {
              legacyUserId: finalCustomerId,
              staffId: user.id,
              assignedBy: user.id,
            },
          });

          const batchId = `alloc_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: finalCustomerId,
              prevStaffId: null,
              newStaffId: user.id,
              assignedBy: user.id,
            },
          });
        }
      }

      return { success: true, orderId, customerId: finalCustomerId };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, '[Booking] Failed to create booking:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to create booking',
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
      storeName: _storeName,
      technicianId,
      technicianName: _technicianName,
      bookingDate,
      bookingTime,
      bookingNote,
      serviceId,
    } = request.body as {
      storeId: number;
      storeName: string;
      technicianId: number | null;
      technicianName?: string;
      bookingDate: string; // YYYY-MM-DD
      bookingTime: string; // HH:mm
      bookingNote?: string | null;
      serviceId?: number | null;
    };

    if (!storeId || !bookingDate || !bookingTime) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Các thông tin Chi nhánh, Ngày đặt và Khung giờ trống là bắt buộc',
      });
    }

    try {
      // Verify that the current user has linked legacy staff account
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      if (!crmStaff || !crmStaff.legacyStaffId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message:
            'Tài khoản của bạn chưa được liên kết với hệ thống cũ. Vui lòng liên hệ Admin để cấu hình liên kết tài khoản trước khi thực hiện đặt lịch.',
        });
      }

      const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM user WHERE id = ? LIMIT 1`,
        crmStaff.legacyStaffId
      );
      if (staffExists.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tài khoản liên kết bên hệ thống cũ không tồn tại hoặc đã bị xóa. Vui lòng liên hệ Admin.',
        });
      }

      // 1. Fetch current order details (like duration and user_id)
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, booking_duration_minute, total_price FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const finalCustomerId = Number(order.user_id);

      // 2. Fetch service price & duration if serviceId is provided
      let srvPrice = 0;
      let srvDuration = 90;
      let finalServiceId = serviceId;
      if (finalServiceId !== undefined && finalServiceId !== null) {
        if (finalServiceId === 0) {
          finalServiceId = 1; // Map to "Any - Lashes 2"
        }
        const srvInfo = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
      }

      const duration =
        serviceId !== undefined && serviceId !== null ? srvDuration : Number(order.booking_duration_minute) || 90;
      const totalPrice = serviceId !== undefined && serviceId !== null ? srvPrice : Number(order.total_price || 0);

      // 3. Calculate new dates
      const startStr = `${bookingDate} ${bookingTime}:00`;
      const startDate = new Date(startStr);
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      // Adjust date timezone for SQL representation using timezone-naive local format
      const formatLocalMySQL = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const mysqlStart = formatLocalMySQL(startDate);
      const mysqlEnd = formatLocalMySQL(endDate);

      // 4. Update order in legacy database
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET booking_date_start = ?, 
             booking_date_end = ?, 
             assigned_staff_id = ?, 
             client_store_id = ?, 
             booking_note = ?, 
             booking_duration_minute = ?,
             total_price = ?,
             order_state = 'New',
             date_updated = NOW()
         WHERE id = ?`,
        mysqlStart,
        mysqlEnd,
        technicianId || null,
        storeId,
        bookingNote || null,
        duration,
        totalPrice,
        orderId
      );

      // Insert log record into order_booking_date_change to sync booker details and time on legacy frontend
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_booking_date_change (
          created_staff_id, order_id, client_store_id, assigned_staff_id, 
          booking_note, booking_duration_minute, booking_date_start, booking_date_end, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        crmStaff.legacyStaffId,
        orderId,
        storeId,
        technicianId || null,
        bookingNote || null,
        duration,
        mysqlStart,
        mysqlEnd
      );

      // 5. Update order_service record KTV assignment & service details
      if (serviceId !== undefined && serviceId !== null) {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET service_id = ?,
               duration_minute = ?,
               service_price = ?,
               assigned_staff_id = ?, 
               booked_staff_id = ? 
           WHERE order_id = ?`,
          finalServiceId,
          duration,
          totalPrice,
          technicianId || null,
          technicianId || null,
          orderId
        );
      } else {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET assigned_staff_id = ?, booked_staff_id = ? 
           WHERE order_id = ?`,
          technicianId || null,
          technicianId || null,
          orderId
        );
      }

      // 5. Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart,
        finalCustomerId
      );

      return reply.send({ success: true, orderId });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Reschedule booking error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể dời lịch hẹn.' });
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
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
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
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Cancel booking error:');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: (err as SafeAny).message || 'Không thể hủy lịch hẹn.' });
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

  // POST /api/customers/:id/notes
  // Create a new note for a customer in user_note table
  fastify.post('/customers/:id/notes', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { note, noteFieldKey, isSticky } = request.body as {
      note: string;
      noteFieldKey: 'note' | 'order_note';
      isSticky?: boolean;
    };

    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID khách hàng không hợp lệ' });
    }

    if (!note || !note.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Nội dung ghi chú là bắt buộc' });
    }

    try {
      const user = request.user as { id: number };

      // Get the legacyStaffId of the logged-in CRM staff
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true },
      });

      const staffId = crmStaff?.legacyStaffId || 0;

      // Insert into user_note raw table
      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO user_note (client_id, client_business_id, user_id, note, note_field_key, is_sticky, is_issue, created_staff_id, is_disabled, date_created)
         VALUES (11, 1, ?, ?, ?, ?, 0, ?, 0, NOW())`,
        customerId,
        note.trim(),
        noteFieldKey || 'note',
        isSticky ? 1 : 0,
        staffId
      );

      return reply.send({ success: true, message: 'Thêm ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Create customer note error for customer ${customerId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể tạo ghi chú cho khách hàng.',
      });
    }
  });

  // POST /api/customers/:id/notes/:noteId/unpin
  // Unpin a customer note (admin only)
  fastify.post('/customers/:id/notes/:noteId/unpin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép bỏ ghim ghi chú.' });
    }

    const customerId = parseInt(id, 10);
    const parsedNoteId = parseInt(noteId, 10);
    if (isNaN(customerId) || isNaN(parsedNoteId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tham số không hợp lệ.' });
    }

    try {
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_note SET is_sticky = 0 WHERE id = ? AND user_id = ?`,
        parsedNoteId,
        customerId
      );

      return reply.send({ success: true, message: 'Bỏ ghim ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Unpin customer note error for customer ${customerId}, note ${parsedNoteId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể bỏ ghim ghi chú.',
      });
    }
  });

  // POST /api/customers/:id/notes/:noteId/pin
  // Pin a customer note (admin only)
  fastify.post('/customers/:id/notes/:noteId/pin', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, noteId } = request.params as { id: string; noteId: string };
    const user = request.user as { id: number; role: string };

    if (user.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ có quản trị viên (admin) mới được phép ghim ghi chú.' });
    }

    const customerId = parseInt(id, 10);
    const parsedNoteId = parseInt(noteId, 10);
    if (isNaN(customerId) || isNaN(parsedNoteId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Tham số không hợp lệ.' });
    }

    try {
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_note SET is_sticky = 1 WHERE id = ? AND user_id = ?`,
        parsedNoteId,
        customerId
      );

      return reply.send({ success: true, message: 'Ghim ghi chú thành công' });
    } catch (err: SafeAny) {
      fastify.log.error(err, `Pin customer note error for customer ${customerId}, note ${parsedNoteId}:`);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (err as SafeAny).message || 'Không thể ghim ghi chú.',
      });
    }
  });

  // POST /api/customers/assign
  // Assign multiple customers to a staff member with expiration & source tracking
  fastify.post('/customers/assign', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      customerIds,
      staffId,
      durationDays,
      sourceType = 'MANUAL',
      sourceFilterSummary,
      sourceFilterJson,
    } = request.body as {
      customerIds: number[];
      staffId: number;
      durationDays?: number;
      sourceType?: string;
      sourceFilterSummary?: string;
      sourceFilterJson?: string;
    };
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
        where: { legacyUserId: { in: customerIds } },
      });
      const assignmentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

      // 2. Calculate expiration date if durationDays provided
      const now = new Date();
      const durationNum = durationDays && durationDays > 0 ? Number(durationDays) : null;
      const expiresAt = durationNum ? new Date(now.getTime() + durationNum * 24 * 60 * 60 * 1000) : null;

      // 3. Generate a unique batch ID
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 4. Perform upserts and create history entries in a transaction
      await fastify.prisma.crm.$transaction([
        ...customerIds.map((cid) =>
          fastify.prisma.crm.crmCustomerAssignment.upsert({
            where: { legacyUserId: cid },
            update: {
              staffId,
              assignedBy: adminUser.id,
              assignedAt: now,
              expiresAt,
              assignedDurationDays: durationNum,
              isRetained: false,
              retainedAt: null,
            },
            create: {
              legacyUserId: cid,
              staffId,
              assignedBy: adminUser.id,
              assignedAt: now,
              expiresAt,
              assignedDurationDays: durationNum,
              isRetained: false,
            },
          })
        ),
        ...customerIds.map((cid) =>
          fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: assignmentMap.get(cid) ?? null,
              newStaffId: staffId,
              assignedBy: adminUser.id,
              assignedAt: now,
              expiresAt,
              sourceType: sourceType || 'MANUAL',
              sourceFilterSummary: sourceFilterSummary || null,
              sourceFilterJson: sourceFilterJson || null,
              actionType: 'ASSIGN',
            },
          })
        ),
      ]);

      return { success: true, count: customerIds.length, batchId };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Assign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to assign customers' });
    }
  });

  // POST /api/customers/revoke
  // Revoke assignments before expiration (to pool or re-assign to targetStaffId) with MANDATORY reason
  fastify.post('/customers/revoke', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, targetStaffId, reason } = request.body as {
      customerIds: number[];
      targetStaffId?: number | null;
      reason: string;
    };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền thu hồi phân bổ.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng cung cấp lý do thu hồi data.' });
    }

    const cleanReason = reason.trim();

    try {
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
      });
      const assignmentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));
      const batchId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      if (targetStaffId) {
        // Direct transfer to new Booker
        await fastify.prisma.crm.$transaction([
          ...customerIds.map((cid) =>
            fastify.prisma.crm.crmCustomerAssignment.upsert({
              where: { legacyUserId: cid },
              update: {
                staffId: targetStaffId,
                assignedBy: adminUser.id,
                assignedAt: now,
                isRetained: false,
                retainedAt: null,
              },
              create: {
                legacyUserId: cid,
                staffId: targetStaffId,
                assignedBy: adminUser.id,
                assignedAt: now,
                isRetained: false,
              },
            })
          ),
          ...customerIds.map((cid) =>
            fastify.prisma.crm.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: cid,
                prevStaffId: assignmentMap.get(cid) ?? null,
                newStaffId: targetStaffId,
                assignedBy: adminUser.id,
                assignedAt: now,
                actionType: 'TRANSFER',
                reason: cleanReason,
              },
            })
          ),
        ]);
      } else {
        // Revoke back to pool
        await fastify.prisma.crm.$transaction(async (tx) => {
          for (const cid of customerIds) {
            const existing = await tx.crmCustomerAssignment.findUnique({
              where: { legacyUserId: cid },
            });
            if (existing && existing.isRetained) {
              await tx.crmCustomerAssignment.update({
                where: { legacyUserId: cid },
                data: {
                  staffId: null,
                  expiresAt: null,
                  assignedDurationDays: null,
                },
              });
            } else {
              await tx.crmCustomerAssignment.deleteMany({
                where: { legacyUserId: cid },
              });
            }

            await tx.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: cid,
                prevStaffId: assignmentMap.get(cid) ?? null,
                newStaffId: null,
                assignedBy: adminUser.id,
                assignedAt: now,
                actionType: 'REVOKE',
                reason: cleanReason,
              },
            });
          }
        });
      }

      return { success: true, count: customerIds.length, batchId };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Revoke customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to revoke customers' });
    }
  });

  // POST /api/customers/unassign
  fastify.post('/customers/unassign', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, reason = 'Hủy phân bổ thủ công' } = request.body as { customerIds: number[]; reason?: string };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin') {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hủy phân bổ khách hàng.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
      });
      const assignmentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));
      const batchId = `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      await fastify.prisma.crm.$transaction([
        fastify.prisma.crm.crmCustomerAssignment.deleteMany({
          where: { legacyUserId: { in: customerIds } },
        }),
        ...customerIds.map((cid) =>
          fastify.prisma.crm.crmAssignmentHistory.create({
            data: {
              batchId,
              legacyUserId: cid,
              prevStaffId: assignmentMap.get(cid) ?? null,
              newStaffId: null,
              assignedBy: adminUser.id,
              assignedAt: now,
              actionType: 'REVOKE',
              reason,
            },
          })
        ),
      ]);

      return { success: true, count: customerIds.length, batchId };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Unassign customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to unassign customers' });
    }
  });

  // POST /api/customers/retain
  // Booker toggles retained data within their quota limit
  fastify.post('/customers/retain', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds, isRetained = true } = request.body as { customerIds: number[]; isRetained?: boolean };
    const user = request.user as { id: number; role: string };

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      // Fetch staff quota configuration
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_RETAIN_QUOTA_CONFIG' },
      });

      let quotaLimit = 50; // Default limit per booker
      if (configRecord?.value) {
        try {
          const quotaMap = JSON.parse(configRecord.value);
          if (quotaMap[user.id] !== undefined) {
            quotaLimit = Number(quotaMap[user.id]);
          } else if (quotaMap.default !== undefined) {
            quotaLimit = Number(quotaMap.default);
          }
        } catch {
          // ignore parse error
        }
      }

      if (isRetained) {
        // Count existing retained customers for this staff (excluding ones being toggled)
        const currentRetainedCount = await fastify.prisma.crm.crmCustomerAssignment.count({
          where: {
            staffId: user.id,
            isRetained: true,
            legacyUserId: { notIn: customerIds },
          },
        });

        if (currentRetainedCount + customerIds.length > quotaLimit) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Vượt quá hạn ngạch giữ data! Bạn đang giữ ${currentRetainedCount}/${quotaLimit} data. Không thể chọn giữ thêm ${customerIds.length} data nữa.`,
          });
        }
      }

      // Update retention status
      await fastify.prisma.crm.crmCustomerAssignment.updateMany({
        where: {
          legacyUserId: { in: customerIds },
          ...(user.role !== 'admin' ? { staffId: user.id } : {}),
        },
        data: {
          isRetained,
          retainedAt: isRetained ? new Date() : null,
        },
      });

      return reply.send({
        success: true,
        message: isRetained
          ? `Đã lưu ${customerIds.length} khách hàng vào danh sách giữ lại.`
          : `Đã bỏ giữ ${customerIds.length} khách hàng.`,
      });
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Retain customers error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi khi cập nhật giữ data' });
    }
  });

  // GET /api/customers/booker-retain-quota
  fastify.get('/customers/booker-retain-quota', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string };

    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_RETAIN_QUOTA_CONFIG' },
      });

      let quotaLimit = 50;
      if (configRecord?.value) {
        try {
          const quotaMap = JSON.parse(configRecord.value);
          if (quotaMap[user.id] !== undefined) {
            quotaLimit = Number(quotaMap[user.id]);
          } else if (quotaMap.default !== undefined) {
            quotaLimit = Number(quotaMap.default);
          }
        } catch {
          // ignore
        }
      }

      const retainedCount = await fastify.prisma.crm.crmCustomerAssignment.count({
        where: {
          staffId: user.id,
          isRetained: true,
        },
      });

      return {
        retainedCount,
        quotaLimit,
        remainingQuota: Math.max(0, quotaLimit - retainedCount),
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get retain quota error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Lỗi khi lấy thông tin Quota giữ data' });
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
      const distinctHistory = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        distinct: ['batchId'],
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          newStaff: { select: { displayName: true } },
          prevStaff: { select: { displayName: true } },
          assigner: { select: { displayName: true } },
        },
      });

      const allBatches = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId'],
      });
      const total = allBatches.length;

      if (distinctHistory.length === 0) {
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

      const batchIds = distinctHistory.map((h) => h.batchId);
      const batchStats = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId', 'isUndone'],
        where: { batchId: { in: batchIds } },
        _count: { id: true },
      });

      const statsMap = new Map<string, { count: number; isUndone: boolean }>();
      batchStats.forEach((stat) => {
        const existing = statsMap.get(stat.batchId);
        if (existing) {
          existing.count += stat._count.id;
          if (stat.isUndone) existing.isUndone = true;
        } else {
          statsMap.set(stat.batchId, {
            count: stat._count.id,
            isUndone: !!stat.isUndone,
          });
        }
      });

      const data = distinctHistory.map((h) => {
        const stat = statsMap.get(h.batchId) || { count: 0, isUndone: false };
        return {
          batchId: h.batchId,
          assignedAt: h.assignedAt,
          assignedBy: h.assigner?.displayName || 'Hệ thống',
          newStaffName: h.newStaff?.displayName || null,
          prevStaffName: h.prevStaff?.displayName || null,
          customerCount: stat.count,
          isUndone: !!h.isUndone || stat.isUndone,
          undoneAt: h.undoneAt,
          expiresAt: h.expiresAt,
          sourceType: h.sourceType,
          sourceFilterSummary: h.sourceFilterSummary,
          sourceFilterJson: h.sourceFilterJson,
          actionType: h.actionType,
          reason: h.reason,
        };
      });

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get assignment history error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history' });
    }
  });

  // GET /api/customers/assignment-history/:batchId/details
  fastify.get(
    '/customers/assignment-history/:batchId/details',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const adminUser = request.user as { id: number; role: string };
      if (adminUser.role !== 'admin') {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem chi tiết phân bổ.' });
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
            newStaff: { select: { displayName: true } },
          },
          orderBy: { id: 'asc' },
        });

        if (historyRecords.length === 0) {
          return { data: [] };
        }

        const customerIds = historyRecords.map((r) => r.legacyUserId);

        const legacyCustomers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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

        const customerMap = new Map(legacyCustomers.map((c) => [Number(c.id), c]));

        const data = historyRecords.map((r) => {
          const legacyCust = customerMap.get(r.legacyUserId) || {
            fullName: `Khách hàng #${r.legacyUserId}`,
            phone: 'N/A',
          };
          return {
            id: r.id,
            legacyUserId: r.legacyUserId,
            fullName: legacyCust.fullName || `Khách hàng #${r.legacyUserId}`,
            phone: legacyCust.phone || 'N/A',
            prevStaffName: r.prevStaff?.displayName || 'Chưa phân bổ',
            newStaffName: r.newStaff?.displayName || 'Gỡ Booker',
            isUndone: r.isUndone === true || (r.isUndone as SafeAny) === 1,
            undoneAt: r.undoneAt,
            actionType: r.actionType,
            reason: r.reason,
            sourceFilterSummary: r.sourceFilterSummary,
          };
        });

        return { data };
      } catch (error: SafeAny) {
        fastify.log.error({ err: error }, 'Get assignment history details error');
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment history details' });
      }
    }
  );

  // POST /api/customers/assignment-history/undo
  // Undo a batch of assignments with MANDATORY reason
  fastify.post('/customers/assignment-history/undo', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hoàn tác phân bổ.' });
    }

    const { batchId, reason } = request.body as { batchId: string; reason?: string };
    if (!batchId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'batchId is required' });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Vui lòng nhập lý do hoàn tác đợt phân bổ.' });
    }

    const cleanReason = reason.trim();

    try {
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { batchId, isUndone: false },
      });

      if (historyRecords.length === 0) {
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: 'Đợt phân bổ này không tồn tại hoặc đã được hoàn tác trước đó.' });
      }

      const customerIds = historyRecords.map((r) => r.legacyUserId);
      const newStaffId = historyRecords[0].newStaffId;

      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: customerIds } },
      });
      const currentMap = new Map(currentAssignments.map((a) => [a.legacyUserId, a.staffId]));

      const assignmentsToRevert: typeof historyRecords = [];
      for (const record of historyRecords) {
        const currentStaffId = currentMap.get(record.legacyUserId);

        const isCurrentMatch =
          (newStaffId === null && currentStaffId === undefined) ||
          (newStaffId !== null && currentStaffId === newStaffId);

        if (isCurrentMatch) {
          assignmentsToRevert.push(record);
        }
      }

      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const record of assignmentsToRevert) {
          const existing = await tx.crmCustomerAssignment.findUnique({
            where: { legacyUserId: record.legacyUserId },
          });

          if (record.prevStaffId === null) {
            if (existing && existing.isRetained) {
              await tx.crmCustomerAssignment.update({
                where: { legacyUserId: record.legacyUserId },
                data: {
                  staffId: null,
                  expiresAt: null,
                  assignedDurationDays: null,
                },
              });
            } else {
              await tx.crmCustomerAssignment.deleteMany({
                where: { legacyUserId: record.legacyUserId },
              });
            }
          } else {
            await tx.crmCustomerAssignment.upsert({
              where: { legacyUserId: record.legacyUserId },
              update: { staffId: record.prevStaffId, assignedBy: adminUser.id, assignedAt: new Date() },
              create: { legacyUserId: record.legacyUserId, staffId: record.prevStaffId, assignedBy: adminUser.id },
            });
          }
        }

        // Mark the entire batch in history as undone with undo reason
        await tx.crmAssignmentHistory.updateMany({
          where: { batchId },
          data: {
            isUndone: true,
            undoneAt: new Date(),
            reason: cleanReason,
          },
        });
      });

      return {
        success: true,
        revertedCount: assignmentsToRevert.length,
        totalCount: historyRecords.length,
        skippedCount: historyRecords.length - assignmentsToRevert.length,
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Undo assignment error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to undo assignments' });
    }
  });

  // GET /api/customers/:id/assignment-timeline
  // Get complete allocation audit trail timeline for a single customer
  fastify.get('/customers/:id/assignment-timeline', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      const historyRecords = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: { legacyUserId: customerId },
        include: {
          prevStaff: { select: { displayName: true } },
          newStaff: { select: { displayName: true } },
          assigner: { select: { displayName: true } },
        },
        orderBy: { assignedAt: 'desc' },
      });

      // Get current active assignment details if any
      const activeAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
        where: { legacyUserId: customerId },
      });

      const data = historyRecords.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        assignedAt: r.assignedAt,
        actionType: r.actionType || (r.isUndone ? 'UNDO' : r.newStaffId ? 'ASSIGN' : 'REVOKE'),
        staffId: r.newStaffId,
        staffName: r.newStaff?.displayName || null,
        prevStaffId: r.prevStaffId,
        prevStaffName: r.prevStaff?.displayName || null,
        assignedBy: r.assigner?.displayName || 'Hệ thống',
        expiresAt: r.expiresAt,
        isRetained: activeAssignment ? activeAssignment.isRetained && activeAssignment.staffId === r.newStaffId : false,
        sourceType: r.sourceType || 'MANUAL',
        sourceFilterSummary: r.sourceFilterSummary,
        reason: r.reason,
        isUndone: r.isUndone,
        undoneAt: r.undoneAt,
      }));

      return { data };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Get customer assignment timeline error');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve assignment timeline' });
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
            staffId: user.id,
          },
        });
        if (!assigned) {
          return reply
            .status(403)
            .send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin khách hàng này.' });
        }
      }
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
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      if (user.role !== 'admin') {
        const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
          where: {
            legacyUserId: customerId,
            staffId: user.id,
          },
        });
        if (!assigned) {
          return reply
            .status(403)
            .send({ error: 'Forbidden', message: 'Bạn không có quyền xem lịch sử của khách hàng này.' });
        }
      }
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
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: { legacyUserId: customerId },
    });
    if (user.role !== 'admin') {
      if (!assigned || assigned.staffId !== user.id) {
        return reply
          .status(403)
          .send({ error: 'Forbidden', message: 'Bạn không có quyền chỉnh sửa thông tin khách hàng này.' });
      }
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
    } catch (error: SafeAny) {
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
      // 1. Authorization check & Fetch CRM Assignment for Online Consultant
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: customerId },
        include: { staff: true },
      });
      const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

      if (user.role !== 'admin') {
        if (!assigned || assigned.staffId !== user.id) {
          return reply
            .status(403)
            .send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin chi tiết khách hàng này.' });
        }
      }

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

      // 5. Fetch Combo Balances & Real Purchase Transactions
      const balanceSql = `
        SELECT 
          CONCAT('osc_', osc.id) as id,
          osc.service_id as serviceId,
          osc.service_group as serviceGroup,
          CASE WHEN o.date_created = (
            SELECT MAX(o2.date_created) 
            FROM (
              SELECT o3.date_created, osc3.service_id, o3.user_id 
              FROM order_service_combo osc3 
              JOIN \`order\` o3 ON osc3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND osc3.total_price > 0
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
              UNION ALL
              SELECT o3.date_created, os3.service_id, o3.user_id 
              FROM order_service os3 
              JOIN \`order\` o3 ON os3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND os3.total_price > 0
                AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
            ) o2 
            WHERE o2.user_id = o.user_id AND o2.service_id = osc.service_id
          ) THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
          CASE WHEN o.date_created = (
            SELECT MAX(o2.date_created) 
            FROM (
              SELECT o3.date_created, osc3.service_id, o3.user_id 
              FROM order_service_combo osc3 
              JOIN \`order\` o3 ON osc3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND osc3.total_price > 0
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
              UNION ALL
              SELECT o3.date_created, os3.service_id, o3.user_id 
              FROM order_service os3 
              JOIN \`order\` o3 ON os3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND os3.total_price > 0
                AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
            ) o2 
            WHERE o2.user_id = o.user_id AND o2.service_id = osc.service_id
          ) THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
          usb.date_expired as dateExpired,
          o.date_created as dateCreated,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          sp.normal_count as packageNormalCount,
          sp.service_price_package_key as packageKey,
          usb.total_normal_balance_amount as totalNormalBalanceAmount,
          usb.total_retain_balance_amount as totalRetainBalanceAmount,
          osc.total_price as packagePrice,
          up.full_name as creatorStaffName
        FROM order_service_combo osc
        JOIN \`order\` o ON osc.order_id = o.id
        LEFT JOIN service s ON osc.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON osc.service_price_id = sp.id
        LEFT JOIN (
          SELECT order_id, MAX(check_in_staff_id) as check_in_staff_id, MAX(check_out_staff_id) as check_out_staff_id
          FROM order_service
          GROUP BY order_id
        ) os_cc ON os_cc.order_id = o.id
        LEFT JOIN user_profile up ON COALESCE(os_cc.check_out_staff_id, os_cc.check_in_staff_id, o.created_staff_id) = up.user_id
        LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = osc.service_id AND usb.service_price_id = osc.service_price_id
        WHERE o.user_id = ? AND o.order_state = 'Completed' AND osc.total_price > 0
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))

        UNION ALL

        SELECT 
          CONCAT('os_', os.id) as id,
          os.service_id as serviceId,
          os.service_group as serviceGroup,
          CASE WHEN o.date_created = (
            SELECT MAX(o2.date_created) 
            FROM (
              SELECT o3.date_created, osc3.service_id, o3.user_id 
              FROM order_service_combo osc3 
              JOIN \`order\` o3 ON osc3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND osc3.total_price > 0
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
              UNION ALL
              SELECT o3.date_created, os3.service_id, o3.user_id 
              FROM order_service os3 
              JOIN \`order\` o3 ON os3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND os3.total_price > 0
                AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
            ) o2 
            WHERE o2.user_id = o.user_id AND o2.service_id = os.service_id
          ) THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
          CASE WHEN o.date_created = (
            SELECT MAX(o2.date_created) 
            FROM (
              SELECT o3.date_created, osc3.service_id, o3.user_id 
              FROM order_service_combo osc3 
              JOIN \`order\` o3 ON osc3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND osc3.total_price > 0
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
              UNION ALL
              SELECT o3.date_created, os3.service_id, o3.user_id 
              FROM order_service os3 
              JOIN \`order\` o3 ON os3.order_id = o3.id 
              LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
              WHERE o3.order_state = 'Completed' AND os3.total_price > 0
                AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
                AND (sp3.service_price_package_key IS NULL OR (
                  LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
                  AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
                ))
            ) o2 
            WHERE o2.user_id = o.user_id AND o2.service_id = os.service_id
          ) THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
          usb.date_expired as dateExpired,
          o.date_created as dateCreated,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          sp.normal_count as packageNormalCount,
          sp.service_price_package_key as packageKey,
          usb.total_normal_balance_amount as totalNormalBalanceAmount,
          usb.total_retain_balance_amount as totalRetainBalanceAmount,
          os.total_price as packagePrice,
          up.full_name as creatorStaffName
        FROM order_service os
        JOIN \`order\` o ON os.order_id = o.id
        LEFT JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN service_price sp ON os.service_price_id = sp.id
        LEFT JOIN user_profile up ON COALESCE(os.check_out_staff_id, os.check_in_staff_id, o.created_staff_id) = up.user_id
        LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = os.service_id AND usb.service_price_id = os.service_price_id
        WHERE o.user_id = ? AND o.order_state = 'Completed'
          AND (os.user_service_type = 'combo' OR s.service_group = 'combo')
          AND os.total_price > 0
          AND (sp.service_price_package_key IS NULL OR (
            LOWER(sp.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
          ))

        UNION ALL

        SELECT 
          CONCAT('usb_', usb.id) as id,
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
        LEFT JOIN user_profile up ON COALESCE(usb.updated_staff_id, usb.created_staff_id) = up.user_id
        WHERE usb.user_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM order_service_combo osc2 
            JOIN \`order\` o2 ON osc2.order_id = o2.id 
            LEFT JOIN service_price sp2 ON osc2.service_price_id = sp2.id
            WHERE o2.user_id = usb.user_id AND osc2.service_id = usb.service_id AND osc2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND osc2.total_price > 0
              AND (sp2.service_price_package_key IS NULL OR (
                LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
              ))
          )
          AND NOT EXISTS (
            SELECT 1 FROM order_service os2 
            JOIN \`order\` o2 ON os2.order_id = o2.id 
            LEFT JOIN service_price sp2 ON os2.service_price_id = sp2.id
            WHERE o2.user_id = usb.user_id AND os2.service_id = usb.service_id AND os2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND os2.total_price > 0
              AND (os2.user_service_type = 'combo' OR os2.service_group = 'combo')
              AND (sp2.service_price_package_key IS NULL OR (
                LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
                AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
              ))
          )
        ORDER BY dateCreated DESC
      `;
      const comboBalances = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        balanceSql,
        customerId,
        customerId,
        customerId
      );

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
        const rawCheckIn = orderSvs.find((os) => os.check_in_staff_id && os.check_in_staff_id > 0)?.check_in_staff_id;
        const rawCheckOut = orderSvs.find(
          (os) => os.check_out_staff_id && os.check_out_staff_id > 0
        )?.check_out_staff_id;
        const firstCvStaffId =
          b.technicianId || orderSvs.find((os) => os.assigned_staff_id && os.assigned_staff_id > 0)?.assigned_staff_id;
        const rawBooker = b.createdStaffId;

        const isCheckedIn = [
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'ServiceCompleted',
          'CheckOut',
          'Parking',
          'Completed',
        ].includes(b.orderState);
        const isCheckedOut = ['CheckOut', 'Completed'].includes(b.orderState);

        const finalCheckInId = isCheckedIn ? rawCheckIn || rawCheckOut || null : null;
        const finalCheckOutId = isCheckedOut ? rawCheckOut || rawCheckIn || null : null;
        const finalBookerId = rawBooker || null;

        const getStaffDisplayName = (staffId: number | null | undefined) => {
          if (!staffId) return null;
          const name = staffNamesMap.get(Number(staffId));
          if (!name) return null;
          const isInactive = staffInactiveMap.get(Number(staffId));
          return isInactive ? `${name} (Đã nghỉ)` : name;
        };

        const checkinName = getStaffDisplayName(finalCheckInId);
        const checkoutName = getStaffDisplayName(finalCheckOutId);
        const bookerDisplayName = getStaffDisplayName(finalBookerId);
        const technicianName =
          getStaffDisplayName(firstCvStaffId) ||
          (b.assignedTechnicianName && b.assignedTechnicianName !== 'Kỹ thuật viên' ? b.assignedTechnicianName : null);

        return {
          id: b.id,
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || '',
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          branchName: b.branchName,
          technicianName,
          ccInName: checkinName,
          checkinStaffName: checkinName,
          ccOutName: checkoutName,
          checkoutStaffName: checkoutName,
          bookerName: bookerDisplayName,
          bookerStaffName: bookerDisplayName,
          ccInAvatar: finalCheckInId ? staffAvatarMap.get(Number(finalCheckInId)) || null : null,
          ccOutAvatar: finalCheckOutId ? staffAvatarMap.get(Number(finalCheckOutId)) || null : null,
          bookerAvatar: finalBookerId ? staffAvatarMap.get(Number(finalBookerId)) || null : null,
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
          id: String(cb.id),
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
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get detailed customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve detailed customer profile',
      });
    }
  });

  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, type, staffId, page, limit } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      type?: 'pending' | 'missed' | 'completed';
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
          where: { id: targetStaffId },
        });

        if (staff) {
          staffRole = staff.role;
          // Strip " CC" suffix from name if it exists to match legacy user full_name
          const cleanName = staff.displayName.replace(/\s+CC$/i, '').trim();

          const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `
            SELECT up.user_id as userId
            FROM \`staff_profile\` sp
            JOIN \`user_profile\` up ON sp.user_id = up.user_id
            WHERE up.provider = 'Staff' AND up.is_disabled = 0
              AND (up.full_name = ? OR up.full_name = ?)
            ORDER BY up.user_id DESC
            LIMIT 1
          `,
            cleanName,
            cleanName + ' '
          );

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
          select: { legacyUserId: true },
        });
        assignedCustomerIds = assignments.map((a) => Number(a.legacyUserId));
      }

      // If staff selected but no corresponding legacy user found AND no assigned customers, return empty list
      if (filterByStaff && !staffLegacyId && assignedCustomerIds.length === 0) {
        return { data: [], total: 0 };
      }

      // 2. Query total count matching filters
      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;
      const countParams: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];

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
      } else if (type === 'missed') {
        countSql += ` AND (o.order_state = 'Cancelled' OR (o.order_state != 'Completed' AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) < NOW()))`;
      } else {
        countSql += ` AND o.order_state NOT IN ('Completed', 'Cancelled') AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()`;
      }

      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql, ...countParams);
      const total = Number(countResult[0]?.total || 0);

      // 3. Query orders/bookings in range with pagination
      let sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.promotion_id as promotionId,
          o.selected_promotion_id as selectedPromotionId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDateStart,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%H:%i') as actualBookingTime,
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
        LEFT JOIN report_order ro ON o.id = ro.order_id
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;

      const params: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];

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
      } else if (type === 'missed') {
        sql += ` AND (o.order_state = 'Cancelled' OR (o.order_state != 'Completed' AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) < NOW()))`;
      } else {
        sql += ` AND o.order_state NOT IN ('Completed', 'Cancelled') AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()`;
      }

      sql += ` ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) ASC LIMIT ? OFFSET ?`;
      params.push(limitNum, offsetNum);

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ...params);

      // 4. Fetch payment details and service details for completed/active orders to calculate financial metrics
      const orderIds = result.map((o) => Number(o.id));
      const completedOrderIds = result.filter((o) => o.orderState === 'Completed').map((o) => Number(o.id));

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

      const orderServicesMap = new Map<number, SafeAny[]>();
      const serviceNameMap = new Map<number, string>();
      if (orderIds.length > 0) {
        const orderServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: orderIds } },
        });
        orderServices.forEach((os) => {
          const l = orderServicesMap.get(os.order_id) || [];
          l.push(os);
          orderServicesMap.set(os.order_id, l);
        });

        const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
        if (serviceIds.length > 0) {
          const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: serviceIds } },
          });
          serviceLanguages.forEach((sl) => {
            serviceNameMap.set(sl.service_id, sl.service_name);
          });
        }
      }

      // Query promotions for all appointments in current page
      const promoDetailsMap = new Map<number, { name: string; discountPercentage: number; discountAmount: number }>();
      const promoIds = Array.from(
        new Set([
          ...result.map((o) => Number(o.promotionId)).filter((id) => id > 0),
          ...result.map((o) => Number(o.selectedPromotionId)).filter((id) => id > 0),
          ...Array.from(orderServicesMap.values())
            .flat()
            .map((os: SafeAny) => Number(os.promotion_id))
            .filter((id) => id > 0),
        ])
      );

      if (promoIds.length > 0) {
        const promotionRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT p.id, p.promotion_key as promotionKey, p.discount_percentage as discountPercentage, p.discount_amount as discountAmount, pl.promotion_name as name
          FROM promotion p
          LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
          WHERE p.id IN (${promoIds.join(',')})
        `);
        promotionRows.forEach((p) => {
          promoDetailsMap.set(Number(p.id), {
            name: p.name || p.promotionKey || `KM #${p.id}`,
            discountPercentage: Number(p.discountPercentage || 0),
            discountAmount: Number(p.discountAmount || 0),
          });
        });
      }

      // Fetch config
      const conf = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_SALARY_CONFIG' },
      });
      let config: SafeAny = {
        baseSalary: 5500000,
        tipsPercent: 7,
        clientBonusFullSet: { discount0: 35000, discount30: 12000, discount50: 6000, discountMore: 1000 },
        clientBonusRefill: { discount30: 9000, discount50: 6000, discountMore: 1000 },
        doneBonusTiers: [],
        missedBonusTiers: [],
        revBonusTiers: [],
      };
      if (conf) {
        try {
          config = JSON.parse(conf.value);
        } catch {
          /* ignore */
        }
      }
      // 3.5. Query all orders in range to calculate summary KPIs (without pagination)
      let allOrdersSql = `
        SELECT 
          o.id,
          o.order_state as orderState,
          o.total_price as totalPrice,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDateStart,
          o.user_id as userId,
          o.date_created as dateCreated
        FROM \`order\` o
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;
      const allOrdersParams: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];

      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          allOrdersSql += ` AND o.assigned_staff_id = ?`;
        } else {
          allOrdersSql += ` AND o.created_staff_id = ?`;
        }
        allOrdersParams.push(staffLegacyId);
      }

      const allOrdersInRange = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(allOrdersSql, ...allOrdersParams);

      const now = new Date();
      let totalPending = 0;
      let totalMissed = 0;
      let totalCompleted = 0;
      let pendingValue = 0;
      let completedRevenue = 0;

      allOrdersInRange.forEach((o) => {
        const bDate = o.bookingDateStart ? new Date(o.bookingDateStart) : null;
        const isCompleted = o.orderState === 'Completed';
        const isCancelled = o.orderState === 'Cancelled';
        const isPast = bDate ? bDate < now : false;

        if (isCompleted) {
          totalCompleted++;
          completedRevenue += Number(o.totalPrice || 0);
        } else if (isCancelled || isPast) {
          totalMissed++;
        } else {
          totalPending++;
          pendingValue += Number(o.totalPrice || 0);
        }
      });

      // Collect all customer IDs from both allOrdersInRange and the paginated result
      const allRangeUserIds = allOrdersInRange.map((o) => Number(o.userId)).filter((id) => !isNaN(id));
      const paginatedUserIds = result.map((o) => Number(o.userId)).filter((id) => !isNaN(id));
      const customerIds = Array.from(new Set([...allRangeUserIds, ...paginatedUserIds]));

      const userBalances =
        customerIds.length > 0
          ? await fastify.prisma.legacy.user_service_balance.findMany({
              where: { user_id: { in: customerIds } },
            })
          : [];

      const balanceIds = userBalances.map((b) => b.id);
      const userBalanceTransactions =
        balanceIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
               usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
               usbt.retain_count, usbt.used_staff_id, usbt.order_id,
               COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `)
          : [];

      const txnsByBalanceId = new Map<number, SafeAny[]>();
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
        const userBals = userBalances.filter((b) => b.user_id === userId);

        for (const usb of userBals) {
          if (new Date(usb.date_created) >= new Date(bTime)) {
            continue;
          }

          const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(
            (t) => new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
          );

          txnsBefore.sort((a, b) => {
            const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
            const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.id - a.id;
          });

          const lastTxnBefore = txnsBefore[0];

          const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
          const isNotExpired =
            !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toLocaleDateString('en-CA'));

          let countLeft: number;
          if (
            lastTxnBefore &&
            lastTxnBefore.total_normal_count_left !== null &&
            lastTxnBefore.total_retain_count_left !== null
          ) {
            countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
          } else {
            const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(
              (t) => new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
            );

            let usedAfter = 0;
            txnsAfterOrAt.forEach((t) => {
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

      const summaryCompletedOrders = allOrdersInRange.filter((o) => o.orderState === 'Completed');
      const summaryCompletedOrderIds = summaryCompletedOrders.map((o) => Number(o.id));

      let summaryTotalTips = 0;
      let summaryClientBonus = 0;
      let summaryTotalNetRev = 0;

      if (summaryCompletedOrderIds.length > 0) {
        const summaryPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id as orderId, tip_amount as tipAmount
          FROM \`order_payment\`
          WHERE order_id IN (${summaryCompletedOrderIds.join(',')})
        `);
        summaryPayments.forEach((p) => {
          summaryTotalTips += Number(p.tipAmount || 0);
        });

        const summaryServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: summaryCompletedOrderIds } },
        });

        const summaryServiceIds = Array.from(new Set(summaryServices.map((os) => os.service_id)));
        const summaryServiceNameMap = new Map<number, string>();
        if (summaryServiceIds.length > 0) {
          const summaryServiceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: summaryServiceIds } },
          });
          summaryServiceLanguages.forEach((sl) => {
            summaryServiceNameMap.set(sl.service_id, sl.service_name);
          });
        }

        const summaryServicesMap = new Map<number, SafeAny[]>();
        summaryServices.forEach((os) => {
          const list = summaryServicesMap.get(os.order_id) || [];
          list.push(os);
          summaryServicesMap.set(os.order_id, list);
        });

        summaryCompletedOrders.forEach((o) => {
          summaryTotalNetRev += Number(o.totalPrice || 0);
          const list = summaryServicesMap.get(Number(o.id)) || [];
          if (list.length > 0) {
            let primaryService = list[0];
            for (const os of list) {
              if (os.service_price > (primaryService?.service_price || 0)) {
                primaryService = os;
              }
            }
            const serviceName = summaryServiceNameMap.get(primaryService.service_id) || 'Unknown';
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

            let bonus: number;
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

      const totalPlanned = totalCompleted + totalMissed;
      const totalCheckin = totalCompleted;
      const checkInRate = totalPlanned > 0 ? (totalCheckin / totalPlanned) * 100 : 0;
      const missedRatePct = totalPlanned > 0 ? (totalMissed / totalPlanned) * 100 : 0;
      const baseSalary = config.baseSalary || 0;

      let doneBonus = 0;
      let doneLevelCount = 0;
      const sortedDoneTiers = [...(config.doneBonusTiers || [])].sort((a, b) => b.minCount - a.minCount);
      const overallCompletedCount = summaryCompletedOrders.length;
      const matchedDone = sortedDoneTiers.find((t) => overallCompletedCount >= t.minCount);
      if (matchedDone) {
        doneBonus = matchedDone.bonus;
        doneLevelCount = matchedDone.minCount;
      }

      let missedBonus = 0;
      let missedLevelRate = 0;
      const sortedMissedTiers = [...(config.missedBonusTiers || [])].sort((a, b) => a.maxRate - b.maxRate);
      if (totalPlanned > 0) {
        const matchedMissed = sortedMissedTiers.find((t) => missedRatePct <= t.maxRate);
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
      const matchedRev = sortedRevTiers.find((t) => summaryTotalNetRev >= t.minRev);
      if (matchedRev) {
        revBonus = Math.round(summaryTotalNetRev * matchedRev.rate);
        revLevelRate = matchedRev.rate;
        revLevelMin = matchedRev.minRev;
      }

      const totalSalary = baseSalary + summaryClientBonus + doneBonus + missedBonus + tipBonus + revBonus;

      const appointments = result.map((row: SafeAny) => {
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

        const firstPromoSv = orderServicesList.find((os) => os.promotion_id !== null && os.promotion_id !== undefined);
        const pId = Number(firstPromoSv?.promotion_id || row.promotionId || row.selectedPromotionId || 0);
        const promoInfo = pId > 0 ? promoDetailsMap.get(pId) : null;
        const promotionName = promoInfo ? promoInfo.name : null;
        const promotionDiscountPercent = promoInfo ? promoInfo.discountPercentage : null;
        const promotionDiscountAmount = promoInfo ? promoInfo.discountAmount : null;

        return {
          id: Number(row.id),
          orderKey: row.orderKey,
          bookingDateStart: row.bookingDateStart
            ? new Date(row.bookingDateStart).toISOString().replace('Z', '+07:00')
            : null,
          bookingDateEnd: row.bookingDateEnd ? new Date(row.bookingDateEnd).toISOString().replace('Z', '+07:00') : null,
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
          promotionName,
          promotionDiscountPercent,
          promotionDiscountAmount,
          netRevenue: Number(netRevenue || 0),
          tipAmount: Number(tipAmount || 0),
          bookingBonus: Number(bookingBonus || 0),
          technicianId: row.technicianId ? Number(row.technicianId) : null,
          storeId: row.storeId ? Number(row.storeId) : null,
        };
      });

      return {
        data: appointments,
        total,
        summary: {
          totalPending,
          totalMissed,
          totalCompleted,
          pendingValue,
          completedRevenue: summaryTotalNetRev || completedRevenue,
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
          totalSalary,
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to retrieve appointments',
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
        PXL: 2,
      };
      const storeId = storeNameToIdMap[storeName] || 6;

      // 1. Fetch Roster from core shift tables
      let roster: SafeAny[] = [];
      const dayOfWeek = new Date(date).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      // Check if actual instantiated shifts exist for this date and store
      const instantiatedShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT sws.user_id, CAST(sws.start_time AS CHAR) as start_time_str, CAST(sws.end_time AS CHAR) as end_time_str, up.full_name
         FROM staff_working_shift sws
         JOIN user_profile up ON sws.user_id = up.user_id
         WHERE sws.date = ? AND sws.client_store_id = ? AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
        date,
        storeId
      );

      if (instantiatedShifts.length > 0) {
        roster = instantiatedShifts.map((s) => ({
          staff_name: s.full_name,
          shift_start: s.start_time_str,
          shift_end: s.end_time_str,
        }));
      } else {
        // Fall back to schedule templates
        const schedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT s.user_id, s.type, s.type_value, CAST(s.start_time AS CHAR) as start_time_str, CAST(s.end_time AS CHAR) as end_time_str, up.full_name
           FROM staff_working_shift_schedule s
           JOIN user_profile up ON s.user_id = up.user_id
           WHERE s.is_disabled = 0 
             AND (s.client_store_id = ? OR ((s.client_store_id = 4 OR s.client_store_id IS NULL) AND up.client_store_id = ?))
             AND up.provider = 'Staff' AND up.user_group_id = 4 AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
          storeId,
          storeId
        );

        // Filter schedules matching today's weekday / all days
        const matchedSchedules = schedules.filter((s) => {
          if (s.type === 'Day' && s.type_value === 'All') return true;
          if (s.type === 'Weekday' && s.type_value === weekdayStr) return true;
          return false;
        });

        // Filter out KTVs who requested day-off
        const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved'`,
          date
        );
        const offUserIds = dayOffs.map((d) => Number(d.from_user_id));

        roster = matchedSchedules
          .filter((s) => !offUserIds.includes(Number(s.user_id)))
          .map((s) => ({
            staff_name: s.full_name,
            shift_start: s.start_time_str,
            shift_end: s.end_time_str,
          }));
      }

      // If technicianId is provided, filter the roster to only contain that KTV
      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          roster = roster.filter((r) => r.staff_name === ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) },
          });
          if (staff) {
            roster = roster.filter((r) => r.staff_name === staff.displayName);
          }
        }
      }

      // 2. Fetch Appointments
      let apptsQuery = `SELECT time_start, duration 
                        FROM wingsctrl_appointments 
                        WHERE store = ? AND DATE(time_start) = ? AND status != 'cancelled'`;
      const apptsParams: SafeAny[] = [storeName, date];

      if (technicianId) {
        const ktvProfile = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT full_name FROM user_profile WHERE user_id = ? LIMIT 1`,
          parseInt(technicianId, 10)
        );
        if (ktvProfile.length > 0) {
          const ktvFullName = ktvProfile[0].full_name;
          apptsQuery += ` AND specialist_name = ?`;
          apptsParams.push(ktvFullName);
        } else {
          const staff = await fastify.prisma.crm.crmStaff.findUnique({
            where: { id: parseInt(technicianId, 10) },
          });
          if (staff) {
            apptsQuery += ` AND specialist_name = ?`;
            apptsParams.push(staff.displayName);
          }
        }
      }

      const appointments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(apptsQuery, ...apptsParams);

      // 3. Generate slots (09:00 to 20:00, every 15m)
      const matrix: { [time: string]: { available: number; roster: number } } = {};
      let current = new Date(`${date}T09:00:00Z`);
      const end = new Date(`${date}T20:15:00Z`);

      while (current < end) {
        const timeStr = current.toISOString().split('T')[1].slice(0, 5);

        // Calculate active roster count at this slot time
        const activeRoster = roster.filter((r) => {
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
        const activeAppointments = appointments.filter((a) => {
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
          roster: rosterCount,
        };

        // Advance by 15 mins
        current = new Date(current.getTime() + 15 * 60000);
      }

      return matrix;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Calculate booking slots error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to calculate booking slots' });
    }
  });

  // GET /nyc/config
  // Get touchpoint config for NYC campaign
  fastify.get('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
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
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' },
        ],
        NYC_60: [
          { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
          { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
          { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' },
        ],
        NYC_90: [
          { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
          { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' },
        ],
        NYC_180: [
          { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
          { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' },
        ],
        NYC_365: [
          { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
          { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' },
        ],
        NYC_365plus: [
          { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
          { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' },
        ],
      };
      return defaultConfigs;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
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
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    // Validate structure
    for (const [tabKey, touchpoints] of Object.entries(configs)) {
      if (!Array.isArray(touchpoints)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Touchpoints for tab ${tabKey} must be an array`,
        });
      }
      for (const tp of touchpoints) {
        if (!tp.key || !tp.label || typeof tp.daysMin !== 'number' || typeof tp.daysMax !== 'number') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Mỗi touchpoint trong tab ${tabKey} phải có key, label, daysMin, và daysMax hợp lệ.`,
          });
        }
      }
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'NYC_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Save NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /loca/config
  // Get touchpoint config for LoCa campaign
  fastify.get('/loca/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
      });
      if (config) {
        return JSON.parse(config.value);
      }
      const defaultConfigs = {
        LOCA_ALL: [
          { key: 'now', label: 'Chạm 24h', daysMin: 0, daysMax: 1, color: 'blue' },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'cyan' },
          { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'cyan' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'green' },
          { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23, color: 'green' },
          { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25, color: 'green' },
          { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30, color: 'orange' },
          { key: '35', label: 'Chạm 35', daysMin: 35, daysMax: 35, color: 'orange' },
          { key: '40', label: 'Chạm 40', daysMin: 40, daysMax: 40, color: 'orange' },
          { key: '45', label: 'Chạm 45', daysMin: 45, daysMax: 45, color: 'red' },
          { key: '50', label: 'Chạm 50', daysMin: 50, daysMax: 50, color: 'red' },
          { key: '55', label: 'Chạm 55', daysMin: 55, daysMax: 55, color: 'red' },
          { key: '60', label: 'Chạm 60', daysMin: 60, daysMax: 60, color: 'red' },
        ],
      };
      return defaultConfigs;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
      });
    }
  });

  // PUT /loca/config
  // Save touchpoint config for LoCa campaign (Admins only)
  fastify.put('/loca/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'LOCA_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Save LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /api/dashboard/today - Real operational data for the "today" dashboard
  fastify.get('/dashboard/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    const getVnDateStr = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
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
      return new Date(
        Date.UTC(
          dbDate.getUTCFullYear(),
          dbDate.getUTCMonth(),
          dbDate.getUTCDate(),
          dbDate.getUTCHours(),
          dbDate.getUTCMinutes(),
          dbDate.getUTCSeconds()
        ) -
          7 * 3600 * 1000
      );
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
          OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
          isActive: true,
        },
        select: { displayName: true },
      });
      const telesalesNames = new Set(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));
      // 1. Query bookings created today
      const bookingsOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          date_created: {
            gte: startOfDay,
            lte: endOfDay,
          },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { date_created: 'desc' },
      });

      // 2. Query coming today
      const comingOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          OR: [{ booking_date_only: bookingDateOnlyDate }, { booking_date_start: { gte: startOfDay, lte: endOfDay } }],
          order_state: { not: 'Cancelled' },
        },
        orderBy: { booking_date_start: 'asc' },
      });

      const userIds = Array.from(
        new Set([...bookingsOrders.map((o) => o.user_id), ...comingOrders.map((o) => o.user_id)])
      ).filter((id): id is number => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0);

      const userProfiles =
        userIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, up.full_name as fullName, up.avatar, u.email, u.gender, u.date_of_birth as dob
        FROM \`user_profile\` up
        LEFT JOIN \`user\` u ON up.user_id = u.id
        WHERE up.user_id IN (${userIds.join(',')})
      `)
          : [];

      const userContacts =
        userIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, phone_number as phoneNumber
        FROM \`user_contact\`
        WHERE user_id IN (${userIds.join(',')}) AND is_disabled = 0
      `)
          : [];

      const userBalances =
        userIds.length > 0
          ? await fastify.prisma.legacy.user_service_balance.findMany({
              where: { user_id: { in: userIds } },
            })
          : [];

      const balanceIds = userBalances.map((b) => b.id);
      const userBalanceTransactions =
        balanceIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
               usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
               usbt.retain_count, usbt.used_staff_id, usbt.order_id,
               COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `)
          : [];

      // Index transactions by balance ID for O(1) lookups
      const txnsByBalanceId = new Map<number, SafeAny[]>();
      for (const t of userBalanceTransactions) {
        const bid = Number(t.user_service_balance_id);
        let list = txnsByBalanceId.get(bid);
        if (!list) {
          list = [];
          txnsByBalanceId.set(bid, list);
        }
        list.push(t);
      }

      const allOrderIds = Array.from(new Set([...bookingsOrders.map((o) => o.id), ...comingOrders.map((o) => o.id)]));

      const allOrderServices =
        allOrderIds.length > 0
          ? await fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: allOrderIds } },
            })
          : [];

      const profileMap = new Map(userProfiles.map((p) => [Number(p.userId), p]));
      const contactMap = new Map(userContacts.map((c) => [Number(c.userId), c.phoneNumber]));

      // Query promotions used by orders
      const promoIds = Array.from(
        new Set(
          [
            ...bookingsOrders.map((o) => o.promotion_id).filter((id) => id !== null && id !== undefined),
            ...bookingsOrders.map((o) => o.selected_promotion_id).filter((id) => id !== null && id !== undefined),
            ...comingOrders.map((o) => o.promotion_id).filter((id) => id !== null && id !== undefined),
            ...comingOrders.map((o) => o.selected_promotion_id).filter((id) => id !== null && id !== undefined),
            ...allOrderServices.map((os) => os.promotion_id).filter((id) => id !== null && id !== undefined),
          ].map((id) => Number(id))
        )
      ).filter((id) => !isNaN(id) && id > 0);

      const promotions =
        promoIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT p.id, p.promotion_key as promotionKey, pl.promotion_name as name
        FROM promotion p
        LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
        WHERE p.id IN (${promoIds.join(',')})
      `)
          : [];

      const promoMap = new Map(promotions.map((p) => [Number(p.id), p.name || p.promotionKey || `PROMO-${p.id}`]));

      const referencedStaffIds = Array.from(
        new Set([
          ...bookingsOrders
            .map((o) => o.created_staff_id)
            .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0),
          ...comingOrders
            .map((o) => o.created_staff_id)
            .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0),
          ...allOrderServices
            .flatMap((os) => [os.assigned_staff_id, os.check_in_staff_id, os.check_out_staff_id])
            .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0),
          ...userBalanceTransactions
            .map((t) => t.used_staff_id)
            .filter((id): id is number => id !== null && id !== undefined && Number(id) > 0),
        ])
      );

      const staffProfiles =
        referencedStaffIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, 
               TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
        FROM \`user_profile\` up
        WHERE up.user_id IN (${referencedStaffIds.join(',')})
      `)
          : [];
      const staffMap = new Map(staffProfiles.map((s) => [Number(s.userId), s.fullName || `Staff #${s.userId}`]));

      // Exact legacy PHP combo active helper function
      const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
        const bTime = bookingDateStart || orderCreatedDate;
        const userBals = userBalances.filter((b) => b.user_id === userId);

        for (const usb of userBals) {
          // Condition 1: usb.date_created < booking_date_start
          if (new Date(usb.date_created) >= new Date(bTime)) {
            continue;
          }

          // Get all transactions for this balance before this booking
          const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(
            (t) => new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
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
          const isNotExpired =
            !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toLocaleDateString('en-CA'));

          // Condition 3: count left at that time > 0
          let countLeft: number;
          if (
            lastTxnBefore &&
            lastTxnBefore.total_normal_count_left !== null &&
            lastTxnBefore.total_retain_count_left !== null
          ) {
            countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
          } else {
            // If no transaction before or counts are null, calculate based on current count + all transactions that used sessions after or at the booking
            const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(
              (t) => new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
            );

            let usedAfter = 0;
            txnsAfterOrAt.forEach((t) => {
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

      const bookingsCombo: SafeAny[] = [];
      const bookingsOc: SafeAny[] = [];
      const bookingsOther: SafeAny[] = [];

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
        const userBal = userBalances.filter((b) => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

        const booker = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : `Khách tự đặt (${o.booking_channels || 'GB'})`;

        const orderSvs = allOrderServices.filter((cs) => cs.order_id === o.id);
        const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

        const firstCvStaffId =
          o.assigned_staff_id ||
          (orderSvs.length > 0 ? orderSvs.find((cs) => cs.assigned_staff_id !== null)?.assigned_staff_id : null);
        const cvRequested = firstCvStaffId ? staffMap.get(Number(firstCvStaffId)) || 'Kỹ thuật viên' : 'Chưa phân công';

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          [
            'CheckIn',
            'Consultation',
            'Preparation',
            'ServiceStart',
            'ServiceCleaned',
            'ServiceEnd',
            'ServiceCompleted',
            'CheckOut',
            'Parking',
          ].includes(o.order_state)
        ) {
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
          branchName: o.client_store_id === 2 ? 'PXL' : o.client_store_id === 16 ? 'Estella' : 'Đề Thám',
          bookingDateTime: formatBookingDateTime(o.booking_date_start),
          requestedCv: cvRequested,
          status,
          bookingNote: o.booking_note || '',
          createdTime: new Date(o.date_created).toLocaleTimeString('vi-VN', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
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
          historyBranch: o.client_store_id === 1 ? 'Đề Thám' : o.client_store_id === 2 ? 'PXL' : 'Estella Place',
          historyCv: 'N/A',
          historyCcIn: booker,
          historyCcOut: booker,
          historyBooker: booker,
          historyDate: new Date(o.date_created).toLocaleString('vi-VN', { timeZone: 'UTC' }),
          historyStatus: o.order_state === 'Completed' ? 'Hoàn thành' : 'Đã xác nhận',
          historyNote: o.booking_note || '',
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

      const comingOrderIds = comingOrders.map((o) => o.id);

      const comingServices =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: comingOrderIds } },
            })
          : [];

      const comingServiceIds = Array.from(new Set(comingServices.map((cs) => cs.service_id)));
      const serviceLangs =
        comingServiceIds.length > 0
          ? await fastify.prisma.legacy.service_language.findMany({
              where: { service_id: { in: comingServiceIds } },
            })
          : [];
      const serviceLangMap = new Map(serviceLangs.map((sl) => [sl.service_id, sl.service_name]));

      const comingProducts =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT * FROM \`order_product\` WHERE order_id IN (${comingOrderIds.join(',')})
      `)
          : [];

      const comingCombos =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT * FROM \`order_service_combo\` WHERE order_id IN (${comingOrderIds.join(',')})
      `)
          : [];

      // Get active CCs (check-in/out in the last 30 days and user_profile.is_disabled = 0)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeCcRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT DISTINCT s.staffId
        FROM (
          SELECT DISTINCT check_in_staff_id as staffId FROM \`order_service\` WHERE check_in_staff_id IS NOT NULL AND check_in_staff_id > 0 AND date_created >= ?
          UNION
          SELECT DISTINCT check_out_staff_id as staffId FROM \`order_service\` WHERE check_out_staff_id IS NOT NULL AND check_out_staff_id > 0 AND date_created >= ?
        ) s
      `,
        thirtyDaysAgo,
        thirtyDaysAgo
      );

      const activeCcIds = activeCcRows.map((r) => Number(r.staffId)).filter((id) => !isNaN(id) && id > 0);
      const activeCcs: { id: number; name: string; branch: 'detham' | 'pxl' | 'estella' }[] = [];

      if (activeCcIds.length > 0) {
        const ccProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, full_name as fullName
          FROM \`user_profile\`
          WHERE user_id IN (${activeCcIds.join(',')}) AND provider = 'Staff' AND is_disabled = 0
        `);

        // Map each CC to their preferred store in a single grouped query (Batch CC preference fetch)
        const prefStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
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
              branch,
            });
          }
        }
      }

      // 1. Query schedules for weekly off calculations
      const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, type, type_value, start_time, end_time 
         FROM staff_working_shift_schedule 
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );

      const schedulesByUserId: { [uid: number]: SafeAny[] } = {};
      for (const s of allSchedules) {
        const uid = Number(s.user_id);
        if (!schedulesByUserId[uid]) schedulesByUserId[uid] = [];
        schedulesByUserId[uid].push(s);
      }

      // 2. Query approved week-off requests
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

      // 3. Query specific day-offs for target date
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id FROM staff_day_off 
         WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved' AND from_user_id IS NOT NULL`,
        targetDateStr
      );
      const offUserIds = new Set(dayOffs.map((d) => Number(d.from_user_id)));

      // 4. Query active CVs (technicians)
      const activeCvs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, client_store_id as storeId
        FROM \`user_profile\`
        WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0
      `);

      const dayOfWeek = new Date(targetDateStr).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      const branchDetailMap: Record<string, SafeAny> = {
        detham: {
          revLe: 0,
          revCombo: 0,
          revProduct: 0,
          netLe: 0,
          netCombo: 0,
          netProduct: 0,
          cc: [],
          cv: [],
          coming: [],
        },
        pxl: { revLe: 0, revCombo: 0, revProduct: 0, netLe: 0, netCombo: 0, netProduct: 0, cc: [], cv: [], coming: [] },
        estella: {
          revLe: 0,
          revCombo: 0,
          revProduct: 0,
          netLe: 0,
          netCombo: 0,
          netProduct: 0,
          cc: [],
          cv: [],
          coming: [],
        },
      };

      // Pre-populate active CCs for each branch
      activeCcs.forEach((cc) => {
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
          attendance: 'none',
        });
      });

      comingOrders.forEach((o, index) => {
        let branchKey = 'detham';
        if (o.client_store_id === 2) branchKey = 'pxl';
        else if (o.client_store_id === 16) branchKey = 'estella';

        const uProfile = profileMap.get(o.user_id);
        const phone = contactMap.get(o.user_id) || '';
        const name = uProfile?.fullName || 'Khách hàng';

        const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
        const serviceName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';

        let cvName = 'Chưa phân công';
        if (o.assigned_staff_id) {
          cvName = staffMap.get(Number(o.assigned_staff_id)) || 'Kỹ thuật viên';
        } else if (orderSvs.length > 0 && orderSvs[0].assigned_staff_id) {
          cvName = staffMap.get(Number(orderSvs[0].assigned_staff_id)) || 'Kỹ thuật viên';
        }

        const booker = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : `Khách tự đặt (${o.booking_channels || 'GB'})`;

        let ccName = 'Chưa nhận';
        const checkInStaffId =
          orderSvs.find((cs) => cs.check_in_staff_id)?.check_in_staff_id ||
          orderSvs.find((cs) => cs.check_out_staff_id)?.check_out_staff_id;
        if (checkInStaffId) {
          ccName = staffMap.get(Number(checkInStaffId)) || 'Tư vấn viên';
        }

        const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
        const userBal = userBalances.filter((b) => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          [
            'CheckIn',
            'Consultation',
            'Preparation',
            'ServiceStart',
            'ServiceCleaned',
            'ServiceEnd',
            'ServiceCompleted',
            'CheckOut',
            'Parking',
          ].includes(o.order_state)
        ) {
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

        const orderServices = comingServices.filter((cs) => cs.order_id === o.id);
        const orderCombos = comingCombos.filter((c) => Number(c.order_id) === o.id);
        const orderProducts = comingProducts.filter((p) => Number(p.order_id) === o.id);

        const totalTax =
          orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
          orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
          orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

        const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

        const isOc = telesalesNames.has(booker.trim().toLowerCase());
        const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
        const category = group === 'combo_live' || comboRev > 0 ? 'combo' : isOc ? 'oc' : 'other';

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
          oc: booker,
        };

        branchDetailMap[branchKey].coming.push(comingItem);

        if (o.order_state === 'Completed') {
          const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
          const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
          const orderTotal = Number(o.total_price || 0);

          let finalRevCombo = comboRev;
          let finalRevProduct = productRev;
          let finalRevLe = 0;

          if (orderTotal < 0) {
            if (comboRev + productRev === 0) {
              finalRevLe = orderTotal;
            } else {
              const scale = orderTotal / (comboRev + productRev);
              finalRevCombo = comboRev * scale;
              finalRevProduct = productRev * scale;
            }
          } else {
            if (comboRev + productRev > orderTotal) {
              const scale = orderTotal / (comboRev + productRev);
              finalRevCombo = comboRev * scale;
              finalRevProduct = productRev * scale;
            } else {
              finalRevLe = orderTotal - comboRev - productRev;
            }
          }

          const comboNet = orderCombos.reduce(
            (sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0),
            0
          );
          const productNet = orderProducts.reduce(
            (sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0),
            0
          );
          const orderNet = orderTotal - totalTax;

          let finalNetCombo = comboNet;
          let finalNetProduct = productNet;
          let finalNetLe = 0;

          if (orderNet < 0) {
            if (comboNet + productNet === 0) {
              finalNetLe = orderNet;
            } else {
              const scaleNet = orderNet / (comboNet + productNet);
              finalNetCombo = comboNet * scaleNet;
              finalNetProduct = productNet * scaleNet;
            }
          } else {
            if (comboNet + productNet > orderNet) {
              const scaleNet = orderNet / (comboNet + productNet);
              finalNetCombo = comboNet * scaleNet;
              finalNetProduct = productNet * scaleNet;
            } else {
              finalNetLe = orderNet - comboNet - productNet;
            }
          }

          branchDetailMap[branchKey].revCombo += finalRevCombo;
          branchDetailMap[branchKey].revProduct += finalRevProduct;
          branchDetailMap[branchKey].revLe += finalRevLe;

          branchDetailMap[branchKey].netCombo += finalNetCombo;
          branchDetailMap[branchKey].netProduct += finalNetProduct;
          branchDetailMap[branchKey].netLe += finalNetLe;
        }
      });

      const refTime = new Date();
      const normalizeName = (name: string) => (name || '').trim().toLowerCase();

      // Fetch working shifts for today
      const workingShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT * FROM \`staff_working_shift\` WHERE \`date\` = ?
      `,
        targetDateStr
      );

      const shiftMap = new Map<number, SafeAny>();
      workingShifts.forEach((ws) => {
        shiftMap.set(Number(ws.user_id), ws);
      });

      const getShiftType = (startTime: SafeAny, endTime: SafeAny): 'sáng' | 'chiều' | 'full' => {
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
      Object.keys(branchDetailMap).forEach((bKey) => {
        branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
          const wsRecord = shiftMap.get(cc.id);

          let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
          const list = schedulesByUserId[cc.id] || [];
          const todaySchedule =
            list.find((s) => s.type === 'Weekday' && s.type_value === weekdayStr) ||
            list.find((s) => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }

          const weekOffs = weekOffsByUserId[cc.id] || [];
          let isWeekOff = false;
          if (weekOffs.length > 0) {
            const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
            isWeekOff = String(sorted[0].weekday) === weekdayStr;
          } else if (list.length > 0) {
            const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
            if (!worksAll) {
              const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => s.type_value);
              if (workingWeekdays.length > 0 && !workingWeekdays.includes(weekdayStr)) {
                isWeekOff = true;
              }
            }
          }

          const hasSpecificDayOff = offUserIds.has(cc.id);
          const isOffCC = isWeekOff || hasSpecificDayOff;

          if (isOffCC) {
            shift = 'off';
          }

          let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
          let doing = isOffCC ? 'Nghỉ phép tuần' : 'Chưa check-in';

          if (wsRecord) {
            if (!isOffCC || wsRecord.check_in_staff_task_id !== null) {
              shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
            }
            if (wsRecord.check_out_staff_task_id !== null) {
              attendance = 'checked_out';
              doing = 'Đã về';
            } else if (wsRecord.check_in_staff_task_id !== null) {
              attendance = 'checked_in';
              doing = 'Trống (Sẵn sàng đón khách)';
            }
          }

          cc.shift = shift;
          cc.attendance = attendance;
          cc.doing = doing;
        });
      });

      // Calculate and populate Chuyên viên (CV) list for each branch
      activeCvs.forEach((cv) => {
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
          const todaySchedule =
            list.find((s) => s.type === 'Weekday' && s.type_value === weekdayStr) ||
            list.find((s) => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }
        }

        let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
        let doing = isOff ? 'Nghỉ phép' : 'Chưa check-in';

        if (wsRecord) {
          if (!isOff || wsRecord.check_in_staff_task_id !== null) {
            shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
          }
          if (wsRecord.check_out_staff_task_id !== null) {
            attendance = 'checked_out';
            doing = 'Đã về';
          } else if (wsRecord.check_in_staff_task_id !== null) {
            attendance = 'checked_in';
            doing = 'Đang trống';
          }
        }

        // Get orders assigned to this CV
        const staffOrders = comingOrders.filter((o) => {
          if (o.assigned_staff_id === cvId) return true;
          const assignedName = staffMap.get(Number(o.assigned_staff_id));
          if (assignedName && normalizeName(assignedName) === normName) return true;
          const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
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
          const activeOrder = staffOrders.find((o) => {
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

            const orderSvs = comingServices.filter((cs) => cs.order_id === activeOrder.id);
            const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';

            const start = toActualDate(activeOrder.booking_date_start);
            const end = toActualDate(activeOrder.booking_date_end);
            const totalMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
            const elapsedMin = Math.max(
              0,
              Math.min(totalMin, Math.round((refTime.getTime() - start.getTime()) / 60000))
            );

            doing = `[${elapsedMin}/${totalMin}] ${shortCustName}: ${svName}`;
            status = 'busy';
          } else {
            // Find next upcoming order
            const upcoming = staffOrders
              .filter((o) => {
                if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
                if (!o.booking_date_start) return false;
                return toActualDate(o.booking_date_start) > refTime;
              })
              .sort(
                (a, b) => toActualDate(a.booking_date_start).getTime() - toActualDate(b.booking_date_start).getTime()
              );

            if (upcoming.length > 0) {
              const nextOrder = upcoming[0];
              const timeStr = formatDbTime(nextOrder.booking_date_start);
              const orderSvs = comingServices.filter((cs) => cs.order_id === nextOrder.id);
              const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';
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
          status,
        });
      });

      // Helper function to find and move CC to their active branch today
      const getOrMoveCC = (ccId: number, targetBranchKey: string) => {
        let ccObj: SafeAny = null;
        Object.keys(branchDetailMap).forEach((k) => {
          const foundIdx = branchDetailMap[k].cc.findIndex((c: SafeAny) => c.id === ccId);
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
            attendance: 'checked_in',
          };
        }

        // Ensure CC is in target branch
        const exists = branchDetailMap[targetBranchKey].cc.some((c: SafeAny) => c.id === ccId);
        if (!exists) {
          branchDetailMap[targetBranchKey].cc.push(ccObj);
        }

        return ccObj;
      };

      // Calculate today's CC statistics from today's orders
      comingOrders.forEach((o) => {
        let bKey = 'detham';
        if (o.client_store_id === 2) bKey = 'pxl';
        else if (o.client_store_id === 16) bKey = 'estella';

        const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
        if (orderSvs.length === 0) return;

        // Check-in CC
        const checkInStaffId = orderSvs.find((cs) => cs.check_in_staff_id)?.check_in_staff_id;
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
        const checkOutStaffId = orderSvs.find((cs) => cs.check_out_staff_id)?.check_out_staff_id;
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
            const orderServices = comingServices.filter((cs) => cs.order_id === o.id);
            const orderCombos = comingCombos.filter((c) => Number(c.order_id) === o.id);
            const orderProducts = comingProducts.filter((p) => Number(p.order_id) === o.id);

            const totalTax =
              orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
              orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
              orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

            const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
            const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
            const orderTotal = Number(o.total_price || 0);

            let finalRevCombo = comboRev;
            let finalRevProduct = productRev;
            let finalRevLe = 0;

            if (orderTotal < 0) {
              if (comboRev + productRev === 0) {
                finalRevLe = orderTotal;
              } else {
                const scale = orderTotal / (comboRev + productRev);
                finalRevCombo = comboRev * scale;
                finalRevProduct = productRev * scale;
              }
            } else {
              if (comboRev + productRev > orderTotal) {
                const scale = orderTotal / (comboRev + productRev);
                finalRevCombo = comboRev * scale;
                finalRevProduct = productRev * scale;
              } else {
                finalRevLe = orderTotal - comboRev - productRev;
              }
            }

            const comboNet = orderCombos.reduce(
              (sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0),
              0
            );
            const productNet = orderProducts.reduce(
              (sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0),
              0
            );
            const orderNet = orderTotal - totalTax;

            let finalNetCombo = comboNet;
            let finalNetProduct = productNet;
            let finalNetLe = 0;

            if (orderNet < 0) {
              if (comboNet + productNet === 0) {
                finalNetLe = orderNet;
              } else {
                const scaleNet = orderNet / (comboNet + productNet);
                finalNetCombo = comboNet * scaleNet;
                finalNetProduct = productNet * scaleNet;
              }
            } else {
              if (comboNet + productNet > orderNet) {
                const scaleNet = orderNet / (comboNet + productNet);
                finalNetCombo = comboNet * scaleNet;
                finalNetProduct = productNet * scaleNet;
              } else {
                finalNetLe = orderNet - comboNet - productNet;
              }
            }

            cc.revCombo += finalRevCombo;
            cc.revProduct += finalRevProduct;
            cc.revLe += finalRevLe;
            cc.revenue += orderTotal;

            cc.netCombo += finalNetCombo;
            cc.netProduct += finalNetProduct;
            cc.netLe += finalNetLe;
            cc.netRevenue += orderNet;

            cc.combos += orderCombos.length;
          }
        }
      });

      // Compute unique clients count for each CC today, and set default idle states
      Object.keys(branchDetailMap).forEach((bKey) => {
        branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
          const ccId = cc.id;
          const ccServices = comingServices.filter(
            (s) => s.check_in_staff_id === ccId || s.check_out_staff_id === ccId
          );
          const uniqueOrders = new Set(ccServices.map((s) => s.order_id));
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
        bookingsOther,
      });
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Fetch dashboard today error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu vận hành hôm nay.',
      });
    }
  });
}
