import {
  REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES,
  REQUEST_CLASSIFIER_WORKER_HEALTH_STATES,
  REQUEST_CLASSIFIER_WORKER_JOB_KINDS,
  REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES,
  REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES,
  type RequestClassifierWorkerConnectionMode,
  type RequestClassifierWorkerConnectionState,
  type RequestClassifierWorkerCircuitBreakerState,
  type RequestClassifierWorkerHealth,
  type RequestClassifierWorkerHealthState,
  type RequestClassifierWorkerHealthThresholds,
  type RequestClassifierWorkerHeartbeatRequest,
  type RequestClassifierWorkerJobKind,
  type RequestClassifierWorkerOutcomeSeverity,
  type RequestClassifierWorkerOutcomeStatus,
} from '@mos-lab/shared';
import { RequestClassifierWorkerHub } from '../request-classifier-worker-hub.js';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_ACTIVE_JOB_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_OUTCOME_AGE_MS = 366 * 24 * 60 * 60 * 1000;

export class RequestClassifierWorkerHealthError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'REQUEST_CLASSIFIER_WORKER_HEALTH_ERROR'
  ) {
    super(message);
  }
}

export type HealthRow = {
  workerId: string;
  workerVersion: string;
  sessionId: string;
  lastSequence: number;
  lastClientSentAt: Date;
  lastHeartbeatAt: Date;
  connectionMode: string;
  activeJobKind: string | null;
  activeJobStartedAt: Date | null;
  lastOutcomeKind: string | null;
  lastOutcomeStatus: string | null;
  lastOutcomeSeverity: string | null;
  lastOutcomeCode: string | null;
  lastOutcomeClientAt: Date | null;
  lastOutcomeAt: Date | null;
  lastCompletedAt: Date | null;
  lastFailedAt: Date | null;
  consecutiveFailureCount: number;
  state: string;
  stateReason: string;
  stateChangedAt: Date;
};

export type TransitionRow = {
  id: number;
  fromState: string | null;
  toState: string;
  reason: string;
  occurredAt: Date;
};

export type NormalizedHeartbeat = RequestClassifierWorkerHeartbeatRequest & {
  clientSentAt: Date;
  activeJobStartedAt: Date | null;
  latestOutcomeOccurredAt: Date | null;
};

export type DerivedState = {
  state: RequestClassifierWorkerHealthState;
  reason: string;
  secondsSinceHeartbeat: number;
};

type CircuitBreakerPolicy = {
  warningAfterSeconds: number;
  pauseAfterSeconds: number;
};

function circuitBreakerPolicy(kind: RequestClassifierWorkerJobKind): CircuitBreakerPolicy {
  // Implementation is the only worker job that runs an isolated coding/test
  // process. The other jobs are bounded review/diagnosis calls.
  return kind === 'INBOX_IMPLEMENTATION'
    ? { warningAfterSeconds: 15 * 60, pauseAfterSeconds: 45 * 60 }
    : { warningAfterSeconds: 10 * 60, pauseAfterSeconds: 20 * 60 };
}

/**
 * A server-derived, advisory-only guardrail. It deliberately does not make a
 * mutation: a running Codex process cannot yet be checkpointed and resumed
 * safely, so an automatic pause here would be indistinguishable from a kill.
 */
export function deriveRequestClassifierWorkerCircuitBreaker(
  row: Pick<HealthRow, 'activeJobKind' | 'activeJobStartedAt'>,
  now: Date
): RequestClassifierWorkerHealth['circuitBreaker'] {
  const activeJobKind = toJobKind(row.activeJobKind);
  if (!activeJobKind || !row.activeJobStartedAt) {
    return {
      mode: 'ADVISORY',
      state: 'NORMAL',
      activeJobKind: null,
      activeForSeconds: null,
      warningAfterSeconds: null,
      pauseAfterSeconds: null,
      reason: 'NO_ACTIVE_JOB',
    };
  }
  const policy = circuitBreakerPolicy(activeJobKind);
  const activeForSeconds = Math.max(0, Math.floor((now.getTime() - row.activeJobStartedAt.getTime()) / 1000));
  const state: RequestClassifierWorkerCircuitBreakerState =
    activeForSeconds >= policy.pauseAfterSeconds
      ? 'PAUSE_RECOMMENDED'
      : activeForSeconds >= policy.warningAfterSeconds
        ? 'WARNING'
        : 'NORMAL';
  return {
    mode: 'ADVISORY',
    state,
    activeJobKind,
    activeForSeconds,
    warningAfterSeconds: policy.warningAfterSeconds,
    pauseAfterSeconds: policy.pauseAfterSeconds,
    reason:
      state === 'PAUSE_RECOMMENDED'
        ? 'PAUSE_RECOMMENDED_NO_AUTOMATIC_STOP'
        : state === 'WARNING'
          ? 'WARNING_THRESHOLD_REACHED'
          : 'WITHIN_TIME_BUDGET',
  };
}

