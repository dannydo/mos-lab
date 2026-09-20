import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { parseComboDateBounds } from '../services/combo-recognition.service.js';
import { BookingReschedulePermissionService } from '../services/booking-reschedule-permission.service.js';
import { getForeignSqlFilter } from '../services/foreign-customer.service.js';
import {
  parseServiceFilterIds,
  buildCompletedServiceUsageJoin,
  resolveEffectiveAssignedStaffId,
  createRouteHelpers,
  buildSearchCondition,
} from './helpers.js';

export async function registerCustomerStatsRoutes(fastify: FastifyInstance) {
  const { getNewLocaUserIds } = createRouteHelpers(fastify);

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
      bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE' | 'NEW_LOCA';
      search?: string;
      ids?: string;
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

    const adminUser = request.user as { id: number; role: string };

    const hasGlobalRescheduleAccess = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
      fastify,
      adminUser
    );
    const dbVersion = await getStatsDbVersion(fastify);
    const cacheKey = `cust_stats:${adminUser?.id || 0}:${adminUser?.role || ''}:${dbVersion}:global-schedule-${hasGlobalRescheduleAccess}:${JSON.stringify(request.query)}`;
    const cachedStats = fastify.cache.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const effectiveAssignedStaffId = CustomerAccessService.isTelesales(adminUser)
      ? 'me'
      : hasGlobalRescheduleAccess
        ? assignedStaffId
        : resolveEffectiveAssignedStaffId(adminUser, bucket, assignedStaffId);

    try {
      // Determine what joins and select fields we need in the inner query to optimize performance
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

      const isDefaultView =
        (!search || search.trim() === '') &&
        (!bucket || bucket === 'ALL') &&
        (!effectiveAssignedStaffId || effectiveAssignedStaffId === 'all') &&
        (assignedDaysMin === undefined || assignedDaysMin === '') &&
        (assignedDaysMax === undefined || assignedDaysMax === '') &&
        (daysSinceLastVisitMin === undefined || daysSinceLastVisitMin === '') &&
        (daysSinceLastVisitMax === undefined || daysSinceLastVisitMax === '') &&
        !needSpent &&
        !needVisits &&
        !needServiceUsage &&
        !needPromo &&
        !needReferrals &&
        (dobMonth === undefined || dobMonth === '' || dobMonth === 'ALL') &&
        !birthdayPreset &&
        (ageMin === undefined || ageMin === '') &&
        (ageMax === undefined || ageMax === '') &&
        (!callStatuses || callStatuses.trim() === '') &&
        (lastCallDaysMin === undefined || lastCallDaysMin === '') &&
        (lastCallDaysMax === undefined || lastCallDaysMax === '') &&
        (!isForeign || isForeign === 'all') &&
        retainedOnly !== 'true' &&
        (!allocationBatchId || allocationBatchId.trim() === '') &&
        (!ids || ids.trim() === '');

      if (isDefaultView) {
        const isTrash = trash === 'true';
        const deletedFilter = isTrash ? 'up.is_deleted = 1' : 'COALESCE(up.is_deleted, 0) = 0';

        const [totRows, usbRows] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT COUNT(*) as total 
            FROM user u 
            LEFT JOIN user_profile up ON u.id = up.user_id 
            WHERE ${deletedFilter}
          `),
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT 
              SUM(CASE WHEN live_count > 0 THEN 1 ELSE 0 END) as comboLive,
              SUM(CASE WHEN live_count = 0 THEN 1 ELSE 0 END) as comboDead,
              SUM(CASE WHEN live_count > 0 AND expiryDate IS NOT NULL AND DATEDIFF(expiryDate, NOW()) BETWEEN 0 AND 30 THEN 1 ELSE 0 END) as hsd30,
              SUM(CASE WHEN live_count > 0 AND (COALESCE(normalCount, 0) + COALESCE(retainCount, 0)) = 1 THEN 1 ELSE 0 END) as lsd1
            FROM (
              SELECT 
                usb.user_id,
                SUM(CASE WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 1 ELSE 0 END) as live_count,
                SUM(usb.normal_count) as normalCount,
                SUM(usb.retain_count) as retainCount,
                MAX(usb.date_expired) as expiryDate
              FROM user_service_balance usb
              JOIN user_profile up ON up.user_id = usb.user_id AND ${deletedFilter}
              GROUP BY usb.user_id
            ) t
          `),
        ]);

        const total = Number(totRows[0]?.total || 0);
        const usb = usbRows[0] || {};
        const comboLive = Number(usb.comboLive || 0);
        const comboDead = Number(usb.comboDead || 0);
        const single = Math.max(0, total - comboLive - comboDead);

        const stats = {
          total,
          comboLive,
          comboDead,
          single,
          notComboLive: total - comboLive,
          hsd30: Number(usb.hsd30 || 0),
          lsd1: Number(usb.lsd1 || 0),
        };

        fastify.cache.set(cacheKey, stats, 120000);
        return stats;
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

      const usbUserFilter =
        allowedUserIds !== null && allowedUserIds.length > 0 ? `WHERE user_id IN (${allowedUserIds.join(',')})` : '';

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
        ${usbUserFilter}
        GROUP BY user_id
      ) as usb_agg ON u.id = usb_agg.user_id`;
      if (needOrderCounts) {
        statsInnerJoins += ` LEFT JOIN (
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
        statsInnerJoins += buildCompletedServiceUsageJoin(selectedServiceIds);
      }
      if (needPromo) {
        statsInnerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL) ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
      }
      if (needReferrals) {
        statsInnerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND referrer_user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
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

      const foreignFilterSqlStats = getForeignSqlFilter(isForeign);
      if (foreignFilterSqlStats) {
        innerWhereClauses.push(foreignFilterSqlStats);
      }

      // 1. Filter by Search (Name or Phone using Phone Fast-Path)
      if (search && search.trim() !== '') {
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
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

      fastify.cache.set(cacheKey, stats, 120000);
      return stats;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customers stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve stats',
      });
    }
  });

  let lastStatsDbVersion = '';
  let lastStatsDbVersionCheckedAt = 0;

  async function getStatsDbVersion(fastify: FastifyInstance): Promise<string> {
    const now = Date.now();
    if (lastStatsDbVersion && now - lastStatsDbVersionCheckedAt < 2000) {
      return lastStatsDbVersion;
    }
    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<{ max_order_id: number; max_usb_id: number }[]>(`
      SELECT 
        (SELECT MAX(id) FROM \`order\`) as max_order_id,
        (SELECT MAX(id) FROM user_service_balance) as max_usb_id
    `);
      const r = rows && rows[0] ? rows[0] : { max_order_id: 0, max_usb_id: 0 };
      lastStatsDbVersion = `${r.max_order_id || 0}:${r.max_usb_id || 0}`;
      lastStatsDbVersionCheckedAt = now;
      return lastStatsDbVersion;
    } catch {
      return `${Date.now()}`;
    }
  }

  // GET /api/customers/loca-stats
  // Batch stats endpoint for LoCa campaign: returns all tab counts and touchpoint counts in 1 SQL query
  fastify.get('/customers/loca-stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { search, assignedStaffId, dateFrom, dateTo, customTouchpoints } = request.query as SafeAny;

      const adminUser = request.user;
      let effectiveAssignedStaffId = assignedStaffId;

      if (CustomerAccessService.isTelesales(adminUser)) {
        effectiveAssignedStaffId = 'me';
      }

      const effectiveScope =
        effectiveAssignedStaffId === 'me' ? `staff:${adminUser?.id || 0}` : effectiveAssignedStaffId || 'all';
      const dbVersion = await getStatsDbVersion(fastify);
      const cacheKey = `loca_stats:${effectiveScope}:${dbVersion}:${JSON.stringify(request.query)}`;
      const cachedStats = fastify.cache.get<{ tabs: Record<string, number>; touchpoints: Record<string, number> }>(
        cacheKey
      );
      if (cachedStats) {
        return cachedStats;
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

      if (allowedUserIds !== null && allowedUserIds.length === 0) {
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

      // Driving from usb_agg (HAVING live_count > 0) already ensures active balance,
      // eliminating the need for full-table scans and redundant EXISTS subqueries on user table.
      const innerWhereClauses: string[] = ['COALESCE(up.is_deleted, 0) = 0'];
      const innerParams: SafeAny[] = [];

      if (allowedUserIds !== null && allowedUserIds.length > 0) {
        innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
      }
      if (excludedUserIds !== null && excludedUserIds.length > 0) {
        innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
      }

      if (search && search.trim() !== '') {
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
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
              AND (
                (ro_nl.actual_booking_date_start >= '${nlDateFrom}' AND ro_nl.actual_booking_date_start <= '${nlDateTo}')
                OR (
                  ro_nl.actual_booking_date_start IS NULL
                  AND o_nl.booking_date_start >= '${nlDateFrom}' AND o_nl.booking_date_start <= '${nlDateTo}'
                )
              )
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
          ? `WHERE user_id IN (${allowedUserIds.join(',')}) AND (normal_count + retain_count) > 0`
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
            1 as is_combo_live,
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
          FROM (
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
            HAVING live_count > 0
          ) as usb_agg
          JOIN user u ON u.id = usb_agg.user_id
          LEFT JOIN user_profile up ON u.id = up.user_id
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

      const stats = { tabs, touchpoints };
      fastify.cache.set(cacheKey, stats, 300000); // 5 minutes TTL, auto-invalidated by dbVersion
      return stats;
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

      if (CustomerAccessService.isTelesales(adminUser)) {
        effectiveAssignedStaffId = 'me';
      }

      const effectiveScope =
        effectiveAssignedStaffId === 'me' ? `staff:${adminUser?.id || 0}` : effectiveAssignedStaffId || 'all';
      const dbVersion = await getStatsDbVersion(fastify);
      const cacheKey = `nyc_stats:${effectiveScope}:${dbVersion}:${JSON.stringify(request.query)}`;
      const cachedStats = fastify.cache.get<{ tabs: Record<string, number>; touchpoints: Record<string, number> }>(
        cacheKey
      );
      if (cachedStats) {
        return cachedStats;
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
        'up.last_order_booking IS NOT NULL',
        `NOT EXISTS (
          SELECT 1 FROM user_service_balance usb
          WHERE usb.user_id = u.id
            AND (usb.normal_count + usb.retain_count) > 0
            AND (usb.date_expired IS NULL OR usb.date_expired > NOW())
        )`,
      ];
      const innerParams: SafeAny[] = [];

      if (allowedUserIds !== null) {
        innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
      }
      if (excludedUserIds !== null && excludedUserIds.length > 0) {
        innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
      }

      if (search && search.trim() !== '') {
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
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

      const stats = { tabs, touchpoints };
      fastify.cache.set(cacheKey, stats, 300000); // 5 minutes TTL, auto-invalidated by dbVersion
      return stats;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get NYC stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve NYC stats',
      });
    }
  });
}
