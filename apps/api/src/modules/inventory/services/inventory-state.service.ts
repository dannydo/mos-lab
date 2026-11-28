import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_ITEM_STATE_POSITION,
  type InventoryAssignRequest,
  type InventoryAssignResponse,
  type InventoryItemHistoryEntryDto,
  type InventoryItemState,
  type InventoryWarehouseItemDetailDto,
  type InventoryWarehouseType,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import {
  executeInventory,
  queryInventory,
  withInventoryTransaction,
  type InventoryDbConnection,
} from './inventory-db.js';
import { buildItemStateMessage, getWarehouseItemDetail } from './inventory-query.service.js';

interface RawWarehouseItemRow extends RowDataPacket {
  id: number;
  client_business_id: number;
  created_staff_id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  item_state: InventoryItemState;
  date_created: string;
  warehouse_type: InventoryWarehouseType;
  is_used_ignored: number;
}

interface LimitCountRow extends RowDataPacket {
  max_count: number;
  min_count: number;
  current_count: number;
}

interface CountRow extends RowDataPacket {
  cnt: number;
}

interface PrevStateRow extends RowDataPacket {
  date_created: string;
}

interface HistoryOrderRow extends RowDataPacket {
  id: number;
  inventory_warehouse_order_id: number;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  from_warehouse_name: string | null;
  to_warehouse_name: string;
  created_staff_id: number | null;
  staff_name: string | null;
  staff_avatar: string | null;
  date_imported: string;
}

interface HistoryStateRow extends RowDataPacket {
  id: number;
  item_state: InventoryItemState;
  created_staff_id: number;
  staff_name: string | null;
  staff_avatar: string | null;
  date_created: string;
}

interface HistoryAssignRow extends RowDataPacket {
  id: number;
  assign_note: string | null;
  created_staff_id: number;
  created_name: string | null;
  assigned_staff_id: number | null;
  assigned_name: string | null;
  assigned_avatar: string | null;
  date_created: string;
}

interface HistoryCheckRow extends RowDataPacket {
  id: number;
  inventory_warehouse_check_id: number;
  inventory_warehouse_id: number;
  warehouse_name: string;
  is_available: number;
  is_lost: number;
  is_checked: number;
  created_staff_id: number | null;
  staff_name: string | null;
  date_created: string;
}

/**
 * Pure transition validator matching legacy PHP `InventoryWarehouseItem::updateItemState`.
 */
export function validateInventoryStateTransition(
  currentState: InventoryItemState,
  targetState: InventoryItemState
): boolean {
  if (currentState === targetState) return false;
  if (currentState === 'New' && targetState === 'Used') return false;

  if (currentState === 'Testing') {
    return (INVENTORY_ITEM_STATE_POSITION as readonly string[]).includes(targetState);
  }
  if (targetState === 'Testing') {
    return currentState === 'New' || currentState === 'Using';
  }

  if (
    (targetState === 'New' && currentState === 'Using') ||
    (targetState === 'Using' && currentState === 'Lost-Temporary') ||
    (targetState === 'Lost' && currentState === 'Lost-Temporary') ||
    (targetState === 'Used' && currentState === 'Using')
  ) {
    return true;
  }

  const currentPos = (INVENTORY_ITEM_STATE_POSITION as readonly string[]).indexOf(currentState);
  const targetPos = (INVENTORY_ITEM_STATE_POSITION as readonly string[]).indexOf(targetState);
  return currentPos >= 0 && targetPos >= 0 && currentPos <= targetPos;
}

/**
 * Exact port of PHP `InventoryWarehouseItem::isValidMainItemState`.
 */
export function isValidMainItemState(warehouseType: InventoryWarehouseType, targetState: InventoryItemState): boolean {
  if (warehouseType === 'Main') {
    return (
      targetState === 'New' || targetState === 'Lost-Temporary' || targetState === 'Lost' || targetState === 'Broken'
    );
  }
  return true;
}

