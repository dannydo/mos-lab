import { FastifyInstance } from 'fastify';
import { BkBookingLeaderboardEntry, BkDoneLeaderboardEntry, BkRevenueLeaderboardEntry, SafeAny } from '@mos-lab/shared';
import {
  formatIctDateTime,
  formatIctDate,
  parseAllowedBookingChannels,
  buildBookingChannelFilter,
} from './bk-game.service.js';
import {
  getActiveBkTelesalesIds,
  getBkSalaryConfig,
  getMilestoneBonus,
  getMissedRateBonus,
  getRevCommissionRate,
  computeBkOrderCheckins,
  getBkCallMetricsByLegacyStaffIds,
} from './bk-salary.service.js';
import { bookingMissedSqlCondition } from './bk-booking.service.js';

const inFlightDoneLeaderboardPromises = new Map<string, Promise<BkDoneLeaderboardResult>>();
const bkDoneLeaderboardComputedAt = new Map<string, number>();

export interface BkBookingLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  gameId?: string | number;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkBookingLeaderboardResult {
  leaderboard: BkBookingLeaderboardEntry[];
  summary: {
    totalBookings: number;
    doneBookings: number;
    missedBookings: number;
    conversionRate: number;
    totalCalls: number;
    totalPickups: number;
  };
}

export interface BkDoneLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkDoneLeaderboardResult {
  leaderboard: BkDoneLeaderboardEntry[];
  summary: {
    totalDone: number;
    totalNewCustomerDone?: number;
    avgNewCustomerRate?: number;
    totalMissed?: number;
    avgDoneRate: number;
    avgMissedRate?: number;
    totalDoneBonus: number;
    totalSingleDone?: number;
    totalComboLiveDone?: number;
    totalComboSold?: number;
    comboRevenue?: number;
    singleToComboRate?: number;
  };
}

export interface BkRevenueLeaderboardParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  targetStaffIds?: number[];
  skipCache?: boolean;
}

export interface BkRevenueLeaderboardResult {
  leaderboard: BkRevenueLeaderboardEntry[];
  summary: {
    completedOrdersCount: number;
    totalSingleRevenue?: number;
    totalComboRevenue?: number;
    totalRevenue: number;
    totalCommissionBonus: number;
  };
}

