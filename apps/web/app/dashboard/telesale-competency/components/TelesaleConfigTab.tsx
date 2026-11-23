'use client';

import React from 'react';
import type { TelesaleConfigTabProps } from './telesale-config-tab/telesaleConfigHelpers';
import { useTelesaleConfigState } from './telesale-config-tab/useTelesaleConfigState';
import { VersionSelectorBar } from './telesale-config-tab/VersionSelectorBar';
import { VersionMetadataCard } from './telesale-config-tab/VersionMetadataCard';
import { PillarsWeightCard } from './telesale-config-tab/PillarsWeightCard';
import { PillarAKpiSection } from './telesale-config-tab/PillarAKpiSection';
import { LevelTargetsCard } from './telesale-config-tab/LevelTargetsCard';
import { TierRulesSection } from './telesale-config-tab/TierRulesSection';
import { ConfigActionFloatingBar } from './telesale-config-tab/ConfigActionFloatingBar';
import { PreviewCalculationModal } from './telesale-config-tab/PreviewCalculationModal';
import {
  DeleteDraftModal,
  PublishConfigModal,
  ValidationResultModal,
} from './telesale-config-tab/ConfigLifecycleModals';

export type { TelesaleConfigTabProps };

export function TelesaleConfigTab({ currentMonth }: TelesaleConfigTabProps) {
  const {
    versions,
    selectedVersionId,
    currentConfig,
    setCurrentConfig,
    loading,
    saving,
    publishing,
    isDraft,
    pillarsSum,
    validationResult,
    isValidationModalOpen,
    setIsValidationModalOpen,
    previewResult,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    previewLoading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isPublishModalOpen,
    setIsPublishModalOpen,
    publishEffectiveMonth,
    setPublishEffectiveMonth,
    handleSelectVersion,
    handleCreateDraft,
    handleSaveDraft,
    handleDeleteDraftConfirm,
    handleValidate,
    handlePreview,
    handlePublish,
    openPublishModal,
    updatePillarWeight,
    updatePillarAConfig,
    updateLevelTarget,
    updateTierRule,
  } = useTelesaleConfigState(currentMonth);

  return (
    <div className="space-y-6">
      <VersionSelectorBar
        versions={versions}
        selectedVersionId={selectedVersionId}
        currentConfig={currentConfig}
        loading={loading}
        saving={saving}
        isDraft={isDraft}
        onSelectVersion={handleSelectVersion}
        onCreateDraft={handleCreateDraft}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <VersionMetadataCard currentConfig={currentConfig} isDraft={isDraft} onChangeConfig={setCurrentConfig} />

          <PillarsWeightCard
            pillarsWeight={currentConfig.pillarsWeight}
            pillarsSum={pillarsSum}
            isDraft={isDraft}
            onChangePillarWeight={updatePillarWeight}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <PillarAKpiSection
            pillarAConfig={currentConfig.pillarAConfig}
            pillarAWeight={currentConfig.pillarsWeight.pillarAWeight}
            isDraft={isDraft}
            onUpdatePillarAConfig={updatePillarAConfig}
          />

          <LevelTargetsCard
            levelTargets={currentConfig.levelTargets}
            isDraft={isDraft}
            onUpdateLevelTarget={updateLevelTarget}
          />

          <TierRulesSection tierRules={currentConfig.tierRules} isDraft={isDraft} onUpdateTierRule={updateTierRule} />

          <ConfigActionFloatingBar
            isDraft={isDraft}
            saving={saving}
            previewLoading={previewLoading}
            onValidate={handleValidate}
            onPreview={handlePreview}
            onSaveDraft={handleSaveDraft}
            onOpenPublishModal={openPublishModal}
          />
        </div>
      </div>

      <ValidationResultModal
        open={isValidationModalOpen}
        validationResult={validationResult}
        onClose={() => setIsValidationModalOpen(false)}
      />

      <DeleteDraftModal
        open={isDeleteModalOpen}
        configName={currentConfig.name}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDraftConfirm}
      />

      <PreviewCalculationModal
        open={isPreviewModalOpen}
        currentMonth={currentMonth}
        previewResult={previewResult}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      <PublishConfigModal
        open={isPublishModalOpen}
        configName={currentConfig.name}
        publishEffectiveMonth={publishEffectiveMonth}
        publishing={publishing}
        onChangeEffectiveMonth={setPublishEffectiveMonth}
        onCancel={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublish}
      />
    </div>
  );
}
