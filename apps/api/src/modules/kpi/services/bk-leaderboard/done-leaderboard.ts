import { FastifyInstance } from 'fastify';
import { BkDoneLeaderboardEntry, type SafeAny } from '@mos-lab/shared';
import {
  getActiveBkTelesalesIds,
  getBkSalaryConfig,
  getMilestoneBonus,
  getMissedRateBonus,
  computeBkOrderCheckins,
} from '../bk-salary.service.js';
import type { BkDoneLeaderboardParams, BkDoneLeaderboardResult } from './bk-leaderboard.types.js';

const inFlightDoneLeaderboardPromises = new Map<string, Promise<BkDoneLeaderboardResult>>();
const bkDoneLeaderboardComputedAt = new Map<string, number>();

/**
 * Single Source of Truth for BK Done Leaderboard.
 * Unified across /dashboard/bk?tab=done and /dashboard/telesale-target.
 */
export async function getDoneLeaderboard(
  fastify: FastifyInstance,
  options: BkDoneLeaderboardParams = {}
): Promise<BkDoneLeaderboardResult> {
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
    return { leaderboard: [], summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 } };
  }

  const staffKey =
    options.targetStaffIds && options.targetStaffIds.length > 0
      ? [...options.targetStaffIds].sort((a, b) => a - b).join(',')
      : 'ALL';
  const normalizedStoreId = String(storeId || 'ALL').toUpperCase();
  const cacheKey = `kpi:bk:done-leaderboard:${startPart}:${endPart}:${normalizedStoreId}:${staffKey}`;
  const now = Date.now();

  if (!skipCache) {
    const cached = fastify.cache?.get<BkDoneLeaderboardResult>(cacheKey);
    if (cached) {
      const computedAt = bkDoneLeaderboardComputedAt.get(cacheKey) || now;
      const age = now - computedAt;

      // 1. FRESH (< 180s): Trả về ngay lập tức từ bộ nhớ RAM
      if (age < 180_000) {
        return cached;
      }

      // 2. STALE-WHILE-REVALIDATE (180s - 900s): Trả về ngay stale result (0ms) và revalidate ngầm
      if (age < 900_000) {
        if (!inFlightDoneLeaderboardPromises.has(cacheKey)) {
          const revalidatePromise = (async () => {
            try {
              const freshPayload = await compute();
              bkDoneLeaderboardComputedAt.set(cacheKey, Date.now());
              fastify.cache?.set(cacheKey, freshPayload, 900_000);
              return freshPayload;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              fastify.log?.warn?.(`[BkLeaderboard] Background SWR revalidation failed: ${errMsg}`);
              return cached;
            } finally {
              inFlightDoneLeaderboardPromises.delete(cacheKey);
            }
          })();
          inFlightDoneLeaderboardPromises.set(cacheKey, revalidatePromise);
        }
        return cached;
      }
    }

    const inFlight = inFlightDoneLeaderboardPromises.get(cacheKey);
    if (inFlight) return inFlight;
  }

  async function compute(): Promise<BkDoneLeaderboardResult> {
    const config = await getBkSalaryConfig(fastify);

    let storeFilter = '';
    if (storeId && storeId !== 'ALL') {
      storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
    }

    // Compute Check-in bonuses per Booker (matching salary-calculator.ts and /dashboard/kpi)
    const { clientBonusMap, singleDoneMap, comboLiveDoneMap } = await computeBkOrderCheckins(
      fastify,
      startPart,
      endPart,
      activeTelesalesIds,
      storeFilter
    );

    const sql = `
      SELECT 
        up.user_id as bookerId,
        up.full_name as displayName,
        up.avatar as avatar,
        UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
        COUNT(DISTINCT CASE WHEN o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0 THEN o.id END) as doneCount,
        COUNT(DISTINCT CASE WHEN COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW() AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut') THEN o.id END) as missedCount,
        COUNT(DISTINCT CASE WHEN COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW() OR o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0 THEN o.id END) as totalCount
      FROM \`user_profile\` up
      LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
      LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE up.user_id IN (${activeTelesalesIds.join(',')})
        AND (o.id IS NULL OR (
          o.booking_date_start >= '${startPart} 00:00:00' - INTERVAL 2 DAY
          AND o.booking_date_start <= '${endPart} 23:59:59' + INTERVAL 2 DAY
          AND (
            (ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59')
          )
          ${storeFilter}
        ))
      GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
      ORDER BY doneCount DESC
    `;

    let comboStoreFilter = '';
    if (storeId && storeId !== 'ALL') {
      comboStoreFilter = `AND o.client_store_id IN (SELECT id FROM client_store WHERE UPPER(client_store_key) = '${storeId.toUpperCase()}')`;
    }

    const startDateTimeStr = `${startPart} 00:00:00`;
    const endDateTimeStr = `${endPart} 23:59:59`;
    const candidateIdsStr = activeTelesalesIds.join(',');

    // Phase 2 Optimization: Pre-filter matched completed orders, then join order_service_combo (17ms vs 170ms)
    const comboSoldSql = `
      SELECT 
        matched_orders.created_staff_id as bookerId,
        COALESCE(SUM(osc.quantity), 0) as comboSoldQty,
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

    // Done Khách Mới: Khách hoàn tất Check-in và Check-out, mỗi khách tính 1 lần duy nhất trên toàn hệ thống Wings,
    // ghi nhận cho nhân viên tạo lịch hẹn hợp lệ dẫn đến Done, tính theo tháng Check-out.
    // Tối ưu hóa: Khởi đầu từ report_order và giới hạn chặt chẽ actual_booking_date_start để tận dụng idx_actual_booking_date_start
    const newCustomerSql = `
        SELECT 
          o.id as orderId,
          o.created_staff_id as bookerId,
          o.user_id as customerId
        FROM report_order ro
        JOIN \`order\` o ON o.id = ro.order_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.order_state = 'Completed'
          AND ro.actual_booking_date_start >= '${startDateTimeStr}' - INTERVAL 1 DAY
          AND ro.actual_booking_date_start <= '${endDateTimeStr}'
          AND ro.actual_booking_date_end >= '${startDateTimeStr}'
          AND ro.actual_booking_date_end <= '${endDateTimeStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
          ${storeFilter}
          AND NOT EXISTS (
            SELECT 1 FROM \`order\` prev_o
            JOIN report_order prev_ro ON prev_ro.order_id = prev_o.id
            WHERE prev_o.user_id = o.user_id
              AND prev_o.order_state = 'Completed'
              AND prev_ro.actual_booking_date_start IS NOT NULL
              AND prev_ro.actual_booking_date_end IS NOT NULL
              AND (
                prev_ro.actual_booking_date_end < ro.actual_booking_date_end
                OR (prev_ro.actual_booking_date_end = ro.actual_booking_date_end AND prev_o.id < o.id)
              )
          )
      `;

    const [rows, comboSoldRows, newCustomerRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(comboSoldSql),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(newCustomerSql),
    ]);

    const comboSoldMap = new Map<number, { qty: number; revenue: number }>();
    comboSoldRows.forEach((r) => {
      comboSoldMap.set(Number(r.bookerId), {
        qty: Number(r.comboSoldQty || 0),
        revenue: Number(r.comboSoldRevenue || 0),
      });
    });

    const newCustomerDoneMap = new Map<number, number>();
    newCustomerRows.forEach((r) => {
      const bId = Number(r.bookerId);
      newCustomerDoneMap.set(bId, (newCustomerDoneMap.get(bId) || 0) + 1);
    });

    let grandTotalDone = 0;
    let grandTotalMissed = 0;
    let grandTotalDoneBonus = 0;
    let grandTotalSingleDone = 0;
    let grandTotalComboLiveDone = 0;
    let grandTotalComboSold = 0;
    let grandTotalComboRevenue = 0;
    let grandTotalNewCustomerDone = 0;

    const entries: BkDoneLeaderboardEntry[] = rows.map((r) => {
      const bookerId = Number(r.bookerId);
      const doneCount = Number(r.doneCount || 0);
      const missedCount = Number(r.missedCount || 0);
      const totalCount = Number(r.totalCount || 0);
      const doneRatePercent = totalCount > 0 ? Number(((doneCount / totalCount) * 100).toFixed(1)) : 0;
      const missedRatePercent = totalCount > 0 ? Number(((missedCount / totalCount) * 100).toFixed(1)) : 0;

      const newCustomerDoneCount = newCustomerDoneMap.get(bookerId) || 0;
      const newCustomerRatePercent = doneCount > 0 ? Number(((newCustomerDoneCount / doneCount) * 100).toFixed(1)) : 0;

      const singleDoneCount = singleDoneMap.get(bookerId) || 0;
      const comboLiveDoneCount = comboLiveDoneMap.get(bookerId) || 0;
      const comboInfo = comboSoldMap.get(bookerId) || { qty: 0, revenue: 0 };
      const comboSoldCount = comboInfo.qty;
      const comboRevenue = comboInfo.revenue;
      const singleToComboRate = singleDoneCount > 0 ? Number(((comboSoldCount / singleDoneCount) * 100).toFixed(1)) : 0;

      const basicBonus = clientBonusMap.get(bookerId) || 0;
      const promoBonus = 0;

      // Invariant BK-005 upgrade: Milestone bonus & Missed penalty for Booker is calculated on Total Done = Lẻ + Combo Live
      const totalDoneCount = singleDoneCount + comboLiveDoneCount;
      const milestoneBonus = getMilestoneBonus(totalDoneCount, config.doneBonusTiers);
      const minDoneForMissed = config.minDoneForMissedBonus ?? 100;
      const effectiveDone = totalDoneCount > 0 ? totalDoneCount : doneCount;
      const penaltyBonus = getMissedRateBonus(
        missedRatePercent,
        config.missedBonusTiers,
        effectiveDone,
        minDoneForMissed
      );

      const totalDoneBonus = basicBonus + promoBonus + milestoneBonus + penaltyBonus;

      grandTotalDone += doneCount;
      grandTotalMissed += missedCount;
      grandTotalDoneBonus += totalDoneBonus;
      grandTotalSingleDone += singleDoneCount;
      grandTotalComboLiveDone += comboLiveDoneCount;
      grandTotalComboSold += comboSoldCount;
      grandTotalComboRevenue += comboRevenue;
      grandTotalNewCustomerDone += newCustomerDoneCount;

      return {
        rank: 1, // assigned after sorting
        bookerId,
        displayName: String(r.displayName || `BK #${r.bookerId}`),
        avatar: r.avatar ? String(r.avatar) : null,
        store: String(r.store || 'PXL'),
        doneCount,
        newCustomerDoneCount,
        newCustomerRatePercent,
        missedCount,
        doneRatePercent,
        missedRatePercent,
        basicBonus,
        promoBonus,
        milestoneBonus,
        penaltyBonus,
        totalDoneBonus,
        singleDoneCount,
        comboLiveDoneCount,
        comboSoldCount,
        comboRevenue,
        singleToComboRate,
      };
    });

    // Invariant BK-005 upgrade: Sort primarily by Total Done (singleDoneCount + comboLiveDoneCount) DESC, then singleDoneCount DESC, then doneCount DESC
    entries.sort((a, b) => {
      const totalA = (a.singleDoneCount ?? 0) + (a.comboLiveDoneCount ?? 0);
      const totalB = (b.singleDoneCount ?? 0) + (b.comboLiveDoneCount ?? 0);
      return totalB - totalA || (b.singleDoneCount ?? 0) - (a.singleDoneCount ?? 0) || b.doneCount - a.doneCount;
    });
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    const avgDoneRate =
      entries.length > 0
        ? Number((entries.reduce((acc, l) => acc + l.doneRatePercent, 0) / entries.length).toFixed(1))
        : 0;

    const avgMissedRate =
      entries.length > 0
        ? Number((entries.reduce((acc, l) => acc + l.missedRatePercent, 0) / entries.length).toFixed(1))
        : 0;

    const grandSingleToComboRate =
      grandTotalSingleDone > 0 ? Number(((grandTotalComboSold / grandTotalSingleDone) * 100).toFixed(1)) : 0;

    const grandAvgNewCustomerRate =
      grandTotalDone > 0 ? Number(((grandTotalNewCustomerDone / grandTotalDone) * 100).toFixed(1)) : 0;

    const payload: BkDoneLeaderboardResult = {
      leaderboard: entries,
      summary: {
        totalDone: grandTotalDone,
        totalNewCustomerDone: grandTotalNewCustomerDone,
        avgNewCustomerRate: grandAvgNewCustomerRate,
        totalMissed: grandTotalMissed,
        avgDoneRate,
        avgMissedRate,
        totalDoneBonus: grandTotalDoneBonus,
        totalSingleDone: grandTotalSingleDone,
        totalComboLiveDone: grandTotalComboLiveDone,
        totalComboSold: grandTotalComboSold,
        comboRevenue: grandTotalComboRevenue,
        singleToComboRate: grandSingleToComboRate,
      },
    };

    if (!skipCache) {
      bkDoneLeaderboardComputedAt.set(cacheKey, Date.now());
      fastify.cache?.set(cacheKey, payload, 900_000);
    }

    return payload;
  }

  if (!skipCache) {
    const promise = compute().finally(() => {
      inFlightDoneLeaderboardPromises.delete(cacheKey);
    });
    inFlightDoneLeaderboardPromises.set(cacheKey, promise);
    return promise;
  }

  return compute();
}
