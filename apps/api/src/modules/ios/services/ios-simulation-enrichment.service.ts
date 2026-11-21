import {
  IOS_SIM_BOOKING_ID_MIN,
  IosBookingItem,
  IosCartProductItem,
  NaturalLashConsultationAttributes,
  resolveActiveBookingComboWallets,
} from '@mos-lab/shared';
import { computeBookingFinancials } from './ios-bookings-formatters.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { hasCompletedSimulationSnapshot } from './ios-simulation-attempts.service.js';

export function applySimulationDraftOverride(
  draft: IosBookingItem,
  override: BookingOverrideRecord | undefined,
  naturalLashProfile: NaturalLashConsultationAttributes | undefined,
  targetStaffId: number
): IosBookingItem {
  if (!override || override._simForceIncoming) {
    return {
      ...draft,
      status: 'INCOMING',
      orderState: 'Confirmed',
      checkInStaffId: undefined,
      checkInStaffName: undefined,
      checkInStaffTier: undefined,
      checkOutStaffId: undefined,
      checkOutStaffName: undefined,
      checkOutStaffTier: undefined,
      selectedCombo: null,
      selectedUnderCombo: null,
      comboRedemption: null,
      cartProducts: [],
      promotionId: null,
      appliedPromotion: null,
      servicePromotionId: null,
      servicePromotion: null,
      comboPromotionId: null,
      comboPromotion: null,
      underComboPromotionId: null,
      underComboPromotion: null,
      survey: undefined,
      progress: undefined,
      billing: undefined,
      attributes: naturalLashProfile ? ({ ...naturalLashProfile } as IosBookingItem['attributes']) : undefined,
      isSimulationBooking: true,
      isSimulationDraftBooking: true,
    };
  }

  const cartProducts: IosCartProductItem[] = Array.isArray(override.cartProducts)
    ? override.cartProducts
    : draft.cartProducts || [];
  const mergedAttributes =
    naturalLashProfile || override.attributes
      ? {
          ...(naturalLashProfile || {}),
          ...(override.attributes || {}),
        }
      : draft.attributes;

  const assignedStaffId = Number(override.assignedStaffId || draft.assignedStaffId || targetStaffId);
  const checkInStaffId = override.checkInStaffId ? Number(override.checkInStaffId) : draft.checkInStaffId;
  const checkOutStaffId = override.checkOutStaffId ? Number(override.checkOutStaffId) : draft.checkOutStaffId;
  const selectedCombo = override.selectedCombo !== undefined ? override.selectedCombo : draft.selectedCombo;
  const selectedUnderCombo =
    override.selectedUnderCombo !== undefined ? override.selectedUnderCombo : draft.selectedUnderCombo;
  const comboRedemption = override.comboRedemption !== undefined ? override.comboRedemption : draft.comboRedemption;
  const upgradePrice = Number(override.upgradePrice ?? draft.upgradePrice ?? 0);

  const resolvedSimWallets = resolveActiveBookingComboWallets({
    comboWallets: draft.comboWallets,
    comboLiveStatus: draft.comboLiveStatus,
    underMinkComboStatus: draft.underMinkComboStatus,
    selectedUpperComboBalanceId: override.selectedUpperComboBalanceId ?? draft.selectedUpperComboBalanceId ?? null,
    selectedUnderComboBalanceId: override.selectedUnderComboBalanceId ?? draft.selectedUnderComboBalanceId ?? null,
    skipUpperCombo:
      override.skipUpperCombo !== undefined ? Boolean(override.skipUpperCombo) : Boolean(draft.skipUpperCombo),
    skipUnderCombo:
      override.skipUnderCombo !== undefined ? Boolean(override.skipUnderCombo) : Boolean(draft.skipUnderCombo),
    bookedServiceName: override.upgradedServiceName || override.serviceName || draft.serviceName,
  });

  const financials = computeBookingFinancials({
    servicePrice: Number(draft.servicePrice || 0),
    upgradePrice,
    serviceName: override.upgradedServiceName || draft.serviceName,
    isComboLive: resolvedSimWallets.isRedeemingUpperToday,
    hasUnderMink: Boolean(mergedAttributes?.hasUnderMink),
    underMinkServiceType: mergedAttributes?.underMinkServiceType,
    hasUnderMinkCombo: resolvedSimWallets.isRedeemingUnderToday,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    overrideBilling: override.billing,
    assignedStaffId,
    checkInStaffId,
    checkOutStaffId,
    activeStaffId: targetStaffId,
    dbOrderState: override.orderState || 'Confirmed',
    promotionId: override.promotionId ?? null,
    appliedPromotion: override.appliedPromotion ?? null,
    servicePromotion: override.servicePromotion ?? null,
    comboPromotion: override.comboPromotion ?? null,
    underComboPromotion: override.underComboPromotion ?? null,
  });

  return {
    ...draft,
    comboLiveStatus: resolvedSimWallets.effectiveComboLiveStatus,
    underMinkComboStatus: resolvedSimWallets.effectiveUnderMinkComboStatus,
    comboWallets: resolvedSimWallets.allWallets,
    selectedUpperComboBalanceId: resolvedSimWallets.selectedUpperComboBalanceId,
    selectedUnderComboBalanceId: resolvedSimWallets.selectedUnderComboBalanceId,
    skipUpperCombo: resolvedSimWallets.skipUpperCombo,
    skipUnderCombo: resolvedSimWallets.skipUnderCombo,
    status: (override.status || draft.status || 'INCOMING') as IosBookingItem['status'],
    orderState: override.orderState || draft.orderState || 'Confirmed',
    serviceName: override.upgradedServiceName || draft.serviceName,
    upgradePrice,
    assignedStaffId,
    assignedStaffName: override.assignedStaffName || draft.assignedStaffName,
    assignedStaffTier: override.assignedStaffTier || draft.assignedStaffTier,
    checkInStaffId,
    checkInStaffName: override.checkInStaffName || draft.checkInStaffName,
    checkInStaffTier: override.checkInStaffTier || draft.checkInStaffTier,
    checkOutStaffId,
    checkOutStaffName: override.checkOutStaffName || draft.checkOutStaffName,
    checkOutStaffTier: override.checkOutStaffTier || draft.checkOutStaffTier,
    assignedBed: override.assignedBed || draft.assignedBed,
    attributes: mergedAttributes as IosBookingItem['attributes'],
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    cartProducts,
    promotionId: override.promotionId ?? null,
    appliedPromotion: override.appliedPromotion ?? null,
    servicePromotionId: override.servicePromotionId ?? null,
    servicePromotion: override.servicePromotion ?? null,
    comboPromotionId: override.comboPromotion ?? null,
    comboPromotion: override.comboPromotion ?? null,
    underComboPromotionId: override.underComboPromotionId ?? null,
    underComboPromotion: override.underComboPromotion ?? null,
    survey: override.survey || draft.survey,
    progress: override.progress || draft.progress,
    cvRewardBreakdown: financials.cvRewardBreakdown,
    billing:
      override.billing || override.status === 'DONE' || cartProducts.length > 0 || selectedCombo
        ? financials.billing
        : undefined,
    isSimulationBooking: true,
    isSimulationDraftBooking: true,
  };
}

