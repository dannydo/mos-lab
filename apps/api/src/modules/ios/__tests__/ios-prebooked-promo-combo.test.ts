import test from 'node:test';
import assert from 'node:assert/strict';
import { IosPromotionOption } from '@mos-lab/shared';
import { computeBookingFinancials, resolveCanonicalBookedServicePrice } from '../services/ios-bookings-formatters.js';
import {
  resolveItemizedBookingPromotions,
  resolveLegacyPromotionDiscountsAndCredits,
} from '../services/ios-promotions.service.js';
import { buildLegacyOrderPayloads, LegacyOrderCatalogSnapshot } from '../services/ios-legacy-payload.mapper.js';

const CAMP_50_PROMO: IosPromotionOption = {
  promotionId: 991,
  promotionKey: 'CAMP_SALE_50',
  promotionType: 'campaign',
  promotionApply: 'all',
  serviceGroup: null,
  name: 'Chiến dịch Giảm 50% Toàn Hóa Đơn',
  shortName: 'Mã 50%',
  discountPercentage: 50,
  discountAmount: 0,
  exactlyAmount: 0,
  isOldUserDisabled: false,
  isApprovalRequired: false,
  isPublic: false,
  isSystem: true,
  isCreditAllowed: true,
  dateExpired: null,
  position: 1,
};

const FIXED_PRICE_CAMP_PROMO: IosPromotionOption = {
  promotionId: 992,
  promotionKey: 'CAMP_FIXED_385K',
  promotionType: 'campaign',
  promotionApply: 'all',
  serviceGroup: null,
  name: 'Chiến dịch Đồng Giá 385K',
  shortName: '385K',
  discountPercentage: 0,
  discountAmount: 0,
  exactlyAmount: 0,
  isOldUserDisabled: false,
  isApprovalRequired: false,
  isPublic: false,
  isSystem: true,
  isCreditAllowed: true,
  dateExpired: null,
  position: 2,
};

