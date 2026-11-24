import type { FastifyInstance } from 'fastify';
import { requireAuth, type JwtUserPayload } from '../../../middlewares/auth.js';
import { listActiveOmicallBranches, resolveCallStoreIds } from '../omicall-branch.service.js';
import { generateStaffCoachingFeedback, recordPendingSelfAssessment } from '../omicall-coaching.service.js';
import {
  deriveCallMetaFromTags,
  resolveViewerExtensionScope,
  safeJsonParseArray,
  safeJsonParseObject,
} from '../omicall-logs-query.service.js';

function parseRatingScore(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

async function applySelfAssessmentToLog(
  fastify: FastifyInstance,
  logId: number,
  input: { score: number; note: string | null }
): Promise<SafeAny> {
  const now = new Date();
  const updated = await fastify.prisma.crm.crmOmicallLog.update({
    where: { id: logId },
    data: {
      staffSelfSatisfactionScore: input.score,
      staffSelfNote: input.note,
      staffSelfRatedAt: now,
    },
  });

  let feedback = updated.staffAiCoachingFeedback ?? null;
  let coachingAt = updated.staffAiCoachingAt ?? null;
  const coachingPending = updated.analysisStatus !== 'DONE';

  if (!coachingPending) {
    feedback = await generateStaffCoachingFeedback(fastify, {
      id: updated.id,
      staffSelfSatisfactionScore: updated.staffSelfSatisfactionScore,
      staffSelfNote: updated.staffSelfNote ?? null,
      customerSatisfactionScore: updated.customerSatisfactionScore ?? null,
      customerSentiment: updated.customerSentiment ?? null,
      happyCallStatus: updated.happyCallStatus,
      satisfactionAnalysis: updated.satisfactionAnalysis ?? null,
      transcript: updated.transcript ?? null,
    });
    coachingAt = feedback ? new Date() : null;
  }

  const branchResolution = await resolveCallStoreIds(fastify, [
    {
      id: updated.id,
      storeId: updated.storeId,
      legacyUserId: updated.legacyUserId,
      staffId: updated.staffId,
    },
  ]);
  const storeId = branchResolution.storeIdByLogId.get(updated.id) ?? updated.storeId ?? null;
  const storeName = storeId ? (branchResolution.storeNameById.get(storeId) ?? null) : null;
  const qaTags = safeJsonParseArray(updated.qaTags).map(String);
  const { callType, hasComplaint } = deriveCallMetaFromTags(qaTags);

  return {
    ...updated,
    storeId,
    storeName,
    staffAiCoachingFeedback: feedback,
    staffAiCoachingAt: coachingAt,
    aiLockedUntilSelfRated: false,
    coachingPending,
    laughTimestamps: safeJsonParseArray(updated.laughTimestamps),
    qaLaughVerifications: safeJsonParseArray(updated.qaLaughVerifications),
    qaTags,
    qaChecklist: safeJsonParseObject(updated.qaChecklist),
    callType,
    hasComplaint,
  };
}

export function registerOmicallRatingRoutes(fastify: FastifyInstance): void {
  // GET /api/omicall/branches
  // Returns branch options for call-center filtering regardless of admin/QA role
  fastify.get('/omicall/branches', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const branches = await listActiveOmicallBranches(fastify);
      return { branches };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'List OmiCall branches error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/logs/:id/self-assessment
  // Submits caller's locked 1-5 self-rating, unlocks AI analysis, and returns AI Coaching comparison
  fastify.post('/omicall/logs/:id/self-assessment', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as { score?: number; note?: string | null };

    const logId = Number.parseInt(id, 10);
    if (!Number.isSafeInteger(logId) || logId <= 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID cuộc gọi không hợp lệ' });
    }

    const score = parseRatingScore(body.score);
    if (!score) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Điểm tự đánh giá phải từ 1 đến 5 sao' });
    }

    try {
      const [log, scope] = await Promise.all([
        fastify.prisma.crm.crmOmicallLog.findUnique({ where: { id: logId } }),
        resolveViewerExtensionScope(fastify, user),
      ]);

      if (!log) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy bản ghi cuộc gọi' });
      }

      const canAccess = scope.isQaReviewer || log.staffId === null || scope.allowedStaffIds.includes(log.staffId);
      if (!canAccess) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Bạn chỉ có thể tự đánh giá các cuộc gọi thuộc về mình.',
        });
      }

      if (log.staffSelfSatisfactionScore !== null && log.staffSelfSatisfactionScore !== undefined) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Bạn đã tự đánh giá cuộc gọi này và mở khóa kết quả AI nên không thể sửa lại.',
        });
      }

      const trimmedNote = typeof body.note === 'string' ? body.note.trim() || null : null;
      const result = await applySelfAssessmentToLog(fastify, log.id, { score, note: trimmedNote });
      return { success: true, log: result };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Submit OmiCall self-assessment error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });

  // POST /api/omicall/self-assessment-intent
  // Applies self-rating immediately if CDR exists, otherwise queues it for CDR ingestion
  fastify.post('/omicall/self-assessment-intent', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtUserPayload;
    const body = (request.body || {}) as {
      phone?: string;
      callUuid?: string;
      score?: number;
      note?: string | null;
    };

    const score = parseRatingScore(body.score);
    if (!score) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Điểm tự đánh giá phải từ 1 đến 5 sao' });
    }
    if (!body.phone && !body.callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'phone or callUuid is required' });
    }

    const trimmedNote = typeof body.note === 'string' ? body.note.trim() || null : null;

    try {
      const scope = await resolveViewerExtensionScope(fastify, user);
      const trimmedUuid = body.callUuid?.trim() || '';
      let matchedLog: SafeAny = null;

      if (trimmedUuid) {
        const byUuid = await fastify.prisma.crm.crmOmicallLog.findUnique({ where: { callUuid: trimmedUuid } });
        if (
          byUuid &&
          (scope.isQaReviewer || byUuid.staffId === null || scope.allowedStaffIds.includes(byUuid.staffId))
        ) {
          matchedLog = byUuid;
        }
      }

      if (!matchedLog && body.phone) {
        const cleanDigits = body.phone.replace(/\D/g, '');
        const suffix = cleanDigits.length > 9 ? cleanDigits.slice(-9) : cleanDigits;
        if (suffix) {
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          matchedLog = await fastify.prisma.crm.crmOmicallLog.findFirst({
            where: {
              createdAt: { gte: tenMinutesAgo },
              OR: [{ destinationNumber: { contains: suffix } }, { sourceNumber: { contains: suffix } }],
              ...(!scope.isQaReviewer
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
          });
        }
      }

      if (matchedLog) {
        if (matchedLog.staffSelfSatisfactionScore !== null && matchedLog.staffSelfSatisfactionScore !== undefined) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Bạn đã tự đánh giá cuộc gọi này và mở khóa kết quả AI nên không thể sửa lại.',
          });
        }
        const unlocked = await applySelfAssessmentToLog(fastify, matchedLog.id, { score, note: trimmedNote });
        return { success: true, matchedLogId: matchedLog.id, queued: false, log: unlocked };
      }

      recordPendingSelfAssessment({
        staffId: user.id,
        phone: body.phone || null,
        callUuid: body.callUuid || null,
        score,
        note: trimmedNote,
      });

      return { success: true, matchedLogId: null, queued: true };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Submit OmiCall self-assessment intent error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });
}
