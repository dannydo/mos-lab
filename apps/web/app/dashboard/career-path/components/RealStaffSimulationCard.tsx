'use client';

import React from 'react';
import { SimulationFinancialJackpotCard } from './real-staff-simulation-card/SimulationFinancialJackpotCard';
import { SimulationHourlyProductivityWidget } from './real-staff-simulation-card/SimulationHourlyProductivityWidget';
import { SimulationMobileBottomBar } from './real-staff-simulation-card/SimulationMobileBottomBar';
import { SimulationProfileHeader } from './real-staff-simulation-card/SimulationProfileHeader';
import { SimulationQuestsPanel } from './real-staff-simulation-card/SimulationQuestsPanel';
import { renderCareerNodeIcon } from './real-staff-simulation-card/SimulationStatusAndIcons';
import type { RealStaffSimulationCardProps } from './real-staff-simulation-card/simulationTypesAndHelpers';
import { useRealStaffSimulationState } from './real-staff-simulation-card/useRealStaffSimulationState';

export { renderCareerNodeIcon };
export type { RealStaffSimulationCardProps };

export const RealStaffSimulationCard: React.FC<RealStaffSimulationCardProps> = ({
  status,
  config,
  sliderOrders,
  setSliderOrders,
  sliderCombo,
  setSliderCombo,
  onActivateTrial,
  onPromote,
  onDemote,
  onSetRole,
  onSwitchSpecialist,
  loadingAction,
  simulationTarget,
  onOpenBananaDrawer,
  onExpandStaffSelector,
  onOpenBibleTopic,
}) => {
  const state = useRealStaffSimulationState({
    status,
    config,
    simulationTarget,
    sliderOrders,
    setSliderOrders,
    sliderCombo,
    setSliderCombo,
  });

  if (!status || !state.questMetrics || !state.financialSummary) {
    return null;
  }

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/70 dark:border-slate-800 p-3 sm:p-5 shadow-sm mb-6 transition-all duration-200">
      <SimulationProfileHeader
        status={status}
        questMetrics={state.questMetrics}
        financialSummary={state.financialSummary}
        loadingAction={loadingAction}
        onExpandStaffSelector={onExpandStaffSelector}
        onSwitchSpecialist={onSwitchSpecialist}
        onSetRole={onSetRole}
        onDemote={onDemote}
      />

      <SimulationHourlyProductivityWidget status={status} questMetrics={state.questMetrics} />

      {/* DESKTOP FHD PANORAMIC 2-COLUMN COCKPIT (What-If on Left, 6 Ải on Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-4 items-start">
        <SimulationFinancialJackpotCard
          status={status}
          questMetrics={state.questMetrics}
          financialSummary={state.financialSummary}
          localCombo={state.localCombo}
          localOrders={state.localOrders}
          sliderSerums={state.sliderSerums}
          sliderTipRate={state.sliderTipRate}
          onComboChange={state.handleComboChange}
          onSerumsChange={state.setSliderSerums}
          onOrdersChange={state.handleOrdersChange}
          onTipRateChange={state.setSliderTipRate}
          comboTooltipFormatter={state.comboTooltipFormatter}
          serumsTooltipFormatter={state.serumsTooltipFormatter}
          ordersTooltipFormatter={state.ordersTooltipFormatter}
          tipTooltipFormatter={state.tipTooltipFormatter}
          onResetSliders={state.handleResetSliders}
          onOpenBibleTopic={onOpenBibleTopic}
        />

        <SimulationQuestsPanel
          status={status}
          questMetrics={state.questMetrics}
          isTargetCvPlusPlus={state.isTargetCvPlusPlus}
          minHappinessConfig={state.targetReq.minHappinessIndex || state.questMetrics.minHappinessIndex}
          localOrders={state.localOrders}
          sliderTipRate={state.sliderTipRate}
          gateFilter={state.gateFilter}
          onGateFilterChange={state.setGateFilter}
          expandedGates={state.expandedGates}
          onToggleGate={state.toggleGate}
          onSetGateViewMode={state.handleSetGateViewMode}
          loadingAction={loadingAction}
          onActivateTrial={onActivateTrial}
          onPromote={onPromote}
          onSwitchSpecialist={onSwitchSpecialist}
          onOpenBananaDrawer={onOpenBananaDrawer}
          onOpenBibleTopic={onOpenBibleTopic}
        />
      </div>

      <SimulationMobileBottomBar
        status={status}
        isComboTargetHit={state.financialSummary.isComboTargetHit}
        totalSimulatedGain={state.financialSummary.totalSimulatedGain}
        effectiveTipGain={state.financialSummary.effectiveTipGain}
        isQaPassed={state.questMetrics.isQaPassed}
        loadingAction={loadingAction}
        onPromote={onPromote}
        onActivateTrial={onActivateTrial}
      />
    </div>
  );
};
