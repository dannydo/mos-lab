import mysql from 'mysql2/promise';
import { BookingOverrideRecord } from './ios-overrides.service.js';

export interface TargetWalletSlot {
  orderServiceId: number;
  targetBalanceId: number;
  preferredServiceType: 'Normal' | 'Retain';
}

export interface EffectiveLegacyWalletFlags {
  selectedUpperBalanceId: number | null;
  selectedUnderBalanceId: number | null;
  skipUpperCombo: boolean;
  skipUnderCombo: boolean;
  effectiveRedeemUpper: boolean;
  effectiveRedeemUnder: boolean;
}

export function resolveEffectiveLegacyWalletFlags(mergedOverride: BookingOverrideRecord): EffectiveLegacyWalletFlags {
  const skipUpperCombo = Boolean(mergedOverride.skipUpperCombo);
  const skipUnderCombo = Boolean(mergedOverride.skipUnderCombo);
  const rawUpperId = Number(
    mergedOverride.selectedUpperComboBalanceId || mergedOverride.comboRedemption?.balanceId || 0
  );
  const selectedUpperBalanceId = !skipUpperCombo && rawUpperId > 0 ? rawUpperId : null;
  const rawUnderId = Number(mergedOverride.selectedUnderComboBalanceId || 0);
  const selectedUnderBalanceId = !skipUnderCombo && rawUnderId > 0 ? rawUnderId : null;
  const effectiveRedeemUpper =
    !skipUpperCombo &&
    Boolean(mergedOverride.comboRedemption?.redeemSession || selectedUpperBalanceId || mergedOverride.isComboLive);
  const effectiveRedeemUnder = !skipUnderCombo && Boolean(mergedOverride.hasUnderMinkCombo || selectedUnderBalanceId);
  return {
    selectedUpperBalanceId,
    selectedUnderBalanceId,
    skipUpperCombo,
    skipUnderCombo,
    effectiveRedeemUpper,
    effectiveRedeemUnder,
  };
}

export function buildLegacyWalletReconciliationPlan(params: {
  mergedOverride: BookingOverrideRecord;
  walletFlags: EffectiveLegacyWalletFlags;
  effectiveComboRedemption: BookingOverrideRecord['comboRedemption'] | null | undefined;
  activeOrderServiceIds: number[];
}): { targetWalletSlots: TargetWalletSlot[]; skippedOrderServiceIds: number[] } {
  const { mergedOverride, walletFlags, effectiveComboRedemption, activeOrderServiceIds } = params;
  const targetWalletSlots: TargetWalletSlot[] = [];
  const skippedOrderServiceIds: number[] = [];

  const upperUsingOldWallet =
    !walletFlags.skipUpperCombo &&
    walletFlags.selectedUpperBalanceId &&
    (!mergedOverride.selectedCombo ||
      Number(mergedOverride.selectedCombo.price || 0) <= 0 ||
      mergedOverride.selectedCombo.todayUsageMode === 'USE_OLD_COMBO' ||
      Boolean(effectiveComboRedemption?.redeemSession));

  if (upperUsingOldWallet && activeOrderServiceIds[0] && walletFlags.selectedUpperBalanceId) {
    targetWalletSlots.push({
      orderServiceId: activeOrderServiceIds[0],
      targetBalanceId: walletFlags.selectedUpperBalanceId,
      preferredServiceType: String(mergedOverride.serviceType || '').toLowerCase() === 'retain' ? 'Retain' : 'Normal',
    });
  } else if (
    walletFlags.skipUpperCombo &&
    activeOrderServiceIds[0] &&
    mergedOverride.selectedCombo?.todayUsageMode !== 'USE_NEW_COMBO'
  ) {
    skippedOrderServiceIds.push(activeOrderServiceIds[0]);
  }

  const underUsingOldWallet =
    !walletFlags.skipUnderCombo &&
    Boolean(mergedOverride.attributes?.hasUnderMink) &&
    walletFlags.selectedUnderBalanceId &&
    (!mergedOverride.selectedUnderCombo ||
      Number(mergedOverride.selectedUnderCombo.price || 0) <= 0 ||
      mergedOverride.selectedUnderCombo.todayUsageMode === 'USE_OLD_COMBO');

  if (underUsingOldWallet && activeOrderServiceIds[1] && walletFlags.selectedUnderBalanceId) {
    targetWalletSlots.push({
      orderServiceId: activeOrderServiceIds[1],
      targetBalanceId: walletFlags.selectedUnderBalanceId,
      preferredServiceType: mergedOverride.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal',
    });
  } else if (
    walletFlags.skipUnderCombo &&
    Boolean(mergedOverride.attributes?.hasUnderMink) &&
    activeOrderServiceIds[1] &&
    mergedOverride.selectedUnderCombo?.todayUsageMode !== 'USE_NEW_COMBO'
  ) {
    skippedOrderServiceIds.push(activeOrderServiceIds[1]);
  }

  return { targetWalletSlots, skippedOrderServiceIds };
}

