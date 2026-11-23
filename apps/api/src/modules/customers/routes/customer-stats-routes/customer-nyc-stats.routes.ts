import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { buildSearchCondition } from '../helpers.js';
import { CampaignStatsResult, DEFAULT_NYC_TOUCHPOINTS_CONFIG } from './customer-stats.types.js';
import { buildTouchpointSelects, resolveSimpleStaffScope } from './customer-stats-helpers.js';

function createEmptyNycStats(): CampaignStatsResult {
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

async function computeNycStats(
  fastify: FastifyInstance,
  adminUser: SafeAny,
  search: string | undefined,
  effectiveAssignedStaffId: string | undefined
): Promise<CampaignStatsResult> {
  const { isEmpty, allowedUserIds, excludedUserIds } = await resolveSimpleStaffScope(
    fastify,
    adminUser,
    effectiveAssignedStaffId
  );

  if (isEmpty) {
    return createEmptyNycStats();
  }

  // Run active combo exclusion prequery and NYC touchpoints config fetch in parallel
  const [liveComboRows, config] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<Array<{ user_id: number }>>(`
      SELECT DISTINCT user_id 
      FROM user_service_balance 
      WHERE (normal_count > 0 OR retain_count > 0) 
        AND (service_group IS NULL OR service_group != 'LashesUnder') 
        AND (date_expired IS NULL OR date_expired > NOW())
    `),
    fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
    }),
  ]);
  const liveComboUserIds = liveComboRows.map((r) => r.user_id);

  const innerWhereClauses: string[] = [
    '(up.is_deleted IS NULL OR up.is_deleted = 0)',
    '(up.is_disabled IS NULL OR up.is_disabled = 0)',
    'up.last_order_booking IS NOT NULL',
    `EXISTS (
      SELECT 1 FROM user_contact uc
      WHERE uc.user_id = u.id AND uc.is_disabled = 0 AND uc.phone_number IS NOT NULL AND TRIM(uc.phone_number) != ''
    )`,
  ];

  if (liveComboUserIds.length > 0) {
    innerWhereClauses.push(`u.id NOT IN (${liveComboUserIds.join(',')})`);
  }
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

  const activeConfigs: Record<string, SafeAny[]> = config
    ? JSON.parse(config.value)
    : (DEFAULT_NYC_TOUCHPOINTS_CONFIG as unknown as Record<string, SafeAny[]>);

  // Extract all touchpoints across all NYC tabs
  const allTouchpoints: SafeAny[] = [];
  Object.values(activeConfigs).forEach((tps) => {
    if (Array.isArray(tps)) {
      allTouchpoints.push(...tps);
    }
  });

  const tpSelects = buildTouchpointSelects(allTouchpoints);

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
        DATEDIFF(CURDATE(), up.last_order_booking) as daysSinceLastVisit
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

  return { tabs, touchpoints };
}

export async function registerCustomerNycStatsRoutes(fastify: FastifyInstance) {
  // Per-registration in-flight deduplication and SWR timestamp tracking for NYC batch stats
  const inFlightNycStatsPromises = new Map<string, Promise<CampaignStatsResult>>();
  const nycStatsComputedAt = new Map<string, number>();

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
      const isRefresh =
        request.query && ((request.query as SafeAny).refresh === 'true' || (request.query as SafeAny).refresh === true);
      const cacheKey = `nyc_stats:${effectiveScope}:${JSON.stringify(request.query)}`;
      const now = Date.now();

      if (!isRefresh) {
        const cachedStats = fastify.cache.get<CampaignStatsResult>(cacheKey);
        if (cachedStats) {
          const computedAt = nycStatsComputedAt.get(cacheKey) || now;
          const age = now - computedAt;

          // 1. FRESH (< 120s): Return directly from RAM, 0ms latency
          if (age < 120_000) {
            return cachedStats;
          }

          // 2. STALE-WHILE-REVALIDATE (120s - 600s): Return stale immediately (0ms) and revalidate in background
          if (!inFlightNycStatsPromises.has(cacheKey)) {
            const revalidatePromise = (async () => {
              try {
                const freshStats = await computeNycStats(fastify, adminUser, search, effectiveAssignedStaffId);
                nycStatsComputedAt.set(cacheKey, Date.now());
                fastify.cache.set(cacheKey, freshStats, 600_000);
                return freshStats;
              } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                fastify.log.warn(`[NycStats] Background SWR revalidation failed: ${errMsg}`);
                return cachedStats;
              } finally {
                inFlightNycStatsPromises.delete(cacheKey);
              }
            })();
            inFlightNycStatsPromises.set(cacheKey, revalidatePromise);
          }

          return cachedStats;
        }

        // 3. CACHE MISS: Single-flight deduplication
        const inFlight = inFlightNycStatsPromises.get(cacheKey);
        if (inFlight) {
          return await inFlight;
        }
      }

      // Compute on cache miss or manual refresh
      const computePromise = (async () => {
        try {
          const stats = await computeNycStats(fastify, adminUser, search, effectiveAssignedStaffId);
          nycStatsComputedAt.set(cacheKey, Date.now());
          fastify.cache.set(cacheKey, stats, 600_000);
          return stats;
        } finally {
          inFlightNycStatsPromises.delete(cacheKey);
        }
      })();

      if (!isRefresh) {
        inFlightNycStatsPromises.set(cacheKey, computePromise);
      }

      const stats = await computePromise;
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
