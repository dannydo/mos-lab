import { FastifyInstance } from 'fastify';
import { isTelesalesRole } from '@mos-lab/shared';

export interface CustomerAccessUser {
  id: number;
  role?: string | null;
}

/**
 * Access boundary for telesales customer data.
 *
 * Telesales and legacy Booker accounts may only read or interact with
 * customers assigned to their CRM staff account. Assignments are durable until
 * a manager explicitly moves or recalls them. Roles outside this
 * customer-facing group retain their existing endpoint-specific access policies.
 */
export class CustomerAccessService {
  static isTelesales(user: CustomerAccessUser): boolean {
    return isTelesalesRole(user.role);
  }

  static async canTelesalesAccessCustomer(
    fastify: FastifyInstance,
    user: CustomerAccessUser,
    legacyUserId: number
  ): Promise<boolean> {
    if (!this.isTelesales(user)) return true;

    const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: {
        legacyUserId,
        staffId: user.id,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }
}
