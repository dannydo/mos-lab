import mysql from 'mysql2/promise';
import { isIosSyntheticSimBookingId, SafeAny } from '@mos-lab/shared';
import { getLegacyPool } from './db-pools.js';
import {
  defaultCallLegacyPhpEndpoint,
  DEMO_BOOKING_IDS,
  resolveActiveLegacyStaffToken,
  settleIosOrderWithLegacyPhp,
  SettleLegacyOrderBridgeDeps,
  SettleLegacyOrderResult,
} from './ios-legacy-bridge.service.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';

export interface PostCheckoutBridgeParams {
  bookingId: number;
  previousOverride: BookingOverrideRecord;
  nextOverride: BookingOverrideRecord;
  checkInStaffId: number;
  assignedStaffId: number;
  previousCheckOutStaffId: number;
  newCheckOutStaffId: number;
  settlementActorTier?: string | null;
}

export interface PostCheckoutBridgeDeps extends SettleLegacyOrderBridgeDeps {
  deleteSettlementReceipt?: (bookingId: number) => Promise<void>;
  reconcileComboLedgerAndState?: (
    pool: mysql.Pool,
    params: PostCheckoutBridgeParams & {
      customerUserId: number;
      clientStoreId: number;
      currentOrderState: string;
      bookingDateStart?: string;
    }
  ) => Promise<void>;
}

function parseTrackingOrderId(rawTrackingKey: unknown): number | null {
  if (!rawTrackingKey) return null;
  try {
    const parsed = JSON.parse(String(rawTrackingKey));
    const oid = Number(parsed?.order_id || 0);
    return Number.isFinite(oid) && oid > 0 ? oid : null;
  } catch {
    return null;
  }
}

/**
 * Hoàn tác nguyên tử các tác động của một đơn `Completed` cũ trên Legacy DB trước khi hạch toán lại:
 * 1) Hoàn buổi gói đã trừ (`used_staff_id IS NOT NULL`) & hủy buổi gói mới đã cộng từ `order_service_combo`
 * 2) Hoàn cashback Kim Cương không phải dòng trừ ví (`template_key != 'user-order-use-credit'`)
 * 3) Dọn sổ báo cáo/điểm/thưởng theo đúng thứ tự FK của OrderCleanupService.php
 * 4) Đưa trạng thái đơn về `CheckOut` để sẵn sàng chạy lại pipeline `/order/booking/consultation` -> `/order/payment/update`.
 */
