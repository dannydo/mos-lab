import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessLoca, isTelesalesRole } from '@mos-lab/shared';
import { CustomerAccessService } from './customer-access.service.js';

test('telesales access requires a durable assignment to the same CRM staff member', async () => {
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
  };
  assert.equal(where.legacyUserId, 99);
  assert.equal(where.staffId, 41);
  assert.deepEqual(where, { legacyUserId: 99, staffId: 41 });
});

test('Super Admin bypasses the telesales assignment boundary', async () => {
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
    { id: 41, role: 'super_admin' },
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

test('telesales and legacy booker accounts are allowed into LoCa but remain customer-scoped', () => {
  assert.equal(canAccessLoca('telesales'), true);
  assert.equal(canAccessLoca('booker'), true);
  assert.equal(isTelesalesRole('telesales'), true);
  assert.equal(isTelesalesRole('booker'), true);
  assert.equal(canAccessLoca('technician'), false);
});
