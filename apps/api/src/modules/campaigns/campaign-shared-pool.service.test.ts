import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHARED_POOL_CONFIG,
  CampaignPoolStatus,
  SharedPoolConfig,
} from '@mos-lab/shared';

test('Campaign Shared Pool - Default configuration validation', () => {
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.batchSize, 100);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.maxClaimsPerStaff, 1);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.claimTtlMinutes, 15);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.cooldownMinutes, 60);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.isPaused, false);

  // Recycle rules
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.THINKING, 3);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.NO_ANSWER, 1);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.BUSY, 1);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.ERROR, 2);

  // Early warning thresholds
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.warningThreshold, 30);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.criticalThreshold, 10);
});

test('Campaign Shared Pool - Early Warning Level calculation', () => {
  const evaluateWarningLevel = (
    remainingCount: number,
    totalCount: number,
    config: SharedPoolConfig
  ): 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' => {
    if (totalCount === 0 || remainingCount === 0) return 'EXHAUSTED';
    const remainingPercent = Math.round((remainingCount / totalCount) * 100);
    if (remainingPercent <= config.criticalThreshold) return 'CRITICAL';
    if (remainingPercent <= config.warningThreshold) return 'WARNING';
    return 'NORMAL';
  };

  const config = DEFAULT_SHARED_POOL_CONFIG;

  // 100 total, 50 remaining => 50% => NORMAL
  assert.equal(evaluateWarningLevel(50, 100, config), 'NORMAL');

  // 100 total, 25 remaining => 25% => WARNING (<= 30%)
  assert.equal(evaluateWarningLevel(25, 100, config), 'WARNING');

  // 100 total, 8 remaining => 8% => CRITICAL (<= 10%)
  assert.equal(evaluateWarningLevel(8, 100, config), 'CRITICAL');

  // 100 total, 0 remaining => EXHAUSTED
  assert.equal(evaluateWarningLevel(0, 100, config), 'EXHAUSTED');

  // 0 total => EXHAUSTED
  assert.equal(evaluateWarningLevel(0, 0, config), 'EXHAUSTED');
});

test('Campaign Shared Pool - Claim TTL & Expiration Logic', () => {
  const now = new Date('2026-10-01T10:00:00.000Z');
  const ttlMinutes = 15;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  assert.equal(expiresAt.toISOString(), '2026-10-01T10:15:00.000Z');

  // If current time is 10:14:00 => Not expired
  const checkTimeActive = new Date('2026-10-01T10:14:00.000Z');
  assert.equal(checkTimeActive > expiresAt, false);

  // If current time is 10:15:01 => Expired
  const checkTimeExpired = new Date('2026-10-01T10:15:01.000Z');
  assert.equal(checkTimeExpired > expiresAt, true);
});

test('Campaign Shared Pool - Recycle Date Resolution', () => {
  const baseTime = new Date('2026-10-01T08:00:00.000Z');
  const rules = DEFAULT_SHARED_POOL_CONFIG.recycleRules || {};

  const resolveAvailableDate = (result: string, customDate?: Date): Date | null => {
    if (result === 'BOOKED' || result === 'REJECTED' || result === 'WRONG_NUMBER' || result === 'NO_NEED') {
      return null;
    }
    if (result === 'CALLBACK' && customDate) {
      return customDate;
    }
    const daysMap: Record<string, number | undefined | null> = {
      THINKING: rules.THINKING,
      NO_ANSWER: rules.NO_ANSWER,
      BUSY: rules.BUSY,
      CALL_FAILED: rules.ERROR,
    };
    const days = daysMap[result] ?? 1;
    return new Date(baseTime.getTime() + days * 24 * 60 * 60 * 1000);
  };

  const thinkingDate = resolveAvailableDate('THINKING');
  assert.equal(thinkingDate?.toISOString(), '2026-10-04T08:00:00.000Z');

  const noAnswerDate = resolveAvailableDate('NO_ANSWER');
  assert.equal(noAnswerDate?.toISOString(), '2026-10-02T08:00:00.000Z');

  const callbackCustom = new Date('2026-10-10T09:00:00.000Z');
  const callbackDate = resolveAvailableDate('CALLBACK', callbackCustom);
  assert.equal(callbackDate?.toISOString(), '2026-10-10T09:00:00.000Z');

  const bookedDate = resolveAvailableDate('BOOKED');
  assert.equal(bookedDate, null);

  const rejectedDate = resolveAvailableDate('REJECTED');
  assert.equal(rejectedDate, null);
});
