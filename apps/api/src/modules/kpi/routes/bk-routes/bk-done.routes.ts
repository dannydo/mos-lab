import { FastifyInstance } from 'fastify';
import { BkDoneRecord, SafeAny, maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  getActiveBkTelesalesIds,
  computeBkOrderCheckins,
  getCustomerTipAmountByOrderIds,
} from '../../services/bk-salary.service.js';
import { ComboRecognitionService } from '../../../customers/services/combo-recognition.service.js';
import { BkLeaderboardService } from '../../services/bk-leaderboard.service.js';
import {
  BK_CLIENT_PHONE_SELECT_SQL,
  buildBkOrderDateWindowCondition,
  buildBkStoreFilter,
  createBkSwrCacheState,
  parseBkDateRangeParts,
  resolveWithBkSwrCache,
} from './bk-route.helpers.js';

const doneDetailsSwrState = createBkSwrCacheState();

const ALLOWED_DONE_STATUSES = [
  'ALL',
  'COMPLETED',
  'NEW_CUSTOMER',
  'SINGLE',
  'COMBO_LIVE',
  'COMBO_SOLD',
  'MISSED',
  'TIP',
  'COMBO',
];

function createEmptyDoneDetailsPayload() {
  return {
    data: [],
    total: 0,
    summary: { totalDone: 0, avgDoneRate: 0, totalDoneBonus: 0 },
  };
}

async function fetchNewCustomerOrderSet(fastify: FastifyInstance, orderIds: number[]): Promise<Set<number>> {
  if (orderIds.length === 0) return new Set<number>();
  const newCustRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT o.id as orderId
    FROM \`order\` o
    JOIN report_order ro ON ro.order_id = o.id
    WHERE o.id IN (${orderIds.join(',')})
      AND o.order_state IN ('Completed', 'CheckOut')
      AND ro.actual_booking_date_start IS NOT NULL
      AND ro.actual_booking_date_end IS NOT NULL
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
  `);
  return new Set<number>(newCustRows.map((r) => Number(r.orderId)));
}

