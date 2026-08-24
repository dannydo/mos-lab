import { FastifyInstance } from 'fastify';
import type { BookingPromotionOption, BookingPromotionOptionsResponse, CampaignPromotionType } from '@mos-lab/shared';
import { CampaignPromotionSyncService } from '../../campaigns/campaign-promotion-sync.service.js';
import {
  CustomerServiceFilterCatalogService,
  normalizeFixedFinalPriceCategoryKeys,
  resolveFixedFinalPriceScope,
} from './customer-service-filter-catalog.service.js';

export class BookingPromotionError extends Error {}

type CampaignPromotionWithCampaign = {
  id: number;
  campaignId: number;
  name: string;
  code: string | null;
  type: CampaignPromotionType;
  value: number;
  eligibleServiceIds: string | null;
  eligibleServiceCategoryKeys: string | null;
  description: string | null;
  isActive: boolean;
  legacyPromotionId: number | null;
  campaign: {
    id: number;
    name: string;
    slug: string;
    deletedAt: Date | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  };
};

const campaignPromotionSelect = {
  id: true,
  campaignId: true,
  name: true,
  code: true,
  type: true,
  value: true,
  eligibleServiceIds: true,
  eligibleServiceCategoryKeys: true,
  description: true,
  isActive: true,
  legacyPromotionId: true,
  campaign: {
    select: {
      id: true,
      name: true,
      slug: true,
      deletedAt: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  },
} as const;

export interface BookingPromotionResolution {
  source: 'NONE' | 'STANDARD' | 'CUSTOM_CAMPAIGN';
  legacyPromotionId: number | null;
  legacyCampaignId: number | null;
  discountAmount: number;
  finalPrice: number;
  campaignPromotionTag: string | null;
  campaignPromotionId: number | null;
}

interface ResolveBookingPromotionInput {
  customerId: number;
  serviceId?: number | null;
  basePrice: number;
  /** YYYY-MM-DD booking date; defaults to the current ICT calendar date. */
  bookingDate?: string | null;
  promotionId?: number | null;
  campaignPromotionId?: number | null;
  /** A custom-campaign booking may only switch within this campaign. */
  allowedCampaignId?: number | null;
}

type FixedFinalPricePromotion = Pick<CampaignPromotionWithCampaign, 'type' | 'value' | 'eligibleServiceIds'>;

const parseEligibleServiceIds = (value: unknown): number[] => {
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
};

const parseEligibleServiceCategoryKeys = (value: unknown): string[] => {
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
};

const toCalendarDate = (value?: string | null): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const toCampaignCalendarDate = (value: Date | null): string | null => {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
};

export const isCampaignPromotionAvailableOnDate = (
  campaign: Pick<CampaignPromotionWithCampaign['campaign'], 'deletedAt' | 'status' | 'startDate' | 'endDate'>,
  bookingDate?: string | null
): boolean => {
  if (campaign.deletedAt || campaign.status !== 'ACTIVE') return false;

  const date = toCalendarDate(bookingDate);
  const startDate = toCampaignCalendarDate(campaign.startDate);
  const endDate = toCampaignCalendarDate(campaign.endDate);
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
};

export const calculateCampaignPromotionPrice = (
  promotion: FixedFinalPricePromotion,
  basePrice: number,
  serviceId?: number | null,
  resolvedEligibleServiceIds?: number[]
): { discountAmount: number; finalPrice: number } => {
  const normalizedBasePrice = Math.max(0, Math.round(Number(basePrice || 0)));

  if (promotion.type !== 'FIXED_FINAL_PRICE') {
    return { discountAmount: 0, finalPrice: normalizedBasePrice };
  }

  const finalPrice = Math.round(Number(promotion.value || 0));
  const eligibleServiceIds = resolvedEligibleServiceIds || parseEligibleServiceIds(promotion.eligibleServiceIds);
  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0) {
    throw new BookingPromotionError('Giá đồng nhất của chiến dịch không hợp lệ.');
  }
  if (!serviceId || !eligibleServiceIds.includes(Number(serviceId))) {
    throw new BookingPromotionError('Dịch vụ đã chọn không thuộc ưu đãi giá đồng nhất của chiến dịch.');
  }
  if (finalPrice > normalizedBasePrice) {
    throw new BookingPromotionError('Giá đồng nhất cao hơn giá niêm yết hiện tại của dịch vụ.');
  }

  return {
    discountAmount: normalizedBasePrice - finalPrice,
    finalPrice,
  };
};

