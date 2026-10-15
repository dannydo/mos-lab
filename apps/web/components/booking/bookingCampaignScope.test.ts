import { describe, expect, it } from 'vitest';
import type { CustomerCampaignPromotionInfo } from '@mos-lab/shared';
import {
  isBookingWithinCampaignScope,
  resolveDefaultCampaignPromotion,
  resolveEligibleCampaignPromotions,
} from './bookingCampaignScope';

const mockComebackPromotionContext: CustomerCampaignPromotionInfo[] = [
  {
    campaignId: 7,
    campaignName: '🔥 Come Back',
    campaignSlug: 'come-back',
    promotions: [
      {
        id: 69,
        campaignId: 7,
        name: 'Wellcome Back 30%',
        code: 'WB01-30',
        type: 'PERCENT_DISCOUNT',
        value: 30,
        eligibleServiceIds: [],
        eligibleServiceCategoryKeys: [],
        eligibleServiceCategoryLabels: [],
        description: null,
        isActive: true,
        label: 'Giảm 30%',
        legacyPromotionId: 761,
      },
    ],
  },
];

const mockOtherCampaignPromotionContext: CustomerCampaignPromotionInfo[] = [
  {
    campaignId: 19,
    campaignName: '💤 Wake Up V1',
    campaignSlug: 'wake-up-v1',
    promotions: [
      {
        id: 72,
        campaignId: 19,
        name: 'Wellcome Back 50%',
        code: 'WB02-50',
        type: 'PERCENT_DISCOUNT',
        value: 50,
        eligibleServiceIds: [],
        eligibleServiceCategoryKeys: [],
        eligibleServiceCategoryLabels: [],
        description: null,
        isActive: true,
        label: 'Giảm 50%',
        legacyPromotionId: 763,
      },
    ],
  },
];

describe('bookingCampaignScope (MOS-BUG-110)', () => {
  describe('isBookingWithinCampaignScope', () => {
    it('returns false when booking outside campaign (e.g. NYC Main, Customers, Appointments)', () => {
      expect(isBookingWithinCampaignScope(undefined)).toBe(false);
      expect(isBookingWithinCampaignScope(null)).toBe(false);
      expect(isBookingWithinCampaignScope([])).toBe(false);
    });

    it('returns true when booking inside a campaign context', () => {
      expect(isBookingWithinCampaignScope(mockComebackPromotionContext)).toBe(true);
    });
  });

  describe('resolveEligibleCampaignPromotions', () => {
    it('returns empty array when booking outside campaign, even if customer has active promotions on server', () => {
      // Customer has active Come Back promotion on server, but booking is started from NYC Main (initialCampaignPromotions is undefined)
      const resolved = resolveEligibleCampaignPromotions(undefined, mockComebackPromotionContext);
      expect(resolved).toEqual([]);
    });

    it('restricts promotions strictly to the current active campaign when booking inside campaign', () => {
      // Booking initiated from Campaign 7 (Come Back), server returns multiple memberships (Campaign 7 and Campaign 19)
      const livePromotions = [...mockComebackPromotionContext, ...mockOtherCampaignPromotionContext];
      const resolved = resolveEligibleCampaignPromotions(mockComebackPromotionContext, livePromotions);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].campaignId).toBe(7);
      expect(resolved[0].promotions[0].name).toBe('Wellcome Back 30%');
    });

    it('falls back to initialCampaignPromotions if live query returns empty', () => {
      const resolved = resolveEligibleCampaignPromotions(mockComebackPromotionContext, []);
      expect(resolved).toEqual(mockComebackPromotionContext);
    });
  });

  describe('resolveDefaultCampaignPromotion', () => {
    it('never auto-selects campaign promotion when booking outside campaign', () => {
      // Out of campaign (hasCampaignScope = false)
      const defaultPromo = resolveDefaultCampaignPromotion(false, mockComebackPromotionContext);
      expect(defaultPromo).toBeNull();
    });

    it('auto-selects first eligible percentage discount promotion when booking inside campaign', () => {
      // In campaign (hasCampaignScope = true)
      const defaultPromo = resolveDefaultCampaignPromotion(true, mockComebackPromotionContext);
      expect(defaultPromo).not.toBeNull();
      expect(defaultPromo?.id).toBe(69);
      expect(defaultPromo?.name).toBe('Wellcome Back 30%');
    });
  });
});
