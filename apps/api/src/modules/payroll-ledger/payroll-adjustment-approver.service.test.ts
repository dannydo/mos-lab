import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePayrollAdjustmentApprover } from './payroll-adjustment-approver.service.js';

function crmWithMembership(id: number | null) {
  return {
    crmTeamMember: {
      findFirst: async () => (id === null ? null : { id }),
    },
  };
}

test('allows a decision only for an active Payroll Adjustment Approver', async () => {
  await assert.doesNotReject(() => requirePayrollAdjustmentApprover(crmWithMembership(1) as never, 101));
});

test('blocks a non-member before a payroll adjustment decision', async () => {
  await assert.rejects(
    () => requirePayrollAdjustmentApprover(crmWithMembership(null) as never, 202),
    /Payroll Adjustment Approver/
  );
});
