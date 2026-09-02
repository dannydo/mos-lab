import type { FastifyInstance } from 'fastify';
import {
  REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES,
  REQUEST_CLASSIFIER_WORKER_HEALTH_STATES,
  REQUEST_CLASSIFIER_WORKER_JOB_KINDS,
  REQUEST_CLASSIFIER_WORKER_OUTCOME_SEVERITIES,
  REQUEST_CLASSIFIER_WORKER_OUTCOME_STATUSES,
  type RequestClassifierWorkerConnectionMode,
  type RequestClassifierWorkerHealth,
  type RequestClassifierWorkerHealthState,
  type RequestClassifierWorkerHealthThresholds,
  type RequestClassifierWorkerHeartbeatRequest,
  type RequestClassifierWorkerJobKind,
  type RequestClassifierWorkerOutcomeSeverity,
  type RequestClassifierWorkerOutcomeStatus,
} from '@mos-lab/shared';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_ACTIVE_JOB_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_OUTCOME_AGE_MS = 366 * 24 * 60 * 60 * 1000;
const TRANSIENT_RETRY = Symbol('TRANSIENT_RETRY');

export class RequestClassifierWorkerHealthError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'REQUEST_CLASSIFIER_WORKER_HEALTH_ERROR'
  ) {
    super(message);
  }
}

type HealthRow = {
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

type TransitionRow = {
  id: number;
  fromState: string | null;
  toState: string;
  reason: string;
  occurredAt: Date;
};

type NormalizedHeartbeat = RequestClassifierWorkerHeartbeatRequest & {
  clientSentAt: Date;
  activeJobStartedAt: Date | null;
  latestOutcomeOccurredAt: Date | null;
};

type DerivedState = {
  state: RequestClassifierWorkerHealthState;
  reason: string;
  secondsSinceHeartbeat: number;
};

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

function toState(value: string | null | undefined): RequestClassifierWorkerHealthState {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_HEALTH_STATES) || 'OFFLINE';
}

function toConnectionMode(value: string | null): RequestClassifierWorkerConnectionMode | null {
  return enumValue(value, REQUEST_CLASSIFIER_WORKER_CONNECTION_MODES);
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
    fromState: row.fromState ? toState(row.fromState) : null,
    toState: toState(row.toState),
    reason: row.reason,
    occurredAt: row.occurredAt.toISOString(),
  };
}

function healthDto(
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
      activeJob: null,
      latestOutcome: null,
      lastCompletedAt: null,
      lastFailedAt: null,
      consecutiveFailureCount: 0,
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
    latestTransition: transitionDto(latestTransition),
    thresholds,
  };
}

async function latestTransition(fastify: FastifyInstance, workerId: string): Promise<TransitionRow | null> {
  return fastify.prisma.crm.crmRequestClassifierWorkerHealthTransition.findFirst({
    where: { workerId },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
  });
}

