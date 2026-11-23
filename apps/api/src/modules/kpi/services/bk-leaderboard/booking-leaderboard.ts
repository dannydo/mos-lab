import { FastifyInstance } from 'fastify';
import { BkBookingLeaderboardEntry, type SafeAny } from '@mos-lab/shared';
import {
  formatIctDateTime,
  formatIctDate,
  parseAllowedBookingChannels,
  buildBookingChannelFilter,
} from '../bk-game.service.js';
import { getActiveBkTelesalesIds, getBkCallMetricsByLegacyStaffIds } from '../bk-salary.service.js';
import { bookingMissedSqlCondition } from '../bk-booking.service.js';
import type {
  BkBookingLeaderboardParams,
  BkBookingLeaderboardResult,
  BkIncomingBookingsCountParams,
} from './bk-leaderboard.types.js';

/**
 * Single Source of Truth for BK Booking Leaderboard, Call & Pickup metrics.
 * Unified across /dashboard/bk?tab=booking and /dashboard/telesale-target.
 */
export async function getBookingLeaderboard(
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
  const shouldSkipCache = skipCache === true || (skipCache as unknown) === 'true';

  if (!shouldSkipCache) {
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

  if (!shouldSkipCache) {
    fastify.cache?.set(cacheKey, payload, gameId ? 10_000 : 60_000);
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
export async function getIncomingBookingsCount(
  fastify: FastifyInstance,
  params: BkIncomingBookingsCountParams
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
