import dayjs, { type Dayjs } from 'dayjs';
import type { OmiCallConfigPayload, Staff } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type OmicallTabKey = 'logs' | 'configs';
export type OmicallDateMode = 'day' | 'range';

export type OmicallStaffSummary = Pick<Staff, 'id' | 'displayName'>;

export interface OmicallBranchSummary {
  id: number;
  name: string;
}

export interface OmicallDailySummary {
  totalCalls: number;
  answeredCalls: number;
  happyCallsApproved: number;
  happyCallsPending: number;
  complaintCalls: number;
  aiDoneCalls: number;
  staffSelfRatedCalls: number;
  mismatchCalls: number;
}

export interface OmicallStoredUser {
  id?: number;
  role?: string;
}

export interface OmicallLogRow {
  id: number;
  callUuid: string;
  direction?: string;
  createdAt: string;
  timeStartCall?: string | null;
  staffId?: number | null;
  staff?: {
    displayName?: string | null;
  } | null;
  staffName?: string | null;
  customerName?: string | null;
  legacyUserId?: number | null;
  storeId?: number | null;
  storeName?: string | null;
  sourceNumber?: string;
  destinationNumber: string;
  duration: number;
  billSec?: number;
  recordingUrl?: string | null;
  status: string;
  analysisStatus: string;
  laughCount: number;
  customerSatisfactionScore?: number | null;
  customerSentiment?: string | null;
  satisfactionAnalysis?: string | null;
  happyCallStatus: string;
  happyCallReason?: string | null;
  qaTags?: string[];
  callType?: 'CSKH' | 'TELESALES' | null;
  hasComplaint?: boolean;
  aiLockedUntilSelfRated?: boolean;
  staffSelfSatisfactionScore?: number | null;
  staffSelfNote?: string | null;
  staffSelfRatedAt?: string | null;
  staffAiCoachingFeedback?: string | null;
  managerSatisfactionScore?: number | null;
  managerReviewedByName?: string | null;
  managerNote?: string | null;
  adminSatisfactionScore?: number | null;
  adminReviewedByName?: string | null;
  adminNote?: string | null;
}

export type OmicallConfigRow = OmiCallConfigPayload;

export interface OmicallExtensionFormValues {
  extension: string;
  sipPassword?: string;
  phoneNumber?: string;
}

export interface OmicallLogsApiResponse {
  logs?: OmicallLogRow[];
  branches?: OmicallBranchSummary[];
  summary?: OmicallDailySummary;
  pagination?: {
    total?: number;
  };
  total?: number;
}

export interface StatusTagDescriptor {
  status: StatusType;
  label: string;
  emphasized?: boolean;
  isProcessing?: boolean;
}

export const OMICALL_DEFAULT_LOOKBACK_DAYS = 30;
export const OMICALL_PAGE_SIZE_OPTIONS = ['10', '20', '50'];

export const DIRECTION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Gọi đi & Gọi đến' },
  { value: 'outbound', label: 'Gọi đi (Outbound)' },
  { value: 'inbound', label: 'Gọi đến (Inbound)' },
];

export const CALL_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả kết quả' },
  { value: 'ANSWER', label: 'ANSWER (Bắt máy)' },
  { value: 'NOANSWER', label: 'NOANSWER (Lỡ)' },
  { value: 'BUSY', label: 'BUSY (Bận)' },
  { value: 'CANCEL', label: 'CANCEL (Hủy)' },
];

export const HAPPY_CALL_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'APPROVED', label: 'Đồng ý' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'NONE', label: 'Chưa xét' },
];

export const AI_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'DONE', label: 'DONE (Hoàn thành)' },
  { value: 'PENDING', label: 'PENDING (Chờ)' },
  { value: 'PROCESSING', label: 'PROCESSING (Đang chạy)' },
  { value: 'WAITING_RECORDING', label: 'Chờ ghi âm' },
  { value: 'SKIPPED', label: 'Chưa phân tích / Bỏ qua' },
  { value: 'FAILED', label: 'FAILED (Lỗi)' },
];

export const AI_SATISFACTION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả độ hài lòng AI' },
  { value: 'SATISFIED', label: 'Hài lòng (4–5 ★)' },
  { value: 'NEUTRAL', label: 'Bình thường (3 ★)' },
  { value: 'UNSATISFIED', label: 'Chưa hài lòng (1–2 ★)' },
  { value: '5', label: '5 ★ (Xuất sắc)' },
  { value: '4', label: '4 ★ (Tốt)' },
  { value: '3', label: '3 ★ (Trung bình)' },
  { value: '2', label: '2 ★ (Kém)' },
  { value: '1', label: '1 ★ (Rất kém)' },
  { value: 'UNRATED', label: 'Chưa có điểm AI' },
];

