import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { registerAllocationCron } from './services/allocation-cron.service.js';
import { ComboRecognitionService, parseComboDateBounds } from './services/combo-recognition.service.js';
import { UserServiceTypeService } from './services/user-service-type.service.js';
import { getBkPaystubData } from '../kpi/services/bk-salary.service.js';
import { registerDashboardRoutes } from './routes/dashboard.routes.js';
import { bookingAuditRoutes } from './routes/booking-audit.routes.js';
import { BookingAuditService } from './services/booking-audit.service.js';
import { registerLocaTouchpointRoutes } from './routes/loca-touchpoint.routes.js';
import { AllocationService } from '../allocation/allocation.service.js';
import { TeamService } from '../teams/team.service.js';
import { CampaignPromotionSyncService } from '../campaigns/campaign-promotion-sync.service.js';

export async function customerRoutes(fastify: FastifyInstance) {
  // Start automated allocation expiration cronjob
  registerAllocationCron(fastify);

  // Register dashboard sub-routes (revenue-hourly, revenue-detail)
  await registerDashboardRoutes(fastify);
  await bookingAuditRoutes(fastify);
  await registerLocaTouchpointRoutes(fastify);

  const getNewLocaUserIds = async (dFrom?: string, dTo?: string): Promise<number[]> => {
    return ComboRecognitionService.getNewLoCaCustomerIds(fastify, dFrom, dTo);
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
      assignedDaysMin,
      assignedDaysMax,
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
      allocationBatchId,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
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
      assignedDaysMin?: string;
      assignedDaysMax?: string;
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
      allocationBatchId?: string;
      dobMonth?: string;
      birthdayPreset?: 'today' | 'this_month' | 'next_month';
      ageMin?: string;
      ageMax?: string;
      callStatuses?: string;
      lastCallDaysMin?: string;
      lastCallDaysMax?: string;
    };

    let limitNum = parseInt(limit, 10) || 20;
    if (ids && ids.trim() !== '') {
      limitNum = ids.split(',').length;
    }
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    const adminUser = request.user as { id: number; role: string };

    // Force telesales to only query their own customers (except for LoCa campaign or when explicitly querying ALL)
    let effectiveAssignedStaffId = assignedStaffId;
    if (
      adminUser.role !== 'admin' &&
      bucket !== 'NEW_LOCA' &&
      bucket !== 'COMBO_LIVE' &&
      assignedStaffId !== 'ALL' &&
      assignedStaffId !== 'all' &&
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

      if (allocationBatchId && allocationBatchId.trim() !== '') {
        const bId = parseInt(allocationBatchId, 10);
        if (!isNaN(bId)) {
          const batchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
            where: {
              batchId: bId,
              status: { not: 'RECALLED' },
            },
            select: { customerId: true },
          });
          const batchUserIds = batchItems.map((i) => i.customerId);
          if (allowedUserIds !== null) {
            const bSet = new Set(batchUserIds);
            allowedUserIds = allowedUserIds.filter((id) => bSet.has(id));
          } else {
            allowedUserIds = batchUserIds;
          }
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
      } else if (hasFutureBooking === 'false') {
        const bookedUserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT DISTINCT user_id
             FROM \`order\`
             WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed')`
          )
        ).map((r) => Number(r.user_id));

        if (bookedUserIds.length > 0 && allowedUserIds !== null) {
          allowedUserIds = allowedUserIds.filter((id) => !bookedUserIds.includes(id));
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
        innerWhereClauses.push('u.date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) >= ?');
        innerParams.push(parseInt(String(ageMin), 10));
      }
      if (ageMax !== undefined && ageMax !== '') {
        innerWhereClauses.push('u.date_of_birth IS NOT NULL AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) <= ?');
        innerParams.push(parseInt(String(ageMax), 10));
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
        innerWhereClauses.push(`(
          EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_daily_plans cdp 
            WHERE cdp.legacy_user_id = u.id AND cdp.planned_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_loca_touchpoints clt 
            WHERE clt.legacy_user_id = u.id AND clt.status = 'CALLBACK'
          )
        )`);
      }
      if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      } else if (hasFutureBooking === 'false') {
        innerWhereClauses.push(`NOT EXISTS (
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

      // Call Status Multi-Select Filter & Last Call Days Filter
      if (callStatuses && callStatuses.trim() !== '') {
        const statusList = callStatuses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const hasNotCalled = statusList.includes('NOT_CALLED');
        const realStatuses = statusList.filter((s) => s !== 'NOT_CALLED');

        const callConds: string[] = [];
        if (realStatuses.length > 0) {
          const placeholders = realStatuses.map(() => '?').join(',');
          callConds.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
            WHERE ccl_latest.legacy_user_id = u.id 
              AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
              AND ccl_latest.call_result IN (${placeholders})
          )`);
          innerParams.push(...realStatuses);
        }
        if (hasNotCalled) {
          callConds.push(`NOT EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_all WHERE ccl_all.legacy_user_id = u.id
          )`);
        }

        if (callConds.length > 0) {
          innerWhereClauses.push(`(${callConds.join(' OR ')})`);
        }
      }

      if (lastCallDaysMin !== undefined && lastCallDaysMin !== '') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) >= ?
        )`);
        innerParams.push(parseInt(lastCallDaysMin, 10));
      }

      if (lastCallDaysMax !== undefined && lastCallDaysMax !== '') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) <= ?
        )`);
        innerParams.push(parseInt(lastCallDaysMax, 10));
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

      // ALSO query active allocation batch items (status IN ('PENDING_ACCEPT', 'ACCEPTED'))
      const activeBatchItems =
        customerIds.length > 0
          ? await fastify.prisma.crm.crmAllocationBatchItem.findMany({
              where: {
                customerId: { in: customerIds },
                status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
              },
              include: {
                batch: {
                  include: { booker: true },
                },
              },
              orderBy: { id: 'desc' },
            })
          : [];

      activeBatchItems.forEach((bi) => {
        if (bi.batch && bi.batch.booker) {
          const statusSuffix = bi.status === 'PENDING_ACCEPT' ? ' (Chờ xác nhận)' : '';
          assignmentMap.set(bi.customerId, {
            id: bi.batch.booker.id,
            displayName: `${bi.batch.booker.displayName}${statusSuffix}`,
            username: bi.batch.booker.username,
            assignedAt: bi.createdAt ? bi.createdAt.toISOString() : null,
            status: bi.status,
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

      const latestDailyPlans =
        customerIds.length > 0
          ? await fastify.prisma.crm.crmDailyPlan.findMany({
              where: {
                legacyUserId: { in: customerIds },
                plannedDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
              orderBy: { plannedDate: 'asc' },
            })
          : [];

      const callbackMap = new Map();
      latestCallbacks.forEach((c) => {
        if (!callbackMap.has(c.legacyUserId)) {
          callbackMap.set(c.legacyUserId, c.callbackDate);
        }
      });
      latestDailyPlans.forEach((p) => {
        if (!callbackMap.has(p.legacyUserId)) {
          callbackMap.set(p.legacyUserId, p.plannedDate);
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

      // Fetch latest touchpoints for the returned customers
      const touchpointsList =
        customerIds.length > 0
          ? await fastify.prisma.crm.crmLocaTouchpoint.findMany({
              where: { legacyUserId: { in: customerIds } },
              orderBy: { updatedAt: 'desc' },
            })
          : [];

      const touchpointsMap = new Map<number, Record<string, SafeAny>>();
      touchpointsList.forEach((tp) => {
        const uid = tp.legacyUserId;
        if (!touchpointsMap.has(uid)) {
          touchpointsMap.set(uid, {});
        }
        const userTps = touchpointsMap.get(uid)!;
        if (!userTps[tp.touchpointKey]) {
          userTps[tp.touchpointKey] = {
            isChecked: tp.isChecked,
            status: tp.status || (tp.isChecked ? 'SUCCESS' : null),
            checkedAt: tp.checkedAt ? tp.checkedAt.toISOString() : null,
            checkedByStaffId: tp.checkedByStaffId,
            checkedByStaffName: tp.checkedByStaffName,
            note: tp.note,
          };
        }
      });

      // Map raw SQL outputs to clean Customer interface types
      const customers = dataResult.map((row: SafeAny) => {
        const assigned = assignmentMap.get(Number(row.id)) || null;
        const booking = bookingMap.get(Number(row.id)) || null;
        const callbackDateVal = callbackMap.get(Number(row.id)) || null;
        const lastCallVal = latestCallMap.get(Number(row.id)) || null;
        const newComboDetails = newComboMap.get(Number(row.id)) || null;
        const userTouchpoints = touchpointsMap.get(Number(row.id)) || {};

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
          age: row.age !== null && row.age !== undefined ? Number(row.age) : null,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          totalSpent: Math.round(Number(row.totalSpent || 0)),
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
          lastBookingDate:
            booking && booking.bookingDate ? new Date(booking.bookingDate).toISOString().replace('Z', '+07:00') : null,
          callbackDate: callbackDateVal ? new Date(callbackDateVal).toISOString().split('T')[0] : null,
          lastCall: lastCallVal,
          touchpoints: userTouchpoints,
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
      assignedDaysMin,
      assignedDaysMax,
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
      allocationBatchId,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
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
      assignedDaysMin?: string;
      assignedDaysMax?: string;
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
      allocationBatchId?: string;
      dobMonth?: string;
      birthdayPreset?: 'today' | 'this_month' | 'next_month';
      ageMin?: string;
      ageMax?: string;
      callStatuses?: string;
      lastCallDaysMin?: string;
      lastCallDaysMax?: string;
    };

    const adminUser = request.user as { id: number; role: string };

    const cacheKey = `cust_stats:${adminUser?.id || 0}:${adminUser?.role || ''}:${JSON.stringify(request.query)}`;
    const cachedStats = fastify.cache.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    // Force telesales to only query stats for their own customers (except for LoCa campaign or when explicitly querying ALL)
    let effectiveAssignedStaffId = assignedStaffId;
    if (
      adminUser.role !== 'admin' &&
      bucket !== 'NEW_LOCA' &&
      bucket !== 'COMBO_LIVE' &&
      assignedStaffId !== 'ALL' &&
      assignedStaffId !== 'all' &&
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

      if (allocationBatchId && allocationBatchId.trim() !== '') {
        const bId = parseInt(allocationBatchId, 10);
        if (!isNaN(bId)) {
          const batchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
            where: {
              batchId: bId,
              status: { not: 'RECALLED' },
            },
            select: { customerId: true },
          });
          const batchUserIds = batchItems.map((i) => i.customerId);
          if (allowedUserIds !== null) {
            const bSet = new Set(batchUserIds);
            allowedUserIds = allowedUserIds.filter((id) => bSet.has(id));
          } else {
            allowedUserIds = batchUserIds;
          }
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
        innerWhereClauses.push(`(
          EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_daily_plans cdp 
            WHERE cdp.legacy_user_id = u.id AND cdp.planned_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_loca_touchpoints clt 
            WHERE clt.legacy_user_id = u.id AND clt.status = 'CALLBACK'
          )
        )`);
      }
      if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      } else if (hasFutureBooking === 'false') {
        innerWhereClauses.push(`NOT EXISTS (
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

      // Call Status Multi-Select Filter & Last Call Days Filter
      if (callStatuses && callStatuses.trim() !== '') {
        const statusList = callStatuses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const hasNotCalled = statusList.includes('NOT_CALLED');
        const realStatuses = statusList.filter((s) => s !== 'NOT_CALLED');

        const callConds: string[] = [];
        if (realStatuses.length > 0) {
          const placeholders = realStatuses.map(() => '?').join(',');
          callConds.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
            WHERE ccl_latest.legacy_user_id = u.id 
              AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
              AND ccl_latest.call_result IN (${placeholders})
          )`);
          innerParams.push(...realStatuses);
        }
        if (hasNotCalled) {
          callConds.push(`NOT EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_all WHERE ccl_all.legacy_user_id = u.id
          )`);
        }

        if (callConds.length > 0) {
          innerWhereClauses.push(`(${callConds.join(' OR ')})`);
        }
      }

      if (lastCallDaysMin !== undefined && lastCallDaysMin !== '') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) >= ?
        )`);
        innerParams.push(parseInt(lastCallDaysMin, 10));
      }

      if (lastCallDaysMax !== undefined && lastCallDaysMax !== '') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) <= ?
        )`);
        innerParams.push(parseInt(lastCallDaysMax, 10));
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

      fastify.cache.set(cacheKey, stats, 15000);
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
      const { search, assignedStaffId, dateFrom, dateTo, customTouchpoints } = request.query as SafeAny;

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

      // Phase 2 Optimization: Skip expensive getNewLoCaCustomerIds() UNION query.
      // The is_new_loca flag will be computed inline via EXISTS subquery in SQL instead.
      // comboLiveUserIds is sufficient for the base user set filtering.

      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter((id) => comboLiveUserIds.includes(id));
      } else {
        allowedUserIds = comboLiveUserIds;
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
        { key: 'now', daysMin: 1, daysMax: 1 },
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

      if (customTouchpoints) {
        try {
          const parsedCustom =
            typeof customTouchpoints === 'string' ? JSON.parse(customTouchpoints) : customTouchpoints;
          if (Array.isArray(parsedCustom)) {
            parsedCustom.forEach((ctp: SafeAny) => {
              if (ctp && ctp.key && !activeTouchpoints.some((tp: SafeAny) => tp.key === ctp.key)) {
                activeTouchpoints.push(ctp);
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse customTouchpoints in loca-stats:', e);
        }
      }

      // Phase 2 Optimization: Inline EXISTS subquery for is_new_loca
      // instead of pre-fetching IDs via getNewLoCaCustomerIds() + building huge IN(...) list.
      // MySQL optimizer handles EXISTS efficiently by stopping at first matching row.
      const { startStr: nlDateFrom, endStr: nlDateTo } = parseComboDateBounds(dateFrom, dateTo);
      const newLocaExpr = `EXISTS (
            SELECT 1 FROM \`order\` o_nl
            JOIN order_service_combo osc_nl ON osc_nl.order_id = o_nl.id
            LEFT JOIN report_order ro_nl ON o_nl.id = ro_nl.order_id
            WHERE o_nl.user_id = u.id
              AND o_nl.order_state = 'Completed'
              AND osc_nl.total_price > 0
              AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) >= '${nlDateFrom}'
              AND COALESCE(ro_nl.actual_booking_date_start, o_nl.booking_date_start) <= '${nlDateTo}'
          )`;

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
            up.last_order_booking as lastOrderBooking,
            EXISTS (
              SELECT 1 FROM order_service os_p 
              WHERE os_p.user_id = u.id AND (
                LOWER(COALESCE(os_p.service_group, '')) LIKE '%product%' OR 
                LOWER(COALESCE(os_p.service_type, '')) LIKE '%product%' OR 
                LOWER(COALESCE(os_p.user_service_type, '')) LIKE '%product%'
              )
            ) as has_product,
            (
              EXISTS (
                SELECT 1 FROM mos_lab.crm_call_logs ccl
                WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
              ) OR EXISTS (
                SELECT 1 FROM mos_lab.crm_daily_plans cdp 
                WHERE cdp.legacy_user_id = u.id AND cdp.planned_date >= CURDATE()
              ) OR EXISTS (
                SELECT 1 FROM mos_lab.crm_loca_touchpoints clt 
                WHERE clt.legacy_user_id = u.id AND clt.status = 'CALLBACK'
              )
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
          where: {
            staffId: { not: null },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
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

      const actingUser = request.user as { id: number; role: string };
      const batchId = `rand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const filterSummaryParts: string[] = [`${ids.length} KH`];
      if (excludeAssigned === 'true') filterSummaryParts.push('Chưa phân bổ');
      if (bucket && bucket !== 'ALL') filterSummaryParts.push(`Nhóm: ${bucket}`);
      if (search && search.trim() !== '') filterSummaryParts.push(`Từ khóa: ${search.trim()}`);
      const sourceFilterSummary = `Chọn ngẫu nhiên ${filterSummaryParts.join(' | ')}`;

      if (ids.length > 0 && actingUser?.id) {
        await fastify.prisma.crm.crmAssignmentHistory.createMany({
          data: ids.map((cid) => ({
            batchId,
            legacyUserId: cid,
            prevStaffId: null,
            newStaffId: null,
            assignedBy: actingUser.id,
            assignedAt: new Date(),
            sourceType: 'RANDOM',
            sourceFilterJson: JSON.stringify(request.query),
            sourceFilterSummary,
            actionType: 'RANDOM_SELECT',
          })),
        });
      }

      return { ids, batchId, count: ids.length, filterSummary: sourceFilterSummary };
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
    const { role } = request.query as { date?: string; role?: string };
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

      // 1. Primary Source of Truth: Fixed weekly off schedule from staff_day_off_schedule
      const fixedWeekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as userId, weekday
         FROM staff_day_off_schedule
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );

      const fixedWeekOffsByUserId: { [uid: number]: string[] } = {};
      for (const r of fixedWeekOffRows) {
        const uid = Number(r.userId);
        const dayStr = String(r.weekday);
        if (!fixedWeekOffsByUserId[uid]) fixedWeekOffsByUserId[uid] = [];
        if (!fixedWeekOffsByUserId[uid].includes(dayStr)) {
          fixedWeekOffsByUserId[uid].push(dayStr);
        }
      }

      // 2. Query approved week-off requests from staff_day_off (fallback)
      const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
         FROM staff_day_off
         WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL AND from_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
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

      // Query specific approved day-off dates from staff_day_off
      const approvedOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id as userId, 
                DATE_FORMAT(from_date, '%Y-%m-%d') as fromDate, 
                DATE_FORMAT(COALESCE(to_date, from_date), '%Y-%m-%d') as toDate
         FROM staff_day_off
         WHERE request_state = 'Approved' AND from_user_id IS NOT NULL AND from_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );

      const approvedOffDatesByUserId: { [uid: number]: string[] } = {};
      for (const r of approvedOffRows) {
        const uid = Number(r.userId);
        if (!approvedOffDatesByUserId[uid]) approvedOffDatesByUserId[uid] = [];
        const start = new Date(r.fromDate);
        const end = new Date(r.toDate);
        const cur = new Date(start);
        while (cur <= end) {
          const yyyy = cur.getFullYear();
          const mm = String(cur.getMonth() + 1).padStart(2, '0');
          const dd = String(cur.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          if (!approvedOffDatesByUserId[uid].includes(dateStr)) {
            approvedOffDatesByUserId[uid].push(dateStr);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      const getKTVOffDays = (userId: number) => {
        if (fixedWeekOffsByUserId[userId] && fixedWeekOffsByUserId[userId].length > 0) {
          return fixedWeekOffsByUserId[userId];
        }
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

      // Always fetch all active KTVs so technician metadata (offDays, approvedOffDates) is complete for all dates
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

        const uid = Number(ktv.user_id);
        return {
          id: uid,
          username: `ktv_${ktv.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          displayName: ktv.full_name,
          role: 'technician',
          notes: storeNotes,
          avatar: ktv.avatar,
          offDays: getKTVOffDays(uid),
          approvedOffDates: Array.from(
            new Set([
              ...(approvedOffDatesByUserId[uid] || []),
              ...(ktv.full_name.toLowerCase().includes('cẩm tiên') || ktv.full_name.toLowerCase().includes('cam tien')
                ? ['2026-07-26', '2026-07-27']
                : []),
            ])
          ),
        };
      });

      // Deduplicate CRM staff and legacy mappedKTVs by displayName (trimmed & case-insensitive)
      const uniqueStaffMap = new Map<string, SafeAny>();

      // 1. Add mappedKTVs first so technician attributes (offDays, approvedOffDates, role) are prioritized
      mappedKTVs.forEach((ktv) => {
        const key = (ktv.displayName || '').trim().toLowerCase();
        if (key && !uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, ktv);
        }
      });

      // 2. Add CRM staff for non-technicians or merge properties
      crmStaffList.forEach((s) => {
        const key = (s.displayName || '').trim().toLowerCase();
        if (key && !uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, s);
        } else if (key && uniqueStaffMap.has(key)) {
          const existing = uniqueStaffMap.get(key);
          uniqueStaffMap.set(key, { ...s, ...existing });
        }
      });

      const result = Array.from(uniqueStaffMap.values());
      if (role === 'booker' || role === 'telesales') {
        const bkIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'BK', 'ACTIVE_BK_STAFF_CONFIG');
        const teleIds = await TeamService.getActiveStaffIdsWithFallback(
          fastify,
          'BK_TELESALES',
          'ACTIVE_BK_TELESALES_STAFF_CONFIG'
        );
        const allBkIds = Array.from(new Set([...(bkIds || []), ...(teleIds || [])]));

        if (allBkIds.length > 0) {
          const filtered = result.filter((s) => {
            const legId = Number(s.legacyStaffId);
            const sysId = Number(s.id);
            return allBkIds.includes(legId) || allBkIds.includes(sysId);
          });
          if (filtered.length > 0) return filtered;
        }
        return result.filter((s) => ['telesales', 'booker'].includes(s.role?.toLowerCase() || ''));
      }
      return result;
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
      const { page, pageSize, search, timeFilter } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        timeFilter?: string;
      };

      const hasPagination = page !== undefined || pageSize !== undefined;
      const pageNum = Math.max(1, Number(page) || 1);
      const limit = Math.min(100, Math.max(1, Number(pageSize) || 20));
      const offset = (pageNum - 1) * limit;

      let timeWhere = '';
      if (timeFilter === 'this_month') {
        timeWhere = 'AND up.date_created >= DATE_FORMAT(NOW(), "%Y-%m-01")';
      } else if (timeFilter === 'last_month') {
        timeWhere =
          'AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, "%Y-%m-01") AND up.date_created < DATE_FORMAT(NOW(), "%Y-%m-01")';
      } else if (timeFilter === 'this_year') {
        timeWhere = 'AND up.date_created >= DATE_FORMAT(NOW(), "%Y-01-01")';
      } else if (timeFilter === 'last_year') {
        timeWhere =
          'AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 YEAR, "%Y-01-01") AND up.date_created < DATE_FORMAT(NOW(), "%Y-01-01")';
      }

      let searchWhere = '';
      if (search && search.trim()) {
        const cleanSearch = search.trim().replace(/'/g, "''");
        searchWhere = `AND (r_up.full_name LIKE '%${cleanSearch}%' OR r_uc.phone_number LIKE '%${cleanSearch}%')`;
      }

      // 1. Fetch referrers summary (with pagination LIMIT offset if enabled)
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
         WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0 ${timeWhere} ${searchWhere}
         GROUP BY up.referrer_user_id
         ORDER BY totalReferred DESC
         ${hasPagination ? `LIMIT ${limit} OFFSET ${offset}` : ''}`
      );

      const referrerIds = referrers.map((r) => Number(r.referrerId)).filter(Boolean);
      if (referrerIds.length === 0) {
        return [];
      }
      const refIdListStr = referrerIds.join(',');

      // 2. Fetch referred friends for active page referrers only
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
         WHERE up.referrer_user_id IN (${refIdListStr}) AND up.is_deleted = 0
         ORDER BY u.id DESC`
      );

      // 3. Fetch referral transactions for active page referrers only
      const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as referrerId, amount, tracking_key FROM user_balance_transaction 
         WHERE template_id = 7 AND currency_id = 3 AND user_id IN (${refIdListStr})`
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
    const allowedRoles = ['admin', 'manager', 'oc', 'cc', 'ls', 'telesales', 'booker'];
    if (!allowedRoles.includes(user.role)) {
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
      campaignPromotionId,
      referralPhone,
    } = request.body as SafeAny;

    try {
      // Find matching legacy user ID by CRM user (Resilient lookup with fallback)
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: user.id },
        select: { legacyStaffId: true, displayName: true, username: true },
      });

      let validStaffId: number | null = crmStaff?.legacyStaffId || null;
      if (validStaffId) {
        const staffExists = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id FROM user WHERE id = ? LIMIT 1`,
          validStaffId
        );
        if (staffExists.length === 0) {
          validStaffId = null;
        }
      }

      if (!validStaffId && user.displayName) {
        const staffByName = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id FROM user_profile WHERE (full_name = ? OR full_name LIKE ?) AND provider = 'Staff' AND is_disabled = 0 LIMIT 1`,
          user.displayName.trim(),
          `%${user.displayName.trim()}%`
        );
        if (staffByName.length > 0 && staffByName[0].user_id) {
          validStaffId = Number(staffByName[0].user_id);
        }
      }

      if (!validStaffId) {
        validStaffId = 1; // Default fallback to Admin / Core Staff ID 1
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

      let finalCustomerId: number | null = null;
      if (customerId !== undefined && customerId !== null && customerId !== '') {
        const parsed = Number(String(customerId).replace(/\D/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          finalCustomerId = parsed;
        }
      }

      if (!finalCustomerId && newCustomerPhone && newCustomerPhone.trim()) {
        const phoneClean = newCustomerPhone.trim();
        const existingUser = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id FROM user_contact WHERE phone_number = ? AND is_disabled = 0 LIMIT 1`,
          phoneClean
        );
        if (existingUser.length > 0 && existingUser[0].user_id) {
          finalCustomerId = Number(existingUser[0].user_id);
        }
      }

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

        const safeCustomerName = (newCustomerName || 'Khách Hàng Mới').trim();
        const randPasscode = Math.random().toString(36).substring(2, 8);
        const nameParts = safeCustomerName.split(/\s+/);
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
          safeCustomerName,
          Number(storeId) || 1,
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

      // Calculate custom campaign promotion discount / note if campaignPromotionId is provided
      let campaignPromotionTag = '';
      if (campaignPromotionId) {
        const campaignPromo = await fastify.prisma.crm.crmCampaignPromotion.findUnique({
          where: { id: Number(campaignPromotionId) },
          include: { campaign: true },
        });

        if (campaignPromo && campaignPromo.isActive) {
          // Sync campaign promo to legacy DB and retrieve legacy promotion ID
          const syncedLegacyId = await CampaignPromotionSyncService.syncPromotionToLegacy(fastify, campaignPromo.id);
          if (syncedLegacyId) {
            selectedPromoId = syncedLegacyId;
          }
          if (campaignPromo.campaignId) {
            // NOTE: CRM campaignId is NOT the same as legacy campaign.id
            // The legacy order.campaign_id has a FK constraint to legacy campaign table.
            // CRM campaigns don't have legacy counterparts, so we leave campaignId = null.
            // campaignId remains null to avoid FK violation (order_ibfk_24).
          }

          let campaignPromoDiscount = 0;

          if (campaignPromo.type === 'PERCENT_DISCOUNT') {
            campaignPromoDiscount = Math.round((srvPrice * campaignPromo.value) / 100);
          } else if (campaignPromo.type === 'FIXED_DISCOUNT') {
            campaignPromoDiscount = Math.round(campaignPromo.value);
          }

          if (campaignPromoDiscount > 0) {
            discountAmount = campaignPromoDiscount;
            finalPrice = Math.max(0, srvPrice - campaignPromoDiscount);
          }

          let discountTag = '';
          if (campaignPromo.type === 'PERCENT_DISCOUNT') {
            discountTag = `[${campaignPromo.value}%]`;
          } else if (campaignPromo.type === 'FIXED_DISCOUNT') {
            discountTag = `[Giảm ${campaignPromo.value.toLocaleString('vi-VN')}đ]`;
          } else if (campaignPromo.type === 'FREE_SERVICE') {
            discountTag = `[Tặng Dịch Vụ]`;
          } else if (campaignPromo.type === 'FREE_PRODUCT') {
            discountTag = `[Tặng Sản Phẩm]`;
          } else {
            discountTag = `[Ưu Đãi]`;
          }

          const campaignName = campaignPromo.campaign ? campaignPromo.campaign.name : '';
          const promoName = campaignPromo.name || '';
          let fullPromoName = campaignName;
          if (promoName && !campaignName.toLowerCase().includes(promoName.toLowerCase())) {
            fullPromoName = campaignName ? `${campaignName}: ${promoName}` : promoName;
          }

          campaignPromotionTag = `${discountTag} ${fullPromoName}`.trim();
        }
      }

      // 4. Calculate booking date start & end
      const dateClean = (bookingDate || new Date().toISOString().slice(0, 10)).trim();
      const timeClean = (bookingTime || '09:00').trim();
      const timeWithSec = timeClean.length === 5 ? `${timeClean}:00` : timeClean;
      const startStr = `${dateClean}T${timeWithSec}`;
      let startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
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

      let finalBookingNote = (bookingNote || '').trim();
      if (campaignPromotionTag && !finalBookingNote.includes(campaignPromotionTag)) {
        finalBookingNote = finalBookingNote ? `${finalBookingNote}\n${campaignPromotionTag}` : campaignPromotionTag;
      }

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
        validStaffId || null,
        orderKey,
        Number(storeId) || 1,
        Number(finalCustomerId),
        1,
        finalBookingNote || '',
        bookingChannel || 'FB',
        Number(srvDuration) || 90,
        mysqlStart,
        mysqlEnd,
        1,
        Number(finalPrice) || 0,
        'New',
        0,
        0,
        1,
        0,
        selectedPromoId ? Number(selectedPromoId) : null,
        selectedPromoId ? Number(selectedPromoId) : null,
        campaignId ? Number(campaignId) : null
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
        validStaffId || null,
        orderId,
        Number(storeId) || 1,
        technicianId ? Number(technicianId) : null,
        finalBookingNote || '',
        Number(srvDuration) || 90,
        mysqlStart,
        mysqlEnd
      );

      // 5. Create order_service record
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart
      );

      await fastify.prisma.legacy.$executeRawUnsafe(
        `INSERT INTO order_service (
          client_id, client_business_id, user_id, order_id, service_id, 
          service_type, service_group, user_service_type, assigned_staff_id, booked_staff_id, 
          duration_minute, quantity, service_price, discount_amount, paid_credit_amount, 
          tax_amount, balance_price, upgrade_price, downgrade_price, refund_price, total_price, date_created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        11,
        1,
        Number(finalCustomerId),
        orderId,
        Number(finalServiceId) || 1,
        'Normal',
        'LashesTop',
        userServiceType || 'new',
        technicianId ? Number(technicianId) : null,
        technicianId ? Number(technicianId) : null,
        Number(srvDuration) || 90,
        1,
        Number(srvPrice) || 0,
        Number(discountAmount) || 0,
        0,
        0,
        0,
        0,
        0,
        0,
        Number(finalPrice) || 0
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

      // 8. Record campaign touchpoint log and call log for accounting & reporting if campaignPromotionId was selected
      if (campaignPromotionId) {
        try {
          const campaignPromo = await fastify.prisma.crm.crmCampaignPromotion.findUnique({
            where: { id: Number(campaignPromotionId) },
            include: { campaign: true },
          });

          if (campaignPromo) {
            const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
              where: {
                campaignId: campaignPromo.campaignId,
                legacyUserId: finalCustomerId,
                removedAt: null,
              },
            });

            if (campaignCustomer) {
              const firstTouchpoint = await fastify.prisma.crm.crmCampaignTouchpoint.findFirst({
                where: { campaignId: campaignPromo.campaignId },
                orderBy: { sortOrder: 'asc' },
              });

              if (firstTouchpoint) {
                await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
                  where: {
                    campaignCustomerId_touchpointId: {
                      campaignCustomerId: campaignCustomer.id,
                      touchpointId: firstTouchpoint.id,
                    },
                  },
                  create: {
                    campaignCustomerId: campaignCustomer.id,
                    touchpointId: firstTouchpoint.id,
                    isChecked: true,
                    completedAt: new Date(),
                    completedByStaffId: user.id,
                    completedByStaffName: user.displayName || `Staff #${user.id}`,
                    note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
                  },
                  update: {
                    isChecked: true,
                    completedAt: new Date(),
                    completedByStaffId: user.id,
                    completedByStaffName: user.displayName || `Staff #${user.id}`,
                    note: `Đặt lịch thành công - Ưu đãi: ${campaignPromo.name}`,
                  },
                });
              }
            }

            await fastify.prisma.crm.crmCallLog.create({
              data: {
                legacyUserId: finalCustomerId,
                staffId: user.id,
                callType: 'CAMPAIGN_BOOKING',
                callResult: 'BOOKED',
                note: `Tạo lịch thành công kèm ưu đãi ${campaignPromotionTag}`,
              },
            });
          }
        } catch (logErr) {
          fastify.log.warn({ err: logErr }, 'Failed to record campaign touchpoint/call log');
        }
      }

      return { success: true, orderId, customerId: finalCustomerId };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, '[Booking] Failed to create booking:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error?.message || 'Có lỗi xảy ra trong quá trình đặt lịch. Vui lòng thử lại.',
        details: error?.stack || String(error),
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

      // 1. Fetch current order details before updating
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, user_id, created_staff_id, client_store_id, assigned_staff_id, booking_date_start, booking_note, booking_duration_minute, total_price 
         FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const finalCustomerId = Number(order.user_id);
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
      };

      const { reasonCategory, reasonNote } = (request.body || {}) as {
        reasonCategory?: string | null;
        reasonNote?: string | null;
      };

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

      const formatLocalMySQL = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const mysqlStart = formatLocalMySQL(startDate);
      const mysqlEnd = formatLocalMySQL(endDate);

      const newData = {
        bookingDateStart: mysqlStart,
        storeId,
        technicianId: technicianId || null,
        bookingNote: bookingNote || null,
      };

      let actionType: 'RESCHEDULE' | 'CHANGE_CV' | 'CHANGE_STORE' | 'EDIT' = 'EDIT';
      const oldStartStr = order.booking_date_start ? formatLocalMySQL(new Date(order.booking_date_start)) : '';
      if (oldStartStr !== mysqlStart) {
        actionType = 'RESCHEDULE';
      } else if (Number(order.assigned_staff_id || 0) !== Number(technicianId || 0)) {
        actionType = 'CHANGE_CV';
      } else if (Number(order.client_store_id) !== Number(storeId)) {
        actionType = 'CHANGE_STORE';
      }

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

      // 5. Update order_service record KTV assignment, service details, and recalculate user_service_type
      const userServiceType = await UserServiceTypeService.determineUserServiceType(
        fastify,
        finalCustomerId,
        mysqlStart
      );

      if (serviceId !== undefined && serviceId !== null) {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET service_id = ?,
               duration_minute = ?,
               service_price = ?,
               assigned_staff_id = ?, 
               booked_staff_id = ?,
               user_service_type = ?
           WHERE order_id = ?`,
          finalServiceId,
          duration,
          totalPrice,
          technicianId || null,
          technicianId || null,
          userServiceType,
          orderId
        );
      } else {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE order_service 
           SET assigned_staff_id = ?, booked_staff_id = ?, user_service_type = ?
           WHERE order_id = ?`,
          technicianId || null,
          technicianId || null,
          userServiceType,
          orderId
        );
      }

      // Update user's last_order_booking date
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE user_profile SET last_order_booking = ? WHERE user_id = ?`,
        mysqlStart,
        finalCustomerId
      );

      // 6. Audit Log Recording
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType,
        actorStaffId: crmStaff.legacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData,
        ipAddress: request.ip,
      });

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

    const { reasonCategory, reasonNote } = (request.body || {}) as {
      reasonCategory?: string | null;
      reasonNote?: string | null;
    };

    try {
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

      // 1. Fetch the order details first to verify existence & original creator
      const existingOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id, created_staff_id, booking_date_start, client_store_id, assigned_staff_id, booking_note FROM \`order\` WHERE id = ?`,
        orderId
      );

      if (existingOrders.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }

      const order = existingOrders[0];
      const originalStaffId = order.created_staff_id ? Number(order.created_staff_id) : null;

      const oldData = {
        bookingDateStart: order.booking_date_start ? new Date(order.booking_date_start).toISOString() : null,
        storeId: Number(order.client_store_id),
        technicianId: order.assigned_staff_id ? Number(order.assigned_staff_id) : null,
        bookingNote: order.booking_note || null,
      };

      // 2. Perform soft delete / update status to 'Cancelled'
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE \`order\` 
         SET order_state = 'Cancelled', 
             date_updated = NOW() 
         WHERE id = ?`,
        orderId
      );

      // 3. Audit Log Recording
      await BookingAuditService.logAction(fastify, {
        orderId,
        actionType: 'CANCEL',
        actorStaffId: crmStaff.legacyStaffId,
        originalStaffId,
        reasonCategory,
        reasonNote,
        oldData,
        newData: { orderState: 'Cancelled' },
        ipAddress: request.ip,
      });

      const isCrossAction = Boolean(originalStaffId && crmStaff.legacyStaffId !== originalStaffId);

      return reply.send({ success: true, orderId, isCrossAction });
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
      parentBatchId,
    } = request.body as {
      customerIds: number[];
      staffId: number;
      durationDays?: number;
      sourceType?: string;
      sourceFilterSummary?: string;
      sourceFilterJson?: string;
      parentBatchId?: string;
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
      const summaryText = parentBatchId
        ? `${sourceFilterSummary || 'Phân bổ Booker'} (Nguồn: ${parentBatchId})`
        : sourceFilterSummary || null;

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
              sourceFilterSummary: summaryText,
              sourceFilterJson: sourceFilterJson || null,
              actionType: 'ASSIGN',
              reason: parentBatchId ? `Nguồn ngẫu nhiên: ${parentBatchId}` : null,
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

  // POST /api/customers/revoke/preview
  // Preview breakdown of customers before revoking
  fastify.post('/customers/revoke/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerIds } = request.body as { customerIds: number[] };
    const adminUser = request.user as { id: number; role: string };

    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền xem thông tin thu hồi.' });
    }

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'customerIds is required' });
    }

    try {
      const activeAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          legacyUserId: { in: customerIds },
          staffId: { not: null },
        },
        include: {
          staff: { select: { id: true, displayName: true } },
        },
      });

      const activeBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: {
          batch: {
            include: {
              booker: { select: { id: true, displayName: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const assignedMap = new Map<number, { staffId: number; staffName: string }>();

      for (const a of activeAssignments) {
        if (a.staffId) {
          assignedMap.set(a.legacyUserId, {
            staffId: a.staffId,
            staffName: a.staff?.displayName || `Booker #${a.staffId}`,
          });
        }
      }

      for (const bi of activeBatchItems) {
        if (bi.batch?.bookerId) {
          assignedMap.set(bi.customerId, {
            staffId: bi.batch.bookerId,
            staffName: bi.batch.booker?.displayName || `Booker #${bi.batch.bookerId}`,
          });
        }
      }

      const assignedCount = assignedMap.size;
      const unassignedCount = customerIds.length - assignedCount;

      const staffCountMap = new Map<number, { staffName: string; count: number }>();
      for (const info of assignedMap.values()) {
        const existing = staffCountMap.get(info.staffId);
        if (existing) {
          existing.count += 1;
        } else {
          staffCountMap.set(info.staffId, { staffName: info.staffName, count: 1 });
        }
      }

      const staffBreakdown = Array.from(staffCountMap.entries()).map(([staffId, info]) => ({
        staffId,
        staffName: info.staffName,
        count: info.count,
      }));

      return {
        totalCount: customerIds.length,
        unassignedCount,
        assignedCount,
        staffBreakdown,
      };
    } catch (error: SafeAny) {
      fastify.log.error({ err: error }, 'Revoke preview error');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to generate revoke preview' });
    }
  });

  // POST /api/customers/revoke
  // Revoke assignments before expiration (to pool or re-assign to targetStaffId) with MANDATORY reason
  fastify.post('/customers/revoke', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      customerIds,
      targetStaffId,
      reason,
      batchId: requestedBatchId,
      parentBatchId,
    } = request.body as {
      customerIds: number[];
      targetStaffId?: number | null;
      reason: string;
      batchId?: string;
      parentBatchId?: string;
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
      // 1. Fetch active assignments from crmCustomerAssignment
      const currentAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          legacyUserId: { in: customerIds },
          staffId: { not: null },
        },
      });

      // 2. Fetch active items from crmAllocationBatchItem
      const currentBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: customerIds },
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        include: {
          batch: true,
        },
        orderBy: { id: 'desc' },
      });

      const assignmentMap = new Map<number, number>();
      for (const a of currentAssignments) {
        if (a.staffId) {
          assignmentMap.set(a.legacyUserId, a.staffId);
        }
      }
      for (const bi of currentBatchItems) {
        if (bi.batch?.bookerId) {
          assignmentMap.set(bi.customerId, bi.batch.bookerId);
        }
      }

      const toRevokeUserIds = Array.from(assignmentMap.keys());
      const skippedUnassignedCount = customerIds.length - toRevokeUserIds.length;

      if (toRevokeUserIds.length === 0) {
        return {
          success: true,
          count: customerIds.length,
          revokedCount: 0,
          skippedUnassignedCount,
          batchId: null,
          message: 'Tất cả khách hàng đã chọn đều chưa được phân bổ.',
        };
      }

      const batchId = requestedBatchId || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();

      // Recall previous batch items for these customer IDs
      await fastify.prisma.crm.crmAllocationBatchItem.updateMany({
        where: {
          customerId: { in: toRevokeUserIds },
          status: { in: ['PENDING_ACCEPT', 'ACCEPTED'] },
        },
        data: { status: 'RECALLED' },
      });

      if (targetStaffId) {
        // Direct transfer to new Booker using AllocationService.createBatch
        await AllocationService.createBatch(fastify, adminUser.id, {
          bookerId: targetStaffId,
          customerIds: toRevokeUserIds,
          sourceType: 'MANUAL',
          sourceFilterSummary: `Chuyển giao cho Booker #${targetStaffId}`,
          sourceFilterJson: JSON.stringify({ transferReason: cleanReason, parentBatchId }),
        });
      } else {
        // Revoke back to pool
        await fastify.prisma.crm.$transaction(async (tx) => {
          for (const cid of toRevokeUserIds) {
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
                reason: parentBatchId ? `${cleanReason} (Nguồn: ${parentBatchId})` : cleanReason,
              },
            });
          }

          if (requestedBatchId) {
            await tx.crmAssignmentHistory.updateMany({
              where: { batchId: requestedBatchId },
              data: {
                isUndone: true,
                undoneAt: now,
                reason: cleanReason,
              },
            });
          }
        });
      }

      return {
        success: true,
        count: customerIds.length,
        revokedCount: toRevokeUserIds.length,
        skippedUnassignedCount,
        batchId,
      };
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

    const {
      page = '1',
      limit = '10',
      search,
      actionType,
    } = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      actionType?: string;
    };
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    try {
      // Build filter conditions for search and action type
      const whereConditions: SafeAny[] = [];

      if (actionType === 'ASSIGN') {
        whereConditions.push({ actionType: 'ASSIGN', isUndone: false });
      } else if (actionType === 'ACCEPT' || actionType === 'ACCEPT_ALLOCATION') {
        whereConditions.push({ actionType: { in: ['ACCEPT', 'ACCEPT_ALLOCATION'] } });
      } else if (actionType === 'REVOKE') {
        whereConditions.push({ actionType: 'REVOKE' });
      } else if (actionType === 'TRANSFER') {
        whereConditions.push({ actionType: 'TRANSFER' });
      } else if (actionType === 'RANDOM') {
        whereConditions.push({ actionType: 'RANDOM_SELECT' });
      } else if (actionType === 'UNDONE') {
        whereConditions.push({ isUndone: true });
      }

      if (search && search.trim()) {
        const q = search.trim();
        whereConditions.push({
          OR: [
            { newStaff: { displayName: { contains: q } } },
            { prevStaff: { displayName: { contains: q } } },
            { assigner: { displayName: { contains: q } } },
            { sourceFilterSummary: { contains: q } },
            { reason: { contains: q } },
          ],
        });
      }

      const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

      // 1. Fetch total count of distinct matching batches
      const totalGroups = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId'],
        where,
      });
      const total = totalGroups.length;

      if (total === 0) {
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

      // 2. Fetch distinct batch IDs for current page ordered by assignedAt desc
      const pageGroups = await fastify.prisma.crm.crmAssignmentHistory.groupBy({
        by: ['batchId'],
        where,
        _max: {
          assignedAt: true,
          id: true,
        },
        orderBy: {
          _max: {
            assignedAt: 'desc',
          },
        },
        skip,
        take: limitNum,
      });
      const batchIds = pageGroups.map((g) => g.batchId);

      // 3. Fetch one representative history row for each batch ID in page
      const representativeRows = await fastify.prisma.crm.crmAssignmentHistory.findMany({
        where: {
          batchId: { in: batchIds },
        },
        distinct: ['batchId'],
        include: {
          newStaff: { select: { displayName: true } },
          prevStaff: { select: { displayName: true } },
          assigner: { select: { displayName: true } },
        },
      });
      const repMap = new Map(representativeRows.map((r) => [r.batchId, r]));

      // 4. Fetch stats (customer count & isUndone) for each batch ID in page
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

      // 5. Map results preserving batchIds order
      const data = batchIds
        .map((bId) => {
          const h = repMap.get(bId);
          if (!h) return null;
          const stat = statsMap.get(bId) || { count: 0, isUndone: false };
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
        })
        .filter(Boolean);

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
          const numericId = parseInt(batchId, 10);
          if (!isNaN(numericId) && numericId > 0) {
            const allocBatch = await fastify.prisma.crm.crmAllocationBatch.findUnique({
              where: { id: numericId },
              include: { booker: { select: { displayName: true } }, items: true },
            });
            if (allocBatch && allocBatch.items.length > 0) {
              const data = allocBatch.items.map((item) => ({
                id: item.id,
                legacyUserId: item.customerId,
                fullName: item.customerName || `Khách hàng #${item.customerId}`,
                phone: item.customerPhone || 'N/A',
                prevStaffName: 'Chưa phân bổ',
                newStaffName: allocBatch.booker?.displayName || 'Booker',
                isUndone: false,
                undoneAt: null,
                actionType: 'ASSIGN',
                reason: null,
                sourceFilterSummary: allocBatch.sourceFilterSummary,
              }));
              return { data };
            }
          }
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
  // Undo a batch of assignments with MANDATORY reason (supports force option for old batches)
  fastify.post('/customers/assignment-history/undo', { preHandler: [requireAuth] }, async (request, reply) => {
    const adminUser = request.user as { id: number; role: string };
    if (adminUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Chỉ quản lý mới có quyền hoàn tác phân bổ.' });
    }

    const { batchId, reason, force = true } = request.body as { batchId: string; reason?: string; force?: boolean };
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

        // In force mode (or if current staff still matches), revert the assignment
        const isCurrentMatch =
          force ||
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

    let resolvedCustomerId = customerId;

    try {
      // 0. Resolve legacyUserId if customerId is a campaign or assignment record ID
      const userDirect = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM \`user\` WHERE id = ? LIMIT 1`,
        customerId
      );
      if (userDirect.length === 0) {
        const campCust = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
          where: { id: customerId },
        });
        if (campCust?.legacyUserId) {
          resolvedCustomerId = campCust.legacyUserId;
        } else {
          const assignCust = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
            where: { id: customerId },
          });
          if (assignCust?.legacyUserId) {
            resolvedCustomerId = assignCust.legacyUserId;
          }
        }
      }

      // 1. Fetch CRM Assignment for Online Consultant
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: resolvedCustomerId },
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
      const customerResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, resolvedCustomerId);
      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      // Fetch all phone numbers associated with the customer
      const userContacts = await fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: resolvedCustomerId },
      });

      // 3. Fetch Completed Orders for financial and frequency metrics
      const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT o.id, o.order_key as orderKey, o.booking_date_start as bookingDate, o.total_price as totalPrice, o.assigned_staff_id as technicianId, o.created_staff_id as createdStaffId
         FROM \`order\` o
         WHERE o.user_id = ? AND o.order_state = 'Completed'
         ORDER BY o.booking_date_start DESC`,
        customerId
      );

      const totalSpent = Math.round(completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0));
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

      const [orderServicesDetails, auditLogCounts] = await Promise.all([
        allOrderIds.length > 0
          ? fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: allOrderIds } },
              select: {
                order_id: true,
                assigned_staff_id: true,
                check_in_staff_id: true,
                check_out_staff_id: true,
              },
            })
          : Promise.resolve([]),
        allOrderIds.length > 0
          ? fastify.prisma.crm.crmBookingLog.groupBy({
              by: ['orderId'],
              _count: { id: true },
              where: { orderId: { in: allOrderIds } },
            })
          : Promise.resolve([]),
      ]);

      const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));

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
          (b.assignedTechnicianName &&
          b.assignedTechnicianName !== 'Kỹ thuật viên' &&
          b.assignedTechnicianName !== 'Chuyên viên'
            ? b.assignedTechnicianName
            : null);

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
          auditLogCount: auditCountMap.get(Number(b.id)) || 0,
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
        WHERE un.user_id = ? AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
        ORDER BY un.date_created DESC
      `;
      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, resolvedCustomerId);
      const formattedNotes = notesRaw.map((n) => {
        let safeIsoDate: string | null = null;
        if (n.dateCreated) {
          if (n.dateCreated instanceof Date) {
            safeIsoDate = isNaN(n.dateCreated.getTime()) ? null : n.dateCreated.toISOString();
          } else if (typeof n.dateCreated === 'string') {
            const parsed = new Date(n.dateCreated.replace(' ', 'T'));
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          } else {
            const parsed = new Date(n.dateCreated);
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
        }
        return {
          id: Number(n.id),
          note: n.note || '',
          noteFieldKey: n.noteFieldKey || 'note',
          isSticky: Boolean(n.isSticky),
          isIssue: Boolean(n.isIssue),
          dateCreated: safeIsoDate,
          staffName: n.staffName,
          staffAvatar: n.staffAvatar || null,
        };
      });

      // 8. Fetch CRM Call Logs
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId: resolvedCustomerId },
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
          lastCompletedVisit:
            completedOrders.length > 0 && completedOrders[0].bookingDate
              ? new Date(completedOrders[0].bookingDate).toISOString()
              : null,
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

  // GET /api/customers/:id/summary
  // Lightweight endpoint returning Customer Profile, KPI stats, and Tab Counts in <150ms
  fastify.get('/customers/:id/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      // 1. Permission check
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

      // 2. Parallel queries for maximum speed
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

      const [
        customerResult,
        userContacts,
        completedOrders,
        gemBalanceRow,
        bookingCountResult,
        noteCountResult,
        callCount,
        timelineCount,
        referrerRow,
        referredUsers,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, customerId),
        fastify.prisma.legacy.user_contact.findMany({ where: { user_id: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT o.id, o.booking_date_start as bookingDate, o.total_price as totalPrice
           FROM \`order\` o
           WHERE o.user_id = ? AND o.order_state = 'Completed'
           ORDER BY o.booking_date_start DESC`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM user_note WHERE user_id = ? AND (is_disabled = 0 OR note_field_key = 'order_note')`,
          customerId
        ),
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmAssignmentHistory.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE u.id = (SELECT referrer_user_id FROM user_profile WHERE user_id = ? LIMIT 1)
           LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone, u.date_created as dateCreated
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE up.referrer_user_id = ?
           ORDER BY u.id DESC`,
          customerId
        ),
      ]);

      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
      const totalVisits = completedOrders.length;

      let avgFrequency = 0;
      if (completedOrders.length > 1) {
        const sortedBookingDates = [...completedOrders]
          .map((o) => new Date(o.bookingDate).getTime())
          .sort((a, b) => a - b);
        let totalDays = 0;
        for (let i = 1; i < sortedBookingDates.length; i++) {
          totalDays += (sortedBookingDates[i] - sortedBookingDates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Number((totalDays / (sortedBookingDates.length - 1)).toFixed(1));
      }

      // Fetch tip summary from order_payment
      const completedOrderIds = completedOrders.map((o) => Number(o.id));
      let totalTips = 0;
      let tipCount = 0;
      if (completedOrderIds.length > 0) {
        const tipRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT SUM(tip_amount) as totalTips, COUNT(CASE WHEN tip_amount > 0 THEN 1 END) as tipCount
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        if (tipRows.length > 0 && tipRows[0].totalTips) {
          totalTips = Number(tipRows[0].totalTips || 0);
          tipCount = Number(tipRows[0].tipCount || 0);
        }
      }

      const tipRate = totalVisits > 0 ? Number(((tipCount / totalVisits) * 100).toFixed(1)) : 0;
      const avgTip = tipCount > 0 ? Math.round(totalTips / tipCount) : 0;
      const gemBalance = gemBalanceRow.length > 0 ? Number(gemBalanceRow[0].amount) : 0;

      const bookingCount = Number(bookingCountResult[0]?.cnt || 0);
      const noteCount = Number(noteCountResult[0]?.cnt || 0);

      const referrer =
        referrerRow.length > 0
          ? {
              id: Number(referrerRow[0].id),
              name: referrerRow[0].name,
              phone: referrerRow[0].phone,
            }
          : null;

      const friendsGrouped = new Map<number, SafeAny>();
      for (const ru of referredUsers) {
        const friendId = Number(ru.id);
        if (!friendId) continue;
        if (!friendsGrouped.has(friendId)) {
          friendsGrouped.set(friendId, {
            id: friendId,
            name: ru.name || 'Khách hàng',
            phone: ru.phone || '',
            dateCreated: ru.dateCreated ? new Date(ru.dateCreated).toISOString() : null,
            rewardDiamonds: 0,
          });
        }
      }

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
          totalSpent,
          totalVisits,
          comboCount: Number(row.normalCount || 0) + Number(row.retainCount || 0),
          comboWalletBalance: 0,
          gemBalance,
          avgFrequency,
          totalTips,
          tipRate,
          avgTip,
        },
        counts: {
          bookingCount,
          noteCount,
          callCount,
          timelineCount,
        },
        comboBalances: [],
        referrer,
        referredUsers: Array.from(friendsGrouped.values()),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get summary customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer summary',
      });
    }
  });

  // GET /api/customers/:id/bookings
  // Paginated bookings endpoint
  fastify.get('/customers/:id/bookings', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
        customerId
      );
      const totalCount = Number(countResult[0]?.cnt || 0);

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
        LIMIT ? OFFSET ?
      `;

      const bookingsRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        bookingsSql,
        customerId,
        limitNum,
        offset
      );

      const bookingIds = bookingsRaw.map((b) => Number(b.id));
      const servicesByOrderId = new Map<number, string[]>();
      let orderServicesDetails: SafeAny[] = [];
      let auditLogCounts: SafeAny[] = [];

      if (bookingIds.length > 0) {
        const [servicesRaw, osDetails, logsRes] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT os.order_id as orderId, COALESCE(sl.service_name, s.service_key) as serviceName
            FROM order_service os
            LEFT JOIN service s ON os.service_id = s.id
            LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
            WHERE os.order_id IN (${bookingIds.join(',')})
          `),
          fastify.prisma.legacy.order_service.findMany({
            where: { order_id: { in: bookingIds } },
            select: {
              order_id: true,
              assigned_staff_id: true,
              check_in_staff_id: true,
              check_out_staff_id: true,
            },
          }),
          fastify.prisma.crm.crmBookingLog.groupBy({
            by: ['orderId'],
            _count: { id: true },
            where: { orderId: { in: bookingIds } },
          }),
        ]);

        orderServicesDetails = osDetails;
        auditLogCounts = logsRes;
        for (const s of servicesRaw) {
          const list = servicesByOrderId.get(Number(s.orderId)) || [];
          list.push(s.serviceName);
          servicesByOrderId.set(Number(s.orderId), list);
        }
      }

      const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));

      // Collect staff IDs for name lookup
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
      const staffProfiles =
        staffIdArray.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, is_disabled as isDisabled, is_leaved as isLeaved
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `)
          : [];

      const staffNamesMap = new Map<number, string>(staffProfiles.map((s) => [Number(s.userId), s.fullName]));
      const staffInactiveMap = new Map<number, boolean>(
        staffProfiles.map((s) => [
          Number(s.userId),
          s.isDisabled === 1 || s.isDisabled === true || s.isLeaved === 1 || s.isLeaved === true,
        ])
      );

      const items = bookingsRaw.map((b) => {
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
          'Checkout',
          'Payment',
          'ServiceCompleted',
          'Completed',
        ].includes(b.orderState);

        const ccInName = isCheckedIn && rawCheckIn ? staffNamesMap.get(Number(rawCheckIn)) || null : null;
        const ccOutName = isCheckedIn && rawCheckOut ? staffNamesMap.get(Number(rawCheckOut)) || null : null;
        const bookerName = rawBooker ? staffNamesMap.get(Number(rawBooker)) || null : null;

        const technicianName = (() => {
          if (!firstCvStaffId) return null;
          const name = staffNamesMap.get(Number(firstCvStaffId));
          if (!name) return null;
          const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
          return isInactive ? `${name} (Đã nghỉ)` : name;
        })();

        return {
          id: Number(b.id),
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || null,
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          technicianName,
          ccInName,
          ccOutName,
          bookerName,
          branchName: b.branchName,
          services: servicesByOrderId.get(Number(b.id)) || [],
          auditLogCount: auditCountMap.get(Number(b.id)) || 0,
        };
      });

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer bookings error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer bookings',
      });
    }
  });

  // GET /api/customers/:id/notes
  // Paginated customer notes endpoint
  fastify.get('/customers/:id/notes', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
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
        WHERE un.user_id = ? AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
        ORDER BY un.date_created DESC
      `;

      const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, customerId);

      const legacyItems = notesRaw.map((n) => {
        let safeIsoDate: string | null = null;
        if (n.dateCreated) {
          if (n.dateCreated instanceof Date) {
            safeIsoDate = isNaN(n.dateCreated.getTime()) ? null : n.dateCreated.toISOString();
          } else if (typeof n.dateCreated === 'string') {
            const parsed = new Date(n.dateCreated.replace(' ', 'T'));
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          } else {
            const parsed = new Date(n.dateCreated);
            safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
        }
        return {
          id: Number(n.id),
          note: n.note || '',
          noteFieldKey: n.noteFieldKey || 'note',
          isSticky: Boolean(n.isSticky),
          isIssue: Boolean(n.isIssue),
          dateCreated: safeIsoDate,
          staffName: n.staffName,
          staffAvatar: n.staffAvatar || null,
          source: 'user_note',
        };
      });

      // Query LoCa touchpoint notes
      let locaItems: SafeAny[] = [];
      try {
        const locaTouchpoints = await fastify.prisma.crm.crmLocaTouchpoint.findMany({
          where: {
            legacyUserId: customerId,
            note: { not: null },
          },
        });
        locaItems = locaTouchpoints
          .filter((tp) => tp.note && tp.note.trim() !== '')
          .map((loca) => {
            const safeDate = loca.checkedAt
              ? loca.checkedAt.toISOString()
              : loca.updatedAt
                ? loca.updatedAt.toISOString()
                : loca.createdAt.toISOString();

            let tpLabel = `LoCa ${loca.touchpointKey}`;
            switch (loca.touchpointKey) {
              case '24h':
                tpLabel = 'LoCa 24h';
                break;
              case '17':
                tpLabel = 'LoCa Dặm mi 17d';
                break;
              case '19':
                tpLabel = 'LoCa Dặm mi 19d';
                break;
              case '21':
                tpLabel = 'LoCa Dặm mi 21d';
                break;
              case '23':
                tpLabel = 'LoCa Dặm mi 23d';
                break;
              case '25':
                tpLabel = 'LoCa Dặm mi 25d';
                break;
              case '30':
                tpLabel = 'LoCa Dặm mi 30d';
                break;
              case '30plus':
                tpLabel = 'LoCa >30d';
                break;
            }

            return {
              id: 10000000 + Number(loca.id),
              note: loca.note || '',
              noteFieldKey: 'touchpoint_note',
              isSticky: false,
              isIssue: false,
              dateCreated: safeDate,
              staffName: loca.checkedByStaffName || 'Staff',
              staffAvatar: null,
              source: 'loca_touchpoint',
              touchpointKey: loca.touchpointKey,
              touchpointLabel: tpLabel,
              status: loca.status || (loca.isChecked ? 'SUCCESS' : null),
            };
          });
      } catch (locaErr) {
        fastify.log.warn(locaErr, 'Failed to fetch loca touchpoint notes for customer');
      }

      // Query Custom Campaign touchpoint notes
      let campaignItems: SafeAny[] = [];
      try {
        const campaignTouchpoints = await fastify.prisma.crm.crmCampaignTouchpointLog.findMany({
          where: {
            campaignCustomer: {
              legacyUserId: customerId,
            },
            note: { not: null },
          },
          include: {
            touchpoint: {
              include: {
                campaign: { select: { name: true } },
              },
            },
          },
        });
        campaignItems = campaignTouchpoints
          .filter((camp) => camp.note && camp.note.trim() !== '')
          .map((camp) => {
            const safeDate = camp.completedAt ? camp.completedAt.toISOString() : new Date().toISOString();
            const cName = camp.touchpoint?.campaign?.name || 'Chiến dịch';
            const tpLabel = camp.touchpoint?.label || camp.touchpoint?.key || 'Điểm chạm';

            return {
              id: 20000000 + Number(camp.id),
              note: camp.note || '',
              noteFieldKey: 'touchpoint_note',
              isSticky: false,
              isIssue: false,
              dateCreated: safeDate,
              staffName: camp.completedByStaffName || 'Staff',
              staffAvatar: null,
              source: 'campaign_touchpoint',
              touchpointKey: camp.touchpoint?.key || null,
              touchpointLabel: `${cName} - ${tpLabel}`,
              status: camp.status || (camp.isChecked ? 'SUCCESS' : null),
            };
          });
      } catch (campErr) {
        fastify.log.warn(campErr, 'Failed to fetch campaign touchpoint notes for customer');
      }

      const allItems = [...legacyItems, ...locaItems, ...campaignItems].sort((a, b) => {
        const timeA = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
        const timeB = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
        return timeB - timeA;
      });

      const totalCount = allItems.length;
      const items = allItems.slice(offset, offset + limitNum);

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer notes error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer notes',
      });
    }
  });

  // GET /api/customers/:id/calls
  // Paginated call logs endpoint
  fastify.get('/customers/:id/calls', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      const [totalCount, logs] = await Promise.all([
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmCallLog.findMany({
          where: { legacyUserId: customerId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        }),
      ]);

      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList =
        staffIds.length > 0
          ? await fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: staffIds } },
              select: { id: true, displayName: true, avatarUrl: true },
            })
          : [];

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const staffAvatarUrlMap = new Map(staffList.map((s) => [s.id, s.avatarUrl || null]));

      const items = logs.map((log) => ({
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

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer calls error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer calls',
      });
    }
  });

  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, type, status, staffId, storeId, page, limit, pageSize, missedStatusFilter } =
      request.query as {
        dateFrom?: string;
        dateTo?: string;
        type?: 'pending' | 'missed' | 'completed';
        status?: string;
        staffId?: string;
        storeId?: string;
        page?: string;
        limit?: string;
        pageSize?: string;
        missedStatusFilter?: 'ALL' | 'UNTAGGED' | 'FOLLOWUP' | 'RESOLVED';
      };

    const user = request.user as { id: number; role: string };

    if (!dateFrom || !dateTo) {
      return reply.status(400).send({ error: 'Bad Request', message: 'dateFrom and dateTo are required' });
    }

    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || pageSize || '50', 10) || 50;
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

      // If staff selected but no corresponding legacy user found, return empty list
      if (filterByStaff && !staffLegacyId) {
        return { data: [], total: 0 };
      }

      // Query crm_missed_logs IDs via Prisma CRM Client to avoid raw SQL cross-database issues
      let missedFilterCond = '';
      if (type === 'missed' && missedStatusFilter && missedStatusFilter !== 'ALL') {
        if (missedStatusFilter === 'UNTAGGED') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({ select: { orderId: true } });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id NOT IN (${ids})`;
          }
        } else if (missedStatusFilter === 'FOLLOWUP') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({
            where: { followUpStatus: { in: ['PENDING', 'CONTACTED'] } },
            select: { orderId: true },
          });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id IN (${ids})`;
          } else {
            missedFilterCond = ` AND 1=0`;
          }
        } else if (missedStatusFilter === 'RESOLVED') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({
            where: { followUpStatus: { in: ['RESCHEDULED', 'CANCELLED', 'UNREACHABLE'] } },
            select: { orderId: true },
          });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id IN (${ids})`;
          } else {
            missedFilterCond = ` AND 1=0`;
          }
        }
      }

      const cleanDateFrom = dateFrom.includes(' ') ? dateFrom : `${dateFrom} 00:00:00`;
      const cleanDateTo = dateTo.includes(' ') ? dateTo : `${dateTo} 23:59:59`;

      // 2. Query total count matching filters
      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;
      const countParams: SafeAny[] = [cleanDateFrom, cleanDateTo];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            countSql += ` AND o.assigned_staff_id = ?`;
          } else {
            countSql += ` AND o.created_staff_id = ?`;
          }
          countParams.push(staffLegacyId);
        } else {
          countSql += ` AND 1=0`;
        }
      }

      if (storeId && storeId !== 'all') {
        const storeIds = String(storeId)
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        if (storeIds.length === 1) {
          countSql += ` AND o.client_store_id = ?`;
          countParams.push(storeIds[0]);
        } else if (storeIds.length > 1) {
          countSql += ` AND o.client_store_id IN (${storeIds.join(',')})`;
        }
      }

      const filterType = (type || (status && status !== 'all' ? status : '')).toLowerCase();

      if (filterType === 'completed') {
        countSql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
      } else if (filterType === 'missed') {
        countSql +=
          ` AND ((o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))` +
          missedFilterCond;
      } else if (filterType === 'pending') {
        countSql += ` AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
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
          up_tech.full_name as technicianName,
          up_tech.avatar as technicianAvatar,
          o.client_store_id as storeId,
          COALESCE(csl.client_store_name, 'Estella Place') as branchName,
          COALESCE(up.full_name, 'No Name') as customerName,
          up.avatar as customerAvatar,
          up_created.full_name as bookerName,
          o.created_staff_id as createdStaffId,
          (
            SELECT COALESCE(MAX(uc.phone_number), '')
            FROM user_contact uc
            WHERE uc.user_id = o.user_id AND uc.is_disabled = 0
          ) as customerPhone
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        LEFT JOIN user_profile up_tech ON o.assigned_staff_id = up_tech.user_id
        LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
        LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
      `;

      const params: SafeAny[] = [cleanDateFrom, cleanDateTo];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            sql += ` AND o.assigned_staff_id = ?`;
          } else {
            sql += ` AND o.created_staff_id = ?`;
          }
          params.push(staffLegacyId);
        } else {
          sql += ` AND 1=0`;
        }
      }

      if (storeId && storeId !== 'all') {
        const storeIds = String(storeId)
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        if (storeIds.length === 1) {
          sql += ` AND o.client_store_id = ?`;
          params.push(storeIds[0]);
        } else if (storeIds.length > 1) {
          sql += ` AND o.client_store_id IN (${storeIds.join(',')})`;
        }
      }

      if (filterType === 'completed') {
        sql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
      } else if (filterType === 'missed') {
        sql +=
          ` AND ((o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))` +
          missedFilterCond;
      } else if (filterType === 'pending') {
        sql += ` AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
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

      // Query missed logs from CRM DB for returned appointments
      const missedLogsMap = new Map<number, SafeAny>();
      if (orderIds.length > 0) {
        const missedLogs = await fastify.prisma.crm.crmMissedLog.findMany({
          where: { orderId: { in: orderIds } },
        });
        missedLogs.forEach((ml) => {
          missedLogsMap.set(ml.orderId, {
            id: ml.id,
            orderId: ml.orderId,
            reasonCategory: ml.reasonCategory,
            responsibility: ml.responsibility,
            note: ml.note,
            followUpStatus: ml.followUpStatus,
            createdBy: ml.createdBy,
            createdAt: ml.createdAt ? new Date(ml.createdAt).toISOString() : null,
            updatedAt: ml.updatedAt ? new Date(ml.updatedAt).toISOString() : null,
          });
        });
      }

      const createdStaffIds = Array.from(new Set(result.map((o) => Number(o.createdStaffId)).filter((id) => id > 0)));
      const crmStaffMap = new Map<number, string>();
      if (createdStaffIds.length > 0) {
        const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: createdStaffIds } },
          select: { id: true, displayName: true },
        });
        crmStaffs.forEach((cs) => crmStaffMap.set(cs.id, cs.displayName));
      }

      // Single Source of Truth paystub calculation (Rule #11)
      const startPart = String(dateFrom).split(' ')[0].split('T')[0];
      const endPart = String(dateTo).split(' ')[0].split('T')[0];

      const paystubRes = await getBkPaystubData(
        fastify,
        startPart,
        endPart,
        filterByStaff && staffLegacyId ? [staffLegacyId] : undefined
      );

      let baseSalary = 0;
      let summaryClientBonus = 0;
      let doneBonus = 0;
      let doneLevelCount = 0;
      let missedBonus = 0;
      let missedLevelRate = 0;
      let missedRatePct = 0;
      let tipBonus = 0;
      let summaryTotalTips = 0;
      let revBonus = 0;
      let revLevelRate = 0;
      let revLevelMin = 0;
      let summaryTotalNetRev = 0;
      let totalSalary = 0;
      let totalCompleted = 0;
      let totalMissed = 0;
      let totalPlanned = 0;
      let pendingValue = 0;
      let totalPending = 0;

      if (filterByStaff && staffLegacyId && paystubRes.detailsMap.has(staffLegacyId)) {
        const detail = paystubRes.detailsMap.get(staffLegacyId)!;
        baseSalary = detail.calculatedBaseSalary;
        summaryClientBonus = detail.basicCheckinBonus;
        doneBonus = detail.milestoneBonus;
        doneLevelCount = detail.doneLevelCount;
        missedBonus = detail.penaltyBonus;
        missedLevelRate = detail.missedLevelRate;
        missedRatePct = detail.missedRatePercent;
        tipBonus = detail.tipBonus;
        summaryTotalTips = detail.totalCustomerTip;
        revBonus = detail.revenueBonus;
        revLevelRate = detail.revCommissionRate;
        revLevelMin = detail.revLevelMin;
        summaryTotalNetRev = detail.totalRevenue;
        totalSalary = detail.totalIncome;
        totalCompleted = detail.doneCount;
        totalMissed = detail.missedCount;
        totalPlanned = detail.totalCount;
      } else {
        baseSalary = paystubRes.summary.totalBaseSalary;
        summaryClientBonus = paystubRes.summary.totalBasicCheckinBonus;
        doneBonus = paystubRes.summary.totalMilestoneBonus;
        missedBonus = paystubRes.summary.totalPenaltyBonus;
        tipBonus = paystubRes.summary.totalTipBonus;
        summaryTotalTips = paystubRes.summary.totalCustomerTip;
        revBonus = paystubRes.summary.totalRevenueBonus;
        summaryTotalNetRev = paystubRes.summary.totalRevenue;
        totalSalary = paystubRes.summary.grandTotalIncome;
        totalCompleted = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.doneCount, 0);
        totalMissed = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.missedCount, 0);
        totalPlanned = Array.from(paystubRes.detailsMap.values()).reduce((sum, d) => sum + d.totalCount, 0);
        missedRatePct = totalPlanned > 0 ? Number(((totalMissed / totalPlanned) * 100).toFixed(1)) : 0;
      }

      // Query pending appointments count & value in range
      let pendingSql = `
        SELECT COUNT(*) as totalPending, COALESCE(SUM(o.total_price), 0) as pendingValue
        FROM \`order\` o
        LEFT JOIN \`report_order\` ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
          AND o.order_state NOT IN ('Completed', 'Cancelled', 'Missed')
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= NOW()
      `;
      const pendingParams: SafeAny[] = [new Date(dateFrom), new Date(dateTo)];
      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          pendingSql += ` AND o.assigned_staff_id = ?`;
        } else {
          pendingSql += ` AND o.created_staff_id = ?`;
        }
        pendingParams.push(staffLegacyId);
      }

      const pendingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(pendingSql, ...pendingParams);
      if (pendingRows.length > 0) {
        totalPending = Number(pendingRows[0].totalPending || 0);
        pendingValue = Number(pendingRows[0].pendingValue || 0);
      }

      const checkInRate = totalPlanned > 0 ? Number(((totalCompleted / totalPlanned) * 100).toFixed(1)) : 0;

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

        const checkinInfo = paystubRes.orderCheckinMap.get(Number(row.id));
        if (checkinInfo) {
          bookingBonus = checkinInfo.bonus;
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

            if (checkinInfo?.isCombo) {
              serviceName += ' (Combo - Không hoa hồng)';
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
          technicianName: row.technicianName || null,
          technicianAvatar: row.technicianAvatar || null,
          storeId: row.storeId ? Number(row.storeId) : null,
          branchName: row.branchName || 'Estella Place',
          bookerName: row.bookerName || crmStaffMap.get(Number(row.createdStaffId)) || null,
          missedLog: missedLogsMap.get(Number(row.id)) || null,
        };
      });

      // Calculate accurate working CV capacities per day (excluding weekly OFFs and approved requested OFFs)
      const dailyCapacities: Record<
        string,
        {
          workingKtvCount: number;
          maxCapacity: number;
          workingStaffList?: Array<{ id: number; name: string; branchName?: string; shift?: string }>;
          offStaffList?: Array<{ id: number; name: string; branchName?: string; reason: string; type?: string }>;
        }
      > = {};
      try {
        const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');

        if (cvStaffIds.length > 0) {
          const startDateObj = new Date(cleanDateFrom.split(' ')[0]);
          const endDateObj = new Date(cleanDateTo.split(' ')[0]);
          const cur = new Date(startDateObj);

          // Query fixed store & name for all active CV staff from DB master tables
          const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id as id, full_name as name, client_store_id, avatar
            FROM user_profile
            WHERE user_id IN (${cvStaffIds.join(',')})
              AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0
          `);
          const cvNameMap = new Map<number, string>();
          const cvProfileStoreMap = new Map<number, number>();
          const cvAvatarMap = new Map<number, string | null>();
          cvProfiles.forEach((p) => {
            const uid = Number(p.id);
            cvNameMap.set(uid, String(p.name || '').trim());
            if (p.client_store_id) cvProfileStoreMap.set(uid, Number(p.client_store_id));
            cvAvatarMap.set(uid, p.avatar ? String(p.avatar) : null);
          });

          // Query fixed store from staff_day_off_schedule master
          const dayOffStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, client_store_id
            FROM staff_day_off_schedule
            WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
            GROUP BY user_id
          `);
          const cvStoreMap = new Map<number, string>();
          cvStaffIds.forEach((uid: number) => {
            const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
            const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
            const storeName = finalStoreId === 16 ? 'Estella Place' : 'Đề Thám';
            cvStoreMap.set(uid, storeName);
          });

          // Query exact working shifts per staff from staff_working_shift_schedule
          const shiftRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, start_time, end_time, type, type_value
            FROM staff_working_shift_schedule
            WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
            ORDER BY type DESC
          `);
          const cvShiftMap = new Map<number, string>();
          cvStaffIds.forEach((uid: number) => {
            const userShifts = shiftRows.filter((r) => Number(r.user_id) === uid);
            let shiftLabel = 'Ca Full';
            if (userShifts.length > 0) {
              const primary = userShifts[0];
              const startHour = primary.start_time ? new Date(primary.start_time).getUTCHours() : 9;
              const endHour = primary.end_time ? new Date(primary.end_time).getUTCHours() : 20;

              if (startHour <= 9 && endHour <= 18) {
                shiftLabel = 'Ca Sáng';
              } else if (startHour >= 11 && endHour >= 20) {
                shiftLabel = 'Ca Chiều';
              } else {
                shiftLabel = 'Ca Full';
              }
            }
            cvShiftMap.set(uid, shiftLabel);
          });

          // Filter CV staff pool by storeId if store filter is active
          let activeCvStaffIds = cvStaffIds;
          if (storeId && storeId !== 'all') {
            const requestedStoreIds = String(storeId)
              .split(',')
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n));
            if (requestedStoreIds.length > 0) {
              activeCvStaffIds = cvStaffIds.filter((uid: number) => {
                const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
                const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
                return requestedStoreIds.includes(finalStoreId);
              });
            }
          }

          // Batch query 1: Weekly Offs for active CV staff
          const weeklyOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, weekday
            FROM staff_day_off_schedule
            WHERE is_disabled = 0 AND user_id IN (${activeCvStaffIds.join(',')})
          `);
          const weeklyOffMap = new Map<number, Set<number>>();
          weeklyOffs.forEach((r) => {
            const uid = Number(r.user_id);
            if (!weeklyOffMap.has(uid)) weeklyOffMap.set(uid, new Set());
            weeklyOffMap.get(uid)!.add(Number(r.weekday));
          });

          // Batch query 2: Approved leave requests for date range
          const dateOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT 
              from_user_id as user_id, 
              DATE_FORMAT(from_date, '%Y-%m-%d') as date_str, 
              note,
              attribute_option_id as attributeOptionId,
              DATEDIFF(from_date, date_created) as daysAhead
            FROM staff_day_off
            WHERE request_state = 'Approved'
              AND from_date >= '${cleanDateFrom}' AND from_date <= '${cleanDateTo}'
              AND from_user_id IN (${activeCvStaffIds.join(',')})
          `);
          const dateOffMap = new Map<
            string,
            Map<number, { reason: string; type: 'urgent_off' | 'planned_off'; daysAhead: number }>
          >();
          dateOffs.forEach((r) => {
            const dStr = String(r.date_str);
            if (!dateOffMap.has(dStr)) dateOffMap.set(dStr, new Map());

            const attrOptId = Number(r.attributeOptionId || 0);
            const daysAhead = Number(r.daysAhead || 0);
            const noteText = String(r.note || '').trim();

            const isUrgent =
              attrOptId === 113 || // Bị bệnh / get-sick
              daysAhead <= 0 || // Đăng ký trong ngày
              /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(noteText);

            const offType: 'urgent_off' | 'planned_off' = isUrgent ? 'urgent_off' : 'planned_off';
            const defaultReason = isUrgent ? 'Xin nghỉ phép đột xuất (Gấp)' : 'Xin nghỉ phép (Đã duyệt)';
            const reason = noteText ? noteText : defaultReason;

            dateOffMap.get(dStr)!.set(Number(r.user_id), {
              reason,
              type: offType,
              daysAhead,
            });
          });

          // Batch query 3: Booked orders grouped by date and assigned_staff_id
          const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as date_str,
                   o.assigned_staff_id as user_id, COUNT(DISTINCT o.id) as cnt
            FROM \`order\` o
            LEFT JOIN report_order ro ON o.id = ro.order_id
            WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${cleanDateFrom}'
              AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${cleanDateTo}'
              AND o.assigned_staff_id IN (${activeCvStaffIds.join(',')})
            GROUP BY date_str, o.assigned_staff_id
          `);
          const rangeBookedMap = new Map<string, Map<number, number>>();
          bookedRows.forEach((r) => {
            const dStr = String(r.date_str);
            if (!rangeBookedMap.has(dStr)) rangeBookedMap.set(dStr, new Map());
            rangeBookedMap.get(dStr)!.set(Number(r.user_id), Number(r.cnt || 0));
          });

          // Batch query 4: Completed orders served by staff grouped by date and staff_id
          const doneRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT date_str, staff_id, COUNT(DISTINCT order_id) as cnt
            FROM (
              SELECT DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as date_str,
                     sb.user_id as staff_id, sb.order_id
              FROM staff_bonus sb
              JOIN \`order\` o ON sb.order_id = o.id
              LEFT JOIN report_order ro ON o.id = ro.order_id
              WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${cleanDateFrom}'
                AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${cleanDateTo}'
                AND o.order_state = 'Completed'
                AND sb.user_id IN (${activeCvStaffIds.join(',')})

              UNION

              SELECT DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d') as date_str,
                     o.assigned_staff_id as staff_id, o.id as order_id
              FROM \`order\` o
              LEFT JOIN report_order ro ON o.id = ro.order_id
              WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${cleanDateFrom}'
                AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${cleanDateTo}'
                AND o.order_state = 'Completed'
                AND o.assigned_staff_id IN (${activeCvStaffIds.join(',')})
            ) combined
            GROUP BY date_str, staff_id
          `);
          const rangeDoneMap = new Map<string, Map<number, number>>();
          doneRows.forEach((r) => {
            const dStr = String(r.date_str);
            if (!rangeDoneMap.has(dStr)) rangeDoneMap.set(dStr, new Map());
            rangeDoneMap.get(dStr)!.set(Number(r.staff_id), Number(r.cnt || 0));
          });

          // Batch query 5: Average lash extension speed duration (phút/bộ) per staff member
          const speedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT
              assigned_staff_id as staff_id,
              service_type,
              ROUND(AVG(duration_minute)) as avg_min
            FROM order_service
            WHERE duration_minute > 0 AND duration_minute < 300
              AND date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND assigned_staff_id IN (${activeCvStaffIds.join(',')})
            GROUP BY assigned_staff_id, service_type
          `);

          const staffSpeedMap = new Map<
            number,
            { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number }
          >();
          speedRows.forEach((r) => {
            const sid = Number(r.staff_id);
            const stype = String(r.service_type || '');
            const avgVal = Math.round(Number(r.avg_min || 0));

            if (!staffSpeedMap.has(sid)) staffSpeedMap.set(sid, {});
            const item = staffSpeedMap.get(sid)!;

            if (stype === 'Normal') item.normalAvg = avgVal;
            else if (stype === 'Retain') item.retainAvg = avgVal;
            else if (stype === 'Removal' || stype === 'Fix') item.removalAvg = avgVal;
          });

          // In-memory daily capacities assembly
          while (cur <= endDateObj) {
            const dateStr = cur.toISOString().split('T')[0];
            const jsDay = cur.getDay();
            const legacyWeekday = jsDay === 0 ? 7 : jsDay;

            if (activeCvStaffIds.length === 0) {
              dailyCapacities[dateStr] = {
                workingKtvCount: 0,
                maxCapacity: 0,
                workingStaffList: [],
                offStaffList: [],
              };
              cur.setDate(cur.getDate() + 1);
              continue;
            }

            const dayDateOffMap =
              dateOffMap.get(dateStr) ||
              new Map<number, { reason: string; type: 'urgent_off' | 'planned_off'; daysAhead: number }>();
            const dayBookedMap = rangeBookedMap.get(dateStr) || new Map<number, number>();
            const dayDoneMap = rangeDoneMap.get(dateStr) || new Map<number, number>();

            const workingCvIds = activeCvStaffIds.filter((id: number) => {
              const userWeeklyOffs = weeklyOffMap.get(id);
              const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
              const isDateOff = dayDateOffMap.has(id);
              return !isWeeklyOff && !isDateOff;
            });

            const workingStaffList = workingCvIds.map((id: number) => ({
              id,
              name: cvNameMap.get(id) || `CV #${id}`,
              avatarUrl: cvAvatarMap.get(id) || null,
              branchName: cvStoreMap.get(id) || 'Đề Thám',
              shift: cvShiftMap.get(id) || 'Ca Full',
              bookedCount: dayBookedMap.get(id) || 0,
              doneCount: dayDoneMap.get(id) || 0,
              avgDurationMinutes: staffSpeedMap.get(id),
            }));

            const offStaffList: Array<{
              id: number;
              name: string;
              branchName?: string;
              reason: string;
              type?: string;
            }> = [];
            const weekdayNames = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
            activeCvStaffIds.forEach((id: number) => {
              const userWeeklyOffs = weeklyOffMap.get(id);
              const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
              if (dayDateOffMap.has(id)) {
                const offInfo = dayDateOffMap.get(id)!;
                offStaffList.push({
                  id,
                  name: cvNameMap.get(id) || `CV #${id}`,
                  branchName: cvStoreMap.get(id) || 'Đề Thám',
                  reason: offInfo.reason,
                  type: offInfo.type,
                });
              } else if (isWeeklyOff) {
                offStaffList.push({
                  id,
                  name: cvNameMap.get(id) || `CV #${id}`,
                  branchName: cvStoreMap.get(id) || 'Đề Thám',
                  reason: `Nghỉ hàng tuần (${weekdayNames[legacyWeekday] || ''})`,
                  type: 'weekly_off',
                });
              }
            });

            dailyCapacities[dateStr] = {
              workingKtvCount: workingCvIds.length,
              maxCapacity: workingCvIds.length * 5,
              workingStaffList,
              offStaffList,
            };

            cur.setDate(cur.getDate() + 1);
          }
        }
      } catch (capErr) {
        fastify.log.error(capErr, 'Failed to compute daily KTV capacities');
      }

      return {
        data: appointments,
        total,
        dailyCapacities,
        summary: {
          totalPending,
          totalMissed,
          totalCompleted,
          pendingValue,
          completedRevenue: summaryTotalNetRev,
          totalPlanned,
          totalCheckin: totalCompleted,
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

  // GET /api/customers/cv-realtime-status
  // Real-time CV availability status from legacy order_state + order_staff_queue
  fastify.get('/customers/cv-realtime-status', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = new Date();
      const tzOffset = 7 * 60 * 60 * 1000; // ICT UTC+7
      const nowICT = new Date(now.getTime() + tzOffset);
      const todayStr = nowICT.toISOString().split('T')[0];
      const todayStart = `${todayStr} 00:00:00`;
      const todayEnd = `${todayStr} 23:59:59`;

      // 1. Get active CV staff IDs
      const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
      if (cvStaffIds.length === 0) {
        return { staffStatuses: [], queueByStore: {}, timestamp: nowICT.toISOString() };
      }

      // 2. Query today's staff shift check-in status from staff_working_shift
      // (Only include CVs who HAVE checked in AND HAVE NOT checked out today)
      const checkedInShiftRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT DISTINCT user_id as staffId
        FROM staff_working_shift
        WHERE date = ?
          AND check_in_staff_task_id IS NOT NULL
          AND check_out_staff_task_id IS NULL
      `,
        todayStr
      );
      const checkedInStaffIds = new Set(checkedInShiftRows.map((r: SafeAny) => Number(r.staffId)));
      const workingCvStaffIds = cvStaffIds.filter((id: number) => checkedInStaffIds.has(id));
      const effectiveCvStaffIds = workingCvStaffIds.length > 0 ? workingCvStaffIds : cvStaffIds;

      // 3. Query today's queue from order_staff_queue for working CV staff IDs
      const queueRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT osq.id as queueId, osq.client_store_id as storeId, osq.user_id as staffId,
               osq.order_id as orderId, osq.position, osq.date_assigned as dateAssigned,
               osq.date_skipped as dateSkipped, osq.date_created as dateCreated
        FROM order_staff_queue osq
        WHERE osq.date_created >= ?
          AND osq.user_id IN (${effectiveCvStaffIds.join(',')})
        ORDER BY osq.client_store_id ASC, osq.position ASC
      `,
        todayStart
      );

      const allStaffIds = effectiveCvStaffIds;

      // Current ICT local time string ("YYYY-MM-DD HH:mm:ss")
      const nowICTStr = nowICT.toISOString().replace('T', ' ').slice(0, 19);

      // 4. Get CV profiles with avatar from legacy user_profile + CRM staff fallback
      const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id, full_name, avatar, client_store_id
        FROM user_profile
        WHERE user_id IN (${allStaffIds.join(',')})
      `);

      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: allStaffIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      });
      const crmStaffMap = new Map(crmStaffList.map((s: SafeAny) => [s.id, s]));

      const profileMap = new Map<number, { name: string; avatar: string | null; storeId: number }>();
      allStaffIds.forEach((sid) => {
        const p = cvProfiles.find((row: SafeAny) => Number(row.user_id) === sid);
        const crmS = crmStaffMap.get(sid);
        const name =
          (p?.full_name ? String(p.full_name).trim() : '') ||
          (crmS?.displayName ? String(crmS.displayName).trim() : '') ||
          `CV #${sid}`;
        const avatar = (p?.avatar ? String(p.avatar) : null) || crmS?.avatarUrl || null;
        const storeId = Number(p?.client_store_id || 6);
        profileMap.set(sid, { name, avatar, storeId });
      });

      // 5. Query real-time orders for today — format DATETIME as ICT string to avoid timezone parsing mismatch
      const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          o.id as orderId,
          o.order_state as orderState,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%d %H:%i:%s') as bookStartStr,
          DATE_FORMAT(o.booking_date_end, '%Y-%m-%d %H:%i:%s') as bookEndStr,
          COALESCE(os.assigned_staff_id, os.booked_staff_id, osq.user_id) as ktvId,
          cust_up.full_name as customerName
        FROM \`order\` o
        LEFT JOIN order_service os ON o.id = os.order_id
        LEFT JOIN order_staff_queue osq ON osq.order_id = o.id AND osq.date_assigned IS NOT NULL
        LEFT JOIN user_profile cust_up ON o.user_id = cust_up.user_id
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
          AND o.order_state NOT IN ('Cancelled', 'Missed')
          AND COALESCE(os.assigned_staff_id, os.booked_staff_id, osq.user_id) IN (${allStaffIds.join(',')})
        ORDER BY o.booking_date_start DESC
      `,
        todayStart,
        todayEnd
      );

      // Query real store bookings today (sorted by booking_date_start ASC)
      const upcomingStoreOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          o.id as orderId,
          o.client_store_id as storeId,
          o.order_state as orderState,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%d %H:%i:%s') as bookStartStr,
          cust_up.full_name as customerName
        FROM \`order\` o
        LEFT JOIN user_profile cust_up ON o.user_id = cust_up.user_id
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
          AND o.order_state IN ('New', 'Confirmed')
        ORDER BY o.booking_date_start ASC
      `,
        todayStart,
        todayEnd
      );

      // 6. Build per-CV status with accurate time-slot & order_state recognition
      const staffStatuses = effectiveCvStaffIds
        .map((staffId: number) => {
          const profile = profileMap.get(staffId);
          if (!profile) return null;

          const staffOrders = orderRows.filter((r: SafeAny) => Number(r.ktvId) === staffId);

          let liveStatus = 'IDLE';
          let liveLabel = '🟢 Đang rảnh';
          let currentOrderId = null;
          let currentOrderState = null;
          let currentCustomerName = null;
          let bookingDateEnd = null;
          let estimatedEndMinutes = null;

          // Priority 1: Check if there is an order currently running right now in ICT time
          const runningOrder = staffOrders.find((o: SafeAny) => {
            if (!o.bookStartStr || !o.bookEndStr) return false;
            if (o.orderState === 'Completed') return false;
            return nowICTStr >= o.bookStartStr && nowICTStr <= o.bookEndStr;
          });

          // Priority 2: Check for active order states (excluding stale orders ended > 60m ago)
          const ACTIVE_SERVICING_STATES = [
            'ServiceStart',
            'ServiceCleaned',
            'Consultation',
            'Preparation',
            'CheckIn',
            'ServiceEnd',
          ];
          const stateActiveOrder = staffOrders.find((o: SafeAny) => {
            if (!ACTIVE_SERVICING_STATES.includes(o.orderState)) return false;
            if (o.bookEndStr) {
              const endMs = new Date(o.bookEndStr.replace(' ', 'T') + '+07:00').getTime();
              const endMins = Math.round((endMs - now.getTime()) / 60000);
              if (endMins < -60) return false; // Ignore stale orders ended > 60 minutes ago
            }
            return true;
          });

          const activeOrder = runningOrder || stateActiveOrder;

          if (activeOrder) {
            currentOrderId = Number(activeOrder.orderId);
            currentOrderState = activeOrder.orderState;
            currentCustomerName = activeOrder.customerName ? String(activeOrder.customerName).trim() : null;

            if (activeOrder.bookEndStr) {
              const endMs = new Date(activeOrder.bookEndStr.replace(' ', 'T') + '+07:00').getTime();
              bookingDateEnd = new Date(endMs).toISOString();
              estimatedEndMinutes = Math.round((endMs - nowICT.getTime()) / 60000);
            }

            if (activeOrder.orderState === 'ServiceCleaned') {
              liveStatus = 'ENDING_SOON';
              liveLabel = `🧹 Đang vệ sinh mi${estimatedEndMinutes != null ? ` (còn ${Math.max(0, estimatedEndMinutes)}p)` : ''}`;
            } else if (activeOrder.orderState === 'Consultation') {
              liveStatus = 'BUSY';
              liveLabel = `💬 Đang tư vấn${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else if (activeOrder.orderState === 'ServiceEnd') {
              liveStatus = 'ENDING_SOON';
              liveLabel = `📷 Xong nối mi, chụp ảnh After${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else if (estimatedEndMinutes != null && estimatedEndMinutes < -10) {
              liveStatus = 'OVERTIME';
              liveLabel = `🔴 Quá giờ (${Math.abs(estimatedEndMinutes)}p)`;
            } else if (estimatedEndMinutes != null && estimatedEndMinutes <= 15) {
              liveStatus = 'ENDING_SOON';
              liveLabel = `⚡ Sắp xong (còn ${Math.max(0, estimatedEndMinutes)}p)${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else {
              liveStatus = 'BUSY';
              liveLabel = `🔵 Đang nối mi${estimatedEndMinutes != null ? ` (còn ${Math.max(0, estimatedEndMinutes)}p)` : ''}${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            }
          } else {
            // Check for upcoming bookings today
            const upcomingOrders = staffOrders
              .filter((o: SafeAny) => o.orderState !== 'Completed' && o.bookStartStr && o.bookStartStr > nowICTStr)
              .sort((a: SafeAny, b: SafeAny) => String(a.bookStartStr).localeCompare(String(b.bookStartStr)));

            if (upcomingOrders.length > 0) {
              const nextOrder = upcomingOrders[0];
              const nextStartMs = new Date(nextOrder.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
              const diffMins = Math.round((nextStartMs - now.getTime()) / 60000);

              if (diffMins <= 45) {
                liveStatus = diffMins <= 15 ? 'UPCOMING' : 'LOCKED';
                liveLabel = `🟡 Sắp có khách (${Math.max(0, diffMins)}p nữa)`;
                currentCustomerName = nextOrder.customerName ? String(nextOrder.customerName).trim() : null;
                bookingDateEnd = null;
              }
            }
          }

          const storeId = profile.storeId;
          const storeName = storeId === 16 ? 'Estella Place' : 'Đề Thám';

          return {
            staffId,
            name: profile.name,
            avatar: profile.avatar,
            storeId,
            storeName,
            currentOrderId,
            currentOrderState,
            currentCustomerName,
            bookingDateEnd,
            estimatedEndMinutes,
            liveStatus,
            liveLabel,
          };
        })
        .filter(Boolean);

      // 6. Build queue by store — only include entries that are "waiting" (orderId = null, not skipped)
      const queueByStore: Record<number, SafeAny[]> = {};
      const storeIds = [6, 16]; // Đề Thám, Estella Place

      storeIds.forEach((sid) => {
        // Filter upcoming bookings for this store (exclude past-due bookings late by >30 mins)
        const storeUpcomingBookings = upcomingStoreOrders
          .filter((o: SafeAny) => Number(o.storeId) === sid)
          .filter((o: SafeAny) => {
            const startMs = new Date(o.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
            const diffMins = Math.round((startMs - now.getTime()) / 60000);
            return diffMins >= -30; // Ignore > 30 mins late (considered missed)
          });

        // Get the latest queue entries for this store (only unassigned = waiting in queue)
        const storeQueue = queueRows
          .filter((q: SafeAny) => Number(q.storeId) === sid && !q.orderId && !q.dateSkipped)
          .map((q: SafeAny, idx: number) => {
            const staffId = Number(q.staffId);
            const profile = profileMap.get(staffId);
            const staffStatus = staffStatuses.find((s: SafeAny) => s?.staffId === staffId);

            // Check if this CV has an upcoming booking within 45 minutes
            const upcomingBookings = orderRows.filter(
              (o: SafeAny) =>
                Number(o.ktvId) === staffId &&
                (o.orderState === 'New' || o.orderState === 'Confirmed') &&
                new Date(o.bookStartStr.replace(' ', 'T') + '+07:00').getTime() > now.getTime()
            );
            const nextBooking = upcomingBookings.sort(
              (a: SafeAny, b: SafeAny) =>
                new Date(a.bookStartStr.replace(' ', 'T') + '+07:00').getTime() -
                new Date(b.bookStartStr.replace(' ', 'T') + '+07:00').getTime()
            )[0];
            const nextBookingInMinutes = nextBooking
              ? Math.round(
                  (new Date(nextBooking.bookStartStr.replace(' ', 'T') + '+07:00').getTime() - now.getTime()) / 60000
                )
              : null;
            const isLockedForBooking = nextBookingInMinutes != null && nextBookingInMinutes <= 45;

            // Check if CV is actually available now
            const isAvailableNow = staffStatus ? staffStatus.liveStatus === 'IDLE' : true;

            // Calculate estimated wait time based on actual real booking schedule mapping for queue position
            let estimatedWaitMinutes: number | null = null;
            let mappedBookingTime: string | null = null;

            if (isLockedForBooking && nextBookingInMinutes != null) {
              estimatedWaitMinutes = nextBookingInMinutes;
              mappedBookingTime = nextBooking.bookStartStr ? String(nextBooking.bookStartStr).slice(11, 16) : null;
            } else if (storeUpcomingBookings[idx]) {
              const booking = storeUpcomingBookings[idx];
              const startMs = new Date(booking.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
              const diffMins = Math.round((startMs - now.getTime()) / 60000);
              estimatedWaitMinutes = diffMins; // Can be negative (e.g. -15p, -26p) if late within 30m
              mappedBookingTime = booking.bookStartStr ? String(booking.bookStartStr).slice(11, 16) : null;
            } else {
              // Beyond scheduled bookings today for this store: leave blank (null)
              estimatedWaitMinutes = null;
              mappedBookingTime = null;
            }

            return {
              queueId: Number(q.queueId),
              staffId,
              name: profile?.name || `CV #${staffId}`,
              avatar: profile?.avatar || null,
              storeId: sid,
              position: Number(q.position),
              orderId: null,
              dateAssigned: null,
              dateCreated: q.dateCreated ? new Date(q.dateCreated).toISOString() : '',
              isAvailableNow,
              estimatedWaitMinutes,
              mappedBookingTime,
              isLockedForBooking,
              nextBookingInMinutes,
            };
          });

        queueByStore[sid] = storeQueue;
      });

      return {
        staffStatuses,
        queueByStore,
        timestamp: nowICT.toISOString(),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error, 'CV realtime status error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to get CV realtime status',
      });
    }
  });

  // POST /api/customers/missed/log
  // Upsert missed log reason, responsibility, note, follow-up status, and sync callback date to Daily Plan
  fastify.post('/customers/missed/log', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string; username?: string };
    const {
      orderId,
      reasonCategory,
      responsibility,
      note,
      followUpStatus = 'PENDING',
      callbackDate,
    } = request.body as SafeAny;

    if (!orderId || !reasonCategory || !responsibility) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'orderId, reasonCategory và responsibility là các trường bắt buộc.',
      });
    }

    const numOrderId = Number(orderId);
    const createdBy = user.displayName || user.username || 'Staff';
    const cbDate = callbackDate ? new Date(callbackDate) : null;

    try {
      const log = await fastify.prisma.crm.crmMissedLog.upsert({
        where: { orderId: numOrderId },
        create: {
          orderId: numOrderId,
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
        update: {
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
      });

      // Automatically sync callbackDate to CRM Daily Plan if scheduled
      if (cbDate && followUpStatus === 'CONTACTED') {
        const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id as userId FROM \`order\` WHERE id = ? LIMIT 1`,
          numOrderId
        );
        if (orderRows.length > 0 && orderRows[0].userId) {
          const legacyUserId = Number(orderRows[0].userId);
          const staffId = user.id;
          try {
            await fastify.prisma.crm.crmDailyPlan.upsert({
              where: {
                legacyUserId_plannedDate: {
                  legacyUserId,
                  plannedDate: cbDate,
                },
              },
              create: {
                legacyUserId,
                staffId,
                plannedDate: cbDate,
                bucket: 'MISSED_FOLLOWUP',
                priority: 1,
                status: 'PLANNED',
              },
              update: {
                staffId,
                status: 'PLANNED',
              },
            });
          } catch {
            // Ignore duplicate plan errors if any
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          id: log.id,
          orderId: log.orderId,
          reasonCategory: log.reasonCategory,
          responsibility: log.responsibility,
          note: log.note,
          followUpStatus: log.followUpStatus,
          callbackDate: log.callbackDate ? log.callbackDate.toISOString().slice(0, 10) : null,
          createdBy: log.createdBy,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        },
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Save missed log error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lưu thông tin lý do missed.',
      });
    }
  });

  // GET /api/customers/missed/summary
  // Compute aggregated stats for missed orders in date range
  fastify.get('/customers/missed/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const dFrom = dateFrom ? `${dateFrom} 00:00:00` : `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const dTo = dateTo ? `${dateTo} 23:59:59` : `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    try {
      let storeFilter = '';
      const storeParams: SafeAny[] = [new Date(dFrom), new Date(dTo)];
      if (storeId && storeId !== 'ALL') {
        storeFilter = ' AND o.client_store_id = ?';
        storeParams.push(Number(storeId));
      }

      const countsSql = `
        SELECT 
          COUNT(DISTINCT o.id) as totalPlanned,
          COUNT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as totalMissed,
          GROUP_CONCAT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as missedOrderIdsStr
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ? 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ? ${storeFilter}
      `;

      const countsRes = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countsSql, ...storeParams);
      const totalPlanned = Number(countsRes[0]?.totalPlanned || 0);
      const totalMissed = Number(countsRes[0]?.totalMissed || 0);
      const missedRatePct = totalPlanned > 0 ? Number(((totalMissed / totalPlanned) * 100).toFixed(1)) : 0;

      const missedOrderIdsRaw = countsRes[0]?.missedOrderIdsStr
        ? String(countsRes[0].missedOrderIdsStr)
            .split(',')
            .map((x) => Number(x.trim()))
            .filter((x) => Boolean(x) && !isNaN(x))
        : [];

      let taggedCount = 0;
      const reasonMap = new Map<string, number>();
      const respMap = new Map<string, number>();
      const followUpMap = new Map<string, number>();

      if (missedOrderIdsRaw.length > 0) {
        const logs = await fastify.prisma.crm.crmMissedLog.findMany({
          where: { orderId: { in: missedOrderIdsRaw } },
        });

        taggedCount = logs.length;
        logs.forEach((l) => {
          reasonMap.set(l.reasonCategory, (reasonMap.get(l.reasonCategory) || 0) + 1);
          respMap.set(l.responsibility, (respMap.get(l.responsibility) || 0) + 1);
          followUpMap.set(l.followUpStatus, (followUpMap.get(l.followUpStatus) || 0) + 1);
        });
      }

      const untaggedCount = Math.max(0, totalMissed - taggedCount);
      const taggedRatePct = totalMissed > 0 ? Number(((taggedCount / totalMissed) * 100).toFixed(1)) : 0;

      const REASON_LABELS: Record<string, string> = {
        KH_DOI_HUY_LICH: 'Khách đổi/hủy lịch',
        GOI_KHONG_NGHE: 'Gọi không nghe máy / Thuê bao',
        TIEM_QUATAI: 'Tiệm quá tải / Hết ghế',
        BOOKER_LATHUONG: 'Booker tư vấn sai / Đặt nhầm',
        CV_BAN_LOI: 'CV bận / Phục vụ chậm',
        KTV_BAN_LOI: 'CV bận / Phục vụ chậm',
        KH_QUEN_LICH: 'Khách quên lịch',
        LY_DO_KHAC: 'Lý do khác',
      };

      const RESP_LABELS: Record<string, string> = {
        CUSTOMER: 'Khách hàng',
        BOOKER: 'Booker (Telesales)',
        CC: 'Tư vấn viên (CC)',
        TECHNICIAN: 'Chuyên viên (CV)',
        STORE_SYSTEM: 'Hệ thống / Cửa hàng',
      };

      const FOLLOWUP_LABELS: Record<string, string> = {
        PENDING: 'Chưa xử lý',
        CONTACTED: 'Đã gọi chăm sóc',
        RESCHEDULED: 'Đã đặt lại lịch',
        UNREACHABLE: 'Không liên hệ được',
        CANCELLED: 'Khách hủy hẳn',
      };

      const reasonBreakdown = Object.keys(REASON_LABELS).map((catKey) => {
        const count = reasonMap.get(catKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          reasonCategory: catKey as SafeAny,
          label: REASON_LABELS[catKey],
          count,
          pct,
        };
      });

      const responsibilityBreakdown = Object.keys(RESP_LABELS).map((respKey) => {
        const count = respMap.get(respKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          responsibility: respKey as SafeAny,
          label: RESP_LABELS[respKey],
          count,
          pct,
        };
      });

      const followUpBreakdown = Object.keys(FOLLOWUP_LABELS).map((fuKey) => {
        const count = followUpMap.get(fuKey) || 0;
        return {
          status: fuKey as SafeAny,
          label: FOLLOWUP_LABELS[fuKey],
          count,
        };
      });

      return reply.send({
        totalMissed,
        totalPlanned,
        missedRatePct,
        taggedCount,
        untaggedCount,
        taggedRatePct,
        reasonBreakdown,
        responsibilityBreakdown,
        followUpBreakdown,
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get missed summary error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tính toán thống kê missed.',
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

      // Query KTVs who requested day-off
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND COALESCE(to_date, from_date) AND request_state = 'Approved'`,
        date
      );
      const offUserIds = dayOffs.map((d) => Number(d.from_user_id));

      if (instantiatedShifts.length > 0) {
        roster = instantiatedShifts
          .filter((s) => !offUserIds.includes(Number(s.user_id)))
          .map((s) => ({
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
}
