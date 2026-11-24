import type { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type UserRole } from '@mos-lab/shared';
import { Prisma } from '../../../generated/crm-client/index.js';
import { requireAuth, requireRole, type JwtUserPayload } from '../../../middlewares/auth.js';
import { fetchRecentOmiCallCdrs, fetchRecordingUrl, triggerImmediateAnalysis } from '../analyzer.js';
import { upsertOmicallCdrBatch } from '../omicall-cdr-sync.service.js';

const QA_REVIEWER_ROLES = new Set<string>(['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc']);

function safeJsonParseArray(raw: string | null | undefined): SafeAny[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonParseObject(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function mapStatusToDisposition(status: string | null | undefined): 'ANSWERED' | 'BUSY' | 'FAILED' | 'NO_ANSWER' {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ANSWER' || normalized === 'ANSWERED') return 'ANSWERED';
  if (normalized === 'BUSY') return 'BUSY';
  if (normalized === 'CANCEL' || normalized === 'FAILED') return 'FAILED';
  return 'NO_ANSWER';
}

function deriveCallMetaFromTags(tags: string[]): { callType: 'CSKH' | 'TELESALES' | null; hasComplaint: boolean } {
  const lowerTags = new Set(tags.map((t) => String(t).trim().toLowerCase()));
  const callType = lowerTags.has('cskh') ? 'CSKH' : lowerTags.has('telesales') ? 'TELESALES' : null;
  const hasComplaint = lowerTags.has('khiếu nại') || lowerTags.has('khieu nai');
  return { callType, hasComplaint };
}

function parseFilterDateBoundary(rawDate: string, bound: 'start' | 'end'): Date {
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const suffix = bound === 'start' ? 'T00:00:00.000+07:00' : 'T23:59:59.999+07:00';
    return new Date(`${trimmed}${suffix}`);
  }
  return new Date(trimmed);
}

async function resolveViewerExtensionScope(
  fastify: FastifyInstance,
  user: JwtUserPayload
): Promise<{ isAdmin: boolean; isQaReviewer: boolean; allowedStaffIds: number[]; hasExtension: boolean }> {
  const roleStr = String(user.role || '').toLowerCase();
  const isAdmin = isAdminOrSuperAdminRole(user.role as UserRole);
  const isQaReviewer = isAdmin || QA_REVIEWER_ROLES.has(roleStr);

  const callerConfig = await fastify.prisma.crm.crmOmicallConfig.findFirst({
    where: { staffId: user.id },
    select: { extension: true },
  });

  let allowedStaffIds = [user.id];
  if (callerConfig?.extension) {
    const sharedConfigs = await fastify.prisma.crm.crmOmicallConfig.findMany({
      where: { extension: callerConfig.extension },
      select: { staffId: true },
    });
    const ids = sharedConfigs.map((c) => c.staffId);
    if (ids.length > 0) {
      allowedStaffIds = Array.from(new Set([user.id, ...ids]));
    }
  }

  return {
    isAdmin,
    isQaReviewer,
    allowedStaffIds,
    hasExtension: Boolean(callerConfig?.extension),
  };
}

export function registerOmicallLogRoutes(fastify: FastifyInstance): void {
  // GET /api/omicall/logs/latest
  // Resolves the caller's most recent OmiCall log during post-call wrapup
  fastify.get('/omicall/logs/latest', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const { phone, direction, callUuid } = request.query as {
      phone?: string;
      direction?: string;
      callUuid?: string;
    };

    const trimmedUuid = callUuid?.trim() || '';
    if (!phone && !trimmedUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'phone or callUuid is required' });
    }

    try {
      const scope = await resolveViewerExtensionScope(fastify, user);
      const selectFields = {
        id: true,
        callUuid: true,
        status: true,
        duration: true,
        billSec: true,
        recordingUrl: true,
        happyCallStatus: true,
        happyCallReason: true,
        analysisStatus: true,
        analysisError: true,
        laughCount: true,
        laughCountAgent: true,
        laughCountCustomer: true,
        laughTimestamps: true,
        customerSatisfactionScore: true,
        customerSentiment: true,
        satisfactionAnalysis: true,
        transcript: true,
        qaChecklist: true,
        qaTags: true,
        qaScore: true,
        staffId: true,
        legacyUserId: true,
      } as const;

      let log: SafeAny = null;
      if (trimmedUuid) {
        const byUuid = await fastify.prisma.crm.crmOmicallLog.findUnique({
          where: { callUuid: trimmedUuid },
          select: selectFields,
        });
        if (byUuid && (scope.isAdmin || byUuid.staffId === null || scope.allowedStaffIds.includes(byUuid.staffId))) {
          log = byUuid;
        }
      }

      if (!log && phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const suffix = cleanPhone.length > 9 ? cleanPhone.slice(-9) : cleanPhone;
        if (suffix) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          log = await fastify.prisma.crm.crmOmicallLog.findFirst({
            where: {
              createdAt: { gte: fiveMinutesAgo },
              direction: direction || 'outbound',
              OR: [{ destinationNumber: { contains: suffix } }, { sourceNumber: { contains: suffix } }],
              ...(!scope.isAdmin
                ? {
                    AND: [
                      {
                        OR: [
                          { staffId: { in: scope.allowedStaffIds } },
                          ...(scope.hasExtension ? [{ staffId: null }] : []),
                        ],
                      },
                    ],
                  }
                : {}),
            },
            orderBy: { createdAt: 'desc' },
            select: selectFields,
          });
        }
      }

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'No recent call log found' });
      }

      let customerName: string | null = null;
      if (log.legacyUserId) {
        const customer = await fastify.prisma.legacy.user_profile.findFirst({
          where: { user_id: log.legacyUserId },
          select: { full_name: true, first_name: true, last_name: true },
        });
        if (customer) {
          customerName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        }
      }

      const qaTags = safeJsonParseArray(log.qaTags).map(String);
      const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);

      return {
        id: log.id,
        callUuid: log.callUuid,
        status: log.status,
        disposition: mapStatusToDisposition(log.status),
        duration: log.duration,
        billSec: log.billSec,
        recordingUrl: log.recordingUrl,
        happyCallStatus: log.happyCallStatus,
        happyCallReason: log.happyCallReason,
        analysisStatus: log.analysisStatus,
        analysisError: log.analysisError,
        laughCount: log.laughCount,
        laughCountAgent: log.laughCountAgent,
        laughCountCustomer: log.laughCountCustomer,
        laughTimestamps: safeJsonParseArray(log.laughTimestamps),
        customerSatisfactionScore: log.customerSatisfactionScore,
        customerSentiment: log.customerSentiment,
        satisfactionAnalysis: log.satisfactionAnalysis,
        transcript: log.transcript,
        qaChecklist: safeJsonParseObject(log.qaChecklist),
        qaTags,
        qaScore: log.qaScore,
        callType,
        hasComplaint,
        customerName,
        legacyUserId: log.legacyUserId,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get latest log error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs
  // List OmiCall logs with full search, direction, recording, AI, Happy Call, and date filtering
  fastify.get('/omicall/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const {
      page = '1',
      limit = '10',
      staffId,
      status,
      happyCallStatus,
      analysisStatus,
      direction,
      search,
      hasRecording,
      startDate,
      endDate,
    } = request.query as {
      page?: string;
      limit?: string;
      staffId?: string;
      status?: string;
      happyCallStatus?: string;
      analysisStatus?: string;
      direction?: string;
      search?: string;
      hasRecording?: string;
      startDate?: string;
      endDate?: string;
    };

    const parsedPage = Number.parseInt(page, 10);
    const take = Number.parseInt(limit, 10);

    if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || !Number.isSafeInteger(take) || take < 1 || take > 100) {
      return reply
        .status(400)
        .send({ error: 'Bad Request', message: 'page and limit (1..100) must be positive integers' });
    }

    const skip = (parsedPage - 1) * take;

    try {
      const scope = await resolveViewerExtensionScope(fastify, user);
      const where: Prisma.CrmOmicallLogWhereInput = {};

      if (scope.isQaReviewer) {
        if (staffId) where.staffId = parseInt(staffId, 10);
      } else {
        where.staffId = { in: scope.allowedStaffIds };
      }

      if (status) where.status = status;
      if (happyCallStatus) where.happyCallStatus = happyCallStatus;
      if (analysisStatus) where.analysisStatus = analysisStatus;
      if (direction && direction !== 'ALL') where.direction = direction;
      if (hasRecording === 'true') where.recordingUrl = { not: null };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = parseFilterDateBoundary(startDate, 'start');
        if (endDate) where.createdAt.lte = parseFilterDateBoundary(endDate, 'end');
      }

      const trimmedSearch = search?.trim() || '';
      if (trimmedSearch) {
        const cleanDigits = trimmedSearch.replace(/\D/g, '');
        const phoneSuffix = cleanDigits.length > 9 ? cleanDigits.slice(-9) : cleanDigits;
        const searchConditions: Prisma.CrmOmicallLogWhereInput[] = [
          { destinationNumber: { contains: trimmedSearch } },
          { sourceNumber: { contains: trimmedSearch } },
          { callUuid: { contains: trimmedSearch } },
        ];
        if (phoneSuffix && phoneSuffix !== trimmedSearch) {
          searchConditions.push(
            { destinationNumber: { contains: phoneSuffix } },
            { sourceNumber: { contains: phoneSuffix } }
          );
        }
        where.OR = searchConditions;
      }

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
        foundStaffIds.length > 0
          ? fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: foundStaffIds } },
              select: { id: true, displayName: true },
            })
          : Promise.resolve([]),
        foundUserIds.length > 0
          ? fastify.prisma.legacy.user_profile.findMany({
              where: { user_id: { in: foundUserIds } },
              select: { user_id: true, full_name: true, first_name: true, last_name: true },
            })
          : Promise.resolve([]),
      ]);

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const customerMap = new Map(
        customerList.map((c) => [
          c.user_id,
          c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Khách hàng',
        ])
      );

      const formattedLogs = logs.map((log) => {
        const qaTags = safeJsonParseArray(log.qaTags).map(String);
        const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);
        return {
          ...log,
          laughTimestamps: safeJsonParseArray(log.laughTimestamps),
          qaTags,
          qaChecklist: safeJsonParseObject(log.qaChecklist),
          callType,
          hasComplaint,
          staffName: log.staffId ? staffMap.get(log.staffId) || null : null,
          customerName: log.legacyUserId ? customerMap.get(log.legacyUserId) || null : null,
        };
      });

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
      const qaTags = safeJsonParseArray(log.qaTags).map(String);
      const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);

      return {
        ...log,
        laughTimestamps: safeJsonParseArray(log.laughTimestamps),
        qaLaughVerifications: safeJsonParseArray(log.qaLaughVerifications),
        qaTags,
        qaChecklist: safeJsonParseObject(log.qaChecklist),
        callType,
        hasComplaint,
        staffName,
        staffAvatarUrl,
        customerName,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Play call error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/logs/:id/reanalyze
  // Triggers on-demand Gemini Happy Call / QA analysis for an existing recorded call
  fastify.post(
    '/omicall/logs/:id/reanalyze',
    { preHandler: [requireAuth, requireRole(['admin', 'manager', 'qa', 'qc', 'qa_qc'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
      }

      try {
        const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
          where: { id: logId },
          select: { id: true, callUuid: true, recordingUrl: true },
        });
        if (!log) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy bản ghi cuộc gọi' });
        }

        let recordingUrl = log.recordingUrl;
        if (!recordingUrl) {
          recordingUrl = await fetchRecordingUrl(fastify, log.callUuid);
        }
        if (!recordingUrl) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Cuộc gọi này chưa có file ghi âm để AI phân tích.',
          });
        }

        await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: log.id },
          data: {
            recordingUrl,
            analysisStatus: 'PENDING',
            analysisRetryCount: 0,
            analysisError: null,
          },
        });
        triggerImmediateAnalysis(fastify, log.id);

        return {
          success: true,
          logId: log.id,
          analysisStatus: 'PENDING',
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Reanalyze call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );

  // POST /api/omicall/logs/sync
  // Pulls recent CDRs from OmiCall API (does not auto-burn Gemini quota unless autoAnalyze=true)
  fastify.post('/omicall/logs/sync', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const body = (request.body || {}) as { days?: number; autoAnalyze?: boolean };
    const rawDays = Number(body.days);
    const days = Number.isFinite(rawDays) ? Math.min(30, Math.max(1, Math.round(rawDays))) : 14;
    const autoAnalyze = Boolean(body.autoAnalyze);

    try {
      const toDate = Date.now() + 60_000;
      const fromDate = toDate - days * 24 * 60 * 60 * 1000;
      const items = await fetchRecentOmiCallCdrs({ fromDate, toDate, page: 1, size: 100 });
      const summary = await upsertOmicallCdrBatch(fastify, items, {
        autoAnalyze,
        preserveTimestampOnCreate: true,
      });

      return {
        success: true,
        fetched: items.length,
        days,
        ...summary,
      };
    } catch (error: SafeAny) {
      const msg = (error as SafeAny)?.message || 'Không thể đồng bộ dữ liệu từ OmiCall.';
      const isConfigOrKeyErr = msg.includes('OMICALL_API_KEY') || msg.includes('API Key');
      return reply.status(isConfigOrKeyErr ? 400 : 500).send({
        error: isConfigOrKeyErr ? 'Bad Request' : 'Internal Server Error',
        message: msg,
      });
    }
  });

  // POST /api/omicall/logs/import-cdr
  // Backfills normalized/raw OmiCall CDR items into mOS without requiring OMICALL_API_KEY
  fastify.post(
    '/omicall/logs/import-cdr',
    { preHandler: [requireAuth, requireRole(['admin'])] },
    async (request, reply) => {
      const body = (request.body || {}) as { items?: SafeAny[]; autoAnalyze?: boolean };
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return reply.status(400).send({ error: 'Bad Request', message: 'items array is required' });
      }
      if (body.items.length > 200) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Maximum 200 CDR items per request' });
      }

      try {
        const summary = await upsertOmicallCdrBatch(fastify, body.items, {
          autoAnalyze: Boolean(body.autoAnalyze),
          preserveTimestampOnCreate: true,
        });
        return {
          success: true,
          ...summary,
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Import OmiCall CDR batch error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );

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
          laughTimestamps: safeJsonParseArray(updated.laughTimestamps),
          qaLaughVerifications: safeJsonParseArray(updated.qaLaughVerifications),
          qaTags: safeJsonParseArray(updated.qaTags),
          qaChecklist: safeJsonParseObject(updated.qaChecklist),
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Verify call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );
}
