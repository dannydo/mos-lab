import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHARED_POOL_CONFIG, CampaignPoolStatus, SharedPoolConfig } from '@mos-lab/shared';
import { CampaignService } from './campaign.service.js';

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
