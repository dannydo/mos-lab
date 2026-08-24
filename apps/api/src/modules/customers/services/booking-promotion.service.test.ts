import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BookingPromotionError,
  BookingPromotionService,
  calculateCampaignPromotionPrice,
  isCampaignPromotionAvailableOnDate,
} from './booking-promotion.service.js';

test('calculates a fixed final price only for services in the configured scope', () => {
  const result = calculateCampaignPromotionPrice(
    {
      type: 'FIXED_FINAL_PRICE',
      value: 299_000,
      eligibleServiceIds: '[12, 15]',
    },
    450_000,
    12
  );

  assert.deepEqual(result, { discountAmount: 151_000, finalPrice: 299_000 });
});

test('rejects a fixed final price for an out-of-scope service or a price above list price', () => {
  const promotion = {
    type: 'FIXED_FINAL_PRICE' as const,
    value: 299_000,
    eligibleServiceIds: '[12]',
  };

  assert.throws(() => calculateCampaignPromotionPrice(promotion, 450_000, 15), BookingPromotionError);
  assert.throws(() => calculateCampaignPromotionPrice(promotion, 250_000, 12), BookingPromotionError);
});

test('keeps synced custom-campaign promotions out of the standard promotion picker', async () => {
  const options = await BookingPromotionService.getStandardOptions({
    prisma: {
      legacy: {
        $queryRawUnsafe: async () => [
          {
            id: 100,
            name: 'Giảm cuối tuần',
            promotionKey: 'WEEKEND',
            discountPercentage: 10,
            discountAmount: 0,
          },
          {
            id: 101,
            name: 'Đồng Giá 399',
            promotionKey: 'CAMP_12_P34',
            discountPercentage: 0,
            discountAmount: 0,
          },
        ],
      },
      crm: {
        crmCampaignPromotion: {
          findMany: async () => [{ legacyPromotionId: 101 }],
        },
      },
    },
  } as never);

  assert.deepEqual(options, [
    {
      id: 100,
      source: 'STANDARD',
      name: 'Giảm cuối tuần',
      label: 'Giảm 10%',
      code: 'WEEKEND',
      promotionType: null,
      value: 10,
      discountPercentage: 10,
      discountAmount: 0,
    },
  ]);
});

test('enforces active campaign status and inclusive campaign calendar dates', () => {
  const campaign = {
    deletedAt: null,
    status: 'ACTIVE',
    startDate: new Date('2026-08-20T00:00:00.000Z'),
    endDate: new Date('2026-08-24T00:00:00.000Z'),
  };

  assert.equal(isCampaignPromotionAvailableOnDate(campaign, '2026-08-20'), true);
  assert.equal(isCampaignPromotionAvailableOnDate(campaign, '2026-08-24'), true);
  assert.equal(isCampaignPromotionAvailableOnDate(campaign, '2026-08-25'), false);
  assert.equal(isCampaignPromotionAvailableOnDate({ ...campaign, status: 'PAUSED' }, '2026-08-22'), false);
});

test('rejects stacking and customer access before a campaign promotion can be applied', async () => {
  await assert.rejects(
    BookingPromotionService.resolve({} as never, {
      customerId: 99,
      serviceId: 12,
      basePrice: 450_000,
      promotionId: 10,
      campaignPromotionId: 20,
    }),
    BookingPromotionError
  );

  const fastifyWithoutMembership = {
    prisma: {
      crm: {
        crmCampaignPromotion: {
          findUnique: async () => ({
            id: 20,
            campaignId: 8,
            name: 'NYC Đồng giá',
            code: null,
            type: 'FIXED_FINAL_PRICE',
            value: 299_000,
            eligibleServiceIds: '[12]',
            eligibleServiceCategoryKeys: null,
            description: null,
            isActive: true,
            legacyPromotionId: null,
            campaign: {
              id: 8,
              name: 'NYC tháng 8',
              slug: 'nyc-thang-8',
              deletedAt: null,
              status: 'ACTIVE',
              startDate: new Date('2026-08-20T00:00:00.000Z'),
              endDate: new Date('2026-08-31T00:00:00.000Z'),
            },
          }),
        },
        crmCampaignCustomer: { findFirst: async () => null },
      },
    },
  };

  await assert.rejects(
    BookingPromotionService.resolve(fastifyWithoutMembership as never, {
      customerId: 99,
      serviceId: 12,
      basePrice: 450_000,
      bookingDate: '2026-08-24',
      campaignPromotionId: 20,
    }),
    BookingPromotionError
  );
});
