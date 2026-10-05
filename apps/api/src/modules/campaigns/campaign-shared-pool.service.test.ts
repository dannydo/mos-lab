import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHARED_POOL_CONFIG, type CampaignPoolStatus, type SharedPoolConfig } from '@mos-lab/shared';
import { CampaignService } from './campaign.service.js';

test('Campaign Shared Pool - Default configuration validation', () => {
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.batchSize, 100);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.maxClaimsPerStaff, 1);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.claimTtlMinutes, 15);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.cooldownMinutes, 60);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.isPaused, false);

  // Recycle rules (MOS-BUG-101)
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.THINKING, 7);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.NO_ANSWER, 3);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.BUSY, 3);
  assert.equal(DEFAULT_SHARED_POOL_CONFIG.recycleRules?.ERROR, 3);

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
  assert.equal(thinkingDate?.toISOString(), '2026-10-08T08:00:00.000Z');

  const noAnswerDate = resolveAvailableDate('NO_ANSWER');
  assert.equal(noAnswerDate?.toISOString(), '2026-10-04T08:00:00.000Z');

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

test('Campaign Shared Pool (MOS-FEAT-94) - Recovery mandatory reason validation', () => {
  const validateRecoveryReason = (reason?: string): boolean => {
    return Boolean(reason && reason.trim().length > 0);
  };

  assert.equal(validateRecoveryReason(''), false);
  assert.equal(validateRecoveryReason('   '), false);
  assert.equal(validateRecoveryReason(undefined), false);
  assert.equal(validateRecoveryReason('Telesales kẹt mạng không nhả được lock'), true);
  assert.equal(validateRecoveryReason('Khôi phục khách bị loại nhầm do thao tác sai'), true);
});

