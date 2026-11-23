'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { message } from 'antd';
import {
  BASELINE_CLOSING_RATE,
  DEFAULT_PRESETS,
  DEFAULT_TRAINING_OVERRIDES,
  FALLBACK_SANDBOX_CONTEXT,
  INITIAL_DESIGN_PLAN,
  INITIAL_MATERIALS_CHECKLIST,
  STORAGE_KEY_MODE,
} from './sandbox/sandboxDefaults';
import type {
  DesignPlanItem,
  MaterialChecklistItem,
  MaterialStatus,
  SandboxPresetScenario,
  SimulatedComboSale,
  SimulatedGift,
  SimulatedLogAction,
  SimulatedProductSale,
  StaffTrainingOverride,
  TodaySandboxContextValue,
  TodaySandboxMode,
} from './sandbox/sandboxTypes';
import { useSalesAndPlanSimulation } from './sandbox/useSalesAndPlanSimulation';
import { useTrainingSimulation } from './sandbox/useTrainingSimulation';

export type {
  DesignPlanItem,
  MaterialChecklistItem,
  MaterialStatus,
  SandboxPresetScenario,
  SimulatedComboSale,
  SimulatedGift,
  SimulatedLogAction,
  SimulatedProductSale,
  StaffTrainingOverride,
  TodaySandboxContextValue,
  TodaySandboxMode,
};

export {
  BASELINE_CLOSING_RATE,
  DEFAULT_PRESETS,
  DEFAULT_TRAINING_OVERRIDES,
  INITIAL_DESIGN_PLAN,
  INITIAL_MATERIALS_CHECKLIST,
};

const TodaySandboxContext = createContext<TodaySandboxContextValue | undefined>(undefined);

