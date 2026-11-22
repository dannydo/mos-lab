import type { FastifyInstance } from 'fastify';
import type { SharedPoolConfig } from '@mos-lab/shared';
import { SharedPoolBroadcaster } from '../../campaign-shared-pool-broadcaster.js';
import { invalidateCampaignCache } from './campaign-shared-pool-cache.js';
import { releaseClaim } from './campaign-shared-pool-claim.service.js';
import {
  findCampaignCustomer,
  parseSharedPoolConfig,
  resolveStaffDisplayName,
} from './campaign-shared-pool-helpers.js';

const TOGGLE_PAUSE_DEFAULT_CONFIG: SharedPoolConfig = {
  batchSize: 100,
  claimTtlMinutes: 15,
  maxClaimsPerStaff: 1,
  cooldownMinutes: 60,
  warningThreshold: 30,
  criticalThreshold: 10,
  isPaused: false,
};

/**
 * Advance Shared Pool to target or next batch manually.
 */
export async function advanceBatch(
  fastify: FastifyInstance,
  campaignId: number,
  staffId: number,
  targetBatchNumber?: number
): Promise<{ success: boolean; message: string; currentBatchNumber: number }> {
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
    select: { currentBatchNumber: true },
  });
  if (!campaign) throw new Error('Chiến dịch không tồn tại.');

  const nextBatch = targetBatchNumber || campaign.currentBatchNumber + 1;

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'NV');
  const now = new Date();

  await fastify.prisma.crm.crmCustomCampaign.update({
    where: { id: campaignId },
    data: { currentBatchNumber: nextBatch },
  });

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: null,
      legacyUserId: null,
      staffId,
      staffName: staffDisplayName,
      action: 'MANUAL_ADVANCE_BATCH',
      note: `Quản lý chuyển mở Batch ${nextBatch}.`,
      metadata: JSON.stringify({
        previousBatchNumber: campaign.currentBatchNumber,
        nextBatchNumber: nextBatch,
        result: 'SUCCESS',
      }),
      createdAt: now,
    },
  });

  SharedPoolBroadcaster.broadcast(campaignId, {
    type: 'BATCH_ADVANCED',
    currentBatchNumber: nextBatch,
  });

  invalidateCampaignCache(fastify, campaignId);

  return {
    success: true,
    message: `Đã chuyển sang Batch ${nextBatch} thành công.`,
    currentBatchNumber: nextBatch,
  };
}

/**
 * Pause / Resume Shared Pool exploitation.
 */
export async function togglePause(
  fastify: FastifyInstance,
  campaignId: number,
  staffId: number,
  isPaused: boolean
): Promise<{ success: boolean; message: string; isPaused: boolean }> {
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
    select: { sharedPoolConfig: true },
  });
  if (!campaign) throw new Error('Chiến dịch không tồn tại.');

  const config = parseSharedPoolConfig(campaign.sharedPoolConfig, {
    defaultConfig: TOGGLE_PAUSE_DEFAULT_CONFIG,
  });
  config.isPaused = isPaused;

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'NV');
  const now = new Date();

  await fastify.prisma.crm.crmCustomCampaign.update({
    where: { id: campaignId },
    data: { sharedPoolConfig: JSON.stringify(config) },
  });

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: null,
      legacyUserId: null,
      staffId,
      staffName: staffDisplayName,
      action: isPaused ? 'PAUSE_POOL' : 'RESUME_POOL',
      note: isPaused ? 'Quản lý tạm dừng khai thác Shared Pool.' : 'Quản lý tiếp tục khai thác Shared Pool.',
      metadata: JSON.stringify({
        isPaused,
        result: 'SUCCESS',
      }),
      createdAt: now,
    },
  });

  SharedPoolBroadcaster.broadcast(campaignId, {
    type: isPaused ? 'POOL_PAUSED' : 'POOL_RESUMED',
  });

  invalidateCampaignCache(fastify, campaignId);

  return {
    success: true,
    message: isPaused ? 'Đã tạm dừng Shared Pool.' : 'Đã tiếp tục hoạt động Shared Pool.',
    isPaused,
  };
}

/**
 * Manager action on a customer: Release claim, return to pool, or exclude.
 */
