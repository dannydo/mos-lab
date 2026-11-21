import type mysql from 'mysql2/promise';
import {
  canAccessIosConsultationApp,
  IosCreateCustomerNotePayload,
  IosCreateCustomerNoteResponse,
  IosCustomerNoteItem,
  isAdminOrSuperAdminRole,
  SafeAny,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import type { IosAuthContext } from './ios-auth.service.js';
import { resolveStaffAvatar } from './ios-bookings-formatters.js';
import { formatDaysAgoLabel, toVnDateParts } from './ios-customer-history.mapper.js';
import { CrmConfigStoreAdapter, createMysqlConfigStore, defaultIosOverrideRepo } from './ios-overrides.service.js';

export const SIM_CUSTOMER_NOTES_KEY_PREFIX = 'IOS_SIM_CUST_NOTES:';
export const CVL_NOTE_FIELD_KEY = 'cvl_note';

export interface CustomerNotesServiceDeps {
  getPool?: () => mysql.Pool;
  overrideRepo?: Pick<typeof defaultIosOverrideRepo, 'loadBookingOverride'>;
  simStore?: CrmConfigStoreAdapter;
  now?: () => Date;
}

export interface CreateCustomerNoteResult {
  statusCode: number;
  payload: IosCreateCustomerNoteResponse;
}

function getSimCustomerNotesKey(staffId: number, customerId: number): string {
  return `${SIM_CUSTOMER_NOTES_KEY_PREFIX}${staffId}:${customerId}`;
}

export function mapRawUserNoteRow(row: mysql.RowDataPacket, now: Date = new Date()): IosCustomerNoteItem {
  const vnParts = toVnDateParts(row.date_created);
  const noteFieldKey = String(row.note_field_key || 'note');
  const source = noteFieldKey === CVL_NOTE_FIELD_KEY ? 'CVL' : 'CRM';
  const rawAvatar = row.staff_avatar ? String(row.staff_avatar) : null;

  return {
    id: Number(row.id || 0),
    customerId: Number(row.user_id || 0),
    note: String(row.note || '').trim(),
    noteFieldKey,
    source,
    isSticky: Boolean(Number(row.is_sticky || 0)),
    isIssue: Boolean(Number(row.is_issue || 0)),
    dateCreated: vnParts.iso,
    dateDisplay: vnParts.dateDisplay,
    timeDisplay: vnParts.timeDisplay,
    daysAgoLabel: vnParts.dateKey ? formatDaysAgoLabel(vnParts.dateKey, now) : '',
    staffId: row.created_staff_id ? Number(row.created_staff_id) : undefined,
    staffName: String(row.staff_name || (source === 'CVL' ? 'Chuyên Viên' : 'System')).trim(),
    staffAvatar: resolveStaffAvatar(rawAvatar) || rawAvatar || null,
    branchName: row.branch_name ? String(row.branch_name).trim() : null,
    ...(row.order_id ? { orderId: Number(row.order_id) } : {}),
    ...(row.order_number ? { orderNumber: String(row.order_number).trim() } : {}),
  };
}

/**
 * Check UI-010 scope for a CVL specialist accessing/adding notes for a customer.
 * Allowed when the CVL served any visit of the customer, is assigned/checked-in/out on the booking
 * (in DB or atomic override), or the booking is an unassigned active lobby queue item (Đầu tua).
 */
export function evaluateCvlCustomerNoteScope(params: {
  actorStaffId: number;
  requestedBookingId?: number;
  isSim?: boolean;
  orderRows: mysql.RowDataPacket[];
  serviceRows: mysql.RowDataPacket[];
  bookingOverride?: Record<string, SafeAny> | null;
}): boolean {
  const { actorStaffId, requestedBookingId, isSim, orderRows, serviceRows, bookingOverride } = params;
  const hasStaffTouch = (row: mysql.RowDataPacket) =>
    Number(row.assigned_staff_id || 0) === actorStaffId ||
    Number(row.check_in_staff_id || 0) === actorStaffId ||
    Number(row.check_out_staff_id || 0) === actorStaffId;

  if (requestedBookingId && requestedBookingId > 0) {
    if (bookingOverride) {
      const ovAssigned = Number(bookingOverride.assignedStaffId || 0);
      const ovIn = Number(bookingOverride.checkInStaffId || 0);
      const ovOut = Number(bookingOverride.checkOutStaffId || 0);
      if (ovAssigned === actorStaffId || ovIn === actorStaffId || ovOut === actorStaffId) {
        return true;
      }
    }

    const targetOrder = orderRows.find((r) => Number(r.order_id) === requestedBookingId);
    const targetServices = serviceRows.filter((s) => Number(s.order_id) === requestedBookingId);
    if (targetOrder) {
      const state = String(targetOrder.order_state || '').toLowerCase();
      const assignedOnOrder = Number(targetOrder.order_assigned_staff_id || 0);
      const assignedOnService = targetServices.some((s) => Number(s.assigned_staff_id || 0) > 0);
      const touchedByActor = assignedOnOrder === actorStaffId || targetServices.some(hasStaffTouch);
      const isUnassignedActive =
        assignedOnOrder === 0 &&
        !assignedOnService &&
        (state === 'new' || state === 'confirmed' || state === 'checkin');
      return touchedByActor || isUnassignedActive;
    }
    return Boolean(isSim);
  }

  const touchedBefore =
    orderRows.some((r) => Number(r.order_assigned_staff_id || 0) === actorStaffId) || serviceRows.some(hasStaffTouch);

  const hasUnassignedActive = orderRows.some((r) => {
    const oid = Number(r.order_id);
    const state = String(r.order_state || '').toLowerCase();
    if (state !== 'new' && state !== 'confirmed' && state !== 'checkin') return false;
    const orderAssigned = Number(r.order_assigned_staff_id || 0);
    const svcAssigned = serviceRows.some((s) => Number(s.order_id) === oid && Number(s.assigned_staff_id || 0) > 0);
    return orderAssigned === 0 && !svcAssigned;
  });

  return touchedBefore || hasUnassignedActive;
}

/**
 * Batch-load recent CVL notes (`note_field_key = 'cvl_note'`) for a list of customers.
 * Prioritizes `is_sticky DESC, date_created DESC` and caps at 5 items per customer.
 */
export async function listIosCustomerCvlNotesBatch(
  pool: mysql.Pool,
  customerIds: number[],
  now: Date = new Date()
): Promise<Map<number, IosCustomerNoteItem[]>> {
  const result = new Map<number, IosCustomerNoteItem[]>();
  const uniqueIds = Array.from(new Set(customerIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return result;

  try {
    const placeholders = uniqueIds.map(() => '?').join(',');
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         un.id,
         un.user_id,
         un.order_id,
         o.order_number,
         un.note,
         un.note_field_key,
         un.is_sticky,
         un.is_issue,
         un.created_staff_id,
         un.date_created,
         COALESCE(up.full_name, 'Chuyên Viên') AS staff_name,
         up.avatar AS staff_avatar,
         csl.client_store_name AS branch_name
       FROM user_note un
       LEFT JOIN user_profile up ON up.user_id = un.created_staff_id
       LEFT JOIN \`order\` o ON o.id = un.order_id
       LEFT JOIN client_store_language csl
         ON csl.client_store_id = COALESCE(o.client_store_id, up.client_store_id)
        AND csl.language_id = 1
       WHERE un.user_id IN (${placeholders})
         AND un.note_field_key = ?
         AND un.is_disabled = 0
       ORDER BY un.is_sticky DESC, un.date_created DESC, un.id DESC`,
      [...uniqueIds, CVL_NOTE_FIELD_KEY]
    );

    for (const row of rows) {
      const uid = Number(row.user_id || 0);
      if (!uid) continue;
      const list = result.get(uid) || [];
      if (list.length >= 5) continue;
      const mapped = mapRawUserNoteRow(row, now);
      if (mapped.note) {
        list.push(mapped);
        result.set(uid, list);
      }
    }
  } catch {
    // Non-blocking enrichment fallback
  }

  return result;
}

async function loadSimulationCustomerNotes(
  store: CrmConfigStoreAdapter,
  staffId: number,
  customerId: number
): Promise<IosCustomerNoteItem[]> {
  if (!staffId || !customerId) return [];
  try {
    const raw = await store.getOne(getSimCustomerNotesKey(staffId, customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IosCustomerNoteItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Load all notes (`cvl_note`, `note`, `order_note`) for a customer in CustomerHistoryAndSpendingSheet.
 */
export async function listIosCustomerAllNotes(
  pool: mysql.Pool,
  customerId: number,
  options?: { sim?: boolean; actorStaffId?: number; now?: Date },
  deps?: { simStore?: CrmConfigStoreAdapter }
): Promise<IosCustomerNoteItem[]> {
  if (!Number.isFinite(customerId) || customerId <= 0) return [];
  const now = options?.now || new Date();
  const simStore = deps?.simStore || createMysqlConfigStore();
  const simNotes =
    options?.sim && options?.actorStaffId
      ? await loadSimulationCustomerNotes(simStore, options.actorStaffId, customerId)
      : [];

  let dbNotes: IosCustomerNoteItem[] = [];
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         un.id,
         un.user_id,
         un.order_id,
         o.order_number,
         un.note,
         un.note_field_key,
         un.is_sticky,
         un.is_issue,
         un.created_staff_id,
         un.date_created,
         COALESCE(up.full_name, 'System') AS staff_name,
         up.avatar AS staff_avatar,
         csl.client_store_name AS branch_name
       FROM user_note un
       LEFT JOIN user_profile up ON up.user_id = un.created_staff_id
       LEFT JOIN \`order\` o ON o.id = un.order_id
       LEFT JOIN client_store_language csl
         ON csl.client_store_id = COALESCE(o.client_store_id, up.client_store_id)
        AND csl.language_id = 1
       WHERE un.user_id = ?
         AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
       ORDER BY un.is_sticky DESC, un.date_created DESC, un.id DESC
       LIMIT 100`,
      [customerId]
    );
    dbNotes = rows.map((r) => mapRawUserNoteRow(r, now)).filter((item) => item.note.length > 0);
  } catch {
    dbNotes = [];
  }

  return [...simNotes, ...dbNotes].sort((a, b) => {
    if (a.isSticky !== b.isSticky) return a.isSticky ? -1 : 1;
    const ta = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
    const tb = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
    return tb - ta;
  });
}

async function verifyCvlScopeForCreateNote(
  pool: mysql.Pool,
  actorStaffId: number,
  customerId: number,
  bookingId: number | undefined,
  isSim: boolean,
  overrideRepo: Pick<typeof defaultIosOverrideRepo, 'loadBookingOverride'>
): Promise<boolean> {
  const bookingOverride =
    bookingId && bookingId > 0 ? await overrideRepo.loadBookingOverride(bookingId).catch(() => null) : null;

  const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT o.id AS order_id, o.order_state, o.assigned_staff_id AS order_assigned_staff_id
     FROM \`order\` o
     WHERE o.user_id = ?
     ORDER BY o.id DESC
     LIMIT 200`,
    [customerId]
  );

  const orderIds = orderRows.map((r) => Number(r.order_id)).filter((id) => id > 0);
  let serviceRows: mysql.RowDataPacket[] = [];
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    const [liveSvcRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT os.order_id, os.assigned_staff_id, os.check_in_staff_id, os.check_out_staff_id
       FROM order_service os
       WHERE os.order_id IN (${placeholders})`,
      orderIds
    );
    const [reportSvcRows] = await pool
      .query<mysql.RowDataPacket[]>(
        `SELECT ros.order_id, ros.assigned_staff_id, ros.check_in_staff_id, ros.check_out_staff_id
         FROM report_order_service ros
         WHERE ros.order_id IN (${placeholders})`,
        orderIds
      )
      .catch(() => [[] as mysql.RowDataPacket[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]]);
    serviceRows = [...liveSvcRows, ...reportSvcRows];
  }

  return evaluateCvlCustomerNoteScope({
    actorStaffId,
    requestedBookingId: bookingId,
    isSim,
    orderRows,
    serviceRows,
    bookingOverride,
  });
}

/**
 * Append-only creation of a CVL Note for a customer after checkout (or anytime for authorized actors).
 * Allowed even when the order is already SETTLED_COMPLETED and across any date.
 */
export async function createIosCustomerNote(
  authUser: IosAuthContext,
  customerId: number,
  payload: IosCreateCustomerNotePayload,
  deps?: CustomerNotesServiceDeps
): Promise<CreateCustomerNoteResult> {
  if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role, authUser.teamCodes)) {
    return {
      statusCode: 403,
      payload: { success: false, error: 'Tài khoản không có quyền truy cập /ios-app (UI-010).' },
    };
  }

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Mã khách hàng không hợp lệ.' },
    };
  }

  const trimmedNote = String(payload?.note || '').trim();
  if (!trimmedNote) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Nội dung ghi chú không được để trống.' },
    };
  }
  if (trimmedNote.length > 500) {
    return {
      statusCode: 400,
      payload: { success: false, error: 'Ghi chú tối đa 500 ký tự.' },
    };
  }

  const now = (deps?.now || (() => new Date()))();
  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  const isCvlStrict = authUser.careerTier === 'CVL' && !isAdmin;
  const actorStaffId = Number(authUser.legacyStaffId || authUser.id || 0);
  const isSim = Boolean(payload?.simulationMode);
  const overrideRepo = deps?.overrideRepo || defaultIosOverrideRepo;
  const pool = (deps?.getPool || getLegacyPool)();

  if (isCvlStrict) {
    const allowed = await verifyCvlScopeForCreateNote(
      pool,
      actorStaffId,
      customerId,
      payload?.bookingId ? Number(payload.bookingId) : undefined,
      isSim,
      overrideRepo
    );
    if (!allowed) {
      return {
        statusCode: 403,
        payload: {
          success: false,
          error: 'CVL chỉ được thêm ghi chú cho khách Đầu tua hoặc khách do chính mình phục vụ (UI-010).',
        },
      };
    }
  }

  const vnParts = toVnDateParts(now);
  const isSticky = Boolean(payload?.isSticky);
  const staffName = authUser.displayName || 'Chuyên Viên';
  const BRANCH_FALLBACK_NAMES: Record<number, string> = {
    1: 'CMT8',
    2: 'PXL',
    6: 'Đề Thám',
    11: 'Kỳ Đồng',
    15: 'Him Lam',
    16: 'Estella Place',
  };
  let resolvedStoreId = Number(authUser.clientStoreId || 6);
  const resolveBranchName = (sid: number) => BRANCH_FALLBACK_NAMES[sid] || 'Đề Thám';

  if (isSim) {
    const branchName = resolveBranchName(resolvedStoreId);
    const simStore = deps?.simStore || createMysqlConfigStore();
    const existingSim = await loadSimulationCustomerNotes(simStore, actorStaffId, customerId);
    const simNote: IosCustomerNoteItem = {
      id: Date.now(),
      customerId,
      note: trimmedNote,
      noteFieldKey: CVL_NOTE_FIELD_KEY,
      source: 'CVL',
      isSticky,
      isIssue: false,
      dateCreated: vnParts.iso,
      dateDisplay: vnParts.dateDisplay,
      timeDisplay: vnParts.timeDisplay,
      daysAgoLabel: 'Hôm Nay',
      staffId: actorStaffId || undefined,
      staffName,
      staffAvatar: null,
      branchName,
      ...(payload?.bookingId ? { orderId: Number(payload.bookingId) } : {}),
    };
    const nextSim = [simNote, ...existingSim].slice(0, 50);
    await simStore.upsert(getSimCustomerNotesKey(actorStaffId, customerId), JSON.stringify(nextSim));
    return { statusCode: 200, payload: { success: true, note: simNote } };
  }

  const groupKey = Math.floor(now.getTime() / 1000).toString();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let validOrderId: number | null = null;
    if (payload?.bookingId && Number(payload.bookingId) > 0) {
      const [orderCheck] = await conn.query<mysql.RowDataPacket[]>(
        'SELECT id, client_store_id FROM `order` WHERE id = ? LIMIT 1',
        [Number(payload.bookingId)]
      );
      if (orderCheck.length > 0) {
        validOrderId = Number(orderCheck[0].id);
        if (orderCheck[0].client_store_id) {
          resolvedStoreId = Number(orderCheck[0].client_store_id);
        }
      }
    }

    let validStaffId: number | null = null;
    if (authUser.legacyStaffId && Number(authUser.legacyStaffId) > 0) {
      const [staffCheck] = await conn.query<mysql.RowDataPacket[]>(
        'SELECT id FROM `user` WHERE id = ? LIMIT 1',
        [Number(authUser.legacyStaffId)]
      );
      if (staffCheck.length > 0) {
        validStaffId = Number(staffCheck[0].id);
      }
    }

    const branchName = resolveBranchName(resolvedStoreId);

    const [insertResult] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO user_note (
         client_id, client_business_id, user_id, order_id, created_staff_id,
         note_field_key, note, attribute_group_key, is_sticky, is_issue, is_disabled,
         date_created, date_updated
       ) VALUES (11, 1, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
      [customerId, validOrderId, validStaffId, CVL_NOTE_FIELD_KEY, trimmedNote, groupKey, isSticky ? 1 : 0]
    );
    const newNoteId = Number(insertResult.insertId || 0);
    if (newNoteId > 0) {
      await conn.query(
        `INSERT INTO item_attribute_value (
           client_id, client_business_id, type, item_id, attribute_id,
           attribute_option_id, attribute_option_value, group_key, date_created
         ) VALUES
         (11, 1, 'user-note-attribute', ?, 23, 116, 'Normal', ?, NOW()),
         (11, 1, 'user-note-attribute', ?, 24, 119, 'Note', ?, NOW())`,
        [newNoteId, groupKey, newNoteId, groupKey]
      );
    }
    await conn.commit();

    const createdItem: IosCustomerNoteItem = {
      id: newNoteId,
      customerId,
      note: trimmedNote,
      noteFieldKey: CVL_NOTE_FIELD_KEY,
      source: 'CVL',
      isSticky,
      isIssue: false,
      dateCreated: vnParts.iso,
      dateDisplay: vnParts.dateDisplay,
      timeDisplay: vnParts.timeDisplay,
      daysAgoLabel: 'Hôm Nay',
      staffId: validStaffId ?? (actorStaffId || undefined),
      staffName,
      staffAvatar: null,
      branchName,
      ...(validOrderId ? { orderId: validOrderId } : {}),
    };
    return { statusCode: 200, payload: { success: true, note: createdItem } };
  } catch (err: SafeAny) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback error
    }
    return {
      statusCode: 500,
      payload: { success: false, error: err?.message || 'Không thể lưu ghi chú.' },
    };
  } finally {
    conn.release();
  }
}
