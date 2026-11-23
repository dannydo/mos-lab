'use client';

import { useCallback, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  BASELINE_CLOSING_RATE,
  INITIAL_DESIGN_PLAN,
  INITIAL_MATERIALS_CHECKLIST,
  INITIAL_SALES_COMBOS,
  INITIAL_SALES_GIFTS,
  INITIAL_SALES_PRODUCTS,
} from './sandboxDefaults';
import type {
  DesignPlanItem,
  MaterialChecklistItem,
  MaterialStatus,
  SimulatedComboSale,
  SimulatedGift,
  SimulatedLogAction,
  SimulatedProductSale,
} from './sandboxTypes';

interface UseSalesAndPlanSimulationParams {
  logAction: (type: SimulatedLogAction['type'], msg: string) => void;
}

export function useSalesAndPlanSimulation({ logAction }: UseSalesAndPlanSimulationParams) {
  const [designPlanItems, setDesignPlanItems] = useState<DesignPlanItem[]>(INITIAL_DESIGN_PLAN);
  const [materialsChecklist, setMaterialsChecklist] = useState<MaterialChecklistItem[]>(INITIAL_MATERIALS_CHECKLIST);
  const [simulatedCombos, setSimulatedCombos] = useState<SimulatedComboSale[]>(INITIAL_SALES_COMBOS);
  const [simulatedProducts, setSimulatedProducts] = useState<SimulatedProductSale[]>(INITIAL_SALES_PRODUCTS);
  const [simulatedGifts, setSimulatedGifts] = useState<SimulatedGift[]>(INITIAL_SALES_GIFTS);

  // Sales actions
  const simulateAddCombo = useCallback(
    (custom?: { name?: string; price?: number; customerName?: string }) => {
      const id = `combo-sim-${Date.now()}`;
      const name = custom?.name || 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)';
      const price = custom?.price ?? 2_500_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newCombo: SimulatedComboSale = {
        id,
        name,
        price,
        customerName,
        ccName: 'CC Thảo My',
        cvName: 'CV Lan Anh',
        time,
      };

      setSimulatedCombos((prev) => [newCombo, ...prev]);
      logAction(
        'ADD_COMBO',
        `[Sales] Chốt thành công ${name} — ${price.toLocaleString('vi-VN')} đ cho ${customerName}`
      );
      message.success(`[Sales] Đã giả lập chốt ${name} (+${price.toLocaleString('vi-VN')} đ)`);
    },
    [logAction]
  );

  const simulateAddProduct = useCallback(
    (custom?: { name?: string; price?: number; customerName?: string }) => {
      const id = `prod-sim-${Date.now()}`;
      const name = custom?.name || 'Serum Dưỡng Mi FKN Tế Bào Gốc';
      const price = custom?.price ?? 350_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newProd: SimulatedProductSale = {
        id,
        name,
        price,
        customerName,
        time,
      };

      setSimulatedProducts((prev) => [newProd, ...prev]);
      logAction('ADD_PRODUCT', `[Sales] Thêm sản phẩm dưỡng ${name} (+${price.toLocaleString('vi-VN')} đ)`);
      message.success(`[Sales] Đã thêm sản phẩm ${name}`);
    },
    [logAction]
  );

  const simulateAddGift = useCallback(
    (custom?: { name?: string; estimatedValue?: number; customerName?: string }) => {
      const id = `gift-sim-${Date.now()}`;
      const name = custom?.name || 'Cọ chải mi pha lê & Gương bỏ túi cao cấp';
      const estimatedValue = custom?.estimatedValue ?? 120_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newGift: SimulatedGift = {
        id,
        name,
        estimatedValue,
        customerName,
        time,
      };

      setSimulatedGifts((prev) => [newGift, ...prev]);
      logAction(
        'ADD_GIFT',
        `[Sales] Tặng kèm quà tặng ${name} (Trị giá ${estimatedValue.toLocaleString('vi-VN')} đ) cho ${customerName}`
      );
      message.success(`[Sales] Đã thêm quà tặng: ${name}`);
    },
    [logAction]
  );

  const resetSalesState = useCallback(() => {
    setSimulatedCombos(INITIAL_SALES_COMBOS);
    setSimulatedProducts(INITIAL_SALES_PRODUCTS);
    setSimulatedGifts(INITIAL_SALES_GIFTS);
    logAction('RESET', '[Sales] Đã khôi phục kịch bản bán hàng & quà tặng về mặc định');
    message.info('[Sales] Đã đặt lại kịch bản bán hàng');
  }, [logAction]);

  // Design plan actions
  const updateDesignPlanTarget = useCallback(
    (id: string, delta: number) => {
      setDesignPlanItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, targetCount: Math.max(1, item.targetCount + delta) } : item))
      );
      logAction('DESIGN_PLAN', `[Kế hoạch] Cập nhật chỉ tiêu dáng mi (${delta > 0 ? '+' : ''}${delta} ca)`);
    },
    [logAction]
  );

  const incrementDesignPlanDone = useCallback(
    (id: string) => {
      setDesignPlanItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, completedCount: Math.min(item.targetCount + 5, item.completedCount + 1) } : item
        )
      );
      logAction('DESIGN_PLAN', '[Kế hoạch] Ghi nhận hoàn thành +1 ca thiết kế giả lập');
    },
    [logAction]
  );

  const resetDesignPlan = useCallback(() => {
    setDesignPlanItems(INITIAL_DESIGN_PLAN);
    logAction('RESET', '[Kế hoạch] Đã đặt lại kế hoạch thiết kế dáng mi hôm nay');
  }, [logAction]);

  // Material checklist actions
  const toggleMaterialCheck = useCallback(
    (id: string) => {
      const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setMaterialsChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const nextChecked = !item.checked;
          return {
            ...item,
            checked: nextChecked,
            checkedAt: nextChecked ? timeNow : undefined,
            status: nextChecked && item.status === 'restock_needed' ? 'sufficient' : item.status,
          };
        })
      );
      logAction('MATERIAL_CHECK', '[NVL] Đã cập nhật kiểm tra nguyên vật liệu trước ca');
    },
    [logAction]
  );

  const cycleMaterialStatus = useCallback(
    (id: string) => {
      const order: MaterialStatus[] = ['sufficient', 'low', 'restock_needed'];
      setMaterialsChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const nextStatus = order[(order.indexOf(item.status) + 1) % order.length];
          return {
            ...item,
            status: nextStatus,
            checked: nextStatus === 'sufficient' ? true : item.checked,
          };
        })
      );
      logAction('MATERIAL_CHECK', '[NVL] Đã đổi trạng thái tồn kho nguyên vật liệu giả lập');
    },
    [logAction]
  );

  const resetMaterialsChecklist = useCallback(() => {
    setMaterialsChecklist(INITIAL_MATERIALS_CHECKLIST);
    logAction('RESET', '[NVL] Đã đặt lại danh mục kiểm tra nguyên vật liệu');
  }, [logAction]);

  const totalSimulatedComboRevenue = useMemo(
    () => simulatedCombos.reduce((sum, item) => sum + item.price, 0),
    [simulatedCombos]
  );

  const totalSimulatedProductRevenue = useMemo(
    () => simulatedProducts.reduce((sum, item) => sum + item.price, 0),
    [simulatedProducts]
  );

  const totalSimulatedRevenue = useMemo(
    () => totalSimulatedComboRevenue + totalSimulatedProductRevenue,
    [totalSimulatedComboRevenue, totalSimulatedProductRevenue]
  );

  const materialReadyCount = useMemo(
    () => materialsChecklist.filter((m) => m.checked && m.status !== 'restock_needed').length,
    [materialsChecklist]
  );

  const designPlanTotals = useMemo(
    () => ({
      target: designPlanItems.reduce((sum, item) => sum + item.targetCount, 0),
      completed: designPlanItems.reduce((sum, item) => sum + item.completedCount, 0),
    }),
    [designPlanItems]
  );

  const closingRate = useMemo(() => {
    const comboBoost = Math.min(16, simulatedCombos.length * 6);
    const productBoost = Math.min(14, simulatedProducts.length * 4);
    const giftBoost = Math.min(18, simulatedGifts.length * 6);
    // Extra synergy when combining gift + product with combo
    const synergy = simulatedCombos.length > 0 && simulatedGifts.length > 0 && simulatedProducts.length > 0 ? 4 : 0;
    return Math.min(78, BASELINE_CLOSING_RATE + comboBoost + productBoost + giftBoost + synergy);
  }, [simulatedCombos.length, simulatedProducts.length, simulatedGifts.length]);

  const closingUpliftPercent = closingRate - BASELINE_CLOSING_RATE;

  return {
    designPlanItems,
    setDesignPlanItems,
    materialsChecklist,
    setMaterialsChecklist,
    simulatedCombos,
    setSimulatedCombos,
    simulatedProducts,
    setSimulatedProducts,
    simulatedGifts,
    setSimulatedGifts,
    materialReadyCount,
    designPlanTotals,
    totalSimulatedRevenue,
    totalSimulatedComboRevenue,
    totalSimulatedProductRevenue,
    closingRate,
    closingUpliftPercent,
    updateDesignPlanTarget,
    incrementDesignPlanDone,
    resetDesignPlan,
    toggleMaterialCheck,
    cycleMaterialStatus,
    resetMaterialsChecklist,
    simulateAddCombo,
    simulateAddProduct,
    simulateAddGift,
    resetSalesState,
  };
}
