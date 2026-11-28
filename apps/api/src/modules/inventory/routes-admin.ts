import type { FastifyInstance } from 'fastify';
import type {
  InventoryCheckState,
  InventoryItemLimitUpdateRequest,
  InventoryItemState,
  InventoryItemType,
  InventoryLifecycleMode,
  InventorySaveBrandRequest,
  InventorySaveItemRequest,
  InventorySaveWarehouseRequest,
} from '@mos-lab/shared';
import {
  approveOrCancelWarehouseCheck,
  listScanLogs,
  listWarehouseChecks,
  listWarehouseItemLimits,
  upsertOrDeleteWarehouseItemLimit,
} from './services/inventory-admin-ops.service.js';
import { resolveInventoryAuthContext } from './services/inventory-auth.service.js';
import {
  listCatalogBrands,
  listCatalogItems,
  listClientStores,
  saveCatalogBrand,
  saveCatalogItem,
  saveCatalogWarehouse,
} from './services/inventory-catalog.service.js';
import { getWarehouseItemLifecycle, getWarehouseItemsDrilldown } from './services/inventory-lifecycle.service.js';

interface HttpErrorLike {
  statusCode?: number;
  message?: string;
}

function parseIdsParam(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

export async function inventoryAdminRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/inventory/warehouse/items/lifecycle', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const q = (request.query || {}) as {
        inventoryItemType?: InventoryItemType;
        warehouseIds?: string;
        dateFrom?: string;
        dateTo?: string;
        forecastMonth?: string;
        keyword?: string;
        page?: string;
        limit?: string;
      };
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0');

      const data = await getWarehouseItemLifecycle(ctx, {
        inventoryItemType: q.inventoryItemType,
        warehouseIds: parseIdsParam(q.warehouseIds),
        dateFrom: q.dateFrom || `${ym}-01`,
        dateTo: q.dateTo || `${ym}-${lastDay}`,
        forecastMonth: q.forecastMonth ? Number(q.forecastMonth) : 1,
        keyword: q.keyword,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      });
      return reply.send(data);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in GET /api/inventory/warehouse/items/lifecycle');
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Query failed' });
    }
  });

  fastify.get('/inventory/warehouse/items', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const q = (request.query || {}) as {
        itemMode?: InventoryLifecycleMode;
        warehouseIds?: string;
        inventoryItemId?: string;
        inventoryItemType?: InventoryItemType;
        itemState?: InventoryItemState;
        isAssignedStaff?: string;
        keyword?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: string;
        limit?: string;
      };
      const data = await getWarehouseItemsDrilldown(ctx, {
        itemMode: q.itemMode,
        warehouseIds: parseIdsParam(q.warehouseIds),
        inventoryItemId: q.inventoryItemId ? Number(q.inventoryItemId) : undefined,
        inventoryItemType: q.inventoryItemType,
        itemState: q.itemState,
        isAssignedStaff: q.isAssignedStaff === 'true',
        keyword: q.keyword,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      });
      return reply.send(data);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in GET /api/inventory/warehouse/items');
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Query failed' });
    }
  });

  fastify.get('/inventory/warehouse/limits', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const q = (request.query || {}) as {
      warehouseId?: string;
      itemState?: 'New' | 'Using';
      inventoryItemType?: InventoryItemType;
      keyword?: string;
      page?: string;
      limit?: string;
    };
    return reply.send(
      await listWarehouseItemLimits(ctx, {
        warehouseId: q.warehouseId ? Number(q.warehouseId) : undefined,
        itemState: q.itemState,
        inventoryItemType: q.inventoryItemType,
        keyword: q.keyword,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      })
    );
  });

  fastify.post('/inventory/warehouse/limits', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventoryItemLimitUpdateRequest;
      if (!body.inventory_warehouse_id || !body.inventory_item_id) {
        return reply.status(400).send({ success: false, error: 'Missing inventory_warehouse_id or inventory_item_id' });
      }
      return reply.send(await upsertOrDeleteWarehouseItemLimit(ctx, body));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Save limit failed' });
    }
  });

  fastify.get('/inventory/warehouse/checks', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const q = (request.query || {}) as {
      warehouseId?: string;
      itemState?: 'New' | 'Using';
      checkState?: InventoryCheckState;
      page?: string;
      limit?: string;
    };
    return reply.send(
      await listWarehouseChecks(ctx, {
        warehouseId: q.warehouseId ? Number(q.warehouseId) : undefined,
        itemState: q.itemState,
        checkState: q.checkState,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      })
    );
  });

  fastify.post('/inventory/warehouse/check/:checkId/complete', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const checkId = Number((request.params as { checkId?: string }).checkId);
      if (!checkId) return reply.status(400).send({ success: false, error: 'Invalid checkId' });
      return reply.send(await approveOrCancelWarehouseCheck(ctx, checkId, 'Completed'));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Approve check failed' });
    }
  });

  fastify.post('/inventory/warehouse/check/:checkId/cancel', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const checkId = Number((request.params as { checkId?: string }).checkId);
      if (!checkId) return reply.status(400).send({ success: false, error: 'Invalid checkId' });
      return reply.send(await approveOrCancelWarehouseCheck(ctx, checkId, 'Cancelled'));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Cancel check failed' });
    }
  });

  fastify.get('/inventory/scan-logs', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const q = (request.query || {}) as {
      dateFrom?: string;
      dateTo?: string;
      method?: string;
      clientStoreId?: string;
      isValid?: string;
      keyword?: string;
      page?: string;
      limit?: string;
    };
    return reply.send(
      await listScanLogs(ctx, {
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        method: q.method,
        clientStoreId: q.clientStoreId ? Number(q.clientStoreId) : undefined,
        isValid: q.isValid,
        keyword: q.keyword,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      })
    );
  });

  fastify.get('/inventory/catalog/items', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const q = (request.query || {}) as {
      inventoryItemType?: InventoryItemType;
      keyword?: string;
      includeDisabled?: string;
      page?: string;
      limit?: string;
    };
    return reply.send(
      await listCatalogItems(ctx, {
        inventoryItemType: q.inventoryItemType,
        keyword: q.keyword,
        includeDisabled: q.includeDisabled === 'true',
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      })
    );
  });

  fastify.post('/inventory/catalog/items', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventorySaveItemRequest;
      return reply.send(await saveCatalogItem(ctx, body));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Save item failed' });
    }
  });

  fastify.get('/inventory/catalog/brands', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    const q = (request.query || {}) as { keyword?: string; page?: string; limit?: string };
    return reply.send(
      await listCatalogBrands(ctx, {
        keyword: q.keyword,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 50,
      })
    );
  });

  fastify.post('/inventory/catalog/brands', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventorySaveBrandRequest;
      return reply.send(await saveCatalogBrand(ctx, body));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply.status(err?.statusCode || 500).send({ success: false, error: err?.message || 'Save brand failed' });
    }
  });

  fastify.post('/inventory/catalog/warehouses', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    try {
      const body = (request.body || {}) as InventorySaveWarehouseRequest;
      return reply.send(await saveCatalogWarehouse(ctx, body));
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      return reply
        .status(err?.statusCode || 500)
        .send({ success: false, error: err?.message || 'Save warehouse failed' });
    }
  });

  fastify.get('/inventory/stores', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;
    return reply.send({ success: true, stores: await listClientStores(ctx) });
  });
}