const formatCampaignPromotionLabel = (promotion: CampaignPromotionWithCampaign): string => {
  if (promotion.type === 'PERCENT_DISCOUNT') return `Giảm ${promotion.value}%`;
  if (promotion.type === 'FIXED_DISCOUNT') return `Giảm ${Math.round(promotion.value).toLocaleString('vi-VN')}đ`;
  if (promotion.type === 'FIXED_FINAL_PRICE') return `Đồng giá ${Math.round(promotion.value).toLocaleString('vi-VN')}đ`;
  if (promotion.type === 'FREE_SERVICE') return promotion.description?.trim() || `Tặng dịch vụ ${promotion.name}`;
  if (promotion.type === 'FREE_PRODUCT') return promotion.description?.trim() || `Tặng sản phẩm ${promotion.name}`;
  return promotion.name;
};

const formatCampaignPromotionTag = (promotion: CampaignPromotionWithCampaign): string => {
  let discountTag = '[Ưu Đãi]';
  if (promotion.type === 'PERCENT_DISCOUNT') {
    discountTag = `[${promotion.value}%]`;
  } else if (promotion.type === 'FIXED_DISCOUNT') {
    discountTag = `[Giảm ${Math.round(promotion.value).toLocaleString('vi-VN')}đ]`;
  } else if (promotion.type === 'FIXED_FINAL_PRICE') {
    discountTag = `[Đồng giá ${Math.round(promotion.value).toLocaleString('vi-VN')}đ]`;
  } else if (promotion.type === 'FREE_SERVICE') {
    discountTag = '[Tặng Dịch Vụ]';
  } else if (promotion.type === 'FREE_PRODUCT') {
    discountTag = '[Tặng Sản Phẩm]';
  }

  const campaignName = promotion.campaign.name || '';
  const promotionName = promotion.name || '';
  const fullName =
    promotionName && !campaignName.toLowerCase().includes(promotionName.toLowerCase())
      ? campaignName
        ? `${campaignName}: ${promotionName}`
        : promotionName
      : campaignName;

  return `${discountTag} ${fullName}`.trim();
};

const toCampaignOption = (
  promotion: CampaignPromotionWithCampaign,
  resolvedEligibleServiceIds = parseEligibleServiceIds(promotion.eligibleServiceIds),
  eligibleServiceCategoryLabels: string[] = []
): BookingPromotionOption => ({
  id: promotion.id,
  source: 'CUSTOM_CAMPAIGN',
  name: promotion.name,
  label: formatCampaignPromotionLabel(promotion),
  code: promotion.code,
  campaignId: promotion.campaignId,
  campaignName: promotion.campaign.name,
  promotionType: promotion.type,
  value: Number(promotion.value),
  eligibleServiceIds: resolvedEligibleServiceIds,
  eligibleServiceCategoryKeys: parseEligibleServiceCategoryKeys(promotion.eligibleServiceCategoryKeys),
  eligibleServiceCategoryLabels,
});

/**
 * Single source of truth for promotions selected while creating or updating a booking.
 * It keeps custom campaign promotions scoped to the campaign that owns the booking.
 */
