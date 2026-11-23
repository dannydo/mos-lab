import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { shouldEnablePrismaQueryEvents } from './prisma.js';
import slowQueryLoggerPlugin, { shouldEnableSlowApiLogging } from './slow-query-logger.js';

test('shouldEnablePrismaQueryEvents only enables Prisma query events when explicitly configured', () => {
  assert.equal(shouldEnablePrismaQueryEvents({}), false);
  assert.equal(shouldEnablePrismaQueryEvents({ NODE_ENV: 'production' }), false);
  assert.equal(shouldEnablePrismaQueryEvents({ ENABLE_SLOW_QUERY_LOGGER: 'false' }), false);
  assert.equal(shouldEnablePrismaQueryEvents({ ENABLE_SLOW_QUERY_LOGGER: 'true' }), true);
  assert.equal(shouldEnablePrismaQueryEvents({ SLOW_QUERY_THRESHOLD_MS: '250' }), true);
  assert.equal(shouldEnableSlowApiLogging({ NODE_ENV: 'production' }), false);
  assert.equal(shouldEnableSlowApiLogging({ NODE_ENV: 'production', SLOW_API_THRESHOLD_MS: '500' }), true);
});

test('slowQueryLoggerPlugin buffers Prisma query logs asynchronously and supports read/clear/onClose flush', async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mos-slow-query-test-'));
  const prevEnable = process.env.ENABLE_SLOW_QUERY_LOGGER;
  const prevThreshold = process.env.SLOW_QUERY_THRESHOLD_MS;

  process.env.ENABLE_SLOW_QUERY_LOGGER = 'true';
  process.env.SLOW_QUERY_THRESHOLD_MS = '100';

  type QueryHandler = (e: { timestamp: Date; query: string; params: string; duration: number }) => void;
  const handlers: { legacy: QueryHandler | null; crm: QueryHandler | null } = {
    legacy: null,
    crm: null,
  };

  const fastify = Fastify({ logger: false });
  fastify.decorate('prisma', {
    legacy: {
      $on: (_event: string, cb: QueryHandler) => {
        handlers.legacy = cb;
      },
    },
    crm: {
      $on: (_event: string, cb: QueryHandler) => {
        handlers.crm = cb;
      },
    },
  } as never);

  try {
    await fastify.register(slowQueryLoggerPlugin, { logDir: tempDir });
    await fastify.ready();

    assert.ok(handlers.legacy);
    assert.ok(handlers.crm);

    handlers.legacy({ timestamp: new Date(), query: 'SELECT 1', params: '[]', duration: 40 });
    handlers.legacy({ timestamp: new Date(), query: 'SELECT * FROM user', params: '[]', duration: 240 });
    handlers.crm({ timestamp: new Date(), query: 'SELECT * FROM crm_config', params: '[]', duration: 150 });

    const resBeforeClear = await fastify.inject({ method: 'GET', url: '/api/benchmark/slow-queries' });
    assert.equal(resBeforeClear.statusCode, 200);
    const body = resBeforeClear.json() as { count: number; slowQueries: Array<{ source: string; durationMs: number }> };
    assert.equal(body.count, 2);
    assert.deepEqual(
      body.slowQueries.map((r) => [r.source, r.durationMs]),
      [
        ['legacy', 240],
        ['crm', 150],
      ]
    );

    const delRes = await fastify.inject({ method: 'DELETE', url: '/api/benchmark/slow-queries' });
    assert.equal(delRes.statusCode, 200);

    const resAfterClear = await fastify.inject({ method: 'GET', url: '/api/benchmark/slow-queries' });
    assert.equal(resAfterClear.statusCode, 200);
    assert.equal((resAfterClear.json() as { count: number }).count, 0);

    handlers.crm({ timestamp: new Date(), query: 'SELECT 2', params: '[]', duration: 310 });
    await fastify.close();

    const fileContent = await fs.promises.readFile(path.join(tempDir, 'slow-queries.jsonl'), 'utf-8');
    const lines = fileContent.trim().split('\n').filter(Boolean);
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).durationMs, 310);
  } finally {
    if (prevEnable === undefined) delete process.env.ENABLE_SLOW_QUERY_LOGGER;
    else process.env.ENABLE_SLOW_QUERY_LOGGER = prevEnable;

    if (prevThreshold === undefined) delete process.env.SLOW_QUERY_THRESHOLD_MS;
    else process.env.SLOW_QUERY_THRESHOLD_MS = prevThreshold;

    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
