import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type CreateSocialPostSubmissionDto,
  type ReviewSocialPostDto,
  type SocialPostLeaderboardPeriod,
  type SocialPostLeaderboardQuery,
  type SocialPostPageQuery,
  type SocialPostRewardConfig,
  type SocialPostReviewStatus,
} from '@mos-lab/shared';
import { requireAuth, requireCampaignAdmin } from '../../middlewares/auth.js';
import { getAcademyWorkspaceAccess } from '../academy-sales/academy-sales.service.js';
import { PostHubService } from './post-hub.service.js';

const REVIEW_STATUSES = new Set<SocialPostReviewStatus>(['PENDING', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED']);
const REPORTING_PERIODS = new Set<SocialPostLeaderboardPeriod>(['DAY', 'WEEK', 'MONTH']);
const FILTERABLE_SOURCE_PLATFORMS = new Set(['FACEBOOK', 'TIKTOK']);

async function requirePostHubAcademyAccess(request: FastifyRequest, reply: FastifyReply) {
  const access = await getAcademyWorkspaceAccess(request.server, {
    id: request.user.id,
    role: request.user.role,
    displayName: request.user.displayName,
    email: request.user.email,
  });
  if (!access.canAccess) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ Admin hoặc thành viên đang hoạt động của đội Academy được truy cập Chiến Thần.',
    });
  }
}

export async function postHubRoutes(fastify: FastifyInstance) {
  fastify.get('/post-hub/reward-config', { preHandler: [requireAuth, requirePostHubAcademyAccess] }, async () => {
    return PostHubService.getRewardConfig(fastify.prisma.crm);
  });

  fastify.put(
    '/post-hub/reward-config',
    { preHandler: [requireAuth, requirePostHubAcademyAccess, requireCampaignAdmin] },
    async (request, reply) => {
      try {
        const config = await PostHubService.updateRewardConfig(
          fastify.prisma.crm,
          request.body as SocialPostRewardConfig
        );
        return { success: true, data: config, message: 'Đã lưu cấu hình thưởng đăng bài.' };
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub reward config update failed');
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: error.message || 'Cấu hình thưởng không hợp lệ' });
      }
    }
  );

  fastify.get(
    '/post-hub/submissions',
    { preHandler: [requireAuth, requirePostHubAcademyAccess] },
    async (request, reply) => {
      try {
        const query = request.query as SocialPostPageQuery;
        if (query.reviewStatus && !REVIEW_STATUSES.has(query.reviewStatus)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Trạng thái duyệt không hợp lệ' });
        }
        if (query.period && !REPORTING_PERIODS.has(query.period)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Kỳ báo cáo không hợp lệ' });
        }
        if (query.sourcePlatform && !FILTERABLE_SOURCE_PLATFORMS.has(query.sourcePlatform)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Nền tảng bài đăng không hợp lệ' });
        }
        if (query.authorStaffId !== undefined) {
          const authorStaffId = Number(query.authorStaffId);
          if (!Number.isInteger(authorStaffId) || authorStaffId <= 0) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Người đăng không hợp lệ' });
          }
          query.authorStaffId = authorStaffId;
        }
        return await PostHubService.list(fastify.prisma.crm, query);
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub list failed');
        return reply.status(400).send({ error: 'Bad Request', message: error.message || 'Không thể tải Post Hub' });
      }
    }
  );

  fastify.post(
    '/post-hub/submissions',
    { preHandler: [requireAuth, requirePostHubAcademyAccess] },
    async (request, reply) => {
      try {
        const submission = await PostHubService.createNativeSubmission(
          fastify.prisma.crm,
          request.user.id,
          request.body as CreateSocialPostSubmissionDto
        );
        return {
          success: true as const,
          data: submission,
          message: 'Đã ghi nhận bài đăng trong mOS và chuyển sang hàng chờ duyệt.',
        };
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub native submission failed');
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: error.message || 'Không thể ghi nhận bài đăng' });
      }
    }
  );

  fastify.get(
    '/post-hub/leaderboard',
    { preHandler: [requireAuth, requirePostHubAcademyAccess] },
    async (request, reply) => {
      try {
        const query = request.query as SocialPostLeaderboardQuery;
        if (query.period && !REPORTING_PERIODS.has(query.period)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Kỳ Leaderboard không hợp lệ' });
        }
        return await PostHubService.getCampaignLeaderboard(fastify.prisma.crm, query);
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub leaderboard failed');
        return reply.status(400).send({ error: 'Bad Request', message: error.message || 'Không thể tải Leaderboard' });
      }
    }
  );

  fastify.get(
    '/post-hub/leaderboard/:staffId/daily',
    { preHandler: [requireAuth, requirePostHubAcademyAccess] },
    async (request, reply) => {
      try {
        const staffId = Number((request.params as { staffId: string }).staffId);
        if (!Number.isInteger(staffId) || staffId <= 0) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Mã poster không hợp lệ' });
        }
        const query = request.query as SocialPostLeaderboardQuery;
        if (query.period && !REPORTING_PERIODS.has(query.period)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Kỳ Leaderboard không hợp lệ' });
        }
        return await PostHubService.getPosterDailyRewards(fastify.prisma.crm, staffId, query);
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub poster daily reward failed');
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: error.message || 'Không thể tải điểm Daily của poster' });
      }
    }
  );

  fastify.get(
    '/post-hub/submissions/:id/reward-preview',
    { preHandler: [requireAuth, requirePostHubAcademyAccess] },
    async (request, reply) => {
      try {
        const submissionId = Number((request.params as { id: string }).id);
        if (!Number.isInteger(submissionId) || submissionId <= 0) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Mã bài đăng không hợp lệ' });
        }
        return await PostHubService.getApprovalRewardPreview(fastify.prisma.crm, submissionId);
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub reward preview failed');
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: error.message || 'Không thể xem thưởng dự kiến' });
      }
    }
  );

  fastify.put(
    '/post-hub/submissions/:id/review',
    { preHandler: [requireAuth, requirePostHubAcademyAccess, requireCampaignAdmin] },
    async (request, reply) => {
      try {
        const submissionId = Number((request.params as { id: string }).id);
        const dto = request.body as ReviewSocialPostDto;
        if (!Number.isInteger(submissionId) || submissionId <= 0 || !dto || !REVIEW_STATUSES.has(dto.reviewStatus)) {
          return reply.status(400).send({ error: 'Bad Request', message: 'Quyết định duyệt không hợp lệ' });
        }
        await PostHubService.review(fastify.prisma.crm, submissionId, request.user.id, request.user.displayName, dto);
        return { success: true };
      } catch (error: SafeAny) {
        request.log.error(error, 'Post Hub review failed');
        return reply
          .status(400)
          .send({ error: 'Bad Request', message: error.message || 'Không thể lưu quyết định duyệt' });
      }
    }
  );
}
