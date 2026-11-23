'use client';

import React from 'react';
import { SafetyDraftSopSection } from './pilot-safety-risk-sop-detail/SafetyDraftSopSection';
import { SafetyIncidentModals } from './pilot-safety-risk-sop-detail/SafetyIncidentModals';
import { SafetyPart1MucosaProtectionSection } from './pilot-safety-risk-sop-detail/SafetyPart1MucosaProtectionSection';
import { SafetyPart2SensitiveReactionSection } from './pilot-safety-risk-sop-detail/SafetyPart2SensitiveReactionSection';
import { SafetyPart3IncidentSection } from './pilot-safety-risk-sop-detail/SafetyPart3IncidentSection';
import { SafetySopEditModals } from './pilot-safety-risk-sop-detail/SafetySopEditModals';
import { SafetySopHeaderAndTabs } from './pilot-safety-risk-sop-detail/SafetySopHeaderAndTabs';
import type {
  IncidentReport,
  PilotSafetyRiskSopDetailProps,
  SafetyAttachment,
  SafetyControlPoint,
  SafetyStageRule,
  SensitiveReactionCase,
} from './pilot-safety-risk-sop-detail/safety-risk-types';
import { usePilotSafetyRiskSop } from './pilot-safety-risk-sop-detail/usePilotSafetyRiskSop';

export type {
  PilotSafetyRiskSopDetailProps,
  SafetyStageRule,
  SafetyControlPoint,
  SafetyAttachment,
  SensitiveReactionCase,
  IncidentReport,
};

export function PilotSafetyRiskSopDetail({ onBack, sessions = [] }: PilotSafetyRiskSopDetailProps) {
  const {
    activeTab,
    setActiveTab,
    isExpertApproved,
    expertNote,
    stageRules,
    controlPoints,
    attachments,
    sensitiveCases,
    incidents,
    pilotStats,
    isAddIncidentModalOpen,
    setIsAddIncidentModalOpen,
    isAddAttachmentModalOpen,
    setIsAddAttachmentModalOpen,
    isEditStageModalOpen,
    editingStage,
    isEditCaseModalOpen,
    editingCase,
    selectedIncidentDetail,
    setSelectedIncidentDetail,
    incidentForm,
    attachmentForm,
    stageForm,
    caseForm,
    handleToggleControlPoint,
    handleOpenCreateIncidentModal,
    handleCreateIncident,
    handleUpdateFollowUp,
    handleAddAttachment,
    handleOpenEditStageModal,
    handleCloseEditStageModal,
    handleSaveStageRule,
    handleOpenEditCaseModal,
    handleCloseEditCaseModal,
    handleSaveSensitiveCase,
    handleToggleExpertApproval,
    handleConfirmExpertApproval,
    handlePrintSop,
  } = usePilotSafetyRiskSop(sessions);

  return (
    <div className="space-y-5 antialiased" data-testid="pilot-safety-risk-sop-detail">
      <SafetySopHeaderAndTabs
        onBack={onBack}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isExpertApproved={isExpertApproved}
        onToggleApproval={handleToggleExpertApproval}
        onPrintSop={handlePrintSop}
        totalPilotSessions={pilotStats.totalPilotSessions}
      />

      {(activeTab === 'overview' || activeTab === 'part1') && (
        <SafetyPart1MucosaProtectionSection
          stageRules={stageRules}
          controlPoints={controlPoints}
          attachments={attachments}
          onToggleControlPoint={handleToggleControlPoint}
          onOpenAddAttachment={() => setIsAddAttachmentModalOpen(true)}
          onEditStage={handleOpenEditStageModal}
        />
      )}

      {(activeTab === 'overview' || activeTab === 'part2') && (
        <SafetyPart2SensitiveReactionSection sensitiveCases={sensitiveCases} onEditCase={handleOpenEditCaseModal} />
      )}

      {(activeTab === 'overview' || activeTab === 'part3') && (
        <SafetyPart3IncidentSection
          incidents={incidents}
          onOpenCreateIncident={handleOpenCreateIncidentModal}
          onUpdateFollowUp={handleUpdateFollowUp}
          onSelectIncidentDetail={setSelectedIncidentDetail}
        />
      )}

      {(activeTab === 'overview' || activeTab === 'draft') && (
        <SafetyDraftSopSection
          isExpertApproved={isExpertApproved}
          expertNote={expertNote}
          onPrintSop={handlePrintSop}
          onConfirmApproval={handleConfirmExpertApproval}
        />
      )}

      <SafetyIncidentModals
        isAddIncidentModalOpen={isAddIncidentModalOpen}
        onCancelAddIncident={() => setIsAddIncidentModalOpen(false)}
        incidentForm={incidentForm}
        onCreateIncident={handleCreateIncident}
        sessions={sessions}
        selectedIncidentDetail={selectedIncidentDetail}
        onCloseIncidentDetail={() => setSelectedIncidentDetail(null)}
      />

      <SafetySopEditModals
        isAddAttachmentModalOpen={isAddAttachmentModalOpen}
        onCancelAddAttachment={() => setIsAddAttachmentModalOpen(false)}
        attachmentForm={attachmentForm}
        onAddAttachment={handleAddAttachment}
        isEditStageModalOpen={isEditStageModalOpen}
        editingStage={editingStage}
        onCancelEditStage={handleCloseEditStageModal}
        stageForm={stageForm}
        onSaveStageRule={handleSaveStageRule}
        isEditCaseModalOpen={isEditCaseModalOpen}
        editingCase={editingCase}
        onCancelEditCase={handleCloseEditCaseModal}
        caseForm={caseForm}
        onSaveSensitiveCase={handleSaveSensitiveCase}
      />
    </div>
  );
}

export default PilotSafetyRiskSopDetail;
