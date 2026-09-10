import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FAL_SHORT_REMEDIATION_MAX_MINUTES,
  getOriginResponsibility,
  resolveFalCompensationMode,
  resolveFalFinancialEligibility,
  resolveFalRotationMode,
  totalFalMinutes,
} from './fal.service.js';

test('FAL duration contract sums servicing and cleaning, and fails closed for incomplete timelines', () => {
  assert.equal(totalFalMinutes(20, 5), 25);
  assert.equal(totalFalMinutes(20, null), null);
  assert.equal(totalFalMinutes(-1, 26), null);
  assert.equal(totalFalMinutes(Number.NaN, 26), null);
  assert.equal(resolveFalCompensationMode({ rule: 'Adjust', caseRole: 'REMEDIATION', totalMinutes: 0 }), 'BLOCKED');
  assert.equal(
    resolveFalFinancialEligibility({ rule: 'Fix', caseRole: 'REMEDIATION', totalMinutes: null }),
    'INVALID_DURATION'
  );
  assert.equal(
    resolveFalFinancialEligibility({ rule: 'Adjust', caseRole: 'REMEDIATION', totalMinutes: 0 }),
    'INVALID_DURATION'
  );
  assert.equal(
    resolveFalFinancialEligibility({
      rule: 'Log',
      caseRole: 'REMEDIATION',
      totalMinutes: 0,
      decisionStatus: 'APPROVED',
    }),
    'INVALID_DURATION'
  );
});

test('Fix and Adjust retain their existing accountability paths', () => {
  assert.equal(getOriginResponsibility('Fix'), 'CV');
  assert.equal(getOriginResponsibility('Adjust'), 'CC');
  assert.equal(resolveFalCompensationMode({ rule: 'Adjust', caseRole: 'ORIGIN', totalMinutes: 10 }), 'ORIGIN_ONLY');
});

test('25-minute boundary keeps short remediation on head banana; 26 minutes uses final normal rewards', () => {
  assert.equal(FAL_SHORT_REMEDIATION_MAX_MINUTES, 25);
  assert.equal(totalFalMinutes(20, 5), FAL_SHORT_REMEDIATION_MAX_MINUTES);
  assert.equal(
    resolveFalCompensationMode({
      rule: 'Fix',
      caseRole: 'REMEDIATION',
      totalMinutes: FAL_SHORT_REMEDIATION_MAX_MINUTES,
    }),
    'BANANA_HEAD'
  );
  assert.equal(
    resolveFalCompensationMode({
      rule: 'Adjust',
      caseRole: 'REMEDIATION',
      totalMinutes: FAL_SHORT_REMEDIATION_MAX_MINUTES + 1,
    }),
    'NORMAL_FINAL'
  );
  assert.equal(
    resolveFalRotationMode({
      rule: 'Fix',
      caseRole: 'REMEDIATION',
      totalMinutes: FAL_SHORT_REMEDIATION_MAX_MINUTES,
    }),
    'HEAD'
  );
  assert.equal(
    resolveFalRotationMode({
      rule: 'Fix',
      caseRole: 'REMEDIATION',
      totalMinutes: FAL_SHORT_REMEDIATION_MAX_MINUTES + 1,
    }),
    'FINAL'
  );
});

test('Replace remains on its existing normal-tail path and never gets a FAL head token', () => {
  assert.equal(
    resolveFalCompensationMode({ rule: 'Replace', caseRole: 'REMEDIATION', totalMinutes: 10 }),
    'NORMAL_FINAL'
  );
  assert.equal(resolveFalRotationMode({ rule: 'Replace', caseRole: 'REMEDIATION', totalMinutes: 10 }), 'FINAL');
});

test('Log approval gates financial ledger but never operational CV rotation', () => {
  assert.equal(
    resolveFalCompensationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: 10, decisionStatus: 'PENDING' }),
    'BLOCKED'
  );
  assert.equal(
    resolveFalCompensationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: 10, decisionStatus: 'APPROVED' }),
    'BANANA_HEAD'
  );
  assert.equal(
    resolveFalCompensationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: 26, decisionStatus: 'APPROVED' }),
    'NORMAL_FINAL'
  );
  assert.equal(resolveFalRotationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: 25 }), 'HEAD');
  assert.equal(resolveFalRotationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: 26 }), 'FINAL');
  assert.equal(resolveFalRotationMode({ rule: 'Log', caseRole: 'REMEDIATION', totalMinutes: null }), 'UNDETERMINED');
  assert.equal(
    resolveFalFinancialEligibility({
      rule: 'Log',
      caseRole: 'REMEDIATION',
      totalMinutes: 10,
      decisionStatus: 'PENDING',
    }),
    'PENDING_LOG_APPROVAL'
  );
  assert.equal(
    resolveFalFinancialEligibility({
      rule: 'Log',
      caseRole: 'REMEDIATION',
      totalMinutes: 10,
      decisionStatus: 'REJECTED',
    }),
    'REJECTED'
  );
  assert.equal(
    resolveFalFinancialEligibility({
      rule: 'Log',
      caseRole: 'REMEDIATION',
      totalMinutes: 10,
      decisionStatus: 'APPROVED',
    }),
    'READY'
  );
  assert.equal(
    resolveFalFinancialEligibility({ rule: 'Fix', caseRole: 'REMEDIATION', totalMinutes: 0 }),
    'INVALID_DURATION'
  );
});
