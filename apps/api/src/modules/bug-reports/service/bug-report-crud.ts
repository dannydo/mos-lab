import type { FastifyInstance } from 'fastify';
import type { CrmBugReport, Prisma } from '../../../generated/crm-client/index.js';
import {
  BUG_REPORT_PRIORITIES,
  BUG_REPORT_REQUEST_TYPES,
  BUG_REPORT_STATUSES,
  formatBugReportKey,
  removeVietnameseTones,
  type BugReportBadgeSummaryResponse,
  type BugReportDetail,
  type BugReportListQuery,
  type BugReportListResponse,
  type BugReportRequestType,
  type CreateBugReportCommentRequest,
  type CreateBugReportRequest,
  type MarkBugReportNotificationsReadRequest,
  type MyBugReportsResponse,
} from '@mos-lab/shared';
import { BugReportStorage } from '../bug-report.storage.js';
import { detailDto, myReportDto, notificationDto, summaryDto } from './bug-report-dto.js';
import {
  BugReportError,
  bugReportClarificationWhere,
  bugReportNextActorWhere,
  clipped,
  listReportInclude,
  mineReportInclude,
  normalizeBugReportExpertDetails,
  normalizeFeatureRequestContext,
  normalizedAttachments,
  reportInclude,
  safeJsonParse,
  sanitizeBugReportContext,
  saveAttachments,
  serialize,
} from './bug-report-filters.js';
import { stateSnapshot } from './bug-report-transitions.js';

export async function createBugReport(
  fastify: FastifyInstance,
  reporterStaffId: number,
  input: CreateBugReportRequest
) {
  const rawRequestType = input?.requestType;
  if (rawRequestType !== undefined && !BUG_REPORT_REQUEST_TYPES.includes(rawRequestType)) {
    throw new BugReportError('Loại yêu cầu không hợp lệ.');
  }
  const requestType: BugReportRequestType = rawRequestType ?? 'BUG';
  const rawDescription = String(input?.description || '').trim();
  if (rawDescription.length > 2000) throw new BugReportError('Mô tả không được vượt quá 2.000 ký tự.');
  const description = clipped(rawDescription, 2000);
  if (description.length < 3) throw new BugReportError('Vui lòng mô tả vấn đề bằng ít nhất 3 ký tự.');
  const attachments = normalizedAttachments(input?.attachments);
  const featureRequest =
    requestType === 'FEATURE'
      ? normalizeFeatureRequestContext(
          input?.featureRequest || { reason: description, audience: 'TEAM', desiredOutcome: null }
        )
      : null;
  const expertDetails = normalizeBugReportExpertDetails(input?.expertDetails);
  const classificationJobId = clipped(input?.classificationJobId, 36) || null;
  const conversationSessionId = clipped(input?.conversationSessionId, 36) || null;

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await fastify.prisma.crm.crmBugReport.count({
    where: { reporterStaffId, createdAt: { gte: since } },
  });
  if (recentCount >= 10)
    throw new BugReportError('Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.', 429, 'REPORT_RATE_LIMIT');

  const reporter = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: reporterStaffId },
    select: { displayName: true },
  });
  if (!reporter) throw new BugReportError('Không tìm thấy tài khoản nhân viên.', 401);
  const context = sanitizeBugReportContext(input?.context);
  const title = (description.split('\n').find(Boolean) || description).slice(0, 180);
  const searchNormalized = removeVietnameseTones(
    `${title} ${description} ${context.path} ${reporter.displayName} ${featureRequest?.reason || ''} ${featureRequest?.audience || ''} ${featureRequest?.desiredOutcome || ''} ${expertDetails?.reproductionSteps || ''} ${expertDetails?.expectedResult || ''} ${expertDetails?.actualResult || ''} ${expertDetails?.environment || ''} ${expertDetails?.workaround || ''} ${expertDetails?.relatedTicket || ''}`
  );

  const report = await fastify.prisma.crm.$transaction(async (tx) => {
    const classification = classificationJobId
      ? await tx.crmRequestClassificationJob.findFirst({
          where: { id: classificationJobId, reporterStaffId, status: 'COMPLETED', expiresAt: { gt: new Date() } },
        })
      : null;
    const conversation = conversationSessionId
      ? await tx.crmRequestConversation.findFirst({
          where: { id: conversationSessionId, reporterStaffId, status: 'READY', expiresAt: { gt: new Date() } },
        })
      : null;
    const created = await tx.crmBugReport.create({
      data: {
        reporterStaffId,
        requestType,
        requestMetadataJson:
          featureRequest || expertDetails ? serialize({ ...(featureRequest || {}), expertDetails }) : null,
        title,
        description,
        searchNormalized,
        sourcePath: context.path,
        contextJson: serialize(context),
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: created.id,
        actorStaffId: reporterStaffId,
        action: 'CREATED',
        afterJson: serialize(stateSnapshot(created)),
      },
    });
    if (classification) {
      await tx.crmRequestClassificationJob.update({
        where: { id: classification.id },
        data: { consumedAt: new Date() },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: created.id,
          actorStaffId: reporterStaffId,
          action: 'CLASSIFICATION_APPLIED',
          note: `AI đề xuất ${safeJsonParse<{ requestType?: string }>(classification.recommendationJson, {}).requestType || 'UNKNOWN'}; người báo chọn ${requestType}.`,
          afterJson: serialize({
            classificationJobId: classification.id,
            recommendation: safeJsonParse(classification.recommendationJson, null),
            finalRequestType: requestType,
          }),
        },
      });
    }
    if (conversation) {
      await tx.crmRequestConversation.update({ where: { id: conversation.id }, data: { consumedAt: new Date() } });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: created.id,
          actorStaffId: reporterStaffId,
          action: 'CONVERSATION_APPLIED',
          note: `Người báo xác nhận ${requestType} sau bước làm rõ AI.`,
          afterJson: serialize({
            conversationSessionId: conversation.id,
            finalRequestType: requestType,
            appliedAt: new Date().toISOString(),
          }),
        },
      });
    }
    return created;
  });

  const attachmentWarnings = await saveAttachments(fastify, report.id, attachments);
  fastify.cache?.invalidatePattern('^bug-reports:(mine|badge):');

  return { id: report.id, key: formatBugReportKey(report.id, requestType), attachmentWarnings };
}