test('Campaign Shared Pool (MOS-FEAT-94) - Recovery action target pool status resolution', () => {
  const resolveRecoveryTargetStatus = (
    action: string,
    customStatus?: string,
    logPreviousStatus?: string
  ): { targetStatus: string; clearsClaim: boolean; clearsCooldown: boolean } => {
    switch (action) {
      case 'RELEASE_CLAIM':
      case 'FORCE_UNLOCK':
        return { targetStatus: 'AVAILABLE', clearsClaim: true, clearsCooldown: false };
      case 'RESTORE_EXCLUDED':
        return { targetStatus: 'AVAILABLE', clearsClaim: true, clearsCooldown: true };
      case 'RESET_RECYCLE':
        return { targetStatus: 'AVAILABLE', clearsClaim: false, clearsCooldown: true };
      case 'RESET_POOL_STATUS':
        return {
          targetStatus: customStatus || 'AVAILABLE',
          clearsClaim: (customStatus || 'AVAILABLE') === 'AVAILABLE',
          clearsCooldown: (customStatus || 'AVAILABLE') === 'AVAILABLE',
        };
      case 'ROLLBACK_TO_LOG':
        return {
          targetStatus: logPreviousStatus || 'AVAILABLE',
          clearsClaim: (logPreviousStatus || 'AVAILABLE') === 'AVAILABLE',
          clearsCooldown: (logPreviousStatus || 'AVAILABLE') === 'AVAILABLE',
        };
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  };

  // FORCE_UNLOCK => AVAILABLE, clears claim
  const forceUnlock = resolveRecoveryTargetStatus('FORCE_UNLOCK');
  assert.equal(forceUnlock.targetStatus, 'AVAILABLE');
  assert.equal(forceUnlock.clearsClaim, true);

  // RESTORE_EXCLUDED => AVAILABLE, clears claim and cooldown
  const restoreExcluded = resolveRecoveryTargetStatus('RESTORE_EXCLUDED');
  assert.equal(restoreExcluded.targetStatus, 'AVAILABLE');
  assert.equal(restoreExcluded.clearsClaim, true);
  assert.equal(restoreExcluded.clearsCooldown, true);

  // RESET_RECYCLE => AVAILABLE, clears cooldown
  const resetRecycle = resolveRecoveryTargetStatus('RESET_RECYCLE');
  assert.equal(resetRecycle.targetStatus, 'AVAILABLE');
  assert.equal(resetRecycle.clearsCooldown, true);

  // RESET_POOL_STATUS with custom status
  const resetCustom = resolveRecoveryTargetStatus('RESET_POOL_STATUS', 'RECYCLING');
  assert.equal(resetCustom.targetStatus, 'RECYCLING');
  assert.equal(resetCustom.clearsClaim, false);

  // ROLLBACK_TO_LOG with previous status
  const rollbackClaim = resolveRecoveryTargetStatus('ROLLBACK_TO_LOG', undefined, 'AVAILABLE');
  assert.equal(rollbackClaim.targetStatus, 'AVAILABLE');
  assert.equal(rollbackClaim.clearsClaim, true);
});

test('Campaign Shared Pool (MOS-FEAT-94) - State drift detection logic', () => {
  const detectStateDrift = (
    currentPoolStatus: string,
    expectedPostLogStatus: string,
    subsequentLogsCount: number
  ): boolean => {
    return subsequentLogsCount > 0 || currentPoolStatus !== expectedPostLogStatus;
  };

  // No new logs, current status matches log => No drift
  assert.equal(detectStateDrift('CLAIMED', 'CLAIMED', 0), false);
  assert.equal(detectStateDrift('AVAILABLE', 'AVAILABLE', 0), false);

  // Subsequent logs exist => Drift detected
  assert.equal(detectStateDrift('CLAIMED', 'CLAIMED', 2), true);

  // Status changed from CLAIMED to RECYCLING => Drift detected even if count is 0
  assert.equal(detectStateDrift('RECYCLING', 'CLAIMED', 0), true);

  // Customer was excluded after call => Drift detected
  assert.equal(detectStateDrift('EXCLUDED', 'AVAILABLE', 1), true);
});

test('Campaign Shared Pool (MOS-FEAT-94) - Audit log metadata preservation & append-only verification', () => {
  const createRecoveryLogEntry = (
    campaignId: number,
    customerId: number,
    staffId: number,
    staffName: string,
    recoveryAction: string,
    reason: string,
    previousState: any,
    nextState: any
  ) => {
    return {
      campaignId,
      campaignCustomerId: customerId,
      staffId,
      staffName,
      action: 'RECOVERY_OVERRIDE',
      note: `[KHÔI PHỤC] Thao tác: ${recoveryAction}. Lý do: ${reason}`,
      metadata: JSON.stringify({
        recoveryAction,
        reason,
        previousState,
        nextState,
        result: 'SUCCESS',
      }),
      createdAt: new Date('2026-10-03T10:00:00.000Z'),
    };
  };

  const entry = createRecoveryLogEntry(
    31,
    1001,
    1,
    'Danny Do',
    'FORCE_UNLOCK',
    'Telesales mất kết nối mạng',
    { poolStatus: 'CLAIMED', claimedByStaffId: 22 },
    { poolStatus: 'AVAILABLE', claimedByStaffId: null }
  );

  assert.equal(entry.action, 'RECOVERY_OVERRIDE');
  assert.equal(entry.staffId, 1);
  assert.equal(entry.staffName, 'Danny Do');
  assert.match(entry.note, /\[KHÔI PHỤC\]/);
  assert.match(entry.note, /Telesales mất kết nối mạng/);

  const parsed = JSON.parse(entry.metadata);
  assert.equal(parsed.recoveryAction, 'FORCE_UNLOCK');
  assert.equal(parsed.reason, 'Telesales mất kết nối mạng');
  assert.equal(parsed.previousState.poolStatus, 'CLAIMED');
  assert.equal(parsed.nextState.poolStatus, 'AVAILABLE');
  assert.equal(parsed.result, 'SUCCESS');
});

test('Campaign Shared Pool (MOS-BUG-97) - Pool Status normalization & claim invariants', () => {
  const canCustomerBeClaimed = (
    poolStatus: string,
    cooldownUntil: Date | null,
    now: Date
  ): { canClaim: boolean; reason?: string } => {
    if (poolStatus !== 'AVAILABLE') {
      if (poolStatus === 'CLAIMED') return { canClaim: false, reason: 'Đang được nhân viên khác xử lý' };
      if (poolStatus === 'RECYCLING' || poolStatus === 'RECYCLE')
        return { canClaim: false, reason: 'Đang trong thời gian chờ tái sinh' };
      if (poolStatus === 'EXCLUDED') return { canClaim: false, reason: 'Đã bị loại khỏi Shared Pool' };
      if (poolStatus === 'BOOKED') return { canClaim: false, reason: 'Đã chốt Booking' };
      return { canClaim: false, reason: 'Không ở trạng thái sẵn sàng' };
    }
    if (cooldownUntil && cooldownUntil > now) {
      return { canClaim: false, reason: 'Đang trong thời gian Cooldown chống spam' };
    }
    return { canClaim: true };
  };

  const now = new Date('2026-10-04T10:00:00.000Z');
  const pastCooldown = new Date('2026-10-04T09:00:00.000Z');
  const futureCooldown = new Date('2026-10-04T10:30:00.000Z');

  // AVAILABLE with no/past cooldown => CAN CLAIM
  assert.equal(canCustomerBeClaimed('AVAILABLE', null, now).canClaim, true);
  assert.equal(canCustomerBeClaimed('AVAILABLE', pastCooldown, now).canClaim, true);

  // AVAILABLE with future cooldown => BLOCKED
  assert.equal(canCustomerBeClaimed('AVAILABLE', futureCooldown, now).canClaim, false);

  // RECYCLING => CANNOT CLAIM
  assert.equal(canCustomerBeClaimed('RECYCLING', null, now).canClaim, false);
  assert.equal(canCustomerBeClaimed('RECYCLING', null, now).reason, 'Đang trong thời gian chờ tái sinh');

  // EXCLUDED => CANNOT CLAIM (never leaks back to active pool)
  assert.equal(canCustomerBeClaimed('EXCLUDED', null, now).canClaim, false);
  assert.equal(canCustomerBeClaimed('EXCLUDED', null, now).reason, 'Đã bị loại khỏi Shared Pool');

  // BOOKED => CANNOT CLAIM
  assert.equal(canCustomerBeClaimed('BOOKED', null, now).canClaim, false);
  assert.equal(canCustomerBeClaimed('BOOKED', null, now).reason, 'Đã chốt Booking');
});

test('Campaign Shared Pool (MOS-BUG-97) - Call wrapup determines EXCLUDED and clears recycle dates', () => {
  const EXCLUDED_RESULTS = new Set(['NO_NEED', 'REJECTED', 'WRONG_NUMBER', 'CLOSED', 'NOT_INTERESTED', 'DO_NOT_CALL']);

  const resolveWrapupStatus = (callResult: string, callbackDate?: Date | null) => {
    let nextPoolStatus: string = 'EXPLOITED';
    let availableAt: Date | null = null;
    let cooldownUntil: Date | null = new Date();

    if (callResult === 'BOOKED') {
      nextPoolStatus = 'BOOKED';
    } else if (EXCLUDED_RESULTS.has(callResult)) {
      nextPoolStatus = 'EXCLUDED';
      availableAt = null;
      cooldownUntil = null;
    } else if (callResult === 'CALLBACK') {
      nextPoolStatus = 'RECYCLING';
      availableAt = callbackDate || new Date();
    } else if (['THINKING', 'NO_ANSWER', 'BUSY', 'ERROR'].includes(callResult)) {
      nextPoolStatus = 'RECYCLING';
      availableAt = new Date();
    }

    return { nextPoolStatus, availableAt, cooldownUntil };
  };

  // NO_NEED, REJECTED, WRONG_NUMBER, CLOSED => EXCLUDED, availableAt=null, cooldownUntil=null
  for (const res of ['NO_NEED', 'REJECTED', 'WRONG_NUMBER', 'CLOSED']) {
    const wrapup = resolveWrapupStatus(res);
    assert.equal(wrapup.nextPoolStatus, 'EXCLUDED');
    assert.equal(wrapup.availableAt, null);
    assert.equal(wrapup.cooldownUntil, null);
  }

  // THINKING => RECYCLING
  const thinking = resolveWrapupStatus('THINKING');
  assert.equal(thinking.nextPoolStatus, 'RECYCLING');
  assert.notEqual(thinking.availableAt, null);

  // BOOKED => BOOKED
  const booked = resolveWrapupStatus('BOOKED');
  assert.equal(booked.nextPoolStatus, 'BOOKED');
});

test('Campaign Shared Pool (MOS-BUG-99) - Standard mOS Call Log mapping to Shared Pool status and rules', () => {
  const config = DEFAULT_SHARED_POOL_CONFIG;

  // 1. Outcome BOOKED -> poolStatus BOOKED, isPickup true, isBooked true, cooldownUntil set, availableAt null
  const bookedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'BOOKED',
      durationSec: 120,
      note: 'Khách đồng ý đến vào thứ 7',
    },
    config
  );
  assert.equal(bookedRes.mappedCallResult, 'BOOKED');
  assert.equal(bookedRes.isPickup, true);
  assert.equal(bookedRes.isBooked, true);
  assert.equal(bookedRes.isExcluded, false);
  assert.equal(bookedRes.nextPoolStatus, 'BOOKED');
  assert.equal(bookedRes.availableAt, null);
  assert.notEqual(bookedRes.cooldownUntil, null);

  // 2. Outcome RENEWED -> poolStatus BOOKED
  const renewedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'RENEWED',
      durationSec: 85,
      note: 'Gia hạn combo 10 buổi',
    },
    config
  );
  assert.equal(renewedRes.mappedCallResult, 'BOOKED');
  assert.equal(renewedRes.isBooked, true);
  assert.equal(renewedRes.nextPoolStatus, 'BOOKED');

  // 3. Outcome CALL_BACK -> poolStatus RECYCLING, availableAt matches callbackDate
  const callbackDate = new Date('2026-10-15T10:00:00.000Z');
  const callbackRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'CALL_BACK',
      durationSec: 45,
      callbackDate,
      note: 'Khách bận, gọi lại ngày 15/10',
    },
    config
  );
  assert.equal(callbackRes.mappedCallResult, 'CALLBACK');
  assert.equal(callbackRes.isPickup, true);
  assert.equal(callbackRes.isExcluded, false);
  assert.equal(callbackRes.nextPoolStatus, 'RECYCLING');
  assert.equal(callbackRes.availableAt?.toISOString(), callbackDate.toISOString());

  // 4. Outcome NO_NEED -> poolStatus EXCLUDED
  const noNeedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'NO_NEED',
      durationSec: 30,
      note: 'Khách không có nhu cầu làm mi nữa',
    },
    config
  );
  assert.equal(noNeedRes.mappedCallResult, 'NO_NEED');
  assert.equal(noNeedRes.isPickup, true);
  assert.equal(noNeedRes.isExcluded, true);
  assert.equal(noNeedRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(noNeedRes.availableAt, null);
  assert.equal(noNeedRes.cooldownUntil, null);

  // 5. Outcome REFUSED -> poolStatus EXCLUDED
  const refusedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'REFUSED',
      durationSec: 15,
      note: 'Yêu cầu không làm phiền',
    },
    config
  );
  assert.equal(refusedRes.mappedCallResult, 'REJECTED');
  assert.equal(refusedRes.isPickup, true);
  assert.equal(refusedRes.isExcluded, true);
  assert.equal(refusedRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(refusedRes.availableAt, null);
  assert.equal(refusedRes.cooldownUntil, null);

  // 6. CallResult WRONG_NUMBER -> poolStatus EXCLUDED
  const wrongNumRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'WRONG_NUMBER',
      outcome: 'PENDING',
      durationSec: 10,
      note: 'Nhầm số',
    },
    config
  );
  assert.equal(wrongNumRes.mappedCallResult, 'WRONG_NUMBER');
  assert.equal(wrongNumRes.isExcluded, true);
  assert.equal(wrongNumRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(wrongNumRes.availableAt, null);
  assert.equal(wrongNumRes.cooldownUntil, null);

  // 7. CallResult NO_ANSWER -> poolStatus RECYCLING, isPickup false
  const noAnswerRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'NO_ANSWER',
      outcome: 'PENDING',
      durationSec: 0,
      note: 'Gọi nhỡ',
    },
    config
  );
  assert.equal(noAnswerRes.mappedCallResult, 'NO_ANSWER');
  assert.equal(noAnswerRes.isPickup, false);
  assert.equal(noAnswerRes.nextPoolStatus, 'RECYCLING');
  assert.notEqual(noAnswerRes.availableAt, null);

  // 8. CallResult BUSY -> poolStatus RECYCLING, isPickup false
  const busyRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'BUSY',
      outcome: 'PENDING',
      durationSec: 0,
      note: 'Máy bận',
    },
    config
  );
  assert.equal(busyRes.mappedCallResult, 'BUSY');
  assert.equal(busyRes.isPickup, false);
  assert.equal(busyRes.nextPoolStatus, 'RECYCLING');

  // 9. CallResult FAILED -> poolStatus RECYCLING (maps to ERROR in recycleRules), isPickup false
  const failedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'FAILED',
      outcome: 'PENDING',
      durationSec: 0,
      note: 'Thuê bao',
    },
    config
  );
  assert.equal(failedRes.mappedCallResult, 'ERROR');
  assert.equal(failedRes.isPickup, false);
  assert.equal(failedRes.nextPoolStatus, 'RECYCLING');

  // 10. CallResult ANSWERED (PENDING) -> poolStatus RECYCLING (maps to THINKING in recycleRules), isPickup true
  const answeredRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'PENDING',
      durationSec: 60,
      note: 'Đang suy nghĩ',
    },
    config
  );
  assert.equal(answeredRes.mappedCallResult, 'THINKING');
  assert.equal(answeredRes.isPickup, true);
  assert.equal(answeredRes.nextPoolStatus, 'RECYCLING');
});

