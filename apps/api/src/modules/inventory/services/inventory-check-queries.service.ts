import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_CHECKABLE_ITEM_TYPES,
  type InventoryCheckItemsResponse,
  type InventoryCheckPhysicalItemDto,
  type InventoryCheckScanQuery,
  type InventoryCheckScanResponse,
  type InventoryCheckSkuRowDto,
  type InventoryItemState,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory, type InventoryDbConnection } from './inventory-db.js';
import { mapWarehouseRow } from './inventory-query.service.js';

export interface CheckRow extends RowDataPacket {
  id: number;
  client_id: number;
  client_business_id: number;
  inventory_warehouse_id: number;
  item_state: 'New' | 'Using';
  total_quantity: number;
  total_quantity_checked: number;
  total_quantity_using: number;
  total_quantity_lost: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  total_retail_price_using: number;
  total_retail_price_lost: number;
  description: string | null;
  check_state: 'New' | 'Checked' | 'Completed' | 'Cancelled';
  date_updated: string | null;
  date_created: string;
}

interface CheckSkuJoinedRow extends RowDataPacket {
  inventory_warehouse_id: number;
  inventory_warehouse_item_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  min_count: number | null;
  max_count: number | null;
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  item_name: string;
  item_code: string;
  item_type: InventoryCheckSkuRowDto['item']['inventory_item_type'];
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
}

interface CheckSummaryAggRow extends RowDataPacket {
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price: number;
  total_retail_price_checked: number;
}

interface PhysicalItemRow extends RowDataPacket {
  inventory_warehouse_id: number;
  inventory_warehouse_item_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  item_state: InventoryItemState;
  inventory_warehouse_check_item_id: number | null;
  total_quantity_checked: number;
  item_name: string;
  item_code: string;
  item_type: InventoryCheckPhysicalItemDto['item']['inventory_item_type'];
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
}

export const CHECKABLE_TYPES_SQL = INVENTORY_CHECKABLE_ITEM_TYPES.map(() => '?').join(',');

