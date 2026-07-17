import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export async function rolesRoutes(fastify: FastifyInstance) {
  // GET /api/roles - Fetch all roles (Authenticated)
  fastify.get('/roles', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const roles = await fastify.prisma.crm.crmRole.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return roles;
    } catch (error: any) {
      fastify.log.error('Fetch roles error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy danh sách vai trò',
      });
    }
  });

  // POST /api/roles - Create a new custom role (Admin only)
  fastify.post('/roles', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { key, name, color, viewKPI, viewTeamKPI, manageStaff, description } = request.body as any;

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
          isSystem: false,
          description,
        },
      });

      return {
        message: 'Tạo vai trò thành công',
        role,
      };
    } catch (error: any) {
      fastify.log.error('Create role error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tạo vai trò mới',
      });
    }
  });

  // PUT /api/roles/:key - Update a role (Admin only)
  fastify.put('/roles/:key', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { name, color, viewKPI, viewTeamKPI, manageStaff, description } = request.body as any;

    try {
      const existingRole = await fastify.prisma.crm.crmRole.findUnique({
        where: { key },
      });

      if (!existingRole) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy vai trò này' });
      }

      // Update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      if (description !== undefined) updateData.description = description;

      // Allow modifying permissions
      // Lock permissions for system roles to prevent lockout, EXCEPT:
      // - Let's allow updating permissions, but if it is 'admin', keep manageStaff: true
      if (existingRole.isSystem && key === 'admin') {
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
    } catch (error: any) {
      fastify.log.error('Update role error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể cập nhật thông tin vai trò',
      });
    }
  });

  // DELETE /api/roles/:key - Delete a custom role (Admin only)
  fastify.delete('/roles/:key', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
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
    } catch (error: any) {
      fastify.log.error('Delete role error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi xóa vai trò',
      });
    }
  });
}
