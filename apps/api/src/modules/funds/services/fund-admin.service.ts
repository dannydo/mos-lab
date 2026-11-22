import { Prisma } from '../../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type { CreateFundRequest, Fund, UpdateFundConfigRequest, UpdateFundRequest } from '@mos-lab/shared';
import { FundError, type FundActor } from './fund-types.js';
import { getFundOverview } from './fund-queries.service.js';

/**
 * Cập nhật Cấu hình Quỹ (Hạn mức, Dung sai, Ngưỡng cảnh báo)
 */
export async function updateFundConfig(
  crm: CrmPrismaClient,
  fundId: string,
  input: UpdateFundConfigRequest
): Promise<Fund> {
  const data: Prisma.CrmFundUpdateInput = {};
  if (input.maxQuota !== undefined) data.maxQuota = new Prisma.Decimal(input.maxQuota);
  if (input.unitQuota !== undefined) data.unitQuota = new Prisma.Decimal(input.unitQuota);
  if (input.alertThresholdPercent !== undefined) data.alertThresholdPercent = input.alertThresholdPercent;
  if (input.toleranceMode !== undefined) data.toleranceMode = input.toleranceMode;
  if (input.toleranceAmount !== undefined) data.toleranceAmount = new Prisma.Decimal(input.toleranceAmount);

  await crm.crmFund.update({
    where: { id: fundId },
    data,
  });

  const overview = await getFundOverview(crm, fundId);
  return overview;
}

/**
 * Tạo Quỹ Mới (MOS-FEAT-177: Bước 2 Hoàn Thiện Chức Năng Tạo Quỹ Mới)
 * Lưu ý invariant: Số dư ban đầu luôn là 0đ, trạng thái mặc định DRAFT, không tự động cấp vốn.
 */
export async function createFund(crm: CrmPrismaClient, input: CreateFundRequest, actor: FundActor): Promise<Fund> {
  const name = (input.name || '').trim();
  if (!name) {
    throw new FundError('Tên quỹ không được để trống', 400);
  }

  const code = (input.code || '').trim().toUpperCase();
  if (!code) {
    throw new FundError('Mã quỹ không được để trống', 400);
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new FundError('Mã quỹ chỉ được chứa ký tự chữ hoa, chữ số, dấu gạch dưới hoặc gạch nối', 400);
  }

  const existingCode = await crm.crmFund.findUnique({
    where: { code },
  });
  if (existingCode) {
    throw new FundError(`Mã quỹ "${code}" đã tồn tại. Vui lòng chọn mã quỹ khác.`, 409);
  }

  const maxQuota = Number(input.maxQuota);
  if (isNaN(maxQuota) || maxQuota <= 0) {
    throw new FundError('Hạn mức quỹ phải là số lớn hơn 0', 400);
  }

  const unitQuota = Number(input.unitQuota);
  if (isNaN(unitQuota) || unitQuota <= 0) {
    throw new FundError('Định mức chi/giao dịch phải là số lớn hơn 0', 400);
  }

  const alertThresholdPercent = input.alertThresholdPercent ?? 80;
  if (alertThresholdPercent < 1 || alertThresholdPercent > 100) {
    throw new FundError('Ngưỡng cảnh báo phải từ 1% đến 100%', 400);
  }

  const toleranceMode = input.toleranceMode || 'STRICT';
  const toleranceAmount = input.toleranceAmount ?? 0;
  const status = input.status || 'DRAFT';
  const fundId = `fund-${code.toLowerCase().replace(/_/g, '-')}`;

  await crm.$transaction(async (tx) => {
    // 1. Tạo CrmFund với số dư ban đầu 0đ
    await tx.crmFund.create({
      data: {
        id: fundId,
        code,
        name,
        description: input.description?.trim() || null,
        currentBalance: new Prisma.Decimal(0),
        maxQuota: new Prisma.Decimal(maxQuota),
        unitQuota: new Prisma.Decimal(unitQuota),
        alertThresholdPercent,
        toleranceMode,
        toleranceAmount: new Prisma.Decimal(toleranceAmount),
        approvalConfigJson: input.approvalConfig ? JSON.stringify(input.approvalConfig) : null,
        status,
      },
    });

    // 2. Tạo roles và assignments nếu có
    if (Array.isArray(input.roles) && input.roles.length > 0) {
      const allStaffIds = input.roles.flatMap((r) => r.assignedStaffIds || []);
      const uniqueStaffIds = Array.from(new Set(allStaffIds.filter((id) => Number(id) > 0)));
      const staffMap = new Map<number, string>();
      if (uniqueStaffIds.length > 0) {
        const staffRecords = await tx.crmStaff.findMany({
          where: { id: { in: uniqueStaffIds } },
          select: { id: true, displayName: true, username: true },
        });
        for (const s of staffRecords) {
          staffMap.set(s.id, s.displayName || s.username);
        }
      }

      for (const roleInput of input.roles) {
        const roleKey = roleInput.roleKey.trim().toUpperCase();
        const roleName = roleInput.roleName.trim() || roleKey;
        const roleId = `role-${fundId}-${roleKey.toLowerCase()}-${Date.now().toString(36)}`;

        await tx.crmFundRole.create({
          data: {
            id: roleId,
            fundId,
            roleKey,
            roleName,
            permissionsJson: JSON.stringify(roleInput.permissions || []),
          },
        });

        if (Array.isArray(roleInput.assignedStaffIds)) {
          for (const staffId of roleInput.assignedStaffIds) {
            const sId = Number(staffId);
            if (sId > 0) {
              const sName = staffMap.get(sId) || `Nhân sự #${sId}`;
              await tx.crmFundRoleAssignment.create({
                data: {
                  id: `assign-${fundId}-${roleKey.toLowerCase()}-${sId}-${Date.now().toString(36)}`,
                  fundId,
                  roleKey,
                  staffId: sId,
                  staffName: sName,
                  assignedByStaffId: actor.id,
                },
              });
            }
          }
        }
      }
    }
  });

  return await getFundOverview(crm, fundId);
}

