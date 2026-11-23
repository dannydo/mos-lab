/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import { SharedPoolBroadcaster } from '../../campaign-shared-pool-broadcaster.js';
import { lastMaintainedAtMap } from './campaign-shared-pool-cache.js';

/**
 * Maintain Shared Pool integrity:
 * 1. Auto-release expired claims (TTL).
 * 2. Auto-return recycled customers whose wait period ended.
 * 3. Auto-advance to next batch if current active batch is fully processed.
 */
export async function maintainSharedPool(fastify: FastifyInstance, campaignId: number): Promise<void> {
  const now = new Date();

  // 1. Release expired claims
  const expiredCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
    where: {
      campaignId,
      poolStatus: 'CLAIMED',
      claimExpiresAt: { lte: now },
      removedAt: null,
    },
    select: { id: true, legacyUserId: true, claimedByStaffId: true, claimedByStaffName: true },
  });

  if (expiredCustomers.length > 0) {
    await fastify.prisma.crm.crmCampaignCustomer.updateMany({
      where: { id: { in: expiredCustomers.map((c) => c.id) } },
      data: {
        poolStatus: 'AVAILABLE',
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.createMany({
      data: expiredCustomers.map((c) => ({
        campaignId,
        campaignCustomerId: c.id,
        legacyUserId: c.legacyUserId,
        staffId: c.claimedByStaffId,
        staffName: c.claimedByStaffName,
        action: 'RELEASE_EXPIRED',
        note: 'Hết thời gian giữ khách (Claim Lock hết hạn), tự động nhả về Shared Pool.',
        metadata: JSON.stringify({
          previousPoolStatus: 'CLAIMED',
          nextPoolStatus: 'AVAILABLE',
          previousClaimedByStaffId: c.claimedByStaffId,
          previousClaimedByStaffName: c.claimedByStaffName,
          result: 'SUCCESS',
          reason: 'LOCK_EXPIRED',
          releasedAt: now.toISOString(),
        }),
        createdAt: now,
      })),
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMERS_RELEASED',
      customerIds: expiredCustomers.map((c) => c.id),
      reason: 'LOCK_EXPIRED',
    });
  }

  // 2. Return recycled customers whose wait period ended
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
    select: { currentBatchNumber: true, operationMode: true },
  });

  const readyRecycled = await fastify.prisma.crm.crmCampaignCustomer.findMany({
    where: {
      campaignId,
      poolStatus: { in: ['RECYCLING', 'RECYCLE'] },
      availableAt: { lte: now },
      removedAt: null,
    },
    select: { id: true, legacyUserId: true, batchNumber: true, poolStatus: true },
  });

  if (readyRecycled.length > 0) {
    const targetBatchNumber =
      campaign && campaign.operationMode === 'SHARED_POOL' && campaign.currentBatchNumber
        ? campaign.currentBatchNumber
        : undefined;

    const updateData: any = {
      poolStatus: 'AVAILABLE',
      availableAt: null,
      claimedByStaffId: null,
      claimedByStaffName: null,
      claimedAt: null,
      claimExpiresAt: null,
      cooldownUntil: null,
    };
    if (targetBatchNumber !== undefined) {
      updateData.batchNumber = targetBatchNumber;
    }

    await fastify.prisma.crm.crmCampaignCustomer.updateMany({
      where: { id: { in: readyRecycled.map((c) => c.id) } },
      data: updateData,
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.createMany({
      data: readyRecycled.map((c) => ({
        campaignId,
        campaignCustomerId: c.id,
        legacyUserId: c.legacyUserId,
        action: 'RECYCLE_RETURN',
        note: 'Khách hàng hoàn tất chu kỳ chờ, tự động quay lại Shared Pool.',
        metadata: JSON.stringify({
          previousPoolStatus: c.poolStatus || 'RECYCLING',
          nextPoolStatus: 'AVAILABLE',
          result: 'SUCCESS',
          reason: 'RECYCLE_PERIOD_ENDED',
          returnedAt: now.toISOString(),
          batchNumber: targetBatchNumber ?? c.batchNumber,
        }),
        createdAt: now,
      })),
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMERS_RELEASED',
      customerIds: readyRecycled.map((c) => c.id),
      reason: 'RECYCLE_RETURN',
    });
  }

  // 3. Auto advance batch if active batch is completely processed
  if (campaign && campaign.operationMode === 'SHARED_POOL') {
    const remainingInActiveBatch = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: {
        campaignId,
        batchNumber: campaign.currentBatchNumber,
        poolStatus: { in: ['AVAILABLE', 'CLAIMED'] },
        removedAt: null,
      },
    });

    if (remainingInActiveBatch === 0) {
      const nextBatchCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
        where: {
          campaignId,
          batchNumber: { gt: campaign.currentBatchNumber },
          removedAt: null,
        },
        orderBy: { batchNumber: 'asc' },
        select: { id: true, legacyUserId: true, batchNumber: true },
      });

      if (nextBatchCustomer) {
        await fastify.prisma.crm.crmCustomCampaign.update({
          where: { id: campaignId },
          data: { currentBatchNumber: nextBatchCustomer.batchNumber },
        });

        await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
          data: {
            campaignId,
            campaignCustomerId: nextBatchCustomer.id,
            legacyUserId: nextBatchCustomer.legacyUserId,
            action: 'AUTO_ADVANCE_BATCH',
            note: `Toàn bộ khách hàng trong Batch ${campaign.currentBatchNumber} đã được xử lý. Hệ thống tự động mở Batch ${nextBatchCustomer.batchNumber}.`,
            metadata: JSON.stringify({
              previousBatchNumber: campaign.currentBatchNumber,
              nextBatchNumber: nextBatchCustomer.batchNumber,
              result: 'SUCCESS',
            }),
            createdAt: now,
          },
        });

        SharedPoolBroadcaster.broadcast(campaignId, {
          type: 'BATCH_ADVANCED',
          currentBatchNumber: nextBatchCustomer.batchNumber,
        });
      }
    }
  }
}

/**
 * Throttled Shared Pool maintenance:
 * Only triggers at most once every 60 seconds per campaign in the background.
 * Completely avoids blocking read/overview requests.
 */
export function maintainSharedPoolThrottled(fastify: FastifyInstance, campaignId: number): void {
  const now = Date.now();
  const lastRun = lastMaintainedAtMap.get(campaignId) || 0;
  if (now - lastRun < 60_000) {
    return;
  }
  lastMaintainedAtMap.set(campaignId, now);
  maintainSharedPool(fastify, campaignId).catch((err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    fastify.log?.warn?.(`[maintainSharedPoolThrottled] Error maintaining campaign ${campaignId}: ${errMsg}`);
  });
}

/**
 * Background maintenance worker: periodically releases expired claims across all active shared pool campaigns.
 */
export function startMaintenanceWorker(fastify: FastifyInstance): void {
  const runMaintenance = async () => {
    try {
      const campaigns = await fastify.prisma.crm.crmCustomCampaign.findMany({
        where: { operationMode: 'SHARED_POOL', deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      });
      for (const camp of campaigns) {
        await maintainSharedPool(fastify, camp.id);
      }
    } catch (err: any) {
      fastify.log.warn({ err }, 'Shared pool background maintenance error');
    }
  };
  const initialTimer = setTimeout(runMaintenance, 5_000);
  initialTimer.unref();
  const intervalTimer = setInterval(runMaintenance, 10_000);
  intervalTimer.unref();
}
