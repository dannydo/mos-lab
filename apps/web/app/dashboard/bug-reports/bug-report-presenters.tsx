'use client';

import { Typography } from 'antd';
import type {
  BugPriority,
  BugReportAgentProgress,
  BugReportAgentProgressStage,
  BugReportClarificationFilter,
  BugReportClarificationStatus,
  BugReportNextAction,
  BugReportNextActor,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { StatusTag } from '../../../components/ui';
import { shortBugReportReporterName } from '../../../components/bug-reports/bug-report-workflow';
export {
  BUG_REPORT_WORKFLOW_STEPS,
  effectiveBugReportAgentProgress,
  getBugReportWorkflowStage,
  type BugReportWorkflowStage,
} from '../../../components/bug-reports/bug-report-workflow';
export { shortBugReportReporterName };

export { BugReportAttachmentPreview as ProtectedAttachment } from '../../../components/bug-reports/BugReportAttachmentPreview';

const { Text } = Typography;

export const CLARIFICATION_FILTER_LABELS: Record<BugReportClarificationFilter, string> = {
  ALL: 'Mọi mức độ rõ',
  UNCLEAR: 'Chờ làm rõ',
  PENDING_AGENT: 'Agent cần làm rõ',
  WAITING_REPORTER: 'Chờ người báo',
  READY: 'Đã đủ rõ',
};

const CLARIFICATION_LABELS: Record<BugReportClarificationStatus, string> = {
  PENDING_AGENT: 'Agent cần làm rõ',
  WAITING_REPORTER: 'Chờ người báo',
  READY: 'Đã đủ rõ',
};

const CLARIFICATION_TONES: Record<BugReportClarificationStatus, Parameters<typeof StatusTag>[0]['status']> = {
  PENDING_AGENT: 'orange',
  WAITING_REPORTER: 'purple',
  READY: 'success',
};

export const AGENT_PROGRESS_LABELS: Record<BugReportAgentProgressStage, string> = {
  NOT_VIEWED: 'Agent chưa xem',
  ANALYZING: 'Đang phân tích',
  CHECKING_BUSINESS_LOGIC: 'Đối chiếu biz logic',
  WAITING_REPORTER: 'Chờ người báo',
  REPORTER_REPLIED: 'Người báo đã trả lời',
  REOPENED_BY_DANNY: 'Danny yêu cầu sửa thêm',
  REOPENED_BY_REPORTER: 'Agent tái phân tích reopen',
  READY_FOR_TRIAGE: 'Đã hiểu · chờ duyệt',
  AWAITING_DANNY_IMPLEMENTATION_APPROVAL: 'Chờ Danny duyệt code/test',
  QUEUED_FOR_FIX: 'Đã nhận · chờ sửa',
  QUEUED_FOR_COMMIT: 'Đã duyệt commit · chờ worker',
  IMPLEMENTING: 'Đang sửa',
  COMMITTING: 'Đang tạo commit',
  VERIFYING: 'Đang kiểm thử',
  AWAITING_DANNY_COMMIT_REVIEW: 'Chờ Danny duyệt commit',
  AWAITING_DANNY_DEPLOY_APPROVAL: 'Commit xong · chờ Danny xác nhận deploy',
  AWAITING_REPORTER_ACCEPTANCE: 'Chờ người báo nghiệm thu',
  IMPLEMENTATION_FAILED: 'Implementation cần Danny xử lý',
  AWAITING_REPORTER_REVIEW: 'Đã sửa · chờ xác nhận',
  COMPLETED: 'Hoàn tất',
  STOPPED: 'Dừng xử lý',
};

const AGENT_PROGRESS_TONES: Record<BugReportAgentProgressStage, Parameters<typeof StatusTag>[0]['status']> = {
  NOT_VIEWED: 'default',
  ANALYZING: 'processing',
  CHECKING_BUSINESS_LOGIC: 'orange',
  WAITING_REPORTER: 'purple',
  REPORTER_REPLIED: 'cyan',
  REOPENED_BY_DANNY: 'error',
  REOPENED_BY_REPORTER: 'error',
  READY_FOR_TRIAGE: 'gold',
  AWAITING_DANNY_IMPLEMENTATION_APPROVAL: 'gold',
  QUEUED_FOR_FIX: 'processing',
  QUEUED_FOR_COMMIT: 'processing',
  IMPLEMENTING: 'cyan',
  COMMITTING: 'cyan',
  VERIFYING: 'orange',
  AWAITING_DANNY_COMMIT_REVIEW: 'gold',
  AWAITING_DANNY_DEPLOY_APPROVAL: 'gold',
  AWAITING_REPORTER_ACCEPTANCE: 'success',
  IMPLEMENTATION_FAILED: 'error',
  AWAITING_REPORTER_REVIEW: 'success',
  COMPLETED: 'success',
  STOPPED: 'default',
};

export const STATUS_LABELS: Record<BugReportStatus, string> = {
  NEW: 'Mới',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang sửa',
  FIXED: 'Chờ người báo duyệt',
  CLOSED: 'Đã đóng',
  REJECTED: 'Từ chối',
  DUPLICATE: 'Trùng lặp',
};

const STATUS_TONES: Record<BugReportStatus, Parameters<typeof StatusTag>[0]['status']> = {
  NEW: 'warning',
  APPROVED: 'processing',
  IN_PROGRESS: 'cyan',
  FIXED: 'success',
  CLOSED: 'default',
  REJECTED: 'error',
  DUPLICATE: 'purple',
};

const PRIORITY_TONES: Record<BugPriority, Parameters<typeof StatusTag>[0]['status']> = {
  P0: 'error',
  P1: 'orange',
  P2: 'warning',
  P3: 'default',
};

export const TRANSITIONS: Record<BugReportStatus, BugReportStatus[]> = {
  NEW: ['NEW', 'APPROVED', 'REJECTED', 'DUPLICATE'],
  APPROVED: ['APPROVED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE'],
  IN_PROGRESS: ['IN_PROGRESS', 'APPROVED', 'FIXED'],
  FIXED: ['FIXED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'IN_PROGRESS'],
  REJECTED: ['REJECTED', 'NEW'],
  DUPLICATE: ['DUPLICATE', 'NEW'],
};

export function formatDate(value: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function formatElapsed(value: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

export function formatProgressUpdated(value: string): string {
  const elapsed = formatElapsed(value);
  return elapsed === 'vừa xong' ? 'Vừa cập nhật' : `Cập nhật ${elapsed} trước`;
}

export function durationBetween(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const minutes = Math.max(0, dayjs(end).diff(dayjs(start), 'minute'));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ ${minutes % 60} phút`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function parseDuplicateKey(value: string): number | null {
  const match = value
    .trim()
    .toUpperCase()
    .match(/^(?:MOS-(?:BUG|FEAT)-)?(\d+)$/);
  return match ? Number(match[1]) : null;
}

function reporterWaitingLabel(reporterName?: string | null): string {
  return `Chờ ${shortBugReportReporterName(reporterName) || 'người báo'}`;
}

function reporterActorLabel(reporterName?: string | null): string {
  return shortBugReportReporterName(reporterName) || NEXT_ACTOR_LABELS.REPORTER;
}

export function BugStatusTag({
  status,
  reporterName,
  agentProgress,
}: {
  status: BugReportStatus;
  reporterName?: string | null;
  agentProgress?: BugReportAgentProgressStage;
}) {
  const label =
    agentProgress === 'AWAITING_DANNY_COMMIT_REVIEW'
      ? 'Chờ Danny duyệt commit'
      : agentProgress === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL'
        ? 'Chờ Danny duyệt code/test'
        : agentProgress === 'IMPLEMENTATION_FAILED'
          ? 'Agent dừng an toàn'
          : agentProgress === 'QUEUED_FOR_FIX'
            ? 'Đã duyệt · chờ worker'
            : agentProgress === 'IMPLEMENTING' || agentProgress === 'VERIFYING'
              ? 'Đang code/test'
              : status === 'FIXED' && agentProgress === 'AWAITING_REPORTER_ACCEPTANCE'
                ? `${reporterWaitingLabel(reporterName)} nghiệm thu`
                : status === 'FIXED'
                  ? `${reporterWaitingLabel(reporterName)} duyệt`
                  : STATUS_LABELS[status];
  const tone =
    agentProgress === 'IMPLEMENTATION_FAILED'
      ? 'error'
      : agentProgress === 'AWAITING_DANNY_COMMIT_REVIEW'
        ? 'warning'
        : agentProgress === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL'
          ? 'warning'
          : agentProgress === 'IMPLEMENTING' || agentProgress === 'VERIFYING' || agentProgress === 'QUEUED_FOR_FIX'
            ? 'processing'
            : STATUS_TONES[status];
  return <StatusTag status={tone} label={label} />;
}

export function RequestTypeTag({ requestType }: { requestType: BugReportRequestType }) {
  return (
    <StatusTag
      status={requestType === 'FEATURE' ? 'purple' : 'orange'}
      label={requestType === 'FEATURE' ? 'Chức năng' : 'Báo lỗi'}
    />
  );
}

export function PriorityTag({ priority }: { priority: BugPriority | null }) {
  return priority ? (
    <StatusTag status={PRIORITY_TONES[priority]} label={priority} />
  ) : (
    <Text type="secondary">Chưa đặt</Text>
  );
}

export function ClarificationTag({
  status,
  showReady = false,
  reporterName,
}: {
  status: BugReportClarificationStatus;
  showReady?: boolean;
  reporterName?: string | null;
}) {
  if (status === 'READY' && !showReady) return null;
  return (
    <StatusTag
      status={CLARIFICATION_TONES[status]}
      label={status === 'WAITING_REPORTER' ? reporterWaitingLabel(reporterName) : CLARIFICATION_LABELS[status]}
    />
  );
}

export function AgentProgressTag({
  progress,
  reporterName,
}: {
  progress: BugReportAgentProgress;
  reporterName?: string | null;
}) {
  const reporterLabel = reporterActorLabel(reporterName);
  const label =
    progress.stage === 'WAITING_REPORTER'
      ? reporterWaitingLabel(reporterName)
      : progress.stage === 'REPORTER_REPLIED'
        ? `${reporterLabel} đã trả lời`
        : progress.stage === 'REOPENED_BY_REPORTER'
          ? `Agent tái phân tích yêu cầu từ ${reporterLabel}`
          : AGENT_PROGRESS_LABELS[progress.stage];
  return <StatusTag status={AGENT_PROGRESS_TONES[progress.stage]} label={label} />;
}

export const NEXT_ACTOR_LABELS: Record<BugReportNextActor, string> = {
  REPORTER: 'Người báo',
  DANNY: 'Danny',
  AGENT: 'AI Agent',
  NONE: 'Hoàn tất',
};

const NEXT_ACTOR_TONES: Record<BugReportNextActor, Parameters<typeof StatusTag>[0]['status']> = {
  REPORTER: 'purple',
  DANNY: 'gold',
  AGENT: 'cyan',
  NONE: 'default',
};

export function NextActionTag({ action, reporterName }: { action: BugReportNextAction; reporterName?: string | null }) {
  return (
    <StatusTag
      status={NEXT_ACTOR_TONES[action.actor]}
      label={
        action.actor === 'NONE'
          ? NEXT_ACTOR_LABELS.NONE
          : `${action.actor === 'REPORTER' ? reporterActorLabel(reporterName) : NEXT_ACTOR_LABELS[action.actor]} · ${action.label}`
      }
    />
  );
}

/** A reporter must act when the agent needs clarification or has a result ready for confirmation. */
export function needsReporterAttention(
  report: Pick<BugReportSummary, 'status' | 'clarification' | 'agentProgress'>
): boolean {
  return (
    report.status === 'FIXED' ||
    report.clarification.status === 'WAITING_REPORTER' ||
    report.agentProgress.stage === 'WAITING_REPORTER' ||
    report.agentProgress.stage === 'AWAITING_REPORTER_REVIEW'
  );
}
