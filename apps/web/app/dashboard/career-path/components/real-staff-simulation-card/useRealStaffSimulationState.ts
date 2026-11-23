'use client';

import React from 'react';
import type { CareerProgressionConfig, CvPlusRewardSnapshot, StaffCareerStatus } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  type GateFilter,
  type SimulationTargetRole,
  computeFinancialSimulation,
  computeQuestMetricsSummary,
  resolveTargetRequirements,
} from './simulationTypesAndHelpers';

interface UseRealStaffSimulationStateParams {
  status: StaffCareerStatus | null;
  config: CareerProgressionConfig;
  simulationTarget?: SimulationTargetRole;
  sliderOrders: number;
  setSliderOrders: (val: number) => void;
  sliderCombo: number;
  setSliderCombo: (val: number) => void;
}

export function useRealStaffSimulationState({
  status,
  config,
  simulationTarget,
  sliderOrders,
  setSliderOrders,
  sliderCombo,
  setSliderCombo,
}: UseRealStaffSimulationStateParams) {
  const isTargetCvPlusPlus = (simulationTarget || status?.targetRole) === 'CV_PLUS_PLUS';
  const targetReq = React.useMemo(
    () => resolveTargetRequirements(config, isTargetCvPlusPlus),
    [config, isTargetCvPlusPlus]
  );

  const earnings = status?.earningsSimulation;

  // Dự kiến mỗi tuần bán dưỡng mi (Ưu tiên cấu hình Danny từ targetReq hoặc thanh trượt)
  const defaultSerums = targetReq.expectedSerumsPerWeek ?? earnings?.details?.expectedSerumsPerWeek ?? 4;
  const [sliderSerums, setSliderSerums] = React.useState<number>(defaultSerums);

  React.useEffect(() => {
    if (typeof targetReq.expectedSerumsPerWeek === 'number') {
      setSliderSerums(targetReq.expectedSerumsPerWeek);
    } else if (typeof earnings?.details?.expectedSerumsPerWeek === 'number') {
      setSliderSerums(earnings.details.expectedSerumsPerWeek);
    }
  }, [targetReq.expectedSerumsPerWeek, earnings?.details?.expectedSerumsPerWeek]);

  const [expandedGates, setExpandedGates] = React.useState<number[]>([]);
  const [gateFilter, setGateFilter] = React.useState<GateFilter>('ALL');

  // Dynamic What-If Slider for Tip Rate
  const [sliderTipRate, setSliderTipRate] = React.useState<number>(48.5);

  // Dữ liệu đối soát thực tế CVL từ Backend Fastify (Single Source of Truth)
  const [cvlSnapshot, setCvlSnapshot] = React.useState<CvPlusRewardSnapshot | null>(null);

  // 120 FPS High-Performance Slider Buffer
  const [localCombo, setLocalCombo] = React.useState<number>(sliderCombo);
  const [localOrders, setLocalOrders] = React.useState<number>(sliderOrders);

  React.useEffect(() => {
    setLocalCombo(sliderCombo);
  }, [sliderCombo]);

  React.useEffect(() => {
    setLocalOrders(sliderOrders);
  }, [sliderOrders]);

  const handleComboChange = React.useCallback(
    (val: number) => {
      setLocalCombo(val);
      React.startTransition(() => {
        setSliderCombo(val);
      });
    },
    [setSliderCombo]
  );

  const handleOrdersChange = React.useCallback(
    (val: number) => {
      setLocalOrders(val);
      React.startTransition(() => {
        setSliderOrders(val);
      });
    },
    [setSliderOrders]
  );

  const comboTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0}% Combo`, []);
  const serumsTooltipFormatter = React.useCallback(
    (val?: number) => `${val ?? 0} cây/tuần (~${(val ?? 0) * 4} cây/tháng)`,
    []
  );
  const ordersTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0} ca / 3 tháng`, []);
  const tipTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0}% Tip thực tế`, []);

  React.useEffect(() => {
    if (!status?.staffId) {
      setCvlSnapshot(null);
      return;
    }
    let isCancelled = false;
    apiClient.career
      .getCvPlusRewards(status.staffId)
      .then((res) => {
        if (!isCancelled && res) {
          setCvlSnapshot(res);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch CVL snapshot:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [status?.staffId]);

  const toggleGate = React.useCallback((idx: number) => {
    setExpandedGates((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }, []);

  const handleSetGateViewMode = React.useCallback((mode: 'simple' | 'expanded') => {
    setExpandedGates(mode === 'simple' ? [] : [1, 2, 3, 4, 5, 6]);
  }, []);

  // Synchronize when active staff or metrics change
  React.useEffect(() => {
    if (status?.metrics) {
      const m = status.metrics;
      const stTip =
        m.staffTipRate ??
        (m.ordersCount ? Math.min(0.65, Math.max(0.2, ((m.totalTip || 0) / (m.ordersCount * 38000)) * 0.45)) : 0.314);
      setSliderTipRate(Number((stTip * 100).toFixed(1)));
    }
  }, [status?.staffId, status?.metrics?.ordersCount, status?.metrics?.totalTip]);

  const questMetrics = React.useMemo(() => {
    if (!status) return null;
    return computeQuestMetricsSummary({
      status,
      targetReq,
      isTargetCvPlusPlus,
      localOrders,
      sliderTipRate,
    });
  }, [status, targetReq, isTargetCvPlusPlus, localOrders, sliderTipRate]);

  const financialSummary = React.useMemo(() => {
    if (!status || !questMetrics) return null;
    return computeFinancialSimulation({
      status,
      config,
      targetReq,
      questMetrics,
      isTargetCvPlusPlus,
      defaultSerums,
      sliderSerums,
      sliderTipRate,
      localOrders,
      localCombo,
      cvlSnapshot,
    });
  }, [
    status,
    questMetrics,
    config,
    targetReq,
    isTargetCvPlusPlus,
    defaultSerums,
    sliderSerums,
    sliderTipRate,
    localOrders,
    localCombo,
    cvlSnapshot,
  ]);

  const handleResetSliders = React.useCallback(() => {
    if (!status || !questMetrics) return;
    setSliderOrders(status.metrics.ordersCount || 0);
    setSliderCombo(Math.round((status.metrics.selfComboRate || 0.25) * 100));
    setSliderSerums(defaultSerums);
    setSliderTipRate(questMetrics.staffTipRatePercent);
  }, [status, questMetrics, setSliderOrders, setSliderCombo, defaultSerums]);

  return {
    isTargetCvPlusPlus,
    targetReq,
    sliderSerums,
    setSliderSerums,
    sliderTipRate,
    setSliderTipRate,
    localCombo,
    localOrders,
    handleComboChange,
    handleOrdersChange,
    comboTooltipFormatter,
    serumsTooltipFormatter,
    ordersTooltipFormatter,
    tipTooltipFormatter,
    expandedGates,
    gateFilter,
    setGateFilter,
    toggleGate,
    handleSetGateViewMode,
    questMetrics,
    financialSummary,
    handleResetSliders,
  };
}
