import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  CampaignPromotion,
  CampaignPromotionType,
  CampaignStatsResponse,
  CreateCampaignPromotionDto,
  CustomerCampaignPromotionInfo,
} from '@mos-lab/shared';
import { CampaignPromotionSyncService } from '../campaign-promotion-sync.service.js';
import {
  CustomerServiceFilterCatalogService,
  normalizeFixedFinalPriceCategoryKeys,
  resolveFixedFinalPriceScope,
} from '../../customers/services/customer-service-filter-catalog.service.js';

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

export class CampaignPromotionStatsService {
  private static inFlightCampaignStatsPromises = new Map<string, Promise<CampaignStatsResponse>>();
  private static campaignStatsComputedAt = new Map<string, number>();
  private static statusChecker?: (fastify: FastifyInstance) => Promise<void>;

  static registerStatusChecker(fn: (fastify: FastifyInstance) => Promise<void>): void {
    this.statusChecker = fn;
  }

  static invalidateCache(fastify: FastifyInstance, campaignId?: number): void {
    if (campaignId) {
      fastify.cache?.invalidatePattern(`^campaign:stats:${campaignId}:`);
      for (const key of this.inFlightCampaignStatsPromises.keys()) {
        if (key.startsWith(`campaign:stats:${campaignId}:`)) {
          this.inFlightCampaignStatsPromises.delete(key);
        }
      }
      for (const key of this.campaignStatsComputedAt.keys()) {
        if (key.startsWith(`campaign:stats:${campaignId}:`)) {
          this.campaignStatsComputedAt.delete(key);
        }
      }
    } else {
      fastify.cache?.invalidatePattern(`^campaign:stats:`);
      this.inFlightCampaignStatsPromises.clear();
      this.campaignStatsComputedAt.clear();
    }
  }

  /**
   * A fixed-final-price promotion is only valid for active, single-price lash
   * services. Catalog remains in the legacy DB and is read-only here.
   */
  static async validateCampaignPromotions(
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
   * Features Stale-While-Revalidate (SWR):
   * - Fresh (< 60s): Returns directly from RAM (< 5ms).
   * - Stale (60s - 300s): Returns instant cached data (0ms) and triggers background revalidation.
   * - Cache Miss: Single-Flight promise deduplication.
   */
  static async getCampaignStats(
    fastify: FastifyInstance,
    campaignId: number,
    restrictToAssignedStaffId?: number,
    options?: { skipCache?: boolean }
  ): Promise<CampaignStatsResponse> {
    const cacheKey = `campaign:stats:${campaignId}:${restrictToAssignedStaffId || 'ALL'}`;
    const now = Date.now();

    if (!options?.skipCache) {
      const cached = fastify.cache?.get<CampaignStatsResponse>(cacheKey);
      if (cached) {
        const computedAt = this.campaignStatsComputedAt.get(cacheKey) || now;
        const age = now - computedAt;

        // 1. FRESH (< 300s / 5m): Return directly from RAM, no background revalidation needed
        if (age < 300_000) {
          return cached;
        }

        // 2. STALE-WHILE-REVALIDATE (5m - 30m): Return immediately (0ms) and revalidate in background
        if (!this.inFlightCampaignStatsPromises.has(cacheKey)) {
          const revalidatePromise = (async () => {
            try {
              const freshStats = await this.computeCampaignStats(fastify, campaignId, restrictToAssignedStaffId);
              this.campaignStatsComputedAt.set(cacheKey, Date.now());
              fastify.cache?.set(cacheKey, freshStats, 1_800_000);
              return freshStats;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              fastify.log?.warn?.(
                `[CampaignStats] Background SWR revalidation failed for campaign ${campaignId}: ${errMsg}`
              );
              return cached;
            } finally {
              this.inFlightCampaignStatsPromises.delete(cacheKey);
            }
          })();
          this.inFlightCampaignStatsPromises.set(cacheKey, revalidatePromise);
        }

        return cached;
      }

      // 3. CACHE MISS: Single-flight deduplication
      const inFlight = this.inFlightCampaignStatsPromises.get(cacheKey);
      if (inFlight) {
        return await inFlight;
      }
    }

    const computePromise = (async () => {
      try {
        const stats = await this.computeCampaignStats(fastify, campaignId, restrictToAssignedStaffId);
        this.campaignStatsComputedAt.set(cacheKey, Date.now());
        fastify.cache?.set(cacheKey, stats, 1_800_000);
        return stats;
      } finally {
        this.inFlightCampaignStatsPromises.delete(cacheKey);
      }
    })();

    if (!options?.skipCache) {
      this.inFlightCampaignStatsPromises.set(cacheKey, computePromise);
    }

    return await computePromise;
  }

  private static async computeCampaignStats(
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

    let minOrderDate: Date | null = campaign.startDate || campaign.createdAt || null;
    for (const c of customers) {
      if (c.addedAt && (!minOrderDate || c.addedAt < minOrderDate)) {
        minOrderDate = c.addedAt;
      }
    }
    const minDateStr = minOrderDate
      ? new Date(minOrderDate).toISOString().replace('T', ' ').slice(0, 19)
      : '2026-01-01 00:00:00';

    // Chunk customerIds into batches of 500 to keep IN (...) lists performant and avoid lock contention
    const CHUNK_SIZE = 500;
    const chunks: number[][] = [];
    for (let i = 0; i < customerIds.length; i += CHUNK_SIZE) {
      chunks.push(customerIds.slice(i, i + CHUNK_SIZE));
    }

    const orderAggResults = await Promise.all(
      chunks.map((chunk) => {
        const idListStr = chunk.join(',');
        return fastify.prisma.legacy.$queryRawUnsafe<
          Array<{ userId: number; cnt: number; rev: number; minDate: Date | null }>
        >(`
          SELECT
            user_id AS userId,
            COUNT(id) AS cnt,
            COALESCE(SUM(total_price), 0) AS rev,
            MIN(date_created) AS minDate
          FROM \`order\`
          WHERE user_id IN (${idListStr})
            AND order_state = 'Completed'
            AND date_created >= '${minDateStr}'
          GROUP BY user_id
        `);
      })
    );
    const orderAgg = orderAggResults.flat();

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

  /**
   * Fetch active campaign promotion information for a customer.
   */
  static async getCustomerActivePromotions(
    fastify: FastifyInstance,
    legacyUserId: number
  ): Promise<CustomerCampaignPromotionInfo[]> {
    if (this.statusChecker) {
      await this.statusChecker(fastify);
    }
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
