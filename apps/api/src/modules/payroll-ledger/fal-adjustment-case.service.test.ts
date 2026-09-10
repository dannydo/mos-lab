import assert from 'node:assert/strict';
import test from 'node:test';
import { __test__ } from './fal-adjustment-case.service.js';

const recipientSnapshot = {
  recipientDisplayName: 'CV Local Mẫu',
  recipientAvatarUrl: '/payroll-adjustment-lab/avatars/cv-local.svg',
  recipientBranchKey: 'LOCAL-PN',
  recipientBranchName: 'Chi nhánh Local Phú Nhuận',
};

test('requires every review line to reconcile exactly to the shadow delta', () => {
  assert.doesNotThrow(() =>
    __test__.assertDraftLines(
      [
        {
          lineKey: 'origin-cv',
          recipientLegacyStaffId: 1,
          recipientRole: 'CV',
          ...recipientSnapshot,
          component: 'Cash',
          beforeAmount: 500,
          afterAmount: 0,
        },
        {
          lineKey: 'remediation-cv',
          recipientLegacyStaffId: 2,
          recipientRole: 'CV',
          ...recipientSnapshot,
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
    ...recipientSnapshot,
    component: 'Cash',
    beforeAmount: 500,
    afterAmount: 0,
  };
  assert.throws(() => __test__.assertDraftLines([line], -200), /do not reconcile/);
  assert.throws(() => __test__.assertDraftLines([line, line], -1000), /must be unique/);
});

test('blocks any adjustment line without an immutable recipient and branch snapshot', () => {
  const line = {
    lineKey: 'origin-cv',
    recipientLegacyStaffId: 1,
    recipientRole: 'CV' as const,
    ...recipientSnapshot,
    recipientAvatarUrl: '',
    component: 'Cash',
    beforeAmount: 500,
    afterAmount: 0,
  };
  assert.throws(() => __test__.assertDraftLines([line], -500), /recipient identity and branch snapshot/);
});
