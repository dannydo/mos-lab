import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { computeBkOrderCheckins, getActiveBkTelesalesIds, resolveBkTelesalesStaffScope } from './bk-salary.service.js';

test('BK Done scope uses only active BK_TELESALES members', async () => {
  const inspectedTeamCodes: string[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async ({ where }: { where: { code: string } }) => {
            inspectedTeamCodes.push(where.code);
            return {
              members: [
                { legacyStaffId: 101, isActive: true },
                { legacyStaffId: 202, isActive: true },
              ],
            };
          },
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [{ user_id: 101 }, { user_id: 202 }],
      },
    },
  } as unknown as FastifyInstance;

  const ids = await getActiveBkTelesalesIds(fastify);

  assert.deepEqual(inspectedTeamCodes, ['BK_TELESALES']);
  assert.deepEqual(ids, [101, 202]);
});

test('BK Done scope falls back only to the BK_TELESALES configuration key', async () => {
  const configKeys: string[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async () => null,
        },
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            configKeys.push(where.key);
            return { value: '[303]' };
          },
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [{ user_id: 303 }],
      },
    },
  } as unknown as FastifyInstance;

  const ids = await getActiveBkTelesalesIds(fastify);

  assert.deepEqual(configKeys, ['ACTIVE_BK_TELESALES_STAFF_CONFIG']);
  assert.deepEqual(ids, [303]);
});

test('BK Booking details never expand beyond the active BK_TELESALES roster', () => {
  const activeTelesalesIds = [101, 202];

  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds), activeTelesalesIds);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, 'ALL'), activeTelesalesIds);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, '202'), [202]);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, '999'), []);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, 'not-a-staff-id'), []);
});

test('BK check-ins retain Combo Live bonuses while fetching only required legacy fields', async () => {
  let orderServiceSelect: unknown;
  let balanceSelect: unknown;
  let serviceLanguageSelect: unknown;

  const fastify = {
    log: { error: () => undefined },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({ value: JSON.stringify({}) }),
        },
        crmTeam: {
          findMany: async () => [{ members: [{ legacyStaffId: 101, isActive: true }] }],
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async (query: string) => {
          if (query.includes('SELECT user_id FROM user_profile')) return [{ user_id: 101 }];
          if (query.includes('FROM user_service_balance_transaction')) {
            return [
              {
                id: 1,
                user_service_balance_id: 71,
                date_created: new Date('2026-08-01T08:00:00.000Z'),
                date_expired: new Date('2026-08-30T00:00:00.000Z'),
                total_normal_count_left: 2,
                total_retain_count_left: 1,
                normal_count: 0,
                retain_count: 0,
                used_staff_id: null,
                order_id: 0,
                o_booking_date_start: new Date('2026-08-01T08:00:00.000Z'),
              },
            ];
          }
          if (query.includes('FROM `order` o')) {
            return [
              {
                orderId: 11,
                bookerId: 101,
                userId: 501,
                bookingDateStart: new Date('2026-08-02T09:00:00.000Z'),
                dateCreated: new Date('2026-08-01T07:00:00.000Z'),
              },
              {
                orderId: 12,
                bookerId: 101,
                userId: 501,
                bookingDateStart: new Date('2026-08-03T09:00:00.000Z'),
                dateCreated: new Date('2026-08-01T07:00:00.000Z'),
              },
            ];
          }
          return [];
        },
        order_service: {
          findMany: async ({ select }: { select: unknown }) => {
            orderServiceSelect = select;
            return [
              {
                order_id: 11,
                service_id: 1,
                service_price: 500000,
                service_type: 'Normal',
                discount_amount: 0,
              },
              {
                order_id: 12,
                service_id: 1,
                service_price: 500000,
                service_type: 'Normal',
                discount_amount: 0,
              },
            ];
          },
        },
        user_service_balance: {
          findMany: async ({ select }: { select: unknown }) => {
            balanceSelect = select;
            return [
              {
                id: 71,
                user_id: 501,
                date_created: new Date('2026-08-01T00:00:00.000Z'),
                date_expired: new Date('2026-08-30T00:00:00.000Z'),
                normal_count: 3,
                retain_count: 0,
              },
            ];
          },
        },
        service_language: {
          findMany: async ({ select }: { select: unknown }) => {
            serviceLanguageSelect = select;
            return [{ service_id: 1, service_name: 'Nối mới' }];
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await computeBkOrderCheckins(fastify, '2026-08-01', '2026-08-31', [101]);

  assert.equal(result.clientBonusMap.get(101), 2000);
  assert.equal(result.orderCheckinMap.get(11)?.isCombo, true);
  assert.equal(result.orderCheckinMap.get(12)?.isCombo, true);
  assert.deepEqual(orderServiceSelect, {
    order_id: true,
    service_id: true,
    service_price: true,
    service_type: true,
    discount_amount: true,
  });
  assert.deepEqual(balanceSelect, {
    id: true,
    user_id: true,
    date_created: true,
    date_expired: true,
    normal_count: true,
    retain_count: true,
  });
  assert.deepEqual(serviceLanguageSelect, { service_id: true, service_name: true });
});
