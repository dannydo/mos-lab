import assert from 'node:assert/strict';
import test from 'node:test';
import { UserServiceTypeService } from './user-service-type.service.js';

function createFastify(resolver: (sql: string, params: unknown[]) => unknown[]) {
  return {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => resolver(sql, params),
      },
    },
    log: { error: () => undefined },
  };
}

test('classifies combo_last from the balance transaction ledger on the booking date', async () => {
  let capturedSql = '';
  let capturedParams: unknown[] = [];
  const fastify = createFastify((sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return [{ service_group: 'LashesTop', user_service_balance_id: 81, date_expired: '2026-09-01' }];
  });

  const type = await UserServiceTypeService.determineUserServiceType(
    fastify as never,
    42,
    '2026-08-18 10:00:00',
    'LashesTop'
  );

  assert.equal(type, 'combo_last');
  assert.match(capturedSql, /FROM user_service_balance_transaction/);
  assert.match(capturedSql, /DATE\(date_created\) < \?/);
  assert.match(capturedSql, /DATE\(date_used\) = \?/);
  assert.deepEqual(capturedParams, [1, 42, 'LashesTop', '2026-08-18', '2026-08-18', '2026-08-18', '2026-08-18']);
});

test('classifies only expired balances as combo_expired', async () => {
  const fastify = createFastify((sql) => {
    if (sql.includes('user_service_balance_transaction')) {
      return [
        { service_group: 'LashesTop', user_service_balance_id: 11, date_expired: '2026-08-01' },
        { service_group: 'LashesTop', user_service_balance_id: 12, date_expired: '2026-08-01' },
      ];
    }
    return [];
  });

  const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'LashesTop');

  assert.equal(type, 'combo_expired');
});

test('keeps a live combo ahead of an older expired balance', async () => {
  const fastify = createFastify((sql) => {
    if (sql.includes('user_service_balance_transaction')) {
      return [
        { service_group: 'LashesTop', user_service_balance_id: 11, date_expired: '2026-08-01' },
        { service_group: 'LashesTop', user_service_balance_id: 12, date_expired: '2026-09-01' },
        { service_group: 'LashesTop', user_service_balance_id: 12, date_expired: '2026-09-01' },
      ];
    }
    return [];
  });

  const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'LashesTop');

  assert.equal(type, 'combo');
});

test('recognizes combo_over from a prior combo_last without a remaining balance', async () => {
  const fastify = createFastify((sql) => {
    if (sql.includes('user_service_balance_transaction')) return [];
    if (sql.includes('report_order_service')) {
      return [{ user_service_type: 'combo_last', service_group: 'LashesTop' }];
    }
    if (sql.includes('FROM user_service_balance')) return [];
    return [];
  });

  const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'LashesTop');

  assert.equal(type, 'combo_over');
});

test('uses the latest persisted legacy type and normalizes lead to lead_book', async () => {
  const fastify = createFastify((sql) => {
    if (sql.includes('user_service_balance_transaction') || sql.includes('report_order_service')) return [];
    if (sql.includes('FROM user_service_type')) return [{ user_service_type: 'lead' }];
    return [];
  });

  const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'LashesTop');

  assert.equal(type, 'lead_book');
});

test('preserves every established legacy customer segment type', async () => {
  const legacyTypes = ['new', 'combo', 'long_time', 'lapser', 'occasion', 'lost', 'game'];

  for (const legacyType of legacyTypes) {
    const fastify = createFastify((sql) => {
      if (sql.includes('user_service_balance_transaction') || sql.includes('report_order_service')) return [];
      if (sql.includes('FROM user_service_type')) return [{ user_service_type: legacyType }];
      return [];
    });

    const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'LashesTop');
    assert.equal(type, legacyType);
  }
});

test('keeps the legacy Lashes aggregate lookup across top and under service groups', async () => {
  let transactionParams: unknown[] = [];
  const fastify = createFastify((sql, params) => {
    if (sql.includes('user_service_balance_transaction')) {
      transactionParams = params;
      return [{ service_group: 'LashesUnder', user_service_balance_id: 9, date_expired: null }];
    }
    return [];
  });

  const type = await UserServiceTypeService.determineUserServiceType(fastify as never, 42, '2026-08-18', 'Lashes');

  assert.equal(type, 'combo_last');
  assert.deepEqual(transactionParams, [
    1,
    42,
    'LashesTop',
    'LashesUnder',
    '2026-08-18',
    '2026-08-18',
    '2026-08-18',
    '2026-08-18',
  ]);
});