export async function isPendingOrder(
  conn: InventoryDbConnection,
  warehouseItemId: number,
  excludeOrderId?: number | null
): Promise<boolean> {
  const params: unknown[] = [warehouseItemId];
  let excludeSql = '';
  if (excludeOrderId) {
    excludeSql = 'AND iwo.id != ?';
    params.push(excludeOrderId);
  }
  const rows = await queryInventory<CountRow[]>(
    `SELECT COUNT(*) AS cnt
     FROM inventory_warehouse_order_item iwoi
     INNER JOIN inventory_warehouse_order iwo ON iwo.id = iwoi.inventory_warehouse_order_id
     WHERE iwoi.from_inventory_warehouse_item_id = ?
       AND iwo.order_state NOT IN ('Imported', 'Rejected', 'Cancelled')
       ${excludeSql}`,
    params,
    conn
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

/**
 * Fixed port of PHP `InventoryWarehouseCheckItem::updateAvailable` (fixes missing `= $month` in legacy SQL).
 */
export async function updateAvailableCheckItem(
  conn: InventoryDbConnection,
  warehouseItemId: number,
  date: Date = new Date(),
  isAvailable = 0
): Promise<void> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  await executeInventory(
    `UPDATE inventory_warehouse_check_item
     SET is_available = ?
     WHERE inventory_warehouse_item_id = ?
       AND YEAR(date_created) = ?
       AND MONTH(date_created) = ?`,
    [isAvailable, warehouseItemId, year, month],
    conn
  );
}

export async function updateItemStateInTx(
  conn: InventoryDbConnection,
  ctx: InventoryAuthContext,
  warehouseItemId: number,
  targetState: InventoryItemState,
  options?: { inventoryWarehouseOrderId?: number | null }
): Promise<{ error: string; item: InventoryWarehouseItemDetailDto | null }> {
  const rows = await queryInventory<RawWarehouseItemRow[]>(
    `SELECT iwi.id, iwi.client_business_id, iwi.created_staff_id, iwi.inventory_warehouse_id,
            iwi.inventory_item_id, iwi.item_state, iwi.date_created,
            iw.inventory_warehouse_type AS warehouse_type,
            ii.is_used_ignored
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     WHERE iwi.id = ?
     LIMIT 1
     FOR UPDATE`,
    [warehouseItemId],
    conn
  );
  const raw = rows[0];
  if (!raw) return { error: 'Error', item: null };

  const detailBefore = await getWarehouseItemDetail(warehouseItemId, hasInventoryPermission(ctx, 'view-price'), conn);
  if (!validateInventoryStateTransition(raw.item_state, targetState)) {
    return { error: 'Error', item: detailBefore };
  }

  if (await isPendingOrder(conn, warehouseItemId, options?.inventoryWarehouseOrderId)) {
    return { error: 'Has Pending Order', item: detailBefore };
  }

  if (!isValidMainItemState(raw.warehouse_type, targetState)) {
    return { error: 'Main Item Is Restricted', item: detailBefore };
  }

  const isLostTemporary = raw.item_state === 'Lost-Temporary';
  if (targetState === 'Using' && !isLostTemporary) {
    const limitRows = await queryInventory<LimitCountRow[]>(
      `SELECT l.max_count, l.min_count,
              (SELECT COUNT(*)
               FROM inventory_warehouse_item cur
               WHERE cur.client_business_id = l.client_business_id
                 AND cur.inventory_item_id = l.inventory_item_id
                 AND cur.inventory_warehouse_id = l.inventory_warehouse_id
                 AND cur.item_state = 'Using') AS current_count
       FROM inventory_warehouse_item_limit l
       WHERE l.client_business_id = ?
         AND l.inventory_item_id = ?
         AND l.inventory_warehouse_id = ?
         AND l.item_state = 'Using'
       LIMIT 1`,
      [raw.client_business_id, raw.inventory_item_id, raw.inventory_warehouse_id],
      conn
    );
    const limit = limitRows[0];
    if (limit && Number(limit.max_count) > 0 && Number(limit.current_count) >= Number(limit.max_count)) {
      return {
        error: `Limit Reached: ${Number(limit.current_count)} / ${Number(limit.max_count)}`,
        item: detailBefore,
      };
    }
  }

  await executeInventory(
    `UPDATE inventory_warehouse_item SET item_state = ?, date_updated = NOW() WHERE id = ?`,
    [targetState, warehouseItemId],
    conn
  );

  // Dedupe sequential identical state log matching InventoryWarehouseItemState::saveState
  const lastStateRows = await queryInventory<Array<RowDataPacket & { id: number; item_state: string }>>(
    `SELECT id, item_state FROM inventory_warehouse_item_state
     WHERE inventory_warehouse_item_id = ? ORDER BY id DESC LIMIT 1`,
    [warehouseItemId],
    conn
  );
  if (lastStateRows[0]?.item_state === targetState) {
    await executeInventory(
      `UPDATE inventory_warehouse_item_state SET created_staff_id = ?, date_updated = NOW() WHERE id = ?`,
      [ctx.actorLegacyUserId, lastStateRows[0].id],
      conn
    );
  } else {
    await executeInventory(
      `INSERT INTO inventory_warehouse_item_state (created_staff_id, inventory_warehouse_item_id, item_state, date_created)
       VALUES (?, ?, ?, NOW())`,
      [ctx.actorLegacyUserId, warehouseItemId, targetState],
      conn
    );
  }

  if (targetState === 'New') {
    await executeInventory(
      `UPDATE report_inventory_warehouse_item_state SET item_state = 'New' WHERE inventory_warehouse_item_id = ?`,
      [warehouseItemId],
      conn
    );
    await executeInventory(
      `UPDATE inventory_warehouse_item SET date_updated = NULL WHERE id = ?`,
      [warehouseItemId],
      conn
    );
  } else if (targetState === 'Using') {
    if (Number(raw.is_used_ignored) === 1) {
      await updateItemStateInTx(conn, ctx, warehouseItemId, 'Used', options);
    }
    if (isLostTemporary) {
      const prevRows = await queryInventory<PrevStateRow[]>(
        `SELECT date_created FROM inventory_warehouse_item_state
         WHERE inventory_warehouse_item_id = ? AND item_state = 'Using'
         ORDER BY id ASC LIMIT 1`,
        [warehouseItemId],
        conn
      );
      if (prevRows[0]?.date_created) {
        await executeInventory(
          `UPDATE report_inventory_warehouse_item_state
           SET item_state = 'Using'
           WHERE inventory_warehouse_item_id = ? AND date > ?`,
          [warehouseItemId, prevRows[0].date_created],
          conn
        );
        await executeInventory(
          `UPDATE inventory_warehouse_item SET date_updated = ? WHERE id = ?`,
          [prevRows[0].date_created, warehouseItemId],
          conn
        );
      }
    } else {
      await updateAvailableCheckItem(conn, warehouseItemId, new Date(), 0);
    }
  } else if (targetState === 'Used' || targetState === 'Broken') {
    await updateAvailableCheckItem(conn, warehouseItemId, new Date(), 0);
  }

  const detailAfter = await getWarehouseItemDetail(warehouseItemId, hasInventoryPermission(ctx, 'view-price'), conn);
  return { error: '', item: detailAfter };
}

export async function updateItemStateByScanCode(
  ctx: InventoryAuthContext,
  scanCode: string,
  targetState: InventoryItemState
): Promise<{ error: string; item: InventoryWarehouseItemDetailDto | null }> {
  return withInventoryTransaction(async (conn) => {
    let rows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_item WHERE scan_code = ? ORDER BY id DESC LIMIT 1`,
      [scanCode],
      conn
    );
    if (!rows[0] && hasInventoryPermission(ctx, 'item-state-global') && /^\d+$/.test(scanCode)) {
      rows = await queryInventory<Array<RowDataPacket & { id: number }>>(
        `SELECT id FROM inventory_warehouse_item WHERE id = ? LIMIT 1`,
        [Number(scanCode)],
        conn
      );
    }
    if (!rows[0]) {
      return { error: 'Error', item: null };
    }
    return updateItemStateInTx(conn, ctx, Number(rows[0].id), targetState);
  });
}

export async function assignWarehouseItemToStaff(
  ctx: InventoryAuthContext,
  payload: InventoryAssignRequest
): Promise<InventoryAssignResponse | null> {
  const warehouseItemId = Number(payload.inventory_warehouse_item_id);
  const assignedStaffId = payload.assigned_staff_id ? Number(payload.assigned_staff_id) : null;
  const assignNote = String(payload.assign_note || '').trim();

  const detail = await withInventoryTransaction(async (conn) => {
    const existing = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_item WHERE id = ? LIMIT 1`,
      [warehouseItemId],
      conn
    );
    if (!existing[0]) return null;

    await executeInventory(
      `INSERT INTO inventory_warehouse_item_assign
         (inventory_warehouse_item_id, created_staff_id, assigned_staff_id, assign_note, date_created)
       VALUES (?, ?, ?, ?, NOW())`,
      [warehouseItemId, ctx.actorLegacyUserId, assignedStaffId, assignNote || null],
      conn
    );

    if (assignedStaffId) {
      await executeInventory(
        `UPDATE inventory_warehouse_item
         SET assigned_staff_id = ?, assign_note = ?, date_assigned = DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')
         WHERE id = ?`,
        [assignedStaffId, assignNote || null, warehouseItemId],
        conn
      );
    } else {
      await executeInventory(
        `UPDATE inventory_warehouse_item
         SET assigned_staff_id = NULL, assign_note = NULL, date_assigned = NULL
         WHERE id = ?`,
        [warehouseItemId],
        conn
      );
    }

    return getWarehouseItemDetail(warehouseItemId, hasInventoryPermission(ctx, 'view-price'), conn);
  });

  if (!detail) return null;
  return {
    success: true,
    inventory_item: {
      id: detail.inventory_warehouse_item_id,
      message: buildItemStateMessage(detail),
      item: detail,
    },
  };
}