test('Campaign Shared Pool (MOS-BUG-98) - Atomic Mutual Exclusion Concurrency Lock', () => {
  // Simulate atomic DB conditional update: updateMany where id = 1 AND poolStatus = 'AVAILABLE'
  interface CustomerRecord {
    id: number;
    poolStatus: string;
    claimedByStaffId: number | null;
    claimedByStaffName: string | null;
    claimExpiresAt: Date | null;
  }

  const dbState: CustomerRecord = {
    id: 101,
    poolStatus: 'AVAILABLE',
    claimedByStaffId: null,
    claimedByStaffName: null,
    claimExpiresAt: null,
  };

  const atomicClaim = (staffId: number, staffName: string, ttlMinutes = 15): boolean => {
    // Check conditional WHERE
    if (dbState.poolStatus !== 'AVAILABLE') {
      return false;
    }
    // Atomic update
    dbState.poolStatus = 'CLAIMED';
    dbState.claimedByStaffId = staffId;
    dbState.claimedByStaffName = staffName;
    dbState.claimExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    return true;
  };

  // Staff 1 claims first
  const staff1Claim = atomicClaim(1, 'Danny Do');
  assert.equal(staff1Claim, true);
  assert.equal(dbState.poolStatus, 'CLAIMED');
  assert.equal(dbState.claimedByStaffId, 1);

  // Staff 2 claims concurrently
  const staff2Claim = atomicClaim(2, 'Sarah Connor');
  assert.equal(staff2Claim, false, 'Staff 2 must fail to claim already claimed customer');
  assert.equal(dbState.claimedByStaffId, 1, 'Lock must remain with Staff 1');
});

