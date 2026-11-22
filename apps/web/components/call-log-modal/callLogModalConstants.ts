import type { StatusType } from '~/components/ui';
import type { QuickNotePreset } from './callLogModalTypes';

export const QUICK_NOTE_PRESETS: QuickNotePreset[] = [
  { label: 'Gọi nhỡ', text: 'Gọi nhỡ - Không trả lời', result: 'NO_ANSWER', outcome: 'PENDING' },
  { label: '24h nt', text: '24h nt', result: 'NO_ANSWER', outcome: 'PENDING' },
  { label: 'Máy bận', text: 'Máy bận', result: 'BUSY', outcome: 'PENDING' },
  { label: 'Thuê bao', text: 'Thuê bao / Không liên lạc được', result: 'FAILED', outcome: 'PENDING' },
  { label: 'Hẹn gọi lại', text: 'Khách hẹn gọi lại sau', result: 'ANSWERED', outcome: 'CALL_BACK' },
  { label: 'Sai số', text: 'Sai số / Nhầm số', result: 'WRONG_NUMBER', outcome: 'PENDING' },
  { label: 'Không nhu cầu', text: 'Khách không có nhu cầu', result: 'ANSWERED', outcome: 'PENDING' },
];

export const ANALYZING_STATUSES = ['PENDING', 'PROCESSING', 'WAITING_RECORDING'] as const;

export const SENTIMENT_STATUS_MAP: Record<string, StatusType> = {
  HAPPY: 'success',
  SATISFIED: 'success',
  NEUTRAL: 'processing',
  FRUSTRATED: 'orange',
  ANGRY: 'error',
};
