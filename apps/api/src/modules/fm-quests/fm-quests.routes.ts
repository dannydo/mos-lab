import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  canAccessFmSimulator,
  canManageFmQuests,
  canSubmitFmDinner,
  type ReviewFmTeamDinnerRequest,
  type SaveFmQuestsConfigRequest,
  type SettleFmWeeklyQuestRequest,
  type SubmitFmQuestProofRequest,
  type SubmitFmTeamDinnerRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../middlewares/auth.js';
import {
  FmQuestError,
  getFmQuestsOverview,
  reviewFmTeamDinner,
  saveFmQuestsConfig,
  settleFmWeeklyQuest,
  submitFmQuestProof,
  submitFmTeamDinner,
} from './fm-quests.service.js';

function actorFromRequest(request: { user?: { id: number; displayName?: string; username?: string; role?: string } }) {
  return {
    id: Number(request.user?.id || 0),
    name: request.user?.displayName || request.user?.username || `Staff #${request.user?.id || 0}`,
    role: String(request.user?.role || ''),
  };
}

function handleError(fastify: FastifyInstance, reply: any, err: unknown, fallback: string) {
  if (err instanceof FmQuestError) {
    return reply.status(err.statusCode).send({ success: false, message: err.message });
  }
  const statusCode = Number((err as { statusCode?: number })?.statusCode || 0);
  if (statusCode >= 400 && statusCode < 500) {
    return reply.status(statusCode).send({ success: false, message: (err as Error).message });
  }
  fastify.log.error({ err }, fallback);
  return reply.status(500).send({ success: false, message: fallback });
}

export const fmQuestRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get<{ Querystring: { branch?: string; weekKey?: string; monthKey?: string } }>(
    '/fm-quests/overview',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      const allowed =
        canAccessFmSimulator(actor.role) || canManageFmQuests(actor.role) || canSubmitFmDinner(actor.role);
      if (!allowed) {
        return reply.status(403).send({
          success: false,
          message: 'Tài khoản không thuộc nhóm được phép xem Weekly Quest & Tiệc Tháng FM.',
        });
      }
      try {
        const data = await getFmQuestsOverview(fastify, actor, request.query || {});
        return reply.send({ success: true, data });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi tải dữ liệu Weekly Quest & Quỹ Shop');
      }
    }
  );

  fastify.put<{ Body: SaveFmQuestsConfigRequest }>(
    '/fm-quests/config',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      try {
        const data = await saveFmQuestsConfig(fastify, actor, request.body);
        return reply.send({
          success: true,
          message: 'Đã lưu cấu hình Weekly Quest FM thành công.',
          data,
        });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi lưu cấu hình Weekly Quest');
      }
    }
  );

  fastify.post<{ Body: SubmitFmQuestProofRequest }>(
    '/fm-quests/proof',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      try {
        const data = await submitFmQuestProof(fastify, actor, request.body);
        return reply.send({
          success: true,
          message: 'Đã ghi nhận minh chứng Weekly Quest.',
          data,
        });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi nộp minh chứng Weekly Quest');
      }
    }
  );

  fastify.post<{ Body: SettleFmWeeklyQuestRequest }>(
    '/fm-quests/settle',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      try {
        const data = await settleFmWeeklyQuest(fastify, actor, request.body);
        return reply.send({
          success: true,
          message: 'Đã chốt Weekly Quest và cộng thưởng vào Quỹ Shop!',
          data,
        });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi chốt thưởng Weekly Quest vào Quỹ Shop');
      }
    }
  );

  fastify.post<{ Body: SubmitFmTeamDinnerRequest }>(
    '/fm-quests/dinners',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      try {
        const data = await submitFmTeamDinner(fastify, actor, request.body);
        return reply.send({
          success: true,
          message: 'Đã nộp check-in Tiệc Tháng chờ HR/CEO duyệt.',
          data,
        });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi nộp báo cáo Tiệc Tháng');
      }
    }
  );

  fastify.post<{ Params: { id: string }; Body: ReviewFmTeamDinnerRequest }>(
    '/fm-quests/dinners/:id/review',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const actor = actorFromRequest(request as any);
      try {
        const data = await reviewFmTeamDinner(fastify, actor, request.params.id, request.body);
        return reply.send({
          success: true,
          message:
            data.status === 'APPROVED' ? 'Đã duyệt Tiệc Tháng & hạch toán Quỹ Shop.' : 'Đã từ chối hồ sơ Tiệc Tháng.',
          data,
        });
      } catch (err) {
        return handleError(fastify, reply, err, 'Lỗi duyệt Tiệc Tháng');
      }
    }
  );
};
