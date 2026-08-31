import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { CustomerAccessService } from '../customers/services/customer-access.service.js';

export async function callRoutes(fastify: FastifyInstance) {
  // POST /api/calls
  // Log a new call and update plan/KPIs
  fastify.post(
    '/calls',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Calls'],
        summary: 'Log a telesales call and update daily plan/KPI status',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['legacyUserId'],
          properties: {
            planId: { type: 'integer' },
            legacyUserId: { type: 'integer' },
            callType: { type: 'string' },
            callResult: { type: 'string' },
            durationSec: { type: 'integer' },
            note: { type: 'string' },
            outcome: { type: 'string' },
            callbackDate: { type: 'string' },
            omicallLogId: { type: 'integer' },
            callUuid: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        planId,
        legacyUserId,
        callType = 'PHONE',
        callResult,
        durationSec,
        note,
        outcome,
        callbackDate,
        omicallLogId,
        callUuid,
      } = request.body as {
        planId?: number;
        legacyUserId: number;
        callType?: string;
        callResult?: string;
        durationSec?: number;
        note?: string;
        outcome?: string;
        callbackDate?: string;
        omicallLogId?: number;
        callUuid?: string;
      };

      const user = request.user as { id: number; role?: string };

      if (!legacyUserId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'legacyUserId is required',
        });
      }

      if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, legacyUserId))) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
        });
      }

      try {
        // 1. Create the call log
        const parsedCallbackDate = callbackDate ? new Date(callbackDate) : null;

        // Ưu tiên durationSec từ frontend/WebRTC timer, nếu chưa có thì tìm từ OmiCall log
        let finalDurationSec: number | null = durationSec !== undefined && durationSec !== null ? durationSec : null;

        if (!finalDurationSec && callUuid) {
          const omicallLog = await fastify.prisma.crm.crmOmicallLog.findUnique({
            where: { callUuid },
            select: { duration: true },
          });
          if (omicallLog && omicallLog.duration) {
            finalDurationSec = omicallLog.duration;
          }
        } else if (!finalDurationSec && omicallLogId) {
          const omicallLog = await fastify.prisma.crm.crmOmicallLog.findUnique({
            where: { id: omicallLogId },
            select: { duration: true },
          });
          if (omicallLog && omicallLog.duration) {
            finalDurationSec = omicallLog.duration;
          }
        }

        const callLog = await fastify.prisma.crm.crmCallLog.create({
          data: {
            planId,
            legacyUserId,
            staffId: user.id,
            callType,
            callResult,
            note,
            outcome,
            callbackDate: parsedCallbackDate,
            callUuid,
            durationSec: finalDurationSec,
          },
        });

        // 2. Update the daily plan status if planId is provided
        if (planId) {
          let newStatus = 'CALLED';
          if (outcome === 'BOOKED' || outcome === 'RENEWED') {
            newStatus = 'CONFIRM'; // Mark as confirmed/booked
          }

          await fastify.prisma.crm.crmDailyPlan.update({
            where: { id: planId },
            data: { status: newStatus },
          });
        }

        // 3. Link with CrmOmicallLog if omicallLogId or callUuid is provided
        if (omicallLogId) {
          const omicallLog = await fastify.prisma.crm.crmOmicallLog
            .update({
              where: { id: omicallLogId },
              data: { callLogId: callLog.id },
            })
            .catch((err) => {
              fastify.log.error(`Failed to link CrmOmicallLog ${omicallLogId} with CallLog ${callLog.id}:`, err);
              return null;
            });
          if (omicallLog && omicallLog.duration && !callLog.durationSec) {
            await fastify.prisma.crm.crmCallLog
              .update({
                where: { id: callLog.id },
                data: { durationSec: omicallLog.duration },
              })
              .catch(() => {});
          }
        } else if (callUuid) {
          // Asynchronous link if OmiCall log is already generated
          const omicallLog = await fastify.prisma.crm.crmOmicallLog
            .update({
              where: { callUuid },
              data: { callLogId: callLog.id },
            })
            .catch((_err) => {
              fastify.log.warn(
                `OmiCall log not yet found for UUID ${callUuid}. It will be linked when webhook arrives.`
              );
              return null;
            });
          if (omicallLog && omicallLog.duration && !callLog.durationSec) {
            await fastify.prisma.crm.crmCallLog
              .update({
                where: { id: callLog.id },
                data: { durationSec: omicallLog.duration },
              })
              .catch(() => {});
          }
        } else {
          // Booker gọi điện và lưu log không kèm callUuid / omicallLogId
          // Thực hiện so khớp ngược (Reverse Smart Link):
          // Tìm cuộc gọi OmiCall thô gần nhất (trong vòng +/- 10 phút)
          // của khách hàng này và booker này mà chưa liên kết với CallLog nào (callLogId = null)
          const callTime = new Date();
          const tenMinutesAgo = new Date(callTime.getTime() - 10 * 60 * 1000);
          const tenMinutesAfter = new Date(callTime.getTime() + 10 * 60 * 1000);

          const matchedOmicallLog = await fastify.prisma.crm.crmOmicallLog.findFirst({
            where: {
              legacyUserId,
              staffId: user.id,
              callLogId: null,
              createdAt: {
                gte: tenMinutesAgo,
                lte: tenMinutesAfter,
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (matchedOmicallLog) {
            await fastify.prisma.crm.crmOmicallLog
              .update({
                where: { id: matchedOmicallLog.id },
                data: { callLogId: callLog.id },
              })
              .catch(() => {});

            await fastify.prisma.crm.crmCallLog
              .update({
                where: { id: callLog.id },
                data: {
                  durationSec: matchedOmicallLog.duration,
                  callUuid: matchedOmicallLog.callUuid,
                },
              })
              .catch(() => {});
          }
        }

        return callLog;
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Create call log error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to record call log',
        });
      }
    }
  );

  // GET /api/calls/daily
  // Fetch daily call logs with customer info, caller staff info, and crm assigned staff info
  fastify.get('/calls/daily', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date, scope, staffId } = request.query as { date?: string; scope?: 'all' | 'me' | 'nyc'; staffId?: string };
    const user = request.user as { id: number; role: string };

    const targetDateStr = date || new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
    const start = new Date(targetDateStr + 'T00:00:00.000Z');
    const end = new Date(targetDateStr + 'T23:59:59.999Z');

    let targetStaffId: number | undefined = undefined;
    if (!isAdminOrSuperAdminRole(user.role)) {
      targetStaffId = user.id;
    } else if (scope === 'me') {
      targetStaffId = user.id;
    } else if (staffId && staffId !== 'all') {
      const parsed = parseInt(staffId, 10);
      if (!isNaN(parsed)) {
        targetStaffId = parsed;
      }
    }

    try {
      // 1. Fetch Call Logs from CRM
      let logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
          ...(targetStaffId !== undefined ? { staffId: targetStaffId } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (CustomerAccessService.isTelesales(user)) {
        const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: {
            staffId: user.id,
            legacyUserId: { in: logs.map((log) => log.legacyUserId) },
          },
          select: { legacyUserId: true },
        });
        const allowedCustomerIds = new Set(assignments.map((assignment) => assignment.legacyUserId));
        logs = logs.filter((log) => allowedCustomerIds.has(log.legacyUserId));
      }

      if (logs.length === 0) {
        return [];
      }

      // Fetch linked Omicall logs
      const logIds = logs.map((l) => l.id);
      const callUuuids = logs.map((l) => l.callUuid).filter((u): u is string => u !== null);

      const omicallLogs = await fastify.prisma.crm.crmOmicallLog.findMany({
        where: {
          OR: [{ callLogId: { in: logIds } }, { callUuid: { in: callUuuids } }],
        },
        select: {
          id: true,
          callUuid: true,
          callLogId: true,
          happyCallStatus: true,
        },
      });

      const omicallMap = new Map();
      omicallLogs.forEach((ol) => {
        if (ol.callLogId) {
          omicallMap.set(`id_${ol.callLogId}`, ol);
        }
        if (ol.callUuid) {
          omicallMap.set(`uuid_${ol.callUuid}`, ol);
        }
      });

      // 2. Fetch staff list for mapping callers
      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      });
      const staffMap = new Map(staffList.map((s) => [s.id, s]));

      // 3. Fetch Customer Details from Legacy DB
      const legacyUserIds = Array.from(new Set(logs.map((l) => l.legacyUserId)));

      // Fetch customer profiles, contacts, and orders
      const userProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar, 
          (
            SELECT COALESCE(MAX(uc.phone_number), '') 
            FROM user_contact uc 
            WHERE uc.user_id = u.id AND uc.is_disabled = 0
          ) as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          COALESCE(order_counts.totalSpent, 0) as totalSpent,
          CASE
            WHEN usb_agg.user_id IS NULL THEN 'SINGLE'
            WHEN usb_agg.live_count > 0 THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id
        LEFT JOIN (
          SELECT 
            user_id,
            SUM(
              CASE 
                WHEN (normal_count + retain_count) > 0 AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
                ELSE 0 
              END
            ) as live_count,
            SUM(normal_count) as normalCount,
            SUM(retain_count) as retainCount,
            MAX(date_expired) as expiryDate
          FROM user_service_balance
          GROUP BY user_id
        ) as usb_agg ON u.id = usb_agg.user_id
        WHERE u.id IN (${legacyUserIds.join(',')})
      `
      );

      // Fetch customer assignments from CRM
      const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: legacyUserIds } },
        include: {
          staff: {
            select: { id: true, displayName: true },
          },
        },
      });

      const assignmentMap = new Map(assignments.map((a) => [a.legacyUserId, a.staff]));
      const customerMap = new Map(userProfiles.map((p) => [Number(p.id), p]));

      // 4. Construct response and map
      let results = logs.map((log) => {
        const caller = staffMap.get(log.staffId) || { id: log.staffId, displayName: 'Unknown', avatarUrl: null };
        const custData = customerMap.get(log.legacyUserId);
        const assignedStaff = assignmentMap.get(log.legacyUserId);
        const omicallInfo =
          omicallMap.get(`id_${log.id}`) || (log.callUuid ? omicallMap.get(`uuid_${log.callUuid}`) : null);

        return {
          id: log.id,
          createdAt: log.createdAt,
          durationSec: log.durationSec,
          note: log.note,
          callResult: log.callResult,
          outcome: log.outcome,
          callerStaff: caller,
          callUuid: log.callUuid,
          omicallLogId: omicallInfo ? omicallInfo.id : null,
          happyCallStatus: omicallInfo ? omicallInfo.happyCallStatus : 'NONE',
          customer: custData
            ? {
                id: Number(custData.id),
                name: custData.name,
                phone: custData.phone,
                avatar: custData.avatar,
                bucket: custData.bucket,
                daysSinceLastVisit: custData.daysSinceLastVisit !== null ? Number(custData.daysSinceLastVisit) : null,
                lastBookingDate: custData.lastVisit,
                totalSpent: custData.totalSpent !== null ? Number(custData.totalSpent) : 0,
                assignedStaff: assignedStaff || null,
              }
            : null,
        };
      });

      // Filter out calls where customer data was not found (integrity check)
      results = results.filter((r) => r.customer !== null);

      // 5. Apply scope filter 'nyc' (bucket !== 'COMBO_LIVE')
      if (scope === 'nyc') {
        results = results.filter((r) => r.customer && r.customer.bucket !== 'COMBO_LIVE');
      }

      return results;
    } catch (error) {
      fastify.log.error(error as Error, 'Get daily call logs error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve daily call logs',
      });
    }
  });

  // GET /api/calls/:customerId
  // Fetch detailed call log history for a single customer
  fastify.get('/calls/:customerId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { customerId } = request.params as { customerId: string };

    const legacyUserId = parseInt(customerId, 10);
    if (isNaN(legacyUserId)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid customer id',
      });
    }

    const user = request.user as { id: number; role?: string };
    if (!(await CustomerAccessService.canTelesalesAccessCustomer(fastify, user, legacyUserId))) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình.',
      });
    }

    try {
      // Find all call logs for this customer, along with staff displayName
      const logs = await fastify.prisma.crm.crmCallLog.findMany({
        where: { legacyUserId },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch staff names to format
      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, displayName: true },
      });

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));

      const formattedLogs = logs.map((log) => ({
        ...log,
        staffName: staffMap.get(log.staffId) || 'Unknown Staff',
      }));

      return formattedLogs;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get call logs error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve call logs',
      });
    }
  });
}
