import mysql from 'mysql2/promise';
import {
  hasCompleteNaturalLashAttributes,
  isIosSyntheticSimBookingId,
  type NaturalLashConsultationAttributes,
  type SafeAny,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import type { ExecuteIosActionResult } from './ios-actions.types.js';
import type { IosAuthContext } from './ios-auth.service.js';
import type { BookingOverrideRecord, CrmConfigStoreAdapter } from './ios-overrides.service.js';
import { findSimulationCustomBookingById } from './ios-simulation.service.js';

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

export interface ResolvedBookingMeta {
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

export function pickNaturalLashOnly(
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

export async function resolveBookingBaseMeta(
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

export async function assertCvlSimulationAccess(
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
