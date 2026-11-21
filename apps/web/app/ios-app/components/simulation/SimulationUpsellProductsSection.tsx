'use client';

import React from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import {
  isYeppeumSerumProduct,
  YEPPEUM_PRODUCT_ID,
  type IosProductCatalogItem,
  type IosSimulationUpsellProductItem,
} from '@mos-lab/shared';
import { SERUM_TIERS_CVL } from '../../state/mockData';
import { formatCartProductDisplayName } from '../screens/upsell/upsellCheckoutHelpers';

export const FALLBACK_IOS_SIMULATION_PRODUCTS: IosProductCatalogItem[] = [
  {
    productId: YEPPEUM_PRODUCT_ID,
    productSku: 'YEPPEUM-01',
    productName: 'Dưỡng Mi Yeppeum Korea',
    price: 1100000,
    isSerum: true,
  },
];

export function resolveItemUnitPrice(item: IosSimulationUpsellProductItem): number {
  const qty = Math.max(1, Number(item.quantity || 1));
  if (Number.isFinite(item.unitPrice)) {
    return Math.max(0, Number(item.unitPrice));
  }
  return Math.max(0, Math.round(Number(item.totalPrice || 0) / qty));
}

export function resolveSerumTierForItem(item?: IosSimulationUpsellProductItem) {
  if (!item) return SERUM_TIERS_CVL[0];
  const unitPrice = resolveItemUnitPrice(item);
  const byPrice = SERUM_TIERS_CVL.find((tier) => Number(tier.price) === unitPrice);
  const byLabel = SERUM_TIERS_CVL.find((tier) => (item.productName || '').includes(tier.label));
  return byPrice || byLabel || SERUM_TIERS_CVL[0];
}

export function formatYeppeumProductName(baseName: string, tier: (typeof SERUM_TIERS_CVL)[number]): string {
  const cleanBase = formatCartProductDisplayName(baseName) || 'Dưỡng Mi Yeppeum Korea';
  return tier.id === 'serum-orig' ? cleanBase : `${cleanBase} (${tier.label})`;
}

export function matchesCatalogProduct(
  item: IosSimulationUpsellProductItem,
  prod: IosProductCatalogItem
): boolean {
  if (prod.isSerum || isYeppeumSerumProduct(prod)) {
    return isYeppeumSerumProduct(item);
  }
  return (
    (prod.productId > 0 && Number(item.productId) === Number(prod.productId)) ||
    formatCartProductDisplayName(item.productName).toLowerCase() ===
      formatCartProductDisplayName(prod.productName).toLowerCase()
  );
}

interface SimulationUpsellProductsSectionProps {
  isDark: boolean;
  displayCatalogProducts: IosProductCatalogItem[];
  upsellProducts: IosSimulationUpsellProductItem[];
  upsellTotal: number;
  onToggleProduct: (prod: IosProductCatalogItem) => void;
  onQuantityChange: (prod: IosProductCatalogItem, delta: number) => void;
  onSelectSerumTier: (prod: IosProductCatalogItem, tier: (typeof SERUM_TIERS_CVL)[number]) => void;
}

export function SimulationUpsellProductsSection({
  isDark,
  displayCatalogProducts,
  upsellProducts,
  upsellTotal,
  onToggleProduct,
  onQuantityChange,
  onSelectSerumTier,
}: SimulationUpsellProductsSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="font-bold text-[11.5px]">Sản phẩm Upsell kèm theo</label>
        {upsellProducts.length > 0 && (
          <span className="text-[11px] font-bold text-sky-400 tabular-nums">
            {upsellTotal > 0 ? `+${upsellTotal.toLocaleString('vi-VN')}đ` : 'Tặng kèm (0đ)'}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {displayCatalogProducts.map((prod) => {
          const isSerum = Boolean(prod.isSerum || isYeppeumSerumProduct(prod));
          const selected = upsellProducts.find((item) => matchesCatalogProduct(item, prod));
          const activeTier = isSerum && selected ? resolveSerumTierForItem(selected) : null;
          const displayUnitPrice = selected ? resolveItemUnitPrice(selected) : prod.price;
          const displayName = formatCartProductDisplayName(prod.productName) || prod.productName;

          return (
            <div
              key={`${prod.productId}-${displayName}`}
              className={`p-2.5 rounded-xl border space-y-2 ${
                selected
                  ? isDark
                    ? 'bg-sky-950/20 border-sky-500/40 text-sky-300'
                    : 'bg-sky-50 border-sky-300 text-sky-800'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleProduct(prod)}
                  className="flex-1 text-left min-w-0 cursor-pointer flex items-center gap-1.5"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                      selected
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : isDark
                          ? 'border-neutral-700 bg-neutral-800'
                          : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="truncate text-[11.5px] font-semibold">{displayName}</div>
                  <div className="text-[10px] opacity-75 tabular-nums shrink-0">
                    {displayUnitPrice > 0 ? `(${displayUnitPrice.toLocaleString('vi-VN')}đ)` : '(Tặng kèm 0đ)'}
                  </div>
                </button>

                {selected && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Giảm số lượng ${displayName}`}
                      onClick={() => onQuantityChange(prod, -1)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer ${
                        isDark
                          ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                          : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold tabular-nums text-[11px] min-w-[14px] text-center">
                      {selected.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tăng số lượng ${displayName}`}
                      onClick={() => onQuantityChange(prod, 1)}
                      className="w-5 h-5 rounded-md flex items-center justify-center bg-sky-500 text-white cursor-pointer hover:bg-sky-400"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {isSerum && selected && (
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  {SERUM_TIERS_CVL.map((tier) => {
                    const tierActive = activeTier?.id === tier.id;
                    const shortPrice =
                      tier.price > 0 ? `${Math.round(tier.price / 1000).toLocaleString('vi-VN')}K` : '0đ';
                    const shortTitle =
                      tier.id === 'serum-orig'
                        ? 'Giá gốc'
                        : tier.id === 'serum-disc-light'
                          ? 'Ưu đãi < 50%'
                          : tier.id === 'serum-disc-deep'
                            ? 'Giảm ≥ 50%'
                            : 'Tặng kèm';
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => onSelectSerumTier(prod, tier)}
                        className={`px-2 py-1.5 rounded-lg border text-left text-[10px] transition-all cursor-pointer flex items-center justify-between gap-1 tabular-nums ${
                          tierActive
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                            : isDark
                              ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <span className="truncate">
                          {shortTitle} · {shortPrice}
                        </span>
                        <span className="text-emerald-400 font-bold shrink-0">
                          +{Math.round(tier.cvBonus / 1000)}K
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
