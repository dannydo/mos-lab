import type { RowDataPacket } from 'mysql2/promise';
import type {
  InventoryCheckRecordDto,
  InventoryCheckState,
  InventoryChecksListResponse,
  InventoryItemLimitRowDto,
  InventoryItemLimitsResponse,
  InventoryItemLimitUpdateRequest,
  InventoryItemType,
  InventoryScanLogsResponse,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { transitionCheckStateInTx } from './inventory-check.service.js';
import { executeInventory, queryInventory, withInventoryTransaction } from './inventory-db.js';
import { mapWarehouseRow } from './inventory-query.service.js';

interface LimitJoinedRow extends RowDataPacket {
  inventory_warehouse_item_limit_id: number | null;
  inventory_warehouse_id: number | null;
  inventory_item_id: number;
  limit_item_state: 'New' | 'Using' | null;
  min_count: number | null;
  max_count: number | null;
  last_max_count: number | null;
  limit_count_standard: number | null;
  item_name: string;
  item_code: string;
  item_type: InventoryItemType;
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
}

interface CheckListRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  item_state: 'New' | 'Using';
  check_state: InventoryCheckState;
  total_quantity: number;
  total_quantity_checked: number;
  total_quantity_using: number;
  total_quantity_lost: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  description: string | null;
  date_created: string;
  date_checked: string | null;
  date_completed: string | null;
  date_cancelled: string | null;
  created_staff_id: number | null;
  checked_staff_id: number | null;
  completed_staff_id: number | null;
  cancelled_staff_id: number | null;
  created_name: string | null;
  checked_name: string | null;
  completed_name: string | null;
  cancelled_name: string | null;
}

interface ScanLogJoinedRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  client_store_id: number | null;
  method: string;
  type: string;
  item_id: number | null;
  scan_code: string;
  filename: string | null;
  is_valid: number;
  date_created: string;
  full_name: string | null;
  store_name: string | null;
}