export class BookingPromotionService {
  private static async toCampaignOptions(
    fastify: FastifyInstance,
    promotions: CampaignPromotionWithCampaign[]
  ): Promise<BookingPromotionOption[]> {
    const hasFixedFinalPricePromotion = promotions.some((promotion) => promotion.type === 'FIXED_FINAL_PRICE');
    const catalogOptions = hasFixedFinalPricePromotion
      ? await CustomerServiceFilterCatalogService.getOptions(fastify)
      : null;

    return promotions.map((promotion) => {
      const categoryKeys = parseEligibleServiceCategoryKeys(promotion.eligibleServiceCategoryKeys);
      const eligibleServiceIds =
        promotion.type === 'FIXED_FINAL_PRICE' && catalogOptions
          ? resolveFixedFinalPriceScope(
              catalogOptions,
              parseEligibleServiceIds(promotion.eligibleServiceIds),
              categoryKeys
            ).serviceIds
          : parseEligibleServiceIds(promotion.eligibleServiceIds);
      const eligibleServiceCategoryLabels = catalogOptions
        ? categoryKeys
            .map((key) => catalogOptions.categories.find((category) => category.key === key)?.label)
            .filter((label): label is string => Boolean(label))
        : [];
      return toCampaignOption(promotion, eligibleServiceIds, eligibleServiceCategoryLabels);
    });
  }

