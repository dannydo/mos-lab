'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateIosItemizedPromotionDiscounts,
  type IosPromotionOption,
  type IosPromotionTargetScope,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { BookingItem } from './mockData';
import type { SavePromotionTarget } from './iosBillingMath';
import type {
  ReceiptPromotionClearTarget,
  ReceiptPromotionOpenTarget,
} from '../components/screens/checkout/CheckoutReceiptSection';

export interface UseCheckoutItemizedPromotionsParams {
  booking?: BookingItem;
  actorTier?: string;
  effectiveServiceCharge: number;
  upgradePrice: number;
  upperComboPrice: number;
  underComboPrice: number;
  vatRate: number;
  onSavePromotion?: (promotion: IosPromotionOption | null, target?: SavePromotionTarget) => void;
  onForceResetDiamonds?: () => void;
}

export function useCheckoutItemizedPromotions({
  booking,
  actorTier,
  effectiveServiceCharge,
  upgradePrice,
  upperComboPrice,
  underComboPrice,
  vatRate,
  onSavePromotion,
  onForceResetDiamonds,
}: UseCheckoutItemizedPromotionsParams) {
  const [servicePromo, setServicePromo] = useState<IosPromotionOption | null>(booking?.servicePromotion ?? null);
  const [productPromos, setProductPromos] = useState<Array<IosPromotionOption | null>>(() =>
    (booking?.cartProducts || []).map((p) => p.appliedPromotion ?? null)
  );
  const [promotions, setPromotions] = useState<IosPromotionOption[]>([]);
  const [isPromotionsLoading, setIsPromotionsLoading] = useState<boolean>(false);
  const [promotionsError, setPromotionsError] = useState<string | null>(null);
  const [promoPickerTarget, setPromoPickerTarget] = useState<ReceiptPromotionOpenTarget | null>(null);

  useEffect(() => {
    setServicePromo(booking?.servicePromotion ?? null);
  }, [booking?.id, booking?.servicePromotion]);

  useEffect(() => {
    setProductPromos((booking?.cartProducts || []).map((p) => p.appliedPromotion ?? null));
  }, [booking?.id, booking?.cartProducts]);

  useEffect(() => {
    if (booking?.appliedPromotion?.isCreditAllowed === false && !booking?.servicePromotion) {
      onForceResetDiamonds?.();
    }
  }, [booking?.id, booking?.appliedPromotion, booking?.servicePromotion, onForceResetDiamonds]);

  const loadPromotions = useCallback(
    async (signal?: AbortSignal) => {
      setIsPromotionsLoading(true);
      setPromotionsError(null);
      try {
        const res = await apiClient.ios.getPromotions({ role: actorTier }, { signal });
        if (!signal?.aborted && res?.success && Array.isArray(res.promotions)) {
          setPromotions(res.promotions);
        }
      } catch (err: any) {
        if (!signal?.aborted) {
          setPromotionsError(err?.message || 'Không thể tải danh sách khuyến mãi');
        }
      } finally {
        if (!signal?.aborted) {
          setIsPromotionsLoading(false);
        }
      }
    },
    [actorTier]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPromotions(controller.signal);
    return () => controller.abort();
  }, [loadPromotions]);

  const rawCartProducts = booking?.cartProducts || [];
  const cartProducts = useMemo(
    () =>
      rawCartProducts.map((p, idx) => ({
        ...p,
        appliedPromotion: productPromos[idx] !== undefined ? productPromos[idx] : (p.appliedPromotion ?? null),
      })),
    [rawCartProducts, productPromos]
  );

  const applyPromoChange = useCallback(
    (
      promo: IosPromotionOption | null,
      target: { scope: IosPromotionTargetScope; productIndex?: number; productId?: number }
    ) => {
      if (target.scope === 'service') {
        setServicePromo(promo);
      } else if (target.scope === 'product') {
        setProductPromos((prev) => {
          const baseLen = Math.max(prev.length, booking?.cartProducts?.length ?? 0);
          const next = Array.from({ length: baseLen }, (_, i) => prev[i] ?? null);
          if (target.productIndex !== undefined && target.productIndex >= 0 && target.productIndex < next.length) {
            next[target.productIndex] = promo;
          } else if (target.productId !== undefined) {
            (booking?.cartProducts || []).forEach((p, idx) => {
              if (Number(p.productId) === Number(target.productId)) next[idx] = promo;
            });
          }
          return next;
        });
      }
      onSavePromotion?.(promo, {
        scope: target.scope,
        productIndex: target.productIndex,
        productId: target.productId,
      });
    },
    [booking?.cartProducts, onSavePromotion]
  );

  const handleOpenItemPromotionPicker = useCallback(
    (target: ReceiptPromotionOpenTarget) => {
      setPromoPickerTarget(target);
      if (promotions.length === 0 && !isPromotionsLoading) {
        void loadPromotions();
      }
    },
    [isPromotionsLoading, loadPromotions, promotions.length]
  );

  const handleClearItemPromotion = useCallback(
    (target: ReceiptPromotionClearTarget) => {
      applyPromoChange(null, target);
    },
    [applyPromoChange]
  );

  const hasAnyItemPromo = Boolean(servicePromo || cartProducts.some((p) => p.appliedPromotion));
  const fallbackOrderPromo = !hasAnyItemPromo ? (booking?.appliedPromotion ?? null) : null;
  const hasAnyPromoObj = hasAnyItemPromo || Boolean(fallbackOrderPromo);

  const promoBreakdown = useMemo(
    () =>
      calculateIosItemizedPromotionDiscounts({
        serviceAmount: effectiveServiceCharge,
        upgradeAmount: upgradePrice,
        servicePromotion: servicePromo,
        comboAmount: upperComboPrice,
        underComboAmount: underComboPrice,
        products: cartProducts.map((p) => ({
          productId: Number(p.productId),
          amount: p.price * p.quantity,
          promotion: p.appliedPromotion ?? undefined,
        })),
        fallbackOrderPromotion: fallbackOrderPromo,
        vatRate,
      }),
    [
      effectiveServiceCharge,
      upgradePrice,
      servicePromo,
      upperComboPrice,
      underComboPrice,
      cartProducts,
      fallbackOrderPromo,
      vatRate,
    ]
  );

  const activePromoNames = useMemo(() => {
    const names: string[] = [];
    if (servicePromo) names.push(servicePromo.name);
    cartProducts.forEach((p) => {
      if (p.appliedPromotion) names.push(p.appliedPromotion.name);
    });
    return Array.from(new Set(names));
  }, [servicePromo, cartProducts]);

  const appliedPromotionDisplayName =
    activePromoNames.length > 1
      ? `${activePromoNames.length} ưu đãi`
      : activePromoNames.length === 1
        ? activePromoNames[0]
        : (fallbackOrderPromo?.name ?? (booking?.promotionId ? booking?.billing?.promotionName : undefined) ?? null);

  return {
    servicePromo,
    cartProducts,
    promotions,
    isPromotionsLoading,
    promotionsError,
    promoPickerTarget,
    setPromoPickerTarget,
    applyPromoChange,
    handleOpenItemPromotionPicker,
    handleClearItemPromotion,
    fallbackOrderPromo,
    hasAnyPromoObj,
    promoBreakdown,
    appliedPromotionDisplayName,
  };
}
