import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFalAdjustmentShadow } from './fal-adjustment-shadow.service.js';

const sourcePeriod = {
  periodKey: '2026-08',
  status: 'LOCKED' as const,
  calculationVersion: 'cc-cash-ledger.v1',
};

const targetPeriod = { periodKey: '2026-09', status: 'OPEN' as const };

const beforeSettlement = {
  mode: 'SHADOW_READ_ONLY' as const,
  sourcePeriodKey: '2026-08',
  calculationVersion: 'cc-cash-ledger.v1',
  subjectKey: 'staff:diem-huong:cc-fal',
  lineCount: 1,
  grossAmount: 1_000,
  capAmount: null,
  receivedAmount: 1_000,
  holdAmount: 0,
};

test('late Fix produces a reviewable negative current-period delta without posting', () => {
  const result = calculateFalAdjustmentShadow({
    eventKey: 'Fix:remediation:9001',
    falRule: 'Fix',
    financialEligibility: 'READY',
    sourcePeriod,
    targetPeriod,
    beforeSettlement,
    afterSettlement: { ...beforeSettlement, receivedAmount: 800 },
  });

  assert.deepEqual(result, {
    status: 'READY_FOR_APPROVAL',
    reason: null,
    sourcePeriodKey: '2026-08',
    targetPeriodKey: '2026-09',
    beforeNetAmount: 1_000,
    afterNetAmount: 800,
    netDelta: -200,
    effect: 'CURRENT_PAYROLL_ADJUSTMENT',
  });
});

test('zero delta keeps an audit outcome but has no payout effect', () => {
  const result = calculateFalAdjustmentShadow({
    eventKey: 'Adjust:remediation:9002',
    falRule: 'Adjust',
    financialEligibility: 'READY',
    sourcePeriod,
    targetPeriod,
    beforeSettlement,
    afterSettlement: beforeSettlement,
  });

  assert.equal(result.status, 'READY_FOR_APPROVAL');
  assert.equal(result.netDelta, 0);
  assert.equal(result.effect, 'NO_PAYOUT');
});

test('an unapproved Log, unlocked source, closed target, or mismatched snapshot fails closed', () => {
  const pendingLog = calculateFalAdjustmentShadow({
    eventKey: 'Log:remediation:9003',
    falRule: 'Log',
    financialEligibility: 'PENDING_LOG_APPROVAL',
    sourcePeriod,
    targetPeriod,
    beforeSettlement,
    afterSettlement: beforeSettlement,
  });
  assert.equal(pendingLog.status, 'REQUIRES_REVIEW');
  assert.match(pendingLog.reason || '', /eligibility/);

  const unlocked = calculateFalAdjustmentShadow({
    eventKey: 'Fix:remediation:9004',
    falRule: 'Fix',
    financialEligibility: 'READY',
    sourcePeriod: { ...sourcePeriod, status: 'REVIEWING' },
    targetPeriod,
    beforeSettlement,
    afterSettlement: beforeSettlement,
  });
  assert.equal(unlocked.status, 'REQUIRES_REVIEW');
  assert.match(unlocked.reason || '', /not locked/);

  const mismatched = calculateFalAdjustmentShadow({
    eventKey: 'Adjust:remediation:9005',
    falRule: 'Adjust',
    financialEligibility: 'READY',
    sourcePeriod,
    targetPeriod,
    beforeSettlement,
    afterSettlement: { ...beforeSettlement, subjectKey: 'staff:someone-else' },
  });
  assert.equal(mismatched.status, 'REQUIRES_REVIEW');
  assert.match(mismatched.reason || '', /one locked source-period subject/);
});
