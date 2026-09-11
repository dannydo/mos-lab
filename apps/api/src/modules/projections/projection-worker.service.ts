import type { FastifyInstance } from 'fastify';
import { CustomerVisitProjectionService } from './customer-visit-projection.service.js';

const POLL_INTERVAL_MS = 60_000;
const RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 200;

function enabled(value: string | undefined): boolean {
  return value === 'true';
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
  fastify.addHook('onClose', async () => {
    clearTimeout(firstRun);
    clearInterval(poll);
    clearInterval(reconcile);
  });
  fastify.log.info({ initialBackfill, batchSize }, 'Customer visit projection worker started in shadow mode.');
}
