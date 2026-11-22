/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { CreateCampaignDto, CreateCampaignPromotionDto, UpdateCampaignDto } from '@mos-lab/shared';
import { CampaignPromotionSyncService } from '../campaign-promotion-sync.service.js';
import { CampaignPromotionStatsService } from '../services/campaign-promotion-stats.service.js';
import { CAMPAIGN_DETAIL_INCLUDE, mapCampaignToDto, slugify } from './campaign-helpers.js';

type ValidatedCampaignPromotion = CreateCampaignPromotionDto & {
  eligibleServiceIds?: number[];
  eligibleServiceCategoryKeys?: string[];
};

function sanitizeTouchpointInputs(touchpointsRaw: any[]): any[] {
  const usedKeys = new Set<string>();
  return touchpointsRaw.map((tp: any, idx: number) => {
    let rawKey = tp.key ? slugify(tp.key) : `tp_${idx + 1}`;
    if (!rawKey) rawKey = `tp_${idx + 1}`;

    let finalKey = rawKey;
    let counter = 1;
    while (usedKeys.has(finalKey)) {
      finalKey = `${rawKey}_${counter}`;
      counter++;
    }
    usedKeys.add(finalKey);

    return {
      ...tp,
      key: finalKey,
    };
  });
}

async function resolveUniqueCreateSlug(fastify: FastifyInstance, dto: CreateCampaignDto): Promise<string> {
  let slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
  if (!slug) {
    slug = `campaign-${Date.now()}`;
  }

  // Check slug uniqueness
  const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { slug },
  });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  return slug;
}

