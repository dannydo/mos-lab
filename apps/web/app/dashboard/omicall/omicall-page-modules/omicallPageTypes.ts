import dayjs, { type Dayjs } from 'dayjs';
import type { OmiCallConfigPayload, Staff } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type OmicallTabKey = 'logs' | 'configs';

export type OmicallStaffSummary = Pick<Staff, 'id' | 'displayName'>;

export interface OmicallStoredUser {
  id?: number;
  role?: string;
}

export interface OmicallLogRow {
  id: number;
  callUuid: string;
  createdAt: string;
  staffId?: number | null;
  staff?: {
    displayName?: string | null;
  } | null;
  staffName?: string | null;
  destinationNumber: string;
  duration: number;
  status: string;
  analysisStatus: string;
  laughCount: number;
  happyCallStatus: string;
}

export type OmicallConfigRow = OmiCallConfigPayload;

export interface OmicallExtensionFormValues {
  extension: string;
  sipPassword?: string;
  phoneNumber?: string;
}

export interface OmicallLogsApiResponse {
  logs?: OmicallLogRow[];
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
  { value: 'PENDING', label: 'PENDING (Chờ)' },
  { value: 'PROCESSING', label: 'PROCESSING (Đang chạy)' },
  { value: 'DONE', label: 'DONE (Hoàn thành)' },
  { value: 'FAILED', label: 'FAILED (Lỗi)' },
];

export function createDefaultOmicallDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(OMICALL_DEFAULT_LOOKBACK_DAYS, 'day'), dayjs()];
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
      return { status: 'orange', label: 'WAITING RECORDING' };
    default:
      return { status: 'default', label: 'PENDING' };
  }
}

export function getHappyStatusDescriptor(status: string): StatusTagDescriptor {
  switch (status) {
    case 'APPROVED':
      return { status: 'success', label: 'ĐỒNG Ý', emphasized: true };
    case 'REJECTED':
      return { status: 'error', label: 'TỪ CHỐI', emphasized: true };
    case 'PENDING_APPROVAL':
      return { status: 'warning', label: 'CHỜ DUYỆT', emphasized: true };
    default:
      return { status: 'default', label: 'CHƯA XÉT' };
  }
}
