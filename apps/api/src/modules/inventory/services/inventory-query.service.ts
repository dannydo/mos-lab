import type { RowDataPacket } from 'mysql2/promise';
import {
  type InventoryItemSummaryDto,
  type InventoryStaffOptionDto,
  type InventoryWarehouseDto,
  type InventoryWarehouseItemDetailDto,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { queryInventory, type InventoryDbConnection } from './inventory-db.js';

interface WarehouseRow extends RowDataPacket {
  id: number;
  parent_inventory_warehouse_id: number | null;
  client_store_id: number | null;
  inventory_warehouse_name: string;
  inventory_warehouse_phone_number: string | null;
  inventory_warehouse_address: string | null;
  inventory_warehouse_type: InventoryWarehouseDto['inventory_warehouse_type'];
  is_check_needed: number;
  is_disabled: number;
  date_created: string;
}

interface StaffRow extends RowDataPacket {
  user_id: number;
  full_name: string | null;
  username: string | null;
  avatar: string | null;
  avatar_internal: string | null;
  user_group_id: number;
  group_name: string | null;
  client_store_id: number | null;
}

interface WarehouseItemJoinedRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  first_inventory_warehouse_order_item_id: number | null;
  order_product_id: number | null;
  scan_code: string;
  currency_id: number;
  retail_price: number;
  item_state: InventoryWarehouseItemDetailDto['item_state'];
  assign_note: string | null;
  date_assigned: string | null;
  date_updated: string | null;
  date_created: string;
  created_staff_id: number;
  assigned_staff_id: number | null;
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
  item_type: InventoryItemSummaryDto['inventory_item_type'];
  item_unit: string;
  item_attribute: string | null;
  item_brand_id: number;
  item_brand_name: string | null;
  created_staff_name: string | null;
  created_staff_avatar: string | null;
  assigned_staff_name: string | null;
  assigned_staff_avatar: string | null;
}

function buildStaffAvatarUrl(userId: number, avatarInternal: string | null, avatar: string | null): string | null {
  const filename = avatarInternal || avatar;
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `https://wingslashes.com/upload/user/${userId}/${filename}`;
}

export function mapWarehouseRow(row: WarehouseRow): InventoryWarehouseDto {
  return {
    inventory_warehouse_id: Number(row.id),
    parent_inventory_warehouse_id:
      row.parent_inventory_warehouse_id != null ? Number(row.parent_inventory_warehouse_id) : null,
    client_store_id: row.client_store_id != null ? Number(row.client_store_id) : null,
    inventory_warehouse_name: row.inventory_warehouse_name,
    inventory_warehouse_phone_number: row.inventory_warehouse_phone_number,
    inventory_warehouse_address: row.inventory_warehouse_address,
    inventory_warehouse_type: row.inventory_warehouse_type,
    is_check_needed: Boolean(row.is_check_needed),
    is_disabled: Boolean(row.is_disabled),
    date_created: row.date_created,
  };
}

export async function listInventoryWarehouses(
  ctx: InventoryAuthContext,
  options: { isInternalWarehouse?: boolean; scopedByStore?: boolean; includeDisabled?: boolean; keyword?: string }
): Promise<InventoryWarehouseDto[]> {
  const conditions: string[] = ['client_business_id = ?'];
  const params: unknown[] = [ctx.clientBusinessId];

  if (!options.includeDisabled) {
    conditions.push('is_disabled = 0');
  }
  if (options.isInternalWarehouse) {
    conditions.push('client_store_id IS NOT NULL');
  }
  if (options.scopedByStore && !hasInventoryPermission(ctx, 'edit-order-global')) {
    if (ctx.allowedStoreIds.length === 0) {
      return [];
    }
    conditions.push(`client_store_id IN (${ctx.allowedStoreIds.map(() => '?').join(',')})`);
    params.push(...ctx.allowedStoreIds);
  }

  const rows = await queryInventory<WarehouseRow[]>(
    `SELECT id, parent_inventory_warehouse_id, client_store_id, inventory_warehouse_name,
            inventory_warehouse_phone_number, inventory_warehouse_address,
            inventory_warehouse_type, is_check_needed, is_disabled, date_created
     FROM inventory_warehouse
     WHERE ${conditions.join(' AND ')}
     ORDER BY id ASC`,
    params
  );

  const mapped = rows.map(mapWarehouseRow);
  const query = removeVietnameseTones(options.keyword || '').trim();
  if (!query) return mapped;

  return mapped.filter((w) => {
    const haystack = removeVietnameseTones(`${w.inventory_warehouse_name} ${w.inventory_warehouse_address || ''}`);
    return haystack.includes(query);
  });
}

