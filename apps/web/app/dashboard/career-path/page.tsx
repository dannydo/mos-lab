'use client';

import React, { useEffect, useState } from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import { StaffCareerSelector } from './components/StaffCareerSelector';
import { RealStaffSimulationCard } from './components/RealStaffSimulationCard';
import { useCareerPathState } from './career-path-page-modules/useCareerPathState';
import { CareerHudHeader } from './career-path-page-modules/CareerHudHeader';
import { CareerWorldMapBanner } from './career-path-page-modules/CareerWorldMapBanner';
import { CareerPathDrawers } from './career-path-page-modules/CareerPathDrawers';
import { FmSimulatorStudio } from '../../../components/fm-simulator/FmSimulatorStudio';
import { PnlSimulatorStudio } from '../../../components/fm-simulator/PnlSimulatorStudio';
import { AdminOnlyPnlGuard } from '../../../components/fm-simulator/AdminOnlyPnlGuard';

type CareerWorkspaceTab = 'cv' | 'fm' | 'pnl';

export default function CareerPathPage() {
  const state = useCareerPathState();
  const [activeTab, setActiveTab] = useState<CareerWorkspaceTab>(() => (state.initialTab === 'fm' ? 'fm' : 'cv'));

  useEffect(() => {
    if (state.initialTab === 'pnl' && state.isAdmin) {
      setActiveTab('pnl');
    } else if (state.initialTab === 'fm' && state.canUseFmSimulator) {
      setActiveTab('fm');
    }
  }, [state.initialTab, state.isAdmin, state.canUseFmSimulator]);

  useEffect(() => {
    if ((activeTab === 'pnl' && !state.isAdmin) || (activeTab === 'fm' && !state.canUseFmSimulator)) {
      setActiveTab('cv');
    }
  }, [activeTab, state.isAdmin, state.canUseFmSimulator]);

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

        {/* WORKSPACE MODE TABS: CV/CVL/CVLL ROADMAP vs FM 7★ SIMULATOR vs ADMIN-ONLY P&L */}
        {state.canUseFmSimulator || state.isAdmin ? (
          <div
            role="tablist"
            aria-label="Phân hệ Career Path"
            className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-black/5 bg-white/85 p-1.5 shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80"
          >
            <button
              role="tab"
              type="button"
              aria-selected={activeTab === 'cv'}
              onClick={() => {
                state.playSound('pop');
                setActiveTab('cv');
              }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                activeTab === 'cv'
                  ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4 text-pink-500" />
              <span>Lộ trình CV · CVL · CVLL</span>
            </button>

            {state.canUseFmSimulator ? (
              <button
                role="tab"
                type="button"
                aria-selected={activeTab === 'fm'}
                onClick={() => {
                  state.playSound('pop');
                  setActiveTab('fm');
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                  activeTab === 'fm'
                    ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Award className="h-4 w-4 text-amber-500" />
                <span>Mô Phỏng Lương FM 7★</span>
              </button>
            ) : null}

            {state.isAdmin ? (
              <button
                role="tab"
                type="button"
                aria-selected={activeTab === 'pnl'}
                onClick={() => {
                  state.playSound('pop');
                  setActiveTab('pnl');
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                  activeTab === 'pnl'
                    ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Mô Phỏng P&amp;L (Admin)</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'cv' ? (
          <>
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
                  state.isDanny &&
                  state.selectedStaffStatus?.currentRole &&
                  state.selectedStaffStatus.currentRole !== 'CV'
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
          </>
        ) : null}

        {activeTab === 'fm' && state.canUseFmSimulator ? <FmSimulatorStudio embedded /> : null}

        {activeTab === 'pnl' && state.isAdmin ? (
          <AdminOnlyPnlGuard guardPathname="/dashboard/pnl-simulator">
            <PnlSimulatorStudio embedded />
          </AdminOnlyPnlGuard>
        ) : null}
      </main>

      <CareerPathDrawers
        onOpenFmSimulator={
          state.canUseFmSimulator
            ? () => {
                state.setIsEncyclopediaDrawerOpen(false);
                setActiveTab('fm');
              }
            : undefined
        }
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
