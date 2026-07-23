import { FastifyInstance } from 'fastify';
import { requireAuth, JwtUserPayload } from '../../middlewares/auth.js';

/**
 * DATABASE SCHEMA REFERENCE:
 * This module manages Table Header configurations and persists them in the MySQL database.
 * - Schema file: apps/api/prisma/crm.prisma
 * - Database model: CrmConfig (key, value, updatedAt)
 * - Keys stored in CrmConfig:
 *   - Default/Template config: `table_config:default:${tableId}`
 *   - User-specific config: `table_config:user:${userId}:${tableId}`
 *
 * If you need to troubleshoot database structure or queries, refer back to the schema file:
 * file:///Users/dannydo/projects/mos-lab/apps/api/prisma/crm.prisma
 */
export async function tableConfigRoutes(fastify: FastifyInstance) {
  // GET /api/table-config/:tableId - Get table configurations (user-specific & default)
  fastify.get(
    '/table-config/:tableId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['TableConfig'],
        summary: 'Get user and default table column preferences',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['tableId'],
          properties: {
            tableId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params as { tableId: string };
      const user = request.user as JwtUserPayload;

      if (!tableId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Mã bảng (tableId) là bắt buộc',
        });
      }

      try {
        const userKey = `table_config:user:${user.id}:${tableId}`;
        const defaultKey = `table_config:default:${tableId}`;

        // Fetch user-specific config
        const userRecord = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: userKey },
        });

        // Fetch default template config
        const defaultRecord = await fastify.prisma.crm.crmConfig.findUnique({
          where: { key: defaultKey },
        });

        return {
          userConfig: userRecord ? JSON.parse(userRecord.value) : null,
          defaultConfig: defaultRecord ? JSON.parse(defaultRecord.value) : null,
        };
      } catch (error: SafeAny) {
        fastify.log.error(`Fetch table-config error for table ${tableId}:`, error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể lấy cấu hình bảng',
        });
      }
    }
  );

  // POST /api/table-config/:tableId - Save table configuration (user-specific or default template)
  fastify.post('/table-config/:tableId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tableId } = request.params as { tableId: string };
    const { columns, saveAsDefault } = request.body as { columns: SafeAny[]; saveAsDefault?: boolean };
    const user = request.user as JwtUserPayload;

    if (!tableId || !Array.isArray(columns)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mã bảng (tableId) và danh sách cột (columns) là bắt buộc và phải là mảng',
      });
    }

    try {
      // 1. If trying to save as a default template, verify authorization (must be 'danhdo@gmail.com')
      if (saveAsDefault) {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: user.id },
        });

        const userEmail = staff?.email;
        const username = staff?.username;

        if (userEmail !== 'danhdo@gmail.com' && username !== 'danhdo@gmail.com') {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ email danhdo@gmail.com mới có quyền cập nhật template mặc định',
          });
        }

        const defaultKey = `table_config:default:${tableId}`;
        await fastify.prisma.crm.crmConfig.upsert({
          where: { key: defaultKey },
          create: {
            key: defaultKey,
            value: JSON.stringify(columns),
          },
          update: {
            value: JSON.stringify(columns),
          },
        });
      }

      // 2. Always save user-specific preference
      const userKey = `table_config:user:${user.id}:${tableId}`;
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: userKey },
        create: {
          key: userKey,
          value: JSON.stringify(columns),
        },
        update: {
          value: JSON.stringify(columns),
        },
      });

      return {
        success: true,
        message: saveAsDefault
          ? 'Đã lưu cấu hình làm mặc định hệ thống và áp dụng cho bạn'
          : 'Lưu cấu hình cá nhân thành công',
      };
    } catch (error: SafeAny) {
      fastify.log.error(`Save table-config error for table ${tableId}:`, error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lưu cấu hình bảng',
      });
    }
  });

  // POST /api/table-config/:tableId/reset - Reset to default config by deleting user-specific preference
  fastify.post('/table-config/:tableId/reset', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tableId } = request.params as { tableId: string };
    const user = request.user as JwtUserPayload;

    if (!tableId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mã bảng (tableId) là bắt buộc',
      });
    }

    try {
      const userKey = `table_config:user:${user.id}:${tableId}`;

      // Use deleteMany to avoid throwing an error if the config doesn't exist yet
      await fastify.prisma.crm.crmConfig.deleteMany({
        where: { key: userKey },
      });

      return {
        success: true,
        message: 'Đã reset về cấu hình mặc định thành công',
      };
    } catch (error: SafeAny) {
      fastify.log.error(`Reset table-config error for table ${tableId}:`, error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi reset cấu hình bảng',
      });
    }
  });
}
