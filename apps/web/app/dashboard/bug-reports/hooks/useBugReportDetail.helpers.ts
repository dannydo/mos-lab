import type { BugReportDetail, BugReportSummary, InboxImplementationExecutionOwner } from '@mos-lab/shared';

export function summaryToInitialDetail(summary: BugReportSummary): BugReportDetail {
  return {
    ...summary,
    businessContext: null,
    triageNote: summary.triageNote ?? null,
    duplicateOfId: null,
    duplicateOfKey: null,
    approvedBy: null,
    resolvedAt: null,
    closedAt: null,
    context: {
      capturedAt: summary.createdAt,
      path: summary.sourcePath,
      query: {},
      pageTitle: summary.title,
      overlays: summary.overlay ? [summary.overlay] : [],
      themeMode: 'unknown',
      viewport: { width: 1440, height: 900, devicePixelRatio: 1 },
      userAgent: '',
      online: true,
      timeZone: 'Asia/Ho_Chi_Minh',
      webCommit: null,
      apiCommit: null,
      apiDeployedAt: null,
      recentApiFailures: [],
      recentClientErrors: [],
      errorBoundary: null,
    },
    resolution: null,
    attachments: [],
    comments: [],
    audits: [],
    executionTiming: null,
  };
}

export function extractDetailErrorMessage(error: unknown, fallback: string): string {
  const responseMessage =
    error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;
  return responseMessage || (error instanceof Error ? error.message : fallback);
}

export function applyOptimisticApprovalStage(
  report: BugReportDetail,
  flags: { commitApprovalReceived: boolean; deployApprovalReceived: boolean }
): BugReportDetail {
  if (flags.deployApprovalReceived && report.agentProgress.stage === 'AWAITING_DANNY_DEPLOY_APPROVAL') {
    return {
      ...report,
      agentProgress: {
        ...report.agentProgress,
        stage: 'QUEUED_FOR_DEPLOY' as const,
        note: 'Danny đã duyệt deploy; đang tự động merge main và triển khai production.',
      },
    };
  }
  if (flags.commitApprovalReceived && report.agentProgress.stage === 'AWAITING_DANNY_COMMIT_REVIEW') {
    return {
      ...report,
      agentProgress: {
        ...report.agentProgress,
        stage: 'QUEUED_FOR_COMMIT' as const,
        note: 'Danny đã duyệt commit; worker Mac đang chờ nhận đúng bản diff đã review.',
      },
    };
  }
  return report;
}

export function buildApprovalQueuedNote(executionOwner?: InboxImplementationExecutionOwner): string {
  if (executionOwner === 'AG_WIN') return 'Đã duyệt cho Win AG; đang xếp hàng handoff.';
  if (executionOwner === 'AG_MAC') return 'Đã duyệt cho Mac AG; đang xếp hàng handoff.';
  if (executionOwner === 'AG') return 'Đã duyệt cho Antigravity (AG); đang xếp hàng handoff.';
  return 'Đã duyệt code/test; đang xếp hàng cho Win AG (tự tràn sang Mac AG nếu đầy slot).';
}

export function buildApprovalSuccessMessage(
  outcome: { implementationQueued?: boolean; planRequested?: boolean },
  executionOwner?: InboxImplementationExecutionOwner
): string {
  if (outcome.implementationQueued) {
    if (executionOwner === 'AG_WIN') return 'Đã tạo job code/test cho Win AG.';
    if (executionOwner === 'AG_MAC') return 'Đã tạo job code/test cho Mac AG.';
    if (executionOwner === 'AG') return 'Đã tạo job code/test cho Antigravity (AG).';
    return 'Đã tạo job code/test trong worktree riêng.';
  }
  if (outcome.planRequested) {
    return 'Đã lưu duyệt; worker đang làm mới plan native trước khi chạy code.';
  }
  return 'Đã lưu duyệt implementation.';
}
