'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ComboTodayUsageMode, MatchedComboPackageOption } from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import {
  buildPackagesExpiryPreviewMap,
  computePackageExpiry,
  extractExistingUnderExpirySnapshot,
  extractExistingUpperExpirySnapshot,
  resolveDefaultUnderTodayUsageMode,
  resolveDefaultUpperTodayUsageMode,
} from '../consultation/comboExpiryConsultHelpers';

export interface UseUpsellComboExpiryParams {
  booking?: BookingItem;
  matchedPackages: MatchedComboPackageOption[];
  underLashPackages: MatchedComboPackageOption[];
  selectedNewComboPkg: MatchedComboPackageOption | null;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  isExistingComboLive: boolean;
  hasUnderMinkComboActive: boolean;
  underServicePrice: number;
}

export function useUpsellComboExpiry({
  booking,
  matchedPackages,
  underLashPackages,
  selectedNewComboPkg,
  selectedUnderComboPkg,
  isExistingComboLive,
  hasUnderMinkComboActive,
  underServicePrice,
}: UseUpsellComboExpiryParams) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const existingUpperExpirySnapshot = useMemo(() => extractExistingUpperExpirySnapshot(booking), [booking]);
  const existingUnderExpirySnapshot = useMemo(() => extractExistingUnderExpirySnapshot(booking), [booking]);

  const defaultUpperMode = useMemo(() => resolveDefaultUpperTodayUsageMode(booking), [booking]);
  const hasUnderServiceToday = Boolean(underServicePrice > 0 || booking?.attributes?.hasUnderMink);
  const defaultUnderMode = useMemo(
    () => resolveDefaultUnderTodayUsageMode(booking, hasUnderServiceToday),
    [booking, hasUnderServiceToday]
  );

  const [manualUpperMode, setManualUpperMode] = useState<{
    bookingId: number | undefined;
    mode: ComboTodayUsageMode;
  } | null>(null);
  const [manualUnderMode, setManualUnderMode] = useState<{
    bookingId: number | undefined;
    mode: ComboTodayUsageMode;
  } | null>(null);

  const upperTodayUsageMode: ComboTodayUsageMode =
    manualUpperMode && manualUpperMode.bookingId === booking?.id ? manualUpperMode.mode : defaultUpperMode;
  const underTodayUsageMode: ComboTodayUsageMode =
    manualUnderMode && manualUnderMode.bookingId === booking?.id ? manualUnderMode.mode : defaultUnderMode;

  const setUpperTodayUsageMode = useCallback(
    (mode: ComboTodayUsageMode) => {
      setManualUpperMode({ bookingId: booking?.id, mode });
    },
    [booking?.id]
  );

  const setUnderTodayUsageMode = useCallback(
    (mode: ComboTodayUsageMode) => {
      setManualUnderMode({ bookingId: booking?.id, mode });
    },
    [booking?.id]
  );

  const deductTodayIntoCombo = upperTodayUsageMode === 'USE_NEW_COMBO';
  const setDeductTodayIntoCombo = useCallback(
    (deduct: boolean) => {
      setUpperTodayUsageMode(deduct ? 'USE_NEW_COMBO' : 'RETAIL_OR_VOUCHER');
    },
    [setUpperTodayUsageMode]
  );

  const todayServiceType: 'Normal' | 'Retain' = booking?.serviceType === 'Retain' ? 'Retain' : 'Normal';
  const underServiceType: 'Normal' | 'Retain' =
    booking?.attributes?.underMinkServiceType === 'Retain' ? 'Retain' : 'Normal';

  const upperExpiryPreviewMap = useMemo(
    () =>
      buildPackagesExpiryPreviewMap({
        packages: matchedPackages,
        todayUsageMode: upperTodayUsageMode,
        todayServiceType,
        existingCombo: existingUpperExpirySnapshot,
      }),
    [matchedPackages, upperTodayUsageMode, todayServiceType, existingUpperExpirySnapshot]
  );

  const underExpiryPreviewMap = useMemo(
    () =>
      buildPackagesExpiryPreviewMap({
        packages: underLashPackages,
        todayUsageMode: underTodayUsageMode,
        todayServiceType: underServiceType,
        existingCombo: existingUnderExpirySnapshot,
      }),
    [underLashPackages, underTodayUsageMode, underServiceType, existingUnderExpirySnapshot]
  );

  const selectedUpperExpiry = useMemo(
    () =>
      selectedNewComboPkg
        ? computePackageExpiry({
            pkg: selectedNewComboPkg,
            todayUsageMode: upperTodayUsageMode,
            todayServiceType,
            existingCombo: existingUpperExpirySnapshot,
          })
        : null,
    [selectedNewComboPkg, upperTodayUsageMode, todayServiceType, existingUpperExpirySnapshot]
  );

  const selectedUnderExpiry = useMemo(
    () =>
      selectedUnderComboPkg
        ? computePackageExpiry({
            pkg: selectedUnderComboPkg,
            todayUsageMode: underTodayUsageMode,
            todayServiceType: underServiceType,
            existingCombo: existingUnderExpirySnapshot,
          })
        : null,
    [selectedUnderComboPkg, underTodayUsageMode, underServiceType, existingUnderExpirySnapshot]
  );

  const shouldUseOldUpperComboToday = Boolean(
    isExistingComboLive && (!selectedNewComboPkg || upperTodayUsageMode === 'USE_OLD_COMBO')
  );
  const shouldWaiveUnderToday = Boolean(
    hasUnderServiceToday && !hasUnderMinkComboActive && underTodayUsageMode === 'USE_NEW_COMBO'
  );

  return {
    isWalletModalOpen,
    setIsWalletModalOpen,
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    setUpperTodayUsageMode,
    underTodayUsageMode,
    setUnderTodayUsageMode,
    deductTodayIntoCombo,
    setDeductTodayIntoCombo,
    todayServiceType,
    underServiceType,
    upperExpiryPreviewMap,
    underExpiryPreviewMap,
    selectedUpperExpiry,
    selectedUnderExpiry,
    shouldUseOldUpperComboToday,
    shouldWaiveUnderToday,
  };
}
