import type { CrmBugReport } from '../../../generated/crm-client/index.js';
import {
  classifyDeploymentLane,
  getExecutionOwnerDisplayName,
  isAgExecutionOwner,
  isSupportedImplementationOwner,
  type BugReportAgentProgress,
  type BugReportAgentProgressStage,
  type BugReportAgentUpdateStage,
  type BugReportComment,
  type BugReportImplementationFailure,
  type BugReportImplementationState,
  type BugReportResolution,
  type InboxImplementationExecutionOwner,
} from '@mos-lab/shared';
import {
  canAuthorizeBuildLockRecoveryRetry,
  canAuthorizeQualityGateRecoveryRetry,
  canAuthorizeSchemaRecoveryRetry,
  canAuthorizeWorkerRecoveryRetry,
  canRetryInboxImplementation,
  extractModelTierFromLabel,
  normalizeInboxModelTier,
  stripModelTierMarker,
} from '../inbox-implementation.service.js';
import { clipped, safeJsonParse, type ReportWithRelations } from './bug-report-filters.js';

export function reporterDto(value: { id: number; displayName: string; role: string; avatarUrl: string | null }) {
  return { id: value.id, displayName: value.displayName, role: value.role, avatarUrl: value.avatarUrl };
}

export function attachmentDto(value: ReportWithRelations['attachments'][number]) {
  return {
    id: value.id,
    commentId: value.commentId,
    fileName: value.originalName,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    createdAt: value.createdAt.toISOString(),
    deletedAt: value.deletedAt?.toISOString() ?? null,
  };
}

export function commentDto(value: ReportWithRelations['comments'][number]): BugReportComment {
  const isAgent = value.authorType === 'AGENT';
  let agentModel: 'AG' | 'G2.5' | 'G2.0' | null = null;
  if (isAgent) {
    if (/agent-model:\s*G2\.0|AI Agent \(G2\.0\)|gemini-2\.0/i.test(value.body)) {
      agentModel = 'G2.0';
    } else if (/agent-model:\s*G2\.5|AI Agent \(G2\.5\)|gemini-2\.5/i.test(value.body)) {
      agentModel = 'G2.5';
    } else {
      agentModel = 'AG';
    }
  }
  return {
    id: value.id,
    kind: value.kind as BugReportComment['kind'],
    body: value.body,
    authorType: isAgent ? 'AGENT' : 'STAFF',
    agentModel,
    author: value.author ? reporterDto(value.author) : null,
    attachments: value.attachments.map(attachmentDto),
    createdAt: value.createdAt.toISOString(),
  };
}

