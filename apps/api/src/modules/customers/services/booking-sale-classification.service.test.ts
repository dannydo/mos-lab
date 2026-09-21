import assert from 'node:assert/strict';
import test from 'node:test';
import { BookingSaleClassificationService } from './booking-sale-classification.service.js';

function createMockFastify(options: {
  userProfile?: { last_order_booking?: Date | string | null } | null;
  previousOrders?: { id: number }[];
  activeBalances?: { id: number }[];
}) {
  return {
    prisma: {
      legacy: {
        user_profile: {
          findFirst: async () => options.userProfile ?? null,
        },
        $queryRawUnsafe: async (sql: string, ..._params: unknown[]) => {
          if (sql.includes('FROM `order`')) {
            return options.previousOrders ?? [];
          }
          if (sql.includes('FROM user_service_balance')) {
            return options.activeBalances ?? [];
          }
          return [];
        },
      },
    },
    log: {
      error: () => undefined,
    },
  };
}

test('classifies brand new customer without orders or combo balance as isNew=1 and comboSaleRequired=1', async () => {
  const fastify = createMockFastify({
    userProfile: null,
    previousOrders: [],
    activeBalances: [],
  });

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    1001,
    '2026-09-20 10:00:00'
  );

  assert.equal(result.isNew, 1);
  assert.equal(result.comboSaleRequired, 1);
});

test('classifies returning single customer (has previous orders, no combo) as isNew=0 and comboSaleRequired=1 (Green Avatar)', async () => {
  const fastify = createMockFastify({
    userProfile: { last_order_booking: new Date('2026-08-15') },
    previousOrders: [{ id: 330000 }],
    activeBalances: [],
  });

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    51227, // Order 335278 customer Vy
    '2026-09-02 14:00:00'
  );

  assert.equal(result.isNew, 0);
  assert.equal(result.comboSaleRequired, 1);
});

test('classifies returning customer with active combo balance (>1 left) as isNew=0 and comboSaleRequired=0', async () => {
  const fastify = createMockFastify({
    userProfile: { last_order_booking: new Date('2026-08-20') },
    previousOrders: [{ id: 331000 }],
    activeBalances: [{ id: 70001 }],
  });

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    2002,
    '2026-09-20 11:30:00'
  );

  assert.equal(result.isNew, 0);
  assert.equal(result.comboSaleRequired, 0);
});

test('classifies customer with depleted combo balance as comboSaleRequired=1', async () => {
  // If activeBalances returned empty (e.g. normal_count + retain_count <= 1 filtered by SQL), comboSaleRequired is 1
  const fastify = createMockFastify({
    userProfile: { last_order_booking: new Date('2026-08-20') },
    previousOrders: [{ id: 331000 }],
    activeBalances: [],
  });

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    3003,
    '2026-09-20 14:00:00'
  );

  assert.equal(result.comboSaleRequired, 1);
});

test('classifies customer with expired combo balance as comboSaleRequired=1', async () => {
  const fastify = createMockFastify({
    userProfile: { last_order_booking: new Date('2026-08-20') },
    previousOrders: [{ id: 331000 }],
    activeBalances: [], // SQL filters out expired balances
  });

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    3004,
    '2026-09-20 14:00:00'
  );

  assert.equal(result.comboSaleRequired, 1);
});

test('returns isNew=1 and comboSaleRequired=1 when customerId is 0 or missing', async () => {
  const fastify = createMockFastify({});

  const result = await BookingSaleClassificationService.determineBookingSaleClassification(
    fastify as never,
    0,
    '2026-09-20 10:00:00'
  );

  assert.equal(result.isNew, 1);
  assert.equal(result.comboSaleRequired, 1);
});
