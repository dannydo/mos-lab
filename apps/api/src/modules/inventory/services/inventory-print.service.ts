import type { RowDataPacket } from 'mysql2/promise';
import {
  type InventoryCheckPrintItemDto,
  type InventoryCheckPrintResponse,
  type InventoryItemType,
  type InventoryLifecycleCounters,
  type InventoryPrintLabelItemDto,
  type InventoryPrintLabelsResponse,
  type InventoryWarehouseDto,
  type InventoryWarehouseReportPrintResponse,
  type InventoryWarehouseReportRowDto,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory } from './inventory-db.js';
import { getWarehouseItemLifecycle } from './inventory-lifecycle.service.js';
import { getInventoryCompanyInfo, getWarehouseOrderDetail } from './inventory-order-query.service.js';
import { mapWarehouseRow } from './inventory-query.service.js';

interface PrintLabelRow extends RowDataPacket {
  inventory_warehouse_order_item_id?: number;
  inventory_warehouse_item_id?: number;
  first_inventory_warehouse_order_item_id: number | null;
  scan_code: string;
  date_created: string;
  inventory_item_id: number;
  inventory_item_name: string;
  inventory_item_code: string;
  inventory_item_type: InventoryItemType;
  inventory_item_unit: string;
  inventory_item_attribute: string | null;
  inventory_item_brand_id: number;
  inventory_item_brand: string | null;
  brand_is_temporary: number | null;
}

interface CheckHeaderRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  item_state: 'New' | 'Using';
  check_state: InventoryCheckPrintResponse['check'] extends infer T
    ? T extends { check_state: infer S }
      ? S
      : never
    : never;
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  date_updated: string | null;
  date_created: string;
  checked_staff_id: number | null;
  checked_staff_name: string | null;
  checked_group_key: string | null;
  wh_id: number;
  wh_parent_id: number | null;
  wh_store_id: number | null;
  wh_name: string;
  wh_phone: string | null;
  wh_addr: string | null;
  wh_type: InventoryWarehouseDto['inventory_warehouse_type'];
  wh_check_needed: number;
  wh_disabled: number;
  wh_date_created: string;
}

interface CheckPrintAggRow extends RowDataPacket {
  inventory_item_id: number;
  total_quantity: number;
  total_quantity_checked: number;
  total_retail_price: number;
  total_retail_price_checked: number;
  item_name: string;
  item_code: string;
  item_type: InventoryItemType;
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
}

interface WarehouseReportAggRow extends RowDataPacket {
  inventory_warehouse_id: number;
  total_quantity_start: number;
  total_quantity_input: number;
  total_quantity_input_main: number;
  total_quantity_input_other: number;
  total_quantity_input_supplier: number;
  total_quantity_new: number;
  total_quantity_using: number;
  total_quantity_used: number;
  total_quantity_lost: number;
  total_quantity_broken: number;
  total_quantity_output: number;
  total_quantity_output_main: number;
  total_quantity_output_other: number;
  total_quantity_output_supplier: number;
  total_quantity_output_return: number;
  total_quantity_output_destroy: number;
  total_quantity_end: number;
  total_retail_price_start: number;
  total_retail_price_input: number;
  total_retail_price_input_main: number;
  total_retail_price_input_other: number;
  total_retail_price_input_supplier: number;
  total_retail_price_new: number;
  total_retail_price_using: number;
  total_retail_price_used: number;
  total_retail_price_lost: number;
  total_retail_price_broken: number;
  total_retail_price_output: number;
  total_retail_price_output_main: number;
  total_retail_price_output_other: number;
  total_retail_price_output_supplier: number;
  total_retail_price_output_return: number;
  total_retail_price_output_destroy: number;
  total_retail_price_end: number;
}

