import { createHash } from 'node:crypto';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { CcKpiService } from '../modules/kpi/services/cc-kpi.service.js';

const legacy = new LegacyPrismaClient({ datasources: { db: { url: process.env.LEGACY_DATABASE_URL } } });
const crm = new CrmPrismaClient({ datasources: { db: { url: process.env.CRM_DATABASE_URL } } });

const dateTo = process.env.CC_KPI_BENCHMARK_DATE_TO ?? '2026-09-11';
const dateFrom = process.env.CC_KPI_BENCHMARK_DATE_FROM ?? '2026-09-09';
const samples = Number(process.env.CC_KPI_BENCHMARK_SAMPLES ?? 10);

const fastify = {
  prisma: { legacy, crm },
  log: { warn: () => undefined, error: () => undefined },
} as never;

function percentile(values: number[], percentileValue: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * percentileValue) - 1] ?? 0;
}

function normalize(value: unknown): string {
  const response = value as { data: Array<Record<string, unknown>>; summary?: unknown };
  return JSON.stringify({
    data: [...response.data].sort((left, right) => String(left.id).localeCompare(String(right.id))),
    summary: response.summary,
  });
}

async function measure(): Promise<void> {
  await Promise.all([legacy.$connect(), crm.$connect()]);
  try {
    const filters = { dateFrom, dateTo, storeId: 'ALL' };
    const warmup = await CcKpiService.getCcDailySalesBonus(fastify, filters);
    const expectedHash = createHash('sha256').update(normalize(warmup)).digest('hex');
    const timings: number[] = [];

    for (let iteration = 0; iteration < samples; iteration += 1) {
      const startedAt = performance.now();
      const result = await CcKpiService.getCcDailySalesBonus(fastify, filters);
      timings.push(performance.now() - startedAt);
      const actualHash = createHash('sha256').update(normalize(result)).digest('hex');
      if (actualHash !== expectedHash) throw new Error(`Response hash changed on sample ${iteration + 1}`);
    }

    const report = {
      kind: 'canonical-cc-kpi-daily-sales',
      window: { dateFrom, dateTo },
      samples,
      p50Ms: Number(percentile(timings, 0.5).toFixed(2)),
      p95Ms: Number(percentile(timings, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...timings).toFixed(2)),
      responseHash: expectedHash,
      rows: warmup.data.length,
    };
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await Promise.all([legacy.$disconnect(), crm.$disconnect()]);
  }
}

void measure();