export async function listOnboardStaff(keyword?: string): Promise<InventoryStaffOptionDto[]> {
  const rows = await queryInventory<StaffRow[]>(
    `SELECT u.id AS user_id,
            COALESCE(up.full_name, CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))) AS full_name,
            up.username,
            up.avatar,
            up.avatar_internal,
            up.user_group_id,
            ug.user_group_name AS group_name,
            up.client_store_id
     FROM user u
     INNER JOIN user_profile up ON up.user_id = u.id
     LEFT JOIN user_group ug ON ug.id = up.user_group_id
     WHERE up.provider IN ('Staff', 'Google')
       AND up.is_disabled = 0
       AND up.is_deleted = 0
       AND up.is_leaved = 0
     GROUP BY u.id
     ORDER BY full_name ASC
     LIMIT 300`
  );

  const all: InventoryStaffOptionDto[] = rows
    .filter((r) => Boolean((r.full_name || '').trim()))
    .map((r) => ({
      user_id: Number(r.user_id),
      full_name: String(r.full_name || '').trim(),
      username: r.username,
      avatar_url: buildStaffAvatarUrl(Number(r.user_id), r.avatar_internal, r.avatar),
      user_group_id: Number(r.user_group_id),
      group_name: r.group_name,
      client_store_id: r.client_store_id != null ? Number(r.client_store_id) : null,
    }));

  const normalizedQuery = removeVietnameseTones(keyword || '').trim();
  if (!normalizedQuery) return all;

  return all.filter((s) =>
    removeVietnameseTones(`${s.full_name} ${s.username || ''} ${s.group_name || ''}`).includes(normalizedQuery)
  );
}

