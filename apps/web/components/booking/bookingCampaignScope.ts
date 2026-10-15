import type { CustomerCampaignPromotionInfo, CustomerCampaignPromotionItem } from '@mos-lab/shared';

/**
 * Checks whether a booking is initiated within an explicit campaign context.
 * Bookings created outside campaigns (such as NYC Main, Customer List, Appointments)
 * must NEVER display or auto-apply campaign promotions.
 */
export function isBookingWithinCampaignScope(
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[] | null
): boolean {
  return Boolean(initialCampaignPromotions && initialCampaignPromotions.length > 0);
}

/**
 * Resolves the campaign promotions eligible for the current booking wizard session.
 * - Out-of-campaign bookings: always returns an empty list.
 * - In-campaign bookings: strictly scopes promotions to the campaign ID that initiated the booking.
 */
export function resolveEligibleCampaignPromotions(
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[] | null,
  liveCustomerPromotions?: CustomerCampaignPromotionInfo[] | null
): CustomerCampaignPromotionInfo[] {
  if (!isBookingWithinCampaignScope(initialCampaignPromotions)) {
    return [];
  }

  const allowedCampaignId = initialCampaignPromotions![0]?.campaignId;
  if (!allowedCampaignId) return [];

  if (liveCustomerPromotions && liveCustomerPromotions.length > 0) {
    const scoped = liveCustomerPromotions.filter((camp) => camp.campaignId === allowedCampaignId);
    if (scoped.length > 0) return scoped;
  }

  return initialCampaignPromotions!;
}

/**
 * Resolves the default selected promotion.
 * - Out-of-campaign bookings: MUST NEVER auto-select any campaign promotion (returns null).
 * - In-campaign bookings: auto-selects the first non-fixed-price promotion of that campaign.
 */
export function resolveDefaultCampaignPromotion(
  hasCampaignScope: boolean,
  campaignPromotions: CustomerCampaignPromotionInfo[]
): CustomerCampaignPromotionItem | null {
  if (!hasCampaignScope || !campaignPromotions || campaignPromotions.length === 0) {
    return null;
  }

  const defaultPromotion = campaignPromotions
    .flatMap((campaign) => campaign.promotions || [])
    .find((promotion) => promotion.type !== 'FIXED_FINAL_PRICE');

  return defaultPromotion || null;
}
