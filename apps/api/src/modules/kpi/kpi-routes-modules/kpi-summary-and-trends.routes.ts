import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { calculateBookerSalaryStats } from '../services/salary-calculator.js';
import {
  calculateConsultantSalaryStats,
  parseDateRange,
  resolveTelesalesKpiScope,
  toKpiDayKey,
} from './kpi-route.helpers.js';

export function registerKpiSummaryAndTrendsRoutes(fastify: FastifyInstance) {
  // GET /api/kpi/summary
  fastify.get('/kpi/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { startDate, endDate, staffId, role } = request.query as {
      startDate?: string;
      endDate?: string;
      staffId?: string;
      role?: string;
    };

    const user = request.user as { id: number; role: string };
    let targetStaffId: number | undefined = undefined;
    if (isAdminOrSuperAdminRole(user.role)) {
      if (staffId) {
        targetStaffId = parseInt(staffId, 10);
      }
    } else {
      targetStaffId = user.id;
    }

    const { startStr, endStr, start, end } = parseDateRange(startDate, endDate, 7);
    const cacheKey = `kpi:summary:${user.role}:${targetStaffId ?? 'all'}:${role || 'all'}:${startStr}:${endStr}`;
    const cachedSummary = fastify.cache?.get(cacheKey);
    if (cachedSummary) return cachedSummary;

    try {
      if (role === 'oc' || role === 'consultant') {
        const salaries = await calculateConsultantSalaryStats(fastify, start, end, targetStaffId);
        const salary = targetStaffId !== undefined ? salaries[targetStaffId] : null;

        let totalCheckin = 0;
        let totalEarnings = 0;

        if (salary) {
          totalCheckin = salary.checkins;
          totalEarnings = salary.totalSalary;
        } else {
          Object.values(salaries).forEach((s) => {
            totalCheckin += s.checkins;
            totalEarnings += s.totalSalary;
          });
        }

        const ocSummary = {
          startDate: startStr,
          endDate: endStr,
          totalPlanned: 0,
          totalCalled: 0,
          totalAnswered: 0,
          totalBooked: 0,
          totalCheckin,
          totalEarnings,
          salary,
        };
        fastify.cache?.set(cacheKey, ocSummary, 30_000);
        return ocSummary;
      }

      const [salaries, { staffIds, legacyUserIds }] = await Promise.all([
        calculateBookerSalaryStats(fastify, start, end, targetStaffId),
        resolveTelesalesKpiScope(fastify, targetStaffId),
      ]);
      const salary = targetStaffId !== undefined ? salaries[targetStaffId] : null;
      let totalCalled = 0;
      let totalAnswered = 0;
      let totalHappy = 0;

      const [crmLogs, omicallLogs, totalBooked] = await Promise.all([
        staffIds.length > 0
          ? fastify.prisma.crm.crmCallLog.findMany({
              where: {
                staffId: { in: staffIds },
                createdAt: { gte: start, lte: end },
              },
              select: {
                callResult: true,
                outcome: true,
              },
            })
          : Promise.resolve([]),
        staffIds.length > 0
          ? fastify.prisma.crm.crmOmicallLog.findMany({
              where: {
                staffId: { in: staffIds },
                createdAt: { gte: start, lte: end },
                direction: 'outbound',
              },
              select: {
                status: true,
                happyCallStatus: true,
              },
            })
          : Promise.resolve([]),
        legacyUserIds.length > 0
          ? fastify.prisma.legacy.order.count({
              where: {
                created_staff_id: { in: legacyUserIds },
                date_created: { gte: start, lte: end },
                order_state: { not: 'Cancelled' },
              },
            })
          : Promise.resolve(0),
      ]);

      if (staffIds.length > 0) {
        const crmCalled = crmLogs.length;
        let crmAnswered = 0;
        let crmHappy = 0;
        crmLogs.forEach((c: SafeAny) => {
          const res = String(c.callResult || '').toUpperCase();
          if (res === 'ANSWERED' || res === 'ANSWER' || res === 'CONNECTED') {
            crmAnswered++;
          }
          const out = String(c.outcome || '').toUpperCase();
          if (out === 'HAPPY' || out === 'HAPPY_CALL' || out === 'APPROVED') {
            crmHappy++;
          }
        });

        const omiCalled = omicallLogs.length;
        let omiAnswered = 0;
        let omiHappy = 0;
        omicallLogs.forEach((c: SafeAny) => {
          if (String(c.status).toUpperCase() === 'ANSWER') {
            omiAnswered++;
          }
          if (String(c.happyCallStatus).toUpperCase() === 'APPROVED') {
            omiHappy++;
          }
        });

        totalCalled = Math.max(crmCalled, omiCalled);
        totalAnswered = Math.max(crmAnswered, omiAnswered);
        totalHappy = Math.max(crmHappy, omiHappy);
      }

      let totalCheckin = 0;
      let totalEarnings = 0;

      Object.values(salaries).forEach((s) => {
        totalCheckin += s.doneCount;
        totalEarnings += s.totalSalary;
      });

      const summary = {
        startDate: startStr,
        endDate: endStr,
        totalPlanned: totalBooked,
        totalCalled,
        totalAnswered,
        totalHappy,
        totalBooked,
        totalCheckin,
        totalEarnings: salary ? salary.totalSalary : totalEarnings,
        salary,
      };
      fastify.cache?.set(cacheKey, summary, 30_000);
      return summary;
    } catch (err: SafeAny) {
      fastify.log.error(err as SafeAny, 'Summary KPI error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve KPI summary',
      });
    }
  });

  // GET /api/kpi/trends
  fastify.get(
    '/kpi/trends',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['KPI'],
        summary: 'Get KPI call breakdown and daily trends',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            staffId: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { startDate, endDate, staffId, role } = request.query as {
        startDate?: string;
        endDate?: string;
        staffId?: string;
        role?: string;
      };

      const user = request.user as { id: number; role: string };
      let targetStaffId: number | undefined = undefined;
      if (isAdminOrSuperAdminRole(user.role)) {
        if (staffId) targetStaffId = parseInt(staffId, 10);
      } else {
        targetStaffId = user.id;
      }

      const { start, end } = parseDateRange(startDate, endDate, 7);

      try {
        const breakdown = {
          BOOKED: 0,
          CALL_BACK: 0,
          NO_ANSWER: 0,
          BUSY: 0,
          WRONG_NUMBER: 0,
          OTHERS: 0,
        };

        const dailyTrendsMap = new Map<string, { date: string; planned: number; called: number }>();
        const current = new Date(start);
        while (current <= end) {
          const dStr = toKpiDayKey(current);
          dailyTrendsMap.set(dStr, { date: dStr, planned: 0, called: 0 });
          current.setDate(current.getDate() + 1);
        }

        // Client Consultants do not use the outbound-call / Booker pipeline.
        if (role !== 'oc' && role !== 'consultant') {
          const { staffIds, legacyUserIds } = await resolveTelesalesKpiScope(fastify, targetStaffId);
          if (staffIds.length > 0) {
            const [crmLogs, omicallLogs] = await Promise.all([
              fastify.prisma.crm.crmCallLog.findMany({
                where: { staffId: { in: staffIds }, createdAt: { gte: start, lte: end } },
                select: { createdAt: true, callResult: true, outcome: true },
              }),
              fastify.prisma.crm.crmOmicallLog.findMany({
                where: { staffId: { in: staffIds }, createdAt: { gte: start, lte: end }, direction: 'outbound' },
                select: { createdAt: true },
              }),
            ]);

            const crmCalledByDay = new Map<string, number>();
            const omicallCalledByDay = new Map<string, number>();
            crmLogs.forEach((log) => {
              const date = toKpiDayKey(log.createdAt);
              crmCalledByDay.set(date, (crmCalledByDay.get(date) || 0) + 1);
              if (log.callResult === 'NO_ANSWER') breakdown.NO_ANSWER++;
              else if (log.callResult === 'BUSY') breakdown.BUSY++;
              else if (log.callResult === 'WRONG_NUMBER') breakdown.WRONG_NUMBER++;
              else if (log.outcome === 'BOOKED') breakdown.BOOKED++;
              else if (log.outcome === 'CALL_BACK') breakdown.CALL_BACK++;
              else breakdown.OTHERS++;
            });
            omicallLogs.forEach((log) => {
              const date = toKpiDayKey(log.createdAt);
              omicallCalledByDay.set(date, (omicallCalledByDay.get(date) || 0) + 1);
            });

            dailyTrendsMap.forEach((trend, date) => {
              trend.called = Math.max(crmCalledByDay.get(date) || 0, omicallCalledByDay.get(date) || 0);
            });
          }

          if (legacyUserIds.length > 0) {
            const bookedOrders = await fastify.prisma.legacy.order.findMany({
              where: {
                created_staff_id: { in: legacyUserIds },
                date_created: { gte: start, lte: end },
                order_state: { not: 'Cancelled' },
              },
              select: { date_created: true },
            });
            bookedOrders.forEach((order) => {
              const date = toKpiDayKey(order.date_created);
              const trend = dailyTrendsMap.get(date);
              if (trend) trend.planned += 1;
            });
          }
        }

        const dailyTrends = Array.from(dailyTrendsMap.values());

        return {
          breakdown,
          dailyTrends,
        };
      } catch (err: SafeAny) {
        fastify.log.error(err as SafeAny, 'KPI trends error');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve KPI trend statistics',
        });
      }
    }
  );
}
