import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cachePlugin from '../../../plugins/cache.js';
import { getPaginatedReferrals } from './customer-referrals.helper.js';

test('getPaginatedReferrals enforces default pagination, parameterized search, tabCounts, and 60s caching', async () => {
  const fastify = Fastify({ logger: false });
  await fastify.register(cachePlugin);

  const sqlCalls: Array<{ sql: string; params: unknown[] }> = [];
  fastify.decorate('prisma', {
    legacy: {
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        sqlCalls.push({ sql, params });
        if (sql.includes('COUNT(DISTINCT up.referrer_user_id) AS all_time')) {
          return [
            {
              all_time: 42n,
              this_month: 3n,
              last_month: 5n,
              this_year: 12n,
              last_year: 19n,
            },
          ];
        }
        if (sql.includes('GROUP BY up.referrer_user_id')) {
          return [
            {
              referrerId: 101n,
              referrerName: 'Nguyễn Minh Anh',
              referrerPhone: '0901234567',
              totalReferred: 2n,
            },
          ];
        }
        if (sql.includes('FROM user u')) {
          return [
            {
              referredId: 201n,
              referredName: 'Lê Thu Hà',
              referredPhone: '0908889999',
              dateCreated: '2026-11-10T03:00:00.000Z',
              referrerId: 101n,
            },
            {
              referredId: 201n,
              referredName: 'Lê Thu Hà',
              referredPhone: '0907776666',
              dateCreated: '2026-11-10T03:00:00.000Z',
              referrerId: 101n,
            },
          ];
        }
        if (sql.includes('FROM user_balance_transaction')) {
          return [
            {
              referrerId: 101n,
              amount: 50,
              tracking_key: JSON.stringify({ user_id: 201 }),
            },
          ];
        }
        return [];
      },
    },
    crm: {},
  } as never);

  const first = await getPaginatedReferrals(fastify, { search: 'Minh Anh', timeFilter: 'this_month' });
  assert.equal(first.page, 1);
  assert.equal(first.pageSize, 20);
  assert.equal(first.total, 3);
  assert.deepEqual(first.tabCounts, {
    all_time: 42,
    this_month: 3,
    last_month: 5,
    this_year: 12,
    last_year: 19,
  });
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].referrerId, 101);
  assert.equal(first.items[0].totalRewardDiamonds, 50);
  assert.equal(first.items[0].referredUsers.length, 1);
  assert.equal(first.items[0].referredUsers[0].phone, '0908889999, 0907776666');

  // Verify LIMIT/OFFSET and parameterized LIKE are passed cleanly
  const referrerQuery = sqlCalls.find((c) => c.sql.includes('GROUP BY up.referrer_user_id'));
  assert.ok(referrerQuery);
  assert.ok(referrerQuery!.sql.includes('LIMIT ? OFFSET ?'));
  assert.deepEqual(referrerQuery!.params, ['%Minh Anh%', '%Minh Anh%', 20, 0]);

  const callCountAfterFirst = sqlCalls.length;
  const second = await getPaginatedReferrals(fastify, { search: 'minh anh', timeFilter: 'this_month' });
  assert.equal(sqlCalls.length, callCountAfterFirst);
  assert.equal(second.total, 3);

  const clamped = await getPaginatedReferrals(fastify, { page: 2, pageSize: 999 });
  assert.equal(clamped.page, 2);
  assert.equal(clamped.pageSize, 100);

  await fastify.close();
});
