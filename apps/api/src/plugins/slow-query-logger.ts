import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'node:fs';
import path from 'node:path';
import { SafeAny } from '@mos-lab/shared';

export interface SlowQueryRecord {
  type: 'PRISMA_QUERY' | 'SLOW_API';
  source?: 'legacy' | 'crm' | 'fastify';
  timestamp: string;
  durationMs: number;
  query?: string;
  params?: string;
  method?: string;
  url?: string;
  statusCode?: number;
}

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;
const DEFAULT_SLOW_API_THRESHOLD_MS = 1000;

const slowQueryLoggerPlugin: FastifyPluginAsync = fp(async (fastify: FastifyInstance) => {
  const rootDir = process.cwd();
  const logDir = path.resolve(rootDir, 'output', 'benchmark');
  const logFilePath = path.join(logDir, 'slow-queries.jsonl');

  const slowQueryThreshold = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  const slowApiThreshold = Number(process.env.SLOW_API_THRESHOLD_MS) || DEFAULT_SLOW_API_THRESHOLD_MS;

  const appendSlowLog = (record: SlowQueryRecord) => {
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const line = JSON.stringify(record) + '\n';
      fs.appendFileSync(logFilePath, line, 'utf-8');
    } catch (err) {
      fastify.log.warn({ err }, '[SlowQueryLogger] Failed to write to slow-queries.jsonl');
    }
  };

  // Attach query listener to Prisma legacy & crm clients if available
  if (fastify.prisma) {
    const { legacy, crm } = fastify.prisma;

    if (legacy && typeof (legacy as SafeAny).$on === 'function') {
      (legacy as SafeAny).$on('query', (e: { timestamp: Date; query: string; params: string; duration: number }) => {
        if (e.duration >= slowQueryThreshold) {
          appendSlowLog({
            type: 'PRISMA_QUERY',
            source: 'legacy',
            timestamp: new Date().toISOString(),
            durationMs: e.duration,
            query: e.query,
            params: e.params,
          });
        }
      });
    }

    if (crm && typeof (crm as SafeAny).$on === 'function') {
      (crm as SafeAny).$on('query', (e: { timestamp: Date; query: string; params: string; duration: number }) => {
        if (e.duration >= slowQueryThreshold) {
          appendSlowLog({
            type: 'PRISMA_QUERY',
            source: 'crm',
            timestamp: new Date().toISOString(),
            durationMs: e.duration,
            query: e.query,
            params: e.params,
          });
        }
      });
    }
  }

  // Hook into Fastify onResponse to track slow API endpoints
  fastify.addHook('onResponse', async (request, reply) => {
    const durationMs = Math.round(reply.elapsedTime);
    if (durationMs >= slowApiThreshold && !request.url.startsWith('/api/benchmark')) {
      appendSlowLog({
        type: 'SLOW_API',
        source: 'fastify',
        timestamp: new Date().toISOString(),
        durationMs,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
      });
    }
  });

  // Endpoints to manage benchmark logs
  fastify.get('/api/benchmark/slow-queries', async () => {
    if (!fs.existsSync(logFilePath)) {
      return { slowQueries: [], count: 0 };
    }
    const content = fs.readFileSync(logFilePath, 'utf-8');
    const records = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as SlowQueryRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is SlowQueryRecord => r !== null);

    return {
      slowQueries: records,
      count: records.length,
      thresholds: {
        slowQueryThresholdMs: slowQueryThreshold,
        slowApiThresholdMs: slowApiThreshold,
      },
    };
  });

  fastify.delete('/api/benchmark/slow-queries', async () => {
    if (fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, '', 'utf-8');
    }
    return { success: true, message: 'Slow query log cleared' };
  });
});

export default slowQueryLoggerPlugin;
