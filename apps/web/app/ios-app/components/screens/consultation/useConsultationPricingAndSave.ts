'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const syncedDraftRef = useRef<{ bookingId: number | undefined; signature: string } | null>(null);
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
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    setUpperTodayUsageMode,
    underTodayUsageMode,
    setUnderTodayUsageMode,
    selectedUpperExpiry,
    selectedUnderExpiry,
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
    hasCheckedNaturalLash,
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

    if (booking?.id) {
      try {
        const snap = getLocalProgressSnapshot(booking.id) || {};
        saveLocalProgressSnapshot(booking.id, {
          ...snap,
          bookingId: booking.id,
          consultationDraft: undefined,
        });
      } catch (_) {}
    }

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
      isNewClientDiagnosticDone: hasCheckedNaturalLash && isNaturalLashComplete ? true : undefined,
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
    hasCheckedNaturalLash,
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
            selectedUnderComboPkg,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (_) {}
    }

    if (onAutoSaveDraft) {
      await onAutoSaveDraft(
        currentAttrs,
        selectedComboObject,
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
    onAutoSaveDraft,
    selectedComboObject,
    selectedNewComboPkg,
    selectedUnderComboPkg,
    livePricingAndCvPoints,
    totalUpgradeAmount,
    serviceType,
    selectedUnderComboObject,
    hasUnderMink,
    underMinkServiceType,
    notes,
  ]);

  const performAutoSaveRef = useRef(performAutoSave);
  performAutoSaveRef.current = performAutoSave;

  // Deterministic value-based signature of user-editable consultation fields.
  // Prevents background `bookings` polling, `CHECK_IN` responses, or `onAutoSaveDraft` `setBookings`
  // updates from re-triggering autosave in an infinite loop when the user has not edited anything.
  const autoSaveDraftSignature = useMemo(
    () =>
      JSON.stringify({
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
        serviceType,
        hasUnderMink,
        underMinkServiceType: hasUnderMink ? underMinkServiceType : null,
        underMinkCurl: hasUnderMink ? underMinkCurl : null,
        underMinkLength: hasUnderMink ? underMinkLength : null,
        underMinkCount: hasUnderMink ? underMinkCount : null,
        upperComboId: selectedNewComboPkg?.id || null,
        underComboId: selectedUnderComboPkg?.id || null,
        upperTodayUsageMode,
        underTodayUsageMode,
        upgradeScope,
        retainUpgradeMode,
        isOverridden,
        overrideReason: isOverridden ? overrideReason : '',
      }),
    [
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
      serviceType,
      hasUnderMink,
      underMinkServiceType,
      underMinkCurl,
      underMinkLength,
      underMinkCount,
      selectedNewComboPkg?.id,
      selectedUnderComboPkg?.id,
      upperTodayUsageMode,
      underTodayUsageMode,
      upgradeScope,
      retainUpgradeMode,
      isOverridden,
      overrideReason,
    ]
  );

  const latestSignatureRef = useRef<string>(autoSaveDraftSignature);
  latestSignatureRef.current = autoSaveDraftSignature;

  useEffect(() => {
    const currentBookingId = booking?.id;
    if (!syncedDraftRef.current || syncedDraftRef.current.bookingId !== currentBookingId) {
      syncedDraftRef.current = { bookingId: currentBookingId, signature: autoSaveDraftSignature };
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      setSaveStatus('saved');
      return;
    }

    if (syncedDraftRef.current.signature === autoSaveDraftSignature) {
      return;
    }

    const targetSignature = autoSaveDraftSignature;
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      // Mark as synced immediately when debounce timer fires before awaiting async call,
      // so concurrent re-renders during HTTP transport see the in-flight signature as already accounted for.
      syncedDraftRef.current = { bookingId: currentBookingId, signature: targetSignature };
      try {
        await performAutoSaveRef.current();
        if (latestSignatureRef.current === targetSignature) {
          setSaveStatus('saved');
        }
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
  }, [booking?.id, autoSaveDraftSignature]);

  const handleManualSaveClick = async () => {
    if (saveStatus === 'saving') return;
    const currentSignature = autoSaveDraftSignature;
    syncedDraftRef.current = { bookingId: booking?.id, signature: currentSignature };
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaveStatus('saving');
    try {
      await performAutoSaveRef.current();
      if (latestSignatureRef.current === currentSignature) {
        setSaveStatus('saved');
      }
    } catch (err) {
      console.warn('[Screen03] Manual save error:', err);
      setSaveStatus('error');
    }
  };

  const customerName = (booking?.customerName || 'Chị Trúc').replace(/\s*\(\s*Khách\s*Mới\s*\)/i, '').trim();
  const rawCustomerPhone = booking?.customerPhone || '0933.779.207';
  const customerPhone = rawCustomerPhone.replace(/\*+\s*/g, '').trim();
  const serviceName = resolveDisplayServiceName(booking) || 'New Flawless Mink';
  const actorName = actor?.name || 'Thảo Ly';

  let avatarRingClass = 'border-[2px] border-[#34C759]';
  if (booking?.comboLiveStatus?.isExpired) {
    avatarRingClass = 'border-[2px] border-rose-500 ring-2 ring-rose-500/40';
  } else if (isComboLive && comboRemainingSessions > 0) {
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
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    setUpperTodayUsageMode,
    underTodayUsageMode,
    setUnderTodayUsageMode,
    selectedUpperExpiry,
    selectedUnderExpiry,
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
