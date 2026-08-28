import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  AnnualHolidayCalendarQuery,
  CreateStaffPerformanceEventRequest,
  CreateHolidayPayrollAdjustmentRequest,
  HolidayPeriodQuery,
  StaffPerformanceEventQuery,
  UpsertHolidayBranchCoverageRequest,
  UpsertHolidayCoverageRequest,
  UpsertHolidayPeriodRequest,
  UpsertHolidayRosterRequest,
} from '@mos-lab/shared';
import { requireAuth, requireRole, type JwtUserPayload } from '../../middlewares/auth.js';
import { HolidayWorkError, HolidayWorkService } from './holiday-work.service.js';

const actor = (request: FastifyRequest) => {
  const user = request.user as JwtUserPayload;
  return { id: user.id, role: user.role, username: user.username, email: user.email };
};

const positiveId = (value: string, label: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HolidayWorkError(`${label} không hợp lệ.`);
  return id;
};

function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, action: string) {
  if (error instanceof HolidayWorkError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  fastify.log.error(error as Error, action);
  return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Không thể xử lý nghiệp vụ ngày lễ.' });
}

export async function holidayWorkRoutes(fastify: FastifyInstance) {
  fastify.get('/holiday-work/calendar', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = request.query as AnnualHolidayCalendarQuery;
      const currentYear = Number(
        new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date())
      );
      return reply.send(await HolidayWorkService.getAnnualCalendar(fastify, Number(query.year || currentYear)));
    } catch (error) {
      return sendError(fastify, reply, error, 'Get annual holiday calendar error');
    }
  });

  fastify.get(
    '/holiday-work/periods',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      try {
        return reply.send(await HolidayWorkService.listPeriods(fastify, request.query as HolidayPeriodQuery));
      } catch (error) {
        return sendError(fastify, reply, error, 'List holiday periods error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const period = await HolidayWorkService.upsertPeriod(
          fastify,
          request.body as UpsertHolidayPeriodRequest,
          actor(request)
        );
        return reply.status(201).send({ success: true, data: period });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create holiday period error');
      }
    }
  );

  fastify.put(
    '/holiday-work/periods/:holidayId',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const period = await HolidayWorkService.upsertPeriod(
          fastify,
          request.body as UpsertHolidayPeriodRequest,
          actor(request),
          positiveId(holidayId, 'ID kỳ lễ')
        );
        return reply.send({ success: true, data: period });
      } catch (error) {
        return sendError(fastify, reply, error, 'Update holiday period error');
      }
    }
  );

  fastify.get(
    '/holiday-work/periods/:holidayId',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        return reply.send(
          await HolidayWorkService.getWorkspace(fastify, positiveId(holidayId, 'ID kỳ lễ'), actor(request))
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'Get holiday workspace error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/coverage',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const coverage = await HolidayWorkService.upsertCoverage(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as UpsertHolidayCoverageRequest,
          actor(request)
        );
        return reply.status(201).send({ success: true, data: coverage });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create holiday coverage error');
      }
    }
  );

  fastify.put(
    '/holiday-work/periods/:holidayId/coverage/:coverageId',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId, coverageId } = request.params as { holidayId: string; coverageId: string };
        const coverage = await HolidayWorkService.upsertCoverage(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as UpsertHolidayCoverageRequest,
          actor(request),
          positiveId(coverageId, 'ID nhu cầu')
        );
        return reply.send({ success: true, data: coverage });
      } catch (error) {
        return sendError(fastify, reply, error, 'Update holiday coverage error');
      }
    }
  );

  fastify.put(
    '/holiday-work/periods/:holidayId/branch-coverage',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const coverage = await HolidayWorkService.upsertBranchCoverage(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as UpsertHolidayBranchCoverageRequest,
          actor(request)
        );
        return reply.send({ success: true, data: coverage });
      } catch (error) {
        return sendError(fastify, reply, error, 'Upsert holiday branch coverage error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/roster',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const roster = await HolidayWorkService.upsertRoster(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as UpsertHolidayRosterRequest,
          actor(request)
        );
        return reply.status(201).send({ success: true, data: roster });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create holiday roster error');
      }
    }
  );

  fastify.put(
    '/holiday-work/periods/:holidayId/roster/:rosterId',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      try {
        const { holidayId, rosterId } = request.params as { holidayId: string; rosterId: string };
        const roster = await HolidayWorkService.upsertRoster(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as UpsertHolidayRosterRequest,
          actor(request),
          positiveId(rosterId, 'ID roster')
        );
        return reply.send({ success: true, data: roster });
      } catch (error) {
        return sendError(fastify, reply, error, 'Update holiday roster error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/candidates/generate',
    { preHandler: [requireAuth, requireRole(['admin', 'manager'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const data = await HolidayWorkService.generateCandidates(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          actor(request)
        );
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Generate holiday candidates error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/payroll/recalculate',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const data = await HolidayWorkService.recalculateLedger(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          actor(request)
        );
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Recalculate holiday payroll error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/publish',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const data = await HolidayWorkService.publish(fastify, positiveId(holidayId, 'ID kỳ lễ'), actor(request));
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Publish holiday roster error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/payroll/lock',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const data = await HolidayWorkService.lockPayroll(fastify, positiveId(holidayId, 'ID kỳ lễ'), actor(request));
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Lock holiday payroll error');
      }
    }
  );

  fastify.post(
    '/holiday-work/periods/:holidayId/payroll/adjustments',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      try {
        const { holidayId } = request.params as { holidayId: string };
        const data = await HolidayWorkService.createPayrollAdjustment(
          fastify,
          positiveId(holidayId, 'ID kỳ lễ'),
          request.body as CreateHolidayPayrollAdjustmentRequest,
          actor(request)
        );
        return reply.status(201).send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create holiday payroll adjustment error');
      }
    }
  );

  fastify.get(
    '/holiday-work/performance-events',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'cc', 'qa_qc'])] },
    async (request, reply) => {
      try {
        return reply.send(
          await HolidayWorkService.listPerformanceEvents(fastify, request.query as StaffPerformanceEventQuery)
        );
      } catch (error) {
        return sendError(fastify, reply, error, 'List staff performance events error');
      }
    }
  );

  fastify.post(
    '/holiday-work/performance-events',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'cc', 'qa_qc'])] },
    async (request, reply) => {
      try {
        const data = await HolidayWorkService.createPerformanceEvent(
          fastify,
          request.body as CreateStaffPerformanceEventRequest,
          actor(request)
        );
        return reply.status(201).send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Create staff performance event error');
      }
    }
  );

  fastify.post(
    '/holiday-work/performance-events/:eventId/review',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'qa_qc'])] },
    async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const body = request.body as { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string };
        if (!['VERIFIED', 'REJECTED'].includes(body.status)) {
          throw new HolidayWorkError('Trạng thái review không hợp lệ.');
        }
        const data = await HolidayWorkService.reviewPerformanceEvent(
          fastify,
          positiveId(eventId, 'ID sự kiện'),
          body.status,
          actor(request),
          body.rejectionReason
        );
        return reply.send({ success: true, data });
      } catch (error) {
        return sendError(fastify, reply, error, 'Review staff performance event error');
      }
    }
  );
}
