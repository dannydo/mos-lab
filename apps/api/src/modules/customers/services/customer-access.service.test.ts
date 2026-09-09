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

  const canAccess = await CustomerAccessService.canAccessCustomer(fastify as never, { id: 41, role: 'telesales' }, 99);

  assert.equal(canAccess, true);
  const where = capturedWhere as {
    legacyUserId: number;
    staffId: number;
  };
  assert.equal(where.legacyUserId, 99);
  assert.equal(where.staffId, 41);
  assert.deepEqual(where, { legacyUserId: 99, staffId: 41 });
});

test('admins and managers bypass the telesales assignment boundary and keep global list scope', async () => {
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

  for (const role of ['admin', 'manager', 'super_admin'] as const) {
    const canAccess = await CustomerAccessService.canAccessCustomer(fastify as never, { id: 41, role }, 99);
    assert.equal(canAccess, true);
    assert.equal(CustomerAccessService.resolveListAssignedStaffId({ id: 41, role }, 'unassigned'), 'unassigned');
  }
  assert.equal(wasQueried, false);
});

test('telesales is denied for a different owner, returned-to-pool customer, or stale audit evidence', async () => {
  let assignmentQueries = 0;
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => {
            assignmentQueries += 1;
            return null;
          },
        },
        crmAssignmentHistory: { findFirst: async () => assert.fail('history must not grant customer access') },
        crmAllocationLedgerEvent: { findFirst: async () => assert.fail('ledger must not grant customer access') },
      },
    },
  };

  const canAccess = await CustomerAccessService.canAccessCustomer(fastify as never, { id: 41, role: 'telesales' }, 99);

  assert.equal(canAccess, false);
  assert.equal(assignmentQueries, 1);
  assert.equal(CustomerAccessService.resolveListAssignedStaffId({ id: 41, role: 'telesales' }, 'unassigned'), 'me');
  assert.equal(CustomerAccessService.resolveListAssignedStaffId({ id: 42, role: 'booker' }, undefined), 'me');
});

test('non-manager roles retain their existing narrow list scope', () => {
  assert.equal(CustomerAccessService.resolveListAssignedStaffId({ id: 61, role: 'technician' }, undefined), 'me');
  assert.equal(
    CustomerAccessService.resolveListAssignedStaffId({ id: 61, role: 'technician' }, 'unassigned'),
    'unassigned'
  );
  assert.equal(
    CustomerAccessService.resolveListAssignedStaffId({ id: 61, role: 'technician' }, undefined, 'NEW_LOCA'),
    undefined
  );
});

test('a current durable assignment grants access only to its own telesales identity', async () => {
  let capturedWhere: unknown;
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async ({ where }: { where: unknown }) => {
            capturedWhere = where;
            return { id: 7 };
          },
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canAccessCustomer(fastify as never, { id: 41, role: 'booker' }, 99);

  assert.equal(canAccess, true);
  assert.deepEqual(capturedWhere, { legacyUserId: 99, staffId: 41 });
});

test('only a still-pending batch can be presented as a provisional owner', () => {
  assert.equal(
    CustomerAccessService.isPendingAllocationOwner({ status: 'PENDING_ACCEPT', batch: { status: 'PENDING_ACCEPT' } }),
    true
  );
  assert.equal(
    CustomerAccessService.isPendingAllocationOwner({ status: 'ACCEPTED', batch: { status: 'ACCEPTED' } }),
    false
  );
  assert.equal(
    CustomerAccessService.isPendingAllocationOwner({ status: 'PENDING_ACCEPT', batch: { status: 'EXPIRED' } }),
    false
  );
});

test('telesales and legacy booker accounts are allowed into LoCa but remain customer-scoped', () => {
  assert.equal(canAccessLoca('telesales'), true);
  assert.equal(canAccessLoca('booker'), true);
  assert.equal(isTelesalesRole('telesales'), true);
  assert.equal(isTelesalesRole('booker'), true);
  assert.equal(canAccessLoca('technician'), false);
});
