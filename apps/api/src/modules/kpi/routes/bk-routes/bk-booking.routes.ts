import { FastifyInstance } from 'fastify';
import { BkBookingRecord, SafeAny, maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  formatIctDateTime,
  formatIctDate,
  parseAllowedBookingChannels,
  buildBookingChannelFilter,
} from '../../services/bk-game.service.js';
import {
  getActiveBkTelesalesIds,
  getBkCallMetricsByLegacyStaffIds,
  resolveBkTelesalesStaffScope,
} from '../../services/bk-salary.service.js';
import {
  bookingDetailsStatusCondition,
  bookingMissedSqlCondition,
  type BkBookingDetailsFilter,
} from '../../services/bk-booking.service.js';
import { BkLeaderboardService } from '../../services/bk-leaderboard.service.js';
import { BK_CLIENT_PHONE_SELECT_SQL } from './bk-route.helpers.js';

function createEmptyBookingDetailsResponse() {
  return {
    data: [],
    total: 0,
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

export function registerBkBookingRoutes(fastify: FastifyInstance) {
  // 1. Booking Leaderboard
  fastify.get('/kpi/bk/booking/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = (request.query || {}) as SafeAny;
      const shouldSkipCache = query.skipCache === true || query.skipCache === 'true';
      if (shouldSkipCache || query.gameId) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      }
      const payload = await BkLeaderboardService.getBookingLeaderboard(fastify, {
        ...query,
        skipCache: shouldSkipCache,
      });
      return payload;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Booking.' });
    }
  });

  // 1.2 Booking Details
  fastify.get('/kpi/bk/booking/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId, status, gameId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      status?: string;
      gameId?: string | number;
    };

    let startPart = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    let endPart = dateTo || new Date().toLocaleDateString('en-CA');
    if (startPart.includes('T') && startPart.length === 10) startPart = startPart.split('T')[0];
    if (endPart.includes('T') && endPart.length === 10) endPart = endPart.split('T')[0];

    let startDateTimeStr = `${startPart.split('T')[0]} 00:00:00`;
    let endDateTimeStr = `${endPart.split('T')[0]} 23:59:59`;
    let callStartDateStr = startPart.split('T')[0];
    let callEndDateStr = endPart.split('T')[0];
    let gameChannelFilter = '';

    try {
      if (gameId) {
        const parsedGameId = Number(gameId);
        if (!isNaN(parsedGameId) && parsedGameId > 0) {
          const game = await fastify.prisma.crm.crmBkGame.findUnique({
            where: { id: parsedGameId },
          });
          if (game) {
            startDateTimeStr = formatIctDateTime(game.startDate);
            endDateTimeStr = formatIctDateTime(game.endDate);
            callStartDateStr = formatIctDate(game.startDate);
            callEndDateStr = formatIctDate(game.endDate);
            const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
            gameChannelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');
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
      if (activeTelesalesIds.length === 0) {
        return reply.send(createEmptyBookingDetailsResponse());
      }

      const scopedBookerIds = resolveBkTelesalesStaffScope(activeTelesalesIds, bookerId);
      if (scopedBookerIds.length === 0) {
        return reply.send(createEmptyBookingDetailsResponse());
      }

      const bookerFilter = `AND o.created_staff_id IN (${scopedBookerIds.join(',')})`;

      const requestedStatus = String(status || 'ALL').toUpperCase();
      const statusFilter: BkBookingDetailsFilter = ['ALL', 'COMPLETED', 'MISSED'].includes(requestedStatus)
        ? (requestedStatus as BkBookingDetailsFilter)
        : 'ALL';
      const bookingStatusFilter = bookingDetailsStatusCondition(statusFilter, 'o');

      const normalizedStoreId = String(storeId || 'ALL').toUpperCase();
      let storeFilter = '';
      if (normalizedStoreId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${normalizedStoreId.replace(/[^A-Z0-9_-]/g, '')}'`;
      }

      const summarySql = `
        SELECT
          COUNT(DISTINCT o.id) as totalBookings,
          COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneBookings,
          COUNT(DISTINCT CASE WHEN ${bookingMissedSqlCondition('o')} THEN o.id END) as missedBookings
        FROM \`order\` o
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.date_created >= '${startDateTimeStr}'
          AND o.date_created <= '${endDateTimeStr}'
          ${bookerFilter}
          ${storeFilter}
          ${gameChannelFilter}
          AND ${bookingStatusFilter}
      `;

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          o.user_id as customerId,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          up_c.avatar as clientAvatar,
          ${BK_CLIENT_PHONE_SELECT_SQL},
          o.booking_channels as bookingChannel,
          o.booking_date_start as bookingDate,
          o.date_created as createdDate,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          o.order_state as orderState,
          COALESCE(o.total_price, 0) as totalPrice,
          o.created_staff_id as bookerId,
          up_b.full_name as bookerName,
          up_b.avatar as bookerAvatar
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.date_created >= '${startDateTimeStr}' 
        AND o.date_created <= '${endDateTimeStr}'
        ${bookerFilter}
        ${storeFilter}
        ${gameChannelFilter}
        AND ${bookingStatusFilter}
        ORDER BY o.date_created DESC
        LIMIT 500
      `;

      const [rows, summaryRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql),
      ]);
      const callMetricsByBooker = await getBkCallMetricsByLegacyStaffIds(
        fastify,
        callStartDateStr,
        callEndDateStr,
        scopedBookerIds
      );

      const totalBookings = Number(summaryRows[0]?.totalBookings || 0);
      const doneBookings = Number(summaryRows[0]?.doneBookings || 0);
      const missedBookings = Number(summaryRows[0]?.missedBookings || 0);

      const data: BkBookingRecord[] = rows.map((r) => {
        const orderState = String(r.orderState || 'New');
        return {
          orderId: Number(r.orderId),
          orderKey: String(r.orderKey || `#${r.orderId}`),
          bookingDate: r.bookingDate ? new Date(r.bookingDate).toISOString() : '',
          createdDate: r.createdDate ? new Date(r.createdDate).toISOString() : '',
          clientName: String(r.clientName),
          clientPhone: shouldMaskCustomerPhone(request.user?.role)
            ? maskPhoneNumber(r.clientPhone)
            : String(r.clientPhone || ''),
          store: String(r.store),
          status: orderState,
          bookerId: Number(r.bookerId),
          bookerName: String(r.bookerName || `BK #${r.bookerId}`),
          clientAvatar: r.clientAvatar ? String(r.clientAvatar) : null,
          bookerAvatar: r.bookerAvatar ? String(r.bookerAvatar) : null,
          customerId: r.customerId ? Number(r.customerId) : undefined,
        };
      });

      const conversionRate = totalBookings > 0 ? Number(((doneBookings / totalBookings) * 100).toFixed(1)) : 0;
      const callMetrics = Array.from(callMetricsByBooker.values()).reduce(
        (total, metrics) => ({
          totalCalls: total.totalCalls + metrics.callCount,
          totalPickups: total.totalPickups + metrics.pickupCount,
        }),
        { totalCalls: 0, totalPickups: 0 }
      );

      return {
        data,
        total: totalBookings,
        summary: {
          totalBookings,
          doneBookings,
          missedBookings,
          conversionRate,
          totalCalls: callMetrics.totalCalls,
          totalPickups: callMetrics.totalPickups,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Booking.' });
    }
  });
}