export class RequestClassifierWorkerHealthService {
  static async heartbeat(
    fastify: FastifyInstance,
    input: unknown,
    now = new Date()
  ): Promise<{ accepted: boolean; health: RequestClassifierWorkerHealth }> {
    const payload = normalizeRequestClassifierWorkerHeartbeat(input, now);
    const thresholds = requestClassifierWorkerHealthThresholds();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findUnique({
        where: { workerId: payload.workerId },
      })) as HealthRow | null;
      if (!existing) {
        const initial = this.toWriteData(payload, now, null, thresholds);
        try {
          await fastify.prisma.crm.$transaction(async (tx) => {
            await tx.crmRequestClassifierWorkerHealth.create({ data: { workerId: payload.workerId, ...initial } });
            await tx.crmRequestClassifierWorkerHealthTransition.create({
              data: {
                workerId: payload.workerId,
                fromState: null,
                toState: initial.state,
                reason: initial.stateReason,
                occurredAt: initial.stateChangedAt,
              },
            });
          });
          const row = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findUnique({
            where: { workerId: payload.workerId },
          })) as HealthRow;
          return {
            accepted: true,
            health: healthDto(row, await latestTransition(fastify, payload.workerId), now, thresholds),
          };
        } catch (error) {
          if (this.isUniqueConflict(error)) continue;
          throw error;
        }
      }

      if (isStaleRequestClassifierWorkerHeartbeat(payload, existing)) {
        return {
          accepted: false,
          health: healthDto(existing, await latestTransition(fastify, payload.workerId), now, thresholds),
        };
      }

      const updateData = this.toWriteData(payload, now, existing, thresholds);
      const transitionChanged = existing.state !== updateData.state || existing.stateReason !== updateData.stateReason;
      try {
        await fastify.prisma.crm.$transaction(async (tx) => {
          const updated = await tx.crmRequestClassifierWorkerHealth.updateMany({
            where: {
              workerId: payload.workerId,
              lastClientSentAt: existing.lastClientSentAt,
              lastSequence: existing.lastSequence,
            },
            data: updateData,
          });
          if (updated.count !== 1) throw TRANSIENT_RETRY;
          if (transitionChanged) {
            await tx.crmRequestClassifierWorkerHealthTransition.create({
              data: {
                workerId: payload.workerId,
                fromState: toState(existing.state),
                toState: updateData.state,
                reason: updateData.stateReason,
                occurredAt: updateData.stateChangedAt,
              },
            });
          }
        });
        const row = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findUnique({
          where: { workerId: payload.workerId },
        })) as HealthRow;
        return {
          accepted: true,
          health: healthDto(row, await latestTransition(fastify, payload.workerId), now, thresholds),
        };
      } catch (error) {
        if (error === TRANSIENT_RETRY) continue;
        throw error;
      }
    }
    throw new RequestClassifierWorkerHealthError(
      'Heartbeat bị cạnh tranh, hãy thử lại.',
      409,
      'WORKER_HEARTBEAT_CONFLICT'
    );
  }

  static async read(fastify: FastifyInstance, now = new Date()): Promise<RequestClassifierWorkerHealth> {
    const row = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findFirst({
      orderBy: { lastHeartbeatAt: 'desc' },
    })) as HealthRow | null;
    if (!row) return healthDto(null, null, now, requestClassifierWorkerHealthThresholds());
    const reconciled = await this.reconcile(fastify, row.workerId, now);
    return reconciled.health;
  }

  static async refreshStates(fastify: FastifyInstance, now = new Date()): Promise<number> {
    const rows = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findMany({
      select: { workerId: true },
      take: 50,
    })) as Array<{ workerId: string }>;
    let changed = 0;
    for (const row of rows) {
      const result = await this.reconcile(fastify, row.workerId, now);
      if (result.changed) changed += 1;
    }
    return changed;
  }

  private static async reconcile(
    fastify: FastifyInstance,
    workerId: string,
    now: Date
  ): Promise<{ changed: boolean; health: RequestClassifierWorkerHealth }> {
    const thresholds = requestClassifierWorkerHealthThresholds();
    const row = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findUnique({
      where: { workerId },
    })) as HealthRow | null;
    if (!row) return { changed: false, health: healthDto(null, null, now, thresholds) };
    const derived = deriveRequestClassifierWorkerHealthState(row, now, thresholds);
    const changed = row.state !== derived.state || row.stateReason !== derived.reason;
    if (changed) {
      const result = await fastify.prisma.crm.$transaction(async (tx) => {
        const updated = await tx.crmRequestClassifierWorkerHealth.updateMany({
          where: {
            workerId,
            lastHeartbeatAt: row.lastHeartbeatAt,
            state: row.state,
            stateReason: row.stateReason,
          },
          data: { state: derived.state, stateReason: derived.reason, stateChangedAt: now },
        });
        if (updated.count !== 1) return false;
        await tx.crmRequestClassifierWorkerHealthTransition.create({
          data: {
            workerId,
            fromState: toState(row.state),
            toState: derived.state,
            reason: derived.reason,
            occurredAt: now,
          },
        });
        return true;
      });
      if (result) {
        const refreshed = (await fastify.prisma.crm.crmRequestClassifierWorkerHealth.findUnique({
          where: { workerId },
        })) as HealthRow;
        return {
          changed: true,
          health: healthDto(refreshed, await latestTransition(fastify, workerId), now, thresholds),
        };
      }
    }
    return { changed: false, health: healthDto(row, await latestTransition(fastify, workerId), now, thresholds) };
  }

  private static toWriteData(
    payload: NormalizedHeartbeat,
    now: Date,
    current: HealthRow | null,
    thresholds: RequestClassifierWorkerHealthThresholds
  ) {
    const isNewOutcome =
      Boolean(payload.latestOutcome) &&
      (!current?.lastOutcomeClientAt ||
        Boolean(
          payload.latestOutcomeOccurredAt &&
          payload.latestOutcomeOccurredAt.getTime() > current.lastOutcomeClientAt.getTime()
        ));
    const previousFailures = current?.consecutiveFailureCount ?? 0;
    const isFailure = payload.latestOutcome?.status === 'FAILED';
    const consecutiveFailureCount = isNewOutcome
      ? isFailure
        ? Math.min(1000, previousFailures + 1)
        : 0
      : previousFailures;
    const candidate = {
      lastHeartbeatAt: now,
      consecutiveFailureCount,
      lastOutcomeSeverity: isNewOutcome
        ? (payload.latestOutcome?.severity ?? null)
        : (current?.lastOutcomeSeverity ?? null),
      lastOutcomeAt: isNewOutcome ? now : (current?.lastOutcomeAt ?? null),
    };
    const derived = deriveRequestClassifierWorkerHealthState(candidate, now, thresholds);
    const stateChanged = !current || current.state !== derived.state || current.stateReason !== derived.reason;
    return {
      workerVersion: payload.workerVersion,
      sessionId: payload.sessionId,
      lastSequence: payload.sequence,
      lastClientSentAt: payload.clientSentAt,
      lastHeartbeatAt: now,
      connectionMode: payload.connectionMode,
      activeJobKind: payload.activeJob?.kind ?? null,
      activeJobStartedAt: payload.activeJobStartedAt,
      lastOutcomeKind: isNewOutcome ? (payload.latestOutcome?.kind ?? null) : (current?.lastOutcomeKind ?? null),
      lastOutcomeStatus: isNewOutcome ? (payload.latestOutcome?.status ?? null) : (current?.lastOutcomeStatus ?? null),
      lastOutcomeSeverity: isNewOutcome
        ? (payload.latestOutcome?.severity ?? null)
        : (current?.lastOutcomeSeverity ?? null),
      lastOutcomeCode: isNewOutcome ? (payload.latestOutcome?.code ?? null) : (current?.lastOutcomeCode ?? null),
      lastOutcomeClientAt: isNewOutcome ? payload.latestOutcomeOccurredAt : (current?.lastOutcomeClientAt ?? null),
      lastOutcomeAt: isNewOutcome ? now : (current?.lastOutcomeAt ?? null),
      lastCompletedAt:
        isNewOutcome && payload.latestOutcome?.status === 'SUCCEEDED' ? now : (current?.lastCompletedAt ?? null),
      lastFailedAt: isNewOutcome && payload.latestOutcome?.status === 'FAILED' ? now : (current?.lastFailedAt ?? null),
      consecutiveFailureCount,
      state: derived.state,
      stateReason: derived.reason,
      stateChangedAt: stateChanged ? now : (current?.stateChangedAt ?? now),
    };
  }

  private static isUniqueConflict(error: unknown): boolean {
    return Boolean(
      error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002'
    );
  }
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

/** Keeps stale/offline transitions visible even if no administrator has the Inbox open. */
export function startRequestClassifierWorkerHealthMonitor(fastify: FastifyInstance) {
  const run = () =>
    RequestClassifierWorkerHealthService.refreshStates(fastify).catch((error) =>
      fastify.log.warn({ error }, 'Request classifier worker health monitor failed')
    );
  const initial = setTimeout(run, 10_000);
  initial.unref();
  const interval = setInterval(run, 30_000);
  interval.unref();
  fastify.addHook('onClose', async () => {
    clearTimeout(initial);
    clearInterval(interval);
  });
}
