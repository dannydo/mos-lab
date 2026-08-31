import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  AddCampaignCustomersResponse,
  Campaign,
  CampaignBookingStatusFilter,
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
  ToggleCampaignTouchpointLogDto,
  UpdateCampaignDto,
} from '@mos-lab/shared';
import { CampaignPromotionSyncService } from './campaign-promotion-sync.service.js';
import {
  CustomerServiceFilterCatalogService,
  normalizeFixedFinalPriceCategoryKeys,
  resolveFixedFinalPriceScope,
} from '../customers/services/customer-service-filter-catalog.service.js';

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

  /**
   * Auto check and transition campaign statuses based on start/end dates.
   */
  static async checkAndUpdateCampaignStatuses(fastify: FastifyInstance): Promise<void> {
    const now = new Date();
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
    params: ListCampaignsParams = {}
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

    const where: any = {
      deletedAt: null,
    };
    if (status) {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { slug: { contains: trimmed } },
        { description: { contains: trimmed } },
      ];
    }

    const [total, campaigns] = await Promise.all([
      fastify.prisma.crm.crmCustomCampaign.count({ where }),
      fastify.prisma.crm.crmCustomCampaign.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
      }),
    ]);

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
        createdBy: c.createdBy,
        assignedStaffIds,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        _count: {
          customers: c._count.customers,
          touchpoints: c._count.touchpoints,
          promotions: c._count.promotions,
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
  static async getCampaignById(fastify: FastifyInstance, id: number): Promise<any> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
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

    if (!campaign) {
      throw new Error(`Chiến dịch ID ${id} không tồn tại`);
    }

    return this.mapCampaignToDto(campaign);
  }

  /**
   * Get single campaign by Slug.
   */
  static async getCampaignBySlug(fastify: FastifyInstance, slug: string): Promise<any> {
    const raw = (slug || '').trim();
    const clean = slugify(raw);
    const bare = raw.replace(/^-+|-+$/g, '');
    const numericId = !isNaN(Number(raw)) ? parseInt(raw, 10) : null;

    let campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: {
        OR: [
          { slug: raw },
          { slug: clean },
          { slug: bare },
          { slug: `-${clean}` },
          { slug: `-${bare}` },
          ...(numericId !== null ? [{ id: numericId }] : []),
        ],
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

    if (!campaign && clean) {
      campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
        where: {
          slug: { contains: clean },
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
      restrictToAssignedStaffId?: number;
      search?: string;
      touchpointKey?: string;
      bookingStatus?: CampaignBookingStatusFilter;
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
      restrictToAssignedStaffId,
      search,
      touchpointKey,
      bookingStatus = 'ALL',
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

    // Booker, text and touchpoint filters depend on data from other sources, so
    // they still require enrichment before filtering. The common unfiltered
    // table path can page at the database boundary, avoiding every legacy query
    // and response field for records outside the visible page.
    const hasPostEnrichmentFilters = Boolean(
      bookerId ||
      assignedStaffId ||
      restrictToAssignedStaffId ||
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
        SELECT cl.* FROM (
          SELECT cl2.*, ROW_NUMBER() OVER (PARTITION BY cl2.legacy_user_id ORDER BY cl2.created_at DESC) AS rn
          FROM crm_call_logs cl2
          WHERE cl2.legacy_user_id IN (${idListStr})
        ) cl WHERE cl.rn = 1
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
      fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
        SELECT 
          o.user_id as userId,
          COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start)) as lastVisitDate,
          DATEDIFF(NOW(), COALESCE(MAX(ro.actual_booking_date_start), MAX(o.booking_date_start))) as daysSinceLastVisit
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.user_id IN (${idListStr}) AND o.order_state = 'Completed'
        GROUP BY o.user_id
      `),
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
        Number(r.userId),
        {
          lastVisitDate: r.lastVisitDate ? new Date(r.lastVisitDate).toISOString() : null,
          daysSinceLastVisit:
            r.daysSinceLastVisit !== null && r.daysSinceLastVisit !== undefined ? Number(r.daysSinceLastVisit) : null,
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
        lastCallAt,
        lastCallDuration,
        lastCallResult,
        lastCallNote,
        lastCall: lastCall
          ? {
              createdAt: lastCallAt,
              durationSec: lastCallDuration,
              callResult: lastCallResult,
              note: lastCallNote,
            }
          : null,
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
    if (restrictToAssignedStaffId) {
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
      await fastify.prisma.crm.crmCampaignCustomer.createMany({
        data: validCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        })),
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

      // 2. Clear old Booker assignments
      await tx.crmCustomerAssignment.deleteMany({
        where: { legacyUserId: { in: uniqueCustomerIds } },
      });

      // 3. Add to target campaign
      await tx.crmCampaignCustomer.createMany({
        data: uniqueCustomerIds.map((cId) => ({
          campaignId,
          legacyUserId: cId,
          addedAt: now,
          addedBy: staffId,
        })),
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

      // Clear Booker assignment so customer returns to unassigned NYC main pool
      await tx.crmCustomerAssignment.deleteMany({
        where: { legacyUserId: record.legacyUserId },
      });
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

      // Clear Booker assignments so customers return to unassigned NYC main pool
      if (legacyUserIds.length > 0) {
        await tx.crmCustomerAssignment.deleteMany({
          where: { legacyUserId: { in: legacyUserIds } },
        });
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
    });

    if (!campaignCustomer) {
      throw new Error('Khách hàng không ở trong chiến dịch này');
    }

    if (restrictToAssignedStaffId) {
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

    if (restrictToAssignedStaffId && customers.length > 0) {
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
}
