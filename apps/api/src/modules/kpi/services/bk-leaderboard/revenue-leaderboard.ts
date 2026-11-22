import { FastifyInstance } from 'fastify';
import { BkRevenueLeaderboardEntry, type SafeAny } from '@mos-lab/shared';
import { getActiveBkTelesalesIds, getBkSalaryConfig, getRevCommissionRate } from '../bk-salary.service.js';
import type { BkRevenueLeaderboardParams, BkRevenueLeaderboardResult } from './bk-leaderboard.types.js';

/**
 * Single Source of Truth for BK Net Revenue Leaderboard.
 * Unified across /dashboard/bk?tab=revenue and /dashboard/telesale-target.
 */
export async function getRevenueLeaderboard(
  fastify: FastifyInstance,
  options: BkRevenueLeaderboardParams = {}
): Promise<BkRevenueLeaderboardResult> {
  const { dateFrom, dateTo, storeId, skipCache } = options;

  const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const endStr = dateTo || new Date().toLocaleDateString('en-CA');
  const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
  const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

  const activeTelesalesIds =
    options.targetStaffIds && options.targetStaffIds.length > 0
      ? options.targetStaffIds
      : await getActiveBkTelesalesIds(fastify);
  if (activeTelesalesIds.length === 0) {
    return {
      leaderboard: [],
      summary: { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 },
    };
  }

  const normalizedStoreId = String(storeId || 'ALL').toUpperCase();
  const cacheKey = `kpi:bk:revenue-leaderboard:${startPart}:${endPart}:${normalizedStoreId}`;

  if (!skipCache) {
    const cached = fastify.cache?.get<BkRevenueLeaderboardResult>(cacheKey);
    if (cached) return cached;
  }

  const config = await getBkSalaryConfig(fastify);
  const bkIdsStr = activeTelesalesIds.join(',');

  let storeFilter = '';
  if (storeId && storeId !== 'ALL') {
    storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
  }

  // Tối ưu hóa: Thay thế derived table OR bằng UNION ALL để MariaDB tận dụng range indexes
  const sql = `
      SELECT 
        up.user_id as bookerId,
        up.full_name as displayName,
        up.avatar as avatar,
        UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
        COUNT(DISTINCT o.id) as completedOrdersCount,
        COALESCE(SUM(o.total_price), 0) as totalRevenue
      FROM \`user_profile\` up
      LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
      LEFT JOIN (
        SELECT 
          o2.id,
          o2.created_staff_id,
          o2.total_price,
          o2.order_state,
          ro.actual_booking_date_start as final_date
        FROM report_order ro
        JOIN \`order\` o2 ON o2.id = ro.order_id
        WHERE o2.created_staff_id IN (${bkIdsStr})
          AND o2.order_state IN ('Completed', 'CheckOut')
          AND ro.actual_booking_date_start >= '${startPart} 00:00:00' 
          AND ro.actual_booking_date_start <= '${endPart} 23:59:59'
        UNION ALL
        SELECT 
          o2.id,
          o2.created_staff_id,
          o2.total_price,
          o2.order_state,
          o2.booking_date_start as final_date
        FROM \`order\` o2
        LEFT JOIN report_order ro ON o2.id = ro.order_id
        WHERE o2.created_staff_id IN (${bkIdsStr})
          AND o2.order_state IN ('Completed', 'CheckOut')
          AND o2.booking_date_start >= '${startPart} 00:00:00' 
          AND o2.booking_date_start <= '${endPart} 23:59:59'
          AND ro.actual_booking_date_start IS NULL
      ) o ON o.created_staff_id = up.user_id 
        AND o.final_date >= '${startPart} 00:00:00' 
        AND o.final_date <= '${endPart} 23:59:59'
        AND o.order_state IN ('Completed', 'CheckOut')
        ${storeFilter}
      WHERE up.user_id IN (${bkIdsStr})
      GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
      ORDER BY totalRevenue DESC
    `;

  let comboStoreFilter = '';
  if (storeId && storeId !== 'ALL') {
    comboStoreFilter = `AND o.client_store_id IN (SELECT id FROM client_store WHERE UPPER(client_store_key) = '${storeId.toUpperCase()}')`;
  }

  const startDateTimeStr = `${startPart} 00:00:00`;
  const endDateTimeStr = `${endPart} 23:59:59`;
  const candidateIdsStr = activeTelesalesIds.join(',');

  const comboSoldSql = `
      SELECT 
        matched_orders.created_staff_id as bookerId,
        COALESCE(SUM(osc.total_price), 0) as comboSoldRevenue
      FROM (
        SELECT ro.order_id, o.created_staff_id
        FROM report_order ro
        JOIN \`order\` o ON o.id = ro.order_id
        WHERE ro.actual_booking_date_start >= '${startDateTimeStr}'
          AND ro.actual_booking_date_start <= '${endDateTimeStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state IN ('Completed', 'CheckOut')
          ${comboStoreFilter}
        UNION
        SELECT o.id as order_id, o.created_staff_id
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE (
          (o.booking_date_start >= '${startDateTimeStr}' AND o.booking_date_start <= '${endDateTimeStr}')
          OR (o.booking_date_start IS NULL AND o.date_created >= '${startDateTimeStr}' AND o.date_created <= '${endDateTimeStr}')
        )
          AND o.created_staff_id IN (${candidateIdsStr})
          AND o.order_state IN ('Completed', 'CheckOut')
          AND ro.actual_booking_date_start IS NULL
          ${comboStoreFilter}
      ) matched_orders
      JOIN \`order_service_combo\` osc ON osc.order_id = matched_orders.order_id
      GROUP BY matched_orders.created_staff_id
    `;

  const [rows, comboSoldRows] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSoldSql),
  ]);

  const comboSoldMap = new Map<number, number>();
  comboSoldRows.forEach((r) => {
    comboSoldMap.set(Number(r.bookerId), Number(r.comboSoldRevenue || 0));
  });

  let rank = 1;
  let grandTotalOrders = 0;
  let grandTotalSingleRevenue = 0;
  let grandTotalComboRevenue = 0;
  let grandTotalRevenue = 0;
  let grandTotalCommission = 0;

  const leaderboard: BkRevenueLeaderboardEntry[] = rows.map((r) => {
    const bookerId = Number(r.bookerId);
    const completedOrdersCount = Number(r.completedOrdersCount || 0);
    const totalOrderRevenue = Math.round(Number(r.totalRevenue || 0));
    const comboRevenue = Math.round(comboSoldMap.get(bookerId) || 0);
    const singleRevenue = Math.max(0, totalOrderRevenue - comboRevenue);
    const totalRevenue = singleRevenue + comboRevenue;
    const commissionRate = getRevCommissionRate(totalRevenue, config.revBonusTiers);
    const commissionBonus = Math.round((totalRevenue * commissionRate) / 100);

    grandTotalOrders += completedOrdersCount;
    grandTotalSingleRevenue += singleRevenue;
    grandTotalComboRevenue += comboRevenue;
    grandTotalRevenue += totalRevenue;
    grandTotalCommission += commissionBonus;

    return {
      rank: rank++,
      bookerId,
      displayName: String(r.displayName || `BK #${r.bookerId}`),
      avatar: r.avatar ? String(r.avatar) : null,
      store: String(r.store || 'PXL'),
      completedOrdersCount,
      singleRevenue,
      comboRevenue,
      totalRevenue,
      commissionRate,
      totalCommissionBonus: commissionBonus,
    };
  });

  const payload: BkRevenueLeaderboardResult = {
    leaderboard,
    summary: {
      completedOrdersCount: grandTotalOrders,
      totalSingleRevenue: grandTotalSingleRevenue,
      totalComboRevenue: grandTotalComboRevenue,
      totalRevenue: grandTotalRevenue,
      totalCommissionBonus: grandTotalCommission,
    },
  };

  if (!skipCache) {
    fastify.cache?.set(cacheKey, payload, 60_000);
  }

  return payload;
}
