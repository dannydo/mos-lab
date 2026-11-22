import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';
import { mayManageSuperAdmin } from './staff-access.helpers.js';

export function registerStaffMergeRoutes(fastify: FastifyInstance) {
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
}
