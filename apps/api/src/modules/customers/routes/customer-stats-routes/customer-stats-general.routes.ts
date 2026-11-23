import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { SafeAny, isCvRole } from '@mos-lab/shared';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { parseServiceFilterIds, resolveEffectiveAssignedStaffId, createRouteHelpers } from '../helpers.js';
import { CustomerStatsQuery, CustomerStatsUser, createEmptyCustomerStats } from './customer-stats.types.js';
import { createStatsDbVersionGetter } from './customer-stats-helpers.js';
import { computeDefaultViewStats, isDefaultCustomerStatsView } from './customer-stats-default-view.helper.js';
import { resolveCustomerStatsScope } from './customer-stats-scope.helper.js';
import { aggregateCustomerBucketStats, queryMatchingCustomerIds } from './customer-stats-query.helper.js';

export async function registerCustomerGeneralStatsRoutes(fastify: FastifyInstance) {
  const { getNewLocaUserIds } = createRouteHelpers(fastify);
  const getStatsDbVersion = createStatsDbVersionGetter();

  // GET /api/customers/stats
  // Return count per bucket (COMBO_LIVE, COMBO_DEAD, SINGLE)
  fastify.get('/customers/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as CustomerStatsQuery;
    const {
      bucket,
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
      trash,
      hsd30,
      lsd1,
    } = query;

    const adminUser = request.user as CustomerStatsUser;

    if (isCvRole(adminUser?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập thống kê khách hàng CRM.',
      });
    }

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

      if (
        isDefaultCustomerStatsView({
          query,
          effectiveAssignedStaffId,
          needSpent,
          needVisits,
          needServiceUsage,
          needPromo,
          needReferrals,
        })
      ) {
        const stats = await computeDefaultViewStats(fastify, trash);
        fastify.cache.set(cacheKey, stats, 120000);
        return stats;
      }

      const scope = await resolveCustomerStatsScope({
        fastify,
        adminUser,
        query,
        effectiveAssignedStaffId,
        needOrderCounts,
      });

      if (scope.isEmpty) {
        return createEmptyCustomerStats();
      }

      const matchingRows = await queryMatchingCustomerIds({
        fastify,
        query,
        allowedUserIds: scope.allowedUserIds,
        excludedUserIds: scope.excludedUserIds,
        selectedServiceIds,
        needServiceUsage,
        needPromo,
        needReferrals,
        getNewLocaUserIds,
      });

      const stats = aggregateCustomerBucketStats({
        matchingRows,
        elsaSet: scope.elsaSet,
        liveUsbMap: scope.liveUsbMap,
        anyUsbSet: scope.anyUsbSet,
        bucket,
        hsd30,
        lsd1,
      });

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
}
