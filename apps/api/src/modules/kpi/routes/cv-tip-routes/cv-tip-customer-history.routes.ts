import { FastifyInstance } from 'fastify';
import { CvTipCustomerHistoryResponse, CvTipCustomerVisit, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { resolveTipStatus } from './cv-tip.helpers.js';

export function registerCvTipCustomerHistoryRoutes(fastify: FastifyInstance) {
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
        const tipStatus = resolveTipStatus(totalCustomerTip);
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
          tipStatus,
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
