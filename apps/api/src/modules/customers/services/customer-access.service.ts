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
   * Finds an active Shared Pool campaign customer record for a given staff member.
   * A customer is considered in the staff member's Active Pool if:
   * 1. The campaign is ACTIVE, not deleted, and operates in SHARED_POOL mode.
   * 2. The staff member is authorized for this campaign (assignedStaffIds is empty or contains staffId).
   * 3. The customer is active in the campaign (removedAt is null, poolStatus is not 'EXCLUDED').
   * 4. The customer's batch has been activated (batchNumber <= campaign.currentBatchNumber).
   */
  static async findActiveSharedPoolCustomer(
    fastify: FastifyInstance,
    staffId: number,
    legacyUserId: number
  ): Promise<{
    campaignId: number;
    campaignCustomerId: number;
    poolStatus: string;
    claimedByStaffId: number | null;
    claimedByStaffName: string | null;
    claimExpiresAt: Date | null;
    isClaimedByMe: boolean;
    isClaimedByOther: boolean;
  } | null> {
    if (!fastify.prisma?.crm?.crmCampaignCustomer?.findMany) return null;

    const records = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId,
        removedAt: null,
        poolStatus: { not: 'EXCLUDED' },
        campaign: {
          operationMode: 'SHARED_POOL',
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      select: {
        id: true,
        campaignId: true,
        batchNumber: true,
        poolStatus: true,
        claimedByStaffId: true,
        claimedByStaffName: true,
        claimExpiresAt: true,
        campaign: {
          select: {
            id: true,
            currentBatchNumber: true,
            assignedStaffIds: true,
          },
        },
      },
    });

    if (records.length === 0) return null;

    const now = new Date();
    for (const record of records) {
      const { campaign } = record;
      let isMember = false;
      if (!campaign.assignedStaffIds || campaign.assignedStaffIds.trim() === '' || campaign.assignedStaffIds === '[]') {
        isMember = true;
      } else {
        try {
          const allowedIds = JSON.parse(campaign.assignedStaffIds);
          if (Array.isArray(allowedIds)) {
            isMember = allowedIds.length === 0 || allowedIds.includes(staffId);
          }
        } catch {
          isMember = false;
        }
      }

      if (!isMember) continue;

      const currentBatch = campaign.currentBatchNumber || 1;
      if (record.batchNumber <= currentBatch) {
        const isClaimedActive =
          record.poolStatus === 'CLAIMED' &&
          Boolean(record.claimExpiresAt && record.claimExpiresAt > now);

        const isClaimedByMe = isClaimedActive && record.claimedByStaffId === staffId;
        const isClaimedByOther = isClaimedActive && record.claimedByStaffId !== staffId;

        return {
          campaignId: record.campaignId,
          campaignCustomerId: record.id,
          poolStatus: record.poolStatus,
          claimedByStaffId: record.claimedByStaffId,
          claimedByStaffName: record.claimedByStaffName,
          claimExpiresAt: record.claimExpiresAt,
          isClaimedByMe,
          isClaimedByOther,
        };
      }
    }

    return null;
  }

  /**
   * Customer read access: granted to global managers/admins, durable assigned telesales,
   * or any verified staff member whose active Shared Pool campaign includes this customer.
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

    if (assignment) return true;

    const sharedPoolCust = await this.findActiveSharedPoolCustomer(fastify, user.id, legacyUserId);
    return Boolean(sharedPoolCust);
  }

  /**
   * Customer mutate access: write operations (edit, booking, notes, calls) require either
   * durable ownership or an active Claim lock in the Shared Pool.
   */
  static async canMutateCustomer(
    fastify: FastifyInstance,
    user: CustomerAccessUser,
    legacyUserId: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (this.hasGlobalCustomerAccess(user)) return { allowed: true };

    const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
      where: {
        legacyUserId,
        staffId: user.id,
      },
      select: { id: true },
    });

    if (assignment) return { allowed: true };

    const sharedPoolCust = await this.findActiveSharedPoolCustomer(fastify, user.id, legacyUserId);
    if (sharedPoolCust) {
      if (sharedPoolCust.isClaimedByMe) {
        return { allowed: true };
      }
      if (sharedPoolCust.isClaimedByOther) {
        return {
          allowed: false,
          reason: `Khách hàng đang được xử lý bởi ${sharedPoolCust.claimedByStaffName || 'nhân viên khác'} trong Shared Pool.`,
        };
      }
      return {
        allowed: false,
        reason: 'Bạn cần nhận (Claim) khách hàng này trong Shared Pool trước khi thao tác.',
      };
    }

    return {
      allowed: false,
      reason: 'Telesales chỉ được xem và thao tác trên khách hàng đã được phân bổ cho mình.',
    };
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
