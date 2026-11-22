import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  removeVietnameseTones,
  type AgentBugBundle,
  type AgentBugKnowledgeItem,
  type AgentBugQueueItem,
  type AgentMarkBugFixedRequest,
  type AgentReviewBugReportRequest,
  type AgentUpdateBugProgressRequest,
  type BugPriority,
  type BugReportClarificationStatus,
  type BugReportDetail,
  type BugReportStatus,
} from '@mos-lab/shared';
import { getBugReportDetail } from './bug-report-crud.js';
import { reviewUrl } from './bug-report-dto.js';
import {
  BugReportError,
  STATUS_SORT,
  clipped,
  safeJsonParse,
  serialize,
  storedRequestType,
} from './bug-report-filters.js';
import { assertAgentProgressUpdateAllowed, bugReportNextAction } from './bug-report-next-action.js';
import {
  AGENT_PROGRESS_AUDIT_PREFIX,
  AGENT_PROGRESS_DEFAULT_NOTES,
  bugReportAgentProgress,
} from './bug-report-progress.js';
import {
  isAgentReadableBugStatus,
  knowledgeTokens,
  normalizeAgentResolution,
  parseBugReportKey,
  renderAgentMarkdown,
  stateSnapshot,
} from './bug-report-transitions.js';

export async function reviewClarificationByAgent(
  fastify: FastifyInstance,
  key: string,
  input: AgentReviewBugReportRequest
): Promise<BugReportDetail> {
  const id = parseBugReportKey(key);
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (!['NEW', 'APPROVED', 'IN_PROGRESS'].includes(existing.status)) {
    throw new BugReportError('Ticket không còn ở giai đoạn có thể làm rõ.', 409, 'BUG_NOT_OPEN_FOR_CLARIFICATION');
  }
  const decision = input?.decision;
  if (decision !== 'ASK_REPORTER' && decision !== 'READY_FOR_TRIAGE') {
    throw new BugReportError('Quyết định làm rõ không hợp lệ.');
  }
  const message = clipped(input?.message, 4000);
  const minimumLength = decision === 'ASK_REPORTER' ? 3 : 10;
  if (message.length < minimumLength) {
    throw new BugReportError(
      decision === 'ASK_REPORTER'
        ? 'Câu hỏi làm rõ phải có ít nhất 3 ký tự.'
        : 'Kết luận biz logic phải có ít nhất 10 ký tự.'
    );
  }
  const now = new Date();
  const nextClarificationStatus: BugReportClarificationStatus =
    decision === 'ASK_REPORTER' ? 'WAITING_REPORTER' : 'READY';
  const businessContext =
    decision === 'READY_FOR_TRIAGE'
      ? clipped(input?.businessContext, 4000) || existing.businessContext || message
      : existing.businessContext;

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmBugReportComment.create({
      data: {
        reportId: id,
        authorType: 'AGENT',
        kind: decision === 'ASK_REPORTER' ? 'CLARIFICATION_QUESTION' : 'CLARIFICATION_REVIEW',
        body: message,
      },
    });
    const updated = await tx.crmBugReport.update({
      where: { id },
      data: {
        businessContext,
        clarificationStatus: nextClarificationStatus,
        clarificationSummary: decision === 'READY_FOR_TRIAGE' ? message : null,
        clarifiedAt: decision === 'READY_FOR_TRIAGE' ? now : null,
        updatedAt: now,
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        action: decision === 'ASK_REPORTER' ? 'AGENT_ASKED_CLARIFICATION' : 'AGENT_CONFIRMED_CLARITY',
        note: message,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(updated)),
      },
    });
    if (decision === 'ASK_REPORTER') {
      await tx.crmBugReportNotification.create({
        data: {
          reportId: id,
          recipientStaffId: existing.reporterStaffId,
          type: existing.requestType === 'FEATURE' ? 'FEATURE_CLARIFICATION_NEEDED' : 'BUG_CLARIFICATION_NEEDED',
          title: `${formatBugReportKey(id, storedRequestType(existing.requestType))} cần bạn bổ sung thông tin`,
          message,
          actionUrl: reviewUrl(id, storedRequestType(existing.requestType)),
        },
      });
    }
  });

  return getBugReportDetail(fastify, id);
}

