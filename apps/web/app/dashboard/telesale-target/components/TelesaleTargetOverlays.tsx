'use client';

import type { TelesalePipelineStage, TelesaleTargetOverview } from '@mos-lab/shared';
import type { useTelesaleTvLiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';
import { CustomerPoolDrawer } from './CustomerPoolDrawer';
import { PlanCloneModal } from './PlanCloneModal';
import { TargetConfigModal } from './TargetConfigModal';
import { TeamSelectModal } from './TeamSelectModal';
import { TelesaleTvMonitorFullscreen } from './TelesaleTvMonitorFullscreen';
import { TelesaleTvQuotesDrawer } from './TelesaleTvQuotesDrawer';

interface TelesaleTargetOverlaysProps {
  selectedMonth: string;
  availableMonths: string[];
  overview: TelesaleTargetOverview | null;
  refreshing: boolean;
  drawerOpen: boolean;
  selectedStage: TelesalePipelineStage | null;
  configModalOpen: boolean;
  cloneModalOpen: boolean;
  teamSelectModalOpen: boolean;
  quotesDrawerOpen: boolean;
  tvModeOpen: boolean;
  liveCelebration: ReturnType<typeof useTelesaleTvLiveCelebration>;
  onCloseDrawer: () => void;
  onCloseConfigModal: () => void;
  onCloseCloneModal: () => void;
  onCloseTeamSelectModal: () => void;
  onCloseQuotesDrawer: () => void;
  onCloseTvMode: () => void;
  onCloneSuccess: (clonedMonth: string) => void;
  onRefresh: () => Promise<void>;
}

export function TelesaleTargetOverlays({
  selectedMonth,
  availableMonths,
  overview,
  refreshing,
  drawerOpen,
  selectedStage,
  configModalOpen,
  cloneModalOpen,
  teamSelectModalOpen,
  quotesDrawerOpen,
  tvModeOpen,
  liveCelebration,
  onCloseDrawer,
  onCloseConfigModal,
  onCloseCloneModal,
  onCloseTeamSelectModal,
  onCloseQuotesDrawer,
  onCloseTvMode,
  onCloneSuccess,
  onRefresh,
}: TelesaleTargetOverlaysProps) {
  return (
    <>
      {/* 4. SIDE DRAWER: CUSTOMER POOL DETAILS & 1-CLICK CALL */}
      <CustomerPoolDrawer
        open={drawerOpen}
        onClose={onCloseDrawer}
        stage={selectedStage}
        currentUserRole="admin"
        staffList={overview?.staffTargets || []}
      />

      {/* 5. MODAL: KPI TARGET CONFIGURATION */}
      <TargetConfigModal
        open={configModalOpen}
        onClose={onCloseConfigModal}
        overview={overview}
        onSuccess={onRefresh}
      />

      {/* 6. MODAL: PLAN CLONE (ANY MONTH) */}
      <PlanCloneModal
        open={cloneModalOpen}
        onClose={onCloseCloneModal}
        currentMonth={selectedMonth}
        availableMonths={availableMonths}
        overview={overview}
        onSuccess={onCloneSuccess}
      />

      {/* 7. MODAL: SELECT TEAM (MOS-BUG-93) */}
      <TeamSelectModal
        open={teamSelectModalOpen}
        onClose={onCloseTeamSelectModal}
        currentMonth={selectedMonth}
        overview={overview}
        onSuccess={onRefresh}
      />

      {/* 8. TV QUOTES MANAGER DRAWER */}
      <TelesaleTvQuotesDrawer open={quotesDrawerOpen} onClose={onCloseQuotesDrawer} zIndex={100010} />

      {/* 7. DEDICATED FULLSCREEN TV MONITOR VIEW (MOS-BUG-71) */}
      {overview && (
        <TelesaleTvMonitorFullscreen
          overview={overview}
          open={tvModeOpen}
          onClose={onCloseTvMode}
          onRefresh={onRefresh}
          refreshing={refreshing}
          liveCelebration={liveCelebration}
        />
      )}
    </>
  );
}
