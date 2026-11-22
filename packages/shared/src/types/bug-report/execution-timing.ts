import type { BugReportRequestType, BugReportStatus } from './ticket-core.js';

export type InboxTimingBucket = 'AI_ACTIVE' | 'USER_DANNY_WAIT' | 'SYSTEM_WAIT';

export type InboxTimingPhase =
  | 'ANALYSIS_PLAN'
  | 'CODE_TEST'
  | 'RETRY_FIX'
  | 'DEPLOY'
  | 'POST_DEPLOY_VERIFICATION'
  | 'WAITING_REPORTER'
  | 'WAITING_DANNY'
  | 'SYSTEM_QUEUE'
  | 'BLOCKED';

export type InboxTimingOutcome =
  'COMPLETED' | 'FAILED' | 'CHANGES_REQUESTED' | 'RUNNING' | 'TRANSITIONED' | 'EXPIRED' | 'NO_DATA';

export type InboxTimingSource = 'JOB' | 'LEASE' | 'AUDIT' | 'RELEASE' | 'ESTIMATED';

export interface InboxExecutionInterval {
  id: string;
  bucket: InboxTimingBucket;
  phase: InboxTimingPhase;
  label: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  outcome: InboxTimingOutcome;
  source: InboxTimingSource;
  isEstimated: boolean;
  isOngoing: boolean;
}

export interface InboxTicketExecutionTiming {
  reportId: number;
  reportKey: string;
  requestType: BugReportRequestType;
  title: string;
  status: BugReportStatus;
  reportedAt: string;
  resolvedAt: string | null;
  totalAiActiveSeconds: number;
  totalUserDannyWaitSeconds: number;
  totalSystemWaitSeconds: number;
  endToEndSeconds: number;
  aiActiveByPhase: Partial<Record<InboxTimingPhase, number>>;
  intervals: InboxExecutionInterval[];
  hasIncompleteData: boolean;
}

export interface InboxExecutionPhaseMetric {
  phase: InboxTimingPhase;
  bucket: InboxTimingBucket;
  label: string;
  totalSeconds: number;
  count: number;
  medianSeconds: number;
  p95Seconds: number;
}

export interface InboxExecutionTopTicket {
  reportId: number;
  reportKey: string;
  title: string;
  requestType: BugReportRequestType;
  status: BugReportStatus;
  aiActiveSeconds: number;
  userDannyWaitSeconds: number;
  systemWaitSeconds: number;
  endToEndSeconds: number;
}

export interface InboxExecutionDashboardSummary {
  period: 'WEEK' | 'MONTH' | 'ALL';
  startDate: string;
  endDate: string;
  totalTickets: number;
  totalAiActiveSeconds: number;
  totalUserDannyWaitSeconds: number;
  totalSystemWaitSeconds: number;
  totalEndToEndSeconds: number;
  medianAiActiveSeconds: number;
  p95AiActiveSeconds: number;
  byRequestType: Record<
    BugReportRequestType,
    {
      ticketCount: number;
      totalAiSeconds: number;
      medianAiSeconds: number;
      p95AiSeconds: number;
    }
  >;
  byPhase: InboxExecutionPhaseMetric[];
  topTimeConsumingTickets: InboxExecutionTopTicket[];
}

export interface InboxExecutionDashboardQuery {
  period?: 'WEEK' | 'MONTH' | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  requestType?: BugReportRequestType | 'ALL';
}

export const INBOX_TIMING_BUCKET_LABELS: Record<InboxTimingBucket, string> = {
  AI_ACTIVE: 'Thời gian Agent xử lý',
  USER_DANNY_WAIT: 'Thời gian chờ Danny / Người báo',
  SYSTEM_WAIT: 'Thời gian hàng đợi hệ thống',
};

export const INBOX_TIMING_PHASE_LABELS: Record<InboxTimingPhase, string> = {
  ANALYSIS_PLAN: 'Phân tích & Lập kế hoạch',
  CODE_TEST: 'Code & Test',
  RETRY_FIX: 'Sửa lỗi & Retry',
  DEPLOY: 'Triển khai (Deploy)',
  POST_DEPLOY_VERIFICATION: 'Xác minh sau Deploy',
  WAITING_REPORTER: 'Chờ người báo phản hồi',
  WAITING_DANNY: 'Chờ Danny duyệt',
  SYSTEM_QUEUE: 'Hàng đợi hệ thống (Queue)',
  BLOCKED: 'Tạm dừng / Bị chặn',
};
