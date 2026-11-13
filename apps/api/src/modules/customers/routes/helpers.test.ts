import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyInstance } from 'fastify';
import { resolveOrderCountsFilter } from './helpers.js';

function createMockFastify(
  queryResult: Array<{ user_id: number | bigint }>,
  captured?: { sql?: string; params?: unknown[] }
) {
  return {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          if (captured) {
            captured.sql = sql;
            captured.params = params;
          }
          return queryResult;
        },
      },
    },
  } as unknown as FastifyInstance;
}

test('resolveOrderCountsFilter returns unchanged scopes when no filter is active', async () => {
  const fastify = createMockFastify([]);
  const res = await resolveOrderCountsFilter(fastify, {}, [1, 2], [9]);
  assert.deepEqual(res, { allowedUserIds: [1, 2], excludedUserIds: [9], isEmpty: false });
});

test('resolveOrderCountsFilter short-circuits when allowedUserIds is already empty', async () => {
  const captured: { sql?: string } = {};
  const fastify = createMockFastify([], captured);
  const res = await resolveOrderCountsFilter(fastify, { totalSpentMin: '1000000' }, [], null);
  assert.equal(captured.sql, undefined);
  assert.deepEqual(res, { allowedUserIds: [], excludedUserIds: null, isEmpty: true });
});

test('resolveOrderCountsFilter intersects positive matches when zero does not satisfy filter', async () => {
  const captured: { sql?: string; params?: unknown[] } = {};
  const fastify = createMockFastify([{ user_id: 2 }, { user_id: 3n }], captured);
  const res = await resolveOrderCountsFilter(
    fastify,
    { totalSpentMin: '1000000', totalVisitsMax: '5' },
    [1, 2, 4],
    [9]
  );

  assert.match(captured.sql || '', /HAVING COALESCE\(SUM\(total_price\), 0\) >= \? AND COUNT\(\*\) <= \?/);
  assert.match(captured.sql || '', /AND user_id IN \(1,2,4\)/);
  assert.deepEqual(captured.params, [1000000, 5]);
  assert.deepEqual(res, { allowedUserIds: [2], excludedUserIds: [9], isEmpty: false });
});

test('resolveOrderCountsFilter uses exclusion list when zero satisfies filter', async () => {
  const captured: { sql?: string; params?: unknown[] } = {};
  const fastify = createMockFastify([{ user_id: 10 }, { user_id: 20 }], captured);
  const res = await resolveOrderCountsFilter(fastify, { totalSpentMax: '500000' }, null, [5, 10]);

  assert.match(captured.sql || '', /HAVING NOT \(COALESCE\(SUM\(total_price\), 0\) <= \?\)/);
  assert.deepEqual(captured.params, [500000]);
  assert.deepEqual(res, { allowedUserIds: null, excludedUserIds: [5, 10, 20], isEmpty: false });
});

test('resolveOrderCountsFilter removes rejected IDs from allowedUserIds when zero satisfies filter', async () => {
  const fastify = createMockFastify([{ user_id: 2 }]);
  const res = await resolveOrderCountsFilter(fastify, { totalVisitsMax: '2' }, [1, 2, 3], null);
  assert.deepEqual(res, { allowedUserIds: [1, 3], excludedUserIds: null, isEmpty: false });
});
