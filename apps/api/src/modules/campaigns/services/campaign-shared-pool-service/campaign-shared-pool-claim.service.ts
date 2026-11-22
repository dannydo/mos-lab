/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import { SharedPoolBroadcaster } from '../../campaign-shared-pool-broadcaster.js';
import { invalidateCampaignCache } from './campaign-shared-pool-cache.js';
import {
  findCampaignCustomer,
  parseAssignedStaffIds,
  parseSharedPoolConfig,
  resolveStaffDisplayName,
} from './campaign-shared-pool-helpers.js';
import { maintainSharedPool } from './campaign-shared-pool-maintenance.service.js';

/**
 * Claim / Lock customer in Shared Pool for a specific staff member.
 */
export async function claimCustomer(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  staffId: number
): Promise<{ success: boolean; message: string; customer: any }> {
  await maintainSharedPool(fastify, campaignId);

  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error('Chiến dịch không tồn tại.');

  const config = parseSharedPoolConfig(campaign.sharedPoolConfig);

  if (config.isPaused) {
    throw new Error('Shared Pool đang tạm dừng khai thác bởi Quản lý.');
  }

  // Verify staff membership
  const allowedStaffIds = parseAssignedStaffIds(campaign.assignedStaffIds);

  const staff = await fastify.prisma.crm.crmStaff.findUnique({
    where: { id: staffId },
    select: { id: true, displayName: true, username: true, role: true },
  });
  if (!staff) throw new Error('Nhân viên không tồn tại.');

  const isAdmin = staff.role === 'admin' || staff.role === 'manager';
  if (!isAdmin && Array.isArray(allowedStaffIds) && allowedStaffIds.length > 0 && !allowedStaffIds.includes(staffId)) {
    throw new Error('Bạn không có quyền khai thác chiến dịch này.');
  }

  // Max claims enforcement
  const maxClaims = config.maxClaimsPerStaff || 1;
  const now = new Date();
  const currentClaimsCount = await fastify.prisma.crm.crmCampaignCustomer.count({
    where: {
      campaignId,
      claimedByStaffId: staffId,
      poolStatus: 'CLAIMED',
      claimExpiresAt: { gt: now },
      removedAt: null,
    },
  });

  if (currentClaimsCount >= maxClaims) {
    throw new Error(
      `Bạn đang giữ ${currentClaimsCount} khách chưa xử lý xong (giới hạn ${maxClaims} khách). Vui lòng xử lý hoặc nhả khách trước khi nhận thêm!`
    );
  }

  // Fetch customer
  const customer = await findCampaignCustomer(fastify, campaignId, customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch này.');

  const ttlMs = (config.claimTtlMinutes || 15) * 60 * 1000;
  const claimExpiresAt = new Date(now.getTime() + ttlMs);
  const staffDisplayName = staff.displayName || staff.username;

  const targetBatchNumber =
    campaign && campaign.operationMode === 'SHARED_POOL' && campaign.currentBatchNumber
      ? campaign.currentBatchNumber
      : customer.batchNumber;

  // If customer has completed RECYCLE period but wasn't transitioned yet (or race condition),
  // automatically reset all old claim/lock fields and return customer to AVAILABLE in active batch.
  if (
    (customer.poolStatus === 'RECYCLING' || customer.poolStatus === 'RECYCLE') &&
    (!customer.availableAt || customer.availableAt <= now)
  ) {
    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: 'AVAILABLE',
        availableAt: null,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        batchNumber: targetBatchNumber,
      },
    });
    customer.poolStatus = 'AVAILABLE';
    customer.cooldownUntil = null;
    customer.availableAt = null;
    customer.batchNumber = targetBatchNumber;
  }

  // Atomic conditional update ensuring only 1 staff can claim an AVAILABLE customer
  const updateResult = await fastify.prisma.crm.crmCampaignCustomer.updateMany({
    where: {
      id: customer.id,
      campaignId,
      removedAt: null,
      poolStatus: 'AVAILABLE',
      OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
    },
    data: {
      poolStatus: 'CLAIMED',
      claimedByStaffId: staffId,
      claimedByStaffName: staffDisplayName,
      claimedAt: now,
      claimExpiresAt,
      batchNumber: targetBatchNumber,
    },
  });

  if (updateResult.count === 0) {
    const fresh = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        poolStatus: true,
        claimedByStaffId: true,
        claimedByStaffName: true,
        claimExpiresAt: true,
        cooldownUntil: true,
        availableAt: true,
      },
    });
    if (!fresh) throw new Error('Khách hàng không tồn tại trong chiến dịch này.');
    if (fresh.poolStatus === 'CLAIMED') {
      if (fresh.claimedByStaffId === staffId && fresh.claimExpiresAt && fresh.claimExpiresAt > now) {
        return {
          success: true,
          message: `Bạn đang giữ khách hàng này. Bạn có thêm ${Math.round((fresh.claimExpiresAt.getTime() - now.getTime()) / 60000)} phút để xử lý.`,
          customer: {
            ...fresh,
            claimRemainingSeconds: Math.round((fresh.claimExpiresAt.getTime() - now.getTime()) / 1000),
          },
        };
      }
      throw new Error(`Khách hàng đang được xử lý bởi ${fresh.claimedByStaffName || 'nhân viên khác'}.`);
    }
    if (fresh.poolStatus === 'RECYCLING' || fresh.poolStatus === 'RECYCLE') {
      if (!fresh.availableAt || fresh.availableAt <= now) {
        // Recycle wait period has ended: self-heal and atomically claim
        const healResult = await fastify.prisma.crm.crmCampaignCustomer.updateMany({
          where: {
            id: customer.id,
            campaignId,
            removedAt: null,
            poolStatus: { in: ['RECYCLING', 'RECYCLE'] },
            OR: [{ availableAt: null }, { availableAt: { lte: now } }],
          },
          data: {
            poolStatus: 'CLAIMED',
            claimedByStaffId: staffId,
            claimedByStaffName: staffDisplayName,
            claimedAt: now,
            claimExpiresAt,
            availableAt: null,
            cooldownUntil: null,
            batchNumber: targetBatchNumber,
          },
        });
        if (healResult.count === 0) {
          throw new Error('Khách hàng vừa được nhận hoặc thay đổi trạng thái bởi nhân viên khác.');
        }
      } else {
        throw new Error('Khách hàng đang trong thời gian chờ tái sinh, chưa thể nhận lại.');
      }
    } else if (fresh.poolStatus === 'EXCLUDED') {
      throw new Error('Khách hàng đã bị loại khỏi Shared Pool (Chờ kiểm tra) và không được phép nhận lại.');
    } else if (fresh.poolStatus === 'BOOKED') {
      throw new Error('Khách hàng đã chốt Booking và rời khỏi Shared Pool.');
    } else if (fresh.cooldownUntil && fresh.cooldownUntil > now) {
      const remainingMin = Math.ceil((fresh.cooldownUntil.getTime() - now.getTime()) / (60 * 1000));
      throw new Error(`Khách hàng đang trong thời gian Cooldown chống spam (còn ${remainingMin} phút).`);
    } else {
      throw new Error(`Khách hàng hiện không ở trạng thái sẵn sàng để nhận (Pool Status: ${fresh.poolStatus}).`);
    }
  }

  const updated = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
    where: { id: customer.id },
  });

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: customer.id,
      legacyUserId: customer.legacyUserId,
      staffId,
      staffName: staffDisplayName,
      action: 'CLAIM',
      note: `Nhân viên ${staffDisplayName} nhận khách vào xử lý (hạn giữ: ${config.claimTtlMinutes || 15} phút).`,
      metadata: JSON.stringify({
        previousPoolStatus: customer.poolStatus,
        nextPoolStatus: 'CLAIMED',
        claimedAt: now.toISOString(),
        claimExpiresAt: claimExpiresAt.toISOString(),
        ttlMinutes: config.claimTtlMinutes || 15,
        result: 'SUCCESS',
      }),
      createdAt: now,
    },
  });

  SharedPoolBroadcaster.broadcast(campaignId, {
    type: 'CUSTOMER_CLAIMED',
    customerId: customer.id,
    legacyUserId: customer.legacyUserId,
    claimedByStaffId: staffId,
    claimedByStaffName: staffDisplayName,
    claimExpiresAt: claimExpiresAt.toISOString(),
  });

  invalidateCampaignCache(fastify, campaignId);

  return {
    success: true,
    message: `Đã nhận thành công khách hàng. Bạn có ${config.claimTtlMinutes || 15} phút để xử lý.`,
    customer: {
      ...updated,
      claimRemainingSeconds: Math.round(ttlMs / 1000),
    },
  };
}

