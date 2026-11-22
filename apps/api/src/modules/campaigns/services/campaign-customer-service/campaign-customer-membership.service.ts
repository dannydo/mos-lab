/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { AddCampaignCustomersResponse } from '@mos-lab/shared';
import {
  buildCampaignCustomerInsertData,
  normalizeUniquePositiveIds,
  returnAssignedCustomersToPool,
} from './campaign-customer-helpers.js';

/**
 * Exclusively add customers from NYC pool to campaign
 * (verifying customer is not already in another active campaign).
 */
export async function addCustomersToCampaign(
  fastify: FastifyInstance,
  campaignId: number,
  customerIds: number[],
  staffId: number
): Promise<AddCampaignCustomersResponse> {
  if (!customerIds || customerIds.length === 0) {
    throw new Error('Danh sách ID khách hàng không được để trống');
  }

  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign || ['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(campaign.status)) {
    throw new Error('Chiến dịch không tồn tại hoặc đã bị chốt/lưu trữ/xóa');
  }

  const uniqueCustomerIds = normalizeUniquePositiveIds(customerIds);

  // Fetch customer profiles, contacts, and existing active campaign assignments
  const [profiles, contacts, activeAssignments] = await Promise.all([
    fastify.prisma.legacy.user_profile.findMany({
      where: { user_id: { in: uniqueCustomerIds } },
      select: { user_id: true, full_name: true },
    }),
    fastify.prisma.legacy.user_contact.findMany({
      where: { user_id: { in: uniqueCustomerIds }, is_disabled: false },
      select: { user_id: true, phone_number: true },
    }),
    fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId: { in: uniqueCustomerIds },
        removedAt: null,
        campaign: { status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] } },
      },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));
  const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));
  const activeAssignmentMap = new Map(activeAssignments.map((a) => [a.legacyUserId, a.campaign]));

  const details: any[] = [];
  const validCustomerIds: number[] = [];

  uniqueCustomerIds.forEach((cId) => {
    const name = profileMap.get(cId) || `Khách hàng #${cId}`;
    const phone = phoneMap.get(cId) || null;
    const currentCamp = activeAssignmentMap.get(cId);

    if (currentCamp) {
      const isSame = currentCamp.id === campaignId;
      details.push({
        legacyUserId: cId,
        customerName: name,
        customerPhone: phone,
        status: 'SKIPPED',
        reason: isSame ? 'Đã có sẵn trong chiến dịch này' : `Đã thuộc chiến dịch "${currentCamp.name}"`,
        currentCampaignId: currentCamp.id,
        currentCampaignName: currentCamp.name,
      });
    } else {
      validCustomerIds.push(cId);
      details.push({
        legacyUserId: cId,
        customerName: name,
        customerPhone: phone,
        status: 'ADDED',
      });
    }
  });

  const skippedCount = details.filter((d) => d.status === 'SKIPPED').length;

  if (validCustomerIds.length > 0) {
    const now = new Date();
    const insertData = await buildCampaignCustomerInsertData(
      fastify.prisma.crm,
      campaignId,
      campaign,
      validCustomerIds,
      staffId,
      now
    );

    await fastify.prisma.crm.crmCampaignCustomer.createMany({
      data: insertData,
    });
  }

  return {
    success: validCustomerIds.length > 0,
    message:
      validCustomerIds.length > 0
        ? `Đã thêm thành công ${validCustomerIds.length} khách hàng vào chiến dịch${
            skippedCount > 0 ? ` (bỏ qua ${skippedCount} KH trùng)` : ''
          }`
        : `Tất cả ${uniqueCustomerIds.length} khách hàng được chọn đã thuộc chiến dịch khác đang hoạt động (hoặc đã có trong chiến dịch này)`,
    addedCount: validCustomerIds.length,
    skippedCount,
    details,
  };
}

/**
 * Force transfer customers from their old active campaign to a new campaign.
 * Sets removedAt on old campaign customer record, clears old assignment, and adds to new campaign.
 */
