import type { CallOutcome, CallResult } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import { ANALYZING_STATUSES, SENTIMENT_STATUS_MAP } from './callLogModalConstants';
import type {
  ActiveCallInfo,
  CallLogFormValues,
  CallLogSubmitPayload,
  LaughSegment,
  QuickActionType,
  ResolvedCallCustomer,
  ResolvedCallLog,
} from './callLogModalTypes';

export function formatCallDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function resolveCallTargetCustomer(params: {
  activeCall: ActiveCallInfo;
  currentCall: ActiveCallInfo;
  callLogCustomerInfo: ResolvedCallCustomer | null;
  propLegacyUserId?: number;
  propCustomerName?: string;
  propPlanId?: number | null;
}): {
  legacyUserId: number;
  customerName: string;
  planId: number | null;
} {
  const { activeCall, currentCall, callLogCustomerInfo, propLegacyUserId, propCustomerName, propPlanId } = params;

  const customer: ResolvedCallCustomer | null =
    activeCall && (activeCall.legacyUserId || activeCall.name)
      ? {
          legacyUserId: activeCall.legacyUserId || 0,
          customerName: activeCall.name || 'Khách hàng',
          planId: activeCall.planId || null,
        }
      : propLegacyUserId !== undefined && propLegacyUserId > 0
        ? {
            legacyUserId: propLegacyUserId,
            customerName: propCustomerName || '',
            planId: propPlanId || null,
          }
        : callLogCustomerInfo;

  return {
    legacyUserId:
      customer?.legacyUserId || currentCall?.legacyUserId || callLogCustomerInfo?.legacyUserId || propLegacyUserId || 0,
    customerName:
      customer?.customerName || currentCall?.name || callLogCustomerInfo?.customerName || propCustomerName || '',
    planId: customer?.planId || currentCall?.planId || callLogCustomerInfo?.planId || propPlanId || null,
  };
}

export function resolveDispositionDefaults(disposition?: string | null): { callResult: CallResult; note: string } {
  if (disposition === 'ANSWERED') {
    return { callResult: 'ANSWERED', note: '' };
  }
  if (disposition === 'BUSY') {
    return { callResult: 'BUSY', note: 'Máy bận' };
  }
  if (disposition === 'FAILED') {
    return { callResult: 'FAILED', note: 'Lỗi cuộc gọi / Không liên lạc được' };
  }
  return { callResult: 'NO_ANSWER', note: 'Gọi nhỡ - Không trả lời' };
}

export function resolveInitialCallDefaults(
  activeCall: ActiveCallInfo,
  resolvedLog: ResolvedCallLog | null | undefined,
  callDuration: number
): { callResult: CallResult; outcome: CallOutcome; note: string } {
  let defaultCallResult: CallResult = 'ANSWERED';
  const defaultOutcome: CallOutcome = 'PENDING';
  let defaultNote = '';

  if (activeCall) {
    const disposition = resolvedLog?.disposition;
    if (disposition) {
      const resolved = resolveDispositionDefaults(disposition);
      defaultCallResult = resolved.callResult;
      defaultNote = resolved.note;
    } else if (callDuration > 0) {
      defaultCallResult = 'ANSWERED';
    } else {
      defaultCallResult = 'NO_ANSWER';
      defaultNote = 'Gọi nhỡ - Không trả lời';
    }
  }

  return {
    callResult: defaultCallResult,
    outcome: defaultOutcome,
    note: defaultNote,
  };
}

export function buildQuickActionPayload(params: {
  actionType: QuickActionType;
  targetUserId: number;
  planId: number | null;
  activeCall: ActiveCallInfo;
  callDuration: number;
  resolvedLog: ResolvedCallLog | null | undefined;
}): CallLogSubmitPayload {
  const { actionType, targetUserId, planId, activeCall, callDuration, resolvedLog } = params;

  const basePayload: CallLogSubmitPayload = {
    planId: planId || undefined,
    legacyUserId: targetUserId,
    callType: activeCall ? (activeCall.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND') : 'OUTBOUND',
    callResult: 'NO_ANSWER',
    durationSec: callDuration > 0 ? callDuration : resolvedLog?.duration || 0,
    omicallLogId: resolvedLog?.id || null,
    callUuid: activeCall?.callUuid || null,
  };

  if (actionType === 'NO_ANSWER') {
    return {
      ...basePayload,
      callResult: 'NO_ANSWER',
      outcome: 'PENDING',
      note: 'Gọi nhỡ - Không trả lời',
    };
  }
  if (actionType === 'NOTE_24H') {
    return {
      ...basePayload,
      callResult: callDuration > 0 ? 'ANSWERED' : 'NO_ANSWER',
      outcome: 'PENDING',
      note: '24h nt',
    };
  }
  if (actionType === 'BUSY') {
    return {
      ...basePayload,
      callResult: 'BUSY',
      outcome: 'PENDING',
      note: 'Máy bận',
    };
  }
  if (actionType === 'CALL_BACK') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      ...basePayload,
      callResult: 'ANSWERED',
      outcome: 'CALL_BACK',
      note: 'Hẹn gọi lại sau',
      callbackDate: tomorrow.toISOString().split('T')[0],
    };
  }
  if (actionType === 'BOOKED') {
    return {
      ...basePayload,
      callResult: 'ANSWERED',
      outcome: 'BOOKED',
      note: 'Đã book lịch hẹn mới',
    };
  }
  return {
    ...basePayload,
    callResult: 'ANSWERED',
    outcome: 'RENEWED',
    note: 'Đã gia hạn/mua combo mới',
  };
}

export function buildFormSubmitPayload(params: {
  values: CallLogFormValues;
  targetUserId: number;
  planId: number | null;
  activeCall: ActiveCallInfo;
  callDuration: number;
  resolvedLog: ResolvedCallLog | null | undefined;
}): CallLogSubmitPayload {
  const { values, targetUserId, planId, activeCall, callDuration, resolvedLog } = params;

  return {
    planId: planId || undefined,
    legacyUserId: targetUserId,
    callType: activeCall ? (activeCall.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND') : 'OUTBOUND',
    callResult: values.callResult,
    outcome: values.outcome,
    note: values.note,
    durationSec: callDuration > 0 ? callDuration : resolvedLog?.duration || 0,
    callbackDate: values.callbackDate ? values.callbackDate.format('YYYY-MM-DD') : null,
    omicallLogId: resolvedLog?.id || null,
    callUuid: activeCall?.callUuid || null,
  };
}

export function isCallAnalyzing(resolvedLog: ResolvedCallLog | null | undefined): boolean {
  if (!resolvedLog || !resolvedLog.analysisStatus) return true;
  return (ANALYZING_STATUSES as readonly string[]).includes(resolvedLog.analysisStatus);
}

export function getSentimentStatus(sentiment?: string | null): StatusType {
  if (!sentiment) return 'default';
  return SENTIMENT_STATUS_MAP[sentiment] || 'default';
}

export function parseLaughTimestamps(raw: unknown): LaughSegment[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LaughSegment =>
        typeof item === 'object' && item !== null && typeof (item as LaughSegment).start === 'number'
    );
  } catch {
    return [];
  }
}
