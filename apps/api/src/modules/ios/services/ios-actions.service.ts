import {
  hasCompleteNaturalLashAttributes,
  IosPromotionOption,
  isPromotionEligibleForCustomer,
  isSelfChallengeSlowerThanAverage,
  SafeAny,
  validateNaturalLashConsultationSave,
  validateSelfChallengeSlowerReason,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, createOverrideRepository, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { settleIosOrderWithLegacyPhp, SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import { STEP_SYNC_ELIGIBLE_ACTIONS, syncIosStepWithLegacyPhp } from './ios-legacy-step-sync.service.js';
import { persistProgressPhotoToCloud } from './ios-photos.service.js';
import { persistIncomingRoundPhotosToCloud, persistRetainCountsByServiceIndex } from './ios-progress-sync.helper.js';
import {
  applyTargetedPromotionToOverride,
  fetchPromotionsByIds,
  resolveCheckoutOverridePromotions,
} from './ios-promotions.service.js';
import { invalidateStaffStatsCache } from './ios-staff-stats.service.js';

export type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

export interface ExecuteIosActionResult {
  statusCode: number;
  payload: Record<string, SafeAny>;
}

export interface ExecuteIosActionOptions {
  simulationMode?: boolean;
  enableLegacyStepSync?: boolean;
}

export async function executeIosBookingAction(
  authUser: IosAuthContext,
  body: SafeAny,
  repo: IosOverrideRepository = defaultIosOverrideRepo,
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>,
  options?: ExecuteIosActionOptions
): Promise<ExecuteIosActionResult> {
  const isSimulationMode = Boolean(options?.simulationMode);
  const bookingId = Number(body?.bookingId || 0);
  const action = String(body?.action || '').toUpperCase();
  const isLockedCvl = authUser.careerTier === 'CVL';
  const actorStaffId = isLockedCvl
    ? authUser.legacyStaffId || 13783
    : Number(body?.actorStaffId) || authUser.legacyStaffId || 13783;
  const actorStaffName = String(body?.actorStaffName || authUser.displayName || 'Khanh Cao');
  const actorStaffTier = isLockedCvl ? 'CVL' : String(body?.actorStaffTier || authUser.careerTier || 'CVL');

  if (!action || (!bookingId && action !== 'RESET_DEMO')) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Thiếu bookingId hoặc action.' },
    };
  }

  if (action === 'RESET_DEMO' && !bookingId) {
    const demoIds = INITIAL_BOOKINGS.map((b) => b.id);
    const demoCustIds = INITIAL_BOOKINGS.map((b) => b.customerId).filter((id) => id > 0);
    await repo.resetDemoOverrides(body?.resetAll ? undefined : demoIds, body?.resetAll ? undefined : demoCustIds);
    const nowIso = new Date().toISOString();
    return {
      statusCode: 200,
      payload: {
        success: true,
        bookingId: 0,
        action,
        override: null,
        cloudSynced: true,
        cloudSyncedAt: nowIso,
        savedAt: nowIso,
        progress: null,
        timestamp: nowIso,
      },
    };
  }

  return repo.withBookingLock(bookingId, async () => {
    const rawCurrent: BookingOverrideRecord = (await repo.loadBookingOverride(bookingId)) || {};
    const { _simForceIncoming: _simForceIncomingDropped, _simResetAt: _simResetAtDropped, ...current } = rawCurrent;
    const effectiveCustomerId = Number(
      body?.customerId || current.customerId || INITIAL_BOOKINGS.find((b) => b.id === bookingId)?.customerId || 0
    );

    if (
      (action === 'CHECK_IN' || action === 'SAVE_CONSULTATION') &&
      isLockedCvl &&
      current.checkInStaffId &&
      Number(current.checkInStaffId) > 0 &&
      Number(current.checkInStaffId) !== actorStaffId
    ) {
      return {
        statusCode: 409,
        payload: {
          success: false,
          error:
            'Khách hàng Đầu tua này vừa được Chuyên Viên khác tiếp nhận Check-in. Vui lòng làm mới danh sách sảnh.',
        },
      };
    }

    if (
      isLockedCvl &&
      action !== 'RESET_DEMO' &&
      current.assignedStaffId &&
      Number(current.assignedStaffId) > 0 &&
      Number(current.assignedStaffId) !== actorStaffId &&
      Number(current.checkInStaffId) !== actorStaffId &&
      Number(current.checkOutStaffId) !== actorStaffId
    ) {
      return {
        statusCode: 403,
        payload: {
          success: false,
          error:
            'CVL (Chuyên Viên Tự Chủ) chỉ được phép thao tác trên khách hàng kế tiếp (Đầu tua) hoặc khách book của chính mình, không được truy cập khách của Chuyên Viên khác.',
        },
      };
    }

    const isAlreadySettledOrder =
      current.orderState === 'Completed' || current.billing?.settlementStatus === 'SETTLED_COMPLETED';
    const MUTATIVE_ACTIONS_AFTER_SETTLE = new Set([
      'CHECK_IN',
      'SAVE_CONSULTATION',
      'SAVE_CONSULTATION_DRAFT',
      'ASSIGN_STAFF',
      'START_TIMER',
      'FINISH_TIMER',
      'SAVE_PHOTO',
      'NEXT_SERVICE_ROUND',
      'SAVE_SURVEY',
      'UPDATE_CART_PRODUCTS',
      'SAVE_PROMOTION',
      'SAVE_TIP',
    ]);

    if (isAlreadySettledOrder && action !== 'RESET_DEMO' && MUTATIVE_ACTIONS_AFTER_SETTLE.has(action)) {
      return {
        statusCode: 409,
        payload: {
          success: false,
          error: 'Đơn hàng đã được chốt thanh toán và đối soát hoàn tất. Không thể chỉnh sửa thông tin.',
        },
      };
    }

    let nextOverride: BookingOverrideRecord | null = null;

    if (action === 'CHECK_IN') {
      const shouldAutoAssignToSelf = actorStaffTier === 'CVL';
      nextOverride = {
        ...current,
        status: 'CHECKED_IN',
        orderState: 'Check-in',
        checkInStaffId: actorStaffId,
        checkInStaffName: actorStaffName,
        checkInStaffTier: actorStaffTier,
        assignedStaffId: current.assignedStaffId || (shouldAutoAssignToSelf ? actorStaffId : 0),
        assignedStaffName:
          current.assignedStaffName && current.assignedStaffName !== 'Chờ phân công (Đầu tua)'
            ? current.assignedStaffName
            : shouldAutoAssignToSelf
              ? actorStaffName
              : 'Chờ phân công (Đầu tua)',
        checkedInAt: new Date().toISOString(),
      };
    } else if (action === 'SAVE_CONSULTATION_DRAFT') {
      const attrs = body.attributes || {};
      const mergedDraftAttrs = { ...(current.attributes || {}), ...attrs };
      nextOverride = {
        ...current,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        attributes: mergedDraftAttrs,
        notes: body.notes !== undefined ? body.notes : current.notes,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        serviceName: body.skuPricing?.skuName || current.serviceName,
        servicePrice: body.skuPricing?.skuPrice ?? current.servicePrice,
        serviceType: body.skuPricing?.serviceType || current.serviceType,
        draftSavedAt: new Date().toISOString(),
      };
      if (
        effectiveCustomerId > 0 &&
        mergedDraftAttrs.isNewClientDiagnosticDone === true &&
        hasCompleteNaturalLashAttributes(mergedDraftAttrs)
      ) {
        await repo.saveCustomerNaturalLashProfile(effectiveCustomerId, mergedDraftAttrs);
      }
    } else if (action === 'SAVE_CONSULTATION') {
      const attrs = body.attributes || {};
      const savedCustNaturalLash =
        effectiveCustomerId > 0 ? await repo.loadCustomerNaturalLashProfile(effectiveCustomerId) : null;
      const baseExistingAttrs = {
        ...(savedCustNaturalLash || {}),
        ...(current.attributes || {}),
      };
      const naturalLashValidation = validateNaturalLashConsultationSave({
        incomingAttributes: attrs,
        existingAttributes: baseExistingAttrs,
        customerVisits:
          body.customerVisits !== undefined
            ? Number(body.customerVisits)
            : current.customerVisits !== undefined
              ? Number(current.customerVisits)
              : undefined,
      });
      if (!naturalLashValidation.valid) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            error: naturalLashValidation.error,
          },
        };
      }

      const mergedAttrs = {
        ...baseExistingAttrs,
        ...attrs,
        isNewClientDiagnosticDone: true,
      };

      const isAssignOther = body.assignmentMode === 'ASSIGN_OTHER';
      nextOverride = {
        ...current,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        status: isAssignOther ? 'CHECKED_IN' : body.nextStatus || 'SERVICING',
        orderState: isAssignOther ? 'Consultation' : body.nextStatus === 'SERVICING' ? 'Service Start' : 'Consultation',
        checkInStaffId: current.checkInStaffId || actorStaffId,
        checkInStaffName: current.checkInStaffName || actorStaffName,
        checkInStaffTier: current.checkInStaffTier || actorStaffTier,
        assignedStaffId: isAssignOther ? current.assignedStaffId || 0 : current.assignedStaffId || actorStaffId,
        assignedStaffName: isAssignOther
          ? current.assignedStaffName || 'Chờ phân công (Đầu tua)'
          : current.assignedStaffName && current.assignedStaffName !== 'Chờ phân công (Đầu tua)'
            ? current.assignedStaffName
            : actorStaffName,
        attributes: mergedAttrs,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
        serviceName: body.skuPricing?.skuName || current.serviceName,
        servicePrice: body.skuPricing?.skuPrice ?? current.servicePrice,
        serviceType: body.skuPricing?.serviceType || current.serviceType,
        upgradePrice: body.skuPricing?.upgradePrice ?? current.upgradePrice,
        cvRotationPoints: body.skuPricing?.cvPoints ?? current.cvRotationPoints,
        cvRotationBreakdown: body.skuPricing?.cvBreakdown ?? current.cvRotationBreakdown,
        consultedByStaffId: actorStaffId,
        consultedByStaffName: actorStaffName,
        consultedAt: new Date().toISOString(),
      };
      if (effectiveCustomerId > 0 && hasCompleteNaturalLashAttributes(mergedAttrs)) {
        await repo.saveCustomerNaturalLashProfile(effectiveCustomerId, mergedAttrs);
      }
    } else if (action === 'ASSIGN_STAFF') {
      nextOverride = {
        ...current,
        assignedStaffId: Number(body.assignedStaffId) || current.assignedStaffId,
        assignedStaffName: body.assignedStaffName || current.assignedStaffName,
        assignedBed: body.assignedBed || current.assignedBed,
        status: 'SERVICING',
        orderState: 'Preparation',
      };
    } else if (action === 'START_SERVICE') {
      const savedCustNaturalLash =
        effectiveCustomerId > 0 ? await repo.loadCustomerNaturalLashProfile(effectiveCustomerId) : null;
      const effectiveAttrs = {
        ...(savedCustNaturalLash || {}),
        ...(current.attributes || {}),
      };
      if (
        current.attributes?.isNewClientDiagnosticDone === false ||
        !hasCompleteNaturalLashAttributes(effectiveAttrs)
      ) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            error:
              'Bắt buộc kiểm tra mi thật và chọn đầy đủ 7/7 thông số trước khi đến bước Nhiệm Vụ Ca Làm và bắt đầu ca làm.',
          },
        };
      }
      nextOverride = {
        ...current,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        attributes: { ...effectiveAttrs, isNewClientDiagnosticDone: true },
        status: 'SERVICING',
        orderState: 'Service Start',
        assignedStaffId: current.assignedStaffId || actorStaffId,
        assignedStaffName:
          current.assignedStaffName && current.assignedStaffName !== 'Chờ phân công (Đầu tua)'
            ? current.assignedStaffName
            : actorStaffName,
        progress: {
          ...(current.progress || {}),
          startedAt: current.progress?.startedAt || new Date().toISOString(),
          timerRunning: true,
        },
      };
    } else if (action === 'UPDATE_PROGRESS' || action === 'SAVE_PROGRESS') {
      if (body.orderState === 'Preparation') {
        const savedCustNaturalLash =
          effectiveCustomerId > 0 ? await repo.loadCustomerNaturalLashProfile(effectiveCustomerId) : null;
        const effectiveAttrs = {
          ...(savedCustNaturalLash || {}),
          ...(current.attributes || {}),
        };
        if (
          current.attributes?.isNewClientDiagnosticDone === false ||
          !hasCompleteNaturalLashAttributes(effectiveAttrs)
        ) {
          return {
            statusCode: 400,
            payload: {
              success: false,
              error: 'Bắt buộc kiểm tra mi thật và chọn đầy đủ 7/7 thông số trước khi mở tiến trình & bắt đầu ca làm.',
            },
          };
        }
      }
      const incomingProgress = { ...(body.progress || {}) };

      if (
        body.orderState === 'Preparation' &&
        isSelfChallengeSlowerThanAverage(
          incomingProgress.targetDurationMinutes,
          incomingProgress.selfChallengeBaselineMinutes
        )
      ) {
        const reasonCheck = validateSelfChallengeSlowerReason(incomingProgress.selfChallengeSlowerReason);
        if (!reasonCheck.valid) {
          return {
            statusCode: 400,
            payload: {
              success: false,
              error:
                reasonCheck.error || 'Bắt buộc điền lý do hợp lý khi chọn thời gian chậm hơn mức trung bình cá nhân.',
            },
          };
        }
        incomingProgress.selfChallengeSlowerReason = reasonCheck.normalized;
      }

      await persistIncomingRoundPhotosToCloud(bookingId, incomingProgress, isSimulationMode);

      if (
        !isSimulationMode &&
        (repo === defaultIosOverrideRepo || Boolean(bridgeDepsOverride) || Boolean(options?.enableLegacyStepSync))
      ) {
        await persistRetainCountsByServiceIndex(
          bookingId,
          incomingProgress,
          bridgeDepsOverride?.getPool,
          current.attributes?.underMinkServiceType
        );
      }

      const resolvedAssignedStaffId = Number(
        body.assignedStaffId || current.assignedStaffId || (actorStaffId > 0 ? actorStaffId : 0)
      );
      const resolvedAssignedStaffName =
        current.assignedStaffName && current.assignedStaffName !== 'Chờ phân công (Đầu tua)'
          ? current.assignedStaffName
          : actorStaffName || undefined;

      const preserveDoneState = current.status === 'DONE' && !body.forceReopenServicing;
      nextOverride = {
        ...current,
        status: preserveDoneState ? 'DONE' : 'SERVICING',
        orderState: preserveDoneState ? current.orderState || 'Completed' : body.orderState || 'Service End',
        ...(resolvedAssignedStaffId > 0 ? { assignedStaffId: resolvedAssignedStaffId } : {}),
        ...(resolvedAssignedStaffName ? { assignedStaffName: resolvedAssignedStaffName } : {}),
        progress: {
          ...(current.progress || {}),
          ...incomingProgress,
          cloudSynced: true,
          cloudSyncedAt: new Date().toISOString(),
        },
      };
    } else if (action === 'NEXT_SERVICE_ROUND') {
      const incomingProgress = { ...(body.progress || {}) };
      await persistIncomingRoundPhotosToCloud(bookingId, incomingProgress, isSimulationMode);
      const nowIso = new Date().toISOString();
      const preserveDoneState = current.status === 'DONE' && !body.forceReopenServicing;
      nextOverride = {
        ...current,
        status: preserveDoneState ? 'DONE' : 'SERVICING',
        orderState: preserveDoneState ? current.orderState || 'Completed' : body.orderState || 'Preparation',
        progress: {
          ...(current.progress || {}),
          ...incomingProgress,
          upperCompleted: true,
          activeServiceRound: 'UNDER',
          timerRunning: false,
          elapsedSeconds: 0,
          currentStep: 7,
          cloudSynced: true,
          cloudSyncedAt: nowIso,
        },
      };
    } else if (action === 'UPDATE_CUSTOMER_AVATAR') {
      let avatarUrl = String(body.customerAvatar || '').trim();
      if (!isSimulationMode && avatarUrl && avatarUrl.startsWith('data:image/')) {
        avatarUrl = await persistProgressPhotoToCloud(bookingId, 'avatar', avatarUrl);
      }
      nextOverride = {
        ...current,
        customerAvatar: avatarUrl || undefined,
      };
      const effectiveCustomerId = Number(body.customerId || current.customerId || 0);
      if (effectiveCustomerId > 0) {
        await repo.saveCustomerAvatar(effectiveCustomerId, avatarUrl);
      }
    } else if (action === 'COMPLETE_SURVEY' || action === 'SAVE_SURVEY') {
      nextOverride = {
        ...current,
        orderState: 'Service Completed',
        survey: body.survey || current.survey,
      };
    } else if (action === 'SAVE_UPSELL_AND_CHECKOUT' || action === 'SAVE_UPSELL') {
      nextOverride = {
        ...current,
        orderState: 'Check-out',
        checkOutStaffId: actorStaffId,
        checkOutStaffName: actorStaffName,
        checkOutStaffTier: actorStaffTier,
        cartProducts: body.cartProducts !== undefined ? body.cartProducts : current.cartProducts,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
        checkedOutAt: new Date().toISOString(),
      };
    } else if (action === 'SAVE_PROMOTION') {
      const targetScopeRaw = String(body.targetScope || '')
        .trim()
        .toLowerCase();
      const requestedPromotionId =
        body.promotionId !== undefined && body.promotionId !== null && Number(body.promotionId) > 0
          ? Number(body.promotionId)
          : null;
      if ((targetScopeRaw === 'combo' || targetScopeRaw === 'under_combo') && requestedPromotionId) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            error: 'Không áp dụng chương trình khuyến mãi giảm giá cho gói Combo nối mi.',
          },
        };
      }
      let resolvedPromotion: IosPromotionOption | null =
        requestedPromotionId &&
        body.appliedPromotion &&
        Number(body.appliedPromotion?.promotionId) === requestedPromotionId
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
          statusCode: 400,
          payload: {
            success: false,
            error: 'Chương trình khuyến mãi này chỉ áp dụng cho khách hàng mới (lần đầu).',
          },
        };
      }

      nextOverride = applyTargetedPromotionToOverride(current, body, requestedPromotionId, resolvedPromotion);
    } else if (action === 'COMPLETE_ORDER' || action === 'COMPLETE_CHECKOUT') {
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
        status: 'DONE',
        checkInStaffId,
        assignedStaffId,
        checkOutStaffId,
        checkOutStaffName,
        checkOutStaffTier,
        cartProducts: resolvedPromos.cartProducts,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
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

      nextOverride = {
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
      }
    } else if (action === 'REVERT_TO_INCOMING') {
      nextOverride = {
        status: 'INCOMING',
        orderState: 'Confirmed',
      };
    } else if (action === 'RESET_DEMO') {
      await repo.deleteBookingOverride(bookingId);
      if (effectiveCustomerId > 0) {
        await repo.deleteCustomerNaturalLashProfile(effectiveCustomerId);
      }
      nextOverride = null;
    } else {
      nextOverride = Object.keys(current).length > 0 ? current : null;
    }

    if (action !== 'RESET_DEMO' && nextOverride) {
      await repo.saveBookingOverride(bookingId, nextOverride);

      const canRunStepSync =
        !isSimulationMode &&
        !body?.demoMode &&
        STEP_SYNC_ELIGIBLE_ACTIONS.has(action) &&
        (repo === defaultIosOverrideRepo || Boolean(bridgeDepsOverride) || Boolean(options?.enableLegacyStepSync));

      if (canRunStepSync) {
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
            isDemoRequest: Boolean(body?.demoMode),
            previousLastLegacyProgressState: current.progress?.lastLegacyProgressState,
            previousLastLegacyUpperState: current.progress?.lastLegacyUpperState,
            previousLastLegacyUnderState: current.progress?.lastLegacyUnderState,
            previousLastLegacyUpperPhotoSigs: current.progress?.lastLegacyUpperPhotoSigs,
            previousLastLegacyUnderPhotoSigs: current.progress?.lastLegacyUnderPhotoSigs,
          },
          bridgeDepsOverride
        );

        const hasRoundSyncPatch = Boolean(
          stepSync.lastLegacyProgressState ||
          stepSync.lastLegacyUpperState ||
          stepSync.lastLegacyUnderState ||
          stepSync.lastLegacyUpperPhotoSigs ||
          stepSync.lastLegacyUnderPhotoSigs
        );
        const enrichedOverride: BookingOverrideRecord = {
          ...nextOverride,
          legacyStepSyncStatus: stepSync.status,
          ...(stepSync.legacyOrderState ? { legacySyncedOrderState: stepSync.legacyOrderState } : {}),
          ...(stepSync.synced ? { legacyStepSyncedAt: new Date().toISOString() } : {}),
          ...(hasRoundSyncPatch && nextOverride.progress
            ? {
                progress: {
                  ...nextOverride.progress,
                  ...(stepSync.lastLegacyProgressState
                    ? { lastLegacyProgressState: stepSync.lastLegacyProgressState }
                    : {}),
                  ...(stepSync.lastLegacyUpperState ? { lastLegacyUpperState: stepSync.lastLegacyUpperState } : {}),
                  ...(stepSync.lastLegacyUnderState ? { lastLegacyUnderState: stepSync.lastLegacyUnderState } : {}),
                  ...(stepSync.lastLegacyUpperPhotoSigs
                    ? { lastLegacyUpperPhotoSigs: stepSync.lastLegacyUpperPhotoSigs }
                    : {}),
                  ...(stepSync.lastLegacyUnderPhotoSigs
                    ? { lastLegacyUnderPhotoSigs: stepSync.lastLegacyUnderPhotoSigs }
                    : {}),
                },
              }
            : {}),
        };
        if (stepSync.warning) {
          enrichedOverride.legacyStepSyncWarning = stepSync.warning;
        } else {
          delete enrichedOverride.legacyStepSyncWarning;
        }
        nextOverride = enrichedOverride;
        await repo.saveBookingOverride(bookingId, nextOverride);

        if (stepSync.synced) {
          invalidateStaffStatsCache(
            [actorStaffId, stepAssignedStaffId, stepCheckInStaffId, stepCheckOutStaffId].filter((id) => id > 0)
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    return {
      statusCode: 200,
      payload: {
        success: true,
        bookingId,
        action,
        override: nextOverride,
        updatedOverride: nextOverride ?? undefined,
        settlementStatus: nextOverride?.billing?.settlementStatus,
        legacyStepSyncStatus: nextOverride?.legacyStepSyncStatus,
        cloudSynced: true,
        cloudSyncedAt: nowIso,
        savedAt: nowIso,
        progress: nextOverride?.progress || null,
        timestamp: nowIso,
      },
    };
  });
}