export function enrichSimulationBookings(params: {
  mappedBookings: IosBookingItem[];
  customDraftBookings: IosBookingItem[];
  simOverridesMap: Record<string, BookingOverrideRecord>;
  simNaturalLashMap: Record<string, NaturalLashConsultationAttributes>;
  attemptMetaMap: Map<number, { count: number; latestAttemptId?: string }>;
  targetStaffId: number;
  isReadOnlyMentorView: boolean;
}): IosBookingItem[] {
  const {
    mappedBookings,
    customDraftBookings,
    simOverridesMap,
    simNaturalLashMap,
    attemptMetaMap,
    targetStaffId,
    isReadOnlyMentorView,
  } = params;

  const adjustedBase = mappedBookings.map((booking) => {
    const override = simOverridesMap[String(booking.id)];
    if (override?._simForceIncoming) {
      const nl = simNaturalLashMap[String(booking.customerId)];
      return {
        ...booking,
        status: 'INCOMING' as const,
        orderState: 'Confirmed',
        checkInStaffId: undefined,
        checkInStaffName: undefined,
        checkInStaffTier: undefined,
        checkOutStaffId: undefined,
        checkOutStaffName: undefined,
        checkOutStaffTier: undefined,
        selectedCombo: null,
        selectedUnderCombo: null,
        comboRedemption: null,
        cartProducts: [],
        promotionId: null,
        appliedPromotion: null,
        servicePromotionId: null,
        servicePromotion: null,
        comboPromotionId: null,
        comboPromotion: null,
        underComboPromotionId: null,
        underComboPromotion: null,
        survey: undefined,
        progress: undefined,
        billing: undefined,
        attributes: nl ? ({ ...nl } as IosBookingItem['attributes']) : undefined,
      };
    }

    const hasSimWalletOverride =
      override &&
      (override.selectedUpperComboBalanceId !== undefined ||
        override.selectedUnderComboBalanceId !== undefined ||
        override.skipUpperCombo !== undefined ||
        override.skipUnderCombo !== undefined);

    const applySimWalletResolution = (target: IosBookingItem): IosBookingItem => {
      if (!hasSimWalletOverride) return target;
      const resolved = resolveActiveBookingComboWallets({
        comboWallets: target.comboWallets,
        comboLiveStatus: target.comboLiveStatus,
        underMinkComboStatus: target.underMinkComboStatus,
        selectedUpperComboBalanceId:
          override.selectedUpperComboBalanceId !== undefined
            ? override.selectedUpperComboBalanceId
            : target.selectedUpperComboBalanceId,
        selectedUnderComboBalanceId:
          override.selectedUnderComboBalanceId !== undefined
            ? override.selectedUnderComboBalanceId
            : target.selectedUnderComboBalanceId,
        skipUpperCombo:
          override.skipUpperCombo !== undefined ? Boolean(override.skipUpperCombo) : Boolean(target.skipUpperCombo),
        skipUnderCombo:
          override.skipUnderCombo !== undefined ? Boolean(override.skipUnderCombo) : Boolean(target.skipUnderCombo),
        bookedServiceName: target.serviceName,
      });
      return {
        ...target,
        comboLiveStatus: resolved.effectiveComboLiveStatus,
        underMinkComboStatus: resolved.effectiveUnderMinkComboStatus,
        comboWallets: resolved.allWallets,
        selectedUpperComboBalanceId: resolved.selectedUpperComboBalanceId,
        selectedUnderComboBalanceId: resolved.selectedUnderComboBalanceId,
        skipUpperCombo: resolved.skipUpperCombo,
        skipUnderCombo: resolved.skipUnderCombo,
      };
    };

    if (
      override &&
      (override.status === 'INCOMING' ||
        override.status === 'CHECKED_IN' ||
        (override.status === 'SERVICING' &&
          !override.progress?.completedAt &&
          !override.billing?.completedAt &&
          !override.completedAt))
    ) {
      return applySimWalletResolution({
        ...booking,
        status: override.status,
        orderState:
          override.orderState ||
          (override.status === 'CHECKED_IN'
            ? 'Check-in'
            : override.status === 'SERVICING'
              ? 'Preparation'
              : 'Confirmed'),
        ...(override.status === 'CHECKED_IN'
          ? {
              progress: undefined,
              survey: undefined,
              billing: override.billing && !override.billing.completedAt ? booking.billing : undefined,
            }
          : {}),
      });
    }

    return applySimWalletResolution(booking);
  });

  const mergedDrafts = customDraftBookings.map((draft) => {
    const override = simOverridesMap[String(draft.id)];
    const nl = simNaturalLashMap[String(draft.customerId)];
    return applySimulationDraftOverride(draft, override, nl, targetStaffId);
  });

  const combined = [...adjustedBase, ...mergedDrafts];
  combined.sort((a, b) => String(a.timeSlot || '').localeCompare(String(b.timeSlot || '')));

  return combined.map((b) => {
    const override = simOverridesMap[String(b.id)];
    const meta = attemptMetaMap.get(Number(b.id));
    const rawCount = meta?.count || 0;
    const attemptCount =
      rawCount > 0
        ? rawCount
        : hasCompletedSimulationSnapshot(override, {
              isLiveCompleted: b.status === 'DONE' && !override?._simForceIncoming,
            })
          ? 1
          : 0;
    return {
      ...b,
      isSimulationBooking: true,
      isSimulationDraftBooking: Boolean(b.isSimulationDraftBooking || Number(b.id) >= IOS_SIM_BOOKING_ID_MIN),
      simulationAttemptCount: attemptCount,
      simulationLatestAttemptId: meta?.latestAttemptId,
      simulationFastForwardUnlocked: attemptCount >= 1,
      simulationReadOnly: isReadOnlyMentorView,
    };
  });
}
