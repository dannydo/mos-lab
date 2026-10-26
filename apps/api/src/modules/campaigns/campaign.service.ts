import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  AddCampaignCustomersResponse,
  Campaign,
  CampaignBookingStatusFilter,
  CampaignPoolStatus,
  CampaignPromotion,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignTouchpointLog,
  CloneCampaignDto,
  CreateCampaignDto,
  CreateCampaignPromotionDto,
  CustomerCampaignPromotionInfo,
  ListCampaignsParams,
  ReopenCampaignDto,
  SharedPoolConfig,
  SharedPoolOverviewStats,
  CampaignStaffPerformanceResponse,
  ToggleCampaignTouchpointLogDto,
  UpdateCampaignDto,
  UpdateSharedPoolStatusDto,
  SharedPoolHistoryQueryParams,
  SharedPoolHistoryResponse,
  SharedPoolRecoveryDto,
  SharedPoolRecoveryResponse,
} from '@mos-lab/shared';
import { CampaignPromotionSyncService } from './campaign-promotion-sync.service.js';
import { normalizeFixedFinalPriceCategoryKeys } from '../customers/services/customer-service-filter-catalog.service.js';
import { CampaignSharedPoolService } from './services/campaign-shared-pool.service.js';
import { CampaignCustomerService } from './services/campaign-customer.service.js';
import { CampaignPromotionStatsService } from './services/campaign-promotion-stats.service.js';

export { CampaignSharedPoolService } from './services/campaign-shared-pool.service.js';
export { CampaignCustomerService } from './services/campaign-customer.service.js';
export { CampaignPromotionStatsService } from './services/campaign-promotion-stats.service.js';

function normalizeEligibleServiceIds(value: unknown): number[] {
  let rawIds: unknown[] = [];
  if (Array.isArray(value)) {
    rawIds = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rawIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawIds = [];
    }
  }

  return Array.from(new Set(rawIds.map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
}

function normalizeEligibleServiceCategoryKeys(value: unknown): string[] {
  let rawKeys: unknown[] = [];
  if (Array.isArray(value)) {
    rawKeys = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rawKeys = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawKeys = [];
    }
  }

  return normalizeFixedFinalPriceCategoryKeys(rawKeys.map((key) => String(key || '')));
}

type CampaignReadOptions = {
  /** Managers retain archived records for audit and restoration; staff do not. */
  includeArchived?: boolean;
};

