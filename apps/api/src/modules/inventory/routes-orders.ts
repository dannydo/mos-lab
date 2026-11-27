import type { FastifyInstance } from 'fastify';
import type { InventoryItemState, InventoryItemType, InventorySaveOrderRequest } from '@mos-lab/shared';
import { resolveInventoryAuthContext } from './services/inventory-auth.service.js';
import {
  addOrderItemQuantity,
  checkAllOrderItems,
  deleteOrderItem,
  importCheckedOrderItems,
  saveWarehouseOrder,
  selectActiveOrderForAssign,
  transitionWarehouseOrderState,
} from './services/inventory-order-mutation.service.js';
import {
  getMergedOrdersPreview,
  getWarehouseItemStocks,
  getWarehouseOrderDetail,
  listOrderPhysicalItems,
  listWarehouseOrders,
  lookupScanCodeByFirstOrderItemId,
} from './services/inventory-order-query.service.js';
import {
  getItemScanCodePrintData,
  getOrderScanCodePrintData,
  getWarehouseCheckPrintData,
  getWarehouseReportPrintData,
} from './services/inventory-print.service.js';

interface HttpErrorLike {
  statusCode?: number;
  message?: string;
}

function parseIdsParam(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function inventoryOrderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/inventory/warehouse/orders', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const q = (request.query || {}) as {
        tab?: 'pending' | 'completed' | 'all';
        warehouseIds?: string;
        dateFrom?: string;
        dateTo?: string;
        keyword?: string;
        page?: string;
        limit?: string;
      };
      const whIds = parseIdsParam(q.warehouseIds);
      return reply.send(
        await listWarehouseOrders(ctx, {
          tab: q.tab || 'pending',
          warehouseIds: whIds.length > 0 ? whIds : undefined,
          dateFrom: q.dateFrom,
          dateTo: q.dateTo,
          keyword: q.keyword,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 20,
        })
      );
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Failed to load orders' });
    }
  });

  fastify.get('/inventory/warehouse/orders/merge-preview', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const q = (request.query || {}) as { orderIds?: string };
      return reply.send(await getMergedOrdersPreview(ctx, parseIdsParam(q.orderIds)));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Merge preview failed' });
    }
  });

  fastify.get('/inventory/warehouse/orders/:orderId', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      const q = (request.query || {}) as {
        mode?: 'assign' | 'check' | 'edit' | 'forward' | 'missing' | 'print-invoice';
        keyword?: string;
      };
      return reply.send(await getWarehouseOrderDetail(ctx, Number(orderId), { mode: q.mode, keyword: q.keyword }));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Failed to load order detail' });
    }
  });

  fastify.get('/inventory/warehouse/orders/:orderId/items', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      const q = (request.query || {}) as { inventoryItemId?: string; keyword?: string; page?: string; limit?: string };
      return reply.send(
        await listOrderPhysicalItems(ctx, {
          orderId: Number(orderId),
          inventoryItemId: q.inventoryItemId ? Number(q.inventoryItemId) : undefined,
          keyword: q.keyword,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 20,
        })
      );
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Failed to load order items' });
    }
  });

  fastify.post('/inventory/warehouse/orders', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const body = (request.body || {}) as InventorySaveOrderRequest;
      return reply.send(await saveWarehouseOrder(ctx, body));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Failed to save order' });
    }
  });

  const bindTransition = (path: string, state: 'Approved' | 'Rejected' | 'Assigned' | 'Cancelled' | 'Imported') => {
    fastify.post(path, async (request, reply) => {
      const ctx = await resolveInventoryAuthContext(fastify, request, reply);
      if (!ctx) return;
      try {
        const { orderId } = request.params as { orderId: string };
        const body = (request.body || {}) as { reject_reason?: string };
        return reply.send(
          await transitionWarehouseOrderState(ctx, Number(orderId), state, { rejectReason: body.reject_reason })
        );
      } catch (error: unknown) {
        const err = error as HttpErrorLike;
        return reply
          .status(err?.statusCode || 500)
          .send({ success: false, error: err?.message || `Failed transition ${state}` });
      }
    });
  };

  bindTransition('/inventory/warehouse/orders/:orderId/approve', 'Approved');
  bindTransition('/inventory/warehouse/orders/:orderId/reject', 'Rejected');
  bindTransition('/inventory/warehouse/orders/:orderId/assign', 'Assigned');
  bindTransition('/inventory/warehouse/orders/:orderId/cancel', 'Cancelled');
  bindTransition('/inventory/warehouse/orders/:orderId/finish', 'Imported');

  fastify.post('/inventory/warehouse/orders/:orderId/select', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      return reply.send({ success: true, ...(await selectActiveOrderForAssign(ctx, Number(orderId))) });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Select order failed' });
    }
  });

  fastify.post('/inventory/warehouse/orders/:orderId/input-all', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      return reply.send(await checkAllOrderItems(ctx, Number(orderId)));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Input all failed' });
    }
  });

  fastify.post('/inventory/warehouse/orders/:orderId/import', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      return reply.send(await importCheckedOrderItems(ctx, Number(orderId)));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Import order failed' });
    }
  });

  fastify.post('/inventory/warehouse/orders/item/delete', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const body = (request.body || {}) as {
        inventory_warehouse_order_item_id?: number;
        inventory_warehouse_order_id?: number;
        inventory_item_id?: number;
      };
      return reply.send(
        await deleteOrderItem(ctx, {
          orderItemId: body.inventory_warehouse_order_item_id,
          orderId: body.inventory_warehouse_order_id,
          inventoryItemId: body.inventory_item_id,
        })
      );
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Delete order item failed' });
    }
  });

  fastify.post('/inventory/warehouse/orders/item/add-quantity', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const body = (request.body || {}) as { inventory_warehouse_order_item_id: number; quantity: number };
      return reply.send({
        success: true,
        ...(await addOrderItemQuantity(ctx, Number(body.inventory_warehouse_order_item_id), Number(body.quantity))),
      });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Add quantity failed' });
    }
  });

  fastify.post('/inventory/warehouse/items/stocks', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const body = (request.body || {}) as {
        inventory_warehouse_id: number;
        inventory_item_ids: number[];
        item_state?: InventoryItemState;
      };
      const stocks = await getWarehouseItemStocks(
        Number(body.inventory_warehouse_id),
        body.inventory_item_ids || [],
        body.item_state || 'New'
      );
      return reply.send({ success: true, stocks });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Failed to load stock map' });
    }
  });

  fastify.get('/inventory/warehouse/items/lookup-scan-code', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const q = (request.query || {}) as { firstOrderItemId?: string };
      const scanCode = await lookupScanCodeByFirstOrderItemId(ctx, Number(q.firstOrderItemId));
      return reply.send({ success: true, scan_code: scanCode });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Lookup scan code failed' });
    }
  });

  fastify.get('/inventory/print/order/:orderId/labels', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { orderId } = request.params as { orderId: string };
      const q = (request.query || {}) as { itemId?: string };
      return reply.send(await getOrderScanCodePrintData(ctx, Number(orderId), q.itemId ? Number(q.itemId) : undefined));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Load order labels failed' });
    }
  });

  fastify.get('/inventory/print/items/labels', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const q = (request.query || {}) as { ids?: string };
      return reply.send(await getItemScanCodePrintData(ctx, parseIdsParam(q.ids)));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Load item labels failed' });
    }
  });

  fastify.get('/inventory/print/check/:checkId', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const { checkId } = request.params as { checkId: string };
      const q = (request.query || {}) as { isLost?: string };
      return reply.send(
        await getWarehouseCheckPrintData(ctx, Number(checkId), q.isLost === '1' || q.isLost === 'true')
      );
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Load check print failed' });
    }
  });

  fastify.get('/inventory/print/warehouse-report', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    try {
      const q = (request.query || {}) as {
        warehouseId?: string;
        inventoryItemType?: InventoryItemType;
        dateFrom?: string;
        dateTo?: string;
        keyword?: string;
      };
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      ).padStart(2, '0')}`;
      return reply.send(
        await getWarehouseReportPrintData(ctx, {
          warehouseId: q.warehouseId ? Number(q.warehouseId) : undefined,
          inventoryItemType: q.inventoryItemType,
          dateFrom: q.dateFrom || firstDay,
          dateTo: q.dateTo || lastDay,
          keyword: q.keyword,
        })
      );
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Load warehouse report print failed' });
    }
  });
}
