import type { CustomerCampaignPromotionInfo, CustomerCampaignPromotionItem } from '@mos-lab/shared';

/**
 * Checks whether the initial booking context has explicit campaign promotions provided
 * (e.g. when launched directly from a specific Campaign Detail page).
 */
export function isBookingWithinCampaignScope(
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[] | null
): boolean {
  return Boolean(initialCampaignPromotions && initialCampaignPromotions.length > 0);
}

/**
 * Resolves the campaign promotions eligible for the current customer:
 * - If the customer has active campaign memberships returned by the server (liveCustomerPromotions),
 *   they are ALWAYS eligible to receive the promotion, regardless of where the booking was initiated
 *   (NYC Main, Customer List, Appointments, or Campaign Page).
 * - If launched from a specific campaign page, promotions from that campaign are prioritized/scoped.
 * - If customer has no campaign memberships, returns empty array.
 */
export function resolveEligibleCampaignPromotions(
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[] | null,
  liveCustomerPromotions?: CustomerCampaignPromotionInfo[] | null
): CustomerCampaignPromotionInfo[] {
  if (liveCustomerPromotions && liveCustomerPromotions.length > 0) {
    if (initialCampaignPromotions && initialCampaignPromotions.length > 0) {
      const allowedCampaignId = initialCampaignPromotions[0]?.campaignId;
      const scoped = liveCustomerPromotions.filter((camp) => camp.campaignId === allowedCampaignId);
      if (scoped.length > 0) return scoped;
    }
    return liveCustomerPromotions;
  }

  return initialCampaignPromotions || [];
}

/**
 * Resolves the default selected promotion for a customer in a campaign:
 * - Any customer enrolled in a campaign will have their first eligible promotion auto-applied.
 * - Returns null when no campaign promotions are available for the customer.
 */
export function resolveDefaultCampaignPromotion(
  campaignPromotions?: CustomerCampaignPromotionInfo[] | null
): CustomerCampaignPromotionItem | null {
  if (!campaignPromotions || campaignPromotions.length === 0) {
    return null;
  }

  const defaultPromotion = campaignPromotions
    .flatMap((campaign) => campaign.promotions || [])
    .find((promotion) => promotion.type !== 'FIXED_FINAL_PRICE');

  return defaultPromotion || null;
}