export async function buildCheckPayload(
  conn: InventoryDbConnection,
  ctx: InventoryAuthContext,
  check: CheckRow,
  options?: { tab?: InventoryCheckScanQuery['tab']; keyword?: string }
): Promise<InventoryCheckScanResponse['inventory_check']> {
  const whRows = await queryInventory<RowDataPacket[]>(
    `SELECT * FROM inventory_warehouse WHERE id = ? LIMIT 1`,
    [check.inventory_warehouse_id],
    conn
  );
  const warehouse = mapWarehouseRow(whRows[0] as never);

  const tab = options?.tab || 'Check';
  const itemStates: InventoryItemState[] =
    tab === 'Lost-Temporary' ? ['Lost-Temporary'] : check.item_state === 'New' ? ['New'] : ['Using', 'Lost-Temporary'];

  const kw = String(options?.keyword || '').trim();
  const kwSql = kw
    ? 'AND (ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR iwi.first_inventory_warehouse_order_item_id = ?)'
    : '';
  const kwParams = kw ? [`%${kw}%`, `%${kw}%`, kw] : [];
  const havingSql = tab === 'Missing' ? 'HAVING lim.max_count - COUNT(*) > 0' : '';
  const orderSql =
    tab === 'Missing'
      ? 'ORDER BY (lim.max_count - COUNT(*)) DESC, COUNT(*) ASC'
      : 'ORDER BY is_sufficient ASC, ii.inventory_item_name ASC';

  const skuRows = await queryInventory<CheckSkuJoinedRow[]>(
    `SELECT iwi.inventory_warehouse_id, MIN(iwi.id) AS inventory_warehouse_item_id, iwi.inventory_item_id,
            MIN(iwi.first_inventory_warehouse_order_item_id) AS first_inventory_warehouse_order_item_id,
            MAX(lim.min_count) AS min_count, MAX(lim.max_count) AS max_count,
            COUNT(*) AS total_quantity, COUNT(iwci.id) AS total_quantity_checked,
            COALESCE(SUM(iwi.retail_price), 0) AS total_retail_price,
            COALESCE(SUM(IF(iwci.id IS NOT NULL, iwi.retail_price, 0)), 0) AS total_retail_price_checked,
            ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
            ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
            ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
            iib.inventory_item_brand AS item_brand, IF(COUNT(*) = COUNT(iwci.id), 1, 0) AS is_sufficient
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     LEFT JOIN inventory_warehouse_check_item iwci
       ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ?
      AND iwci.is_available = 1 AND iwci.is_lost = 0
     LEFT JOIN inventory_warehouse_item_limit lim
       ON lim.inventory_item_id = iwi.inventory_item_id AND lim.item_state = iwi.item_state
      AND lim.inventory_warehouse_id = iwi.inventory_warehouse_id
     WHERE iwi.inventory_warehouse_id = ? AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL})
       AND iwi.item_state IN (${itemStates.map(() => '?').join(',')}) ${kwSql}
     GROUP BY iwi.inventory_warehouse_id, iwi.inventory_item_id ${havingSql} ${orderSql}`,
    [check.id, check.inventory_warehouse_id, ...INVENTORY_CHECKABLE_ITEM_TYPES, ...itemStates, ...kwParams],
    conn
  );

  const summaryRows = await queryInventory<CheckSummaryAggRow[]>(
    `SELECT COUNT(*) AS total_quantity, COUNT(iwci.id) AS total_quantity_checked,
            COALESCE(SUM(iwi.retail_price), 0) AS total_retail_price,
            COALESCE(SUM(IF(iwci.id IS NOT NULL, iwi.retail_price, 0)), 0) AS total_retail_price_checked
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     LEFT JOIN inventory_warehouse_check_item iwci
       ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ?
      AND iwci.is_available = 1 AND iwci.is_lost = 0
     WHERE iwi.inventory_warehouse_id = ? AND ii.inventory_item_type IN (${CHECKABLE_TYPES_SQL})
       AND iwi.item_state IN (${itemStates.map(() => '?').join(',')}) ${kwSql}`,
    [check.id, check.inventory_warehouse_id, ...INVENTORY_CHECKABLE_ITEM_TYPES, ...itemStates, ...kwParams],
    conn
  );

  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const sum = summaryRows[0];
  return {
    inventory_warehouse_check_id: Number(check.id),
    inventory_warehouse_id: Number(check.inventory_warehouse_id),
    item_state: check.item_state,
    check_state: check.check_state,
    total_quantity: Number(check.total_quantity || sum?.total_quantity || 0),
    total_quantity_checked: Number(check.total_quantity_checked || sum?.total_quantity_checked || 0),
    total_quantity_using: Number(check.total_quantity_using || 0),
    total_quantity_lost: Number(check.total_quantity_lost || 0),
    description: check.description,
    date_updated: check.date_updated,
    date_created: check.date_created,
    inventory_warehouse: warehouse,
    inventory_item: skuRows.map((r) => {
      const row: InventoryCheckSkuRowDto = {
        inventory_warehouse_id: Number(r.inventory_warehouse_id),
        inventory_warehouse_item_id: Number(r.inventory_warehouse_item_id),
        inventory_item_id: Number(r.inventory_item_id),
        first_inventory_warehouse_order_item_id:
          r.first_inventory_warehouse_order_item_id != null ? Number(r.first_inventory_warehouse_order_item_id) : null,
        min_count: r.min_count != null ? Number(r.min_count) : null,
        max_count: r.max_count != null ? Number(r.max_count) : null,
        total_quantity: Number(r.total_quantity),
        total_quantity_checked: Number(r.total_quantity_checked),
        item: {
          inventory_item_id: Number(r.inventory_item_id),
          inventory_item_name: r.item_name,
          inventory_item_code: r.item_code,
          inventory_item_type: r.item_type,
          inventory_item_unit: r.item_unit,
          inventory_item_attribute: r.item_attribute,
          inventory_item_brand_id: Number(r.item_brand_id),
          inventory_item_brand: r.item_brand || '',
        },
      };
      if (includePrice) {
        row.total_retail_price = Number(r.total_retail_price || 0);
        row.total_retail_price_checked = Number(r.total_retail_price_checked || 0);
      }
      return row;
    }),
    inventory_item_summary: {
      total_quantity: Number(sum?.total_quantity || 0),
      total_quantity_checked: Number(sum?.total_quantity_checked || 0),
      ...(includePrice
        ? {
            total_retail_price: Number(sum?.total_retail_price || 0),
            total_retail_price_checked: Number(sum?.total_retail_price_checked || 0),
          }
        : {}),
    },
  };
}

