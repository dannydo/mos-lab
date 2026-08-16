import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  CvTipCustomerHistoryResponse,
  CvTipCustomerVisit,
  CvTipLeaderboardEntry,
  CvTipLeaderboardResponse,
  CvTipRecord,
  CvTipResponse,
  SafeAny,
} from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

async function getActiveCvIds(fastify: FastifyInstance): Promise<number[]> {
  const ids = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
  return ids.length > 0 ? ids : [47510, 48026, 46092, 37790, 34295, 51659];
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
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
      `;

      const rawSql = `
        SELECT 
          tech.assigned_staff_id as staffId,
          up.full_name as displayName,
          up.avatar as avatar,
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
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= '${startPart} 00:00:00' 
          AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= '${endPart} 23:59:59'
          AND o.order_state = 'Completed'
          ${storeFilterClause}
        GROUP BY tech.assigned_staff_id, up.full_name, up.avatar, store
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
          o.user_id as clientId,
          COALESCE(client_p.full_name, '') as clientName,
          COALESCE(csl.client_store_name, '') as store,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          COALESCE(tech_p.full_name, '') as techName,
          COALESCE(tech_p.avatar, '') as avatar,
          COALESCE(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END, 0) as totalCustomerTip,
          COALESCE(st.tip_amount, 0) as cvTipAmount,
          COALESCE(st.tip_percentage, 70) as cvTipPercentage,
          (
            SELECT COUNT(DISTINCT history_o.id)
            FROM \`order\` history_o
            WHERE history_o.user_id = o.user_id
              AND history_o.order_state = 'Completed'
          ) as clientTotalVisits,
          (
            SELECT COUNT(DISTINCT history_o.id)
            FROM \`order\` history_o
            JOIN staff_tip history_tip ON history_tip.order_id = history_o.id AND history_tip.tip_amount > 0
            WHERE history_o.user_id = o.user_id
              AND history_o.order_state = 'Completed'
          ) as clientTippedVisits
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
          clientId: Number(row.clientId || 0),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          serviceName: String(row.serviceName || ''),
          techName: String(row.techName || ''),
          avatar: String(row.avatar || '') || null,
          totalCustomerTip: Math.round(Number(row.totalCustomerTip || 0)),
          cvTipAmount,
          cvTipPercentage: Number(row.cvTipPercentage || 70),
          tipStatus: isTipped ? 'Tipped' : 'No Tip',
          clientTippedVisits: Number(row.clientTippedVisits || 0),
          clientTotalVisits: Number(row.clientTotalVisits || 0),
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

  // GET /api/kpi/cv-tip/customer-history?clientId=123
  // A customer visit is one completed order. Each row keeps all lash sets and staff who handled that visit.
  fastify.get('/kpi/cv-tip/customer-history', { preHandler: [requireAuth] }, async (request, reply) => {
    const { clientId, limit = 1000 } = request.query as { clientId?: string | number; limit?: number };
    const normalizedClientId = Number(clientId);

    if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'clientId không hợp lệ.' });
    }

    const boundedLimit = Math.min(Math.max(Number(limit) || 1000, 1), 1000);

    try {
      const rawSql = `
        SELECT
          o.id as orderId,
          o.user_id as clientId,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d %H:%i:%s') as checkinTime,
          COALESCE(client_p.full_name, '') as clientName,
          COALESCE(csl.client_store_name, '') as store,
          COALESCE(GROUP_CONCAT(DISTINCT COALESCE(sl.service_name, s.service_key) ORDER BY COALESCE(sl.service_name, s.service_key) SEPARATOR ' · '), '') as lashSets,
          COALESCE(GROUP_CONCAT(DISTINCT tech_p.full_name ORDER BY tech_p.full_name SEPARATOR ' · '), '') as cvNames,
          COALESCE(GROUP_CONCAT(DISTINCT cc_in_p.full_name ORDER BY cc_in_p.full_name SEPARATOR ' · '), '') as ccInName,
          COALESCE(GROUP_CONCAT(DISTINCT cc_out_p.full_name ORDER BY cc_out_p.full_name SEPARATOR ' · '), '') as ccOutName,
          COALESCE(booker_p.full_name, '') as bookerName,
          COALESCE(tip.totalCustomerTip, 0) as totalCustomerTip
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        LEFT JOIN client_store_language csl ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
        LEFT JOIN user_profile client_p ON client_p.user_id = o.user_id
        LEFT JOIN user_profile booker_p ON booker_p.user_id = o.created_staff_id
        LEFT JOIN order_service os ON os.order_id = o.id
        LEFT JOIN service s ON s.id = os.service_id
        LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
        LEFT JOIN user_profile tech_p ON tech_p.user_id = os.assigned_staff_id
        LEFT JOIN user_profile cc_in_p ON cc_in_p.user_id = os.check_in_staff_id
        LEFT JOIN user_profile cc_out_p ON cc_out_p.user_id = os.check_out_staff_id
        LEFT JOIN (
          SELECT
            order_id,
            MAX(CASE WHEN tip_percentage > 0 THEN tip_amount / (tip_percentage / 100) ELSE tip_amount END) as totalCustomerTip
          FROM staff_tip
          GROUP BY order_id
        ) tip ON tip.order_id = o.id
        WHERE o.user_id = ${normalizedClientId}
          AND o.order_state = 'Completed'
        GROUP BY o.id, o.user_id, ro.actual_booking_date_start, o.booking_date_start, client_p.full_name, csl.client_store_name, booker_p.full_name, tip.totalCustomerTip
        ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC, o.id DESC
        LIMIT ${boundedLimit}
      `;

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(rawSql);
      const data: CvTipCustomerVisit[] = rows.map((row) => {
        const totalCustomerTip = Math.round(Number(row.totalCustomerTip || 0));
        return {
          orderId: Number(row.orderId),
          checkinTime: String(row.checkinTime || ''),
          clientId: Number(row.clientId),
          clientName: String(row.clientName || ''),
          store: String(row.store || 'PXL'),
          lashSets: String(row.lashSets || ''),
          cvNames: String(row.cvNames || ''),
          ccInName: String(row.ccInName || ''),
          ccOutName: String(row.ccOutName || ''),
          bookerName: String(row.bookerName || ''),
          totalCustomerTip,
          tipStatus: totalCustomerTip > 0 ? 'Tipped' : 'No Tip',
        };
      });

      const tippedVisits = data.filter((visit) => visit.tipStatus === 'Tipped').length;
      const response: CvTipCustomerHistoryResponse = {
        data,
        total: data.length,
        summary: {
          totalVisits: data.length,
          tippedVisits,
          nonTippedVisits: data.length - tippedVisits,
        },
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error(err as Error, 'Error fetching CV tip customer history');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể lấy lịch sử tip của khách hàng.' });
    }
  });
}
