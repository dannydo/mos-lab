import { FastifyInstance } from 'fastify';
import { BkRevenueRecord, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  getActiveBkTelesalesIds,
  getBkSalaryConfig,
  getRevCommissionRate,
  resolveBkTelesalesStaffScope,
} from '../../services/bk-salary.service.js';
import { BkLeaderboardService } from '../../services/bk-leaderboard.service.js';
import { buildBkStoreFilter, parseBkDateRangeParts } from './bk-route.helpers.js';

export function registerBkRevenueRoutes(fastify: FastifyInstance) {
  // 4. Revenue Leaderboard
  fastify.get('/kpi/bk/revenue/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = await BkLeaderboardService.getRevenueLeaderboard(fastify, request.query as SafeAny);
      return payload;
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

    const { startPart, endPart } = parseBkDateRangeParts(dateFrom, dateTo);

    try {
      const config = await getBkSalaryConfig(fastify);
      const activeTelesalesIds = await getActiveBkTelesalesIds(fastify);
      const scopedBookerIds = resolveBkTelesalesStaffScope(activeTelesalesIds, bookerId);
      if (scopedBookerIds.length === 0) {
        return reply.send({
          data: [],
          total: 0,
          summary: { completedOrdersCount: 0, totalRevenue: 0, totalCommissionBonus: 0 },
        });
      }
      const bookerFilter = `AND o.created_staff_id IN (${scopedBookerIds.join(',')})`;
      const storeFilter = buildBkStoreFilter(storeId);

      const sql = `
        SELECT 
          o.id as orderId,
          o.order_key as orderKey,
          COALESCE(ro.actual_booking_date_start, o.booking_date_start) as orderDate,
          COALESCE(up_c.full_name, 'Khách hàng') as clientName,
          up_c.avatar as clientAvatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COALESCE(o.total_price, 0) as totalOrderPrice
        FROM \`order\` o
        LEFT JOIN \`user_profile\` up_c ON up_c.user_id = o.user_id
        LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state IN ('Completed', 'CheckOut')
          ${bookerFilter}
          ${storeFilter}
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
        LIMIT 500
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql);

      const returnedOrderIds = rows.map((r) => Number(r.orderId));
      const comboRows =
        returnedOrderIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
              SELECT order_id, COALESCE(SUM(total_price), 0) as combo_price
              FROM order_service_combo
              WHERE order_id IN (${returnedOrderIds.join(',')})
              GROUP BY order_id
            `)
          : [];
      const comboPriceMap = new Map<number, number>();
      comboRows.forEach((cr) => comboPriceMap.set(Number(cr.order_id), Number(cr.combo_price || 0)));

      let totalRevenueSum = 0;
      let totalSingleRevenueSum = 0;
      let totalComboRevenueSum = 0;
      let totalCommissionSum = 0;

      const data: BkRevenueRecord[] = rows.map((r) => {
        // Keep the per-order detail aligned with the leaderboard's net-revenue basis.
        const ordId = Number(r.orderId);
        const totalOrderPrice = Math.round(Number(r.totalOrderPrice || 0));
        const comboPrice = Math.round(comboPriceMap.get(ordId) || 0);
        const isCombo = comboPrice > 0;
        const singlePrice = Math.max(0, totalOrderPrice - comboPrice);
        const commissionRate = getRevCommissionRate(totalOrderPrice, config.revBonusTiers);
        const commissionBonus = Math.round((totalOrderPrice * commissionRate) / 100);

        totalRevenueSum += totalOrderPrice;
        totalSingleRevenueSum += singlePrice;
        totalComboRevenueSum += comboPrice;
        totalCommissionSum += commissionBonus;

        return {
          orderId: ordId,
          orderKey: String(r.orderKey || `#${ordId}`),
          orderDate: r.orderDate ? new Date(r.orderDate).toISOString() : '',
          clientName: String(r.clientName),
          clientAvatar: r.clientAvatar ? String(r.clientAvatar) : null,
          store: String(r.store),
          totalOrderPrice,
          commissionRate,
          commissionBonus,
          isCombo,
          orderCategory: isCombo ? 'COMBO' : 'SINGLE',
        };
      });

      return {
        data,
        total: data.length,
        summary: {
          completedOrdersCount: data.length,
          totalSingleRevenue: totalSingleRevenueSum,
          totalComboRevenue: totalComboRevenueSum,
          totalRevenue: totalRevenueSum,
          totalCommissionBonus: totalCommissionSum,
        },
      };
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Error fetching BK revenue details');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Lỗi tải chi tiết Doanh Thu.' });
    }
  });
}
