import type { BugReportAgentProgress, BugReportAgentProgressStage, BugReportSummary } from '@mos-lab/shared';

export const BUG_REPORT_WORKFLOW_STEPS = ['Tiếp nhận', 'Duyệt', 'Xử lý', 'Nghiệm thu', 'Hoàn tất'] as const;

export interface BugReportWorkflowStage {
  position: number | null;
  label: string;
  detail: string;
  tone: 'warning' | 'primary' | 'info' | 'success' | 'muted';
}

export function shortBugReportReporterName(value?: string | null): string | null {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length ? parts.slice(-2).join(' ') : null;
}

const WORKFLOW_STAGE_BY_AGENT_PROGRESS: Record<BugReportAgentProgressStage, BugReportWorkflowStage> = {
  NOT_VIEWED: { position: 1, label: 'Mới tiếp nhận', detail: 'Chờ AI xem', tone: 'warning' },
  ANALYZING: { position: 1, label: 'Đang phân tích', detail: 'Đang làm rõ yêu cầu', tone: 'warning' },
  CHECKING_BUSINESS_LOGIC: {
    position: 1,
    label: 'Đối chiếu biz logic',
    detail: 'Đang xác minh quy tắc',
    tone: 'warning',
  },
  WAITING_REPORTER: {
    position: 1,
    label: 'Chờ người báo làm rõ',
    detail: 'Tạm dừng để chờ phản hồi',
    tone: 'warning',
  },
  REPORTER_REPLIED: {
    position: 1,
    label: 'Đã bổ sung thông tin',
    detail: 'AI đang kiểm tra lại',
    tone: 'primary',
  },
  REOPENED_BY_DANNY: {
    position: 1,
    label: 'Agent tái phân tích yêu cầu chỉnh',
    detail: 'Agent kiểm tra lại trước khi một plan mới có thể được Danny duyệt',
    tone: 'warning',
  },
  REOPENED_BY_REPORTER: {
    position: 1,
    label: 'Agent tái phân tích reopen',
    detail: 'Agent đang phân tích phản hồi; chưa có quyền sửa hoặc kiểm thử',
    tone: 'warning',
  },
  READY_FOR_TRIAGE: {
    position: 2,
    label: 'Đủ rõ · chờ Danny duyệt',
    detail: 'Sẵn sàng quyết định',
    tone: 'primary',
  },
  AWAITING_DANNY_IMPLEMENTATION_APPROVAL: {
    position: 2,
    label: 'Plan sẵn sàng · chờ Danny duyệt code/test',
    detail: 'Agent chưa được phép sửa hoặc kiểm thử',
    tone: 'primary',
  },
  QUEUED_FOR_FIX: {
    position: 3,
    label: 'Đã duyệt · chờ xử lý',
    detail: 'Sắp bắt đầu thực hiện',
    tone: 'info',
  },
  IMPLEMENTING: { position: 3, label: 'Đang xử lý', detail: 'Đang thực hiện thay đổi', tone: 'info' },
  VERIFYING: {
    position: 4,
    label: 'Đang kiểm thử',
    detail: 'Sắp gửi nghiệm thu',
    tone: 'success',
  },
  AWAITING_DANNY_COMMIT_REVIEW: {
    position: 3,
    label: 'Chờ Danny duyệt commit',
    detail: 'Code và kiểm thử đã dừng ở worktree review',
    tone: 'primary',
  },
  AWAITING_REPORTER_ACCEPTANCE: {
    position: 4,
    label: 'Chờ người báo nghiệm thu',
    detail: 'Bản deploy đang chờ người báo xác nhận',
    tone: 'success',
  },
  IMPLEMENTATION_FAILED: {
    position: 3,
    label: 'Implementation cần rà soát',
    detail: 'Worker đã dừng an toàn và giữ worktree',
    tone: 'warning',
  },
  AWAITING_REPORTER_REVIEW: {
    position: 4,
    label: 'Chờ người báo nghiệm thu',
    detail: 'Đã gửi kết quả cần xác nhận',
    tone: 'success',
  },
  COMPLETED: { position: 5, label: 'Hoàn tất', detail: 'Ticket đã đóng', tone: 'success' },
  STOPPED: { position: null, label: 'Dừng xử lý', detail: 'Ticket không tiếp tục triển khai', tone: 'muted' },
};

/**
 * The server owns the workflow snapshot.  This compatibility helper remains
 * so existing Inbox surfaces all read the same API field; it must never invent
 * a client-side transition from status or clarification fields.
 */
export function effectiveBugReportAgentProgress(
  report: Pick<BugReportSummary, 'status' | 'clarification' | 'agentProgress'>
): BugReportAgentProgress {
  return report.agentProgress;
}

/**
 * Condenses the API-owned agent workflow into a five-stage visual route.
 * A stage indicates the current handoff, never an estimated completion percentage.
 */
export function getBugReportWorkflowStage(
  report: Pick<BugReportSummary, 'status' | 'clarification' | 'agentProgress'> & {
    reporter?: Pick<BugReportSummary['reporter'], 'displayName'> | null;
  }
): BugReportWorkflowStage {
  if (report.status === 'REJECTED') {
    return { position: null, label: 'Từ chối', detail: 'Ticket không triển khai', tone: 'muted' };
  }
  if (report.status === 'DUPLICATE') {
    return { position: null, label: 'Trùng lặp', detail: 'Theo dõi ticket gốc', tone: 'muted' };
  }
  const agentProgress = effectiveBugReportAgentProgress(report);
  if (
    report.status === 'NEW' &&
    report.clarification.status === 'PENDING_AGENT' &&
    ['REOPENED_BY_DANNY', 'REOPENED_BY_REPORTER'].includes(agentProgress.stage)
  ) {
    return WORKFLOW_STAGE_BY_AGENT_PROGRESS[agentProgress.stage];
  }
  const workflow = WORKFLOW_STAGE_BY_AGENT_PROGRESS[agentProgress.stage];
  const reporterName = shortBugReportReporterName(report.reporter?.displayName);
  if (!reporterName) return workflow;
  if (agentProgress.stage === 'WAITING_REPORTER') {
    return { ...workflow, label: `Chờ ${reporterName} làm rõ` };
  }
  if (agentProgress.stage === 'AWAITING_REPORTER_REVIEW') {
    return { ...workflow, label: `Chờ ${reporterName} nghiệm thu` };
  }
  return workflow;
}
