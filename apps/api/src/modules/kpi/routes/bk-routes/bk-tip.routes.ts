import { FastifyInstance } from 'fastify';
import { BkTipLeaderboardEntry, BkTipRecord, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { getBkSalaryConfig, computeBkOrderCheckins } from '../../services/bk-salary.service.js';
import {
  buildBkOrderDateWindowCondition,
  buildBkStoreFilter,
  createBkSwrCacheState,
  parseBkDateRangeParts,
  resolveWithBkSwrCache,
} from './bk-route.helpers.js';

const tipLeaderboardSwrState = createBkSwrCacheState();
const tipDetailsSwrState = createBkSwrCacheState();

const CUSTOMER_TIP_100_EXPR =
  'MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END)';

function buildComboOrderIdSet(
  comboSoldOrderRows: SafeAny[],
  orderCheckinMap: ReadonlyMap<number, { isCombo: boolean }>
): Set<number> {
  const comboOrderIdSet = new Set<number>();
  comboSoldOrderRows.forEach((r) => comboOrderIdSet.add(Number(r.order_id)));
  orderCheckinMap.forEach((checkin, ordId) => {
    if (checkin.isCombo) comboOrderIdSet.add(ordId);
  });
  return comboOrderIdSet;
}

async function queryComboSoldOrderRows(fastify: FastifyInstance, orderIds: number[]): Promise<SafeAny[]> {
  if (orderIds.length === 0) return [];
  return fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT DISTINCT order_id FROM order_service_combo WHERE order_id IN (${orderIds.join(',')})
  `);
}

export function registerBkTipRoutes(fastify: FastifyInstance) {
  // 3. BK Tip Leaderboard
  fastify.get('/kpi/bk/tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);

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
      const storeFilter = buildBkStoreFilter(storeId);
      const dateWindowCondition = buildBkOrderDateWindowCondition(startPart, endPart);
      const cacheKey = `bk:tip:leaderboard:${startPart}:${endPart}:${storeId || 'ALL'}`;

      return await resolveWithBkSwrCache({
        fastify,
        cacheKey,
        state: tipLeaderboardSwrState,
        freshTtlMs: 120_000,
        cacheTtlMs: 600_000,
        logTag: '[BkTipLeaderboard]',
        compute: async () => {
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
                ${CUSTOMER_TIP_100_EXPR} as customer_tip_100
              FROM \`order\` o
              JOIN staff_tip st ON st.order_id = o.id AND st.tip_amount > 0
              LEFT JOIN report_order ro ON o.id = ro.order_id
              WHERE o.order_state = 'Completed'
                AND o.created_staff_id IN (${bkIdsStr})
                AND o.booking_date_start >= '${startPart} 00:00:00' - INTERVAL 2 DAY
                AND o.booking_date_start <= '${endPart} 23:59:59' + INTERVAL 2 DAY
                AND ${dateWindowCondition}
                ${storeFilter}
              GROUP BY o.id, o.created_staff_id
            ) o ON o.created_staff_id = up.user_id
            WHERE up.user_id IN (${bkIdsStr})
            GROUP BY up.user_id, up.full_name, up.avatar, cs.client_store_key
            ORDER BY totalCustomerTip DESC
          `;

          const tippedOrdersSql = `
            SELECT 
              o.id as orderId,
              o.created_staff_id as bookerId,
              ${CUSTOMER_TIP_100_EXPR} as customer_tip_100
            FROM \`order\` o
            JOIN staff_tip st ON st.order_id = o.id AND st.tip_amount > 0
            LEFT JOIN report_order ro ON o.id = ro.order_id
            WHERE o.order_state = 'Completed'
              AND o.created_staff_id IN (${bkIdsStr})
              AND o.booking_date_start >= '${startPart} 00:00:00' - INTERVAL 2 DAY
              AND o.booking_date_start <= '${endPart} 23:59:59' + INTERVAL 2 DAY
              AND ${dateWindowCondition}
              ${storeFilter}
            GROUP BY o.id, o.created_staff_id
          `;

          const [rows, tippedOrders, { orderCheckinMap }] = await Promise.all([
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql),
            fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(tippedOrdersSql),
            computeBkOrderCheckins(fastify, startPart, endPart, activeBkIds, storeFilter),
          ]);

          const tippedOrderIds = tippedOrders.map((to) => Number(to.orderId));
          const comboSoldOrderRows = await queryComboSoldOrderRows(fastify, tippedOrderIds);
          const comboOrderIdSet = buildComboOrderIdSet(comboSoldOrderRows, orderCheckinMap);

          const singleTipByBooker = new Map<number, number>();
          const comboTipByBooker = new Map<number, number>();

          tippedOrders.forEach((to) => {
            const bId = Number(to.bookerId);
            const oId = Number(to.orderId);
            const tip = Number(to.customer_tip_100 || 0);
            if (comboOrderIdSet.has(oId)) {
              comboTipByBooker.set(bId, (comboTipByBooker.get(bId) || 0) + tip);
            } else {
              singleTipByBooker.set(bId, (singleTipByBooker.get(bId) || 0) + tip);
            }
          });

          let rank = 1;
          let grandTotalBookings = 0;
          let grandTippedBookings = 0;
          let grandTotalSingleCustomerTip = 0;
          let grandTotalComboCustomerTip = 0;
          let grandTotalCustomerTip = 0;
          let grandTotalBkTipBonus = 0;

          const leaderboard: BkTipLeaderboardEntry[] = rows.map((r) => {
            const bookerId = Number(r.bookerId);
            const totalBookingsCount = Number(r.totalBookingsCount || 0);
            const tippedBookingsCount = Number(r.tippedBookingsCount || 0);
            const singleCustomerTip = Math.round(singleTipByBooker.get(bookerId) || 0);
            const comboCustomerTip = Math.round(comboTipByBooker.get(bookerId) || 0);
            const totalCustomerTip = singleCustomerTip + comboCustomerTip;
            const totalBkTipBonus = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);

            grandTotalBookings += totalBookingsCount;
            grandTippedBookings += tippedBookingsCount;
            grandTotalSingleCustomerTip += singleCustomerTip;
            grandTotalComboCustomerTip += comboCustomerTip;
            grandTotalCustomerTip += totalCustomerTip;
            grandTotalBkTipBonus += totalBkTipBonus;

            return {
              rank: rank++,
              bookerId,
              displayName: String(r.displayName || `BK #${r.bookerId}`),
              avatar: r.avatar ? String(r.avatar) : null,
              store: String(r.store || 'PXL'),
              totalBookingsCount,
              tippedBookingsCount,
              singleCustomerTip,
              comboCustomerTip,
              totalCustomerTip,
              totalBkTipBonus,
            };
          });

          return {
            leaderboard,
            summary: {
              totalBookingsCount: grandTotalBookings,
              tippedBookingsCount: grandTippedBookings,
              totalSingleCustomerTip: grandTotalSingleCustomerTip,
              totalComboCustomerTip: grandTotalComboCustomerTip,
              totalCustomerTip: grandTotalCustomerTip,
              totalBkTipBonus: grandTotalBkTipBonus,
            },
          };
        },
      });
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

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);

    try {
      const config = await getBkSalaryConfig(fastify);

      const targetBkIds = bookerId && bookerId !== 'ALL' ? [Number(bookerId)] : config.activeBkIds;
      const bookerFilter =
        bookerId && bookerId !== 'ALL'
          ? `AND o.created_staff_id = ${Number(bookerId)}`
          : `AND o.created_staff_id IN (${targetBkIds.join(',')})`;
      const storeFilter = buildBkStoreFilter(storeId);
      const dateWindowCondition = buildBkOrderDateWindowCondition(startPart, endPart);
      const cacheKey = `bk:tip:details:${startPart}:${endPart}:${bookerId || 'ALL'}:${storeId || 'ALL'}`;

      return await resolveWithBkSwrCache({
        fastify,
        cacheKey,
        state: tipDetailsSwrState,
        freshTtlMs: 120_000,
        cacheTtlMs: 600_000,
        logTag: '[BkTipDetails]',
        compute: async () => {
          const sql = `
            SELECT 
              o.id as orderId,
              COALESCE(ro.actual_booking_date_start, o.booking_date_start) as checkinTime,
              COALESCE(up_c.full_name, 'Khách hàng') as clientName,
              up_c.avatar as clientAvatar,
              UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
              COALESCE(up_b.full_name, 'Booker') as bookerName,
              up_b.avatar as bookerAvatar,
              COALESCE(${CUSTOMER_TIP_100_EXPR}, 0) as totalCustomerTip
            FROM \`order\` o
            JOIN staff_tip st ON st.order_id = o.id AND st.tip_amount > 0
            LEFT JOIN report_order ro ON o.id = ro.order_id
            LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
            LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
            LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
            WHERE o.order_state = 'Completed'
              AND ${dateWindowCondition}
              ${bookerFilter}
              ${storeFilter}
            GROUP BY o.id, ro.actual_booking_date_start, o.booking_date_start, up_c.full_name, up_c.avatar, cs.client_store_key, up_b.full_name, up_b.avatar
            ORDER BY checkinTime DESC
            LIMIT 500
          `;

          const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);
          const orderIds = rows.map((r) => Number(r.orderId));
          const [comboSoldOrderRows, { orderCheckinMap }] = await Promise.all([
            queryComboSoldOrderRows(fastify, orderIds),
            computeBkOrderCheckins(fastify, startPart, endPart, targetBkIds, storeFilter),
          ]);
          const comboOrderIdSet = buildComboOrderIdSet(comboSoldOrderRows, orderCheckinMap);

          let totalCustomerTipSum = 0;
          let totalSingleCustomerTipSum = 0;
          let totalComboCustomerTipSum = 0;
          let totalBkTipBonusSum = 0;

          const data: BkTipRecord[] = rows.map((r) => {
            const ordId = Number(r.orderId);
            const totalCustomerTip = Number(r.totalCustomerTip || 0);
            const bkTipAmount = Math.round((totalCustomerTip * (config.tipsPercent || 7)) / 100);
            const isCombo = comboOrderIdSet.has(ordId);

            totalCustomerTipSum += totalCustomerTip;
            if (isCombo) {
              totalComboCustomerTipSum += totalCustomerTip;
            } else {
              totalSingleCustomerTipSum += totalCustomerTip;
            }
            totalBkTipBonusSum += bkTipAmount;

            return {
              orderId: ordId,
              checkinTime: r.checkinTime ? new Date(r.checkinTime).toISOString() : '',
              clientName: String(r.clientName),
              clientAvatar: r.clientAvatar ? String(r.clientAvatar) : null,
              store: String(r.store),
              bookerName: String(r.bookerName),
              bookerAvatar: r.bookerAvatar ? String(r.bookerAvatar) : null,
              totalCustomerTip,
              bkTipAmount,
              bkTipPercentage: config.tipsPercent || 7,
              isCombo,
              bookingCategory: isCombo ? 'COMBO' : 'SINGLE',
            };
          });

          return {
            data,
            total: data.length,
            summary: {
              totalBookingsCount: data.length,
              tippedBookingsCount: data.length,
              totalSingleCustomerTip: totalSingleCustomerTipSum,
              totalComboCustomerTip: totalComboCustomerTipSum,
              totalCustomerTip: totalCustomerTipSum,
              totalBkTipBonus: totalBkTipBonusSum,
            },
          };
        },
      });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK tip details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết BK Tip.' });
    }
  });
}
