import { IosPromotionOption, isPromotionEligibleForCustomer, SafeAny } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { getLegacyPool } from './db-pools.js';
import type { IosAuthContext } from './ios-auth.service.js';
import type { ExecuteIosActionResult } from './ios-actions.types.js';
import type { BookingOverrideRecord, createOverrideRepository } from './ios-overrides.service.js';
import { settleIosOrderWithLegacyPhp, type SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import {
  applyStepSyncResultToOverride,
  STEP_SYNC_ELIGIBLE_ACTIONS,
  syncIosStepWithLegacyPhp,
} from './ios-legacy-step-sync.service.js';
import {
  applyTargetedPromotionToOverride,
  fetchPromotionsByIds,
  resolveCheckoutOverridePromotions,
} from './ios-promotions.service.js';
import { invalidateStaffStatsCache } from './ios-staff-stats.service.js';
import { grantReferralDiamond } from './ios-referral-diamond.service.js';

type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

export async function resolveSavePromotionOverride(params: {
  current: BookingOverrideRecord;
  body: SafeAny;
}): Promise<{ errorResult?: ExecuteIosActionResult; nextOverride?: BookingOverrideRecord }> {
  const { current, body } = params;
  const targetScopeRaw = String(body.targetScope || '')
    .trim()
    .toLowerCase();
  const requestedPromotionId =
    body.promotionId !== undefined && body.promotionId !== null && Number(body.promotionId) > 0
      ? Number(body.promotionId)
      : null;

  if ((targetScopeRaw === 'combo' || targetScopeRaw === 'under_combo') && requestedPromotionId) {
    return {
      errorResult: {
        statusCode: 400,
        payload: {
          success: false,
          error: 'Không áp dụng chương trình khuyến mãi giảm giá cho gói Combo nối mi.',
        },
      },
    };
  }

  let resolvedPromotion: IosPromotionOption | null =
    requestedPromotionId && body.appliedPromotion && Number(body.appliedPromotion?.promotionId) === requestedPromotionId
      ? (body.appliedPromotion as IosPromotionOption)
      : null;

  if (requestedPromotionId && !resolvedPromotion) {
    try {
      const map = await fetchPromotionsByIds(getLegacyPool(), [requestedPromotionId]);
      resolvedPromotion = map.get(requestedPromotionId) ?? null;
    } catch {
      resolvedPromotion = null;
    }
  }

  const customerVisits = Number(body.customerVisits ?? current.customerVisits ?? 1);
  if (resolvedPromotion && !isPromotionEligibleForCustomer(resolvedPromotion, customerVisits)) {
    return {
      errorResult: {
        statusCode: 400,
        payload: {
          success: false,
          error: 'Chương trình khuyến mãi này chỉ áp dụng cho khách hàng mới (lần đầu).',
        },
      },
    };
  }

  return {
    nextOverride: applyTargetedPromotionToOverride(current, body, requestedPromotionId, resolvedPromotion),
  };
}

export async function executeCompleteOrderTransition(params: {
  authUser: IosAuthContext;
  bookingId: number;
  body: SafeAny;
  current: BookingOverrideRecord;
  walletSelectionPatch: Record<string, SafeAny>;
  effectiveCustomerId: number;
  actorStaffId: number;
  actorStaffName: string;
  actorStaffTier: string;
  isSimulationMode: boolean;
  repo: IosOverrideRepository;
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>;
  fastify?: FastifyInstance;
}): Promise<BookingOverrideRecord> {
  const {
    authUser,
    bookingId,
    body,
    current,
    walletSelectionPatch,
    effectiveCustomerId,
    actorStaffId,
    actorStaffName,
    actorStaffTier,
    isSimulationMode,
    repo,
    bridgeDepsOverride,
    fastify,
  } = params;

  const checkOutStaffId = Number(current.checkOutStaffId || actorStaffId);
  const checkOutStaffName = current.checkOutStaffName || actorStaffName;
  const checkOutStaffTier = current.checkOutStaffTier || actorStaffTier;
  const checkInStaffId = Number(current.checkInStaffId || actorStaffId);
  const assignedStaffId = Number(current.assignedStaffId || actorStaffId);
  const completedAtIso = new Date().toISOString();
  const canAuthUserSettleCounter = authUser.careerTier === 'CC' || authUser.careerTier === 'ADMIN';
  const trustedSettlementTier = canAuthUserSettleCounter ? actorStaffTier : String(authUser.careerTier || 'CVL');

  const resolvedPromos = resolveCheckoutOverridePromotions(current, body);

  const draftOverride: BookingOverrideRecord = {
    ...current,
    ...walletSelectionPatch,
    status: 'DONE',
    checkInStaffId,
    assignedStaffId,
    checkOutStaffId,
    checkOutStaffName,
    checkOutStaffTier,
    cartProducts: resolvedPromos.cartProducts,
    selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
    selectedUnderCombo: body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
    comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
    ...(body.hasUnderMinkCombo !== undefined ? { hasUnderMinkCombo: Boolean(body.hasUnderMinkCombo) } : {}),
    promotionId: resolvedPromos.promotionId,
    appliedPromotion: resolvedPromos.appliedPromotion,
    servicePromotionId: resolvedPromos.servicePromotionId,
    servicePromotion: resolvedPromos.servicePromotion,
    comboPromotionId: resolvedPromos.comboPromotionId,
    comboPromotion: resolvedPromos.comboPromotion,
    underComboPromotionId: resolvedPromos.underComboPromotionId,
    underComboPromotion: resolvedPromos.underComboPromotion,
    billing: {
      ...(current.billing || {}),
      ...(body.billing || {}),
      promotionId: resolvedPromos.promotionId,
      ...(resolvedPromos.appliedPromotion ? { promotionName: resolvedPromos.appliedPromotion.name } : {}),
      ...(resolvedPromos.legacyCreditLocked ? { diamondUsed: 0, diamondDiscountAmount: 0 } : {}),
      settledByTier: trustedSettlementTier,
      completedAt: completedAtIso,
    },
    progress: {
      ...(current.progress || {}),
      completedAt: completedAtIso,
      timerRunning: false,
      currentStep: 1,
    },
    completedAt: completedAtIso,
  };

  const settlement = isSimulationMode
    ? {
        settledAt: completedAtIso,
        orderState: 'Completed',
        settlementStatus: 'DEMO_ONLY' as const,
        bankTransferRef: undefined,
      }
    : await settleIosOrderWithLegacyPhp(
        {
          bookingId,
          mergedOverride: draftOverride,
          checkInStaffId,
          assignedStaffId,
          checkOutStaffId,
          settlementActorTier: trustedSettlementTier,
        },
        {
          loadSettlementReceipt: (id) => repo.loadSettlementReceipt(id),
          saveSettlementReceipt: (id, receipt) => repo.saveSettlementReceipt(id, receipt),
          ...bridgeDepsOverride,
        }
      );

  const nextOverride: BookingOverrideRecord = {
    ...draftOverride,
    orderState: settlement.orderState,
    billing: {
      ...draftOverride.billing,
      settlementStatus: settlement.settlementStatus,
      ...(settlement.bankTransferRef ? { bankTransferRef: settlement.bankTransferRef } : {}),
      legacySyncedAt: settlement.settledAt,
    },
  };

  if (!isSimulationMode) {
    invalidateStaffStatsCache([actorStaffId, assignedStaffId, checkInStaffId, checkOutStaffId]);
    // ── 💎 Referral Diamond Grant (100 KC cho người giới thiệu) ────────────
    const referralPending = body?.referralPending as { referrerUserId: number; referrerName?: string } | undefined;
    const newCustomerId = Number(current.customerId || effectiveCustomerId || 0);

    if (
      referralPending?.referrerUserId &&
      newCustomerId > 0 &&
      settlement.settlementStatus !== 'DEMO_ONLY' &&
      fastify
    ) {
      void grantReferralDiamond({
        fastify,
        referrerUserId: Number(referralPending.referrerUserId),
        newCustomerId,
        actorStaffId,
      });
    }
  }

  return nextOverride;
}

export async function runPostSaveLegacyStepSync(params: {
  bookingId: number;
  action: string;
  current: BookingOverrideRecord;
  nextOverride: BookingOverrideRecord;
  actorStaffId: number;
  isSimulationMode: boolean;
  isDemoRequest: boolean;
  isDefaultRepo: boolean;
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>;
  enableLegacyStepSync?: boolean;
  repo: IosOverrideRepository;
}): Promise<BookingOverrideRecord> {
  const {
    bookingId,
    action,
    current,
    nextOverride,
    actorStaffId,
    isSimulationMode,
    isDemoRequest,
    isDefaultRepo,
    bridgeDepsOverride,
    enableLegacyStepSync,
    repo,
  } = params;

  const canRunStepSync =
    !isSimulationMode &&
    !isDemoRequest &&
    STEP_SYNC_ELIGIBLE_ACTIONS.has(action) &&
    (isDefaultRepo || Boolean(bridgeDepsOverride) || Boolean(enableLegacyStepSync));

  if (!canRunStepSync) {
    return nextOverride;
  }

  const stepCheckInStaffId = Number(nextOverride.checkInStaffId || current.checkInStaffId || actorStaffId);
  const stepAssignedStaffId = Number(
    nextOverride.assignedStaffId ?? current.assignedStaffId ?? (actorStaffId > 0 ? actorStaffId : 0)
  );
  const stepCheckOutStaffId = Number(nextOverride.checkOutStaffId || current.checkOutStaffId || actorStaffId);

  const stepSync = await syncIosStepWithLegacyPhp(
    {
      bookingId,
      action,
      mergedOverride: nextOverride,
      actorStaffId,
      checkInStaffId: stepCheckInStaffId,
      assignedStaffId: stepAssignedStaffId,
      checkOutStaffId: stepCheckOutStaffId,
      isSimulationMode,
      isDemoRequest,
      previousLastLegacyProgressState: current.progress?.lastLegacyProgressState,
      previousLastLegacyUpperState: current.progress?.lastLegacyUpperState,
      previousLastLegacyUnderState: current.progress?.lastLegacyUnderState,
      previousLastLegacyUpperPhotoSigs: current.progress?.lastLegacyUpperPhotoSigs,
      previousLastLegacyUnderPhotoSigs: current.progress?.lastLegacyUnderPhotoSigs,
    },
    bridgeDepsOverride
  );

  const syncedOverride = applyStepSyncResultToOverride(nextOverride, stepSync);
  await repo.saveBookingOverride(bookingId, syncedOverride);

  if (stepSync.synced) {
    invalidateStaffStatsCache(
      [actorStaffId, stepAssignedStaffId, stepCheckInStaffId, stepCheckOutStaffId].filter((id) => id > 0)
    );
  }

  return syncedOverride;
}
