import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DisburseProposalRequest,
  RecordExpenseRequest,
  ReconcileAndLockPeriodRequest,
  UpdateFundConfigRequest,
} from '@mos-lab/shared';
import { requireAuth, type JwtUserPayload } from '../../middlewares/auth.js';
import { FundError, FundService, type FundActor } from './fund.service.js';

function getActor(request: FastifyRequest): FundActor {
  const user = request.user as JwtUserPayload & { name?: string; displayName?: string };
  return {
    id: Number(user?.id || 1),
    name: user?.displayName || user?.name || user?.username || 'Quản Trị Viên',
    role: user?.role,
  };
}

function handleFundError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, action: string) {
  if (error instanceof FundError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.name,
      message: error.message,
    });
  }
  fastify.log.error(error as Error, action);
  return reply.status(500).send({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: (error as Error)?.message || 'Lỗi xử lý nghiệp vụ Quỹ Hoạt Động Nội Bộ.',
  });
}

export async function fundRoutes(fastify: FastifyInstance) {
  // 1. Danh sách Quỹ
  fastify.get('/funds', { preHandler: [requireAuth] }, async (_req, reply) => {
    try {
      const data = await FundService.listFunds(fastify.prisma.crm);
      return reply.send({ success: true, data });
    } catch (err) {
      return handleFundError(fastify, reply, err, 'funds:list');
    }
  });

  // 2. Chi tiết & Tổng quan một Quỹ
  fastify.get<{ Params: { fundId: string } }>(
    '/funds/:fundId',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const data = await FundService.getFundOverview(fastify.prisma.crm, request.params.fundId);
        return reply.send({ success: true, data });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:overview');
      }
    }
  );

  // 3. Ghi nhận Chi tiêu (Nạp Card Telesale)
  fastify.post<{ Params: { fundId: string }; Body: RecordExpenseRequest }>(
    '/funds/:fundId/expense',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const result = await FundService.recordExpense(
          fastify.prisma.crm,
          request.params.fundId,
          request.body,
          actor
        );
        return reply.send({ success: true, data: result });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:expense');
      }
    }
  );

  // 4. Tạo đề xuất bổ sung vốn quỹ
  fastify.post<{ Params: { fundId: string }; Body: CreateProposalRequest }>(
    '/funds/:fundId/proposals',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const data = await FundService.createProposal(
          fastify.prisma.crm,
          request.params.fundId,
          request.body,
          actor
        );
        return reply.send({ success: true, data });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:create-proposal');
      }
    }
  );

  // 5. CƠ CHẾ 1: Phê duyệt chủ trương đề xuất (Quản lý & Danny)
  fastify.post<{ Params: { proposalId: string }; Body: ApproveProposalRequest }>(
    '/funds/proposals/:proposalId/approve',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const data = await FundService.approveProposal(
          fastify.prisma.crm,
          request.params.proposalId,
          request.body,
          actor
        );
        return reply.send({ success: true, data });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:approve-proposal');
      }
    }
  );

  // 6. CƠ CHẾ 2: Kế toán thực thi giải ngân & Kiểm soát dung sai
  fastify.post<{ Params: { proposalId: string }; Body: DisburseProposalRequest }>(
    '/funds/proposals/:proposalId/disburse',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const result = await FundService.disburseProposal(
          fastify.prisma.crm,
          request.params.proposalId,
          request.body,
          actor
        );
        return reply.send({
          success: result.success,
          reapprovalRequired: result.reapprovalRequired,
          message: result.message,
          data: result.proposal,
        });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:disburse-proposal');
      }
    }
  );

  // 7. CƠ CHẾ 3: Đối soát, kiểm kê chênh lệch & Chốt kỳ sổ quỹ
  fastify.post<{ Params: { fundId: string; periodId: string }; Body: ReconcileAndLockPeriodRequest }>(
    '/funds/:fundId/periods/:periodId/reconcile-lock',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const result = await FundService.reconcileAndLockPeriod(
          fastify.prisma.crm,
          request.params.fundId,
          request.params.periodId,
          request.body,
          actor
        );
        return reply.send({ success: true, data: result });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:reconcile-lock');
      }
    }
  );

  // 8. Cập nhật cấu hình quỹ
  fastify.patch<{ Params: { fundId: string }; Body: UpdateFundConfigRequest }>(
    '/funds/:fundId/config',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const actor = getActor(request);
        const data = await FundService.updateFundConfig(
          fastify.prisma.crm,
          request.params.fundId,
          request.body
        );
        return reply.send({ success: true, data });
      } catch (err) {
        return handleFundError(fastify, reply, err, 'funds:config');
      }
    }
  );
}
