import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { performance } from 'node:perf_hooks';
import prismaPlugin from '../plugins/prisma.js';
import { registerDashboardRoutes } from '../modules/customers/routes/dashboard.routes.js';

dotenv.config();

const args = process.argv.slice(2);
const readArg = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const date = readArg('--date', new Date().toISOString().slice(0, 10));
const iterations = Math.max(1, Number(readArg('--iterations', '9')) || 9);
const warmups = Math.max(0, Number(readArg('--warmups', '2')) || 2);

interface DashboardSummary {
  bookingCounts: Record<string, number>;
  branches: Record<string, { cc: number; cv: number; coming: number; revenue: number }>;
}

function summarize(payload: Record<string, unknown>): DashboardSummary {
  const branchesData = (payload.branchesData || {}) as Record<string, Record<string, unknown>>;
  const branches = Object.fromEntries(
    Object.entries(branchesData).map(([key, value]) => [
      key,
      {
        cc: Array.isArray(value.cc) ? value.cc.length : 0,
        cv: Array.isArray(value.cv) ? value.cv.length : 0,
        coming: Array.isArray(value.coming) ? value.coming.length : 0,
        revenue: Number(value.revLe || 0) + Number(value.revCombo || 0) + Number(value.revProduct || 0),
      },
    ])
  );

  return {
    bookingCounts: {
      combo: Array.isArray(payload.bookingsCombo) ? payload.bookingsCombo.length : 0,
      oc: Array.isArray(payload.bookingsOc) ? payload.bookingsOc.length : 0,
      other: Array.isArray(payload.bookingsOther) ? payload.bookingsOther.length : 0,
    },
    branches,
  };
}

function percentile(samples: number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]);
}

async function main() {
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'benchmark-dashboard-today' });
  await app.register(prismaPlugin);
  await app.register(registerDashboardRoutes, { prefix: '/api' });
  await app.ready();

  const token = app.jwt.sign({ id: 1, username: 'admin', role: 'admin', displayName: 'Benchmark Admin' });
  const request = () =>
    app.inject({
      method: 'GET',
      url: `/api/dashboard/today?dateFrom=${date}&dateTo=${date}`,
      headers: { authorization: `Bearer ${token}` },
    });

  try {
    for (let index = 0; index < warmups; index += 1) {
      const response = await request();
      if (response.statusCode !== 200)
        throw new Error(`Warm-up ${index + 1} failed: ${response.statusCode} ${response.payload}`);
    }

    const samples: number[] = [];
    let summary: DashboardSummary | null = null;
    for (let index = 0; index < iterations; index += 1) {
      const startedAt = performance.now();
      const response = await request();
      const elapsedMs = performance.now() - startedAt;
      if (response.statusCode !== 200)
        throw new Error(`Run ${index + 1} failed: ${response.statusCode} ${response.payload}`);
      samples.push(elapsedMs);
      summary = summarize(JSON.parse(response.payload) as Record<string, unknown>);
    }

    console.log(
      JSON.stringify(
        {
          endpoint: '/api/dashboard/today',
          date,
          warmups,
          iterations,
          latencyMs: {
            min: Math.round(Math.min(...samples)),
            p50: percentile(samples, 0.5),
            p95: percentile(samples, 0.95),
            max: Math.round(Math.max(...samples)),
            average: Math.round(samples.reduce((sum, sample) => sum + sample, 0) / samples.length),
            samples: samples.map((sample) => Math.round(sample)),
          },
          dataSnapshot: summary,
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
