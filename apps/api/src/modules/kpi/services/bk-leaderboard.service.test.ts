import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { BkLeaderboardService } from './bk-leaderboard.service.js';

test('getDoneLeaderboard calculates newCustomerDoneCount and newCustomerRatePercent correctly', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async () => ({
            members: [
              { legacyStaffId: 101, isActive: true },
              { legacyStaffId: 102, isActive: true },
            ],
          }),
        },
        crmStaff: {
          findMany: async () => [],
        },
        crmConfig: {
          findUnique: async () => null,
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          // 1. Team members query
          if (sql.includes('ugl.user_group_name')) {
            return [{ user_id: 101 }, { user_id: 102 }];
          }
          // 2. Active bookers query
          if (sql.includes('FROM `user_profile` up') && sql.includes('COUNT(DISTINCT CASE WHEN o.order_state IN')) {
            return [
              {
                bookerId: 101,
                displayName: 'Booker A',
                avatar: null,
                store: 'PXL',
                doneCount: 10,
                missedCount: 2,
                totalCount: 12,
              },
              {
                bookerId: 102,
                displayName: 'Booker B',
                avatar: null,
                store: 'DT',
                doneCount: 0,
                missedCount: 1,
                totalCount: 1,
              },
            ];
          }
          // 3. Combo sold query
          if (sql.includes('order_service_combo')) {
            return [];
          }
          // 4. New customer done query
          if (sql.includes('NOT EXISTS') && sql.includes('prev_ro.actual_booking_date_end')) {
            return [
              { orderId: 1, bookerId: 101, customerId: 501 },
              { orderId: 2, bookerId: 101, customerId: 502 },
              { orderId: 3, bookerId: 101, customerId: 503 },
            ];
          }
          // 5. Check-in bonus orders query
          if (sql.includes('computeBkOrderCheckins') || sql.includes('FROM `order` o')) {
            return [];
          }
          return [];
        },
        order_service: {
          findMany: async () => [],
        },
        user_service_balance: {
          findMany: async () => [],
        },
      },
    },
    cache: {
      get: () => null,
      set: () => undefined,
    },
    log: {
      warn: () => undefined,
      error: () => undefined,
    },
  } as unknown as FastifyInstance;

  const result = await BkLeaderboardService.getDoneLeaderboard(fastify, {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    targetStaffIds: [101, 102],
    skipCache: true,
  });

  assert.equal(result.leaderboard.length, 2);

  const bookerA = result.leaderboard.find((e) => e.bookerId === 101);
  assert.ok(bookerA);
  assert.equal(bookerA.doneCount, 10);
  assert.equal(bookerA.newCustomerDoneCount, 3);
  // 3 / 10 * 100 = 30.0%
  assert.equal(bookerA.newCustomerRatePercent, 30.0);

  const bookerB = result.leaderboard.find((e) => e.bookerId === 102);
  assert.ok(bookerB);
  assert.equal(bookerB.doneCount, 0);
  assert.equal(bookerB.newCustomerDoneCount, 0);
  // When doneCount is 0, newCustomerRatePercent must be 0%
  assert.equal(bookerB.newCustomerRatePercent, 0);

  // Summary checks
  assert.equal(result.summary.totalDone, 10);
  assert.equal(result.summary.totalNewCustomerDone, 3);
  assert.equal(result.summary.avgNewCustomerRate, 30.0);
});

test('newCustomerDoneCount never exceeds doneCount in leaderboard calculation', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async () => ({
            members: [{ legacyStaffId: 201, isActive: true }],
          }),
        },
        crmStaff: { findMany: async () => [] },
        crmConfig: { findUnique: async () => null },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('ugl.user_group_name')) {
            return [{ user_id: 201 }];
          }
          if (sql.includes('COUNT(DISTINCT CASE WHEN o.order_state IN')) {
            return [
              {
                bookerId: 201,
                displayName: 'Booker C',
                avatar: null,
                store: 'PXL',
                doneCount: 5,
                missedCount: 0,
                totalCount: 5,
              },
            ];
          }
          if (sql.includes('order_service_combo')) return [];
          if (sql.includes('NOT EXISTS') && sql.includes('prev_ro.actual_booking_date_end')) {
            return [
              { orderId: 10, bookerId: 201, customerId: 601 },
              { orderId: 11, bookerId: 201, customerId: 602 },
            ];
          }
          return [];
        },
        order_service: { findMany: async () => [] },
        user_service_balance: { findMany: async () => [] },
      },
    },
    cache: { get: () => null, set: () => undefined },
    log: { warn: () => undefined, error: () => undefined },
  } as unknown as FastifyInstance;

  const result = await BkLeaderboardService.getDoneLeaderboard(fastify, {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
    targetStaffIds: [201],
    skipCache: true,
  });

  const entry = result.leaderboard[0];
  assert.ok(entry);
  assert.ok(
    (entry.newCustomerDoneCount ?? 0) <= entry.doneCount,
    'Done khách mới không được vượt quá Tổng Done'
  );
  assert.equal(entry.newCustomerDoneCount, 2);
  assert.equal(entry.newCustomerRatePercent, 40.0);
});
