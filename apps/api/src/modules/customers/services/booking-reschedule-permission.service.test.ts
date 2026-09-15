import assert from 'node:assert/strict';
import test from 'node:test';
import { BookingReschedulePermissionService } from './booking-reschedule-permission.service.js';

test('an active BK_CONTROL member can reschedule a customer without an assignment', async () => {
  let assignmentWasChecked = false;
  let membershipWhere: unknown;
  const fastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async ({ where }: { where: unknown }) => {
            membershipWhere = where;
            return { id: 1 };
          },
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: 42 }),
        },
        crmCustomerAssignment: {
          findFirst: async () => {
            assignmentWasChecked = true;
            return null;
          },
        },
      },
    },
  };

  const permission = await BookingReschedulePermissionService.evaluate(
    fastify as never,
    { id: 77, role: 'telesales' },
    12345
  );

  assert.equal(permission.allowed, true);
  assert.equal(permission.reason, 'ALLOWED');
  assert.equal(assignmentWasChecked, false);
  assert.deepEqual(membershipWhere, {
    crmStaffId: 77,
    isActive: true,
    team: { code: 'BK_CONTROL', isActive: true },
  });
});

test('a manager or control role has global reschedule access without checking assignment', async () => {
  let assignmentWasChecked = false;
  const fastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async () => null,
        },
        crmCustomerAssignment: {
          findFirst: async () => {
            assignmentWasChecked = true;
            return null;
          },
        },
      },
    },
  };

  const managerPerm = await BookingReschedulePermissionService.evaluate(
    fastify as never,
    { id: 47, role: 'manager' },
    99999
  );
  assert.equal(managerPerm.allowed, true);
  assert.equal(managerPerm.reason, 'ALLOWED');
  assert.equal(assignmentWasChecked, false);

  const controlPerm = await BookingReschedulePermissionService.evaluate(
    fastify as never,
    { id: 48, role: 'control' },
    99999
  );
  assert.equal(controlPerm.allowed, true);
  assert.equal(controlPerm.reason, 'ALLOWED');
});

test('an assigned staff member can reschedule their customer even with non-telesales role', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async () => null,
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: 55 }),
        },
        crmCustomerAssignment: {
          findFirst: async () => ({ id: 101 }),
        },
      },
    },
    log: { error: () => {}, warn: () => {} },
  };

  const permission = await BookingReschedulePermissionService.evaluate(fastify as never, { id: 55, role: 'cs' }, 12345);

  assert.equal(permission.allowed, true);
  assert.equal(permission.reason, 'ALLOWED');
});

test('a staff member who created the booking order can reschedule', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmTeamMember: {
          findFirst: async () => null,
        },
        crmCustomerAssignment: {
          findFirst: async () => null,
        },
        crmStaff: {
          findUnique: async () => ({ legacyStaffId: 52454 }),
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [{ id: 335751 }],
      },
    },
    log: { error: () => {}, warn: () => {} },
  };

  const permission = await BookingReschedulePermissionService.evaluate(
    fastify as never,
    { id: 47, role: 'staff' },
    50275
  );

  assert.equal(permission.allowed, true);
  assert.equal(permission.reason, 'ALLOWED');
});
