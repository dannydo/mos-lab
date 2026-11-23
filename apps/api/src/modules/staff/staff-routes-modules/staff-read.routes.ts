import { FastifyInstance } from 'fastify';
import { isHrOrAdminRole, SafeAny, TELESALES_EXECUTIVE_STANDARDS } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { getManagedStaffIdsForManager, maskStaffSensitiveData } from './staff-access.helpers.js';

export function registerStaffReadRoutes(fastify: FastifyInstance) {
  // GET /api/staff - Get all staff members
  fastify.get('/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const { role, isActive, search } = request.query as {
      role?: string;
      isActive?: string;
      search?: string;
    };

    const currentUser = request.user as { id: number; role: string };

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

      if (isHrOrAdminRole(currentUser.role) || currentUser.role === 'manager') {
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
        selectFields.payBasis = true;
        selectFields.seniorityOffset = true;
        selectFields.staffCode = true;
        selectFields.employmentStatus = true;
        selectFields.contractStatus = true;
        selectFields.contractStartDate = true;
        selectFields.contractEndDate = true;
        selectFields.nationalId = true;
        selectFields.socialInsuranceNo = true;
        selectFields.bankName = true;
        selectFields.bankAccountNumber = true;
      }

      const rawStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: selectFields,
      });

      let managedStaffIds: Set<number> | undefined;
      if (currentUser.role === 'manager') {
        managedStaffIds = await getManagedStaffIdsForManager(fastify, currentUser.id);
      }

      return rawStaffList.map((s) => maskStaffSensitiveData(s, currentUser, managedStaffIds));
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lấy danh sách nhân viên',
      });
    }
  });

  // GET /api/staff/:id - Get details of a single staff member
  fastify.get('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetId = parseInt(id, 10);
    const currentUser = request.user;

    if (isNaN(targetId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
    }

    let managedStaffIds: Set<number> | undefined;
    if (currentUser.role === 'manager') {
      managedStaffIds = await getManagedStaffIdsForManager(fastify, currentUser.id);
    }
    const isDirectManager = managedStaffIds?.has(targetId) || false;
    const isHrOrAdmin = isHrOrAdminRole(currentUser.role);
    const isSelf = currentUser.id === targetId;

    // Allowed if HR/Admin, Self, or Direct Manager
    if (!isHrOrAdmin && !isSelf && !isDirectManager) {
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
          baseSalary: true,
          hourlyWage: true,
          payBasis: true,
          seniorityOffset: true,
          staffCode: true,
          employmentStatus: true,
          contractStatus: true,
          contractStartDate: true,
          contractEndDate: true,
          nationalId: true,
          socialInsuranceNo: true,
          bankName: true,
          bankAccountNumber: true,
        },
      });

      if (!staff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      return maskStaffSensitiveData(staff, currentUser, managedStaffIds);
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff details error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy thông tin nhân viên',
      });
    }
  });

  // GET /api/staff/:id/audit-logs - Get audit logs of sensitive changes (Admin, HR, or Self)
  fastify.get('/staff/:id/audit-logs', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetId = parseInt(id, 10);
    const currentUser = request.user;

    if (isNaN(targetId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'ID không hợp lệ' });
    }

    if (!isHrOrAdminRole(currentUser.role) && currentUser.id !== targetId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Bạn không có quyền xem lịch sử kiểm toán của nhân viên này',
      });
    }

    try {
      const audits = await fastify.prisma.crm.crmStaffAudit.findMany({
        where: { staffId: targetId },
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              username: true,
              role: true,
            },
          },
        },
        take: 100,
      });

      return audits.map((a) => ({
        id: a.id,
        staffId: a.staffId,
        actorStaffId: a.actorStaffId,
        actorStaffName: a.actor?.displayName || (a.actorStaffId ? `Staff #${a.actorStaffId}` : 'Hệ thống'),
        action: a.action,
        fieldName: a.fieldName,
        oldValue: a.oldValue,
        newValue: a.newValue,
        createdAt: a.createdAt.toISOString(),
      }));
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch staff audit logs error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy lịch sử kiểm toán nhân viên',
      });
    }
  });

  // GET /api/staff/roles/telesales-profile - Get Telesales Executive standard role profile
  fastify.get('/staff/roles/telesales-profile', { preHandler: [requireAuth] }, async (_request, _reply) => {
    return TELESALES_EXECUTIVE_STANDARDS;
  });
}