/**
 * Release Claim / Unlock customer back to Shared Pool.
 */
export async function releaseClaim(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  staffId: number,
  isManager: boolean = false
): Promise<{ success: boolean; message: string }> {
  const customer = await findCampaignCustomer(fastify, campaignId, customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

  if (customer.poolStatus !== 'CLAIMED') {
    return { success: true, message: 'Khách hàng không ở trạng thái bị giữ (Claimed).' };
  }

  if (!isManager && customer.claimedByStaffId !== staffId) {
    throw new Error('Bạn không có quyền nhả khách do người khác đang giữ.');
  }

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'NV');
  const now = new Date();

  await fastify.prisma.crm.crmCampaignCustomer.update({
    where: { id: customer.id },
    data: {
      poolStatus: 'AVAILABLE',
      claimedByStaffId: null,
      claimedByStaffName: null,
      claimedAt: null,
      claimExpiresAt: null,
    },
  });

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: customer.id,
      legacyUserId: customer.legacyUserId,
      staffId,
      staffName: staffDisplayName,
      action: isManager ? 'RELEASE_MANAGER' : 'RELEASE_MANUAL',
      note: isManager
        ? `Quản lý giải phóng claim của ${customer.claimedByStaffName || 'nhân viên'}.`
        : 'Nhân viên chủ động nhả khách về Shared Pool.',
      metadata: JSON.stringify({
        previousPoolStatus: 'CLAIMED',
        nextPoolStatus: 'AVAILABLE',
        previousClaimedByStaffId: customer.claimedByStaffId,
        previousClaimedByStaffName: customer.claimedByStaffName,
        reason: isManager ? 'MANAGER_OVERRIDE' : 'STAFF_RELEASE',
        releasedAt: now.toISOString(),
        result: 'SUCCESS',
      }),
      createdAt: now,
    },
  });

  SharedPoolBroadcaster.broadcast(campaignId, {
    type: 'CUSTOMER_RELEASED',
    customerId: customer.id,
    legacyUserId: customer.legacyUserId,
    reason: isManager ? 'RELEASE_MANAGER' : 'RELEASE_MANUAL',
  });

  invalidateCampaignCache(fastify, campaignId);

  return {
    success: true,
    message: 'Đã giải phóng khách hàng về Shared Pool thành công.',
  };
}
