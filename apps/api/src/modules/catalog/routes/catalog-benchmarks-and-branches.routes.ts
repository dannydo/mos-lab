import { FastifyInstance } from 'fastify';
import { requireAuth, requireCatalogAdmin } from '../../../middlewares/auth.js';
import { BranchService } from '../services/branch.service.js';
import { LashBenchmarkService } from '../services/lash-benchmark.service.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerCatalogBenchmarksAndBranchesRoutes(fastify: FastifyInstance) {
  // ═══════════════════════════════════════════════════════════════════════════
  // Lash Type Benchmark Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/catalog/lash-benchmarks — List all benchmarks
   */
  fastify.get('/catalog/lash-benchmarks', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const benchmarks = await LashBenchmarkService.listBenchmarks(fastify);
      return { success: true, data: benchmarks };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/catalog/lash-benchmarks/seed — Auto-calculate & seed from Legacy DB
   */
  fastify.post(
    '/catalog/lash-benchmarks/seed',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (_request, reply) => {
      try {
        const result = await LashBenchmarkService.seedBenchmarks(fastify);
        return {
          success: true,
          message: `Seed hoàn tất: ${result.inserted} mới, ${result.updated} cập nhật, tổng ${result.total} dòng`,
          data: result,
        };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  /**
   * PUT /api/catalog/lash-benchmarks/:id — Admin manual edit
   */
  fastify.put<{
    Params: { id: string };
    Body: { benchmarkMinutes?: number; minMinutes?: number; maxMinutes?: number };
  }>('/catalog/lash-benchmarks/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid ID' });

      const { benchmarkMinutes, minMinutes, maxMinutes } = request.body || {};
      const updateData: Record<string, number> = {};
      if (benchmarkMinutes !== undefined) updateData.benchmarkMinutes = benchmarkMinutes;
      if (minMinutes !== undefined) updateData.minMinutes = minMinutes;
      if (maxMinutes !== undefined) updateData.maxMinutes = maxMinutes;

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ success: false, error: 'No fields to update' });
      }

      const updated = await LashBenchmarkService.updateBenchmark(fastify, id, updateData);
      return { success: true, data: updated };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Branch Management (Catalog Stores) Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  const branchService = new BranchService(fastify);

  /**
   * GET /api/catalog/branches — List all branches with search, filters, pagination
   */
  fastify.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      search?: string;
      isActive?: string;
      onlyHidden?: string;
      storeType?: string;
      includeAll?: string;
    };
  }>('/catalog/branches', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const page = request.query.page ? parseInt(request.query.page, 10) : 1;
      const pageSize = request.query.pageSize ? parseInt(request.query.pageSize, 10) : 20;
      const search = request.query.search;
      const includeAll = request.query.includeAll === 'true' || request.query.isActive === 'all';
      const isActive =
        request.query.isActive !== undefined && request.query.isActive !== 'all'
          ? request.query.isActive === 'true'
          : undefined;
      const onlyHidden = request.query.onlyHidden === 'true';
      const storeType = request.query.storeType as any;

      const result = await branchService.listBranches({
        page,
        pageSize,
        search,
        isActive,
        onlyHidden,
        storeType,
        includeAll,
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message || 'Internal Server Error' });
    }
  });

  /**
   * GET /api/catalog/branches/stats — Overall branch KPI statistics
   */
  fastify.get('/catalog/branches/stats', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const stats = await branchService.getBranchStats();
      return { success: true, data: stats };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/catalog/branches/:id — Get branch detail + staff list
   */
  fastify.get<{ Params: { id: string } }>(
    '/catalog/branches/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

        const branch = await branchService.getBranchById(id);
        if (!branch) return reply.status(404).send({ success: false, error: 'Chi nhánh không tồn tại' });

        return { success: true, data: branch };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Internal Server Error' });
      }
    }
  );

  /**
   * POST /api/catalog/branches — Create a new branch (Admin & Manager)
   */
  fastify.post<{
    Body: {
      code: string;
      name: string;
      nameEn?: string;
      addressMap?: string;
      addressSms?: string;
      addressWeb?: string;
      addressCity?: string;
      sortOrder?: number;
      isActive?: boolean;
      notes?: string;
    };
  }>('/catalog/branches', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const { code, name } = request.body || {};
      if (!code || !code.trim()) {
        return reply.status(400).send({ success: false, error: 'Mã chi nhánh (code) là bắt buộc' });
      }
      if (!name || !name.trim()) {
        return reply.status(400).send({ success: false, error: 'Tên chi nhánh (name) là bắt buộc' });
      }

      const created = await branchService.createBranch(request.body);
      return reply.status(201).send({ success: true, data: created, message: 'Tạo chi nhánh mới thành công' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: error.message || 'Lỗi tạo chi nhánh' });
    }
  });

  /**
   * PUT /api/catalog/branches/:id — Update a branch (Admin & Manager)
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      code?: string;
      name?: string;
      nameEn?: string;
      addressMap?: string;
      addressSms?: string;
      addressWeb?: string;
      addressCity?: string;
      sortOrder?: number;
      isActive?: boolean;
      notes?: string;
    };
  }>('/catalog/branches/:id', { preHandler: [requireAuth, requireCatalogAdmin] }, async (request, reply) => {
    try {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

      const updated = await branchService.updateBranch(id, request.body);
      return { success: true, data: updated, message: 'Cập nhật chi nhánh thành công' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: error.message || 'Lỗi cập nhật chi nhánh' });
    }
  });

  /**
   * PATCH /api/catalog/branches/:id/toggle-active — Toggle active status (Soft delete protection)
   */
  fastify.patch<{ Params: { id: string } }>(
    '/catalog/branches/:id/toggle-active',
    { preHandler: [requireAuth, requireCatalogAdmin] },
    async (request, reply) => {
      try {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) return reply.status(400).send({ success: false, error: 'Invalid Branch ID' });

        const updated = await branchService.toggleActiveBranch(id);
        const statusText = updated.isActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa';
        return { success: true, data: updated, message: `${statusText} chi nhánh '${updated.name}'` };
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ success: false, error: error.message || 'Lỗi chuyển trạng thái chi nhánh' });
      }
    }
  );
}
