import type { RowDataPacket } from 'mysql2/promise';
import {
  canTransitionInventoryOrderState,
  type InventoryOrderDetailResponse,
  type InventoryOrderState,
} from '@mos-lab/shared';
import { hasInventoryPermission, hasWarehousePermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { executeInventory, queryInventory, withInventoryTransaction } from './inventory-db.js';
import { getWarehouseOrderDetail } from './inventory-order-query.service.js';
import {
  badRequest,
  forbidden,
  generateUniqueOrderScanCode,
  type OrderHeaderRow,
  type OrderItemInsertRow,
  recalculateOrderTotals,
  recordOrderStateInTx,
  type WarehouseItemRow,
} from './inventory-order-mutation.service.js';
import { inventorySseBroker } from './inventory-sse.service.js';

export async function transitionWarehouseOrderState(
  ctx: InventoryAuthContext,
  orderId: number,
  targetState: InventoryOrderState,
  opts: { rejectReason?: string } = {}
): Promise<InventoryOrderDetailResponse> {
  await withInventoryTransaction(async (conn) => {
    const rows = await queryInventory<OrderHeaderRow[]>(
      `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
      [orderId],
      conn
    );
    const order = rows[0];
    if (!order) throw badRequest('Không tìm thấy phiếu kho');

    if (targetState === 'Approved') {
      const ok = order.from_inventory_warehouse_id
        ? await hasWarehousePermission(ctx, Number(order.from_inventory_warehouse_id), 'order-approve', conn)
        : hasInventoryPermission(ctx, 'order-approve-global');
      if (!ok) throw forbidden('Không có quyền duyệt phiếu xuất kho');
    } else if (targetState === 'Rejected') {
      if (!opts.rejectReason?.trim()) throw badRequest('Vui lòng nhập lý do từ chối');
      const ok = order.from_inventory_warehouse_id
        ? await hasWarehousePermission(ctx, Number(order.from_inventory_warehouse_id), 'order-reject', conn)
        : hasInventoryPermission(ctx, 'order-reject-global');
      if (!ok) throw forbidden('Không có quyền từ chối phiếu');
    } else if (targetState === 'Assigned') {
      const ok = order.from_inventory_warehouse_id
        ? await hasWarehousePermission(ctx, Number(order.from_inventory_warehouse_id), 'order-assign', conn)
        : hasInventoryPermission(ctx, 'order-assign-global');
      if (!ok) throw forbidden('Không có quyền xuất kho');
    } else if (targetState === 'Cancelled') {
      const isCreatorCancel =
        order.created_staff_id != null &&
        Number(order.created_staff_id) === ctx.actorLegacyUserId &&
        hasInventoryPermission(ctx, 'cancel-order');
      const ok =
        isCreatorCancel ||
        hasInventoryPermission(ctx, 'cancel-order-global') ||
        (await hasWarehousePermission(ctx, Number(order.to_inventory_warehouse_id), 'cancel-order', conn));
      if (!ok) throw forbidden('Không có quyền hủy phiếu');
    } else if (targetState === 'Imported') {
      const ok = await hasWarehousePermission(ctx, Number(order.to_inventory_warehouse_id), 'order-check', conn);
      if (!ok) throw forbidden('Không có quyền hoàn tất nhập kho');
    }

    if (!canTransitionInventoryOrderState(order.order_state, targetState)) {
      throw badRequest(`Không thể chuyển phiếu từ ${order.order_state} sang ${targetState}`);
    }

    await recordOrderStateInTx(ctx, orderId, targetState, opts, conn);

    if (targetState === 'Approved') {
      if (order.is_internal) {
        const preAssigned = await queryInventory<Array<RowDataPacket & { cnt: number }>>(
          `SELECT COUNT(*) AS cnt FROM inventory_warehouse_order_item
           WHERE inventory_warehouse_order_id = ? AND from_inventory_warehouse_item_id IS NOT NULL`,
          [orderId],
          conn
        );
        if (Number(preAssigned[0]?.cnt || 0) > 0) {
          await executeInventory(
            `UPDATE inventory_warehouse_order_item SET assigned_staff_id = ?, date_assigned = NOW()
             WHERE inventory_warehouse_order_id = ? AND assigned_staff_id IS NULL`,
            [ctx.actorLegacyUserId, orderId],
            conn
          );
          await recordOrderStateInTx(ctx, orderId, 'Assigned', {}, conn);
        }
      } else {
        await recordOrderStateInTx(ctx, orderId, 'Assigned', {}, conn);
        const nullScanRows = await queryInventory<Array<RowDataPacket & { id: number }>>(
          `SELECT id FROM inventory_warehouse_order_item WHERE inventory_warehouse_order_id = ? AND scan_code IS NULL ORDER BY id ASC`,
          [orderId],
          conn
        );
        for (const r of nullScanRows) {
          const code = await generateUniqueOrderScanCode(conn);
          await executeInventory(
            `UPDATE inventory_warehouse_order_item SET scan_code = ? WHERE id = ?`,
            [code, r.id],
            conn
          );
        }
      }
      await recalculateOrderTotals(orderId, conn);
    }
  });

  return getWarehouseOrderDetail(ctx, orderId, { mode: 'check' });
}

export async function selectActiveOrderForAssign(
  ctx: InventoryAuthContext,
  orderId: number
): Promise<{ selected_order_id: number }> {
  const rows = await queryInventory<OrderHeaderRow[]>(
    `SELECT id, client_id, client_business_id FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
    [orderId]
  );
  if (!rows[0]) throw badRequest('Không tìm thấy phiếu kho');
  await executeInventory(
    `INSERT INTO inventory_warehouse_order_select (client_id, client_business_id, created_staff_id, inventory_warehouse_order_id, date_created)
     VALUES (?, ?, ?, ?, NOW())`,
    [rows[0].client_id, rows[0].client_business_id, ctx.actorLegacyUserId, orderId]
  );
  return { selected_order_id: orderId };
}

export async function checkAllOrderItems(
  ctx: InventoryAuthContext,
  orderId: number
): Promise<InventoryOrderDetailResponse> {
  await withInventoryTransaction(async (conn) => {
    const rows = await queryInventory<OrderHeaderRow[]>(
      `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
      [orderId],
      conn
    );
    if (!rows[0]) throw badRequest('Không tìm thấy phiếu kho');
    if (!(await hasWarehousePermission(ctx, Number(rows[0].to_inventory_warehouse_id), 'order-check', conn))) {
      throw forbidden('Không có quyền kiểm hàng cho kho nhận này');
    }
    await executeInventory(
      `UPDATE inventory_warehouse_order_item SET checked_staff_id = ?, date_checked = NOW()
       WHERE inventory_warehouse_order_id = ? AND checked_staff_id IS NULL`,
      [ctx.actorLegacyUserId, orderId],
      conn
    );
  });
  inventorySseBroker.publish('check-update', { orderId, mode: 'input-all' });
  return getWarehouseOrderDetail(ctx, orderId, { mode: 'check' });
}

export async function importCheckedOrderItems(
  ctx: InventoryAuthContext,
  orderId: number
): Promise<InventoryOrderDetailResponse> {
  await withInventoryTransaction(async (conn) => {
    const orderRows = await queryInventory<OrderHeaderRow[]>(
      `SELECT * FROM inventory_warehouse_order WHERE id = ? LIMIT 1`,
      [orderId],
      conn
    );
    const order = orderRows[0];
    if (!order) throw badRequest('Không tìm thấy phiếu kho');
    if (!(await hasWarehousePermission(ctx, Number(order.to_inventory_warehouse_id), 'order-check', conn))) {
      throw forbidden('Không có quyền nhập kho');
    }

    const whRows = await queryInventory<Array<RowDataPacket & { inventory_warehouse_type: string }>>(
      `SELECT inventory_warehouse_type FROM inventory_warehouse WHERE id = ? LIMIT 1`,
      [order.to_inventory_warehouse_id],
      conn
    );
    const isBrokenTarget =
      whRows[0]?.inventory_warehouse_type === 'Destroy' || whRows[0]?.inventory_warehouse_type === 'Return';

    const readyItems = await queryInventory<OrderItemInsertRow[]>(
      `SELECT * FROM inventory_warehouse_order_item
       WHERE inventory_warehouse_order_id = ? AND date_checked IS NOT NULL AND to_inventory_warehouse_item_id IS NULL
       ORDER BY id ASC`,
      [orderId],
      conn
    );

    for (const oi of readyItems) {
      let targetWhItemId = 0;
      if (oi.from_inventory_warehouse_item_id) {
        const srcRows = await queryInventory<WarehouseItemRow[]>(
          `SELECT id, first_inventory_warehouse_order_item_id FROM inventory_warehouse_item WHERE id = ? LIMIT 1`,
          [oi.from_inventory_warehouse_item_id],
          conn
        );
        if (srcRows[0]) {
          targetWhItemId = Number(srcRows[0].id);
          const firstId = srcRows[0].first_inventory_warehouse_order_item_id || oi.id;
          await executeInventory(
            `UPDATE inventory_warehouse_item
             SET inventory_warehouse_id = ?, first_inventory_warehouse_order_item_id = ?, retail_price = ?, date_updated = NOW()
             WHERE id = ?`,
            [order.to_inventory_warehouse_id, firstId, oi.retail_price, targetWhItemId],
            conn
          );
        }
      } else {
        const scanCode = oi.scan_code || (await generateUniqueOrderScanCode(conn));
        const insWh = await executeInventory(
          `INSERT INTO inventory_warehouse_item
             (client_id, client_business_id, created_staff_id, inventory_warehouse_id, inventory_item_id,
              first_inventory_warehouse_order_item_id, scan_code, currency_id, retail_price,
              sale_price, internal_price, item_state, date_created, date_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'New', NOW(), NOW())`,
          [
            oi.client_id,
            oi.client_business_id,
            oi.created_staff_id || ctx.actorLegacyUserId,
            order.to_inventory_warehouse_id,
            oi.inventory_item_id,
            oi.id,
            scanCode,
            oi.currency_id || 2,
            oi.retail_price,
          ],
          conn
        );
        targetWhItemId = Number(insWh.insertId);
        await executeInventory(
          `INSERT INTO inventory_warehouse_item_state
             (client_id, client_business_id, created_staff_id, inventory_warehouse_id, inventory_item_id, inventory_warehouse_item_id, item_state, date_created)
           VALUES (?, ?, ?, ?, ?, ?, 'New', NOW())`,
          [
            oi.client_id,
            oi.client_business_id,
            ctx.actorLegacyUserId,
            order.to_inventory_warehouse_id,
            oi.inventory_item_id,
            targetWhItemId,
          ],
          conn
        );
      }

      if (targetWhItemId > 0) {
        await executeInventory(
          `UPDATE inventory_warehouse_order_item SET to_inventory_warehouse_item_id = ?, imported_staff_id = ?, date_imported = NOW() WHERE id = ?`,
          [targetWhItemId, ctx.actorLegacyUserId, oi.id],
          conn
        );
        if (isBrokenTarget) {
          await executeInventory(
            `UPDATE inventory_warehouse_item SET item_state = 'Broken', date_updated = NOW() WHERE id = ?`,
            [targetWhItemId],
            conn
          );
          await executeInventory(
            `INSERT INTO inventory_warehouse_item_state
               (client_id, client_business_id, created_staff_id, inventory_warehouse_id, inventory_item_id, inventory_warehouse_item_id, item_state, date_created)
             VALUES (?, ?, ?, ?, ?, ?, 'Broken', NOW())`,
            [
              oi.client_id,
              oi.client_business_id,
              ctx.actorLegacyUserId,
              order.to_inventory_warehouse_id,
              oi.inventory_item_id,
              targetWhItemId,
            ],
            conn
          );
        }
      }
    }

    await recalculateOrderTotals(orderId, conn);
  });

  inventorySseBroker.publish('check-update', { orderId, mode: 'import' });
  return getWarehouseOrderDetail(ctx, orderId, { mode: 'check' });
}
