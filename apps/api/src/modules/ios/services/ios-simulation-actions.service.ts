import mysql from 'mysql2/promise';
import { FastifyInstance } from 'fastify';
import {
  calculateActorTipBreakdown,
  hasCompleteNaturalLashAttributes,
  isIosSyntheticSimBookingId,
  IosCartProductItem,
  IosSimulationAttemptSourceAction,
  IosSimulationAttemptSummary,
  NaturalLashConsultationAttributes,
  SafeAny,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { BookingOverrideRecord, CrmConfigStoreAdapter } from './ios-overrides.service.js';
import { executeIosBookingAction, ExecuteIosActionResult } from './ios-actions.service.js';
import { computeBookingFinancials } from './ios-bookings-formatters.js';
import {
  appendSimulationAttempt,
  buildSimulationAttemptSnapshot,
  hasAttemptWorthySimulationWork,
  loadSimulationAttempts,
  mapAttemptUpsellToCartProducts,
  reconcileSimulationAttemptsForBooking,
} from './ios-simulation-attempts.service.js';
import {
  findSimulationCustomBookingById,
  getSimulationOverrideRepository,
  resolveSimulationContextActor,
} from './ios-simulation.service.js';

export interface SimSamplePhotoPack {
  beforePhotoUrl: string;
  cleanedPhotoUrl: string;
  afterPhotoUrl: string;
  underBeforePhotoUrl: string;
  underCleanedPhotoUrl: string;
  underAfterPhotoUrl: string;
}

function makeTrainingSvgDataUri(title: string, subtitle: string, accentHex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#18121f"/><stop offset="100%" stop-color="#2c1d34"/></linearGradient></defs><rect width="640" height="420" rx="24" fill="url(#bg)"/><rect x="24" y="24" width="592" height="372" rx="18" fill="none" stroke="${accentHex}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="8 6"/><text x="320" y="180" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="24" font-weight="700" text-anchor="middle">${title}</text><text x="320" y="218" fill="${accentHex}" font-family="system-ui,sans-serif" font-size="16" font-weight="600" text-anchor="middle">${subtitle}</text><text x="320" y="260" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="13" text-anchor="middle">Ảnh mẫu tập luyện · Phòng Mô Phỏng /ios-app</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SIM_TRAINING_SAMPLE_PHOTOS: SimSamplePhotoPack = {
  beforePhotoUrl: makeTrainingSvgDataUri('BEFORE · KIỂM TRA MI TRƯỚC NỐI', 'Mẫu ảnh tập luyện bước 7', '#f472b6'),
  cleanedPhotoUrl: makeTrainingSvgDataUri('CLEANED · VỆ SINH SẠCH NANG MI', 'Mẫu ảnh tập luyện bước 8', '#38bdf8'),
  afterPhotoUrl: makeTrainingSvgDataUri('AFTER · HOÀN THIỆN DÁNG MI WINGS', 'Mẫu ảnh tập luyện bước 10', '#fbbf24'),
  underBeforePhotoUrl: makeTrainingSvgDataUri('BEFORE MI DƯỚI · KIỂM TRA', 'Mẫu ảnh Vòng 2 bước 7', '#34d399'),
  underCleanedPhotoUrl: makeTrainingSvgDataUri('CLEANED MI DƯỚI · VỆ SINH', 'Mẫu ảnh Vòng 2 bước 8', '#38bdf8'),
  underAfterPhotoUrl: makeTrainingSvgDataUri('AFTER MI DƯỚI · HOÀN THIỆN', 'Mẫu ảnh Vòng 2 bước 10', '#fbbf24'),
};

interface ResolvedBookingMeta {
  customerId: number;
  customerName: string;
  orderNumber: string;
  serviceName: string;
  servicePrice: number;
  upgradePrice: number;
  isComboLive: boolean;
  hasUnderMinkCombo: boolean;
  assignedStaffId: number;
  assignedStaffTier?: string;
  cvRotationPoints?: number;
  isLiveCompleted?: boolean;
  isCustomDraftCompleted?: boolean;
}

function pickNaturalLashOnly(
  raw: Record<string, SafeAny> | null | undefined
): NaturalLashConsultationAttributes | undefined {
  if (!raw || !hasCompleteNaturalLashAttributes(raw as NaturalLashConsultationAttributes)) {
    return undefined;
  }
  const countVal = String(raw.naturalLashCount || raw.naturalLashDensity || '').trim();
  return {
    naturalLashLength: String(raw.naturalLashLength || '').trim(),
    naturalLashThickness: String(raw.naturalLashThickness || '').trim(),
    naturalLashCount: countVal,
    naturalLashDensity: String(raw.naturalLashDensity || countVal).trim(),
    lashTrail: String(raw.lashTrail || '').trim(),
    eyeShape: String(raw.eyeShape || '').trim(),
    lashHealth: String(raw.lashHealth || '').trim(),
    medicalProblem: String(raw.medicalProblem || '').trim(),
    isNewClientDiagnosticDone: true,
  };
}

async function resolveBookingBaseMeta(
  staffId: number,
  bookingId: number,
  override: BookingOverrideRecord,
  body: SafeAny,
  baseStore?: CrmConfigStoreAdapter
): Promise<ResolvedBookingMeta> {
  const customDraft = await findSimulationCustomBookingById(staffId, bookingId, baseStore);
  if (customDraft) {
    return {
      customerId: Number(customDraft.customerId || override.customerId || 0),
      customerName: customDraft.customerName || 'Khách tập luyện',
      orderNumber: customDraft.orderNumber || `SIM-${bookingId}`,
      serviceName: override.upgradedServiceName || override.serviceName || customDraft.serviceName || 'Classic 1D',
      servicePrice: Number(override.servicePrice ?? customDraft.servicePrice ?? 550000),
      upgradePrice: Number(override.upgradePrice ?? customDraft.upgradePrice ?? 0),
      isComboLive: Boolean(customDraft.comboLiveStatus?.isComboLive || override.comboRedemption),
      hasUnderMinkCombo: Boolean(customDraft.underMinkComboStatus?.hasUnderCombo),
      assignedStaffId: Number(override.assignedStaffId || customDraft.assignedStaffId || staffId),
      assignedStaffTier: override.assignedStaffTier || customDraft.assignedStaffTier,
      cvRotationPoints: customDraft.cvRotationPoints,
      isCustomDraftCompleted: customDraft.status === 'DONE',
    };
  }

  const bodyMeta = (
    body?.simBookingMeta && typeof body.simBookingMeta === 'object' ? body.simBookingMeta : {}
  ) as SafeAny;
  if (!isIosSyntheticSimBookingId(bookingId)) {
    try {
      const pool = getLegacyPool();
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT o.id, o.order_number, o.order_state, o.order_key, o.user_id, o.total_price, up.full_name, os.assigned_staff_id, sl.service_name AS service_name
         FROM \`order\` o
         LEFT JOIN user_profile up ON up.user_id = o.user_id
         LEFT JOIN order_service os ON os.order_id = o.id
         LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
         WHERE o.id = ?
         ORDER BY os.id ASC
         LIMIT 1`,
        [bookingId]
      );
      if (rows.length > 0) {
        const row = rows[0];
        const fallbackServicePrice =
          override.servicePrice !== undefined
            ? Number(override.servicePrice)
            : bodyMeta.servicePrice !== undefined
              ? Number(bodyMeta.servicePrice)
              : Number(row.total_price) > 0
                ? Number(row.total_price)
                : 550000;
        return {
          customerId: Number(row.user_id || override.customerId || bodyMeta.customerId || 0),
          customerName: String(row.full_name || bodyMeta.customerName || `Khách #${bookingId}`),
          orderNumber: String(bodyMeta.orderNumber || (row.order_number ? `BK-${row.order_number}` : `BK-${row.id}`)),
          serviceName: String(
            override.upgradedServiceName ||
              override.serviceName ||
              bodyMeta.serviceName ||
              row.service_name ||
              'Dịch vụ mi'
          ),
          servicePrice: fallbackServicePrice,
          upgradePrice: Number(override.upgradePrice ?? bodyMeta.upgradePrice ?? 0),
          isComboLive: Boolean(bodyMeta.isComboLive ?? override.comboRedemption),
          hasUnderMinkCombo: Boolean(bodyMeta.hasUnderMinkCombo),
          assignedStaffId: Number(override.assignedStaffId || row.assigned_staff_id || staffId),
          assignedStaffTier: override.assignedStaffTier || bodyMeta.assignedStaffTier,
          cvRotationPoints: bodyMeta.cvRotationPoints ? Number(bodyMeta.cvRotationPoints) : undefined,
          isLiveCompleted: String(row.order_state || '') === 'Completed',
        };
      }
    } catch {
      // Fallback safely when running in isolated unit tests without MySQL pool
    }
  }

  return {
    customerId: Number(override.customerId || body?.customerId || bodyMeta.customerId || 0),
    customerName: String(bodyMeta.customerName || body?.customerName || `Khách #${bookingId}`),
    orderNumber: String(bodyMeta.orderNumber || `#${bookingId}`),
    serviceName: String(override.upgradedServiceName || override.serviceName || bodyMeta.serviceName || 'Dịch vụ mi'),
    servicePrice: Number(override.servicePrice ?? bodyMeta.servicePrice ?? 550000),
    upgradePrice: Number(override.upgradePrice ?? bodyMeta.upgradePrice ?? 0),
    isComboLive: Boolean(bodyMeta.isComboLive ?? override.comboRedemption),
    hasUnderMinkCombo: Boolean(bodyMeta.hasUnderMinkCombo),
    assignedStaffId: Number(override.assignedStaffId || staffId),
    assignedStaffTier: override.assignedStaffTier || bodyMeta.assignedStaffTier,
    cvRotationPoints: bodyMeta.cvRotationPoints ? Number(bodyMeta.cvRotationPoints) : undefined,
  };
}