export function resolutionDto(value: ReportWithRelations['resolution']): BugReportResolution | null {
  if (!value) return null;
  return {
    problemSummary: value.problemSummary,
    rootCause: value.rootCause,
    solutionSummary: value.solutionSummary,
    verificationSummary: value.verificationSummary,
    changedFiles: safeJsonParse<string[]>(value.changedFilesJson, []),
    commitSha: value.commitSha,
    releaseUrl: value.releaseUrl,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export type ImplementationProgressSnapshot = {
  id?: string;
  sourceVersion?: string;
  planVersion?: string;
  status: string;
  executionOwner?: string;
  ideTaskId?: string | null;
  ideTaskBoundAt?: Date | null;
  retrySequence?: number;
  executionPhase: string;
  progressLabel: string | null;
  lastProgressAt: Date | null;
  progressCount: number;
  checkpointCount: number;
  failureCode: string | null;
  testsJson?: string | null;
  changedFilesJson?: string | null;
  retainUntil: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
};

export type AgentProgressSource = Pick<
  CrmBugReport,
  | 'status'
  | 'clarificationStatus'
  | 'createdAt'
  | 'approvedAt'
  | 'implementationApprovedAt'
  | 'implementationActiveJobId'
  | 'startedAt'
  | 'resolvedAt'
  | 'closedAt'
  | 'updatedAt'
> & {
  audits: Array<{ action: string; note: string | null; createdAt: Date; afterJson?: string | null }>;
  implementation?: ImplementationProgressSnapshot | null;
};

export const AGENT_PROGRESS_AUDIT_PREFIX = 'AGENT_PROGRESS_';
export const AGENT_PROGRESS_DEFAULT_NOTES: Record<BugReportAgentUpdateStage, string> = {
  ANALYZING: 'Agent đã mở ticket và bắt đầu phân tích vấn đề.',
  CHECKING_BUSINESS_LOGIC: 'Agent đang đối chiếu business logic và kết quả đúng mong đợi.',
  IMPLEMENTING: 'Agent đã bắt đầu sửa lỗi.',
  VERIFYING: 'Agent đang kiểm thử bản sửa trước khi gửi người báo xác nhận.',
};
export const AGENT_FIXED_PROGRESS_NOTE = 'Agent đã hoàn tất bản sửa và gửi người báo xác nhận.';

export function latestAgentActivity(source: AgentProgressSource) {
  for (let index = source.audits.length - 1; index >= 0; index -= 1) {
    const audit = source.audits[index];
    if (
      audit &&
      (audit.action.startsWith(AGENT_PROGRESS_AUDIT_PREFIX) ||
        [
          'AGENT_ASKED_CLARIFICATION',
          'AGENT_CONFIRMED_CLARITY',
          'AGENT_IMPLEMENTATION_REVIEW_READY',
          'DANNY_CHANGES_REQUESTED',
          'DANNY_PLAN_CHANGES_REQUESTED',
          'AGENT_IMPLEMENTATION_FAILED',
          'AGENT_IMPLEMENTATION_RETRY_QUEUED',
          'AGENT_IMPLEMENTATION_RETRY_SCHEDULED',
          'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE',
          'IDE_RELEASE_RECORDED',
          'IDE_RELEASE_CHECKPOINT_RECORDED',
          'DIRECT_TECHNICAL_HOTFIX_RELEASE_RECORDED',
          'REPORTER_IMPLEMENTATION_ACCEPTED',
          'REPORTER_IMPLEMENTATION_REOPENED',
          'CLARIFICATION_ANSWERED',
          'REPORTER_REOPENED',
        ].includes(audit.action))
    ) {
      return audit;
    }
  }
  return null;
}

export function pendingReviewPlan(source: AgentProgressSource): Date | null {
  for (let index = source.audits.length - 1; index >= 0; index -= 1) {
    const audit = source.audits[index];
    if (audit.action === 'AGENT_PLAN_POSTED') return null;
    if (['DANNY_CHANGES_REQUESTED', 'DANNY_PLAN_CHANGES_REQUESTED'].includes(audit.action)) return audit.createdAt;
  }
  return null;
}

function progressResult(
  stage: BugReportAgentProgressStage,
  source: AgentProgressSource,
  audit: ReturnType<typeof latestAgentActivity>,
  fallbackAt: Date | null
): BugReportAgentProgress {
  return {
    stage,
    note: audit?.note ?? null,
    updatedAt: (audit?.createdAt ?? fallbackAt ?? source.updatedAt ?? source.createdAt).toISOString(),
  };
}

export function implementationStateDto(
  value: (ImplementationProgressSnapshot & { id?: string }) | null | undefined,
  audits: Array<{ action: string; afterJson: string | null }> = []
): BugReportImplementationState | null {
  if (!value) return null;
  const status = value.status as BugReportImplementationState['status'];
  let modelTier = extractModelTierFromLabel(value.progressLabel);
  if (!modelTier) {
    const approvalAudit = [...audits].reverse().find((audit) => audit.action === 'IMPLEMENTATION_APPROVED');
    const parsedAfter = safeJsonParse<{ modelTier?: unknown } | null>(approvalAudit?.afterJson ?? null, null);
    modelTier = normalizeInboxModelTier(parsedAfter?.modelTier);
  }
  return {
    status,
    executionOwner: isSupportedImplementationOwner(value.executionOwner)
      ? (value.executionOwner as InboxImplementationExecutionOwner)
      : undefined,
    ...(modelTier ? { modelTier } : {}),
    reviewCandidate:
      status === 'AWAITING_COMMIT_REVIEW' && value.id && value.sourceVersion && value.planVersion
        ? { jobId: value.id, sourceVersion: value.sourceVersion, planVersion: value.planVersion }
        : null,
    ideHandoff:
      isSupportedImplementationOwner(value.executionOwner) && value.id
        ? {
            reference: value.id,
            phase: value.executionPhase === 'QUEUED' ? 'IDE_HANDOFF_READY' : clipped(value.executionPhase, 32),
            taskId: clipped(value.ideTaskId, 160) || null,
          }
        : null,
    phase: clipped(value.executionPhase, 32) || 'QUEUED',
    progressLabel: stripModelTierMarker(clipped(value.progressLabel, 160)),
    lastProgressAt: value.lastProgressAt?.toISOString() ?? null,
    progressCount: value.progressCount,
    checkpointCount: value.checkpointCount,
    failureCode: clipped(value.failureCode, 100) || null,
    deploymentLane: implementationDeploymentLane(value),
    retrySequence: value.retrySequence ?? 0,
    canRetryImplementation: canRetryInboxImplementation({
      status: value.status,
      retrySequence: value.retrySequence ?? 0,
    }),
    canAuthorizeWorkerRecoveryRetry: canAuthorizeWorkerRecoveryRetry({
      ...value,
      retrySequence: value.retrySequence ?? -1,
    }),
    canAuthorizeSchemaRecoveryRetry: canAuthorizeSchemaRecoveryRetry(
      { ...value, id: value.id || '', retrySequence: value.retrySequence ?? -1 },
      [...audits].reverse().find((audit) => audit.action === 'WORKER_READONLY_DIAGNOSTIC_PASSED')
    ),
    canAuthorizeQualityGateRecoveryRetry: canAuthorizeQualityGateRecoveryRetry(
      {
        id: value.id || '',
        status: value.status,
        retrySequence: value.retrySequence ?? -1,
        failureCode: value.failureCode,
        testsJson: value.testsJson,
      },
      [...audits].reverse().find((audit) => audit.action === 'WORKER_VISUAL_QA_SELF_CHECK')
    ),
    canAuthorizeBuildLockRecoveryRetry: canAuthorizeBuildLockRecoveryRetry({
      ...value,
      retrySequence: value.retrySequence ?? -1,
    }),
    failure: implementationFailureDto(value),
    hasRetainedDraft: Boolean(value.retainUntil),
    startedAt: value.startedAt?.toISOString() ?? null,
    completedAt: value.completedAt?.toISOString() ?? null,
    updatedAt: value.updatedAt.toISOString(),
  };
}

function implementationDeploymentLane(value: ImplementationProgressSnapshot) {
  const changedFiles = safeJsonParse<string[]>(value.changedFilesJson ?? null, []);
  return changedFiles.length ? classifyDeploymentLane(changedFiles) : null;
}

function implementationFailureDto(value: ImplementationProgressSnapshot): BugReportImplementationFailure | null {
  if (!value.failureCode) return null;
  const tests = safeJsonParse<Array<Record<string, unknown>>>(value.testsJson ?? null, []);
  const failures = tests.filter((test) => test?.status === 'FAILED');
  const failed =
    [...failures].reverse().find((test) => clipped(test.failureCode, 80) !== 'ARCHIVE_FILENAME_ENCODING') ??
    failures[0];
  const command = clipped(failed?.command, 300) || null;
  const code = clipped(failed?.failureCode, 80) || null;
  const summary =
    clipped(failed?.failureSummary, 420) ||
    (command
      ? `Lệnh ${command} không đạt, nhưng worker chưa lưu tóm tắt lỗi an toàn.`
      : 'Worker dừng an toàn nhưng chưa lưu được điều kiện lỗi cụ thể.');
  return {
    command,
    code,
    summary,
    occurredAt: value.completedAt?.toISOString() ?? value.updatedAt.toISOString(),
  };
}

export function implementationFailureNote(value: ImplementationProgressSnapshot): string {
  const failure = implementationFailureDto(value);
  if (value.failureCode === 'QUALITY_GATE_FAILED') {
    return `Quality gate chưa đạt: ${failure?.summary ?? 'commit và deploy đã bị chặn.'}`;
  }
  if (value.failureCode === 'CODEX_EXEC_TIMEOUT') {
    return 'Codex vượt thời lượng chạy cho phép; worker đã dừng an toàn. Bản nháp được giữ, chưa commit hoặc deploy.';
  }
  if (value.failureCode === 'LEASE_EXPIRED') {
    return 'Lease worker đã hết hạn; worker đã dừng an toàn. Bản nháp được giữ để rà soát trước khi retry.';
  }
  if (value.failureCode === 'STALE_APPROVAL_OR_PLAN' || value.failureCode === 'STALE_BEFORE_RESULT') {
    return 'Yêu cầu hoặc phương án đã thay đổi trong lúc xử lý; kết quả cũ không được dùng.';
  }
  return 'Worker đã dừng an toàn. Danny có thể rà soát bản nháp và quyết định retry một lần khi cần.';
}

export function implementationProgressNote(value: ImplementationProgressSnapshot, fallback: string): string {
  const label = clipped(value.progressLabel, 160) || fallback;
  return value.executionPhase === 'NO_PROGRESS_WARNING'
    ? `${label} Chưa có bằng chứng mới trong 10 phút; worker vẫn theo dõi trước khi dừng an toàn.`
    : label;
}

function implementationStage(source: AgentProgressSource, fallbackAt: Date | null): BugReportAgentProgress | null {
  const implementation = source.implementation;
  if (!implementation || implementation.status === 'CHANGES_REQUESTED') return null;
  if (['FAILED', 'STALE', 'EXPIRED'].includes(implementation.status)) {
    return {
      stage: 'IMPLEMENTATION_FAILED',
      note: implementationFailureNote(implementation),
      updatedAt: implementation.updatedAt.toISOString(),
    };
  }
  if (implementation.status === 'AWAITING_COMMIT_REVIEW') {
    return {
      stage: 'AWAITING_DANNY_COMMIT_REVIEW',
      note: 'Code và kiểm thử đã dừng ở worktree review; chưa commit, push hoặc deploy.',
      updatedAt: implementation.updatedAt.toISOString(),
    };
  }
  if (implementation.status === 'AWAITING_DEPLOY_REVIEW') {
    if (implementation.executionPhase === 'DEPLOY_APPROVED') {
      return {
        stage: 'QUEUED_FOR_DEPLOY',
        note: 'Danny đã duyệt deploy; đang tự động merge main và triển khai production.',
        updatedAt: implementation.updatedAt.toISOString(),
      };
    }
    return {
      stage: 'AWAITING_DANNY_DEPLOY_APPROVAL',
      note: 'Commit đã được tạo trong branch riêng; chưa push, merge hoặc deploy.',
      updatedAt: implementation.updatedAt.toISOString(),
    };
  }
  if (implementation.status === 'PENDING' || implementation.status === 'LEASED') {
    const agOwned = isAgExecutionOwner(implementation.executionOwner);
    const ideOwned = implementation.executionOwner === 'IDE';
    const autoOwned = implementation.executionOwner === 'AUTO';
    const ownerLabel = getExecutionOwnerDisplayName(implementation.executionOwner);
    return {
      stage:
        implementation.executionPhase === 'DEPLOY_APPROVED'
          ? 'QUEUED_FOR_DEPLOY'
          : implementation.executionPhase === 'COMMIT_APPROVED'
            ? 'QUEUED_FOR_COMMIT'
            : 'QUEUED_FOR_FIX',
      note: agOwned
        ? `Handoff ${ownerLabel} ${implementation.id ?? 'đang chờ gán mã'} đã sẵn sàng; chỉ code/test theo scope đã duyệt.`
        : ideOwned
          ? `Handoff Codex IDE ${implementation.id ?? 'đang chờ gán mã'} đã sẵn sàng; chỉ code/test theo scope đã duyệt.`
          : autoOwned
            ? `Handoff ${ownerLabel} ${implementation.id ?? 'đang chờ gán mã'} đã sẵn sàng; chỉ code/test theo scope đã duyệt.`
            : implementation.executionPhase === 'DEPLOY_APPROVED'
              ? 'Danny đã duyệt deploy; worker Mac đang chờ nhận đúng commit đã duyệt.'
              : implementation.executionPhase === 'COMMIT_APPROVED'
                ? 'Danny đã duyệt commit; worker Mac đang chờ nhận đúng bản diff đã review.'
                : 'Job code/test đã được ghi nhận và đang chờ worker nhận.',
      updatedAt: implementation.updatedAt.toISOString(),
    };
  }
  if (implementation.status === 'RUNNING') {
    return {
      stage:
        implementation.executionPhase === 'DEPLOYING'
          ? 'DEPLOYING'
          : implementation.executionPhase === 'COMMITTING'
            ? 'COMMITTING'
            : implementation.executionPhase === 'VERIFYING'
              ? 'VERIFYING'
              : 'IMPLEMENTING',
      note: implementationProgressNote(
        implementation,
        implementation.executionPhase === 'DEPLOYING'
          ? 'Worker Mac đang merge commit đã duyệt và chạy pipeline production.'
          : implementation.executionPhase === 'COMMITTING'
            ? 'Worker Mac đang tạo commit từ bản diff đã review.'
            : implementation.executionPhase === 'VERIFYING'
              ? 'Agent đang kiểm thử thay đổi.'
              : 'Agent đang chạy code/test trong worktree riêng.'
      ),
      updatedAt: (implementation.lastProgressAt ?? implementation.updatedAt).toISOString(),
    };
  }
  return fallbackAt ? progressResult('IMPLEMENTING', source, null, fallbackAt) : null;
}

export function bugReportAgentProgress(source: AgentProgressSource): BugReportAgentProgress {
  const latest = latestAgentActivity(source);
  if (source.status === 'CLOSED') return progressResult('COMPLETED', source, null, source.closedAt);
  if (source.status === 'REJECTED' || source.status === 'DUPLICATE' || source.status === 'CANCELLED') {
    return progressResult('STOPPED', source, null, source.closedAt);
  }
  if (source.status === 'FIXED') {
    if (
      latest &&
      [
        'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE',
        'IDE_RELEASE_RECORDED',
        'IDE_RELEASE_CHECKPOINT_RECORDED',
        'DIRECT_TECHNICAL_HOTFIX_RELEASE_RECORDED',
      ].includes(latest.action)
    ) {
      return progressResult('AWAITING_REPORTER_ACCEPTANCE', source, latest, source.resolvedAt);
    }
    return {
      ...progressResult('AWAITING_REPORTER_REVIEW', source, null, source.resolvedAt),
      note: AGENT_FIXED_PROGRESS_NOTE,
    };
  }
  if (source.clarificationStatus === 'WAITING_REPORTER') {
    return progressResult('WAITING_REPORTER', source, latest, source.updatedAt);
  }
  if (source.clarificationStatus === 'PENDING_AGENT') {
    if (latest && ['DANNY_CHANGES_REQUESTED', 'DANNY_PLAN_CHANGES_REQUESTED'].includes(latest.action)) {
      return progressResult('ANALYZING', source, latest, source.updatedAt);
    }
    if (latest?.action === 'REPORTER_REOPENED') {
      return progressResult('REOPENED_BY_REPORTER', source, latest, source.updatedAt);
    }
    if (latest?.action === 'CLARIFICATION_ANSWERED') {
      return progressResult('REPORTER_REPLIED', source, latest, source.updatedAt);
    }
    if (latest?.action === 'AGENT_PROGRESS_CHECKING_BUSINESS_LOGIC') {
      return progressResult('CHECKING_BUSINESS_LOGIC', source, latest, source.updatedAt);
    }
    if (latest?.action === 'AGENT_PROGRESS_ANALYZING') {
      return progressResult('ANALYZING', source, latest, source.updatedAt);
    }
    return progressResult('NOT_VIEWED', source, null, source.createdAt);
  }
  if (source.status === 'NEW') return progressResult('READY_FOR_TRIAGE', source, latest, source.updatedAt);
  const durableImplementationStage = implementationStage(source, source.startedAt);
  if (durableImplementationStage) return durableImplementationStage;
  if (latest?.action === 'AGENT_IMPLEMENTATION_FAILED') {
    return progressResult('IMPLEMENTATION_FAILED', source, latest, source.updatedAt);
  }
  if (source.status === 'APPROVED') {
    const replanAt = pendingReviewPlan(source);
    if (replanAt) {
      return {
        stage: 'CHECKING_BUSINESS_LOGIC',
        note: 'Agent đang lập plan mới theo yêu cầu sửa lại. Chưa mở duyệt code/test.',
        updatedAt: replanAt.toISOString(),
      };
    }
    if (source.implementationApprovedAt || source.implementationActiveJobId) {
      return {
        stage: 'QUEUED_FOR_FIX',
        note: 'Danny đã duyệt code/test; đang chờ worker/IDE nhận việc.',
        updatedAt: (source.implementationApprovedAt ?? source.updatedAt).toISOString(),
      };
    }
    return progressResult('AWAITING_DANNY_IMPLEMENTATION_APPROVAL', source, latest, source.approvedAt);
  }
  if (source.status === 'IN_PROGRESS') {
    if (latest?.action === 'REPORTER_IMPLEMENTATION_REOPENED' || latest?.action === 'REPORTER_REOPENED') {
      return progressResult('REOPENED_BY_REPORTER', source, latest, source.updatedAt);
    }
    const stage =
      latest?.action === 'AGENT_IMPLEMENTATION_REVIEW_READY'
        ? 'AWAITING_DANNY_COMMIT_REVIEW'
        : latest?.action === 'AGENT_IMPLEMENTATION_FAILED'
          ? 'IMPLEMENTATION_FAILED'
          : latest?.action === 'AGENT_PROGRESS_VERIFYING'
            ? 'VERIFYING'
            : 'IMPLEMENTING';
    return progressResult(stage, source, latest, source.startedAt);
  }
  return progressResult('NOT_VIEWED', source, latest, source.createdAt);
}

export function latestAuditAt(source: AgentProgressSource, actions: readonly string[]): Date | null {
  for (let index = source.audits.length - 1; index >= 0; index -= 1) {
    const audit = source.audits[index];
    if (audit && actions.includes(audit.action)) return audit.createdAt;
  }
  return null;
}
