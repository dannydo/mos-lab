import assert from 'node:assert/strict';
import test from 'node:test';
import { FAL_RULE_VALUES, FAL_RULE_VALUES_SQL, FAL_TRACKING_KEY_SQL_CASES, resolveFalRule } from './cc-kpi.service.js';

const expectedRules = ['Fix', 'Adjust', 'Log', 'Replace'] as const;

test('recognizes every FAL rule from service_type', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ serviceType: rule }), rule);
  }
});

test('recognizes every FAL rule from staff bonus rule values', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ ruleValue: rule }), rule);
  }
});

test('recognizes every FAL rule from tracking keys', () => {
  for (const rule of expectedRules) {
    assert.equal(resolveFalRule({ trackingKey: JSON.stringify({ next_service_type: rule }) }), rule);
  }
});

test('keeps next Fix and Adjust references as the highest-precedence signals', () => {
  assert.equal(resolveFalRule({ nextFixOrderServiceId: 1, serviceType: 'Replace' }), 'Fix');
  assert.equal(resolveFalRule({ nextAdjustOrderServiceId: 1, serviceType: 'Replace' }), 'Adjust');
});

test('keeps the SQL classifier fragments aligned with the pure classifier', () => {
  assert.deepEqual(FAL_RULE_VALUES, expectedRules);
  for (const rule of expectedRules) {
    assert.match(FAL_RULE_VALUES_SQL, new RegExp(`'${rule}'`));
    assert.match(FAL_TRACKING_KEY_SQL_CASES, new RegExp(`next_service_type.*${rule}`));
  }
});
