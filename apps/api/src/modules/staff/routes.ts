import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { isSuperAdminRole, isHrOrAdminRole, TELESALES_EXECUTIVE_STANDARDS, SafeAny } from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { StaffOffDayService } from './services/staff-off-day.service.js';
import { AllocationLedgerService } from '../allocation/allocation-ledger.service.js';

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
  payBasis?: 'HOURLY' | 'MONTHLY' | null;
  seniorityOffset?: number | null;
  // HR Extensions (MOS-FEAT-26)
  staffCode?: string | null;
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  contractStatus?: 'PROBATION' | 'OFFICIAL' | 'TERMINATED';
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nationalId?: string | null;
  socialInsuranceNo?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}

function mayManageSuperAdmin(actorRole: string, targetRole?: string | null): boolean {
  return !isSuperAdminRole(targetRole) || isSuperAdminRole(actorRole);
}

export async function getManagedStaffIdsForManager(
  fastify: FastifyInstance,
  currentUserId: number
): Promise<Set<number>> {
  const leaderMemberships = await fastify.prisma.crm.crmTeamMember.findMany({
    where: {
      crmStaffId: currentUserId,
      isActive: true,
      role: 'leader',
    },
    select: { teamId: true },
  });

  const teamIds = leaderMemberships.map((m) => m.teamId);
  if (teamIds.length === 0) {
    const anyMemberships = await fastify.prisma.crm.crmTeamMember.findMany({
      where: {
        crmStaffId: currentUserId,
        isActive: true,
      },
      select: { teamId: true },
    });
    teamIds.push(...anyMemberships.map((m) => m.teamId));
  }

  if (teamIds.length === 0) {
    return new Set<number>();
  }

  const teamMembers = await fastify.prisma.crm.crmTeamMember.findMany({
    where: {
      teamId: { in: teamIds },
      isActive: true,
      crmStaffId: { not: null },
    },
    select: { crmStaffId: true },
  });

  const managedIds = new Set<number>();
  for (const tm of teamMembers) {
    if (tm.crmStaffId) managedIds.add(tm.crmStaffId);
  }
  return managedIds;
}

export function maskStaffSensitiveData<T extends Record<string, SafeAny>>(
  staff: T,
  currentUser: { id: number; role: string },
  managedStaffIds?: Set<number>
): T {
  // Admin, SuperAdmin, HR get full view
  if (isHrOrAdminRole(currentUser.role)) {
    return staff;
  }

  // Self gets full view of own record
  if (currentUser.id === staff.id) {
    return staff;
  }

  const isDirectManager = managedStaffIds?.has(staff.id) || false;
  const masked: Record<string, SafeAny> = { ...staff };

  // Legal and Payment info are strictly hidden from non-HR/Admin/Self
  masked.nationalId = null;
  masked.socialInsuranceNo = null;
  masked.bankName = null;
  masked.bankAccountNumber = null;

  // Direct Manager can view salary/compensation of their team members; everyone else cannot
  if (!isDirectManager) {
    masked.baseSalary = null;
    masked.hourlyWage = null;
    masked.payBasis = null;
    masked.seniorityOffset = null;
  }

  return masked as T;
}

