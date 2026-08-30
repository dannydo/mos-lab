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
