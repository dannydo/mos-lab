import { FastifyInstance } from 'fastify';
import { SafeAny, isCvRole } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { isAssignmentTimeSort, resolveCustomerListSort } from '../../customer-list-sort.js';
import { createRouteHelpers, parseServiceFilterIds, resolveEffectiveAssignedStaffId } from '../helpers.js';
import { CustomerListQuery } from './customer-list.types.js';
import { resolveCustomerListScope } from './customer-list-prefilter.helper.js';
import { buildCustomerListSql } from './customer-list-query.helper.js';
import { hydrateCustomerListRows } from './customer-list-hydrate.helper.js';

export async function registerCustomerListMainRoutes(fastify: FastifyInstance) {
  const { getNewLocaUserIds } = createRouteHelpers(fastify);

  // GET /api/customers
  // Query legs DB, compute buckets, handle pagination, search, sorting
  fastify.get('/customers', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as CustomerListQuery;
    const {
      bucket,
      page = '1',
      limit = '20',
      sort,
      sortField,
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
      ids,
      hsd30,
      lsd1,
      dateFrom,
      dateTo,
    } = query;

    let limitNum = parseInt(limit, 10) || 20;
    if (ids && ids.trim() !== '') {
      limitNum = ids.split(',').length;
    }
    const pageNum = parseInt(page, 10) || 1;
    const offsetNum = (pageNum - 1) * limitNum;
    const adminUser = request.user as { id: number; role: string };

    if (isCvRole(adminUser?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập danh sách khách hàng CRM.',
      });
    }

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

      const needServiceBalance =
        hsd30 === 'true' ||
        lsd1 === 'true' ||
        sortParam === 'purchaseDate_desc' ||
        sortParam === 'purchaseDate_asc' ||
        sortParam === 'comboPurchaseDate_desc' ||
        sortParam === 'comboPurchaseDate_asc';

      const needSpentFilter =
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

      // A NEW_LOCA request needs this set both while narrowing pre-filters and while
      // building the final SQL predicate. Resolve it once to avoid repeating its UNION query.
      let newLocaUserIdsForRequest: number[] | null = null;
      const resolveNewLocaUserIds = async (): Promise<number[]> => {
        if (newLocaUserIdsForRequest === null) {
          newLocaUserIdsForRequest = await getNewLocaUserIds(dateFrom, dateTo);
        }
        return newLocaUserIdsForRequest;
      };

      const scope = await resolveCustomerListScope({
        fastify,
        adminUser,
        query,
        effectiveAssignedStaffId,
        needSpentFilter,
        needVisits,
        pageNum,
        limitNum,
        resolveNewLocaUserIds,
      });

      if (scope.emptyResponse) {
        return scope.emptyResponse;
      }

      const sqlPlan = await buildCustomerListSql({
        query,
        sortParam,
        needsAssignmentTimeSort,
        needServiceBalance,
        needServiceUsage,
        selectedServiceIds,
        needPromo,
        needReferrals,
        allowedUserIds: scope.allowedUserIds,
        excludedUserIds: scope.excludedUserIds,
        notComboLiveExcludedInMemory: scope.notComboLiveExcludedInMemory,
        pageNum,
        limitNum,
        offsetNum,
        resolveNewLocaUserIds,
      });

      if (sqlPlan.emptyResponse) {
        return sqlPlan.emptyResponse;
      }

      // 4. Main Query: fetch ordered page IDs + total count first, then hydrate the <= limitNum
      // rows directly by primary key so MariaDB/MySQL never re-joins full-table aggregates.
      const [pageIdRows, countResult] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<Array<{ id: number | bigint }>>(
          sqlPlan.pageIdsSql,
          ...sqlPlan.dataParams
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sqlPlan.countSql, ...sqlPlan.countParams),
      ]);

      const total = Number(countResult[0]?.total || 0);
      const pageIds = pageIdRows.map((row) => Number(row.id));

      return await hydrateCustomerListRows({
        fastify,
        pageIds,
        total,
        pageNum,
        limitNum,
        bucket,
        dateFrom,
        dateTo,
        userRole: request.user?.role,
      });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customers list error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customers',
      });
    }
  });
}
