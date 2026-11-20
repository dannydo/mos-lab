import type mysql from 'mysql2/promise';
import {
  canAccessIosConsultationApp,
  canViewUnmaskedCustomerPhone,
  IosCustomerHistoryResponse,
  isAdminOrSuperAdminRole,
} from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import type { IosAuthContext } from './ios-auth.service.js';
import {
  buildCustomerHistoryPayload,
  buildEmptyCustomerHistoryResponse,
  formatDaysAgoLabel,
  mapOrderStateDisplay,
} from './ios-customer-history.mapper.js';
import { fetchOrderLashPhotosAndSpecsBatch, OverrideBatchReader } from './ios-customer-history-lashes.helper.js';
import { evaluateCvlCustomerNoteScope, listIosCustomerAllNotes } from './ios-customer-notes.service.js';
import type { CrmConfigStoreAdapter } from './ios-overrides.service.js';

export { formatDaysAgoLabel, mapOrderStateDisplay };

export interface CustomerHistoryQueryOptions {
  bookingId?: number;
  sim?: boolean;
  now?: Date;
}

export interface CustomerHistoryServiceDeps {
  getPool?: () => mysql.Pool;
  overrideRepo?: OverrideBatchReader;
  simStore?: CrmConfigStoreAdapter;
}

export interface CustomerHistoryServiceResult {
  statusCode: number;
  payload: IosCustomerHistoryResponse;
}

