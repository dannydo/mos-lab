import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  AddCampaignCustomersResponse,
  Campaign,
  CampaignBookingStatusFilter,
  CampaignOperationMode,
  CampaignPoolStatus,
  CampaignPromotion,
  CampaignPromotionType,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignTouchpointLog,
  CloneCampaignDto,
  CreateCampaignDto,
  CreateCampaignPromotionDto,
  CustomerCampaignPromotionInfo,
  ListCampaignsParams,
  ReopenCampaignDto,
  removeVietnameseTones,
  DEFAULT_SHARED_POOL_CONFIG,
  SharedPoolConfig,
  SharedPoolOverviewStats,
  CampaignStaffPerformance,
  CampaignStaffPerformanceResponse,
  ToggleCampaignTouchpointLogDto,
  UpdateCampaignDto,
  UpdateSharedPoolStatusDto,
  CampaignSharedPoolDetailedLog,
  SharedPoolHistoryQueryParams,
  SharedPoolHistoryResponse,
  SharedPoolRecoveryDto,
  SharedPoolRecoveryResponse,
} from '@mos-lab/shared';
import { CampaignPromotionSyncService } from './campaign-promotion-sync.service.js';
import { AllocationLedgerService } from '../allocation/allocation-ledger.service.js';
import {
  CustomerServiceFilterCatalogService,
  normalizeFixedFinalPriceCategoryKeys,
  resolveFixedFinalPriceScope,
} from '../customers/services/customer-service-filter-catalog.service.js';
import { CustomerVisitProjectionService } from '../projections/customer-visit-projection.service.js';
import { SharedPoolBroadcaster } from './campaign-shared-pool-broadcaster.js';

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

