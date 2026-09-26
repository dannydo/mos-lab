import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { isAdminOrSuperAdminRole, CareerProgressionConfig } from '@mos-lab/shared';
import { CareerProgressionService } from './career.service.js';

export const careerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Lấy cấu hình lộ trình thăng tiến hiện hành
   * GET /api/career/config
   */
  fastify.get(
    '/career/config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      try {
        const config = await CareerProgressionService.getConfig(fastify);
        return reply.send({ success: true, data: config });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to get career config');
        return reply.status(500).send({ success: false, message: 'Lỗi nạp cấu hình lộ trình thăng tiến' });
      }
    }
  );

  /**
   * Cập nhật cấu hình lộ trình thăng tiến (Chỉ Admin / Super Admin)
   * PUT /api/career/config
   */
  fastify.put<{ Body: Partial<CareerProgressionConfig> }>(
    '/career/config',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      if (!isAdminOrSuperAdminRole(user?.role)) {
        return reply.status(403).send({
          success: false,
          message: 'Chỉ Quản trị viên cấp cao mới có quyền cập nhật cấu hình lộ trình thăng tiến',
        });
      }

      try {
        const updatedConfig = await CareerProgressionService.updateConfig(
          fastify,
          request.body,
          user.name || user.username || `Admin #${user.id}`
        );
        return reply.send({
          success: true,
          message: 'Đã cập nhật cấu hình lộ trình thăng tiến thành công (có hiệu lực tức thì)',
          data: updatedConfig,
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to update career config');
        return reply.status(500).send({ success: false, message: 'Lỗi cập nhật cấu hình lộ trình' });
      }
    }
  );

  /**
   * Xem tiến trình thăng cấp của chính nhân viên đang đăng nhập
   * GET /api/career/my-progression
   */
  fastify.get(
    '/career/my-progression',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const staffId = user?.staffId || user?.id;

      if (!staffId) {
        return reply.status(400).send({ success: false, message: 'Không tìm thấy thông tin tài khoản nhân viên' });
      }

      try {
        const status = await CareerProgressionService.getStaffProgression(fastify, Number(staffId));
        return reply.send({ success: true, data: status });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to get staff progression');
        return reply.status(500).send({ success: false, message: err.message || 'Lỗi kiểm tra tiến trình thăng cấp' });
      }
    }
  );

  /**
   * Xem tiến trình thăng cấp của một nhân viên cụ thể
   * GET /api/career/staff/:staffId
   */
  fastify.get<{ Params: { staffId: string } }>(
    '/career/staff/:staffId',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const staffId = Number(request.params.staffId);
      if (isNaN(staffId) || staffId <= 0) {
        return reply.status(400).send({ success: false, message: 'ID nhân viên không hợp lệ' });
      }

      try {
        const status = await CareerProgressionService.getStaffProgression(fastify, staffId);
        return reply.send({ success: true, data: status });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to get staff career status');
        return reply.status(500).send({ success: false, message: err.message || 'Lỗi truy xuất tiến trình thăng cấp' });
      }
    }
  );

  /**
   * Kích hoạt Ải Trùm Cuối (Bắt đầu 30 ngày thử thách tự tư vấn cho nhân viên)
   * POST /api/career/staff/:staffId/trial
   */
  fastify.post<{ Params: { staffId: string } }>(
    '/career/staff/:staffId/trial',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const staffId = Number(request.params.staffId);

      try {
        const result = await CareerProgressionService.activateTrialGate(fastify, staffId, user?.id || 1);
        return reply.send({
          success: true,
          message: 'Đã mở khóa Ải Trùm Cuối: Bắt đầu 30 ngày thử thách tự tư vấn bán Combo',
          data: result,
        });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to activate trial gate');
        return reply.status(500).send({ success: false, message: 'Lỗi kích hoạt ải thử thách' });
      }
    }
  );

  /**
   * Xác nhận thăng cấp chính thức
   * POST /api/career/staff/:staffId/promote
   */
  fastify.post<{ Params: { staffId: string }; Body: { newRole: any } }>(
    '/career/staff/:staffId/promote',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const staffId = Number(request.params.staffId);
      const newRole = request.body?.newRole;

      if (!newRole) {
        return reply.status(400).send({ success: false, message: 'Vui lòng chỉ định chức danh thăng cấp mới' });
      }

      try {
        const result = await CareerProgressionService.promoteStaff(fastify, staffId, newRole, user?.id || 1);
        return reply.send({
          success: true,
          message: `Chúc mừng! Nhân sự đã thăng cấp thành công lên ${newRole}`,
          data: result,
        });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to promote staff');
        return reply.status(500).send({ success: false, message: 'Lỗi phê duyệt thăng cấp' });
      }
    }
  );

  /**
   * Chuyển sang nhánh Chuyên gia Kỹ thuật Bậc Cao (Master Technician)
   * POST /api/career/staff/:staffId/specialist-path
   */
  fastify.post<{ Params: { staffId: string } }>(
    '/career/staff/:staffId/specialist-path',
    {
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const user = (request as any).user;
      const staffId = Number(request.params.staffId);

      try {
        const result = await CareerProgressionService.switchToSpecialistPath(fastify, staffId, user?.id || 1);
        return reply.send({
          success: true,
          message: 'Đã chuyển thành công sang lộ trình Master Technician (Chuyên gia Kỹ thuật Bậc Cao)',
          data: result,
        });
      } catch (err: any) {
        fastify.log.error({ err, staffId }, 'Failed to switch specialist path');
        return reply.status(500).send({ success: false, message: 'Lỗi chuyển đổi lộ trình chuyên gia' });
      }
    }
  );
};
