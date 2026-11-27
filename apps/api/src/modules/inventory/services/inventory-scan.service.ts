import type { RowDataPacket } from 'mysql2/promise';
import {
  INVENTORY_ITEM_AVAILABLE_STATES,
  INVENTORY_SCAN_MODE_ALIASES,
  type InventoryPermissionAction,
  type InventoryScanMode,
  type InventoryScanRequest,
  type InventoryScanResponse,
} from '@mos-lab/shared';
import { hasInventoryPermission, hasWarehousePermission, type InventoryAuthContext } from './inventory-auth.service.js';
import { executeInventory, queryInventory, withInventoryTransaction } from './inventory-db.js';
import { scanInventoryCheckItem } from './inventory-check.service.js';
import { saveInventoryScanPhoto } from './inventory-media.service.js';
import { buildItemStateMessage, getWarehouseItemDetail } from './inventory-query.service.js';
import { inventorySseBroker } from './inventory-sse.service.js';
import { updateItemStateByScanCode } from './inventory-state.service.js';

interface RawScanItemRow extends RowDataPacket {
  id: number;
  inventory_warehouse_id: number;
  inventory_item_id: number;
  scan_code: string;
  currency_id: number;
  retail_price: number;
  item_state: string;
}

interface OrderItemRow extends RowDataPacket {
  id: number;
  inventory_warehouse_order_id: number;
  to_inventory_warehouse_id: number;
  from_inventory_warehouse_item_id: number | null;
  date_checked: string | null;
}

interface LabelRow extends RowDataPacket {
  label_value: string;
}

export function normalizeScanCodeInput(rawCode: string): string {
  const trimmed = String(rawCode || '').trim();
  if (!trimmed.includes('/')) return trimmed;
  const parts = trimmed.split('/').filter((segment) => segment.length > 0);
  return parts[parts.length - 1] || trimmed;
}

export function normalizeScanMode(rawMode: string): InventoryScanMode {
  const cleaned = String(rawMode || '').trim();
  return INVENTORY_SCAN_MODE_ALIASES[cleaned] || (cleaned as InventoryScanMode);
}

async function getUpdatedLabelMessage(): Promise<string> {
  const rows = await queryInventory<LabelRow[]>(
    `SELECT sll.label_value
     FROM system_label sl
     INNER JOIN system_label_language sll ON sll.system_label_id = sl.id
     WHERE sl.label_key = 'Updated-Msg' AND sll.language_id = 1
     LIMIT 1`
  );
  return rows[0]?.label_value || 'Cập nhật thành công';
}