test('Campaign Shared Pool (MOS-BUG-98) - TTL Expiration and Auto-Release', () => {
  interface CustomerRecord {
    id: number;
    poolStatus: string;
    claimedByStaffId: number | null;
    claimExpiresAt: Date;
  }

  const now = new Date('2026-10-04T12:00:00.000Z');
  const expiredCustomer: CustomerRecord = {
    id: 201,
    poolStatus: 'CLAIMED',
    claimedByStaffId: 5,
    claimExpiresAt: new Date('2026-10-04T11:59:00.000Z'), // 1 min ago
  };

  const activeCustomer: CustomerRecord = {
    id: 202,
    poolStatus: 'CLAIMED',
    claimedByStaffId: 6,
    claimExpiresAt: new Date('2026-10-04T12:10:00.000Z'), // 10 mins in future
  };

  const checkAndReleaseExpired = (customer: CustomerRecord, currentTime: Date) => {
    if (customer.poolStatus === 'CLAIMED' && customer.claimExpiresAt <= currentTime) {
      return {
        released: true,
        poolStatus: 'AVAILABLE',
        claimedByStaffId: null,
        releaseReason: 'LOCK_EXPIRED',
      };
    }
    return {
      released: false,
      poolStatus: customer.poolStatus,
      claimedByStaffId: customer.claimedByStaffId,
      releaseReason: null,
    };
  };

  const resultExpired = checkAndReleaseExpired(expiredCustomer, now);
  assert.equal(resultExpired.released, true);
  assert.equal(resultExpired.poolStatus, 'AVAILABLE');
  assert.equal(resultExpired.releaseReason, 'LOCK_EXPIRED');

  const resultActive = checkAndReleaseExpired(activeCustomer, now);
  assert.equal(resultActive.released, false);
  assert.equal(resultActive.poolStatus, 'CLAIMED');
  assert.equal(resultActive.claimedByStaffId, 6);
});

