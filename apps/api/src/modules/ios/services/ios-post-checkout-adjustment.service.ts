import {
  canAdjustDoneBookingPostCheckout,
  canDirectlySettleCounterPayment,
  computePostCheckoutFinancialDelta,
  getVietnamDateYmd,
  IosPaymentMethod,
  IosPostCheckoutAdjustmentEntry,
  IosPostCheckoutPendingDraft,
  IosPostCheckoutSnapshot,
  IosSettlementStatus,
  isAdminOrSuperAdminRole,
  SafeAny,
} from '@mos-lab/shared';
import { IosAuthContext } from './ios-auth.service.js';
import { SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import { BookingOverrideRecord, createOverrideRepository } from './ios-overrides.service.js';
import { reconcileAndSettlePostCheckoutOrderWithLegacyPhp } from './ios-post-checkout-bridge.service.js';
import { buildSnapshot, fetchLiveBaselineIfNeeded, listIosCheckoutEligibleStaff } from './ios-post-checkout-helpers.js';
import { invalidateStaffStatsCache } from './ios-staff-stats.service.js';

export { listIosCheckoutEligibleStaff };

type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

export async function executePostCheckoutAdjustmentAction(params: {
  authUser: IosAuthContext;
  action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT' | 'APPROVE_POST_CHECKOUT_ADJUSTMENT' | 'REJECT_POST_CHECKOUT_ADJUSTMENT';
  bookingId: number;
  body: SafeAny;
  current: BookingOverrideRecord;
  repo: IosOverrideRepository;
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>;
  isSimulationMode: boolean;
  actorStaffId: number;
  actorStaffName: string;
  actorStaffTier: string;
}): Promise<{ statusCode: number; payload: Record<string, SafeAny> }> {
  const {
    authUser,
    action,
    bookingId,
    body,
    current,
    repo,
    bridgeDepsOverride,
    isSimulationMode,
    actorStaffId,
    actorStaffName,
    actorStaffTier,
  } = params;
  const baseline = await fetchLiveBaselineIfNeeded(bookingId, current, isSimulationMode, bridgeDepsOverride);
  const effectiveStatus =
    current.status ||
    (baseline?.orderState === 'Completed' || baseline?.orderState === 'CheckOut' || baseline?.orderState === 'Check-out'
      ? 'DONE'
      : body?.simBookingMeta?.isLiveCompleted
        ? 'DONE'
        : undefined);
  const bookingDateYmd =
    String(body?.bookingDateYmd || current.bookingDateYmd || baseline?.bookingDateYmd || '').slice(0, 10) || undefined;
  const todayVnYmd = body?.demoMode && body?.targetDate ? String(body.targetDate).slice(0, 10) : getVietnamDateYmd();
  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role);
  const assignedStaffId = Number(
    current.assignedStaffId || baseline?.assignedStaffId || body?.simBookingMeta?.assignedStaffId || 0
  );
  const checkInStaffId = Number(current.checkInStaffId || baseline?.checkInStaffId || assignedStaffId || actorStaffId);
  const previousCheckOutStaffId = Number(
    current.checkOutStaffId || baseline?.checkOutStaffId || assignedStaffId || actorStaffId
  );
  const previousCheckOutStaffName = String(current.checkOutStaffName || baseline?.checkOutStaffName || actorStaffName);
  const previousCheckOutStaffTier = String(current.checkOutStaffTier || 'CVL');

  const eligibility = canAdjustDoneBookingPostCheckout({
    status: effectiveStatus,
    bookingDateYmd,
    todayVnYmd,
    actorTier: authUser.careerTier,
    isAdmin,
    actorStaffId,
    assignedStaffId,
    checkInStaffId,
    checkOutStaffId: previousCheckOutStaffId,
  });

  if (!eligibility.allowed) {
    const isForbidden =
      authUser.careerTier === 'CVL' && effectiveStatus === 'DONE' && (!bookingDateYmd || bookingDateYmd === todayVnYmd);
    return {
      statusCode: isForbidden ? 403 : 400,
      payload: { success: false, error: eligibility.reason || 'Không có quyền điều chỉnh đơn sau checkout.' },
    };
  }

  const nowIso = new Date().toISOString();
  const existingHistory: IosPostCheckoutAdjustmentEntry[] = Array.isArray(current.postCheckoutAdjustments)
    ? [...current.postCheckoutAdjustments]
    : [];

  if (action === 'REJECT_POST_CHECKOUT_ADJUSTMENT') {
    const pending = current.pendingPostCheckoutAdjustment as IosPostCheckoutPendingDraft | null | undefined;
    if (!pending) {
      return { statusCode: 400, payload: { success: false, error: 'Đơn không có yêu cầu điều chỉnh chờ duyệt.' } };
    }
    const canReject =
      isAdmin ||
      canDirectlySettleCounterPayment(authUser.careerTier) ||
      Number(pending.requestedByStaffId) === actorStaffId;
    if (!canReject) {
      return {
        statusCode: 403,
        payload: { success: false, error: 'Bạn không có quyền từ chối yêu cầu điều chỉnh này.' },
      };
    }
    const rejectionReason = String(body?.rejectionReason || body?.reason || 'Từ chối yêu cầu điều chỉnh').trim();
    const restoredSettlement: IosSettlementStatus =
      (current.billing?.preAdjustmentSettlementStatus as IosSettlementStatus) ||
      (current.orderState === 'Completed' || baseline?.orderState === 'Completed'
        ? 'SETTLED_COMPLETED'
        : 'PENDING_COUNTER_SETTLEMENT');

    const updatedHistory = existingHistory.map((item) =>
      item.adjustmentId === pending.draftId
        ? {
            ...item,
            status: 'REJECTED' as const,
            resolvedAt: nowIso,
            approvedByStaffId: actorStaffId,
            approvedByStaffName: actorStaffName,
            rejectionReason,
          }
        : item
    );

    const nextOverride: BookingOverrideRecord = {
      ...current,
      pendingPostCheckoutAdjustment: null,
      postCheckoutAdjustments: updatedHistory,
      billing: {
        ...(current.billing || {}),
        settlementStatus: restoredSettlement,
      },
    };
    await repo.saveBookingOverride(bookingId, nextOverride);
    return {
      statusCode: 200,
      payload: {
        success: true,
        bookingId,
        action,
        override: nextOverride,
        updatedOverride: nextOverride,
        settlementStatus: restoredSettlement,
        savedAt: nowIso,
      },
    };
  }

  const isApproveAction = action === 'APPROVE_POST_CHECKOUT_ADJUSTMENT';
  if (isApproveAction && !isAdmin && !canDirectlySettleCounterPayment(authUser.careerTier)) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        error: 'Chỉ CC hoặc Admin tại Quầy mới có quyền duyệt yêu cầu điều chỉnh thanh toán.',
      },
    };
  }

  const pendingDraft = current.pendingPostCheckoutAdjustment as IosPostCheckoutPendingDraft | null | undefined;
  if (!isApproveAction && pendingDraft) {
    return {
      statusCode: 409,
      payload: {
        success: false,
        error: 'Đơn này đang có yêu cầu điều chỉnh Chờ Quầy duyệt. Vui lòng duyệt hoặc hủy yêu cầu cũ trước.',
      },
    };
  }
  if (isApproveAction && !pendingDraft) {
    return { statusCode: 400, payload: { success: false, error: 'Không tìm thấy yêu cầu điều chỉnh chờ duyệt.' } };
  }

  const servicePrice = Number(
    current.servicePrice ?? baseline?.servicePrice ?? body?.simBookingMeta?.servicePrice ?? 550000
  );
  const upgradePrice = Number(current.upgradePrice ?? baseline?.upgradePrice ?? 0);
  const serviceName = String(
    current.serviceName || baseline?.serviceName || body?.simBookingMeta?.serviceName || 'Dịch vụ mi'
  );
  const nextSkipUpperCombo = isApproveAction
    ? Boolean(pendingDraft!.skipUpperCombo)
    : body?.skipUpperCombo !== undefined
      ? Boolean(body.skipUpperCombo)
      : Boolean(current.skipUpperCombo);
  const nextSkipUnderCombo = isApproveAction
    ? Boolean(pendingDraft!.skipUnderCombo)
    : body?.skipUnderCombo !== undefined
      ? Boolean(body.skipUnderCombo)
      : Boolean(current.skipUnderCombo);
  const nextSelectedUpperComboBalanceId = isApproveAction
    ? (pendingDraft!.selectedUpperComboBalanceId ?? null)
    : body?.selectedUpperComboBalanceId !== undefined
      ? body.selectedUpperComboBalanceId && Number(body.selectedUpperComboBalanceId) > 0
        ? Number(body.selectedUpperComboBalanceId)
        : null
      : (current.selectedUpperComboBalanceId ?? null);
  const nextSelectedUnderComboBalanceId = isApproveAction
    ? (pendingDraft!.selectedUnderComboBalanceId ?? null)
    : body?.selectedUnderComboBalanceId !== undefined
      ? body.selectedUnderComboBalanceId && Number(body.selectedUnderComboBalanceId) > 0
        ? Number(body.selectedUnderComboBalanceId)
        : null
      : (current.selectedUnderComboBalanceId ?? null);

  const prevComboLive =
    !current.skipUpperCombo &&
    Boolean(
      current.comboRedemption?.redeemSession || current.selectedUpperComboBalanceId || body?.simBookingMeta?.isComboLive
    );
  const nextIsComboLive =
    !nextSkipUpperCombo &&
    Boolean(
      (isApproveAction ? pendingDraft!.comboRedemption?.redeemSession : body?.comboRedemption?.redeemSession) ||
      nextSelectedUpperComboBalanceId ||
      (!body?.skipUpperCombo &&
        (current.comboRedemption?.redeemSession || body?.isComboLive || body?.simBookingMeta?.isComboLive))
    );
  const hasUnderMink = Boolean(current.attributes?.hasUnderMink);
  const underMinkServiceType = current.attributes?.underMinkServiceType;
  const prevHasUnderMinkCombo =
    !current.skipUnderCombo &&
    Boolean(
      current.hasUnderMinkCombo || current.selectedUnderComboBalanceId || body?.simBookingMeta?.hasUnderMinkCombo
    );
  const nextHasUnderMinkCombo =
    !nextSkipUnderCombo &&
    Boolean(
      nextSelectedUnderComboBalanceId ||
      (body?.hasUnderMinkCombo !== undefined ? body.hasUnderMinkCombo : current.hasUnderMinkCombo) ||
      body?.simBookingMeta?.hasUnderMinkCombo
    );
  const isTrainingCvlOrder = Boolean(body?.isTrainingCvlOrder);

  const preAdjustmentSettlementStatus: IosSettlementStatus =
    (current.billing?.preAdjustmentSettlementStatus as IosSettlementStatus) ||
    (current.billing?.settlementStatus && current.billing.settlementStatus !== 'PENDING_POST_CHECKOUT_ADJUSTMENT'
      ? current.billing.settlementStatus
      : current.orderState === 'Completed' || baseline?.orderState === 'Completed'
        ? 'SETTLED_COMPLETED'
        : 'PENDING_COUNTER_SETTLEMENT');
  const isAlreadySettledCompleted =
    preAdjustmentSettlementStatus === 'SETTLED_COMPLETED' || baseline?.orderState === 'Completed';

  const targetCheckOutStaffId = isApproveAction
    ? pendingDraft!.targetCheckOutStaffId
    : Number(body?.targetCheckOutStaffId || previousCheckOutStaffId || actorStaffId);
  const targetCheckOutStaffName = isApproveAction
    ? pendingDraft!.targetCheckOutStaffName
    : String(
        body?.targetCheckOutStaffName ||
          (targetCheckOutStaffId === actorStaffId ? actorStaffName : previousCheckOutStaffName)
      );
  const targetCheckOutStaffTier = isApproveAction
    ? pendingDraft!.targetCheckOutStaffTier
    : String(
        body?.targetCheckOutStaffTier ||
          (targetCheckOutStaffId === actorStaffId ? actorStaffTier : previousCheckOutStaffTier)
      );

  const nextSelectedCombo = isApproveAction
    ? pendingDraft!.selectedCombo
    : body?.selectedCombo !== undefined
      ? body.selectedCombo
      : (current.selectedCombo ?? null);
  const nextSelectedUnderCombo = isApproveAction
    ? pendingDraft!.selectedUnderCombo
    : body?.selectedUnderCombo !== undefined
      ? body.selectedUnderCombo
      : (current.selectedUnderCombo ?? null);
  const nextComboRedemption = isApproveAction
    ? pendingDraft!.comboRedemption
    : body?.comboRedemption !== undefined
      ? body.comboRedemption
      : (current.comboRedemption ?? null);
  const nextCartProducts = isApproveAction
    ? pendingDraft!.cartProducts
    : Array.isArray(body?.cartProducts)
      ? body.cartProducts
      : current.cartProducts || [];
  const nextTipAmount = isApproveAction
    ? pendingDraft!.tipAmount
    : Math.max(0, Math.round(Number(body?.tipAmount ?? current.billing?.tipAmount ?? baseline?.tipAmount ?? 0)));
  const nextDiamondUsed = isApproveAction
    ? pendingDraft!.diamondUsed
    : Math.max(0, Math.round(Number(body?.diamondUsed ?? current.billing?.diamondUsed ?? baseline?.diamondUsed ?? 0)));

  const beforeState: BookingOverrideRecord = {
    ...current,
    billing: {
      ...(current.billing || {}),
      ...(baseline?.tipAmount !== undefined && current.billing?.tipAmount === undefined
        ? { tipAmount: baseline.tipAmount }
        : {}),
      ...(baseline?.diamondUsed !== undefined && current.billing?.diamondUsed === undefined
        ? { diamondUsed: baseline.diamondUsed }
        : {}),
      ...(baseline?.paymentMethod && !current.billing?.paymentMethod ? { paymentMethod: baseline.paymentMethod } : {}),
      ...(baseline?.paymentBreakdown && !current.billing?.paymentBreakdown
        ? { paymentBreakdown: baseline.paymentBreakdown }
        : {}),
    },
  };
  const { snapshot: beforeSnapshot } = buildSnapshot({
    override: beforeState,
    servicePrice,
    upgradePrice,
    serviceName,
    assignedStaffId: assignedStaffId || actorStaffId,
    checkInStaffId,
    checkOutStaffId: previousCheckOutStaffId,
    checkOutStaffName: previousCheckOutStaffName,
    checkOutStaffTier: previousCheckOutStaffTier,
    isComboLive: prevComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo: prevHasUnderMinkCombo,
    isTrainingCvlOrder,
  });

  const previousPaidTotal = Math.max(
    0,
    Math.round(Number(current.billing?.grandTotal ?? baseline?.paidTotal ?? beforeSnapshot.grandTotal ?? 0))
  );
  const previousPaymentMethod = (current.billing?.paymentMethod ||
    baseline?.paymentMethod ||
    beforeSnapshot.paymentMethod ||
    'VIETQR') as IosPaymentMethod;
  const previousPaymentBreakdown =
    current.billing?.paymentBreakdown || baseline?.paymentBreakdown || beforeSnapshot.paymentBreakdown;

  const afterDraftOverride: BookingOverrideRecord = {
    ...current,
    selectedCombo: nextSelectedCombo,
    selectedUnderCombo: nextSelectedUnderCombo,
    comboRedemption: nextSkipUpperCombo ? null : nextComboRedemption,
    selectedUpperComboBalanceId: nextSelectedUpperComboBalanceId,
    selectedUnderComboBalanceId: nextSelectedUnderComboBalanceId,
    skipUpperCombo: nextSkipUpperCombo,
    skipUnderCombo: nextSkipUnderCombo,
    hasUnderMinkCombo: nextHasUnderMinkCombo,
    cartProducts: nextCartProducts,
    billing: {
      ...(current.billing || {}),
      tipAmount: nextTipAmount,
      diamondUsed: nextDiamondUsed,
      diamondDiscountAmount: nextDiamondUsed * 1000,
    },
  };
  const { snapshot: rawAfterSnapshot, billing: rawAfterBilling } = buildSnapshot({
    override: afterDraftOverride,
    servicePrice,
    upgradePrice,
    serviceName,
    assignedStaffId: assignedStaffId || actorStaffId,
    checkInStaffId,
    checkOutStaffId: targetCheckOutStaffId,
    checkOutStaffName: targetCheckOutStaffName,
    checkOutStaffTier: targetCheckOutStaffTier,
    isComboLive: nextIsComboLive,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo: nextHasUnderMinkCombo,
    isTrainingCvlOrder,
  });

  const delta = computePostCheckoutFinancialDelta({
    previousPaidTotal,
    previousPaymentMethod,
    previousPaymentBreakdown,
    newGrandTotal: rawAfterSnapshot.grandTotal,
    requestedMode: isApproveAction ? pendingDraft!.paymentMode : body?.paymentMode,
    deltaPaymentMethod: isApproveAction ? pendingDraft!.deltaPaymentMethod : body?.deltaPaymentMethod,
    deltaPaymentBreakdown: isApproveAction ? pendingDraft!.deltaPaymentBreakdown : body?.deltaPaymentBreakdown,
    isAlreadySettledCompleted,
    actorTier: isApproveAction ? authUser.careerTier : actorStaffTier,
    isAdmin,
  });

  const reason = String((isApproveAction ? pendingDraft?.reason : body?.reason) || body?.reason || '').trim();
  if (!isApproveAction && delta.requiresReason && !reason) {
    return {
      statusCode: 400,
      payload: {
        success: false,
        error: 'Vui lòng nhập lý do điều chỉnh / hủy thanh toán cũ trên đơn đã hoàn tất.',
      },
    };
  }

  const afterSnapshot: IosPostCheckoutSnapshot = {
    ...rawAfterSnapshot,
    paymentMethod: delta.combinedPaymentMethod,
    paymentBreakdown: delta.combinedPaymentBreakdown,
  };
  const transferProofPhoto =
    String(
      (isApproveAction ? pendingDraft?.transferProofPhoto : body?.transferProofPhoto) ||
        current.billing?.transferProofPhoto ||
        ''
    ).trim() || undefined;

  if (!isApproveAction && delta.requiresCounterApproval) {
    const draftId = `adj-${bookingId}-${Date.now()}`;
    const pendingPayload: IosPostCheckoutPendingDraft = {
      draftId,
      requestedAt: nowIso,
      requestedByStaffId: actorStaffId,
      requestedByStaffName: actorStaffName,
      requestedByStaffTier: actorStaffTier,
      paymentMode: delta.effectiveMode,
      ...(reason ? { reason } : {}),
      targetCheckOutStaffId,
      targetCheckOutStaffName,
      targetCheckOutStaffTier,
      selectedCombo: nextSelectedCombo,
      selectedUnderCombo: nextSelectedUnderCombo,
      comboRedemption: nextSkipUpperCombo ? null : nextComboRedemption,
      selectedUpperComboBalanceId: nextSelectedUpperComboBalanceId,
      selectedUnderComboBalanceId: nextSelectedUnderComboBalanceId,
      skipUpperCombo: nextSkipUpperCombo,
      skipUnderCombo: nextSkipUnderCombo,
      cartProducts: nextCartProducts,
      tipAmount: nextTipAmount,
      diamondUsed: nextDiamondUsed,
      deltaAmount: delta.deltaAmount,
      amountToCollectNow: delta.amountToCollectNow,
      deltaPaymentMethod: delta.deltaPaymentMethod,
      deltaPaymentBreakdown: delta.deltaPaymentBreakdown,
      combinedPaymentMethod: delta.combinedPaymentMethod,
      combinedPaymentBreakdown: delta.combinedPaymentBreakdown,
      ...(transferProofPhoto ? { transferProofPhoto } : {}),
      beforeSnapshot,
      afterSnapshot,
    };
    const pendingEntry: IosPostCheckoutAdjustmentEntry = {
      adjustmentId: draftId,
      createdAt: nowIso,
      status: 'PENDING_COUNTER_APPROVAL',
      paymentMode: delta.effectiveMode,
      ...(reason ? { reason } : {}),
      requestedByStaffId: actorStaffId,
      requestedByStaffName: actorStaffName,
      requestedByStaffTier: actorStaffTier,
      previousCheckOutStaffId,
      previousCheckOutStaffName,
      newCheckOutStaffId: targetCheckOutStaffId,
      newCheckOutStaffName: targetCheckOutStaffName,
      newCheckOutStaffTier: targetCheckOutStaffTier,
      checkOutStaffReplaced: targetCheckOutStaffId !== previousCheckOutStaffId,
      previousPaidTotal,
      newGrandTotal: delta.newGrandTotal,
      deltaAmount: delta.deltaAmount,
      collectedAmount: delta.amountToCollectNow,
      deltaPaymentMethod: delta.deltaPaymentMethod,
      deltaPaymentBreakdown: delta.deltaPaymentBreakdown,
      beforeSnapshot,
      afterSnapshot,
    };

    const nextOverride: BookingOverrideRecord = {
      ...current,
      status: 'DONE',
      pendingPostCheckoutAdjustment: pendingPayload,
      postCheckoutAdjustments: [...existingHistory, pendingEntry],
      billing: {
        ...(current.billing || {}),
        settlementStatus: 'PENDING_POST_CHECKOUT_ADJUSTMENT',
        preAdjustmentSettlementStatus,
        previousPaidGrandTotal: previousPaidTotal,
        previousPaymentMethod,
        previousPaymentBreakdown: delta.previousPaymentBreakdown,
      },
    };
    await repo.saveBookingOverride(bookingId, nextOverride);
    return {
      statusCode: 200,
      payload: {
        success: true,
        bookingId,
        action,
        override: nextOverride,
        updatedOverride: nextOverride,
        settlementStatus: 'PENDING_POST_CHECKOUT_ADJUSTMENT',
        savedAt: nowIso,
      },
    };
  }

  // Áp dụng điều chỉnh & kết chuyển ngay
  const nextOverrideForSettlement: BookingOverrideRecord = {
    ...current,
    status: 'DONE',
    checkInStaffId,
    assignedStaffId: assignedStaffId || actorStaffId,
    checkOutStaffId: targetCheckOutStaffId,
    checkOutStaffName: targetCheckOutStaffName,
    checkOutStaffTier: targetCheckOutStaffTier,
    selectedCombo: nextSelectedCombo,
    selectedUnderCombo: nextSelectedUnderCombo,
    comboRedemption: nextSkipUpperCombo ? null : nextComboRedemption,
    selectedUpperComboBalanceId: nextSelectedUpperComboBalanceId,
    selectedUnderComboBalanceId: nextSelectedUnderComboBalanceId,
    skipUpperCombo: nextSkipUpperCombo,
    skipUnderCombo: nextSkipUnderCombo,
    hasUnderMinkCombo: nextHasUnderMinkCombo,
    cartProducts: nextCartProducts,
    pendingPostCheckoutAdjustment: null,
    billing: {
      ...rawAfterBilling,
      paymentMethod: delta.combinedPaymentMethod,
      paymentBreakdown: delta.combinedPaymentBreakdown,
      grandTotal: delta.newGrandTotal,
      ...(transferProofPhoto ? { transferProofPhoto } : {}),
      previousPaidGrandTotal: previousPaidTotal,
      previousPaymentMethod,
      previousPaymentBreakdown: delta.previousPaymentBreakdown,
      lastAdjustmentMode: delta.effectiveMode,
      lastAdjustmentDeltaAmount: delta.deltaAmount,
      completedAt: current.billing?.completedAt || nowIso,
    },
  };

  const settlement = isSimulationMode
    ? {
        settledAt: nowIso,
        orderState: 'Completed',
        settlementStatus: 'DEMO_ONLY' as const,
        bankTransferRef: undefined,
      }
    : await reconcileAndSettlePostCheckoutOrderWithLegacyPhp(
        {
          bookingId,
          previousOverride: current,
          nextOverride: nextOverrideForSettlement,
          checkInStaffId,
          assignedStaffId: assignedStaffId || actorStaffId,
          previousCheckOutStaffId,
          newCheckOutStaffId: targetCheckOutStaffId,
          settlementActorTier: 'ADMIN',
        },
        {
          loadSettlementReceipt: (id) => repo.loadSettlementReceipt(id),
          saveSettlementReceipt: (id, receipt) => repo.saveSettlementReceipt(id, receipt),
          deleteSettlementReceipt: (id) => repo.deleteSettlementReceipt(id),
          ...bridgeDepsOverride,
        }
      );

  const adjustmentId = isApproveAction && pendingDraft ? pendingDraft.draftId : `adj-${bookingId}-${Date.now()}`;
  const appliedEntry: IosPostCheckoutAdjustmentEntry = {
    adjustmentId,
    createdAt: isApproveAction && pendingDraft ? pendingDraft.requestedAt : nowIso,
    resolvedAt: nowIso,
    status: 'APPLIED',
    paymentMode: delta.effectiveMode,
    ...(reason ? { reason } : {}),
    requestedByStaffId: isApproveAction && pendingDraft ? pendingDraft.requestedByStaffId : actorStaffId,
    requestedByStaffName: isApproveAction && pendingDraft ? pendingDraft.requestedByStaffName : actorStaffName,
    requestedByStaffTier: isApproveAction && pendingDraft ? pendingDraft.requestedByStaffTier : actorStaffTier,
    ...(isApproveAction ? { approvedByStaffId: actorStaffId, approvedByStaffName: actorStaffName } : {}),
    previousCheckOutStaffId,
    previousCheckOutStaffName,
    newCheckOutStaffId: targetCheckOutStaffId,
    newCheckOutStaffName: targetCheckOutStaffName,
    newCheckOutStaffTier: targetCheckOutStaffTier,
    checkOutStaffReplaced: targetCheckOutStaffId !== previousCheckOutStaffId,
    previousPaidTotal,
    newGrandTotal: delta.newGrandTotal,
    deltaAmount: delta.deltaAmount,
    collectedAmount: delta.amountToCollectNow,
    deltaPaymentMethod: delta.deltaPaymentMethod,
    deltaPaymentBreakdown: delta.deltaPaymentBreakdown,
    beforeSnapshot: isApproveAction && pendingDraft ? pendingDraft.beforeSnapshot : beforeSnapshot,
    afterSnapshot,
  };

  const finalHistory =
    isApproveAction && pendingDraft
      ? existingHistory.map((item) => (item.adjustmentId === pendingDraft.draftId ? appliedEntry : item))
      : [...existingHistory, appliedEntry];

  const finalOverride: BookingOverrideRecord = {
    ...nextOverrideForSettlement,
    orderState: settlement.orderState,
    postCheckoutAdjustments: finalHistory,
    billing: {
      ...nextOverrideForSettlement.billing,
      settlementStatus: settlement.settlementStatus,
      ...(settlement.bankTransferRef ? { bankTransferRef: settlement.bankTransferRef } : {}),
      legacySyncedAt: settlement.settledAt,
    },
  };

  await repo.saveBookingOverride(bookingId, finalOverride);
  if (!isSimulationMode) {
    invalidateStaffStatsCache([
      actorStaffId,
      assignedStaffId,
      checkInStaffId,
      previousCheckOutStaffId,
      targetCheckOutStaffId,
    ]);
  }

  return {
    statusCode: 200,
    payload: {
      success: true,
      bookingId,
      action,
      override: finalOverride,
      updatedOverride: finalOverride,
      settlementStatus: finalOverride.billing?.settlementStatus,
      legacySyncedAt: settlement.settledAt,
      savedAt: nowIso,
    },
  };
}
