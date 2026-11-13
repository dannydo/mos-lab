import mysql from 'mysql2/promise';
import {
  addMonthsAndDaysYmd,
  evaluateComboWalletStatus,
  formatExpiryDateDdMmYyyy,
  getVietnamDateYmd,
  IosAdminComboExpiryActionPayload,
  IosAdminComboExpiryActionResponse,
  IosBookingItem,
  IosCustomerComboWalletItem,
  isAdminOrSuperAdminRole,
  normalizeComboDateYmd,
  SafeAny,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import { IosAuthContext } from './ios-auth.service.js';
import { CustomerComboExpiryOverrideEntry, defaultIosOverrideRepo } from './ios-overrides.service.js';

export interface AdminComboExpiryServiceDeps {
  getPool?: () => mysql.Pool | null;
  saveOverride?: (customerId: number, entry: CustomerComboExpiryOverrideEntry) => Promise<void>;
  todayYmd?: string;
}

export function buildSynthesizedComboWallets(
  booking: Pick<IosBookingItem, 'comboLiveStatus' | 'underMinkComboStatus' | 'comboWallets'>,
  todayYmd: string
): IosCustomerComboWalletItem[] {
  if (Array.isArray(booking.comboWallets) && booking.comboWallets.length > 0) {
    return booking.comboWallets;
  }

  const out: IosCustomerComboWalletItem[] = [];
  const upper = booking.comboLiveStatus;
  if (upper && upper.remainingSessions > 0) {
    const status = evaluateComboWalletStatus({
      normalRemaining: upper.normalRemaining,
      retainRemaining: upper.retainRemaining,
      remainingSessions: upper.remainingSessions,
      dateExpired: upper.isFrozen ? null : upper.dateExpired,
      todayYmd,
    });
    out.push({
      balanceId: Number(upper.balanceId || 0),
      serviceGroup: 'upper',
      comboName: upper.comboName || 'Gói Combo Mi Trên',
      serviceKey: upper.serviceKey,
      packageKey: upper.packageKey,
      normalRemaining: Number(upper.normalRemaining || 0),
      retainRemaining: Number(upper.retainRemaining || 0),
      remainingSessions: Number(upper.remainingSessions || 0),
      dateExpired: status.dateExpired,
      isFrozen: status.isFrozen,
      isExpired: status.isExpired,
      isExpiringSoon: status.isExpiringSoon,
      daysRemaining: status.daysRemaining,
      avgDaysPerSession: status.avgDaysPerSession,
      expiryState: status.expiryState,
      retainDaysLimit: upper.retainDaysLimit ?? 25,
    });
  }

  const under = booking.underMinkComboStatus;
  if (under && under.remainingSessions > 0) {
    const status = evaluateComboWalletStatus({
      normalRemaining: under.normalRemaining,
      retainRemaining: under.retainRemaining,
      remainingSessions: under.remainingSessions,
      dateExpired: under.isFrozen ? null : under.dateExpired,
      todayYmd,
    });
    out.push({
      balanceId: Number(under.balanceId || 0),
      serviceGroup: 'under',
      comboName: under.comboName || 'Under Mink 390',
      packageKey: under.packageKey,
      normalRemaining: Number(under.normalRemaining || 0),
      retainRemaining: Number(under.retainRemaining || 0),
      remainingSessions: Number(under.remainingSessions || 0),
      dateExpired: status.dateExpired,
      isFrozen: status.isFrozen,
      isExpired: status.isExpired,
      isExpiringSoon: status.isExpiringSoon,
      daysRemaining: status.daysRemaining,
      avgDaysPerSession: status.avgDaysPerSession,
      expiryState: status.expiryState,
    });
  }

  return out;
}

export function applyCustomerComboExpiryOverridesToBooking(
  booking: IosBookingItem,
  customerOverrides: Record<string, CustomerComboExpiryOverrideEntry> | undefined,
  todayYmd: string
): IosBookingItem {
  const baseWallets = buildSynthesizedComboWallets(booking, todayYmd);
  if (!customerOverrides || Object.keys(customerOverrides).length === 0) {
    return baseWallets.length > 0 && (!booking.comboWallets || booking.comboWallets.length === 0)
      ? { ...booking, comboWallets: baseWallets }
      : booking;
  }

  const updatedWallets = baseWallets.map((w) => {
    const ovr =
      (w.balanceId > 0 ? customerOverrides[String(w.balanceId)] : undefined) || customerOverrides[w.serviceGroup];
    if (!ovr) return w;
    const status = evaluateComboWalletStatus({
      normalRemaining: w.normalRemaining,
      retainRemaining: w.retainRemaining,
      remainingSessions: w.remainingSessions,
      dateExpired: ovr.isFrozen ? null : ovr.dateExpired,
      todayYmd,
    });
    return {
      ...w,
      dateExpired: status.dateExpired,
      isFrozen: status.isFrozen,
      isExpired: status.isExpired,
      isExpiringSoon: status.isExpiringSoon,
      daysRemaining: status.daysRemaining,
      avgDaysPerSession: status.avgDaysPerSession,
      expiryState: status.expiryState,
      note: ovr.reason,
    };
  });

  let nextComboLiveStatus = booking.comboLiveStatus;
  const upperWallets = updatedWallets.filter((w) => w.serviceGroup === 'upper');
  if (nextComboLiveStatus && upperWallets.length > 0) {
    const bestUpper = upperWallets.find((w) => !w.isExpired) || upperWallets[0];
    const isComboLive = !bestUpper.isExpired && bestUpper.remainingSessions > 0;
    nextComboLiveStatus = {
      ...nextComboLiveStatus,
      balanceId: bestUpper.balanceId,
      isComboLive,
      dateExpired: bestUpper.dateExpired,
      isExpired: bestUpper.isExpired,
      isFrozen: bestUpper.isFrozen,
      isExpiringSoon: bestUpper.isExpiringSoon,
      daysRemaining: bestUpper.daysRemaining,
      avgDaysPerSession: bestUpper.avgDaysPerSession,
      expiryState: bestUpper.expiryState,
      upsellOpportunity:
        !isComboLive || bestUpper.remainingSessions <= 2 || bestUpper.isExpiringSoon || bestUpper.isExpired,
    };
  }

  let nextUnderStatus = booking.underMinkComboStatus;
  const underWallets = updatedWallets.filter((w) => w.serviceGroup === 'under');
  if (nextUnderStatus && underWallets.length > 0) {
    const bestUnder = underWallets.find((w) => !w.isExpired) || underWallets[0];
    nextUnderStatus = {
      ...nextUnderStatus,
      balanceId: bestUnder.balanceId,
      hasUnderCombo: !bestUnder.isExpired && bestUnder.remainingSessions > 0,
      dateExpired: bestUnder.dateExpired,
      isExpired: bestUnder.isExpired,
      isFrozen: bestUnder.isFrozen,
      isExpiringSoon: bestUnder.isExpiringSoon,
      daysRemaining: bestUnder.daysRemaining,
      avgDaysPerSession: bestUnder.avgDaysPerSession,
      expiryState: bestUnder.expiryState,
    };
  }

  return {
    ...booking,
    comboLiveStatus: nextComboLiveStatus,
    underMinkComboStatus: nextUnderStatus,
    comboWallets: updatedWallets,
  };
}

export async function executeAdminComboExpiryAction(
  authUser: IosAuthContext,
  payload: IosAdminComboExpiryActionPayload,
  deps: AdminComboExpiryServiceDeps = {}
): Promise<{ statusCode: number; payload: IosAdminComboExpiryActionResponse }> {
  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  if (!isAdmin) {
    return {
      statusCode: 403,
      payload: {
        success: false,
        error: 'Chỉ Admin / Super Admin mới có quyền Gia hạn hoặc Bảo lưu gói Combo.',
      },
    };
  }

  const customerId = Number(payload?.customerId || 0);
  const balanceId = Number(payload?.balanceId || 0);
  const serviceGroup: 'upper' | 'under' = payload?.serviceGroup === 'under' ? 'under' : 'upper';
  const reason = String(payload?.reason || '').trim();
  const action = payload?.action;

  if (customerId <= 0) {
    return { statusCode: 400, payload: { success: false, error: 'Thiếu thông tin khách hàng (customerId).' } };
  }
  if (reason.length < 3) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Vui lòng nhập lý do Gia hạn / Bảo lưu (tối thiểu 3 ký tự).' },
    };
  }
  if (!['EXTEND_DATE', 'ADD_DAYS', 'FREEZE', 'UNFREEZE'].includes(String(action))) {
    return { statusCode: 400, payload: { success: false, error: 'Thao tác không hợp lệ.' } };
  }

  const todayYmd = deps.todayYmd || getVietnamDateYmd();
  let pool: mysql.Pool | null = null;
  try {
    pool = deps.getPool !== undefined ? deps.getPool() : getLegacyPool();
  } catch {
    pool = null;
  }

  let currentExpiryYmd = normalizeComboDateYmd(payload.targetDateExpired);
  if (pool && balanceId > 0 && action === 'ADD_DAYS') {
    try {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT date_expired FROM user_service_balance WHERE id = ? AND user_id = ? LIMIT 1`,
        [balanceId, customerId]
      );
      if (rows?.[0]?.date_expired) {
        currentExpiryYmd = normalizeComboDateYmd(rows[0].date_expired);
      }
    } catch {
      // fallback to payload.targetDateExpired or todayYmd
    }
  }

  let resolvedDateExpired: string | null = null;
  let isFrozen = false;

  if (action === 'FREEZE') {
    resolvedDateExpired = null;
    isFrozen = true;
  } else if (action === 'UNFREEZE') {
    resolvedDateExpired = normalizeComboDateYmd(payload.targetDateExpired) || addMonthsAndDaysYmd(todayYmd, 3, 0);
    isFrozen = false;
  } else if (action === 'EXTEND_DATE') {
    const explicitDate = normalizeComboDateYmd(payload.targetDateExpired);
    if (!explicitDate) {
      return {
        statusCode: 400,
        payload: { success: false, error: 'Ngày hết hạn mới không hợp lệ (YYYY-MM-DD).' },
      };
    }
    resolvedDateExpired = explicitDate;
    isFrozen = false;
  } else if (action === 'ADD_DAYS') {
    const extendDays = Math.trunc(Number(payload.extendDays || 0));
    if (extendDays <= 0 || extendDays > 730) {
      return {
        statusCode: 400,
        payload: { success: false, error: 'Số ngày gia hạn phải từ 1 đến 730 ngày.' },
      };
    }
    const baseAnchor = currentExpiryYmd && currentExpiryYmd >= todayYmd ? currentExpiryYmd : todayYmd;
    resolvedDateExpired = addMonthsAndDaysYmd(baseAnchor, 0, extendDays);
    isFrozen = false;
  }

  const staffId = Number(authUser.legacyStaffId || 3879);
  const noteAudit = `[ADMIN ${action}] ${reason}`.slice(0, 250);
  const dbDateValue = resolvedDateExpired ? `${resolvedDateExpired} 23:59:59` : null;

  if (pool && balanceId > 0) {
    try {
      await pool.query(
        `UPDATE user_service_balance
         SET date_expired = ?, updated_staff_id = ?, note = ?, date_updated = NOW()
         WHERE id = ? AND user_id = ?`,
        [dbDateValue, staffId, noteAudit, balanceId, customerId]
      );
      await pool.query(
        `UPDATE user_service_balance_transaction
         SET date_expired = ?
         WHERE user_service_balance_id = ?
           AND used_staff_id IS NULL
           AND changed_staff_id IS NULL
           AND cancelled_staff_id IS NULL`,
        [dbDateValue, balanceId]
      );
      const groupKey = String(Math.floor(Date.now() / 1000));
      const userNoteText = isFrozen
        ? `[ADMIN BẢO LƯU COMBO #${balanceId}] Đóng băng HSD (date_expired = NULL). Lý do: ${reason}`
        : `[ADMIN CẬP NHẬT HSD COMBO #${balanceId}] HSD mới: ${formatExpiryDateDdMmYyyy(resolvedDateExpired)}. Lý do: ${reason}`;
      await pool.query(
        `INSERT INTO user_note (client_id, client_business_id, client_store_id, user_id, created_staff_id, note_field_key, note, attribute_group_key, is_sticky, is_issue, is_disabled, date_created, date_updated)
         VALUES (11, 1, 1, ?, ?, 'note', ?, ?, 0, 0, 0, NOW(), NOW())`,
        [customerId, staffId, userNoteText.slice(0, 500), groupKey]
      );
    } catch {
      // Non-fatal in dev/demo when management DB row is absent; override store still persists
    }
  }

  const saveOverride =
    deps.saveOverride ||
    ((cid: number, entry: CustomerComboExpiryOverrideEntry) =>
      defaultIosOverrideRepo.saveCustomerComboExpiryOverride(cid, entry));

  await saveOverride(customerId, {
    balanceId,
    serviceGroup,
    dateExpired: resolvedDateExpired,
    isFrozen,
    reason,
    updatedByStaffId: staffId,
    updatedAt: new Date().toISOString(),
  });

  const message = isFrozen
    ? 'Đã chuyển gói Combo sang trạng thái Bảo lưu (đóng băng hạn sử dụng).'
    : `Đã cập nhật hạn sử dụng gói Combo đến ngày ${formatExpiryDateDdMmYyyy(resolvedDateExpired)}.`;

  return {
    statusCode: 200,
    payload: {
      success: true,
      balanceId,
      customerId,
      dateExpired: resolvedDateExpired,
      isFrozen,
      message,
    },
  };
}