export async function findAvailableTxForBalanceId(
  pool: mysql.Pool,
  params: {
    targetBalanceId: number;
    customerUserId: number;
    preferredServiceType: 'Normal' | 'Retain';
  }
): Promise<mysql.RowDataPacket | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, user_service_balance_id, normal_count, retain_count, normal_balance_amount, retain_balance_amount
     FROM user_service_balance_transaction
     WHERE user_service_balance_id = ?
       AND user_id = ?
       AND used_staff_id IS NULL
       AND changed_staff_id IS NULL
       AND cancelled_staff_id IS NULL
       AND (normal_count > 0 OR retain_count > 0)
     ORDER BY
       (CASE WHEN ? = 'Retain' THEN (retain_count > 0) ELSE (normal_count > 0) END) DESC,
       id ASC
     LIMIT 1`,
    [params.targetBalanceId, params.customerUserId, params.preferredServiceType]
  );
  return rows?.[0] || null;
}

export async function pinSelectedWalletTransactionsBeforeReport(
  pool: mysql.Pool,
  params: {
    customerUserId: number;
    slots: TargetWalletSlot[];
  }
): Promise<void> {
  if (!params.slots.length || params.customerUserId <= 0) return;

  for (const slot of params.slots) {
    if (!slot.orderServiceId || !slot.targetBalanceId) continue;
    const [osRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, user_service_balance_transaction_id FROM order_service WHERE id = ? LIMIT 1`,
      [slot.orderServiceId]
    );
    const currentTxId = Number(osRows?.[0]?.user_service_balance_transaction_id || 0);
    if (currentTxId > 0) {
      const [curTxRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id, user_service_balance_id, used_staff_id FROM user_service_balance_transaction WHERE id = ? LIMIT 1`,
        [currentTxId]
      );
      if (
        curTxRows?.[0] &&
        Number(curTxRows[0].user_service_balance_id) === Number(slot.targetBalanceId) &&
        !curTxRows[0].used_staff_id
      ) {
        continue;
      }
    }

    const targetTx = await findAvailableTxForBalanceId(pool, {
      targetBalanceId: slot.targetBalanceId,
      customerUserId: params.customerUserId,
      preferredServiceType: slot.preferredServiceType,
    });
    if (!targetTx) continue;

    const balancePrice =
      Number(targetTx.normal_balance_amount || 0) > 0
        ? Number(targetTx.normal_balance_amount || 0)
        : Number(targetTx.retain_balance_amount || 0);

    await pool.query(
      `UPDATE order_service
       SET user_service_balance_transaction_id = ?,
           balance_price = ?
       WHERE id = ?`,
      [Number(targetTx.id), balancePrice, slot.orderServiceId]
    );
  }
}

export async function reconcileSelectedWalletDeductionInLegacyDb(
  pool: mysql.Pool,
  params: {
    bookingId: number;
    customerUserId: number;
    staffId: number;
    slots: TargetWalletSlot[];
  }
): Promise<void> {
  if (!params.slots.length || params.customerUserId <= 0) return;

  const [usedTxRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, user_service_balance_id, order_service_id, normal_count, retain_count,
            normal_balance_amount, retain_balance_amount, date_expired
     FROM user_service_balance_transaction
     WHERE order_id = ? AND used_staff_id IS NOT NULL`,
    [params.bookingId]
  );

  for (const slot of params.slots) {
    if (!slot.orderServiceId || !slot.targetBalanceId) continue;

    const matchingUsed = (usedTxRows || []).find((tx) => Number(tx.order_service_id) === Number(slot.orderServiceId));
    if (matchingUsed && Number(matchingUsed.user_service_balance_id) === Number(slot.targetBalanceId)) {
      continue;
    }

    if (matchingUsed) {
      const wrongBalanceId = Number(matchingUsed.user_service_balance_id || 0);
      if (wrongBalanceId > 0) {
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
            Math.max(0, Number(matchingUsed.normal_count || 0)),
            Math.max(0, Number(matchingUsed.retain_count || 0)),
            Number(matchingUsed.normal_balance_amount || 0),
            Number(matchingUsed.retain_balance_amount || 0),
            matchingUsed.date_expired ?? null,
            params.staffId,
            wrongBalanceId,
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
        [Number(matchingUsed.id)]
      );
    }

    const targetTx = await findAvailableTxForBalanceId(pool, {
      targetBalanceId: slot.targetBalanceId,
      customerUserId: params.customerUserId,
      preferredServiceType: slot.preferredServiceType,
    });
    if (!targetTx) continue;

    const decNormal = Math.max(0, Number(targetTx.normal_count || 0));
    const decRetain = Math.max(0, Number(targetTx.retain_count || 0));
    const decNormalAmt = Math.max(0, Number(targetTx.normal_balance_amount || 0));
    const decRetainAmt = Math.max(0, Number(targetTx.retain_balance_amount || 0));

    await pool.query(
      `UPDATE user_service_balance
       SET normal_count = GREATEST(0, normal_count - ?),
           retain_count = GREATEST(0, retain_count - ?),
           total_normal_balance_amount = GREATEST(0, COALESCE(total_normal_balance_amount, 0) - ?),
           total_retain_balance_amount = GREATEST(0, COALESCE(total_retain_balance_amount, 0) - ?),
           date_expired = CASE WHEN GREATEST(0, normal_count - ?) = 0 AND GREATEST(0, retain_count - ?) = 0 THEN NULL ELSE date_expired END,
           updated_staff_id = ?,
           date_updated = NOW()
       WHERE id = ?`,
      [decNormal, decRetain, decNormalAmt, decRetainAmt, decNormal, decRetain, params.staffId, slot.targetBalanceId]
    );

    const [balRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT normal_count, retain_count, total_normal_balance_amount, total_retain_balance_amount
       FROM user_service_balance WHERE id = ? LIMIT 1`,
      [slot.targetBalanceId]
    );
    const leftNormal = Number(balRows?.[0]?.normal_count ?? 0);
    const leftRetain = Number(balRows?.[0]?.retain_count ?? 0);
    const leftNormalAmt = Number(balRows?.[0]?.total_normal_balance_amount ?? 0);
    const leftRetainAmt = Number(balRows?.[0]?.total_retain_balance_amount ?? 0);

    await pool.query(
      `UPDATE user_service_balance_transaction
       SET used_staff_id = ?,
           date_used = NOW(),
           order_id = ?,
           order_service_id = ?,
           total_normal_count_left = ?,
           total_retain_count_left = ?,
           total_normal_count_amount_left = ?,
           total_retain_count_amount_left = ?
       WHERE id = ?`,
      [
        params.staffId,
        params.bookingId,
        slot.orderServiceId,
        leftNormal,
        leftRetain,
        leftNormalAmt,
        leftRetainAmt,
        Number(targetTx.id),
      ]
    );

    const balancePrice = decNormalAmt > 0 ? decNormalAmt : decRetainAmt;
    await pool.query(
      `UPDATE order_service SET user_service_balance_transaction_id = ?, balance_price = ? WHERE id = ?`,
      [Number(targetTx.id), balancePrice, slot.orderServiceId]
    );
    try {
      await pool.query(
        `UPDATE report_order_service SET balance_price = ? WHERE order_service_id = ? AND order_id = ?`,
        [balancePrice, slot.orderServiceId, params.bookingId]
      );
    } catch {
      // Optional if report_order_service hasn't been written yet
    }
  }
}

export async function refundSkippedWalletDeductionInLegacyDb(
  pool: mysql.Pool,
  params: {
    bookingId: number;
    staffId: number;
    skippedOrderServiceIds: number[];
  }
): Promise<void> {
  if (!params.skippedOrderServiceIds.length || params.bookingId <= 0) return;
  const skippedSet = new Set(params.skippedOrderServiceIds.map((id) => Number(id)));

  const [usedTxRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, user_service_balance_id, order_service_id, normal_count, retain_count,
            normal_balance_amount, retain_balance_amount, date_expired
     FROM user_service_balance_transaction
     WHERE order_id = ? AND used_staff_id IS NOT NULL`,
    [params.bookingId]
  );

  for (const tx of usedTxRows || []) {
    if (!skippedSet.has(Number(tx.order_service_id || 0))) continue;
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
          params.staffId,
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

  for (const osId of skippedSet) {
    await pool.query(
      `UPDATE order_service
       SET user_service_balance_transaction_id = NULL,
           balance_price = 0
       WHERE id = ?`,
      [osId]
    );
    try {
      await pool.query(
        `UPDATE report_order_service SET balance_price = 0 WHERE order_service_id = ? AND order_id = ?`,
        [osId, params.bookingId]
      );
    } catch {
      // Optional if report_order_service hasn't been written yet
    }
  }
}
