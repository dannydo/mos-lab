import type { RowDataPacket } from 'mysql2/promise';
import {
  type InventoryCompanyInfoDto,
  type InventoryItemState,
  type InventoryOrderActionFlagsDto,
  type InventoryOrderDetailResponse,
  type InventoryOrderDto,
  type InventoryOrderItemDto,
  type InventoryOrderItemsListResponse,
  type InventoryOrderState,
  type InventoryOrdersListResponse,
  type InventoryStaffBriefDto,
  type InventoryWarehouseDto,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory, type InventoryDbConnection } from './inventory-db.js';
import { mapWarehouseRow } from './inventory-query.service.js';

interface LabelRow extends RowDataPacket {
  label_key: string;
  label_value: string;
}

interface OrderRow extends RowDataPacket {
  id: number;
  parent_inventory_warehouse_order_id: number | null;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  total_quantity: number;
  total_quantity_exported: number;
  total_quantity_imported: number;
  total_retail_price: number;
  total_retail_price_exported: number;
  total_retail_price_imported: number;
  total_retail_price_estimated: number;
  description: string;
  reject_reason: string | null;
  order_state: InventoryOrderState;
  is_internal: number;
  created_staff_id: number | null;
  approved_staff_id: number | null;
  assigned_staff_id: number | null;
  imported_staff_id: number | null;
  date_approved: string | null;
  date_assigned: string | null;
  date_imported: string | null;
  date_updated: string | null;
  date_created: string;
}

interface RawOrderItemRow extends RowDataPacket {
  id: number;
  inventory_warehouse_order_id: number;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  inventory_item_id: number;
  from_inventory_warehouse_item_id: number | null;
  to_inventory_warehouse_item_id: number | null;
  scan_code: string | null;
  currency_id: number;
  retail_price: number;
  retail_price_estimated: number;
  description: string | null;
  created_staff_id: number | null;
  date_assigned: string | null;
  date_checked: string | null;
  date_imported: string | null;
  date_created: string;
  total_quantity?: number;
  total_quantity_checked?: number;
  total_quantity_exported?: number;
  total_quantity_imported?: number;
  total_retail_price?: number;
  total_retail_price_exported?: number;
  total_retail_price_imported?: number;
  total_retail_price_estimated?: number;
  item_name: string;
  item_code: string;
  item_type: InventoryOrderItemDto['item']['inventory_item_type'];
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
  brand_is_temporary: number | null;
  first_order_item_id: number | null;
  created_staff_name: string | null;
}

export async function getInventoryCompanyInfo(conn?: InventoryDbConnection): Promise<InventoryCompanyInfoDto> {
  const rows = await queryInventory<LabelRow[]>(
    `SELECT sl.label_key, sll.label_value
     FROM system_label sl
     INNER JOIN system_label_language sll ON sll.system_label_id = sl.id
     WHERE sl.label_key IN ('Company-Name', 'Company-Address', 'Company-Tax-Number')
       AND sll.language_id = 1`,
    [],
    conn
  );
  const map = new Map(rows.map((r) => [r.label_key, r.label_value]));
  return {
    company_name: map.get('Company-Name') || 'WINGS WELLNESS CORPORATION COMPANY',
    company_address: map.get('Company-Address') || '159 De Tham, Co Giang Ward, District 1, HCMC',
    company_tax_number: map.get('Company-Tax-Number') || '0315706857',
  };
}

