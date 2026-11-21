import { FastifyInstance } from 'fastify';
import mysql from 'mysql2/promise';

let legacyPool: mysql.Pool | null = null;
let crmPool: mysql.Pool | null = null;

const shutdownHookRegistered = new WeakSet<FastifyInstance>();

/**
 * Fail-fast guards so a slow database produces a quick error instead of requests queueing forever
 * (see 2026-11-21 incident: /chat/sync took 76s and MAI mentions were silently skipped).
 * - connectTimeout: give up opening a new connection after 10s.
 * - queueLimit: reject instead of queueing unbounded when all connections are busy.
 * - max_statement_time (MariaDB, seconds): server aborts any single statement running longer than the limit.
 *   Override with MOS_DB_STATEMENT_TIMEOUT_SEC (0 disables). Unsupported servers (MySQL) simply ignore it.
 */
const POOL_CONNECT_TIMEOUT_MS = 10_000;
const POOL_QUEUE_LIMIT = 500;

export function resolveStatementTimeoutSec(raw: string | undefined = process.env.MOS_DB_STATEMENT_TIMEOUT_SEC): number {
  if (raw === undefined || raw.trim() === '') return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 30;
  return Math.floor(parsed);
}

function applyStatementTimeout(pool: mysql.Pool): void {
  const seconds = resolveStatementTimeoutSec();
  if (seconds <= 0) return;
  const corePool = (
    pool as unknown as { pool?: { on?: (event: string, cb: (conn: mysql.Connection) => void) => void } }
  ).pool;
  corePool?.on?.('connection', (conn) => {
    // Callback API on the underlying connection; ignore errors (e.g. variable unsupported on MySQL).
    (conn as unknown as { query: (sql: string, cb: (err: unknown) => void) => void }).query(
      `SET SESSION max_statement_time=${seconds}`,
      () => undefined
    );
  });
}

export function getLegacyPool(): mysql.Pool {
  if (!legacyPool) {
    const dbUrl = process.env.LEGACY_DATABASE_URL;
    if (!dbUrl) {
      throw new Error('LEGACY_DATABASE_URL environment variable is required');
    }
    legacyPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: POOL_QUEUE_LIMIT,
      connectTimeout: POOL_CONNECT_TIMEOUT_MS,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    applyStatementTimeout(legacyPool);
  }
  return legacyPool;
}

export function getCrmPool(): mysql.Pool {
  if (!crmPool) {
    const dbUrl = process.env.CRM_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('CRM_DATABASE_URL or DATABASE_URL environment variable is required');
    }
    crmPool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: POOL_QUEUE_LIMIT,
      connectTimeout: POOL_CONNECT_TIMEOUT_MS,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    applyStatementTimeout(crmPool);
  }
  return crmPool;
}

export async function closeIosDbPools(): Promise<void> {
  const activeLegacy = legacyPool;
  const activeCrm = crmPool;
  legacyPool = null;
  crmPool = null;

  await Promise.allSettled([
    activeLegacy ? activeLegacy.end() : Promise.resolve(),
    activeCrm ? activeCrm.end() : Promise.resolve(),
  ]);
}

export function registerIosPoolShutdown(fastify: FastifyInstance): void {
  if (shutdownHookRegistered.has(fastify)) {
    return;
  }
  shutdownHookRegistered.add(fastify);

  fastify.addHook('onClose', async () => {
    await closeIosDbPools();
  });
}
