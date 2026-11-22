'use client';

import React from 'react';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import {
  SOP_PREP_CRITERIA_TOTAL,
  type SopPrepCategory1DetailViewProps,
} from './sop-prep-category1-detail-view/sop-prep-category1-helpers';
import { useSopPrepCategory1Detail } from './sop-prep-category1-detail-view/useSopPrepCategory1Detail';
import { SopPrepOverviewHeader } from './sop-prep-category1-detail-view/SopPrepOverviewHeader';
import { SopPrepCriteriaTabs } from './sop-prep-category1-detail-view/SopPrepCriteriaTabs';
import { SopPrepCriterionFormCard } from './sop-prep-category1-detail-view/SopPrepCriterionFormCard';
import { SopPrepEvidenceSection } from './sop-prep-category1-detail-view/SopPrepEvidenceSection';
import { SopPrepEvidencePreviewModal } from './sop-prep-category1-detail-view/SopPrepEvidencePreviewModal';

export type { SopPrepCategory1DetailViewProps };

export function SopPrepCategory1DetailView({ onBack }: SopPrepCategory1DetailViewProps) {
  const {
    loading,
    saving,
    uploading,
    doc,
    activeCriterionId,
    setActiveCriterionId,
    activeCriterion,
    totalEvidenceCount,
    knowledgeText,
    setKnowledgeText,
    practicalText,
    setPracticalText,
    groundsText,
    setGroundsText,
    selectedFile,
    uploadDescription,
    setUploadDescription,
    uploadOrigin,
    setUploadOrigin,
    uploadSessionCode,
    setUploadSessionCode,
    previewFile,
    previewOpen,
    fileInputId,
    handleSaveCurrentCriterion,
    handleSaveAll,
    handleFileChange,
    handleUploadEvidence,
    handleDeleteEvidence,
    openPreview,
    closePreview,
    goToPreviousCriterion,
    goToNextCriterion,
  } = useSopPrepCategory1Detail();

  return (
    <div className="space-y-4 antialiased" data-testid="sop-prep-detail-view">
      <SopPrepOverviewHeader
        lastUpdatedAt={doc.lastUpdatedAt}
        totalEvidenceCount={totalEvidenceCount}
        saving={saving}
        onBack={onBack}
        onSaveAll={handleSaveAll}
      />

      <SopPrepCriteriaTabs
        criteria={doc.criteria}
        activeCriterionId={activeCriterionId}
        onSelectCriterion={setActiveCriterionId}
      />

      {/* Active Criterion Editing Workspace */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <AppIcon icon={Loader2} size={28} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : activeCriterion ? (
        <div className="space-y-4" data-testid={`sop-prep-workspace-criterion-${activeCriterion.id}`}>
          <SopPrepCriterionFormCard
            criterion={activeCriterion}
            knowledgeText={knowledgeText}
            practicalText={practicalText}
            groundsText={groundsText}
            saving={saving}
            onKnowledgeChange={setKnowledgeText}
            onPracticalChange={setPracticalText}
            onGroundsChange={setGroundsText}
            onSaveCriterion={handleSaveCurrentCriterion}
          />

          <SopPrepEvidenceSection
            criterion={activeCriterion}
            fileInputId={fileInputId}
            selectedFile={selectedFile}
            uploadDescription={uploadDescription}
            uploadOrigin={uploadOrigin}
            uploadSessionCode={uploadSessionCode}
            uploading={uploading}
            onFileChange={handleFileChange}
            onUploadDescriptionChange={setUploadDescription}
            onUploadOriginChange={setUploadOrigin}
            onUploadSessionCodeChange={setUploadSessionCode}
            onUploadEvidence={handleUploadEvidence}
            onPreviewFile={openPreview}
            onDeleteEvidence={handleDeleteEvidence}
          />

          {/* Bottom Navigation between 5 criteria */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Button
              disabled={activeCriterionId <= 1}
              onClick={goToPreviousCriterion}
              icon={<AppIcon icon={ChevronLeft} size={15} />}
              className="rounded-xl text-xs font-medium h-8"
            >
              Tiêu chí trước
            </Button>

            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Tiêu chí {activeCriterionId} / {SOP_PREP_CRITERIA_TOTAL}
            </span>

            <Button
              disabled={activeCriterionId >= SOP_PREP_CRITERIA_TOTAL}
              onClick={goToNextCriterion}
              className="rounded-xl text-xs font-medium h-8 flex items-center gap-1"
            >
              <span>Tiêu chí tiếp</span>
              <AppIcon icon={ChevronRight} size={15} />
            </Button>
          </div>
        </div>
      ) : null}

      <SopPrepEvidencePreviewModal open={previewOpen} file={previewFile} onClose={closePreview} />
    </div>
  );
}