function createCatalogSnapshot(): LegacyOrderCatalogSnapshot {
  return {
    orderExists: true,
    orderId: 551001,
    customerUserId: 771001,
    clientStoreId: 6,
    currentOrderState: 'Check-out',
    promotionId: CAMP_50_PROMO.promotionId,
    userUrlId: 0,
    existingOrderServiceIds: [901001],
    upperService: {
      serviceId: 115,
      serviceGroup: 'LashesTop',
      singlePriceId: 1150,
      singlePriceAmount: 770000,
      balancePriceId: 1159,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    upperCombo: {
      serviceId: 115,
      servicePriceId: 9115,
      comboPriceAmount: 2940000,
    },
    products: [
      {
        productId: 201,
        inventoryWarehouseItemId: 8801,
        firstInventoryWarehouseOrderItemId: 9901,
        unitPrice: 350000,
        quantity: 1,
        discountAmount: 0,
      },
    ],
    staffFiveStarSurveyAnswers: {},
    customerHappySurveyAnswers: {},
  };
}

test('resolveCanonicalBookedServicePrice normalizes gross os_service_price over 50%-discounted order.total_price', () => {
  // Khi book gắn mã 50%: order.total_price = 385,000, os_service_price = 770,000
  const gross = resolveCanonicalBookedServicePrice({
    os_service_price: 770000,
    os_discount_amount: 385000,
    catalog_single_price: 770000,
    total_price: 385000,
    is_temporary: 0,
    promotion_id: CAMP_50_PROMO.promotionId,
    os_promotion_id: null,
  });
  assert.equal(gross, 770000);

  // Placeholder 'Any - Lashes' (total_price = 0, os_service_price = 0) fallback về 550,000
  const placeholder = resolveCanonicalBookedServicePrice({
    os_service_price: 0,
    os_discount_amount: 0,
    catalog_single_price: 0,
    total_price: 0,
    is_temporary: 1,
    promotion_id: CAMP_50_PROMO.promotionId,
    os_promotion_id: null,
  });
  assert.equal(placeholder, 550000);

  // Override từ bước Tư vấn luôn ưu tiên cao nhất
  const fromConsult = resolveCanonicalBookedServicePrice(
    {
      os_service_price: 770000,
      os_discount_amount: 385000,
      catalog_single_price: 770000,
      total_price: 385000,
      is_temporary: 0,
      promotion_id: CAMP_50_PROMO.promotionId,
      os_promotion_id: null,
    },
    880000
  );
  assert.equal(fromConsult, 880000);
});

test('resolveItemizedBookingPromotions enriches zero-rule FIXED_FINAL_PRICE campaign promos from os_discount_amount', () => {
  const map = new Map<number, IosPromotionOption>([[FIXED_PRICE_CAMP_PROMO.promotionId, FIXED_PRICE_CAMP_PROMO]]);
  const hydrated = resolveItemizedBookingPromotions({}, FIXED_PRICE_CAMP_PROMO.promotionId, null, undefined, [], map, {
    servicePrice: 770000,
    osDiscountAmount: 385000,
  });
  assert.equal(hydrated.appliedPromotion?.promotionId, FIXED_PRICE_CAMP_PROMO.promotionId);
  assert.equal(hydrated.appliedPromotion?.exactlyAmount, 385000);
});

test('computeBookingFinancials & Legacy payload apply 50% promo once in RETAIL_OR_VOUCHER and suspend without product leak in USE_NEW_COMBO', () => {
  const yeppeumCart = [{ productId: 201, productName: 'Dưỡng Mi Yeppeum', price: 350000, quantity: 1 }];

  // Case 1: RETAIL_OR_VOUCHER (todaySingleServiceWaived: false) + Mã 50% CAMP_*
  // -> Chỉ giảm 50% một lần trên giá gốc 770,000đ (-385,000đ), Combo giữ nguyên giá niêm yết 2,940,000đ
  const retailComboRes = computeBookingFinancials({
    servicePrice: 770000,
    upgradePrice: 0,
    serviceName: 'HyperLight 4X 770',
    isComboLive: false,
    selectedCombo: {
      id: 'HyperLight_4X:4_tặng_1:770',
      name: 'Combo 4 tặng 1 · HyperLight 4X 770',
      price: 2940000,
      todaySingleServiceWaived: false,
      todayUsageMode: 'RETAIL_OR_VOUCHER',
    },
    selectedUnderCombo: null,
    comboRedemption: null,
    cartProducts: [],
    overrideBilling: undefined,
    assignedStaffId: 46272,
    activeStaffId: 46272,
    promotionId: CAMP_50_PROMO.promotionId,
    appliedPromotion: CAMP_50_PROMO,
  });
  assert.equal(retailComboRes.billing.serviceTotal, 770000);
  assert.equal(retailComboRes.billing.comboTotal, 2940000);
  assert.equal(retailComboRes.billing.serviceDiscountAmount, 385000);
  assert.equal(retailComboRes.billing.comboDiscountAmount, 0);
  assert.equal(retailComboRes.billing.promotionDiscountAmount, 385000);
  assert.equal(retailComboRes.billing.promotionId, CAMP_50_PROMO.promotionId);

  // Case 2: USE_NEW_COMBO (todaySingleServiceWaived: true) + Yeppeum 350k + CAMP_* (promotionApply: 'all')
  // -> Dịch vụ 0đ, CAMP_* (promotionApply: 'all') bị tạm ngưng để không giảm lây sang Yeppeum và không đóng dấu promotionId thừa
  const waivedComboRes = computeBookingFinancials({
    servicePrice: 770000,
    upgradePrice: 0,
    serviceName: 'HyperLight 4X 770',
    isComboLive: false,
    selectedCombo: {
      id: 'HyperLight_4X:4_tặng_1:770',
      name: 'Combo 4 tặng 1 · HyperLight 4X 770',
      price: 2940000,
      todaySingleServiceWaived: true,
      todayUsageMode: 'USE_NEW_COMBO',
    },
    selectedUnderCombo: null,
    comboRedemption: null,
    cartProducts: yeppeumCart,
    overrideBilling: { promotionDiscountAmount: 385000 },
    assignedStaffId: 46272,
    activeStaffId: 46272,
    promotionId: CAMP_50_PROMO.promotionId,
    appliedPromotion: CAMP_50_PROMO,
  });
  assert.equal(waivedComboRes.billing.serviceTotal, 0);
  assert.equal(waivedComboRes.billing.comboTotal, 2940000);
  assert.equal(waivedComboRes.billing.productTotal, 350000);
  assert.equal(waivedComboRes.billing.productDiscountAmount, 0);
  assert.equal(waivedComboRes.billing.promotionDiscountAmount, 0);
  assert.equal(waivedComboRes.billing.promotionId, null);

  const legacyCreditsCheck = resolveLegacyPromotionDiscountsAndCredits({
    effectiveServiceTotal: 0,
    upgradePrice: 0,
    upperComboPrice: 2940000,
    underComboPrice: 0,
    comboTotal: 2940000,
    productTotal: 350000,
    cartProducts: yeppeumCart,
    appliedPromotion: CAMP_50_PROMO,
    effectivePromotionId: CAMP_50_PROMO.promotionId,
    isSessionWaivedIntoNewCombo: true,
    billing: { promotionDiscountAmount: 385000 },
    rawDiamondCredits: 0,
  });
  assert.equal(legacyCreditsCheck.orderDiscountTotal, 0);
  assert.equal(legacyCreditsCheck.productDiscount, 0);

  const builtLegacy = buildLegacyOrderPayloads({
    orderId: 551001,
    assignedStaffId: 46272,
    servicePrice: 770000,
    serviceName: 'HyperLight 4X 770',
    selectedCombo: {
      id: 'HyperLight_4X:4_tặng_1:770',
      name: 'Combo 4 tặng 1 · HyperLight 4X 770',
      price: 2940000,
      todaySingleServiceWaived: true,
      todayUsageMode: 'USE_NEW_COMBO',
    },
    cartProducts: yeppeumCart,
    promotionId: CAMP_50_PROMO.promotionId,
    appliedPromotion: CAMP_50_PROMO,
    billing: { paymentMethod: 'VIETQR', grandTotal: 3553200 },
    catalog: createCatalogSnapshot(),
  });
  assert.equal(builtLegacy.promotionId, null);
  assert.equal(builtLegacy.discountAmount, 0);
  assert.equal(builtLegacy.paymentUpdatePayload.promotion_id, undefined);
});

test('computeBookingFinancials hydrates legacyTipAmount on Completed orders and awards 90% tip when isTrainingCvlOrder is true', () => {
  const res = computeBookingFinancials({
    servicePrice: 770000,
    upgradePrice: 0,
    serviceName: 'HyperLight 4X 770',
    isComboLive: false,
    selectedCombo: null,
    selectedUnderCombo: null,
    comboRedemption: null,
    cartProducts: [],
    overrideBilling: { tipAmount: 0 },
    legacyTipAmount: 100000,
    assignedStaffId: 46272,
    checkInStaffId: 37790, // Mentor checked in
    checkOutStaffId: 46272, // Mentee checked out
    activeStaffId: 46272,
    dbOrderState: 'Completed',
    isTrainingCvlOrder: true,
  });

  assert.equal(res.billing.tipAmount, 100000);
  assert.equal(res.billing.tipCvShare, 90000);
  assert.equal(res.cvRewardBreakdown.techTipPercent, 90);
  assert.equal(res.cvRewardBreakdown.cvTotalTipPercent, 90);
  assert.equal(res.cvRewardBreakdown.checkInTipPercent, 0);
  assert.equal(res.cvRewardBreakdown.checkOutTipPercent, 0);
});
