import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export async function staffRoutes(fastify: FastifyInstance) {
  // GET /api/staff - Get all staff members (Admin only)
  fastify.get('/staff', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { role, isActive, search } = request.query as {
      role?: string;
      isActive?: string;
      search?: string;
    };

    try {
      const whereClause: any = {};

      if (role) {
        whereClause.role = role;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      if (search) {
        whereClause.OR = [
          { displayName: { contains: search } },
          { username: { contains: search } }
        ];
      }

      const staff = await fastify.prisma.crm.crmStaff.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          email: true,
          phone: true,
          joinedAt: true,
          birthDate: true,
          gender: true,
          address: true,
          emergencyContact: true,
          emergencyPhone: true,
          avatarUrl: true,
          notes: true,
          legacyStaffId: true,
          lastLoginAt: true,
          lastActiveAt: true
        }
      });

      return staff;
    } catch (error: any) {
      fastify.log.error('Fetch staff error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy danh sách nhân viên'
      });
    }
  });

  // GET /api/staff/:id - Get details of a single staff member (Admin or Self)
  fastify.get('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetId = parseInt(id, 10);
    const currentUser = request.user;

    if (isNaN(targetId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
    }

    // Only Admin or the staff member themselves can view details
    if (currentUser.role !== 'admin' && currentUser.id !== targetId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Bạn không có quyền xem thông tin nhân viên này'
      });
    }

    try {
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          email: true,
          phone: true,
          joinedAt: true,
          birthDate: true,
          gender: true,
          address: true,
          emergencyContact: true,
          emergencyPhone: true,
          avatarUrl: true,
          notes: true,
          legacyStaffId: true,
          lastLoginAt: true,
          lastActiveAt: true
        }
      });

      if (!staff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      return staff;
    } catch (error: any) {
      fastify.log.error('Fetch staff details error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy thông tin nhân viên'
      });
    }
  });

  // POST /api/staff - Create a new staff member (Admin only)
  fastify.post('/staff', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const {
      username,
      password,
      displayName,
      role,
      isActive,
      email,
      phone,
      joinedAt,
      birthDate,
      gender,
      address,
      emergencyContact,
      emergencyPhone,
      avatarUrl,
      notes,
      legacyStaffId
    } = request.body as any;

    if (!username || !displayName) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tên đăng nhập (username) và Tên hiển thị (displayName) là bắt buộc'
      });
    }

    try {
      // Validate unique username
      const existingStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { username }
      });

      if (existingStaff) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Tên đăng nhập "${username}" đã tồn tại trên hệ thống`
        });
      }

      // Hash password
      // If no password is provided (e.g. they will use Google Auth exclusively), generate a strong random hash
      const passwordToHash = password || Math.random().toString(36) + Math.random().toString(36);
      const passwordHash = await bcrypt.hash(passwordToHash, 10);

      const staff = await fastify.prisma.crm.crmStaff.create({
        data: {
          username,
          passwordHash,
          displayName,
          role: role || 'telesales',
          isActive: isActive !== false,
          email,
          phone,
          joinedAt: joinedAt ? new Date(joinedAt) : null,
          birthDate: birthDate ? new Date(birthDate) : null,
          gender,
          address,
          emergencyContact,
          emergencyPhone,
          avatarUrl,
          notes,
          legacyStaffId: legacyStaffId ? parseInt(legacyStaffId, 10) : null
        }
      });

      return {
        message: 'Tạo nhân viên thành công',
        user: {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role,
          isActive: staff.isActive
        }
      };
    } catch (error: any) {
      fastify.log.error('Create staff error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tạo nhân viên mới'
      });
    }
  });

  // PUT /api/staff/:id - Update staff member details (Admin or Self)
  fastify.put('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetId = parseInt(id, 10);
    const currentUser = request.user;

    if (isNaN(targetId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
    }

    // Authorization checks
    if (currentUser.role !== 'admin' && currentUser.id !== targetId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Bạn không có quyền sửa thông tin nhân viên này'
      });
    }

    const {
      username,
      password,
      displayName,
      role,
      isActive,
      email,
      phone,
      joinedAt,
      birthDate,
      gender,
      address,
      emergencyContact,
      emergencyPhone,
      avatarUrl,
      notes,
      legacyStaffId
    } = request.body as any;

    try {
      // Find the existing staff first
      const existingStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetId }
      });

      if (!existingStaff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      // Construct update payload
      const updateData: any = {};

      // General properties that both Admin & Self can change
      if (displayName !== undefined) updateData.displayName = displayName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
      if (gender !== undefined) updateData.gender = gender;
      if (address !== undefined) updateData.address = address;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
      if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (notes !== undefined) updateData.notes = notes;
      if (legacyStaffId !== undefined) {
        updateData.legacyStaffId = legacyStaffId ? parseInt(legacyStaffId, 10) : null;
      }

      // Handle password update if supplied
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      // Admin-only fields
      if (currentUser.role === 'admin') {
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (joinedAt !== undefined) updateData.joinedAt = joinedAt ? new Date(joinedAt) : null;

        if (username !== undefined && username !== existingStaff.username) {
          // Check for duplicate username
          const duplicate = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username }
          });
          if (duplicate) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Tên đăng nhập (Email / Prefix) đã được sử dụng bởi nhân sự khác'
            });
          }
          updateData.username = username;
        }
      }

      const updated = await fastify.prisma.crm.crmStaff.update({
        where: { id: targetId },
        data: updateData
      });

      return {
        message: 'Cập nhật thông tin nhân viên thành công',
        user: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role,
          isActive: updated.isActive
        }
      };
    } catch (error: any) {
      fastify.log.error('Update staff error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi cập nhật thông tin nhân viên'
      });
    }
  });

  // DELETE /api/staff/:id - Delete a staff member (Admin only)
  fastify.delete('/staff/:id', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetId = parseInt(id, 10);

    if (isNaN(targetId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
    }

    try {
      const staff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetId }
      });

      if (!staff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      // Prevent self-deletion
      if (request.user.id === targetId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Bạn không thể tự xóa tài khoản của chính mình'
        });
      }

      // Check dependencies to prevent orphaned keys in records
      // Check Call Logs
      const callLogCount = await fastify.prisma.crm.crmCallLog.count({
        where: { staffId: targetId }
      });

      // Check Daily Plans
      const dailyPlanCount = await fastify.prisma.crm.crmDailyPlan.count({
        where: { staffId: targetId }
      });

      // Check KPI records
      const kpiCount = await fastify.prisma.crm.crmStaffKpi.count({
        where: { staffId: targetId }
      });

      if (callLogCount > 0 || dailyPlanCount > 0 || kpiCount > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Không thể xóa nhân viên "${staff.displayName}" vì đã có lịch sử cuộc gọi (${callLogCount}), kế hoạch gọi (${dailyPlanCount}) hoặc KPI liên kết. Vui lòng chuyển trạng thái thành Vô hiệu hóa (Deactivate) để khóa tài khoản.`
        });
      }

      // Delete if no transaction data matches
      await fastify.prisma.crm.crmStaff.delete({
        where: { id: targetId }
      });

      return {
        message: `Xóa nhân viên "${staff.displayName}" thành công`
      };
    } catch (error: any) {
      fastify.log.error('Delete staff error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi xóa nhân viên'
      });
    }
  });

  // GET /api/staff/legacy - Get list of legacy staff (Wings Lashes accounts)
  fastify.get('/staff/legacy', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(
        `SELECT 
          up.user_id as id, 
          up.full_name as name, 
          u.email as email,
          (SELECT phone_number FROM user_contact WHERE user_id = up.user_id AND is_disabled = 0 LIMIT 1) as phone
         FROM user_profile up
         JOIN user u ON up.user_id = u.id
         WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1
         ORDER BY up.full_name ASC`
      );
      return legacyStaff.map((row: any) => ({
        id: Number(row.id),
        name: row.name ? row.name.trim() : 'Unknown',
        email: row.email || null,
        phone: row.phone || null
      }));
    } catch (error: any) {
      fastify.log.error('Fetch legacy staff error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy danh sách tài khoản Wings Lashes'
      });
    }
  });
}
