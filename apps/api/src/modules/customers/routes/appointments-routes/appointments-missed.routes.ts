import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { createRouteHelpers } from '../helpers.js';
import { AppointmentAuthUser, LegacyQueryRows, MissedLogPostBody, MissedSummaryQuery } from './appointments.types.js';

const REASON_LABELS: Record<string, string> = {
  KH_DOI_HUY_LICH: 'Khách đổi/hủy lịch',
  GOI_KHONG_NGHE: 'Gọi không nghe máy / Thuê bao',
  TIEM_QUATAI: 'Tiệm quá tải / Hết ghế',
  BOOKER_LATHUONG: 'Booker tư vấn sai / Đặt nhầm',
  CV_BAN_LOI: 'CV bận / Phục vụ chậm',
  KTV_BAN_LOI: 'CV bận / Phục vụ chậm',
  KH_QUEN_LICH: 'Khách quên lịch',
  LY_DO_KHAC: 'Lý do khác',
};

const RESP_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  BOOKER: 'Booker (Telesales)',
  CC: 'Tư vấn viên (CC)',
  TECHNICIAN: 'Chuyên viên (CV)',
  STORE_SYSTEM: 'Hệ thống / Cửa hàng',
};

const FOLLOWUP_LABELS: Record<string, string> = {
  PENDING: 'Chưa xử lý',
  CONTACTED: 'Đã gọi chăm sóc',
  RESCHEDULED: 'Đã đặt lại lịch',
  UNREACHABLE: 'Không liên hệ được',
  CANCELLED: 'Khách hủy hẳn',
};