function clipped(value: unknown, maxLength: number): string {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return allowed.includes(value as T[number]) ? (value as T[number]) : null;
}

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function requestClassifierWorkerHealthThresholds(
  env: NodeJS.ProcessEnv = process.env
): RequestClassifierWorkerHealthThresholds {
  const onlineWithinSeconds = positiveInt(env.MOS_REQUEST_CLASSIFIER_WORKER_ONLINE_SECONDS, 90, 15, 600);
  const requestedOfflineAfterSeconds = positiveInt(env.MOS_REQUEST_CLASSIFIER_WORKER_OFFLINE_SECONDS, 180, 30, 3600);
  return {
    onlineWithinSeconds,
    offlineAfterSeconds: Math.max(onlineWithinSeconds + 1, requestedOfflineAfterSeconds),
    sustainedFailureCount: positiveInt(env.MOS_REQUEST_CLASSIFIER_WORKER_FAILURE_THRESHOLD, 3, 2, 20),
    seriousFailureWindowSeconds: positiveInt(env.MOS_REQUEST_CLASSIFIER_WORKER_SERIOUS_FAILURE_SECONDS, 120, 15, 1800),
  };
}

export function toHealthState(value: string | null | undefined): RequestClassifierWorkerHealthState {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_HEALTH_STATES) || 'OFFLINE';
}

function toConnectionMode(value: string | null): RequestClassifierWorkerConnectionMode | null {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES);
}

export function deriveRequestClassifierWorkerConnectionState({
  healthState,
  connectionMode,
  hasEventStream,
}: {
  healthState: RequestClassifierWorkerHealthState;
  connectionMode: string | null;
  hasEventStream: boolean;
}): RequestClassifierWorkerConnectionState {
  if (healthState === 'OFFLINE') return 'UNAVAILABLE';
  if (hasEventStream) return 'CONNECTED';
  if (toConnectionMode(connectionMode) === 'POLLING') return 'POLLING';
  return 'RECONNECTING';
}

function toJobKind(value: string | null): RequestClassifierWorkerJobKind | null {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_JOB_KINDS);
}

function toOutcomeStatus(value: string | null): RequestClassifierWorkerOutcomeStatus | null {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES);
}

function toOutcomeSeverity(value: string | null): RequestClassifierWorkerOutcomeSeverity | null {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES);
}

function toOutcomeKind(value: string | null): RequestClassifierWorkerJobKind | 'BRIDGE' | null {
  return value === 'BRIDGE' ? 'BRIDGE' : toJobKind(value);
}

function validDate(value: unknown, label: string, now: Date, maxSkewMs: number): Date {
  const parsed = new Date(String(value || ''));
  if (!Number.isFinite(parsed.getTime())) throw new RequestClassifierWorkerHealthError(`${label} không hợp lệ.`);
  if (Math.abs(parsed.getTime() - now.getTime()) > maxSkewMs) {
    throw new RequestClassifierWorkerHealthError(`${label} lệch quá xa so với giờ máy chủ.`, 422);
  }
  return parsed;
}

