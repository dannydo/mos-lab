'use client';

import React from 'react';
import { canSwitchIosBranch } from '@mos-lab/shared';
import type { useIosAppState } from '../state/useIosAppState';
import { IosProfileMenuSheet } from './ui-kit/IosProfileMenuSheet';
import { IosSimulationWorkspaceBar } from './simulation/IosSimulationWorkspaceBar';
import { IosSimulationHistorySheet } from './simulation/IosSimulationHistorySheet';
import { IosCreateBookingSheet } from './modals/booking/IosCreateBookingSheet';

interface IosAppGlobalOverlaysProps {
  state: ReturnType<typeof useIosAppState>;
  isProfileSheetOpen: boolean;
  setIsProfileSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}

export function IosAppGlobalOverlays({
  state,
  isProfileSheetOpen,
  setIsProfileSheetOpen,
  children,
}: IosAppGlobalOverlaysProps) {
  const handleOpenChat = () => {
    setIsProfileSheetOpen(false);
    const chatUrl = '/chat';
    const win = window.open(chatUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = chatUrl;
    }
  };

  const handleOpenCareer = () => {
    setIsProfileSheetOpen(false);
    const staffIdParam = state.actor?.staffId ? `?staffId=${state.actor.staffId}` : '';
    const careerUrl = `/dashboard/career-path${staffIdParam}`;
    const win = window.open(careerUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = careerUrl;
    }
  };

  const handleLogout = () => {
    setIsProfileSheetOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mos_token');
      window.localStorage.removeItem('mos_user');
      window.localStorage.removeItem('mos_omicall_auto_init');
      window.localStorage.removeItem('mos_original_token');
      window.localStorage.removeItem('mos_original_user');
      window.localStorage.removeItem('mos_original_omicall_auto_init');
      window.localStorage.removeItem('mos_impersonation_audit_id');
      window.location.replace('/login');
    }
  };

  return (
    <>
      <IosSimulationWorkspaceBar
        isSimulationMode={state.isSimulationMode}
        isReadOnlyMentorView={state.isReadOnlyMentorView}
        simulationActorStaffName={state.simulationActorStaffName}
        menteesList={state.menteesList}
        selectedMenteeStaffId={state.selectedMenteeStaffId}
        onSelectMentee={state.selectMenteeStaffId}
        activeBooking={state.activeBooking}
        currentStep={state.currentStep}
        isBusy={state.isSimActionBusy}
        simActionError={state.simActionError}
        onDismissError={() => state.setSimActionError(null)}
        onOpenHistory={state.openHistoryForBooking}
        onRevertConsultation={state.handleSimRevertConsultation}
        onResetToIncoming={state.handleSimResetToIncoming}
        onExitSimulation={state.toggleSimulationMode}
      />

      {children}

      {/* iOS Native Profile & Admin Switch Action Sheet */}
      <IosProfileMenuSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        actor={state.actor}
        role={state.role}
        canSwitchRole={state.canSwitchRole}
        currentBranch={state.currentBranch}
        selectedStoreId={state.selectedStoreId}
        onSelectBranch={
          canSwitchIosBranch({ isAdmin: state.isAdmin, iosRole: state.role }) ? state.setSelectedStoreId : undefined
        }
        availableBranches={state.availableBranches}
        isAdmin={state.isAdmin}
        isSimulationMode={state.isSimulationMode}
        onToggleSimulationMode={state.toggleSimulationMode}
        menteesList={state.menteesList}
        selectedMenteeStaffId={state.selectedMenteeStaffId}
        onSelectMentee={state.selectMenteeStaffId}
        onOpenCreateBooking={!state.isReadOnlyMentorView ? () => state.setIsCreateBookingOpen(true) : undefined}
        onRoleChange={(r) => {
          state.setRole(r);
          setIsProfileSheetOpen(false);
        }}
        onOpenPaystub={() => {
          state.setActiveTab('paystub');
          setIsProfileSheetOpen(false);
        }}
        onOpenChat={handleOpenChat}
        onOpenCareer={handleOpenCareer}
        onLogout={handleLogout}
      />

      <IosCreateBookingSheet
        isOpen={state.isCreateBookingOpen}
        onClose={() => state.setIsCreateBookingOpen(false)}
        isSimulationMode={state.isSimulationMode}
        selectedStoreId={state.selectedStoreId}
        branchName={state.currentBranch?.name}
        targetDate={state.targetDateStr}
        actorStaffId={state.actor?.staffId}
        onCreated={state.handleBookingCreated}
      />

      <IosSimulationHistorySheet
        isOpen={state.isHistorySheetOpen}
        onClose={() => state.setIsHistorySheetOpen(false)}
        booking={state.bookings.find((b) => Number(b.id) === Number(state.historyBookingId)) || state.activeBooking}
        attempts={state.historyBookingId ? state.attemptsByBookingId[state.historyBookingId] || [] : []}
        isLoading={state.historyLoading}
        error={state.historyError}
        isReadOnly={state.isReadOnlyMentorView}
        isBusy={state.isSimActionBusy}
        onRetryLoad={() => {
          if (state.historyBookingId) {
            void state.loadAttemptsForBooking(state.historyBookingId);
          }
        }}
        onRevertConsultation={state.handleSimRevertConsultation}
        onResetToIncoming={state.handleSimResetToIncoming}
        onUpdateAttempt={state.handleUpdateSimulationAttempt}
        onApplyAttempt={state.handleApplyAttemptToWorkspace}
      />
    </>
  );
}
