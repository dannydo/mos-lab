import type { RowDataPacket } from 'mysql2/promise';
import {
  type InventoryOrderDetailResponse,
  type InventoryOrderState,
  type InventorySaveOrderLineInput,
  type InventorySaveOrderRequest,
} from '@mos-lab/shared';
import { hasInventoryPermission, type InventoryAuthContext } from './inventory-auth.service.js';
import {
  executeInventory,
  queryInventory,
  withInventoryTransaction,
  type InventoryDbConnection,
} from './inventory-db.js';
import { getWarehouseOrderDetail } from './inventory-order-query.service.js';

export {
  checkAllOrderItems,
  importCheckedOrderItems,
  selectActiveOrderForAssign,
  transitionWarehouseOrderState,
} from './inventory-order-transition.service.js';

export interface OrderHeaderRow extends RowDataPacket {
  id: number;
  client_id: number;
  client_business_id: number;
  created_staff_id: number | null;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  order_state: InventoryOrderState;
  is_internal: number;
}

export interface OrderItemInsertRow extends RowDataPacket {
  id: number;
  client_id: number;
  client_business_id: number;
  created_staff_id: number | null;
  inventory_warehouse_order_id: number;
  from_inventory_warehouse_id: number | null;
  to_inventory_warehouse_id: number;
  inventory_item_id: number;
  from_inventory_warehouse_item_id: number | null;
  scan_code: string | null;
  currency_id: number;
  retail_price: number;
}

export interface WarehouseItemRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  scan_code: string;
  currency_id: number;
  retail_price: number;
  first_inventory_warehouse_order_item_id: number | null;
}

export function forbidden(msg: string): Error & { statusCode: number } {
  const err = new Error(msg) as Error & { statusCode: number };
  err.statusCode = 403;
  return err;
}

export function badRequest(msg: string): Error & { statusCode: number } {
  const err = new Error(msg) as Error & { statusCode: number };
  err.statusCode = 400;
  return err;
}