export async function markInboxFollowUpReviewed(fastify: FastifyInstance, key: string, note: string): Promise<boolean> {
  const id = parseBugReportKey(key);
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (existing.clarificationStatus !== 'PENDING_AGENT') return false;

  const now = new Date();
  await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmBugReport.update({
      where: { id },
      data: {
        businessContext: existing.businessContext || note,
        clarificationStatus: 'READY',
        clarificationSummary: note,
        clarifiedAt: now,
        updatedAt: now,
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        action: `${AGENT_PROGRESS_AUDIT_PREFIX}CHECKING_BUSINESS_LOGIC`,
        note,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(updated)),
      },
    });
  });
  return true;
}

export async function retryClarification(
  fastify: FastifyInstance,
  id: number,
  actorStaffId: number
): Promise<BugReportDetail> {
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(existing.status)) {
    throw new BugReportError('Ticket đã đóng, không thể làm rõ lại.', 400);
  }
  const now = new Date();
  await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmBugReport.update({
      where: { id },
      data: {
        clarificationStatus: 'PENDING_AGENT',
        clarificationSummary: null,
        clarifiedAt: null,
        updatedAt: now,
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId,
        action: 'CLARIFICATION_RETRIGGERED',
        note: 'Danny yêu cầu AI Agent (AG) làm rõ lại ticket.',
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(updated)),
      },
    });
  });
  return getBugReportDetail(fastify, id);
}