function buildOrderActionFlags(
  ctx: InventoryAuthContext,
  order: Pick<OrderRow, 'order_state' | 'created_staff_id'>,
  fromWh: InventoryWarehouseDto | null,
  toWh: InventoryWarehouseDto
): InventoryOrderActionFlagsDto {
  const state = order.order_state;
  const fromStoreId = fromWh?.client_store_id ?? null;
  const toStoreId = toWh.client_store_id ?? null;

  const canApprove =
    state === 'New' &&
    (hasInventoryPermission(ctx, 'order-approve-global') ||
      (fromStoreId != null &&
        ctx.allowedStoreIds.includes(fromStoreId) &&
        hasInventoryPermission(ctx, 'order-approve')));

  const canReject =
    state === 'New' &&
    (hasInventoryPermission(ctx, 'order-reject-global') ||
      (fromStoreId != null && ctx.clientStoreId === fromStoreId && hasInventoryPermission(ctx, 'order-reject')));

  const canAssign =
    state === 'Approved' &&
    (hasInventoryPermission(ctx, 'order-assign-global') ||
      (fromStoreId != null &&
        ctx.allowedStoreIds.includes(fromStoreId) &&
        hasInventoryPermission(ctx, 'order-assign')));

  const canCheck =
    state === 'Assigned' &&
    (hasInventoryPermission(ctx, 'order-check-global') ||
      (toStoreId != null && ctx.allowedStoreIds.includes(toStoreId) && hasInventoryPermission(ctx, 'order-check')));

  const isClosed = state === 'Imported' || state === 'Rejected' || state === 'Cancelled';
  const canCancelByCreator =
    !isClosed &&
    (hasInventoryPermission(ctx, 'cancel-order-global') ||
      (order.created_staff_id != null &&
        Number(order.created_staff_id) === ctx.actorLegacyUserId &&
        hasInventoryPermission(ctx, 'cancel-order')));
  const canCancelByToStore =
    state !== 'Approved' &&
    !isClosed &&
    (hasInventoryPermission(ctx, 'cancel-order-global') ||
      (toStoreId != null && ctx.allowedStoreIds.includes(toStoreId) && hasInventoryPermission(ctx, 'cancel-order')));

  const canForward = state === 'Imported' && hasInventoryPermission(ctx, 'order-approve-global');

  return {
    canEdit: state === 'New' || hasInventoryPermission(ctx, 'edit-order-global'),
    canApprove,
    canReject,
    canAssign,
    canCheck,
    canCancel: canCancelByCreator || canCancelByToStore,
    canForward,
    canOrderMissing: state === 'Imported',
  };
}

