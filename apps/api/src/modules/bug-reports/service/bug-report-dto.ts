import {
  formatBugReportKey,
  type BugPriority,
  type BugReportClarificationStatus,
  type BugReportDetail,
  type BugReportNotification,
  type BugReportRequestType,
  type BugReportStatus,
  type BugReportSummary,
  type MyBugReportItem,
} from '@mos-lab/shared';
import { calculateTicketExecutionTiming } from '../inbox-execution-time.service.js';
import { inboxPlanReviewCandidate } from '../inbox-implementation.service.js';
import {
  expertDetailsDto,
  featureRequestDto,
  safeJsonParse,
  sanitizeBugReportContext,
  storedRequestType,
  type ListReportWithRelations,
  type MyReportWithRelations,
  type ReportWithRelations,
} from './bug-report-filters.js';
import { bugReportReporterExperience, bugReportWorkflowProjection } from './bug-report-next-action.js';
import {
  attachmentDto,
  commentDto,
  implementationStateDto,
  reporterDto,
  resolutionDto,
} from './bug-report-progress.js';

export function summaryDto(
  row: ReportWithRelations | MyReportWithRelations | ListReportWithRelations
): BugReportSummary {
  const context = sanitizeBugReportContext(safeJsonParse<unknown>(row.contextJson, {}));
  const requestType = storedRequestType(row.requestType);
  const currentImplementation =
    row.inboxImplementationJobs[0]?.status === 'CHANGES_REQUESTED' ? null : row.inboxImplementationJobs[0];
  const implementation = implementationStateDto(currentImplementation, row.audits);
  const progressSource = { ...row, implementation: currentImplementation ?? null };
  const workflow = bugReportWorkflowProjection(progressSource);
  const reporterExperience = bugReportReporterExperience({
    status: row.status as BugReportStatus,
    clarificationStatus: row.clarificationStatus as BugReportClarificationStatus,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    startedAt: row.startedAt,
    resolvedAt: row.resolvedAt,
    closedAt: row.closedAt,
    updatedAt: row.updatedAt,
  });
  const reopened = [...row.audits]
    .reverse()
    .find((audit) => audit.action === 'REPORTER_REOPENED' && Boolean(audit.note?.trim()));
  return {
    id: row.id,
    planReview: inboxPlanReviewCandidate({
      ...row,
      inboxPlanJobs: row.inboxPlanJobs ?? [],
      comments: row.comments
        .filter((comment) => comment.authorType === 'STAFF')
        .reverse()
        .slice(0, 8),
    }),
    key: formatBugReportKey(row.id, requestType),
    requestType,
    featureRequest: featureRequestDto(row),
    expertDetails: expertDetailsDto(row),
    title: row.title,
    description: row.description,
    status: row.status as BugReportStatus,
    priority: row.priority as BugPriority | null,
    triageNote: row.triageNote,
    sourcePath: row.sourcePath,
    overlay: context.overlays[0] || null,
    attachmentCount: row.attachments.filter((attachment) => !attachment.deletedAt).length,
    commentCount: row.comments.length,
    clarification: {
      status: row.clarificationStatus as BugReportClarificationStatus,
      summary: row.clarificationSummary,
      clarifiedAt: row.clarifiedAt?.toISOString() ?? null,
    },
    reopen: reopened
      ? {
          auditId: reopened.id,
          reason: reopened.note!.trim(),
          reopenedAt: reopened.createdAt.toISOString(),
          intent:
            safeJsonParse<Record<string, unknown>>(reopened.afterJson, {}).reopenIntent === 'UNCHANGED'
              ? 'UNCHANGED'
              : 'DETAILS',
          originalEvidence: row.attachments
            .filter((attachment) => attachment.commentId === null && !attachment.deletedAt)
            .slice(0, 3)
            .map((attachment) => ({
              id: attachment.id,
              fileName: attachment.originalName,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
            })),
          knownContext: {
            sourcePath: row.sourcePath,
            browser: context.userAgent,
            viewport: context.viewport,
            themeMode: context.themeMode,
            priorResolution: row.resolution
              ? {
                  solutionSummary: row.resolution.solutionSummary,
                  verificationSummary: row.resolution.verificationSummary,
                }
              : null,
          },
        }
      : null,
    agentProgress: workflow.agentProgress,
    implementation,
    nextAction: workflow.nextAction,
    reporterExperience,
    reporter: reporterDto(row.reporter),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    timeline: {
      reportedAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      fixedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function detailDto(row: ReportWithRelations): BugReportDetail {
  return {
    ...summaryDto(row),
    businessContext: row.businessContext,
    triageNote: row.triageNote,
    duplicateOfId: row.duplicateOfId,
    duplicateOfKey: row.duplicateOfId
      ? formatBugReportKey(row.duplicateOfId, storedRequestType(row.duplicateOf?.requestType))
      : null,
    approvedBy: row.approver ? reporterDto(row.approver) : null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    context: sanitizeBugReportContext(safeJsonParse<unknown>(row.contextJson, {})),
    resolution: resolutionDto(row.resolution),
    attachments: row.attachments.map(attachmentDto),
    comments: row.comments.map(commentDto),
    audits: row.audits.map((audit) => ({
      id: audit.id,
      action: audit.action,
      actor: audit.actor ? reporterDto(audit.actor) : null,
      note: audit.note,
      before: safeJsonParse<Record<string, unknown> | null>(audit.beforeJson, null),
      after: safeJsonParse<Record<string, unknown> | null>(audit.afterJson, null),
      createdAt: audit.createdAt.toISOString(),
    })),
    executionTiming: calculateTicketExecutionTiming(row),
  };
}

export function reviewUrl(reportId: number, requestType: BugReportRequestType): string {
  return `/dashboard?bugReview=${encodeURIComponent(formatBugReportKey(reportId, requestType))}`;
}

export function myReportDto(row: MyReportWithRelations | ReportWithRelations): MyBugReportItem {
  return {
    ...summaryDto(row),
    resolution: resolutionDto(row.resolution),
    evidenceAttachments: row.attachments
      .filter((attachment) => !attachment.deletedAt && attachment.mimeType.startsWith('image/'))
      .map(attachmentDto),
    comments: row.comments.map(commentDto),
    reviewUrl: reviewUrl(row.id, storedRequestType(row.requestType)),
    canReview: row.status === 'FIXED',
    canReopenUnchanged:
      row.status === 'FIXED' ||
      (row.status === 'NEW' &&
        row.clarificationStatus === 'WAITING_REPORTER' &&
        row.audits.some((audit) => audit.action === 'REPORTER_REOPENED' && Boolean(audit.note?.trim()))),
    canCancel: !['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(row.status),
  };
}

export function notificationDto(value: {
  id: number;
  reportId: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string;
  readAt: Date | null;
  createdAt: Date;
}): BugReportNotification {
  const notificationType: BugReportNotification['type'] =
    value.type === 'FEATURE_CLARIFICATION_NEEDED'
      ? 'FEATURE_CLARIFICATION_NEEDED'
      : value.type === 'FEATURE_IMPLEMENTED_REVIEW'
        ? 'FEATURE_IMPLEMENTED_REVIEW'
        : value.type === 'BUG_CLARIFICATION_NEEDED'
          ? 'BUG_CLARIFICATION_NEEDED'
          : 'BUG_FIXED_REVIEW';
  const requestType: BugReportRequestType = notificationType.startsWith('FEATURE_') ? 'FEATURE' : 'BUG';
  return {
    id: value.id,
    reportId: value.reportId,
    reportKey: formatBugReportKey(value.reportId, requestType),
    type: notificationType,
    title: value.title,
    message: value.message,
    actionUrl: value.actionUrl,
    readAt: value.readAt?.toISOString() ?? null,
    createdAt: value.createdAt.toISOString(),
  };
}
