'use client';

import React from 'react';
import { CriteriaChecklistSection } from './pilot-criteria-sop-detail/CriteriaChecklistSection';
import { CriteriaDecisionMatrixSection } from './pilot-criteria-sop-detail/CriteriaDecisionMatrixSection';
import { CriteriaEvidenceSection } from './pilot-criteria-sop-detail/CriteriaEvidenceSection';
import { CriteriaExpertSignOffSection } from './pilot-criteria-sop-detail/CriteriaExpertSignOffSection';
import { CriteriaPhotoPreviewModal } from './pilot-criteria-sop-detail/CriteriaPhotoPreviewModal';
import { CriteriaQuickDecisionFlow } from './pilot-criteria-sop-detail/CriteriaQuickDecisionFlow';
import { CriteriaSopHeaderBanner } from './pilot-criteria-sop-detail/CriteriaSopHeaderBanner';
import type {
  CriterionShortName,
  EvidenceFilterType,
  GlossaryTermItem,
  PilotCriteriaSopDetailProps,
  PilotCriteriaStats,
  PilotEvidenceItem,
  PreviewPhotoState,
  SopCriterionDetail,
} from './pilot-criteria-sop-detail/pilot-criteria-sop.types';
import { usePilotCriteriaSop } from './pilot-criteria-sop-detail/usePilotCriteriaSop';

export type {
  PilotCriteriaSopDetailProps,
  SopCriterionDetail,
  PilotEvidenceItem,
  GlossaryTermItem,
  CriterionShortName,
  EvidenceFilterType,
  PreviewPhotoState,
  PilotCriteriaStats,
};

export function PilotCriteriaSopDetail({
  onBack,
  onOpenCriteriaModal,
  onOpenSopModal,
  sessions,
  onOpenSessionFlow,
}: PilotCriteriaSopDetailProps) {
  const {
    expandedCriteria,
    expandedDeepDives,
    showGlossary,
    evidenceFilter,
    searchQuery,
    previewPhoto,
    filteredSessions,
    stats,
    toggleCriterion,
    expandAllCriteria,
    collapseAllCriteria,
    toggleDeepDive,
    toggleGlossary,
    setEvidenceFilter,
    setSearchQuery,
    setPreviewPhoto,
    closePreviewPhoto,
  } = usePilotCriteriaSop(sessions);

  return (
    <div className="space-y-6 antialiased" data-testid="pilot-criteria-sop-detail">
      <CriteriaSopHeaderBanner
        onBack={onBack}
        onOpenCriteriaModal={onOpenCriteriaModal}
        onOpenSopModal={onOpenSopModal}
        showGlossary={showGlossary}
        onToggleGlossary={toggleGlossary}
        passRate={stats.passRate}
      />

      <CriteriaQuickDecisionFlow />

      <CriteriaChecklistSection
        expandedCriteria={expandedCriteria}
        expandedDeepDives={expandedDeepDives}
        onExpandAll={expandAllCriteria}
        onCollapseAll={collapseAllCriteria}
        onToggleCriterion={toggleCriterion}
        onToggleDeepDive={toggleDeepDive}
        onPreviewPhoto={setPreviewPhoto}
      />

      <CriteriaDecisionMatrixSection />

      <CriteriaEvidenceSection
        filteredSessions={filteredSessions}
        stats={stats}
        evidenceFilter={evidenceFilter}
        searchQuery={searchQuery}
        onFilterChange={setEvidenceFilter}
        onSearchChange={setSearchQuery}
        onPreviewPhoto={setPreviewPhoto}
        onOpenSessionFlow={onOpenSessionFlow}
      />

      <CriteriaExpertSignOffSection />

      <CriteriaPhotoPreviewModal previewPhoto={previewPhoto} onClose={closePreviewPhoto} />
    </div>
  );
}

export default PilotCriteriaSopDetail;