export async function reconcileCompletedOrderInLegacyDb(
  pool: mysql.Pool,
  params: PostCheckoutBridgeParams & {
    customerUserId: number;
    clientStoreId: number;
    currentOrderState: string;
    bookingDateStart?: string;
  }
): Promise<void> {
  const { bookingId, customerUserId, newCheckOutStaffId, currentOrderState, bookingDateStart } = params;
  if (currentOrderState !== 'Completed') {
    return;
  }

  // 1A. Hoàn lại các lượt gói Combo đã trừ cho đơn này (nếu có)
  const [usedTxRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, user_service_balance_id, normal_count, retain_count,
            normal_balance_amount, retain_balance_amount, date_expired
     FROM user_service_balance_transaction
     WHERE order_id = ? AND used_staff_id IS NOT NULL`,
    [bookingId]
  );
  for (const tx of usedTxRows || []) {
    const balanceId = Number(tx.user_service_balance_id || 0);
    if (balanceId > 0) {
      await pool.query(
        `UPDATE user_service_balance
         SET normal_count = normal_count + ?,
             retain_count = retain_count + ?,
             total_normal_balance_amount = COALESCE(total_normal_balance_amount, 0) + COALESCE(?, 0),
             total_retain_balance_amount = COALESCE(total_retain_balance_amount, 0) + COALESCE(?, 0),
             date_expired = COALESCE(date_expired, ?),
             updated_staff_id = ?,
             date_updated = NOW()
         WHERE id = ?`,
        [
          Math.max(0, Number(tx.normal_count || 0)),
          Math.max(0, Number(tx.retain_count || 0)),
          Number(tx.normal_balance_amount || 0),
          Number(tx.retain_balance_amount || 0),
          tx.date_expired ?? null,
          newCheckOutStaffId,
          balanceId,
        ]
      );
    }
    await pool.query(
      `UPDATE user_service_balance_transaction
       SET used_staff_id = NULL,
           date_used = NULL,
           order_id = NULL,
           order_service_id = NULL,
           total_normal_count_left = NULL,
           total_retain_count_left = NULL,
           total_normal_count_amount_left = NULL,
           total_retain_count_amount_left = NULL
       WHERE id = ?`,
      [Number(tx.id)]
    );
  }
  await pool.query(`UPDATE order_service SET user_service_balance_transaction_id = NULL WHERE order_id = ?`, [
    bookingId,
  ]);

  // 1B. Thu hồi các lượt gói Combo đã cộng vào ví từ order_service_combo của đơn này
  const [priorCombos] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT osc.id, osc.service_id, osc.service_price_id,
            sp.normal_count, sp.retain_count, sp.per_normal_price, sp.per_retain_price,
            s.parent_service_id
     FROM order_service_combo osc
     JOIN service_price sp ON sp.id = osc.service_price_id
     LEFT JOIN service s ON s.id = osc.service_id
     WHERE osc.order_id = ?`,
    [bookingId]
  );
  for (const combo of priorCombos || []) {
    const normalCount = Math.max(0, Number(combo.normal_count || 0));
    const retainCount = Math.max(0, Number(combo.retain_count || 0));
    if (normalCount <= 0 && retainCount <= 0) continue;

    const effectiveServiceId = Number(combo.parent_service_id || combo.service_id || 0);
    const servicePriceId = Number(combo.service_price_id || 0);
    if (effectiveServiceId <= 0 || customerUserId <= 0) continue;

    const [balRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id FROM user_service_balance
       WHERE user_id = ? AND service_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [customerUserId, effectiveServiceId]
    );
    const balanceId = Number(balRows?.[0]?.id || 0);
    if (balanceId <= 0) continue;

    if (normalCount > 0 && servicePriceId > 0) {
      await pool.query(
        `UPDATE user_service_balance_transaction
         SET cancelled_staff_id = ?, cancel_note = 'POST_CHECKOUT_RECONCILE', date_cancelled = NOW()
         WHERE user_service_balance_id = ?
           AND service_price_id = ?
           AND normal_count > 0
           AND used_staff_id IS NULL
           AND cancelled_staff_id IS NULL
         ORDER BY id DESC
         LIMIT ?`,
        [newCheckOutStaffId, balanceId, servicePriceId, normalCount]
      );
    }
    if (retainCount > 0 && servicePriceId > 0) {
      await pool.query(
        `UPDATE user_service_balance_transaction
         SET cancelled_staff_id = ?, cancel_note = 'POST_CHECKOUT_RECONCILE', date_cancelled = NOW()
         WHERE user_service_balance_id = ?
           AND service_price_id = ?
           AND retain_count > 0
           AND used_staff_id IS NULL
           AND cancelled_staff_id IS NULL
         ORDER BY id DESC
         LIMIT ?`,
        [newCheckOutStaffId, balanceId, servicePriceId, retainCount]
      );
    }

    const normalAmountDelta = normalCount * Math.max(0, Number(combo.per_normal_price || 0));
    const retainAmountDelta = retainCount * Math.max(0, Number(combo.per_retain_price || 0));
    await pool.query(
      `UPDATE user_service_balance
       SET normal_count = GREATEST(0, normal_count - ?),
           retain_count = GREATEST(0, retain_count - ?),
           total_normal_balance_amount = GREATEST(0, COALESCE(total_normal_balance_amount, 0) - ?),
           total_retain_balance_amount = GREATEST(0, COALESCE(total_retain_balance_amount, 0) - ?),
           updated_staff_id = ?,
           date_updated = NOW()
       WHERE id = ?`,
      [normalCount, retainCount, normalAmountDelta, retainAmountDelta, newCheckOutStaffId, balanceId]
    );
  }

  // 1C. Thu hồi cashback thưởng Kim Cương từ order này (không động vào dòng trừ Kim Cương `user-order-use-credit`)
  if (customerUserId > 0) {
    const [rewardTxRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT ubt.id, ubt.user_balance_id, ubt.amount, ubt.tracking_key
       FROM user_balance_transaction ubt
       LEFT JOIN template t ON t.id = ubt.template_id
       WHERE ubt.user_id = ?
         AND ubt.tracking_key LIKE '%order_id%'
         AND (t.template_key IS NULL OR t.template_key != 'user-order-use-credit')`,
      [customerUserId]
    );
    for (const rtx of rewardTxRows || []) {
      if (parseTrackingOrderId(rtx.tracking_key) !== bookingId) continue;
      const amt = Number(rtx.amount || 0);
      const userBalanceId = Number(rtx.user_balance_id || 0);
      if (userBalanceId > 0 && amt !== 0) {
        await pool.query(
          `UPDATE user_balance SET amount = GREATEST(0, amount - ?), date_updated = NOW() WHERE id = ?`,
          [amt, userBalanceId]
        );
      }
      await pool.query(`DELETE FROM user_balance_transaction WHERE id = ?`, [Number(rtx.id)]);
    }
  }

  // 2. OrderCleanupService sequence: đồng bộ xóa StaffBonusLevelState & các bảng report/ledger theo đúng FK
  const [pointUsers] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT user_id, SUM(bonus_amount) AS pts
     FROM staff_bonus
     WHERE order_id = ? AND bonus_type = 'BonusPoint'
     GROUP BY user_id`,
    [bookingId]
  );
  const [checkInStateRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT date_created FROM order_state WHERE order_id = ? AND order_state = 'CheckIn' ORDER BY id DESC LIMIT 1`,
    [bookingId]
  );
  const checkInDateCreated = checkInStateRows?.[0]?.date_created ?? null;
  for (const pu of pointUsers || []) {
    const uid = Number(pu.user_id || 0);
    if (uid <= 0 || Number(pu.pts || 0) <= 0) continue;
    if (checkInDateCreated) {
      await pool.query(`DELETE FROM staff_bonus_level_state WHERE user_id = ? AND date_created = ?`, [
        uid,
        checkInDateCreated,
      ]);
    }
    if (bookingDateStart) {
      await pool.query(`DELETE FROM staff_bonus_level_state WHERE user_id = ? AND date_created = ?`, [
        uid,
        bookingDateStart,
      ]);
    }
  }

  await pool.query(`DELETE FROM report_order_service WHERE order_id = ?`, [bookingId]);
  await pool.query(`DELETE FROM report_order WHERE order_id = ?`, [bookingId]);
  await pool.query(
    `DELETE arg FROM accountant_revenue_gst arg
     INNER JOIN accountant_revenue ar ON ar.id = arg.accountant_revenue_id
     WHERE ar.order_id = ?`,
    [bookingId]
  );
  await pool.query(`DELETE FROM accountant_revenue WHERE order_id = ?`, [bookingId]);
  await pool.query(`DELETE FROM staff_tip WHERE order_id = ?`, [bookingId]);
  await pool.query(`DELETE FROM staff_bonus WHERE order_id = ?`, [bookingId]);

  // 3. Mở lại trạng thái đơn về CheckOut
  await pool.query(`DELETE FROM order_state WHERE order_id = ? AND order_state = 'Completed'`, [bookingId]);
  await pool.query(`UPDATE \`order\` SET order_state = 'CheckOut' WHERE id = ?`, [bookingId]);
}

async function syncRemovedOrderProducts(
  pool: mysql.Pool,
  params: {
    bookingId: number;
    clientStoreId: number;
    newCheckOutStaffId: number;
    checkInStaffId: number;
    assignedStaffId: number;
    nextOverride: BookingOverrideRecord;
    deps: PostCheckoutBridgeDeps;
  }
): Promise<void> {
  const { bookingId, clientStoreId, newCheckOutStaffId, checkInStaffId, assignedStaffId, nextOverride, deps } = params;
  const nextProductIds = new Set(
    (Array.isArray(nextOverride.cartProducts) ? nextOverride.cartProducts : [])
      .filter((p) => Number(p.quantity || 0) > 0)
      .map((p) => Number(p.productId))
  );

  const [existingProductRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, product_id, inventory_warehouse_item_id FROM order_product WHERE order_id = ?`,
    [bookingId]
  );
  const removedRows = (existingProductRows || []).filter((r) => !nextProductIds.has(Number(r.product_id)));
  if (removedRows.length === 0) return;

  const authToken = await (deps.resolveAuthToken || resolveActiveLegacyStaffToken)(pool, [
    newCheckOutStaffId,
    assignedStaffId,
    checkInStaffId,
  ]);
  const callPhp = deps.callEndpoint || defaultCallLegacyPhpEndpoint;

  for (const row of removedRows) {
    const warehouseItemId = Number(row.inventory_warehouse_item_id || 0);
    if (authToken && warehouseItemId > 0) {
      try {
        await callPhp('/order/product/update', {
          user_id: String(authToken.authUserId),
          login_token: authToken.loginToken,
          modify_staff_id: String(newCheckOutStaffId),
          language_code: 'vi',
          language_id: '2',
          select_language_id: '2',
          client_business_id: '1',
          select_client_business_id: '1',
          select_client_store_id: String(clientStoreId),
          client_store_id: String(clientStoreId),
          device_platform: 'iOS',
          device_os: 'mOS-iOS-Bridge',
          order_id: String(bookingId),
          product_id: String(row.product_id),
          inventory_warehouse_item_id: String(warehouseItemId),
          quantity: '0',
        });
      } catch {
        // Fallback cleanup below
      }
    }
    await pool.query(`DELETE FROM order_product WHERE id = ? AND order_id = ?`, [Number(row.id), bookingId]);
  }
}

export async function reconcileAndSettlePostCheckoutOrderWithLegacyPhp(
  params: PostCheckoutBridgeParams,
  deps: PostCheckoutBridgeDeps
): Promise<SettleLegacyOrderResult> {
  const { bookingId, nextOverride, checkInStaffId, assignedStaffId, newCheckOutStaffId } = params;
  const nowIso = new Date().toISOString();

  if (DEMO_BOOKING_IDS.has(bookingId) || isIosSyntheticSimBookingId(bookingId)) {
    return {
      settlementStatus: 'DEMO_ONLY',
      orderState: 'Completed',
      settledAt: nowIso,
      idempotentHit: false,
    };
  }

  let pool: mysql.Pool;
  try {
    pool = (deps.getPool || getLegacyPool)();
  } catch {
    return {
      settlementStatus: 'BRIDGE_DEFERRED',
      orderState: 'Completed',
      settledAt: nowIso,
      idempotentHit: false,
      warning: 'Legacy database pool is not configured in this environment.',
    };
  }

  try {
    const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, user_id, client_store_id, order_state, booking_date_start
       FROM \`order\`
       WHERE id = ?
       LIMIT 1`,
      [bookingId]
    );
    if (!orderRows || orderRows.length === 0) {
      return {
        settlementStatus: 'DEMO_ONLY',
        orderState: 'Completed',
        settledAt: nowIso,
        idempotentHit: false,
      };
    }

    const orderRow = orderRows[0];
    const customerUserId = Number(orderRow.user_id || 0);
    const clientStoreId = Number(orderRow.client_store_id || 6);
    const currentOrderState = String(orderRow.order_state || '');
    const bookingDateStart = orderRow.booking_date_start ? String(orderRow.booking_date_start) : undefined;

    await (deps.reconcileComboLedgerAndState || reconcileCompletedOrderInLegacyDb)(pool, {
      ...params,
      customerUserId,
      clientStoreId,
      currentOrderState,
      bookingDateStart,
    });

    await pool.query(`UPDATE order_service SET check_out_staff_id = ? WHERE order_id = ?`, [
      newCheckOutStaffId,
      bookingId,
    ]);

    await syncRemovedOrderProducts(pool, {
      bookingId,
      clientStoreId,
      newCheckOutStaffId,
      checkInStaffId,
      assignedStaffId,
      nextOverride,
      deps,
    });

    await deps.deleteSettlementReceipt?.(bookingId);

    const settlement = await settleIosOrderWithLegacyPhp(
      {
        bookingId,
        mergedOverride: nextOverride,
        checkInStaffId,
        assignedStaffId,
        checkOutStaffId: newCheckOutStaffId,
        settlementActorTier: params.settlementActorTier || 'ADMIN',
      },
      {
        ...deps,
        getPool: () => pool,
        loadSettlementReceipt: async () => null,
      }
    );

    if (settlement.settlementStatus === 'SETTLED_COMPLETED') {
      await pool.query(`UPDATE order_service SET check_out_staff_id = ? WHERE order_id = ?`, [
        newCheckOutStaffId,
        bookingId,
      ]);
      await pool.query(
        `UPDATE order_service_combo SET check_in_staff_id = ?, check_out_staff_id = ? WHERE order_id = ?`,
        [checkInStaffId, newCheckOutStaffId, bookingId]
      );
      await pool.query(`UPDATE report_order_service SET check_out_staff_id = ? WHERE order_id = ?`, [
        newCheckOutStaffId,
        bookingId,
      ]);
    }

    return settlement;
  } catch (err: SafeAny) {
    return {
      settlementStatus: 'BRIDGE_DEFERRED',
      orderState: 'CheckOut',
      settledAt: nowIso,
      idempotentHit: false,
      warning: err?.message || 'Post-checkout Legacy reconciliation failed.',
    };
  }
}
