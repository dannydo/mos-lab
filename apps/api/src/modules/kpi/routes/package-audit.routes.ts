import { FastifyInstance } from 'fastify';
import { PackageAuditService } from '../services/package-audit.service.js';
import { PackageAuditListParams, ReviewPackageAuditParams, SafeAny } from '@mos-lab/shared';

export async function registerPackageAuditRoutes(fastify: FastifyInstance) {
  const auditService = new PackageAuditService(fastify);

  fastify.get('/kpi/package-audit/list', async (request, reply) => {
    try {
      const query = request.query as SafeAny;
      const params: PackageAuditListParams = {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        staffId: query.staffId ? Number(query.staffId) : undefined,
        status: query.status || 'ALL',
        search: query.search,
      };

      const result = await auditService.listManualAdjustments(params);
      return result;
    } catch (error: SafeAny) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as Error).message || 'Lỗi khi lấy danh sách kiểm toán gói.',
      });
    }
  });

  fastify.post('/kpi/package-audit/review', async (request, reply) => {
    try {
      const body = request.body as ReviewPackageAuditParams;
      const staffId = (request as SafeAny).user?.id || 1; // Default to staff ID from auth token

      if (!body || !body.transactionId || !body.action) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Vui lòng cung cấp đầy đủ transactionId và action (APPROVE/REVOKE).',
        });
      }

      const result = await auditService.reviewAdjustment(staffId, body);
      return result;
    } catch (error: SafeAny) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as Error).message || 'Lỗi khi xử lý kiểm duyệt lượt cộng thủ công.',
      });
    }
  });
}
