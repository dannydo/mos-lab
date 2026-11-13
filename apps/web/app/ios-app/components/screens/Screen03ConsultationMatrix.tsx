'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { ComboWalletDetailModal } from '../ui-kit/ComboWalletDetailModal';
import type { Screen03ConsultationMatrixProps } from './consultation/ConsultationTypes';
import { useLashDesignSelection } from './consultation/useLashDesignSelection';
import { useNaturalLashDiagnostic } from './consultation/useNaturalLashDiagnostic';
import { useConsultationPricingAndSave } from './consultation/useConsultationPricingAndSave';
import { ConsultationAutoSaveButton, ConsultationHeaderAndTabs } from './consultation/ConsultationHeaderAndTabs';
import { ConsultationServiceAndUpgradeCard } from './consultation/ConsultationServiceAndUpgradeCard';
import { LashMaterialAndDesignSteps } from './consultation/LashMaterialAndDesignSteps';
import { LashTechnicalSpecsStep } from './consultation/LashTechnicalSpecsStep';
import { LashVolumeColorAndUnderMinkSection } from './consultation/LashVolumeColorAndUnderMinkSection';
import { NaturalLashMeasurementsCard } from './consultation/NaturalLashMeasurementsCard';
import { NaturalLashEyeHealthAndGoldenRatio } from './consultation/NaturalLashEyeHealthAndGoldenRatio';
import { ConsultationNotesAndFooterPanel } from './consultation/ConsultationNotesAndFooterPanel';
import { ConsultationModalsCluster } from './consultation/ConsultationModalsCluster';

export type { Screen03ConsultationMatrixProps } from './consultation/ConsultationTypes';