export async function updateAgentProgress(
  fastify: FastifyInstance,
  key: string,
  input: AgentUpdateBugProgressRequest,
  options: { dedupeSameStage?: boolean } = {}
): Promise<BugReportDetail> {
  const id = parseBugReportKey(key);
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  const stage = input?.stage;
  assertAgentProgressUpdateAllowed({
    stage,
    status: existing.status as BugReportStatus,
    clarificationStatus: existing.clarificationStatus as BugReportClarificationStatus,
    priority: existing.priority as BugPriority | null,
  });
  const action = `${AGENT_PROGRESS_AUDIT_PREFIX}${stage}`;
  const note = clipped(input?.note, 2000) || AGENT_PROGRESS_DEFAULT_NOTES[stage];
  const startsFix = (stage === 'IMPLEMENTING' || stage === 'VERIFYING') && existing.status === 'APPROVED';

  if (options.dedupeSameStage && !startsFix) {
    const latestHandoff = await fastify.prisma.crm.crmBugReportAudit.findFirst({
      where: {
        reportId: id,
        action: {
          in: [action, 'CLARIFICATION_ANSWERED', 'AGENT_ASKED_CLARIFICATION', 'AGENT_CONFIRMED_CLARITY'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (latestHandoff?.action === action) return getBugReportDetail(fastify, id);
  }

  const now = new Date();
  await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmBugReport.update({
      where: { id },
      data: {
        updatedAt: now,
        ...(startsFix
          ? {
              status: 'IN_PROGRESS',
              statusSort: STATUS_SORT.IN_PROGRESS,
              startedAt: existing.startedAt ?? now,
              resolvedAt: null,
              closedAt: null,
            }
          : {}),
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        action,
        note,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(updated)),
      },
    });
  });
  return getBugReportDetail(fastify, id);
}

export async function markFixedByAgent(
  fastify: FastifyInstance,
  key: string,
  input: AgentMarkBugFixedRequest
): Promise<BugReportDetail> {
  const id = parseBugReportKey(key);
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (!['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(existing.status)) {
    throw new BugReportError('Ticket chưa sẵn sàng để Agent gửi bản sửa.', 409, 'BUG_NOT_READY_FOR_FIX');
  }
  if (existing.clarificationStatus !== 'READY') {
    throw new BugReportError(
      'Agent chưa được phép sửa vì ticket vẫn còn điểm chưa rõ.',
      409,
      'BUG_NEEDS_CLARIFICATION'
    );
  }
  if (!existing.priority) throw new BugReportError('Ticket chưa có priority.', 409);
  const resolution = normalizeAgentResolution(input);
  const now = new Date();
  const resolutionSearch = removeVietnameseTones(
    `${existing.title} ${existing.description} ${existing.sourcePath} ${resolution.problemSummary} ${resolution.rootCause} ${resolution.solutionSummary}`
  );

  await fastify.prisma.crm.$transaction(async (tx) => {
    let current = existing;
    if (current.status === 'APPROVED') {
      const started = await tx.crmBugReport.update({
        where: { id },
        data: { status: 'IN_PROGRESS', startedAt: current.startedAt ?? now, statusSort: STATUS_SORT.IN_PROGRESS },
      });
      await tx.crmBugReportAudit.create({
        data: {
          reportId: id,
          action: 'STATUS_IN_PROGRESS',
          note: 'Agent bắt đầu xử lý ticket.',
          beforeJson: serialize(stateSnapshot(current)),
          afterJson: serialize(stateSnapshot(started)),
        },
      });
      current = started;
    }

    await tx.crmBugReportResolution.upsert({
      where: { reportId: id },
      create: {
        reportId: id,
        problemSummary: resolution.problemSummary,
        rootCause: resolution.rootCause,
        solutionSummary: resolution.solutionSummary,
        verificationSummary: resolution.verificationSummary,
        changedFilesJson: serialize(resolution.changedFiles),
        commitSha: resolution.commitSha,
        releaseUrl: resolution.releaseUrl,
        searchNormalized: resolutionSearch,
      },
      update: {
        problemSummary: resolution.problemSummary,
        rootCause: resolution.rootCause,
        solutionSummary: resolution.solutionSummary,
        verificationSummary: resolution.verificationSummary,
        changedFilesJson: serialize(resolution.changedFiles),
        commitSha: resolution.commitSha,
        releaseUrl: resolution.releaseUrl,
        searchNormalized: resolutionSearch,
      },
    });

    const fixed =
      current.status === 'FIXED'
        ? current
        : await tx.crmBugReport.update({
            where: { id },
            data: {
              status: 'FIXED',
              statusSort: STATUS_SORT.FIXED,
              startedAt: current.startedAt ?? now,
              resolvedAt: now,
              closedAt: null,
              triageNote: resolution.problemSummary,
            },
          });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        action: current.status === 'FIXED' ? 'AGENT_RESOLUTION_UPDATED' : 'AGENT_FIXED',
        note: resolution.problemSummary,
        beforeJson: serialize(stateSnapshot(current)),
        afterJson: serialize({ ...stateSnapshot(fixed), resolution }),
      },
    });

    if (current.status !== 'FIXED') {
      await tx.crmBugReportNotification.create({
        data: {
          reportId: id,
          recipientStaffId: existing.reporterStaffId,
          type: existing.requestType === 'FEATURE' ? 'FEATURE_IMPLEMENTED_REVIEW' : 'BUG_FIXED_REVIEW',
          title:
            existing.requestType === 'FEATURE'
              ? `${formatBugReportKey(id, 'FEATURE')} đã triển khai — mời bạn nghiệm thu`
              : `${formatBugReportKey(id, 'BUG')} đã sửa xong — mời bạn duyệt`,
          message: resolution.problemSummary,
          actionUrl: reviewUrl(id, storedRequestType(existing.requestType)),
        },
      });
    }
  });

  return getBugReportDetail(fastify, id);
}

