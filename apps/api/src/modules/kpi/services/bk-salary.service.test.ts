import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { getActiveBkTelesalesIds, resolveBkTelesalesStaffScope } from './bk-salary.service.js';

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
