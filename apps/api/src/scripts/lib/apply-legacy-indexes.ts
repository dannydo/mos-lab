import { PrismaClient as LegacyPrismaClient } from '../../generated/legacy-client/index.js';

export interface LegacyIndexDefinition {
  name: string;
  table: string;
  columns: readonly string[];
}

export interface LegacyIndexQueryClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
}

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``;

/**
 * Ensures missing legacy indexes online (`ALGORITHM=INPLACE, LOCK=NONE`, 3s DDL lock timeout)
 * and runs `ANALYZE TABLE` ONLY for tables where a new index was actually created.
 * Avoiding unconditional `ANALYZE TABLE` on every deploy prevents MariaDB 10.3
 * `Waiting for table flush` pileups during live production traffic.
 */
export async function ensureLegacyIndexesSafely(
  client: LegacyIndexQueryClient,
  indexes: readonly LegacyIndexDefinition[],
  options?: { lockWaitTimeoutSeconds?: number }
): Promise<{ createdIndexes: string[]; modifiedTables: string[]; analyzedTables: string[] }> {
  const lockTimeoutSec = Math.max(1, Math.min(30, options?.lockWaitTimeoutSeconds ?? 3));

  try {
    await client.$executeRawUnsafe(`SET SESSION lock_wait_timeout = ${lockTimeoutSec}`);
  } catch (err) {
    console.warn('Could not set lock_wait_timeout before index check (continuing safely):', err);
  }

  const indexNamesSql = indexes.map((index) => `'${index.name.replace(/'/g, "''")}'`).join(', ');
  const existing =
    indexes.length > 0
      ? await client.$queryRawUnsafe<Array<{ index_name: string }>>(
          `SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name IN (${indexNamesSql})`
        )
      : [];
  const existingNames = new Set(existing.map((index) => index.index_name));

  const createdIndexes: string[] = [];
  const modifiedTablesSet = new Set<string>();

  for (const index of indexes) {
    if (existingNames.has(index.name)) {
      console.log(`Index already present: ${index.name}`);
      continue;
    }

    const colsSql = index.columns.map(quoteIdentifier).join(', ');
    const onlineDdl = `ALTER TABLE ${quoteIdentifier(index.table)} ADD INDEX ${quoteIdentifier(index.name)} (${colsSql}), ALGORITHM=INPLACE, LOCK=NONE`;
    const fallbackDdl = `CREATE INDEX ${quoteIdentifier(index.name)} ON ${quoteIdentifier(index.table)} (${colsSql})`;

    console.log(`Creating index: ${index.name} on ${index.table}...`);
    try {
      await client.$executeRawUnsafe(onlineDdl);
      console.log(`Successfully created index: ${index.name}`);
      createdIndexes.push(index.name);
      modifiedTablesSet.add(index.table);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Duplicate key name')) {
        console.log(`Index already present after concurrent DDL: ${index.name}`);
        continue;
      }
      if (msg.includes('ALGORITHM=INPLACE is not supported') || msg.includes('LOCK=NONE is not supported')) {
        console.warn(`Online INPLACE/LOCK=NONE unsupported for ${index.name}, retrying standard DDL...`);
        await client.$executeRawUnsafe(fallbackDdl);
        console.log(`Successfully created index: ${index.name}`);
        createdIndexes.push(index.name);
        modifiedTablesSet.add(index.table);
        continue;
      }
      throw error;
    }
  }

  const modifiedTables = Array.from(modifiedTablesSet);
  const analyzedTables: string[] = [];

  if (modifiedTables.length > 0) {
    console.log(`Refreshing optimizer statistics for newly indexed tables: ${modifiedTables.join(', ')}...`);
    try {
      await client.$executeRawUnsafe(`SET SESSION lock_wait_timeout = ${lockTimeoutSec}`);
      await client.$executeRawUnsafe(`ANALYZE TABLE ${modifiedTables.map(quoteIdentifier).join(', ')}`);
      analyzedTables.push(...modifiedTables);
      console.log('Optimizer statistics refreshed successfully.');
    } catch (analyzeError) {
      // Never block or fail a live deployment if ANALYZE TABLE hits a short lock wait timeout.
      console.warn('Skipped ANALYZE TABLE due to lock contention (safe to skip):', analyzeError);
    }
  } else {
    console.log('All indexes already present; skipping ANALYZE TABLE to avoid flush locks.');
  }

  return { createdIndexes, modifiedTables, analyzedTables };
}

export function createLegacyIndexClient(): LegacyPrismaClient {
  return new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });
}
