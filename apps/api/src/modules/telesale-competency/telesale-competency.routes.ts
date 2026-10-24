import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js';
import { TelesaleCompetencyService } from './telesale-competency.service.js';
import { TelesaleTier, TelesaleCompetencyGlobalConfig, TelesaleCompetencyConfigVersion } from '@mos-lab/shared';

export const telesaleCompetencyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * -------------------------------------------------------------
   * Quản Lý Cấu Hình Khung Năng Lực & Quản Lý Phiên Bản (MOS-FEAT-142)
   * -------------------------------------------------------------
   */

  /**
   * Lấy danh sách các phiên bản cấu hình
   * GET /api/telesale-competency/config-versions
   */
  fastify.get(
    '/telesale-competency/config-versions',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const versions = await TelesaleCompetencyService.listConfigVersions(fastify);
        return reply.send({ success: true, data: versions });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to list competency config versions');
        return reply.status(500).send({ success: false, message: 'Lỗi tải danh sách phiên bản cấu hình' });
      }
    }
  );

  /**
   * Lấy chi tiết một phiên bản cấu hình
   * GET /api/telesale-competency/config-versions/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/telesale-competency/config-versions/:id',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const version = await TelesaleCompetencyService.getConfigVersion(fastify, id);
        if (!version) {
          return reply.status(404).send({ success: false, message: 'Không tìm thấy phiên bản cấu hình' });
        }
        return reply.send({ success: true, data: version });
      } catch (err: any) {
        fastify.log.error({ err, id }, 'Failed to get config version details');
        return reply.status(500).send({ success: false, message: 'Lỗi tải chi tiết phiên bản cấu hình' });
      }
    }
  );

  /**
   * Tạo bản nháp cấu hình mới (Chỉ Super Admin / Admin)
   * POST /api/telesale-competency/config-versions
   */
  fastify.post<{ Body: Partial<TelesaleCompetencyConfigVersion> }>(
    '/telesale-competency/config-versions',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      const user = (request as any).user;
      try {
        const draft = await TelesaleCompetencyService.createDraftVersion(
          fastify,
          request.body || {},
          { id: user?.id, name: user?.name || user?.username || 'Admin' }
        );
        return reply.send({
          success: true,
          message: `Đã tạo bản nháp "${draft.name}" thành công`,
          data: draft,
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to create draft config version');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi tạo bản nháp cấu hình' });
      }
    }
  );

  /**
   * Cập nhật bản nháp cấu hình
   * PUT /api/telesale-competency/config-versions/:id
   */
  fastify.put<{ Params: { id: string }; Body: Partial<TelesaleCompetencyConfigVersion> }>(
    '/telesale-competency/config-versions/:id',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const updated = await TelesaleCompetencyService.updateDraftVersion(fastify, id, request.body || {});
        return reply.send({
          success: true,
          message: 'Đã cập nhật bản nháp cấu hình thành công',
          data: updated,
        });
      } catch (err: any) {
        fastify.log.error({ err, id }, 'Failed to update draft config version');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi cập nhật bản nháp cấu hình' });
      }
    }
  );

  /**
   * Xóa bản nháp cấu hình
   * DELETE /api/telesale-competency/config-versions/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/telesale-competency/config-versions/:id',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        await TelesaleCompetencyService.deleteDraftVersion(fastify, id);
        return reply.send({
          success: true,
          message: 'Đã xóa bản nháp cấu hình thành công',
        });
      } catch (err: any) {
        fastify.log.error({ err, id }, 'Failed to delete draft config version');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi xóa bản nháp cấu hình' });
      }
    }
  );

  /**
   * Kiểm tra tính hợp lệ của bản nháp trước khi ban hành
   * POST /api/telesale-competency/config-versions/:id/validate
   */
  fastify.post<{ Params: { id: string } }>(
    '/telesale-competency/config-versions/:id/validate',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const target = await TelesaleCompetencyService.getConfigVersion(fastify, id);
        if (!target) {
          return reply.status(404).send({ success: false, message: 'Không tìm thấy phiên bản cấu hình' });
        }
        const validation = TelesaleCompetencyService.validateConfigVersion(target);
        return reply.send({
          success: true,
          data: validation,
        });
      } catch (err: any) {
        fastify.log.error({ err, id }, 'Failed to validate config version');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi kiểm tra tính hợp lệ cấu hình' });
      }
    }
  );

  /**
   * Ban hành chính thức phiên bản cấu hình
   * POST /api/telesale-competency/config-versions/:id/publish
   */
  fastify.post<{ Params: { id: string }; Body: { effectiveDate?: string } }>(
    '/telesale-competency/config-versions/:id/publish',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = (request as any).user;
      const effectiveDate = request.body?.effectiveDate || new Date().toISOString().slice(0, 7);
      try {
        const published = await TelesaleCompetencyService.publishConfigVersion(fastify, id, effectiveDate, {
          id: user?.id,
          name: user?.name || user?.username || 'Admin',
        });
        return reply.send({
          success: true,
          message: `Đã ban hành chính thức phiên bản "${published.name}" áp dụng từ kỳ ${published.effectiveDate}`,
          data: published,
        });
      } catch (err: any) {
        fastify.log.error({ err, id }, 'Failed to publish config version');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi ban hành phiên bản cấu hình' });
      }
    }
  );

  /**
   * Xem trước kết quả tính điểm trước khi áp dụng
   * POST /api/telesale-competency/config-versions/:id/preview
   */
  fastify.post<{ Params: { id: string }; Body: { month?: string } }>(
    '/telesale-competency/config-versions/:id/preview',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const month = request.body?.month || new Date().toISOString().slice(0, 7);
      try {
        const preview = await TelesaleCompetencyService.previewCalculation(fastify, id, month);
        return reply.send({
          success: true,
          data: preview,
        });
      } catch (err: any) {
        fastify.log.error({ err, id, month }, 'Failed to preview config version calculation');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi xem trước kết quả tính điểm' });
      }
    }
  );

  /**
   * Lấy cấu hình Khung Năng Lực Telesale (Legacy Fallback)
   * GET /api/telesale-competency/config
   */
  fastify.get(
    '/telesale-competency/config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const config = await TelesaleCompetencyService.getConfig(fastify);
        return reply.send({ success: true, data: config });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to get telesale competency config');
        return reply.status(500).send({ success: false, message: 'Lỗi tải cấu hình khung năng lực' });
      }
    }
  );

  /**
   * Cập nhật cấu hình Khung Năng Lực (Chỉ Super Admin)
   * PUT /api/telesale-competency/config
   */
  fastify.put<{ Body: Partial<TelesaleCompetencyGlobalConfig> }>(
    '/telesale-competency/config',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      try {
        const updated = await TelesaleCompetencyService.saveConfig(fastify, request.body || {});
        return reply.send({
          success: true,
          message: 'Đã cập nhật cấu hình khung năng lực thành công',
          data: updated,
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to save telesale competency config');
        return reply.status(500).send({ success: false, message: 'Lỗi lưu cấu hình khung năng lực' });
      }
    }
  );

  /**
   * Lấy Ma Trận Năng Lực Toàn Đội
   * GET /api/telesale-competency/matrix?month=YYYY-MM
   */
  fastify.get<{ Querystring: { month?: string } }>(
    '/telesale-competency/matrix',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const month = request.query?.month || new Date().toISOString().slice(0, 7);
      try {
        const matrix = await TelesaleCompetencyService.listTeamMatrix(fastify, month);
        return reply.send({ success: true, data: matrix });
      } catch (err: any) {
        fastify.log.error({ err, month }, 'Failed to list team matrix');
        return reply.status(500).send({ success: false, message: 'Lỗi tải ma trận năng lực đội Telesales' });
      }
    }
  );

  /**
   * Lấy chi tiết hồ sơ đánh giá của 1 nhân viên trong tháng
   * GET /api/telesale-competency/evaluation?staffId=...&month=YYYY-MM
   */
  fastify.get<{ Querystring: { staffId: string; month?: string } }>(
    '/telesale-competency/evaluation',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const staffId = Number(request.query?.staffId);
      const month = request.query?.month || new Date().toISOString().slice(0, 7);

      if (isNaN(staffId) || staffId <= 0) {
        return reply.status(400).send({ success: false, message: 'ID nhân viên không hợp lệ' });
      }

      try {
        const evaluation = await TelesaleCompetencyService.getEvaluation(fastify, staffId, month);
        return reply.send({ success: true, data: evaluation });
      } catch (err: any) {
        fastify.log.error({ err, staffId, month }, 'Failed to get evaluation');
        return reply.status(500).send({ success: false, message: 'Lỗi tải hồ sơ đánh giá năng lực' });
      }
    }
  );

  /**
   * Quản lý lưu kết quả chấm điểm đánh giá
   * POST /api/telesale-competency/evaluation
   */
  fastify.post<{
    Body: {
      staffId: number;
      month: string;
      pillarB: any;
      pillarC: any;
      pillarD: any;
    };
  }>(
    '/telesale-competency/evaluation',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const body = request.body;

      try {
        const result = await TelesaleCompetencyService.saveEvaluation(fastify, {
          staffId: body.staffId,
          month: body.month,
          pillarB: body.pillarB,
          pillarC: body.pillarC,
          pillarD: body.pillarD,
          evaluatedByStaffId: user?.id,
          evaluatedByName: user?.name || user?.username || 'Manager',
        });
        return reply.send({
          success: true,
          message: 'Đã lưu kết quả đánh giá năng lực thành công',
          data: result,
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to save evaluation');
        return reply.status(400).send({ success: false, message: err.message || 'Lỗi lưu đánh giá năng lực' });
      }
    }
  );

  /**
   * Phê duyệt Thăng Bậc / Giáng Bậc chính thức
   * POST /api/telesale-competency/action
   */
  fastify.post<{
    Body: {
      staffId: number;
      action: 'PROMOTED' | 'DEMOTED' | 'RETAINED';
      toTier: TelesaleTier;
      reason?: string;
      effectiveMonth?: string;
    };
  }>(
    '/telesale-competency/action',
    {
      preHandler: [requireAuth, requireSuperAdmin],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const { staffId, action, toTier, reason, effectiveMonth } = request.body || {};

      if (!staffId || !action || !toTier) {
        return reply.status(400).send({ success: false, message: 'Vui lòng cung cấp đầy đủ staffId, action và toTier' });
      }

      try {
        const result = await TelesaleCompetencyService.executePromotionAction(
          fastify,
          staffId,
          action,
          toTier,
          { id: user?.id, name: user?.name || user?.username },
          reason,
          effectiveMonth
        );
        return reply.send({
          success: true,
          message: result.message,
          data: result,
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to execute promotion action');
        return reply.status(500).send({ success: false, message: err.message || 'Lỗi thực hiện phê duyệt thăng/giáng bậc' });
      }
    }
  );

  /**
   * Lấy lịch sử thăng / giáng bậc của nhân viên
   * GET /api/telesale-competency/history?staffId=...
   */
  fastify.get<{ Querystring: { staffId: string } }>(
    '/telesale-competency/history',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const staffId = Number(request.query?.staffId);
      if (isNaN(staffId) || staffId <= 0) {
        return reply.status(400).send({ success: false, message: 'ID nhân viên không hợp lệ' });
      }

      try {
        const history = await TelesaleCompetencyService.getPromotionHistory(fastify, staffId);
        return reply.send({ success: true, data: history });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to get promotion history');
        return reply.status(500).send({ success: false, message: 'Lỗi tải lịch sử thăng/giáng bậc' });
      }
    }
  );
};