  /**
   * Standard legacy promotions remain selectable in the generic booking picker.
   * Synced custom-campaign promotions are intentionally excluded: their price
   * and scope must be resolved through the CRM campaign source of truth.
   */
  static async getStandardOptions(fastify: FastifyInstance): Promise<BookingPromotionOption[]> {
    const [standardPromotions, customPromotionRows] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<
        Array<{
          id: number;
          name: string | null;
          promotionKey: string | null;
          discountPercentage: number | null;
          discountAmount: number | null;
        }>
      >(
        `SELECT p.id, pl.promotion_name as name, p.promotion_key as promotionKey,
                p.discount_percentage as discountPercentage, p.discount_amount as discountAmount
         FROM promotion p
         LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
         WHERE p.is_disabled = 0
           AND (p.promotion_key IS NULL OR p.promotion_key NOT LIKE 'CAMP_%')
         ORDER BY p.id DESC`
      ),
      fastify.prisma.crm.crmCampaignPromotion.findMany({
        where: { legacyPromotionId: { not: null } },
        select: { legacyPromotionId: true },
      }),
    ]);

    const customLegacyPromotionIds = new Set(
      customPromotionRows.map((promotion) => promotion.legacyPromotionId).filter((id): id is number => id !== null)
    );

    return standardPromotions
      .filter((promotion) => !customLegacyPromotionIds.has(Number(promotion.id)))
      .map((promotion) => {
        const discountPercentage = Math.max(0, Number(promotion.discountPercentage || 0));
        const discountAmount = Math.max(0, Math.round(Number(promotion.discountAmount || 0)));
        const name = promotion.name || promotion.promotionKey || `Khuyến mãi #${promotion.id}`;
        const label =
          discountPercentage > 0
            ? `Giảm ${discountPercentage}%`
            : discountAmount > 0
              ? `Giảm ${discountAmount.toLocaleString('vi-VN')}đ`
              : name;

        return {
          id: Number(promotion.id),
          source: 'STANDARD' as const,
          name,
          label,
          code: promotion.promotionKey,
          promotionType: null,
          value: discountPercentage || discountAmount,
          discountPercentage,
          discountAmount,
        };
      });
  }

  private static async getCustomPromotionByLegacyId(
    fastify: FastifyInstance,
    legacyPromotionId: number | null | undefined
  ): Promise<CampaignPromotionWithCampaign | null> {
    if (!legacyPromotionId) return null;

    return fastify.prisma.crm.crmCampaignPromotion.findFirst({
      where: {
        legacyPromotionId: Number(legacyPromotionId),
        campaign: { deletedAt: null },
      },
      select: campaignPromotionSelect,
    }) as Promise<CampaignPromotionWithCampaign | null>;
  }

  static async getCustomCampaignContext(
    fastify: FastifyInstance,
    legacyPromotionId: number | null | undefined
  ): Promise<{ campaignId: number; campaignPromotionId: number; tag: string } | null> {
    const promotion = await this.getCustomPromotionByLegacyId(fastify, legacyPromotionId);
    if (!promotion) return null;

    return {
      campaignId: promotion.campaignId,
      campaignPromotionId: promotion.id,
      tag: formatCampaignPromotionTag(promotion),
    };
  }

  static async getAvailableOptions(
    fastify: FastifyInstance,
    input: { customerId: number; currentPromotionId?: number | null; bookingDate?: string | null }
  ): Promise<BookingPromotionOptionsResponse> {
    const currentCustomPromotion = await this.getCustomPromotionByLegacyId(fastify, input.currentPromotionId);

    if (currentCustomPromotion) {
      const membership = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
        where: {
          legacyUserId: input.customerId,
          campaignId: currentCustomPromotion.campaignId,
          removedAt: null,
        },
        select: { id: true },
      });
      const isCampaignAvailable =
        Boolean(membership) && isCampaignPromotionAvailableOnDate(currentCustomPromotion.campaign, input.bookingDate);
      const campaignPromotions = (await fastify.prisma.crm.crmCampaignPromotion.findMany({
        where: {
          campaignId: currentCustomPromotion.campaignId,
          isActive: true,
        },
        select: campaignPromotionSelect,
        orderBy: { id: 'desc' },
      })) as CampaignPromotionWithCampaign[];

      const promotions = isCampaignAvailable ? await this.toCampaignOptions(fastify, campaignPromotions) : [];
      return {
        mode: 'CUSTOM_CAMPAIGN',
        campaign: {
          id: currentCustomPromotion.campaign.id,
          name: currentCustomPromotion.campaign.name,
          slug: currentCustomPromotion.campaign.slug,
        },
        selectedCampaignPromotionId:
          isCampaignAvailable && currentCustomPromotion.isActive ? currentCustomPromotion.id : null,
        selectedPromotionId: null,
        promotions,
      };
    }

    const standardPromotions = await this.getStandardOptions(fastify);

    return {
      mode: 'STANDARD',
      campaign: null,
      selectedCampaignPromotionId: null,
      selectedPromotionId: input.currentPromotionId ? Number(input.currentPromotionId) : null,
      promotions: standardPromotions,
    };
  }

  static async resolve(
    fastify: FastifyInstance,
    input: ResolveBookingPromotionInput
  ): Promise<BookingPromotionResolution> {
    const standardPromotionId = input.promotionId ? Number(input.promotionId) : null;
    const customCampaignPromotionId = input.campaignPromotionId ? Number(input.campaignPromotionId) : null;
    const basePrice = Math.max(0, Math.round(Number(input.basePrice || 0)));

    if (standardPromotionId && customCampaignPromotionId) {
      throw new BookingPromotionError('Chỉ được chọn một chương trình khuyến mãi cho mỗi lịch hẹn.');
    }

    if (!standardPromotionId && !customCampaignPromotionId) {
      return {
        source: 'NONE',
        legacyPromotionId: null,
        legacyCampaignId: null,
        discountAmount: 0,
        finalPrice: basePrice,
        campaignPromotionTag: null,
        campaignPromotionId: null,
      };
    }

    if (standardPromotionId) {
      if (input.allowedCampaignId) {
        throw new BookingPromotionError('Lịch thuộc custom campaign chỉ được dùng ưu đãi của campaign đó.');
      }

      const matchingCustomPromotion = await this.getCustomPromotionByLegacyId(fastify, standardPromotionId);
      if (matchingCustomPromotion) {
        throw new BookingPromotionError('Ưu đãi của custom campaign phải được chọn trong danh sách campaign.');
      }

      const promotionRows = await fastify.prisma.legacy.$queryRawUnsafe<
        Array<{
          id: number;
          campaignId: number | null;
          discountPercentage: number | null;
          discountAmount: number | null;
        }>
      >(
        `SELECT id, campaign_id as campaignId, discount_percentage as discountPercentage, discount_amount as discountAmount
         FROM promotion WHERE id = ? AND is_disabled = 0 LIMIT 1`,
        standardPromotionId
      );
      const promotion = promotionRows[0];
      if (!promotion) throw new BookingPromotionError('Chương trình khuyến mãi không tồn tại hoặc đã ngừng áp dụng.');

      const percentage = Math.max(0, Number(promotion.discountPercentage || 0));
      const fixedAmount = Math.max(0, Math.round(Number(promotion.discountAmount || 0)));
      const discountAmount = percentage > 0 ? Math.round((basePrice * percentage) / 100) : fixedAmount;

      return {
        source: 'STANDARD',
        legacyPromotionId: Number(promotion.id),
        legacyCampaignId: promotion.campaignId ? Number(promotion.campaignId) : null,
        discountAmount,
        finalPrice: Math.max(0, basePrice - discountAmount),
        campaignPromotionTag: null,
        campaignPromotionId: null,
      };
    }

    const campaignPromotion = (await fastify.prisma.crm.crmCampaignPromotion.findUnique({
      where: { id: customCampaignPromotionId! },
      select: campaignPromotionSelect,
    })) as CampaignPromotionWithCampaign | null;

    if (!campaignPromotion || !campaignPromotion.isActive || campaignPromotion.campaign.deletedAt) {
      throw new BookingPromotionError('Ưu đãi campaign không tồn tại hoặc đã ngừng áp dụng.');
    }

    if (!isCampaignPromotionAvailableOnDate(campaignPromotion.campaign, input.bookingDate)) {
      throw new BookingPromotionError('Ưu đãi chiến dịch chưa trong thời gian áp dụng hoặc đã tạm dừng.');
    }

    if (input.allowedCampaignId && campaignPromotion.campaignId !== input.allowedCampaignId) {
      throw new BookingPromotionError('Chỉ được chọn ưu đãi thuộc đúng custom campaign của lịch hẹn này.');
    }

    if (!input.allowedCampaignId) {
      const membership = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
        where: {
          legacyUserId: input.customerId,
          campaignId: campaignPromotion.campaignId,
          removedAt: null,
        },
        select: { id: true },
      });
      if (!membership) {
        throw new BookingPromotionError('Khách hàng không thuộc custom campaign của ưu đãi đã chọn.');
      }
    }

    const legacyPromotionId = await CampaignPromotionSyncService.syncPromotionToLegacy(fastify, campaignPromotion.id);
    if (!legacyPromotionId) {
      throw new BookingPromotionError('Không thể đồng bộ ưu đãi campaign sang dữ liệu đặt lịch.');
    }

    let discountAmount = 0;
    let finalPrice = basePrice;
    if (campaignPromotion.type === 'PERCENT_DISCOUNT') {
      discountAmount = Math.round((basePrice * Number(campaignPromotion.value || 0)) / 100);
    } else if (campaignPromotion.type === 'FIXED_DISCOUNT') {
      discountAmount = Math.max(0, Math.round(Number(campaignPromotion.value || 0)));
    } else if (campaignPromotion.type === 'FIXED_FINAL_PRICE') {
      const catalogOptions = await CustomerServiceFilterCatalogService.getOptions(fastify);
      const scope = resolveFixedFinalPriceScope(
        catalogOptions,
        parseEligibleServiceIds(campaignPromotion.eligibleServiceIds),
        parseEligibleServiceCategoryKeys(campaignPromotion.eligibleServiceCategoryKeys)
      );
      const fixedPrice = calculateCampaignPromotionPrice(
        campaignPromotion,
        basePrice,
        input.serviceId,
        scope.serviceIds
      );
      discountAmount = fixedPrice.discountAmount;
      finalPrice = fixedPrice.finalPrice;
    }

    return {
      source: 'CUSTOM_CAMPAIGN',
      legacyPromotionId: Number(legacyPromotionId),
      // A CRM custom campaign does not share the legacy campaign foreign key.
      legacyCampaignId: null,
      discountAmount,
      finalPrice: campaignPromotion.type === 'FIXED_FINAL_PRICE' ? finalPrice : Math.max(0, basePrice - discountAmount),
      campaignPromotionTag: formatCampaignPromotionTag(campaignPromotion),
      campaignPromotionId: campaignPromotion.id,
    };
  }
}
