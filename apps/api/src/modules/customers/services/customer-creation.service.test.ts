import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerCreationService } from './customer-creation.service.js';

test('resolveLegacyStaffId returns existing verified legacyStaffId', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: 45103, displayName: 'Nguyễn Quang Khải', username: 'khai.nguyen@wingslashes.com' }),
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          if (sql.includes('FROM user WHERE id = ?')) {
            assert.equal(params[0], 45103);
            return [{ id: 45103 }];
          }
          return [];
        },
      },
    },
    log: { warn: () => {} },
  };

  const staffId = await CustomerCreationService.resolveLegacyStaffId(fastify as never, { id: 6 });
  assert.equal(staffId, 45103);
});

test('resolveLegacyStaffId resolves by displayName in user_profile and auto-persists to crmStaff', async () => {
  let updatedLegacyStaffId: number | null = null;
  const fastify = {
    prisma: {
      crm: {
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: null, displayName: 'Nguyễn Quang Khải', username: 'khai.nguyen@wingslashes.com' }),
          update: async ({ data }: { data: { legacyStaffId: number } }) => {
            updatedLegacyStaffId = data.legacyStaffId;
            return { id: 6 };
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          if (sql.includes('FROM user_profile')) {
            assert.equal(params[0], 'Nguyễn Quang Khải');
            return [{ user_id: 45103 }];
          }
          return [];
        },
      },
    },
    log: { warn: () => {} },
  };

  const staffId = await CustomerCreationService.resolveLegacyStaffId(fastify as never, { id: 6, displayName: 'Nguyễn Quang Khải' });
  assert.equal(staffId, 45103);
  assert.equal(updatedLegacyStaffId, 45103);
});

test('resolveLegacyStaffId resolves by username/email in legacy user table if displayName not found', async () => {
  let updatedLegacyStaffId: number | null = null;
  const fastify = {
    prisma: {
      crm: {
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: null, displayName: 'Danny Test', username: 'danhdo@gmail.com' }),
          update: async ({ data }: { data: { legacyStaffId: number } }) => {
            updatedLegacyStaffId = data.legacyStaffId;
            return { id: 1 };
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          if (sql.includes('FROM user_profile')) {
            return [];
          }
          if (sql.includes('FROM user WHERE email = ?')) {
            assert.equal(params[0], 'danhdo@gmail.com');
            return [{ id: 86 }];
          }
          return [];
        },
      },
    },
    log: { warn: () => {} },
  };

  const staffId = await CustomerCreationService.resolveLegacyStaffId(fastify as never, { id: 1, displayName: 'Danny Test' });
  assert.equal(staffId, 86);
  assert.equal(updatedLegacyStaffId, 86);
});

test('resolveLegacyStaffId falls back to safe system staff user when no match is found', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: null, displayName: 'Unknown Person', username: 'unknown@example.com' }),
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('FROM user WHERE id = 86')) {
            return [{ id: 86 }];
          }
          return [];
        },
      },
    },
    log: { warn: () => {} },
  };

  const staffId = await CustomerCreationService.resolveLegacyStaffId(fastify as never, { id: 999, displayName: 'Unknown Person' });
  assert.equal(staffId, 86);
});