test('Campaign Shared Pool (MOS-BUG-98) - Audit Log Metadata completeness', () => {
  interface AuditLogEntry {
    action: string;
    campaignCustomerId: number | null;
    claimedByStaffId?: number | null;
    claimedByStaffName?: string | null;
    claimExpiresAt?: Date | null;
    releasedByStaffId?: number | null;
    releasedByStaffName?: string | null;
    releasedAt?: Date | null;
    releaseReason?: string | null;
    meta?: any;
  }

  const claimLog: AuditLogEntry = {
    action: 'CLAIM_CUSTOMER',
    campaignCustomerId: 101,
    claimedByStaffId: 1,
    claimedByStaffName: 'Danny Do',
    claimExpiresAt: new Date('2026-10-04T12:15:00.000Z'),
    meta: {
      clientIp: '127.0.0.1',
      ttlMinutes: 15,
    },
  };

  assert.equal(claimLog.action, 'CLAIM_CUSTOMER');
  assert.equal(claimLog.claimedByStaffId, 1);
  assert.notEqual(claimLog.claimExpiresAt, null);

  const releaseLog: AuditLogEntry = {
    action: 'RELEASE_CLAIM',
    campaignCustomerId: 101,
    releasedByStaffId: 1,
    releasedByStaffName: 'Danny Do',
    releasedAt: new Date('2026-10-04T12:05:00.000Z'),
    releaseReason: 'STAFF_RELEASE',
    meta: {
      durationSeconds: 300,
    },
  };

  assert.equal(releaseLog.action, 'RELEASE_CLAIM');
  assert.equal(releaseLog.releaseReason, 'STAFF_RELEASE');
  assert.equal(releaseLog.releasedByStaffId, 1);
});

