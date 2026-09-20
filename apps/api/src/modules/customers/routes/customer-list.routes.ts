import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { BookingReschedulePermissionService } from '../services/booking-reschedule-permission.service.js';
import { isAssignmentTimeSort, resolveCustomerListSort } from '../customer-list-sort.js';
import { resolveIsForeign, getForeignSqlFilter } from '../services/foreign-customer.service.js';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';
import {
  parseServiceFilterIds,
  buildCompletedServiceUsageJoin,
  resolveEffectiveAssignedStaffId,
  createRouteHelpers,
} from './helpers.js';

function buildSearchCondition(search: string): { sql: string; params: string[] } {
  const rawSearch = search.trim();
  const cleanDigits = rawSearch.replace(/[\s.-]/g, '');
  const isExactOrPrefixPhone = /^\+?[0-9]{8,15}$/.test(cleanDigits);

  if (isExactOrPrefixPhone) {
    const phonePrefix = `${cleanDigits}%`;
    return {
      sql: `EXISTS (
        SELECT 1 
        FROM user_contact uc 
        WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND (uc.phone_number = ? OR uc.phone_number LIKE ?)
      )`,
      params: [cleanDigits, phonePrefix],
    };
  }

  const isPotentialPhone = /^\+?[0-9]{4,7}$/.test(cleanDigits);

  if (isPotentialPhone) {
    const phonePrefix = `${cleanDigits}%`;
    const nameLike = `%${rawSearch}%`;
    return {
      sql: `(
        EXISTS (
          SELECT 1 
          FROM user_contact uc 
          WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND (uc.phone_number = ? OR uc.phone_number LIKE ?)
        ) OR up.full_name LIKE ?
      )`,
      params: [cleanDigits, phonePrefix, nameLike],
    };
  }

  const searchLike = `%${rawSearch}%`;
  return {
    sql: `(
      up.full_name LIKE ? OR EXISTS (
        SELECT 1 
        FROM user_contact uc 
        WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number LIKE ?
      )
    )`,
    params: [searchLike, searchLike],
  };
}

