import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHARED_POOL_CONFIG, CampaignPoolStatus, SharedPoolConfig } from '@mos-lab/shared';

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

test('Campaign Staff Performance - Pickup Call Classification (MOS-BUG-81)', () => {
  const PICKUP_CALL_RESULTS = new Set([
    'BOOKED',
    'THINKING',
    'CALLBACK',
    'NO_NEED',
    'REJECTED',
    'WRONG_NUMBER',
    'ANSWERED',
    'ANSWER',
    'CONNECTED',
  ]);
  const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);

  const classifyPickup = (result: string, durationSec: number = 0): boolean => {
    const norm = (result || '').toUpperCase();
    return !NON_PICKUP_RESULTS.has(norm) && (PICKUP_CALL_RESULTS.has(norm) || durationSec > 0);
  };

  // Pickup = true
  assert.equal(classifyPickup('BOOKED', 60), true);
  assert.equal(classifyPickup('THINKING', 60), true);
  assert.equal(classifyPickup('CALLBACK', 30), true);
  assert.equal(classifyPickup('NO_NEED', 45), true);
  assert.equal(classifyPickup('REJECTED', 10), true);
  assert.equal(classifyPickup('WRONG_NUMBER', 15), true);
  assert.equal(classifyPickup('ANSWERED', 120), true);

  // Non-pickup = false (even if default durationSec is non-zero in form)
  assert.equal(classifyPickup('NO_ANSWER', 60), false);
  assert.equal(classifyPickup('NO_ANSWER', 0), false);
  assert.equal(classifyPickup('BUSY', 60), false);
  assert.equal(classifyPickup('ERROR', 60), false);
  assert.equal(classifyPickup('FAILED', 0), false);
  assert.equal(classifyPickup('MISSED', 0), false);
});

test('Campaign Staff Performance - Conversion Rate and Metrics Calculation (MOS-BUG-81)', () => {
  const computeStaffPerformance = (
    staffId: number,
    staffName: string,
    exploitedCustomerIds: number[],
    pickupCounts: number,
    bookedCustomerIds: number[]
  ) => {
    const exploitedCount = new Set(exploitedCustomerIds).size;
    const bookedCount = new Set(bookedCustomerIds).size;
    const conversionRate = exploitedCount > 0 ? Number(((bookedCount / exploitedCount) * 100).toFixed(1)) : 0;
    return {
      staffId,
      staffName,
      exploitedCount,
      pickupCount: pickupCounts,
      bookedCount,
      conversionRate,
    };
  };

  // Case 1: Staff with successful bookings (Thanh Vũ: 32 exploited, 16 pickups, 1 booking)
  const staff1 = computeStaffPerformance(
    70,
    'Thanh Vũ',
    Array.from({ length: 32 }, (_, i) => i + 1),
    16,
    [1]
  );
  assert.equal(staff1.exploitedCount, 32);
  assert.equal(staff1.pickupCount, 16);
  assert.equal(staff1.bookedCount, 1);
  assert.equal(staff1.conversionRate, 3.1);

  // Case 2: Staff with 0 bookings (Ngọc Điệp: 36 exploited, 26 pickups, 0 bookings)
  const staff2 = computeStaffPerformance(
    18,
    'Ngọc Điệp',
    Array.from({ length: 36 }, (_, i) => i + 100),
    26,
    []
  );
  assert.equal(staff2.exploitedCount, 36);
  assert.equal(staff2.pickupCount, 26);
  assert.equal(staff2.bookedCount, 0);
  assert.equal(staff2.conversionRate, 0.0);

  // Case 3: Staff with 0 exploited (assigned but hasn't started)
  const staff3 = computeStaffPerformance(99, 'Nhân viên mới', [], 0, []);
  assert.equal(staff3.exploitedCount, 0);
  assert.equal(staff3.pickupCount, 0);
  assert.equal(staff3.bookedCount, 0);
  assert.equal(staff3.conversionRate, 0.0);

  // Sorting test: bookedCount DESC, exploitedCount DESC
  const list = [staff2, staff1, staff3];
  list.sort((a, b) => b.bookedCount - a.bookedCount || b.exploitedCount - a.exploitedCount);
  assert.equal(list[0].staffId, 70); // Thanh Vũ Top 1 (1 book)
  assert.equal(list[1].staffId, 18); // Ngọc Điệp Top 2 (36 exploited, 0 book)
  assert.equal(list[2].staffId, 99); // Nhân viên mới Top 3 (0 exploited)
});
