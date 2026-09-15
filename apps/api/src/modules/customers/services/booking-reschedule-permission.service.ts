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
   * Global scheduling scope is granted to Admin/Super Admin, Control staff,
   * Managers, or active BK_CONTROL team members.
   */
  static async hasGlobalRescheduleAccess(fastify: FastifyInstance, actor: BookingRescheduleActor): Promise<boolean> {
    const role = String(actor.role || '')
      .trim()
      .toLowerCase();

    if (isAdminOrSuperAdminRole(role)) return true;
    if (role === 'control' || role === 'manager') return true;

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

    // 1. Check if the customer is directly assigned to the actor
    const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: {
        legacyUserId,
        staffId: actor.id,
      },
      select: { id: true },
    });

    if (assignment) {
      return { allowed: true, reason: 'ALLOWED', message: '' };
    }

    // 2. Check if the actor created any booking for this customer
    try {
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({
        where: { id: actor.id },
        select: { legacyStaffId: true },
      });

      if (crmStaff?.legacyStaffId) {
        const createdOrders = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ id: number }>>(
          'SELECT id FROM `order` WHERE user_id = ? AND created_staff_id = ? LIMIT 1',
          legacyUserId,
          crmStaff.legacyStaffId
        );
        if (createdOrders && createdOrders.length > 0) {
          return { allowed: true, reason: 'ALLOWED', message: '' };
        }
      }
    } catch (err: unknown) {
      fastify.log?.warn?.(err, 'Could not query creator orders for booking reschedule evaluation');
    }

    // 3. Fallback role check for unassigned customers
    const bookingRoles = ['telesales', 'booker', 'manager', 'control', 'cs', 'oc'];
    if (!isTelesalesRole(role) && !bookingRoles.includes(role)) {
      return {
        allowed: false,
        reason: 'ROLE_NOT_ALLOWED',
        message:
          'Tài khoản hiện tại không có quyền dời lịch. Chỉ Admin, BK_CONTROL, Booker hoặc Telesales được thực hiện thao tác này.',
      };
    }

    return {
      allowed: false,
      reason: 'CUSTOMER_NOT_ASSIGNED',
      message:
        'Khách hàng này không thuộc danh sách được phân bổ cho bạn, nên bạn không thể dời lịch. Vui lòng nhờ nhân sự phụ trách hoặc Admin hỗ trợ.',
    };
  }
}
