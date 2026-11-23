/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { CloneCampaignDto, ReopenCampaignDto } from '@mos-lab/shared';
import { CampaignPromotionSyncService } from '../campaign-promotion-sync.service.js';
import { CAMPAIGN_DETAIL_INCLUDE, mapCampaignToDto, slugify } from './campaign-helpers.js';

let lastStatusCheckTime = 0;

async function findCampaignOrThrow(fastify: FastifyInstance, id: number) {
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id },
  });
  if (!campaign) {
    throw new Error(`Chiến dịch ID ${id} không tồn tại`);
  }
  return campaign;
}

async function applyCampaignStatusTransition(
  fastify: FastifyInstance,
  id: number,
  data: Record<string, any>,
  isPromotionDisabled: boolean
): Promise<any> {
  const updated = await fastify.prisma.crm.crmCustomCampaign.update({
    where: { id },
    data,
    include: CAMPAIGN_DETAIL_INCLUDE,
  });
  await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, isPromotionDisabled);
  return mapCampaignToDto(updated);
}

/**
 * Auto check and transition campaign statuses based on start/end dates.
 */
export async function checkAndUpdateCampaignStatuses(fastify: FastifyInstance, force = false): Promise<void> {
  const nowMs = Date.now();
  if (!force && nowMs - lastStatusCheckTime < 60_000) {
    return;
  }
  lastStatusCheckTime = nowMs;

  const now = new Date(nowMs);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  try {
    // 1. Auto activate SCHEDULED campaigns where startDate <= now
    const scheduledCampaigns = await fastify.prisma.crm.crmCustomCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        startDate: { lte: now },
      },
    });
    for (const c of scheduledCampaigns) {
      await fastify.prisma.crm.crmCustomCampaign.update({
        where: { id: c.id },
        data: { status: 'ACTIVE' },
      });
    }

    // 2. Auto complete ACTIVE campaigns after their final calendar day.
    const expiredCampaigns = await fastify.prisma.crm.crmCustomCampaign.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { lt: todayStart },
      },
    });
    for (const c of expiredCampaigns) {
      await endCampaign(fastify, c.id);
    }
  } catch (err: any) {
    fastify.log.warn('Failed to auto check campaign statuses:', err?.message || err);
  }
}

/**
 * Soft deletion of custom campaign.
 * Preserves 100% of allocated customers, booker assignments, touchpoints, and call logs intact.
 * Marks customer global allocation status as unallocated for future new campaign filters.
 */
export async function deleteCampaign(
  fastify: FastifyInstance,
  id: number
): Promise<{ success: boolean; message: string }> {
  await findCampaignOrThrow(fastify, id);

  const now = new Date();

  await fastify.prisma.crm.$transaction(async (tx) => {
    // Mark campaign as DELETED (Soft Delete)
    await tx.crmCustomCampaign.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: now,
      },
    });
  });

  await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, true);

  return {
    success: true,
    message: 'Đã xóa chiến dịch thành công (Dữ liệu khách hàng và Booker được lưu giữ nguyên vẹn)',
  };
}

/**
 * End campaign: mark status as 'COMPLETED'.
 * Preserves 100% of customer allocations and touchpoint logs so bookers can track conversion metrics.
 */
export async function endCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  const campaign = await findCampaignOrThrow(fastify, id);
  const now = new Date();
  return applyCampaignStatusTransition(fastify, id, { status: 'COMPLETED', endDate: campaign.endDate || now }, true);
}

/**
 * Pause campaign: mark status as 'PAUSED'. Booker UI disables actions.
 */
export async function pauseCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  return applyCampaignStatusTransition(fastify, id, { status: 'PAUSED' }, true);
}

/**
 * Resume campaign: mark status as 'ACTIVE'.
 */
export async function resumeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  return applyCampaignStatusTransition(fastify, id, { status: 'ACTIVE' }, false);
}

/**
 * Complete campaign alias for endCampaign.
 */
export async function completeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  return endCampaign(fastify, id);
}

/**
 * Archive campaign: mark status as 'ARCHIVED'.
 */
export async function archiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  return applyCampaignStatusTransition(fastify, id, { status: 'ARCHIVED' }, true);
}

/**
 * Unarchive campaign: mark status as 'COMPLETED'.
 */
export async function unarchiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  return applyCampaignStatusTransition(fastify, id, { status: 'COMPLETED' }, true);
}

/**
 * Reopen campaign: set status to 'ACTIVE' and update end date.
 */
export async function reopenCampaign(fastify: FastifyInstance, id: number, dto?: ReopenCampaignDto): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  let newEndDate: Date;
  if (dto?.endDate) {
    newEndDate = new Date(dto.endDate);
  } else {
    newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 30);
  }
  return applyCampaignStatusTransition(fastify, id, { status: 'ACTIVE', endDate: newEndDate }, false);
}

/**
 * Restore a deleted campaign: set status back to 'ACTIVE', clear deletedAt timestamp.
 */
export async function restoreCampaign(fastify: FastifyInstance, id: number): Promise<any> {
  await findCampaignOrThrow(fastify, id);
  return applyCampaignStatusTransition(fastify, id, { status: 'ACTIVE', deletedAt: null }, false);
}

/**
 * Clone campaign: duplicate touchpoints and promotions into a new DRAFT campaign.
 */
export async function cloneCampaign(
  fastify: FastifyInstance,
  id: number,
  dto: CloneCampaignDto = {},
  createdBy: number
): Promise<any> {
  const original = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id },
    include: {
      touchpoints: { orderBy: { sortOrder: 'asc' } },
      promotions: true,
    },
  });
  if (!original) {
    throw new Error(`Chiến dịch ID ${id} không tồn tại`);
  }

  const name = (dto.name || `[Bản sao] ${original.name}`).trim();
  let baseSlug = dto.slug || slugify(name);
  if (!baseSlug) baseSlug = `campaign-${Date.now()}`;
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  const created = await fastify.prisma.crm.$transaction(async (tx) => {
    const campaign = await tx.crmCustomCampaign.create({
      data: {
        name,
        slug,
        description: dto.description ?? original.description,
        startDate: dto.startDate ? new Date(dto.startDate) : original.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : original.endDate,
        status: 'DRAFT',
        createdBy,
        assignedStaffIds: original.assignedStaffIds,
      },
    });

    if (original.touchpoints.length > 0) {
      await tx.crmCampaignTouchpoint.createMany({
        data: original.touchpoints.map((tp) => ({
          campaignId: campaign.id,
          key: tp.key,
          label: tp.label,
          icon: tp.icon,
          daysMin: tp.daysMin,
          daysMax: tp.daysMax,
          color: tp.color,
          sortOrder: tp.sortOrder,
        })),
      });
    }

    if (original.promotions.length > 0) {
      await tx.crmCampaignPromotion.createMany({
        data: original.promotions.map((p) => ({
          campaignId: campaign.id,
          name: p.name,
          code: p.code,
          type: p.type,
          value: p.value,
          eligibleServiceIds: p.eligibleServiceIds,
          eligibleServiceCategoryKeys: p.eligibleServiceCategoryKeys,
          description: p.description,
          isActive: p.isActive,
        })),
      });
    }

    return tx.crmCustomCampaign.findUnique({
      where: { id: campaign.id },
      include: CAMPAIGN_DETAIL_INCLUDE,
    });
  });

  return mapCampaignToDto(created);
}