export function registerBkDoneRoutes(fastify: FastifyInstance) {
  // 2. Done Leaderboard
  fastify.get('/kpi/bk/done/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = await BkLeaderboardService.getDoneLeaderboard(fastify, request.query as SafeAny);
      return payload;
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

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);
    const requestedStatus = (status || 'ALL').toUpperCase();
    const statusParam = ALLOWED_DONE_STATUSES.includes(requestedStatus) ? requestedStatus : 'ALL';

    const canViewPhone = !shouldMaskCustomerPhone(request.user?.role);
    const cacheKey = `bk:done:details:${startPart}:${endPart}:${bookerId || 'ALL'}:${storeId || 'ALL'}:${statusParam}:${canViewPhone ? 'full' : 'masked'}`;

    try {
      return await resolveWithBkSwrCache({
        fastify,
        cacheKey,
        state: doneDetailsSwrState,
        freshTtlMs: 180_000,
        staleMaxAgeMs: 900_000,
        cacheTtlMs: 900_000,
        logTag: '[BkDoneDetails]',
        compute: async ({ skipCache }) => {
          const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
          if (activeTelesalesIds.length === 0) {
            skipCache();
            return createEmptyDoneDetailsPayload();
          }

          let targetBkIds = activeTelesalesIds;
          const isSpecificBooker = Boolean(bookerId && bookerId !== 'ALL');
          if (isSpecificBooker) {
            const requestedBookerId = Number(bookerId);
            if (!activeTelesalesIds.includes(requestedBookerId)) {
              skipCache();
              return createEmptyDoneDetailsPayload();
            }
            targetBkIds = [requestedBookerId];
          }

          const bookerFilter = isSpecificBooker
            ? `AND o.created_staff_id = ${Number(bookerId)}`
            : `AND o.created_staff_id IN (${targetBkIds.join(',')})`;
          const storeFilter = buildBkStoreFilter(storeId);

          let stateCondition = '';
          let dateCondition = `AND ${buildBkOrderDateWindowCondition(startPart, endPart)}`;
          let orderDateField = 'COALESCE(ro.actual_booking_date_start, o.booking_date_start)';

          if (['COMPLETED', 'NEW_CUSTOMER', 'SINGLE', 'COMBO_LIVE', 'COMBO_SOLD', 'COMBO'].includes(statusParam)) {
            stateCondition = `AND (o.order_state IN ('Completed', 'CheckOut') OR ro.actual_booking_date_start IS NOT NULL OR o.total_price > 0)`;
          } else if (statusParam === 'MISSED') {
            stateCondition = `AND o.booking_date_start <= NOW() AND ro.actual_booking_date_start IS NULL AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
            orderDateField = 'o.booking_date_start';
            dateCondition = `AND (o.booking_date_start >= '${startPart} 00:00:00' AND o.booking_date_start <= '${endPart} 23:59:59')`;
          }

          // Compute Check-in bonuses per Order
          const { orderCheckinMap } = await computeBkOrderCheckins(
            fastify,
            startPart,
            endPart,
            targetBkIds,
            storeFilter
          );

          const sql = `
            SELECT 
              o.id as orderId,
              o.order_key as orderKey,
              o.user_id as customerId,
              COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
              COALESCE(up_c.full_name, 'Khách hàng') as clientName,
              up_c.avatar as clientAvatar,
              ${BK_CLIENT_PHONE_SELECT_SQL},
              UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
              COALESCE(o.total_price, 0) as totalPrice,
              up_b.full_name as bookerName,
              up_b.avatar as bookerAvatar,
              o.order_state as orderState
            FROM \`order\` o
            LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
            LEFT JOIN \`user_profile\` up_b ON up_b.user_id = o.created_staff_id
            LEFT JOIN \`client_store\` cs ON cs.id = COALESCE(o.client_store_id, up_b.client_store_id)
            LEFT JOIN report_order ro ON o.id = ro.order_id
            WHERE 1=1
              ${dateCondition}
              ${stateCondition}
              ${bookerFilter}
              ${storeFilter}
            ORDER BY ${orderDateField} DESC
            LIMIT 500
          `;

          const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);
          const returnedOrderIds = rows.map((r) => Number(r.orderId)).filter((id) => !!id);

          const [tipMap, comboSalesByOrder, newCustomerOrderSet] = await Promise.all([
            getCustomerTipAmountByOrderIds(fastify, returnedOrderIds),
            ComboRecognitionService.getRecognizedComboSalesByOrderIds(fastify, returnedOrderIds),
            fetchNewCustomerOrderSet(fastify, returnedOrderIds),
          ]);

          const filteredRows = rows.filter((row) => {
            const orderId = Number(row.orderId);
            const checkinInfo = orderCheckinMap.get(orderId);
            const isCompleted = String(row.orderState) === 'Completed';
            const isComboLive = Boolean(checkinInfo?.isCombo);
            const isComboSold = (comboSalesByOrder.get(orderId)?.netRevenue || 0) > 0;
            const isNewCustomer = newCustomerOrderSet.has(orderId);

            if (statusParam === 'NEW_CUSTOMER') return isCompleted && isNewCustomer;
            if (statusParam === 'TIP') return isCompleted && (tipMap.get(orderId) || 0) > 0;
            if (statusParam === 'COMBO' || statusParam === 'COMBO_SOLD') return isCompleted && isComboSold;
            if (statusParam === 'SINGLE') return isCompleted && !isComboLive;
            if (statusParam === 'COMBO_LIVE') return isCompleted && isComboLive;
            return true;
          });

          let totalDoneBonusSum = 0;

          const data: BkDoneRecord[] = filteredRows.map((r) => {
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
            const netRev = isCompletedOrder ? Math.round(totalPrice) : 0;
            const comboSale = comboSalesByOrder.get(orderId);
            const isSingle = isCompletedOrder && !checkinInfo.isCombo;
            const isComboSold = Boolean(comboSale && ((comboSale.netRevenue || 0) > 0 || Boolean(comboSale.comboName)));
            const isNewCustomer = newCustomerOrderSet.has(orderId);

            return {
              orderId,
              orderKey: String(r.orderKey || `#${r.orderId}`),
              orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
              clientName: String(r.clientName),
              clientPhone: shouldMaskCustomerPhone(request.user?.role)
                ? maskPhoneNumber(r.clientPhone)
                : String(r.clientPhone || ''),
              clientAvatar: r.clientAvatar ? String(r.clientAvatar) : null,
              bookerName: r.bookerName ? String(r.bookerName) : undefined,
              bookerAvatar: r.bookerAvatar ? String(r.bookerAvatar) : null,
              store: String(r.store),
              serviceName: checkinInfo.serviceName || String(r.serviceName || 'Đặt lịch dịch vụ'),
              servicePrice: checkinInfo.servicePrice || 0,
              discountPercent: Math.round(checkinInfo.discountPercent || 0),
              isSingle,
              isComboLive: checkinInfo.isCombo,
              isComboSold,
              isNewCustomer,
              netRevenue: netRev,
              comboName: comboSale?.comboName,
              comboRevenue: comboSale?.netRevenue || 0,
              tipAmount: tipMap.get(orderId) || 0,
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

          let totalSingleDone = 0;
          let totalComboLiveDone = 0;
          let totalComboSold = 0;
          let totalComboRevenue = 0;
          let totalNewCustomerDone = 0;

          data.forEach((d) => {
            if (d.isSingle) totalSingleDone++;
            if (d.isComboLive) totalComboLiveDone++;
            if (d.isComboSold) {
              totalComboSold++;
              totalComboRevenue += d.comboRevenue || 0;
            }
            if (d.isNewCustomer) totalNewCustomerDone++;
          });

          const singleToComboRate =
            totalSingleDone > 0 ? Number(((totalComboSold / totalSingleDone) * 100).toFixed(1)) : 0;
          const avgNewCustomerRate =
            data.length > 0 ? Number(((totalNewCustomerDone / data.length) * 100).toFixed(1)) : 0;

          return {
            data,
            total: data.length,
            summary: {
              totalDone: data.length,
              totalNewCustomerDone,
              avgNewCustomerRate,
              avgDoneRate: 100,
              totalDoneBonus: totalDoneBonusSum,
              totalSingleDone,
              totalComboLiveDone,
              totalComboSold,
              comboRevenue: totalComboRevenue,
              singleToComboRate,
            },
          };
        },
      });
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK done details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Done.' });
    }
  });
}
