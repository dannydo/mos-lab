import Fastify from 'fastify';
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import prismaPlugin from '../plugins/prisma.js';
import { CcKpiService } from '../modules/kpi/services/cc-kpi.service.js';
import { CcKpiDailyProjectionService } from '../modules/projections/cc-kpi-daily-projection.service.js';

dotenv.config();

function percentile(samples: number[], p: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function stablePayload(value: { data: readonly unknown[]; summary?: unknown; activeStaff?: readonly unknown[] }) {
  return {
    data: [...value.data].sort((left, right) =>
      String((left as { id?: unknown }).id).localeCompare(String((right as { id?: unknown }).id))
    ),
    summary: value.summary,
    activeStaff: [...(value.activeStaff || [])].sort(
      (left, right) => Number((left as { userId?: unknown }).userId) - Number((right as { userId?: unknown }).userId)
    ),
  };
}

async function main() {
  const app = Fastify({ logger: false });
  await app.register(prismaPlugin);
  await app.ready();

  try {
    const latestRows = await app.prisma.legacy.$queryRawUnsafe<Array<{ latestAt: Date | null }>>(`
      SELECT MAX(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) AS latestAt
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.order_state = 'Completed'
    `);
    const latest = latestRows[0]?.latestAt;
    if (!latest) throw new Error('No completed orders available for CC KPI benchmark.');

    const end = new Date(latest);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    const dateFrom = dateKey(start);
    const dateTo = dateKey(end);
    // Call the canonical service directly. The leaderboard route has a
    // short-lived response cache, which would hide the SQL cost we need to
    // optimize and would make a projection comparison invalid.
    const request = () => CcKpiService.getCcDailySalesBonus(app, { dateFrom, dateTo, storeId: 'ALL' });

    for (let index = 0; index < 3; index += 1) {
      await request();
    }

    const samples: number[] = [];
    let outputHash = '';
    let canonical: Awaited<ReturnType<typeof request>> | null = null;
    for (let index = 0; index < 10; index += 1) {
      const startedAt = performance.now();
      const response = await request();
      const elapsedMs = performance.now() - startedAt;
      samples.push(elapsedMs);
      canonical = response;
      outputHash = createHash('sha256')
        .update(JSON.stringify(stablePayload(response)))
        .digest('hex');
    }

    if (!canonical) throw new Error('Canonical benchmark did not return a result.');
    const projectionInput = JSON.parse(JSON.stringify(canonical));
    const materializedDays = await CcKpiDailyProjectionService.materializeCanonicalRange(
      app,
      projectionInput,
      'ALL',
      dateFrom,
      dateTo
    );
    const projectionSamples: number[] = [];
    let projectionHash = '';
    for (let index = 0; index < 10; index += 1) {
      const startedAt = performance.now();
      const response = await CcKpiDailyProjectionService.readRange(
        app,
        dateFrom,
        dateTo,
        'ALL',
        canonical.activeStaff?.map((staff) => Number(staff.userId)) || []
      );
      if (!response) throw new Error('Projection coverage or active-CC parity check failed.');
      projectionSamples.push(performance.now() - startedAt);
      projectionHash = createHash('sha256')
        .update(JSON.stringify(stablePayload(response)))
        .digest('hex');
    }
    const activeCcIds = canonical.activeStaff?.map((staff) => Number(staff.userId)) || [];
    const changedActiveCcFallback = await CcKpiDailyProjectionService.readRange(app, dateFrom, dateTo, 'ALL', [-1]);
    const missingCoverageDate = dateKey(new Date(new Date(`${dateFrom}T00:00:00.000Z`).getTime() - 366 * 86_400_000));
    const missingCoverageFallback = await CcKpiDailyProjectionService.readRange(
      app,
      missingCoverageDate,
      dateTo,
      'ALL',
      activeCcIds
    );
    process.env.CC_KPI_DAILY_PROJECTION_READ_ENABLED = 'true';
    const guardedReadSamples: number[] = [];
    let guardedReadHash = '';
    for (let index = 0; index < 10; index += 1) {
      const startedAt = performance.now();
      const response = await request();
      guardedReadSamples.push(performance.now() - startedAt);
      guardedReadHash = createHash('sha256')
        .update(JSON.stringify(stablePayload(response)))
        .digest('hex');
    }
    delete process.env.CC_KPI_DAILY_PROJECTION_READ_ENABLED;

    console.log(
      JSON.stringify(
        {
          service: 'CcKpiService.getCcDailySalesBonus (canonical, cache bypassed)',
          dateFrom,
          dateTo,
          warmups: 3,
          iterations: samples.length,
          latencyMs: {
            min: Math.round(Math.min(...samples)),
            p50: percentile(samples, 0.5),
            p95: percentile(samples, 0.95),
            max: Math.round(Math.max(...samples)),
            average: Math.round(samples.reduce((sum, sample) => sum + sample, 0) / samples.length),
          },
          outputHash,
          projection: {
            materializedDays,
            latencyMs: {
              min: Math.round(Math.min(...projectionSamples)),
              p50: percentile(projectionSamples, 0.5),
              p95: percentile(projectionSamples, 0.95),
              max: Math.round(Math.max(...projectionSamples)),
              average: Math.round(
                projectionSamples.reduce((sum, sample) => sum + sample, 0) / projectionSamples.length
              ),
            },
            outputHash: projectionHash,
            parityMatch: outputHash === projectionHash,
            activeCcChangeFallsBack: changedActiveCcFallback === null,
            missingCoverageFallsBack: missingCoverageFallback === null,
            guardedApiRead: {
              p95: percentile(guardedReadSamples, 0.95),
              outputHash: guardedReadHash,
              parityMatch: outputHash === guardedReadHash,
            },
          },
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
