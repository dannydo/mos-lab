import { FastifyInstance } from 'fastify';
import { CvTipLeaderboardEntry, CvTipLeaderboardResponse, SafeAny, TIP_SYSTEM_CONFIG } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import {
  buildCvTipStaffMatchSql,
  createFastifyLegacyTipExecutor,
  CvlTrainingMentorshipService,
} from '../../services/cvl-training-mentorship.service.js';
import {
  actualCheckinQueryParams,
  buildActualCheckinOrdersCte,
  buildStaffTipSubquery,
  getActiveCvIds,
  resolveTipDateRange,
} from './cv-tip.helpers.js';

export function registerCvTipLeaderboardRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-tip/leaderboard
  fastify.get('/kpi/cv-tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const { startPart, endPart } = resolveTipDateRange(dateFrom, dateTo);

    try {
      const [activeCvIdsRaw, activeTrainingPairs] = await Promise.all([
        getActiveCvIds(fastify),
        CvlTrainingMentorshipService.getActivePairsForRange(fastify, startPart, endPart),
      ]);
      await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(
        createFastifyLegacyTipExecutor(fastify),
        activeTrainingPairs
      );
      const activeCvIds = activeCvIdsRaw || [47510, 48026, 46092, 37790, 34295, 51659];
      const activeCvStr = activeCvIds.join(',');

      let storeFilterClause = '';
      const storeQueryParams: string[] = [];
      if (storeId && storeId !== 'ALL') {
        storeFilterClause = 'AND csl.client_store_name LIKE ?';
        storeQueryParams.push(`%${storeId}%`);
      }

      const filteredOrdersCte = buildActualCheckinOrdersCte();
      const dateQueryParams = actualCheckinQueryParams(startPart, endPart);
      const leaderboardTipMatchSql = buildCvTipStaffMatchSql(
        activeTrainingPairs,
        'st_raw',
        'os_sub.assigned_staff_id',
        'os_sub.checkinTime'
      );
      const staffTipSubquery = buildStaffTipSubquery(
        leaderboardTipMatchSql,
        `WHERE os_i.assigned_staff_id IN (${activeCvStr})`
      );

      const summarySql = `
        ${filteredOrdersCte}
        SELECT 
          COUNT(*) as totalVisits,
          COUNT(CASE WHEN st.customer_tip_100 >= ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT} THEN 1 END) as totalTippedVisits,
          COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
        FROM filtered_orders fo
        JOIN \`order\` o ON o.id = fo.orderId
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN (
          SELECT 
            st.order_id,
            MAX(st.tip_amount) as tip_amount,
            MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE 0 END) as customer_tip_100
          FROM staff_tip st
          JOIN filtered_orders tip_orders ON tip_orders.orderId = st.order_id
          GROUP BY st.order_id
        ) st ON st.order_id = o.id
        WHERE 1 = 1
          ${storeFilterClause}
      `;

      const rawSql = `
        ${filteredOrdersCte}
        SELECT 
          tech.assigned_staff_id as staffId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT tech.orderId) as totalVisits,
          COUNT(DISTINCT CASE WHEN st.order_id IS NOT NULL AND st.customer_tip_100 >= ${TIP_SYSTEM_CONFIG.MIN_VALID_CUSTOMER_TIP_AMOUNT} THEN tech.orderId END) as tippedVisits,
          COALESCE(SUM(st.tip_amount), 0) as totalCvTipBonus,
          COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTipAmount
        FROM (
          SELECT DISTINCT fo.orderId, os.assigned_staff_id
          FROM filtered_orders fo
          JOIN order_service os ON os.order_id = fo.orderId
          WHERE os.assigned_staff_id IN (${activeCvStr})
        ) tech
        JOIN user_profile up ON up.user_id = tech.assigned_staff_id
        LEFT JOIN client_store cs ON cs.id = up.client_store_id
        JOIN \`order\` o ON o.id = tech.orderId
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN (
          ${staffTipSubquery}
        ) st ON st.order_id = o.id AND st.assigned_staff_id = tech.assigned_staff_id
        WHERE 1 = 1
          ${storeFilterClause}
        GROUP BY tech.assigned_staff_id, up.full_name, up.avatar, store
        ORDER BY totalCvTipBonus DESC
      `;

      const [summaryRows, dbRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql, ...dateQueryParams, ...storeQueryParams),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql, ...dateQueryParams, ...storeQueryParams),
      ]);

      const summaryRow = summaryRows[0] || {};
      const grandTotalVisits = Number(summaryRow.totalVisits || 0);
      const grandTippedVisits = Number(summaryRow.totalTippedVisits || 0);
      const grandTotalCustomerTip = Math.round(Number(summaryRow.totalCustomerTip || 0));

      let grandTotalCvTipBonus = 0;

      const leaderboard: CvTipLeaderboardEntry[] = dbRows.map((r, index) => {
        const totalVisits = Number(r.totalVisits || 0);
        const tippedVisits = Number(r.tippedVisits || 0);
        const tipRatePercent = totalVisits > 0 ? Math.min(100, Math.round((tippedVisits / totalVisits) * 100)) : 0;
        const totalCvTipBonus = Math.round(Number(r.totalCvTipBonus || 0));
        const totalCustomerTipAmount = Math.round(Number(r.totalCustomerTipAmount || 0));

        grandTotalCvTipBonus += totalCvTipBonus;

        return {
          rank: index + 1,
          technicianId: Number(r.staffId),
          displayName: String(r.displayName || ''),
          avatar: String(r.avatar || '') || null,
          store: String(r.store || 'PXL'),
          totalVisits,
          tippedVisits,
          tipRatePercent,
          totalCustomerTipAmount,
          totalCvTipBonus,
          targetCompletionRate: tipRatePercent,
        };
      });

      const response: CvTipLeaderboardResponse = {
        leaderboard,
        summary: {
          totalCvTipBonus: grandTotalCvTipBonus,
          totalCustomerTip: grandTotalCustomerTip,
          avgTipRatePercent:
            grandTotalVisits > 0 ? Math.min(100, Math.round((grandTippedVisits / grandTotalVisits) * 100)) : 0,
          totalTippedVisits: grandTippedVisits,
          totalVisits: grandTotalVisits,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Tip leaderboard');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CV Tip Leaderboard.' });
    }
  });
}
