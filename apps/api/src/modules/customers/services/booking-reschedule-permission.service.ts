import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, isTelesalesRole } from '@mos-lab/shared';
import { TeamService } from '../../teams/team.service.js';

export type BookingRescheduleActor = {
  id: number;
  role?: string | null;
};

export type BookingRescheduleEligibility = {
  allowed: boolean;
  reason: 'ALLOWED' | 'ROLE_NOT_ALLOWED' | 'CUSTOMER_NOT_ASSIGNED';
  message: string;
};

/**
 * The single authorization policy used by both the preflight UI check and the
 * mutation endpoint. A client-side popup is helpful, but it must never be the
 * authority for a schedule write.
 */
export class BookingReschedulePermissionService {
  /**
   * Global scheduling scope is deliberately narrower than general customer
   * administration. Active BK_CONTROL membership is the source of truth.
   */
  static async hasGlobalRescheduleAccess(fastify: FastifyInstance, actor: BookingRescheduleActor): Promise<boolean> {
    if (isAdminOrSuperAdminRole(actor.role)) return true;

    return TeamService.isActiveCrmStaffMember(fastify, 'BK_CONTROL', actor.id, 'ACTIVE_BK_CONTROL_STAFF_CONFIG');
  }

  static async evaluate(
    fastify: FastifyInstance,
    actor: BookingRescheduleActor,
    legacyUserId: number
  ): Promise<BookingRescheduleEligibility> {
    const role = String(actor.role || '')
      .trim()
      .toLowerCase();

    if (await this.hasGlobalRescheduleAccess(fastify, actor)) {
      return { allowed: true, reason: 'ALLOWED', message: '' };
    }

    if (!isTelesalesRole(role)) {
      return {
        allowed: false,
        reason: 'ROLE_NOT_ALLOWED',
        message:
          'Tài khoản hiện tại không có quyền dời lịch. Chỉ Admin, BK_CONTROL, Booker hoặc Telesales được thực hiện thao tác này.',
      };
    }

    const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: {
        legacyUserId,
        staffId: actor.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (assignment) {
      return { allowed: true, reason: 'ALLOWED', message: '' };
    }

    return {
      allowed: false,
      reason: 'CUSTOMER_NOT_ASSIGNED',
      message:
        'Khách hàng này không thuộc danh sách được phân bổ cho bạn, nên bạn không thể dời lịch. Vui lòng nhờ nhân sự phụ trách hoặc Admin hỗ trợ.',
    };
  }
}