export class CampaignService {
  /**
   * A fixed-final-price promotion is only valid for active, single-price lash
   * services. Catalog remains in the legacy DB and is read-only here.
   */
  private static async validateCampaignPromotions(
    fastify: FastifyInstance,
    promotions: CreateCampaignPromotionDto[] | undefined
  ): Promise<
    | Array<CreateCampaignPromotionDto & { eligibleServiceIds?: number[]; eligibleServiceCategoryKeys?: string[] }>
    | undefined
  > {
    if (promotions === undefined) return undefined;

    const normalized = promotions.map((promotion) => ({
      ...promotion,
      value: Number(promotion.value),
      eligibleServiceIds: normalizeEligibleServiceIds(promotion.eligibleServiceIds),
      eligibleServiceCategoryKeys: normalizeEligibleServiceCategoryKeys(promotion.eligibleServiceCategoryKeys),
    }));

    const hasFixedFinalPricePromotion = normalized.some((promotion) => promotion.type === 'FIXED_FINAL_PRICE');
    const catalogOptions = hasFixedFinalPricePromotion
      ? await CustomerServiceFilterCatalogService.getOptions(fastify)
      : null;

    for (const promotion of normalized) {
      if (promotion.type !== 'FIXED_FINAL_PRICE') {
        promotion.eligibleServiceIds = [];
        promotion.eligibleServiceCategoryKeys = [];
        continue;
      }

      if (!Number.isSafeInteger(promotion.value) || promotion.value <= 0) {
        throw new Error('Giá đồng nhất phải là số tiền VND nguyên lớn hơn 0.');
      }

      const scope = resolveFixedFinalPriceScope(
        catalogOptions!,
        promotion.eligibleServiceIds,
        promotion.eligibleServiceCategoryKeys
      );
      if (scope.invalidServiceIds.length > 0) {
        throw new Error('Giá đồng nhất chỉ áp dụng cho dịch vụ lẻ nối mi đang hoạt động.');
      }
      if (scope.invalidCategoryKeys.length > 0 || scope.emptyCategoryKeys.length > 0) {
        throw new Error('Thể loại dịch vụ đồng giá không hợp lệ hoặc không còn dịch vụ lẻ nối mi đang hoạt động.');
      }
      if (scope.serviceIds.length === 0) {
        throw new Error('Ưu đãi giá đồng nhất phải chọn ít nhất một dịch vụ lẻ nối mi hoặc thể loại dịch vụ.');
      }

      const pricesByServiceId = new Map(
        catalogOptions!.services.map((service) => [service.id, Math.round(Number(service.singlePrice || 0))])
      );
      if (scope.serviceIds.some((serviceId) => promotion.value > (pricesByServiceId.get(serviceId) || 0))) {
        throw new Error('Giá đồng nhất phải thấp hơn hoặc bằng giá niêm yết của từng dịch vụ đã chọn.');
      }
    }

    return normalized;
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

  /**
   * Fetch campaign customers with Booker filtering, search, pagination,
   * and touchpoint classification based on DATEDIFF(NOW(), cc.added_at).
   */
  static async getCampaignCustomers(
    fastify: FastifyInstance,
    campaignId: number,
    params: {
      bookerId?: number;
      assignedStaffId?: number;
      currentStaffId?: number;
      restrictToAssignedStaffId?: number;
      search?: string;
      touchpointKey?: string;
      bookingStatus?: CampaignBookingStatusFilter;
      batchNumber?: number | 'ALL';
      poolStatus?: CampaignPoolStatus | 'ALL' | 'REMAINING' | 'RECYCLE';
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    const {
      bookerId,
      assignedStaffId,
      currentStaffId,
      restrictToAssignedStaffId,
      search,
      touchpointKey,
      bookingStatus = 'ALL',
      batchNumber,
      poolStatus,
      page = 1,
      pageSize = 20,
    } = params;
    const pageNum = Math.max(1, Math.floor(Number(page) || 1));
    const limitNum = Math.min(1000, Math.max(1, Math.floor(Number(pageSize) || 20)));
    const skip = (pageNum - 1) * limitNum;

    // Verify campaign exists
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      include: { touchpoints: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    const where: any = {
      campaignId,
      removedAt: null,
    };

    if (campaign.operationMode === 'SHARED_POOL') {
      await this.maintainSharedPool(fastify, campaign.id);

      // Telesales membership check
      if (restrictToAssignedStaffId) {
        let allowedStaffIds: number[] = [];
        try {
          if (campaign.assignedStaffIds) {
            allowedStaffIds = JSON.parse(campaign.assignedStaffIds);
          }
        } catch {}
        if (
          Array.isArray(allowedStaffIds) &&
          allowedStaffIds.length > 0 &&
          !allowedStaffIds.includes(restrictToAssignedStaffId)
        ) {
          return { items: [], total: 0, page: pageNum, pageSize: limitNum, pages: 0 };
        }
      }

      if (batchNumber !== undefined && batchNumber !== 'ALL') {
        where.batchNumber = Number(batchNumber);
      } else if (batchNumber === undefined && poolStatus !== 'REMAINING') {
        where.batchNumber = campaign.currentBatchNumber || 1;
      }

      if (poolStatus === 'REMAINING') {
        where.poolStatus = { in: ['AVAILABLE', 'CLAIMED', 'RECYCLING', 'RECYCLE'] };
      } else if (poolStatus === 'RECYCLE') {
        where.poolStatus = { in: ['RECYCLING', 'RECYCLE'] };
      } else if (poolStatus && poolStatus !== 'ALL') {
        where.poolStatus = poolStatus;
      }
    }

    // Booker, text and touchpoint filters depend on data from other sources, so
    // they still require enrichment before filtering. The common unfiltered
    // table path can page at the database boundary, avoiding every legacy query
    // and response field for records outside the visible page.
    const hasPostEnrichmentFilters = Boolean(
      bookerId ||
      assignedStaffId ||
      (restrictToAssignedStaffId && campaign.operationMode !== 'SHARED_POOL') ||
      search?.trim() ||
      touchpointKey?.trim() ||
      bookingStatus !== 'ALL'
    );
    const customerQuery = {
      where,
      include: {
        touchpointLogs: {
          include: { touchpoint: true as const },
        },
      },
      orderBy: { addedAt: 'desc' as const },
    };
    const campaignCustomersPromise = hasPostEnrichmentFilters
      ? fastify.prisma.crm.crmCampaignCustomer.findMany(customerQuery)
      : fastify.prisma.crm.crmCampaignCustomer.findMany({ ...customerQuery, skip, take: limitNum });
    const totalPromise: Promise<number | undefined> = hasPostEnrichmentFilters
      ? Promise.resolve(undefined)
      : fastify.prisma.crm.crmCampaignCustomer.count({ where });
    const [campaignCustomers, unfilteredTotal] = await Promise.all([campaignCustomersPromise, totalPromise]);

    if (campaignCustomers.length === 0) {
      const total = unfilteredTotal ?? 0;
      return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
    }

    const legacyUserIds = Array.from(
      new Set(campaignCustomers.map((cc) => Number(cc.legacyUserId)).filter((id) => !isNaN(id) && id > 0))
    );

    if (legacyUserIds.length === 0) {
      const total = unfilteredTotal ?? 0;
      return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
    }

    const idListStr = legacyUserIds.join(',');

    // A customer is "Done" for a campaign only after completing a service inside
    // that campaign's operating window. `actual_booking_date_start` is the source
    // of truth for the real service date; the scheduled booking date is a legacy
    // fallback when the actual check-in record is unavailable.
    const campaignStartDate = (campaign.startDate || campaign.createdAt).toISOString().slice(0, 10);
    const campaignEndDate = campaign.endDate ? campaign.endDate.toISOString().slice(0, 10) : null;
    const campaignDoneRowsPromise: Promise<Array<{ userId: number }>> =
      bookingStatus === 'DONE'
        ? fastify.prisma.legacy.$queryRawUnsafe<Array<{ userId: number }>>(
            `
              SELECT DISTINCT o.user_id AS userId
              FROM \`order\` o
              LEFT JOIN report_order ro ON ro.order_id = o.id
              WHERE o.user_id IN (${idListStr})
                AND o.order_state = 'Completed'
                AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) IS NOT NULL
                AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) >= ?
                ${campaignEndDate ? 'AND DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) <= ?' : ''}
            `,
            ...(campaignEndDate ? [campaignStartDate, campaignEndDate] : [campaignStartDate])
          )
        : Promise.resolve([]);

    // Fetch customer profiles, contacts, assignments, pending allocation batch items, recent call logs, order stats, and visit dates
    const [
      profiles,
      contacts,
      assignments,
      pendingBatchItems,
      callLogs,
      orderStatsRows,
      lastVisitRows,
      latestBookingRows,
      campaignDoneRows,
    ] = await Promise.all([
      fastify.prisma.legacy.user_profile.findMany({
        where: { user_id: { in: legacyUserIds } },
        select: { user_id: true, full_name: true, avatar: true, last_order_booking: true },
      }),
      fastify.prisma.legacy.user_contact.findMany({
        where: { user_id: { in: legacyUserIds }, is_disabled: false },
        select: { user_id: true, phone_number: true },
      }),
      fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: legacyUserIds } },
        include: { staff: { select: { id: true, displayName: true, username: true } } },
      }),
      fastify.prisma.crm.crmAllocationBatchItem.findMany({
        where: {
          customerId: { in: legacyUserIds },
          status: 'PENDING_ACCEPT',
          batch: { status: 'PENDING_ACCEPT' },
        },
        include: {
          batch: {
            include: {
              booker: { select: { id: true, displayName: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Phase 3 Perf: Only fetch latest call log per user (not ALL historical logs)
      fastify.prisma.crm.$queryRawUnsafe<any[]>(`
        SELECT cl.*
        FROM crm_call_logs cl
        INNER JOIN (
          SELECT MAX(id) as max_id
          FROM crm_call_logs
          WHERE legacy_user_id IN (${idListStr})
          GROUP BY legacy_user_id
        ) latest ON cl.id = latest.max_id
      `),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          user_id as userId,
          COALESCE(SUM(total_price), 0) as totalSpent,
          COUNT(id) as totalVisits
        FROM \`order\`
        WHERE user_id IN (${idListStr}) AND order_state = 'Completed'
        GROUP BY user_id
      `),
      process.env.CUSTOMER_VISIT_PROJECTION_READ_ENABLED === 'true'
        ? CustomerVisitProjectionService.readForCustomers(fastify, legacyUserIds)
        : CustomerVisitProjectionService.readCanonicalForCustomers(fastify, legacyUserIds),
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          o.user_id as userId,
          o.booking_date_start as lastBookingDate,
          o.order_state as lastBookingState
        FROM \`order\` o
        INNER JOIN (
          SELECT user_id, MAX(id) as max_id
          FROM \`order\`
          WHERE user_id IN (${idListStr})
          GROUP BY user_id
        ) latest ON o.id = latest.max_id
      `),
      campaignDoneRowsPromise,
    ]);

    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const phoneMap = new Map(contacts.map((c) => [c.user_id, c.phone_number]));
    const assignmentMap = new Map(assignments.map((a) => [a.legacyUserId, a]));
    const pendingBatchMap = new Map(pendingBatchItems.map((item) => [item.customerId, item]));

    const orderStatsMap = new Map(orderStatsRows.map((r) => [Number(r.userId), Math.round(Number(r.totalSpent || 0))]));
    const lastVisitMap = new Map(
      lastVisitRows.map((r) => [
        r.legacyUserId,
        {
          lastVisitDate: r.lastVisitAt,
          daysSinceLastVisit: r.daysSinceLastVisit,
        },
      ])
    );
    const latestBookingMap = new Map(
      latestBookingRows.map((r) => [
        Number(r.userId),
        {
          lastBookingDate: r.lastBookingDate ? new Date(r.lastBookingDate).toISOString().replace('Z', '+07:00') : null,
          lastBookingState: r.lastBookingState,
        },
      ])
    );
    const campaignDoneUserIds = new Set(campaignDoneRows.map((row) => Number(row.userId)));

    const callLogMap = new Map<number, any>();
    for (const log of callLogs) {
      // Raw SQL returns snake_case: legacy_user_id, created_at, etc.
      const userId = log.legacyUserId ?? log.legacy_user_id;
      if (userId && !callLogMap.has(userId)) {
        callLogMap.set(userId, {
          ...log,
          legacyUserId: userId,
          createdAt: log.createdAt ?? log.created_at,
          callResult: log.callResult ?? log.call_result,
          callDuration: log.callDuration ?? log.call_duration,
          callbackDate: log.callbackDate ?? log.callback_date,
          note: log.note,
        });
      }
    }

    const now = new Date();

    // Enrich and filter customers
    let enriched = campaignCustomers.map((cc) => {
      const prof = profileMap.get(cc.legacyUserId);
      const phone = phoneMap.get(cc.legacyUserId) || null;
      const assignment = assignmentMap.get(cc.legacyUserId) || null;
      const pendingItem = pendingBatchMap.get(cc.legacyUserId) || null;
      const lastCall = callLogMap.get(cc.legacyUserId) || null;

      const orderSpent = orderStatsMap.get(cc.legacyUserId) || 0;
      const visitData = lastVisitMap.get(cc.legacyUserId);
      const bookingData = latestBookingMap.get(cc.legacyUserId);

      let daysSinceLastVisit = visitData?.daysSinceLastVisit ?? null;
      let lastVisit = visitData?.lastVisitDate ?? null;
      if (daysSinceLastVisit === null && prof?.last_order_booking) {
        const lastB = new Date(prof.last_order_booking);
        const diffMs = now.getTime() - lastB.getTime();
        daysSinceLastVisit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        lastVisit = lastB.toISOString();
      }

      const callbackDate = (lastCall as any)?.callbackDate
        ? new Date((lastCall as any).callbackDate).toISOString()
        : null;

      const staff = assignment?.staff || pendingItem?.batch?.booker || null;
      const isPendingAccept = !assignment && !!pendingItem;

      const baseDate = campaign.startDate ? new Date(campaign.startDate) : new Date(cc.addedAt);
      const diffMs = now.getTime() - baseDate.getTime();
      const daysInCampaign = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // Active touchpoints matching daysInCampaign
      const matchedTouchpoint = campaign.touchpoints.find((tp) => {
        if (tp.daysMax !== null && tp.daysMax !== undefined) {
          return daysInCampaign >= tp.daysMin && daysInCampaign <= tp.daysMax;
        }
        return daysInCampaign >= tp.daysMin;
      });

      const assignedAtIso = assignment?.assignedAt
        ? new Date(assignment.assignedAt).toISOString()
        : pendingItem?.createdAt
          ? new Date(pendingItem.createdAt).toISOString()
          : null;
      const assignedBookerName = staff
        ? (staff.displayName || staff.username || null) + (isPendingAccept ? ' (Chờ 24h)' : '')
        : null;

      const lastCallAt = lastCall ? lastCall.createdAt.toISOString() : null;
      const lastCallDuration = lastCall ? lastCall.durationSec || (lastCall as any).duration_sec || 0 : null;
      const lastCallResult = lastCall
        ? lastCall.callResult || (lastCall as any).call_result || (lastCall as any).status || null
        : null;
      const lastCallNote = lastCall ? lastCall.note || (lastCall as any).description || '' : null;

      const isRecycleEnded =
        (cc.poolStatus === 'RECYCLING' || cc.poolStatus === 'RECYCLE') &&
        Boolean(cc.availableAt && cc.availableAt <= now);
      const effectivePoolStatus = isRecycleEnded ? 'AVAILABLE' : cc.poolStatus;
      const effectiveCooldownUntil = isRecycleEnded ? null : cc.cooldownUntil;

      return {
        id: cc.id,
        campaignId: cc.campaignId,
        legacyUserId: cc.legacyUserId,
        customerName: prof?.full_name || `Khách hàng #${cc.legacyUserId}`,
        customerPhone: phone,
        avatar: prof?.avatar || null,
        totalSpent: orderSpent,
        daysSinceLastVisit,
        lastVisit,
        lastBookingDate: bookingData?.lastBookingDate || null,
        lastBookingState: bookingData?.lastBookingState || null,
        callbackDate,
        addedAt: cc.addedAt.toISOString(),
        addedBy: cc.addedBy,
        daysInCampaign,
        currentTouchpointKey: matchedTouchpoint ? matchedTouchpoint.key : 'all',
        assignedBooker: staff ? { id: staff.id, name: staff.displayName || staff.username } : null,
        assignedBookerName,
        assignedAt: assignedAtIso,
        isPendingAccept,
        assignedStaff: staff
          ? {
              id: staff.id,
              displayName: staff.displayName || staff.username,
              assignedAt: assignedAtIso,
            }
          : null,
        lastCallAt: cc.lastCallAt ? cc.lastCallAt.toISOString() : lastCallAt,
        lastCallDuration,
        lastCallStaffId: cc.lastCallStaffId || null,
        lastCallStaffName: cc.lastCallStaffName || null,
        lastCallResult: cc.lastCallResult || lastCallResult,
        lastCallNote: cc.lastCallNote || lastCallNote,
        lastCall: lastCall
          ? {
              createdAt: lastCallAt,
              durationSec: lastCallDuration,
              callResult: lastCallResult,
              note: lastCallNote,
            }
          : null,
        batchNumber: cc.batchNumber,
        poolStatus: effectivePoolStatus,
        claimedByStaffId: isRecycleEnded ? null : cc.claimedByStaffId,
        claimedByStaffName: isRecycleEnded ? null : cc.claimedByStaffName,
        claimedAt: isRecycleEnded ? null : cc.claimedAt?.toISOString() || null,
        claimExpiresAt: isRecycleEnded ? null : cc.claimExpiresAt?.toISOString() || null,
        cooldownUntil: effectiveCooldownUntil?.toISOString() || null,
        availableAt: isRecycleEnded ? null : cc.availableAt?.toISOString() || null,
        bookedByStaffId: cc.bookedByStaffId,
        bookedByStaffName: cc.bookedByStaffName,
        bookedAt: cc.bookedAt?.toISOString() || null,
        callCount: cc.callCount,
        isClaimedByMe:
          !isRecycleEnded &&
          (currentStaffId
            ? cc.claimedByStaffId === currentStaffId
            : restrictToAssignedStaffId
              ? cc.claimedByStaffId === restrictToAssignedStaffId
              : false),
        canClaim: effectivePoolStatus === 'AVAILABLE' && (!effectiveCooldownUntil || effectiveCooldownUntil <= now),
        canCall:
          campaign.operationMode === 'SHARED_POOL'
            ? effectivePoolStatus !== 'EXCLUDED' &&
              effectivePoolStatus !== 'BOOKED' &&
              ((effectivePoolStatus === 'CLAIMED' &&
                (currentStaffId
                  ? cc.claimedByStaffId === currentStaffId
                  : restrictToAssignedStaffId
                    ? cc.claimedByStaffId === restrictToAssignedStaffId
                    : true)) ||
                (effectivePoolStatus === 'AVAILABLE' && (!effectiveCooldownUntil || effectiveCooldownUntil <= now)))
            : restrictToAssignedStaffId
              ? cc.claimedByStaffId === restrictToAssignedStaffId
              : true,
        claimRemainingSeconds:
          cc.claimExpiresAt && cc.claimExpiresAt > now
            ? Math.round((cc.claimExpiresAt.getTime() - now.getTime()) / 1000)
            : 0,
        cooldownRemainingSeconds:
          cc.cooldownUntil && cc.cooldownUntil > now
            ? Math.round((cc.cooldownUntil.getTime() - now.getTime()) / 1000)
            : 0,
        touchpointLogs: cc.touchpointLogs.map((log) => ({
          id: log.id,
          touchpointId: log.touchpointId,
          touchpointKey: log.touchpoint?.key,
          touchpointLabel: log.touchpoint?.label,
          isChecked: log.isChecked,
          status: (log as any).status || (log.isChecked ? 'SUCCESS' : null),
          completedAt: log.completedAt ? log.completedAt.toISOString() : null,
          completedByStaffId: log.completedByStaffId,
          completedByStaffName: log.completedByStaffName,
          note: log.note,
        })),
      };
    });

    // Security scope: a telesales user only sees customers durably assigned to
    // their own CRM staff account. Pending allocation batches are not enough.
    // In SHARED_POOL mode, all verified members of the campaign share the active pool.
    if (restrictToAssignedStaffId && campaign.operationMode !== 'SHARED_POOL') {
      const activeAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          staffId: restrictToAssignedStaffId,
          legacyUserId: { in: enriched.map((customer) => customer.legacyUserId) },
        },
        select: { legacyUserId: true },
      });
      const allowedCustomerIds = new Set(activeAssignments.map((assignment) => assignment.legacyUserId));
      enriched = enriched.filter((customer) => allowedCustomerIds.has(customer.legacyUserId));
    }

    // Apply Booker filtering (supports both bookerId and assignedStaffId)
    const filterBookerId = bookerId || assignedStaffId;
    if (filterBookerId && String(filterBookerId) !== 'ALL') {
      const bId = Number(filterBookerId);
      enriched = enriched.filter((c) => {
        const staffId = c.assignedStaff?.id || c.assignedBooker?.id;
        return staffId === bId;
      });
    }

    // Apply search filter (name or phone)
    if (search && search.trim() !== '') {
      const searchLower = removeVietnameseTones(search);
      enriched = enriched.filter(
        (c) =>
          (c.customerName && removeVietnameseTones(c.customerName).includes(searchLower)) ||
          (c.customerPhone && c.customerPhone.includes(searchLower)) ||
          String(c.legacyUserId).includes(searchLower)
      );
    }

    // Apply touchpointKey filter
    if (touchpointKey && touchpointKey.toLowerCase() !== 'all') {
      const touchpoint = campaign.touchpoints.find((item) => item.key.toLowerCase() === touchpointKey.toLowerCase());
      enriched = touchpoint
        ? enriched.filter((customer) => {
            const days = customer.daysInCampaign ?? 0;
            return touchpoint.daysMax === null || touchpoint.daysMax === undefined
              ? days >= touchpoint.daysMin
              : days >= touchpoint.daysMin && days <= touchpoint.daysMax;
          })
        : [];
    }

    // Quick booking filters use the customer's latest booking. "Booked" is a
    // future, actionable appointment; "Done" is a completed service during the
    // campaign window; and "Missed" is a past appointment that never reached a
    // service state.
    if (bookingStatus === 'BOOKED') {
      enriched = enriched.filter((customer) => {
        if (!customer.lastBookingDate) return false;
        const isFutureAppointment = new Date(customer.lastBookingDate).getTime() > now.getTime();
        return isFutureAppointment && ['New', 'Confirmed'].includes(customer.lastBookingState);
      });
    } else if (bookingStatus === 'DONE') {
      enriched = enriched.filter((customer) => campaignDoneUserIds.has(customer.legacyUserId));
    } else if (bookingStatus === 'MISSED') {
      const completedStates = new Set(['Completed', 'ServiceCompleted', 'CheckIn', 'CheckOut', 'ServiceStart']);
      enriched = enriched.filter((customer) => {
        if (!customer.lastBookingDate || !customer.lastBookingState) return false;
        const isPastAppointment = new Date(customer.lastBookingDate).getTime() < now.getTime();
        return isPastAppointment && !completedStates.has(customer.lastBookingState);
      });
    }

    const total = unfilteredTotal ?? enriched.length;
    const paginated = hasPostEnrichmentFilters ? enriched.slice(skip, skip + limitNum) : enriched;

    return {
      items: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Exclusively add customers from NYC pool to campaign
   * (verifying customer is not already in another active campaign).
   */
  static async addCustomersToCampaign(
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

    const uniqueCustomerIds = Array.from(
      new Set(customerIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0))
    );

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
      let insertData: any[] = [];
      if (campaign.operationMode === 'SHARED_POOL') {
        let batchSize = 100;
        try {
          if (campaign.sharedPoolConfig) {
            const conf =
              typeof campaign.sharedPoolConfig === 'string'
                ? JSON.parse(campaign.sharedPoolConfig)
                : campaign.sharedPoolConfig;
            if (conf?.batchSize && conf.batchSize > 0) batchSize = Number(conf.batchSize);
          }
        } catch {}

        let currentBatch = 1;
        let countInCurrentBatch = 0;
        const highestCust = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
          where: { campaignId, removedAt: null },
          orderBy: { batchNumber: 'desc' },
          select: { batchNumber: true },
        });
        if (highestCust && highestCust.batchNumber > 0) {
          currentBatch = highestCust.batchNumber;
          countInCurrentBatch = await fastify.prisma.crm.crmCampaignCustomer.count({
            where: { campaignId, batchNumber: currentBatch, removedAt: null },
          });
        }

        insertData = validCustomerIds.map((cId) => {
          if (countInCurrentBatch >= batchSize) {
            currentBatch++;
            countInCurrentBatch = 0;
          }
          countInCurrentBatch++;
          return {
            campaignId,
            legacyUserId: cId,
            batchNumber: currentBatch,
            poolStatus: 'AVAILABLE',
            addedAt: now,
            addedBy: staffId,
          };
        });
      } else {
        insertData = validCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        }));
      }

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
  static async transferCustomersToCampaign(
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

    const uniqueCustomerIds = Array.from(
      new Set(customerIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0))
    );
    const now = new Date();

    await fastify.prisma.crm.$transaction(async (tx) => {
      // 1. Soft remove from old active campaigns
      await tx.crmCampaignCustomer.updateMany({
        where: {
          legacyUserId: { in: uniqueCustomerIds },
          removedAt: null,
        },
        data: {
          removedAt: now,
          removedReason: reason || `Quản lý chuyển sang chiến dịch "${targetCampaign.name}"`,
          removedBy: staffId,
        },
      });

      // 2. Return current owners to pool with immutable campaign evidence.
      const assignments = await tx.crmCustomerAssignment.findMany({
        where: { legacyUserId: { in: uniqueCustomerIds } },
      });
      for (const assignment of assignments) {
        await AllocationLedgerService.setOwner(tx, {
          customerId: assignment.legacyUserId,
          eventType: 'CAMPAIGN_RETURNED_TO_POOL',
          previousStaffId: assignment.staffId,
          nextStaffId: null,
          actorStaffId: staffId,
          reason: reason || `Quản lý chuyển sang chiến dịch "${targetCampaign.name}"`,
          sourceType: 'CAMPAIGN',
          actionContext: 'CAMPAIGN_TRANSFER',
          campaignId,
          correlationId: `campaign-transfer-${campaignId}`,
          deleteWhenPool: true,
          occurredAt: now,
        });
      }

      // 3. Add to target campaign
      let insertData: any[] = [];
      if (targetCampaign.operationMode === 'SHARED_POOL') {
        let batchSize = 100;
        try {
          if (targetCampaign.sharedPoolConfig) {
            const conf =
              typeof targetCampaign.sharedPoolConfig === 'string'
                ? JSON.parse(targetCampaign.sharedPoolConfig)
                : targetCampaign.sharedPoolConfig;
            if (conf?.batchSize && conf.batchSize > 0) batchSize = Number(conf.batchSize);
          }
        } catch {}

        let currentBatch = 1;
        let countInCurrentBatch = 0;
        const highestCust = await tx.crmCampaignCustomer.findFirst({
          where: { campaignId, removedAt: null },
          orderBy: { batchNumber: 'desc' },
          select: { batchNumber: true },
        });
        if (highestCust && highestCust.batchNumber > 0) {
          currentBatch = highestCust.batchNumber;
          countInCurrentBatch = await tx.crmCampaignCustomer.count({
            where: { campaignId, batchNumber: currentBatch, removedAt: null },
          });
        }

        insertData = uniqueCustomerIds.map((cId) => {
          if (countInCurrentBatch >= batchSize) {
            currentBatch++;
            countInCurrentBatch = 0;
          }
          countInCurrentBatch++;
          return {
            campaignId,
            legacyUserId: cId,
            batchNumber: currentBatch,
            poolStatus: 'AVAILABLE',
            addedAt: now,
            addedBy: staffId,
          };
        });
      } else {
        insertData = uniqueCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        }));
      }

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
  static async removeCustomerFromCampaign(
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
    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.update({
        where: { id: record.id },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      const assignment = await tx.crmCustomerAssignment.findUnique({
        where: { legacyUserId: record.legacyUserId },
      });
      if (assignment) {
        await AllocationLedgerService.setOwner(tx, {
          customerId: record.legacyUserId,
          eventType: 'CAMPAIGN_RETURNED_TO_POOL',
          previousStaffId: assignment.staffId,
          nextStaffId: null,
          actorStaffId: staffId,
          reason: reason || 'Quản lý gỡ khỏi chiến dịch',
          sourceType: 'CAMPAIGN',
          actionContext: 'CAMPAIGN_REMOVE',
          campaignId,
          correlationId: `campaign-remove-${record.id}`,
          deleteWhenPool: true,
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
  static async removeCustomersFromCampaignBatch(
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

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.updateMany({
        where: { id: { in: recordIds } },
        data: {
          removedAt: now,
          removedReason: reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch',
          removedBy: staffId,
        },
      });

      // Clear Booker assignments so customers return to the NYC pool, with one append-only event per affected customer.
      if (legacyUserIds.length > 0) {
        const assignments = await tx.crmCustomerAssignment.findMany({
          where: { legacyUserId: { in: legacyUserIds } },
        });
        for (const assignment of assignments) {
          await AllocationLedgerService.setOwner(tx, {
            customerId: assignment.legacyUserId,
            eventType: 'CAMPAIGN_RETURNED_TO_POOL',
            previousStaffId: assignment.staffId,
            nextStaffId: null,
            actorStaffId: staffId,
            reason: reason || 'Quản lý gỡ hàng loạt khỏi chiến dịch',
            sourceType: 'CAMPAIGN',
            actionContext: 'CAMPAIGN_BULK_REMOVE',
            campaignId,
            correlationId: `campaign-bulk-remove-${campaignId}`,
            deleteWhenPool: true,
            occurredAt: now,
          });
        }
      }
    });

    return {
      success: true,
      removedCount: recordIds.length,
      message: `Đã gỡ ${recordIds.length} khách hàng khỏi chiến dịch và trả về pool NYC`,
    };
  }

  /**
   * Upsert CrmCampaignTouchpointLog when a Booker or Admin toggles a touchpoint check mark.
   */
  static async toggleTouchpointLog(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    touchpointId: number,
    dto: ToggleCampaignTouchpointLogDto,
    staffId: number,
    staffName: string,
    restrictToAssignedStaffId?: number
  ): Promise<CampaignTouchpointLog> {
    const campaignCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ legacyUserId: customerId }, { id: customerId }],
        removedAt: null,
      },
      include: {
        campaign: {
          select: { operationMode: true },
        },
      },
    });

    if (!campaignCustomer) {
      throw new Error('Khách hàng không ở trong chiến dịch này');
    }

    if (restrictToAssignedStaffId) {
      if (campaignCustomer.campaign?.operationMode === 'SHARED_POOL') {
        const now = new Date();
        const isClaimedByMe =
          campaignCustomer.poolStatus === 'CLAIMED' &&
          campaignCustomer.claimedByStaffId === restrictToAssignedStaffId &&
          Boolean(campaignCustomer.claimExpiresAt && campaignCustomer.claimExpiresAt > now);
        if (!isClaimedByMe) {
          const error = new Error('Bạn cần nhận (Claim) khách hàng này trong Shared Pool trước khi thao tác.');
          (error as any).statusCode = 403;
          throw error;
        }
      } else {
        const assignment = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
          where: {
            legacyUserId: campaignCustomer.legacyUserId,
            staffId: restrictToAssignedStaffId,
          },
          select: { id: true },
        });
        if (!assignment) {
          const error = new Error('Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.');
          (error as any).statusCode = 403;
          throw error;
        }
      }
    }

    const now = new Date();

    const finalStatus =
      dto.status === null || (dto.status as any) === '' ? null : dto.status || (dto.isChecked ? 'SUCCESS' : null);
    const finalIsChecked = finalStatus !== null || dto.isChecked;

    const log = await fastify.prisma.crm.crmCampaignTouchpointLog.upsert({
      where: {
        campaignCustomerId_touchpointId: {
          campaignCustomerId: campaignCustomer.id,
          touchpointId,
        },
      },
      update: {
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
      create: {
        campaignCustomerId: campaignCustomer.id,
        touchpointId,
        isChecked: finalIsChecked,
        status: finalStatus,
        completedAt: now,
        completedByStaffId: staffId,
        completedByStaffName: staffName,
        note: dto.note || null,
      },
    });

    if (dto.callbackDate && !isNaN(new Date(dto.callbackDate).getTime())) {
      const cbDate = new Date(dto.callbackDate);
      try {
        await fastify.prisma.crm.crmDailyPlan.upsert({
          where: {
            legacyUserId_plannedDate: {
              legacyUserId: campaignCustomer.legacyUserId,
              plannedDate: cbDate,
            },
          },
          create: {
            legacyUserId: campaignCustomer.legacyUserId,
            staffId,
            plannedDate: cbDate,
            bucket: 'CAMPAIGN_CALLBACK',
            priority: 1,
            status: 'PLANNED',
          },
          update: {
            staffId,
            status: 'PLANNED',
          },
        });
      } catch (e) {
        fastify.log.error(e, 'Failed to upsert daily plan for campaign touchpoint callback');
      }
    }

    return {
      id: log.id,
      campaignCustomerId: log.campaignCustomerId,
      touchpointId: log.touchpointId,
      isChecked: log.isChecked,
      status: (log.status as any) || (log.isChecked ? 'SUCCESS' : null),
      completedAt: log.completedAt ? log.completedAt.toISOString() : null,
      completedByStaffId: log.completedByStaffId,
      completedByStaffName: log.completedByStaffName,
      note: log.note,
    };
  }

  /**
   * Fetch active promotions for campaign.
   */
  static async getCampaignPromotions(fastify: FastifyInstance, campaignId: number): Promise<CampaignPromotion[]> {
    const promotions = await fastify.prisma.crm.crmCampaignPromotion.findMany({
      where: {
        campaignId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => ({
      id: p.id,
      campaignId: p.campaignId,
      name: p.name,
      code: p.code,
      type: p.type as any,
      value: p.value,
      eligibleServiceIds: normalizeEligibleServiceIds(p.eligibleServiceIds),
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Create promotion for campaign.
   */
  static async createPromotion(
    fastify: FastifyInstance,
    campaignId: number,
    dto: CreateCampaignPromotionDto
  ): Promise<CampaignPromotion> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    const promotionInput = (await this.validateCampaignPromotions(fastify, [dto]))![0];

    const promotion = await fastify.prisma.crm.crmCampaignPromotion.create({
      data: {
        campaignId,
        name: promotionInput.name.trim(),
        code: promotionInput.code || null,
        type: promotionInput.type,
        value: promotionInput.value,
        eligibleServiceIds:
          promotionInput.eligibleServiceIds && promotionInput.eligibleServiceIds.length > 0
            ? JSON.stringify(promotionInput.eligibleServiceIds)
            : null,
        description: promotionInput.description || null,
        isActive: true,
      },
    });

    const legacyId = await CampaignPromotionSyncService.syncPromotionToLegacy(fastify, promotion.id);

    return {
      id: promotion.id,
      campaignId: promotion.campaignId,
      name: promotion.name,
      code: promotion.code,
      type: promotion.type as any,
      value: promotion.value,
      eligibleServiceIds: normalizeEligibleServiceIds(promotion.eligibleServiceIds),
      description: promotion.description,
      isActive: promotion.isActive,
      legacyPromotionId: legacyId,
      createdAt: promotion.createdAt.toISOString(),
    };
  }

  /**
   * Delete / deactivate promotion for campaign.
   */
  static async deletePromotion(
    fastify: FastifyInstance,
    campaignId: number,
    promotionId: number
  ): Promise<{ success: boolean; message: string }> {
    const promotion = await fastify.prisma.crm.crmCampaignPromotion.findFirst({
      where: { id: promotionId, campaignId },
    });

    if (!promotion) {
      throw new Error('Ưu đãi khuyến mãi không tồn tại trong chiến dịch này');
    }

    if (promotion.legacyPromotionId) {
      await fastify.prisma.legacy.$executeRawUnsafe(
        `UPDATE promotion SET is_disabled = 1, date_updated = NOW() WHERE id = ?`,
        promotion.legacyPromotionId
      );
    }

    await fastify.prisma.crm.crmCampaignPromotion.delete({
      where: { id: promotionId },
    });

    return {
      success: true,
      message: 'Đã xóa ưu đãi khuyến mãi khỏi chiến dịch',
    };
  }

  /**
   * Header metrics for campaign (total customers, booked count, booked rate, touchpoint logs count, revenue).
   */
  static async getCampaignStats(
    fastify: FastifyInstance,
    campaignId: number,
    restrictToAssignedStaffId?: number
  ): Promise<CampaignStatsResponse> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
    }

    // Active customers in campaign
    let customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: { campaignId, removedAt: null },
      select: { id: true, legacyUserId: true, addedAt: true },
    });

    if (restrictToAssignedStaffId && customers.length > 0 && campaign.operationMode !== 'SHARED_POOL') {
      const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          staffId: restrictToAssignedStaffId,
          legacyUserId: { in: customers.map((customer) => customer.legacyUserId) },
        },
        select: { legacyUserId: true },
      });
      const assignedCustomerIds = new Set(assignments.map((assignment) => assignment.legacyUserId));
      customers = customers.filter((customer) => assignedCustomerIds.has(customer.legacyUserId));
    }

    const totalCustomers = customers.length;
    if (totalCustomers === 0) {
      return {
        totalCustomers: 0,
        bookedCount: 0,
        bookedRate: 0,
        totalTouchpointLogs: 0,
        totalCallsToday: 0,
        campaignRevenue: 0,
      };
    }

    const customerIds = customers.map((c) => c.legacyUserId);
    const campaignCustomerIds = customers.map((c) => c.id);

    // Calculate completed bookings and revenue for campaign customers after addedAt
    // Use SQL aggregate instead of fetching all rows into memory
    const customerAddedMap = new Map(customers.map((c) => [c.legacyUserId, c.addedAt]));
    const idListStr = customerIds.join(',');

    const orderAgg: Array<{ userId: number; cnt: number; rev: number; minDate: Date | null }> =
      customerIds.length > 0
        ? await fastify.prisma.legacy.$queryRawUnsafe(`
            SELECT
              user_id AS userId,
              COUNT(id) AS cnt,
              COALESCE(SUM(total_price), 0) AS rev,
              MIN(date_created) AS minDate
            FROM \`order\`
            WHERE user_id IN (${idListStr}) AND order_state = 'Completed'
            GROUP BY user_id
          `)
        : [];

    const bookedUserSet = new Set<number>();
    let campaignRevenue = 0;

    // Lightweight loop over aggregated rows (1 row per user, not 1 per order)
    for (const row of orderAgg) {
      const uid = Number(row.userId);
      const addedAt = customerAddedMap.get(uid);
      // If ANY completed order exists, count the user; revenue sum is approximate
      // For precise per-order date filtering, fall back to per-user query only when needed
      if (addedAt) {
        bookedUserSet.add(uid);
        campaignRevenue += Number(row.rev) || 0;
      }
    }

    const bookedCount = bookedUserSet.size;
    const bookedRate = totalCustomers > 0 ? Number(((bookedCount / totalCustomers) * 100).toFixed(1)) : 0;

    // Total touchpoint logs count
    const totalTouchpointLogs = await fastify.prisma.crm.crmCampaignTouchpointLog.count({
      where: {
        campaignCustomerId: { in: campaignCustomerIds },
        isChecked: true,
      },
    });

    // Total calls today for campaign customers
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalCallsToday = await fastify.prisma.crm.crmCallLog.count({
      where: {
        legacyUserId: { in: customerIds },
        createdAt: { gte: todayStart },
      },
    });

    return {
      totalCustomers,
      bookedCount,
      bookedRate,
      totalTouchpointLogs,
      totalCallsToday,
      campaignRevenue: Math.round(campaignRevenue),
    };
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

  /**
   * Fetch active campaign promotion information for a customer.
   */
  static async getCustomerActivePromotions(
    fastify: FastifyInstance,
    legacyUserId: number
  ): Promise<CustomerCampaignPromotionInfo[]> {
    await this.checkAndUpdateCampaignStatuses(fastify);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const memberships = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId,
        removedAt: null,
        campaign: {
          status: 'ACTIVE',
          deletedAt: null,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: todayStart } }] },
          ],
        },
      },
      include: {
        campaign: {
          include: {
            promotions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    const hasFixedFinalPricePromotion = memberships.some((membership) =>
      membership.campaign.promotions.some((promotion) => promotion.type === 'FIXED_FINAL_PRICE')
    );
    const catalogOptions = hasFixedFinalPricePromotion
      ? await CustomerServiceFilterCatalogService.getOptions(fastify)
      : null;

    return memberships
      .filter((m) => m.campaign && m.campaign.promotions && m.campaign.promotions.length > 0)
      .map((m) => ({
        campaignId: m.campaign.id,
        campaignName: m.campaign.name,
        campaignSlug: m.campaign.slug,
        promotions: m.campaign.promotions.map((p) => {
          let label = p.name;
          if (p.type === 'PERCENT_DISCOUNT') {
            label = p.value > 0 ? `Giảm ${p.value}%` : p.name;
          } else if (p.type === 'FIXED_DISCOUNT') {
            label = p.value > 0 ? `Giảm ${p.value.toLocaleString('vi-VN')}đ` : p.name;
          } else if (p.type === 'FIXED_FINAL_PRICE') {
            label = p.value > 0 ? `Đồng giá ${Math.round(p.value).toLocaleString('vi-VN')}đ` : p.name;
          } else if (p.type === 'FREE_SERVICE') {
            label = p.description && p.description.trim() ? p.description : `Tặng dịch vụ ${p.name}`;
          } else if (p.type === 'FREE_PRODUCT') {
            label = p.description && p.description.trim() ? p.description : `Tặng sản phẩm ${p.name}`;
          }
          const eligibleServiceCategoryKeys = normalizeEligibleServiceCategoryKeys(p.eligibleServiceCategoryKeys);
          const eligibleServiceIds =
            p.type === 'FIXED_FINAL_PRICE' && catalogOptions
              ? resolveFixedFinalPriceScope(
                  catalogOptions,
                  normalizeEligibleServiceIds(p.eligibleServiceIds),
                  eligibleServiceCategoryKeys
                ).serviceIds
              : normalizeEligibleServiceIds(p.eligibleServiceIds);
          const eligibleServiceCategoryLabels = catalogOptions
            ? eligibleServiceCategoryKeys
                .map((key) => catalogOptions.categories.find((category) => category.key === key)?.label)
                .filter((label): label is string => Boolean(label))
            : [];

          return {
            id: p.id,
            campaignId: p.campaignId,
            name: p.name,
            code: p.code,
            type: p.type as CampaignPromotionType,
            value: p.value,
            eligibleServiceIds,
            eligibleServiceCategoryKeys,
            eligibleServiceCategoryLabels,
            description: p.description,
            isActive: p.isActive,
            label,
            legacyPromotionId: p.legacyPromotionId || null,
          };
        }),
      }));
  }

  // ═══════════════════════════════════════════════════════════════════
  // SHARED POOL / TEAMWORK SUBSYSTEM (MOS-BUG-78)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Maintain Shared Pool integrity:
   * 1. Auto-release expired claims (TTL).
   * 2. Auto-return recycled customers whose wait period ended.
   * 3. Auto-advance to next batch if current active batch is fully processed.
   */
  static async maintainSharedPool(fastify: FastifyInstance, campaignId: number): Promise<void> {
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
   * Get Shared Pool Overview Stats: active batch metrics, campaign metrics, burn rate, and early warning levels.
   */
  static async getSharedPoolOverview(
    fastify: FastifyInstance,
    campaignId: number,
    batchNumberParam?: number | string | 'ALL'
  ): Promise<SharedPoolOverviewStats> {
    await this.maintainSharedPool(fastify, campaignId);

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);

    let config: SharedPoolConfig = { ...DEFAULT_SHARED_POOL_CONFIG };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

    const activeBatchNumber = campaign.currentBatchNumber || 1;
    const isAllBatches = batchNumberParam === 'ALL';
    const selectedBatch = isAllBatches
      ? 'ALL'
      : batchNumberParam !== undefined
        ? Number(batchNumberParam)
        : activeBatchNumber;

    const batchWhere: any = {
      campaignId,
      removedAt: null,
    };
    if (selectedBatch !== 'ALL') {
      batchWhere.batchNumber = selectedBatch;
    }

    // Counts for selected batch (or all batches if ALL)
    const activeBatchCustomers = await fastify.prisma.crm.crmCampaignCustomer.groupBy({
      by: ['poolStatus'],
      where: batchWhere,
      _count: { id: true },
    });

    const statusMap = new Map(activeBatchCustomers.map((g) => [g.poolStatus, g._count.id]));
    const batchAvailable = statusMap.get('AVAILABLE') || 0;
    const batchClaimed = statusMap.get('CLAIMED') || 0;
    const batchExploited = statusMap.get('EXPLOITED') || 0;
    const batchRecycling = (statusMap.get('RECYCLING') || 0) + (statusMap.get('RECYCLE') || 0);
    const batchExcluded = statusMap.get('EXCLUDED') || 0;
    const batchBooked = statusMap.get('BOOKED') || 0;
    const batchTotal = batchAvailable + batchClaimed + batchExploited + batchRecycling + batchExcluded + batchBooked;

    // Highest batch number
    const maxBatchCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: { campaignId, removedAt: null },
      orderBy: { batchNumber: 'desc' },
      select: { batchNumber: true },
    });
    const totalBatches = Math.max(activeBatchNumber, maxBatchCustomer?.batchNumber || 1);

    // Total campaign-wide metrics
    const totalCustomers = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: { campaignId, removedAt: null },
    });

    const totalExploited = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: {
        campaignId,
        poolStatus: { in: ['EXPLOITED', 'BOOKED', 'EXCLUDED'] },
        removedAt: null,
      },
    });

    const totalRemaining = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: {
        campaignId,
        poolStatus: { in: ['AVAILABLE', 'CLAIMED', 'RECYCLING', 'RECYCLE'] },
        removedAt: null,
      },
    });

    const totalExcluded = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: {
        campaignId,
        poolStatus: 'EXCLUDED',
        removedAt: null,
      },
    });

    const percentRemaining = totalCustomers > 0 ? Math.round((totalRemaining / totalCustomers) * 100) : 0;

    // Burn rate calculation: activity in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivityCount = await fastify.prisma.crm.crmCampaignSharedPoolLog.count({
      where: {
        campaignId,
        action: { in: ['STATUS_UPDATE', 'CALL'] },
        createdAt: { gte: oneDayAgo },
      },
    });

    const burnRatePerHour = Number(Math.max(0.1, recentActivityCount / 24).toFixed(1));
    const estimatedHoursRemaining =
      totalRemaining > 0 && burnRatePerHour > 0 ? Number((totalRemaining / burnRatePerHour).toFixed(1)) : null;

    // Warning level determination
    let warningLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' = 'NORMAL';
    let warningMessage = 'Data dồi dào — Vận hành ổn định';

    if (totalRemaining === 0 && totalCustomers > 0) {
      warningLevel = 'EXHAUSTED';
      warningMessage = 'Không còn Data dự phòng: Cần bổ sung Data ngay!';
    } else if (percentRemaining <= (config.criticalThreshold || 10)) {
      warningLevel = 'CRITICAL';
      warningMessage = `Nguy cấp: Data sắp cạn kiệt (còn ${percentRemaining}%)`;
    } else if (percentRemaining <= (config.warningThreshold || 30)) {
      warningLevel = 'WARNING';
      warningMessage = `Sắp hết Data (còn ${percentRemaining}%)`;
    }

    const staffPerformance = await this.getCampaignStaffPerformance(fastify, campaignId);

    return {
      activeBatchNumber,
      totalBatches,
      batchSize: config.batchSize || 100,
      isPaused: Boolean(config.isPaused),
      batchTotal,
      batchAvailable,
      batchClaimed,
      batchExploited,
      batchRecycling,
      batchExcluded,
      batchBooked,
      totalCustomers,
      totalExploited,
      totalRemaining,
      totalExcluded,
      percentRemaining,
      warningLevel,
      warningMessage,
      burnRatePerHour,
      estimatedHoursRemaining,
      staffPerformance,
    };
  }

  /**
   * Get Campaign Staff Performance (Kết quả khai thác theo nhân viên trong Campaign Teamwork) - MOS-BUG-81.
   * Scoped strictly to this campaign and within campaign startDate/endDate window.
   */
  static async getCampaignStaffPerformance(
    fastify: FastifyInstance,
    campaignId: number
  ): Promise<CampaignStaffPerformanceResponse> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        assignedStaffIds: true,
      },
    });
    if (!campaign) throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);

    let assignedStaffIds: number[] = [];
    try {
      if (campaign.assignedStaffIds) {
        assignedStaffIds = JSON.parse(campaign.assignedStaffIds);
      }
    } catch {}

    const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // Date range filter for queries
    const logDateFilter: Record<string, any> = {};
    if (startDate) logDateFilter.gte = startDate;
    if (endDate) logDateFilter.lte = endDate;

    // Fetch shared pool logs strictly for this campaign
    const logs = await fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
      where: {
        campaignId,
        ...(Object.keys(logDateFilter).length > 0 ? { createdAt: logDateFilter } : {}),
      },
      select: {
        staffId: true,
        staffName: true,
        legacyUserId: true,
        action: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Fetch customers in this campaign (for booked and last call checks)
    const customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        removedAt: null,
      },
      select: {
        legacyUserId: true,
        lastCallStaffId: true,
        lastCallStaffName: true,
        lastCallAt: true,
        lastCallResult: true,
        bookedByStaffId: true,
        bookedByStaffName: true,
        bookedAt: true,
        poolStatus: true,
      },
    });

    // Collect all candidate staff IDs
    const staffIdSet = new Set<number>(assignedStaffIds);
    logs.forEach((l) => {
      if (l.staffId) staffIdSet.add(l.staffId);
    });
    customers.forEach((c) => {
      if (c.bookedByStaffId) staffIdSet.add(c.bookedByStaffId);
      if (c.lastCallStaffId) staffIdSet.add(c.lastCallStaffId);
    });

    const staffList =
      staffIdSet.size > 0
        ? await fastify.prisma.crm.crmStaff.findMany({
            where: { id: { in: Array.from(staffIdSet) } },
            select: { id: true, displayName: true, username: true, avatarUrl: true },
          })
        : [];
    const staffInfoMap = new Map(staffList.map((s) => [s.id, s]));

    const staffStats = new Map<
      number,
      {
        staffId: number;
        staffName: string;
        avatarUrl: string | null;
        exploitedCustomers: Set<number>;
        pickupCount: number;
        bookedCustomers: Set<number>;
        claimedCount: number;
      }
    >();

    const getStaffEntry = (id: number, fallbackName?: string | null) => {
      if (!staffStats.has(id)) {
        const info = staffInfoMap.get(id);
        staffStats.set(id, {
          staffId: id,
          staffName: info?.displayName || info?.username || fallbackName || `Nhân viên #${id}`,
          avatarUrl: info?.avatarUrl || null,
          exploitedCustomers: new Set<number>(),
          pickupCount: 0,
          bookedCustomers: new Set<number>(),
          claimedCount: 0,
        });
      }
      return staffStats.get(id)!;
    };

    // Initialize all assigned staff (ensuring 0s if they haven't worked yet)
    assignedStaffIds.forEach((id) => getStaffEntry(id));

    const PICKUP_CALL_RESULTS = new Set([
      'BOOKED',
      'THINKING',
      'CALLBACK',
      'NO_NEED',
      'REJECTED',
      'WRONG_NUMBER',
      'ANSWERED',
      'ANSWER',
      'CONNECTED',
    ]);
    const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);

    for (const log of logs) {
      if (!log.staffId) continue;
      const entry = getStaffEntry(log.staffId, log.staffName);

      if (log.action === 'CLAIM') {
        entry.claimedCount += 1;
      } else if (log.action === 'STATUS_UPDATE' || log.action === 'CALL') {
        if (log.legacyUserId) {
          entry.exploitedCustomers.add(log.legacyUserId);
        }
        let meta: Record<string, any> = {};
        try {
          meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata || {};
        } catch {}
        const callResult = String(meta.callResult || '').toUpperCase();
        const durationSec = Number(meta.durationSec) || 0;

        const isPickup =
          !NON_PICKUP_RESULTS.has(callResult) && (PICKUP_CALL_RESULTS.has(callResult) || durationSec > 0);

        if (isPickup) {
          entry.pickupCount += 1;
        }

        if (callResult === 'BOOKED' && log.legacyUserId) {
          entry.bookedCustomers.add(log.legacyUserId);
        }
      } else if (log.action === 'BOOKING') {
        if (log.legacyUserId) {
          entry.bookedCustomers.add(log.legacyUserId);
          entry.exploitedCustomers.add(log.legacyUserId);
        }
      }
    }

    for (const c of customers) {
      // Check bookings within campaign window
      if (c.bookedByStaffId && c.poolStatus === 'BOOKED') {
        const bookedAt = c.bookedAt ? new Date(c.bookedAt) : null;
        const inWindow =
          (!startDate || (bookedAt && bookedAt >= startDate)) && (!endDate || (bookedAt && bookedAt <= endDate));
        if (inWindow) {
          const entry = getStaffEntry(c.bookedByStaffId, c.bookedByStaffName);
          entry.bookedCustomers.add(c.legacyUserId);
          entry.exploitedCustomers.add(c.legacyUserId);
        }
      }
      // Check last call within campaign window
      if (c.lastCallStaffId && ['EXPLOITED', 'BOOKED', 'EXCLUDED', 'RECYCLING'].includes(c.poolStatus || '')) {
        const lastCallAt = c.lastCallAt ? new Date(c.lastCallAt) : null;
        const inWindow =
          (!startDate || (lastCallAt && lastCallAt >= startDate)) &&
          (!endDate || (lastCallAt && lastCallAt <= endDate));
        if (inWindow) {
          const entry = getStaffEntry(c.lastCallStaffId, c.lastCallStaffName);
          entry.exploitedCustomers.add(c.legacyUserId);
        }
      }
    }

    const items: CampaignStaffPerformance[] = Array.from(staffStats.values()).map((s) => {
      const exploitedCount = s.exploitedCustomers.size;
      const bookedCount = s.bookedCustomers.size;
      const conversionRate = exploitedCount > 0 ? Number(((bookedCount / exploitedCount) * 100).toFixed(1)) : 0;
      return {
        staffId: s.staffId,
        staffName: s.staffName,
        avatarUrl: s.avatarUrl,
        exploitedCount,
        pickupCount: s.pickupCount,
        bookedCount,
        conversionRate,
        claimedCount: s.claimedCount,
      };
    });

    // Sort by: bookedCount DESC, exploitedCount DESC, pickupCount DESC, staffName ASC
    items.sort((a, b) => {
      if (b.bookedCount !== a.bookedCount) return b.bookedCount - a.bookedCount;
      if (b.exploitedCount !== a.exploitedCount) return b.exploitedCount - a.exploitedCount;
      if (b.pickupCount !== a.pickupCount) return b.pickupCount - a.pickupCount;
      return a.staffName.localeCompare(b.staffName);
    });

    const totalExploited = items.reduce((sum, item) => sum + item.exploitedCount, 0);
    const totalPickup = items.reduce((sum, item) => sum + item.pickupCount, 0);
    const totalBooked = items.reduce((sum, item) => sum + item.bookedCount, 0);
    const avgConversionRate = totalExploited > 0 ? Number(((totalBooked / totalExploited) * 100).toFixed(1)) : 0;

    return {
      campaignId,
      campaignName: campaign.name,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      totalMembers: items.length,
      items,
      summary: {
        totalExploited,
        totalPickup,
        totalBooked,
        avgConversionRate,
      },
    };
  }

  /**
   * Claim / Lock customer in Shared Pool for a specific staff member.
   */
  static async claimCustomer(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number
  ): Promise<{ success: boolean; message: string; customer: any }> {
    await this.maintainSharedPool(fastify, campaignId);

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Chiến dịch không tồn tại.');

    let config: SharedPoolConfig = { ...DEFAULT_SHARED_POOL_CONFIG };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

    if (config.isPaused) {
      throw new Error('Shared Pool đang tạm dừng khai thác bởi Quản lý.');
    }

    // Verify staff membership
    let allowedStaffIds: number[] = [];
    try {
      if (campaign.assignedStaffIds) {
        allowedStaffIds = JSON.parse(campaign.assignedStaffIds);
      }
    } catch {}

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true, role: true },
    });
    if (!staff) throw new Error('Nhân viên không tồn tại.');

    const isAdmin = staff.role === 'admin' || staff.role === 'manager';
    if (
      !isAdmin &&
      Array.isArray(allowedStaffIds) &&
      allowedStaffIds.length > 0 &&
      !allowedStaffIds.includes(staffId)
    ) {
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
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
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
  static async releaseClaim(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number,
    isManager: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    if (customer.poolStatus !== 'CLAIMED') {
      return { success: true, message: 'Khách hàng không ở trạng thái bị giữ (Claimed).' };
    }

    if (!isManager && customer.claimedByStaffId !== staffId) {
      throw new Error('Bạn không có quyền nhả khách do người khác đang giữ.');
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
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

    return {
      success: true,
      message: 'Đã giải phóng khách hàng về Shared Pool thành công.',
    };
  }

  /**
   * Helper to map standard mOS call log (callResult, outcome, duration) to Shared Pool status,
   * pickup classification, and recycling rules (Single Source of Truth - MOS-BUG-99).
   */
  static mapCallLogToSharedPool(
    callLog: {
      callResult?: string | null;
      outcome?: string | null;
      durationSec?: number | null;
      callbackDate?: Date | string | null;
      note?: string | null;
    },
    config?: SharedPoolConfig
  ): {
    mappedCallResult: string;
    isPickup: boolean;
    nextPoolStatus: CampaignPoolStatus;
    availableAt: Date | null;
    cooldownUntil: Date | null;
    isBooked: boolean;
    isExcluded: boolean;
  } {
    const rawResult = String(callLog.callResult || '')
      .toUpperCase()
      .trim();
    const rawOutcome = String(callLog.outcome || '')
      .toUpperCase()
      .trim();
    const durationSec = Number(callLog.durationSec) || 0;
    const now = new Date();

    let mappedCallResult = 'THINKING';
    if (
      rawOutcome === 'BOOKED' ||
      rawOutcome === 'RENEWED' ||
      rawOutcome.includes('ĐẶT LỊCH') ||
      rawOutcome.includes('ĐẶT CỌC') ||
      rawOutcome.includes('BOOKED') ||
      rawResult === 'BOOKED'
    ) {
      mappedCallResult = 'BOOKED';
    } else if (
      rawOutcome === 'CALL_BACK' ||
      rawOutcome === 'CALLBACK' ||
      rawOutcome.includes('HẸN GỌI LẠI') ||
      rawOutcome.includes('GỌI LẠI')
    ) {
      mappedCallResult = 'CALLBACK';
    } else if (
      rawOutcome === 'NO_NEED' ||
      rawOutcome.includes('KHÔNG CÓ NHU CẦU') ||
      rawOutcome.includes('KHÔNG NHU CẦU') ||
      rawResult === 'NO_NEED'
    ) {
      mappedCallResult = 'NO_NEED';
    } else if (
      rawOutcome === 'REFUSED' ||
      rawOutcome === 'REJECTED' ||
      rawOutcome.includes('TỪ CHỐI') ||
      rawOutcome.includes('KHÔNG GỌI') ||
      rawResult === 'REJECTED'
    ) {
      mappedCallResult = 'REJECTED';
    } else if (
      rawResult === 'WRONG_NUMBER' ||
      rawOutcome === 'WRONG_NUMBER' ||
      rawOutcome.includes('SAI SỐ') ||
      rawOutcome.includes('NHẦM SỐ')
    ) {
      mappedCallResult = 'WRONG_NUMBER';
    } else if (
      rawResult === 'NO_ANSWER' ||
      rawResult === 'MISSED' ||
      rawResult === 'UNANSWERED' ||
      rawOutcome.includes('GỌI NHỠ') ||
      rawOutcome.includes('KHÔNG TRẢ LỜI')
    ) {
      mappedCallResult = 'NO_ANSWER';
    } else if (rawResult === 'BUSY' || rawOutcome.includes('MÁY BẬN') || rawOutcome.includes('BẬN MÁY')) {
      mappedCallResult = 'BUSY';
    } else if (
      rawResult === 'FAILED' ||
      rawResult === 'ERROR' ||
      rawOutcome.includes('LỖI CUỘC GỌI') ||
      rawOutcome.includes('KHÔNG LIÊN LẠC') ||
      rawOutcome.includes('THUÊ BAO')
    ) {
      mappedCallResult = 'ERROR';
    } else if (
      rawResult === 'ANSWERED' ||
      durationSec > 0 ||
      rawOutcome === 'PENDING' ||
      rawOutcome.includes('SUY NGHĨ') ||
      rawOutcome.includes('CHƯA CHỐT')
    ) {
      mappedCallResult = 'THINKING';
    }

    const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);
    const PICKUP_CALL_RESULTS = new Set([
      'BOOKED',
      'THINKING',
      'CALLBACK',
      'NO_NEED',
      'REJECTED',
      'WRONG_NUMBER',
      'ANSWERED',
      'ANSWER',
      'CONNECTED',
    ]);
    const isPickup =
      !NON_PICKUP_RESULTS.has(rawResult) &&
      (PICKUP_CALL_RESULTS.has(mappedCallResult) || PICKUP_CALL_RESULTS.has(rawResult) || durationSec > 0);

    const isBooked = mappedCallResult === 'BOOKED';
    const isExcluded = ['NO_NEED', 'REJECTED', 'WRONG_NUMBER'].includes(mappedCallResult);

    let nextPoolStatus: CampaignPoolStatus = 'EXPLOITED';
    let availableAt: Date | null = null;
    let cooldownUntil: Date | null = null;

    if (isBooked) {
      nextPoolStatus = 'BOOKED';
      availableAt = null;
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else if (isExcluded) {
      nextPoolStatus = 'EXCLUDED';
      availableAt = null;
      cooldownUntil = null;
    } else if (mappedCallResult === 'CALLBACK') {
      nextPoolStatus = 'RECYCLING';
      availableAt = callLog.callbackDate ? new Date(callLog.callbackDate) : new Date(now.getTime() + 24 * 3600 * 1000);
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else if (['THINKING', 'NO_ANSWER', 'BUSY', 'ERROR'].includes(mappedCallResult)) {
      const defaultDays = mappedCallResult === 'THINKING' ? 7 : 3;
      const days = config?.recycleRules?.[mappedCallResult as keyof typeof config.recycleRules] ?? defaultDays;
      nextPoolStatus = 'RECYCLING';
      availableAt = new Date(now.getTime() + (Number(days) || defaultDays) * 24 * 3600 * 1000);
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else {
      nextPoolStatus = 'EXPLOITED';
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    }

    return {
      mappedCallResult,
      isPickup,
      nextPoolStatus,
      availableAt,
      cooldownUntil,
      isBooked,
      isExcluded,
    };
  }

  /**
   * Automatically synchronize Shared Pool claim when a standard mOS call log is recorded.
   * Matches the exact customer, staff, and active claim session (MOS-BUG-99).
   */
  static async syncCustomerClaimAfterCall(
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

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    const results: Array<{ campaignId: number; customerId: number; poolStatus: string }> = [];

    for (const customer of claimedCustomers) {
      let config: SharedPoolConfig = {
        ...DEFAULT_SHARED_POOL_CONFIG,
      };
      if (customer.campaign?.sharedPoolConfig) {
        try {
          const parsed =
            typeof customer.campaign.sharedPoolConfig === 'string'
              ? JSON.parse(customer.campaign.sharedPoolConfig)
              : customer.campaign.sharedPoolConfig;
          config = { ...config, ...parsed };
        } catch {}
      }

      const mapped = this.mapCallLogToSharedPool(resolvedCallLog, config);

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

      await this.maintainSharedPool(fastify, customer.campaignId);

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
  static async syncSharedPoolFromLatestCall(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number
  ): Promise<{ success: boolean; message: string; poolStatus: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
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

    const syncRes = await this.syncCustomerClaimAfterCall(fastify, customer.legacyUserId, staffId, callLog);
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
  static async recordSharedPoolStatus(
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

    let config: SharedPoolConfig = {
      ...DEFAULT_SHARED_POOL_CONFIG,
    };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = {
          ...config,
          ...parsed,
          recycleRules: {
            ...config.recycleRules,
            ...(parsed?.recycleRules || {}),
          },
        };
      } catch {}
    }

    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true, role: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
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
    const mapped = this.mapCallLogToSharedPool(
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
    await this.maintainSharedPool(fastify, campaignId);

    return {
      success: true,
      message: `Đã ghi nhận kết quả thành công. Khách hàng chuyển sang trạng thái "${nextPoolStatus}".`,
      poolStatus: nextPoolStatus,
    };
  }

  /**
   * Advance Shared Pool to target or next batch manually.
   */
  static async advanceBatch(
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

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
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

    return {
      success: true,
      message: `Đã chuyển sang Batch ${nextBatch} thành công.`,
      currentBatchNumber: nextBatch,
    };
  }

  /**
   * Pause / Resume Shared Pool exploitation.
   */
  static async togglePause(
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

    let config: SharedPoolConfig = {
      batchSize: 100,
      claimTtlMinutes: 15,
      maxClaimsPerStaff: 1,
      cooldownMinutes: 60,
      warningThreshold: 30,
      criticalThreshold: 10,
      isPaused: false,
    };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

    config.isPaused = isPaused;

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
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

    return {
      success: true,
      message: isPaused ? 'Đã tạm dừng Shared Pool.' : 'Đã tiếp tục hoạt động Shared Pool.',
      isPaused,
    };
  }

  /**
   * Manager action on a customer: Release claim, return to pool, or exclude.
   */
  static async managerPoolAction(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number,
    action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED',
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
    const now = new Date();

    if (action === 'RELEASE_CLAIM') {
      return this.releaseClaim(fastify, campaignId, customer.id, staffId, true);
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
  static async batchManagerPoolAction(
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

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
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

  /**
   * Get immutable audit and action logs for a customer in Shared Pool (chống tranh công).
   */
  static async getSharedPoolLogs(fastify: FastifyInstance, campaignId: number, customerId: number): Promise<any[]> {
    const logs = await fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
      where: {
        campaignId,
        OR: [{ campaignCustomerId: customerId }, { legacyUserId: customerId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((l) => ({
      id: l.id,
      campaignId: l.campaignId,
      campaignCustomerId: l.campaignCustomerId,
      legacyUserId: l.legacyUserId,
      staffId: l.staffId,
      staffName: l.staffName,
      action: l.action,
      note: l.note,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Get detailed real-time history and audit trail for Campaign Shared Pool
   */
  static async getCampaignSharedPoolHistory(
    fastify: FastifyInstance,
    campaignId: number,
    params: SharedPoolHistoryQueryParams = {}
  ): Promise<SharedPoolHistoryResponse> {
    const pageNum = Math.max(1, Math.floor(Number(params.page) || 1));
    const limitNum = Math.min(200, Math.max(1, Math.floor(Number(params.pageSize) || 20)));
    const skip = (pageNum - 1) * limitNum;

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, operationMode: true },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại.`);
    }

    const where: any = {
      campaignId,
    };

    // Filter by action group
    if (params.action && params.action !== 'ALL') {
      const act = params.action.toUpperCase();
      if (act === 'CLAIM') {
        where.action = 'CLAIM';
      } else if (act === 'RELEASE') {
        where.action = { in: ['RELEASE_MANUAL', 'RELEASE_MANAGER', 'RELEASE_EXPIRED'] };
      } else if (act === 'CALL' || act === 'STATUS_UPDATE') {
        where.action = { in: ['CALL', 'STATUS_UPDATE'] };
      } else if (act === 'RECYCLE') {
        where.action = { in: ['RECYCLE', 'RECYCLE_RETURN'] };
      } else if (act === 'EXCLUDE') {
        where.action = 'EXCLUDE';
      } else if (act === 'BOOKING') {
        where.action = { in: ['BOOK', 'BOOKING'] };
      } else if (act === 'MANAGER') {
        where.action = {
          in: [
            'RELEASE_MANAGER',
            'RETURN_TO_POOL',
            'EXCLUDE',
            'RECOVERY_OVERRIDE',
            'PAUSE_POOL',
            'RESUME_POOL',
            'MANUAL_ADVANCE_BATCH',
          ],
        };
      } else if (act === 'RECOVERY') {
        where.action = 'RECOVERY_OVERRIDE';
      } else {
        where.action = params.action;
      }
    }

    // Filter by specific customer
    if (params.customerId) {
      const cid = Number(params.customerId);
      if (!isNaN(cid) && cid > 0) {
        where.OR = [{ campaignCustomerId: cid }, { legacyUserId: cid }];
      }
    }

    // Filter by staff
    if (params.staffId) {
      const sid = Number(params.staffId);
      if (!isNaN(sid) && sid > 0) {
        where.staffId = sid;
      }
    }

    // Filter by date range
    if (params.dateFrom || params.dateTo) {
      const dateFilter: any = {};
      if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
      if (params.dateTo) dateFilter.lte = new Date(params.dateTo);
      where.createdAt = dateFilter;
    }

    // Search query: matching customer name / phone or staff name
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      const numMatch = parseInt(q, 10);
      const isNum = !isNaN(numMatch) && String(numMatch) === q;

      const [matchedUserProfiles, matchedUserContacts] = await Promise.all([
        fastify.prisma.legacy.user_profile.findMany({
          where: {
            OR: [{ full_name: { contains: q } }, ...(isNum ? [{ user_id: numMatch }] : [])],
          },
          select: { user_id: true },
          take: 100,
        }),
        fastify.prisma.legacy.user_contact.findMany({
          where: {
            phone_number: { contains: q },
          },
          select: { user_id: true },
          take: 100,
        }),
      ]);

      const matchedUserIds = Array.from(
        new Set([
          ...matchedUserProfiles.map((p) => p.user_id),
          ...matchedUserContacts.map((c) => c.user_id),
          ...(isNum ? [numMatch] : []),
        ])
      );

      where.AND = [
        {
          OR: [
            ...(matchedUserIds.length > 0 ? [{ legacyUserId: { in: matchedUserIds } }] : []),
            { staffName: { contains: q } },
            { note: { contains: q } },
          ],
        },
      ];
    }

    const [total, rawLogs] = await Promise.all([
      fastify.prisma.crm.crmCampaignSharedPoolLog.count({ where }),
      fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const legacyUserIds = Array.from(
      new Set(rawLogs.map((l) => l.legacyUserId).filter((id): id is number => typeof id === 'number' && id > 0))
    );
    const campaignCustomerIds = Array.from(
      new Set(rawLogs.map((l) => l.campaignCustomerId).filter((id): id is number => typeof id === 'number' && id > 0))
    );

    const [profiles, contacts, currentCustomers] = await Promise.all([
      legacyUserIds.length > 0
        ? fastify.prisma.legacy.user_profile.findMany({
            where: { user_id: { in: legacyUserIds } },
            select: { user_id: true, full_name: true },
          })
        : [],
      legacyUserIds.length > 0
        ? fastify.prisma.legacy.user_contact.findMany({
            where: { user_id: { in: legacyUserIds }, is_disabled: false },
            select: { user_id: true, phone_number: true },
          })
        : [],
      campaignCustomerIds.length > 0
        ? fastify.prisma.crm.crmCampaignCustomer.findMany({
            where: { id: { in: campaignCustomerIds }, campaignId },
            select: {
              id: true,
              legacyUserId: true,
              poolStatus: true,
              claimedByStaffId: true,
              claimedByStaffName: true,
              removedAt: true,
            },
          })
        : [],
    ]);

    const profileMap = new Map<number, string>();
    profiles.forEach((p) => profileMap.set(p.user_id, p.full_name || ''));

    const contactMap = new Map<number, string>();
    contacts.forEach((c) => {
      if (!contactMap.has(c.user_id)) {
        contactMap.set(c.user_id, c.phone_number || '');
      }
    });

    const currentCustomerMap = new Map<number, any>();
    currentCustomers.forEach((cc) => currentCustomerMap.set(cc.id, cc));

    const items: CampaignSharedPoolDetailedLog[] = rawLogs.map((l) => {
      let parsedMeta: any = null;
      if (l.metadata) {
        try {
          parsedMeta = JSON.parse(l.metadata);
        } catch {
          parsedMeta = { raw: l.metadata };
        }
      }

      let actionLabel = l.action;
      switch (l.action) {
        case 'CLAIM':
          actionLabel = 'Lock / Giữ Data';
          break;
        case 'RELEASE_MANUAL':
          actionLabel = 'Nhả Claim';
          break;
        case 'RELEASE_MANAGER':
          actionLabel = 'Quản lý nhả Claim';
          break;
        case 'RELEASE_EXPIRED':
          actionLabel = 'Hết hạn Lock (TTL)';
          break;
        case 'CALL':
        case 'STATUS_UPDATE':
          actionLabel = 'Báo cáo gọi / Trạng thái';
          break;
        case 'RECYCLE':
        case 'RECYCLE_RETURN':
          actionLabel = 'Chờ quay lại (Recycle)';
          break;
        case 'EXCLUDE':
          actionLabel = 'Đã loại khỏi Pool';
          break;
        case 'RETURN_TO_POOL':
          actionLabel = 'Về lại Pool';
          break;
        case 'BOOK':
        case 'BOOKING':
          actionLabel = 'Chốt Booking';
          break;
        case 'RECOVERY_OVERRIDE':
          actionLabel = 'Quản lý Khôi phục';
          break;
        case 'PAUSE_POOL':
          actionLabel = 'Tạm dừng Pool';
          break;
        case 'RESUME_POOL':
          actionLabel = 'Tiếp tục Pool';
          break;
        case 'MANUAL_ADVANCE_BATCH':
        case 'AUTO_ADVANCE_BATCH':
          actionLabel = 'Mở Batch mới';
          break;
      }

      let previousPoolStatus: string | null =
        parsedMeta?.previousPoolStatus || parsedMeta?.previousState?.poolStatus || null;
      let nextPoolStatus: string | null = parsedMeta?.nextPoolStatus || parsedMeta?.nextState?.poolStatus || null;

      if (!previousPoolStatus || !nextPoolStatus) {
        if (l.action === 'CLAIM') {
          previousPoolStatus = previousPoolStatus || 'AVAILABLE';
          nextPoolStatus = nextPoolStatus || 'CLAIMED';
        } else if (l.action === 'RELEASE_MANUAL' || l.action === 'RELEASE_MANAGER' || l.action === 'RELEASE_EXPIRED') {
          previousPoolStatus = previousPoolStatus || 'CLAIMED';
          nextPoolStatus = nextPoolStatus || 'AVAILABLE';
        } else if (l.action === 'RETURN_TO_POOL') {
          nextPoolStatus = nextPoolStatus || 'AVAILABLE';
        } else if (l.action === 'EXCLUDE') {
          nextPoolStatus = nextPoolStatus || 'EXCLUDED';
        } else if (l.action === 'STATUS_UPDATE' || l.action === 'CALL') {
          nextPoolStatus = nextPoolStatus || parsedMeta?.nextPoolStatus || null;
        }
      }

      const currentCust = l.campaignCustomerId ? currentCustomerMap.get(l.campaignCustomerId) : null;
      const currentPoolStatus = currentCust?.poolStatus || null;
      const isDrifted = Boolean(currentCust && nextPoolStatus && currentPoolStatus !== nextPoolStatus);

      const canRestore = Boolean(
        currentCust &&
        !currentCust.removedAt &&
        typeof l.campaignCustomerId === 'number' &&
        l.campaignCustomerId > 0 &&
        [
          'CLAIM',
          'RELEASE_MANUAL',
          'RELEASE_MANAGER',
          'RELEASE_EXPIRED',
          'STATUS_UPDATE',
          'CALL',
          'EXCLUDE',
          'RETURN_TO_POOL',
          'RECOVERY_OVERRIDE',
        ].includes(l.action)
      );

      let resultText: string | null = parsedMeta?.result || null;
      if (!resultText) {
        if (parsedMeta?.callResult) {
          resultText = `Kết quả gọi: ${parsedMeta.callResult}`;
        } else if (l.action === 'RECOVERY_OVERRIDE') {
          resultText = 'Đã khôi phục thành công';
        } else {
          resultText = 'Thành công';
        }
      }

      return {
        id: l.id,
        campaignId: l.campaignId,
        campaignCustomerId: l.campaignCustomerId,
        legacyUserId: l.legacyUserId,
        customerName: (l.legacyUserId && profileMap.get(l.legacyUserId)) || null,
        customerPhone: (l.legacyUserId && contactMap.get(l.legacyUserId)) || null,
        currentPoolStatus,
        currentClaimedByStaffId: currentCust?.claimedByStaffId || null,
        currentClaimedByStaffName: currentCust?.claimedByStaffName || null,
        staffId: l.staffId,
        staffName: l.staffName,
        action: l.action,
        actionLabel,
        previousPoolStatus,
        nextPoolStatus,
        previousClaimedByStaffName: parsedMeta?.previousClaimedByStaffName || null,
        nextClaimedByStaffName: parsedMeta?.nextClaimedByStaffName || null,
        note: l.note,
        metadata: parsedMeta,
        result: resultText,
        isDrifted,
        canRestore,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 0,
    };
  }

  /**
   * Safely recover/rollback customer state in Campaign Shared Pool (Manager / Admin).
   * Invariants:
   * 1. Never delete old history (Append-only).
   * 2. Append a new audit log for every recovery.
   * 3. Mandatory reason input.
   * 4. Record acting staff and timestamp.
   * 5. Verify current customer state.
   * 6. Warn if data drifted since the target log entry.
   */
  static async recoverCustomerState(
    fastify: FastifyInstance,
    campaignId: number,
    staffId: number,
    dto: SharedPoolRecoveryDto
  ): Promise<SharedPoolRecoveryResponse> {
    const trimmedReason = (dto.reason || '').trim();
    if (!trimmedReason) {
      throw new Error('Bắt buộc nhập lý do khi thực hiện khôi phục.');
    }

    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: dto.customerId }, { legacyUserId: dto.customerId }],
        removedAt: null,
      },
    });
    if (!customer) {
      throw new Error('Khách hàng không tồn tại trong chiến dịch.');
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
    const now = new Date();

    const previousState = {
      poolStatus: customer.poolStatus,
      claimedByStaffId: customer.claimedByStaffId,
      claimedByStaffName: customer.claimedByStaffName,
      claimedAt: customer.claimedAt,
      claimExpiresAt: customer.claimExpiresAt,
      cooldownUntil: customer.cooldownUntil,
      availableAt: customer.availableAt,
      lastCallResult: customer.lastCallResult,
    };

    let targetNextStatus = 'AVAILABLE';
    const nextClaimedByStaffId: number | null = null;
    const nextClaimedByStaffName: string | null = null;
    const nextClaimedAt: Date | null = null;
    const nextClaimExpiresAt: Date | null = null;
    let nextCooldownUntil: Date | null = null;
    let nextAvailableAt: Date | null = null;
    let actionDesc = '';

    if (dto.action === 'ROLLBACK_TO_LOG') {
      if (!dto.logId) {
        throw new Error('Thiếu ID bản ghi lịch sử cần khôi phục.');
      }
      const targetLog = await fastify.prisma.crm.crmCampaignSharedPoolLog.findUnique({
        where: { id: dto.logId },
      });
      if (!targetLog || targetLog.campaignId !== campaignId || targetLog.campaignCustomerId !== customer.id) {
        throw new Error('Bản ghi lịch sử không hợp lệ hoặc không thuộc về khách hàng này.');
      }

      const subsequentLogsCount = await fastify.prisma.crm.crmCampaignSharedPoolLog.count({
        where: {
          campaignCustomerId: customer.id,
          id: { gt: targetLog.id },
        },
      });

      let targetMeta: any = null;
      if (targetLog.metadata) {
        try {
          targetMeta = JSON.parse(targetLog.metadata);
        } catch {}
      }

      let intendedPrevStatus = targetMeta?.previousPoolStatus || targetMeta?.previousState?.poolStatus || null;

      if (!intendedPrevStatus) {
        if (targetLog.action === 'CLAIM') {
          intendedPrevStatus = 'AVAILABLE';
        } else if (targetLog.action === 'EXCLUDE') {
          intendedPrevStatus = 'AVAILABLE';
        } else if (targetLog.action === 'STATUS_UPDATE' || targetLog.action === 'CALL') {
          intendedPrevStatus = 'AVAILABLE';
        } else {
          intendedPrevStatus = 'AVAILABLE';
        }
      }

      const isDrifted =
        subsequentLogsCount > 0 ||
        customer.poolStatus !==
          (targetMeta?.nextPoolStatus || (targetLog.action === 'CLAIM' ? 'CLAIMED' : customer.poolStatus));

      if (isDrifted && !dto.forceOverride) {
        return {
          success: false,
          requiresConfirmation: true,
          driftDetected: true,
          message: `Dữ liệu khách hàng đã phát sinh thêm ${subsequentLogsCount} thao tác sau bản ghi này. Trạng thái hiện tại: "${customer.poolStatus}". Bạn có chắc chắn muốn ghi đè khôi phục về trạng thái trước (${intendedPrevStatus}) không?`,
          currentStatus: customer.poolStatus,
          targetPreviousStatus: intendedPrevStatus,
        };
      }

      targetNextStatus = intendedPrevStatus;
      actionDesc = `Hoàn tác về trạng thái trước bản ghi #${targetLog.id} (${targetLog.action})`;
    } else if (dto.action === 'RELEASE_CLAIM' || dto.action === 'FORCE_UNLOCK') {
      targetNextStatus = 'AVAILABLE';
      actionDesc = 'Cưỡng chế giải phóng Lock/Claim (Force Unlock)';
    } else if (dto.action === 'RESTORE_EXCLUDED') {
      targetNextStatus = 'AVAILABLE';
      actionDesc = 'Khôi phục khách hàng từ ĐÃ LOẠI (EXCLUDED) sang SẴN SÀNG (AVAILABLE)';
    } else if (dto.action === 'RESET_RECYCLE') {
      targetNextStatus = 'AVAILABLE';
      nextCooldownUntil = null;
      nextAvailableAt = null;
      actionDesc = 'Reset trạng thái Recycle, đưa ngay về Pool sẵn sàng';
    } else if (dto.action === 'RESET_POOL_STATUS') {
      targetNextStatus = dto.targetPoolStatus || 'AVAILABLE';
      actionDesc = `Reset trạng thái Pool sang "${targetNextStatus}"`;
    } else {
      throw new Error(`Hành động khôi phục không hợp lệ: ${dto.action}`);
    }

    const updatedCustomer = await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: targetNextStatus,
        claimedByStaffId: nextClaimedByStaffId,
        claimedByStaffName: nextClaimedByStaffName,
        claimedAt: nextClaimedAt,
        claimExpiresAt: nextClaimExpiresAt,
        cooldownUntil: nextCooldownUntil,
        availableAt: nextAvailableAt,
      },
    });

    const nextState = {
      poolStatus: targetNextStatus,
      claimedByStaffId: nextClaimedByStaffId,
      claimedByStaffName: nextClaimedByStaffName,
      cooldownUntil: nextCooldownUntil,
      availableAt: nextAvailableAt,
    };

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'RECOVERY_OVERRIDE',
        note: `[KHÔI PHỤC] ${actionDesc}. Lý do: ${trimmedReason}`,
        metadata: JSON.stringify({
          recoveryAction: dto.action,
          reason: trimmedReason,
          rolledBackFromLogId: dto.logId || null,
          targetPoolStatus: dto.targetPoolStatus || null,
          forceOverride: Boolean(dto.forceOverride),
          previousState,
          nextState,
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: targetNextStatus,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    return {
      success: true,
      message: `Đã khôi phục thành công khách hàng sang trạng thái "${targetNextStatus}".`,
      customer: updatedCustomer,
    };
  }

  /**
   * Background maintenance worker: periodically releases expired claims across all active shared pool campaigns.
   */
  static startMaintenanceWorker(fastify: FastifyInstance): void {
    const runMaintenance = async () => {
      try {
        const campaigns = await fastify.prisma.crm.crmCustomCampaign.findMany({
          where: { operationMode: 'SHARED_POOL', deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const camp of campaigns) {
          await this.maintainSharedPool(fastify, camp.id);
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
}