export async function listWarehouseItemLimits(
  ctx: InventoryAuthContext,
  params: {
    warehouseId?: number;
    itemState?: 'New' | 'Using';
    inventoryItemType?: InventoryItemType;
    keyword?: string;
    page?: number;
    limit?: number;
  }
): Promise<InventoryItemLimitsResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;
  const itemState = params.itemState === 'Using' ? 'Using' : 'New';

  const joinConds = ['ii.id = lim.inventory_item_id', 'lim.item_state = ?'];
  const joinArgs: unknown[] = [itemState];
  if (params.warehouseId) {
    joinConds.push('lim.inventory_warehouse_id = ?');
    joinArgs.push(params.warehouseId);
  } else if (!hasInventoryPermission(ctx, 'edit-order-global')) {
    joinConds.push('lim.inventory_warehouse_id = -1');
  }

  const whereConds = ['ii.is_disabled = 0'];
  const whereArgs: unknown[] = [];
  if (params.inventoryItemType) {
    whereConds.push('ii.inventory_item_type = ?');
    whereArgs.push(params.inventoryItemType);
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    whereConds.push(
      '(ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR ii.inventory_item_code LIKE ?)'
    );
    whereArgs.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt FROM inventory_item ii WHERE ${whereConds.join(' AND ')}`,
    whereArgs
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<LimitJoinedRow[]>(
          `SELECT lim.id AS inventory_warehouse_item_limit_id,
                  lim.inventory_warehouse_id,
                  ii.id AS inventory_item_id,
                  lim.item_state AS limit_item_state,
                  lim.min_count, lim.max_count, lim.last_max_count, lim.limit_count_standard,
                  ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
                  ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
                  ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
                  iib.inventory_item_brand AS item_brand
           FROM inventory_item ii
           LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
           LEFT JOIN inventory_warehouse_item_limit lim ON ${joinConds.join(' AND ')}
           WHERE ${whereConds.join(' AND ')}
           ORDER BY lim.id IS NULL ASC, ii.inventory_item_name ASC, ii.inventory_item_attribute ASC
           LIMIT ? OFFSET ?`,
          [...joinArgs, ...whereArgs, limit, offset]
        );

  let warehouseDto = null;
  if (params.warehouseId) {
    const whRows = await queryInventory<RowDataPacket[]>(`SELECT * FROM inventory_warehouse WHERE id = ? LIMIT 1`, [
      params.warehouseId,
    ]);
    warehouseDto = whRows[0] ? mapWarehouseRow(whRows[0] as never) : null;
  }

  const data: InventoryItemLimitRowDto[] = rows.map((r) => ({
    inventory_warehouse_item_limit_id:
      r.inventory_warehouse_item_limit_id != null ? Number(r.inventory_warehouse_item_limit_id) : null,
    inventory_warehouse_id:
      r.inventory_warehouse_id != null ? Number(r.inventory_warehouse_id) : (params.warehouseId ?? null),
    inventory_item_id: Number(r.inventory_item_id),
    item_state: (r.limit_item_state || itemState) as 'New' | 'Using',
    min_count: r.min_count != null ? Number(r.min_count) : null,
    max_count: r.max_count != null ? Number(r.max_count) : null,
    last_max_count: r.last_max_count != null ? Number(r.last_max_count) : null,
    limit_count_standard: r.limit_count_standard != null ? Number(r.limit_count_standard) : null,
    warehouse: warehouseDto,
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
  }));

  return { success: true, data, page: { total, page, limit } };
}

export async function upsertOrDeleteWarehouseItemLimit(
  ctx: InventoryAuthContext,
  payload: InventoryItemLimitUpdateRequest
): Promise<{ success: boolean; inventory_warehouse_item_limit_id: number | null }> {
  if (!hasInventoryPermission(ctx, 'edit-order-global') && !hasInventoryPermission(ctx, 'edit-item')) {
    throw Object.assign(new Error('Không có quyền cập nhật định mức kho'), { statusCode: 403 });
  }

  return withInventoryTransaction(async (conn) => {
    if (payload.is_disabled && payload.inventory_warehouse_item_limit_id) {
      await executeInventory(
        `DELETE FROM inventory_warehouse_item_limit WHERE id = ?`,
        [Number(payload.inventory_warehouse_item_limit_id)],
        conn
      );
      return { success: true, inventory_warehouse_item_limit_id: null };
    }

    const existing = payload.inventory_warehouse_item_limit_id
      ? await queryInventory<Array<RowDataPacket & { id: number; max_count: number }>>(
          `SELECT id, max_count FROM inventory_warehouse_item_limit WHERE id = ? LIMIT 1`,
          [Number(payload.inventory_warehouse_item_limit_id)],
          conn
        )
      : await queryInventory<Array<RowDataPacket & { id: number; max_count: number }>>(
          `SELECT id, max_count FROM inventory_warehouse_item_limit
           WHERE inventory_warehouse_id = ? AND inventory_item_id = ? AND item_state = ? LIMIT 1`,
          [payload.inventory_warehouse_id, payload.inventory_item_id, payload.item_state],
          conn
        );

    const minCount = Math.max(0, Math.trunc(Number(payload.min_count || 0)));
    const maxCount = Math.max(0, Math.trunc(Number(payload.max_count || 0)));
    const stdCount = Math.max(0, Math.trunc(Number(payload.limit_count_standard || 0)));

    if (existing[0]) {
      await executeInventory(
        `UPDATE inventory_warehouse_item_limit
         SET min_count = ?, max_count = ?, limit_count_standard = ?, last_max_count = ?, date_updated = NOW()
         WHERE id = ?`,
        [minCount, maxCount, stdCount, Number(existing[0].max_count || 0), existing[0].id],
        conn
      );
      return { success: true, inventory_warehouse_item_limit_id: Number(existing[0].id) };
    }

    const ins = await executeInventory(
      `INSERT INTO inventory_warehouse_item_limit
         (client_id, client_business_id, inventory_warehouse_id, inventory_item_id, item_state,
          min_count, max_count, last_max_count, limit_count_standard, date_created)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        ctx.clientId,
        ctx.clientBusinessId,
        payload.inventory_warehouse_id,
        payload.inventory_item_id,
        payload.item_state,
        minCount,
        maxCount,
        stdCount,
      ],
      conn
    );
    return { success: true, inventory_warehouse_item_limit_id: Number(ins.insertId) };
  });
}