async function hydrateOrders(
  ctx: InventoryAuthContext,
  orderRows: OrderRow[],
  conn?: InventoryDbConnection
): Promise<InventoryOrderDto[]> {
  if (orderRows.length === 0) return [];
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  const userIds = new Set<number>();
  const warehouseIds = new Set<number>();
  for (const r of orderRows) {
    if (r.created_staff_id) userIds.add(Number(r.created_staff_id));
    if (r.approved_staff_id) userIds.add(Number(r.approved_staff_id));
    if (r.assigned_staff_id) userIds.add(Number(r.assigned_staff_id));
    if (r.imported_staff_id) userIds.add(Number(r.imported_staff_id));
    if (r.from_inventory_warehouse_id) warehouseIds.add(Number(r.from_inventory_warehouse_id));
    warehouseIds.add(Number(r.to_inventory_warehouse_id));
  }

  const userMap = new Map<number, InventoryStaffBriefDto>();
  if (userIds.size > 0) {
    const ids = [...userIds];
    const uRows = await queryInventory<
      Array<
        RowDataPacket & { user_id: number; full_name: string; avatar: string | null; avatar_internal: string | null }
      >
    >(
      `SELECT user_id, full_name, avatar, avatar_internal FROM user_profile WHERE user_id IN (${ids.map(() => '?').join(',')})`,
      ids,
      conn
    );
    for (const u of uRows) {
      const av = u.avatar_internal || u.avatar;
      userMap.set(Number(u.user_id), {
        user_id: Number(u.user_id),
        full_name: u.full_name,
        avatar_url: av ? `https://wingslashes.com/upload/user/${u.user_id}/${av}` : null,
      });
    }
  }

  const whMap = new Map<number, InventoryWarehouseDto>();
  if (warehouseIds.size > 0) {
    const ids = [...warehouseIds];
    const wRows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id, parent_inventory_warehouse_id, client_store_id, inventory_warehouse_name,
              inventory_warehouse_phone_number, inventory_warehouse_address,
              inventory_warehouse_type, is_check_needed, is_disabled, date_created
       FROM inventory_warehouse WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
      conn
    );
    for (const w of wRows) {
      whMap.set(Number(w.id), mapWarehouseRow(w as never));
    }
  }

  const fallbackWh: InventoryWarehouseDto = {
    inventory_warehouse_id: 0,
    parent_inventory_warehouse_id: null,
    client_store_id: null,
    inventory_warehouse_name: 'Không rõ kho',
    inventory_warehouse_phone_number: null,
    inventory_warehouse_address: null,
    inventory_warehouse_type: 'Other',
    is_check_needed: false,
    is_disabled: false,
    date_created: '',
  };

  return orderRows.map((r) => {
    const fromWh = r.from_inventory_warehouse_id ? whMap.get(Number(r.from_inventory_warehouse_id)) || null : null;
    const toWh = whMap.get(Number(r.to_inventory_warehouse_id)) || fallbackWh;
    const dto: InventoryOrderDto = {
      inventory_warehouse_order_id: Number(r.id),
      parent_inventory_warehouse_order_id:
        r.parent_inventory_warehouse_order_id != null ? Number(r.parent_inventory_warehouse_order_id) : null,
      from_inventory_warehouse_id: r.from_inventory_warehouse_id != null ? Number(r.from_inventory_warehouse_id) : null,
      to_inventory_warehouse_id: Number(r.to_inventory_warehouse_id),
      total_quantity: Number(r.total_quantity || 0),
      total_quantity_exported: Number(r.total_quantity_exported || 0),
      total_quantity_imported: Number(r.total_quantity_imported || 0),
      description: r.description || '',
      reject_reason: r.reject_reason || null,
      order_state: r.order_state,
      is_internal: Boolean(r.is_internal),
      date_approved: r.date_approved,
      date_assigned: r.date_assigned,
      date_imported: r.date_imported,
      date_updated: r.date_updated,
      date_created: r.date_created,
      created_staff: r.created_staff_id ? userMap.get(Number(r.created_staff_id)) || null : null,
      approved_staff: r.approved_staff_id ? userMap.get(Number(r.approved_staff_id)) || null : null,
      assigned_staff: r.assigned_staff_id ? userMap.get(Number(r.assigned_staff_id)) || null : null,
      imported_staff: r.imported_staff_id ? userMap.get(Number(r.imported_staff_id)) || null : null,
      from_inventory_warehouse: fromWh,
      to_inventory_warehouse: toWh,
      actions: buildOrderActionFlags(ctx, r, fromWh, toWh),
    };
    if (includePrice) {
      dto.total_retail_price = Math.round(Number(r.total_retail_price || 0));
      dto.total_retail_price_exported = Math.round(Number(r.total_retail_price_exported || 0));
      dto.total_retail_price_imported = Math.round(Number(r.total_retail_price_imported || 0));
      dto.total_retail_price_estimated = Math.round(Number(r.total_retail_price_estimated || 0));
    }
    return dto;
  });
}

