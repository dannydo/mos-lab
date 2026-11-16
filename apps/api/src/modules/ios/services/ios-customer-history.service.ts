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

export { formatDaysAgoLabel, mapOrderStateDisplay };

export interface CustomerHistoryQueryOptions {
  bookingId?: number;
  sim?: boolean;
  now?: Date;
}

export interface CustomerHistoryServiceDeps {
  getPool?: () => mysql.Pool;
}

export interface CustomerHistoryServiceResult {
  statusCode: number;
  payload: IosCustomerHistoryResponse;
}

function checkCvlCustomerHistoryScope(params: {
  actorStaffId: number;
  requestedBookingId?: number;
  isSim?: boolean;
  orderRows: mysql.RowDataPacket[];
  serviceRows: mysql.RowDataPacket[];
}): boolean {
  const { actorStaffId, requestedBookingId, isSim, orderRows, serviceRows } = params;
  const hasStaffTouch = (row: mysql.RowDataPacket) =>
    Number(row.assigned_staff_id || 0) === actorStaffId ||
    Number(row.check_in_staff_id || 0) === actorStaffId ||
    Number(row.check_out_staff_id || 0) === actorStaffId;

  if (requestedBookingId && requestedBookingId > 0) {
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

  const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
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
  );

  const orderIds = orderRows.map((r) => Number(r.order_id)).filter((id) => Number.isFinite(id) && id > 0);
  const emptyQuery = Promise.resolve([[] as mysql.RowDataPacket[], []] as unknown as [
    mysql.RowDataPacket[],
    mysql.FieldPacket[],
  ]);

  const inPlaceholders = orderIds.map(() => '?').join(',');

  const [paymentResult, serviceResult, comboResult, productResult, diamondTxnResult] = await Promise.all([
    orderIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
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
      : emptyQuery,
    orderIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
          `SELECT
             os.order_id,
             os.service_id,
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
      : emptyQuery,
    orderIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
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
      : emptyQuery,
    orderIds.length > 0
      ? pool.query<mysql.RowDataPacket[]>(
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

  if (isCvlStrict) {
    const isAllowed = checkCvlCustomerHistoryScope({
      actorStaffId: Number(authUser.legacyStaffId || 0),
      requestedBookingId: options?.bookingId ? Number(options.bookingId) : undefined,
      isSim: options?.sim,
      orderRows,
      serviceRows: serviceResult[0],
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

  return {
    statusCode: 200,
    payload: buildCustomerHistoryPayload({
      customerId,
      profileRow: profileRows[0],
      rawPhone: String(contactRows[0]?.phone_number || '').trim(),
      canViewPhone,
      diamondBalance,
      orderRows,
      paymentRows: paymentResult[0],
      serviceRows: serviceResult[0],
      comboRows: comboResult[0],
      productRows: productResult[0],
      diamondTxnRows: diamondTxnResult[0],
      now,
    }),
  };
}
