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
      fastify.cache?.invalidatePattern('^kpi:(cv-paystub|cc-xoay):');
      const full = await CvlTrainingMentorshipService.getConfigWithStaffOptions(fastify);
      return {
        ...full,
        config: saved,
      };
    } catch (err: unknown) {
      const typedErr = err as { statusCode?: number; message?: string; validationErrors?: string[] };
      if (typedErr?.statusCode === 400) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: typedErr.message || 'Cấu hình Mentor – Mentee 1-kèm-1 bị trùng lịch.',
          validationErrors: typedErr.validationErrors,
        });
      }
      fastify.log.error(err, 'PUT /kpi/cvl-training-mentorship/config error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi lưu cấu hình cặp đào tạo CVL.',
      });
    }
  });

  fastify.post('/kpi/cvl-training-mentorship/resolve', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isAdminOrSuperAdminRole(request.user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin / Super Admin được chốt kết quả đào tạo CVL.',
      });
    }

    const body = request.body as
      | {
          pairId?: string;
          action?: 'GRADUATE' | 'EXTEND' | 'RETURN_TO_CV';
          newStartDate?: string;
          newEndDate?: string;
          mentorLegacyStaffId?: number;
          mentorDisplayName?: string;
          note?: string;
        }
      | undefined;

    if (!body?.pairId || !body?.action || !['GRADUATE', 'EXTEND', 'RETURN_TO_CV'].includes(body.action)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Thiếu pairId hoặc action hợp lệ (GRADUATE | EXTEND | RETURN_TO_CV).',
      });
    }

    try {
      const actor = {
        id: Number(request.user?.id || 0),
        name: request.user?.displayName || request.user?.username || 'admin',
      };
      const saved = await CvlTrainingMentorshipService.resolveOutcome(
        fastify,
        {
          pairId: body.pairId,
          action: body.action,
          newStartDate: body.newStartDate,
          newEndDate: body.newEndDate,
          mentorLegacyStaffId: body.mentorLegacyStaffId,
          mentorDisplayName: body.mentorDisplayName,
          note: body.note,
        },
        actor
      );
      fastify.cache?.invalidatePattern('^kpi:(cv-paystub|cc-xoay):');
      const full = await CvlTrainingMentorshipService.getConfigWithStaffOptions(fastify);
      return {
        ...full,
        config: saved,
      };
    } catch (err: unknown) {
      const typedErr = err as { statusCode?: number; message?: string; validationErrors?: string[] };
      if (typedErr?.statusCode === 400 || typedErr?.statusCode === 404) {
        return reply.status(typedErr.statusCode).send({
          error: typedErr.statusCode === 404 ? 'Not Found' : 'Bad Request',
          message: typedErr.message || 'Không thể xử lý kết quả đào tạo CVL.',
          validationErrors: typedErr.validationErrors,
        });
      }
      fastify.log.error(err, 'POST /kpi/cvl-training-mentorship/resolve error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi chốt kết quả đào tạo CVL.',
      });
    }
  });
}