export class BkLeaderboardService {
  /**
   * Single Source of Truth for BK Booking Leaderboard, Call & Pickup metrics.
   * Unified across /dashboard/bk?tab=booking and /dashboard/telesale-target.
   */
  static async getBookingLeaderboard(
    fastify: FastifyInstance,
    options: BkBookingLeaderboardParams = {}
  ): Promise<BkBookingLeaderboardResult> {
    const { dateFrom, dateTo, storeId, gameId, skipCache } = options;

    let startPart = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    let endPart = dateTo || new Date().toLocaleDateString('en-CA');
    if (startPart.includes('T') && startPart.length === 10) startPart = startPart.split('T')[0];
    if (endPart.includes('T') && endPart.length === 10) endPart = endPart.split('T')[0];

    let startDateTimeStr = `${startPart.split('T')[0]} 00:00:00`;
    let endDateTimeStr = `${endPart.split('T')[0]} 23:59:59`;
    let callStartDateStr = startPart.split('T')[0];
    let callEndDateStr = endPart.split('T')[0];
    let gameChannelFilter = '';
    let gameParticipantIds: number[] | null = null;

    if (gameId) {
      const parsedGameId = Number(gameId);
      if (!isNaN(parsedGameId) && parsedGameId > 0) {
        const game = await fastify.prisma.crm.crmBkGame.findUnique({
          where: { id: parsedGameId },
          include: {
            participants: {
              select: { staffId: true },
            },
          },
        });
        if (game) {
          startDateTimeStr = formatIctDateTime(game.startDate);
          endDateTimeStr = formatIctDateTime(game.endDate);
          callStartDateStr = formatIctDate(game.startDate);
          callEndDateStr = formatIctDate(game.endDate);
          const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
          gameChannelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');
          if (game.participants && game.participants.length > 0) {
            gameParticipantIds = game.participants.map((p) => p.staffId);
          }
        }
      }
    } else {
      if (dateFrom && (dateFrom.includes(' ') || (dateFrom.includes('T') && dateFrom.length > 10))) {
        const d = new Date(dateFrom);
        if (!isNaN(d.getTime())) {
          startDateTimeStr = formatIctDateTime(d);
          callStartDateStr = formatIctDate(d);
        }
      }
      if (dateTo && (dateTo.includes(' ') || (dateTo.includes('T') && dateTo.length > 10))) {
        const d = new Date(dateTo);
        if (!isNaN(d.getTime())) {
          endDateTimeStr = formatIctDateTime(d);
          callEndDateStr = formatIctDate(d);
        }
      }
    }

    const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
    const targetStaffIds =
      options.targetStaffIds && options.targetStaffIds.length > 0
        ? options.targetStaffIds
        : gameParticipantIds && gameParticipantIds.length > 0
          ? gameParticipantIds
          : activeTelesalesIds;
    if (targetStaffIds.length === 0) {
      return {
        leaderboard: [],
        summary: {
          totalBookings: 0,
          doneBookings: 0,
          missedBookings: 0,
          conversionRate: 0,
          totalCalls: 0,
          totalPickups: 0,
        },
      };
    }

    const bkIdsStr = targetStaffIds.join(',');
    const normalizedStoreId = String(storeId || 'ALL').toUpperCase();
    const cacheKey = `kpi:bk:leaderboard:${startDateTimeStr}:${endDateTimeStr}:${normalizedStoreId}:${gameId || 'NONE'}`;

    if (!skipCache) {
      const cached = fastify.cache?.get<BkBookingLeaderboardResult>(cacheKey);
      if (cached) return cached;
    }

    let storeFilter = '';
    if (normalizedStoreId !== 'ALL') {
      storeFilter = `AND o.client_store_id IN (SELECT id FROM client_store WHERE UPPER(client_store_key) = '${normalizedStoreId.replace(/[^A-Z0-9_-]/g, '')}')`;
    }

    const sql = `
      SELECT 
        up.user_id as bookerId,
        up.full_name as displayName,
        up.avatar as avatar,
        UPPER(COALESCE(cs_staff.client_store_key, 'PXL')) as store,
        COUNT(DISTINCT o.id) as totalCreatedBookings,
        COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneBookings,
        COUNT(DISTINCT CASE WHEN ${bookingMissedSqlCondition('o')} THEN o.id END) as missedBookings
      FROM \`user_profile\` up
      LEFT JOIN \`client_store\` cs_staff ON cs_staff.id = up.client_store_id
      LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
        AND o.date_created >= '${startDateTimeStr}' 
        AND o.date_created <= '${endDateTimeStr}'
        ${storeFilter}
        ${gameChannelFilter}
      WHERE up.user_id IN (${bkIdsStr})
      GROUP BY up.user_id, up.full_name, up.avatar, cs_staff.client_store_key
      ORDER BY totalCreatedBookings DESC, doneBookings DESC
    `;

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);
    const callMetricsByBooker = await getBkCallMetricsByLegacyStaffIds(
      fastify,
      callStartDateStr,
      callEndDateStr,
      targetStaffIds
    );

    let rank = 1;
    let grandTotalBookings = 0;
    let grandDoneBookings = 0;
    let grandMissedBookings = 0;
    let grandTotalCalls = 0;
    let grandTotalPickups = 0;

    const leaderboard: BkBookingLeaderboardEntry[] = rows.map((r) => {
      const bookerId = Number(r.bookerId);
      const totalCreatedBookings = Number(r.totalCreatedBookings || 0);
      const doneBookings = Number(r.doneBookings || 0);
      const missedBookings = Number(r.missedBookings || 0);
      const callMetrics = callMetricsByBooker.get(bookerId) || { callCount: 0, pickupCount: 0, pickupRate: 0 };

      grandTotalBookings += totalCreatedBookings;
      grandDoneBookings += doneBookings;
      grandMissedBookings += missedBookings;
      grandTotalCalls += callMetrics.callCount;
      grandTotalPickups += callMetrics.pickupCount;

      const conversionRate =
        totalCreatedBookings > 0 ? Number(((doneBookings / totalCreatedBookings) * 100).toFixed(1)) : 0;

      return {
        rank: rank++,
        bookerId,
        displayName: String(r.displayName || `BK #${r.bookerId}`),
        avatar: r.avatar ? String(r.avatar) : null,
        store: String(r.store || 'PXL'),
        totalCreatedBookings,
        doneBookings,
        missedBookings,
        conversionRate,
        callCount: callMetrics.callCount,
        pickupCount: callMetrics.pickupCount,
        pickupRate: callMetrics.pickupRate,
      };
    });

    const avgConversionRate =
      grandTotalBookings > 0 ? Number(((grandDoneBookings / grandTotalBookings) * 100).toFixed(1)) : 0;

    const payload: BkBookingLeaderboardResult = {
      leaderboard,
      summary: {
        totalBookings: grandTotalBookings,
        doneBookings: grandDoneBookings,
        missedBookings: grandMissedBookings,
        conversionRate: avgConversionRate,
        totalCalls: grandTotalCalls,
        totalPickups: grandTotalPickups,
      },
    };

    if (!skipCache) {
      fastify.cache?.set(cacheKey, payload, 60_000);
    }

