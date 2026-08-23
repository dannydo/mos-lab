import { FastifyInstance } from 'fastify';
import { isSuperAdminRole } from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

interface RoleInput {
  key?: string;
  name?: string;
  color?: string;
  viewKPI?: boolean;
  viewTeamKPI?: boolean;
  manageStaff?: boolean;
  omicallAutoInit?: boolean;
  description?: string;
}

export async function rolesRoutes(fastify: FastifyInstance) {
  // GET /api/roles - Fetch all roles (Authenticated)
  fastify.get(
    '/roles',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Roles'],
        summary: 'Get all system roles and permissions',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const roles = await fastify.prisma.crm.crmRole.findMany({
          orderBy: { createdAt: 'asc' },
        });
        return roles;
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Fetch roles error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể lấy danh sách vai trò',
        });
      }
    }
  );

  // POST /api/roles - Create a new custom role (Admin only)
  fastify.post(
    '/roles',
    {
      preHandler: [requireAuth, requireRole(['admin'])],
      schema: {
        tags: ['Roles'],
        summary: 'Create custom system role (Admin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['key', 'name'],
          properties: {
            key: { type: 'string', pattern: '^[a-z0-9-_]+$' },
            name: { type: 'string', minLength: 1 },
            color: { type: 'string' },
            viewKPI: { type: 'boolean' },
            viewTeamKPI: { type: 'boolean' },
            manageStaff: { type: 'boolean' },
            omicallAutoInit: { type: 'boolean' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { key, name, color, viewKPI, viewTeamKPI, manageStaff, omicallAutoInit, description } =
        request.body as RoleInput;

      if (!key || !name) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Mã vai trò (key) và Tên vai trò (name) là bắt buộc',
        });
      }

      // Validate key slug format (lowercase alphanumeric and hyphens/underscores only)
      const keyRegex = /^[a-z0-9-_]+$/;
      if (!keyRegex.test(key)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Mã vai trò chỉ được chứa chữ thường không dấu, số, gạch ngang và gạch dưới',
        });
      }

      try {
        const existingRole = await fastify.prisma.crm.crmRole.findUnique({
          where: { key },
        });

        if (existingRole) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Mã vai trò "${key}" đã tồn tại`,
          });
        }

        const role = await fastify.prisma.crm.crmRole.create({
          data: {
            key,
            name,
            color: color || 'default',
            viewKPI: !!viewKPI,
            viewTeamKPI: !!viewTeamKPI,
            manageStaff: !!manageStaff,
            omicallAutoInit: !!omicallAutoInit,
            isSystem: false,
            description,
          },
        });

        return {
          message: 'Tạo vai trò thành công',
          role,
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Create role error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể tạo vai trò mới',
        });
      }
    }
  );

  // PUT /api/roles/:key - Update a role (Admin only)
  fastify.put(
    '/roles/:key',
    {
      preHandler: [requireAuth, requireRole(['admin'])],
      schema: {
        tags: ['Roles'],
        summary: 'Update role details and permissions (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            color: { type: 'string' },
            viewKPI: { type: 'boolean' },
            viewTeamKPI: { type: 'boolean' },
            manageStaff: { type: 'boolean' },
            omicallAutoInit: { type: 'boolean' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const { name, color, viewKPI, viewTeamKPI, manageStaff, omicallAutoInit, description } =
        request.body as RoleInput;

      try {
        const existingRole = await fastify.prisma.crm.crmRole.findUnique({
          where: { key },
        });

        if (!existingRole) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy vai trò này' });
        }

        if (key === 'super_admin' && !isSuperAdminRole(request.user.role)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Chỉ Super Admin mới có thể điều chỉnh vai trò Super Admin.',
          });
        }

        // Update data
        const updateData: {
          name?: string;
          color?: string;
          description?: string;
          viewKPI?: boolean;
          viewTeamKPI?: boolean;
          manageStaff?: boolean;
          omicallAutoInit?: boolean;
        } = {};
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;
        if (description !== undefined) updateData.description = description;
        if (omicallAutoInit !== undefined) updateData.omicallAutoInit = !!omicallAutoInit;

        // Allow modifying permissions
        // Lock permissions for system roles to prevent lockout, EXCEPT:
        // - Let's allow updating permissions, but if it is 'admin', keep manageStaff: true
        if (existingRole.isSystem && (key === 'admin' || key === 'super_admin')) {
          updateData.viewKPI = true;
          updateData.viewTeamKPI = true;
          updateData.manageStaff = true;
        } else {
          if (viewKPI !== undefined) updateData.viewKPI = !!viewKPI;
          if (viewTeamKPI !== undefined) updateData.viewTeamKPI = !!viewTeamKPI;
          if (manageStaff !== undefined) updateData.manageStaff = !!manageStaff;
        }

        const updated = await fastify.prisma.crm.crmRole.update({
          where: { key },
          data: updateData,
        });

        return {
          message: 'Cập nhật vai trò thành công',
          role: updated,
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Update role error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Không thể cập nhật thông tin vai trò',
        });
      }
    }
  );

  // DELETE /api/roles/:key - Delete a custom role (Admin only)
  fastify.delete(
    '/roles/:key',
    {
      preHandler: [requireAuth, requireRole(['admin'])],
      schema: {
        tags: ['Roles'],
        summary: 'Delete custom role (Admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };

      try {
        const role = await fastify.prisma.crm.crmRole.findUnique({
          where: { key },
        });

        if (!role) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy vai trò' });
        }

        // Prevent deleting system roles
        if (role.isSystem) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Không thể xóa vai trò mặc định của hệ thống',
          });
        }

        // Check if any active/inactive staff member is assigned to this role
        const staffCount = await fastify.prisma.crm.crmStaff.count({
          where: { role: key },
        });

        if (staffCount > 0) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Không thể xóa vai trò "${role.name}" vì hiện đang có ${staffCount} nhân viên được gán vai trò này. Vui lòng đổi vai trò của họ trước khi xóa.`,
          });
        }

        await fastify.prisma.crm.crmRole.delete({
          where: { key },
        });

        return {
          message: `Xóa vai trò "${role.name}" thành công`,
        };
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Delete role error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Lỗi hệ thống khi xóa vai trò',
        });
      }
    }
  );
}
