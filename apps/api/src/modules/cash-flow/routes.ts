import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middlewares/auth.js';
import { CashFlowService } from './cash-flow.service.js';
import { SafeAny } from '@mos-lab/shared';

export async function cashFlowRoutes(fastify: FastifyInstance) {
  const service = new CashFlowService(fastify);

  // 1. GET /cash-flow/forecast - Lấy dữ liệu dự báo dòng tiền & timeline
  fastify.get(
    '/cash-flow/forecast',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Get cash flow forecast metrics, timeline, and shortfall risk alerts',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          startDate?: string;
          endDate?: string;
          storeId?: string;
          accountId?: string;
        };

        const storeId = query.storeId && query.storeId !== 'all' ? parseInt(query.storeId, 10) : undefined;
        const accountId = query.accountId && query.accountId !== 'all' ? parseInt(query.accountId, 10) : undefined;

        const result = await service.getForecast({
          startDate: query.startDate,
          endDate: query.endDate,
          storeId,
          accountId,
        });

        return reply.send({ success: true, data: result });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow forecast error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể tính toán dự báo dòng tiền',
        });
      }
    }
  );

  // 2. GET /cash-flow/entries - Lấy danh sách thu chi có bộ lọc & phân trang
  fastify.get(
    '/cash-flow/entries',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'List cash flow entries with pagination and filters',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as SafeAny;
        const result = await service.getEntries({
          flowType: query.flowType,
          category: query.category,
          priority: query.priority,
          status: query.status,
          storeId: query.storeId && query.storeId !== 'all' ? parseInt(query.storeId, 10) : undefined,
          accountId: query.accountId && query.accountId !== 'all' ? parseInt(query.accountId, 10) : undefined,
          startDate: query.startDate,
          endDate: query.endDate,
          search: query.search,
          hasVat: query.hasVat !== undefined ? query.hasVat === 'true' || query.hasVat === true : undefined,
          page: query.page ? parseInt(query.page, 10) : 1,
          limit: query.limit ? parseInt(query.limit, 10) : 20,
        });

        return reply.send({ success: true, data: result });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow list error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể tải danh sách thu chi',
        });
      }
    }
  );

  // 3. POST /cash-flow/entries - Tạo khoản thu chi mới (có VAT & mức độ ưu tiên)
  fastify.post(
    '/cash-flow/entries',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Create a cash flow entry with VAT and priority level',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { id: number; displayName?: string; username: string };
        const staff = {
          id: user.id,
          displayName: user.displayName || user.username || 'Quản trị viên',
        };

        const body = request.body as SafeAny;
        if (!body.title || !body.flowType || !body.category || body.amount === undefined || !body.expectedDate) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Thiếu thông tin bắt buộc (tiêu đề, loại dòng tiền, danh mục, số tiền, ngày dự kiến)',
          });
        }

        const entry = await service.createEntry(body, staff);
        return reply.status(201).send({ success: true, data: entry });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow create error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể tạo khoản thu chi',
        });
      }
    }
  );

  // 4. PUT /cash-flow/entries/:id - Cập nhật khoản thu chi
  fastify.put(
    '/cash-flow/entries/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Update a cash flow entry',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { id: number; displayName?: string; username: string };
        const staff = {
          id: user.id,
          displayName: user.displayName || user.username || 'Quản trị viên',
        };

        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ success: false, message: 'ID không hợp lệ' });
        }

        const body = request.body as SafeAny;
        const entry = await service.updateEntry(id, body, staff);
        return reply.send({ success: true, data: entry });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow update error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể cập nhật khoản thu chi',
        });
      }
    }
  );

  // 5. DELETE /cash-flow/entries/:id - Hủy khoản thu chi
  fastify.delete(
    '/cash-flow/entries/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Delete or cancel a cash flow entry',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { id: number; displayName?: string; username: string };
        const staff = {
          id: user.id,
          displayName: user.displayName || user.username || 'Quản trị viên',
        };

        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ success: false, message: 'ID không hợp lệ' });
        }

        await service.deleteEntry(id, staff);
        return reply.send({ success: true, message: `Đã hủy khoản #${id} thành công` });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow delete error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể hủy khoản thu chi',
        });
      }
    }
  );

  // 6. GET /cash-flow/accounts - Lấy danh sách tài khoản tiền
  fastify.get(
    '/cash-flow/accounts',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'List cash and bank accounts',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      try {
        const accounts = await service.getAccounts();
        return reply.send({ success: true, data: accounts });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow accounts error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể lấy danh sách tài khoản',
        });
      }
    }
  );

  // 7a. PUT /cash-flow/accounts/batch-balance - Cập nhật số dư hàng loạt
  fastify.put(
    '/cash-flow/accounts/batch-balance',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Batch update account balances and safety thresholds',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as SafeAny;
        const items = body?.items;
        if (!Array.isArray(items) || items.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Danh sách tài khoản cập nhật không hợp lệ hoặc rỗng',
          });
        }

        const updatedAccounts = await service.batchUpdateBalances(items);
        return reply.send({ success: true, data: updatedAccounts });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow batch balance update error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể cập nhật số dư hàng loạt',
        });
      }
    }
  );

  // 7b. PUT /cash-flow/accounts/:id - Cập nhật số dư / ngưỡng an toàn tài khoản
  fastify.put(
    '/cash-flow/accounts/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Update account balance and safety threshold',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const params = request.params as { id: string };
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
          return reply.status(400).send({ success: false, message: 'ID tài khoản không hợp lệ' });
        }

        const body = request.body as SafeAny;
        const account = await service.updateAccount(id, body);
        return reply.send({ success: true, data: account });
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow account update error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể cập nhật tài khoản',
        });
      }
    }
  );

  // 8. GET /cash-flow/export - Xuất file CSV dự báo dòng tiền
  fastify.get(
    '/cash-flow/export',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Cash Flow'],
        summary: 'Export cash flow forecast to CSV',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          startDate?: string;
          endDate?: string;
          storeId?: string;
        };

        const storeId = query.storeId && query.storeId !== 'all' ? parseInt(query.storeId, 10) : undefined;
        const csvContent = await service.exportCsv({
          startDate: query.startDate,
          endDate: query.endDate,
          storeId,
        });

        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header(
          'Content-Disposition',
          `attachment; filename="cash-flow-forecast-${new Date().toISOString().slice(0, 10)}.csv"`
        );
        return reply.send(csvContent);
      } catch (err: SafeAny) {
        fastify.log.error(err as Error, 'Cash flow export error:');
        return reply.status(500).send({
          success: false,
          error: 'Internal Server Error',
          message: err.message || 'Không thể xuất báo cáo CSV',
        });
      }
    }
  );
}
