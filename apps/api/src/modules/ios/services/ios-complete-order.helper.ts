import { SafeAny } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, createOverrideRepository } from './ios-overrides.service.js';
import { settleIosOrderWithLegacyPhp, SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import { resolveCheckoutOverridePromotions } from './ios-promotions.service.js';
import { invalidateStaffStatsCache } from './ios-staff-stats.service.js';
import { grantReferralDiamond } from './ios-referral-diamond.service.js';

type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

export async function executeCompleteOrderOverride(params: {
  bookingId: number;
  current: BookingOverrideRecord;
  body: SafeAny;
  walletSelectionPatch: BookingOverrideRecord;
  authUser: IosAuthContext;
  actorStaffId: number;
  actorStaffName: string;
  actorStaffTier: string;
  effectiveCustomerId: number;
  isSimulationMode: boolean;
  repo: IosOverrideRepository;
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>;
  fastify?: FastifyInstance;
}): Promise<BookingOverrideRecord> {
  const {
    bookingId,
    current,
    body,
    walletSelectionPatch,
    authUser,
    actorStaffId,
    actorStaffName,
    actorStaffTier,
    effectiveCustomerId,
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
