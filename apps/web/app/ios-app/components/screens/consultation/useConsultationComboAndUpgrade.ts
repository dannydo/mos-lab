'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  checkWelcomeComboEligibility,
  matchComboCategoryAndVolumeFromBooking,
  getComboPackagesForCategoryAndVolume,
  getUnderLashComboPackages,
  type MatchedComboPackageOption,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import { calculateLashPricingAndCvPoints } from '../LashMaterialConstraintMatrix';
import type { PendingUpgradeConfirmationState } from './ConsultationTypes';
import type { useLashDesignSelection } from './useLashDesignSelection';

interface UseConsultationComboAndUpgradeParams {
  booking?: BookingItem;
  design: ReturnType<typeof useLashDesignSelection>;
}

export function useConsultationComboAndUpgrade({ booking, design }: UseConsultationComboAndUpgradeParams) {
  const [upgradeScope, setUpgradeScope] = useState<'SINGLE' | 'ALL'>('SINGLE');
  const [retainUpgradeMode, setRetainUpgradeMode] = useState<'DEDUCT_NORMAL' | 'PAY_DIFF'>('DEDUCT_NORMAL');
  const [pendingUpgradeConfirmation, setPendingUpgradeConfirmation] = useState<PendingUpgradeConfirmationState | null>(
    null
  );
  const [hasConfirmedUpgrade, setHasConfirmedUpgrade] = useState<boolean>(false);

  const {
    isComboLive,
    comboName,
    comboRemainingSessions,
    autoComboSpec,
    comboNormalRemaining,
    comboRetainRemaining,
    hasComboNormalRemaining,
    hasComboRetainRemaining,
    selectedMaterial,
    currentMaterialSpec,
    isAlwaysFullSet,
    selectedStyle,
    selectedCurl,
    selectedThickness,
    selectedLengths,
    selectedColor,
    selectedVolume,
    selectedCount,
    serviceType,
    hasUnderMinkCombo,
    hasUnderMink,
    setHasUnderMink,
    underMinkServiceType,
    isWithin25Days,
    expectedAutoServiceType,
  } = design;

  // Tùy chọn mua thêm Gói Combo bất kỳ (Mi Trên & Mi Dưới)
  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: booking?.customerVisits ?? 1,
        lashHistoryDates: (booking?.lashHistory || []).map((h) => h.date),
      }),
    [booking?.customerVisits, booking?.lashHistory]
  );

  const autoMatchedCombo = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        serviceName: booking?.serviceName,
        servicePrice: booking?.servicePrice,
        material: selectedMaterial || booking?.attributes?.material,
        volume: selectedVolume || booking?.attributes?.volume,
        count: selectedCount || booking?.attributes?.count,
        comboName: booking?.comboLiveStatus?.comboName,
        serviceKey: booking?.comboLiveStatus?.serviceKey,
      }),
    [
      booking?.serviceName,
      booking?.servicePrice,
      selectedMaterial,
      selectedVolume,
      selectedCount,
      booking?.attributes?.material,
      booking?.attributes?.volume,
      booking?.attributes?.count,
      booking?.comboLiveStatus?.comboName,
      booking?.comboLiveStatus?.serviceKey,
    ]
  );

  const [isComboCatalogModalOpen, setIsComboCatalogModalOpen] = useState<boolean>(false);
  const [comboCatalogTarget, setComboCatalogTarget] = useState<'upper' | 'under'>('upper');
  const [selectedNewComboPkg, setSelectedNewComboPkg] = useState<MatchedComboPackageOption | null>(null);
  const [selectedUnderComboPkg, setSelectedUnderComboPkg] = useState<MatchedComboPackageOption | null>(null);

  const quickUpperPackages = useMemo(() => {
    return getComboPackagesForCategoryAndVolume({
      categoryId: autoMatchedCombo.categoryId,
      volume: autoMatchedCombo.volume,
      welcomeEligibility,
      includeVvipPass: false,
    }).filter((p) => !p.isLocked);
  }, [autoMatchedCombo.categoryId, autoMatchedCombo.volume, welcomeEligibility]);

  const quickUnderPackages = useMemo(() => {
    return getUnderLashComboPackages(welcomeEligibility).filter((p) => !p.isLocked);
  }, [welcomeEligibility]);

  const handleOpenComboModal = (target: 'upper' | 'under') => {
    setComboCatalogTarget(target);
    setIsComboCatalogModalOpen(true);
  };

  const handleSelectComboPackage = (pkg: MatchedComboPackageOption) => {
    if (pkg.volume === 'under') {
      setSelectedUnderComboPkg(pkg);
      setHasUnderMink(true);
    } else {
      setSelectedNewComboPkg(pkg);
    }
  };

  const comboPurchaseTotal = (selectedNewComboPkg?.comboPrice || 0) + (selectedUnderComboPkg?.comboPrice || 0);

  const selectedComboObject: NonNullable<BookingItem['selectedCombo']> | null = useMemo(() => {
    if (!selectedNewComboPkg) return null;
    return {
      id: selectedNewComboPkg.id,
      name: selectedNewComboPkg.displayName,
      price: selectedNewComboPkg.comboPrice,
      bonus: selectedNewComboPkg.cvBonus,
      sessions: selectedNewComboPkg.totalSessions,
      ruleName: selectedNewComboPkg.ruleName,
      categoryId: selectedNewComboPkg.categoryId,
      categoryName: selectedNewComboPkg.categoryName,
      volume: selectedNewComboPkg.volume,
      paidNewCount: selectedNewComboPkg.comboNewCount,
      paidRefillCount: selectedNewComboPkg.comboRefillCount,
      bonusNewCount: selectedNewComboPkg.bonusNewCount,
      bonusRefillCount: selectedNewComboPkg.bonusRefillCount,
      validityMonths: selectedNewComboPkg.validityMonths,
      retailTotal: selectedNewComboPkg.retailTotal,
      savingsAmount: selectedNewComboPkg.savingsAmount,
      avgPerSessionPrice: selectedNewComboPkg.avgPerSessionPrice,
      todaySingleServiceWaived: isComboLive ? false : true,
      isUpTierUpgrade: false,
      originalServiceCategory: selectedNewComboPkg.categoryId,
      recognizedRevenueToday: isComboLive ? 0 : booking?.servicePrice || 770000,
      deferredRevenueBalance: selectedNewComboPkg.comboPrice,
      remainingAfterToday: {
        paidNew: selectedNewComboPkg.comboNewCount,
        paidRefill: selectedNewComboPkg.comboRefillCount,
        bonusNew: selectedNewComboPkg.bonusNewCount,
        bonusRefill: selectedNewComboPkg.bonusRefillCount,
        totalPaidRemaining: selectedNewComboPkg.comboNewCount + selectedNewComboPkg.comboRefillCount,
        totalBonusRemaining: selectedNewComboPkg.bonusNewCount + selectedNewComboPkg.bonusRefillCount,
        totalRemaining: selectedNewComboPkg.totalSessions,
      },
    };
  }, [selectedNewComboPkg, isComboLive, booking?.servicePrice]);

  const selectedUnderComboObject: NonNullable<BookingItem['selectedUnderCombo']> | null = useMemo(() => {
    if (!selectedUnderComboPkg) return null;
    return {
      id: selectedUnderComboPkg.id,
      name: selectedUnderComboPkg.displayName,
      price: selectedUnderComboPkg.comboPrice,
      bonus: selectedUnderComboPkg.cvBonus,
      sessions: selectedUnderComboPkg.totalSessions,
      ruleName: selectedUnderComboPkg.ruleName,
      validityMonths: selectedUnderComboPkg.validityMonths,
      retailTotal: selectedUnderComboPkg.retailTotal,
      savingsAmount: selectedUnderComboPkg.savingsAmount,
      avgPerSessionPrice: selectedUnderComboPkg.avgPerSessionPrice,
      todaySingleServiceWaived: true,
      recognizedRevenueToday: 0,
      deferredRevenueBalance: selectedUnderComboPkg.comboPrice,
      remainingAfterToday: {
        paidNew: selectedUnderComboPkg.comboNewCount,
        paidRefill: selectedUnderComboPkg.comboRefillCount,
        bonusNew: selectedUnderComboPkg.bonusNewCount,
        bonusRefill: selectedUnderComboPkg.bonusRefillCount,
        totalPaidRemaining: selectedUnderComboPkg.comboNewCount + selectedUnderComboPkg.comboRefillCount,
        totalBonusRemaining: selectedUnderComboPkg.bonusNewCount + selectedUnderComboPkg.bonusRefillCount,
        totalRemaining: selectedUnderComboPkg.totalSessions,
      },
    };
  }, [selectedUnderComboPkg]);

  useEffect(() => {
    if (isComboLive) {
      if (!hasComboNormalRemaining && hasComboRetainRemaining) {
        setRetainUpgradeMode('PAY_DIFF');
      } else if (hasComboNormalRemaining && !hasComboRetainRemaining) {
        setRetainUpgradeMode('DEDUCT_NORMAL');
      }
    }
  }, [isComboLive, hasComboNormalRemaining, hasComboRetainRemaining]);

  const livePricingAndCvPoints = useMemo(() => {
    return calculateLashPricingAndCvPoints({
      materialId: selectedMaterial,
      countStr: selectedCount,
      volumeStr: selectedVolume,
      designId: selectedStyle,
      colorStr: selectedColor,
      originalBookedPrice: booking?.servicePrice || 550000,
      serviceType,
      hasUnderMink,
      underMinkServiceType,
      hasUnderMinkCombo,
    });
  }, [
    selectedMaterial,
    selectedCount,
    selectedVolume,
    selectedStyle,
    selectedColor,
    booking?.servicePrice,
    serviceType,
    hasUnderMink,
    underMinkServiceType,
    hasUnderMinkCombo,
  ]);

  const cleanServiceName = useMemo(() => {
    return livePricingAndCvPoints.skuName.replace(/\s*\d+[Kk]\b/g, '').trim();
  }, [livePricingAndCvPoints.skuName]);

  const specsSummaryString = useMemo(() => {
    const rawMat = currentMaterialSpec?.shortLabel || selectedMaterial;
    const cleanMat = rawMat
      .replace(/^New\s+/i, '')
      .replace(/\s*\d+D\b/i, '')
      .trim();
    const cleanCount = (selectedCount || '').replace(/\s*sợi.*$/i, '').trim();
    const cleanThick = (selectedThickness || '').replace(/[^\d.]/g, '');
    const cleanLengths = selectedLengths && selectedLengths.length > 0 ? selectedLengths.join('-') : '10-12';
    return `${cleanMat} ${selectedVolume} ${selectedStyle} ${cleanCount} ${selectedCurl}${cleanThick} ${cleanLengths}`;
  }, [
    currentMaterialSpec,
    selectedMaterial,
    selectedVolume,
    selectedStyle,
    selectedCount,
    selectedCurl,
    selectedThickness,
    selectedLengths,
  ]);

  const comboCatalogPricing = useMemo(() => {
    const normal = calculateLashPricingAndCvPoints({
      materialId: autoComboSpec.materialId,
      volumeStr: autoComboSpec.volume,
      countStr: autoComboSpec.count,
      serviceType: 'Normal',
    });
    const retain = calculateLashPricingAndCvPoints({
      materialId: autoComboSpec.materialId,
      volumeStr: autoComboSpec.volume,
      countStr: autoComboSpec.count,
      serviceType: 'Retain',
    });
    return {
      newPrice: normal.skuPrice,
      refillPrice: retain.skuPrice,
    };
  }, [autoComboSpec]);

  const bookingServicePrice = booking?.servicePrice;
  const comboBaseServicePrice = useMemo(() => {
    if (comboCatalogPricing.newPrice && comboCatalogPricing.newPrice > 0) return comboCatalogPricing.newPrice;
    const match = comboName.match(/\b(390|440|550|660|770|880|990|1110|1220|1330|1440|1550|1770|2110)\b/);
    if (match) return Number(match[1]) * 1000;
    if (bookingServicePrice && bookingServicePrice > 0) return bookingServicePrice;
    return 770000;
  }, [comboCatalogPricing.newPrice, comboName, bookingServicePrice]);

  const comboBaseRetainPrice = useMemo(() => {
    if (comboCatalogPricing.refillPrice && comboCatalogPricing.refillPrice > 0) return comboCatalogPricing.refillPrice;
    if (comboBaseServicePrice <= 440000) return 220000;
    if (comboBaseServicePrice <= 550000) return 280000;
    if (comboBaseServicePrice <= 770000) return 340000;
    if (comboBaseServicePrice <= 880000) return 530000;
    if (comboBaseServicePrice <= 990000) return 590000;
    return Math.round(comboBaseServicePrice / 2);
  }, [comboCatalogPricing.refillPrice, comboBaseServicePrice]);

  const isSameAsComboService = useMemo(() => {
    if (!isComboLive) return false;
    const sameMaterial =
      currentMaterialSpec.code === autoComboSpec.materialCode ||
      currentMaterialSpec.id === autoComboSpec.materialId ||
      currentMaterialSpec.shortLabel.toLowerCase() === autoComboSpec.materialShortLabel.toLowerCase();

    const selectedCountNum = parseInt(selectedCount.replace(/\D/g, ''), 10) || 70;
    const comboCountNum = parseInt((autoComboSpec.count || '70').replace(/\D/g, ''), 10) || 70;
    const withinCount = selectedCountNum <= comboCountNum;

    const selectedVolNum = parseInt(selectedVolume.replace(/\D/g, ''), 10) || 1;
    const comboVolNum = parseInt((autoComboSpec.volume || '1D').replace(/\D/g, ''), 10) || 1;
    const withinVolume = selectedVolNum <= comboVolNum;

    return sameMaterial && withinCount && withinVolume;
  }, [
    isComboLive,
    currentMaterialSpec.code,
    currentMaterialSpec.id,
    currentMaterialSpec.shortLabel,
    autoComboSpec.materialCode,
    autoComboSpec.materialId,
    autoComboSpec.materialShortLabel,
    selectedCount,
    autoComboSpec.count,
    selectedVolume,
    autoComboSpec.volume,
  ]);

  const singleUpgradeDiff = useMemo(() => {
    if (!isComboLive) {
      return livePricingAndCvPoints.upgradePrice;
    }

    if (isSameAsComboService) {
      if (serviceType === 'Retain' || isAlwaysFullSet) {
        return 0;
      }
      if (hasComboNormalRemaining && retainUpgradeMode === 'DEDUCT_NORMAL') {
        return 0;
      }
      if (hasComboRetainRemaining) {
        return Math.max(0, comboBaseServicePrice - comboBaseRetainPrice);
      }
      return comboBaseServicePrice;
    }

    if (serviceType === 'Normal') {
      if (hasComboNormalRemaining && retainUpgradeMode === 'DEDUCT_NORMAL') {
        return Math.max(0, livePricingAndCvPoints.skuPrice - comboBaseServicePrice);
      }
      if (hasComboRetainRemaining) {
        return Math.max(0, livePricingAndCvPoints.skuPrice - comboBaseRetainPrice);
      }
      return livePricingAndCvPoints.skuPrice;
    }

    return Math.max(0, livePricingAndCvPoints.skuPrice - comboBaseRetainPrice);
  }, [
    isComboLive,
    isSameAsComboService,
    serviceType,
    isAlwaysFullSet,
    isWithin25Days,
    expectedAutoServiceType,
    retainUpgradeMode,
    hasComboNormalRemaining,
    hasComboRetainRemaining,
    livePricingAndCvPoints.skuPrice,
    livePricingAndCvPoints.upgradePrice,
    comboBaseServicePrice,
    comboBaseRetainPrice,
  ]);

  const normalUpgradeDiff = useMemo(() => {
    const targetNormalPrice = calculateLashPricingAndCvPoints({
      materialId: selectedMaterial,
      volumeStr: selectedVolume,
      countStr: selectedCount,
      serviceType: 'Normal',
    }).skuPrice;
    return Math.max(0, targetNormalPrice - comboBaseServicePrice);
  }, [selectedMaterial, selectedVolume, selectedCount, comboBaseServicePrice]);

  const retainUpgradeDiff = useMemo(() => {
    const targetRetainPrice = calculateLashPricingAndCvPoints({
      materialId: selectedMaterial,
      volumeStr: selectedVolume,
      countStr: selectedCount,
      serviceType: 'Retain',
    }).skuPrice;
    return Math.max(0, targetRetainPrice - comboBaseRetainPrice);
  }, [selectedMaterial, selectedVolume, selectedCount, comboBaseRetainPrice]);

  const totalUpgradeAmount = useMemo(() => {
    if (!isComboLive) return singleUpgradeDiff;
    if (upgradeScope === 'ALL' && comboRemainingSessions > 1) {
      const totalNormalDiff = normalUpgradeDiff * comboNormalRemaining;
      const totalRetainDiff = retainUpgradeDiff * comboRetainRemaining;
      return totalNormalDiff + totalRetainDiff;
    }
    return singleUpgradeDiff;
  }, [
    isComboLive,
    upgradeScope,
    comboRemainingSessions,
    singleUpgradeDiff,
    normalUpgradeDiff,
    retainUpgradeDiff,
    comboNormalRemaining,
    comboRetainRemaining,
  ]);

  return {
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
  };
}
