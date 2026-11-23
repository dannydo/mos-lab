import type { CallOutcome, CallResult, CallType } from '@mos-lab/shared';
import type { Dayjs } from 'dayjs';
import type { CurrentCall } from '~/context/omicall/types';

export interface CallLogModalProps {
  visible?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  planId?: number | null;
  legacyUserId?: number;
  customerName?: string;
}

export type QuickActionType = 'NO_ANSWER' | 'NOTE_24H' | 'BUSY' | 'CALL_BACK' | 'BOOKED' | 'RENEWED';

export interface QuickNotePreset {
  label: string;
  text: string;
  result: CallResult;
  outcome: CallOutcome;
}

export interface CallLogFormValues {
  callResult: CallResult;
  outcome?: CallOutcome;
  callbackDate?: Dayjs | null;
  note?: string;
}

export interface ResolvedCallCustomer {
  legacyUserId: number;
  customerName: string;
  planId?: number | null;
}

export interface LaughSegment {
  speaker?: string;
  start: number;
}

export interface ResolvedCallLog {
  id?: number | null;
  disposition?: string | null;
  duration?: number | null;
  analysisStatus?: string | null;
  analysisError?: string | null;
  customerSatisfactionScore?: number | null;
  customerSentiment?: string | null;
  satisfactionAnalysis?: string | null;
  laughCountCustomer?: number | null;
  laughCountAgent?: number | null;
  laughTimestamps?: string | LaughSegment[] | null;
  recordingUrl?: string | null;
}

export interface CallLogSubmitPayload {
  planId?: number;
  legacyUserId: number;
  callType: CallType;
  callResult: CallResult;
  outcome?: CallOutcome;
  note?: string;
  durationSec: number;
  callbackDate?: string | null;
  omicallLogId?: number | null;
  callUuid?: string | null;
}

export type ActiveCallInfo = CurrentCall | null;
