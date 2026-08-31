'use client';

import { Typography } from 'antd';
import type {
  BugPriority,
  BugReportAgentProgress,
  BugReportAgentProgressStage,
  BugReportClarificationFilter,
  BugReportClarificationStatus,
  BugReportRequestType,
  BugReportStatus,
  BugReportSummary,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { StatusTag } from '../../../components/ui';

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
  READY_FOR_TRIAGE: 'Đã hiểu · chờ duyệt',
  QUEUED_FOR_FIX: 'Đã nhận · chờ sửa',
  IMPLEMENTING: 'Đang sửa',
  VERIFYING: 'Đang kiểm thử',
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
  READY_FOR_TRIAGE: 'gold',
  QUEUED_FOR_FIX: 'processing',
  IMPLEMENTING: 'cyan',
  VERIFYING: 'orange',
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

export function BugStatusTag({ status }: { status: BugReportStatus }) {
  return <StatusTag status={STATUS_TONES[status]} label={STATUS_LABELS[status]} />;
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
}: {
  status: BugReportClarificationStatus;
  showReady?: boolean;
}) {
  if (status === 'READY' && !showReady) return null;
  return <StatusTag status={CLARIFICATION_TONES[status]} label={CLARIFICATION_LABELS[status]} />;
}

export function AgentProgressTag({ progress }: { progress: BugReportAgentProgress }) {
  return <StatusTag status={AGENT_PROGRESS_TONES[progress.stage]} label={AGENT_PROGRESS_LABELS[progress.stage]} />;
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