export function Screen03ConsultationMatrix({
  booking,
  actor,
  isAdmin = false,
  onRefreshDb,
  onBack,
  onSave,
  onUpdateAvatar,
  onAutoSaveDraft,
}: Screen03ConsultationMatrixProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const design = useLashDesignSelection(booking);
  const diagnostic = useNaturalLashDiagnostic({
    booking,
    selectedLength: design.selectedLength,
    selectedThickness: design.selectedThickness,
    setSelectedStyle: design.setSelectedStyle,
    setSelectedCurl: design.setSelectedCurl,
    setSelectedThickness: design.setSelectedThickness,
    setSelectedLengths: design.setSelectedLengths,
  });
  const pricing = useConsultationPricingAndSave({
    booking,
    actor,
    onSave,
    onAutoSaveDraft,
    design,
    diagnostic,
  });

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden select-none transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-neutral-900'
      }`}
    >
      <IosNavigationBar
        title="Tư Vấn Dáng Mi"
        onBack={onBack}
        backTitle="Check In"
        rightAction={
          <ConsultationAutoSaveButton
            saveStatus={pricing.saveStatus}
            isDark={isDark}
            onManualSaveClick={pricing.handleManualSaveClick}
          />
        }
      />

      <div ref={diagnostic.scrollContainerRef} className="flex-1 px-3.5 py-2.5 space-y-3 overflow-y-auto pb-8">
        <ConsultationHeaderAndTabs
          isDark={isDark}
          booking={booking}
          customerName={pricing.customerName}
          customerPhone={pricing.customerPhone}
          serviceName={pricing.serviceName}
          actorName={pricing.actorName}
          avatarRingClass={pricing.avatarRingClass}
          onUpdateAvatar={onUpdateAvatar}
          isNewClient={diagnostic.isNewClient}
          mustCompleteNaturalLashBeforeProceeding={diagnostic.mustCompleteNaturalLashBeforeProceeding}
          showMandatoryLashCheckAlert={diagnostic.showMandatoryLashCheckAlert}
          isNaturalLashComplete={diagnostic.isNaturalLashComplete}
          missingNaturalLashFields={diagnostic.missingNaturalLashFields}
          completedNaturalLashCount={diagnostic.completedNaturalLashCount}
          naturalCountLabel={diagnostic.naturalCountLabel}
          naturalLengthLabel={diagnostic.naturalLengthLabel}
          naturalThicknessLabel={diagnostic.naturalThicknessLabel}
          activeSubTab={diagnostic.activeSubTab}
          setActiveSubTab={diagnostic.setActiveSubTab}
          triggerMandatoryLashCheckGuard={diagnostic.triggerMandatoryLashCheckGuard}
        />

        {diagnostic.activeSubTab === 'SPECS' && (
          <div className="space-y-3.5">
            <ConsultationServiceAndUpgradeCard
              isDark={isDark}
              isComboLive={design.isComboLive}
              comboName={design.comboName}
              daysSinceLastVisit={design.daysSinceLastVisit}
              isWithin25Days={design.isWithin25Days}
              comboNormalRemaining={design.comboNormalRemaining}
              comboRetainRemaining={design.comboRetainRemaining}
              comboRemainingSessions={design.comboRemainingSessions}
              hasComboNormalRemaining={design.hasComboNormalRemaining}
              hasComboRetainRemaining={design.hasComboRetainRemaining}
              currentMaterialSpec={design.currentMaterialSpec}
              isAlwaysFullSet={design.isAlwaysFullSet}
              selectedVolume={design.selectedVolume}
              selectedCount={design.selectedCount}
              lastVisitDate={design.lastVisitDate}
              selectedStyle={design.selectedStyle}
              selectedCurl={design.selectedCurl}
              selectedThickness={design.selectedThickness}
              selectedLength={design.selectedLength}
              hasUnderMink={design.hasUnderMink}
              setHasUnderMink={design.setHasUnderMink}
              underMinkCurl={design.underMinkCurl}
              setUnderMinkCurl={design.setUnderMinkCurl}
              underMinkLength={design.underMinkLength}
              setUnderMinkLength={design.setUnderMinkLength}
              underMinkCount={design.underMinkCount}
              setUnderMinkCount={design.setUnderMinkCount}
              underMinkServiceType={design.underMinkServiceType}
              setUnderMinkServiceType={design.setUnderMinkServiceType}
              hasUnderMinkCombo={design.hasUnderMinkCombo}
              underComboNormalRemaining={design.underComboNormalRemaining}
              underComboRetainRemaining={design.underComboRetainRemaining}
              isOverridden={design.isOverridden}
              overrideReason={design.overrideReason}
              handleRestoreAutoRule={design.handleRestoreAutoRule}
              serviceType={design.serviceType}
              handleRequestServiceTypeChange={design.handleRequestServiceTypeChange}
              totalUpgradeAmount={pricing.totalUpgradeAmount}
              comboBaseServicePrice={pricing.comboBaseServicePrice}
              comboBaseRetainPrice={pricing.comboBaseRetainPrice}
              upgradeScope={pricing.upgradeScope}
              setUpgradeScope={pricing.setUpgradeScope}
              retainUpgradeMode={pricing.retainUpgradeMode}
              setRetainUpgradeMode={pricing.setRetainUpgradeMode}
              cleanServiceName={pricing.cleanServiceName}
              livePricingAndCvPoints={pricing.livePricingAndCvPoints}
              normalUpgradeDiff={pricing.normalUpgradeDiff}
              retainUpgradeDiff={pricing.retainUpgradeDiff}
              comboPurchaseTotal={pricing.comboPurchaseTotal}
              selectedNewComboPkg={pricing.selectedNewComboPkg}
              setSelectedNewComboPkg={pricing.setSelectedNewComboPkg}
              selectedUnderComboPkg={pricing.selectedUnderComboPkg}
              setSelectedUnderComboPkg={pricing.setSelectedUnderComboPkg}
              comboLiveStatus={booking?.comboLiveStatus}
              onOpenWalletModal={() => setIsWalletModalOpen(true)}
              upperTodayUsageMode={pricing.upperTodayUsageMode}
              setUpperTodayUsageMode={pricing.setUpperTodayUsageMode}
              underTodayUsageMode={pricing.underTodayUsageMode}
              setUnderTodayUsageMode={pricing.setUnderTodayUsageMode}
              selectedUpperExpiry={pricing.selectedUpperExpiry}
              selectedUnderExpiry={pricing.selectedUnderExpiry}
              showStaffRewards={design.showStaffRewards}
              setShowStaffRewards={design.setShowStaffRewards}
              handleOpenComboModal={pricing.handleOpenComboModal}
              handleSubmit={pricing.handleSubmit}
            />

            <LashMaterialAndDesignSteps
              isDark={isDark}
              isSuperAdmin={design.isSuperAdmin}
              materialCatalog={design.materialCatalog}
              selectedMaterial={design.selectedMaterial}
              currentMaterialSpec={design.currentMaterialSpec}
              selectedStyle={design.selectedStyle}
              setSelectedStyle={design.setSelectedStyle}
              setZoomDesignId={design.setZoomDesignId}
              setIsCompareDesignsOpen={design.setIsCompareDesignsOpen}
              setInfoModalKey={design.setInfoModalKey}
              setIsConfiguratorOpen={design.setIsConfiguratorOpen}
              handleSelectMaterial={design.handleSelectMaterial}
            />

            <LashTechnicalSpecsStep
              isDark={isDark}
              currentMaterialSpec={design.currentMaterialSpec}
              naturalLengthLabel={diagnostic.naturalLengthLabel}
              naturalThicknessLabel={diagnostic.naturalThicknessLabel}
              naturalCountLabel={diagnostic.naturalCountLabel}
              naturalLengthSpec={diagnostic.naturalLengthSpec}
              setActiveSubTab={diagnostic.setActiveSubTab}
              setInfoModalKey={design.setInfoModalKey}
              selectedCurl={design.selectedCurl}
              setSelectedCurl={design.setSelectedCurl}
              setZoomCurlId={design.setZoomCurlId}
              setIsCurlZoomOpen={design.setIsCurlZoomOpen}
              selectedThickness={design.selectedThickness}
              setSelectedThickness={design.setSelectedThickness}
              thicknessWarning={diagnostic.thicknessWarning}
              selectedLengths={design.selectedLengths}
              handleToggleLength={design.handleToggleLength}
              lengthWarning={diagnostic.lengthWarning}
            >
              <LashVolumeColorAndUnderMinkSection
                isDark={isDark}
                currentMaterialSpec={design.currentMaterialSpec}
                selectedVolume={design.selectedVolume}
                setSelectedVolume={design.setSelectedVolume}
                serviceType={design.serviceType}
                selectedCount={design.selectedCount}
                setSelectedCount={design.setSelectedCount}
                selectedColors={design.selectedColors}
                setSelectedColors={design.setSelectedColors}
                hasUnderMink={design.hasUnderMink}
                setHasUnderMink={design.setHasUnderMink}
                underMinkCurl={design.underMinkCurl}
                setUnderMinkCurl={design.setUnderMinkCurl}
                underMinkLength={design.underMinkLength}
                setUnderMinkLength={design.setUnderMinkLength}
                underMinkCount={design.underMinkCount}
                setUnderMinkCount={design.setUnderMinkCount}
                underMinkServiceType={design.underMinkServiceType}
                setUnderMinkServiceType={design.setUnderMinkServiceType}
                hasUnderMinkCombo={design.hasUnderMinkCombo}
                underComboNormalRemaining={design.underComboNormalRemaining}
                underComboRetainRemaining={design.underComboRetainRemaining}
              />
            </LashTechnicalSpecsStep>
          </div>
        )}

        {diagnostic.activeSubTab === 'PROFILE' && (
          <div className="space-y-3">
            <NaturalLashMeasurementsCard
              isDark={isDark}
              isNaturalLashComplete={diagnostic.isNaturalLashComplete}
              completedNaturalLashCount={diagnostic.completedNaturalLashCount}
              showMandatoryLashCheckAlert={diagnostic.showMandatoryLashCheckAlert}
              naturalLengthRange={diagnostic.naturalLengthRange}
              setNaturalLengthRange={diagnostic.setNaturalLengthRange}
              naturalLengthLabel={diagnostic.naturalLengthLabel}
              naturalLengthSpec={diagnostic.naturalLengthSpec}
              lengthInputRef={diagnostic.lengthInputRef}
              naturalThicknessRange={diagnostic.naturalThicknessRange}
              setNaturalThicknessRange={diagnostic.setNaturalThicknessRange}
              naturalThicknessLabel={diagnostic.naturalThicknessLabel}
              naturalThicknessSpec={diagnostic.naturalThicknessSpec}
              thicknessInputRef={diagnostic.thicknessInputRef}
              naturalCountRange={diagnostic.naturalCountRange}
              setNaturalCountRange={diagnostic.setNaturalCountRange}
              naturalCountLabel={diagnostic.naturalCountLabel}
              countInputRef={diagnostic.countInputRef}
              selectedLashTrail={diagnostic.selectedLashTrail}
              setSelectedLashTrail={diagnostic.setSelectedLashTrail}
              directionFirstBtnRef={diagnostic.directionFirstBtnRef}
              setActiveInfoModal={diagnostic.setActiveInfoModal}
            />

            <NaturalLashEyeHealthAndGoldenRatio
              isDark={isDark}
              showMandatoryLashCheckAlert={diagnostic.showMandatoryLashCheckAlert}
              completedNaturalLashCount={diagnostic.completedNaturalLashCount}
              selectedEyeShape={diagnostic.selectedEyeShape}
              setSelectedEyeShape={diagnostic.setSelectedEyeShape}
              setZoomEyeShapeId={diagnostic.setZoomEyeShapeId}
              setIsEyeCompareOpen={diagnostic.setIsEyeCompareOpen}
              eyeShapeFirstBtnRef={diagnostic.eyeShapeFirstBtnRef}
              selectedLashHealth={diagnostic.selectedLashHealth}
              setSelectedLashHealth={diagnostic.setSelectedLashHealth}
              lashHealthFirstBtnRef={diagnostic.lashHealthFirstBtnRef}
              selectedMedicalProblem={diagnostic.selectedMedicalProblem}
              setSelectedMedicalProblem={diagnostic.setSelectedMedicalProblem}
              medicalProblemFirstBtnRef={diagnostic.medicalProblemFirstBtnRef}
              recommendation={diagnostic.recommendation}
              setActiveInfoModal={diagnostic.setActiveInfoModal}
            />
          </div>
        )}

        <ConsultationNotesAndFooterPanel
          isDark={isDark}
          actor={actor}
          notes={diagnostic.notes}
          setNotes={diagnostic.setNotes}
          mustCompleteNaturalLashBeforeProceeding={diagnostic.mustCompleteNaturalLashBeforeProceeding}
          showMandatoryLashCheckAlert={diagnostic.showMandatoryLashCheckAlert}
          isNaturalLashComplete={diagnostic.isNaturalLashComplete}
          missingNaturalLashFields={diagnostic.missingNaturalLashFields}
          completedNaturalLashCount={diagnostic.completedNaturalLashCount}
          confirmLashCheckBtnRef={diagnostic.confirmLashCheckBtnRef}
          handleConfirmNaturalLashOnly={diagnostic.handleConfirmNaturalLashOnly}
          cleanServiceName={pricing.cleanServiceName}
          specsSummaryString={pricing.specsSummaryString}
          livePricingAndCvPoints={pricing.livePricingAndCvPoints}
          hasUnderMink={design.hasUnderMink}
          underMinkServiceType={design.underMinkServiceType}
          cvllAssignmentMode={pricing.cvllAssignmentMode}
          setCvllAssignmentMode={pricing.setCvllAssignmentMode}
          activeSubTab={diagnostic.activeSubTab}
          setActiveSubTab={diagnostic.setActiveSubTab}
          scrollContainerRef={diagnostic.scrollContainerRef}
          triggerMandatoryLashCheckGuard={diagnostic.triggerMandatoryLashCheckGuard}
          handleSubmit={pricing.handleSubmit}
          comboPurchaseTotal={pricing.comboPurchaseTotal}
        />
      </div>

      <ConsultationModalsCluster
        isDark={isDark}
        isSuperAdmin={design.isSuperAdmin}
        isCurlZoomOpen={design.isCurlZoomOpen}
        setIsCurlZoomOpen={design.setIsCurlZoomOpen}
        zoomCurlId={design.zoomCurlId}
        selectedCurl={design.selectedCurl}
        setSelectedCurl={design.setSelectedCurl}
        currentMaterialSpec={design.currentMaterialSpec}
        isConfiguratorOpen={design.isConfiguratorOpen}
        setIsConfiguratorOpen={design.setIsConfiguratorOpen}
        materialCatalog={design.materialCatalog}
        setMaterialCatalog={design.setMaterialCatalog}
        selectedMaterial={design.selectedMaterial}
        isCompareDesignsOpen={design.isCompareDesignsOpen}
        setIsCompareDesignsOpen={design.setIsCompareDesignsOpen}
        zoomDesignId={design.zoomDesignId}
        selectedStyle={design.selectedStyle}
        setSelectedStyle={design.setSelectedStyle}
        isEyeCompareOpen={diagnostic.isEyeCompareOpen}
        setIsEyeCompareOpen={diagnostic.setIsEyeCompareOpen}
        selectedEyeShape={diagnostic.selectedEyeShape}
        setSelectedEyeShape={diagnostic.setSelectedEyeShape}
        zoomEyeShapeId={diagnostic.zoomEyeShapeId}
        infoModalKey={design.infoModalKey}
        setInfoModalKey={design.setInfoModalKey}
        pendingOverride={design.pendingOverride}
        setPendingOverride={design.setPendingOverride}
        selectedOverrideReasonDraft={design.selectedOverrideReasonDraft}
        setSelectedOverrideReasonDraft={design.setSelectedOverrideReasonDraft}
        activeInfoModal={diagnostic.activeInfoModal}
        setActiveInfoModal={diagnostic.setActiveInfoModal}
        pendingUpgradeConfirmation={pricing.pendingUpgradeConfirmation}
        setPendingUpgradeConfirmation={pricing.setPendingUpgradeConfirmation}
        isComboCatalogModalOpen={pricing.isComboCatalogModalOpen}
        setIsComboCatalogModalOpen={pricing.setIsComboCatalogModalOpen}
        comboCatalogTarget={pricing.comboCatalogTarget}
        autoMatchedCombo={pricing.autoMatchedCombo}
        welcomeEligibility={pricing.welcomeEligibility}
        customerName={pricing.customerName}
        customerPhone={pricing.customerPhone}
        customerAvatar={booking?.customerAvatar}
        selectedNewComboPkg={pricing.selectedNewComboPkg}
        setSelectedNewComboPkg={pricing.setSelectedNewComboPkg}
        selectedUnderComboPkg={pricing.selectedUnderComboPkg}
        setSelectedUnderComboPkg={pricing.setSelectedUnderComboPkg}
        todaySingleServicePrice={booking?.servicePrice || 770000}
        existingUpperExpirySnapshot={pricing.existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={pricing.existingUnderExpirySnapshot}
        upperTodayUsageMode={pricing.upperTodayUsageMode}
        underTodayUsageMode={pricing.underTodayUsageMode}
        todayServiceType={design.serviceType}
        underServiceType={design.underMinkServiceType}
        handleSelectComboPackage={pricing.handleSelectComboPackage}
        setHasUnderMink={design.setHasUnderMink}
      />

      <ComboWalletDetailModal
        booking={booking || null}
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        isAdmin={isAdmin}
        theme={isDark ? 'dark' : 'light'}
        onUpdated={onRefreshDb}
      />
    </div>
  );
}
