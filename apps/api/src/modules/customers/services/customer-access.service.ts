import { FastifyInstance } from 'fastify';

export interface CustomerAccessUser {
  id: number;
  role?: string | null;
}

/**
 * Access boundary for telesales customer data.
 *
 * Telesales may only read or interact with customers currently assigned to
 * their CRM staff account. Roles outside telesales retain their existing
 * endpoint-specific access policies.
 */
export class CustomerAccessService {
  static isTelesales(user: CustomerAccessUser): boolean {
    return user.role?.trim().toLowerCase() === 'telesales';
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
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }
}
