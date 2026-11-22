import type { FastifyInstance } from 'fastify';
import {
  BUG_REPORT_STATUSES,
  type BugPriority,
  type BugReportClarificationStatus,
  type BugReportDetail,
  type BugReportStatus,
  type CancelBugReportRequest,
  type ConfirmCloseBugReportRequest,
  type ReviewBugReportRequest,
  type TriageBugReportRequest,
} from '@mos-lab/shared';
import { getBugReportDetail } from './bug-report-crud.js';
import {
  BugReportError,
  PRIORITY_SORT,
  STATUS_SORT,
  clipped,
  normalizedAttachments,
  saveAttachments,
  serialize,
} from './bug-report-filters.js';
import { assertBugReportTransition, stateSnapshot } from './bug-report-transitions.js';

export async function reviewBugReport(
  fastify: FastifyInstance,
  reporterStaffId: number,
  id: number,
  input: ReviewBugReportRequest
): Promise<BugReportDetail> {
  const existing = await fastify.prisma.crm.crmBugReport.findFirst({ where: { id, reporterStaffId } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket của bạn.', 404, 'BUG_NOT_FOUND');
  const decision = input?.decision;
  if (decision !== 'APPROVE' && decision !== 'REOPEN') throw new BugReportError('Quyết định duyệt không hợp lệ.');
  const attachments = normalizedAttachments(input?.attachments);
  const reopenUnchanged = decision === 'REOPEN' && input?.reopenIntent === 'UNCHANGED';
  const couldResumeKnownReopen =
    reopenUnchanged && existing.status === 'NEW' && existing.clarificationStatus === 'WAITING_REPORTER';
  const previousReopen = couldResumeKnownReopen
    ? await fastify.prisma.crm.crmBugReportAudit.findFirst({
        where: { reportId: id, action: 'REPORTER_REOPENED', note: { not: null } },
        select: { id: true },
      })
    : null;
  const canResumeKnownReopen = Boolean(previousReopen);
  if (existing.status !== 'FIXED' && !canResumeKnownReopen) {
    throw new BugReportError('Chỉ bản sửa đang chờ xác nhận mới có thể duyệt.', 409, 'BUG_NOT_AWAITING_REVIEW');
  }
  const pendingReporterAcceptance = await fastify.prisma.crm.crmInboxImplementationJob.findFirst({
    where: { reportId: id, status: 'RELEASED', executionPhase: 'AWAITING_REPORTER_ACCEPTANCE' },
    select: { id: true },
  });
  const note = reopenUnchanged
    ? 'Vẫn chưa được giải quyết; biểu hiện vẫn giống bằng chứng ban đầu.'
    : clipped(input?.note, 2000) || null;
  if (decision === 'REOPEN' && !note && !attachments.length) {
    throw new BugReportError('Vui lòng mô tả điểm vẫn chưa đúng hoặc đính kèm ảnh để Agent sửa tiếp.');
  }
  const effectiveNote = note ?? (attachments.length ? `Đính kèm ${attachments.length} ảnh phản hồi chưa đúng.` : null);
  const now = new Date();
  const nextStatus: BugReportStatus = decision === 'APPROVE' ? 'CLOSED' : 'NEW';
  const completed = await fastify.prisma.crm.$transaction(async (tx) => {
    let commentId: number | undefined;
    if (decision === 'REOPEN') {
      const comment = await tx.crmBugReportComment.create({
        data: {
          reportId: id,
          authorStaffId: reporterStaffId,
          authorType: 'STAFF',
          kind: 'COMMENT',
          body: effectiveNote || 'Người báo từ chối nghiệm thu và gửi hình ảnh phản hồi.',
        },
      });
      commentId = comment.id;
    }

    const row = await tx.crmBugReport.update({
      where: { id },
      data: {
        status: nextStatus,
        statusSort: STATUS_SORT[nextStatus],
        priority: decision === 'REOPEN' ? null : existing.priority,
        prioritySort:
          decision === 'REOPEN' ? 4 : existing.priority ? PRIORITY_SORT[existing.priority as BugPriority] : 4,
        approvedByStaffId: decision === 'REOPEN' ? null : existing.approvedByStaffId,
        approvedAt: decision === 'REOPEN' ? null : existing.approvedAt,
        implementationApprovedByStaffId: decision === 'REOPEN' ? null : existing.implementationApprovedByStaffId,
        implementationApprovedAt: decision === 'REOPEN' ? null : existing.implementationApprovedAt,
        implementationApprovalSourceVersion:
          decision === 'REOPEN' ? null : existing.implementationApprovalSourceVersion,
        implementationActiveJobId: decision === 'REOPEN' ? null : existing.implementationActiveJobId,
        startedAt: decision === 'APPROVE' ? (existing.startedAt ?? now) : null,
        resolvedAt: decision === 'APPROVE' ? existing.resolvedAt : null,
        closedAt: decision === 'APPROVE' ? now : null,
        triageNote: effectiveNote ?? existing.triageNote,
        clarificationStatus: decision === 'REOPEN' ? 'PENDING_AGENT' : existing.clarificationStatus,
        clarificationSummary: decision === 'REOPEN' ? null : existing.clarificationSummary,
        clarifiedAt: decision === 'REOPEN' ? null : existing.clarifiedAt,
      },
    });
    if (pendingReporterAcceptance) {
      await tx.crmInboxImplementationJob.updateMany({
        where: {
          id: pendingReporterAcceptance.id,
          status: 'RELEASED',
          executionPhase: 'AWAITING_REPORTER_ACCEPTANCE',
        },
        data: { executionPhase: decision === 'APPROVE' ? 'ACCEPTED' : 'REOPENED_BY_REPORTER' },
      });
    }
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId: reporterStaffId,
        action: decision === 'APPROVE' ? 'REPORTER_APPROVED' : 'REPORTER_REOPENED',
        note: effectiveNote ?? 'Người báo xác nhận bản sửa đúng.',
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(
          decision === 'REOPEN'
            ? { ...stateSnapshot(row), reopenIntent: reopenUnchanged ? 'UNCHANGED' : 'DETAILS' }
            : stateSnapshot(row)
        ),
      },
    });
    await tx.crmBugReportNotification.updateMany({
      where: { reportId: id, recipientStaffId: reporterStaffId, readAt: null },
      data: { readAt: now },
    });
    return { row, commentId };
  });

  if (decision === 'REOPEN' && attachments.length) {
    await saveAttachments(fastify, id, attachments, completed.commentId);
  }
  fastify.cache?.invalidatePattern('^bug-reports:mine:');
  return getBugReportDetail(fastify, completed.row.id);
}