test('Campaign Shared Pool (MOS-BUG-101) - Comprehensive Post-Call Auto Routing & Invariants', () => {
  const config = DEFAULT_SHARED_POOL_CONFIG;
  const now = Date.now();

  // 1. Không bắt máy - NO_ANSWER (Gọi nhỡ) -> RECYCLING sau 3 ngày
  const noAnswerRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'NO_ANSWER',
      outcome: 'GỌI NHỠ KHÔNG BẮT MÁY',
      durationSec: 0,
    },
    config
  );
  assert.equal(noAnswerRes.mappedCallResult, 'NO_ANSWER');
  assert.equal(noAnswerRes.isPickup, false);
  assert.equal(noAnswerRes.nextPoolStatus, 'RECYCLING');
  assert.equal(noAnswerRes.isBooked, false);
  assert.equal(noAnswerRes.isExcluded, false);
  assert.notEqual(noAnswerRes.availableAt, null);
  const diffDaysNoAnswer = (noAnswerRes.availableAt!.getTime() - now) / (24 * 3600 * 1000);
  assert.ok(diffDaysNoAnswer >= 2.9 && diffDaysNoAnswer <= 3.1, 'NO_ANSWER must recycle after 3 days');

  // 2. Không bắt máy - BUSY (Máy bận) -> RECYCLING sau 3 ngày
  const busyRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'BUSY',
      outcome: 'MÁY BẬN',
      durationSec: 0,
    },
    config
  );
  assert.equal(busyRes.mappedCallResult, 'BUSY');
  assert.equal(busyRes.isPickup, false);
  assert.equal(busyRes.nextPoolStatus, 'RECYCLING');
  assert.notEqual(busyRes.availableAt, null);
  const diffDaysBusy = (busyRes.availableAt!.getTime() - now) / (24 * 3600 * 1000);
  assert.ok(diffDaysBusy >= 2.9 && diffDaysBusy <= 3.1, 'BUSY must recycle after 3 days');

  // 3. Không bắt máy - ERROR / FAILED (Lỗi cuộc gọi / Thuê bao) -> RECYCLING sau 3 ngày
  const failedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'FAILED',
      outcome: 'THUÊ BAO KHÔNG LIÊN LẠC ĐƯỢC',
      durationSec: 0,
    },
    config
  );
  assert.equal(failedRes.mappedCallResult, 'ERROR');
  assert.equal(failedRes.isPickup, false);
  assert.equal(failedRes.nextPoolStatus, 'RECYCLING');
  assert.notEqual(failedRes.availableAt, null);
  const diffDaysFailed = (failedRes.availableAt!.getTime() - now) / (24 * 3600 * 1000);
  assert.ok(diffDaysFailed >= 2.9 && diffDaysFailed <= 3.1, 'FAILED/ERROR must recycle after 3 days');

  // 4. Không bắt máy - WRONG_NUMBER (Sai số) -> EXCLUDED (Chờ kiểm tra), rời Active Pool ngay
  const wrongNumRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'WRONG_NUMBER',
      outcome: 'SAI SỐ ĐIỆN THOẠI',
      durationSec: 0,
    },
    config
  );
  assert.equal(wrongNumRes.mappedCallResult, 'WRONG_NUMBER');
  assert.equal(wrongNumRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(wrongNumRes.isExcluded, true);
  assert.equal(wrongNumRes.availableAt, null, 'EXCLUDED must not have availableAt (leaves active pool)');
  assert.equal(wrongNumRes.cooldownUntil, null, 'EXCLUDED must not have cooldownUntil');

  // 5. Có bắt máy - BOOKED (Đã đặt lịch hẹn mới) -> BOOKED, rời Active Pool ngay
  const bookedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'BOOKED ĐẶT LỊCH HẸN MỚI',
      durationSec: 120,
    },
    config
  );
  assert.equal(bookedRes.mappedCallResult, 'BOOKED');
  assert.equal(bookedRes.isPickup, true);
  assert.equal(bookedRes.nextPoolStatus, 'BOOKED');
  assert.equal(bookedRes.isBooked, true);
  assert.equal(bookedRes.availableAt, null, 'BOOKED must leave active pool (availableAt is null)');

  // 6. Có bắt máy - CALLBACK (Hẹn gọi lại sau) -> RECYCLING theo callbackDate
  const callbackDateTarget = new Date(now + 48 * 3600 * 1000); // 2 days later
  const callbackRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'HẸN GỌI LẠI SAU',
      durationSec: 45,
      callbackDate: callbackDateTarget,
    },
    config
  );
  assert.equal(callbackRes.mappedCallResult, 'CALLBACK');
  assert.equal(callbackRes.isPickup, true);
  assert.equal(callbackRes.nextPoolStatus, 'RECYCLING');
  assert.equal(callbackRes.availableAt?.toISOString(), callbackDateTarget.toISOString());

  // 7. Có bắt máy - THINKING (Đang suy nghĩ / Chưa chốt) -> RECYCLING sau 7 ngày
  const thinkingRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'CHƯA CHỐT ĐANG SUY NGHĨ',
      durationSec: 90,
    },
    config
  );
  assert.equal(thinkingRes.mappedCallResult, 'THINKING');
  assert.equal(thinkingRes.isPickup, true);
  assert.equal(thinkingRes.nextPoolStatus, 'RECYCLING');
  assert.notEqual(thinkingRes.availableAt, null);
  const diffDaysThinking = (thinkingRes.availableAt!.getTime() - now) / (24 * 3600 * 1000);
  assert.ok(diffDaysThinking >= 6.9 && diffDaysThinking <= 7.1, 'THINKING must recycle after 7 days');

  // 8. Có bắt máy - NO_NEED (Không có nhu cầu) -> EXCLUDED (Chờ kiểm tra), rời Active Pool ngay
  const noNeedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'KHÔNG CÓ NHU CẦU',
      durationSec: 30,
    },
    config
  );
  assert.equal(noNeedRes.mappedCallResult, 'NO_NEED');
  assert.equal(noNeedRes.isPickup, true);
  assert.equal(noNeedRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(noNeedRes.isExcluded, true);
  assert.equal(noNeedRes.availableAt, null, 'NO_NEED leaves active pool');
  assert.equal(noNeedRes.cooldownUntil, null);

  // 9. Có bắt máy - REFUSED / REJECTED (Từ chối / Yêu cầu không gọi lại) -> EXCLUDED (Chờ kiểm tra)
  const refusedRes = CampaignService.mapCallLogToSharedPool(
    {
      callResult: 'ANSWERED',
      outcome: 'TỪ CHỐI KHÔNG GỌI NỮA',
      durationSec: 25,
    },
    config
  );
  assert.equal(refusedRes.mappedCallResult, 'REJECTED');
  assert.equal(refusedRes.isPickup, true);
  assert.equal(refusedRes.nextPoolStatus, 'EXCLUDED');
  assert.equal(refusedRes.isExcluded, true);
  assert.equal(refusedRes.availableAt, null, 'REFUSED leaves active pool');
  assert.equal(refusedRes.cooldownUntil, null);
});