function mapRawOrderItem(r: RawOrderItemRow, includePrice: boolean, includeScanCode: boolean): InventoryOrderItemDto {
  const dto: InventoryOrderItemDto = {
    inventory_warehouse_order_item_id: Number(r.id),
    inventory_warehouse_order_id: Number(r.inventory_warehouse_order_id),
    from_inventory_warehouse_id: r.from_inventory_warehouse_id != null ? Number(r.from_inventory_warehouse_id) : null,
    to_inventory_warehouse_id: Number(r.to_inventory_warehouse_id),
    inventory_item_id: Number(r.inventory_item_id),
    from_inventory_warehouse_item_id:
      r.from_inventory_warehouse_item_id != null ? Number(r.from_inventory_warehouse_item_id) : null,
    to_inventory_warehouse_item_id:
      r.to_inventory_warehouse_item_id != null ? Number(r.to_inventory_warehouse_item_id) : null,
    currency_id: Number(r.currency_id || 2),
    description: r.description || null,
    date_assigned: r.date_assigned,
    date_checked: r.date_checked,
    date_imported: r.date_imported,
    date_created: r.date_created,
    item: {
      inventory_item_id: Number(r.inventory_item_id),
      inventory_item_name: r.item_name,
      inventory_item_code: r.item_code,
      inventory_item_type: r.item_type,
      inventory_item_unit: r.item_unit,
      inventory_item_attribute: r.item_attribute,
      inventory_item_brand_id: Number(r.item_brand_id),
      inventory_item_brand: r.item_brand || '',
      is_temporary_brand: Boolean(r.brand_is_temporary),
    },
    created_staff: r.created_staff_name
      ? { user_id: Number(r.created_staff_id || 0), full_name: r.created_staff_name, avatar_url: null }
      : null,
  };
  if (includeScanCode) {
    dto.scan_code = r.scan_code;
  }
  if (r.total_quantity != null) {
    dto.total_quantity = Number(r.total_quantity);
    dto.total_quantity_checked = Number(r.total_quantity_checked || 0);
    dto.total_quantity_exported = Number(r.total_quantity_exported || 0);
    dto.total_quantity_imported = Number(r.total_quantity_imported || 0);
  }
  if (includePrice) {
    dto.retail_price = Math.round(Number(r.retail_price || 0));
    dto.retail_price_estimated = Math.round(Number(r.retail_price_estimated || 0));
    if (r.total_quantity != null) {
      dto.total_retail_price = Math.round(Number(r.total_retail_price || 0));
      dto.total_retail_price_exported = Math.round(Number(r.total_retail_price_exported || 0));
      dto.total_retail_price_imported = Math.round(Number(r.total_retail_price_imported || 0));
      dto.total_retail_price_estimated = Math.round(Number(r.total_retail_price_estimated || 0));
    }
  }
  return dto;
}