export async function cancelBugReport(
  fastify: FastifyInstance,
  actorStaffId: number,
  id: number,
  canOverride: boolean,
  input?: CancelBugReportRequest
): Promise<BugReportDetail> {
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({
    where: { id },
    include: { audits: true },
  });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (existing.reporterStaffId !== actorStaffId && !canOverride) {
    throw new BugReportError('Chỉ người báo hoặc quản trị viên mới có thể huỷ yêu cầu này.', 403, 'FORBIDDEN');
  }
  if (['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(existing.status)) {
    throw new BugReportError('Yêu cầu này đã kết thúc, không thể huỷ.', 409, 'BUG_ALREADY_SETTLED');
  }

  const reason = clipped(input?.reason, 2000) || null;
  const now = new Date();
  const cancelNote = reason ? `[Đã huỷ]: ${reason}` : '[Đã huỷ]';
  const effectiveTriageNote = existing.triageNote ? `${existing.triageNote}\n${cancelNote}` : cancelNote;

  const completed = await fastify.prisma.crm.$transaction(async (tx) => {
    const row = await tx.crmBugReport.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusSort: STATUS_SORT.CANCELLED,
        closedAt: now,
        triageNote: effectiveTriageNote,
      },
    });

    await tx.crmInboxImplementationJob.updateMany({
      where: {
        reportId: id,
        status: { in: ['PENDING', 'LEASED', 'RUNNING', 'AWAITING_COMMIT_REVIEW', 'AWAITING_DEPLOY_REVIEW'] },
      },
      data: {
        status: 'FAILED',
        executionPhase: 'IDE_HANDOFF_CANCELLED',
        failureCode: 'IDE_HANDOFF_CANCELLED',
        summary: reason ? `Người báo đã huỷ yêu cầu: ${reason}` : 'Người báo đã huỷ yêu cầu.',
        completedAt: now,
      },
    });

    const commentBody = reason
      ? `Người báo đã huỷ yêu cầu này: ${reason}`
      : 'Người báo đã huỷ yêu cầu này vì thông tin báo lên chưa đúng hoặc không còn cần thiết.';
    await tx.crmBugReportComment.create({
      data: {
        reportId: id,
        authorStaffId: actorStaffId,
        authorType: 'STAFF',
        kind: 'COMMENT',
        body: commentBody,
      },
    });

    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId,
        action: 'REPORTER_CANCELLED',
        note: reason ?? 'Người báo đã huỷ yêu cầu.',
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(row)),
      },
    });

    await tx.crmBugReportNotification.updateMany({
      where: { reportId: id, readAt: null },
      data: { readAt: now },
    });

    return row;
  });

  fastify.cache?.invalidatePattern('^bug-reports:mine:');
  fastify.cache?.invalidatePattern('^bug-reports:');

  return getBugReportDetail(fastify, completed.id);
}

