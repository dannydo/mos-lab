import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_CHECKABLE_ITEM_TYPES,
  INVENTORY_CHECK_STATES,
  type InventoryCheckActionResponse,
  type InventoryCheckScanQuery,
  type InventoryCheckScanResponse,
  type InventoryItemState,
} from '@mos-lab/shared';
import { hasWarehousePermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { buildCheckPayload, CHECKABLE_TYPES_SQL, type CheckRow } from './inventory-check-queries.service.js';
import {
  executeInventory,
  queryInventory,
  withInventoryTransaction,
  type InventoryDbConnection,
} from './inventory-db.js';
import { inventorySseBroker } from './inventory-sse.service.js';
import { updateItemStateInTx } from './inventory-state.service.js';

export { getCheckPhysicalItems } from './inventory-check-queries.service.js';

interface CheckSummaryRecomputeRow extends RowDataPacket {
  total_quantity_checked: number;
  total_quantity_new: number;
  total_quantity_using: number;
  total_quantity_lost: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  total_retail_price_using: number;
  total_retail_price_lost: number;
}

export function normalizeCheckItemState(itemState: InventoryItemState | string): 'New' | 'Using' {
  return itemState === 'New' ? 'New' : 'Using';
}

export function shouldAutoCompleteUsingCheck(now: Date, checkItemState: string): boolean {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  return !(daysInMonth - 5 <= dayOfMonth) && checkItemState === 'Using';
}

export function resolveLostStateForMerge(now: Date, checkItemState: string): 'Lost' | 'Lost-Temporary' {
  if (checkItemState === 'New') return 'Lost';
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  return daysInMonth - 5 <= dayOfMonth ? 'Lost' : 'Lost-Temporary';
}

function getCurrentMonthBounds(now = new Date()): { monthStart: string; monthEnd: string } {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = String(new Date(yyyy, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  return { monthStart: `${yyyy}-${mm}-01 00:00:00`, monthEnd: `${yyyy}-${mm}-${lastDay} 23:59:59` };
}

async function getOrCreateCurrentMonthCheck(
  conn: InventoryDbConnection,
  ctx: InventoryAuthContext,
  warehouseId: number,
  normalizedState: 'New' | 'Using',
  withDateRange: boolean
): Promise<CheckRow> {
  const params: unknown[] = [warehouseId, 'New', normalizedState];
  let dateSql = '';
  if (withDateRange) {
    const { monthStart, monthEnd } = getCurrentMonthBounds();
    dateSql = 'AND date_created BETWEEN ? AND ?';
    params.push(monthStart, monthEnd);
  }
  const existing = await queryInventory<CheckRow[]>(
    `SELECT * FROM inventory_warehouse_check
     WHERE inventory_warehouse_id = ? AND check_state = ? AND item_state = ? ${dateSql}
     ORDER BY id DESC LIMIT 1`,
    params,
    conn
  );
  if (existing[0]) return existing[0];

  const whRows = await queryInventory<Array<RowDataPacket & { client_id: number; client_business_id: number }>>(
    `SELECT client_id, client_business_id FROM inventory_warehouse WHERE id = ? LIMIT 1`,
    [warehouseId],
    conn
  );
  const wh = whRows[0];
  if (!wh) throw Object.assign(new Error('Warehouse not found'), { statusCode: 404 });

  const insertRes = await executeInventory(
    `INSERT INTO inventory_warehouse_check
       (client_id, client_business_id, created_staff_id, inventory_warehouse_id, description,
        item_state, check_state, total_quantity, total_quantity_checked, total_quantity_using,
        total_quantity_lost, total_retail_price, total_retail_price_checked,
        total_retail_price_using, total_retail_price_lost, date_created)
     VALUES (?, ?, ?, ?, '', ?, 'New', 0, 0, 0, 0, 0, 0, 0, 0, NOW())`,
    [wh.client_id, wh.client_business_id, ctx.actorLegacyUserId, warehouseId, normalizedState],
    conn
  );
  const created = await queryInventory<CheckRow[]>(
    `SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1`,
    [insertRes.insertId],
    conn
  );
  return created[0];
}

async function recomputeCheckSummary(conn: InventoryDbConnection, checkId: number): Promise<CheckRow> {
  const checks = await queryInventory<CheckRow[]>(
    `SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1`,
    [checkId],
    conn
  );
  const check = checks[0];
  if (!check) throw Object.assign(new Error('Check not found'), { statusCode: 404 });

  if (check.check_state !== 'Completed') {
    const states = check.item_state === 'New' ? ['New'] : ['Using', 'Lost-Temporary'];
    const rows = await queryInventory<CheckSummaryRecomputeRow[]>(
      `SELECT COUNT(iwci.id) AS total_quantity_checked,
              SUM(IF(iwi.item_state = 'New', 1, 0)) AS total_quantity_new,
              SUM(IF(iwi.item_state = 'Using', 1, 0)) AS total_quantity_using,
              SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), 1, 0)) AS total_quantity_lost,
              COALESCE(SUM(iwi.retail_price), 0) AS total_retail_price,
              COALESCE(SUM(IF(iwci.id IS NOT NULL, iwi.retail_price, 0)), 0) AS total_retail_price_checked,
              COALESCE(SUM(IF(iwi.item_state = 'Using', iwi.retail_price, 0)), 0) AS total_retail_price_using,
              COALESCE(SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), iwi.retail_price, 0)), 0) AS total_retail_price_lost
       FROM inventory_warehouse_item iwi
       INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
       LEFT JOIN inventory_warehouse_check_item iwci
         ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ? AND iwci.is_available = 1 AND iwci.is_lost = 0
       WHERE iwi.inventory_warehouse_id = ? AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL})
         AND iwi.item_state IN (${states.map(() => '?').join(',')})`,
      [check.id, check.inventory_warehouse_id, ...INVENTORY_CHECKABLE_ITEM_TYPES, ...states],
      conn
    );
    const agg = rows[0];
    const totalQty = Number(agg?.total_quantity_new || 0) + Number(agg?.total_quantity_using || 0);
    await executeInventory(
      `UPDATE inventory_warehouse_check
       SET total_quantity = ?, total_quantity_checked = ?, total_quantity_using = ?, total_quantity_lost = ?,
           total_retail_price = ?, total_retail_price_checked = ?, total_retail_price_using = ?,
           total_retail_price_lost = ?, date_updated = NOW() WHERE id = ?`,
      [
        totalQty,
        Number(agg?.total_quantity_checked || 0),
        Number(agg?.total_quantity_using || 0),
        Number(agg?.total_quantity_lost || 0),
        Number(agg?.total_retail_price || 0),
        Number(agg?.total_retail_price_checked || 0),
        Number(agg?.total_retail_price_using || 0),
        Number(agg?.total_retail_price_lost || 0),
        check.id,
      ],
      conn
    );
  } else {
    const rows = await queryInventory<Array<CheckSummaryRecomputeRow & { total_quantity: number }>>(
      `SELECT COUNT(*) AS total_quantity,
              SUM(IF(iwi.item_state NOT IN ('Lost', 'Lost-Temporary'), 1, 0)) AS total_quantity_checked,
              SUM(IF(iwi.item_state = 'New', 1, 0)) AS total_quantity_new,
              SUM(IF(iwi.item_state = 'Using', 1, 0)) AS total_quantity_using,
              SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), 1, 0)) AS total_quantity_lost,
              COALESCE(SUM(iwi.retail_price), 0) AS total_retail_price,
              COALESCE(SUM(IF(iwi.item_state NOT IN ('Lost', 'Lost-Temporary'), iwi.retail_price, 0)), 0) AS total_retail_price_checked,
              COALESCE(SUM(IF(iwi.item_state = 'Using', iwi.retail_price, 0)), 0) AS total_retail_price_using,
              COALESCE(SUM(IF(iwi.item_state IN ('Lost', 'Lost-Temporary'), iwi.retail_price, 0)), 0) AS total_retail_price_lost
       FROM inventory_warehouse_item iwi
       INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
       INNER JOIN inventory_warehouse_check_item iwci
         ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ? AND iwci.is_checked = 1
       WHERE iwi.inventory_warehouse_id = ? AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL})`,
      [check.id, check.inventory_warehouse_id, ...INVENTORY_CHECKABLE_ITEM_TYPES],
      conn
    );
    const agg = rows[0];
    await executeInventory(
      `UPDATE inventory_warehouse_check
       SET total_quantity = ?, total_quantity_checked = ?, total_quantity_using = ?, total_quantity_lost = ?,
           total_retail_price = ?, total_retail_price_checked = ?, total_retail_price_using = ?,
           total_retail_price_lost = ?, date_updated = NOW() WHERE id = ?`,
      [
        Number(agg?.total_quantity || 0),
        Number(agg?.total_quantity_checked || 0),
        Number(agg?.total_quantity_using || 0),
        Number(agg?.total_quantity_lost || 0),
        Number(agg?.total_retail_price || 0),
        Number(agg?.total_retail_price_checked || 0),
        Number(agg?.total_retail_price_using || 0),
        Number(agg?.total_retail_price_lost || 0),
        check.id,
      ],
      conn
    );
  }

  const updated = await queryInventory<CheckRow[]>(
    `SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1`,
    [checkId],
    conn
  );
  return updated[0];
}

export async function getCheckScanData(
  ctx: InventoryAuthContext,
  query: InventoryCheckScanQuery
): Promise<InventoryCheckScanResponse> {
  const normalizedState = normalizeCheckItemState(query.itemState);
  const data = await withInventoryTransaction(async (conn) => {
    const check = await getOrCreateCurrentMonthCheck(conn, ctx, query.warehouseId, normalizedState, true);
    const updated = Number(check.total_quantity) === 0 ? await recomputeCheckSummary(conn, check.id) : check;
    return buildCheckPayload(conn, ctx, updated, { tab: query.tab, keyword: query.keyword });
  });
  return { success: true, inventory_check: data };
}

export async function scanInventoryCheckItem(
  ctx: InventoryAuthContext,
  scanCode: string,
  requestedCheckId?: number | null
): Promise<{ isValid: '0' | '1'; checkItemId?: number; message?: string }> {
  const result = await withInventoryTransaction(async (conn) => {
    const itemRows = await queryInventory<
      Array<
        RowDataPacket & {
          id: number;
          inventory_warehouse_id: number;
          inventory_item_id: number;
          item_state: InventoryItemState;
          warehouse_name: string;
        }
      >
    >(
      `SELECT iwi.id, iwi.inventory_warehouse_id, iwi.inventory_item_id, iwi.item_state, iw.inventory_warehouse_name AS warehouse_name
       FROM inventory_warehouse_item iwi INNER JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
       WHERE iwi.scan_code = ? ORDER BY iwi.id DESC LIMIT 1`,
      [scanCode],
      conn
    );
    const item = itemRows[0];
    if (!item || !['New', 'Using', 'Lost-Temporary'].includes(item.item_state)) return { isValid: '0' as const };

    const checkItemState = normalizeCheckItemState(item.item_state);
    const check = requestedCheckId
      ? (
          await queryInventory<CheckRow[]>(
            `SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1`,
            [requestedCheckId],
            conn
          )
        )[0]
      : await getOrCreateCurrentMonthCheck(conn, ctx, Number(item.inventory_warehouse_id), checkItemState, true);
    if (
      !check ||
      Number(check.inventory_warehouse_id) !== Number(item.inventory_warehouse_id) ||
      check.item_state !== checkItemState ||
      check.check_state !== 'New'
    ) {
      return { isValid: '0' as const };
    }

    const permKey = checkItemState === 'New' ? 'inventory-check-new' : 'inventory-check-using';
    if (!(await hasWarehousePermission(ctx, Number(check.inventory_warehouse_id), permKey, conn))) {
      return { isValid: '0' as const };
    }

    const existingRows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_check_item WHERE inventory_warehouse_item_id = ? AND inventory_warehouse_check_id = ? ORDER BY id DESC LIMIT 1`,
      [item.id, check.id],
      conn
    );
    let isUpdated = false;
    let checkItemId: number;
    if (!existingRows[0]) {
      const ins = await executeInventory(
        `INSERT INTO inventory_warehouse_check_item
           (created_staff_id, inventory_warehouse_check_id, inventory_warehouse_id, inventory_warehouse_item_id, inventory_item_id, is_available, is_lost, is_checked, date_created)
         VALUES (?, ?, ?, ?, ?, 1, 0, 0, NOW())`,
        [ctx.actorLegacyUserId, check.id, check.inventory_warehouse_id, item.id, item.inventory_item_id],
        conn
      );
      checkItemId = ins.insertId;
      isUpdated = true;
    } else {
      checkItemId = Number(existingRows[0].id);
      await executeInventory(
        `UPDATE inventory_warehouse_check_item SET is_available = 1, is_lost = 0, date_updated = NOW() WHERE id = ?`,
        [checkItemId],
        conn
      );
    }

    if (item.item_state === 'Lost-Temporary') {
      const prevRows = await queryInventory<Array<RowDataPacket & { item_state: InventoryItemState }>>(
        `SELECT item_state FROM inventory_warehouse_item_state WHERE inventory_warehouse_item_id = ? ORDER BY id DESC LIMIT 2`,
        [item.id],
        conn
      );
      await updateItemStateInTx(conn, ctx, Number(item.id), prevRows[1]?.item_state || 'Using');
    }

    const updatedCheck = await recomputeCheckSummary(conn, check.id);
    const skuSum = await queryInventory<Array<RowDataPacket & { count: number; total: number }>>(
      `SELECT COUNT(iwci.id) AS count, COUNT(*) AS total
       FROM inventory_warehouse_item iwi INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
       LEFT JOIN inventory_warehouse_check_item iwci
         ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ? AND iwci.is_available = 1 AND iwci.is_lost = 0
       WHERE iwi.inventory_warehouse_id = ? AND iwi.item_state = ? AND iwi.inventory_item_id = ?
         AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL})`,
      [
        check.id,
        check.inventory_warehouse_id,
        check.item_state,
        item.inventory_item_id,
        ...INVENTORY_CHECKABLE_ITEM_TYPES,
      ],
      conn
    );

    return {
      isValid: isUpdated ? ('1' as const) : ('0' as const),
      checkItemId,
      warehouseId: Number(check.inventory_warehouse_id),
      checkId: Number(check.id),
      message: [
        `${isUpdated ? 'Checked' : 'Already Checked'} - ${item.item_state} - ${item.warehouse_name}`,
        `${Number(skuSum[0]?.count || 0)} / ${Number(skuSum[0]?.total || 0)}`,
        `${updatedCheck.total_quantity_checked} / ${updatedCheck.total_quantity}`,
      ].join('\n'),
    };
  });

  if (result.checkItemId) {
    inventorySseBroker.publish('check-update', {
      checkId: result.checkId,
      warehouseId: result.warehouseId,
      checkItemId: result.checkItemId,
    });
  }
  return result;
}

async function addMissingCheckItems(
  conn: InventoryDbConnection,
  ctx: InventoryAuthContext,
  check: CheckRow
): Promise<void> {
  const itemStates = check.item_state === 'Using' ? ['Using', 'Lost-Temporary'] : ['New'];
  await executeInventory(
    `UPDATE inventory_warehouse_check_item SET is_checked = 1 WHERE inventory_warehouse_check_id = ? AND is_available = 1`,
    [check.id],
    conn
  );
  await executeInventory(
    `INSERT INTO inventory_warehouse_check_item
       (created_staff_id, inventory_warehouse_check_id, inventory_warehouse_id, inventory_warehouse_item_id, inventory_item_id, is_available, is_lost, is_checked, date_created)
     SELECT ?, ?, iwi.inventory_warehouse_id, iwi.id, iwi.inventory_item_id, 1, 1, 1, NOW()
     FROM inventory_warehouse_item iwi
     LEFT JOIN inventory_warehouse_check_item iwci ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ?
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     WHERE iwi.inventory_warehouse_id = ? AND iwi.item_state IN (${itemStates.map(() => '?').join(',')})
       AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL}) AND iwci.id IS NULL`,
    [
      ctx.actorLegacyUserId,
      check.id,
      check.id,
      check.inventory_warehouse_id,
      ...itemStates,
      ...INVENTORY_CHECKABLE_ITEM_TYPES,
    ],
    conn
  );
}

export async function transitionCheckStateInTx(
  conn: InventoryDbConnection,
  ctx: InventoryAuthContext,
  checkId: number,
  targetState: 'Checked' | 'Completed' | 'Cancelled'
): Promise<CheckRow> {
  const current = (
    await queryInventory<CheckRow[]>(
      `SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1 FOR UPDATE`,
      [checkId],
      conn
    )
  )[0];
  if (!current) throw Object.assign(new Error('Check not found'), { statusCode: 404 });

  if (
    current.check_state !== targetState &&
    INVENTORY_CHECK_STATES.indexOf(current.check_state) <= INVENTORY_CHECK_STATES.indexOf(targetState)
  ) {
    const colPrefix = targetState === 'Checked' ? 'checked' : targetState === 'Completed' ? 'completed' : 'cancelled';
    await executeInventory(
      `UPDATE inventory_warehouse_check SET check_state = ?, ${colPrefix}_staff_id = ?, date_${colPrefix} = NOW() WHERE id = ?`,
      [targetState, ctx.actorLegacyUserId, checkId],
      conn
    );
    if (targetState === 'Checked') {
      await addMissingCheckItems(conn, ctx, current);
      const after = await recomputeCheckSummary(conn, checkId);
      return shouldAutoCompleteUsingCheck(new Date(), after.item_state)
        ? transitionCheckStateInTx(conn, ctx, checkId, 'Completed')
        : after;
    }
    if (targetState === 'Completed') {
      const missingRows = await queryInventory<Array<RowDataPacket & { inventory_warehouse_item_id: number }>>(
        `SELECT inventory_warehouse_item_id FROM inventory_warehouse_check_item WHERE inventory_warehouse_check_id = ? AND is_checked = 1 AND is_lost = 1 AND is_available = 1`,
        [checkId],
        conn
      );
      const lostTarget = resolveLostStateForMerge(new Date(), current.item_state);
      for (const m of missingRows)
        await updateItemStateInTx(conn, ctx, Number(m.inventory_warehouse_item_id), lostTarget);
      return recomputeCheckSummary(conn, checkId);
    }
    if (targetState === 'Cancelled') {
      await addMissingCheckItems(conn, ctx, current);
      return recomputeCheckSummary(conn, checkId);
    }
  }
  return current;
}

export async function finishInventoryCheck(
  ctx: InventoryAuthContext,
  params: { checkId?: number; warehouseId?: number; itemState?: 'New' | 'Using' }
): Promise<InventoryCheckActionResponse> {
  return withInventoryTransaction(async (conn) => {
    let checkId = params.checkId ? Number(params.checkId) : null;
    if (!checkId && params.warehouseId) {
      checkId = (
        await getOrCreateCurrentMonthCheck(
          conn,
          ctx,
          Number(params.warehouseId),
          normalizeCheckItemState(params.itemState || 'New'),
          true
        )
      ).id;
    }
    if (!checkId) throw Object.assign(new Error('Missing inventory_warehouse_check_id'), { statusCode: 400 });

    const finished = await transitionCheckStateInTx(conn, ctx, checkId, 'Checked');
    return {
      success: true,
      message: `Finish - ${String(finished.date_created).slice(0, 7)}\n${finished.total_quantity_checked} / ${finished.total_quantity}`,
      inventory_check: await buildCheckPayload(conn, ctx, finished),
    };
  });
}

export async function resetInventoryCheck(
  ctx: InventoryAuthContext,
  params: { checkId?: number; warehouseId?: number; itemState?: 'New' | 'Using' }
): Promise<InventoryCheckActionResponse> {
  return withInventoryTransaction(async (conn) => {
    let checkId = params.checkId ? Number(params.checkId) : null;
    if (!checkId && params.warehouseId) {
      checkId = (
        await getOrCreateCurrentMonthCheck(
          conn,
          ctx,
          Number(params.warehouseId),
          normalizeCheckItemState(params.itemState || 'New'),
          false
        )
      ).id;
    }
    if (!checkId) throw Object.assign(new Error('Missing inventory_warehouse_check_id'), { statusCode: 400 });

    const cancelled = await transitionCheckStateInTx(conn, ctx, checkId, 'Cancelled');
    const freshCheck = await getOrCreateCurrentMonthCheck(
      conn,
      ctx,
      cancelled.inventory_warehouse_id,
      cancelled.item_state,
      true
    );
    const recomputed = await recomputeCheckSummary(conn, freshCheck.id);
    return {
      success: true,
      message: `Reset - ${String(cancelled.date_created).slice(0, 7)}\n${cancelled.total_quantity_checked} / ${cancelled.total_quantity}`,
      inventory_check: await buildCheckPayload(conn, ctx, recomputed),
    };
  });
}