async function resolveUniqueUpdateSlug(
  fastify: FastifyInstance,
  id: number,
  slugInput: string | undefined,
  nameInput: string | undefined,
  fallbackName: string
): Promise<string> {
  let targetSlug = slugInput ? slugify(slugInput) : slugify(nameInput || fallbackName);
  if (!targetSlug) targetSlug = `campaign-${id}`;

  let uniqueSlug = targetSlug;
  let counter = 1;
  while (true) {
    const conflict = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: {
        slug: uniqueSlug,
        NOT: { id },
      },
    });
    if (!conflict) break;
    uniqueSlug = `${targetSlug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

async function createCampaignPromotionsInTx(
  fastify: FastifyInstance,
  tx: any,
  campaignId: number,
  promotionsInput: ValidatedCampaignPromotion[]
): Promise<void> {
  for (const p of promotionsInput) {
    const createdPromo = await tx.crmCampaignPromotion.create({
      data: {
        campaignId,
        name: p.name,
        code: p.code || null,
        type: p.type,
        value: p.value,
        eligibleServiceIds:
          p.eligibleServiceIds && p.eligibleServiceIds.length > 0 ? JSON.stringify(p.eligibleServiceIds) : null,
        eligibleServiceCategoryKeys:
          p.eligibleServiceCategoryKeys && p.eligibleServiceCategoryKeys.length > 0
            ? JSON.stringify(p.eligibleServiceCategoryKeys)
            : null,
        description: p.description || null,
        isActive: true,
      },
    });
    await CampaignPromotionSyncService.syncPromotionToLegacy(fastify, createdPromo.id);
  }
}

async function syncCampaignTouchpointsInTx(tx: any, campaignId: number, touchpoints: any[]): Promise<void> {
  const keptIds: number[] = [];

  for (let i = 0; i < touchpoints.length; i++) {
    const tp = touchpoints[i];
    const targetId = tp.id;
    const rawKey = tp.key ? tp.key.trim() : targetId ? `tp_${targetId}` : `step_${i + 1}`;

    if (targetId) {
      const existingTp = await tx.crmCampaignTouchpoint.findUnique({ where: { id: targetId } });
      if (existingTp) {
        await tx.crmCampaignTouchpoint.update({
          where: { id: targetId },
          data: {
            label: tp.label,
            icon: tp.icon || null,
            daysMin: tp.daysMin,
            daysMax: tp.daysMax ?? null,
            color: tp.color || 'blue',
            sortOrder: tp.sortOrder ?? i + 1,
          },
        });
        keptIds.push(targetId);
        continue;
      }
    }

    const upserted = await tx.crmCampaignTouchpoint.upsert({
      where: {
        campaignId_key: {
          campaignId,
          key: rawKey,
        },
      },
      update: {
        label: tp.label,
        icon: tp.icon || null,
        daysMin: tp.daysMin,
        daysMax: tp.daysMax ?? null,
        color: tp.color || 'blue',
        sortOrder: tp.sortOrder ?? i + 1,
      },
      create: {
        campaignId,
        key: rawKey,
        label: tp.label,
        icon: tp.icon || null,
        daysMin: tp.daysMin,
        daysMax: tp.daysMax ?? null,
        color: tp.color || 'blue',
        sortOrder: tp.sortOrder ?? i + 1,
      },
    });
    keptIds.push(upserted.id);
  }

  // Delete touchpoints for this campaign that were removed on the UI (only if no customer logs exist)
  const toDelete = await tx.crmCampaignTouchpoint.findMany({
    where: {
      campaignId,
      id: { notIn: keptIds },
    },
    include: {
      _count: { select: { logs: true } },
    },
  });

  for (const item of toDelete) {
    if (item._count.logs === 0) {
      await tx.crmCampaignTouchpoint.delete({ where: { id: item.id } });
    } else {
      console.warn(`Touchpoint ${item.id} (${item.label}) has ${item._count.logs} logs, skipping delete.`);
    }
  }
}

/**
 * Create custom campaign.
 * If no touchpoints provided, creates default touchpoint pipeline ("Tất cả chạm", 24h, Dặm mi 17d, Dặm mi 25d).
 */
export async function createCampaign(fastify: FastifyInstance, dto: CreateCampaignDto, staffId: number): Promise<any> {
  if (!dto.name || dto.name.trim() === '') {
    throw new Error('Tên chiến dịch không được để trống');
  }

  const slug = await resolveUniqueCreateSlug(fastify, dto);
  const startDate = dto.startDate ? new Date(dto.startDate) : null;
  const endDate = dto.endDate ? new Date(dto.endDate) : null;
  const promotionsInput = await CampaignPromotionStatsService.validateCampaignPromotions(fastify, dto.promotions);

  // Touchpoints input from DTO (empty array if not provided)
  const touchpointsInput = sanitizeTouchpointInputs(dto.touchpoints || []);

  let validStaffId: number | null = null;
  if (staffId) {
    const staffExists = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true },
    });
    if (staffExists) {
      validStaffId = staffId;
    }
  }

  const created = await fastify.prisma.crm.$transaction(async (tx) => {
    const campaign = await tx.crmCustomCampaign.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description || null,
        startDate,
        endDate,
        status: dto.status || 'ACTIVE',
        operationMode: dto.operationMode || 'PERSONAL',
        sharedPoolConfig: dto.sharedPoolConfig ? JSON.stringify(dto.sharedPoolConfig) : null,
        currentBatchNumber: dto.currentBatchNumber || 1,
        createdBy: validStaffId,
        assignedStaffIds:
          dto.assignedStaffIds && Array.isArray(dto.assignedStaffIds) && dto.assignedStaffIds.length > 0
            ? JSON.stringify(dto.assignedStaffIds)
            : null,
      },
    });

    // Create touchpoints
    for (let i = 0; i < touchpointsInput.length; i++) {
      const tp = touchpointsInput[i];
      await tx.crmCampaignTouchpoint.create({
        data: {
          campaignId: campaign.id,
          key: tp.key,
          label: tp.label,
          icon: tp.icon || null,
          daysMin: tp.daysMin,
          daysMax: tp.daysMax ?? null,
          color: tp.color || 'blue',
          sortOrder: tp.sortOrder ?? i + 1,
        },
      });
    }

    // Create promotions if provided
    if (promotionsInput && promotionsInput.length > 0) {
      await createCampaignPromotionsInTx(fastify, tx, campaign.id, promotionsInput);
    }

    return tx.crmCustomCampaign.findUnique({
      where: { id: campaign.id },
      include: CAMPAIGN_DETAIL_INCLUDE,
    });
  });

  return mapCampaignToDto(created);
}

/**
 * Update campaign metadata, status, touchpoints, promotions.
 */
export async function updateCampaign(fastify: FastifyInstance, id: number, dto: UpdateCampaignDto): Promise<any> {
  const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error(`Chiến dịch ID ${id} không tồn tại`);
  }

  const promotionsInput = await CampaignPromotionStatsService.validateCampaignPromotions(fastify, dto.promotions);

  const updateData: any = {};
  if (dto.name !== undefined) updateData.name = dto.name.trim();
  if (dto.description !== undefined) updateData.description = dto.description;
  if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
  if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
  if (dto.status !== undefined) updateData.status = dto.status;
  if (dto.operationMode !== undefined) updateData.operationMode = dto.operationMode;
  if (dto.sharedPoolConfig !== undefined) {
    updateData.sharedPoolConfig = dto.sharedPoolConfig ? JSON.stringify(dto.sharedPoolConfig) : null;
  }
  if (dto.currentBatchNumber !== undefined) updateData.currentBatchNumber = dto.currentBatchNumber;
  if (dto.assignedStaffIds !== undefined) {
    updateData.assignedStaffIds =
      dto.assignedStaffIds && Array.isArray(dto.assignedStaffIds) && dto.assignedStaffIds.length > 0
        ? JSON.stringify(dto.assignedStaffIds)
        : null;
  }

  if (dto.slug !== undefined || dto.name !== undefined) {
    updateData.slug = await resolveUniqueUpdateSlug(fastify, id, dto.slug, dto.name, existing.name);
  }

  await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmCustomCampaign.update({
      where: { id },
      data: updateData,
    });

    if (dto.touchpoints) {
      await syncCampaignTouchpointsInTx(tx, id, dto.touchpoints);
    }

    if (promotionsInput) {
      const oldPromos = await tx.crmCampaignPromotion.findMany({
        where: { campaignId: id },
      });
      for (const op of oldPromos) {
        if (op.legacyPromotionId) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE promotion SET is_disabled = 1, date_updated = NOW() WHERE id = ?`,
            op.legacyPromotionId
          );
        }
      }
      await tx.crmCampaignPromotion.deleteMany({
        where: { campaignId: id },
      });

      await createCampaignPromotionsInTx(fastify, tx, id, promotionsInput);
    }
  });

  if (dto.status !== undefined) {
    const isDisabled = dto.status !== 'ACTIVE';
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, isDisabled);
  }

  const updated = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id },
    include: CAMPAIGN_DETAIL_INCLUDE,
  });

  return mapCampaignToDto(updated);
}
