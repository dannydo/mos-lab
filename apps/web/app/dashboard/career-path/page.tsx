'use client';

import React from 'react';
import { StaffCareerSelector } from './components/StaffCareerSelector';
import { RealStaffSimulationCard } from './components/RealStaffSimulationCard';
import { useCareerPathState } from './career-path-page-modules/useCareerPathState';
import { CareerHudHeader } from './career-path-page-modules/CareerHudHeader';
import { CareerWorldMapBanner } from './career-path-page-modules/CareerWorldMapBanner';
import { CareerPathDrawers } from './career-path-page-modules/CareerPathDrawers';

export default function CareerPathPage() {
  const state = useCareerPathState();

  return (
    <div className="min-h-screen bg-rose-50/40 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-32 sm:pb-36 md:pb-12 transition-colors duration-200">
      <canvas ref={state.canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      <CareerHudHeader
        selectedStaffStatus={state.selectedStaffStatus}
        selectedStaffId={state.selectedStaffId}
        minOrders={state.safeConfig.cvToCc.minOrders}
        canConfigure={state.canConfigure}
        onPlayPop={() => state.playSound('pop')}
        onOpenMobileStaffDrawer={() => state.setIsMobileStaffDrawerOpen(true)}
        onOpenMapDrawer={() => state.setIsMapDrawerOpen(true)}
        onOpenBananaDrawer={state.openBananaDrawer}
        onOpenConfigDrawer={() => state.setIsConfigDrawerOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-[1880px] mx-auto px-3.5 sm:px-5 xl:px-6 pt-3.5 space-y-4">
        <CareerWorldMapBanner
          islands={state.islands}
          activeIsland={state.activeIsland}
          onSelectIsland={(islandId) => {
            state.playSound('pop');
            state.setActiveIsland(islandId);
            state.setIsEncyclopediaDrawerOpen(true);
          }}
        />

        {/* STAFF LIST SELECTOR & AUDIT (Desktop) */}
        <div className="hidden md:block w-full space-y-3 transition-all duration-300">
          <StaffCareerSelector
            config={state.safeConfig}
            staffList={state.staffList}
            selectedStaffId={state.selectedStaffId}
            onSelectStaff={state.handleSelectStaff}
            onSyncProd={state.handleSyncProd}
            syncing={state.syncingProd}
            lastSyncedAt={state.lastSyncedAt}
            activeRoleFilter={state.activeRoleFilter}
            onRoleFilterChange={state.setActiveRoleFilter}
            activeBranchFilter={state.activeBranchFilter}
            onBranchFilterChange={state.handleBranchFilterChange}
            period={state.selectedPeriod}
            onPeriodChange={state.handlePeriodChange}
            onSetRole={state.isDanny ? state.handleSetRole : undefined}
            onDemote={state.isDanny ? state.handleDemote : undefined}
            actionLoading={state.actionLoading}
            onOpenBananaDrawer={(staffId, cat) => state.openBananaDrawer(staffId, cat)}
            selectorMode={state.selectorMode}
            onSelectorModeChange={(mode) => {
              state.setSelectorMode(mode);
            }}
            isCollapsedHorizontal={state.selectorMode !== 'table'}
            onCollapseHorizontal={() => {}}
            onExpandHorizontal={() => {
              state.setSelectorMode('table');
            }}
          />
        </div>

        {/* REAL STAFF SIMULATION CARD & ENCYCLOPEDIA (FULL WIDTH) */}
        <div className="w-full space-y-4 transition-all duration-300">
          <RealStaffSimulationCard
            status={state.selectedStaffStatus}
            config={state.safeConfig}
            sliderOrders={state.sliderOrders}
            setSliderOrders={state.setSliderOrders}
            sliderCombo={state.sliderCombo}
            setSliderCombo={state.setSliderCombo}
            onActivateTrial={state.isDanny ? state.handleActivateTrial : undefined}
            onPromote={state.isDanny ? state.handlePromote : undefined}
            onDemote={
              state.isDanny && state.selectedStaffStatus?.currentRole && state.selectedStaffStatus.currentRole !== 'CV'
                ? () =>
                    state.handleDemote(
                      state.selectedStaffId!,
                      state.selectedStaffStatus?.currentRole === 'CV_PLUS_PLUS' ? 'CV_PLUS' : 'CV'
                    )
                : undefined
            }
            onSetRole={
              state.isDanny && state.selectedStaffId
                ? (role) => state.handleSetRole(state.selectedStaffId!, role)
                : undefined
            }
            onSwitchSpecialist={state.isDanny ? state.handleSwitchSpecialist : undefined}
            loadingAction={state.actionLoading}
            simulationTarget={state.simulationTarget}
            onSimulationTargetChange={state.handleSimulationTargetChange}
            onOpenBananaDrawer={(cat) => state.openBananaDrawer(state.selectedStaffId, cat)}
            onOpenBibleTopic={(topic) => state.setSelectedBibleTopic(topic)}
          />
        </div>
      </main>

      <CareerPathDrawers
        selectedBibleTopic={state.selectedBibleTopic}
        onCloseBibleDrawer={() => state.setSelectedBibleTopic(null)}
        isMapDrawerOpen={state.isMapDrawerOpen}
        onCloseMapDrawer={() => state.setIsMapDrawerOpen(false)}
        islands={state.islands}
        activeIsland={state.activeIsland}
        onSelectMapIsland={(islandId) => {
          state.playSound('pop');
          state.setActiveIsland(islandId);
          state.setIsMapDrawerOpen(false);
          state.setIsEncyclopediaDrawerOpen(true);
        }}
        isMobileStaffDrawerOpen={state.isMobileStaffDrawerOpen}
        onCloseMobileStaffDrawer={() => state.setIsMobileStaffDrawerOpen(false)}
        safeConfig={state.safeConfig}
        staffList={state.staffList}
        selectedStaffId={state.selectedStaffId}
        activeBranchFilter={state.activeBranchFilter}
        onBranchFilterChange={state.handleBranchFilterChange}
        onSelectStaff={state.handleSelectStaff}
        isEncyclopediaDrawerOpen={state.isEncyclopediaDrawerOpen}
        onCloseEncyclopediaDrawer={() => state.setIsEncyclopediaDrawerOpen(false)}
        currentIslandData={state.currentIslandData}
        isConfigDrawerOpen={state.isConfigDrawerOpen}
        onCloseConfigDrawer={() => state.setIsConfigDrawerOpen(false)}
        onConfigChange={state.setConfig}
        onSaveConfig={state.handleSaveConfig}
        savingConfig={state.savingConfig}
        themeMode={state.themeMode}
        isDanny={state.isDanny}
        isBananaDrawerOpen={state.isBananaDrawerOpen}
        onCloseBananaDrawer={() => state.setIsBananaDrawerOpen(false)}
        selectedStaffStatus={state.selectedStaffStatus}
        bananaDrawerCategory={state.bananaDrawerCategory}
        selectedPeriod={state.selectedPeriod}
      />
    </div>
  );
}