export async function getIosCustomerHistory(
  authUser: IosAuthContext,
  customerId: number,
  options?: CustomerHistoryQueryOptions,
  deps?: CustomerHistoryServiceDeps
): Promise<CustomerHistoryServiceResult> {
  if (!canAccessIosConsultationApp(authUser.role, authUser.teamCodes)) {
    return {
      statusCode: 403,
      payload: buildEmptyCustomerHistoryResponse(customerId, 'Tài khoản không có quyền truy cập hồ sơ iOS (UI-010).'),
    };
  }

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return {
      statusCode: 200,
      payload: buildEmptyCustomerHistoryResponse(customerId),
    };
  }

  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  const isCvlStrict = authUser.careerTier === 'CVL' && !isAdmin;
  const canViewPhone = !isCvlStrict && canViewUnmaskedCustomerPhone(authUser.careerTier || authUser.role);
  const now = options?.now || new Date();
  const pool = (deps?.getPool || getLegacyPool)();

  const [profileRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT up.user_id, up.full_name, up.first_name, up.last_name, up.passcode
     FROM user_profile up
     WHERE up.user_id = ?
     LIMIT 1`,
    [customerId]
  );

  const [contactRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT uc.phone_number
     FROM user_contact uc
     WHERE uc.user_id = ? AND uc.is_disabled = 0
     ORDER BY uc.id DESC
     LIMIT 1`,
    [customerId]
  );

  let diamondBalance = 0;
  try {
    const [balRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
      [customerId]
    );
    if (balRows.length > 0) {
      diamondBalance = Number(balRows[0].amount || 0);
    }
  } catch {
    diamondBalance = 0;
  }

  const emptyQuery = Promise.resolve([[] as mysql.RowDataPacket[], []] as unknown as [
    mysql.RowDataPacket[],
    mysql.FieldPacket[],
  ]);

  const [liveOrderResult, reportOrderResult] = await Promise.all([
    pool.query<mysql.RowDataPacket[]>(
      `SELECT
         o.id AS order_id,
         o.order_state,
         o.booking_date_start,
         o.date_created,
         o.total_price,
         o.booking_note,
         o.client_store_id,
         o.is_debt,
         o.assigned_staff_id AS order_assigned_staff_id,
         csl.client_store_name AS branch_name
       FROM \`order\` o
       LEFT JOIN client_store_language csl
         ON csl.client_store_id = o.client_store_id AND csl.language_id = 1
       WHERE o.user_id = ?
       ORDER BY COALESCE(o.booking_date_start, o.date_created) DESC, o.id DESC
       LIMIT 200`,
      [customerId]
    ),
    pool
      .query<mysql.RowDataPacket[]>(
        `SELECT
           ro.order_id AS order_id,
           'Completed' AS order_state,
           COALESCE(ro.actual_booking_date_start, ro.booking_date_start, ro.date) AS booking_date_start,
           COALESCE(ro.actual_booking_date_start, ro.booking_date_start, ro.date) AS date_created,
           ro.total_price,
           NULL AS booking_note,
           ro.client_store_id,
           (COALESCE(ro.debt_amount, 0) > 0) AS is_debt,
           0 AS order_assigned_staff_id,
           csl.client_store_name AS branch_name,
           COALESCE(ro.paid_cash_amount, 0) AS paid_cash_amount,
           COALESCE(ro.paid_credit_card_amount, 0) AS paid_credit_card_amount,
           COALESCE(ro.paid_bank_transfer_amount, 0) AS paid_bank_transfer_amount,
           COALESCE(ro.paid_credit_amount, 0) AS paid_credit_amount,
           COALESCE(ro.discount_amount, 0) AS discount_amount,
           COALESCE(ro.prepaid_amount, 0) AS prepaid_amount,
           COALESCE(ro.debt_amount, 0) AS debt_amount,
           COALESCE(ro.tip_amount, 0) AS tip_amount
         FROM report_order ro
         LEFT JOIN client_store_language csl
           ON csl.client_store_id = ro.client_store_id AND csl.language_id = 1
         WHERE ro.user_id = ?
         ORDER BY COALESCE(ro.actual_booking_date_start, ro.booking_date_start, ro.date) DESC, ro.order_id DESC
         LIMIT 200`,
        [customerId]
      )
      .catch(() => emptyQuery),
  ]);

  const reportOrderById = new Map<number, mysql.RowDataPacket>();
  for (const ro of reportOrderResult[0]) {
    const oid = Number(ro.order_id || 0);
    if (oid > 0 && !reportOrderById.has(oid)) {
      reportOrderById.set(oid, ro);
    }
  }

  const seenOrderIds = new Set<number>();
  const mergedOrderRows: mysql.RowDataPacket[] = [];
  for (const r of liveOrderResult[0]) {
    const oid = Number(r.order_id || 0);
    if (oid > 0) seenOrderIds.add(oid);
    mergedOrderRows.push(r);
  }
  for (const ro of reportOrderResult[0]) {
    const oid = Number(ro.order_id || 0);
    if (oid > 0 && !seenOrderIds.has(oid)) {
      seenOrderIds.add(oid);
      mergedOrderRows.push(ro);
    }
  }

  const toOrderSortMs = (row: mysql.RowDataPacket): number => {
    const raw = row.booking_date_start || row.date_created;
    if (!raw) return 0;
    const ms = raw instanceof Date ? raw.getTime() : new Date(String(raw)).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  mergedOrderRows.sort((a, b) => {
    const diff = toOrderSortMs(b) - toOrderSortMs(a);
    if (diff !== 0) return diff;
    return Number(b.order_id || 0) - Number(a.order_id || 0);
  });

  const orderRows = mergedOrderRows.slice(0, 200);
  const orderIds = orderRows.map((r) => Number(r.order_id)).filter((id) => Number.isFinite(id) && id > 0);
  const inPlaceholders = orderIds.map(() => '?').join(',');

  const [paymentResult, serviceResult, comboResult, productResult, diamondTxnResult] = await Promise.all([
    orderIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               order_id,
               COALESCE(paid_cash_amount, 0) AS paid_cash_amount,
               COALESCE(paid_credit_card_amount, 0) AS paid_credit_card_amount,
               COALESCE(paid_bank_transfer_amount, 0) AS paid_bank_transfer_amount,
               COALESCE(paid_credit_amount, 0) AS paid_credit_amount,
               COALESCE(discount_amount, 0) AS discount_amount,
               COALESCE(prepaid_amount, 0) AS prepaid_amount,
               COALESCE(debt_amount, 0) AS debt_amount,
               COALESCE(tip_amount, 0) AS tip_amount
             FROM order_payment
             WHERE order_id IN (${inPlaceholders})`,
            orderIds
          )
          .catch(() => emptyQuery)
      : emptyQuery,
    orderIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               os.id AS os_id,
               os.order_id,
               os.service_id,
               os.service_group,
               os.attribute_group_key,
               os.service_type,
               os.user_service_type,
               os.user_service_balance_transaction_id,
               os.total_price,
               os.assigned_staff_id,
               os.check_in_staff_id,
               os.check_out_staff_id,
               sl.service_name,
               s_assign.full_name AS assigned_staff_name,
               s_assign.avatar AS assigned_staff_avatar,
               s_in.full_name AS check_in_staff_name,
               s_in.avatar AS check_in_staff_avatar,
               s_out.full_name AS check_out_staff_name,
               s_out.avatar AS check_out_staff_avatar
             FROM order_service os
             LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
             LEFT JOIN user_profile s_assign ON s_assign.user_id = os.assigned_staff_id
             LEFT JOIN user_profile s_in ON s_in.user_id = os.check_in_staff_id
             LEFT JOIN user_profile s_out ON s_out.user_id = os.check_out_staff_id
             WHERE os.order_id IN (${inPlaceholders})
             ORDER BY os.id ASC`,
            orderIds
          )
          .catch(() => emptyQuery)
      : emptyQuery,
    orderIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               osc.order_id,
               osc.service_id,
               osc.total_price,
               osc.quantity,
               sl.service_name
             FROM order_service_combo osc
             LEFT JOIN service_language sl ON sl.service_id = osc.service_id AND sl.language_id = 1
             WHERE osc.order_id IN (${inPlaceholders})`,
            orderIds
          )
          .catch(() => emptyQuery)
      : emptyQuery,
    orderIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               op.order_id,
               op.product_id,
               op.total_price,
               op.quantity,
               pl.product_name
             FROM order_product op
             LEFT JOIN product_language pl ON pl.product_id = op.product_id AND pl.language_id = 1
             WHERE op.order_id IN (${inPlaceholders})`,
            orderIds
          )
          .catch(() => emptyQuery)
      : emptyQuery,
    pool
      .query<mysql.RowDataPacket[]>(
        `SELECT
           ubt.id,
           ubt.amount,
           ubt.balance,
           ubt.description,
           ubt.method,
           ubt.tracking_key,
           ubt.date_created
         FROM user_balance_transaction ubt
         WHERE ubt.user_id = ? AND ubt.currency_id = 3
         ORDER BY ubt.date_created DESC, ubt.id DESC
         LIMIT 150`,
        [customerId]
      )
      .catch(() => emptyQuery),
  ]);

  const serviceOrderIds = new Set(serviceResult[0].map((s) => Number(s.order_id || 0)));
  const missingServiceOrderIds = orderIds.filter((id) => !serviceOrderIds.has(id));
  const reportServiceResult =
    missingServiceOrderIds.length > 0
      ? await pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               ros.order_service_id AS os_id,
               ros.order_id,
               ros.service_id,
               ros.service_group,
               NULL AS attribute_group_key,
               ros.service_type,
               ros.service_type AS user_service_type,
               NULL AS user_service_balance_transaction_id,
               ros.total_price,
               ros.assigned_staff_id,
               ros.check_in_staff_id,
               ros.check_out_staff_id,
               sl.service_name,
               s_assign.full_name AS assigned_staff_name,
               s_assign.avatar AS assigned_staff_avatar,
               s_in.full_name AS check_in_staff_name,
               s_in.avatar AS check_in_staff_avatar,
               s_out.full_name AS check_out_staff_name,
               s_out.avatar AS check_out_staff_avatar
             FROM report_order_service ros
             LEFT JOIN service_language sl ON sl.service_id = ros.service_id AND sl.language_id = 1
             LEFT JOIN user_profile s_assign ON s_assign.user_id = ros.assigned_staff_id
             LEFT JOIN user_profile s_in ON s_in.user_id = ros.check_in_staff_id
             LEFT JOIN user_profile s_out ON s_out.user_id = ros.check_out_staff_id
             WHERE ros.order_id IN (${missingServiceOrderIds.map(() => '?').join(',')})
             ORDER BY ros.id ASC`,
            missingServiceOrderIds
          )
          .catch(() => emptyQuery)
      : ([[] as mysql.RowDataPacket[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]]);

  const mergedServiceRows = [...serviceResult[0], ...reportServiceResult[0]];

  const paymentOrderIds = new Set(paymentResult[0].map((p) => Number(p.order_id || 0)));
  const mergedPaymentRows: mysql.RowDataPacket[] = [...paymentResult[0]];
  for (const oid of orderIds) {
    if (paymentOrderIds.has(oid)) continue;
    const ro = reportOrderById.get(oid);
    if (ro) {
      mergedPaymentRows.push({
        order_id: oid,
        paid_cash_amount: ro.paid_cash_amount || 0,
        paid_credit_card_amount: ro.paid_credit_card_amount || 0,
        paid_bank_transfer_amount: ro.paid_bank_transfer_amount || 0,
        paid_credit_amount: ro.paid_credit_amount || 0,
        discount_amount: ro.discount_amount || 0,
        prepaid_amount: ro.prepaid_amount || 0,
        debt_amount: ro.debt_amount || 0,
        tip_amount: ro.tip_amount || 0,
      } as mysql.RowDataPacket);
    }
  }

  if (isCvlStrict) {
    const isAllowed = evaluateCvlCustomerNoteScope({
      actorStaffId: Number(authUser.legacyStaffId || 0),
      requestedBookingId: options?.bookingId ? Number(options.bookingId) : undefined,
      isSim: options?.sim,
      orderRows,
      serviceRows: mergedServiceRows,
    });
    if (!isAllowed) {
      return {
        statusCode: 403,
        payload: buildEmptyCustomerHistoryResponse(
          customerId,
          'CVL chỉ được xem lịch sử của khách Đầu tua hoặc khách hàng do chính mình phục vụ (UI-010).'
        ),
      };
    }
  }

  const [lashHydrationByOrder, notes] = await Promise.all([
    fetchOrderLashPhotosAndSpecsBatch(pool, orderIds, mergedServiceRows, deps?.overrideRepo),
    listIosCustomerAllNotes(
      pool,
      customerId,
      {
        sim: options?.sim,
        actorStaffId: Number(authUser.legacyStaffId || authUser.id || 0),
        now,
      },
      { simStore: deps?.simStore }
    ),
  ]);

  return {
    statusCode: 200,
    payload: buildCustomerHistoryPayload({
      customerId,
      profileRow: profileRows[0],
      rawPhone: String(contactRows[0]?.phone_number || '').trim(),
      canViewPhone,
      diamondBalance,
      orderRows,
      paymentRows: mergedPaymentRows,
      serviceRows: mergedServiceRows,
      comboRows: comboResult[0],
      productRows: productResult[0],
      diamondTxnRows: diamondTxnResult[0],
      lashHydrationByOrder,
      notes,
      now,
    }),
  };
}
