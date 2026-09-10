import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './fal-adjustment-case.service.js';

test('requires every review line to reconcile exactly to the shadow delta', () => {
  assert.doesNotThrow(() =>
    __test__.assertDraftLines(
      [
        {
          lineKey: 'origin-cv',
          recipientLegacyStaffId: 1,
          recipientRole: 'CV',
          component: 'Cash',
          beforeAmount: 500,
          afterAmount: 0,
        },
        {
          lineKey: 'remediation-cv',
          recipientLegacyStaffId: 2,
          recipientRole: 'CV',
          component: 'Cash',
          beforeAmount: 0,
          afterAmount: 300,
        },
      ],
      -200
    )
  );
});

test('blocks an unreconciled or duplicate review line before any CRM transaction starts', () => {
  const line = {
    lineKey: 'origin-cv',
    recipientLegacyStaffId: 1,
    recipientRole: 'CV' as const,
    component: 'Cash',
    beforeAmount: 500,
    afterAmount: 0,
  };
  assert.throws(() => __test__.assertDraftLines([line], -200), /do not reconcile/);
  assert.throws(() => __test__.assertDraftLines([line, line], -1000), /must be unique/);
});