export async function transferCustomersToCampaign(
  fastify: FastifyInstance,
  campaignId: number,
  customerIds: number[],
  reason: string | undefined,
  staffId: number
): Promise<{ success: boolean; message: string; transferredCount: number }> {
  if (!customerIds || customerIds.length === 0) {
    throw new Error('Danh sách ID khách hàng không được để trống');
  }

  const targetCampaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!targetCampaign || ['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(targetCampaign.status)) {
    throw new Error('Chiến dịch đích không tồn tại hoặc đã bị chốt/lưu trữ/xóa');
  }

  const uniqueCustomerIds = normalizeUniquePositiveIds(customerIds);
  const now = new Date();
  const transferReason = reason || `Quản lý chuyển sang chiến dịch "${targetCampaign.name}"`;

  await fastify.prisma.crm.$transaction(async (tx) => {
    // 1. Soft remove from old active campaigns
    await tx.crmCampaignCustomer.updateMany({
      where: {
        legacyUserId: { in: uniqueCustomerIds },
        removedAt: null,
      },
      data: {
        removedAt: now,
        removedReason: transferReason,
        removedBy: staffId,
      },
    });

    // 2. Return current owners to pool with immutable campaign evidence.
    const assignments = await tx.crmCustomerAssignment.findMany({
      where: { legacyUserId: { in: uniqueCustomerIds } },
    });
    await returnAssignedCustomersToPool(tx, assignments, {
      campaignId,
      actorStaffId: staffId,
      reason: transferReason,
      actionContext: 'CAMPAIGN_TRANSFER',
      correlationId: `campaign-transfer-${campaignId}`,
      occurredAt: now,
    });

    // 3. Add to target campaign
    const insertData = await buildCampaignCustomerInsertData(
      tx,
      campaignId,
      targetCampaign,
      uniqueCustomerIds,
      staffId,
      now
    );

    await tx.crmCampaignCustomer.createMany({
      data: insertData,
    });
  });

  return {
    success: true,
    message: `Đã chuyển thành công ${uniqueCustomerIds.length} khách hàng sang chiến dịch "${targetCampaign.name}"`,
    transferredCount: uniqueCustomerIds.length,
  };
}

/**
 * Remove customer from campaign (set removedAt = NOW(), returning customer to NYC main pool).
 */
export async function removeCustomerFromCampaign(
  fastify: FastifyInstance,
  campaignId: number,
  customerId: number,
  reason: string | undefined,
  staffId: number
): Promise<{ success: boolean; message: string }> {
  const record = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
    where: {
      campaignId,
      OR: [{ legacyUserId: customerId }, { id: customerId }],
      removedAt: null,
    },
  });

  if (!record) {
    throw new Error('Khách hàng không ở trong chiến dịch này hoặc đã bị gỡ');
  }

  const now = new Date();
  const removeReason = reason || 'Quản lý gỡ khỏi chiến dịch';

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmCampaignCustomer.update({
      where: { id: record.id },
      data: {
        removedAt: now,
        removedReason: removeReason,
        removedBy: staffId,
      },
    });

    const assignment = await tx.crmCustomerAssignment.findUnique({
      where: { legacyUserId: record.legacyUserId },
    });
    if (assignment) {
      await returnAssignedCustomersToPool(tx, [assignment], {
        campaignId,
        actorStaffId: staffId,
        reason: removeReason,
        actionContext: 'CAMPAIGN_REMOVE',
        correlationId: `campaign-remove-${record.id}`,
        occurredAt: now,
      });
    }
  });

  return {
    success: true,
    message: 'Đã gỡ khách hàng khỏi chiến dịch và trả về pool NYC',
  };
}

/**
 * Batch remove customers from campaign (set removedAt = NOW() and unassign Booker).
 */
export async function removeCustomersFromCampaignBatch(
  fastify: FastifyInstance,
  campaignId: number,
  customerIds: number[],
  reason: string | undefined,
  staffId: number
): Promise<{ success: boolean; removedCount: number; message: string }> {
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    throw new Error('Danh sách ID khách hàng không được để trống');
  }

  const records = await fastify.prisma.crm.crmCampaignCustomer.findMany({
    where: {
      campaignId,
      OR: [{ legacyUserId: { in: customerIds } }, { id: { in: customerIds } }],
      removedAt: null,
    },
  });

  if (records.length === 0) {
    return {
      success: true,
      removedCount: 0,
      message: 'Không tìm thấy khách hàng hợp lệ để gỡ khỏi chiến dịch',
    };
  }

  const recordIds = records.map((r) => r.id);
  const legacyUserIds = Array.from(new Set(records.map((r) => r.legacyUserId)));
  const now = new Date();
  const bulkRemoveReason = reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch';

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmCampaignCustomer.updateMany({
      where: { id: { in: recordIds } },
      data: {
        removedAt: now,
        removedReason: bulkRemoveReason,
        removedBy: staffId,
      },
    });

    // Clear Booker assignments so customers return to the NYC pool, with one append-only event per affected customer.
    if (legacyUserIds.length > 0) {
      const assignments = await tx.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: legacyUserIds } },
      });
      await returnAssignedCustomersToPool(tx, assignments, {
        campaignId,
        actorStaffId: staffId,
        reason: bulkRemoveReason,
        actionContext: 'CAMPAIGN_BULK_REMOVE',
        correlationId: `campaign-bulk-remove-${campaignId}`,
        occurredAt: now,
      });
    }
  });

  return {
    success: true,
    removedCount: recordIds.length,
    message: `Đã gỡ ${recordIds.length} khách hàng khỏi chiến dịch và trả về pool NYC`,
  };
}
