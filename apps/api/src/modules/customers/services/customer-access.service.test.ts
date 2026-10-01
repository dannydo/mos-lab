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

test('Shared Pool - verified campaign member can read customer history in Active Pool without personal assignment', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => null, // No personal assignment
        },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 1,
              poolStatus: 'AVAILABLE',
              claimedByStaffId: null,
              claimedByStaffName: null,
              claimExpiresAt: null,
              campaign: {
                id: 5,
                currentBatchNumber: 1,
                assignedStaffIds: JSON.stringify([41, 42]),
              },
            },
          ],
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canAccessCustomer(
    fastify as never,
    { id: 41, role: 'telesales' },
    888
  );

  assert.equal(canAccess, true);
});

test('Shared Pool - denied read access if staff is not in campaign assignedStaffIds', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => null,
        },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 1,
              poolStatus: 'AVAILABLE',
              claimedByStaffId: null,
              claimedByStaffName: null,
              claimExpiresAt: null,
              campaign: {
                id: 5,
                currentBatchNumber: 1,
                assignedStaffIds: JSON.stringify([99, 100]), // Staff 41 is NOT in this list
              },
            },
          ],
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canAccessCustomer(
    fastify as never,
    { id: 41, role: 'telesales' },
    888
  );

  assert.equal(canAccess, false);
});

test('Shared Pool - denied read access if customer is in an unactivated future batch', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmCustomerAssignment: {
          findFirst: async () => null,
        },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 3, // Batch 3, but campaign is still on Batch 1
              poolStatus: 'AVAILABLE',
              claimedByStaffId: null,
              claimedByStaffName: null,
              claimExpiresAt: null,
              campaign: {
                id: 5,
                currentBatchNumber: 1,
                assignedStaffIds: null, // open to all
              },
            },
          ],
        },
      },
    },
  };

  const canAccess = await CustomerAccessService.canAccessCustomer(
    fastify as never,
    { id: 41, role: 'telesales' },
    888
  );

  assert.equal(canAccess, false);
});

test('Shared Pool - mutate access requires an active Claim lock', async () => {
  const now = new Date();
  const future = new Date(now.getTime() + 15 * 60 * 1000);

  // Case 1: Unclaimed customer in Shared Pool -> Cannot mutate without claim
  const fastifyUnclaimed = {
    prisma: {
      crm: {
        crmCustomerAssignment: { findFirst: async () => null },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 1,
              poolStatus: 'AVAILABLE',
              claimedByStaffId: null,
              claimedByStaffName: null,
              claimExpiresAt: null,
              campaign: { id: 5, currentBatchNumber: 1, assignedStaffIds: null },
            },
          ],
        },
      },
    },
  };

  const resUnclaimed = await CustomerAccessService.canMutateCustomer(
    fastifyUnclaimed as never,
    { id: 41, role: 'telesales' },
    888
  );
  assert.equal(resUnclaimed.allowed, false);
  assert.match(resUnclaimed.reason || '', /Claim/i);

  // Case 2: Claimed by another staff -> Cannot mutate
  const fastifyClaimedByOther = {
    prisma: {
      crm: {
        crmCustomerAssignment: { findFirst: async () => null },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 1,
              poolStatus: 'CLAIMED',
              claimedByStaffId: 99,
              claimedByStaffName: 'Nguyen Van B',
              claimExpiresAt: future,
              campaign: { id: 5, currentBatchNumber: 1, assignedStaffIds: null },
            },
          ],
        },
      },
    },
  };

  const resClaimedOther = await CustomerAccessService.canMutateCustomer(
    fastifyClaimedByOther as never,
    { id: 41, role: 'telesales' },
    888
  );
  assert.equal(resClaimedOther.allowed, false);
  assert.match(resClaimedOther.reason || '', /Nguyen Van B|nhân viên khác/i);

  // Case 3: Claimed by me and still valid -> Allowed!
  const fastifyClaimedByMe = {
    prisma: {
      crm: {
        crmCustomerAssignment: { findFirst: async () => null },
        crmCampaignCustomer: {
          findMany: async () => [
            {
              id: 101,
              campaignId: 5,
              batchNumber: 1,
              poolStatus: 'CLAIMED',
              claimedByStaffId: 41,
              claimedByStaffName: 'Telesales A',
              claimExpiresAt: future,
              campaign: { id: 5, currentBatchNumber: 1, assignedStaffIds: null },
            },
          ],
        },
      },
    },
  };

  const resClaimedMe = await CustomerAccessService.canMutateCustomer(
    fastifyClaimedByMe as never,
    { id: 41, role: 'telesales' },
    888
  );
  assert.equal(resClaimedMe.allowed, true);

  // Case 4: Durable personal assignment -> Always allowed regardless of pool
  const fastifyAssigned = {
    prisma: {
      crm: {
        crmCustomerAssignment: { findFirst: async () => ({ id: 1 }) },
      },
    },
  };

  const resAssigned = await CustomerAccessService.canMutateCustomer(
    fastifyAssigned as never,
    { id: 41, role: 'telesales' },
    888
  );
  assert.equal(resAssigned.allowed, true);
});