export async function triageBugReport(
  fastify: FastifyInstance,
  actorStaffId: number,
  id: number,
  input: TriageBugReportRequest
) {
  const status = input?.status;
  if (!BUG_REPORT_STATUSES.includes(status)) throw new BugReportError('Trạng thái ticket không hợp lệ.');
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  const previousStatus = existing.status as BugReportStatus;
  const priority = input.priority === undefined ? (existing.priority as BugPriority | null) : input.priority;
  const note = input.note === undefined ? existing.triageNote : clipped(input.note, 2000) || null;
  const businessContext =
    input.businessContext === undefined ? existing.businessContext : clipped(input.businessContext, 4000) || null;
  const clarificationStatus =
    status === 'APPROVED' &&
    existing.requestType !== 'FEATURE' &&
    existing.clarificationStatus !== 'READY' &&
    (businessContext?.length || 0) >= 10
      ? 'READY'
      : (existing.clarificationStatus as BugReportClarificationStatus);
  let duplicateOfId = input.duplicateOfId === undefined ? existing.duplicateOfId : input.duplicateOfId;
  assertBugReportTransition({
    reportId: id,
    previousStatus,
    status,
    priority,
    note,
    duplicateOfId,
    clarificationStatus,
  });
  if (status === 'DUPLICATE') {
    const duplicateTarget = await fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: duplicateOfId as number },
    });
    if (!duplicateTarget) throw new BugReportError('Không tìm thấy ticket gốc.', 404);
  } else if (status === 'NEW') {
    duplicateOfId = null;
  }

  const now = new Date();
  const updated = await fastify.prisma.crm.$transaction(async (tx) => {
    const row = await tx.crmBugReport.update({
      where: { id },
      data: {
        status,
        priority,
        statusSort: STATUS_SORT[status],
        prioritySort: priority ? PRIORITY_SORT[priority] : 4,
        businessContext,
        triageNote: note,
        clarificationStatus,
        clarificationSummary:
          clarificationStatus === 'READY' && existing.clarificationStatus !== 'READY'
            ? businessContext
            : existing.clarificationSummary,
        clarifiedAt:
          clarificationStatus === 'READY' && existing.clarificationStatus !== 'READY' ? now : existing.clarifiedAt,
        duplicateOfId: status === 'DUPLICATE' ? duplicateOfId : status === 'NEW' ? null : existing.duplicateOfId,
        approvedByStaffId:
          status === 'APPROVED' && !existing.approvedByStaffId ? actorStaffId : existing.approvedByStaffId,
        approvedAt: status === 'APPROVED' && !existing.approvedAt ? now : existing.approvedAt,
        startedAt:
          status === 'IN_PROGRESS' ? (existing.startedAt ?? now) : status === 'NEW' ? null : existing.startedAt,
        resolvedAt: status === 'FIXED' ? now : status === 'IN_PROGRESS' ? null : existing.resolvedAt,
        closedAt: ['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(status)
          ? now
          : status === 'NEW' || status === 'IN_PROGRESS'
            ? null
            : existing.closedAt,
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId,
        action: previousStatus === status ? 'UPDATED' : `STATUS_${status}`,
        note,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(row)),
      },
    });
    return row;
  });
  return getBugReportDetail(fastify, updated.id);
}

export async function confirmCloseBugReport(
  fastify: FastifyInstance,
  actorStaffId: number,
  id: number,
  input: ConfirmCloseBugReportRequest
) {
  const existing = await fastify.prisma.crm.crmBugReport.findUnique({ where: { id } });
  if (!existing) throw new BugReportError('Không tìm thấy ticket.', 404, 'BUG_NOT_FOUND');
  if (!['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(existing.status)) {
    throw new BugReportError('Chỉ ticket đã duyệt, đang xử lý hoặc chờ nghiệm thu mới được đóng ngoại lệ.', 409);
  }
  const note = clipped(input?.note, 2000);
  if (note.length < 10) {
    throw new BugReportError('Đóng ngoại lệ cần ghi rõ bằng chứng hoặc lý do với ít nhất 10 ký tự.');
  }
  const businessContext =
    input?.businessContext === undefined ? existing.businessContext : clipped(input.businessContext, 4000) || null;
  const now = new Date();

  const completed = await fastify.prisma.crm.$transaction(async (tx) => {
    const current = await tx.crmBugReport.update({
      where: { id },
      data: {
        status: 'CLOSED',
        statusSort: STATUS_SORT.CLOSED,
        businessContext,
        triageNote: note,
        closedAt: now,
      },
    });
    await tx.crmBugReportAudit.create({
      data: {
        reportId: id,
        actorStaffId,
        action: 'ADMIN_OVERRIDE_CLOSED',
        note,
        beforeJson: serialize(stateSnapshot(existing)),
        afterJson: serialize(stateSnapshot(current)),
      },
    });
    await tx.crmBugReportNotification.updateMany({
      where: { reportId: id, readAt: null },
      data: { readAt: now },
    });
    return current;
  });
  return getBugReportDetail(fastify, completed.id);
}
