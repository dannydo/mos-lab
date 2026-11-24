import type { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, type UserRole } from '@mos-lab/shared';
import { requireAuth, requireRole, type JwtUserPayload } from '../../../middlewares/auth.js';
import { fetchRecentOmiCallCdrs, fetchRecordingUrl, triggerImmediateAnalysis } from '../analyzer.js';
import { resolveCallStoreIds } from '../omicall-branch.service.js';
import { recordOmiCallIntent } from '../omicall-call-intent.service.js';
import { upsertOmicallCdrBatch } from '../omicall-cdr-sync.service.js';
import { redactLogForViewer } from '../omicall-coaching.service.js';
import {
  deriveCallMetaFromTags,
  listOmicallLogsForViewer,
  mapStatusToDisposition,
  resolveViewerExtensionScope,
  safeJsonParseArray,
  safeJsonParseObject,
  type ListOmicallLogsQuery,
} from '../omicall-logs-query.service.js';

export function registerOmicallLogRoutes(fastify: FastifyInstance): void {
  // POST /api/omicall/call-intent
  // Records the initiating CRM staff member before OmiCall CDR webhook fires on a shared extension
  fastify.post('/omicall/call-intent', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const body = (request.body || {}) as { phone?: string; extension?: string; callUuid?: string };
    if (!body.phone && !body.callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'phone or callUuid is required' });
    }

    recordOmiCallIntent({
      staffId: user.id,
      phone: body.phone || '',
      extension: body.extension || null,
      callUuid: body.callUuid || null,
    });

    return { success: true };
  });

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
        storeId: true,
        staffSelfSatisfactionScore: true,
        staffSelfNote: true,
        staffSelfRatedAt: true,
        staffAiCoachingFeedback: true,
        staffAiCoachingAt: true,
        managerSatisfactionScore: true,
        managerNote: true,
        adminSatisfactionScore: true,
        adminNote: true,
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
      const branchResolution = await resolveCallStoreIds(fastify, [
        { id: log.id, storeId: log.storeId, legacyUserId: log.legacyUserId, staffId: log.staffId },
      ]);
      const resolvedStoreId = branchResolution.storeIdByLogId.get(log.id) ?? log.storeId ?? null;
      const resolvedStoreName = resolvedStoreId ? (branchResolution.storeNameById.get(resolvedStoreId) ?? null) : null;

      return redactLogForViewer(
        {
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
          storeId: resolvedStoreId,
          storeName: resolvedStoreName,
          staffSelfSatisfactionScore: log.staffSelfSatisfactionScore ?? null,
          staffSelfNote: log.staffSelfNote ?? null,
          staffSelfRatedAt: log.staffSelfRatedAt ?? null,
          staffAiCoachingFeedback: log.staffAiCoachingFeedback ?? null,
          staffAiCoachingAt: log.staffAiCoachingAt ?? null,
          managerSatisfactionScore: log.managerSatisfactionScore ?? null,
          managerNote: log.managerNote ?? null,
          adminSatisfactionScore: log.adminSatisfactionScore ?? null,
          adminNote: log.adminNote ?? null,
        },
        scope
      );
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get latest log error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs
  // List OmiCall logs with date, direction, phone search, and Customer Profile (legacyUserId) filters
  fastify.get('/omicall/logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const query = request.query as ListOmicallLogsQuery;
    const parsedPage = Number.parseInt(query.page || '1', 10);
    const take = Number.parseInt(query.limit || '10', 10);

    if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || !Number.isSafeInteger(take) || take < 1 || take > 100) {
      return reply
        .status(400)
        .send({ error: 'Bad Request', message: 'page and limit (1..100) must be positive integers' });
    }

    try {
      const scope = await resolveViewerExtensionScope(fastify, user);
      if (query.legacyUserId && !scope.isQaReviewer) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Admin, Manager hoặc QA mới có quyền xem ghi âm OmiCall theo hồ sơ khách hàng.',
        });
      }

      return await listOmicallLogsForViewer(fastify, scope, query, { page: parsedPage, take });
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get OmiCall logs error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // GET /api/omicall/logs/:id/play
  fastify.get('/omicall/logs/:id/play', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const { id } = request.params as { id: string };
    const logId = parseInt(id, 10);

    if (isNaN(logId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
    }

    try {
      const [log, scope] = await Promise.all([
        fastify.prisma.crm.crmOmicallLog.findUnique({ where: { id: logId } }),
        resolveViewerExtensionScope(fastify, user),
      ]);
      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'Log not found' });
      }

      const canAccess = scope.isQaReviewer || log.staffId === null || scope.allowedStaffIds.includes(log.staffId);
      if (!canAccess) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn không có quyền xem chi tiết cuộc gọi của nhân viên khác.',
        });
      }

      const staffIdsToFetch = Array.from(
        new Set(
          [log.staffId, log.managerReviewedBy, log.adminReviewedBy].filter(
            (sid): sid is number => sid !== null && sid !== undefined
          )
        )
      );

      const [staffRows, customer, branchResolution] = await Promise.all([
        staffIdsToFetch.length > 0
          ? fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: staffIdsToFetch } },
              select: { id: true, displayName: true, avatarUrl: true },
            })
          : Promise.resolve([]),
        log.legacyUserId
          ? fastify.prisma.legacy.user_profile.findFirst({
              where: { user_id: log.legacyUserId },
              select: { full_name: true, first_name: true, last_name: true },
            })
          : Promise.resolve(null),
        resolveCallStoreIds(fastify, [
          { id: log.id, storeId: log.storeId, legacyUserId: log.legacyUserId, staffId: log.staffId },
        ]),
      ]);
      const staffMap = new Map(staffRows.map((s) => [s.id, s]));
      const callerStaff = log.staffId ? staffMap.get(log.staffId) : undefined;
      const resolvedStoreId = branchResolution.storeIdByLogId.get(log.id) ?? log.storeId ?? null;
      const resolvedStoreName = resolvedStoreId ? (branchResolution.storeNameById.get(resolvedStoreId) ?? null) : null;
      const qaTags = safeJsonParseArray(log.qaTags).map(String);
      const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);

      return redactLogForViewer(
        {
          ...log,
          storeId: resolvedStoreId,
          storeName: resolvedStoreName,
          laughTimestamps: safeJsonParseArray(log.laughTimestamps),
          qaLaughVerifications: safeJsonParseArray(log.qaLaughVerifications),
          qaTags,
          qaChecklist: safeJsonParseObject(log.qaChecklist),
          callType,
          hasComplaint,
          staffName: callerStaff?.displayName ?? null,
          staffAvatarUrl: callerStaff?.avatarUrl ?? null,
          managerReviewedByName: log.managerReviewedBy
            ? (staffMap.get(log.managerReviewedBy)?.displayName ?? null)
            : null,
          adminReviewedByName: log.adminReviewedBy ? (staffMap.get(log.adminReviewedBy)?.displayName ?? null) : null,
          customerName: customer
            ? customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : null,
        },
        scope
      );
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Play call error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/logs/:id/reanalyze
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

        return { success: true, logId: log.id, analysisStatus: 'PENDING' };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Reanalyze call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );

  // POST /api/omicall/logs/sync
  fastify.post('/omicall/logs/sync', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const body = (request.body || {}) as { days?: number; autoAnalyze?: boolean };
    const rawDays = Number(body.days);
    const days = Number.isFinite(rawDays) ? Math.min(30, Math.max(1, Math.round(rawDays))) : 14;

    try {
      const toDate = Date.now() + 60_000;
      const fromDate = toDate - days * 24 * 60 * 60 * 1000;
      const items = await fetchRecentOmiCallCdrs({ fromDate, toDate, page: 1, size: 100 });
      const summary = await upsertOmicallCdrBatch(fastify, items, {
        autoAnalyze: Boolean(body.autoAnalyze),
        preserveTimestampOnCreate: true,
      });

      return { success: true, fetched: items.length, days, ...summary };
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
        return { success: true, ...summary };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Import OmiCall CDR batch error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );

  // POST /api/omicall/logs/:id/verify
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
        adminSatisfactionScore: reqAdminScore,
        adminNote: reqAdminNote,
        managerSatisfactionScore: reqManagerScore,
        managerNote: reqManagerNote,
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
        adminSatisfactionScore?: number | null;
        adminNote?: string | null;
        managerSatisfactionScore?: number | null;
        managerNote?: string | null;
      };

      const logId = parseInt(id, 10);
      if (isNaN(logId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid log id' });
      }

      const user = request.user as JwtUserPayload;
      const isAdmin = isAdminOrSuperAdminRole(user.role as UserRole);

      try {
        const log = await fastify.prisma.crm.crmOmicallLog.findUnique({ where: { id: logId } });
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

        const now = new Date();
        const roleUpdateData: Record<string, unknown> = {};
        const normalizeScore = (val: number | null | undefined): number | null | undefined => {
          if (val === undefined) return undefined;
          if (val === null || val === 0) return null;
          const n = Number(val);
          return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
        };

        const parsedAdminScore = normalizeScore(reqAdminScore);
        const parsedManagerScore = normalizeScore(reqManagerScore);
        const parsedLegacyQaScore = normalizeScore(reqScore);

        if (isAdmin) {
          const nextAdminScore =
            parsedAdminScore !== undefined
              ? parsedAdminScore
              : parsedManagerScore === undefined && parsedLegacyQaScore !== undefined
                ? parsedLegacyQaScore
                : undefined;
          if (nextAdminScore !== undefined || reqAdminNote !== undefined) {
            roleUpdateData.adminSatisfactionScore =
              nextAdminScore !== undefined ? nextAdminScore : log.adminSatisfactionScore;
            roleUpdateData.adminNote =
              reqAdminNote !== undefined
                ? reqAdminNote || null
                : reqNotes !== undefined
                  ? reqNotes || null
                  : log.adminNote;
            roleUpdateData.adminReviewedBy = user.id;
            roleUpdateData.adminReviewedAt = now;
          }
          if (parsedManagerScore !== undefined || reqManagerNote !== undefined) {
            roleUpdateData.managerSatisfactionScore =
              parsedManagerScore !== undefined ? parsedManagerScore : log.managerSatisfactionScore;
            roleUpdateData.managerNote = reqManagerNote !== undefined ? reqManagerNote || null : log.managerNote;
            roleUpdateData.managerReviewedBy = user.id;
            roleUpdateData.managerReviewedAt = now;
          }
        } else {
          const nextManagerScore = parsedManagerScore !== undefined ? parsedManagerScore : parsedLegacyQaScore;
          if (nextManagerScore !== undefined || reqManagerNote !== undefined || reqNotes !== undefined) {
            roleUpdateData.managerSatisfactionScore =
              nextManagerScore !== undefined ? nextManagerScore : log.managerSatisfactionScore;
            roleUpdateData.managerNote =
              reqManagerNote !== undefined
                ? reqManagerNote || null
                : reqNotes !== undefined
                  ? reqNotes || null
                  : log.managerNote;
            roleUpdateData.managerReviewedBy = user.id;
            roleUpdateData.managerReviewedAt = now;
          }
        }

        const updated = await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: logId },
          data: {
            happyCallStatus,
            happyCallReason,
            qaVerified: true,
            qaVerifiedBy: user.id,
            qaVerifiedAt: now,
            qaLaughVerifications: qaLaughVerifications || log.qaLaughVerifications,
            qaNotes: qaNotes || null,
            qaScore: reqScore !== undefined ? reqScore : log.qaScore,
            qaTags: reqTags !== undefined ? (reqTags ? JSON.stringify(reqTags) : null) : log.qaTags,
            qaChecklist:
              reqChecklist !== undefined ? (reqChecklist ? JSON.stringify(reqChecklist) : null) : log.qaChecklist,
            ...roleUpdateData,
          },
        });

        const staffIds = Array.from(
          new Set(
            [updated.staffId, updated.managerReviewedBy, updated.adminReviewedBy].filter(
              (sid): sid is number => sid !== null && sid !== undefined
            )
          )
        );
        const [staffRows, branchResolution] = await Promise.all([
          staffIds.length > 0
            ? fastify.prisma.crm.crmStaff.findMany({
                where: { id: { in: staffIds } },
                select: { id: true, displayName: true, avatarUrl: true },
              })
            : Promise.resolve([]),
          resolveCallStoreIds(fastify, [
            {
              id: updated.id,
              storeId: updated.storeId,
              legacyUserId: updated.legacyUserId,
              staffId: updated.staffId,
            },
          ]),
        ]);
        const staffMap = new Map(staffRows.map((s) => [s.id, s]));
        const resolvedStoreId = branchResolution.storeIdByLogId.get(updated.id) ?? updated.storeId ?? null;
        const resolvedStoreName = resolvedStoreId
          ? (branchResolution.storeNameById.get(resolvedStoreId) ?? null)
          : null;
        const parsedTags = safeJsonParseArray(updated.qaTags).map(String);
        const { callType, hasComplaint } = deriveCallMetaFromTags(parsedTags);

        return {
          ...updated,
          storeId: resolvedStoreId,
          storeName: resolvedStoreName,
          aiLockedUntilSelfRated: false,
          laughTimestamps: safeJsonParseArray(updated.laughTimestamps),
          qaLaughVerifications: safeJsonParseArray(updated.qaLaughVerifications),
          qaTags: parsedTags,
          qaChecklist: safeJsonParseObject(updated.qaChecklist),
          callType,
          hasComplaint,
          staffName: updated.staffId ? (staffMap.get(updated.staffId)?.displayName ?? null) : null,
          staffAvatarUrl: updated.staffId ? (staffMap.get(updated.staffId)?.avatarUrl ?? null) : null,
          managerReviewedByName: updated.managerReviewedBy
            ? (staffMap.get(updated.managerReviewedBy)?.displayName ?? null)
            : null,
          adminReviewedByName: updated.adminReviewedBy
            ? (staffMap.get(updated.adminReviewedBy)?.displayName ?? null)
            : null,
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Verify call log error:');
        return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
      }
    }
  );
}
