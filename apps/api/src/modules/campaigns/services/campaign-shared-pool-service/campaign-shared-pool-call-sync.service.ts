/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { CampaignPoolStatus, UpdateSharedPoolStatusDto } from '@mos-lab/shared';
import { SharedPoolBroadcaster } from '../../campaign-shared-pool-broadcaster.js';
import { invalidateCampaignCache } from './campaign-shared-pool-cache.js';
import {
  findCampaignCustomer,
  mapCallLogToSharedPool,
  parseSharedPoolConfig,
  resolveStaffDisplayName,
} from './campaign-shared-pool-helpers.js';
import { maintainSharedPool } from './campaign-shared-pool-maintenance.service.js';

/**
 * Automatically synchronize Shared Pool claim when a standard mOS call log is recorded.
 * Matches the exact customer, staff, and active claim session (MOS-BUG-99).
 */
export async function syncCustomerClaimAfterCall(
  fastify: FastifyInstance,
  legacyUserId: number,
  staffId: number,
  callLog?: any
): Promise<{ syncedCount: number; results: Array<{ campaignId: number; customerId: number; poolStatus: string }> }> {
  let claimedCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
    where: {
      legacyUserId,
      claimedByStaffId: staffId,
      poolStatus: 'CLAIMED',
      removedAt: null,
      campaign: {
        operationMode: 'SHARED_POOL',
        status: { in: ['ACTIVE', 'SCHEDULED'] },
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          sharedPoolConfig: true,
        },
      },
    },
  });

  if (!claimedCustomers || claimedCustomers.length === 0) {
    claimedCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId,
        removedAt: null,
        campaign: {
          operationMode: 'SHARED_POOL',
          status: { in: ['ACTIVE', 'SCHEDULED'] },
        },
        OR: [{ claimedByStaffId: staffId }, { poolStatus: { in: ['CLAIMED', 'AVAILABLE', 'RECYCLING'] } }],
      },
      include: {
        campaign: {
          select: {
            id: true,
            sharedPoolConfig: true,
          },
        },
      },
    });
  }

  if (!claimedCustomers || claimedCustomers.length === 0) {
    return { syncedCount: 0, results: [] };
  }

  const resolvedCallLog =
    callLog ||
    (await fastify.prisma.crm.crmCallLog.findFirst({
      where: {
        legacyUserId,
        staffId,
      },
      orderBy: { createdAt: 'desc' },
    }));

  if (!resolvedCallLog) {
    return { syncedCount: 0, results: [] };
  }

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'NV');
  const now = new Date();

  const results: Array<{ campaignId: number; customerId: number; poolStatus: string }> = [];

  for (const customer of claimedCustomers) {
    const config = parseSharedPoolConfig(customer.campaign?.sharedPoolConfig);

    const mapped = mapCallLogToSharedPool(resolvedCallLog, config);

    const bookedAt = mapped.isBooked ? resolvedCallLog.createdAt || now : customer.bookedAt;
    const bookedByStaffId = mapped.isBooked ? staffId : customer.bookedByStaffId;
    const bookedByStaffName = mapped.isBooked ? staffDisplayName : customer.bookedByStaffName;

    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: mapped.nextPoolStatus,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: mapped.cooldownUntil,
        availableAt: mapped.availableAt,
        lastCallStaffId: staffId,
        lastCallStaffName: staffDisplayName,
        lastCallAt: resolvedCallLog.createdAt || now,
        lastCallResult: mapped.mappedCallResult,
        lastCallNote: resolvedCallLog.note || null,
        bookedByStaffId,
        bookedByStaffName,
        bookedAt,
        callCount: { increment: 1 },
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId: customer.campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: mapped.isExcluded ? 'EXCLUDE' : mapped.isBooked ? 'BOOKING' : 'STATUS_UPDATE',
        note: mapped.isExcluded
          ? `Khách hàng bị loại khỏi Shared Pool (Chờ kiểm tra) từ cuộc gọi chuẩn mOS: ${mapped.mappedCallResult}. Ghi chú: ${resolvedCallLog.note || 'Không'}.`
          : mapped.isBooked
            ? `Khách hàng đã chốt Booking thành công từ cuộc gọi chuẩn mOS. Ghi chú: ${resolvedCallLog.note || 'Không'}.`
            : `Tự động cập nhật từ cuộc gọi chuẩn mOS: ${mapped.mappedCallResult} (${resolvedCallLog.durationSec || 0}s). Trạng thái pool: ${mapped.nextPoolStatus}. Ghi chú: ${resolvedCallLog.note || 'Không'}.`,
        metadata: JSON.stringify({
          callResult: mapped.mappedCallResult,
          rawCallResult: resolvedCallLog.callResult,
          outcome: resolvedCallLog.outcome,
          durationSec: resolvedCallLog.durationSec || 0,
          pickup: mapped.isPickup,
          callbackDate: resolvedCallLog.callbackDate,
          nextPoolStatus: mapped.nextPoolStatus,
          cooldownUntil: mapped.cooldownUntil ? mapped.cooldownUntil.toISOString() : null,
          availableAt: mapped.availableAt ? mapped.availableAt.toISOString() : null,
          callLogId: resolvedCallLog.id,
          source: 'STANDARD_MOS_CALL',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(customer.campaignId, {
      type: 'CUSTOMER_STATUS_UPDATED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      poolStatus: mapped.nextPoolStatus,
    });

    await maintainSharedPool(fastify, customer.campaignId);
    invalidateCampaignCache(fastify, customer.campaignId);

    results.push({
      campaignId: customer.campaignId,
      customerId: customer.id,
      poolStatus: mapped.nextPoolStatus,
    });
  }

  return {
    syncedCount: results.length,
    results,
  };
}

/**
 * Sync Shared Pool for a specific customer in a campaign from their latest standard call log (MOS-BUG-99).
 */
export async function syncSharedPoolFromLatestCall(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  staffId: number
): Promise<{ success: boolean; message: string; poolStatus: string }> {
  const customer = await findCampaignCustomer(fastify, campaignId, customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

  if (customer.poolStatus === 'CLAIMED' && customer.claimedByStaffId && customer.claimedByStaffId !== staffId) {
    throw new Error(
      `Khách hàng đang được giữ bởi nhân viên khác (${customer.claimedByStaffName || customer.claimedByStaffId}).`
    );
  }

  const callLog = await fastify.prisma.crm.crmCallLog.findFirst({
    where: {
      legacyUserId: customer.legacyUserId,
      staffId,
      ...(customer.claimedAt ? { createdAt: { gte: new Date(customer.claimedAt.getTime() - 2 * 60 * 1000) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!callLog) {
    if (customer.poolStatus !== 'CLAIMED') {
      return {
        success: true,
        message: `Khách hàng hiện đang ở trạng thái "${customer.poolStatus}".`,
        poolStatus: customer.poolStatus,
      };
    }
    throw new Error(
      'Chưa tìm thấy nhật ký cuộc gọi chuẩn mOS của bạn cho khách hàng này. Vui lòng hoàn thành cuộc gọi trước.'
    );
  }

  const syncRes = await syncCustomerClaimAfterCall(fastify, customer.legacyUserId, staffId, callLog);
  const matching = syncRes.results.find((r) => r.customerId === customer.id || r.campaignId === campaignId);
  const nextStatus = matching?.poolStatus || customer.poolStatus || 'EXPLOITED';

  return {
    success: true,
    message: `Đã tự động cập nhật kết quả cuộc gọi chuẩn mOS. Trạng thái chuyển sang "${nextStatus}".`,
    poolStatus: nextStatus,
  };
}

/**
 * Record Call & Status in Shared Pool:
 * Sets Cooldown, applies Recycle Rules based on Call Result, and releases claim lock.
 */
export async function recordSharedPoolStatus(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  staffId: number,
  dto: UpdateSharedPoolStatusDto
): Promise<{ success: boolean; message: string; poolStatus: string }> {
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error('Chiến dịch không tồn tại.');

  const config = parseSharedPoolConfig(campaign.sharedPoolConfig, { mergeRecycleRules: true });

  const customer = await findCampaignCustomer(fastify, campaignId, customerId);
  if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

  const staffDisplayName = await resolveStaffDisplayName(fastify, staffId, 'NV');
  const now = new Date();

  // 1. Create call log in crm_call_logs
  await fastify.prisma.crm.crmCallLog.create({
    data: {
      legacyUserId: customer.legacyUserId,
      staffId,
      callType: 'OUTBOUND',
      callResult: dto.callResult,
      durationSec: dto.durationSec || 0,
      note: dto.note || null,
      callbackDate: dto.callbackDate ? new Date(dto.callbackDate) : null,
      createdAt: now,
    },
  });

  // 2. Map status using unified mapCallLogToSharedPool logic (MOS-BUG-101)
  const mapped = mapCallLogToSharedPool(
    {
      callResult: dto.callResult,
      outcome: dto.callResult,
      durationSec: dto.durationSec || 0,
      callbackDate: dto.callbackDate,
    },
    config
  );

  const isBooked = dto.isBooked || mapped.isBooked;
  const nextPoolStatus: CampaignPoolStatus = isBooked ? 'BOOKED' : mapped.nextPoolStatus;
  const isExcluded = nextPoolStatus === 'EXCLUDED';
  const cooldownUntil = isExcluded ? null : mapped.cooldownUntil;
  const availableAt = isExcluded ? null : isBooked ? null : mapped.availableAt;
  const bookedAt = isBooked ? now : customer.bookedAt;
  const bookedByStaffId = isBooked ? staffId : customer.bookedByStaffId;
  const bookedByStaffName = isBooked ? staffDisplayName : customer.bookedByStaffName;

  await fastify.prisma.crm.crmCampaignCustomer.update({
    where: { id: customer.id },
    data: {
      poolStatus: nextPoolStatus,
      claimedByStaffId: null,
      claimedByStaffName: null,
      claimedAt: null,
      claimExpiresAt: null,
      cooldownUntil,
      availableAt,
      lastCallStaffId: staffId,
      lastCallStaffName: staffDisplayName,
      lastCallAt: now,
      lastCallResult: dto.callResult,
      lastCallNote: dto.note || null,
      bookedByStaffId,
      bookedByStaffName,
      bookedAt,
      callCount: { increment: 1 },
    },
  });

  await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
    data: {
      campaignId,
      campaignCustomerId: customer.id,
      legacyUserId: customer.legacyUserId,
      staffId,
      staffName: staffDisplayName,
      action: isExcluded ? 'EXCLUDE' : 'STATUS_UPDATE',
      note: isExcluded
        ? `Khách hàng bị loại khỏi Shared Pool (Chờ kiểm tra): ${dto.callResult}. Ghi chú: ${dto.note || 'Không'}.`
        : `Cập nhật trạng thái: ${dto.callResult}. Ghi chú: ${dto.note || 'Không'}. Trạng thái pool: ${nextPoolStatus}.`,
      metadata: JSON.stringify({
        callResult: dto.callResult,
        durationSec: dto.durationSec,
        callbackDate: dto.callbackDate,
        nextPoolStatus,
        cooldownUntil: isExcluded ? null : cooldownUntil ? cooldownUntil.toISOString() : null,
        availableAt: availableAt ? availableAt.toISOString() : null,
      }),
      createdAt: now,
    },
  });

  SharedPoolBroadcaster.broadcast(campaignId, {
    type: 'CUSTOMER_STATUS_UPDATED',
    customerId: customer.id,
    legacyUserId: customer.legacyUserId,
    poolStatus: nextPoolStatus,
  });

  // Check if active batch has completed and auto-advance
  await maintainSharedPool(fastify, campaignId);
  invalidateCampaignCache(fastify, campaignId);

  return {
    success: true,
    message: `Đã ghi nhận kết quả thành công. Khách hàng chuyển sang trạng thái "${nextPoolStatus}".`,
    poolStatus: nextPoolStatus,
  };
}