export function TodaySandboxProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<TodaySandboxMode>('live');
  const [presets, setPresets] = useState<SandboxPresetScenario[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>('pa-1');
  const [simulatedActions, setSimulatedActions] = useState<SimulatedLogAction[]>([]);

  // Load initial mode from sessionStorage or URL query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('sandboxMode') || urlParams.get('mode');
      if (urlMode === 'training' || urlMode === 'sales' || urlMode === 'live') {
        setModeState(urlMode);
        if (urlMode === 'sales') setActivePresetId('pa-2');
        return;
      }
      const saved = sessionStorage.getItem(STORAGE_KEY_MODE) as TodaySandboxMode | null;
      if (saved && (saved === 'training' || saved === 'sales' || saved === 'live')) {
        setModeState(saved);
        if (saved === 'sales') setActivePresetId('pa-2');
      }
    }
  }, []);

  const setMode = useCallback((newMode: TodaySandboxMode) => {
    setModeState(newMode);
    if (newMode === 'training') setActivePresetId((prev) => (prev === 'pa-2' ? 'pa-1' : prev));
    if (newMode === 'sales') setActivePresetId((prev) => (prev === 'pa-1' ? 'pa-2' : prev));
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY_MODE, newMode);
      } catch {
        // ignore
      }
    }
    if (newMode === 'live') {
      message.info('Đã chuyển sang Chế độ Thực tế (Live Data)');
    } else if (newMode === 'training') {
      message.success('Đã kích hoạt Sandbox: Giả lập Training Check-in / Bấm giờ / Check-out');
    } else if (newMode === 'sales') {
      message.success('Đã kích hoạt Sandbox: Giả lập Sales Chốt Gói Combo & Quà Tặng');
    }
  }, []);

  const logAction = useCallback((type: SimulatedLogAction['type'], msg: string) => {
    const action: SimulatedLogAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      message: msg,
    };
    setSimulatedActions((prev) => [action, ...prev.slice(0, 49)]);
  }, []);

  const training = useTrainingSimulation({ mode, logAction });
  const salesAndPlan = useSalesAndPlanSimulation({ logAction });

  const {
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
    resetDesignPlan,
    resetMaterialsChecklist,
    resetSalesState,
  } = salesAndPlan;

  const { resetTrainingState } = training;

  // Preset actions (PA #1, PA #2...)
  const applyPreset = useCallback(
    (presetId: string) => {
      const target = presets.find((p) => p.id === presetId);
      if (!target) return;
      setActivePresetId(target.id);
      setModeState(target.mode);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(STORAGE_KEY_MODE, target.mode);
        } catch {
          // ignore
        }
      }
      if (target.designPlanSnapshot) setDesignPlanItems(target.designPlanSnapshot);
      if (target.materialsSnapshot) setMaterialsChecklist(target.materialsSnapshot);
      if (target.combosSnapshot) setSimulatedCombos(target.combosSnapshot);
      if (target.productsSnapshot) setSimulatedProducts(target.productsSnapshot);
      if (target.giftsSnapshot) setSimulatedGifts(target.giftsSnapshot);
      logAction('PRESET_SWITCH', `[Preset] Đã chuyển sang ${target.code} · ${target.label}`);
      message.success(`Đã áp dụng ${target.code}: ${target.label}`);
    },
    [
      presets,
      logAction,
      setDesignPlanItems,
      setMaterialsChecklist,
      setSimulatedCombos,
      setSimulatedProducts,
      setSimulatedGifts,
    ]
  );

  const saveCurrentAsPreset = useCallback(
    (customLabel?: string) => {
      const nextIndex = presets.length + 1;
      const code = `PA #${nextIndex}`;
      const label =
        customLabel?.trim() ||
        (mode === 'sales' ? `Kịch bản Sales #${nextIndex}` : `Kịch bản Training & NVL #${nextIndex}`);
      const newPreset: SandboxPresetScenario = {
        id: `pa-${nextIndex}-${Date.now()}`,
        code,
        label,
        description:
          mode === 'sales'
            ? `Lưu kịch bản ${simulatedCombos.length} Combo · ${simulatedProducts.length} SP · ${simulatedGifts.length} Quà`
            : 'Lưu kịch bản chấm công, kế hoạch thiết kế & kiểm tra nguyên vật liệu',
        mode: mode === 'live' ? 'training' : mode,
        combosSnapshot: [...simulatedCombos],
        productsSnapshot: [...simulatedProducts],
        giftsSnapshot: [...simulatedGifts],
        designPlanSnapshot: [...designPlanItems],
        materialsSnapshot: [...materialsChecklist],
      };
      setPresets((prev) => [...prev, newPreset]);
      setActivePresetId(newPreset.id);
      logAction('PRESET_SWITCH', `[Preset] Đã lưu ${code} · ${label}`);
      message.success(`Đã lưu phương án giả lập mới: ${code}`);
    },
    [
      presets.length,
      mode,
      simulatedCombos,
      simulatedProducts,
      simulatedGifts,
      designPlanItems,
      materialsChecklist,
      logAction,
    ]
  );

  const clearActionLog = useCallback(() => {
    setSimulatedActions([]);
  }, []);

  const resetAllSandbox = useCallback(() => {
    resetTrainingState();
    resetDesignPlan();
    resetMaterialsChecklist();
    resetSalesState();
    clearActionLog();
    message.info('Đã đặt lại toàn bộ phòng tập Sandbox');
  }, [resetTrainingState, resetDesignPlan, resetMaterialsChecklist, resetSalesState, clearActionLog]);

  const value: TodaySandboxContextValue = {
    mode,
    setMode,
    isSandbox: mode !== 'live',

    staffOverrides: training.staffOverrides,
    nowTickMs: training.nowTickMs,
    formatStaffTimerMMSS: training.formatStaffTimerMMSS,
    simulateStaffCheckIn: training.simulateStaffCheckIn,
    simulateStaffCheckOut: training.simulateStaffCheckOut,
    simulateStaffStartTimer: training.simulateStaffStartTimer,
    simulateStaffStopTimer: training.simulateStaffStopTimer,
    simulateBatchCheckInAll: training.simulateBatchCheckInAll,
    simulateBatchStartAllTimers: training.simulateBatchStartAllTimers,
    resetTrainingState,

    designPlanItems,
    materialsChecklist,
    materialReadyCount: salesAndPlan.materialReadyCount,
    designPlanTotals: salesAndPlan.designPlanTotals,
    updateDesignPlanTarget: salesAndPlan.updateDesignPlanTarget,
    incrementDesignPlanDone: salesAndPlan.incrementDesignPlanDone,
    resetDesignPlan,
    toggleMaterialCheck: salesAndPlan.toggleMaterialCheck,
    cycleMaterialStatus: salesAndPlan.cycleMaterialStatus,
    resetMaterialsChecklist,

    simulatedCombos,
    simulatedProducts,
    simulatedGifts,
    totalSimulatedRevenue: salesAndPlan.totalSimulatedRevenue,
    totalSimulatedComboRevenue: salesAndPlan.totalSimulatedComboRevenue,
    totalSimulatedProductRevenue: salesAndPlan.totalSimulatedProductRevenue,
    baselineClosingRate: BASELINE_CLOSING_RATE,
    closingRate: salesAndPlan.closingRate,
    closingUpliftPercent: salesAndPlan.closingUpliftPercent,
    simulateAddCombo: salesAndPlan.simulateAddCombo,
    simulateAddProduct: salesAndPlan.simulateAddProduct,
    simulateAddGift: salesAndPlan.simulateAddGift,
    resetSalesState,

    presets,
    activePresetId,
    applyPreset,
    saveCurrentAsPreset,

    simulatedActions,
    clearActionLog,
    resetAllSandbox,
  };

  return <TodaySandboxContext.Provider value={value}>{children}</TodaySandboxContext.Provider>;
}

export function useTodaySandbox(): TodaySandboxContextValue {
  const ctx = useContext(TodaySandboxContext);
  if (!ctx) {
    return FALLBACK_SANDBOX_CONTEXT;
  }
  return ctx;
}
