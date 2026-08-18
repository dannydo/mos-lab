import { FastifyInstance } from 'fastify';
import type { BookingPromotionOption, BookingPromotionOptionsResponse, CampaignPromotionType } from '@mos-lab/shared';
import { CampaignPromotionSyncService } from '../../campaigns/campaign-promotion-sync.service.js';

export class BookingPromotionError extends Error {}

type CampaignPromotionWithCampaign = {
  id: number;
  campaignId: number;
  name: string;
  code: string | null;
  type: CampaignPromotionType;
  value: number;
  description: string | null;
  isActive: boolean;
  legacyPromotionId: number | null;
  campaign: {
    id: number;
    name: string;
    slug: string;
    status: string;
    deletedAt: Date | null;
  };
};

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
  basePrice: number;
  promotionId?: number | null;
  campaignPromotionId?: number | null;
  /** A custom-campaign booking may only switch within this campaign. */
  allowedCampaignId?: number | null;
}

const formatCampaignPromotionLabel = (promotion: CampaignPromotionWithCampaign): string => {
  if (promotion.type === 'PERCENT_DISCOUNT') return `Giảm ${promotion.value}%`;
  if (promotion.type === 'FIXED_DISCOUNT') return `Giảm ${Math.round(promotion.value).toLocaleString('vi-VN')}đ`;
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

const toCampaignOption = (promotion: CampaignPromotionWithCampaign): BookingPromotionOption => ({
  id: promotion.id,
  source: 'CUSTOM_CAMPAIGN',
  name: promotion.name,
  label: formatCampaignPromotionLabel(promotion),
  code: promotion.code,
  campaignId: promotion.campaignId,
  campaignName: promotion.campaign.name,
  promotionType: promotion.type,
  value: Number(promotion.value),
});

/**
 * Single source of truth for promotions selected while creating or updating a booking.
 * It keeps custom campaign promotions scoped to the campaign that owns the booking.
 */
export class BookingPromotionService {
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
      include: { campaign: true },
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
    input: { customerId: number; currentPromotionId?: number | null }
  ): Promise<BookingPromotionOptionsResponse> {
    const currentCustomPromotion = await this.getCustomPromotionByLegacyId(fastify, input.currentPromotionId);

    if (currentCustomPromotion) {
      const campaignPromotions = (await fastify.prisma.crm.crmCampaignPromotion.findMany({
        where: {
          campaignId: currentCustomPromotion.campaignId,
          isActive: true,
        },
        include: { campaign: true },
        orderBy: { id: 'desc' },
      })) as CampaignPromotionWithCampaign[];

      return {
        mode: 'CUSTOM_CAMPAIGN',
        campaign: {
          id: currentCustomPromotion.campaign.id,
          name: currentCustomPromotion.campaign.name,
          slug: currentCustomPromotion.campaign.slug,
        },
        selectedCampaignPromotionId: currentCustomPromotion.id,
        selectedPromotionId: null,
        promotions: campaignPromotions.map(toCampaignOption),
      };
    }

    const standardPromotions = await fastify.prisma.legacy.$queryRawUnsafe<
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
       ORDER BY p.id DESC`
    );

    const customLegacyPromotionIds = new Set(
      (
        await fastify.prisma.crm.crmCampaignPromotion.findMany({
          where: { legacyPromotionId: { not: null } },
          select: { legacyPromotionId: true },
        })
      )
        .map((promotion) => promotion.legacyPromotionId)
        .filter((id): id is number => id !== null)
    );

    return {
      mode: 'STANDARD',
      campaign: null,
      selectedCampaignPromotionId: null,
      selectedPromotionId: input.currentPromotionId ? Number(input.currentPromotionId) : null,
      promotions: standardPromotions
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
            promotionType: null,
            value: discountPercentage || discountAmount,
          };
        }),
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
      include: { campaign: true },
    })) as CampaignPromotionWithCampaign | null;

    if (!campaignPromotion || !campaignPromotion.isActive || campaignPromotion.campaign.deletedAt) {
      throw new BookingPromotionError('Ưu đãi campaign không tồn tại hoặc đã ngừng áp dụng.');
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
    if (campaignPromotion.type === 'PERCENT_DISCOUNT') {
      discountAmount = Math.round((basePrice * Number(campaignPromotion.value || 0)) / 100);
    } else if (campaignPromotion.type === 'FIXED_DISCOUNT') {
      discountAmount = Math.max(0, Math.round(Number(campaignPromotion.value || 0)));
    }

    return {
      source: 'CUSTOM_CAMPAIGN',
      legacyPromotionId: Number(legacyPromotionId),
      // A CRM custom campaign does not share the legacy campaign foreign key.
      legacyCampaignId: null,
      discountAmount,
      finalPrice: Math.max(0, basePrice - discountAmount),
      campaignPromotionTag: formatCampaignPromotionTag(campaignPromotion),
      campaignPromotionId: campaignPromotion.id,
    };
  }
}
