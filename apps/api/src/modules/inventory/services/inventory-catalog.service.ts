import type { RowDataPacket } from 'mysql2/promise';
import type {
  InventoryBrandDto,
  InventoryCatalogBrandsResponse,
  InventoryCatalogItemDto,
  InventoryCatalogItemsResponse,
  InventoryItemType,
  InventorySaveBrandRequest,
  InventorySaveItemRequest,
  InventorySaveWarehouseRequest,
  InventoryStoreOptionDto,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { executeInventory, queryInventory, withInventoryTransaction } from './inventory-db.js';
import { mapWarehouseRow } from './inventory-query.service.js';

interface ItemRow extends RowDataPacket {
  id: number;
  inventory_item_code: string;
  inventory_item_type: InventoryItemType;
  inventory_item_unit: string;
  inventory_item_name: string;
  inventory_item_attribute: string | null;
  inventory_item_description: string | null;
  inventory_item_brand_id: number;
  inventory_item_brand: string | null;
  is_used_ignored: number;
  is_disabled: number;
  date_created: string;
}

interface BrandRow extends RowDataPacket {
  id: number;
  inventory_item_brand: string;
  is_temporary: number;
  position: number;
  date_created: string;
}

interface StoreRow extends RowDataPacket {
  client_store_id: number;
  store_name: string;
}

export function generateItemCodeFromName(name: string): string {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const acronym = words
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
    .replace(/[^A-Z0-9]/g, '');
  return acronym || 'ITEM';
}

export async function listCatalogItems(
  ctx: InventoryAuthContext,
  params: {
    inventoryItemType?: InventoryItemType;
    keyword?: string;
    includeDisabled?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<InventoryCatalogItemsResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const offset = (page - 1) * limit;

  const conds = ['ii.client_business_id = ?'];
  const args: unknown[] = [ctx.clientBusinessId];
  if (!params.includeDisabled) {
    conds.push('ii.is_disabled = 0');
  }
  if (params.inventoryItemType) {
    conds.push('ii.inventory_item_type = ?');
    args.push(params.inventoryItemType);
  }
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push(
      '(ii.inventory_item_name LIKE ? OR ii.inventory_item_code LIKE ? OR ii.inventory_item_attribute LIKE ? OR iib.inventory_item_brand LIKE ?)'
    );
    args.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt
     FROM inventory_item ii
     LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
     WHERE ${conds.join(' AND ')}`,
    args
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<ItemRow[]>(
          `SELECT ii.id, ii.inventory_item_code, ii.inventory_item_type, ii.inventory_item_unit,
                  ii.inventory_item_name, ii.inventory_item_attribute, ii.inventory_item_description,
                  ii.inventory_item_brand_id, iib.inventory_item_brand, ii.is_used_ignored,
                  ii.is_disabled, ii.date_created
           FROM inventory_item ii
           LEFT JOIN inventory_item_brand iib ON iib.id = ii.inventory_item_brand_id
           WHERE ${conds.join(' AND ')}
           ORDER BY ii.inventory_item_name ASC, ii.inventory_item_attribute ASC
           LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );

  const data: InventoryCatalogItemDto[] = rows.map((r) => ({
    inventory_item_id: Number(r.id),
    inventory_item_code: r.inventory_item_code,
    inventory_item_type: r.inventory_item_type,
    inventory_item_unit: r.inventory_item_unit,
    inventory_item_name: r.inventory_item_name,
    inventory_item_attribute: r.inventory_item_attribute,
    inventory_item_description: r.inventory_item_description,
    inventory_item_brand_id: Number(r.inventory_item_brand_id),
    inventory_item_brand: r.inventory_item_brand || '',
    is_used_ignored: Boolean(r.is_used_ignored),
    is_disabled: Boolean(r.is_disabled),
    date_created: r.date_created,
  }));

  return { success: true, data, page: { total, page, limit } };
}

export async function saveCatalogItem(
  ctx: InventoryAuthContext,
  payload: InventorySaveItemRequest
): Promise<{ success: boolean; inventory_item_id: number }> {
  const isUpdate = Boolean(payload.inventory_item_id);
  const perm = isUpdate ? 'edit-item' : 'add-item';
  if (!hasInventoryPermission(ctx, perm)) {
    throw Object.assign(new Error(`Không có quyền ${isUpdate ? 'sửa' : 'thêm'} vật tư`), { statusCode: 403 });
  }

  return withInventoryTransaction(async (conn) => {
    const name = String(payload.inventory_item_name || '').trim();
    if (!name) throw Object.assign(new Error('Thiếu tên vật tư'), { statusCode: 400 });

    if (isUpdate) {
      await executeInventory(
        `UPDATE inventory_item
         SET inventory_item_name = ?, inventory_item_type = ?, inventory_item_unit = ?,
             inventory_item_brand_id = ?, inventory_item_attribute = ?,
             inventory_item_description = ?, is_used_ignored = ?, is_disabled = ?
         WHERE id = ?`,
        [
          name,
          payload.inventory_item_type,
          payload.inventory_item_unit,
          Number(payload.inventory_item_brand_id),
          payload.inventory_item_attribute ?? null,
          payload.inventory_item_description ?? null,
          payload.is_used_ignored ? 1 : 0,
          payload.is_disabled ? 1 : 0,
          Number(payload.inventory_item_id),
        ],
        conn
      );
      return { success: true, inventory_item_id: Number(payload.inventory_item_id) };
    }

    let code =
      String(payload.inventory_item_code || '')
        .trim()
        .toUpperCase() || generateItemCodeFromName(name);
    const existingCode = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_item WHERE inventory_item_code = ? LIMIT 1`,
      [code],
      conn
    );
    if (existingCode[0]) {
      code = `${code}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }

    const maxPosRows = await queryInventory<Array<RowDataPacket & { max_pos: number }>>(
      `SELECT COALESCE(MAX(position), 0) AS max_pos FROM inventory_item WHERE client_business_id = ?`,
      [ctx.clientBusinessId],
      conn
    );
    const nextPos = Number(maxPosRows[0]?.max_pos || 0) + 1;

    const ins = await executeInventory(
      `INSERT INTO inventory_item
         (client_id, client_business_id, created_staff_id, inventory_item_brand_id,
          inventory_item_type, inventory_item_unit, inventory_item_code, inventory_item_name,
          inventory_item_description, inventory_item_attribute, position, is_used_ignored,
          is_disabled, date_created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        ctx.clientId,
        ctx.clientBusinessId,
        ctx.actorLegacyUserId,
        Number(payload.inventory_item_brand_id),
        payload.inventory_item_type,
        payload.inventory_item_unit,
        code,
        name,
        payload.inventory_item_description ?? null,
        payload.inventory_item_attribute ?? null,
        nextPos,
        payload.is_used_ignored ? 1 : 0,
        payload.is_disabled ? 1 : 0,
      ],
      conn
    );
    return { success: true, inventory_item_id: Number(ins.insertId) };
  });
}

export async function listCatalogBrands(
  ctx: InventoryAuthContext,
  params: { keyword?: string; page?: number; limit?: number }
): Promise<InventoryCatalogBrandsResponse> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(200, Math.max(1, Number(params.limit || 50)));
  const offset = (page - 1) * limit;

  const conds = ['client_business_id = ?'];
  const args: unknown[] = [ctx.clientBusinessId];
  const kw = String(params.keyword || '').trim();
  if (kw) {
    conds.push('inventory_item_brand LIKE ?');
    args.push(`%${kw}%`);
  }

  const countRows = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
    `SELECT COUNT(*) AS cnt FROM inventory_item_brand WHERE ${conds.join(' AND ')}`,
    args
  );
  const total = Number(countRows[0]?.cnt || 0);

  const rows =
    total === 0
      ? []
      : await queryInventory<BrandRow[]>(
          `SELECT id, inventory_item_brand, is_temporary, position, date_created
           FROM inventory_item_brand
           WHERE ${conds.join(' AND ')}
           ORDER BY inventory_item_brand ASC
           LIMIT ? OFFSET ?`,
          [...args, limit, offset]
        );

  const data: InventoryBrandDto[] = rows.map((r) => ({
    inventory_item_brand_id: Number(r.id),
    inventory_item_brand: r.inventory_item_brand,
    is_temporary: Boolean(r.is_temporary),
    position: Number(r.position || 0),
    date_created: r.date_created,
  }));

  return { success: true, data, page: { total, page, limit } };
}

export async function saveCatalogBrand(
  ctx: InventoryAuthContext,
  payload: InventorySaveBrandRequest
): Promise<{ success: boolean; inventory_item_brand_id: number }> {
  const isUpdate = Boolean(payload.inventory_item_brand_id);
  const perm = isUpdate ? 'edit-item-brand' : 'add-item-brand';
  if (!hasInventoryPermission(ctx, perm)) {
    throw Object.assign(new Error(`Không có quyền ${isUpdate ? 'sửa' : 'thêm'} thương hiệu`), { statusCode: 403 });
  }

  const brandName = String(payload.inventory_item_brand || '').trim();
  if (!brandName) throw Object.assign(new Error('Thiếu tên thương hiệu'), { statusCode: 400 });

  return withInventoryTransaction(async (conn) => {
    const dup = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_item_brand WHERE inventory_item_brand = ? ${isUpdate ? 'AND id != ?' : ''} LIMIT 1`,
      isUpdate ? [brandName, Number(payload.inventory_item_brand_id)] : [brandName],
      conn
    );
    if (dup[0]) {
      throw Object.assign(new Error('Thương hiệu này đã tồn tại'), { statusCode: 409 });
    }

    if (isUpdate) {
      await executeInventory(
        `UPDATE inventory_item_brand SET inventory_item_brand = ?, is_temporary = ?, date_updated = NOW() WHERE id = ?`,
        [brandName, payload.is_temporary ? 1 : 0, Number(payload.inventory_item_brand_id)],
        conn
      );
      return { success: true, inventory_item_brand_id: Number(payload.inventory_item_brand_id) };
    }

    const maxPosRows = await queryInventory<Array<RowDataPacket & { max_pos: number }>>(
      `SELECT COALESCE(MAX(position), 0) AS max_pos FROM inventory_item_brand`,
      [],
      conn
    );
    const ins = await executeInventory(
      `INSERT INTO inventory_item_brand
         (client_id, client_business_id, created_staff_id, inventory_item_brand, is_temporary, position, date_created)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        ctx.clientId,
        ctx.clientBusinessId,
        ctx.actorLegacyUserId,
        brandName,
        payload.is_temporary ? 1 : 0,
        Number(maxPosRows[0]?.max_pos || 0) + 1,
      ],
      conn
    );
    return { success: true, inventory_item_brand_id: Number(ins.insertId) };
  });
}

export async function saveCatalogWarehouse(ctx: InventoryAuthContext, payload: InventorySaveWarehouseRequest) {
  const isUpdate = Boolean(payload.inventory_warehouse_id);
  const perm = isUpdate ? 'edit-warehouse' : 'add-warehouse';
  if (!hasInventoryPermission(ctx, perm)) {
    throw Object.assign(new Error(`Không có quyền ${isUpdate ? 'sửa' : 'thêm'} kho`), { statusCode: 403 });
  }

  const whName = String(payload.inventory_warehouse_name || '').trim();
  if (!whName) throw Object.assign(new Error('Thiếu tên kho'), { statusCode: 400 });

  return withInventoryTransaction(async (conn) => {
    const nowSec = Math.floor(Date.now() / 1000);
    let id: number;
    if (isUpdate) {
      id = Number(payload.inventory_warehouse_id);
      await executeInventory(
        `UPDATE inventory_warehouse
         SET client_store_id = ?, inventory_warehouse_name = ?, inventory_warehouse_phone_number = ?,
             inventory_warehouse_address = ?, inventory_warehouse_type = ?,
             is_check_needed = ?, is_disabled = ?, date_updated = ?
         WHERE id = ?`,
        [
          payload.client_store_id ?? null,
          whName,
          payload.inventory_warehouse_phone_number ?? null,
          payload.inventory_warehouse_address ?? null,
          payload.inventory_warehouse_type,
          payload.is_check_needed ? 1 : 0,
          payload.is_disabled ? 1 : 0,
          nowSec,
          id,
        ],
        conn
      );
    } else {
      const ins = await executeInventory(
        `INSERT INTO inventory_warehouse
           (client_id, client_business_id, client_store_id, inventory_warehouse_name,
            inventory_warehouse_phone_number, inventory_warehouse_address, inventory_warehouse_type,
            is_check_needed, is_disabled, date_updated, date_created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          ctx.clientId,
          ctx.clientBusinessId,
          payload.client_store_id ?? null,
          whName,
          payload.inventory_warehouse_phone_number ?? null,
          payload.inventory_warehouse_address ?? null,
          payload.inventory_warehouse_type,
          payload.is_check_needed ? 1 : 0,
          payload.is_disabled ? 1 : 0,
          nowSec,
        ],
        conn
      );
      id = Number(ins.insertId);
    }
    const rows = await queryInventory<RowDataPacket[]>(
      `SELECT * FROM inventory_warehouse WHERE id = ? LIMIT 1`,
      [id],
      conn
    );
    return { success: true, warehouse: mapWarehouseRow(rows[0] as never) };
  });
}

export async function listClientStores(ctx: InventoryAuthContext): Promise<InventoryStoreOptionDto[]> {
  const rows = await queryInventory<StoreRow[]>(
    `SELECT cs.id AS client_store_id, COALESCE(csl.client_store_name, cs.client_store_key) AS store_name
     FROM client_store cs
     LEFT JOIN client_store_language csl ON csl.client_store_id = cs.id AND csl.language_id = 1
     WHERE cs.client_business_id = ? AND cs.is_disabled = 0
     ORDER BY cs.position ASC, cs.id ASC`,
    [ctx.clientBusinessId]
  );
  return rows.map((r) => ({ client_store_id: Number(r.client_store_id), store_name: r.store_name }));
}