export async function listBugReports(
  fastify: FastifyInstance,
  query: BugReportListQuery
): Promise<BugReportListResponse> {
  const page = Math.max(1, Math.trunc(Number(query.page) || 1));
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(query.limit) || 20)));
  const status =
    query.status && query.status !== 'ALL' && BUG_REPORT_STATUSES.includes(query.status) ? query.status : undefined;
  const priority =
    query.priority && query.priority !== 'ALL' && BUG_REPORT_PRIORITIES.includes(query.priority)
      ? query.priority
      : undefined;
  const requestType =
    query.requestType && query.requestType !== 'ALL' && BUG_REPORT_REQUEST_TYPES.includes(query.requestType)
      ? query.requestType
      : undefined;
  const search = removeVietnameseTones(clipped(query.search, 200));
  const where: Prisma.CrmBugReportWhereInput = {
    ...(requestType ? { requestType } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...bugReportClarificationWhere(query.clarification),
    ...bugReportNextActorWhere(query.nextActor),
    ...(search ? { searchNormalized: { contains: search } } : {}),
  };
  const now = new Date();
  const [total, rows, [summaryCounts], liveWorkerJob] = await Promise.all([
    fastify.prisma.crm.crmBugReport.count({ where }),
    fastify.prisma.crm.crmBugReport.findMany({
      where,
      include: listReportInclude,
      orderBy: [{ statusSort: 'asc' }, { prioritySort: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.crm.$queryRaw<Array<Record<string, bigint | number>>>`
      SELECT
        COUNT(CASE WHEN request_type = 'BUG' THEN 1 END) AS bugCount,
        COUNT(CASE WHEN request_type = 'FEATURE' THEN 1 END) AS featureCount,
        COUNT(CASE WHEN status = 'NEW' THEN 1 END) AS newCount,
        COUNT(CASE WHEN status = 'NEW' AND clarification_status = 'READY' THEN 1 END) AS readyForDannyCount,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approvedCount,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) AS inProgressCount,
        COUNT(CASE WHEN status = 'FIXED' THEN 1 END) AS fixedCount,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) AS closedCount,
        COUNT(CASE WHEN clarification_status = 'PENDING_AGENT' THEN 1 END) AS pendingAgentCount,
        COUNT(CASE WHEN clarification_status = 'WAITING_REPORTER' THEN 1 END) AS waitingReporterCount,
        COUNT(CASE WHEN status IN ('NEW', 'APPROVED', 'IN_PROGRESS', 'FIXED') THEN 1 END) AS openCount,
        COUNT(CASE WHEN status = 'FIXED' OR (status IN ('NEW', 'APPROVED', 'IN_PROGRESS') AND clarification_status = 'WAITING_REPORTER') THEN 1 END) AS reporterActionCount,
        COUNT(CASE WHEN status IN ('NEW', 'APPROVED', 'IN_PROGRESS') AND clarification_status = 'WAITING_REPORTER' THEN 1 END) AS reporterClarificationCount,
        COUNT(CASE WHEN status = 'FIXED' THEN 1 END) AS reporterReviewCount,
        COUNT(CASE WHEN status = 'NEW' AND clarification_status = 'READY' THEN 1 END) AS dannyActionCount,
        COUNT(CASE WHEN (status IN ('NEW', 'APPROVED', 'IN_PROGRESS') AND clarification_status = 'PENDING_AGENT') OR (status IN ('APPROVED', 'IN_PROGRESS') AND clarification_status = 'READY' AND priority IS NOT NULL) THEN 1 END) AS agentActionCount,
        COUNT(CASE WHEN status IN ('NEW', 'APPROVED', 'IN_PROGRESS') AND clarification_status = 'PENDING_AGENT' THEN 1 END) AS agentClarificationCount,
        COUNT(CASE WHEN status IN ('APPROVED', 'IN_PROGRESS') AND clarification_status = 'READY' AND priority IS NOT NULL THEN 1 END) AS agentDeliveryCount
      FROM crm_bug_reports
    `,
    fastify.prisma.crm.crmInboxImplementationJob.findFirst({
      where: { status: 'RUNNING', leaseExpiresAt: { gt: now } },
      orderBy: [{ lastProgressAt: 'desc' }, { startedAt: 'asc' }],
      select: {
        reportId: true,
        leasedBy: true,
        executionPhase: true,
        startedAt: true,
        lastProgressAt: true,
        report: { select: { requestType: true } },
      },
    }),
  ]);

  const num = (val: unknown) => (val !== undefined && val !== null ? Number(val) : 0);
  const bugCount = num(summaryCounts?.bugCount);
  const featureCount = num(summaryCounts?.featureCount);
  const newCount = num(summaryCounts?.newCount);
  const readyForDannyCount = num(summaryCounts?.readyForDannyCount);
  const approvedCount = num(summaryCounts?.approvedCount);
  const inProgressCount = num(summaryCounts?.inProgressCount);
  const fixedCount = num(summaryCounts?.fixedCount);
  const closedCount = num(summaryCounts?.closedCount);
  const pendingAgentCount = num(summaryCounts?.pendingAgentCount);
  const waitingReporterCount = num(summaryCounts?.waitingReporterCount);
  const openCount = num(summaryCounts?.openCount);
  const reporterActionCount = num(summaryCounts?.reporterActionCount);
  const reporterClarificationCount = num(summaryCounts?.reporterClarificationCount);
  const reporterReviewCount = num(summaryCounts?.reporterReviewCount);
  const dannyActionCount = num(summaryCounts?.dannyActionCount);
  const agentActionCount = num(summaryCounts?.agentActionCount);
  const agentClarificationCount = num(summaryCounts?.agentClarificationCount);
  const agentDeliveryCount = num(summaryCounts?.agentDeliveryCount);
  return {
    data: rows.map(summaryDto),
    total,
    page,
    limit,
    summary: {
      bugCount,
      featureCount,
      newCount,
      readyForDannyCount,
      approvedCount,
      inProgressCount,
      fixedCount,
      closedCount,
      unclearCount: pendingAgentCount + waitingReporterCount,
      pendingAgentCount,
      waitingReporterCount,
      openCount,
      reporterActionCount,
      reporterClarificationCount,
      reporterReviewCount,
      dannyActionCount,
      agentActionCount,
      agentClarificationCount,
      agentDeliveryCount,
      liveWorker: liveWorkerJob
        ? {
            ticketId: liveWorkerJob.reportId,
            ticketKey: formatBugReportKey(
              liveWorkerJob.reportId,
              liveWorkerJob.report.requestType === 'FEATURE' ? 'FEATURE' : 'BUG'
            ),
            workerId: clipped(liveWorkerJob.leasedBy, 100) || null,
            phase: clipped(liveWorkerJob.executionPhase, 32) || 'CODEX_RUNNING',
            startedAt: liveWorkerJob.startedAt?.toISOString() ?? null,
            lastProgressAt: liveWorkerJob.lastProgressAt?.toISOString() ?? null,
          }
        : null,
    },
  };
}

export async function getBugReportDetail(fastify: FastifyInstance, id: number): Promise<BugReportDetail> {
  const row = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id }, include: reportInclude });
  if (!row) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  return detailDto(row);
}

export async function listMyBugReports(
  fastify: FastifyInstance,
  reporterStaffId: number
): Promise<MyBugReportsResponse> {
  const [rows, notifications, unreadCount, actionRequiredCount] = await Promise.all([
    fastify.prisma.crm.crmBugReport.findMany({
      where: { reporterStaffId },
      include: mineReportInclude,
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    fastify.prisma.crm.crmBugReportNotification.findMany({
      where: { recipientStaffId: reporterStaffId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    fastify.prisma.crm.crmBugReportNotification.count({
      where: { recipientStaffId: reporterStaffId, readAt: null },
    }),
    fastify.prisma.crm.crmBugReport.count({
      where: {
        reporterStaffId,
        OR: [{ clarificationStatus: 'WAITING_REPORTER' }, { status: 'FIXED' }],
      },
    }),
  ]);
  return {
    data: rows.map(myReportDto),
    notifications: notifications.map(notificationDto),
    unreadCount,
    actionRequiredCount,
  };
}

export async function getBugReportBadgeSummary(
  fastify: FastifyInstance,
  reporterStaffId: number,
  includeInboxSummary: boolean
): Promise<BugReportBadgeSummaryResponse> {
  const [unreadRows, unreadCount, actionRequiredCount, readyForDannyCount] = await Promise.all([
    fastify.prisma.crm.crmBugReportNotification.findMany({
      where: { recipientStaffId: reporterStaffId, readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    fastify.prisma.crm.crmBugReportNotification.count({
      where: { recipientStaffId: reporterStaffId, readAt: null },
    }),
    fastify.prisma.crm.crmBugReport.count({
      where: {
        reporterStaffId,
        OR: [{ clarificationStatus: 'WAITING_REPORTER' }, { status: 'FIXED' }],
      },
    }),
    includeInboxSummary
      ? fastify.prisma.crm.crmBugReport.count({
          where: { status: 'NEW', clarificationStatus: 'READY' },
        })
      : Promise.resolve(0),
  ]);

  return {
    unreadCount,
    actionRequiredCount,
    readyForDannyCount,
    unreadNotifications: unreadRows.map(notificationDto),
  };
}

async function reportForUser(
  fastify: FastifyInstance,
  actorStaffId: number,
  id: number,
  canOverride: boolean
): Promise<CrmBugReport> {
  const report = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!report || (!canOverride && report.reporterStaffId !== actorStaffId)) {
    throw new BugReportError('Không tìm thấy ticket bạn được phép xem.', 404, 'BUG_NOT_FOUND');
  }
  return report;
}

export async function addBugReportComment(
  fastify: FastifyInstance,
  actorStaffId: number,
  id: number,
  canOverride: boolean,
  input: CreateBugReportCommentRequest,
  getDetail: (fastify: FastifyInstance, id: number) => Promise<BugReportDetail> = getBugReportDetail
) {
  const existing = await reportForUser(fastify, actorStaffId, id, canOverride);
  if (['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(existing.status)) {
    throw new BugReportError('Ticket đã kết thúc nên hội thoại đang ở chế độ chỉ đọc.', 409, 'BUG_COMMENT_LOCKED');
  }
  const body = clipped(input?.body, 2000);
  const attachments = normalizedAttachments(input?.attachments);
  if (!body && !attachments.length) throw new BugReportError('Hãy nhập nội dung hoặc đính kèm ít nhất một ảnh.');

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await fastify.prisma.crm.crmBugReportComment.count({
    where: { authorStaffId: actorStaffId, createdAt: { gte: since } },
  });
  if (recentCount >= 30) {
    throw new BugReportError('Bạn đã gửi nhiều bình luận. Vui lòng thử lại sau.', 429, 'COMMENT_RATE_LIMIT');
  }

  const now = new Date();
  const shouldReturnToAgent = existing.clarificationStatus === 'WAITING_REPORTER';
  const comment = await fastify.prisma.crm.$transaction(async (tx) => {
    const created = await tx.crmBugReportComment.create({
      data: {
        reportId: id,
        authorStaffId: actorStaffId,
        authorType: 'STAFF',
        kind: 'COMMENT',
        body,
      },
    });
    const updated = await tx.crmBugReport.update({
      where: { id },
      data: {
        updatedAt: now,
        ...(shouldReturnToAgent
          ? { clarificationStatus: 'PENDING_AGENT', clarificationSummary: null, clarifiedAt: null }
          : {}),
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId,
        action: shouldReturnToAgent ? 'CLARIFICATION_ANSWERED' : 'COMMENTED',
        note: body || `Đính kèm ${attachments.length} ảnh.`,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(updated)),
      },
    });
    return created;
  });

  const attachmentWarnings = await saveAttachments(fastify, id, attachments, comment.id);
  fastify.cache?.invalidatePattern('^bug-reports:(mine|badge):');
  return { report: await getDetail(fastify, id), attachmentWarnings };
}

export async function getBugReportAttachment(fastify: FastifyInstance, reportId: number, attachmentId: number) {
  const attachment = await fastify.prisma.crm.crmBugReportAttachment.findFirst({
    where: { id: attachmentId, reportId, deletedAt: null },
  });
  if (!attachment) throw new BugReportError('Không tìm thấy ảnh.', 404, 'ATTACHMENT_NOT_FOUND');
  try {
    return { attachment, buffer: await BugReportStorage.read(attachment.storagePath) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new BugReportError('Ảnh này chưa có trong bản dữ liệu hiện tại.', 404, 'ATTACHMENT_FILE_MISSING');
    }
    throw error;
  }
}

export async function getBugReportAttachmentForUser(
  fastify: FastifyInstance,
  actorStaffId: number,
  reportId: number,
  attachmentId: number,
  canOverride: boolean
) {
  await reportForUser(fastify, actorStaffId, reportId, canOverride);
  return getBugReportAttachment(fastify, reportId, attachmentId);
}

export async function markBugReportNotificationsRead(
  fastify: FastifyInstance,
  reporterStaffId: number,
  input: MarkBugReportNotificationsReadRequest
): Promise<number> {
  const ids = Array.isArray(input?.notificationIds)
    ? Array.from(
        new Set(
          input.notificationIds
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
            .slice(0, 100)
        )
      )
    : [];
  const result = await fastify.prisma.crm.crmBugReportNotification.updateMany({
    where: {
      recipientStaffId: reporterStaffId,
      readAt: null,
      ...(ids.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  fastify.cache?.invalidatePattern(`^bug-reports:(mine|badge):${reporterStaffId}(:|$)`);
  return result.count;
}

export async function cleanupExpiredBugReportAttachments(fastify: FastifyInstance, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const attachments = await fastify.prisma.crm.crmBugReportAttachment.findMany({
    where: {
      deletedAt: null,
      report: { status: { in: ['CLOSED', 'REJECTED', 'DUPLICATE'] }, closedAt: { lte: cutoff } },
    },
    take: 500,
  });
  let deleted = 0;
  for (const attachment of attachments) {
    try {
      await BugReportStorage.remove(attachment.storagePath);
      await fastify.prisma.crm.crmBugReportAttachment.update({
        where: { id: attachment.id },
        data: { deletedAt: now },
      });
      deleted += 1;
    } catch (error) {
      fastify.log.warn({ error, attachmentId: attachment.id }, 'Bug report attachment cleanup failed');
    }
  }
  return deleted;
}