export async function getCheckPhysicalItems(
  _ctx: InventoryAuthContext,
  params: { checkId: number; inventoryItemId: number; keyword?: string; page?: number; limit?: number }
): Promise<InventoryCheckItemsResponse> {
  const checks = await queryInventory<CheckRow[]>(`SELECT * FROM inventory_warehouse_check WHERE id = ? LIMIT 1`, [
    params.checkId,
  ]);
  const check = checks[0];
  if (!check) throw Object.assign(new Error('Check not found'), { statusCode: 404 });

  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(200, Math.max(1, Number(params.limit || 50)));
  const offset = (page - 1) * limit;
  const kw = String(params.keyword || '').trim();
  const kwSql = kw
    ? 'AND (ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR iwi.first_inventory_warehouse_order_item_id = ?)'
    : '';
  const kwParams = kw ? [`%${kw}%`, `%${kw}%`, kw] : [];
  const whRows = await queryInventory<RowDataPacket[]>(`SELECT * FROM inventory_warehouse WHERE id = ? LIMIT 1`, [
    check.inventory_warehouse_id,
  ]);
  const warehouse = mapWarehouseRow(whRows[0] as never);

  const isOpen = check.check_state === 'New';
  const itemStates: InventoryItemState[] = isOpen
    ? check.item_state === 'New'
      ? ['New']
      : ['Using', 'Lost-Temporary']
    : [check.item_state, 'Lost', 'Lost-Temporary'];
  const joinSql = isOpen
    ? `LEFT JOIN inventory_warehouse_check_item iwci ON iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ?`
    : `INNER JOIN inventory_warehouse_check_item iwci ON iwci.is_checked = 1 AND iwci.inventory_warehouse_item_id = iwi.id AND iwci.inventory_warehouse_check_id = ?`;
  const checkedExpr = isOpen ? 'COUNT(iwci.id)' : 'COUNT(IF(iwci.is_lost = 0, 1, NULL))';

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(DISTINCT iwi.id) AS cnt FROM inventory_warehouse_item iwi
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id ${joinSql}
     WHERE iwi.inventory_warehouse_id = ? AND iwi.inventory_item_id = ? AND iwi.item_state IN (${itemStates.map(() => '?').join(',')}) ${kwSql}`,
    [check.id, check.inventory_warehouse_id, params.inventoryItemId, ...itemStates, ...kwParams]
  );
  const rows = await queryInventory<PhysicalItemRow[]>(
    `SELECT iwi.inventory_warehouse_id, iwi.id AS inventory_warehouse_item_id, iwi.inventory_item_id,
            iwi.first_inventory_warehouse_order_item_id, iwi.item_state, MAX(iwci.id) AS inventory_warehouse_check_item_id,
            ${checkedExpr} AS total_quantity_checked, ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
            ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit, ii.inventory_item_attribute AS item_attribute,
            ii.inventory_item_brand_id AS item_brand_id, iib.inventory_item_brand AS item_brand
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id ${joinSql}
     WHERE iwi.inventory_warehouse_id = ? AND iwi.inventory_item_id = ? AND iwi.item_state IN (${itemStates.map(() => '?').join(',')}) ${kwSql}
     GROUP BY iwi.inventory_warehouse_id, iwi.id ORDER BY ii.inventory_item_name ASC, iwi.id ASC LIMIT ? OFFSET ?`,
    [check.id, check.inventory_warehouse_id, params.inventoryItemId, ...itemStates, ...kwParams, limit, offset]
  );

  return {
    success: true,
    inventory_check: {
      data: rows.map((r) => ({
        inventory_warehouse_id: Number(r.inventory_warehouse_id),
        inventory_warehouse_item_id: Number(r.inventory_warehouse_item_id),
        inventory_item_id: Number(r.inventory_item_id),
        first_inventory_warehouse_order_item_id:
          r.first_inventory_warehouse_order_item_id != null ? Number(r.first_inventory_warehouse_order_item_id) : null,
        item_state: r.item_state,
        inventory_warehouse_check_item_id:
          r.inventory_warehouse_check_item_id != null ? Number(r.inventory_warehouse_check_item_id) : null,
        total_quantity: 1,
        total_quantity_checked: Number(r.total_quantity_checked || 0),
        warehouse,
        item: {
          inventory_item_id: Number(r.inventory_item_id),
          inventory_item_name: r.item_name,
          inventory_item_code: r.item_code,
          inventory_item_type: r.item_type,
          inventory_item_unit: r.item_unit,
          inventory_item_attribute: r.item_attribute,
          inventory_item_brand_id: Number(r.item_brand_id),
          inventory_item_brand: r.item_brand || '',
        },
      })),
      page: { total: Number(countRows[0]?.cnt || 0), page, limit },
    },
  };
}
