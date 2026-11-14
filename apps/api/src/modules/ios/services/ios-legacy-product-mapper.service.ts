import { IosCartProductItem } from '@mos-lab/shared';
import { LegacyCatalogProductMatch } from './ios-legacy-catalog.service.js';

export interface BuildLegacySelectedProductsParams {
  orderId: number;
  catalogProducts: LegacyCatalogProductMatch[];
  cartProducts: IosCartProductItem[];
  productDiscount: number;
  effectivePromotionId: number | null;
  hasAnyPromoObj: boolean;
  itemizedProductDiscounts: number[];
  remainingProductCreditsToAssign: number;
}

export function buildLegacySelectedProductsForPayment({
  orderId,
  catalogProducts,
  cartProducts,
  productDiscount,
  effectivePromotionId,
  hasAnyPromoObj,
  itemizedProductDiscounts,
  remainingProductCreditsToAssign,
}: BuildLegacySelectedProductsParams) {
  const eligibleProducts = catalogProducts.filter((p) => p.firstInventoryWarehouseOrderItemId > 0);
  const groupedEligibleProducts = new Map<
    number,
    {
      productId: number;
      unitPrice: number;
      quantity: number;
      discountAmount: number;
      firstInventoryWarehouseOrderItemIds: number[];
    }
  >();

  for (const prod of eligibleProducts) {
    const existingGroup = groupedEligibleProducts.get(prod.productId);
    if (existingGroup) {
      existingGroup.quantity += Math.max(1, Number(prod.quantity || 1));
      existingGroup.discountAmount += Math.max(0, Number(prod.discountAmount || 0));
      if (!existingGroup.firstInventoryWarehouseOrderItemIds.includes(prod.firstInventoryWarehouseOrderItemId)) {
        existingGroup.firstInventoryWarehouseOrderItemIds.push(prod.firstInventoryWarehouseOrderItemId);
      }
    } else {
      groupedEligibleProducts.set(prod.productId, {
        productId: prod.productId,
        unitPrice: prod.unitPrice,
        quantity: Math.max(1, Number(prod.quantity || 1)),
        discountAmount: Math.max(0, Number(prod.discountAmount || 0)),
        firstInventoryWarehouseOrderItemIds: [prod.firstInventoryWarehouseOrderItemId],
      });
    }
  }

  const groupedProductList = Array.from(groupedEligibleProducts.values());
  const eligibleProductsGross = groupedProductList.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  let remainingProductPromoDiscount = productDiscount;
  let remainingCredits = remainingProductCreditsToAssign;
  const usedCartIndices = new Set<number>();

  return groupedProductList.map((p, idx) => {
    const grossLine = p.unitPrice * p.quantity;
    const matchedCartIdx = cartProducts.findIndex(
      (cp, cIdx) => !usedCartIndices.has(cIdx) && Number(cp.productId) === Number(p.productId)
    );
    if (matchedCartIdx >= 0) usedCartIndices.add(matchedCartIdx);
    const matchedCartItem = matchedCartIdx >= 0 ? cartProducts[matchedCartIdx] : cartProducts[idx];
    const linePromoObj = matchedCartItem?.appliedPromotion ?? null;
    const linePromoId = linePromoObj?.promotionId ?? matchedCartItem?.promotionId ?? effectivePromotionId;

    let promoLineDiscount = 0;
    if (hasAnyPromoObj && matchedCartIdx >= 0) {
      promoLineDiscount = itemizedProductDiscounts[matchedCartIdx] ?? 0;
    } else if (remainingProductPromoDiscount > 0 && eligibleProductsGross > 0) {
      if (idx === groupedProductList.length - 1) {
        promoLineDiscount = Math.min(grossLine, remainingProductPromoDiscount);
      } else {
        promoLineDiscount = Math.min(grossLine, Math.round((productDiscount * grossLine) / eligibleProductsGross));
      }
      remainingProductPromoDiscount = Math.max(0, remainingProductPromoDiscount - promoLineDiscount);
    }

    const lineDiscount = Math.max(Number(p.discountAmount || 0), promoLineDiscount);
    const lineAfterDisc = Math.max(0, grossLine - lineDiscount);
    const lineTax = Math.round(lineAfterDisc * 0.08);
    const lineIsCreditRestricted = Boolean(linePromoObj && linePromoObj.isCreditAllowed === false && lineDiscount > 0);
    let lineCredits = 0;
    if (remainingCredits > 0 && !lineIsCreditRestricted && lineAfterDisc > 0) {
      const lineCapCredits = Math.floor(Math.round(lineAfterDisc * 1.08) / 1000);
      lineCredits = Math.min(remainingCredits, lineCapCredits);
      remainingCredits = Math.max(0, remainingCredits - lineCredits);
    }

    return {
      order_id: String(orderId),
      product_id: String(p.productId),
      first_inventory_warehouse_order_item_ids: p.firstInventoryWarehouseOrderItemIds.map((id) => String(id)),
      // PHP OrderProduct::saveProductPrice expects unit product_price while dividing discount/credit/tax across itemIds
      product_price: String(p.unitPrice),
      ...(linePromoId && lineDiscount > 0 ? { promotion_id: String(linePromoId) } : {}),
      discount_amount: String(lineDiscount),
      paid_credit_amount: String(lineCredits),
      tax_amount: String(lineTax),
    };
  });
}
