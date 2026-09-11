import type { FastifyInstance } from 'fastify';
import { CustomerVisitProjectionService } from './customer-visit-projection.service.js';
import { CcKpiDailyProjectionService, type CcKpiDailyResponse } from './cc-kpi-daily-projection.service.js';
import { CcKpiService } from '../kpi/services/cc-kpi.service.js';

const POLL_INTERVAL_MS = 60_000;
const RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 200;
const CC_KPI_REBUILD_INTERVAL_MS = 60 * 1000;

function enabled(value: string | undefined): boolean {
  return value === 'true';
}

function ictDate(value = new Date()): string {
  return value.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function daysBefore(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - Math.max(0, Math.floor(days)));
  return value.toISOString().slice(0, 10);
}

async function rebuildCcKpiProjection(fastify: FastifyInstance, backfill: boolean): Promise<number> {
  if (!enabled(process.env.CC_KPI_DAILY_PROJECTION_WORKER_ENABLED)) return 0;
  const configuredDays = Number.parseInt(
    backfill
      ? (process.env.CC_KPI_DAILY_PROJECTION_BACKFILL_DAYS ?? '')
      : (process.env.CC_KPI_DAILY_PROJECTION_ROLLING_DAYS ?? ''),
    10
  );
  const days =
    Number.isFinite(configuredDays) && configuredDays > 0 ? Math.min(configuredDays, 365) : backfill ? 90 : 3;
  const dateTo = ictDate();
  const dateFrom = daysBefore(dateTo, days - 1);
  return CcKpiDailyProjectionService.rebuildRange(
    fastify,
    async (filters) =>
      (await CcKpiService.getCcDailySalesBonusCanonical(fastify, filters)) as unknown as CcKpiDailyResponse,
    dateFrom,
    dateTo
  );
}

/**
 * The worker is deliberately feature-gated. Deploying its code never starts
 * CRM writes until the migration is applied and the operator explicitly enables
 * the shadow/backfill phase.
 */
export function startProjectionWorker(fastify: FastifyInstance): void {
  if (!enabled(process.env.PROJECTION_WORKER_ENABLED)) {
    fastify.log.info(
      'Projection worker disabled; set PROJECTION_WORKER_ENABLED=true after CRM migration and shadow-read review.'
    );
    return;
  }

  const workerId = `api-${process.pid}`;
  const initialBackfill = enabled(process.env.PROJECTION_WORKER_INITIAL_BACKFILL);
  const configuredBatchSize = Number.parseInt(process.env.PROJECTION_WORKER_BATCH_SIZE ?? '', 10);
  const batchSize =
    Number.isFinite(configuredBatchSize) && configuredBatchSize > 0
      ? Math.min(configuredBatchSize, 500)
      : DEFAULT_BATCH_SIZE;
  let running = false;
  const run = async (includeReconciliation: boolean) => {
    if (running) return;
    running = true;
    try {
      const deltaCount = await CustomerVisitProjectionService.enqueueRecentLegacyChanges(fastify);
      const reconciliationCount = includeReconciliation
        ? await CustomerVisitProjectionService.enqueueCampaignReconciliation(fastify)
        : 0;
      const processed = await CustomerVisitProjectionService.processBatch(fastify, workerId, batchSize);
      fastify.log.info(
        { deltaCount, reconciliationCount, processed },
        'Customer visit projection worker cycle complete'
      );
    } catch (error) {
      fastify.log.error({ error }, 'Customer visit projection worker cycle failed');
    } finally {
      running = false;
    }
  };

  // Explicit one-shot operator gate for a safe shadow backfill after migration.
  // It never enables the read path; the flag must be turned off after startup.
  const firstRun = setTimeout(() => void run(initialBackfill), 30_000);
  firstRun.unref();
  const poll = setInterval(() => void run(false), POLL_INTERVAL_MS);
  poll.unref();
  const reconcile = setInterval(() => void run(true), RECONCILE_INTERVAL_MS);
  reconcile.unref();

  // CC daily facts use their own opt-in flag. The first build is deliberately
  // separate from read enablement; missing or stale coverage always falls back
  // to canonical Legacy SQL.
  const ccKpiInitial = setTimeout(async () => {
    try {
      const processed = await rebuildCcKpiProjection(
        fastify,
        enabled(process.env.CC_KPI_DAILY_PROJECTION_INITIAL_BACKFILL)
      );
      if (processed > 0) fastify.log.info({ processed }, 'CC KPI daily projection worker cycle complete');
    } catch (error) {
      fastify.log.error({ error }, 'CC KPI daily projection worker cycle failed');
    }
  }, 45_000);
  ccKpiInitial.unref();
  const ccKpiPoll = setInterval(async () => {
    try {
      const processed = await rebuildCcKpiProjection(fastify, false);
      if (processed > 0) fastify.log.info({ processed }, 'CC KPI daily projection worker cycle complete');
    } catch (error) {
      fastify.log.error({ error }, 'CC KPI daily projection worker cycle failed');
    }
  }, CC_KPI_REBUILD_INTERVAL_MS);
  ccKpiPoll.unref();
  fastify.addHook('onClose', async () => {
    clearTimeout(firstRun);
    clearInterval(poll);
    clearInterval(reconcile);
    clearTimeout(ccKpiInitial);
    clearInterval(ccKpiPoll);
  });
  fastify.log.info({ initialBackfill, batchSize }, 'Customer visit projection worker started in shadow mode.');
}