export async function getWarehouseItemDetail(
  warehouseItemId: number,
  includePrice: boolean,
  conn?: InventoryDbConnection
): Promise<InventoryWarehouseItemDetailDto | null> {
  const rows = await queryInventory<WarehouseItemJoinedRow[]>(
    `SELECT iwi.id, iwi.inventory_warehouse_id, iwi.inventory_item_id,
            iwi.first_inventory_warehouse_order_item_id, iwi.order_product_id,
            iwi.scan_code, iwi.currency_id, iwi.retail_price, iwi.item_state,
            iwi.assign_note, iwi.date_assigned, iwi.date_updated, iwi.date_created,
            iwi.created_staff_id, iwi.assigned_staff_id,
            iw.parent_inventory_warehouse_id AS wh_parent_id,
            iw.client_store_id AS wh_store_id,
            iw.inventory_warehouse_name AS wh_name,
            iw.inventory_warehouse_phone_number AS wh_phone,
            iw.inventory_warehouse_address AS wh_addr,
            iw.inventory_warehouse_type AS wh_type,
            iw.is_check_needed AS wh_check_needed,
            iw.is_disabled AS wh_disabled,
            iw.date_created AS wh_date_created,
            ii.inventory_item_name AS item_name,
            ii.inventory_item_code AS item_code,
            ii.inventory_item_type AS item_type,
            ii.inventory_item_unit AS item_unit,
            ii.inventory_item_attribute AS item_attribute,
            ii.inventory_item_brand_id AS item_brand_id,
            iib.inventory_item_brand AS item_brand_name,
            cup.full_name AS created_staff_name,
            COALESCE(cup.avatar_internal, cup.avatar) AS created_staff_avatar,
            aup.full_name AS assigned_staff_name,
            COALESCE(aup.avatar_internal, aup.avatar) AS assigned_staff_avatar
     FROM inventory_warehouse_item iwi
     INNER JOIN inventory_warehouse iw ON iw.id = iwi.inventory_warehouse_id
     INNER JOIN inventory_item ii ON ii.id = iwi.inventory_item_id
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     LEFT JOIN user_profile cup ON cup.user_id = iwi.created_staff_id
     LEFT JOIN user_profile aup ON aup.user_id = iwi.assigned_staff_id
     WHERE iwi.id = ?
     LIMIT 1`,
    [warehouseItemId],
    conn
  );

  const row = rows[0];
  if (!row) return null;

  const detail: InventoryWarehouseItemDetailDto = {
    inventory_warehouse_item_id: Number(row.id),
    inventory_warehouse_id: Number(row.inventory_warehouse_id),
    inventory_item_id: Number(row.inventory_item_id),
    first_inventory_warehouse_order_item_id:
      row.first_inventory_warehouse_order_item_id != null ? Number(row.first_inventory_warehouse_order_item_id) : null,
    order_product_id: row.order_product_id != null ? Number(row.order_product_id) : null,
    scan_code: row.scan_code,
    currency_id: Number(row.currency_id),
    item_state: row.item_state,
    assign_note: row.assign_note,
    date_assigned: row.date_assigned,
    date_updated: row.date_updated,
    date_created: row.date_created,
    warehouse: {
      inventory_warehouse_id: Number(row.inventory_warehouse_id),
      parent_inventory_warehouse_id: row.wh_parent_id != null ? Number(row.wh_parent_id) : null,
      client_store_id: row.wh_store_id != null ? Number(row.wh_store_id) : null,
      inventory_warehouse_name: row.wh_name,
      inventory_warehouse_phone_number: row.wh_phone,
      inventory_warehouse_address: row.wh_addr,
      inventory_warehouse_type: row.wh_type,
      is_check_needed: Boolean(row.wh_check_needed),
      is_disabled: Boolean(row.wh_disabled),
      date_created: row.wh_date_created,
    },
    item: {
      inventory_item_id: Number(row.inventory_item_id),
      inventory_item_name: row.item_name,
      inventory_item_code: row.item_code,
      inventory_item_type: row.item_type,
      inventory_item_unit: row.item_unit,
      inventory_item_attribute: row.item_attribute,
      inventory_item_brand_id: Number(row.item_brand_id),
      inventory_item_brand: row.item_brand_name || '',
    },
    created_staff: row.created_staff_name
      ? {
          user_id: Number(row.created_staff_id),
          full_name: row.created_staff_name,
          avatar_url: buildStaffAvatarUrl(Number(row.created_staff_id), row.created_staff_avatar, null),
        }
      : null,
    assigned_staff:
      row.assigned_staff_id && row.assigned_staff_name
        ? {
            user_id: Number(row.assigned_staff_id),
            full_name: row.assigned_staff_name,
            avatar_url: buildStaffAvatarUrl(Number(row.assigned_staff_id), row.assigned_staff_avatar, null),
          }
        : null,
  };

  if (includePrice) {
    detail.retail_price = Number(row.retail_price || 0);
  }

  return detail;
}

/**
 * Exact format of PHP `InventoryWarehouseItem::getItemStateMessage`.
 */
export function buildItemStateMessage(detail: InventoryWarehouseItemDetailDto): string {
  const lines = [
    `${detail.item_state} - ${detail.date_created}`,
    `${detail.warehouse.inventory_warehouse_name} - ${detail.first_inventory_warehouse_order_item_id ?? ''}`,
  ];

  if (detail.assigned_staff) {
    lines.push(`${detail.assigned_staff.full_name} - ${detail.date_assigned ?? ''}`);
  }

  return lines.join('\n');
}
