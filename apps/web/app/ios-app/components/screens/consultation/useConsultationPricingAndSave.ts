'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BookingItem } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import { saveLocalProgressSnapshot, getLocalProgressSnapshot } from '../../../state/offlineSync';
import { formatComboName, resolveDisplayServiceName, UNDER_MINK_PREP_SPEC } from '../LashMaterialConstraintMatrix';
import type { ConsultationSaveStatus, Screen03ConsultationMatrixProps } from './ConsultationTypes';
import type { useLashDesignSelection } from './useLashDesignSelection';
import type { useNaturalLashDiagnostic } from './useNaturalLashDiagnostic';
import { useConsultationComboAndUpgrade } from './useConsultationComboAndUpgrade';

interface UseConsultationPricingAndSaveParams {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  onSave: Screen03ConsultationMatrixProps['onSave'];
  onAutoSaveDraft?: Screen03ConsultationMatrixProps['onAutoSaveDraft'];
  design: ReturnType<typeof useLashDesignSelection>;
  diagnostic: ReturnType<typeof useNaturalLashDiagnostic>;
}

export function useConsultationPricingAndSave({
  booking,
  actor,
  onSave,
  onAutoSaveDraft,
  design,
  diagnostic,
}: UseConsultationPricingAndSaveParams) {
  const [saveStatus, setSaveStatus] = useState<ConsultationSaveStatus>('saved');
  const isInitialMount = useRef<boolean>(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const comboAndUpgrade = useConsultationComboAndUpgrade({ booking, design });

  const {
    upgradeScope,
    setUpgradeScope,
    retainUpgradeMode,
    setRetainUpgradeMode,
    pendingUpgradeConfirmation,
    setPendingUpgradeConfirmation,
    hasConfirmedUpgrade,
    setHasConfirmedUpgrade,
    welcomeEligibility,
    autoMatchedCombo,
    isComboCatalogModalOpen,
    setIsComboCatalogModalOpen,
    comboCatalogTarget,
    selectedNewComboPkg,
    setSelectedNewComboPkg,
    selectedUnderComboPkg,
    setSelectedUnderComboPkg,
    quickUpperPackages,
    quickUnderPackages,
    handleOpenComboModal,
    handleSelectComboPackage,
    comboPurchaseTotal,
    selectedComboObject,
    selectedUnderComboObject,
    livePricingAndCvPoints,
    cleanServiceName,
    specsSummaryString,
    comboBaseServicePrice,
    comboBaseRetainPrice,
    singleUpgradeDiff,
    normalUpgradeDiff,
    retainUpgradeDiff,
    totalUpgradeAmount,
  } = comboAndUpgrade;

  const {
    isComboLive,
    comboName,
    comboRemainingSessions,
    comboNormalRemaining,
    comboRetainRemaining,
    selectedMaterial,
    selectedStyle,
    selectedCurl,
    selectedThickness,
    selectedLengths,
    selectedLength,
    selectedColor,
    selectedVolume,
    selectedCount,
    serviceType,
    isOverridden,
    overrideReason,
    hasUnderMink,
    underMinkServiceType,
    underMinkCurl,
    underMinkLength,
    underMinkCount,
  } = design;

  const {
    naturalLengthRange,
    naturalThicknessRange,
    naturalCountRange,
    selectedLashTrail,
    selectedEyeShape,
    selectedLashHealth,
    selectedMedicalProblem,
    notes,
    naturalLength,
    naturalThickness,
    naturalDensity,
    naturalCount,
    isNaturalLashComplete,
    mustCompleteNaturalLashBeforeProceeding,
    triggerMandatoryLashCheckGuard,
  } = diagnostic;

  const [cvllAssignmentMode, setCvllAssignmentMode] = useState<'SELF_SERVICE' | 'ASSIGN_OTHER'>(() => {
    if (booking?.assignedStaffId && booking.assignedStaffId > 0 && booking.assignedStaffId !== actor?.staffId) {
      return 'ASSIGN_OTHER';
    }
    return 'SELF_SERVICE';
  });

  const executeFinalSave = (confirmedUpgradePrice?: number) => {
    const finalUpgradePrice = confirmedUpgradePrice !== undefined ? confirmedUpgradePrice : totalUpgradeAmount;
    const finalNotes = isOverridden && overrideReason ? `[CVL Override: ${overrideReason}] ${notes}`.trim() : notes;

    onSave(
      {
        style: selectedStyle,
        curl: selectedCurl,
        length: selectedLength,
        thickness: selectedThickness,
        material: selectedMaterial,
        color: selectedColor,
        volume: selectedVolume,
        count: selectedCount,
        hasUnderMink,
        underMinkServiceType: hasUnderMink ? underMinkServiceType : undefined,
        underMinkCurl: hasUnderMink ? underMinkCurl : undefined,
        underMinkThickness: hasUnderMink ? UNDER_MINK_PREP_SPEC.fixedThickness : undefined,
        underMinkLength: hasUnderMink ? underMinkLength : undefined,
        underMinkCount: hasUnderMink ? underMinkCount : undefined,
        isOverridden,
        overrideReason: isOverridden ? overrideReason : undefined,
        eyeShape: selectedEyeShape || undefined,
        naturalLashLength: naturalLength,
        naturalLashThickness: naturalThickness,
        naturalLashDensity: naturalDensity,
        naturalLashCount: naturalCount,
        isNewClientDiagnosticDone: isNaturalLashComplete ? true : undefined,
        lashHealth: selectedLashHealth || undefined,
        lashTrail: selectedLashTrail || undefined,
        medicalProblem: selectedMedicalProblem || undefined,
        notes: finalNotes,
      },
      selectedComboObject,
      {
        skuName: livePricingAndCvPoints.skuName,
        skuPrice: livePricingAndCvPoints.skuPrice,
        upgradePrice: finalUpgradePrice,
        cvPoints: livePricingAndCvPoints.totalPoints,
        cvBreakdown: livePricingAndCvPoints.breakdownLabel,
        serviceType,
      },
      booking?.id,
      selectedUnderComboObject,
      actor?.tier === 'CVLL' ? cvllAssignmentMode : undefined
    );
  };

  const handleSubmit = () => {
    if (mustCompleteNaturalLashBeforeProceeding) {
      triggerMandatoryLashCheckGuard();
      return;
    }

    if (isComboLive && totalUpgradeAmount > 0 && !hasConfirmedUpgrade) {
      const basePrice = serviceType === 'Retain' ? comboBaseRetainPrice : comboBaseServicePrice;
      setPendingUpgradeConfirmation({
        comboName: formatComboName(comboName),
        comboBasePrice: basePrice,
        targetName: livePricingAndCvPoints.skuName,
        targetPrice: livePricingAndCvPoints.skuPrice,
        targetSpecs: `${selectedCount} · ${selectedVolume}`,
        serviceType,
        upgradeScope,
        singleDiff: singleUpgradeDiff,
        normalDiff: normalUpgradeDiff,
        retainDiff: retainUpgradeDiff,
        comboNormalRemaining,
        comboRetainRemaining,
        totalAmount: totalUpgradeAmount,
        onConfirm: () => {
          setHasConfirmedUpgrade(true);
          setPendingUpgradeConfirmation(null);
          executeFinalSave(totalUpgradeAmount);
        },
      });
      return;
    }

    executeFinalSave();
  };

  const buildCurrentAttributes = useCallback(() => {
    const finalNotes = isOverridden && overrideReason ? `[CVL Override: ${overrideReason}] ${notes}`.trim() : notes;

    return {
      style: selectedStyle,
      curl: selectedCurl,
      length: selectedLength,
      thickness: selectedThickness,
      material: selectedMaterial,
      color: selectedColor,
      volume: selectedVolume,
      count: selectedCount,
      hasUnderMink,
      underMinkServiceType: hasUnderMink ? underMinkServiceType : undefined,
      underMinkCurl: hasUnderMink ? underMinkCurl : undefined,
      underMinkThickness: hasUnderMink ? UNDER_MINK_PREP_SPEC.fixedThickness : undefined,
      underMinkLength: hasUnderMink ? underMinkLength : undefined,
      underMinkCount: hasUnderMink ? underMinkCount : undefined,
      isOverridden,
      overrideReason: isOverridden ? overrideReason : undefined,
      eyeShape: selectedEyeShape || undefined,
      naturalLashLength: naturalLength,
      naturalLashThickness: naturalThickness,
      naturalLashDensity: naturalDensity,
      naturalLashCount: naturalCount,
      isNewClientDiagnosticDone: isNaturalLashComplete ? true : undefined,
      lashHealth: selectedLashHealth || undefined,
      lashTrail: selectedLashTrail || undefined,
      medicalProblem: selectedMedicalProblem || undefined,
      notes: finalNotes,
    };
  }, [
    selectedStyle,
    selectedCurl,
    selectedLength,
    selectedThickness,
    selectedMaterial,
    selectedColor,
    selectedVolume,
    selectedCount,
    hasUnderMink,
    underMinkServiceType,
    underMinkCurl,
    underMinkLength,
    underMinkCount,
    isOverridden,
    overrideReason,
    selectedEyeShape,
    naturalLength,
    naturalThickness,
    naturalDensity,
    naturalCount,
    isNaturalLashComplete,
    selectedLashHealth,
    selectedLashTrail,
    selectedMedicalProblem,
    notes,
  ]);

  const performAutoSave = useCallback(async () => {
    const currentAttrs = buildCurrentAttributes();
    if (booking?.id) {
      try {
        const snap = getLocalProgressSnapshot(booking.id) || {};
        saveLocalProgressSnapshot(booking.id, {
          ...snap,
          bookingId: booking.id,
          consultationDraft: {
            attributes: currentAttrs,
            notes,
            selectedNewComboPkg,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (_) {}
    }

    if (onAutoSaveDraft) {
      await onAutoSaveDraft(
        currentAttrs,
        selectedComboObject || booking?.selectedCombo,
        livePricingAndCvPoints
          ? {
              skuName: livePricingAndCvPoints.skuName,
              skuPrice: livePricingAndCvPoints.skuPrice,
              upgradePrice: totalUpgradeAmount,
              cvPoints: livePricingAndCvPoints.totalPoints,
              cvBreakdown: livePricingAndCvPoints.breakdownLabel,
              serviceType,
            }
          : null,
        booking?.id,
        selectedUnderComboObject,
        notes
      );
    }
  }, [
    buildCurrentAttributes,
    booking?.id,
    booking?.selectedCombo,
    onAutoSaveDraft,
    selectedComboObject,
    livePricingAndCvPoints,
    totalUpgradeAmount,
    serviceType,
    selectedUnderComboObject,
    hasUnderMink,
    underMinkServiceType,
    notes,
  ]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await performAutoSave();
        setSaveStatus('saved');
      } catch (err) {
        console.warn('[Screen03] Autosave error:', err);
        setSaveStatus('error');
      }
    }, 450);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    naturalLengthRange,
    naturalThicknessRange,
    naturalCountRange,
    selectedLashTrail,
    selectedEyeShape,
    selectedLashHealth,
    selectedMedicalProblem,
    notes,
    selectedStyle,
    selectedCurl,
    selectedThickness,
    selectedLength,
    selectedLengths,
    selectedMaterial,
    selectedColor,
    selectedVolume,
    selectedCount,
    hasUnderMink,
    underMinkServiceType,
    underMinkCurl,
    underMinkLength,
    underMinkCount,
    selectedNewComboPkg,
    selectedUnderComboPkg,
    isOverridden,
    overrideReason,
    performAutoSave,
  ]);

  const handleManualSaveClick = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await performAutoSave();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const customerName = (booking?.customerName || 'Chị Trúc').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const rawCustomerPhone = booking?.customerPhone || '0933.779.207';
  const customerPhone = rawCustomerPhone.replace(/\*+\s*/g, '').trim();
  const serviceName = resolveDisplayServiceName(booking) || 'New Flawless Mink';
  const actorName = actor?.name || 'Thảo Ly';

  let avatarRingClass = 'border-[2px] border-[#34C759]';
  if (isComboLive && comboRemainingSessions > 0) {
    if (comboRemainingSessions <= 2) {
      avatarRingClass = 'border-[2px] border-[#FF9500] ring-1 ring-[#FF9500]/40';
    } else {
      avatarRingClass = 'border-[2px] border-[#8E8E93]';
    }
  }

  return {
    saveStatus,
    handleManualSaveClick,
    upgradeScope,
    setUpgradeScope,
    retainUpgradeMode,
    setRetainUpgradeMode,
    pendingUpgradeConfirmation,
    setPendingUpgradeConfirmation,
    welcomeEligibility,
    autoMatchedCombo,
    isComboCatalogModalOpen,
    setIsComboCatalogModalOpen,
    comboCatalogTarget,
    selectedNewComboPkg,
    setSelectedNewComboPkg,
    selectedUnderComboPkg,
    setSelectedUnderComboPkg,
    quickUpperPackages,
    quickUnderPackages,
    handleOpenComboModal,
    handleSelectComboPackage,
    comboPurchaseTotal,
    livePricingAndCvPoints,
    cleanServiceName,
    specsSummaryString,
    comboBaseServicePrice,
    comboBaseRetainPrice,
    normalUpgradeDiff,
    retainUpgradeDiff,
    totalUpgradeAmount,
    cvllAssignmentMode,
    setCvllAssignmentMode,
    handleSubmit,
    customerName,
    customerPhone,
    serviceName,
    actorName,
    avatarRingClass,
  };
}
