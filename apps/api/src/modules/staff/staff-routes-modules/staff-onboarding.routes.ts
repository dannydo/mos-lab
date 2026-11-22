import { FastifyInstance } from 'fastify';
import {
  type BulkSendOnboardingEmailRequest,
  type BulkSendOnboardingEmailResponse,
  SafeAny,
  type SendOnboardingEmailRequest,
  type SendOnboardingEmailResponse,
} from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import { mailService } from '../../../services/mail.service.js';

export function registerStaffOnboardingRoutes(fastify: FastifyInstance) {
  // POST /api/staff/:id/send-onboarding-email - Send mOS onboarding instructions to a staff member
  fastify.post(
    '/staff/:id/send-onboarding-email',
    { preHandler: [requireAuth, requireRole(['admin', 'hr', 'manager'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const staffId = parseInt(id, 10);
      const body = (request.body || {}) as SendOnboardingEmailRequest;

      if (isNaN(staffId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'ID nhân viên không hợp lệ' });
      }

      try {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: staffId },
        });

        if (!staff) {
          return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy nhân viên' });
        }

        const emailOverride = body.emailOverride?.trim();
        const targetEmail = emailOverride || staff.email?.trim();

        if (!targetEmail || !targetEmail.includes('@')) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Nhân viên "${staff.displayName}" chưa có email hợp lệ. Vui lòng cập nhật email trong hồ sơ hoặc nhập email nhận thư.`,
          });
        }

        // If email was changed by admin/HR, update crmStaff profile automatically
        const updateData: { email?: string; lastOnboardingEmailSentAt: Date } = {
          lastOnboardingEmailSentAt: new Date(),
        };
        if (emailOverride && emailOverride !== staff.email) {
          updateData.email = emailOverride;
        }

        const updatedStaff = await fastify.prisma.crm.crmStaff.update({
          where: { id: staff.id },
          data: updateData,
        });

        // Resolve role name
        const roleRecord = await fastify.prisma.crm.crmRole.findUnique({
          where: { key: staff.role },
        });

        // Send email via mailService
        const sendResult = await mailService.sendOnboardingEmail(targetEmail, {
          displayName: staff.displayName,
          email: targetEmail,
          roleName: roleRecord?.name || staff.role,
        });

        if (!sendResult.success) {
          return reply.status(500).send({
            error: 'Mail Error',
            message: `Gửi email thất bại: ${sendResult.error || 'Lỗi kết nối máy chủ gửi thư'}`,
          });
        }

        const response: SendOnboardingEmailResponse = {
          success: true,
          message: `Đã gửi email hướng dẫn đăng nhập mOS thành công tới ${targetEmail}`,
          sentTo: targetEmail,
          isMock: sendResult.isMock,
          lastOnboardingEmailSentAt: updatedStaff.lastOnboardingEmailSentAt?.toISOString(),
        };

        return response;
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Send onboarding email error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Lỗi hệ thống khi gửi email hướng dẫn đăng nhập',
        });
      }
    }
  );

  // POST /api/staff/bulk-send-onboarding-email - Bulk send onboarding emails
  fastify.post(
    '/staff/bulk-send-onboarding-email',
    { preHandler: [requireAuth, requireRole(['admin', 'hr', 'manager'])] },
    async (request, reply) => {
      const body = request.body as BulkSendOnboardingEmailRequest;
      const staffIds = body?.staffIds;

      if (!Array.isArray(staffIds) || staffIds.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Danh sách nhân viên không được để trống',
        });
      }

      if (staffIds.length > 50) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Mỗi lần gửi tối đa 50 nhân viên để đảm bảo tốc độ và an toàn hộp thư',
        });
      }

      try {
        const staffList = await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: staffIds } },
        });

        const roles = await fastify.prisma.crm.crmRole.findMany();
        const roleMap = new Map(roles.map((r) => [r.key, r.name]));

        const details: BulkSendOnboardingEmailResponse['details'] = [];
        let sentCount = 0;
        let failedCount = 0;

        for (const staff of staffList) {
          const targetEmail = staff.email?.trim();
          if (!targetEmail || !targetEmail.includes('@')) {
            failedCount++;
            details.push({
              staffId: staff.id,
              displayName: staff.displayName,
              email: targetEmail || 'Chưa có email',
              success: false,
              error: 'Chưa có địa chỉ email hợp lệ',
            });
            continue;
          }

          const sendResult = await mailService.sendOnboardingEmail(targetEmail, {
            displayName: staff.displayName,
            email: targetEmail,
            roleName: roleMap.get(staff.role) || staff.role,
          });

          if (sendResult.success) {
            sentCount++;
            await fastify.prisma.crm.crmStaff.update({
              where: { id: staff.id },
              data: { lastOnboardingEmailSentAt: new Date() },
            });
            details.push({
              staffId: staff.id,
              displayName: staff.displayName,
              email: targetEmail,
              success: true,
            });
          } else {
            failedCount++;
            details.push({
              staffId: staff.id,
              displayName: staff.displayName,
              email: targetEmail,
              success: false,
              error: sendResult.error || 'Lỗi gửi mail',
            });
          }
        }

        const response: BulkSendOnboardingEmailResponse = {
          success: sentCount > 0,
          message: `Đã gửi thành công ${sentCount}/${staffList.length} email hướng dẫn đăng nhập mOS`,
          totalRequested: staffIds.length,
          sentCount,
          failedCount,
          details,
        };

        return response;
      } catch (error: SafeAny) {
        fastify.log.error(error as Error, 'Bulk send onboarding email error:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Lỗi hệ thống khi gửi email hướng dẫn hàng loạt',
        });
      }
    }
  );
}
