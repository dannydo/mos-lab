import type { RowDataPacket } from 'mysql2/promise';
import type { InventoryItemState } from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory } from './inventory-db.js';

export async function getWarehouseItemStocks(
  warehouseId: number,
  itemIds: number[],
  itemState: InventoryItemState = 'New'
): Promise<Record<number, number>> {
  const cleanIds = itemIds.filter((n) => Number.isInteger(n) && n > 0);
  if (!warehouseId || cleanIds.length === 0) return {};
  const rows = await queryInventory<Array<RowDataPacket & { inventory_item_id: number; cnt: number }>>(
    `SELECT inventory_item_id, COUNT(*) AS cnt
     FROM inventory_warehouse_item
     WHERE inventory_warehouse_id = ? AND inventory_item_id IN (${cleanIds.map(() => '?').join(',')}) AND item_state = ?
     GROUP BY inventory_item_id`,
    [warehouseId, ...cleanIds, itemState]
  );
  const map: Record<number, number> = {};
  for (const r of rows) map[Number(r.inventory_item_id)] = Number(r.cnt || 0);
  return map;
}

export async function lookupScanCodeByFirstOrderItemId(
  ctx: InventoryAuthContext,
  firstOrderItemId: number
): Promise<string | null> {
  if (!hasInventoryPermission(ctx, 'view-scan-code')) {
    const err = new Error('Forbidden: view-scan-code permission required') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
  const rows = await queryInventory<Array<RowDataPacket & { scan_code: string }>>(
    `SELECT scan_code FROM inventory_warehouse_item WHERE first_inventory_warehouse_order_item_id = ? LIMIT 1`,
    [firstOrderItemId]
  );
  return rows[0]?.scan_code || null;
}
