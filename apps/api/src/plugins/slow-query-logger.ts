import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'node:fs';
import path from 'node:path';
import { SafeAny } from '@mos-lab/shared';
import { shouldEnablePrismaQueryEvents } from './prisma.js';

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

export interface SlowQueryLoggerOptions {
  logDir?: string;
}

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;
const DEFAULT_SLOW_API_THRESHOLD_MS = 1000;

export function shouldEnableSlowApiLogging(env: NodeJS.ProcessEnv = process.env): boolean {
  return shouldEnablePrismaQueryEvents(env) || Boolean(env.SLOW_API_THRESHOLD_MS) || env.NODE_ENV !== 'production';
}

const slowQueryLoggerPlugin: FastifyPluginAsync<SlowQueryLoggerOptions> = fp(
  async (fastify: FastifyInstance, options: SlowQueryLoggerOptions = {}) => {
    const rootDir = process.cwd();
    const logDir = options.logDir || path.resolve(rootDir, 'output', 'benchmark');
    const logFilePath = path.join(logDir, 'slow-queries.jsonl');

    const slowQueryThreshold = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || DEFAULT_SLOW_QUERY_THRESHOLD_MS;
    const slowApiThreshold = Number(process.env.SLOW_API_THRESHOLD_MS) || DEFAULT_SLOW_API_THRESHOLD_MS;
    const prismaQueryEventsEnabled = shouldEnablePrismaQueryEvents();
    const slowApiLoggingEnabled = shouldEnableSlowApiLogging();

    let dirEnsured = false;
    let pendingLines: string[] = [];
    let flushPromise: Promise<void> | null = null;
    let flushScheduled = false;

    const drainToDisk = async (): Promise<void> => {
      while (pendingLines.length > 0) {
        const batch = pendingLines.splice(0, pendingLines.length);
        try {
          if (!dirEnsured) {
            await fs.promises.mkdir(logDir, { recursive: true });
            dirEnsured = true;
          }
          await fs.promises.appendFile(logFilePath, batch.join(''), 'utf-8');
        } catch (err) {
          fastify.log.warn({ err }, '[SlowQueryLogger] Failed to write to slow-queries.jsonl');
          break;
        }
      }
    };

    const flushPendingLogs = async (): Promise<void> => {
      if (flushPromise) {
        await flushPromise;
      }
      if (pendingLines.length === 0) {
        return;
      }
      flushPromise = drainToDisk().finally(() => {
        flushPromise = null;
      });
      await flushPromise;
    };

    const enqueueSlowLog = (record: SlowQueryRecord): void => {
      pendingLines.push(`${JSON.stringify(record)}\n`);
      if (!flushScheduled && !flushPromise) {
        flushScheduled = true;
        queueMicrotask(() => {
          flushScheduled = false;
          void flushPendingLogs();
        });
      }
    };

    fastify.addHook('onClose', async () => {
      await flushPendingLogs();
    });

    // Attach query listener to Prisma legacy & crm clients only when explicitly enabled
    if (prismaQueryEventsEnabled && fastify.prisma) {
      const { legacy, crm } = fastify.prisma;

      if (legacy && typeof (legacy as SafeAny).$on === 'function') {
        (legacy as SafeAny).$on('query', (e: { timestamp: Date; query: string; params: string; duration: number }) => {
          if (e.duration >= slowQueryThreshold) {
            enqueueSlowLog({
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
            enqueueSlowLog({
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

    // Hook into Fastify onResponse to track slow API endpoints asynchronously
    if (slowApiLoggingEnabled) {
      fastify.addHook('onResponse', async (request, reply) => {
        const durationMs = Math.round(reply.elapsedTime);
        if (
          durationMs >= slowApiThreshold &&
          !request.url.startsWith('/api/benchmark') &&
          !request.url.startsWith('/api/ag-task-bridge/chat/next')
        ) {
          enqueueSlowLog({
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
    }

    // Endpoints to manage benchmark logs
    fastify.get('/api/benchmark/slow-queries', async () => {
      await flushPendingLogs();
      try {
        const content = await fs.promises.readFile(logFilePath, 'utf-8');
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
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
          return { slowQueries: [], count: 0 };
        }
        throw err;
      }
    });

    fastify.delete('/api/benchmark/slow-queries', async () => {
      pendingLines = [];
      await flushPendingLogs();
      try {
        await fs.promises.access(logFilePath);
        await fs.promises.writeFile(logFilePath, '', 'utf-8');
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
          throw err;
        }
      }
      return { success: true, message: 'Slow query log cleared' };
    });
  }
);

export default slowQueryLoggerPlugin;