export async function managerPoolAction(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  staffId: number,
  action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED',
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const customer = await findCampaignCustomer(fastify, campaignId, customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'Quản lý');
  const now = new Date();

  if (action === 'RELEASE_CLAIM') {
    return releaseClaim(fastify, campaignId, customer.id, staffId, true);
  }

  if (action === 'RETURN_TO_POOL') {
    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: 'AVAILABLE',
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        availableAt: null,
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'RETURN_TO_POOL',
        note: `Quản lý đưa khách hàng trở lại Pool. Lý do: ${reason || 'Không có'}`,
        metadata: JSON.stringify({
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: 'AVAILABLE',
          reason: reason || null,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_RELEASED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      reason: 'MANAGER_RETURN_TO_POOL',
    });

    return { success: true, message: 'Đã đưa khách hàng trở lại Pool sẵn sàng.' };
  }

  if (action === 'EXCLUDE') {
    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: 'EXCLUDED',
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        availableAt: null,
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'EXCLUDE',
        note: `Quản lý loại khách khỏi Pool. Lý do: ${reason || 'Không có'}`,
        metadata: JSON.stringify({
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: 'EXCLUDED',
          reason: reason || null,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_STATUS_UPDATED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      poolStatus: 'EXCLUDED',
    });

    return { success: true, message: 'Đã loại khách hàng khỏi Shared Pool.' };
  }

  if (action === 'KEEP_EXCLUDED') {
    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: 'EXCLUDED',
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        availableAt: null,
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'CONFIRM_EXCLUDE',
        note: `Quản lý kiểm tra và xác nhận giữ trạng thái loại trừ. Lý do: ${reason || 'Đã kiểm tra'}`,
        metadata: JSON.stringify({
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: 'EXCLUDED',
          reason: reason || null,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_STATUS_UPDATED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      poolStatus: 'EXCLUDED',
    });

    return { success: true, message: 'Đã xác nhận giữ trạng thái loại trừ cho khách hàng.' };
  }

  throw new Error('Hành động quản lý không hợp lệ.');
}

/**
 * Batch Manager Action on multiple customers (RETURN_TO_POOL, EXCLUDE, KEEP_EXCLUDED)
 */
export async function batchManagerPoolAction(
  fastify: FastifyInstance,
  campaignId: number,
  staffId: number,
  action: 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED',
  customerIds: number[],
  reason?: string
): Promise<{ success: boolean; affectedCount: number; message: string }> {
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    throw new Error('Danh sách ID khách hàng không được để trống.');
  }

  const customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
    where: {
      campaignId,
      OR: [{ id: { in: customerIds } }, { legacyUserId: { in: customerIds } }],
      removedAt: null,
    },
  });

  if (customers.length === 0) {
    return { success: true, affectedCount: 0, message: 'Không tìm thấy khách hàng hợp lệ.' };
  }

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'Quản lý');
  const now = new Date();

  const targetPoolStatus = action === 'RETURN_TO_POOL' ? 'AVAILABLE' : 'EXCLUDED';
  const targetActionLog =
    action === 'RETURN_TO_POOL' ? 'RETURN_TO_POOL' : action === 'KEEP_EXCLUDED' ? 'CONFIRM_EXCLUDE' : 'EXCLUDE';
  const actionLabel =
    action === 'RETURN_TO_POOL'
      ? 'đưa trở lại Pool'
      : action === 'KEEP_EXCLUDED'
        ? 'xác nhận giữ loại trừ'
        : 'loại khỏi Pool';

  const ids = customers.map((c) => c.id);

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmCampaignCustomer.updateMany({
      where: { id: { in: ids } },
      data: {
        poolStatus: targetPoolStatus,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
        availableAt: null,
      },
    });

    await tx.crmCampaignSharedPoolLog.createMany({
      data: customers.map((c) => ({
        campaignId,
        campaignCustomerId: c.id,
        legacyUserId: c.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: targetActionLog,
        note: `Quản lý ${actionLabel} hàng loạt (${customers.length} KH). Lý do: ${reason || 'Không có'}`,
        metadata: JSON.stringify({
          previousPoolStatus: c.poolStatus,
          nextPoolStatus: targetPoolStatus,
          batchAction: action,
          reason: reason || null,
          result: 'SUCCESS',
        }),
        createdAt: now,
      })),
    });
  });

  return {
    success: true,
    affectedCount: customers.length,
    message: `Đã ${actionLabel} thành công cho ${customers.length} khách hàng.`,
  };
}