async function assertCvlSimulationAccess(
  authUser: IosAuthContext,
  bookingId: number,
  currentOverride: BookingOverrideRecord,
  body: SafeAny
): Promise<ExecuteIosActionResult | null> {
  if (authUser.careerTier !== 'CVL' || isIosSyntheticSimBookingId(bookingId)) {
    return null;
  }
  const actorStaffId = Number(authUser.legacyStaffId || 13783);
  const overrideAssigned = Number(currentOverride.assignedStaffId || 0);
  if (
    overrideAssigned > 0 &&
    overrideAssigned !== actorStaffId &&
    Number(currentOverride.checkInStaffId || 0) !== actorStaffId
  ) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        error: 'CVL chỉ được tập luyện trên khách Đầu tua hoặc khách book của chính mình (UI-010).',
      },
    };
  }
  try {
    const pool = getLegacyPool();
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT assigned_staff_id FROM order_service WHERE order_id = ? ORDER BY id ASC LIMIT 1',
      [bookingId]
    );
    const dbAssigned = rows.length > 0 ? Number(rows[0].assigned_staff_id || 0) : 0;
    if (dbAssigned > 0 && dbAssigned !== actorStaffId) {
      return {
        statusCode: 403,
        payload: {
          success: false,
          error: 'CVL không được phép mở ca mô phỏng cho khách hàng đã book riêng Chuyên Viên khác (UI-010).',
        },
      };
    }
  } catch {
    // Allow fallback check in unit tests without live MySQL unless meta indicates other staff
    const metaAssigned = Number(body?.simBookingMeta?.assignedStaffId || 0);
    if (metaAssigned > 0 && metaAssigned !== actorStaffId) {
      return {
        statusCode: 403,
        payload: {
          success: false,
          error: 'CVL không được phép mở ca mô phỏng cho khách hàng đã book riêng Chuyên Viên khác (UI-010).',
        },
      };
    }
  }
  return null;
}

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

  if ((action === 'COMPLETE_ORDER' || action === 'COMPLETE_CHECKOUT') && result.statusCode === 200) {
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
      { updateLatestIfSameCompletion: preOverride.status === 'DONE' }
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