function randomScanCode16(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 16; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export async function generateUniqueOrderScanCode(conn: InventoryDbConnection): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomScanCode16();
    const exists = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_order_item WHERE scan_code = ? LIMIT 1`,
      [code],
      conn
    );
    if (!exists[0]) return code;
  }
  throw new Error('Failed to generate unique scan code');
}

export async function recalculateOrderTotals(orderId: number, conn: InventoryDbConnection): Promise<void> {
  await executeInventory(
    `UPDATE inventory_warehouse_order o
     SET o.total_quantity = COALESCE((SELECT COUNT(*) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_quantity_exported = COALESCE((SELECT COUNT(i.date_assigned) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_quantity_imported = COALESCE((SELECT COUNT(i.date_imported) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_retail_price = COALESCE((SELECT SUM(i.retail_price) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_retail_price_exported = COALESCE((SELECT SUM(IF(i.date_assigned IS NOT NULL, i.retail_price, 0)) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_retail_price_imported = COALESCE((SELECT SUM(IF(i.date_imported IS NOT NULL, i.retail_price, 0)) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.total_retail_price_estimated = COALESCE((SELECT SUM(i.retail_price_estimated) FROM inventory_warehouse_order_item i WHERE i.inventory_warehouse_order_id = o.id), 0),
         o.date_updated = NOW()
     WHERE o.id = ?`,
    [orderId],
    conn
  );
}

export async function recordOrderStateInTx(
  ctx: InventoryAuthContext,
  orderId: number,
  targetState: InventoryOrderState,
  opts: { rejectReason?: string } = {},
  conn: InventoryDbConnection
): Promise<void> {
  const existingState = await queryInventory<Array<RowDataPacket & { id: number }>>(
    `SELECT id FROM inventory_warehouse_order_state WHERE inventory_warehouse_order_id = ? AND order_state = ? LIMIT 1`,
    [orderId, targetState],
    conn
  );
  if (existingState[0]) {
    await executeInventory(
      `UPDATE inventory_warehouse_order_state SET created_staff_id = ?, date_updated = NOW() WHERE id = ?`,
      [ctx.actorLegacyUserId, existingState[0].id],
      conn
    );
  } else {
    await executeInventory(
      `INSERT INTO inventory_warehouse_order_state (created_staff_id, inventory_warehouse_order_id, order_state, date_created)
       VALUES (?, ?, ?, NOW())`,
      [ctx.actorLegacyUserId, orderId, targetState],
      conn
    );
  }

  const sets = ['order_state = ?', 'date_updated = NOW()'];
  const args: unknown[] = [targetState];
  if (targetState === 'Approved') {
    sets.push('approved_staff_id = ?', 'date_approved = NOW()');
    args.push(ctx.actorLegacyUserId);
  } else if (targetState === 'Assigned') {
    sets.push('assigned_staff_id = ?', 'date_assigned = NOW()');
    args.push(ctx.actorLegacyUserId);
  } else if (targetState === 'Imported') {
    sets.push('imported_staff_id = ?', 'date_imported = NOW()');
    args.push(ctx.actorLegacyUserId);
  } else if (targetState === 'Rejected' && opts.rejectReason != null) {
    sets.push('reject_reason = ?');
    args.push(opts.rejectReason.trim());
  }

  await executeInventory(
    `UPDATE inventory_warehouse_order SET ${sets.join(', ')} WHERE id = ?`,
    [...args, orderId],
    conn
  );
}

export async function saveWarehouseOrder(
  ctx: InventoryAuthContext,
  payload: InventorySaveOrderRequest
): Promise<InventoryOrderDetailResponse> {
  if (!payload.to_inventory_warehouse_id || !payload.description?.trim()) {
    throw badRequest('Thiếu kho nhận hoặc lý do xuất/nhập kho');
  }
  if (!payload.is_forward_mode && (!Array.isArray(payload.inventory_item) || payload.inventory_item.length === 0)) {
    throw badRequest('Phiếu phải có ít nhất 1 dòng vật tư');
  }

  const orderId = await withInventoryTransaction(async (conn) => {
    let resolvedOrderId =
      payload.inventory_warehouse_order_id && !payload.is_forward_mode && !payload.is_missing_item_mode
        ? Number(payload.inventory_warehouse_order_id)
        : 0;
    const parentOrderId =
      payload.inventory_warehouse_order_id && (payload.is_forward_mode || payload.is_missing_item_mode)
        ? Number(payload.inventory_warehouse_order_id)
        : null;

    const isInternal = Boolean(payload.is_internal);
    const fromWhId = payload.from_inventory_warehouse_id || null;
    const toWhId = Number(payload.to_inventory_warehouse_id);
    const whMetaRows = await queryInventory<Array<RowDataPacket & { client_id: number; client_business_id: number }>>(
      `SELECT client_id, client_business_id FROM inventory_warehouse WHERE id = ? LIMIT 1`,
      [toWhId],
      conn
    );
    const effectiveClientId = Number(whMetaRows[0]?.client_id || ctx.clientId);
    const effectiveClientBusinessId = Number(whMetaRows[0]?.client_business_id || ctx.clientBusinessId);

    if (resolvedOrderId > 0) {
      const existing = await queryInventory<OrderHeaderRow[]>(
        `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
        [resolvedOrderId],
        conn
      );
      if (!existing[0]) throw badRequest('Không tìm thấy phiếu kho để cập nhật');
      if (existing[0].order_state !== 'New' && !hasInventoryPermission(ctx, 'edit-order-global')) {
        throw forbidden('Chỉ được sửa phiếu ở trạng thái New');
      }
      await executeInventory(
        `UPDATE inventory_warehouse_order
         SET from_inventory_warehouse_id = ?, to_inventory_warehouse_id = ?, description = ?, is_internal = ?, date_updated = NOW()
         WHERE id = ?`,
        [fromWhId, toWhId, payload.description.trim(), isInternal ? 1 : 0, resolvedOrderId],
        conn
      );
      await executeInventory(
        `DELETE FROM inventory_warehouse_order_item WHERE inventory_warehouse_order_id = ?`,
        [resolvedOrderId],
        conn
      );
    } else {
      const ins = await executeInventory(
        `INSERT INTO inventory_warehouse_order
           (client_id, client_business_id, created_staff_id, parent_inventory_warehouse_order_id,
            from_inventory_warehouse_id, to_inventory_warehouse_id,
            total_quantity, total_quantity_exported, total_quantity_imported,
            total_retail_price, total_retail_price_exported, total_retail_price_imported, total_retail_price_estimated,
            description, order_state, is_internal, date_created)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, 'New', ?, NOW())`,
        [
          effectiveClientId,
          effectiveClientBusinessId,
          ctx.actorLegacyUserId,
          parentOrderId,
          fromWhId,
          toWhId,
          payload.description.trim(),
          isInternal ? 1 : 0,
        ],
        conn
      );
      resolvedOrderId = Number(ins.insertId);
      await recordOrderStateInTx(ctx, resolvedOrderId, 'New', {}, conn);
    }

    const linesToExpand: InventorySaveOrderLineInput[] =
      payload.is_forward_mode && parentOrderId
        ? (
            await queryInventory<
              Array<
                RowDataPacket & {
                  to_inventory_warehouse_item_id: number;
                  inventory_item_id: number;
                  retail_price: number;
                }
              >
            >(
              `SELECT to_inventory_warehouse_item_id, inventory_item_id, retail_price
             FROM inventory_warehouse_order_item
             WHERE inventory_warehouse_order_id = ? AND date_imported IS NOT NULL AND to_inventory_warehouse_item_id IS NOT NULL
             ORDER BY id ASC`,
              [parentOrderId],
              conn
            )
          ).map((r): InventorySaveOrderLineInput => ({
            from_inventory_warehouse_item_id: Number(r.to_inventory_warehouse_item_id),
            from_inventory_warehouse_id: fromWhId,
            inventory_item_id: Number(r.inventory_item_id),
            quantity: 1,
            retail_price: Number(r.retail_price || 0),
            retail_price_estimated: 0,
            description: null,
          }))
        : payload.inventory_item;

    const fromWhSeen = new Set<number>();
    for (const line of linesToExpand) {
      const qty = Math.max(1, Math.floor(Number(line.quantity || 1)));
      const estRows = await queryInventory<Array<RowDataPacket & { last_retail_price: number }>>(
        `SELECT last_retail_price FROM report_inventory_warehouse_item
         WHERE inventory_warehouse_id = ? AND inventory_item_id = ?
         ORDER BY date DESC LIMIT 1`,
        [toWhId, line.inventory_item_id],
        conn
      );
      const estimatedPrice = Number(estRows[0]?.last_retail_price ?? line.retail_price_estimated ?? 0);

      let lineFromWhId = line.from_inventory_warehouse_id ?? fromWhId;
      let lineItemId = Number(line.inventory_item_id);
      let lineScanCode: string | null = null;
      let lineCurrencyId = 2;
      let linePrice = Number(line.retail_price || 0);
      let lineFromWhItemId: number | null = line.from_inventory_warehouse_item_id
        ? Number(line.from_inventory_warehouse_item_id)
        : null;

      if (lineFromWhItemId) {
        const whItems = await queryInventory<WarehouseItemRow[]>(
          `SELECT id, inventory_warehouse_id, inventory_item_id, scan_code, currency_id, retail_price
           FROM inventory_warehouse_item WHERE id = ? LIMIT 1`,
          [lineFromWhItemId],
          conn
        );
        if (whItems[0]) {
          lineFromWhId = Number(whItems[0].inventory_warehouse_id);
          lineItemId = Number(whItems[0].inventory_item_id);
          lineScanCode = whItems[0].scan_code;
          lineCurrencyId = Number(whItems[0].currency_id || 2);
          linePrice = Number(whItems[0].retail_price || 0);
        } else {
          lineFromWhItemId = null;
        }
      }

      if (lineFromWhId) fromWhSeen.add(Number(lineFromWhId));

      for (let i = 0; i < qty; i += 1) {
        await executeInventory(
          `INSERT INTO inventory_warehouse_order_item
             (client_id, client_business_id, created_staff_id, assigned_staff_id, checked_staff_id,
              inventory_warehouse_order_id, from_inventory_warehouse_id, to_inventory_warehouse_id,
              inventory_item_id, from_inventory_warehouse_item_id, scan_code, currency_id,
              retail_price, retail_price_estimated, description, date_assigned, date_checked, date_created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${payload.is_forward_mode ? 'NOW()' : lineFromWhItemId ? 'NOW()' : 'NULL'}, ${payload.is_forward_mode ? 'NOW()' : 'NULL'}, NOW())`,
          [
            effectiveClientId,
            effectiveClientBusinessId,
            ctx.actorLegacyUserId,
            payload.is_forward_mode || lineFromWhItemId ? ctx.actorLegacyUserId : null,
            payload.is_forward_mode ? ctx.actorLegacyUserId : null,
            resolvedOrderId,
            lineFromWhId,
            toWhId,
            lineItemId,
            lineFromWhItemId,
            lineScanCode,
            lineCurrencyId,
            linePrice,
            estimatedPrice,
            line.description || null,
          ],
          conn
        );
      }
    }

    if (!fromWhId && fromWhSeen.size === 1) {
      const singleFromWh = [...fromWhSeen][0]!;
      const whRows = await queryInventory<Array<RowDataPacket & { client_store_id: number | null }>>(
        `SELECT client_store_id FROM inventory_warehouse WHERE id = ? LIMIT 1`,
        [singleFromWh],
        conn
      );
      if (whRows[0]?.client_store_id) {
        await executeInventory(
          `UPDATE inventory_warehouse_order SET from_inventory_warehouse_id = ?, is_internal = 1 WHERE id = ?`,
          [singleFromWh, resolvedOrderId],
          conn
        );
      }
    }

    if (payload.is_forward_mode) {
      await recordOrderStateInTx(ctx, resolvedOrderId, 'Approved', {}, conn);
      await recordOrderStateInTx(ctx, resolvedOrderId, 'Assigned', {}, conn);
    }

    await recalculateOrderTotals(resolvedOrderId, conn);
    return resolvedOrderId;
  });

  return getWarehouseOrderDetail(ctx, orderId, { mode: 'check' });
}

export async function deleteOrderItem(
  ctx: InventoryAuthContext,
  params: { orderItemId?: number; orderId?: number; inventoryItemId?: number }
): Promise<{ success: boolean }> {
  await withInventoryTransaction(async (conn) => {
    let targetOrderId = params.orderId || 0;
    if (params.orderItemId) {
      const r = await queryInventory<Array<RowDataPacket & { inventory_warehouse_order_id: number }>>(
        `SELECT inventory_warehouse_order_id FROM inventory_warehouse_order_item WHERE id = ? LIMIT 1`,
        [params.orderItemId],
        conn
      );
      if (!r[0]) throw badRequest('Không tìm thấy dòng vật tư');
      targetOrderId = Number(r[0].inventory_warehouse_order_id);
    }
    if (!targetOrderId) throw badRequest('Thiếu mã phiếu kho');

    const hdr = await queryInventory<OrderHeaderRow[]>(
      `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
      [targetOrderId],
      conn
    );
    if (!hdr[0]) throw badRequest('Không tìm thấy phiếu kho');
    if (hdr[0].order_state !== 'New' && !hasInventoryPermission(ctx, 'edit-order-global')) {
      throw forbidden('Chỉ Admin kho mới được xóa dòng khi phiếu không còn New');
    }

    if (params.orderItemId) {
      await executeInventory(`DELETE FROM inventory_warehouse_order_item WHERE id = ?`, [params.orderItemId], conn);
    } else if (params.inventoryItemId) {
      await executeInventory(
        `DELETE FROM inventory_warehouse_order_item WHERE inventory_warehouse_order_id = ? AND inventory_item_id = ?`,
        [targetOrderId, params.inventoryItemId],
        conn
      );
    }
    await recalculateOrderTotals(targetOrderId, conn);
  });
  return { success: true };
}

export async function addOrderItemQuantity(
  ctx: InventoryAuthContext,
  orderItemId: number,
  quantity: number
): Promise<{ quantity: number; retail_price: number }> {
  const qty = Math.floor(Number(quantity || 0));
  if (qty <= 0 || qty > 500) throw badRequest('Số lượng thêm phải từ 1 đến 500');

  return withInventoryTransaction(async (conn) => {
    const srcRows = await queryInventory<OrderItemInsertRow[]>(
      `SELECT * FROM inventory_warehouse_order_item WHERE id = ? LIMIT 1`,
      [orderItemId],
      conn
    );
    const src = srcRows[0];
    if (!src) throw badRequest('Không tìm thấy dòng vật tư gốc');

    const hdr = await queryInventory<OrderHeaderRow[]>(
      `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
      [src.inventory_warehouse_order_id],
      conn
    );
    if (!hdr[0] || (hdr[0].order_state !== 'New' && !hasInventoryPermission(ctx, 'edit-order-global'))) {
      throw forbidden('Không được phép thêm số lượng ở trạng thái phiếu này');
    }

    const estRows = await queryInventory<Array<RowDataPacket & { last_retail_price: number }>>(
      `SELECT last_retail_price FROM report_inventory_warehouse_item WHERE inventory_warehouse_id = ? AND inventory_item_id = ? ORDER BY date DESC LIMIT 1`,
      [src.to_inventory_warehouse_id, src.inventory_item_id],
      conn
    );
    const est = Number(estRows[0]?.last_retail_price || 0);

    for (let i = 0; i < qty; i += 1) {
      const code = await generateUniqueOrderScanCode(conn);
      await executeInventory(
        `INSERT INTO inventory_warehouse_order_item
           (client_id, client_business_id, created_staff_id, inventory_warehouse_order_id,
            from_inventory_warehouse_id, to_inventory_warehouse_id, inventory_item_id,
            scan_code, currency_id, retail_price, retail_price_estimated, description, date_created)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          src.client_id,
          src.client_business_id,
          ctx.actorLegacyUserId,
          src.inventory_warehouse_order_id,
          src.from_inventory_warehouse_id,
          src.to_inventory_warehouse_id,
          src.inventory_item_id,
          code,
          src.currency_id || 2,
          src.retail_price,
          est,
          src.description,
        ],
        conn
      );
    }
    await recalculateOrderTotals(src.inventory_warehouse_order_id, conn);
    return { quantity: qty, retail_price: Math.round(qty * Number(src.retail_price || 0)) };
  });
}

export async function deleteOrderCascadeForTest(orderId: number): Promise<void> {
  await withInventoryTransaction(async (conn) => {
    await executeInventory(
      `DELETE FROM inventory_warehouse_order_item WHERE inventory_warehouse_order_id = ?`,
      [orderId],
      conn
    );
    await executeInventory(
      `DELETE FROM inventory_warehouse_order_state WHERE inventory_warehouse_order_id = ?`,
      [orderId],
      conn
    );
    await executeInventory(
      `DELETE FROM inventory_warehouse_order_select WHERE inventory_warehouse_order_id = ?`,
      [orderId],
      conn
    );
    await executeInventory(`DELETE FROM inventory_warehouse_order WHERE id = ?`, [orderId], conn);
  });
}
