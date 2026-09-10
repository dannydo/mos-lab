import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayrollAdjustmentLabShadow, validatePayrollAdjustmentLabHrCustom } from './payroll-adjustment-lab.js';
import { __test__ } from './routes.js';

const input = {
  eventKey: 'local-lab:adjustment:demo',
  falRule: 'Adjust' as const,
  financialEligibility: 'READY' as const,
  sourcePeriod: { periodKey: '2026-08', status: 'LOCKED' as const, calculationVersion: 'fal.v1' },
  targetPeriod: { periodKey: '2026-09', status: 'OPEN' as const },
  beforeSettlement: {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: '2026-08',
    calculationVersion: 'fal.v1',
    subjectKey: 'synthetic:cc:001',
    lineCount: 1,
    grossAmount: 2_990,
    capAmount: null,
    receivedAmount: 2_990,
    holdAmount: 0,
  },
  afterSettlement: {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: '2026-08',
    calculationVersion: 'fal.v1',
    subjectKey: 'synthetic:cc:001',
    lineCount: 1,
    grossAmount: 2_925,
    capAmount: null,
    receivedAmount: 2_925,
    holdAmount: 0,
  },
};

test('local lab only returns a read-only current-period adjustment preview', () => {
  const result = calculatePayrollAdjustmentLabShadow(input);
  assert.equal(result.mode, 'LOCAL_ONLY');
  assert.equal(result.result.netDelta, -65);
  assert.equal(result.result.effect, 'CURRENT_PAYROLL_ADJUSTMENT');
});

test('local lab fail-closes every second-scenario gate without creating a payout result', () => {
  const blockedInputs = [
    { ...input, sourcePeriod: { ...input.sourcePeriod, status: 'REVIEWING' as const } },
    { ...input, targetPeriod: { ...input.targetPeriod, status: 'REVIEWING' as const } },
    { ...input, financialEligibility: 'PENDING_LOG_APPROVAL' as const },
  ];

  for (const blockedInput of blockedInputs) {
    const result = calculatePayrollAdjustmentLabShadow(blockedInput).result;
    assert.equal(result.status, 'REQUIRES_REVIEW');
    assert.equal(result.effect, 'NO_PAYOUT');
    assert.equal(result.beforeNetAmount, null);
    assert.equal(result.afterNetAmount, null);
    assert.equal(result.netDelta, null);
  }
});

test('local lab rejects an incomplete request before calculation', () => {
  assert.equal(__test__.isPayrollAdjustmentLabRequest({}), false);
  assert.equal(__test__.isPayrollAdjustmentLabRequest({ input }), true);
});

test('local lab requires distinct numeric actors for an approval rehearsal', () => {
  assert.equal(__test__.isPayrollAdjustmentLabApprovalCheckRequest({ requesterStaffId: 1, approverStaffId: 2 }), true);
  assert.equal(__test__.isPayrollAdjustmentLabApprovalCheckRequest({ requesterStaffId: 1 }), false);
  assert.equal(
    __test__.isPayrollAdjustmentLabApprovalCheckRequest({ requesterStaffId: '1', approverStaffId: 2 }),
    false
  );
});

test('local lab accepts only a numeric creator and an explicit decision', () => {
  assert.equal(__test__.isPayrollAdjustmentLabDraftRequest({ requesterStaffId: 1 }), true);
  assert.equal(__test__.isPayrollAdjustmentLabDraftRequest({ requesterStaffId: '1' }), false);
  assert.equal(__test__.isPayrollAdjustmentLabDecisionRequest({ approverStaffId: 2, decision: 'APPROVE' }), true);
  assert.equal(__test__.isPayrollAdjustmentLabDecisionRequest({ approverStaffId: 2, decision: 'POST' }), false);
});

test('local lab requires a complete HR Custom input before it can create a draft', () => {
  assert.equal(
    __test__.isPayrollAdjustmentLabHrCustomDraftRequest({
      requesterStaffId: 1,
      input: { amount: -65, comment: 'HR đã xác nhận', targetPeriodKey: '2026-09', targetPeriodStatus: 'OPEN' },
    }),
    true
  );
  assert.equal(
    __test__.isPayrollAdjustmentLabHrCustomDraftRequest({ requesterStaffId: 1, input: { amount: -65 } }),
    false
  );
});

test('local lab validates a custom HR adjustment without requiring a historical settlement reference', () => {
  const result = validatePayrollAdjustmentLabHrCustom({
    amount: -65,
    comment: 'Sai số đã được HR xác nhận',
    targetPeriodKey: '2026-09',
    targetPeriodStatus: 'OPEN',
  });
  assert.equal(result.mode, 'LOCAL_ONLY');
  assert.equal(result.draft.amount, -65);
  assert.equal(result.draft.sourcePeriodKey, null);
  assert.equal(
    __test__.isPayrollAdjustmentLabHrCustomRequest({ input: { ...result.draft, targetPeriodStatus: 'OPEN' } }),
    true
  );
});
