import type { FastifyInstance } from 'fastify';
import type {
  InventoryAutoOrderRequest,
  InventoryJobRunRequest,
  InventoryRegenerateStateRequest,
} from '@mos-lab/shared';
import { hasInventoryPermission, resolveInventoryAuthContext } from './services/inventory-auth.service.js';
import { executeInventoryJob, getInventoryJobsStatus } from './services/inventory-jobs-runner.service.js';

interface HttpErrorLike {
  statusCode?: number;
  message?: string;
}

export async function inventoryJobRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/inventory/jobs', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    if (!hasInventoryPermission(ctx, 'edit-order-global')) {
      return reply.status(403).send({ success: false, error: 'Chỉ Admin mới có quyền xem/chạy Cron Jobs kho' });
    }
    return reply.send(getInventoryJobsStatus());
  });

  fastify.post('/inventory/jobs/:jobKey/run', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    if (!hasInventoryPermission(ctx, 'edit-order-global')) {
      return reply.status(403).send({ success: false, error: 'Không có quyền kích hoạt Cron Job kho' });
    }

    try {
      const { jobKey } = request.params as { jobKey: string };
      const body = (request.body || {}) as InventoryJobRunRequest;
      const result = await executeInventoryJob(ctx, jobKey, body, 'manual');
      return reply.send({ success: true, result });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/jobs/:jobKey/run');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Job execution failed',
      });
    }
  });

  fastify.post('/inventory/warehouse/orders/auto', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    if (!hasInventoryPermission(ctx, 'edit-order-global') && !hasInventoryPermission(ctx, 'order-approve')) {
      return reply.status(403).send({ success: false, error: 'Không có quyền đặt hàng tự động' });
    }

    try {
      const body = (request.body || {}) as InventoryAutoOrderRequest;
      const warehouseId = Number(body.inventory_warehouse_id);
      if (!warehouseId) {
        return reply.status(400).send({ success: false, error: 'Thiếu inventory_warehouse_id' });
      }
      const result = await executeInventoryJob(
        ctx,
        'process-stock-checking',
        { warehouseId, date: body.date, dryRun: Boolean(body.dryRun) },
        'api-legacy'
      );
      return reply.send({ success: true, result });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/warehouse/orders/auto');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Auto order failed',
      });
    }
  });

  fastify.post('/inventory/warehouse/items/state-regenerate', async (request, reply) => {
    const ctx = await resolveInventoryAuthContext(fastify, request, reply);
    if (!ctx) return;

    if (!hasInventoryPermission(ctx, 'edit-order-global')) {
      return reply.status(403).send({ success: false, error: 'Không có quyền tái tạo báo cáo state kho' });
    }

    try {
      const body = (request.body || {}) as InventoryRegenerateStateRequest;
      if (!body.date_to) {
        return reply.status(400).send({ success: false, error: 'Thiếu date_to' });
      }
      const result = await executeInventoryJob(
        ctx,
        'report-warehouse-item-state',
        {
          date: body.date_to,
          warehouseId: body.warehouseId ? Number(body.warehouseId) : undefined,
          dryRun: Boolean(body.dryRun),
          chainDownstream: true,
        },
        'api-legacy'
      );
      return reply.send({ success: true, result });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error in POST /api/inventory/warehouse/items/state-regenerate');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'State regenerate failed',
      });
    }
  });
}
