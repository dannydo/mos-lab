import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  BkBookingLeaderboardEntry,
  BkBookingRecord,
  BkDoneLeaderboardEntry,
  BkDoneRecord,
  BkTipLeaderboardEntry,
  BkTipRecord,
  BkRevenueLeaderboardEntry,
  BkRevenueRecord,
  BkSalaryConfig,
  SafeAny,
} from '@mos-lab/shared';
import {
  getActiveBkTelesalesIds,
  getBkSalaryConfig,
  getMilestoneBonus,
  getMissedRateBonus,
  getRevCommissionRate,
  computeBkOrderCheckins,
  getBkPaystubData,
  resolveBkTelesalesStaffScope,
} from '../services/bk-salary.service.js';
import { TeamService } from '../../teams/team.service.js';

export async function registerBkRoutes(fastify: FastifyInstance) {
  // 1. Booking Leaderboard
  fastify.get('/kpi/bk/booking/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      if (activeTelesalesIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { totalBookings: 0, doneBookings: 0, conversionRate: 0, totalCalls: 0 },
        });
      }

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
          COUNT(DISTINCT o.id) as totalCreatedBookings,
          COUNT(DISTINCT CASE WHEN o.order_state = 'Completed' THEN o.id END) as doneBookings,
          COUNT(DISTINCT CASE WHEN o.order_state IN ('Cancelled', 'Missed') THEN o.id END) as missedBookings
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN \`order\` o ON o.created_staff_id = up.user_id 
          AND o.date_created >= '${startPart} 00:00:00' 
          AND o.date_created <= '${endPart} 23:59:59'
          ${storeFilter}
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalCreatedBookings DESC, doneBookings DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalBookings = 0;
      let grandDoneBookings = 0;

      const leaderboard: BkBookingLeaderboardEntry[] = rows.map((r) => {
        const totalCreatedBookings = Number(r.totalCreatedBookings || 0);
        const doneBookings = Number(r.doneBookings || 0);
        const missedBookings = Number(r.missedBookings || 0);

        grandTotalBookings += totalCreatedBookings;
        grandDoneBookings += doneBookings;

        const conversionRate =
          totalCreatedBookings > 0 ? Number(((doneBookings / totalCreatedBookings) * 100).toFixed(1)) : 0;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          totalCreatedBookings,
          doneBookings,
          missedBookings,
          conversionRate,
          callCount: 0,
        };
      });

      const avgConversionRate =
        grandTotalBookings > 0 ? Number(((grandDoneBookings / grandTotalBookings) * 100).toFixed(1)) : 0;

      return {
        leaderboard,
        summary: {
          totalBookings: grandTotalBookings,
          doneBookings: grandDoneBookings,
          conversionRate: avgConversionRate,
          totalCalls: 0,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Booking.' });
    }
  });

  // 1.2 Booking Details
  fastify.get('/kpi/bk/booking/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      if (activeTelesalesIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: { totalBookings: 0, doneBookings: 0, conversionRate: 0, totalCalls: 0 },
        });
      }

      const scopedBookerIds = resolveBkTelesalesStaffScope(activeTelesalesIds, bookerId);

      if (scopedBookerIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: { totalBookings: 0, doneBookings: 0, conversionRate: 0, totalCalls: 0 },
        });
      }

      const bookerFilter = `AND o.created_staff_id IN (${scopedBookerIds.join(',')})`;

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          o.user_id as customerId,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          COALESCE(uc_c.phone_number, '') as clientPhone,
          o.booking_channels as bookingChannel,
          o.booking_date_start as bookingDate,
          o.date_created as createdDate,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          o.order_state as orderState,
          COALESCE(o.total_price, 0) as totalPrice,
          o.created_staff_id as bookerId,
          up_b.full_name as bookerName,
          up_b.avatar as avatar
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN (
          SELECT user_id, MAX(phone_number) as phone_number
          FROM user_contact
          WHERE is_disabled = 0
          GROUP BY user_id
        ) uc_c ON uc_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        WHERE o.date_created >= '${startPart} 00:00:00' 
          AND o.date_created <= '${endPart} 23:59:59'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY o.date_created DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalBookings = 0;
      let doneBookings = 0;

      const data: BkBookingRecord[] = rows.map((r) => {
        const orderState = String(r.orderState || 'New');
        totalBookings++;
        if (orderState === 'Completed') {
          doneBookings++;
        }

        return {
          orderId: Number(r.orderId),
          orderKey: String(r.orderKey || `#${r.orderId}`),
          bookingDate: r.bookingDate ? new Date(r.bookingDate).toISOString() : '',
          createdDate: r.createdDate ? new Date(r.createdDate).toISOString() : '',
          clientName: String(r.clientName),
          clientPhone: String(r.clientPhone || ''),
          store: String(r.store),
          status: orderState,
          bookerId: Number(r.bookerId),
          bookerName: String(r.bookerName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          customerId: r.customerId ? Number(r.customerId) : undefined,
        };
      });

      const conversionRate = totalBookings > 0 ? Number(((doneBookings / totalBookings) * 100).toFixed(1)) : 0;

      return {
        data,
        total: totalBookings,
        summary: {
          totalBookings,
          doneBookings,
          conversionRate,
          totalCalls: 0,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK booking details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Booking.' });
    }
  });

  // 2. Done Leaderboard
  fastify.get('/kpi/bk/done/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      if (activeTelesalesIds.length === 0) {
        return reply.send({ leaderboard: [], summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 } });
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      // Compute Check-in bonuses per Booker (matching salary-calculator.ts and /dashboard/kpi)
      const { clientBonusMap } = await computeBkOrderCheckins(
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
            ((ro.actual_booking_date_start >= '${startPart} 00:00:00' AND ro.actual_booking_date_start <= '${endPart} 23:59:59')
             OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59'))
            ${storeFilter}
          ))
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY doneCount DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalDone = 0;
      let grandTotalMissed = 0;
      let grandTotalDoneBonus = 0;

      const leaderboard: BkDoneLeaderboardEntry[] = rows.map((r) => {
        const bookerId = Number(r.bookerId);
        const doneCount = Number(r.doneCount || 0);
        const missedCount = Number(r.missedCount || 0);
        const totalCount = Number(r.totalCount || 0);
        const doneRatePercent = totalCount > 0 ? Number(((doneCount / totalCount) * 100).toFixed(1)) : 0;
        const missedRatePercent = totalCount > 0 ? Number(((missedCount / totalCount) * 100).toFixed(1)) : 0;

        const basicBonus = clientBonusMap.get(bookerId) || 0;
        const promoBonus = 0;

        const milestoneBonus = getMilestoneBonus(doneCount, config.doneBonusTiers);
        const penaltyBonus = getMissedRateBonus(missedRatePercent, config.missedBonusTiers);

        const totalDoneBonus = basicBonus + promoBonus + milestoneBonus + penaltyBonus;

        grandTotalDone += doneCount;
        grandTotalMissed += missedCount;
        grandTotalDoneBonus += totalDoneBonus;

        return {
          rank: rank++,
          bookerId,
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          doneCount,
          missedCount,
          doneRatePercent,
          missedRatePercent,
          basicBonus,
          promoBonus,
          milestoneBonus,
          penaltyBonus,
          totalDoneBonus,
        };
      });

      const avgDoneRate =
        leaderboard.length > 0
          ? Number((leaderboard.reduce((acc, l) => acc + l.doneRatePercent, 0) / leaderboard.length).toFixed(1))
          : 0;

      const avgMissedRate =
        leaderboard.length > 0
          ? Number((leaderboard.reduce((acc, l) => acc + l.missedRatePercent, 0) / leaderboard.length).toFixed(1))
          : 0;

      return {
        leaderboard,
        summary: {
          totalDone: grandTotalDone,
          totalMissed: grandTotalMissed,
          avgDoneRate,
          avgMissedRate,
          totalDoneBonus: grandTotalDoneBonus,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK done leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Done.' });
    }
  });

  // 2.2 Done Details
  fastify.get('/kpi/bk/done/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId, status } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      status?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      if (activeTelesalesIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 },
        });
      }

      let targetBkIds = activeTelesalesIds;
      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        const requestedBookerId = Number(bookerId);
        if (!activeTelesalesIds.includes(requestedBookerId)) {
          return reply.send({
            data: [],
            total: 0,
            summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 },
          });
        }
        targetBkIds = [requestedBookerId];
        bookerFilter = `AND o.created_staff_id = ${requestedBookerId}`;
      } else {
        bookerFilter = `AND o.created_staff_id IN (${targetBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const statusParam = (status || 'ALL').toUpperCase();
      let stateCondition = '';
      let dateField = 'COALESCE(ro.actual_booking_date_start, o.booking_date_start)';

      if (statusParam === 'COMPLETED') {
        stateCondition = `AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
      } else if (statusParam === 'MISSED') {
        stateCondition = `AND o.booking_date_start <= NOW() AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
        dateField = 'o.booking_date_start';
      }

      // Compute Check-in bonuses per Order
      const { orderCheckinMap } = await computeBkOrderCheckins(fastify, startPart, endPart, targetBkIds, storeFilter);

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          o.user_id as customerId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          COALESCE(uc_c.phone_number, '') as clientPhone,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(o.total_price, 0) as totalPrice,
          up_b.full_name as bookerName,
          o.order_state as orderState
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN (
          SELECT user_id, MAX(phone_number) as phone_number
          FROM user_contact
          WHERE is_disabled = 0
          GROUP BY user_id
        ) uc_c ON uc_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = COALESCE(o.client_store_id, up_b.client_store_id)
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE ${dateField} >= '${startPart} 00:00:00' 
          AND ${dateField} <= '${endPart} 23:59:59'
          ${stateCondition}
          ${bookerFilter}
          ${storeFilter}
        ORDER BY ${dateField} DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      const returnedOrderIds = rows.map((r) => Number(r.orderId)).filter((id) => !!id);
      const tipMap = new Map<number, number>();
      if (returnedOrderIds.length > 0) {
        const tips = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id, SUM(tip_amount) as tip_amount
          FROM staff_tip
          WHERE order_id IN (${returnedOrderIds.join(',')}) AND tip_percentage = 20
          GROUP BY order_id
        `);
        tips.forEach((t) => tipMap.set(Number(t.order_id), Number(t.tip_amount || 0)));
      }

      let totalDoneBonusSum = 0;

      const data: BkDoneRecord[] = rows.map((r) => {
        const orderId = Number(r.orderId);
        const totalPrice = Number(r.totalPrice || 0);

        const checkinInfo = orderCheckinMap.get(orderId) || {
          bonus: 0,
          checkinCategory: 'Single (0đ)',
          discountRate: 0,
          isCombo: false,
          serviceName: 'Đặt lịch dịch vụ',
          servicePrice: 0,
          discountPercent: 0,
        };

        const basicDoneBonus = checkinInfo.bonus;
        const promoBonus = 0;
        const promoLevel = checkinInfo.checkinCategory;
        const milestoneBonus = 0;
        const doneRatePenaltyBonus = 0;
        const totalDoneBonus = basicDoneBonus + promoBonus;

        totalDoneBonusSum += totalDoneBonus;

        const isCompletedOrder = String(r.orderState) === 'Completed';
        const netRev = isCompletedOrder ? totalPrice : 0;
        return {
          orderId,
          orderKey: String(r.orderKey || `#${r.orderId}`),
          orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
          clientName: String(r.clientName),
          clientPhone: String(r.clientPhone || ''),
          bookerName: r.bookerName ? String(r.bookerName) : undefined,
          store: String(r.store),
          serviceName: checkinInfo.serviceName || String(r.serviceName || 'Đặt lịch dịch vụ'),
          servicePrice: checkinInfo.servicePrice || 0,
          discountPercent: Math.round(checkinInfo.discountPercent || 0),
          netRevenue: netRev,
          tipAmount: Number(r.tipAmount || 0),
          totalPrice: netRev,
          basicDoneBonus,
          promoBonus,
          promoLevel,
          milestoneBonus,
          doneRatePenaltyBonus,
          totalDoneBonus,
          status: String(r.orderState || 'Completed'),
          customerId: r.customerId ? Number(r.customerId) : undefined,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          totalDone: data.length,
          avgDoneRate: 100,
          totalDoneBonus: totalDoneBonusSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK done details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Done.' });
    }
  });

  // 3. BK Tip Leaderboard
  fastify.get('/kpi/bk/tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;
      if (activeBkIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { totalBookingsCount: 0, tippedBookingsCount: 0, totalCustomerTip: 0, totalBkTipBonus: 0 },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

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
          COUNT(DISTINCT o.id) as totalBookingsCount,
          COUNT(DISTINCT CASE WHEN o.customer_tip_100 > 0 THEN o.id END) as tippedBookingsCount,
          COALESCE(SUM(o.customer_tip_100), 0) as totalCustomerTip
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        LEFT JOIN (
          SELECT 
            o.id,
            o.created_staff_id,
            st.customer_tip_100
          FROM \`order\` o
          LEFT JOIN report_order ro ON o.id = ro.order_id
          JOIN (
            SELECT 
              order_id, 
              MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as customer_tip_100
            FROM staff_tip
            WHERE tip_amount > 0
            GROUP BY order_id
          ) st ON st.order_id = o.id
          WHERE o.order_state = 'Completed'
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
            AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
            ${storeFilter}
        ) o ON o.created_staff_id = up.user_id
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalCustomerTip DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalBookings = 0;
      let grandTippedBookings = 0;
      let grandTotalCustomerTip = 0;
      let grandTotalBkTipBonus = 0;

      const leaderboard: BkTipLeaderboardEntry[] = rows.map((r) => {
        const totalBookingsCount = Number(r.totalBookingsCount || 0);
        const tippedBookingsCount = Number(r.tippedBookingsCount || 0);
        const totalCustomerTip = Number(r.totalCustomerTip || 0);
        const totalBkTipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);

        grandTotalBookings += totalBookingsCount;
        grandTippedBookings += tippedBookingsCount;
        grandTotalCustomerTip += totalCustomerTip;
        grandTotalBkTipBonus += totalBkTipBonus;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          totalBookingsCount,
          tippedBookingsCount,
          totalCustomerTip,
          totalBkTipBonus,
        };
      });

      return {
        leaderboard,
        summary: {
          totalBookingsCount: grandTotalBookings,
          tippedBookingsCount: grandTippedBookings,
          totalCustomerTip: grandTotalCustomerTip,
          totalBkTipBonus: grandTotalBkTipBonus,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK tip leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard BK Tip.' });
    }
  });

  // 3.2 BK Tip Details
  fastify.get('/kpi/bk/tip/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        const activeBkIds = config.activeBkIds;
        bookerFilter = `AND o.created_staff_id IN (${activeBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as checkinTime,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(up_b.full_name, 'Booker') as bookerName,
          up_b.avatar as avatar,
          COALESCE(st.customer_tip_100, 0) as totalCustomerTip
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        JOIN (
          SELECT 
            order_id, 
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as customer_tip_100
          FROM staff_tip
          WHERE tip_amount > 0
          GROUP BY order_id
        ) st ON st.order_id = o.id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalCustomerTipSum = 0;
      let totalBkTipBonusSum = 0;

      const data: BkTipRecord[] = rows.map((r) => {
        const totalCustomerTip = Number(r.totalCustomerTip || 0);
        const bkTipAmount = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);

        totalCustomerTipSum += totalCustomerTip;
        totalBkTipBonusSum += bkTipAmount;

        return {
          orderId: Number(r.orderId),
          checkinTime: r.checkinTime ? new Date(r.checkinTime).toISOString() : '',
          clientName: String(r.clientName),
          store: String(r.store),
          bookerName: String(r.bookerName),
          avatar: r.avatar ? String(r.avatar) : null,
          totalCustomerTip,
          bkTipAmount,
          bkTipPercentage: config.tipsPercent || 7,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          totalBookingsCount: data.length,
          tippedBookingsCount: data.length,
          totalCustomerTip: totalCustomerTipSum,
          totalBkTipBonus: totalBkTipBonusSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK tip details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết BK Tip.' });
    }
  });

  // 4. Revenue Leaderboard
  fastify.get('/kpi/bk/revenue/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeBkIds = config.activeBkIds;
      if (activeBkIds.length === 0) {
        return reply.send({
          leaderboard: [],
          summary: { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 },
        });
      }

      const bkIdsStr = activeBkIds.join(',');

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
          SELECT o2.*, COALESCE(ro.actual_booking_date_start, o2.booking_date_start) as final_date
          FROM \`order\` o2
          LEFT JOIN report_order ro ON o2.id = ro.order_id
        ) o ON o.created_staff_id = up.user_id 
          AND o.final_date >= '${startPart} 00:00:00' 
          AND o.final_date <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilter}
        WHERE up.user_id IN (${bkIdsStr})
        GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
        ORDER BY totalRevenue DESC
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let rank = 1;
      let grandTotalOrders = 0;
      let grandTotalRevenue = 0;
      let grandTotalCommission = 0;

      const leaderboard: BkRevenueLeaderboardEntry[] = rows.map((r) => {
        const completedOrdersCount = Number(r.completedOrdersCount || 0);
        const totalRevenue = Number(r.totalRevenue || 0);
        const commissionRate = getRevCommissionRate(totalRevenue, config.revBonusTiers);
        const commissionBonus = Math.round((totalRevenue * commissionRate) / 100);

        grandTotalOrders += completedOrdersCount;
        grandTotalRevenue += totalRevenue;
        grandTotalCommission += commissionBonus;

        return {
          rank: rank++,
          bookerId: Number(r.bookerId),
          displayName: String(r.displayName || `BK #${r.bookerId}`),
          avatar: r.avatar ? String(r.avatar) : null,
          store: String(r.store || 'PXL'),
          completedOrdersCount,
          totalRevenue,
          commissionRate,
          totalCommissionBonus: commissionBonus,
        };
      });

      return {
        leaderboard,
        summary: {
          completedOrdersCount: grandTotalOrders,
          totalRevenue: grandTotalRevenue,
          totalCommissionBonus: grandTotalCommission,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK revenue leaderboard');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Leaderboard Doanh Thu.' });
    }
  });

  // 4.2 Revenue Details
  fastify.get('/kpi/bk/revenue/details', { preHandler: [requireAuth] }, async (request, reply) => {
    const { bookerId, dateFrom, dateTo, storeId } = request.query as {
      bookerId?: string;
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const config = await getBkSalaryConfig(fastify);

      let bookerFilter = '';
      if (bookerId && bookerId !== 'ALL') {
        bookerFilter = `AND o.created_staff_id = ${Number(bookerId)}`;
      } else {
        const activeBkIds = config.activeBkIds;
        bookerFilter = `AND o.created_staff_id IN (${activeBkIds.join(',')})`;
      }

      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(o.total_price, 0) as totalOrderPrice
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      let totalRevenueSum = 0;
      let totalCommissionSum = 0;

      const data: BkRevenueRecord[] = rows.map((r) => {
        const totalOrderPrice = Number(r.totalOrderPrice || 0);
        const commissionRate = getRevCommissionRate(totalOrderPrice, config.revBonusTiers);
        const commissionBonus = Math.round((totalOrderPrice * commissionRate) / 100);

        totalRevenueSum += totalOrderPrice;
        totalCommissionSum += commissionBonus;

        return {
          orderId: Number(r.orderId),
          orderKey: String(r.orderKey || `#${r.orderId}`),
          orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
          clientName: String(r.clientName),
          store: String(r.store),
          totalOrderPrice,
          commissionRate,
          commissionBonus,
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          completedOrdersCount: data.length,
          totalRevenue: totalRevenueSum,
          totalCommissionBonus: totalCommissionSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK revenue details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Doanh Thu.' });
    }
  });

  // 5. Paystub Live
  fastify.get('/kpi/bk/paystub', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');
    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      let storeFilter = '';
      if (storeId && storeId !== 'ALL') {
        storeFilter = `AND UPPER(cs.client_store_key) = '${storeId.toUpperCase()}'`;
      }

      const res = await getBkPaystubData(fastify, startPart, endPart, undefined, storeFilter);

      return {
        data: res.data,
        total: res.total,
        summary: res.summary,
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK paystub data');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải Bảng Lương BK.' });
    }
  });

  // 6. Config GET & POST
  fastify.get('/kpi/bk/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await getBkSalaryConfig(fastify);

      const allStaffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT 
          up.user_id as staffId,
          up.full_name as displayName,
          up.username as username,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store
        FROM \`user_profile\` up
        LEFT JOIN \`client_store\` cs ON cs.id = up.client_store_id
        WHERE up.is_disabled = 0 
          AND up.client_business_id = 1
          AND (
            up.user_group_id IN (2, 31, 32, 45)
            OR FIND_IN_SET('2', up.access_user_group_ids)
            OR FIND_IN_SET('31', up.access_user_group_ids)
            OR FIND_IN_SET('32', up.access_user_group_ids)
            OR FIND_IN_SET('45', up.access_user_group_ids)
          )
        ORDER BY up.full_name ASC
      `);

      const activeSet = new Set(config.activeBkIds);

      const allStaffOptions = allStaffProfiles.map((s) => ({
        staffId: Number(s.staffId),
        displayName: String(s.displayName || `Staff #${s.staffId}`),
        username: s.username ? String(s.username) : undefined,
        isBk: activeSet.has(Number(s.staffId)),
        store: String(s.store || 'PXL'),
      }));

      return {
        activeBkIds: config.activeBkIds,
        config,
        allStaffOptions,
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải cấu hình BK.' });
    }
  });

  fastify.post('/kpi/bk/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const { activeBkIds, config } = request.body as {
      activeBkIds?: number[];
      config?: Partial<BkSalaryConfig>;
    };

    try {
      if (activeBkIds && Array.isArray(activeBkIds)) {
        const bkTeam = await fastify.prisma.crm.crmTeam.findUnique({ where: { code: 'BK' } });
        if (bkTeam) {
          await TeamService.updateTeamMembers(fastify, bkTeam.id, activeBkIds);
        }

        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
          update: { value: JSON.stringify(activeBkIds) },
          create: { key: 'ACTIVE_BK_STAFF_CONFIG', value: JSON.stringify(activeBkIds) },
        });
      }

      if (config) {
        const currentConfig = await getBkSalaryConfig(fastify);
        const updatedConfig = { ...currentConfig, ...config };
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: 'BK_SALARY_CONFIG' },
          update: { value: JSON.stringify(updatedConfig) },
          create: { key: 'BK_SALARY_CONFIG', value: JSON.stringify(updatedConfig) },
        });
      }

      return reply.send({ success: true, message: 'Cập nhật cấu hình BK thành công.' });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error saving BK config');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi lưu cấu hình BK.' });
    }
  });
}
