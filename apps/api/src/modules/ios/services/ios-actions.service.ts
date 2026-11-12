import mysql from 'mysql2/promise';
import { SafeAny, validateNaturalLashConsultationSave } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, createOverrideRepository, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { persistProgressPhotoToCloud } from './ios-photos.service.js';

export type IosOverrideRepository = ReturnType<typeof createOverrideRepository>;

export interface ExecuteIosActionResult {
  statusCode: number;
  payload: Record<string, SafeAny>;
}

async function persistRetainLashCountsToLegacy(bookingId: number, incomingProgress: Record<string, SafeAny>) {
  if (incomingProgress.retainLashCountLeft === undefined && !incomingProgress.retainLashes) {
    return;
  }

  let progressPool: mysql.Pool | null = null;
  try {
    progressPool = getLegacyPool();
  } catch {
    return;
  }

  try {
    const leftVal = incomingProgress.retainLashCountLeft ?? incomingProgress.retainLashes?.left;
    const rightVal = incomingProgress.retainLashCountRight ?? incomingProgress.retainLashes?.right;
    if (leftVal === undefined || rightVal === undefined) {
      return;
    }

    const [osRows] = await progressPool.query<mysql.RowDataPacket[]>(
      'SELECT id FROM order_service WHERE order_id = ? ORDER BY id ASC LIMIT 1',
      [Number(bookingId)]
    );
    if (osRows.length > 0) {
      const osId = osRows[0].id;
      const groupKey = String(Math.floor(Date.now() / 1000));
      await progressPool.query(
        `INSERT INTO item_attribute_value (client_id, client_business_id, type, item_id, attribute_id, attribute_option_value, group_key, date_created)
         VALUES (11, 1, 'service-retain-attribute', ?, 17, ?, ?, NOW()),
                (11, 1, 'service-retain-attribute', ?, 18, ?, ?, NOW())`,
        [osId, String(leftVal), groupKey, osId, String(rightVal), groupKey]
      );
    }
  } catch (dbErr) {
    console.warn('[ios-actions] Failed to persist retain lash counts to legacy DB:', dbErr);
  }
}

export async function executeIosBookingAction(
  authUser: IosAuthContext,
  body: SafeAny,
  repo: IosOverrideRepository = defaultIosOverrideRepo
): Promise<ExecuteIosActionResult> {
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
    await repo.resetDemoOverrides(body?.resetAll ? undefined : demoIds);
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
    const current: BookingOverrideRecord = (await repo.loadBookingOverride(bookingId)) || {};

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
      nextOverride = {
        ...current,
        attributes: { ...(current.attributes || {}), ...attrs },
        notes: body.notes !== undefined ? body.notes : current.notes,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        serviceName: body.skuPricing?.skuName || current.serviceName,
        servicePrice: body.skuPricing?.skuPrice ?? current.servicePrice,
        serviceType: body.skuPricing?.serviceType || current.serviceType,
        draftSavedAt: new Date().toISOString(),
      };
    } else if (action === 'SAVE_CONSULTATION') {
      const attrs = body.attributes || {};
      const naturalLashValidation = validateNaturalLashConsultationSave({
        incomingAttributes: attrs,
        existingAttributes: current.attributes,
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

      const isAssignOther = body.assignmentMode === 'ASSIGN_OTHER';
      nextOverride = {
        ...current,
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
        attributes: body.attributes || current.attributes,
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
      nextOverride = {
        ...current,
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
      const incomingProgress = { ...(body.progress || {}) };

      if (
        incomingProgress.beforePhotoUrl &&
        typeof incomingProgress.beforePhotoUrl === 'string' &&
        incomingProgress.beforePhotoUrl.startsWith('data:image/')
      ) {
        incomingProgress.beforePhotoUrl = await persistProgressPhotoToCloud(
          bookingId,
          'before',
          incomingProgress.beforePhotoUrl
        );
      }
      if (
        incomingProgress.cleanedPhotoUrl &&
        typeof incomingProgress.cleanedPhotoUrl === 'string' &&
        incomingProgress.cleanedPhotoUrl.startsWith('data:image/')
      ) {
        incomingProgress.cleanedPhotoUrl = await persistProgressPhotoToCloud(
          bookingId,
          'cleaned',
          incomingProgress.cleanedPhotoUrl
        );
      }
      if (
        incomingProgress.afterPhotoUrl &&
        typeof incomingProgress.afterPhotoUrl === 'string' &&
        incomingProgress.afterPhotoUrl.startsWith('data:image/')
      ) {
        incomingProgress.afterPhotoUrl = await persistProgressPhotoToCloud(
          bookingId,
          'after',
          incomingProgress.afterPhotoUrl
        );
      }

      await persistRetainLashCountsToLegacy(bookingId, incomingProgress);

      nextOverride = {
        ...current,
        status: 'SERVICING',
        orderState: body.orderState || 'Service End',
        progress: {
          ...(current.progress || {}),
          ...incomingProgress,
          cloudSynced: true,
          cloudSyncedAt: new Date().toISOString(),
        },
      };
    } else if (action === 'UPDATE_CUSTOMER_AVATAR') {
      let avatarUrl = String(body.customerAvatar || '').trim();
      if (avatarUrl && avatarUrl.startsWith('data:image/')) {
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
    } else if (action === 'COMPLETE_ORDER' || action === 'COMPLETE_CHECKOUT') {
      const checkOutStaffId = current.checkOutStaffId || actorStaffId;
      const checkOutStaffName = current.checkOutStaffName || actorStaffName;
      const checkOutStaffTier = current.checkOutStaffTier || actorStaffTier;
      const completedAtIso = new Date().toISOString();
      nextOverride = {
        ...current,
        status: 'DONE',
        orderState: 'Completed',
        checkOutStaffId,
        checkOutStaffName,
        checkOutStaffTier,
        selectedCombo: body.selectedCombo !== undefined ? body.selectedCombo : current.selectedCombo,
        selectedUnderCombo:
          body.selectedUnderCombo !== undefined ? body.selectedUnderCombo : current.selectedUnderCombo,
        comboRedemption: body.comboRedemption !== undefined ? body.comboRedemption : current.comboRedemption,
        billing: {
          ...(current.billing || {}),
          ...(body.billing || {}),
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
    } else if (action === 'REVERT_TO_INCOMING') {
      nextOverride = {
        status: 'INCOMING',
        orderState: 'Confirmed',
      };
    } else if (action === 'RESET_DEMO') {
      await repo.deleteBookingOverride(bookingId);
      nextOverride = null;
    } else {
      nextOverride = Object.keys(current).length > 0 ? current : null;
    }

    if (action !== 'RESET_DEMO' && nextOverride) {
      await repo.saveBookingOverride(bookingId, nextOverride);
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
        cloudSynced: true,
        cloudSyncedAt: nowIso,
        savedAt: nowIso,
        progress: nextOverride?.progress || null,
        timestamp: nowIso,
      },
    };
  });
}