function campaignVisibilityWhere(
  baseWhere: Record<string, unknown>,
  options: CampaignReadOptions
): Record<string, unknown> {
  if (options.includeArchived) return baseWhere;
  return {
    AND: [baseWhere, { status: { not: 'ARCHIVED' } }],
  };
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export class CampaignService {
  private static async validateCampaignPromotions(
    fastify: FastifyInstance,
    promotions: CreateCampaignPromotionDto[] | undefined
  ) {
    return CampaignPromotionStatsService.validateCampaignPromotions(fastify, promotions);
  }

  private static lastStatusCheckTime = 0;

  /**
   * Auto check and transition campaign statuses based on start/end dates.
   */
  static async checkAndUpdateCampaignStatuses(fastify: FastifyInstance, force = false): Promise<void> {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastStatusCheckTime < 60_000) {
      return;
    }
    this.lastStatusCheckTime = nowMs;

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
        await this.endCampaign(fastify, c.id);
      }
    } catch (err: any) {
      fastify.log.warn('Failed to auto check campaign statuses:', err?.message || err);
    }
  }

  /**
   * List custom campaigns with stats summary.
   */
  static async listCampaigns(
    fastify: FastifyInstance,
    params: ListCampaignsParams = {},
    options: CampaignReadOptions = {}
  ): Promise<{
    items: Campaign[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    await this.checkAndUpdateCampaignStatuses(fastify);

    const { status, search, page = 1, pageSize = 20 } = params;
    const pageNum = Number(page) || 1;
    const limitNum = Number(pageSize) || 20;
    const skip = (pageNum - 1) * limitNum;

    const baseWhere: any = {
      deletedAt: null,
    };
    if (status) {
      baseWhere.status = status;
    }
    if (search && search.trim() !== '') {
      const trimmed = search.trim();
      baseWhere.OR = [
        { name: { contains: trimmed } },
        { slug: { contains: trimmed } },
        { description: { contains: trimmed } },
      ];
    }
    const where = campaignVisibilityWhere(baseWhere, options);

    const [total, campaigns] = await Promise.all([
      fastify.prisma.crm.crmCustomCampaign.count({ where }),
      fastify.prisma.crm.crmCustomCampaign.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
        },
      }),
    ]);

    const campaignIds = campaigns.map((c) => c.id);
    const [customerCounts, touchpointCounts, promotionCounts] =
      campaignIds.length > 0
        ? await Promise.all([
            fastify.prisma.crm.crmCampaignCustomer.groupBy({
              by: ['campaignId'],
              where: { campaignId: { in: campaignIds }, removedAt: null },
              _count: { _all: true },
            }),
            fastify.prisma.crm.crmCampaignTouchpoint.groupBy({
              by: ['campaignId'],
              where: { campaignId: { in: campaignIds } },
              _count: { _all: true },
            }),
            fastify.prisma.crm.crmCampaignPromotion.groupBy({
              by: ['campaignId'],
              where: { campaignId: { in: campaignIds } },
              _count: { _all: true },
            }),
          ])
        : [[], [], []];

    const customerCountMap = new Map(customerCounts.map((item) => [item.campaignId, item._count._all]));
    const touchpointCountMap = new Map(touchpointCounts.map((item) => [item.campaignId, item._count._all]));
    const promotionCountMap = new Map(promotionCounts.map((item) => [item.campaignId, item._count._all]));

    const items: Campaign[] = campaigns.map((c) => {
      let assignedStaffIds: number[] = [];
      if ((c as any).assignedStaffIds) {
        try {
          assignedStaffIds = JSON.parse((c as any).assignedStaffIds);
        } catch {
          // Invalid legacy JSON intentionally falls back to no assigned staff.
        }
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
        endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
        status: c.status as CampaignStatus,
        operationMode: ((c as any).operationMode || 'PERSONAL') as any,
        sharedPoolConfig: (c as any).sharedPoolConfig
          ? typeof (c as any).sharedPoolConfig === 'string'
            ? JSON.parse((c as any).sharedPoolConfig)
            : (c as any).sharedPoolConfig
          : null,
        currentBatchNumber: (c as any).currentBatchNumber || 1,
        createdBy: c.createdBy,
        assignedStaffIds,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        _count: {
          customers: customerCountMap.get(c.id) || 0,
          touchpoints: touchpointCountMap.get(c.id) || 0,
          promotions: promotionCountMap.get(c.id) || 0,
        },
      };
    });

    return {
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Get single campaign by ID.
   */
  static async getCampaignById(fastify: FastifyInstance, id: number, options: CampaignReadOptions = {}): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: campaignVisibilityWhere({ id }, options),
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    return this.mapCampaignToDto(campaign);
  }

  /**
   * Get single campaign by Slug.
   */
  static async getCampaignBySlug(
    fastify: FastifyInstance,
    slug: string,
    options: CampaignReadOptions = {}
  ): Promise<any> {
    const raw = (slug || '').trim();
    const clean = slugify(raw);
    const bare = raw.replace(/^-+|-+$/g, '');
    const numericId = !isNaN(Number(raw)) ? parseInt(raw, 10) : null;

    let campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: campaignVisibilityWhere(
        {
          OR: [
            { slug: raw },
            { slug: clean },
            { slug: bare },
            { slug: `-${clean}` },
            { slug: `-${bare}` },
            ...(numericId !== null ? [{ id: numericId }] : []),
          ],
        },
        options
      ),
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    if (!campaign && clean) {
      campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
        where: campaignVisibilityWhere(
          {
            slug: { contains: clean },
          },
          options
        ),
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      });
    }

    if (!campaign) {
      throw new Error(`Chiến dịch slug "${slug}" không tồn tại`);
    }

    return this.mapCampaignToDto(campaign);
  }

  /**
   * Create custom campaign.
   * If no touchpoints provided, creates default touchpoint pipeline ("Tất cả chạm", 24h, Dặm mi 17d, Dặm mi 25d).
   */
  static async createCampaign(fastify: FastifyInstance, dto: CreateCampaignDto, staffId: number): Promise<any> {
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('Tên chiến dịch không được để trống');
    }

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

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const promotionsInput = await this.validateCampaignPromotions(fastify, dto.promotions);

    // Touchpoints input from DTO (empty array if not provided)
    const touchpointsRaw = dto.touchpoints || [];

    // Deduplicate & sanitize touchpoint keys
    const usedKeys = new Set<string>();
    const touchpointsInput = touchpointsRaw.map((tp: any, idx: number) => {
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
        for (const p of promotionsInput) {
          const createdPromo = await tx.crmCampaignPromotion.create({
            data: {
              campaignId: campaign.id,
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

      return tx.crmCustomCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      });
    });

    return this.mapCampaignToDto(created);
  }

  /**
   * Update campaign metadata, status, touchpoints, promotions.
   */
  static async updateCampaign(fastify: FastifyInstance, id: number, dto: UpdateCampaignDto): Promise<any> {
    const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    const promotionsInput = await this.validateCampaignPromotions(fastify, dto.promotions);

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
      let targetSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name || existing.name);
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
      updateData.slug = uniqueSlug;
    }

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCustomCampaign.update({
        where: { id },
        data: updateData,
      });

      if (dto.touchpoints) {
        const keptIds: number[] = [];
        const keptKeys: string[] = [];

        for (let i = 0; i < dto.touchpoints.length; i++) {
          const tp = dto.touchpoints[i];
          const targetId = (tp as any).id;
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
              keptKeys.push(existingTp.key);
              continue;
            }
          }

          const upserted = await tx.crmCampaignTouchpoint.upsert({
            where: {
              campaignId_key: {
                campaignId: id,
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
              campaignId: id,
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
          keptKeys.push(upserted.key);
        }

        // Delete touchpoints for this campaign that were removed on the UI (only if no customer logs exist)
        const toDelete = await tx.crmCampaignTouchpoint.findMany({
          where: {
            campaignId: id,
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

        for (const p of promotionsInput) {
          const createdPromo = await tx.crmCampaignPromotion.create({
            data: {
              campaignId: id,
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
    });

    if (dto.status !== undefined) {
      const isDisabled = dto.status !== 'ACTIVE';
      await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, isDisabled);
    }

    const updated = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    return this.mapCampaignToDto(updated);
  }

  /**
   * Soft deletion of custom campaign.
   * Preserves 100% of allocated customers, booker assignments, touchpoints, and call logs intact.
   * Marks customer global allocation status as unallocated for future new campaign filters.
   */
  static async deleteCampaign(fastify: FastifyInstance, id: number): Promise<{ success: boolean; message: string }> {
    const existing = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

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
  static async endCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    const now = new Date();

    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: { status: 'COMPLETED', endDate: campaign.endDate || now },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });

    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, true);

    return this.mapCampaignToDto(updated);
  }

  /**
   * Pause campaign: mark status as 'PAUSED'. Booker UI disables actions.
   */
  static async pauseCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, true);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Resume campaign: mark status as 'ACTIVE'.
   */
  static async resumeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, false);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Complete campaign alias for endCampaign.
   */
  static async completeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return this.endCampaign(fastify, id);
  }

  /**
   * Archive campaign: mark status as 'ARCHIVED'.
   */
  static async archiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, true);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Unarchive campaign: mark status as 'COMPLETED'.
   */
  static async unarchiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, true);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Reopen campaign: set status to 'ACTIVE' and update end date.
   */
  static async reopenCampaign(fastify: FastifyInstance, id: number, dto?: ReopenCampaignDto): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    let newEndDate: Date;
    if (dto?.endDate) {
      newEndDate = new Date(dto.endDate);
    } else {
      newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        endDate: newEndDate,
      },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, false);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Restore a deleted campaign: set status back to 'ACTIVE', clear deletedAt timestamp.
   */
  static async restoreCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }
    const updated = await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
        touchpoints: { orderBy: { sortOrder: 'asc' } },
        promotions: true,
        _count: {
          select: {
            customers: { where: { removedAt: null } },
            touchpoints: true,
            promotions: true,
          },
        },
      },
    });
    await CampaignPromotionSyncService.updatePromotionsStatusForCampaign(fastify, id, false);
    return this.mapCampaignToDto(updated);
  }

  /**
   * Clone campaign: duplicate touchpoints and promotions into a new DRAFT campaign.
   */
  static async cloneCampaign(
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
        include: {
          creator: { select: { id: true, displayName: true, username: true } },
          touchpoints: { orderBy: { sortOrder: 'asc' } },
          promotions: true,
          _count: {
            select: {
              customers: { where: { removedAt: null } },
              touchpoints: true,
              promotions: true,
            },
          },
        },
      });
    });

    return this.mapCampaignToDto(created);
  }

  private static mapCampaignToDto(c: any): any {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : null,
      endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null,
      status: c.status as CampaignStatus,
      operationMode: c.operationMode || 'PERSONAL',
      sharedPoolConfig: c.sharedPoolConfig
        ? typeof c.sharedPoolConfig === 'string'
          ? JSON.parse(c.sharedPoolConfig)
          : c.sharedPoolConfig
        : null,
      currentBatchNumber: c.currentBatchNumber || 1,
      createdBy: c.createdBy,
      assignedStaffIds: c.assignedStaffIds
        ? typeof c.assignedStaffIds === 'string'
          ? JSON.parse(c.assignedStaffIds) || []
          : c.assignedStaffIds
        : [],
      deletedAt: c.deletedAt ? new Date(c.deletedAt).toISOString() : null,
      creatorName: c.creator?.displayName || c.creator?.username || null,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
      touchpoints: (c.touchpoints || []).map((tp: any) => ({
        id: tp.id,
        campaignId: tp.campaignId,
        key: tp.key,
        label: tp.label,
        icon: tp.icon,
        daysMin: tp.daysMin,
        daysMax: tp.daysMax,
        color: tp.color,
        sortOrder: tp.sortOrder,
      })),
      promotions: (c.promotions || []).map((p: any) => ({
        id: p.id,
        campaignId: p.campaignId,
        name: p.name,
        code: p.code,
        type: p.type,
        value: p.value,
        eligibleServiceIds: normalizeEligibleServiceIds(p.eligibleServiceIds),
        eligibleServiceCategoryKeys: normalizeEligibleServiceCategoryKeys(p.eligibleServiceCategoryKeys),
        description: p.description,
        isActive: p.isActive,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
      _count: c._count
        ? {
            customers: c._count.customers,
            touchpoints: c._count.touchpoints,
            promotions: c._count.promotions,
          }
        : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CACHE & FACADE DELEGATIONS
  // ═══════════════════════════════════════════════════════════════════

  static invalidateCampaignCache(fastify: FastifyInstance, campaignId?: number): void {
    CampaignPromotionStatsService.invalidateCache(fastify, campaignId);
    CampaignSharedPoolService.invalidateCache(fastify, campaignId);
  }

  // --- Campaign Customer Delegations ---

  static async getCampaignCustomers(...args: Parameters<typeof CampaignCustomerService.getCampaignCustomers>) {
    return CampaignCustomerService.getCampaignCustomers(...args);
  }

  static async addCustomersToCampaign(...args: Parameters<typeof CampaignCustomerService.addCustomersToCampaign>) {
    return CampaignCustomerService.addCustomersToCampaign(...args);
  }

  static async transferCustomersToCampaign(
    ...args: Parameters<typeof CampaignCustomerService.transferCustomersToCampaign>
  ) {
    return CampaignCustomerService.transferCustomersToCampaign(...args);
  }

  static async removeCustomerFromCampaign(
    ...args: Parameters<typeof CampaignCustomerService.removeCustomerFromCampaign>
  ) {
    return CampaignCustomerService.removeCustomerFromCampaign(...args);
  }

  static async removeCustomersFromCampaignBatch(
    ...args: Parameters<typeof CampaignCustomerService.removeCustomersFromCampaignBatch>
  ) {
    return CampaignCustomerService.removeCustomersFromCampaignBatch(...args);
  }

  static async toggleTouchpointLog(...args: Parameters<typeof CampaignCustomerService.toggleTouchpointLog>) {
    return CampaignCustomerService.toggleTouchpointLog(...args);
  }

  // --- Campaign Promotion & Stats Delegations ---

  static async getCampaignPromotions(...args: Parameters<typeof CampaignPromotionStatsService.getCampaignPromotions>) {
    return CampaignPromotionStatsService.getCampaignPromotions(...args);
  }

  static async createPromotion(...args: Parameters<typeof CampaignPromotionStatsService.createPromotion>) {
    return CampaignPromotionStatsService.createPromotion(...args);
  }

  static async deletePromotion(...args: Parameters<typeof CampaignPromotionStatsService.deletePromotion>) {
    return CampaignPromotionStatsService.deletePromotion(...args);
  }

  static async getCampaignStats(...args: Parameters<typeof CampaignPromotionStatsService.getCampaignStats>) {
    return CampaignPromotionStatsService.getCampaignStats(...args);
  }

  static async getCustomerActivePromotions(
    ...args: Parameters<typeof CampaignPromotionStatsService.getCustomerActivePromotions>
  ) {
    return CampaignPromotionStatsService.getCustomerActivePromotions(...args);
  }

  // --- Campaign Shared Pool Delegations ---

  static async maintainSharedPool(...args: Parameters<typeof CampaignSharedPoolService.maintainSharedPool>) {
    return CampaignSharedPoolService.maintainSharedPool(...args);
  }

  static maintainSharedPoolThrottled(
    ...args: Parameters<typeof CampaignSharedPoolService.maintainSharedPoolThrottled>
  ) {
    return CampaignSharedPoolService.maintainSharedPoolThrottled(...args);
  }

  static async getSharedPoolOverview(...args: Parameters<typeof CampaignSharedPoolService.getSharedPoolOverview>) {
    return CampaignSharedPoolService.getSharedPoolOverview(...args);
  }

  static async getCampaignStaffPerformance(
    ...args: Parameters<typeof CampaignSharedPoolService.getCampaignStaffPerformance>
  ) {
    return CampaignSharedPoolService.getCampaignStaffPerformance(...args);
  }

  static async claimCustomer(...args: Parameters<typeof CampaignSharedPoolService.claimCustomer>) {
    return CampaignSharedPoolService.claimCustomer(...args);
  }

  static async releaseClaim(...args: Parameters<typeof CampaignSharedPoolService.releaseClaim>) {
    return CampaignSharedPoolService.releaseClaim(...args);
  }

  static mapCallLogToSharedPool(...args: Parameters<typeof CampaignSharedPoolService.mapCallLogToSharedPool>) {
    return CampaignSharedPoolService.mapCallLogToSharedPool(...args);
  }

  static async syncCustomerClaimAfterCall(
    ...args: Parameters<typeof CampaignSharedPoolService.syncCustomerClaimAfterCall>
  ) {
    return CampaignSharedPoolService.syncCustomerClaimAfterCall(...args);
  }

  static async syncSharedPoolFromLatestCall(
    ...args: Parameters<typeof CampaignSharedPoolService.syncSharedPoolFromLatestCall>
  ) {
    return CampaignSharedPoolService.syncSharedPoolFromLatestCall(...args);
  }

  static async recordSharedPoolStatus(...args: Parameters<typeof CampaignSharedPoolService.recordSharedPoolStatus>) {
    return CampaignSharedPoolService.recordSharedPoolStatus(...args);
  }

  static async advanceBatch(...args: Parameters<typeof CampaignSharedPoolService.advanceBatch>) {
    return CampaignSharedPoolService.advanceBatch(...args);
  }

  static async togglePause(...args: Parameters<typeof CampaignSharedPoolService.togglePause>) {
    return CampaignSharedPoolService.togglePause(...args);
  }

  static async managerPoolAction(...args: Parameters<typeof CampaignSharedPoolService.managerPoolAction>) {
    return CampaignSharedPoolService.managerPoolAction(...args);
  }

  static async batchManagerPoolAction(...args: Parameters<typeof CampaignSharedPoolService.batchManagerPoolAction>) {
    return CampaignSharedPoolService.batchManagerPoolAction(...args);
  }

  static async getSharedPoolLogs(...args: Parameters<typeof CampaignSharedPoolService.getSharedPoolLogs>) {
    return CampaignSharedPoolService.getSharedPoolLogs(...args);
  }

  static async getCampaignSharedPoolHistory(
    ...args: Parameters<typeof CampaignSharedPoolService.getCampaignSharedPoolHistory>
  ) {
    return CampaignSharedPoolService.getCampaignSharedPoolHistory(...args);
  }

  static async recoverCustomerState(...args: Parameters<typeof CampaignSharedPoolService.recoverCustomerState>) {
    return CampaignSharedPoolService.recoverCustomerState(...args);
  }

  static startMaintenanceWorker(...args: Parameters<typeof CampaignSharedPoolService.startMaintenanceWorker>) {
    return CampaignSharedPoolService.startMaintenanceWorker(...args);
  }
}

// Inter-service hooks
CampaignSharedPoolService.registerCacheInvalidator((fastify, campaignId) => {
  CampaignPromotionStatsService.invalidateCache(fastify, campaignId);
});

CampaignPromotionStatsService.registerStatusChecker((fastify) => {
  return CampaignService.checkAndUpdateCampaignStatuses(fastify);
});