/** Validates only bounded operational metadata from the authenticated worker. */
export function normalizeRequestClassifierWorkerHeartbeat(input: unknown, now = new Date()): NormalizedHeartbeat {
  const value = input && typeof input === 'object' ? (input as Partial<RequestClassifierWorkerHeartbeatRequest>) : {};
  const workerId = clipped(value.workerId, 100);
  const workerVersion = clipped(value.workerVersion, 100);
  const sessionId = clipped(value.sessionId, 64);
  const sequence = Number(value.sequence);
  const connectionMode = enumValue(value.connectionMode, REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES);
  if (!workerId || !workerVersion || sessionId.length < 8) {
    throw new RequestClassifierWorkerHealthError('Heartbeat worker metadata không hợp lệ.');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RequestClassifierWorkerHealthError('Heartbeat sequence không hợp lệ.');
  }
  if (!connectionMode) throw new RequestClassifierWorkerHealthError('Trạng thái kết nối worker không hợp lệ.');

  const clientSentAt = validDate(value.sentAt, 'sentAt', now, MAX_CLOCK_SKEW_MS);
  let activeJob: RequestClassifierWorkerHeartbeatRequest['activeJob'] = null;
  let activeJobStartedAt: Date | null = null;
  if (value.activeJob !== null && value.activeJob !== undefined) {
    const kind = enumValue(value.activeJob.kind, REQUEST_CLASSIFIER_WORKER_JOB_KINDS);
    if (!kind) throw new RequestClassifierWorkerHealthError('Loại công việc đang chạy không hợp lệ.');
    activeJobStartedAt = validDate(value.activeJob.startedAt, 'activeJob.startedAt', now, MAX_ACTIVE_JOB_AGE_MS);
    activeJob = { kind, startedAt: activeJobStartedAt.toISOString() };
  }

  let latestOutcome: RequestClassifierWorkerHeartbeatRequest['latestOutcome'] = null;
  let latestOutcomeOccurredAt: Date | null = null;
  if (value.latestOutcome !== null && value.latestOutcome !== undefined) {
    const kind =
      value.latestOutcome.kind === 'BRIDGE'
        ? 'BRIDGE'
        : enumValue(value.latestOutcome.kind, REQUEST_CLASSIFIER_WORKER_JOB_KINDS);
    const status = enumValue(value.latestOutcome.status, REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES);
    const severity = enumValue(value.latestOutcome.severity, REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES);
    const code = clipped(value.latestOutcome.code, 100);
    if (!kind || !status || !severity || !/^[A-Z0-9_:-]+$/.test(code)) {
      throw new RequestClassifierWorkerHealthError('Kết quả công việc worker không hợp lệ.');
    }
    latestOutcomeOccurredAt = validDate(
      value.latestOutcome.occurredAt,
      'latestOutcome.occurredAt',
      now,
      MAX_OUTCOME_AGE_MS
    );
    latestOutcome = { kind, status, severity, code, occurredAt: latestOutcomeOccurredAt.toISOString() };
  }

  return {
    workerId,
    workerVersion,
    sessionId,
    sequence,
    sentAt: clientSentAt.toISOString(),
    clientSentAt,
    connectionMode,
    activeJob,
    activeJobStartedAt,
    latestOutcome,
    latestOutcomeOccurredAt,
  };
}

export function deriveRequestClassifierWorkerHealthState(
  row: Pick<HealthRow, 'lastHeartbeatAt' | 'consecutiveFailureCount' | 'lastOutcomeSeverity' | 'lastOutcomeAt'>,
  now: Date,
  thresholds: RequestClassifierWorkerHealthThresholds
): DerivedState {
  const secondsSinceHeartbeat = Math.max(0, Math.floor((now.getTime() - row.lastHeartbeatAt.getTime()) / 1000));
  if (secondsSinceHeartbeat >= thresholds.offlineAfterSeconds) {
    return { state: 'OFFLINE', reason: 'HEARTBEAT_EXPIRED', secondsSinceHeartbeat };
  }
  if (secondsSinceHeartbeat > thresholds.onlineWithinSeconds) {
    return { state: 'DEGRADED', reason: 'HEARTBEAT_STALE', secondsSinceHeartbeat };
  }
  const hasSeriousCurrentFailure =
    row.lastOutcomeSeverity === 'ERROR' &&
    row.lastOutcomeAt !== null &&
    now.getTime() - row.lastOutcomeAt.getTime() <= thresholds.seriousFailureWindowSeconds * 1000;
  if (hasSeriousCurrentFailure) {
    return { state: 'DEGRADED', reason: 'SERIOUS_CURRENT_FAILURE', secondsSinceHeartbeat };
  }
  if (row.consecutiveFailureCount >= thresholds.sustainedFailureCount) {
    return { state: 'DEGRADED', reason: 'SUSTAINED_FAILURES', secondsSinceHeartbeat };
  }
  return { state: 'ONLINE', reason: 'HEARTBEAT_CURRENT', secondsSinceHeartbeat };
}