export async function registerAppointmentsMissedRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerMutateAccess } = createRouteHelpers(fastify);

  // POST /api/customers/missed/log
  // Upsert missed log reason, responsibility, note, follow-up status, and sync callback date to Daily Plan
  fastify.post('/customers/missed/log', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as AppointmentAuthUser;
    const {
      orderId,
      reasonCategory,
      responsibility,
      note,
      followUpStatus = 'PENDING',
      callbackDate,
    } = request.body as MissedLogPostBody;

    if (!orderId || !reasonCategory || !responsibility) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'orderId, reasonCategory và responsibility là các trường bắt buộc.',
      });
    }

    const numOrderId = Number(orderId);
    const createdBy = user.displayName || user.username || 'Staff';
    const cbDate = callbackDate ? new Date(callbackDate) : null;

    try {
      const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
        `SELECT user_id as userId FROM \`order\` WHERE id = ? LIMIT 1`,
        numOrderId
      );
      const legacyUserId = Number(orderRows[0]?.userId);
      if (!legacyUserId) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }
      if (!(await ensureTelesalesCustomerMutateAccess(request, reply, legacyUserId))) return;

      const log = await fastify.prisma.crm.crmMissedLog.upsert({
        where: { orderId: numOrderId },
        create: {
          orderId: numOrderId,
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
        update: {
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
      });

      // Automatically sync callbackDate to CRM Daily Plan if scheduled
      if (cbDate && followUpStatus === 'CONTACTED') {
        const staffId = user.id;
        try {
          await fastify.prisma.crm.crmDailyPlan.upsert({
            where: {
              legacyUserId_plannedDate: {
                legacyUserId,
                plannedDate: cbDate,
              },
            },
            create: {
              legacyUserId,
              staffId,
              plannedDate: cbDate,
              bucket: 'MISSED_FOLLOWUP',
              priority: 1,
              status: 'PLANNED',
            },
            update: {
              staffId,
              status: 'PLANNED',
            },
          });
        } catch {
          // Ignore duplicate plan errors if any
        }
      }

      return reply.send({
        success: true,
        data: {
          id: log.id,
          orderId: log.orderId,
          reasonCategory: log.reasonCategory,
          responsibility: log.responsibility,
          note: log.note,
          followUpStatus: log.followUpStatus,
          callbackDate: log.callbackDate ? log.callbackDate.toISOString().slice(0, 10) : null,
          createdBy: log.createdBy,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        },
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Save missed log error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lưu thông tin lý do missed.',
      });
    }
  });

  // GET /api/customers/missed/summary
  // Compute aggregated stats for missed orders in date range
  fastify.get('/customers/missed/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as MissedSummaryQuery;

    const dFrom = dateFrom ? `${dateFrom} 00:00:00` : `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const dTo = dateTo ? `${dateTo} 23:59:59` : `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    try {
      let storeFilter = '';
      const storeParams: SafeAny[] = [new Date(dFrom), new Date(dTo), new Date(dFrom), new Date(dTo)];
      if (storeId && storeId !== 'ALL') {
        storeFilter = ' AND o.client_store_id = ?';
        storeParams.push(Number(storeId));
      }

      const countsSql = `
        SELECT 
          COUNT(DISTINCT o.id) as totalPlanned,
          COUNT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as totalMissed,
          GROUP_CONCAT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as missedOrderIdsStr
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE (
            (ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?)
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= ? AND o.booking_date_start <= ?)
          ) ${storeFilter}
      `;

      const countsRes = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(countsSql, ...storeParams);
      const totalPlanned = Number(countsRes[0]?.totalPlanned || 0);
      const totalMissed = Number(countsRes[0]?.totalMissed || 0);
      const missedRatePct = totalPlanned > 0 ? Number(((totalMissed / totalPlanned) * 100).toFixed(1)) : 0;

      const missedOrderIdsRaw = countsRes[0]?.missedOrderIdsStr
        ? String(countsRes[0].missedOrderIdsStr)
            .split(',')
            .map((x) => Number(x.trim()))
            .filter((x) => Boolean(x) && !isNaN(x))
        : [];

      let taggedCount = 0;
      const reasonMap = new Map<string, number>();
      const respMap = new Map<string, number>();
      const followUpMap = new Map<string, number>();

      if (missedOrderIdsRaw.length > 0) {
        const logs = await fastify.prisma.crm.crmMissedLog.findMany({
          where: { orderId: { in: missedOrderIdsRaw } },
        });

        taggedCount = logs.length;
        logs.forEach((l) => {
          reasonMap.set(l.reasonCategory, (reasonMap.get(l.reasonCategory) || 0) + 1);
          respMap.set(l.responsibility, (respMap.get(l.responsibility) || 0) + 1);
          followUpMap.set(l.followUpStatus, (followUpMap.get(l.followUpStatus) || 0) + 1);
        });
      }

      const untaggedCount = Math.max(0, totalMissed - taggedCount);
      const taggedRatePct = totalMissed > 0 ? Number(((taggedCount / totalMissed) * 100).toFixed(1)) : 0;

      const reasonBreakdown = Object.keys(REASON_LABELS).map((catKey) => {
        const count = reasonMap.get(catKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          reasonCategory: catKey as SafeAny,
          label: REASON_LABELS[catKey],
          count,
          pct,
        };
      });

      const responsibilityBreakdown = Object.keys(RESP_LABELS).map((respKey) => {
        const count = respMap.get(respKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          responsibility: respKey as SafeAny,
          label: RESP_LABELS[respKey],
          count,
          pct,
        };
      });

      const followUpBreakdown = Object.keys(FOLLOWUP_LABELS).map((fuKey) => {
        const count = followUpMap.get(fuKey) || 0;
        return {
          status: fuKey as SafeAny,
          label: FOLLOWUP_LABELS[fuKey],
          count,
        };
      });

      return reply.send({
        totalMissed,
        totalPlanned,
        missedRatePct,
        taggedCount,
        untaggedCount,
        taggedRatePct,
        reasonBreakdown,
        responsibilityBreakdown,
        followUpBreakdown,
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get missed summary error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tính toán thống kê missed.',
      });
    }
  });
}