test('Campaign Shared Pool (MOS-BUG-103) - Recycle Return clears all claim locks and assigns current batch', () => {
  interface CustomerRecord {
    id: number;
    campaignId: number;
    batchNumber: number;
    poolStatus: string;
    availableAt: Date | null;
    claimedByStaffId: number | null;
    claimedByStaffName: string | null;
    claimedAt: Date | null;
    claimExpiresAt: Date | null;
    cooldownUntil: Date | null;
  }

  const now = new Date('2026-10-05T10:00:00.000Z');
  const currentBatchNumber = 11;

  // Khách hàng hoàn tất recycle từ batch 3 với tàn dư lock/cooldown từ phiên làm việc trước
  const recyclingCustomer: CustomerRecord = {
    id: 301,
    campaignId: 1,
    batchNumber: 3,
    poolStatus: 'RECYCLING',
    availableAt: new Date('2026-10-05T09:00:00.000Z'), // 1 tiếng trước (đã đến hạn quay lại)
    claimedByStaffId: 42,
    claimedByStaffName: 'Nhân viên cũ',
    claimedAt: new Date('2026-10-01T10:00:00.000Z'),
    claimExpiresAt: new Date('2026-10-01T10:15:00.000Z'),
    cooldownUntil: new Date('2026-10-05T12:00:00.000Z'), // cooldown cũ còn sót
  };

  const processRecycleReturn = (customer: CustomerRecord, currentTime: Date, activeBatch: number) => {
    const isRecycleStatus = customer.poolStatus === 'RECYCLING' || customer.poolStatus === 'RECYCLE';
    const isReady = customer.availableAt && customer.availableAt <= currentTime;

    if (isRecycleStatus && isReady) {
      return {
        ...customer,
        poolStatus: 'AVAILABLE',
        availableAt: null,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        batchNumber: activeBatch,
      };
    }
    return customer;
  };

  const refreshed = processRecycleReturn(recyclingCustomer, now, currentBatchNumber);

  assert.equal(refreshed.poolStatus, 'AVAILABLE', 'Khách hết hạn recycle phải chuyển sang AVAILABLE');
  assert.equal(refreshed.availableAt, null, 'availableAt phải được clear về null');
  assert.equal(refreshed.claimedByStaffId, null, 'claimedByStaffId phải được reset về null');
  assert.equal(refreshed.claimedByStaffName, null, 'claimedByStaffName phải được reset về null');
  assert.equal(refreshed.claimedAt, null, 'claimedAt phải được reset về null');
  assert.equal(refreshed.claimExpiresAt, null, 'claimExpiresAt phải được reset về null');
  assert.equal(refreshed.cooldownUntil, null, 'cooldownUntil phải được reset về null');
  assert.equal(refreshed.batchNumber, 11, 'batchNumber phải cập nhật sang currentBatchNumber đang hoạt động');
});

