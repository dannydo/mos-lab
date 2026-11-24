import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { isHrOrAdminRole, SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { invalidateStaffDirectoryCache } from '../../chat/chat-staff-directory.service.js';
import { saveStaffExtraPhonesForStaff } from '../staff-extra-phones.service.js';
import { type CreateStaffInput, getManagedStaffIdsForManager, mayManageSuperAdmin } from './staff-access.helpers.js';

interface SensitiveAuditEntry {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
}

function applyAuditedDateField(
  updateData: Record<string, unknown>,
  sensitiveAudits: SensitiveAuditEntry[],
  fieldName: string,
  rawDate: string | null | undefined,
  existingDate: Date | null
): void {
  if (rawDate === undefined) return;
  const dateVal = rawDate ? new Date(rawDate) : null;
  const oldStr = existingDate ? existingDate.toISOString().slice(0, 10) : null;
  const newStr = dateVal ? dateVal.toISOString().slice(0, 10) : null;
  if (oldStr !== newStr) {
    sensitiveAudits.push({ fieldName, oldValue: oldStr, newValue: newStr });
  }
  updateData[fieldName] = dateVal;
}

function applyAuditedScalarField<T>(
  updateData: Record<string, unknown>,
  sensitiveAudits: SensitiveAuditEntry[],
  fieldName: string,
  newValue: T | undefined,
  existingValue: T | null
): void {
  if (newValue === undefined) return;
  if (existingValue !== newValue) {
    sensitiveAudits.push({ fieldName, oldValue: existingValue, newValue });
  }
  updateData[fieldName] = newValue;
}

export function registerStaffUpdateRoutes(fastify: FastifyInstance) {
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
      extraPhones,
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
      const sensitiveAudits: SensitiveAuditEntry[] = [];

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
      if (isHrOrAdmin || isDirectManager) {
        applyAuditedDateField(updateData, sensitiveAudits, 'birthDate', birthDate, existingStaff.birthDate);
        applyAuditedDateField(updateData, sensitiveAudits, 'joinedAt', joinedAt, existingStaff.joinedAt);
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

        applyAuditedScalarField(updateData, sensitiveAudits, 'isActive', isActive, existingStaff.isActive);

        if (baseSalary !== undefined) {
          const val = baseSalary !== null ? Number(baseSalary) : null;
          applyAuditedScalarField(updateData, sensitiveAudits, 'baseSalary', val, existingStaff.baseSalary);
        }

        if (hourlyWage !== undefined) {
          const val = hourlyWage !== null ? Number(hourlyWage) : null;
          applyAuditedScalarField(updateData, sensitiveAudits, 'hourlyWage', val, existingStaff.hourlyWage);
        }

        if (payBasis !== undefined) {
          if (payBasis !== null && !['HOURLY', 'MONTHLY'].includes(payBasis)) {
            return reply.status(400).send({ error: 'Bad Request', message: 'Hình thức trả lương không hợp lệ.' });
          }
          applyAuditedScalarField(updateData, sensitiveAudits, 'payBasis', payBasis, existingStaff.payBasis);
        }

        if (seniorityOffset !== undefined) {
          const val = seniorityOffset !== null ? Number(seniorityOffset) : 0;
          applyAuditedScalarField(updateData, sensitiveAudits, 'seniorityOffset', val, existingStaff.seniorityOffset);
        }

        applyAuditedScalarField(updateData, sensitiveAudits, 'staffCode', staffCode, existingStaff.staffCode);
        applyAuditedScalarField(
          updateData,
          sensitiveAudits,
          'employmentStatus',
          employmentStatus,
          existingStaff.employmentStatus
        );
        applyAuditedScalarField(
          updateData,
          sensitiveAudits,
          'contractStatus',
          contractStatus,
          existingStaff.contractStatus
        );
        applyAuditedDateField(
          updateData,
          sensitiveAudits,
          'contractStartDate',
          contractStartDate,
          existingStaff.contractStartDate
        );
        applyAuditedDateField(
          updateData,
          sensitiveAudits,
          'contractEndDate',
          contractEndDate,
          existingStaff.contractEndDate
        );
        applyAuditedScalarField(updateData, sensitiveAudits, 'nationalId', nationalId, existingStaff.nationalId);
        applyAuditedScalarField(
          updateData,
          sensitiveAudits,
          'socialInsuranceNo',
          socialInsuranceNo,
          existingStaff.socialInsuranceNo
        );
        applyAuditedScalarField(updateData, sensitiveAudits, 'bankName', bankName, existingStaff.bankName);
        applyAuditedScalarField(
          updateData,
          sensitiveAudits,
          'bankAccountNumber',
          bankAccountNumber,
          existingStaff.bankAccountNumber
        );

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

      if (extraPhones !== undefined) {
        const primaryAfter = phone !== undefined ? (updateData.phone as string | null) : existingStaff.phone;
        await saveStaffExtraPhonesForStaff(fastify, targetId, extraPhones, primaryAfter);
      }

      if (phone !== undefined || extraPhones !== undefined) {
        invalidateStaffDirectoryCache();
      }

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
}
