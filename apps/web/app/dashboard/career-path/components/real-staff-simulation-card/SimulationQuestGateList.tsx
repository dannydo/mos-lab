'use client';

import React from 'react';
import type { BananaTransactionCategory, StaffCareerStatus } from '@mos-lab/shared';
import { WingRoleLabel } from '../IslandGameIcon';
import { SimulationCultureAndQaGates } from './SimulationCultureAndQaGates';
import { SimulationPerformanceGates } from './SimulationPerformanceGates';
import type { GateFilter, QuestMetricsSummary } from './simulationTypesAndHelpers';

interface SimulationQuestGateListProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  isTargetCvPlusPlus: boolean;
  minHappinessConfig: number;
  localOrders: number;
  sliderTipRate: number;
  gateFilter: GateFilter;
  expandedGates: number[];
  onToggleGate: (gateIndex: number) => void;
  onOpenBananaDrawer?: (category: BananaTransactionCategory) => void;
}

export const SimulationQuestGateList: React.FC<SimulationQuestGateListProps> = ({
  status,
  questMetrics,
  isTargetCvPlusPlus,
  minHappinessConfig,
  localOrders,
  sliderTipRate,
  gateFilter,
  expandedGates,
  onToggleGate,
  onOpenBananaDrawer,
}) => (
  <div className="relative z-10 space-y-2.5 mt-3">
    <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1">
      <span className="flex items-center gap-1.5">
        <span>📋 TIẾN TRÌNH 6 ẢI THĂNG CẤP</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-bold border border-pink-500/25 tabular-nums">
          {questMetrics.passedQuestsCount}/6 ải đạt
        </span>
      </span>
      <span className="text-[10px] text-pink-400 font-normal">
        {isTargetCvPlusPlus ? (
          <span className="inline-flex items-center gap-1">
            <span>Đạt chuẩn</span>
            <WingRoleLabel text="CVLL" />
          </span>
        ) : (
          'Cần vượt tối thiểu 4 ải cốt lõi'
        )}
      </span>
    </div>

    <SimulationPerformanceGates
      status={status}
      questMetrics={questMetrics}
      localOrders={localOrders}
      sliderTipRate={sliderTipRate}
      gateFilter={gateFilter}
      expandedGates={expandedGates}
      onToggleGate={onToggleGate}
    />

    <SimulationCultureAndQaGates
      status={status}
      questMetrics={questMetrics}
      minHappinessConfig={minHappinessConfig}
      gateFilter={gateFilter}
      expandedGates={expandedGates}
      onToggleGate={onToggleGate}
      onOpenBananaDrawer={onOpenBananaDrawer}
    />
  </div>
);