export async function staffRoutes(fastify: FastifyInstance) {
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

  // PUT /api/staff/:id - Update staff member details (Admin, HR, Direct Manager, or Self)
  fastify.put('/staff/:id', { preHandler: [requireAuth] }, async (request, reply) => {
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

    if (!isHrOrAdmin && !isDirectManager && !isSelf) {
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

    try {
      const existingStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: targetId },
      });

      if (!existingStaff) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
      }

      if (!mayManageSuperAdmin(currentUser.role, existingStaff.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Super Admin mới có thể sửa tài khoản Super Admin.',
        });
      }

      const updateData: Record<string, unknown> = {};
      const sensitiveAudits: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }> = [];

      // 1. General Profile Fields: Editable by Admin, HR, OR Direct Manager
      // (Self can edit phone, email, address, emergencyContact, emergencyPhone, avatarUrl)
      if (displayName !== undefined && (isHrOrAdmin || isDirectManager)) updateData.displayName = displayName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (gender !== undefined && (isHrOrAdmin || isDirectManager)) updateData.gender = gender;
      if (address !== undefined) updateData.address = address;
      if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
      if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (notes !== undefined && (isHrOrAdmin || isDirectManager)) updateData.notes = notes;
      if (omicallAutoInit !== undefined && isHrOrAdmin) updateData.omicallAutoInit = omicallAutoInit;
      if (legacyStaffId !== undefined && isHrOrAdmin) {
        updateData.legacyStaffId = legacyStaffId
          ? typeof legacyStaffId === 'number'
            ? legacyStaffId
            : parseInt(legacyStaffId, 10)
          : null;
      }

      // 2. Manager and HR can edit birthDate and joinedAt
      if (birthDate !== undefined && (isHrOrAdmin || isDirectManager)) {
        const newBirthDate = birthDate ? new Date(birthDate) : null;
        const oldBirthDateStr = existingStaff.birthDate ? existingStaff.birthDate.toISOString().slice(0, 10) : null;
        const newBirthDateStr = newBirthDate ? newBirthDate.toISOString().slice(0, 10) : null;
        if (oldBirthDateStr !== newBirthDateStr) {
          sensitiveAudits.push({
            fieldName: 'birthDate',
            oldValue: oldBirthDateStr,
            newValue: newBirthDateStr,
          });
        }
        updateData.birthDate = newBirthDate;
      }

      if (joinedAt !== undefined && (isHrOrAdmin || isDirectManager)) {
        const newJoinedAt = joinedAt ? new Date(joinedAt) : null;
        const oldJoinedAtStr = existingStaff.joinedAt ? existingStaff.joinedAt.toISOString().slice(0, 10) : null;
        const newJoinedAtStr = newJoinedAt ? newJoinedAt.toISOString().slice(0, 10) : null;
        if (oldJoinedAtStr !== newJoinedAtStr) {
          sensitiveAudits.push({
            fieldName: 'joinedAt',
            oldValue: oldJoinedAtStr,
            newValue: newJoinedAtStr,
          });
        }
        updateData.joinedAt = newJoinedAt;
      }

      // Password update (Self or Admin/HR)
      if (password && (isHrOrAdmin || isSelf)) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
        sensitiveAudits.push({
          fieldName: 'password',
          oldValue: '***',
          newValue: '*** (Đổi mật khẩu)',
        });
      }

      // 3. Admin & HR only fields (Sensitive HR & Compensation)
      if (isHrOrAdmin) {
        if (role !== undefined) {
          if (!mayManageSuperAdmin(currentUser.role, role)) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Chỉ Super Admin mới có thể gán vai trò Super Admin.',
            });
          }
          const roleRecord = await fastify.prisma.crm.crmRole.findUnique({ where: { key: role } });
          if (!roleRecord) {
            return reply.status(400).send({ error: 'Bad Request', message: `Vai trò "${role}" không tồn tại.` });
          }
          if (existingStaff.role !== role) {
            sensitiveAudits.push({ fieldName: 'role', oldValue: existingStaff.role, newValue: role });
          }
          updateData.role = role;
        }

        if (isActive !== undefined) {
          if (existingStaff.isActive !== isActive) {
            sensitiveAudits.push({ fieldName: 'isActive', oldValue: existingStaff.isActive, newValue: isActive });
          }
          updateData.isActive = isActive;
        }

        if (baseSalary !== undefined) {
          const val = baseSalary !== null ? Number(baseSalary) : null;
          if (existingStaff.baseSalary !== val) {
            sensitiveAudits.push({ fieldName: 'baseSalary', oldValue: existingStaff.baseSalary, newValue: val });
          }
          updateData.baseSalary = val;
        }

        if (hourlyWage !== undefined) {
          const val = hourlyWage !== null ? Number(hourlyWage) : null;
          if (existingStaff.hourlyWage !== val) {
            sensitiveAudits.push({ fieldName: 'hourlyWage', oldValue: existingStaff.hourlyWage, newValue: val });
          }
          updateData.hourlyWage = val;
        }

        if (payBasis !== undefined) {
          if (payBasis !== null && !['HOURLY', 'MONTHLY'].includes(payBasis)) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Hình thức trả lương không hợp lệ.' });
          }
          if (existingStaff.payBasis !== payBasis) {
            sensitiveAudits.push({ fieldName: 'payBasis', oldValue: existingStaff.payBasis, newValue: payBasis });
          }
          updateData.payBasis = payBasis;
        }

        if (seniorityOffset !== undefined) {
          const val = seniorityOffset !== null ? Number(seniorityOffset) : 0;
          if (existingStaff.seniorityOffset !== val) {
            sensitiveAudits.push({
              fieldName: 'seniorityOffset',
              oldValue: existingStaff.seniorityOffset,
              newValue: val,
            });
          }
          updateData.seniorityOffset = val;
        }

        if (staffCode !== undefined) {
          if (existingStaff.staffCode !== staffCode) {
            sensitiveAudits.push({ fieldName: 'staffCode', oldValue: existingStaff.staffCode, newValue: staffCode });
          }
          updateData.staffCode = staffCode;
        }

        if (employmentStatus !== undefined) {
          if (existingStaff.employmentStatus !== employmentStatus) {
            sensitiveAudits.push({
              fieldName: 'employmentStatus',
              oldValue: existingStaff.employmentStatus,
              newValue: employmentStatus,
            });
          }
          updateData.employmentStatus = employmentStatus;
        }

        if (contractStatus !== undefined) {
          if (existingStaff.contractStatus !== contractStatus) {
            sensitiveAudits.push({
              fieldName: 'contractStatus',
              oldValue: existingStaff.contractStatus,
              newValue: contractStatus,
            });
          }
          updateData.contractStatus = contractStatus;
        }

        if (contractStartDate !== undefined) {
          const dateVal = contractStartDate ? new Date(contractStartDate) : null;
          const oldStr = existingStaff.contractStartDate
            ? existingStaff.contractStartDate.toISOString().slice(0, 10)
            : null;
          const newStr = dateVal ? dateVal.toISOString().slice(0, 10) : null;
          if (oldStr !== newStr) {
            sensitiveAudits.push({ fieldName: 'contractStartDate', oldValue: oldStr, newValue: newStr });
          }
          updateData.contractStartDate = dateVal;
        }

        if (contractEndDate !== undefined) {
          const dateVal = contractEndDate ? new Date(contractEndDate) : null;
          const oldStr = existingStaff.contractEndDate
            ? existingStaff.contractEndDate.toISOString().slice(0, 10)
            : null;
          const newStr = dateVal ? dateVal.toISOString().slice(0, 10) : null;
          if (oldStr !== newStr) {
            sensitiveAudits.push({ fieldName: 'contractEndDate', oldValue: oldStr, newValue: newStr });
          }
          updateData.contractEndDate = dateVal;
        }

        if (nationalId !== undefined) {
          if (existingStaff.nationalId !== nationalId) {
            sensitiveAudits.push({ fieldName: 'nationalId', oldValue: existingStaff.nationalId, newValue: nationalId });
          }
          updateData.nationalId = nationalId;
        }

        if (socialInsuranceNo !== undefined) {
          if (existingStaff.socialInsuranceNo !== socialInsuranceNo) {
            sensitiveAudits.push({
              fieldName: 'socialInsuranceNo',
              oldValue: existingStaff.socialInsuranceNo,
              newValue: socialInsuranceNo,
            });
          }
          updateData.socialInsuranceNo = socialInsuranceNo;
        }

        if (bankName !== undefined) {
          if (existingStaff.bankName !== bankName) {
            sensitiveAudits.push({ fieldName: 'bankName', oldValue: existingStaff.bankName, newValue: bankName });
          }
          updateData.bankName = bankName;
        }

        if (bankAccountNumber !== undefined) {
          if (existingStaff.bankAccountNumber !== bankAccountNumber) {
            sensitiveAudits.push({
              fieldName: 'bankAccountNumber',
              oldValue: existingStaff.bankAccountNumber,
              newValue: bankAccountNumber,
            });
          }
          updateData.bankAccountNumber = bankAccountNumber;
        }

        if (username !== undefined && username !== existingStaff.username) {
          const duplicate = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username },
          });
          if (duplicate) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'Tên đăng nhập (Email / Prefix) đã được sử dụng bởi nhân sự khác',
            });
          }
          sensitiveAudits.push({ fieldName: 'username', oldValue: existingStaff.username, newValue: username });
          updateData.username = username;
        }
      }

      const updated = await fastify.prisma.crm.crmStaff.update({
        where: { id: targetId },
        data: updateData,
      });

      // Write audits if any sensitive fields changed
      if (sensitiveAudits.length > 0) {
        await fastify.prisma.crm.crmStaffAudit.createMany({
          data: sensitiveAudits.map((a) => ({
            staffId: targetId,
            actorStaffId: currentUser.id,
            action: 'UPDATE_SENSITIVE_INFO',
            fieldName: a.fieldName,
            oldValue: a.oldValue !== null && a.oldValue !== undefined ? String(a.oldValue) : null,
            newValue: a.newValue !== null && a.newValue !== undefined ? String(a.newValue) : null,
          })),
        });
      }

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
          // Preserve HR overrides while filling missing salary metadata from legacy payroll.
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
              payBasis:
                matchedStaff.payBasis ||
                (baseSalary && baseSalary > 0 ? 'MONTHLY' : hourlyWage && hourlyWage > 0 ? 'HOURLY' : null),
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
              payBasis: baseSalary && baseSalary > 0 ? 'MONTHLY' : hourlyWage && hourlyWage > 0 ? 'HOURLY' : null,
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

      if (
        !mayManageSuperAdmin(request.user.role, targetStaff.role) ||
        sourceStaffs.some((staff) => !mayManageSuperAdmin(request.user.role, staff.role))
      ) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Super Admin mới có thể gộp tài khoản Super Admin.',
        });
      }

      // Execute merge inside Prisma transaction
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const srcId of filteredSources) {
          const sourceStaff = sourceStaffs.find((staff) => staff.id === srcId);
          const assignments = await tx.crmCustomerAssignment.findMany({ where: { staffId: srcId } });
          for (const assignment of assignments) {
            await AllocationLedgerService.setOwner(tx, {
              customerId: assignment.legacyUserId,
              eventType: 'STAFF_MERGED',
              previousStaffId: srcId,
              nextStaffId: targetStaffId,
              actorStaffId: request.user.id,
              previousStaffLabel: sourceStaff?.displayName ?? `Nhân sự #${srcId}`,
              nextStaffLabel: targetStaff.displayName,
              reason: `Gộp tài khoản ${sourceStaff?.displayName ?? `#${srcId}`} vào ${targetStaff.displayName}`,
              sourceType: 'STAFF',
              actionContext: 'STAFF_MERGE',
              correlationId: `staff-merge-${srcId}-to-${targetStaffId}`,
              occurredAt: new Date(),
            });
          }

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

          // 5. Preserve source identity and historical links. Deactivating the duplicate is reversible.
          await tx.crmStaff.update({
            where: { id: srcId },
            data: { isActive: false },
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
