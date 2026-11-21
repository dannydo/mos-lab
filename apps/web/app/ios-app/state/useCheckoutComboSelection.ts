'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkWelcomeComboEligibility,
  matchComboCategoryAndVolumeFromBooking,
  resolveMatchedUnderComboFromSaved,
  resolveMatchedUpperComboFromSaved,
  resolveServicePriceSplit,
  type ComboTodayUsageMode,
  type CvToCvPlusRequirements,
  type ExistingComboSnapshotForExpiry,
  type MatchedComboPackageOption,
  type WelcomeComboEligibilityResult,
  type WingsComboCategoryId,
} from '@mos-lab/shared';
import type { BookingItem } from './mockData';
import { getWingsMenuDetail } from '../components/screens/LashMaterialConstraintMatrix';
import {
  buildSelectedComboObjectsFromPackages,
  extractExistingUnderExpirySnapshot,
  extractExistingUpperExpirySnapshot,
  resolveDefaultUnderTodayUsageMode,
  resolveDefaultUpperTodayUsageMode,
} from '../components/screens/consultation/comboExpiryConsultHelpers';

export function resolveCheckoutBaseServicePrice(booking?: BookingItem | null, resolvedServiceName?: string): number {
  if (booking?.servicePrice && booking.servicePrice > 0) return booking.servicePrice;
  const serviceName = resolvedServiceName || booking?.serviceName || '';
  const menuDetail = getWingsMenuDetail(
    booking?.attributes?.material || serviceName || '',
    booking?.attributes?.count || '',
    booking?.attributes?.volume || ''
  );
  if (menuDetail) {
    const isRetainSvc =
      String(booking?.serviceType || '').toLowerCase() === 'retain' ||
      serviceName.toLowerCase().includes('dặm') ||
      serviceName.toLowerCase().includes('refill');
    return isRetainSvc ? menuDetail.refillPrice : menuDetail.newPrice;
  }
  return 770000;
}

export interface UseCheckoutComboSelectionParams {
  booking?: BookingItem;
  serviceName: string;
  servicePrice: number;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  onUpdateCombos?: (payload: {
    selectedCombo: BookingItem['selectedCombo'];
    selectedUnderCombo: BookingItem['selectedUnderCombo'];
    comboRedemption?: BookingItem['comboRedemption'];
  }) => void;
}

export interface CheckoutComboSelectionController {
  selectedCombo: BookingItem['selectedCombo'];
  selectedUnderCombo: BookingItem['selectedUnderCombo'];
  comboRedemption: BookingItem['comboRedemption'];
  comboModalTarget: 'upper' | 'under' | null;
  openUpperComboModal: () => void;
  openUnderComboModal: () => void;
  closeComboModal: () => void;
  autoMatched: { categoryId: WingsComboCategoryId; volume: number | 'under' };
  welcomeEligibility: WelcomeComboEligibilityResult;
  existingUpperExpirySnapshot: ExistingComboSnapshotForExpiry | null;
  existingUnderExpirySnapshot: ExistingComboSnapshotForExpiry | null;
  upperTodayUsageMode: ComboTodayUsageMode;
  underTodayUsageMode: ComboTodayUsageMode;
  todayServiceType: 'Normal' | 'Retain';
  underServiceType: 'Normal' | 'Retain';
  hydratedSelectedUpperPkg: MatchedComboPackageOption | null;
  hydratedSelectedUnderPkg: MatchedComboPackageOption | null;
  isExistingUpperComboLive: boolean;
  todaySingleUpperPrice: number;
  handleApplyPackages: (payload: {
    upperPkg: MatchedComboPackageOption | null;
    underPkg: MatchedComboPackageOption | null;
  }) => void;
  handleSelectSinglePackage: (pkg: MatchedComboPackageOption) => void;
  handleChangeUpperUsageMode: (mode: ComboTodayUsageMode) => void;
  handleChangeUnderUsageMode: (mode: ComboTodayUsageMode) => void;
  handleRemoveUpperCombo: () => void;
  handleRemoveUnderCombo: () => void;
}

