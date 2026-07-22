import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CvTipLeaderboardEntry, CvTipLeaderboardResponse, CvTipRecord, CvTipResponse } from '@mos-lab/shared';

type SafeAny = any;

async function getActiveCvIds(fastify: FastifyInstance): Promise<number[] | null> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_CV_STAFF_CONFIG' },
    });
    if (configRecord && configRecord.value) {
      const parsed = JSON.parse(configRecord.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((id: SafeAny) => Number(id)).filter((id: number) => !isNaN(id));
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error fetching ACTIVE_CV_STAFF_CONFIG for CV Tip from DB');
  }
  return null;
}

export async function registerCvTipRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/cv-tip/leaderboard
  fastify.get('/kpi/cv-tip/leaderboard', { preHandler: [requireAuth] }, async (request, reply) => {
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
      const activeCvIds = (await getActiveCvIds(fastify)) || [47510, 48026, 46092, 37790, 34295, 51659];
      const activeCvStr = activeCvIds.join(',');

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
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN (
          SELECT 
            order_id, 
            MAX(tip_amount) as tip_amount,
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE 0 END) as customer_tip_100
          FROM staff_tip
          GROUP BY order_id
        ) st ON st.order_id = o.id
        WHERE o.booking_date_start >= '${startPart} 00:00:00' 
          AND o.booking_date_start <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
      `;

      const rawSql = `
        SELECT 
          tech.assigned_staff_id as staffId,
          up.full_name as displayName,
          UPPER(COALESCE(cs.client_store_key, 'PXL')) as store,
          COUNT(DISTINCT tech.order_id) as totalVisits,
          COUNT(DISTINCT CASE WHEN st.id IS NOT NULL AND st.tip_amount > 0 THEN tech.order_id END) as tippedVisits,
          COALESCE(SUM(st.tip_amount), 0) as totalCvTipBonus,
          COALESCE(SUM(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE 0 END), 0) as totalCustomerTipAmount
        FROM (
          SELECT DISTINCT order_id, assigned_staff_id FROM order_service WHERE assigned_staff_id IN (${activeCvStr})
        ) tech
        JOIN user_profile up ON up.user_id = tech.assigned_staff_id
        LEFT JOIN client_store cs ON cs.id = up.client_store_id
        JOIN \`order\` o ON o.id = tech.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN staff_tip st ON st.order_id = o.id AND st.user_id = tech.assigned_staff_id
        WHERE o.booking_date_start >= '${startPart} 00:00:00' 
          AND o.booking_date_start <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
        GROUP BY tech.assigned_staff_id, up.full_name, store
        ORDER BY totalCvTipBonus DESC
      `;

      const [summaryRows, dbRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(summarySql),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql),
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

  // GET /api/kpi/cv-tip/records
  fastify.get('/kpi/cv-tip/records', { preHandler: [requireAuth] }, async (request, reply) => {
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
      const activeCvIds = (await getActiveCvIds(fastify)) || [47510, 48026, 46092, 37790, 34295, 51659];
      const activeCvStr = activeCvIds.join(',');

      let whereCond = `ro.date BETWEEN '${startPart}' AND '${endPart}' AND o.order_state = 'Completed'`;

      if (consultantId && consultantId !== 'ALL') {
        const numId = Number(consultantId);
        if (!isNaN(numId)) {
          whereCond += ` AND os.assigned_staff_id = ${numId}`;
        } else {
          whereCond += ` AND tech_p.full_name LIKE '%${consultantId}%'`;
        }
      } else {
        whereCond += ` AND os.assigned_staff_id IN (${activeCvStr})`;
      }

      if (storeId && storeId !== 'ALL') {
        whereCond += ` AND csl.client_store_name LIKE '%${storeId}%'`;
      }

      const rawSql = `
        SELECT 
          o.id as orderId,
          os.id as serviceId,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%d %H:%i:%s') as checkinTime,
          COALESCE(client_p.full_name, '') as clientName,
          COALESCE(csl.client_store_name, '') as store,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          COALESCE(tech_p.full_name, '') as techName,
          COALESCE(st.tip_amount, 0) as totalCustomerTip,
          COALESCE(ROUND(st.tip_amount * 0.7), 0) as cvTipAmount
        FROM \`order\` o
        JOIN order_service os ON os.order_id = o.id
        JOIN report_order ro ON o.id = ro.order_id
        JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN user_profile client_p ON o.user_id = client_p.user_id
        LEFT JOIN user_profile tech_p ON os.assigned_staff_id = tech_p.user_id
        LEFT JOIN staff_tip st ON st.order_id = o.id AND st.user_id = os.assigned_staff_id
        WHERE ${whereCond}
        GROUP BY os.id, ro.actual_booking_date_start
        ORDER BY ro.actual_booking_date_start DESC, os.id DESC
      `;

      const dbRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);

      const allRecords: CvTipRecord[] = dbRows.map((row) => {
        const cvTipAmount = Math.round(Number(row.cvTipAmount || 0));
        const isTipped = cvTipAmount > 0;
        return {
          orderId: Number(row.orderId),
          serviceId: Number(row.serviceId),
          checkinTime: String(row.checkinTime || ''),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          serviceName: String(row.serviceName || ''),
          techName: String(row.techName || ''),
          totalCustomerTip: Math.round(Number(row.totalCustomerTip || 0)),
          cvTipAmount,
          cvTipPercentage: 70,
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
      const uniqueOrderTipsMap = new Map<number, { customerTip: number; cvTip: number; isTipped: boolean }>();
      allRecords.forEach((r) => {
        if (!uniqueOrderTipsMap.has(r.orderId)) {
          uniqueOrderTipsMap.set(r.orderId, {
            customerTip: r.totalCustomerTip,
            cvTip: r.cvTipAmount,
            isTipped: r.tipStatus === 'Tipped',
          });
        }
      });

      const totalVisits = uniqueOrderTipsMap.size;
      let tippedVisits = 0;
      let totalCvTipBonus = 0;
      let totalCustomerTip = 0;

      uniqueOrderTipsMap.forEach((val) => {
        if (val.isTipped) {
          tippedVisits += 1;
        }
        totalCvTipBonus += val.cvTip;
        totalCustomerTip += val.customerTip;
      });

      const nonTippedVisits = totalVisits - tippedVisits;
      const tipRatePercent = totalVisits > 0 ? Math.min(100, Math.round((tippedVisits / totalVisits) * 100)) : 0;

      const paginatedData = filteredRecords.slice((page - 1) * limit, page * limit);

      const response: CvTipResponse = {
        data: paginatedData,
        total: filteredRecords.length,
        summary: {
          totalVisits,
          tippedVisits,
          nonTippedVisits,
          tipRatePercent,
          totalCustomerTip,
          totalCvTipBonus,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV Tip records');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách chi tiết CV Tip.' });
    }
  });
}