function assertViewScanCode(ctx: InventoryAuthContext): void {
  if (!hasInventoryPermission(ctx, 'view-scan-code')) {
    const err = new Error('Forbidden: view-scan-code permission required') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
}

function mapLabelRow(r: PrintLabelRow): InventoryPrintLabelItemDto {
  return {
    inventory_warehouse_order_item_id: r.inventory_warehouse_order_item_id
      ? Number(r.inventory_warehouse_order_item_id)
      : undefined,
    inventory_warehouse_item_id: r.inventory_warehouse_item_id ? Number(r.inventory_warehouse_item_id) : undefined,
    first_inventory_warehouse_order_item_id:
      r.first_inventory_warehouse_order_item_id != null ? Number(r.first_inventory_warehouse_order_item_id) : null,
    scan_code: r.scan_code,
    date_created: r.date_created,
    item: {
      inventory_item_id: Number(r.inventory_item_id),
      inventory_item_name: r.inventory_item_name,
      inventory_item_code: r.inventory_item_code,
      inventory_item_type: r.inventory_item_type,
      inventory_item_unit: r.inventory_item_unit,
      inventory_item_attribute: r.inventory_item_attribute,
      inventory_item_brand_id: Number(r.inventory_item_brand_id),
      inventory_item_brand: r.inventory_item_brand || '',
      is_temporary_brand: Boolean(r.brand_is_temporary),
    },
  };
}

export async function getOrderScanCodePrintData(
  ctx: InventoryAuthContext,
  orderId: number,
  itemId?: number
): Promise<InventoryPrintLabelsResponse> {
  assertViewScanCode(ctx);
  const detail = await getWarehouseOrderDetail(ctx, orderId, { mode: 'assign' });
  const conds = ['iwoi.inventory_warehouse_order_id = ?', 'iwoi.scan_code IS NOT NULL'];
  const args: unknown[] = [orderId];
  if (itemId && itemId > 0) {
    conds.push('iwoi.inventory_item_id = ?');
    args.push(itemId);
  }
  const rows = await queryInventory<PrintLabelRow[]>(
    `SELECT iwoi.id AS inventory_warehouse_order_item_id,
            fwi.first_inventory_warehouse_order_item_id,
            iwoi.scan_code, iwoi.date_created,
            ii.id AS inventory_item_id, ii.inventory_item_name, ii.inventory_item_code,
            ii.inventory_item_type, ii.inventory_item_unit, ii.inventory_item_attribute,
            ii.inventory_item_brand_id, iib.inventory_item_brand, iib.is_temporary AS brand_is_temporary
     FROM inventory_warehouse_order_item iwoi
     INNER JOIN inventory_item ii ON ii.id = iwoi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     LEFT JOIN inventory_warehouse_item fwi ON fwi.id = iwoi.from_inventory_warehouse_item_id
     WHERE ${conds.join(' AND ')}
     ORDER BY ii.id ASC, iwoi.id ASC`,
    args
  );
  return { success: true, order: detail.order, items: rows.map(mapLabelRow) };
}

export async function getItemScanCodePrintData(
  ctx: InventoryAuthContext,
  warehouseItemIds: number[]
): Promise<InventoryPrintLabelsResponse> {
  assertViewScanCode(ctx);
  const cleanIds = warehouseItemIds.filter((n) => Number.isInteger(n) && n > 0);
  if (cleanIds.length === 0) return { success: true, items: [] };

  const rows = await queryInventory<PrintLabelRow[]>(
    `SELECT iwi.id AS inventory_warehouse_item_id,
            iwi.first_inventory_warehouse_order_item_id,
            iwi.scan_code, iwi.date_created,
            ii.id AS inventory_item_id, ii.inventory_item_name, ii.inventory_item_code,
            ii.inventory_item_type, ii.inventory_item_unit, ii.inventory_item_attribute,
            ii.inventory_item_brand_id, iib.inventory_item_brand, iib.is_temporary AS brand_is_temporary
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     WHERE iwi.id IN (${cleanIds.map(() => '?').join(',')})
     ORDER BY ii.id ASC, iwi.id ASC`,
    cleanIds
  );
  return { success: true, items: rows.map(mapLabelRow) };
}

export async function getWarehouseCheckPrintData(
  ctx: InventoryAuthContext,
  checkId: number,
  isLostOnly = false
): Promise<InventoryCheckPrintResponse> {
  const company = await getInventoryCompanyInfo();
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  const hdrRows = await queryInventory<CheckHeaderRow[]>(
    `SELECT iwc.id, iwc.inventory_warehouse_id, iwc.item_state, iwc.check_state,
            iwc.total_quantity, iwc.total_quantity_checked, iwc.total_retail_price, iwc.total_retail_price_checked,
            iwc.date_updated, iwc.date_created, iwc.checked_staff_id,
            up.full_name AS checked_staff_name, ug.user_group_key AS checked_group_key,
            iw.id AS wh_id, iw.parent_inventory_warehouse_id AS wh_parent_id, iw.client_store_id AS wh_store_id,
            iw.inventory_warehouse_name AS wh_name, iw.inventory_warehouse_phone_number AS wh_phone,
            iw.inventory_warehouse_address AS wh_addr, iw.inventory_warehouse_type AS wh_type,
            iw.is_check_needed AS wh_check_needed, iw.is_disabled AS wh_disabled, iw.date_created AS wh_date_created
     FROM inventory_warehouse_check iwc
     INNER JOIN inventory_warehouse iw ON iw.id = iwc.inventory_warehouse_id
     LEFT JOIN user_profile up ON up.user_id = iwc.checked_staff_id
     LEFT JOIN user_group ug ON ug.id = up.user_group_id
     WHERE iwc.id = ? LIMIT 1`,
    [checkId]
  );

  const hdr = hdrRows[0];
  if (!hdr) return { success: true, company, check: null, items: [] };

  const itemConds = ['iwci.inventory_warehouse_check_id = ?'];
  if (isLostOnly) itemConds.push('iwci.is_lost = 1');

  const aggRows = await queryInventory<CheckPrintAggRow[]>(
    `SELECT iwci.inventory_item_id,
            COUNT(*) AS total_quantity,
            SUM(IF(iwci.is_checked = 1, 1, 0)) AS total_quantity_checked,
            SUM(iwi.retail_price) AS total_retail_price,
            SUM(IF(iwci.is_checked = 1, iwi.retail_price, 0)) AS total_retail_price_checked,
            ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
            ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
            ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
            iib.inventory_item_brand AS item_brand
     FROM inventory_warehouse_check_item iwci
     INNER JOIN inventory_warehouse_item iwi ON iwi.id = iwci.inventory_warehouse_item_id
     INNER JOIN inventory_item ii ON ii.id = iwci.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     WHERE ${itemConds.join(' AND ')}
     GROUP BY iwci.inventory_item_id, ii.inventory_item_name, ii.inventory_item_code, ii.inventory_item_type,
              ii.inventory_item_unit, ii.inventory_item_attribute, ii.inventory_item_brand_id, iib.inventory_item_brand
     ORDER BY ii.inventory_item_name ASC`,
    [checkId]
  );

  const items: InventoryCheckPrintItemDto[] = aggRows.map((r) => {
    const row: InventoryCheckPrintItemDto = {
      inventory_item_id: Number(r.inventory_item_id),
      total_quantity: Number(r.total_quantity || 0),
      total_quantity_checked: Number(r.total_quantity_checked || 0),
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
      row.total_retail_price = Math.round(Number(r.total_retail_price || 0));
      row.total_retail_price_checked = Math.round(Number(r.total_retail_price_checked || 0));
    }
    return row;
  });

  const checkDto: NonNullable<InventoryCheckPrintResponse['check']> = {
    inventory_warehouse_check_id: Number(hdr.id),
    inventory_warehouse_id: Number(hdr.inventory_warehouse_id),
    item_state: hdr.item_state,
    check_state: hdr.check_state,
    total_quantity: Number(hdr.total_quantity || 0),
    total_quantity_checked: Number(hdr.total_quantity_checked || 0),
    date_updated: hdr.date_updated,
    date_created: hdr.date_created,
    warehouse: {
      inventory_warehouse_id: Number(hdr.wh_id),
      parent_inventory_warehouse_id: hdr.wh_parent_id != null ? Number(hdr.wh_parent_id) : null,
      client_store_id: hdr.wh_store_id != null ? Number(hdr.wh_store_id) : null,
      inventory_warehouse_name: hdr.wh_name,
      inventory_warehouse_phone_number: hdr.wh_phone,
      inventory_warehouse_address: hdr.wh_addr,
      inventory_warehouse_type: hdr.wh_type,
      is_check_needed: Boolean(hdr.wh_check_needed),
      is_disabled: Boolean(hdr.wh_disabled),
      date_created: hdr.wh_date_created,
    },
    checked_staff: hdr.checked_staff_name
      ? {
          user_id: Number(hdr.checked_staff_id || 0),
          full_name: hdr.checked_staff_name,
          avatar_url: null,
          user_group_name: hdr.checked_group_key || null,
        }
      : null,
  };
  if (includePrice) {
    checkDto.total_retail_price = Math.round(Number(hdr.total_retail_price || 0));
    checkDto.total_retail_price_checked = Math.round(Number(hdr.total_retail_price_checked || 0));
  }

  return { success: true, company, check: checkDto, items };
}

export async function getWarehouseReportPrintData(
  ctx: InventoryAuthContext,
  params: {
    warehouseId?: number;
    inventoryItemType?: InventoryItemType;
    dateFrom: string;
    dateTo: string;
    keyword?: string;
  }
): Promise<InventoryWarehouseReportPrintResponse> {
  const company = await getInventoryCompanyInfo();
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  if (params.warehouseId) {
    const whRows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id, parent_inventory_warehouse_id, client_store_id, inventory_warehouse_name,
              inventory_warehouse_phone_number, inventory_warehouse_address,
              inventory_warehouse_type, is_check_needed, is_disabled, date_created
       FROM inventory_warehouse WHERE id = ? LIMIT 1`,
      [params.warehouseId]
    );
    const selectedWarehouse = whRows[0] ? mapWarehouseRow(whRows[0] as never) : null;
    const lifecycle = await getWarehouseItemLifecycle(ctx, {
      inventoryItemType: params.inventoryItemType,
      warehouseIds: [params.warehouseId],
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      keyword: params.keyword,
      page: 1,
      limit: 500,
    });
    return {
      success: true,
      company,
      selectedWarehouse,
      itemType: params.inventoryItemType || 'ALL',
      items: lifecycle.data as unknown as InventoryWarehouseReportRowDto[],
      summary: lifecycle.summary,
      page: lifecycle.page,
    };
  }

  const conds = ['riw.date BETWEEN ? AND ?'];
  const args: unknown[] = [params.dateFrom, params.dateTo];
  if (params.inventoryItemType) {
    conds.push('riw.inventory_item_type = ?');
    args.push(params.inventoryItemType);
  }
  if (!hasInventoryPermission(ctx, 'edit-order-global')) {
    if (ctx.allowedStoreIds.length === 0) {
      conds.push('1=0');
    } else {
      conds.push(`iw.client_store_id IN (${ctx.allowedStoreIds.map(() => '?').join(',')})`);
      args.push(...ctx.allowedStoreIds);
    }
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push('(iw.inventory_warehouse_name LIKE ? OR iw.inventory_warehouse_address LIKE ?)');
    args.push(`%${kw}%`, `%${kw}%`);
  }

  const rows = await queryInventory<Array<WarehouseReportAggRow & RowDataPacket>>(
    `SELECT riw.inventory_warehouse_id,
            SUM(riw.total_quantity_start) AS total_quantity_start,
            SUM(riw.total_quantity_input) AS total_quantity_input,
            SUM(riw.total_quantity_input_main) AS total_quantity_input_main,
            SUM(riw.total_quantity_input_other) AS total_quantity_input_other,
            SUM(riw.total_quantity_input_supplier) AS total_quantity_input_supplier,
            SUM(riw.total_quantity_new) AS total_quantity_new,
            SUM(riw.total_quantity_using) AS total_quantity_using,
            SUM(riw.total_quantity_used) AS total_quantity_used,
            SUM(riw.total_quantity_lost) AS total_quantity_lost,
            SUM(riw.total_quantity_broken) AS total_quantity_broken,
            SUM(riw.total_quantity_output) AS total_quantity_output,
            SUM(riw.total_quantity_output_main) AS total_quantity_output_main,
            SUM(riw.total_quantity_output_other) AS total_quantity_output_other,
            SUM(riw.total_quantity_output_supplier) AS total_quantity_output_supplier,
            SUM(riw.total_quantity_output_return) AS total_quantity_output_return,
            SUM(riw.total_quantity_output_destroy) AS total_quantity_output_destroy,
            SUM(riw.total_quantity_end) AS total_quantity_end,
            SUM(riw.total_retail_price_start) AS total_retail_price_start,
            SUM(riw.total_retail_price_input) AS total_retail_price_input,
            SUM(riw.total_retail_price_input_main) AS total_retail_price_input_main,
            SUM(riw.total_retail_price_input_other) AS total_retail_price_input_other,
            SUM(riw.total_retail_price_input_supplier) AS total_retail_price_input_supplier,
            SUM(riw.total_retail_price_new) AS total_retail_price_new,
            SUM(riw.total_retail_price_using) AS total_retail_price_using,
            SUM(riw.total_retail_price_used) AS total_retail_price_used,
            SUM(riw.total_retail_price_lost) AS total_retail_price_lost,
            SUM(riw.total_retail_price_broken) AS total_retail_price_broken,
            SUM(riw.total_retail_price_output) AS total_retail_price_output,
            SUM(riw.total_retail_price_output_main) AS total_retail_price_output_main,
            SUM(riw.total_retail_price_output_other) AS total_retail_price_output_other,
            SUM(riw.total_retail_price_output_supplier) AS total_retail_price_output_supplier,
            SUM(riw.total_retail_price_output_return) AS total_retail_price_output_return,
            SUM(riw.total_retail_price_output_destroy) AS total_retail_price_output_destroy,
            SUM(riw.total_retail_price_end) AS total_retail_price_end,
            iw.id, iw.parent_inventory_warehouse_id, iw.client_store_id, iw.inventory_warehouse_name,
            iw.inventory_warehouse_phone_number, iw.inventory_warehouse_address, iw.inventory_warehouse_type,
            iw.is_check_needed, iw.is_disabled, iw.date_created
     FROM report_inventory_warehouse riw
     INNER JOIN inventory_warehouse iw ON iw.id = riw.inventory_warehouse_id
     WHERE ${conds.join(' AND ')}
     GROUP BY riw.inventory_warehouse_id, iw.id, iw.parent_inventory_warehouse_id, iw.client_store_id,
              iw.inventory_warehouse_name, iw.inventory_warehouse_phone_number, iw.inventory_warehouse_address,
              iw.inventory_warehouse_type, iw.is_check_needed, iw.is_disabled, iw.date_created
     ORDER BY iw.inventory_warehouse_name ASC`,
    args
  );

  const qtyKeys = [
    'total_quantity_start',
    'total_quantity_input',
    'total_quantity_input_main',
    'total_quantity_input_other',
    'total_quantity_input_supplier',
    'total_quantity_new',
    'total_quantity_using',
    'total_quantity_used',
    'total_quantity_lost',
    'total_quantity_broken',
    'total_quantity_output',
    'total_quantity_output_main',
    'total_quantity_output_other',
    'total_quantity_output_supplier',
    'total_quantity_output_return',
    'total_quantity_output_destroy',
    'total_quantity_end',
  ] as const;
  const priceKeys = [
    'total_retail_price_start',
    'total_retail_price_input',
    'total_retail_price_input_main',
    'total_retail_price_input_other',
    'total_retail_price_input_supplier',
    'total_retail_price_new',
    'total_retail_price_using',
    'total_retail_price_used',
    'total_retail_price_lost',
    'total_retail_price_broken',
    'total_retail_price_output',
    'total_retail_price_output_main',
    'total_retail_price_output_other',
    'total_retail_price_output_supplier',
    'total_retail_price_output_return',
    'total_retail_price_output_destroy',
    'total_retail_price_end',
  ] as const;

  const summary = Object.fromEntries(qtyKeys.map((k) => [k, 0])) as unknown as InventoryLifecycleCounters;
  if (includePrice) {
    for (const pk of priceKeys) summary[pk] = 0;
  }

  const items: InventoryWarehouseReportRowDto[] = rows.map((r) => {
    const row: InventoryWarehouseReportRowDto = {
      warehouse: mapWarehouseRow(r as never),
      ...(Object.fromEntries(qtyKeys.map((k) => [k, Number(r[k] || 0)])) as unknown as InventoryLifecycleCounters),
    };
    for (const qk of qtyKeys) summary[qk] += Number(r[qk] || 0);
    if (includePrice) {
      for (const pk of priceKeys) {
        const val = Math.round(Number(r[pk] || 0));
        row[pk] = val;
        summary[pk] = (summary[pk] || 0) + val;
      }
    }
    return row;
  });

  return {
    success: true,
    company,
    selectedWarehouse: null,
    itemType: params.inventoryItemType || 'ALL',
    items,
    summary,
    page: { total: items.length, page: 1, limit: items.length || 20 },
  };
}
