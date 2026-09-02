import type { BugReportAgentProgressStage, BugReportSummary } from '@mos-lab/shared';

export const BUG_REPORT_WORKFLOW_STEPS = ['Tiếp nhận', 'Duyệt', 'Xử lý', 'Nghiệm thu', 'Hoàn tất'] as const;

export interface BugReportWorkflowStage {
  position: number | null;
  label: string;
  detail: string;
  tone: 'warning' | 'primary' | 'info' | 'success' | 'muted';
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
  REOPENED_BY_REPORTER: {
    position: 3,
    label: 'Đang sửa lại',
    detail: 'Quay lại chặng xử lý',
    tone: 'info',
  },
  READY_FOR_TRIAGE: {
    position: 2,
    label: 'Đủ rõ · chờ Danny duyệt',
    detail: 'Sẵn sàng quyết định',
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
 * Condenses the API-owned agent workflow into a five-stage visual route.
 * A stage indicates the current handoff, never an estimated completion percentage.
 */
export function getBugReportWorkflowStage(
  report: Pick<BugReportSummary, 'status' | 'agentProgress'>
): BugReportWorkflowStage {
  if (report.status === 'REJECTED') {
    return { position: null, label: 'Từ chối', detail: 'Ticket không triển khai', tone: 'muted' };
  }
  if (report.status === 'DUPLICATE') {
    return { position: null, label: 'Trùng lặp', detail: 'Theo dõi ticket gốc', tone: 'muted' };
  }
  return WORKFLOW_STAGE_BY_AGENT_PROGRESS[report.agentProgress.stage];
}