export const RATING_SOURCE_OPTIONS = [
  { value: 'ANY', label: 'Bất kỳ (Admin / QL / NV)' },
  { value: 'ADMIN', label: 'Admin đánh giá' },
  { value: 'MANAGER', label: 'Quản lý / QA đánh giá' },
  { value: 'STAFF', label: 'Nhân viên tự đánh giá' },
];

export const RATING_LEVEL_OPTIONS = [
  { value: 'ALL', label: 'Tất cả mức đánh giá' },
  { value: 'SATISFIED', label: 'Hài lòng (4–5 ★)' },
  { value: 'NEUTRAL', label: 'Bình thường (3 ★)' },
  { value: 'UNSATISFIED', label: 'Chưa hài lòng (1–2 ★)' },
  { value: '5', label: '5 ★' },
  { value: '4', label: '4 ★' },
  { value: '3', label: '3 ★' },
  { value: '2', label: '2 ★' },
  { value: '1', label: '1 ★' },
  { value: 'RATED', label: 'Đã có đánh giá' },
  { value: 'UNRATED', label: 'Chưa đánh giá' },
  { value: 'AI_MISMATCH', label: '⚠️ Lệch ≥ 2 ★ so với AI' },
];

export const EMPTY_OMICALL_SUMMARY: OmicallDailySummary = {
  totalCalls: 0,
  answeredCalls: 0,
  happyCallsApproved: 0,
  happyCallsPending: 0,
  complaintCalls: 0,
  aiDoneCalls: 0,
  staffSelfRatedCalls: 0,
  mismatchCalls: 0,
};

export function createDefaultOmicallDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(OMICALL_DEFAULT_LOOKBACK_DAYS, 'day'), dayjs()];
}

export function resolveDisplayCallTime(record: Pick<OmicallLogRow, 'timeStartCall' | 'createdAt'>): string {
  if (record.timeStartCall) {
    const dt = new Date(record.timeStartCall);
    if (!Number.isNaN(dt.getTime()) && dt.getUTCFullYear() >= 2020) {
      return record.timeStartCall;
    }
  }
  return record.createdAt;
}

export function formatOmicallDuration(secs: number): string {
  const safeSecs = Number.isFinite(secs) && secs > 0 ? secs : 0;
  const minutes = Math.floor(safeSecs / 60);
  const seconds = Math.floor(safeSecs % 60);
  return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function formatCallUuidPreview(uuid: string): string {
  if (!uuid) return '';
  if (uuid.length <= 19) return uuid;
  return `${uuid.slice(0, 8)}...${uuid.slice(-8)}`;
}

export function getCallStatusDescriptor(status: string): StatusTagDescriptor {
  const statusMap: Record<string, StatusType> = {
    ANSWER: 'success',
    NOANSWER: 'default',
    BUSY: 'warning',
    CANCEL: 'error',
  };

  return {
    status: statusMap[status] || 'default',
    label: status || 'UNKNOWN',
  };
}

export function getAiStatusDescriptor(status: string): StatusTagDescriptor {
  switch (status) {
    case 'DONE':
      return { status: 'success', label: 'DONE' };
    case 'PROCESSING':
      return { status: 'processing', label: 'PROCESSING', isProcessing: true };
    case 'FAILED':
      return { status: 'error', label: 'FAILED' };
    case 'WAITING_RECORDING':
      return { status: 'orange', label: 'CHỜ GHI ÂM' };
    case 'SKIPPED':
      return { status: 'default', label: 'CHƯA PHÂN TÍCH' };
    default:
      return { status: 'default', label: 'PENDING' };
  }
}

export function getHappyStatusDescriptor(status: string): StatusTagDescriptor {
  switch (status) {
    case 'APPROVED':
      return { status: 'success', label: 'ĐẠT HAPPY CALL', emphasized: true };
    case 'REJECTED':
      return { status: 'error', label: 'TỪ CHỐI', emphasized: true };
    case 'PENDING_APPROVAL':
      return { status: 'warning', label: 'CHỜ DUYỆT', emphasized: true };
    case 'LOCKED':
      return { status: 'warning', label: '🔒 CHỜ TỰ CHẤM' };
    default:
      return { status: 'default', label: 'CHƯA XÉT' };
  }
}
