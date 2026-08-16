import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CcTipLeaderboardEntry, CcTipLeaderboardResponse, CcTipRecord, CcTipResponse, SafeAny } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

async function getActiveCcIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG');
  return ids.length > 0 ? ids : [37790, 34295, 46092, 51659, 48026, 48997];
}

export async function registerCcTipRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cc-tip/leaderboard
  fastify.get('/kpi/cc-tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
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
      const activeCcIds = (await getActiveCcIds(fastify)) || [37790, 34295, 46092, 51659, 48026, 48997];
      const activeCcStr = activeCcIds.join(',');

      let storeFilterClause = '';
      if (storeId && storeId !== 'ALL') {
        storeFilterClause = `AND csl.client_store_name LIKE '%${storeId}%'`;
      }

      const summarySql = `
        SELECT 
          COUNT(DISTINCT o.id) as totalVisits,
          COUNT(DISTINCT CASE WHEN st.tip_amount > 0 THEN o.id END) as totalTippedVisits,
          COALESCE(SUM(st.customer_tip_100), 0) as totalCustomerTip
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN (
          SELECT 
            order_id, 
            MAX(tip_amount) as tip_amount,
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE 0 END) as customer_tip_100
          FROM staff_tip
          GROUP BY order_id
        ) st ON st.order_id = o.id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
      `;

      const rawSql = `
        SELECT 
          cc.user_id as staffId,
          up.full_name as displayName,
          up.avatar as avatar,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT cc.order_id) as totalVisits,
          COUNT(DISTINCT CASE WHEN st.id IS NOT NULL AND st.tip_amount > 0 THEN cc.order_id END) as tippedVisits,
          COALESCE(SUM(st.tip_amount), 0) as totalCcTipBonus,
          COALESCE(SUM(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE 0 END), 0) as totalCustomerTipAmount
        FROM (
          SELECT DISTINCT check_in_staff_id as user_id, order_id FROM order_service WHERE check_in_staff_id IN (${activeCcStr})
          UNION
          SELECT DISTINCT check_out_staff_id as user_id, order_id FROM order_service WHERE check_out_staff_id IN (${activeCcStr})
        ) cc
        JOIN user_profile up ON up.user_id = cc.user_id
        LEFT JOIN client_store cs ON cs.id = up.client_store_id
        JOIN \`order\` o ON o.id = cc.order_id
        LEFT JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN staff_tip st ON st.order_id = o.id AND st.user_id = cc.user_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
        GROUP BY cc.user_id, up.full_name, up.avatar, store
        ORDER BY totalCcTipBonus DESC
      `;

      const [summaryRows, dbRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql),
      ]);

      const summaryRow = summaryRows[0] || {};
      const grandTotalVisits = Number(summaryRow.totalVisits || 0);
      const grandTippedVisits = Number(summaryRow.totalTippedVisits || 0);
      const grandTotalCustomerTip = Math.round(Number(summaryRow.totalCustomerTip || 0));

      let grandTotalCcTipBonus = 0;

      const leaderboard: CcTipLeaderboardEntry[] = dbRows.map((r, index) => {
        const totalVisits = Number(r.totalVisits || 0);
        const tippedVisits = Number(r.tippedVisits || 0);
        const tipRatePercent = totalVisits > 0 ? Math.min(100, Math.round((tippedVisits / totalVisits) * 100)) : 0;
        const totalCcTipBonus = Math.round(Number(r.totalCcTipBonus || 0));
        const totalCustomerTipAmount = Math.round(Number(r.totalCustomerTipAmount || 0));

        grandTotalCcTipBonus += totalCcTipBonus;

        return {
          rank: index + 1,
          consultantId: Number(r.staffId),
          displayName: String(r.displayName || ''),
          avatar: String(r.avatar || '') || null,
          store: String(r.store || 'PXL'),
          totalVisits,
          tippedVisits,
          tipRatePercent,
          totalCustomerTipAmount,
          totalCcTipBonus,
          targetCompletionRate: tipRatePercent,
        };
      });

      const response: CcTipLeaderboardResponse = {
        leaderboard,
        summary: {
          totalCcTipBonus: grandTotalCcTipBonus,
          totalCustomerTip: grandTotalCustomerTip,
          avgTipRatePercent:
            grandTotalVisits > 0 ? Math.min(100, Math.round((grandTippedVisits / grandTotalVisits) * 100)) : 0,
          totalTippedVisits: grandTippedVisits,
          totalVisits: grandTotalVisits,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Tip leaderboard');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy dữ liệu CC Tip Leaderboard.' });
    }
  });

  // GET /api/kpi/cc-tip/records
  fastify.get('/kpi/cc-tip/records', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      dateFrom,
      dateTo,
      storeId,
      consultantId,
      tipFilter = 'ALL',
      page = 1,
      limit = 3000,
    } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
      consultantId?: string;
      tipFilter?: 'ALL' | 'TIPPED' | 'NO_TIP';
      page?: number;
      limit?: number;
    };

    const startStr = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    try {
      const activeCcIds = (await getActiveCcIds(fastify)) || [37790, 34295, 46092, 51659, 48026, 48997];
      const activeCcStr = activeCcIds.join(',');

      let whereCond = `ro.date BETWEEN '${startPart}' AND '${endPart}' AND o.order_state = 'Completed'`;

      if (consultantId && consultantId !== 'ALL') {
        const numId = Number(consultantId);
        if (!isNaN(numId)) {
          whereCond += ` AND (os.check_in_staff_id = ${numId} OR os.check_out_staff_id = ${numId})`;
        } else {
          whereCond += ` AND (checkin_p.full_name LIKE '%${consultantId}%' OR checkout_p.full_name LIKE '%${consultantId}%')`;
        }
      } else {
        whereCond += ` AND (os.check_in_staff_id IN (${activeCcStr}) OR os.check_out_staff_id IN (${activeCcStr}))`;
      }

      if (storeId && storeId !== 'ALL') {
        whereCond += ` AND csl.client_store_name LIKE '%${storeId}%'`;
      }

      let tipJoinClause = '';
      if (consultantId && consultantId !== 'ALL' && !isNaN(Number(consultantId))) {
        tipJoinClause = `AND st.user_id = ${Number(consultantId)}`;
      } else {
        tipJoinClause = `AND st.user_id = COALESCE(NULLIF(os.check_out_staff_id, 0), os.check_in_staff_id)`;
      }

      const rawSql = `
        SELECT 
          o.id as orderId,
          os.id as serviceId,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%d %H:%i:%s') as checkinTime,
          COALESCE(client_p.full_name, '') as clientName,
          COALESCE(csl.client_store_name, '') as store,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          COALESCE(checkin_p.full_name, '') as ccInName,
          COALESCE(checkout_p.full_name, '') as ccOutName,
          COALESCE(NULLIF(checkin_p.avatar, ''), NULLIF(checkin_p.avatar_internal, '')) as ccInAvatar,
          COALESCE(NULLIF(checkout_p.avatar, ''), NULLIF(checkout_p.avatar_internal, '')) as ccOutAvatar,
          COALESCE(checkin_p.full_name, checkout_p.full_name, '') as consultantName,
          COALESCE(st.tip_amount, 0) as ccTipAmount,
          COALESCE(st.tip_percentage, 0) as ccTipPercentage,
          COALESCE(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE 0 END, 0) as totalCustomerTip
        FROM \`order\` o
        JOIN order_service os ON os.order_id = o.id
        JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
        LEFT JOIN user_profile checkin_p ON os.check_in_staff_id = checkin_p.user_id
        LEFT JOIN user_profile checkout_p ON os.check_out_staff_id = checkout_p.user_id
        LEFT JOIN staff_tip st ON st.order_id = o.id ${tipJoinClause}
        WHERE ${whereCond}
        GROUP BY os.id, ro.actual_booking_date_start
        ORDER BY ro.actual_booking_date_start DESC, os.id DESC
      `;

      const dbRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);

      const allRecords: CcTipRecord[] = dbRows.map((row) => {
        const ccTipAmount = Math.round(Number(row.ccTipAmount || 0));
        const isTipped = ccTipAmount > 0;
        return {
          orderId: Number(row.orderId),
          serviceId: Number(row.serviceId),
          checkinTime: String(row.checkinTime || ''),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          serviceName: String(row.serviceName || ''),
          ccInName: String(row.ccInName || ''),
          ccOutName: String(row.ccOutName || ''),
          ccInAvatar: row.ccInAvatar ? String(row.ccInAvatar) : null,
          ccOutAvatar: row.ccOutAvatar ? String(row.ccOutAvatar) : null,
          consultantName: String(row.consultantName || ''),
          totalCustomerTip: Math.round(Number(row.totalCustomerTip || 0)),
          ccTipAmount,
          ccTipPercentage: Number(row.ccTipPercentage || 0),
          tipStatus: isTipped ? 'Tipped' : 'No Tip',
        };
      });

      let filteredRecords = allRecords;
      if (tipFilter === 'TIPPED') {
        filteredRecords = allRecords.filter((r) => r.tipStatus === 'Tipped');
      } else if (tipFilter === 'NO_TIP') {
        filteredRecords = allRecords.filter((r) => r.tipStatus === 'No Tip');
      }

      // Group by orderId to sum the unique tip amounts per order and count unique visits
      const uniqueOrderTipsMap = new Map<number, { customerTip: number; ccTip: number; isTipped: boolean }>();
      allRecords.forEach((r) => {
        if (!uniqueOrderTipsMap.has(r.orderId)) {
          uniqueOrderTipsMap.set(r.orderId, {
            customerTip: r.totalCustomerTip,
            ccTip: r.ccTipAmount,
            isTipped: r.tipStatus === 'Tipped',
          });
        }
      });

      const totalVisits = uniqueOrderTipsMap.size;
      let tippedVisits = 0;
      let totalCcTipBonus = 0;
      let totalCustomerTip = 0;

      uniqueOrderTipsMap.forEach((val) => {
        if (val.isTipped) {
          tippedVisits += 1;
        }
        totalCcTipBonus += val.ccTip;
        totalCustomerTip += val.customerTip;
      });

      const nonTippedVisits = totalVisits - tippedVisits;
      const tipRatePercent = totalVisits > 0 ? Math.min(100, Math.round((tippedVisits / totalVisits) * 100)) : 0;

      const paginatedData = filteredRecords.slice((page - 1) * limit, page * limit);

      const response: CcTipResponse = {
        data: paginatedData,
        total: filteredRecords.length,
        summary: {
          totalVisits,
          tippedVisits,
          nonTippedVisits,
          tipRatePercent,
          totalCustomerTip,
          totalCcTipBonus,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CC Tip records');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách chi tiết CC Tip.' });
    }
  });
}
