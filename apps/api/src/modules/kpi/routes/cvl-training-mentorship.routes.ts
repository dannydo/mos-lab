import { FastifyInstance } from 'fastify';
import { CvlTrainingMentorshipConfig, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { CvlTrainingMentorshipService } from '../services/cvl-training-mentorship.service.js';

export async function registerCvlTrainingMentorshipRoutes(fastify: FastifyInstance) {
  fastify.get('/kpi/cvl-training-mentorship/config', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isAdminOrSuperAdminRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin / Super Admin được xem và cấu hình cặp kèm cặp đào tạo CVL.',
      });
    }

    try {
      return await CvlTrainingMentorshipService.getConfigWithStaffOptions(fastify);
    } catch (err) {
      fastify.log.error(err, 'GET /kpi/cvl-training-mentorship/config error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi tải cấu hình cặp đào tạo CVL.',
      });
    }
  });

  fastify.put('/kpi/cvl-training-mentorship/config', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isAdminOrSuperAdminRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin / Super Admin được cập nhật cấu hình cặp kèm cặp đào tạo CVL.',
      });
    }

    const body = request.body as Partial<CvlTrainingMentorshipConfig> | undefined;
    if (!body || typeof body !== 'object' || !Array.isArray(body.pairs)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Danh sách cặp đào tạo CVL không hợp lệ.',
      });
    }

    try {
      const updatedBy = request.user?.displayName || request.user?.username || 'admin';
      const saved = await CvlTrainingMentorshipService.saveConfig(fastify, body, updatedBy);
      const full = await CvlTrainingMentorshipService.getConfigWithStaffOptions(fastify);
      return {
        ...full,
        config: saved,
      };
    } catch (err) {
      fastify.log.error(err, 'PUT /kpi/cvl-training-mentorship/config error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấu hình cặp đào tạo CVL.',
      });
    }
  });
}