/**
 * Cập nhật Toàn Diện Quỹ (Chỉnh sửa thông tin, tài chính, vai trò & quy trình duyệt)
 */
export async function updateFund(
  crm: CrmPrismaClient,
  fundId: string,
  input: UpdateFundRequest,
  actor: FundActor
): Promise<Fund> {
  const existing = await crm.crmFund.findUnique({
    where: { id: fundId },
  });
  if (!existing) {
    throw new FundError(`Quỹ không tồn tại (id: ${fundId})`, 404);
  }

  if (input.code) {
    const newCode = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(newCode)) {
      throw new FundError('Mã quỹ chỉ được chứa ký tự chữ hoa, chữ số, dấu gạch dưới hoặc gạch nối', 400);
    }
    if (newCode !== existing.code) {
      const conflict = await crm.crmFund.findUnique({ where: { code: newCode } });
      if (conflict) {
        throw new FundError(`Mã quỹ "${newCode}" đã tồn tại. Vui lòng chọn mã quỹ khác.`, 409);
      }
    }
  }

  if (input.maxQuota !== undefined && (isNaN(Number(input.maxQuota)) || Number(input.maxQuota) <= 0)) {
    throw new FundError('Hạn mức quỹ phải là số lớn hơn 0', 400);
  }

  if (input.unitQuota !== undefined && (isNaN(Number(input.unitQuota)) || Number(input.unitQuota) <= 0)) {
    throw new FundError('Định mức chi/giao dịch phải là số lớn hơn 0', 400);
  }

  if (
    input.alertThresholdPercent !== undefined &&
    (input.alertThresholdPercent < 1 || input.alertThresholdPercent > 100)
  ) {
    throw new FundError('Ngưỡng cảnh báo phải từ 1% đến 100%', 400);
  }

  await crm.$transaction(async (tx) => {
    const updateData: Prisma.CrmFundUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code.trim().toUpperCase();
    if (input.description !== undefined) updateData.description = input.description ? input.description.trim() : null;
    if (input.maxQuota !== undefined) updateData.maxQuota = new Prisma.Decimal(input.maxQuota);
    if (input.unitQuota !== undefined) updateData.unitQuota = new Prisma.Decimal(input.unitQuota);
    if (input.alertThresholdPercent !== undefined) updateData.alertThresholdPercent = input.alertThresholdPercent;
    if (input.toleranceMode !== undefined) updateData.toleranceMode = input.toleranceMode;
    if (input.toleranceAmount !== undefined) updateData.toleranceAmount = new Prisma.Decimal(input.toleranceAmount);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.approvalConfig !== undefined) {
      updateData.approvalConfigJson = input.approvalConfig ? JSON.stringify(input.approvalConfig) : null;
    }

    await tx.crmFund.update({
      where: { id: fundId },
      data: updateData,
    });

    // Nếu cung cấp roles, thay thế roles & assignments
    if (Array.isArray(input.roles)) {
      await tx.crmFundRoleAssignment.deleteMany({ where: { fundId } });
      await tx.crmFundRole.deleteMany({ where: { fundId } });

      const allStaffIds = input.roles.flatMap((r) => r.assignedStaffIds || []);
      const uniqueStaffIds = Array.from(new Set(allStaffIds.filter((id) => Number(id) > 0)));
      const staffMap = new Map<number, string>();
      if (uniqueStaffIds.length > 0) {
        const staffRecords = await tx.crmStaff.findMany({
          where: { id: { in: uniqueStaffIds } },
          select: { id: true, displayName: true, username: true },
        });
        for (const s of staffRecords) {
          staffMap.set(s.id, s.displayName || s.username);
        }
      }

      for (const roleInput of input.roles) {
        const roleKey = roleInput.roleKey.trim().toUpperCase();
        const roleName = roleInput.roleName.trim() || roleKey;
        const roleId = `role-${fundId}-${roleKey.toLowerCase()}-${Date.now().toString(36)}`;

        await tx.crmFundRole.create({
          data: {
            id: roleId,
            fundId,
            roleKey,
            roleName,
            permissionsJson: JSON.stringify(roleInput.permissions || []),
          },
        });

        if (Array.isArray(roleInput.assignedStaffIds)) {
          for (const staffId of roleInput.assignedStaffIds) {
            const sId = Number(staffId);
            if (sId > 0) {
              const sName = staffMap.get(sId) || `Nhân sự #${sId}`;
              await tx.crmFundRoleAssignment.create({
                data: {
                  id: `assign-${fundId}-${roleKey.toLowerCase()}-${sId}-${Date.now().toString(36)}`,
                  fundId,
                  roleKey,
                  staffId: sId,
                  staffName: sName,
                  assignedByStaffId: actor.id,
                },
              });
            }
          }
        }
      }
    }
  });

  return await getFundOverview(crm, fundId);
}
