import { FastifyInstance } from 'fastify';
import mysql from 'mysql2/promise';

let legacyPool: mysql.Pool | null = null;
let crmPool: mysql.Pool | null = null;

const shutdownHookRegistered = new WeakSet<FastifyInstance>();

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
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
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
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
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
