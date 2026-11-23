import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import { TeamService } from '../../teams/team.service.js';
import { type CreateStaffInput, mayManageSuperAdmin } from './staff-access.helpers.js';

export function registerStaffCreateDeleteRoutes(fastify: FastifyInstance) {
  // POST /api/staff - Create a new staff member (Admin & HR)
  fastify.post('/staff', { preHandler: [requireAuth, requireRole(['admin', 'hr'])] }, async (request, reply) => {
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
      payBasis,
      seniorityOffset,
      staffCode,
      employmentStatus,
      contractStatus,
      contractStartDate,
      contractEndDate,
      nationalId,
      socialInsuranceNo,
      bankName,
      bankAccountNumber,
    } = request.body as CreateStaffInput;

    if (!username || !displayName) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tên đăng nhập (username) và Tên hiển thị (displayName) là bắt buộc',
      });
    }

    const assignedRole = role || 'telesales';
    if (payBasis !== undefined && payBasis !== null && !['HOURLY', 'MONTHLY'].includes(payBasis)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Hình thức trả lương không hợp lệ.' });
    }
    if (!mayManageSuperAdmin(request.user.role, assignedRole)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Super Admin mới có thể gán vai trò Super Admin.',
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

      const roleRecord = await fastify.prisma.crm.crmRole.findUnique({ where: { key: assignedRole } });
      if (!roleRecord) {
        return reply.status(400).send({ error: 'Bad Request', message: `Vai trò "${assignedRole}" không tồn tại.` });
      }

      // Hash password
      const passwordToHash = password || Math.random().toString(36) + Math.random().toString(36);
      const passwordHash = await bcrypt.hash(passwordToHash, 10);

      const staff = await fastify.prisma.crm.crmStaff.create({
        data: {
          username,
          passwordHash,
          displayName,
          role: assignedRole,
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
          payBasis: payBasis || null,
          seniorityOffset: seniorityOffset !== undefined && seniorityOffset !== null ? Number(seniorityOffset) : 0,
          staffCode: staffCode || null,
          employmentStatus: employmentStatus || 'ACTIVE',
          contractStatus: contractStatus || 'OFFICIAL',
          contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
          contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
          nationalId: nationalId || null,
          socialInsuranceNo: socialInsuranceNo || null,
          bankName: bankName || null,
          bankAccountNumber: bankAccountNumber || null,
        },
      });

      // Initial audit log
      await fastify.prisma.crm.crmStaffAudit.create({
        data: {
          staffId: staff.id,
          actorStaffId: request.user.id,
          action: 'CREATE_STAFF_PROFILE',
          fieldName: 'profile',
          oldValue: null,
          newValue: `Tạo hồ sơ nhân viên ${staff.displayName} (${staff.username})`,
        },
      });

      if (staff.legacyStaffId && Number(staff.legacyStaffId) > 0) {
        await TeamService.ensureLegacyStaffProfile(fastify, Number(staff.legacyStaffId));
      }

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

    const targetedStaff = await fastify.prisma.crm.crmStaff.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });
    if (targetedStaff.some((staff) => !mayManageSuperAdmin(request.user.role, staff.role))) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Super Admin mới có thể thay đổi tài khoản Super Admin.',
      });
    }

    if (role !== undefined && role !== null && role !== '') {
      if (!mayManageSuperAdmin(request.user.role, role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Super Admin mới có thể gán vai trò Super Admin.',
        });
      }
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

      if (!mayManageSuperAdmin(request.user.role, staff.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Super Admin mới có thể xóa tài khoản Super Admin.',
        });
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
}