function transitionDto(row: TransitionRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    fromState: row.fromState ? toHealthState(row.fromState) : null,
    toState: toHealthState(row.toState),
    reason: row.reason,
    occurredAt: row.occurredAt.toISOString(),
  };
}

export function buildWorkerHealthDto(
  row: HealthRow | null,
  latestTransition: TransitionRow | null,
  now: Date,
  thresholds: RequestClassifierWorkerHealthThresholds
): RequestClassifierWorkerHealth {
  if (!row) {
    return {
      workerId: null,
      workerVersion: null,
      state: 'OFFLINE',
      stateReason: 'NO_HEARTBEAT',
      stateChangedAt: null,
      serverTime: now.toISOString(),
      lastHeartbeatAt: null,
      secondsSinceHeartbeat: null,
      connectionMode: null,
      connectionState: 'UNAVAILABLE',
      activeJob: null,
      latestOutcome: null,
      lastCompletedAt: null,
      lastFailedAt: null,
      consecutiveFailureCount: 0,
      circuitBreaker: {
        mode: 'ADVISORY',
        state: 'NORMAL',
        activeJobKind: null,
        activeForSeconds: null,
        warningAfterSeconds: null,
        pauseAfterSeconds: null,
        reason: 'NO_ACTIVE_JOB',
      },
      latestTransition: null,
      thresholds,
    };
  }
  const derived = deriveRequestClassifierWorkerHealthState(row, now, thresholds);
  const jobKind = toJobKind(row.activeJobKind);
  const outcomeKind = toOutcomeKind(row.lastOutcomeKind);
  const outcomeStatus = toOutcomeStatus(row.lastOutcomeStatus);
  const outcomeSeverity = toOutcomeSeverity(row.lastOutcomeSeverity);
  return {
    workerId: row.workerId,
    workerVersion: row.workerVersion,
    state: derived.state,
    stateReason: derived.reason,
    stateChangedAt: row.stateChangedAt.toISOString(),
    serverTime: now.toISOString(),
    lastHeartbeatAt: row.lastHeartbeatAt.toISOString(),
    secondsSinceHeartbeat: derived.secondsSinceHeartbeat,
    connectionMode: toConnectionMode(row.connectionMode),
    connectionState: deriveRequestClassifierWorkerConnectionState({
      healthState: derived.state,
      connectionMode: row.connectionMode,
      hasEventStream: RequestClassifierWorkerHub.isConnected(row.workerId),
    }),
    activeJob: jobKind ? { kind: jobKind, startedAt: row.activeJobStartedAt?.toISOString() ?? null } : null,
    latestOutcome:
      outcomeKind && outcomeStatus && outcomeSeverity && row.lastOutcomeCode
        ? {
            kind: outcomeKind,
            status: outcomeStatus,
            severity: outcomeSeverity,
            code: row.lastOutcomeCode,
            occurredAt: row.lastOutcomeAt?.toISOString() ?? null,
          }
        : null,
    lastCompletedAt: row.lastCompletedAt?.toISOString() ?? null,
    lastFailedAt: row.lastFailedAt?.toISOString() ?? null,
    consecutiveFailureCount: row.consecutiveFailureCount,
    circuitBreaker: deriveRequestClassifierWorkerCircuitBreaker(row, now),
    latestTransition: transitionDto(latestTransition),
    thresholds,
  };
}

/** Rejects delayed/replayed updates without trusting arrival order. */
export function isStaleRequestClassifierWorkerHeartbeat(
  payload: Pick<NormalizedHeartbeat, 'clientSentAt' | 'sequence' | 'sessionId'>,
  current: Pick<HealthRow, 'lastClientSentAt' | 'lastSequence' | 'sessionId'>
): boolean {
  const timestampDelta = payload.clientSentAt.getTime() - current.lastClientSentAt.getTime();
  if (timestampDelta < 0) return true;
  if (timestampDelta === 0 && payload.sequence <= current.lastSequence) return true;
  return payload.sessionId === current.sessionId && payload.sequence <= current.lastSequence;
}