export async function listWarehouseOrders(
  ctx: InventoryAuthContext,
  params: {
    tab?: 'pending' | 'completed' | 'all';
    warehouseIds?: number[];
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }
): Promise<InventoryOrdersListResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  const conds: string[] = ['1=1'];
  const args: unknown[] = [];

  if (params.tab === 'pending') {
    conds.push(`iwo.order_state IN ('New', 'Approved', 'Assigned')`);
  } else if (params.tab === 'completed') {
    conds.push(`iwo.order_state IN ('Imported', 'Cancelled', 'Rejected')`);
  }

  if (!hasInventoryPermission(ctx, 'edit-order-global')) {
    if (ctx.allowedStoreIds.length === 0) {
      conds.push('iwo.created_staff_id = ?');
      args.push(ctx.actorLegacyUserId);
    } else {
      const storePlace = ctx.allowedStoreIds.map(() => '?').join(',');
      conds.push(
        `(twh.client_store_id IN (${storePlace}) OR fwh.client_store_id IN (${storePlace}) OR iwo.created_staff_id = ?)`
      );
      args.push(...ctx.allowedStoreIds, ...ctx.allowedStoreIds, ctx.actorLegacyUserId);
    }
  }

  if (params.warehouseIds && params.warehouseIds.length > 0) {
    const p = params.warehouseIds.map(() => '?').join(',');
    conds.push(`(iwo.from_inventory_warehouse_id IN (${p}) OR iwo.to_inventory_warehouse_id IN (${p}))`);
    args.push(...params.warehouseIds, ...params.warehouseIds);
  }
  if (params.dateFrom && params.dateTo) {
    conds.push('iwo.date_created BETWEEN ? AND ?');
    args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    if (/^\d+$/.test(kw)) {
      conds.push('(iwo.id = ? OR iwo.description LIKE ?)');
      args.push(Number(kw), `%${kw}%`);
    } else {
      conds.push('iwo.description LIKE ?');
      args.push(`%${kw}%`);
    }
  }

  const fromSql = `
    FROM inventory_warehouse_order iwo
    LEFT JOIN inventory_warehouse fwh ON fwh.id = iwo.from_inventory_warehouse_id
    INNER JOIN inventory_warehouse twh ON twh.id = iwo.to_inventory_warehouse_id
    WHERE ${conds.join(' AND ')}`;

  const cntRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt ${fromSql}`,
    args
  );
  const total = Number(cntRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<OrderRow[]>(`SELECT iwo.* ${fromSql} ORDER BY iwo.id DESC LIMIT ? OFFSET ?`, [
          ...args,
          limit,
          offset,
        ]);

  const data = await hydrateOrders(ctx, rows);
  return { success: true, data, page: { total, page, limit } };
}

export async function getWarehouseOrderDetail(
  ctx: InventoryAuthContext,
  orderId: number,
  opts: {
    mode?: 'assign' | 'check' | 'edit' | 'forward' | 'missing' | 'print-invoice';
    keyword?: string;
  } = {},
  conn?: InventoryDbConnection
): Promise<InventoryOrderDetailResponse> {
  const rows = await queryInventory<OrderRow[]>(
    `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
    [orderId],
    conn
  );
  if (!rows[0]) return { success: true, order: null };

  const hydrated = await hydrateOrders(ctx, rows, conn);
  const order = hydrated[0]!;
  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const includeScan = opts.mode === 'assign' || hasInventoryPermission(ctx, 'view-scan-code');
  const kw = String(opts.keyword || '').trim();
  const mode = opts.mode || 'check';

  const conds = ['iwoi.inventory_warehouse_order_id = ?'];
  const args: unknown[] = [orderId];
  if (mode === 'forward') conds.push('iwoi.date_imported IS NOT NULL');
  if (mode === 'missing') conds.push('iwoi.date_imported IS NULL');
  if (kw) {
    conds.push(
      '(ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR iwoi.to_inventory_warehouse_item_id = ?)'
    );
    args.push(`%${kw}%`, `%${kw}%`, kw);
  }

  let itemRows: RawOrderItemRow[];
  if (mode === 'assign') {
    itemRows = await queryInventory<RawOrderItemRow[]>(
      `SELECT iwoi.*, ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
              ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
              ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
              iib.inventory_item_brand AS item_brand, iib.is_temporary AS brand_is_temporary,
              fwi.first_inventory_warehouse_order_item_id AS first_order_item_id,
              up.full_name AS created_staff_name
       FROM inventory_warehouse_order_item iwoi
       INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
       LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
       LEFT JOIN inventory_warehouse_item fwi ON fwi.id = iwoi.from_inventory_warehouse_item_id
       LEFT JOIN user_profile up ON up.user_id = iwoi.created_staff_id
       WHERE ${conds.join(' AND ')}
       ORDER BY iwoi.inventory_item_id ASC, iwoi.id ASC`,
      args,
      conn
    );
  } else {
    const groupBy =
      mode === 'check' || mode === 'print-invoice'
        ? 'iwoi.inventory_item_id'
        : 'iwoi.from_inventory_warehouse_item_id, iwoi.inventory_item_id';
    itemRows = await queryInventory<RawOrderItemRow[]>(
      `SELECT MIN(iwoi.id) AS id, iwoi.inventory_warehouse_order_id,
              MAX(iwoi.from_inventory_warehouse_id) AS from_inventory_warehouse_id,
              iwoi.to_inventory_warehouse_id, iwoi.inventory_item_id,
              MAX(iwoi.from_inventory_warehouse_item_id) AS from_inventory_warehouse_item_id,
              MAX(iwoi.to_inventory_warehouse_item_id) AS to_inventory_warehouse_item_id,
              MAX(iwoi.scan_code) AS scan_code, MAX(iwoi.currency_id) AS currency_id,
              MAX(iwoi.retail_price) AS retail_price, MAX(iwoi.retail_price_estimated) AS retail_price_estimated,
              MAX(iwoi.description) AS description, MAX(iwoi.created_staff_id) AS created_staff_id,
              MAX(iwoi.date_assigned) AS date_assigned, MAX(iwoi.date_checked) AS date_checked,
              MAX(iwoi.date_imported) AS date_imported, MAX(iwoi.date_created) AS date_created,
              COUNT(*) AS total_quantity,
              SUM(IF(iwoi.date_checked IS NOT NULL, 1, 0)) AS total_quantity_checked,
              COUNT(iwoi.date_assigned) AS total_quantity_exported,
              COUNT(iwoi.date_imported) AS total_quantity_imported,
              SUM(iwoi.retail_price) AS total_retail_price,
              SUM(IF(iwoi.date_assigned IS NOT NULL, iwoi.retail_price, 0)) AS total_retail_price_exported,
              SUM(IF(iwoi.date_imported IS NOT NULL, iwoi.retail_price, 0)) AS total_retail_price_imported,
              SUM(iwoi.retail_price_estimated) AS total_retail_price_estimated,
              ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
              ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
              ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
              iib.inventory_item_brand AS item_brand, iib.is_temporary AS brand_is_temporary,
              NULL AS first_order_item_id, NULL AS created_staff_name
       FROM inventory_warehouse_order_item iwoi
       INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
       LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
       WHERE ${conds.join(' AND ')}
       GROUP BY ${groupBy}, ii.inventory_item_name, ii.inventory_item_code, ii.inventory_item_type, ii.inventory_item_unit, ii.inventory_item_attribute, ii.inventory_item_brand_id, iib.inventory_item_brand, iib.is_temporary, iwoi.inventory_warehouse_order_id, iwoi.to_inventory_warehouse_id
       ORDER BY iwoi.inventory_item_id ASC`,
      args,
      conn
    );
  }

  order.inventory_item = itemRows.map((r) => mapRawOrderItem(r, includePrice, includeScan));
  let selectedOrderId: number | null = null;
  if (mode === 'assign') {
    const selRows = await queryInventory<Array<RowDataPacket & { inventory_warehouse_order_id: number }>>(
      `SELECT inventory_warehouse_order_id FROM inventory_warehouse_order_select
       WHERE client_business_id = ? AND created_staff_id = ? ORDER BY id DESC LIMIT 1`,
      [ctx.clientBusinessId, ctx.actorLegacyUserId],
      conn
    );
    selectedOrderId = selRows[0] ? Number(selRows[0].inventory_warehouse_order_id) : null;
  }

  const company = mode === 'print-invoice' ? await getInventoryCompanyInfo(conn) : undefined;
  return { success: true, order, selected_order_id: selectedOrderId, company };
}