export async function getWarehouseItemHistory(
  ctx: InventoryAuthContext,
  warehouseItemId: number
): Promise<{ item: InventoryWarehouseItemDetailDto | null; history: InventoryItemHistoryEntryDto[] }> {
  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const item = await getWarehouseItemDetail(warehouseItemId, includePrice);
  if (!item) {
    return { item: null, history: [] };
  }

  const [orderRows, stateRows, assignRows, checkRows] = await Promise.all([
    queryInventory<HistoryOrderRow[]>(
      `SELECT iwoi.id, iwoi.inventory_warehouse_order_id, iwoi.from_inventory_warehouse_id,
              iwoi.to_inventory_warehouse_id, iwoi.date_imported, iwoi.created_staff_id,
              fw.inventory_warehouse_name AS from_warehouse_name,
              tw.inventory_warehouse_name AS to_warehouse_name,
              up.full_name AS staff_name, COALESCE(up.avatar_internal, up.avatar) AS staff_avatar
       FROM inventory_warehouse_order_item iwoi
       LEFT JOIN inventory_warehouse fw ON fw.id = iwoi.from_inventory_warehouse_id
       INNER JOIN inventory_warehouse tw ON tw.id = iwoi.to_inventory_warehouse_id
       LEFT JOIN user_profile up ON up.user_id = iwoi.created_staff_id
       WHERE iwoi.from_inventory_warehouse_item_id = ? OR iwoi.to_inventory_warehouse_item_id = ?
       ORDER BY iwoi.id DESC`,
      [warehouseItemId, warehouseItemId]
    ),
    queryInventory<HistoryStateRow[]>(
      `SELECT s.id, s.item_state, s.created_staff_id, s.date_created,
              up.full_name AS staff_name, COALESCE(up.avatar_internal, up.avatar) AS staff_avatar
       FROM inventory_warehouse_item_state s
       LEFT JOIN user_profile up ON up.user_id = s.created_staff_id
       WHERE s.inventory_warehouse_item_id = ?
       ORDER BY s.id DESC`,
      [warehouseItemId]
    ),
    queryInventory<HistoryAssignRow[]>(
      `SELECT a.id, a.assign_note, a.created_staff_id, a.assigned_staff_id, a.date_created,
              cup.full_name AS created_name,
              aup.full_name AS assigned_name, COALESCE(aup.avatar_internal, aup.avatar) AS assigned_avatar
       FROM inventory_warehouse_item_assign a
       LEFT JOIN user_profile cup ON cup.user_id = a.created_staff_id
       LEFT JOIN user_profile aup ON aup.user_id = a.assigned_staff_id
       WHERE a.inventory_warehouse_item_id = ?
       ORDER BY a.id DESC`,
      [warehouseItemId]
    ),
    queryInventory<HistoryCheckRow[]>(
      `SELECT ci.id, ci.inventory_warehouse_check_id, ci.inventory_warehouse_id,
              w.inventory_warehouse_name AS warehouse_name,
              ci.is_available, ci.is_lost, ci.is_checked, ci.created_staff_id, ci.date_created,
              up.full_name AS staff_name
       FROM inventory_warehouse_check_item ci
       INNER JOIN inventory_warehouse w ON w.id = ci.inventory_warehouse_id
       LEFT JOIN user_profile up ON up.user_id = ci.created_staff_id
       WHERE ci.inventory_warehouse_item_id = ?
       ORDER BY ci.id DESC`,
      [warehouseItemId]
    ),
  ]);

  const entries: Array<{ sortKey: string; entry: InventoryItemHistoryEntryDto }> = [];

  for (const r of orderRows) {
    if (!r.date_imported) continue;
    entries.push({
      sortKey: `${r.date_imported}|order-first|${r.id}`,
      entry: {
        kind: 'order',
        inventory_warehouse_order_item_id: Number(r.id),
        inventory_warehouse_order_id: Number(r.inventory_warehouse_order_id),
        from_warehouse: r.from_inventory_warehouse_id
          ? {
              inventory_warehouse_id: Number(r.from_inventory_warehouse_id),
              inventory_warehouse_name: r.from_warehouse_name || '',
            }
          : null,
        to_warehouse: {
          inventory_warehouse_id: Number(r.to_inventory_warehouse_id),
          inventory_warehouse_name: r.to_warehouse_name,
        },
        created_staff: r.created_staff_id
          ? { user_id: Number(r.created_staff_id), full_name: r.staff_name || '', avatar_url: null }
          : null,
        date_imported: r.date_imported,
      },
    });
  }

  for (const r of stateRows) {
    entries.push({
      sortKey: `${r.date_created}|state|${r.id}`,
      entry: {
        kind: 'state',
        inventory_warehouse_item_state_id: Number(r.id),
        item_state: r.item_state,
        created_staff: { user_id: Number(r.created_staff_id), full_name: r.staff_name || '', avatar_url: null },
        date_created: r.date_created,
      },
    });
  }

  for (const r of assignRows) {
    entries.push({
      sortKey: `${r.date_created}|assign|${r.id}`,
      entry: {
        kind: 'assign',
        inventory_warehouse_item_assign_id: Number(r.id),
        assign_note: r.assign_note,
        assigned_staff:
          r.assigned_staff_id && r.assigned_name
            ? {
                user_id: Number(r.assigned_staff_id),
                full_name: r.assigned_name,
                avatar_url: r.assigned_avatar
                  ? `https://wingslashes.com/upload/user/${r.assigned_staff_id}/${r.assigned_avatar}`
                  : null,
              }
            : null,
        created_staff: { user_id: Number(r.created_staff_id), full_name: r.created_name || '', avatar_url: null },
        date_created: r.date_created,
      },
    });
  }

  for (const r of checkRows) {
    entries.push({
      sortKey: `${r.date_created}|check|${r.id}`,
      entry: {
        kind: 'check',
        inventory_warehouse_check_item_id: Number(r.id),
        inventory_warehouse_check_id: Number(r.inventory_warehouse_check_id),
        is_available: Number(r.is_available),
        is_lost: Number(r.is_lost),
        is_checked: Number(r.is_checked),
        warehouse: {
          inventory_warehouse_id: Number(r.inventory_warehouse_id),
          inventory_warehouse_name: r.warehouse_name,
        },
        created_staff: r.created_staff_id
          ? { user_id: Number(r.created_staff_id), full_name: r.staff_name || '', avatar_url: null }
          : null,
        date_created: r.date_created,
      },
    });
  }

  // Initial synthetic 'New' state matching InventoryWarehouseItem::getHistoryById
  entries.push({
    sortKey: `${item.date_created}|order-state|0`,
    entry: {
      kind: 'state',
      inventory_warehouse_item_state_id: 0,
      item_state: 'New',
      created_staff: item.created_staff ?? null,
      date_created: item.date_created,
    },
  });

  entries.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));

  return {
    item,
    history: entries.map((e) => e.entry),
  };
}