export async function listWarehouseChecks(
  ctx: InventoryAuthContext,
  params: {
    warehouseId?: number;
    itemState?: 'New' | 'Using';
    checkState?: InventoryCheckState;
    page?: number;
    limit?: number;
  }
): Promise<InventoryChecksListResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  const conds = ['c.client_business_id = ?'];
  const args: unknown[] = [ctx.clientBusinessId];
  if (params.warehouseId) {
    conds.push('c.inventory_warehouse_id = ?');
    args.push(params.warehouseId);
  }
  if (params.itemState) {
    conds.push('c.item_state = ?');
    args.push(params.itemState);
  }
  if (params.checkState) {
    conds.push('c.check_state = ?');
    args.push(params.checkState);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt FROM inventory_warehouse_check c WHERE ${conds.join(' AND ')}`,
    args
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<CheckListRow[]>(
          `SELECT c.*,
                  cr.full_name AS created_name,
                  ch.full_name AS checked_name,
                  cp.full_name AS completed_name,
                  ca.full_name AS cancelled_name
           FROM inventory_warehouse_check c
           LEFT JOIN user_profile cr ON cr.user_id = c.created_staff_id
           LEFT JOIN user_profile ch ON ch.user_id = c.checked_staff_id
           LEFT JOIN user_profile cp ON cp.user_id = c.completed_staff_id
           LEFT JOIN user_profile ca ON ca.user_id = c.cancelled_staff_id
           WHERE ${conds.join(' AND ')}
           ORDER BY c.id DESC
           LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );

  const whIds = [...new Set(rows.map((r) => Number(r.inventory_warehouse_id)))];
  const whMap = new Map<number, ReturnType<typeof mapWarehouseRow>>();
  if (whIds.length > 0) {
    const whRows = await queryInventory<RowDataPacket[]>(
      `SELECT * FROM inventory_warehouse WHERE id IN (${whIds.map(() => '?').join(',')})`,
      whIds
    );
    for (const w of whRows) whMap.set(Number(w.id), mapWarehouseRow(w as never));
  }

  const data: InventoryCheckRecordDto[] = rows.map((r) => {
    const item: InventoryCheckRecordDto = {
      inventory_warehouse_check_id: Number(r.id),
      inventory_warehouse_id: Number(r.inventory_warehouse_id),
      item_state: r.item_state,
      check_state: r.check_state,
      total_quantity: Number(r.total_quantity || 0),
      total_quantity_checked: Number(r.total_quantity_checked || 0),
      total_quantity_using: Number(r.total_quantity_using || 0),
      total_quantity_lost: Number(r.total_quantity_lost || 0),
      description: r.description,
      date_created: r.date_created,
      date_checked: r.date_checked,
      date_completed: r.date_completed,
      date_cancelled: r.date_cancelled,
      warehouse: whMap.get(Number(r.inventory_warehouse_id))!,
      created_staff: r.created_staff_id
        ? { user_id: Number(r.created_staff_id), full_name: r.created_name || '', avatar_url: null }
        : null,
      checked_staff: r.checked_staff_id
        ? { user_id: Number(r.checked_staff_id), full_name: r.checked_name || '', avatar_url: null }
        : null,
      completed_staff: r.completed_staff_id
        ? { user_id: Number(r.completed_staff_id), full_name: r.completed_name || '', avatar_url: null }
        : null,
      cancelled_staff: r.cancelled_staff_id
        ? { user_id: Number(r.cancelled_staff_id), full_name: r.cancelled_name || '', avatar_url: null }
        : null,
    };
    if (includePrice) {
      item.total_retail_price = Math.round(Number(r.total_retail_price || 0));
      item.total_retail_price_checked = Math.round(Number(r.total_retail_price_checked || 0));
    }
    return item;
  });

  return { success: true, data, page: { total, page, limit } };
}

export async function approveOrCancelWarehouseCheck(
  ctx: InventoryAuthContext,
  checkId: number,
  action: 'Completed' | 'Cancelled'
): Promise<{ success: boolean; check_state: InventoryCheckState }> {
  if (!hasInventoryPermission(ctx, 'warehouse-check-approve')) {
    throw Object.assign(new Error('Không có quyền duyệt/hủy phiếu kiểm kho'), { statusCode: 403 });
  }
  const updated = await withInventoryTransaction((conn) => transitionCheckStateInTx(conn, ctx, checkId, action));
  return { success: true, check_state: updated.check_state };
}

export async function listScanLogs(
  ctx: InventoryAuthContext,
  params: {
    dateFrom?: string;
    dateTo?: string;
    method?: string;
    clientStoreId?: number;
    isValid?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }
): Promise<InventoryScanLogsResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  const conds = ['sc.client_business_id = ?'];
  const args: unknown[] = [ctx.clientBusinessId];
  if (params.dateFrom && params.dateTo) {
    conds.push('sc.date_created BETWEEN ? AND ?');
    args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
  }
  if (params.method) {
    conds.push('sc.method = ?');
    args.push(params.method);
  }
  if (params.clientStoreId) {
    conds.push('sc.client_store_id = ?');
    args.push(params.clientStoreId);
  }
  if (params.isValid === '1' || params.isValid === '0') {
    conds.push('sc.is_valid = ?');
    args.push(Number(params.isValid));
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push('(sc.scan_code LIKE ? OR up.full_name LIKE ?)');
    args.push(`%${kw}%`, `%${kw}%`);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt
     FROM user_scan_code sc
     LEFT JOIN user_profile up ON up.user_id = sc.user_id
     WHERE ${conds.join(' AND ')}`,
    args
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<ScanLogJoinedRow[]>(
          `SELECT sc.id, sc.user_id, sc.client_store_id, sc.method, sc.type, sc.item_id,
                  sc.scan_code, sc.filename, sc.is_valid, sc.date_created,
                  up.full_name, csl.client_store_name AS store_name
           FROM user_scan_code sc
           LEFT JOIN user_profile up ON up.user_id = sc.user_id
           LEFT JOIN client_store_language csl ON csl.client_store_id = sc.client_store_id AND csl.language_id = 1
           WHERE ${conds.join(' AND ')}
           ORDER BY sc.id DESC
           LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );

  return {
    success: true,
    data: rows.map((r) => ({
      user_scan_code_id: Number(r.id),
      method: r.method,
      type: r.type,
      item_id: r.item_id != null ? Number(r.item_id) : null,
      scan_code: r.scan_code,
      is_valid: Boolean(r.is_valid),
      date_created: r.date_created,
      has_image: Boolean(r.filename),
      image_url: r.filename ? `/api/inventory/media/scan/${r.id}` : null,
      user: r.user_id ? { user_id: Number(r.user_id), full_name: r.full_name || `#${r.user_id}` } : null,
      client_store: r.client_store_id
        ? { client_store_id: Number(r.client_store_id), store_name: r.store_name || `Store #${r.client_store_id}` }
        : null,
    })),
    page: { total, page, limit },
  };
}
