import { FastifyInstance } from 'fastify';
import {
  hasCompleteNaturalLashAttributes,
  IosSimulationAttemptSummary,
  NaturalLashConsultationAttributes,
  SafeAny,
} from '@mos-lab/shared';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, CrmConfigStoreAdapter } from './ios-overrides.service.js';
import { executeIosBookingAction, ExecuteIosActionResult } from './ios-actions.service.js';
import {
  appendSimulationAttempt,
  buildSimulationAttemptSnapshot,
  hasAttemptWorthySimulationWork,
  loadSimulationAttempts,
  mapAttemptUpsellToCartProducts,
  reconcileSimulationAttemptsForBooking,
} from './ios-simulation-attempts.service.js';
import { getSimulationOverrideRepository, resolveSimulationContextActor } from './ios-simulation.service.js';
import {
  assertCvlSimulationAccess,
  pickNaturalLashOnly,
  resolveBookingBaseMeta,
  SIM_TRAINING_SAMPLE_PHOTOS,
  type SimSamplePhotoPack,
} from './ios-simulation-meta.helper.js';

export { SIM_TRAINING_SAMPLE_PHOTOS, type SimSamplePhotoPack };

export async function executeIosSimulationBookingAction(
  fastify: FastifyInstance | null,
  authUser: IosAuthContext,
  body: SafeAny,
  baseStore?: CrmConfigStoreAdapter
): Promise<ExecuteIosActionResult> {
  if (body?.menteeStaffId && Number(body.menteeStaffId) !== Number(authUser.legacyStaffId || 0)) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        error: 'Mentor / Admin đang ở chế độ xem bài tập của Mentee (Chỉ đọc), không thể chỉnh sửa dữ liệu tập luyện.',
      },
    };
  }

  // Validate actor eligibility when fastify context exists
  if (fastify) {
    await resolveSimulationContextActor(fastify, authUser);
  }

  const bookingId = Number(body?.bookingId || 0);
  const action = String(body?.action || '').toUpperCase();
  const actorStaffId = Number(authUser.legacyStaffId || 13783);
  const actorStaffName = String(body?.actorStaffName || authUser.displayName || `Nhân sự #${actorStaffId}`);
  const simRepo = getSimulationOverrideRepository(actorStaffId, baseStore);

  if (!bookingId && action === 'RESET_DEMO') {
    return { statusCode: 400, payload: { success: false, error: 'Thiếu bookingId để thao tác mô phỏng.' } };
  }

  if (action === 'SIM_REVERT_CONSULTATION') {
    return simRepo.withBookingLock(bookingId, async () => {
      const current = (await simRepo.loadBookingOverride(bookingId)) || {};
      const forbidden = await assertCvlSimulationAccess(authUser, bookingId, current, body);
      if (forbidden) return forbidden;

      const meta = await resolveBookingBaseMeta(actorStaffId, bookingId, current, body, baseStore);
      const effectiveCustomerId = meta.customerId;
      let attemptSnapshot: IosSimulationAttemptSummary | null = null;
      const preExistingAttempts = await loadSimulationAttempts(actorStaffId, bookingId, baseStore);
      const shouldCaptureBaselineCompleted =
        preExistingAttempts.length === 0 && Boolean(meta.isLiveCompleted || meta.isCustomDraftCompleted);
      if (hasAttemptWorthySimulationWork(current) || shouldCaptureBaselineCompleted) {
        attemptSnapshot = await appendSimulationAttempt(
          actorStaffId,
          bookingId,
          buildSimulationAttemptSnapshot({
            sourceAction: 'SIM_REVERT_CONSULTATION',
            bookingId,
            actorStaffId,
            actorStaffName,
            override: hasAttemptWorthySimulationWork(current)
              ? current
              : { ...current, status: 'DONE', orderState: 'Completed' },
            meta,
          }),
          baseStore
        );
      }

      const storedNl =
        effectiveCustomerId > 0 ? await simRepo.loadCustomerNaturalLashProfile(effectiveCustomerId) : null;
      const baseNaturalLash = storedNl || pickNaturalLashOnly(current.attributes);

      const revertedOverride: BookingOverrideRecord = {
        status: 'CHECKED_IN',
        orderState: 'Check-in',
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        checkInStaffId: current.checkInStaffId || actorStaffId,
        checkInStaffName: current.checkInStaffName || actorStaffName,
        checkInStaffTier: current.checkInStaffTier || authUser.careerTier || 'CVL',
        assignedStaffId: current.assignedStaffId || meta.assignedStaffId || actorStaffId,
        assignedStaffName: current.assignedStaffName || actorStaffName,
        assignedStaffTier: current.assignedStaffTier || meta.assignedStaffTier || authUser.careerTier || 'CVL',
        ...(current.assignedBed ? { assignedBed: current.assignedBed } : {}),
        ...(current.checkedInAt ? { checkedInAt: current.checkedInAt } : { checkedInAt: new Date().toISOString() }),
        ...(baseNaturalLash ? { attributes: baseNaturalLash } : {}),
      };

      await simRepo.saveBookingOverride(bookingId, revertedOverride);
      const allAttempts = await loadSimulationAttempts(actorStaffId, bookingId, baseStore);
      const nowIso = new Date().toISOString();

      return {
        statusCode: 200,
        payload: {
          success: true,
          bookingId,
          action,
          simulationMode: true,
          attemptSnapshot,
          simulationAttemptCount: allAttempts.length,
          simulationFastForwardUnlocked: allAttempts.length >= 1,
          updatedOverride: revertedOverride,
          override: revertedOverride,
          savedAt: nowIso,
        },
      };
    });
  }

  if (action === 'SIM_RESET_TO_INCOMING') {
    return simRepo.withBookingLock(bookingId, async () => {
      const current = (await simRepo.loadBookingOverride(bookingId)) || {};
      const forbidden = await assertCvlSimulationAccess(authUser, bookingId, current, body);
      if (forbidden) return forbidden;

      const meta = await resolveBookingBaseMeta(actorStaffId, bookingId, current, body, baseStore);
      const effectiveCustomerId = meta.customerId;
      let attemptSnapshot: IosSimulationAttemptSummary | null = null;
      if (hasAttemptWorthySimulationWork(current)) {
        attemptSnapshot = await appendSimulationAttempt(
          actorStaffId,
          bookingId,
          buildSimulationAttemptSnapshot({
            sourceAction: 'SIM_RESET_TO_INCOMING',
            bookingId,
            actorStaffId,
            actorStaffName,
            override: current,
            meta,
          }),
          baseStore
        );
      }

      if (effectiveCustomerId > 0) {
        await simRepo.deleteCustomerNaturalLashProfile(effectiveCustomerId);
      }

      const nowIso = new Date().toISOString();
      const resetOverride: BookingOverrideRecord = {
        status: 'INCOMING',
        orderState: 'Confirmed',
        _simForceIncoming: true,
        _simResetAt: nowIso,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
      };

      await simRepo.saveBookingOverride(bookingId, resetOverride);
      const allAttempts = await loadSimulationAttempts(actorStaffId, bookingId, baseStore);

      return {
        statusCode: 200,
        payload: {
          success: true,
          bookingId,
          action,
          simulationMode: true,
          attemptSnapshot,
          simulationAttemptCount: allAttempts.length,
          simulationFastForwardUnlocked: allAttempts.length >= 1,
          updatedOverride: resetOverride,
          override: resetOverride,
          savedAt: nowIso,
        },
      };
    });
  }

  if (action === 'SIM_FAST_FORWARD_TO_UPSELL') {
    return simRepo.withBookingLock(bookingId, async () => {
      const current = (await simRepo.loadBookingOverride(bookingId)) || {};
      const forbidden = await assertCvlSimulationAccess(authUser, bookingId, current, body);
      if (forbidden) return forbidden;

      const allAttempts = await loadSimulationAttempts(actorStaffId, bookingId, baseStore);
      if (allAttempts.length < 1) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            error:
              'Lần tập đầu tiên (Phương án #1) bắt buộc đi qua đầy đủ 15 bước quy chuẩn (gồm chụp ảnh & bấm giờ) trước khi mở khóa Tua nhanh kỹ thuật.',
          },
        };
      }

      const meta = await resolveBookingBaseMeta(actorStaffId, bookingId, current, body, baseStore);
      const effectiveCustomerId = meta.customerId;
      const storedNl =
        effectiveCustomerId > 0 ? await simRepo.loadCustomerNaturalLashProfile(effectiveCustomerId) : null;
      const mergedAttrs = {
        ...(storedNl || {}),
        ...(current.attributes || {}),
        ...(body.attributes || {}),
      };
      if (!hasCompleteNaturalLashAttributes(mergedAttrs as NaturalLashConsultationAttributes)) {
        return {
          statusCode: 400,
          payload: {
            success: false,
            error: 'Vui lòng đo đủ 7/7 thông số mi thật trước khi tua nhanh đến Upsell & Checkout.',
          },
        };
      }

      const nowIso = new Date().toISOString();
      const targetMinutes = Number(current.progress?.targetDurationMinutes || 45);
      const nextOverride: BookingOverrideRecord = {
        ...current,
        _simForceIncoming: undefined,
        _simResetAt: undefined,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        status: 'SERVICING',
        orderState: 'Service End',
        checkInStaffId: current.checkInStaffId || actorStaffId,
        checkInStaffName: current.checkInStaffName || actorStaffName,
        checkInStaffTier: current.checkInStaffTier || authUser.careerTier || 'CVL',
        assignedStaffId: current.assignedStaffId || meta.assignedStaffId || actorStaffId,
        assignedStaffName: current.assignedStaffName || actorStaffName,
        assignedStaffTier: current.assignedStaffTier || meta.assignedStaffTier || authUser.careerTier || 'CVL',
        attributes: mergedAttrs,
        ...(body.selectedCombo !== undefined ? { selectedCombo: body.selectedCombo } : {}),
        ...(body.selectedUnderCombo !== undefined ? { selectedUnderCombo: body.selectedUnderCombo } : {}),
        ...(body.comboRedemption !== undefined ? { comboRedemption: body.comboRedemption } : {}),
        progress: {
          ...(current.progress || {}),
          beforePhotoUrl: current.progress?.beforePhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.beforePhotoUrl,
          cleanedPhotoUrl: current.progress?.cleanedPhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.cleanedPhotoUrl,
          afterPhotoUrl: current.progress?.afterPhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.afterPhotoUrl,
          ...(mergedAttrs.hasUnderMink
            ? {
                upperCompleted: true,
                activeServiceRound: 'UNDER' as const,
                underBeforePhotoUrl:
                  current.progress?.underBeforePhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.underBeforePhotoUrl,
                underCleanedPhotoUrl:
                  current.progress?.underCleanedPhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.underCleanedPhotoUrl,
                underAfterPhotoUrl:
                  current.progress?.underAfterPhotoUrl || SIM_TRAINING_SAMPLE_PHOTOS.underAfterPhotoUrl,
              }
            : {}),
          elapsedSeconds: Number(current.progress?.elapsedSeconds || targetMinutes * 60),
          retainLashCountLeft: Number(current.progress?.retainLashCountLeft ?? 65),
          retainLashCountRight: Number(current.progress?.retainLashCountRight ?? 65),
          timerRunning: false,
          startedAt: current.progress?.startedAt || nowIso,
          completedAt: nowIso,
          currentStep: 12,
          cloudSynced: true,
          cloudSyncedAt: nowIso,
        },
      };

      await simRepo.saveBookingOverride(bookingId, nextOverride);
      return {
        statusCode: 200,
        payload: {
          success: true,
          bookingId,
          action,
          simulationMode: true,
          nextStep: 12,
          simulationAttemptCount: allAttempts.length,
          simulationFastForwardUnlocked: true,
          updatedOverride: nextOverride,
          override: nextOverride,
          savedAt: nowIso,
        },
      };
    });
  }

  if (action === 'SIM_APPLY_ATTEMPT') {
    return simRepo.withBookingLock(bookingId, async () => {
      const current = (await simRepo.loadBookingOverride(bookingId)) || {};
      const forbidden = await assertCvlSimulationAccess(authUser, bookingId, current, body);
      if (forbidden) return forbidden;

      const attemptId = String(body.attemptId || '').trim();
      const meta = await resolveBookingBaseMeta(actorStaffId, bookingId, current, body, baseStore);
      const allAttempts = await reconcileSimulationAttemptsForBooking({
        staffId: actorStaffId,
        bookingId,
        actorStaffName,
        override: current,
        isLiveCompleted: meta.isLiveCompleted,
        isCustomDraftCompleted: meta.isCustomDraftCompleted,
        persistIfMissing: true,
        meta,
        baseStore,
      });
      const targetAttempt = allAttempts.find((a) => a.attemptId === attemptId);
      if (!targetAttempt) {
        return {
          statusCode: 404,
          payload: {
            success: false,
            error: `Không tìm thấy kịch bản mô phỏng #${attemptId} để nạp vào bàn làm việc.`,
          },
        };
      }

      const effectiveCustomerId = meta.customerId;
      const nowIso = new Date().toISOString();

      const restoredOverride: BookingOverrideRecord = {
        ...current,
        _simForceIncoming: undefined,
        _simResetAt: undefined,
        completedAt: undefined,
        checkedOutAt: undefined,
        progress: undefined,
        survey: undefined,
        ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
        status: 'CHECKED_IN',
        orderState: 'Check-in',
        checkInStaffId: current.checkInStaffId || actorStaffId,
        checkInStaffName: current.checkInStaffName || actorStaffName,
        checkInStaffTier: current.checkInStaffTier || authUser.careerTier || 'CVL',
        attributes: {
          ...(current.attributes || {}),
          ...(targetAttempt.selectedStyle ? { style: targetAttempt.selectedStyle } : {}),
        },
        selectedCombo: targetAttempt.selectedComboName
          ? {
              id: 'restored-combo',
              name: targetAttempt.selectedComboName,
              price: targetAttempt.selectedComboPrice,
              sessions: 5,
            }
          : null,
        selectedUnderCombo: targetAttempt.selectedUnderComboName
          ? {
              id: 'restored-under-combo',
              name: targetAttempt.selectedUnderComboName,
              price: targetAttempt.selectedUnderComboPrice,
              sessions: 5,
            }
          : null,
        cartProducts: mapAttemptUpsellToCartProducts(targetAttempt.upsellProducts),
        appliedPromotion: targetAttempt.promotionName
          ? {
              id: 'restored-promo',
              name: targetAttempt.promotionName,
              discountAmount: targetAttempt.promotionDiscountAmount,
            }
          : null,
        billing: {
          totalAmount: Math.max(0, targetAttempt.grandTotal - targetAttempt.tipAmount),
          grandTotal: targetAttempt.grandTotal,
          tipAmount: targetAttempt.tipAmount,
          paymentMethod: 'VIETQR',
        },
      };

      await simRepo.saveBookingOverride(bookingId, restoredOverride);

      return {
        statusCode: 200,
        payload: {
          success: true,
          bookingId,
          action,
          simulationMode: true,
          nextStep: 3,
          appliedAttempt: targetAttempt,
          simulationAttemptCount: allAttempts.length,
          simulationFastForwardUnlocked: allAttempts.length >= 1,
          updatedOverride: restoredOverride,
          override: restoredOverride,
          savedAt: nowIso,
        },
      };
    });
  }

  // Guard CVL scope before delegating standard actions into isolated simulation repo
  const preOverride = (await simRepo.loadBookingOverride(bookingId)) || {};
  const forbidden = await assertCvlSimulationAccess(authUser, bookingId, preOverride, body);
  if (forbidden) return forbidden;

  const result = await executeIosBookingAction(authUser, body, simRepo, undefined, {
    simulationMode: true,
  });

  const isCompletedOrAppliedAdjustment =
    (action === 'COMPLETE_ORDER' ||
      action === 'COMPLETE_CHECKOUT' ||
      action === 'APPROVE_POST_CHECKOUT_ADJUSTMENT' ||
      (action === 'SUBMIT_POST_CHECKOUT_ADJUSTMENT' &&
        result.payload?.settlementStatus !== 'PENDING_POST_CHECKOUT_ADJUSTMENT')) &&
    result.statusCode === 200;

  if (isCompletedOrAppliedAdjustment) {
    const savedOverride = (await simRepo.loadBookingOverride(bookingId)) || result.payload.updatedOverride || {};
    const meta = await resolveBookingBaseMeta(actorStaffId, bookingId, savedOverride, body, baseStore);
    const snapshot = await appendSimulationAttempt(
      actorStaffId,
      bookingId,
      buildSimulationAttemptSnapshot({
        sourceAction: 'COMPLETE_ORDER',
        bookingId,
        actorStaffId,
        actorStaffName,
        override: savedOverride,
        meta,
      }),
      baseStore,
      {
        updateLatestIfSameCompletion:
          preOverride.status === 'DONE' ||
          action === 'SUBMIT_POST_CHECKOUT_ADJUSTMENT' ||
          action === 'APPROVE_POST_CHECKOUT_ADJUSTMENT',
      }
    );
    const allAttempts = await loadSimulationAttempts(actorStaffId, bookingId, baseStore);
    result.payload = {
      ...result.payload,
      simulationMode: true,
      attemptSnapshot: snapshot,
      simulationAttemptCount: allAttempts.length,
      simulationFastForwardUnlocked: allAttempts.length >= 1,
    };
  } else {
    result.payload = {
      ...result.payload,
      simulationMode: true,
    };
  }

  return result;
}

export async function loadOrReconcileSimulationAttemptsForActor(
  staffId: number,
  bookingId: number,
  options?: {
    actorStaffName?: string;
    isReadOnlyMentorView?: boolean;
    baseStore?: CrmConfigStoreAdapter;
  }
): Promise<IosSimulationAttemptSummary[]> {
  const existing = await loadSimulationAttempts(staffId, bookingId, options?.baseStore);
  if (existing.length > 0) {
    return existing;
  }

  const simRepo = getSimulationOverrideRepository(staffId, options?.baseStore);
  const override = await simRepo.loadBookingOverride(bookingId);
  const meta = await resolveBookingBaseMeta(staffId, bookingId, override || {}, {}, options?.baseStore);
  return reconcileSimulationAttemptsForBooking({
    staffId,
    bookingId,
    actorStaffName: options?.actorStaffName || `Nhân sự #${staffId}`,
    override,
    isLiveCompleted: meta.isLiveCompleted,
    isCustomDraftCompleted: meta.isCustomDraftCompleted,
    persistIfMissing: !options?.isReadOnlyMentorView,
    meta,
    baseStore: options?.baseStore,
  });
}