export function useCheckoutComboSelection({
  booking,
  serviceName,
  servicePrice,
  cvPlusRules,
  onUpdateCombos,
}: UseCheckoutComboSelectionParams): CheckoutComboSelectionController {
  const [comboModalTarget, setComboModalTarget] = useState<'upper' | 'under' | null>(null);
  const [localSelectedCombo, setLocalSelectedCombo] = useState<BookingItem['selectedCombo']>(
    () => booking?.selectedCombo ?? null
  );
  const [localSelectedUnderCombo, setLocalSelectedUnderCombo] = useState<BookingItem['selectedUnderCombo']>(
    () => booking?.selectedUnderCombo ?? null
  );
  const [localComboRedemption, setLocalComboRedemption] = useState<BookingItem['comboRedemption']>(
    () => booking?.comboRedemption ?? null
  );

  useEffect(() => {
    setLocalSelectedCombo(booking?.selectedCombo ?? null);
  }, [booking?.id, booking?.selectedCombo]);

  useEffect(() => {
    setLocalSelectedUnderCombo(booking?.selectedUnderCombo ?? null);
  }, [booking?.id, booking?.selectedUnderCombo]);

  useEffect(() => {
    setLocalComboRedemption(booking?.comboRedemption ?? null);
  }, [booking?.id, booking?.comboRedemption]);

  const effectiveBookingForCombos = useMemo(
    () =>
      booking
        ? {
            ...booking,
            selectedCombo: localSelectedCombo,
            selectedUnderCombo: localSelectedUnderCombo,
            comboRedemption: localComboRedemption,
          }
        : undefined,
    [booking, localSelectedCombo, localSelectedUnderCombo, localComboRedemption]
  );

  const autoMatched = useMemo(
    () =>
      matchComboCategoryAndVolumeFromBooking({
        serviceName: booking?.serviceName || serviceName,
        servicePrice,
        material: booking?.attributes?.material,
        volume: booking?.attributes?.volume,
        count: booking?.attributes?.count,
        comboName: booking?.comboLiveStatus?.comboName,
        serviceKey: booking?.comboLiveStatus?.serviceKey,
      }),
    [
      booking?.serviceName,
      serviceName,
      servicePrice,
      booking?.attributes?.material,
      booking?.attributes?.volume,
      booking?.attributes?.count,
      booking?.comboLiveStatus?.comboName,
      booking?.comboLiveStatus?.serviceKey,
    ]
  );

  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: booking?.customerVisits ?? 1,
        lashHistoryDates: (booking?.lashHistory || []).map((h) => h.date),
      }),
    [booking?.customerVisits, booking?.lashHistory]
  );

  const existingUpperExpirySnapshot = useMemo(() => extractExistingUpperExpirySnapshot(booking), [booking]);
  const existingUnderExpirySnapshot = useMemo(() => extractExistingUnderExpirySnapshot(booking), [booking]);

  const isExistingUpperComboLive = Boolean(
    booking?.comboLiveStatus?.isComboLive &&
    !booking?.comboLiveStatus?.isExpired &&
    (booking?.comboLiveStatus?.remainingSessions ?? 0) > 0
  );

  const { upperServicePrice: todaySingleUpperPrice, underServicePrice: todaySingleUnderPrice } = useMemo(
    () =>
      resolveServicePriceSplit({
        servicePrice,
        serviceName: booking?.serviceName || serviceName,
        hasUnderMink: booking?.attributes?.hasUnderMink,
        underMinkServiceType: booking?.attributes?.underMinkServiceType,
        hasUnderMinkCombo: Boolean(
          booking?.underMinkComboStatus?.hasUnderCombo && (booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
        ),
      }),
    [
      servicePrice,
      booking?.serviceName,
      serviceName,
      booking?.attributes?.hasUnderMink,
      booking?.attributes?.underMinkServiceType,
      booking?.underMinkComboStatus?.hasUnderCombo,
      booking?.underMinkComboStatus?.remainingSessions,
    ]
  );

  const todayServiceType: 'Normal' | 'Retain' = booking?.serviceType === 'Retain' ? 'Retain' : 'Normal';
  const underServiceType: 'Normal' | 'Retain' =
    booking?.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';

  const upperTodayUsageMode = useMemo(
    () => resolveDefaultUpperTodayUsageMode(effectiveBookingForCombos),
    [effectiveBookingForCombos]
  );
  const underTodayUsageMode = useMemo(
    () =>
      resolveDefaultUnderTodayUsageMode(
        effectiveBookingForCombos,
        Boolean(todaySingleUnderPrice > 0 || booking?.attributes?.hasUnderMink)
      ),
    [effectiveBookingForCombos, todaySingleUnderPrice, booking?.attributes?.hasUnderMink]
  );

  const hydratedSelectedUpperPkg = useMemo(
    () =>
      resolveMatchedUpperComboFromSaved(localSelectedCombo, welcomeEligibility, {
        categoryId: autoMatched.categoryId,
        volume: autoMatched.volume,
      }),
    [localSelectedCombo, welcomeEligibility, autoMatched.categoryId, autoMatched.volume]
  );

  const hydratedSelectedUnderPkg = useMemo(
    () => resolveMatchedUnderComboFromSaved(localSelectedUnderCombo, welcomeEligibility),
    [localSelectedUnderCombo, welcomeEligibility]
  );

  const commitComboPayload = useCallback(
    (payload: {
      selectedCombo: BookingItem['selectedCombo'];
      selectedUnderCombo: BookingItem['selectedUnderCombo'];
      comboRedemption?: BookingItem['comboRedemption'];
    }) => {
      setLocalSelectedCombo(payload.selectedCombo ?? null);
      setLocalSelectedUnderCombo(payload.selectedUnderCombo ?? null);
      if (payload.comboRedemption !== undefined) {
        setLocalComboRedemption(payload.comboRedemption ?? null);
      }
      onUpdateCombos?.(payload);
    },
    [onUpdateCombos]
  );

  const handleApplyPackages = useCallback(
    ({
      upperPkg,
      underPkg,
    }: {
      upperPkg: MatchedComboPackageOption | null;
      underPkg: MatchedComboPackageOption | null;
    }) => {
      const nextUpperMode = resolveDefaultUpperTodayUsageMode(effectiveBookingForCombos);
      const nextUnderMode = resolveDefaultUnderTodayUsageMode(
        effectiveBookingForCombos,
        Boolean(todaySingleUnderPrice > 0 || booking?.attributes?.hasUnderMink)
      );
      const payload = buildSelectedComboObjectsFromPackages({
        upperPkg,
        underPkg,
        upperTodayUsageMode: nextUpperMode,
        underTodayUsageMode: nextUnderMode,
        booking: effectiveBookingForCombos,
        upperServicePrice: todaySingleUpperPrice || servicePrice,
        underServicePrice: todaySingleUnderPrice,
        autoMatchedCategoryId: autoMatched.categoryId,
        autoMatchedVolume: autoMatched.volume,
        cvPlusRules,
      });
      commitComboPayload(payload);
    },
    [
      effectiveBookingForCombos,
      todaySingleUnderPrice,
      booking?.attributes?.hasUnderMink,
      todaySingleUpperPrice,
      servicePrice,
      autoMatched.categoryId,
      autoMatched.volume,
      cvPlusRules,
      commitComboPayload,
    ]
  );

  const handleSelectSinglePackage = useCallback(
    (pkg: MatchedComboPackageOption) => {
      if (pkg.volume === 'under') {
        handleApplyPackages({ upperPkg: hydratedSelectedUpperPkg, underPkg: pkg });
      } else {
        handleApplyPackages({ upperPkg: pkg, underPkg: hydratedSelectedUnderPkg });
      }
    },
    [handleApplyPackages, hydratedSelectedUpperPkg, hydratedSelectedUnderPkg]
  );

  const handleChangeUpperUsageMode = useCallback(
    (mode: ComboTodayUsageMode) => {
      if (hydratedSelectedUpperPkg) {
        const payload = buildSelectedComboObjectsFromPackages({
          upperPkg: hydratedSelectedUpperPkg,
          underPkg: hydratedSelectedUnderPkg,
          upperTodayUsageMode: mode,
          underTodayUsageMode,
          booking: effectiveBookingForCombos,
          upperServicePrice: todaySingleUpperPrice || servicePrice,
          underServicePrice: todaySingleUnderPrice,
          autoMatchedCategoryId: autoMatched.categoryId,
          autoMatchedVolume: autoMatched.volume,
          cvPlusRules,
        });
        commitComboPayload(payload);
        return;
      }
      if (!localSelectedCombo) return;
      const shouldWaive = mode === 'USE_NEW_COMBO';
      commitComboPayload({
        selectedCombo: {
          ...localSelectedCombo,
          todayUsageMode: mode,
          todaySingleServiceWaived: shouldWaive,
        },
        selectedUnderCombo: localSelectedUnderCombo,
        comboRedemption: mode === 'USE_OLD_COMBO' ? localComboRedemption : null,
      });
    },
    [
      hydratedSelectedUpperPkg,
      hydratedSelectedUnderPkg,
      underTodayUsageMode,
      effectiveBookingForCombos,
      todaySingleUpperPrice,
      servicePrice,
      todaySingleUnderPrice,
      autoMatched.categoryId,
      autoMatched.volume,
      cvPlusRules,
      commitComboPayload,
      localSelectedCombo,
      localSelectedUnderCombo,
      localComboRedemption,
    ]
  );

  const handleChangeUnderUsageMode = useCallback(
    (mode: ComboTodayUsageMode) => {
      if (hydratedSelectedUnderPkg) {
        const payload = buildSelectedComboObjectsFromPackages({
          upperPkg: hydratedSelectedUpperPkg,
          underPkg: hydratedSelectedUnderPkg,
          upperTodayUsageMode,
          underTodayUsageMode: mode,
          booking: effectiveBookingForCombos,
          upperServicePrice: todaySingleUpperPrice || servicePrice,
          underServicePrice: todaySingleUnderPrice,
          autoMatchedCategoryId: autoMatched.categoryId,
          autoMatchedVolume: autoMatched.volume,
          cvPlusRules,
        });
        commitComboPayload(payload);
        return;
      }
      if (!localSelectedUnderCombo) return;
      commitComboPayload({
        selectedCombo: localSelectedCombo,
        selectedUnderCombo: {
          ...localSelectedUnderCombo,
          todayUsageMode: mode,
          todaySingleServiceWaived: Boolean(booking?.attributes?.hasUnderMink && mode === 'USE_NEW_COMBO'),
        },
        comboRedemption: localComboRedemption,
      });
    },
    [
      hydratedSelectedUnderPkg,
      hydratedSelectedUpperPkg,
      upperTodayUsageMode,
      effectiveBookingForCombos,
      todaySingleUpperPrice,
      servicePrice,
      todaySingleUnderPrice,
      autoMatched.categoryId,
      autoMatched.volume,
      cvPlusRules,
      commitComboPayload,
      localSelectedUnderCombo,
      localSelectedCombo,
      booking?.attributes?.hasUnderMink,
      localComboRedemption,
    ]
  );

  const handleRemoveUpperCombo = useCallback(() => {
    const fallbackMode: ComboTodayUsageMode = isExistingUpperComboLive ? 'USE_OLD_COMBO' : 'RETAIL_OR_VOUCHER';
    if (hydratedSelectedUnderPkg || isExistingUpperComboLive) {
      const payload = buildSelectedComboObjectsFromPackages({
        upperPkg: null,
        underPkg: hydratedSelectedUnderPkg,
        upperTodayUsageMode: fallbackMode,
        underTodayUsageMode,
        booking: effectiveBookingForCombos,
        upperServicePrice: todaySingleUpperPrice || servicePrice,
        underServicePrice: todaySingleUnderPrice,
        autoMatchedCategoryId: autoMatched.categoryId,
        autoMatchedVolume: autoMatched.volume,
        cvPlusRules,
      });
      commitComboPayload(payload);
      return;
    }
    commitComboPayload({
      selectedCombo: null,
      selectedUnderCombo: localSelectedUnderCombo,
      comboRedemption: null,
    });
  }, [
    isExistingUpperComboLive,
    hydratedSelectedUnderPkg,
    underTodayUsageMode,
    effectiveBookingForCombos,
    todaySingleUpperPrice,
    servicePrice,
    todaySingleUnderPrice,
    autoMatched.categoryId,
    autoMatched.volume,
    cvPlusRules,
    commitComboPayload,
    localSelectedUnderCombo,
  ]);

  const handleRemoveUnderCombo = useCallback(() => {
    if (hydratedSelectedUpperPkg || isExistingUpperComboLive) {
      const payload = buildSelectedComboObjectsFromPackages({
        upperPkg: hydratedSelectedUpperPkg,
        underPkg: null,
        upperTodayUsageMode,
        underTodayUsageMode: 'RETAIL_OR_VOUCHER',
        booking: effectiveBookingForCombos,
        upperServicePrice: todaySingleUpperPrice || servicePrice,
        underServicePrice: todaySingleUnderPrice,
        autoMatchedCategoryId: autoMatched.categoryId,
        autoMatchedVolume: autoMatched.volume,
        cvPlusRules,
      });
      commitComboPayload(payload);
      return;
    }
    commitComboPayload({
      selectedCombo: localSelectedCombo,
      selectedUnderCombo: null,
      comboRedemption: localComboRedemption,
    });
  }, [
    hydratedSelectedUpperPkg,
    isExistingUpperComboLive,
    upperTodayUsageMode,
    effectiveBookingForCombos,
    todaySingleUpperPrice,
    servicePrice,
    todaySingleUnderPrice,
    autoMatched.categoryId,
    autoMatched.volume,
    cvPlusRules,
    commitComboPayload,
    localSelectedCombo,
    localComboRedemption,
  ]);

  return {
    selectedCombo: localSelectedCombo,
    selectedUnderCombo: localSelectedUnderCombo,
    comboRedemption: localComboRedemption,
    comboModalTarget,
    openUpperComboModal: useCallback(() => setComboModalTarget('upper'), []),
    openUnderComboModal: useCallback(() => setComboModalTarget('under'), []),
    closeComboModal: useCallback(() => setComboModalTarget(null), []),
    autoMatched: { categoryId: autoMatched.categoryId, volume: autoMatched.volume },
    welcomeEligibility,
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    underTodayUsageMode,
    todayServiceType,
    underServiceType,
    hydratedSelectedUpperPkg,
    hydratedSelectedUnderPkg,
    isExistingUpperComboLive,
    todaySingleUpperPrice: todaySingleUpperPrice || servicePrice,
    handleApplyPackages,
    handleSelectSinglePackage,
    handleChangeUpperUsageMode,
    handleChangeUnderUsageMode,
    handleRemoveUpperCombo,
    handleRemoveUnderCombo,
  };
}
