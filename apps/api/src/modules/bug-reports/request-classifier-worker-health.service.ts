import type { FastifyInstance } from 'fastify';
import type { RequestClassifierWorkerHealth, RequestClassifierWorkerHealthThresholds } from '@mos-lab/shared';
import {
  buildWorkerHealthDto,
  deriveRequestClassifierWorkerCircuitBreaker,
  deriveRequestClassifierWorkerConnectionState,
  deriveRequestClassifierWorkerHealthState,
  isStaleRequestClassifierWorkerHeartbeat,
  normalizeRequestClassifierWorkerHeartbeat,
  RequestClassifierWorkerHealthError,
  requestClassifierWorkerHealthThresholds,
  toHealthState,
  type HealthRow,
  type NormalizedHeartbeat,
  type TransitionRow,
} from './service/request-classifier-worker-health-rules.js';

export {
  deriveRequestClassifierWorkerCircuitBreaker,
  deriveRequestClassifierWorkerConnectionState,
  deriveRequestClassifierWorkerHealthState,
  isStaleRequestClassifierWorkerHeartbeat,
  normalizeRequestClassifierWorkerHeartbeat,
  RequestClassifierWorkerHealthError,
  requestClassifierWorkerHealthThresholds,
};

const TRANSIENT_RETRY = Symbol('TRANSIENT_RETRY');

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
            health: buildWorkerHealthDto(row, await latestTransition(fastify, payload.workerId), now, thresholds),
          };
        } catch (error) {
          if (this.isUniqueConflict(error)) continue;
          throw error;
        }
      }

      if (isStaleRequestClassifierWorkerHeartbeat(payload, existing)) {
        return {
          accepted: false,
          health: buildWorkerHealthDto(existing, await latestTransition(fastify, payload.workerId), now, thresholds),
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
                fromState: toHealthState(existing.state),
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
          health: buildWorkerHealthDto(row, await latestTransition(fastify, payload.workerId), now, thresholds),
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
    if (!row) return buildWorkerHealthDto(null, null, now, requestClassifierWorkerHealthThresholds());
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
    if (!row) return { changed: false, health: buildWorkerHealthDto(null, null, now, thresholds) };
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
            fromState: toHealthState(row.state),
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
          health: buildWorkerHealthDto(refreshed, await latestTransition(fastify, workerId), now, thresholds),
        };
      }
    }
    return {
      changed: false,
      health: buildWorkerHealthDto(row, await latestTransition(fastify, workerId), now, thresholds),
    };
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