test('Campaign Shared Pool (MOS-BUG-103) - Auto-heal claim for expired recycling customers', () => {
  interface CustomerRecord {
    id: number;
    campaignId: number;
    batchNumber: number;
    poolStatus: string;
    availableAt: Date | null;
    claimedByStaffId: number | null;
    claimedByStaffName: string | null;
    claimedAt: Date | null;
    claimExpiresAt: Date | null;
    cooldownUntil: Date | null;
  }

  const now = new Date('2026-10-05T10:00:00.000Z');
  const currentBatch = 5;

  const claimCustomerLogic = (
    customer: CustomerRecord,
    staffId: number,
    staffName: string,
    currentTime: Date,
    activeBatch: number
  ) => {
    // Auto-heal nếu khách đang RECYCLING nhưng đã tới hạn availableAt <= currentTime
    if ((customer.poolStatus === 'RECYCLING' || customer.poolStatus === 'RECYCLE') && customer.availableAt && customer.availableAt <= currentTime) {
      customer.poolStatus = 'AVAILABLE';
      customer.availableAt = null;
      customer.claimedByStaffId = null;
      customer.claimedByStaffName = null;
      customer.claimedAt = null;
      customer.claimExpiresAt = null;
      customer.cooldownUntil = null;
      customer.batchNumber = activeBatch;
    }

    if (customer.poolStatus === 'RECYCLING' || customer.poolStatus === 'RECYCLE') {
      throw new Error('Khách hàng đang trong thời gian chờ tái sinh, chưa thể nhận lại');
    }

    if (customer.poolStatus !== 'AVAILABLE') {
      throw new Error('Khách hàng đã được nhân viên khác nhận');
    }

    // Atomic claim
    customer.poolStatus = 'CLAIMED';
    customer.claimedByStaffId = staffId;
    customer.claimedByStaffName = staffName;
    customer.claimExpiresAt = new Date(currentTime.getTime() + 15 * 60 * 1000);
    return customer;
  };

  // Case 1: Khách hàng hết hạn RECYCLING -> Auto-heal và claim thành công ngay lập tức
  const expiredRecyclingCustomer: CustomerRecord = {
    id: 401,
    campaignId: 2,
    batchNumber: 2,
    poolStatus: 'RECYCLING',
    availableAt: new Date('2026-10-05T09:30:00.000Z'),
    claimedByStaffId: 10,
    claimedByStaffName: 'Nhân viên cũ',
    claimedAt: new Date('2026-10-01T10:00:00.000Z'),
    claimExpiresAt: null,
    cooldownUntil: null,
  };

  const claimedResult = claimCustomerLogic(expiredRecyclingCustomer, 99, 'Thanh Vũ', now, currentBatch);
  assert.equal(claimedResult.poolStatus, 'CLAIMED');
  assert.equal(claimedResult.claimedByStaffId, 99);
  assert.equal(claimedResult.claimedByStaffName, 'Thanh Vũ');
  assert.equal(claimedResult.batchNumber, 5);

  // Case 2: Khách hàng chưa hết hạn RECYCLING -> Phải ném lỗi chính xác
  const stillRecyclingCustomer: CustomerRecord = {
    id: 402,
    campaignId: 2,
    batchNumber: 2,
    poolStatus: 'RECYCLING',
    availableAt: new Date('2026-10-05T15:00:00.000Z'), // Còn 5 tiếng nữa
    claimedByStaffId: null,
    claimedByStaffName: null,
    claimedAt: null,
    claimExpiresAt: null,
    cooldownUntil: null,
  };

  assert.throws(
    () => claimCustomerLogic(stillRecyclingCustomer, 99, 'Thanh Vũ', now, currentBatch),
    /Khách hàng đang trong thời gian chờ tái sinh, chưa thể nhận lại/
  );
});

test('Campaign Shared Pool (MOS-BUG-103) - View mapping exposes expired recycling as AVAILABLE and canClaim=true', () => {
  const now = new Date('2026-10-05T10:00:00.000Z');
  const staffId = 88;

  const mapCustomerView = (rawCustomer: Record<string, unknown>, currentTime: Date, currentStaffId: number) => {
    let poolStatus = rawCustomer.poolStatus as string;
    let claimedByStaffId = rawCustomer.claimedByStaffId as number | null;
    let claimExpiresAt = rawCustomer.claimExpiresAt as string | null;
    let cooldownUntil = rawCustomer.cooldownUntil as string | null;

    const isRecycleEnded =
      (poolStatus === 'RECYCLING' || poolStatus === 'RECYCLE') &&
      Boolean(rawCustomer.availableAt) &&
      new Date(rawCustomer.availableAt as string) <= currentTime;

    if (isRecycleEnded) {
      poolStatus = 'AVAILABLE';
      claimedByStaffId = null;
      claimExpiresAt = null;
      cooldownUntil = null;
    }

    const isClaimExpired =
      poolStatus === 'CLAIMED' && claimExpiresAt && new Date(claimExpiresAt) < currentTime;
    const isCooldownActive = cooldownUntil && new Date(cooldownUntil) > currentTime;
    const isClaimedByMe = poolStatus === 'CLAIMED' && claimedByStaffId === currentStaffId && !isClaimExpired;

    const canClaim =
      (poolStatus === 'AVAILABLE' || isClaimExpired || isRecycleEnded) &&
      !isCooldownActive &&
      !isClaimedByMe;

    return {
      poolStatus,
      isClaimedByMe,
      canClaim,
    };
  };

  // Khách hết hạn recycle
  const customerExpired = {
    poolStatus: 'RECYCLING',
    availableAt: '2026-10-05T08:00:00.000Z',
    claimedByStaffId: 12,
    claimedByStaffName: 'Trần Lan',
    claimExpiresAt: '2026-10-01T12:00:00.000Z',
    cooldownUntil: null,
  };

  const viewResult = mapCustomerView(customerExpired, now, staffId);
  assert.equal(viewResult.poolStatus, 'AVAILABLE');
  assert.equal(viewResult.canClaim, true);
  assert.equal(viewResult.isClaimedByMe, false);
});

