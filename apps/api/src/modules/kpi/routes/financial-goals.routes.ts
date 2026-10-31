import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { isCvRole, FinancialGoalsConfigDto, SafeAny } from '@mos-lab/shared';
import { FinancialGoalsService } from '../services/financial-goals.service.js';

export async function registerFinancialGoalsRoutes(fastify: FastifyInstance) {
  // 1. Get Financial Goals Overview
  fastify.get('/kpi/financial-goals', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as SafeAny).user;
    if (isCvRole(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu mục tiêu tài chính.',
      });
    }

    const { month } = request.query as { month?: string };

    try {
      const data = await FinancialGoalsService.getOverview(fastify, month);
      return reply.send({ success: true, data });
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to get financial goals overview: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 2. List Configured and Nearby Months
  fastify.get('/kpi/financial-goals/months', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as SafeAny).user;
    if (isCvRole(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu mục tiêu tài chính.',
      });
    }

    try {
      const months = await FinancialGoalsService.listMonths(fastify);
      return reply.send({ success: true, months });
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to list financial goals months: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 3. Get Target Configuration for a Specific Month
  fastify.get('/kpi/financial-goals/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as SafeAny).user;
    if (isCvRole(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền truy cập cấu hình mục tiêu tài chính.',
      });
    }

    const { month } = request.query as { month?: string };
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({ error: 'Cần cung cấp định dạng tháng hợp lệ (YYYY-MM).' });
    }

    try {
      const config = await FinancialGoalsService.getConfig(fastify, month);
      return reply.send({ success: true, config });
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to get financial goals config: ${err.message}`);
      return reply.status(500).send({ error: err.message || 'Internal Server Error' });
    }
  });

  // 4. Save Target Configuration (Admin / Manager)
  fastify.post('/kpi/financial-goals/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as SafeAny).user;
    if (isCvRole(user?.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Tài khoản Chuyên Viên không có quyền cập nhật cấu hình mục tiêu tài chính.',
      });
    }

    const body = request.body as FinancialGoalsConfigDto;

    try {
      if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
        return reply.status(400).send({
          error: 'Thiếu hoặc sai định dạng tháng mục tiêu (YYYY-MM).',
        });
      }

      const saved = await FinancialGoalsService.saveConfig(fastify, body, user?.displayName || user?.username);
      return reply.send({ success: true, config: saved });
    } catch (err: SafeAny) {
      fastify.log.error(`Failed to save financial goals config: ${err.message}`);
      return reply.status(400).send({ error: err.message });
    }
  });
}
