import { FastifyInstance } from 'fastify';
import { isAdminOrSuperAdminRole, isTelesalesRole } from '@mos-lab/shared';

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

  /**
   * Only telesales and legacy Booker identities are customer-owner scoped.
   * Managers and administrators retain their campaign-wide customer scope.
   */
  static hasGlobalCustomerAccess(user: CustomerAccessUser): boolean {
    return !this.isTelesales(user);
  }

  static hasGlobalCustomerListAccess(user: CustomerAccessUser): boolean {
    return isAdminOrSuperAdminRole(user.role) || user.role === 'manager';
  }

  static resolveListAssignedStaffId(
    user: CustomerAccessUser,
    requestedAssignedStaffId: string | undefined,
    bucket?: string
  ): string | undefined {
    if (this.isTelesales(user)) return 'me';
    if (this.hasGlobalCustomerListAccess(user)) return requestedAssignedStaffId;

    // Keep the narrower legacy list scope intact for every non-manager role.
    if (
      bucket === 'NEW_LOCA' ||
      bucket === 'COMBO_LIVE' ||
      requestedAssignedStaffId === 'ALL' ||
      requestedAssignedStaffId === 'all' ||
      requestedAssignedStaffId === 'unassigned'
    ) {
      return requestedAssignedStaffId;
    }

    return 'me';
  }

  static isPendingAllocationOwner(item: { status: string; batch?: { status: string } | null }): boolean {
    return item.status === 'PENDING_ACCEPT' && item.batch?.status === 'PENDING_ACCEPT';
  }

  /**
   * Customer access is decided solely from the current durable owner row.
   * Historic batch items, assignment history, and ledger events are evidence,
   * not authorization grants.
   */
  static async canAccessCustomer(
    fastify: FastifyInstance,
    user: CustomerAccessUser,
    legacyUserId: number
  ): Promise<boolean> {
    if (this.hasGlobalCustomerAccess(user)) return true;

    const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: {
        legacyUserId,
        staffId: user.id,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  /** @deprecated Use canAccessCustomer so the global-role branch is explicit. */
  static async canTelesalesAccessCustomer(
    fastify: FastifyInstance,
    user: CustomerAccessUser,
    legacyUserId: number
  ): Promise<boolean> {
    return this.canAccessCustomer(fastify, user, legacyUserId);
  }
}
