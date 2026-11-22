import {
  hasCompleteNaturalLashAttributes,
  isSelfChallengeSlowerThanAverage,
  SafeAny,
  validateNaturalLashConsultationSave,
  validateSelfChallengeSlowerReason,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, createOverrideRepository, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { type SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import { persistProgressPhotoToCloud } from './ios-photos.service.js';
import {
  MUTATIVE_ACTIONS_AFTER_SETTLE,
  extractComboWalletSelectionPatch,
  buildSelectComboWalletOverride,
} from './ios-action-wallet.helper.js';
import { persistIncomingRoundPhotosToCloud, persistRetainCountsByServiceIndex } from './ios-progress-sync.helper.js';
import { executePostCheckoutAdjustmentAction } from './ios-post-checkout-adjustment.service.js';
import {
  executeCompleteOrderTransition,
  resolveSavePromotionOverride,
  runPostSaveLegacyStepSync,
} from './ios-actions-completion.helper.js';
import { ExecuteIosActionResult, ExecuteIosActionOptions } from './ios-actions.types.js';

export type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;
export type { ExecuteIosActionResult, ExecuteIosActionOptions };

export async function executeIosBookingAction(
  authUser: IosAuthContext,
  body: SafeAny,
  repo: IosOverrideRepository = defaultIosOverrideRepo,
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>,
  options?: ExecuteIosActionOptions
): Promise<ExecuteIosActionResult> {
  const isSimulationMode = Boolean(options?.simulationMode);
  const fastify = options?.fastify;
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

    if (
      action === 'SUBMIT_POST_CHECKOUT_ADJUSTMENT' ||
      action === 'APPROVE_POST_CHECKOUT_ADJUSTMENT' ||
      action === 'REJECT_POST_CHECKOUT_ADJUSTMENT'
    ) {
      return executePostCheckoutAdjustmentAction({
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
      });
    }

    const isAlreadySettledOrder =
      current.orderState === 'Completed' || current.billing?.settlementStatus === 'SETTLED_COMPLETED';

    if (isAlreadySettledOrder && action !== 'RESET_DEMO' && MUTATIVE_ACTIONS_AFTER_SETTLE.has(action)) {
      return {
        statusCode: 409,
        payload: {
          success: false,
          error: 'Đơn hàng đã được chốt thanh toán và đối soát hoàn tất. Không thể chỉnh sửa thông tin.',
        },
      };
    }

    const walletSelectionPatch = extractComboWalletSelectionPatch(body, current);
    let nextOverride: BookingOverrideRecord | null;

    if (action === 'CHECK_IN') {
      const shouldAutoAssignToSelf = actorStaffTier === 'CVL';
      nextOverride = {
        ...current,
        ...walletSelectionPatch,
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
    } else if (action === 'SELECT_COMBO_WALLET') {
      nextOverride = buildSelectComboWalletOverride({
        current,
        effectiveCustomerId,
        walletSelectionPatch,
        body,
      });
    } else if (action === 'SAVE_CONSULTATION_DRAFT') {
      const attrs = body.attributes || {};
      const mergedDraftAttrs = { ...(current.attributes || {}), ...attrs };
      nextOverride = {
        ...current,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        ...walletSelectionPatch,
        attributes: mergedDraftAttrs,
        notes: body.notes !== undefined ? body.notes : current.notes,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
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
        ...walletSelectionPatch,
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
        ...walletSelectionPatch,
        orderState: 'Check-out',
        checkOutStaffId: actorStaffId,
        checkOutStaffName: actorStaffName,
        checkOutStaffTier: actorStaffTier,
        cartProducts: body.cartProducts !== undefined ? body.cartProducts : current.cartProducts,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
        ...(body.hasUnderMinkCombo !== undefined ? { hasUnderMinkCombo: Boolean(body.hasUnderMinkCombo) } : {}),
        checkedOutAt: new Date().toISOString(),
      };
    } else if (action === 'SAVE_PROMOTION') {
      const promoOutcome = await resolveSavePromotionOverride({ current, body });
      if (promoOutcome.errorResult) {
        return promoOutcome.errorResult;
      }
      nextOverride = promoOutcome.nextOverride ?? null;
    } else if (action === 'COMPLETE_ORDER' || action === 'COMPLETE_CHECKOUT') {
      nextOverride = await executeCompleteOrderTransition({
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
      });
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
      nextOverride = await runPostSaveLegacyStepSync({
        bookingId,
        action,
        current,
        nextOverride,
        actorStaffId,
        isSimulationMode,
        isDemoRequest: Boolean(body?.demoMode),
        isDefaultRepo: repo === defaultIosOverrideRepo,
        bridgeDepsOverride,
        enableLegacyStepSync: options?.enableLegacyStepSync,
        repo,
      });
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
