import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_ITEM_AVAILABLE_STATES,
  INVENTORY_ITEM_UNAVAILABLE_STATES,
  type InventoryItemState,
  type InventoryItemType,
  type InventoryLifecycleMode,
  type InventoryWarehouseDto,
  type InventoryWarehouseItemDetailDto,
  type InventoryWarehouseItemsListResponse,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory } from './inventory-db.js';
import { prevMonthBounds } from './inventory-lifecycle.service.js';

interface JoinedWarehouseItemListRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  order_product_id: number | null;
  scan_code: string;
  currency_id: number;
  retail_price: number;
  item_state: InventoryItemState;
  assign_note: string | null;
  date_assigned: string | null;
  date_updated: string | null;
  date_created: string;
  created_staff_id: number;
  assigned_staff_id: number | null;
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
  item_name: string;
  item_code: string;
  item_type: InventoryItemType;
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand: string | null;
  created_staff_name: string | null;
  assigned_staff_name: string | null;
  assigned_staff_avatar: string | null;
}

export async function getWarehouseItemsDrilldown(
  ctx: InventoryAuthContext,
  params: {
    itemMode?: InventoryLifecycleMode;
    warehouseIds?: number[];
    inventoryItemId?: number;
    inventoryItemType?: InventoryItemType;
    itemState?: InventoryItemState;
    isAssignedStaff?: boolean;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }
): Promise<InventoryWarehouseItemsListResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  let scopedWarehouseIds = params.warehouseIds && params.warehouseIds.length > 0 ? params.warehouseIds : null;
  if (!scopedWarehouseIds && !hasInventoryPermission(ctx, 'edit-order-global')) {
    if (ctx.allowedStoreIds.length === 0) return { success: true, data: [], page: { total: 0, page, limit } };
    const storeWhs = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse WHERE client_store_id IN (${ctx.allowedStoreIds.map(() => '?').join(',')})`,
      ctx.allowedStoreIds
    );
    scopedWarehouseIds = storeWhs.map((w) => Number(w.id));
    if (scopedWarehouseIds.length === 0) return { success: true, data: [], page: { total: 0, page, limit } };
  }

  const joins: string[] = [];
  const conds: string[] = ['1=1'];
  const args: unknown[] = [];

  let skipDefaultWarehouseFilter = false;
  if (params.itemMode && params.dateFrom && params.dateTo) {
    const availSql = INVENTORY_ITEM_AVAILABLE_STATES.map(() => '?').join(',');
    const unavailSql = INVENTORY_ITEM_UNAVAILABLE_STATES.map(() => '?').join(',');
    switch (params.itemMode) {
      case 'start': {
        const { lastStart, lastEnd } = prevMonthBounds(params.dateFrom);
        joins.push('INNER JOIN report_inventory_warehouse_item_state rws ON rws.inventory_warehouse_item_id = iwi.id');
        conds.push(`rws.date BETWEEN ? AND ?`, `rws.item_state IN (${availSql})`);
        args.push(lastStart, lastEnd, ...INVENTORY_ITEM_AVAILABLE_STATES);
        if (scopedWarehouseIds) {
          conds.push(`rws.inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`);
          args.push(...scopedWarehouseIds);
          skipDefaultWarehouseFilter = true;
        }
        break;
      }
      case 'input': {
        if (scopedWarehouseIds) {
          joins.push(
            `INNER JOIN inventory_warehouse_order_item iwoi_in ON iwoi_in.to_inventory_warehouse_item_id = iwi.id AND iwoi_in.to_inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`
          );
          args.push(...scopedWarehouseIds);
          skipDefaultWarehouseFilter = true;
        } else {
          joins.push(
            'INNER JOIN inventory_warehouse_order_item iwoi_in ON iwoi_in.to_inventory_warehouse_item_id = iwi.id'
          );
        }
        conds.push('iwoi_in.date_imported BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      }
      case 'new':
        conds.push(`iwi.item_state = 'New'`, 'iwi.date_created BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      case 'using':
        conds.push(`iwi.item_state IN ('Testing', 'Using')`, 'iwi.date_updated BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      case 'used':
        conds.push(`iwi.item_state = 'Used'`, 'iwi.date_updated BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      case 'lost':
        conds.push(`iwi.item_state IN ('Lost', 'Lost-Temporary')`, 'iwi.date_updated BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      case 'broken':
        conds.push(`iwi.item_state = 'Broken'`, 'iwi.date_updated BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      case 'output': {
        if (scopedWarehouseIds) {
          joins.push(
            `INNER JOIN inventory_warehouse_order_item iwoi_out ON iwoi_out.from_inventory_warehouse_item_id = iwi.id AND iwoi_out.from_inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`
          );
          args.push(...scopedWarehouseIds);
          skipDefaultWarehouseFilter = true;
        } else {
          joins.push(
            'INNER JOIN inventory_warehouse_order_item iwoi_out ON iwoi_out.from_inventory_warehouse_item_id = iwi.id'
          );
        }
        conds.push('iwoi_out.date_imported IS NOT NULL', 'iwoi_out.date_imported BETWEEN ? AND ?');
        args.push(`${params.dateFrom} 00:00:00`, `${params.dateTo} 23:59:59`);
        break;
      }
      case 'end': {
        joins.push('INNER JOIN report_inventory_warehouse_item_state rws ON rws.inventory_warehouse_item_id = iwi.id');
        conds.push(
          `rws.date BETWEEN ? AND ?`,
          `rws.item_state IN (${availSql})`,
          `NOT (iwi.item_state IN (${unavailSql}) AND iwi.date_updated <= ?)`
        );
        args.push(
          params.dateFrom,
          params.dateTo,
          ...INVENTORY_ITEM_AVAILABLE_STATES,
          ...INVENTORY_ITEM_UNAVAILABLE_STATES,
          `${params.dateTo} 23:59:59`
        );
        if (scopedWarehouseIds) {
          conds.push(`rws.inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`);
          args.push(...scopedWarehouseIds);
          skipDefaultWarehouseFilter = true;
        }
        break;
      }
    }
  }

  if (!skipDefaultWarehouseFilter && scopedWarehouseIds) {
    conds.push(`iwi.inventory_warehouse_id IN (${scopedWarehouseIds.map(() => '?').join(',')})`);
    args.push(...scopedWarehouseIds);
  }
  if (params.inventoryItemId) {
    conds.push('iwi.inventory_item_id = ?');
    args.push(params.inventoryItemId);
  }
  if (params.inventoryItemType) {
    conds.push('ii.inventory_item_type = ?');
    args.push(params.inventoryItemType);
  }
  if (params.itemState) {
    conds.push('iwi.item_state = ?');
    args.push(params.itemState);
  }
  if (params.isAssignedStaff) {
    conds.push('iwi.assigned_staff_id IS NOT NULL');
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push(
      '(ii.inventory_item_name LIKE ? OR ii.inventory_item_attribute LIKE ? OR iwi.first_inventory_warehouse_order_item_id = ? OR aup.full_name LIKE ?)'
    );
    args.push(`%${kw}%`, `%${kw}%`, kw, `%${kw}%`);
  }

  const fromWhereSql = `
    FROM inventory_warehouse_item iwi
    INNER JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
    INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
    LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
    LEFT JOIN user_profile cup ON cup.user_id = iwi.created_staff_id
    LEFT JOIN user_profile aup ON aup.user_id = iwi.assigned_staff_id
    ${joins.join(' ')}
    WHERE ${conds.join(' AND ')}`;

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(DISTINCT iwi.id) AS cnt ${fromWhereSql}`,
    args
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<JoinedWarehouseItemListRow[]>(
          `SELECT DISTINCT iwi.id, iwi.inventory_warehouse_id, iwi.inventory_item_id,
                  iwi.first_inventory_warehouse_order_item_id, iwi.order_product_id, iwi.scan_code,
                  iwi.currency_id, iwi.retail_price, iwi.item_state, iwi.assign_note,
                  iwi.date_assigned, iwi.date_updated, iwi.date_created,
                  iwi.created_staff_id, iwi.assigned_staff_id,
                  iw.id AS wh_id, iw.parent_inventory_warehouse_id AS wh_parent_id,
                  iw.client_store_id AS wh_store_id, iw.inventory_warehouse_name AS wh_name,
                  iw.inventory_warehouse_phone_number AS wh_phone, iw.inventory_warehouse_address AS wh_addr,
                  iw.inventory_warehouse_type AS wh_type, iw.is_check_needed AS wh_check_needed,
                  iw.is_disabled AS wh_disabled, iw.date_created AS wh_date_created,
                  ii.inventory_item_name AS item_name, ii.inventory_item_code AS item_code,
                  ii.inventory_item_type AS item_type, ii.inventory_item_unit AS item_unit,
                  ii.inventory_item_attribute AS item_attribute, ii.inventory_item_brand_id AS item_brand_id,
                  iib.inventory_item_brand AS item_brand,
                  cup.full_name AS created_staff_name,
                  aup.full_name AS assigned_staff_name,
                  COALESCE(aup.avatar_internal, aup.avatar) AS assigned_staff_avatar
           ${fromWhereSql}
           ORDER BY iwi.id DESC
           LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );

  const data: InventoryWarehouseItemDetailDto[] = rows.map((r) => {
    const detail: InventoryWarehouseItemDetailDto = {
      inventory_warehouse_item_id: Number(r.id),
      inventory_warehouse_id: Number(r.inventory_warehouse_id),
      inventory_item_id: Number(r.inventory_item_id),
      first_inventory_warehouse_order_item_id:
        r.first_inventory_warehouse_order_item_id != null ? Number(r.first_inventory_warehouse_order_item_id) : null,
      order_product_id: r.order_product_id != null ? Number(r.order_product_id) : null,
      scan_code: r.scan_code,
      currency_id: Number(r.currency_id),
      item_state: r.item_state,
      assign_note: r.assign_note,
      date_assigned: r.date_assigned,
      date_updated: r.date_updated,
      date_created: r.date_created,
      warehouse: {
        inventory_warehouse_id: Number(r.wh_id),
        parent_inventory_warehouse_id: r.wh_parent_id != null ? Number(r.wh_parent_id) : null,
        client_store_id: r.wh_store_id != null ? Number(r.wh_store_id) : null,
        inventory_warehouse_name: r.wh_name,
        inventory_warehouse_phone_number: r.wh_phone,
        inventory_warehouse_address: r.wh_addr,
        inventory_warehouse_type: r.wh_type,
        is_check_needed: Boolean(r.wh_check_needed),
        is_disabled: Boolean(r.wh_disabled),
        date_created: r.wh_date_created,
      },
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
      created_staff: r.created_staff_name
        ? { user_id: Number(r.created_staff_id), full_name: r.created_staff_name, avatar_url: null }
        : null,
      assigned_staff:
        r.assigned_staff_id && r.assigned_staff_name
          ? {
              user_id: Number(r.assigned_staff_id),
              full_name: r.assigned_staff_name,
              avatar_url: r.assigned_staff_avatar
                ? `https://wingslashes.com/upload/user/${r.assigned_staff_id}/${r.assigned_staff_avatar}`
                : null,
            }
          : null,
    };
    if (includePrice) {
      detail.retail_price = Math.round(Number(r.retail_price || 0));
    }
    return detail;
  });

  return { success: true, data, page: { total, page, limit } };
}
