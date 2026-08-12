import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { StaffOffDayService } from './services/staff-off-day.service.js';

interface CreateStaffInput {
  username?: string;
  password?: string;
  displayName?: string;
  role?: string;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  joinedAt?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  legacyStaffId?: string | number | null;
  omicallAutoInit?: boolean | null;
  baseSalary?: number | null;
  hourlyWage?: number | null;
  seniorityOffset?: number | null;
}

export async function staffRoutes(fastify: FastifyInstance) {
  // GET /api/staff - Get all staff members (Admin gets full fields, others get basic public fields)
  fastify.get('/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const { role, isActive, search } = request.query as {
      role?: string;
      isActive?: string;
      search?: string;
    };

    const currentUser = request.user as { role: string };

    try {
      const whereClause: Record<string, unknown> = {};

      if (role) {
        whereClause.role = role;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      if (search) {
        whereClause.OR = [{ displayName: { contains: search } }, { username: { contains: search } }];
      }

      const selectFields: Record<string, boolean> = {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        lastActiveAt: true,
        omicallAutoInit: true,
      };

      if (currentUser.role === 'admin') {
        selectFields.createdAt = true;
        selectFields.email = true;
        selectFields.phone = true;
        selectFields.joinedAt = true;
        selectFields.birthDate = true;
        selectFields.gender = true;
        selectFields.address = true;
        selectFields.emergencyContact = true;
        selectFields.emergencyPhone = true;
        selectFields.notes = true;
        selectFields.legacyStaffId = true;
        selectFields.lastLoginAt = true;
        selectFields.baseSalary = true;
        selectFields.hourlyWage = true;
        selectFields.seniorityOffset = true;
      }

      const staff = await fastify.prisma.crm.crmStaff.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: selectFields,
      });

      return staff;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy danh sách nhân viên',
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
        message: 'Bạn không có quyền xem thông tin nhân viên này',
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
          lastActiveAt: true,
          omicallAutoInit: true,
          ...(currentUser.role === 'admin'
            ? {
                baseSalary: true,
                hourlyWage: true,
                seniorityOffset: true,
              }
            : {}),
        },
      });

      if (!staff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      return staff;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff details error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy thông tin nhân viên',
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
      legacyStaffId,
      omicallAutoInit,
      baseSalary,
      hourlyWage,
      seniorityOffset,
    } = request.body as CreateStaffInput;

    if (!username || !displayName) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tên đăng nhập (username) và Tên hiển thị (displayName) là bắt buộc',
      });
    }

    try {
      // Validate unique username
      const existingStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { username },
      });

      if (existingStaff) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Tên đăng nhập "${username}" đã tồn tại trên hệ thống`,
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
          legacyStaffId: legacyStaffId
            ? typeof legacyStaffId === 'number'
              ? legacyStaffId
              : parseInt(legacyStaffId, 10)
            : null,
          omicallAutoInit: omicallAutoInit !== undefined ? omicallAutoInit : null,
          baseSalary: baseSalary !== undefined && baseSalary !== null ? Number(baseSalary) : null,
          hourlyWage: hourlyWage !== undefined && hourlyWage !== null ? Number(hourlyWage) : null,
          seniorityOffset: seniorityOffset !== undefined && seniorityOffset !== null ? Number(seniorityOffset) : 0,
        },
      });

      return {
        message: 'Tạo nhân viên thành công',
        user: {
          id: staff.id,
          username: staff.username,
          displayName: staff.displayName,
          role: staff.role,
          isActive: staff.isActive,
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Create staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tạo nhân viên mới',
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
        message: 'Bạn không có quyền sửa thông tin nhân viên này',
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
      legacyStaffId,
      omicallAutoInit,
      baseSalary,
      hourlyWage,
      seniorityOffset,
    } = request.body as CreateStaffInput;

    try {
      // Find the existing staff first
      const existingStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetId },
      });

      if (!existingStaff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      // Construct update payload
      const updateData: Record<string, unknown> = {};

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
      if (omicallAutoInit !== undefined) updateData.omicallAutoInit = omicallAutoInit;
      if (legacyStaffId !== undefined) {
        updateData.legacyStaffId = legacyStaffId
          ? typeof legacyStaffId === 'number'
            ? legacyStaffId
            : parseInt(legacyStaffId, 10)
          : null;
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
        if (baseSalary !== undefined) updateData.baseSalary = baseSalary !== null ? Number(baseSalary) : null;
        if (hourlyWage !== undefined) updateData.hourlyWage = hourlyWage !== null ? Number(hourlyWage) : null;
        if (seniorityOffset !== undefined)
          updateData.seniorityOffset = seniorityOffset !== null ? Number(seniorityOffset) : 0;

        if (username !== undefined && username !== existingStaff.username) {
          // Check for duplicate username
          const duplicate = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username },
          });
          if (duplicate) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Tên đăng nhập (Email / Prefix) đã được sử dụng bởi nhân sự khác',
            });
          }
          updateData.username = username;
        }
      }

      const updated = await fastify.prisma.crm.crmStaff.update({
        where: { id: targetId },
        data: updateData,
      });

      return {
        message: 'Cập nhật thông tin nhân viên thành công',
        user: {
          id: updated.id,
          username: updated.username,
          displayName: updated.displayName,
          role: updated.role,
          isActive: updated.isActive,
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Update staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi cập nhật thông tin nhân viên',
      });
    }
  });

  // POST /api/staff/bulk-update - Bulk update staff attributes (Admin only)
  fastify.post('/staff/bulk-update', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { ids, role, isActive } = request.body as {
      ids?: number[];
      role?: string;
      isActive?: boolean;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Danh sách ID nhân viên không hợp lệ hoặc rỗng',
      });
    }

    const updateData: Record<string, unknown> = {};

    if (role !== undefined && role !== null && role !== '') {
      const existingRole = await fastify.prisma.crm.crmRole.findUnique({
        where: { key: role },
      });
      if (!existingRole) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Vai trò "${role}" không tồn tại trên hệ thống`,
        });
      }
      updateData.role = role;
    }

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Không có dữ liệu thay đổi hợp lệ',
      });
    }

    try {
      const result = await fastify.prisma.crm.crmStaff.updateMany({
        where: {
          id: { in: ids },
        },
        data: updateData,
      });

      return {
        success: true,
        count: result.count,
        message: `Đã cập nhật ${result.count} nhân viên thành công`,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Bulk update staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi cập nhật nhân viên hàng loạt',
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
        where: { id: targetId },
      });

      if (!staff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      // Prevent self-deletion
      if (request.user.id === targetId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Bạn không thể tự xóa tài khoản của chính mình',
        });
      }

      // Check dependencies to prevent orphaned keys in records
      // Check Call Logs
      const callLogCount = await fastify.prisma.crm.crmCallLog.count({
        where: { staffId: targetId },
      });

      // Check Daily Plans
      const dailyPlanCount = await fastify.prisma.crm.crmDailyPlan.count({
        where: { staffId: targetId },
      });

      // Check KPI records
      const kpiCount = await fastify.prisma.crm.crmStaffKpi.count({
        where: { staffId: targetId },
      });

      if (callLogCount > 0 || dailyPlanCount > 0 || kpiCount > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Không thể xóa nhân viên "${staff.displayName}" vì đã có lịch sử cuộc gọi (${callLogCount}), kế hoạch gọi (${dailyPlanCount}) hoặc KPI liên kết. Vui lòng chuyển trạng thái thành Vô hiệu hóa (Deactivate) để khóa tài khoản.`,
        });
      }

      // Delete if no transaction data matches
      await fastify.prisma.crm.crmStaff.delete({
        where: { id: targetId },
      });

      return {
        message: `Xóa nhân viên "${staff.displayName}" thành công`,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Delete staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi xóa nhân viên',
      });
    }
  });

  // GET /api/staff/legacy - Get list of legacy staff (Wings Lashes accounts)
  fastify.get('/staff/legacy', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<
        { id: number | bigint; name: string | null; email: string | null; phone: string | null }[]
      >(
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
      return legacyStaff.map((row) => ({
        id: Number(row.id),
        name: row.name ? row.name.trim() : 'Unknown',
        email: row.email || null,
        phone: row.phone || null,
      }));
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch legacy staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy danh sách tài khoản Wings Lashes',
      });
    }
  });

  // POST /api/staff/sync-legacy - Import active staff from legacy database (Admin only)
  fastify.post('/staff/sync-legacy', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    try {
      // 1. Fetch active staff from legacy database
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<
        {
          id: number | bigint;
          name: string | null;
          email: string | null;
          phone: string | null;
          date_created: string;
          user_group_id: number | bigint;
          avatar: string | null;
          gender: string | null;
          date_of_birth: string | null;
          address: string | null;
          working_hour_rate: number | null;
          base_salary: number | null;
        }[]
      >(
        `SELECT 
          up.user_id as id, 
          up.full_name as name, 
          u.email as email,
          (SELECT phone_number FROM user_contact WHERE user_id = up.user_id AND is_disabled = 0 LIMIT 1) as phone,
          up.date_created,
          up.user_group_id,
          up.avatar,
          u.gender,
          u.date_of_birth,
          (SELECT current_address FROM staff_profile WHERE user_id = up.user_id LIMIT 1) as address,
          (SELECT sp.working_hour_rate 
           FROM staff_payroll sp 
           WHERE sp.user_id = up.user_id 
           ORDER BY sp.date DESC LIMIT 1) as working_hour_rate,
          (SELECT spl.base_salary 
           FROM staff_payroll sp 
           LEFT JOIN staff_payroll_level spl ON sp.staff_payroll_level_id = spl.id 
           WHERE sp.user_id = up.user_id 
           ORDER BY sp.date DESC LIMIT 1) as base_salary
         FROM user_profile up
         JOIN user u ON up.user_id = u.id
         WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1 AND up.full_name NOT LIKE 'Wings -%'
         ORDER BY up.full_name ASC`
      );

      let importedCount = 0;
      const defaultPasswordHash = await bcrypt.hash('WingsLive2026Base', 10);

      // 2. Iterate and upsert into crm_staff
      for (const row of legacyStaff) {
        const id = Number(row.id);
        const name = row.name ? row.name.trim() : 'Unknown Staff';
        const email = row.email || null;
        const phone = row.phone || null;
        const joinedAt = row.date_created ? new Date(row.date_created) : new Date();
        const groupId = Number(row.user_group_id);
        const avatarUrl = row.avatar || null;
        const gender = row.gender === 'Male' ? 'Male' : row.gender === 'Female' ? 'Female' : 'Other';
        const birthDate = row.date_of_birth ? new Date(row.date_of_birth) : null;
        const address = row.address || null;
        const baseSalary = row.base_salary !== null && row.base_salary !== undefined ? Number(row.base_salary) : null;
        const hourlyWage =
          row.working_hour_rate !== null && row.working_hour_rate !== undefined ? Number(row.working_hour_rate) : null;

        // Map role
        let role = 'telesales';
        if (groupId === 4) {
          role = 'technician';
        } else if (groupId === 5) {
          role = 'cc';
        } else if ([2, 31, 32, 45].includes(groupId)) {
          role = 'oc';
        } else if ([14, 33, 34].includes(groupId)) {
          role = 'manager';
        }

        // Generate username (email or prefix of email, or user{id} if not valid)
        let username = email ? email.trim() : `user${id}@wingslashes.com`;
        if (username.indexOf('@') === -1) {
          username = `${username}@wingslashes.com`;
        }

        // Multi-level anti-duplicate check before creating new staff
        let matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
          where: { legacyStaffId: id },
        });

        if (!matchedStaff && email) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: {
              OR: [{ email: email }, { username: email }, { username: username }],
            },
          });
        }

        if (!matchedStaff && phone) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: { phone: phone },
          });
        }

        if (!matchedStaff && name) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: { displayName: name },
          });
        }

        if (matchedStaff) {
          // Update details, keeping current role/password, but syncing legacyStaffId/email/phone/joinedAt/displayName/avatarUrl/gender/birthDate/address/baseSalary/hourlyWage
          await fastify.prisma.crm.crmStaff.update({
            where: { id: matchedStaff.id },
            data: {
              legacyStaffId: matchedStaff.legacyStaffId || id,
              displayName: name,
              email: matchedStaff.email || email,
              phone: matchedStaff.phone || phone,
              joinedAt: matchedStaff.joinedAt || joinedAt,
              avatarUrl: matchedStaff.avatarUrl || avatarUrl,
              gender: matchedStaff.gender || gender,
              birthDate: matchedStaff.birthDate || birthDate,
              address: matchedStaff.address || address,
              baseSalary:
                matchedStaff.baseSalary !== null && matchedStaff.baseSalary !== undefined
                  ? matchedStaff.baseSalary
                  : baseSalary,
              hourlyWage:
                matchedStaff.hourlyWage !== null && matchedStaff.hourlyWage !== undefined
                  ? matchedStaff.hourlyWage
                  : hourlyWage,
            },
          });
        } else {
          // Check if username is already taken to avoid crash
          const existingByUsername = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username },
          });

          const finalUsername = existingByUsername ? `user${id}_${username}` : username;

          await fastify.prisma.crm.crmStaff.create({
            data: {
              username: finalUsername,
              displayName: name,
              passwordHash: defaultPasswordHash,
              role: role,
              isActive: true,
              email: email,
              phone: phone,
              joinedAt: joinedAt,
              legacyStaffId: id,
              seniorityOffset: 0,
              avatarUrl: avatarUrl,
              gender: gender,
              birthDate: birthDate,
              address: address,
              baseSalary: baseSalary,
              hourlyWage: hourlyWage,
            },
          });
          importedCount++;
        }
      }

      return {
        success: true,
        count: importedCount,
        message: `Đồng bộ thành công. Đã tạo mới ${importedCount} tài khoản nhân sự từ Wings Lashes.`,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Sync legacy staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi đồng bộ tài khoản Wings Lashes',
      });
    }
  });

  // POST /api/staff/merge - Merge duplicate staff members into a target staff member (Admin only)
  fastify.post('/staff/merge', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { targetStaffId, sourceStaffIds } = request.body as {
      targetStaffId?: number;
      sourceStaffIds?: number[];
    };

    if (!targetStaffId || !Array.isArray(sourceStaffIds) || sourceStaffIds.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Vui lòng chọn tài khoản chính và ít nhất 1 tài khoản phụ để gộp',
      });
    }

    const filteredSources = sourceStaffIds.filter((id) => id !== targetStaffId);
    if (filteredSources.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tài khoản phụ bị trùng với tài khoản chính',
      });
    }

    try {
      const targetStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetStaffId },
      });

      if (!targetStaff) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Không tìm thấy tài khoản chính',
        });
      }

      const sourceStaffs = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: filteredSources } },
      });

      if (sourceStaffs.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Không tìm thấy tài khoản phụ nào hợp lệ',
        });
      }

      // Execute merge inside Prisma transaction
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const srcId of filteredSources) {
          // 1. Reassign Customer Assignments
          await tx.crmCustomerAssignment.updateMany({
            where: { staffId: srcId },
            data: { staffId: targetStaffId },
          });

          // 2. Reassign Call Logs
          await tx.crmCallLog.updateMany({
            where: { staffId: srcId },
            data: { staffId: targetStaffId },
          });

          // 3. Reassign Daily Plans (Handling unique constraint legacyUserId + plannedDate)
          const sourcePlans = await tx.crmDailyPlan.findMany({
            where: { staffId: srcId },
          });

          for (const plan of sourcePlans) {
            const existingPlan = await tx.crmDailyPlan.findFirst({
              where: {
                legacyUserId: plan.legacyUserId,
                plannedDate: plan.plannedDate,
              },
            });
            if (!existingPlan) {
              await tx.crmDailyPlan.update({
                where: { id: plan.id },
                data: { staffId: targetStaffId },
              });
            } else {
              await tx.crmDailyPlan.delete({
                where: { id: plan.id },
              });
            }
          }

          // 4. Reassign KPI records (Handling unique constraint staffId + kpiDate)
          const sourceKpis = await tx.crmStaffKpi.findMany({
            where: { staffId: srcId },
          });

          for (const kpi of sourceKpis) {
            const existingKpi = await tx.crmStaffKpi.findFirst({
              where: {
                staffId: targetStaffId,
                kpiDate: kpi.kpiDate,
              },
            });
            if (!existingKpi) {
              await tx.crmStaffKpi.update({
                where: { id: kpi.id },
                data: { staffId: targetStaffId },
              });
            } else {
              await tx.crmStaffKpi.delete({
                where: { id: kpi.id },
              });
            }
          }

          // 5. Reassign Assignment Histories
          await tx.crmAssignmentHistory.updateMany({
            where: { prevStaffId: srcId },
            data: { prevStaffId: targetStaffId },
          });
          await tx.crmAssignmentHistory.updateMany({
            where: { newStaffId: srcId },
            data: { newStaffId: targetStaffId },
          });
          await tx.crmAssignmentHistory.updateMany({
            where: { assignedBy: srcId },
            data: { assignedBy: targetStaffId },
          });

          // 6. Delete source staff
          await tx.crmStaff.delete({
            where: { id: srcId },
          });
        }

        // 7. Consolidate missing fields on target staff from source staffs
        const hrUpdates: Record<string, unknown> = {};
        for (const src of sourceStaffs) {
          if (!targetStaff.email && src.email) hrUpdates.email = src.email;
          if (!targetStaff.phone && src.phone) hrUpdates.phone = src.phone;
          if (!targetStaff.legacyStaffId && src.legacyStaffId) hrUpdates.legacyStaffId = src.legacyStaffId;
          if (!targetStaff.birthDate && src.birthDate) hrUpdates.birthDate = src.birthDate;
          if (!targetStaff.address && src.address) hrUpdates.address = src.address;
          if (!targetStaff.avatarUrl && src.avatarUrl) hrUpdates.avatarUrl = src.avatarUrl;
        }

        if (Object.keys(hrUpdates).length > 0) {
          await tx.crmStaff.update({
            where: { id: targetStaffId },
            data: hrUpdates,
          });
        }
      });

      return {
        success: true,
        message: `Gộp thành công ${sourceStaffs.length} tài khoản phụ vào tài khoản "${targetStaff.displayName}".`,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Merge staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi gộp nhân viên trùng lặp',
      });
    }
  });

  // GET /api/staff/off-days - Get off-day details for batch userIds or all staff
  fastify.get('/staff/off-days', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { userIds, dateFrom, dateTo } = request.query as {
        userIds?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      let parsedUserIds: number[] | undefined = undefined;
      if (userIds) {
        parsedUserIds = userIds
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);
      }

      const batchMap = await StaffOffDayService.getBatchStaffOffDays(fastify, parsedUserIds, {
        dateFrom,
        dateTo,
      });

      const dataObj: Record<number, SafeAny> = {};
      batchMap.forEach((val, key) => {
        dataObj[key] = val;
      });

      return {
        data: dataObj,
        total: batchMap.size,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch batch staff off-days error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy thông tin ngày off của nhân viên',
      });
    }
  });

  // GET /api/staff/:id/off-days - Get off-day details for a single staff member
  fastify.get('/staff/:id/off-days', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { dateFrom, dateTo } = request.query as { dateFrom?: string; dateTo?: string };

      const userId = Number(id);
      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'ID nhân viên không hợp lệ',
        });
      }

      const result = await StaffOffDayService.getStaffOffDays(fastify, userId, { dateFrom, dateTo });
      return result;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff off-days error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy thông tin ngày off của nhân viên',
      });
    }
  });
}