export async function registerCustomerListRoutes(fastify: FastifyInstance) {
  const { getNewLocaUserIds } = createRouteHelpers(fastify);

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
      serviceIds,
      serviceVisitCountMin,
      serviceVisitCountMax,
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
      isForeign,
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
      serviceIds?: string;
      serviceVisitCountMin?: string;
      serviceVisitCountMax?: string;
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
      isForeign?: 'all' | 'foreign' | 'local' | string | boolean;
    };

    let limitNum = parseInt(limit, 10) || 20;
    if (ids && ids.trim() !== '') {
      limitNum = ids.split(',').length;
    }
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    const adminUser = request.user as { id: number; role: string };

    const hasGlobalRescheduleAccess = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
      fastify,
      adminUser
    );
    const effectiveAssignedStaffId = CustomerAccessService.isTelesales(adminUser)
      ? 'me'
      : hasGlobalRescheduleAccess
        ? assignedStaffId
        : resolveEffectiveAssignedStaffId(adminUser, bucket, assignedStaffId);

    try {
      const sortParam = resolveCustomerListSort(sortField || sort, effectiveAssignedStaffId === 'me');
      const needsAssignmentTimeSort = isAssignmentTimeSort(sortParam);

      // Determine what joins and select fields we need in the inner query to optimize performance
      const needServiceBalance = bucket && bucket !== 'ALL';

      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') ||
        (totalSpentMax !== undefined && totalSpentMax !== '') ||
        sortParam === 'totalSpent_desc' ||
        sortParam === 'totalSpent_asc';

      const needVisits =
        (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
        (totalVisitsMax !== undefined && totalVisitsMax !== '');

      const selectedServiceIds = parseServiceFilterIds(serviceIds);
      const needServiceUsage =
        selectedServiceIds.length > 0 ||
        (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') ||
        (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '');

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
      // A NEW_LOCA request needs this set both while narrowing pre-filters and while
      // building the final SQL predicate. Resolve it once to avoid repeating its UNION query.
      let newLocaUserIdsForRequest: number[] | null = null;
      const resolveNewLocaUserIds = async (): Promise<number[]> => {
        if (newLocaUserIdsForRequest === null) {
          newLocaUserIdsForRequest = await getNewLocaUserIds(dateFrom, dateTo);
        }
        return newLocaUserIdsForRequest;
      };

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
        const newLocaUserIds = await resolveNewLocaUserIds();
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
      } else if (bucket === 'COMBO_LIVE') {
        const usbScopeFilter =
          allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : '';
        const comboLiveUserIds = (
          await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number }[]>(
            `SELECT DISTINCT user_id
             FROM user_service_balance
             WHERE (normal_count + retain_count) > 0
               AND (date_expired IS NULL OR date_expired > NOW())
               ${usbScopeFilter}`
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
        if (allowedUserIds !== null) {
          const liveSet = new Set(comboLiveUserIds);
          allowedUserIds = allowedUserIds.filter((id) => liveSet.has(id));
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
          allowedUserIds = comboLiveUserIds;
        }
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
      if (needsAssignmentTimeSort) {
        // This is the same current-owner record used to scope a telesales queue.
        // It deliberately does not read allocation history, so recalled or
        // transferred customers cannot float back into the queue.
        innerJoins +=
          ' LEFT JOIN mos_lab.crm_customer_assignments assignment_sort ON assignment_sort.legacy_user_id = u.id';
      }
      if (needServiceBalance) {
        const isComboLive = bucket === 'COMBO_LIVE';
        const liveCondition = '(normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW())';
        const usbFilterClauses: string[] = [];
        if (usbUserFilter) {
          usbFilterClauses.push(usbUserFilter.replace(/^WHERE\s+/i, ''));
        }
        if (isComboLive) {
          usbFilterClauses.push(liveCondition);
        }
        const finalUsbWhere = usbFilterClauses.length > 0 ? `WHERE ${usbFilterClauses.join(' AND ')}` : '';

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
          ${finalUsbWhere}
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
      if (needServiceUsage) {
        innerJoins += buildCompletedServiceUsageJoin(selectedServiceIds);
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

      const foreignFilterSql = getForeignSqlFilter(isForeign);
      if (foreignFilterSql) {
        innerWhereClauses.push(foreignFilterSql);
      }

      // 1. Filter by Search (Name or Phone using Phone Fast-Path)
      if (search && search.trim() !== '') {
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
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
          const newLocaUserIds = await resolveNewLocaUserIds();
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

      if (selectedServiceIds.length > 0) {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= 1');
      }
      if (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= ?');
        innerParams.push(parseInt(serviceVisitCountMin, 10));
      }
      if (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) <= ?');
        innerParams.push(parseInt(serviceVisitCountMax, 10));
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
      if (sortParam === 'assignedAt_desc') {
        innerOrderBy = 'ORDER BY assignment_sort.assigned_at DESC, u.id DESC';
        outerOrderBy = 'ORDER BY assignmentSortAt DESC, id DESC';
      } else if (sortParam === 'assignedAt_asc') {
        innerOrderBy = 'ORDER BY assignment_sort.assigned_at ASC, u.id ASC';
        outerOrderBy = 'ORDER BY assignmentSortAt ASC, id ASC';
      } else if (
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

      // The total-spent sort must preserve its aggregate in the outer query: SQL may
      // otherwise discard the derived page ordering. All other display-only metrics
      // are hydrated below from the page IDs, rather than grouping their full tables
      // on every paginated request.
      const requiresOuterOrderCounts = sortParam === 'totalSpent_desc' || sortParam === 'totalSpent_asc';
      const outerOrderCountsSelect = requiresOuterOrderCounts
        ? `COALESCE(order_counts.totalSpent, 0) as totalSpent,
          COALESCE(order_counts.totalVisits, 0) as totalVisits,`
        : `0 as totalSpent,
          0 as totalVisits,`;
      const outerOrderCountsJoin = requiresOuterOrderCounts
        ? `LEFT JOIN (
          SELECT
            user_id,
            COALESCE(SUM(total_price), 0) as totalSpent,
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`
        : '';
      const outerAssignmentSortSelect = needsAssignmentTimeSort
        ? 'assignment_sort.assigned_at as assignmentSortAt,'
        : 'NULL as assignmentSortAt,';
      const outerAssignmentSortJoin = needsAssignmentTimeSort
        ? 'LEFT JOIN mos_lab.crm_customer_assignments assignment_sort ON assignment_sort.legacy_user_id = u.id'
        : '';

      // 4. Main Query (deferred pagination; page-scoped metrics are hydrated below)
      const querySql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar, 
          up.is_foreign as isForeign,
          up.is_foreign_overridden as isForeignOverridden,
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
          ${outerAssignmentSortSelect}
          ${outerOrderCountsSelect}
          0 as totalPromotionsUsed,
          0 as totalReferrals,
          'SINGLE' as bucket,
          0 as normalCount,
          0 as retainCount,
          NULL as expiryDate
        FROM (
          ${innerQuerySql}
          LIMIT ? OFFSET ?
        ) as p
        JOIN user u ON u.id = p.id
        LEFT JOIN user_profile up ON u.id = up.user_id
        ${outerAssignmentSortJoin}
        ${outerOrderCountsJoin}
        ${outerOrderBy}
      `;

      // Count Query for Pagination using subquery (without expensive inner ORDER BY)
      const countSql = `
        SELECT COUNT(*) as total FROM (
          SELECT u.id
          FROM user u
          ${innerJoins}
          ${innerWhereString}
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

      const customerIds = dataResult.map((row: SafeAny) => Number(row.id));
      const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

      // All enrichments depend only on the page IDs, so run them together
      // instead of adding a full database round trip for each section.
      const [
        assignments,
        assignmentHistories,
        activeBatchItems,
        latestBookings,
        latestCallbacks,
        latestDailyPlans,
        latestCalls,
        pageOrderMetrics,
        pageReferralMetrics,
        pageBalanceMetrics,
      ] = await Promise.all([
        customerIds.length > 0
          ? fastify.prisma.crm.crmCustomerAssignment.findMany({
              where: { legacyUserId: { in: customerIds } },
              select: {
                legacyUserId: true,
                assignedAt: true,
                staff: { select: { id: true, displayName: true, username: true } },
              },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.crm.crmAssignmentHistory.findMany({
              where: {
                legacyUserId: { in: customerIds },
                isUndone: false,
                newStaffId: { not: null },
              },
              select: {
                legacyUserId: true,
                assignedAt: true,
                newStaff: { select: { displayName: true } },
              },
              orderBy: { assignedAt: 'desc' },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.crm.crmAllocationBatchItem.findMany({
              where: {
                customerId: { in: customerIds },
                status: 'PENDING_ACCEPT',
                batch: { status: 'PENDING_ACCEPT' },
              },
              select: {
                customerId: true,
                status: true,
                createdAt: true,
                batch: {
                  select: {
                    status: true,
                    booker: { select: { id: true, displayName: true, username: true } },
                  },
                },
              },
              orderBy: { id: 'desc' },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT o.user_id as userId, o.booking_date_start as bookingDate, o.order_state as orderState
               FROM \`order\` o
               WHERE o.id IN (
                 SELECT MAX(id)
                 FROM \`order\`
                 WHERE user_id IN (${customerIds.join(',')})
                 GROUP BY user_id
               )`
            )
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.crm.crmCallLog.findMany({
              where: {
                legacyUserId: { in: customerIds },
                callbackDate: { not: null },
              },
              select: { legacyUserId: true, callbackDate: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.crm.crmDailyPlan.findMany({
              where: {
                legacyUserId: { in: customerIds },
                plannedDate: { gte: startOfToday },
              },
              select: { legacyUserId: true, plannedDate: true },
              orderBy: { plannedDate: 'asc' },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.crm.crmCallLog.findMany({
              where: { legacyUserId: { in: customerIds } },
              select: {
                legacyUserId: true,
                createdAt: true,
                durationSec: true,
                callResult: true,
                note: true,
              },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT
                 user_id as userId,
                 COALESCE(SUM(total_price), 0) as totalSpent,
                 COUNT(*) as totalVisits,
                 SUM(CASE WHEN promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL THEN 1 ELSE 0 END) as totalPromotionsUsed
               FROM \`order\`
               WHERE order_state = 'Completed' AND user_id IN (${customerIds.join(',')})
               GROUP BY user_id`
            )
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT referrer_user_id as userId, COUNT(*) as totalReferrals
               FROM user_profile
               WHERE referrer_user_id IN (${customerIds.join(',')})
               GROUP BY referrer_user_id`
            )
          : Promise.resolve([]),
        customerIds.length > 0
          ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
              `SELECT
                 user_id as userId,
                 SUM(CASE
                   WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1
                   ELSE 0
                 END) as live_count,
                 SUM(normal_count) as normalCount,
                 SUM(retain_count) as retainCount,
                 MAX(date_expired) as expiryDate
               FROM user_service_balance
               WHERE user_id IN (${customerIds.join(',')})
               GROUP BY user_id`
            )
          : Promise.resolve([]),
      ]);

      const orderMetricMap = new Map(pageOrderMetrics.map((metric) => [Number(metric.userId), metric]));
      const referralMetricMap = new Map(pageReferralMetrics.map((metric) => [Number(metric.userId), metric]));
      const balanceMetricMap = new Map(pageBalanceMetrics.map((metric) => [Number(metric.userId), metric]));

      // Keep the response's numeric and bucket semantics identical to the former
      // outer joins while limiting metric aggregation to this response page.
      dataResult.forEach((row: SafeAny) => {
        const customerId = Number(row.id);
        const orderMetric = orderMetricMap.get(customerId);
        const referralMetric = referralMetricMap.get(customerId);
        const balanceMetric = balanceMetricMap.get(customerId);

        row.totalSpent = orderMetric?.totalSpent || 0;
        row.totalVisits = orderMetric?.totalVisits || 0;
        row.totalPromotionsUsed = orderMetric?.totalPromotionsUsed || 0;
        row.totalReferrals = referralMetric?.totalReferrals || 0;
        row.bucket = !balanceMetric
          ? 'SINGLE'
          : Number(balanceMetric.live_count || 0) > 0
            ? 'COMBO_LIVE'
            : 'COMBO_DEAD';
        row.normalCount = balanceMetric?.normalCount || 0;
        row.retainCount = balanceMetric?.retainCount || 0;
        row.expiryDate = balanceMetric?.expiryDate || null;
      });

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

      activeBatchItems.forEach((bi) => {
        if (CustomerAccessService.isPendingAllocationOwner(bi) && bi.batch?.booker) {
          assignmentMap.set(bi.customerId, {
            id: bi.batch.booker.id,
            displayName: `${bi.batch.booker.displayName} (Chờ xác nhận)`,
            username: bi.batch.booker.username,
            assignedAt: bi.createdAt ? bi.createdAt.toISOString() : null,
            status: bi.status,
          });
        }
      });

      const bookingMap = new Map();
      latestBookings.forEach((b) => {
        bookingMap.set(Number(b.userId), {
          bookingDate: b.bookingDate,
          orderState: b.orderState,
        });
      });

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

        const isForeignVal = resolveIsForeign(row.isForeign, row.isForeignOverridden, row.phone);

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
          isForeign: isForeignVal,
          isForeignOverridden: Boolean(row.isForeignOverridden),
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
          // `assignedAt` is a current-owner field. Historical allocation evidence stays
          // isolated in `lastAllocation`, so an unassigned customer never looks owned.
          assignedAt: assigned?.assignedAt || null,
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
      serviceIds,
      serviceVisitCountMin,
      serviceVisitCountMax,
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
      const needServiceBalance = bucket && bucket !== 'ALL';
      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') || (totalSpentMax !== undefined && totalSpentMax !== '');
      const needVisits =
        (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
        (totalVisitsMax !== undefined && totalVisitsMax !== '');
      const selectedServiceIds = parseServiceFilterIds(serviceIds);
      const needServiceUsage =
        selectedServiceIds.length > 0 ||
        (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') ||
        (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '');
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
        const isComboLive = bucket === 'COMBO_LIVE';
        const liveFilter = isComboLive
          ? 'WHERE (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW())'
          : '';

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
          ${liveFilter}
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
      if (needServiceUsage) {
        innerJoins += buildCompletedServiceUsageJoin(selectedServiceIds);
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

      const effectiveAssignedStaffId = CustomerAccessService.isTelesales(currentUser) ? 'me' : assignedStaffId;

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
            let targetStaffId =
              effectiveAssignedStaffId === 'me' ? Number(currentUser?.id) : adminUser ? adminUser.id : 0;
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
          where: { staffId: { not: null } },
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
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
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
      if (selectedServiceIds.length > 0) {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= 1');
      }
      if (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= ?');
        innerParams.push(parseInt(serviceVisitCountMin, 10));
      }
      if (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) <= ?');
        innerParams.push(parseInt(serviceVisitCountMax, 10));
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
        const selectedAt = new Date();
        await fastify.prisma.crm.$transaction(async (tx) => {
          for (const customerId of ids) {
            await AllocationLedgerService.append(tx, {
              customerId,
              eventType: 'RANDOM_SELECTED',
              actorStaffId: actingUser.id,
              reason: 'Khách được chọn trong bộ lọc ngẫu nhiên để phân bổ',
              sourceType: 'RANDOM',
              actionContext: 'RANDOM_CUSTOMER_SELECTION',
              batchId,
              metadata: { filters: request.query },
              occurredAt: selectedAt,
            });
          }
          await tx.crmAssignmentHistory.createMany({
            data: ids.map((cid) => ({
              batchId,
              legacyUserId: cid,
              prevStaffId: null,
              newStaffId: null,
              assignedBy: actingUser.id,
              assignedAt: selectedAt,
              sourceType: 'RANDOM',
              sourceFilterJson: JSON.stringify(request.query),
              sourceFilterSummary,
              actionType: 'RANDOM_SELECT',
            })),
          });
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
}
