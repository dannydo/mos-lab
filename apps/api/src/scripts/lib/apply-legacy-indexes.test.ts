import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureLegacyIndexesSafely, LegacyIndexDefinition, LegacyIndexQueryClient } from './apply-legacy-indexes.js';

const sampleIndexes: readonly LegacyIndexDefinition[] = [
  { name: 'idx_a', table: 'order_service', columns: ['order_id'] },
  { name: 'idx_b', table: 'user_contact', columns: ['user_id'] },
];

test('ensureLegacyIndexesSafely skips ANALYZE TABLE completely when all indexes already exist', async () => {
  const executedSql: string[] = [];
  const client: LegacyIndexQueryClient = {
    async $queryRawUnsafe() {
      return [{ index_name: 'idx_a' }, { index_name: 'idx_b' }] as never;
    },
    async $executeRawUnsafe(sql: string) {
      executedSql.push(sql);
      return 0;
    },
  };

  const res = await ensureLegacyIndexesSafely(client, sampleIndexes);
  assert.deepEqual(res, { createdIndexes: [], modifiedTables: [], analyzedTables: [] });
  assert.equal(
    executedSql.some((s) => s.includes('ANALYZE TABLE')),
    false
  );
  assert.equal(
    executedSql.some((s) => s.includes('CREATE INDEX') || s.includes('ADD INDEX')),
    false
  );
});

test('ensureLegacyIndexesSafely uses INPLACE LOCK=NONE and analyzes only tables with newly created indexes', async () => {
  const executedSql: string[] = [];
  const client: LegacyIndexQueryClient = {
    async $queryRawUnsafe() {
      return [{ index_name: 'idx_b' }] as never;
    },
    async $executeRawUnsafe(sql: string) {
      executedSql.push(sql);
      return 0;
    },
  };

  const res = await ensureLegacyIndexesSafely(client, sampleIndexes, { lockWaitTimeoutSeconds: 3 });
  assert.deepEqual(res, {
    createdIndexes: ['idx_a'],
    modifiedTables: ['order_service'],
    analyzedTables: ['order_service'],
  });
  assert.ok(executedSql.includes('SET SESSION lock_wait_timeout = 3'));
  assert.ok(
    executedSql.some((s) =>
      s.includes('ALTER TABLE `order_service` ADD INDEX `idx_a` (`order_id`), ALGORITHM=INPLACE, LOCK=NONE')
    )
  );
  assert.ok(executedSql.includes('ANALYZE TABLE `order_service`'));
  assert.equal(
    executedSql.some((s) => s.includes('user_contact')),
    false
  );
});

test('ensureLegacyIndexesSafely does not fail if ANALYZE TABLE hits lock timeout after index creation', async () => {
  const client: LegacyIndexQueryClient = {
    async $queryRawUnsafe() {
      return [] as never;
    },
    async $executeRawUnsafe(sql: string) {
      if (sql.startsWith('ANALYZE TABLE')) {
        throw new Error('Lock wait timeout exceeded');
      }
      return 0;
    },
  };

  const res = await ensureLegacyIndexesSafely(client, [sampleIndexes[0]!]);
  assert.deepEqual(res, {
    createdIndexes: ['idx_a'],
    modifiedTables: ['order_service'],
    analyzedTables: [],
  });
});
