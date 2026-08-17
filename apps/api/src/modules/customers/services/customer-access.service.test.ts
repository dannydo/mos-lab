import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerAccessService } from './customer-access.service.js';

test('telesales access requires an active assignment to the same CRM staff member', async () => {
  let capturedWhere: unknown;
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async ({ where }: { where: unknown }) => {
            capturedWhere = where;
            return { id: 1 };
          },
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canTelesalesAccessCustomer(
    fastify as never,
    { id: 41, role: 'telesales' },
    99
  );

  assert.equal(canAccess, true);
  const where = capturedWhere as {
    legacyUserId: number;
    staffId: number;
    OR: Array<{ expiresAt: null | { gt: Date } }>;
  };
  assert.equal(where.legacyUserId, 99);
  assert.equal(where.staffId, 41);
  assert.equal(where.OR[0].expiresAt, null);
  assert.ok(where.OR[1].expiresAt && where.OR[1].expiresAt.gt instanceof Date);
});

test('non-telesales roles bypass the telesales assignment boundary', async () => {
  let wasQueried = false;
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => {
            wasQueried = true;
            return null;
          },
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canTelesalesAccessCustomer(
    fastify as never,
    { id: 41, role: 'BK_CS' },
    99
  );

  assert.equal(canAccess, true);
  assert.equal(wasQueried, false);
});

test('telesales is denied when the customer is not assigned to them', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => null,
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canTelesalesAccessCustomer(
    fastify as never,
    { id: 41, role: 'telesales' },
    99
  );

  assert.equal(canAccess, false);
});
