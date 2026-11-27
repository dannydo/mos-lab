import type { FastifyInstance } from 'fastify';
import {
  getVisibleMobileCheckStates,
  getVisibleMobileScannerModes,
  type InventoryAssignRequest,
  type InventoryCheckTab,
  type InventoryScanRequest,
} from '@mos-lab/shared';
import { resolveInventoryAuthContext, resolveInventorySseAuthContext } from './services/inventory-auth.service.js';
import {
  finishInventoryCheck,
  getCheckPhysicalItems,
  getCheckScanData,
  resetInventoryCheck,
} from './services/inventory-check.service.js';
import { getInventoryDbMeta } from './services/inventory-db.js';
import { serveInventoryScanMedia } from './services/inventory-media.service.js';
import { listInventoryWarehouses, listOnboardStaff } from './services/inventory-query.service.js';
import { processInventoryScanCode } from './services/inventory-scan.service.js';
import { inventorySseBroker } from './services/inventory-sse.service.js';
import { assignWarehouseItemToStaff, getWarehouseItemHistory } from './services/inventory-state.service.js';
import { inventoryAdminRoutes } from './routes-admin.js';

interface HttpErrorLike {
  statusCode?: number;
  message?: string;
}

export async function inventoryRoutes(fastify: FastifyInstance): Promise<void> {
  await inventoryAdminRoutes(fastify);
  fastify.get('/inventory/me/permissions', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    return reply.send({
      success: true,
      actor: {
        crmStaffId: ctx.crmStaffId,
        legacyUserId: ctx.actorLegacyUserId,
        displayName: ctx.auth.displayName || ctx.auth.username || 'Admin',
        effectiveGroupId: ctx.effectiveGroupId,
        effectiveStoreId: ctx.clientStoreId,
        allowedStoreIds: ctx.allowedStoreIds,
        isClientConsultant: ctx.isClientConsultant,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      },
      database: getInventoryDbMeta(),
      permissions: ctx.permissions,
      visibleScannerModes: getVisibleMobileScannerModes(ctx.permissions, ctx.isClientConsultant),
      visibleCheckStates: getVisibleMobileCheckStates(ctx.permissions, ctx.isClientConsultant),
    });
  });

  fastify.get('/inventory/warehouses', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const query = (request.query || {}) as {
      isInternalWarehouse?: string;
      scopedByStore?: string;
      includeDisabled?: string;
      keyword?: string;
    };

    const warehouses = await listInventoryWarehouses(ctx, {
      isInternalWarehouse: query.isInternalWarehouse !== 'false',
      scopedByStore: query.scopedByStore === 'true',
      includeDisabled: query.includeDisabled === 'true',
      keyword: query.keyword,
    });

    return reply.send({ success: true, warehouses });
  });

  fastify.get('/inventory/staff/onboard', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const query = (request.query || {}) as { keyword?: string };
    const staff = await listOnboardStaff(query.keyword);
    return reply.send({ success: true, staff });
  });

  fastify.post('/inventory/scan/code', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventoryScanRequest;
      if (!body.scan_code || !body.type) {
        return reply.status(400).send({ success: false, error: 'Missing scan_code or type' });
      }
      const res = await processInventoryScanCode(ctx, body);
      return reply.send(res);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/scan/code');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Scan failed',
      });
    }
  });

  fastify.post('/inventory/warehouse/item/assign', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventoryAssignRequest;
      if (!body.inventory_warehouse_item_id) {
        return reply.status(400).send({ success: false, error: 'Missing inventory_warehouse_item_id' });
      }
      const res = await assignWarehouseItemToStaff(ctx, body);
      if (!res) {
        return reply.status(404).send({ success: false, error: 'Warehouse item not found' });
      }
      return reply.send(res);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/warehouse/item/assign');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Assign failed',
      });
    }
  });

  fastify.get('/inventory/warehouse/check/scan', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const query = (request.query || {}) as {
        warehouseId?: string;
        itemState?: string;
        tab?: InventoryCheckTab;
        keyword?: string;
      };
      const warehouseId = Number(query.warehouseId || 3);
      const itemState = query.itemState === 'Using' ? 'Using' : 'New';
      const data = await getCheckScanData(ctx, {
        warehouseId,
        itemState,
        tab: query.tab || 'Check',
        keyword: query.keyword,
      });
      return reply.send(data);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in GET /api/inventory/warehouse/check/scan');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Failed to load check scan data',
      });
    }
  });

  fastify.get('/inventory/warehouse/check/items', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const query = (request.query || {}) as {
        checkId?: string;
        inventoryItemId?: string;
        keyword?: string;
        page?: string;
        limit?: string;
      };
      const checkId = Number(query.checkId);
      const inventoryItemId = Number(query.inventoryItemId);
      if (!checkId || !inventoryItemId) {
        return reply.status(400).send({ success: false, error: 'Missing checkId or inventoryItemId' });
      }
      const data = await getCheckPhysicalItems(ctx, {
        checkId,
        inventoryItemId,
        keyword: query.keyword,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 50,
      });
      return reply.send(data);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in GET /api/inventory/warehouse/check/items');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Failed to load physical items',
      });
    }
  });

  fastify.post('/inventory/warehouse/check/finish', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as { checkId?: number; warehouseId?: number; itemState?: 'New' | 'Using' };
      const res = await finishInventoryCheck(ctx, body);
      return reply.send(res);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/warehouse/check/finish');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Finish check failed',
      });
    }
  });

  fastify.post('/inventory/warehouse/check/reset', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as { checkId?: number; warehouseId?: number; itemState?: 'New' | 'Using' };
      const res = await resetInventoryCheck(ctx, body);
      return reply.send(res);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/warehouse/check/reset');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Reset check failed',
      });
    }
  });

  fastify.get('/inventory/warehouse/item/:warehouseItemId/history', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const params = request.params as { warehouseItemId?: string };
      const warehouseItemId = Number(params.warehouseItemId);
      if (!warehouseItemId) {
        return reply.status(400).send({ success: false, error: 'Invalid warehouseItemId' });
      }
      const data = await getWarehouseItemHistory(ctx, warehouseItemId);
      return reply.send({ success: true, ...data });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in GET /api/inventory/warehouse/item/:warehouseItemId/history');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Failed to load item history',
      });
    }
  });

  fastify.get('/inventory/media/scan/:scanCodeId', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    return serveInventoryScanMedia(request, reply);
  });

  fastify.get('/inventory/events', async (request, reply) => {
    const ctx = await resolveInventorySseAuthContext(fastify, request, reply);
    if (!ctx) return;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: new Date().toISOString() })}\n\n`);
    const clientId = inventorySseBroker.subscribe(reply);
    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(': heartbeat\n\n');
      }
    }, 25_000);
    heartbeat.unref();

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      inventorySseBroker.unsubscribe(clientId);
    });
  });
}
