export interface ParsedOmicallWebhookPayload {
  callUuid: string;
  direction: 'outbound' | 'inbound' | 'local';
  status: 'ANSWER' | 'NOANSWER' | 'BUSY' | 'CANCEL';
  sourceNumber: string;
  destinationNumber: string;
  extensionToMatch: string;
  customerPhone: string;
  duration: number;
  billSec: number;
  recordingUrl: string | null;
  timeStartCall: Date | null;
  timeEndCall: Date | null;
}

const REALTIME_EVENT_STATES = new Set(['create', 'early', 'ringing', 'answered', 'hangup']);

function trimText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function toFiniteNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Detects OmiCall mid-call `call_event` notifications (`Cuộc gọi đang diễn ra`)
 * so they do not overwrite or prematurely skip CDR call-history records.
 */
export function isRealtimeCallEvent(body: SafeAny): boolean {
  if (!body || typeof body !== 'object') return false;
  if (trimText(body.source) === 'webhookEvent') return true;

  const state = trimText(body.state).toLowerCase();
  if (!state || state === 'cdr' || !REALTIME_EVENT_STATES.has(state)) {
    return false;
  }

  const hasCdrFields =
    body.status !== undefined ||
    body.answer_sec !== undefined ||
    body.bill_sec !== undefined ||
    body.billSec !== undefined ||
    body.recording_file_url !== undefined ||
    body.recording_file !== undefined ||
    body.recording_url !== undefined ||
    body.recordingUrl !== undefined;

  return !hasCdrFields;
}

/**
 * Converts OmiCall timestamps (Unix seconds, Unix ms, or ISO strings) to Date.
 */
export function parseOmiCallTimestamp(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()))) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    const ms = num < 1e12 ? num * 1000 : num;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalizes legacy mock `status` or real OmiCall CDR `disposition`/`answer_sec`/`bill_sec`.
 */
export function normalizeOmiCallStatus(body: SafeAny): 'ANSWER' | 'NOANSWER' | 'BUSY' | 'CANCEL' {
  const rawStatus = trimText(body?.status).toUpperCase();
  if (rawStatus) {
    if (rawStatus === 'ANSWER' || rawStatus === 'ANSWERED') return 'ANSWER';
    if (rawStatus === 'BUSY') return 'BUSY';
    if (rawStatus === 'CANCEL' || rawStatus === 'CANCELLED') return 'CANCEL';
    return 'NOANSWER';
  }

  const disposition = trimText(body?.disposition).toLowerCase();
  const answerSec = toFiniteNumber(body?.answer_sec ?? body?.answerSec);
  const billSec = toFiniteNumber(body?.bill_sec ?? body?.billSec);
  const hangupCause = trimText(body?.hangup_cause).toUpperCase();

  if (disposition === 'answered' || answerSec > 0 || billSec > 0) {
    return 'ANSWER';
  }
  if (disposition.includes('busy') || hangupCause.includes('BUSY')) {
    return 'BUSY';
  }
  if (disposition.includes('cancel') || hangupCause.includes('CANCEL')) {
    return 'CANCEL';
  }
  return 'NOANSWER';
}

function normalizeDirection(value: unknown): 'outbound' | 'inbound' | 'local' {
  const dir = trimText(value).toLowerCase();
  if (dir === 'inbound' || dir === 'local') return dir;
  return 'outbound';
}

function pickRecordingUrl(body: SafeAny): string | null {
  const candidates = [body?.recording_file_url, body?.recording_file, body?.recording_url, body?.recordingUrl];
  for (const candidate of candidates) {
    const url = trimText(candidate);
    if (url && url.length <= 500) return url;
  }
  return null;
}

/**
 * Extracts normalized CRM fields from either OmiCall CDR webhooks or internal test payloads.
 */
export function parseOmicallWebhookPayload(body: SafeAny): ParsedOmicallWebhookPayload {
  const callUuid = trimText(body?.call_uuid || body?.callUuid || body?.transaction_id);
  const direction = normalizeDirection(body?.direction);
  const status = normalizeOmiCallStatus(body);

  const sourceNumber = trimText(body?.source_number ?? body?.sourceNumber ?? body?.from_number).slice(0, 20);
  const destinationNumber = trimText(body?.destination_number ?? body?.destinationNumber ?? body?.to_number).slice(
    0,
    20
  );

  const rawExtension = trimText(body?.sip_user || body?.extension);
  const extensionFallback =
    direction === 'outbound'
      ? trimText(body?.from_number) || sourceNumber
      : trimText(body?.to_number) || destinationNumber;
  const extensionToMatch = rawExtension || extensionFallback;

  const rawCustomerPhone = trimText(body?.phone_number);
  const customerFallback = direction === 'outbound' ? destinationNumber : sourceNumber;
  const customerPhone = rawCustomerPhone || customerFallback;

  const duration = Math.max(0, Math.round(toFiniteNumber(body?.duration)));
  const billSec = Math.max(0, Math.round(toFiniteNumber(body?.bill_sec ?? body?.billSec)));

  return {
    callUuid,
    direction,
    status,
    sourceNumber,
    destinationNumber,
    extensionToMatch,
    customerPhone,
    duration,
    billSec,
    recordingUrl: pickRecordingUrl(body),
    timeStartCall: parseOmiCallTimestamp(body?.time_start_call ?? body?.timeStartCall),
    timeEndCall: parseOmiCallTimestamp(body?.time_end_call ?? body?.timeEndCall),
  };
}