export async function getMergedOrdersPreview(
  ctx: InventoryAuthContext,
  orderIds: number[]
): Promise<InventoryOrderDetailResponse> {
  if (!hasInventoryPermission(ctx, 'merge-order')) {
    const err = new Error('Forbidden: merge-order permission required') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
  const cleanIds = orderIds.filter((n) => Number.isInteger(n) && n > 0);
  if (cleanIds.length === 0) return { success: true, order: null };

  const base = await getWarehouseOrderDetail(ctx, cleanIds[0]!, { mode: 'edit' });
  if (!base.order) return { success: true, order: null };
  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const rows = await queryInventory<RawOrderItemRow[]>(
    `SELECT MIN(iwoi.id) AS id, MIN(iwoi.inventory_warehouse_order_id) AS inventory_warehouse_order_id,
            iwoi.from_inventory_warehouse_id, MIN(iwoi.to_inventory_warehouse_id) AS to_inventory_warehouse_id,
            iwoi.inventory_item_id, iwoi.from_inventory_warehouse_item_id,
            NULL AS to_inventory_warehouse_item_id, NULL AS scan_code, MAX(iwoi.currency_id) AS currency_id,
            MAX(iwoi.retail_price) AS retail_price, MAX(iwoi.retail_price_estimated) AS retail_price_estimated,
            NULL AS description, NULL AS created_staff_id, NULL AS date_assigned, NULL AS date_checked,
            NULL AS date_imported, MIN(iwoi.date_created) AS date_created,
            COUNT(*) AS total_quantity, 0 AS total_quantity_checked, 0 AS total_quantity_exported, 0 AS total_quantity_imported,
            SUM(iwoi.retail_price) AS total_retail_price, 0 AS total_retail_price_exported, 0 AS total_retail_price_imported,
            SUM(iwoi.retail_price_estimated) AS total_retail_price_estimated,
            ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
            ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
            ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
            iib.inventory_item_brand AS item_brand, iib.is_temporary AS brand_is_temporary,
            NULL AS first_order_item_id, NULL AS created_staff_name
     FROM inventory_warehouse_order_item iwoi
     INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     WHERE iwoi.inventory_warehouse_order_id IN (${cleanIds.map(() => '?').join(',')})
     GROUP BY iwoi.from_inventory_warehouse_item_id, iwoi.from_inventory_warehouse_id, iwoi.inventory_item_id,
              ii.inventory_item_name, ii.inventory_item_code, ii.inventory_item_type, ii.inventory_item_unit,
              ii.inventory_item_attribute, ii.inventory_item_brand_id, iib.inventory_item_brand, iib.is_temporary`,
    cleanIds
  );
  base.order.inventory_item = rows.map((r) => mapRawOrderItem(r, includePrice, false));
  return { success: true, order: base.order };
}

export async function listOrderPhysicalItems(
  ctx: InventoryAuthContext,
  params: { orderId: number; inventoryItemId?: number; keyword?: string; page?: number; limit?: number }
): Promise<InventoryOrderItemsListResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;
  const includePrice = hasInventoryPermission(ctx, 'view-price');
  const includeScan = hasInventoryPermission(ctx, 'view-scan-code');

  const conds = ['iwoi.inventory_warehouse_order_id = ?'];
  const args: unknown[] = [params.orderId];
  if (params.inventoryItemId) {
    conds.push('iwoi.inventory_item_id = ?');
    args.push(params.inventoryItemId);
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push(
      '(ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR iwoi.to_inventory_warehouse_item_id = ?)'
    );
    args.push(`%${kw}%`, `%${kw}%`, kw);
  }

  const fromSql = `
    FROM inventory_warehouse_order_item iwoi
    INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
    LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
    LEFT JOIN inventory_warehouse_item fwi ON fwi.id = iwoi.from_inventory_warehouse_item_id
    LEFT JOIN user_profile up ON up.user_id = iwoi.created_staff_id
    WHERE ${conds.join(' AND ')}`;

  const cnt = await queryInventory<Array<RowDataPacket & { cnt: number }>>(`SELECT COUNT(*) AS cnt ${fromSql}`, args);
  const total = Number(cnt[0]?.cnt || 0);
  const rows =
    total === 0
      ? []
      : await queryInventory<RawOrderItemRow[]>(
          `SELECT iwoi.*, ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
                  ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
                  ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
                  iib.inventory_item_brand AS item_brand, iib.is_temporary AS brand_is_temporary,
                  fwi.first_inventory_warehouse_order_item_id AS first_order_item_id,
                  up.full_name AS created_staff_name
           ${fromSql}
           ORDER BY iwoi.id DESC LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );
  return {
    success: true,
    data: rows.map((r) => mapRawOrderItem(r, includePrice, includeScan)),
    page: { total, page, limit },
  };
}

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
