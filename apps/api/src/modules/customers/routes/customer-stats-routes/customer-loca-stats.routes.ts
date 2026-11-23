import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { ComboRecognitionService } from '../../services/combo-recognition.service.js';
import { buildSearchCondition } from '../helpers.js';
import { CampaignStatsResult, DEFAULT_LOCA_TOUCHPOINTS } from './customer-stats.types.js';
import { buildTouchpointSelects, resolveSimpleStaffScope } from './customer-stats-helpers.js';

function createEmptyLocaStats(): CampaignStatsResult {
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

export async function registerCustomerLocaStatsRoutes(fastify: FastifyInstance) {
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
      const isRefresh =
        request.query && ((request.query as SafeAny).refresh === 'true' || (request.query as SafeAny).refresh === true);
      const querySearch = typeof search === 'string' ? search.trim() : '';
      const queryDateFrom = dateFrom || '';
      const queryDateTo = dateTo || '';
      const queryCustomTp =
        typeof customTouchpoints === 'string' ? customTouchpoints : JSON.stringify(customTouchpoints || '');
      const cacheKey = `loca_stats:${effectiveScope}:${queryDateFrom}:${queryDateTo}:${querySearch}:${queryCustomTp}`;
      if (!isRefresh) {
        const cachedStats = fastify.cache.get<CampaignStatsResult>(cacheKey);
        if (cachedStats) {
          return cachedStats;
        }
      }

      const { isEmpty, allowedUserIds, excludedUserIds } = await resolveSimpleStaffScope(
        fastify,
        adminUser,
        effectiveAssignedStaffId
      );

      if (isEmpty || (allowedUserIds !== null && allowedUserIds.length === 0)) {
        return createEmptyLocaStats();
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
      const defaultTouchpoints = [...DEFAULT_LOCA_TOUCHPOINTS];
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

      // Optimization: Pre-fetch small ID sets in parallel to eliminate heavy correlated subqueries in batchSql:
      // 1. Future bookings (~185 IDs, ~5ms)
      // 2. Callbacks (~30 IDs, ~50ms)
      // 3. New LoCa in period (~40 IDs, ~450ms)
      // 4. Product buyers (~138 IDs, ~10ms)
      const [futureBookingRows, callbackRows, newLocaUserIds, productRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<Array<{ user_id: number }>>(`
          SELECT DISTINCT user_id FROM \`order\` WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed')
        `),
        fastify.prisma.crm.$queryRawUnsafe<Array<{ legacy_user_id: number }>>(`
          SELECT DISTINCT legacy_user_id FROM crm_call_logs WHERE callback_date >= CURDATE()
          UNION
          SELECT DISTINCT legacy_user_id FROM crm_daily_plans WHERE planned_date >= CURDATE()
          UNION
          SELECT DISTINCT legacy_user_id FROM crm_loca_touchpoints WHERE status = 'CALLBACK'
        `),
        ComboRecognitionService.getNewLoCaCustomerIds(fastify, dateFrom, dateTo),
        fastify.prisma.legacy.$queryRawUnsafe<Array<{ user_id: number }>>(`
          SELECT DISTINCT user_id FROM \`order_service\` 
          WHERE service_group = 'product' OR user_service_type = 'product'
        `),
      ]);

      const bookedIdStr = futureBookingRows.length > 0 ? futureBookingRows.map((r) => r.user_id).join(',') : '0';
      const callbackIdStr = callbackRows.length > 0 ? callbackRows.map((r) => r.legacy_user_id).join(',') : '0';
      const newLocaIdStr = newLocaUserIds.length > 0 ? newLocaUserIds.join(',') : '0';
      const productIdStr = productRows.length > 0 ? productRows.map((r) => r.user_id).join(',') : '0';

      // Build dynamic SELECT for touchpoints
      const tpSelects = buildTouchpointSelects(activeTouchpoints, 'is_combo_live = 1 AND ');

      const usbFilterStr =
        allowedUserIds !== null && allowedUserIds.length > 0
          ? `WHERE user_id IN (${allowedUserIds.join(',')})
               AND (normal_count > 0 OR retain_count > 0)
               AND (service_group IS NULL OR service_group != 'LashesUnder')
               AND (date_expired IS NULL OR date_expired > NOW())`
          : `WHERE (normal_count > 0 OR retain_count > 0)
               AND (service_group IS NULL OR service_group != 'LashesUnder')
               AND (date_expired IS NULL OR date_expired > NOW())`;

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
            CASE WHEN u.id IN (${productIdStr}) THEN 1 ELSE 0 END as has_product,
            CASE WHEN u.id IN (${callbackIdStr}) THEN 1 ELSE 0 END as has_callback,
            CASE WHEN u.id IN (${bookedIdStr}) THEN 1 ELSE 0 END as has_future_booking,
            EXISTS (
              SELECT 1 FROM mos_lab.crm_call_logs ccl
              WHERE ccl.legacy_user_id = u.id
            ) as has_contacted,
            CASE WHEN u.id IN (${newLocaIdStr}) THEN 1 ELSE 0 END as is_new_loca
          FROM (
            SELECT 
              user_id,
              1 as live_count,
              SUM(normal_count) as normalCount,
              SUM(retain_count) as retainCount,
              MAX(date_expired) as expiryDate
            FROM user_service_balance
            ${usbFilterStr}
            GROUP BY user_id
          ) as usb_agg
          STRAIGHT_JOIN user u ON u.id = usb_agg.user_id
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
      fastify.cache.set(cacheKey, stats, 300_000); // 300 seconds TTL (5 minutes)
      return stats;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get LoCa stats error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve LoCa stats',
      });
    }
  });
}