/**
 * Sau khi chốt `/order/booking/consultation` sang PHP Legacy, đồng bộ chính xác `date_expired`
 * theo công thức Kinh Thánh COMBO-004 (kể cả cứu buổi gói hết hạn và kích hoạt gói đang Bảo lưu).
 */
export async function syncSettledComboExpiryInLegacyDb(
  pool: mysql.Pool,
  params: {
    customerUserId: number;
    staffId: number;
    selectedCombo?: SafeAny;
    selectedUnderCombo?: SafeAny;
    comboRedemption?: SafeAny;
  }
): Promise<void> {
  const { customerUserId, staffId, selectedCombo, selectedUnderCombo, comboRedemption } = params;
  if (!customerUserId || customerUserId <= 0) return;

  const syncWalletGroup = async (isUnder: boolean, selectedPkg: SafeAny) => {
    const targetYmd = normalizeComboDateYmd(selectedPkg?.dateExpired);
    if (!targetYmd) return;

    const groupFilter = isUnder
      ? `(service_group = 'LashesUnder')`
      : `(service_group IS NULL OR service_group != 'LashesUnder')`;

    const [activeRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, normal_count, retain_count, date_expired
       FROM user_service_balance
       WHERE user_id = ?
         AND (normal_count > 0 OR retain_count > 0)
         AND ${groupFilter}
       ORDER BY (date_expired IS NULL OR DATE(date_expired) >= CURDATE()) DESC, id DESC`,
      [customerUserId]
    );
    if (!activeRows.length) return;

    const primaryId = Number(activeRows[0].id);
    const dbDate = `${targetYmd} 23:59:59`;

    // Nếu mua gói mới để cứu gói cũ hết hạn mà PHP tạo dòng balance mới (bỏ sót dòng hết hạn cũ),
    // gộp buổi tồn dòng hết hạn vào dòng mới và đóng dòng hết hạn cũ để chống nhân đôi hoặc kẹt buổi.
    if (Number(selectedPkg?.revivedExpiredSessions || 0) > 0 && activeRows.length > 1) {
      const expiredStranded = activeRows.slice(1).filter((r) => {
        const ymd = normalizeComboDateYmd(r.date_expired);
        return Boolean(ymd && ymd < getVietnamDateYmd());
      });
      if (expiredStranded.length > 0) {
        const extraNormal = expiredStranded.reduce((s, r) => s + Math.max(0, Number(r.normal_count || 0)), 0);
        const extraRetain = expiredStranded.reduce((s, r) => s + Math.max(0, Number(r.retain_count || 0)), 0);
        const strandedIds = expiredStranded.map((r) => Number(r.id));
        await pool.query(
          `UPDATE user_service_balance
           SET normal_count = normal_count + ?, retain_count = retain_count + ?, date_expired = ?, updated_staff_id = ?, date_updated = NOW()
           WHERE id = ?`,
          [extraNormal, extraRetain, dbDate, staffId, primaryId]
        );
        await pool.query(
          `UPDATE user_service_balance
           SET normal_count = 0, retain_count = 0, note = 'REVIVED_MERGED_COMBO_004', updated_staff_id = ?, date_updated = NOW()
           WHERE id IN (${strandedIds.map(() => '?').join(',')})`,
          [staffId, ...strandedIds]
        );
      } else {
        await pool.query(
          `UPDATE user_service_balance SET date_expired = ?, updated_staff_id = ?, date_updated = NOW() WHERE id = ?`,
          [dbDate, staffId, primaryId]
        );
      }
    } else {
      await pool.query(
        `UPDATE user_service_balance SET date_expired = ?, updated_staff_id = ?, date_updated = NOW() WHERE id = ?`,
        [dbDate, staffId, primaryId]
      );
    }

    await pool.query(
      `UPDATE user_service_balance_transaction
       SET date_expired = ?
       WHERE user_service_balance_id = ?
         AND used_staff_id IS NULL
         AND changed_staff_id IS NULL
         AND cancelled_staff_id IS NULL`,
      [dbDate, primaryId]
    );
  };

  try {
    if (selectedCombo?.dateExpired) {
      await syncWalletGroup(false, selectedCombo);
    } else if (comboRedemption) {
      // Nếu khách dùng buổi trên gói đang Bảo lưu (date_expired IS NULL), kích hoạt lại HSD từ hôm nay
      await pool.query(
        `UPDATE user_service_balance usb
         LEFT JOIN service_price sp ON sp.id = usb.service_price_id
         SET usb.date_expired = DATE_ADD(CURDATE(), INTERVAL COALESCE(NULLIF(ROUND(sp.expiry_after_day), 0), 90) DAY),
             usb.updated_staff_id = ?,
             usb.date_updated = NOW()
         WHERE usb.user_id = ?
           AND usb.date_expired IS NULL
           AND (usb.normal_count > 0 OR usb.retain_count > 0)
           AND (usb.service_group IS NULL OR usb.service_group != 'LashesUnder')`,
        [staffId, customerUserId]
      );
    }

    if (selectedUnderCombo?.dateExpired) {
      await syncWalletGroup(true, selectedUnderCombo);
    }
  } catch {
    // Non-blocking sync safeguard
  }
}
