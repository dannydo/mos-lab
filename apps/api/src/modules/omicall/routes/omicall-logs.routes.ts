import type { FastifyInstance } from 'fastify';
import { Prisma } from '../../../generated/crm-client/index.js';
import { requireAuth, requireRole, type JwtUserPayload } from '../../../middlewares/auth.js';

export function registerOmicallLogRoutes(fastify: FastifyInstance): void {
  // GET /api/omicall/logs/latest
  // Fallback endpoint to find the latest OmiCall log matching a phone number (requireAuth)
  fastify.get('/omicall/logs/latest', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const { phone, direction } = request.query as { phone?: string; direction?: string };

    if (!phone) {
      return reply.status(400).send({ error: 'Bad Request', message: 'phone number is required' });
    }

    try {
      // Clean phone number (keep only numbers)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const suffix = cleanPhone.length > 9 ? cleanPhone.slice(-9) : cleanPhone;

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const log = await fastify.prisma.crm.crmOmicallLog.findFirst({
        where: {
          staffId: user.id,
          createdAt: { gte: twoMinutesAgo },
          direction: direction || 'outbound',
          OR: [{ destinationNumber: { contains: suffix } }, { sourceNumber: { contains: suffix } }],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          callUuid: true,
          duration: true,
          happyCallStatus: true,
          analysisStatus: true,
          laughCount: true,
          laughCountAgent: true,
          laughCountCustomer: true,
          laughTimestamps: true,
          customerSatisfactionScore: true,
          customerSentiment: true,
          satisfactionAnalysis: true,
          transcript: true,
          legacyUserId: true,
        },
      });

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'No recent call log found' });
      }

      let customerName = null;
      if (log.legacyUserId) {
        const customer = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: log.legacyUserId },
          select: { full_name: true, first_name: true, last_name: true },
        });
        if (customer) {
          customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        }
      }

      return {
        id: log.id,
        callUuid: log.callUuid,
        duration: log.duration,
        happyCallStatus: log.happyCallStatus,
        analysisStatus: log.analysisStatus,
        laughCount: log.laughCount,
        laughCountAgent: log.laughCountAgent,
        laughCountCustomer: log.laughCountCustomer,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        customerSatisfactionScore: log.customerSatisfactionScore,
        customerSentiment: log.customerSentiment,
        satisfactionAnalysis: log.satisfactionAnalysis,
        transcript: log.transcript,
        customerName,
        legacyUserId: log.legacyUserId,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get latest log error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs
  // Get all OmiCall logs with pagination, filtering (Staff/Manager/Admin)
  fastify.get('/omicall/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      page = '1',
      limit = '10',
      staffId,
      status,
      happyCallStatus,
      startDate,
      endDate,
    } = request.query as {
      page?: string;
      limit?: string;
      staffId?: string;
      status?: string;
      happyCallStatus?: string;
      startDate?: string;
      endDate?: string;
    };

    const parsedPage = Number.parseInt(page, 10);
    const take = Number.parseInt(limit, 10);

    if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || !Number.isSafeInteger(take) || take < 1) {
      return reply.status(400).send({ error: 'Bad Request', message: 'page and limit must be positive integers' });
    }

    const skip = (parsedPage - 1) * take;

    const where: Prisma.CrmOmicallLogWhereInput = {};
    if (staffId) where.staffId = parseInt(staffId, 10);
    if (status) where.status = status;
    if (happyCallStatus) where.happyCallStatus = happyCallStatus;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    try {
      const [logs, total] = await Promise.all([
        fastify.prisma.crm.crmOmicallLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        fastify.prisma.crm.crmOmicallLog.count({ where }),
      ]);

      const foundStaffIds = Array.from(new Set(logs.map((l) => l.staffId).filter((id): id is number => id !== null)));
      const foundUserIds = Array.from(
        new Set(logs.map((l) => l.legacyUserId).filter((id): id is number => id !== null))
      );

      const [staffList, customerList] = await Promise.all([
        fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: foundStaffIds } },
          select: { id: true, displayName: true },
        }),
        fastify.prisma.legacy.user_profile.findMany({
          where: { user_id: { in: foundUserIds } },
          select: { user_id: true, full_name: true, first_name: true, last_name: true },
        }),
      ]);

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const customerMap = new Map(
        customerList.map((c) => [
          c.user_id,
          c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Customer',
        ])
      );

      const formattedLogs = logs.map((log) => ({
        ...log,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        staffName: log.staffId ? staffMap.get(log.staffId) : null,
        customerName: log.legacyUserId ? customerMap.get(log.legacyUserId) : null,
      }));

      return {
        logs: formattedLogs,
        total,
        page: parsedPage,
        limit: take,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get OmiCall logs error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs/:id/play
  // Get details of a single call for the audio player (requireAuth)
  fastify.get('/omicall/logs/:id/play', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const logId = parseInt(id, 10);

    if (isNaN(logId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
    }

    try {
      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'Log not found' });
      }

      // Fetch the two independent display records concurrently.
      const [staff, customer] = await Promise.all([
        log.staffId
          ? fastify.prisma.crm.crmStaff.findUnique({
              where: { id: log.staffId },
              select: { displayName: true, avatarUrl: true },
            })
          : Promise.resolve(null),
        log.legacyUserId
          ? fastify.prisma.legacy.user_profile.findFirst({
              where: { user_id: log.legacyUserId },
              select: { full_name: true, first_name: true, last_name: true },
            })
          : Promise.resolve(null),
      ]);
      const staffName = staff?.displayName ?? null;
      const staffAvatarUrl = staff?.avatarUrl ?? null;
      const customerName = customer
        ? customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : null;

      return {
        ...log,
        laughTimestamps: log.laughTimestamps ? JSON.parse(log.laughTimestamps) : [],
        qaLaughVerifications: log.qaLaughVerifications ? JSON.parse(log.qaLaughVerifications) : [],
        qaTags: log.qaTags ? JSON.parse(log.qaTags) : [],
        qaChecklist: log.qaChecklist ? JSON.parse(log.qaChecklist) : {},
        staffName,
        staffAvatarUrl,
        customerName,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Play call error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/logs/:id/verify
  // QA verification endpoint (Admin or Manager only)
  fastify.post(
    '/omicall/logs/:id/verify',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'qa', 'qc', 'qa_qc'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const {
        action,
        laughVerifications,
        notes,
        happyCallStatus: reqStatus,
        happyCallReason: reqReason,
        qaNotes: reqNotes,
        qaScore: reqScore,
        qaTags: reqTags,
        qaChecklist: reqChecklist,
      } = request.body as {
        action?: 'approve' | 'reject';
        laughVerifications?: SafeAny;
        notes?: string;
        happyCallStatus?: string;
        happyCallReason?: string | null;
        qaNotes?: string | null;
        qaScore?: number | null;
        qaTags?: string[] | null;
        qaChecklist?: Record<string, boolean> | null;
      };

      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
      }

      const user = request.user as { id: number };

      try {
        const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
          where: { id: logId },
        });

        if (!log) {
          return reply.status(404).send({ error: 'Not Found', message: 'Log not found' });
        }

        const qaLaughVerifications = laughVerifications
          ? typeof laughVerifications === 'string'
            ? laughVerifications
            : JSON.stringify(laughVerifications)
          : null;

        let happyCallStatus = log.happyCallStatus;
        let happyCallReason = log.happyCallReason;
        let qaNotes = notes !== undefined ? notes : log.qaNotes;

        if (action) {
          if (action === 'approve') {
            happyCallStatus = 'APPROVED';
            happyCallReason = 'manual_approved';
          } else if (action === 'reject') {
            happyCallStatus = 'REJECTED';
          }
        } else if (reqStatus) {
          happyCallStatus = reqStatus;
          happyCallReason = reqReason !== undefined ? reqReason : log.happyCallReason;
          qaNotes = reqNotes !== undefined ? reqNotes : log.qaNotes;
        }

        const updated = await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: logId },
          data: {
            happyCallStatus,
            happyCallReason,
            qaVerified: true,
            qaVerifiedBy: user.id,
            qaVerifiedAt: new Date(),
            qaLaughVerifications: qaLaughVerifications || log.qaLaughVerifications,
            qaNotes: qaNotes || null,
            qaScore: reqScore !== undefined ? reqScore : log.qaScore,
            qaTags: reqTags !== undefined ? (reqTags ? JSON.stringify(reqTags) : null) : log.qaTags,
            qaChecklist:
              reqChecklist !== undefined ? (reqChecklist ? JSON.stringify(reqChecklist) : null) : log.qaChecklist,
          },
        });

        return {
          ...updated,
          laughTimestamps: updated.laughTimestamps ? JSON.parse(updated.laughTimestamps) : [],
          qaLaughVerifications: updated.qaLaughVerifications ? JSON.parse(updated.qaLaughVerifications) : [],
          qaTags: updated.qaTags ? JSON.parse(updated.qaTags) : [],
          qaChecklist: updated.qaChecklist ? JSON.parse(updated.qaChecklist) : {},
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Verify call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );
}