async function recordScanAudit(
  ctx: InventoryAuthContext,
  params: {
    method: string;
    entityType: string;
    itemId: number | null;
    scanCode: string;
    isValid: '0' | '1';
    image?: string | null;
  }
): Promise<number> {
  const res = await executeInventory(
    `INSERT INTO user_scan_code
       (client_id, client_business_id, client_store_id, user_id, method, type, item_id, scan_code, is_valid, date_created)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      ctx.clientId,
      ctx.clientBusinessId,
      ctx.clientStoreId,
      ctx.actorLegacyUserId,
      params.method,
      params.entityType,
      params.itemId,
      params.scanCode,
      params.isValid === '1' ? 1 : 0,
    ]
  );

  const scanCodeId = Number(res.insertId);
  if (params.image && scanCodeId > 0) {
    const saved = await saveInventoryScanPhoto(scanCodeId, params.image);
    if (saved) {
      await executeInventory(`UPDATE user_scan_code SET filename = ?, extension = ? WHERE id = ?`, [
        saved.filename,
        saved.extension,
        scanCodeId,
      ]);
    }
  }
  return scanCodeId;
}

async function processInputCheckScan(
  ctx: InventoryAuthContext,
  scanCode: string,
  orderId?: number | null
): Promise<{ isValid: '0' | '1'; orderItemId?: number; message?: string }> {
  const result = await withInventoryTransaction(async (conn) => {
    const rows = orderId
      ? await queryInventory<OrderItemRow[]>(
          `SELECT id, inventory_warehouse_order_id, to_inventory_warehouse_id, from_inventory_warehouse_item_id, date_checked
           FROM inventory_warehouse_order_item
           WHERE inventory_warehouse_order_id = ? AND scan_code = ?
           LIMIT 1`,
          [orderId, scanCode],
          conn
        )
      : await queryInventory<OrderItemRow[]>(
          `SELECT id, inventory_warehouse_order_id, to_inventory_warehouse_id, from_inventory_warehouse_item_id, date_checked
           FROM inventory_warehouse_order_item
           WHERE scan_code = ? AND (date_checked IS NULL OR date_imported IS NULL)
           ORDER BY id DESC LIMIT 1`,
          [scanCode],
          conn
        );

    const orderItem = rows[0];
    if (!orderItem) return { isValid: '0' as const };
    if (!(await hasWarehousePermission(ctx, Number(orderItem.to_inventory_warehouse_id), 'order-check', conn))) {
      return { isValid: '0' as const };
    }

    if (!orderItem.date_checked) {
      await executeInventory(
        `UPDATE inventory_warehouse_order_item SET checked_staff_id = ?, date_checked = NOW() WHERE id = ?`,
        [ctx.actorLegacyUserId, orderItem.id],
        conn
      );
    }
    return {
      isValid: '1' as const,
      orderItemId: Number(orderItem.id),
      orderId: Number(orderItem.inventory_warehouse_order_id),
    };
  });

  if (result.isValid === '1') {
    const msg = await getUpdatedLabelMessage();
    inventorySseBroker.publish('check-update', {
      orderId: result.orderId,
      orderItemId: result.orderItemId,
      mode: 'input-check',
    });
    return { isValid: '1', orderItemId: result.orderItemId, message: msg };
  }
  return { isValid: '0' };
}

async function processOutputAssignScan(
  ctx: InventoryAuthContext,
  scanCode: string,
  requestedOrderId?: number | null
): Promise<{ isValid: '0' | '1'; orderItemId?: number; message?: string }> {
  const result = await withInventoryTransaction(async (conn) => {
    const itemRows = await queryInventory<RawScanItemRow[]>(
      `SELECT id, inventory_warehouse_id, inventory_item_id, scan_code, currency_id, retail_price, item_state
       FROM inventory_warehouse_item
       WHERE scan_code = ? AND item_state = 'New'
       ORDER BY id DESC LIMIT 1`,
      [scanCode],
      conn
    );
    const whItem = itemRows[0];
    if (!whItem) return { isValid: '0' as const };

    let orderId = requestedOrderId ? Number(requestedOrderId) : null;
    if (!orderId) {
      const selRows = await queryInventory<Array<RowDataPacket & { inventory_warehouse_order_id: number }>>(
        `SELECT inventory_warehouse_order_id FROM inventory_warehouse_order_select
         WHERE client_business_id = ? AND created_staff_id = ? ORDER BY id DESC LIMIT 1`,
        [ctx.clientBusinessId, ctx.actorLegacyUserId],
        conn
      );
      orderId = selRows[0] ? Number(selRows[0].inventory_warehouse_order_id) : null;
    }
    if (!orderId) return { isValid: '0' as const };
    if (!(await hasWarehousePermission(ctx, Number(whItem.inventory_warehouse_id), 'order-assign', conn))) {
      return { isValid: '0' as const };
    }

    let orderItems = await queryInventory<Array<RowDataPacket & { id: number; scan_code: string | null }>>(
      `SELECT id, scan_code FROM inventory_warehouse_order_item
       WHERE inventory_warehouse_order_id = ? AND from_inventory_warehouse_id = ?
         AND inventory_item_id = ? AND scan_code = ?
       LIMIT 1`,
      [orderId, whItem.inventory_warehouse_id, whItem.inventory_item_id, whItem.scan_code],
      conn
    );
    if (!orderItems[0]) {
      orderItems = await queryInventory<Array<RowDataPacket & { id: number; scan_code: string | null }>>(
        `SELECT id, scan_code FROM inventory_warehouse_order_item
         WHERE inventory_warehouse_order_id = ? AND from_inventory_warehouse_id = ?
           AND inventory_item_id = ? AND scan_code IS NULL
         ORDER BY id DESC LIMIT 1`,
        [orderId, whItem.inventory_warehouse_id, whItem.inventory_item_id],
        conn
      );
    }

    const oi = orderItems[0];
    if (!oi) return { isValid: '0' as const };

    if (!oi.scan_code) {
      await executeInventory(
        `UPDATE inventory_warehouse_order_item
         SET from_inventory_warehouse_item_id = ?, scan_code = ?, currency_id = ?, retail_price = ?,
             assigned_staff_id = ?, date_assigned = NOW()
         WHERE id = ?`,
        [whItem.id, whItem.scan_code, whItem.currency_id, whItem.retail_price, ctx.actorLegacyUserId, oi.id],
        conn
      );
      await executeInventory(
        `UPDATE inventory_warehouse_order
         SET total_quantity_exported = total_quantity_exported + 1,
             total_retail_price = total_retail_price + ?,
             total_retail_price_exported = total_retail_price_exported + ?
         WHERE id = ?`,
        [whItem.retail_price, whItem.retail_price, orderId],
        conn
      );
    }

    return { isValid: '1' as const, orderId, orderItemId: Number(oi.id), fromItemId: Number(whItem.id) };
  });

  if (result.isValid === '1') {
    const msg = await getUpdatedLabelMessage();
    inventorySseBroker.publish('output-assign', {
      orderId: result.orderId,
      orderItemId: result.orderItemId,
      fromInventoryWarehouseItemId: result.fromItemId,
    });
    return { isValid: '1', orderItemId: result.orderItemId, message: msg };
  }
  return { isValid: '0' };
}

const STATE_MUTATION_MAP: Partial<
  Record<
    InventoryScanMode,
    { targetState: 'Testing' | 'Using' | 'Used' | 'Lost' | 'New' | 'Broken'; perm: InventoryPermissionAction }
  >
> = {
  'item-testing': { targetState: 'Testing', perm: 'item-state-global' },
  'item-using': { targetState: 'Using', perm: 'item-state-using' },
  'item-used': { targetState: 'Used', perm: 'item-state-used' },
  'item-lost': { targetState: 'Lost', perm: 'item-state-global' },
  'item-return': { targetState: 'New', perm: 'item-state-return' },
  'item-broken': { targetState: 'Broken', perm: 'item-state-broken' },
};

export async function processInventoryScanCode(
  ctx: InventoryAuthContext,
  payload: InventoryScanRequest
): Promise<InventoryScanResponse> {
  const scanCode = normalizeScanCodeInput(payload.scan_code);
  const mode = normalizeScanMode(payload.type);
  const includePrice = hasInventoryPermission(ctx, 'view-price');

  let responseItem: InventoryScanResponse['inventory_item'] = { is_valid: '0' };
  let auditEntityType = 'inventory_warehouse_item';
  let auditItemId: number | null = null;

  if (mode === 'item-state') {
    let rows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_item WHERE scan_code = ? ORDER BY id DESC LIMIT 1`,
      [scanCode]
    );
    if (!rows[0] && hasInventoryPermission(ctx, 'item-state-global') && /^\d+$/.test(scanCode)) {
      rows = await queryInventory<Array<RowDataPacket & { id: number }>>(
        `SELECT id FROM inventory_warehouse_item WHERE id = ? LIMIT 1`,
        [Number(scanCode)]
      );
    }
    const detail = rows[0] ? await getWarehouseItemDetail(Number(rows[0].id), includePrice) : null;
    if (detail) {
      auditItemId = detail.inventory_warehouse_item_id;
      responseItem = {
        id: detail.inventory_warehouse_item_id,
        is_valid: '1',
        message: buildItemStateMessage(detail),
      };
    }
  } else if (mode in STATE_MUTATION_MAP) {
    const spec = STATE_MUTATION_MAP[mode]!;
    if (!hasInventoryPermission(ctx, spec.perm) && !hasInventoryPermission(ctx, 'item-state-global')) {
      responseItem = { is_valid: '0', message: 'Not Allowed' };
    } else {
      const { error, item } = await updateItemStateByScanCode(ctx, scanCode, spec.targetState);
      if (item) auditItemId = item.inventory_warehouse_item_id;
      if (!error && item) {
        responseItem = {
          id: item.inventory_warehouse_item_id,
          is_valid: '1',
          message: buildItemStateMessage(item),
        };
      } else {
        responseItem = { is_valid: '0', message: error || 'Error' };
      }
    }
  } else if (mode === 'item-assign-staff') {
    const rows = await queryInventory<Array<RowDataPacket & { id: number; item_state: string }>>(
      `SELECT id, item_state FROM inventory_warehouse_item WHERE scan_code = ? ORDER BY id DESC LIMIT 1`,
      [scanCode]
    );
    if (rows[0]) {
      auditItemId = Number(rows[0].id);
      if ((INVENTORY_ITEM_AVAILABLE_STATES as readonly string[]).includes(rows[0].item_state)) {
        const detail = await getWarehouseItemDetail(Number(rows[0].id), includePrice);
        if (detail) {
          responseItem = {
            ...detail,
            id: detail.inventory_warehouse_item_id,
            is_valid: '1',
          };
        }
      }
    }
  } else if (mode === 'inventory-check') {
    auditEntityType = 'inventory_warehouse_check_item';
    const checkRes = await scanInventoryCheckItem(ctx, scanCode, payload.inventory_warehouse_check_id);
    if (checkRes.checkItemId) {
      auditItemId = checkRes.checkItemId;
      responseItem = {
        id: checkRes.checkItemId,
        is_valid: checkRes.isValid,
        message: checkRes.message,
      };
    }
  } else if (mode === 'input-check') {
    auditEntityType = 'inventory_warehouse_order_item';
    const inputRes = await processInputCheckScan(ctx, scanCode, payload.inventory_warehouse_order_id);
    if (inputRes.orderItemId) {
      auditItemId = inputRes.orderItemId;
      responseItem = { id: inputRes.orderItemId, is_valid: inputRes.isValid, message: inputRes.message };
    }
  } else if (mode === 'output-assign') {
    auditEntityType = 'inventory_warehouse_order_item';
    const assignRes = await processOutputAssignScan(ctx, scanCode, payload.inventory_warehouse_order_id);
    if (assignRes.orderItemId) {
      auditItemId = assignRes.orderItemId;
      responseItem = { id: assignRes.orderItemId, is_valid: assignRes.isValid, message: assignRes.message };
    }
  } else if (mode === 'order-add') {
    const rows = await queryInventory<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM inventory_warehouse_item WHERE scan_code = ? ORDER BY id DESC LIMIT 1`,
      [scanCode]
    );
    const detail = rows[0] ? await getWarehouseItemDetail(Number(rows[0].id), includePrice) : null;
    if (detail) {
      auditItemId = detail.inventory_warehouse_item_id;
      const msg = await getUpdatedLabelMessage();
      inventorySseBroker.publish('order-add', { item: detail });
      responseItem = { id: detail.inventory_warehouse_item_id, is_valid: '1', message: msg };
    }
  }

  const scanCodeId = await recordScanAudit(ctx, {
    method: mode,
    entityType: auditEntityType,
    itemId: auditItemId,
    scanCode,
    isValid: responseItem.is_valid,
    image: payload.image,
  });

  return {
    success: true,
    scan_code_id: scanCodeId,
    inventory_item: responseItem,
  };
}
