import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';

export function registerCcAllowanceRoutes(fastify: FastifyInstance) {
  // POST /api/kpi/cc-payroll-allowance & /api/kpi/cc-allowances - Thêm phụ cấp khác cho CC
  const handleCreateCcAllowance = async (request: SafeAny, reply: SafeAny) => {
    const { staffId, month, title, amount, note } = request.body as {
      staffId: number;
      month: string;
      title: string;
      amount: number;
      note?: string;
    };

    if (!staffId || !month || !title?.trim() || amount == null || isNaN(Number(amount))) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Vui lòng nhập đầy đủ nhân sự, tháng, tên phụ cấp và số tiền hợp lệ.',
      });
    }

    try {
      const created = await fastify.prisma.crm.crmCvPayrollAllowance.create({
        data: {
          staffId: Number(staffId),
          month: String(month).trim(),
          title: String(title).trim(),
          amount: Math.round(Number(amount)),
          note: note ? String(note).trim() : null,
        },
      });

      return reply.send({
        success: true,
        data: {
          id: created.id,
          description: created.title,
          amount: created.amount,
          note: created.note,
          source: 'mos',
          createdAt: created.createdAt.toISOString(),
        },
        message: 'Thêm phụ cấp khác thành công.',
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error creating CC allowance');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể thêm phụ cấp khác.' });
    }
  };

  fastify.post('/kpi/cc-payroll-allowance', { preHandler: [requireAuth] }, handleCreateCcAllowance);
  fastify.post('/kpi/cc-allowances', { preHandler: [requireAuth] }, handleCreateCcAllowance);

  // DELETE /api/kpi/cc-allowances/:id - Xoá phụ cấp khác của CC
  fastify.delete('/kpi/cc-allowances/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const allowanceId = Number(id);

    if (!allowanceId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID phụ cấp không hợp lệ.' });
    }

    try {
      await fastify.prisma.crm.crmCvPayrollAllowance.delete({
        where: { id: allowanceId },
      });

      return reply.send({
        success: true,
        message: 'Đã xoá phụ cấp khác thành công.',
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error deleting CC allowance');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xoá phụ cấp khác.' });
    }
  });

  // GET /api/kpi/cc-allowances - Lấy danh sách phụ cấp khác của CC theo nhân sự & tháng
  fastify.get('/kpi/cc-allowances', { preHandler: [requireAuth] }, async (request, reply) => {
    const { staffId, month } = request.query as { staffId?: string; month?: string };

    try {
      const where: SafeAny = {};
      if (staffId) where.staffId = Number(staffId);
      if (month) where.month = String(month).trim();

      const list = await fastify.prisma.crm.crmCvPayrollAllowance.findMany({
        where,
        orderBy: { id: 'asc' },
      });

      return reply.send({
        success: true,
        data: list.map((a) => ({
          id: a.id,
          staffId: a.staffId,
          month: a.month,
          description: a.title,
          amount: a.amount,
          note: a.note,
          source: 'mos',
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      fastify.log.error(err as Error, 'Error listing CC allowances');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể lấy danh sách phụ cấp.' });
    }
  });
}