    return payload;
  }

  /**
   * Single Source of Truth for BK Done Leaderboard.
   * Unified across /dashboard/bk?tab=done and /dashboard/telesale-target.
   */
  static async getDoneLeaderboard(
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
          AND o.order_state = 'Completed'
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
          AND o.order_state = 'Completed'
          AND ro.actual_booking_date_start IS NULL
          ${comboStoreFilter}
      ) matched_orders
      JOIN \`order_service_combo\` osc ON osc.order_id = matched_orders.order_id
      GROUP BY matched_orders.created_staff_id
    `;

      // Done Khách Mới: Khách hoàn tất Check-in và Check-out, mỗi khách tính 1 lần duy nhất trên toàn hệ thống Wings,
      // ghi nhận cho nhân viên tạo lịch hẹn hợp lệ dẫn đến Done, tính theo tháng Check-out.
      const newCustomerSql = `
        SELECT 
          o.id as orderId,
          o.created_staff_id as bookerId,
          o.user_id as customerId
        FROM \`order\` o
        JOIN report_order ro ON ro.order_id = o.id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.order_state = 'Completed'
          AND ro.actual_booking_date_start IS NOT NULL
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
        const newCustomerRatePercent =
          doneCount > 0 ? Number(((newCustomerDoneCount / doneCount) * 100).toFixed(1)) : 0;

        const singleDoneCount = singleDoneMap.get(bookerId) || 0;
        const comboLiveDoneCount = comboLiveDoneMap.get(bookerId) || 0;
        const comboInfo = comboSoldMap.get(bookerId) || { qty: 0, revenue: 0 };
        const comboSoldCount = comboInfo.qty;
        const comboRevenue = comboInfo.revenue;
        const singleToComboRate =
          singleDoneCount > 0 ? Number(((comboSoldCount / singleDoneCount) * 100).toFixed(1)) : 0;

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

  /**
   * Single Source of Truth for BK Net Revenue Leaderboard.
   * Unified across /dashboard/bk?tab=revenue and /dashboard/telesale-target.
   */
  static async getRevenueLeaderboard(
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
          COALESCE(ro.actual_booking_date_start, o2.booking_date_start) as final_date
        FROM \`order\` o2
        LEFT JOIN report_order ro ON o2.id = ro.order_id
        WHERE o2.created_staff_id IN (${bkIdsStr})
          AND o2.order_state = 'Completed'
          AND o2.booking_date_start >= '${startPart} 00:00:00' - INTERVAL 2 DAY
          AND o2.booking_date_start <= '${endPart} 23:59:59' + INTERVAL 2 DAY
      ) o ON o.created_staff_id = up.user_id 
        AND o.final_date >= '${startPart} 00:00:00' 
        AND o.final_date <= '${endPart} 23:59:59'
        AND o.order_state = 'Completed'
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
          AND o.order_state = 'Completed'
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
          AND o.order_state = 'Completed'
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

  /**
   * MOS-BUG-95: Count incoming (Sắp tới) bookings in month for War Room team.
   * Unified with BK Leaderboard -> Done -> Chi tiết Khách hàng Đặt Lịch & Bonus Done.
   * Condition:
   * - booking_date_start within date range (selected month)
   * - booking_date_start > NOW() (future appointment)
   * - created_staff_id in target staff IDs
   * - order_state not in ('Completed', 'CheckOut', 'Cancelled')
   * - ro.actual_booking_date_start IS NULL
   * - total_price IS NULL or 0
   */
  static async getIncomingBookingsCount(
    fastify: FastifyInstance,
    params: {
      dateFrom: string;
      dateTo: string;
      targetStaffIds?: number[];
    }
  ): Promise<number> {
    const { dateFrom, dateTo, targetStaffIds } = params;
    const startPart = dateFrom.includes('T') ? dateFrom.split('T')[0] : dateFrom.split(' ')[0];
    const endPart = dateTo.includes('T') ? dateTo.split('T')[0] : dateTo.split(' ')[0];

    const activeTelesalesIds =
      targetStaffIds && targetStaffIds.length > 0 ? targetStaffIds : await getActiveBkTelesalesIds(fastify);

    if (activeTelesalesIds.length === 0) return 0;

    const sql = `
      SELECT COUNT(DISTINCT o.id) as incomingCount
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.created_staff_id IN (${activeTelesalesIds.join(',')})
        AND o.booking_date_start >= '${startPart} 00:00:00'
        AND o.booking_date_start <= '${endPart} 23:59:59'
        AND o.booking_date_start > NOW()
        AND o.order_state NOT IN ('Completed', 'CheckOut', 'Cancelled')
        AND ro.actual_booking_date_start IS NULL
        AND (o.total_price IS NULL OR o.total_price = 0)
    `;

    const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql).catch(() => []);
    return Number(rows[0]?.incomingCount || 0);
  }
}