async function findSimilarResolutions(
  fastify: FastifyInstance,
  report: BugReportDetail
): Promise<AgentBugKnowledgeItem[]> {
  const tokens = knowledgeTokens(`${report.title} ${report.description} ${report.sourcePath}`);
  if (!tokens.length) return [];
  const rows = await fastify.prisma.crm.crmBugReportResolution.findMany({
    where: {
      reportId: { not: report.id },
      report: { status: { in: ['FIXED', 'CLOSED'] } },
      OR: tokens.map((token) => ({ searchNormalized: { contains: token } })),
    },
    include: { report: { select: { id: true, requestType: true, title: true, sourcePath: true, resolvedAt: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });
  return rows
    .map((row) => ({
      row,
      score: tokens.reduce((total, token) => total + Number(row.searchNormalized.includes(token)), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.row.updatedAt.getTime() - left.row.updatedAt.getTime())
    .slice(0, 5)
    .map(({ row }) => ({
      key: formatBugReportKey(row.report.id, storedRequestType(row.report.requestType)),
      title: row.report.title,
      sourcePath: row.report.sourcePath,
      problemSummary: row.problemSummary,
      rootCause: row.rootCause,
      solutionSummary: row.solutionSummary,
      verificationSummary: row.verificationSummary,
      changedFiles: safeJsonParse<string[]>(row.changedFilesJson, []),
      commitSha: row.commitSha,
      releaseUrl: row.releaseUrl,
      fixedAt: row.report.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
}

export async function listAgentBugQueue(fastify: FastifyInstance): Promise<AgentBugQueueItem[]> {
  const rows = await fastify.prisma.crm.crmBugReport.findMany({
    where: {
      OR: [
        { status: 'NEW', clarificationStatus: 'PENDING_AGENT' },
        { status: { in: ['APPROVED', 'IN_PROGRESS'] }, clarificationStatus: 'PENDING_AGENT' },
        {
          status: { in: ['APPROVED', 'IN_PROGRESS'] },
          clarificationStatus: 'READY',
          priority: { not: null },
        },
      ],
    },
    include: {
      audits: { orderBy: { createdAt: 'asc' } },
      inboxImplementationJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          executionPhase: true,
          progressLabel: true,
          lastProgressAt: true,
          progressCount: true,
          checkpointCount: true,
          failureCode: true,
          retrySequence: true,
          testsJson: true,
          changedFilesJson: true,
          retainUntil: true,
          startedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ prioritySort: 'asc' }, { updatedAt: 'desc' }],
    take: 200,
  });
  return rows.map((row) => {
    const progressSource = { ...row, implementation: row.inboxImplementationJobs[0] ?? null };
    return {
      id: row.id,
      key: formatBugReportKey(row.id, storedRequestType(row.requestType)),
      requestType: storedRequestType(row.requestType),
      title: row.title,
      status: row.status as AgentBugQueueItem['status'],
      priority: row.priority as BugPriority | null,
      workType: row.clarificationStatus === 'READY' ? 'FIX' : 'CLARIFY',
      clarification: {
        status: row.clarificationStatus as BugReportClarificationStatus,
        summary: row.clarificationSummary,
        clarifiedAt: row.clarifiedAt?.toISOString() ?? null,
      },
      agentProgress: bugReportAgentProgress(progressSource),
      nextAction: bugReportNextAction(progressSource),
      sourcePath: row.sourcePath,
      timeline: {
        reportedAt: row.createdAt.toISOString(),
        approvedAt: row.approvedAt?.toISOString() ?? null,
        startedAt: row.startedAt?.toISOString() ?? null,
        fixedAt: row.resolvedAt?.toISOString() ?? null,
        closedAt: row.closedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      },
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function getAgentBugBundle(fastify: FastifyInstance, key: string): Promise<AgentBugBundle> {
  const id = parseBugReportKey(key);
  let report = await getBugReportDetail(fastify, id);
  if (!isAgentReadableBugStatus(report.status)) {
    throw new BugReportError('Ticket không còn trong phạm vi Agent được đọc.', 404, 'BUG_NOT_AGENT_READABLE');
  }
  if (report.clarification.status === 'PENDING_AGENT') {
    report = await updateAgentProgress(fastify, key, { stage: 'ANALYZING' }, { dedupeSameStage: true });
  }
  const similarResolutions = await findSimilarResolutions(fastify, report);
  return {
    report,
    markdown: renderAgentMarkdown(report, similarResolutions),
    attachments: report.attachments
      .filter((item) => !item.deletedAt)
      .map((item) => ({
        id: item.id,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
      })),
    similarResolutions,
  };
}
