'use client';

import React from 'react';
import type {
  ComboTodayUsageMode,
  IosScannedProductCatalogMatch,
  MatchedComboPackageOption,
  WingsComboCategoryId,
} from '@mos-lab/shared';
import { BookingItem } from '../../../state/mockData';
import { ComboCatalogConsultModal } from '../ComboCatalogConsultModal';
import { ComboWalletDetailModal } from '../../ui-kit/ComboWalletDetailModal';
import { ProductQrScannerModal } from '../../modals/ProductQrScannerModal';
import { UpsellModals } from './UpsellModals';

export interface UpsellOverlaysProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  isAdmin: boolean;
  onRefreshDb?: () => Promise<any> | void;
  isConsultModalOpen: boolean;
  onCloseConsultModal: () => void;
  activeCategoryId: WingsComboCategoryId;
  activeVolume: number | 'under';
  welcomeEligibility: any;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  todaySingleServicePrice: number;
  existingUpperExpirySnapshot: any;
  existingUnderExpirySnapshot: any;
  upperTodayUsageMode: ComboTodayUsageMode;
  underTodayUsageMode: ComboTodayUsageMode;
  todayServiceType: 'Normal' | 'Retain';
  underServiceType: 'Normal' | 'Retain';
  onSelectComboPackage: (pkg: MatchedComboPackageOption) => void;
  onApplyComboPackages: (selection: {
    upperPkg: MatchedComboPackageOption | null;
    underPkg: MatchedComboPackageOption | null;
  }) => void;
  isSerumInfoModalOpen: boolean;
  onCloseSerumInfoModal: () => void;
  selectedSerumTierId: string;
  yeppeumCount: number;
  onSelectSerumTier: (tierId: string) => void;
  isLockedWelcomeModalOpen: boolean;
  onCloseLockedWelcomeModal: () => void;
  isQrScannerOpen: boolean;
  onCloseQrScanner: () => void;
  localCartProducts: NonNullable<BookingItem['cartProducts']>;
  onScannedProduct: (scanned: IosScannedProductCatalogMatch) => void;
  onRemoveScannedUnit: (productIndex: number, inventoryWarehouseItemId?: number) => void;
  isWalletModalOpen: boolean;
  onCloseWalletModal: () => void;
}

export function UpsellOverlays({
  isDark,
  booking,
  customerName,
  isAdmin,
  onRefreshDb,
  isConsultModalOpen,
  onCloseConsultModal,
  activeCategoryId,
  activeVolume,
  welcomeEligibility,
  selectedNewComboPkg,
  selectedUnderComboPkg,
  todaySingleServicePrice,
  existingUpperExpirySnapshot,
  existingUnderExpirySnapshot,
  upperTodayUsageMode,
  underTodayUsageMode,
  todayServiceType,
  underServiceType,
  onSelectComboPackage,
  onApplyComboPackages,
  isSerumInfoModalOpen,
  onCloseSerumInfoModal,
  selectedSerumTierId,
  yeppeumCount,
  onSelectSerumTier,
  isLockedWelcomeModalOpen,
  onCloseLockedWelcomeModal,
  isQrScannerOpen,
  onCloseQrScanner,
  localCartProducts,
  onScannedProduct,
  onRemoveScannedUnit,
  isWalletModalOpen,
  onCloseWalletModal,
}: UpsellOverlaysProps) {
  return (
    <>
      <ComboCatalogConsultModal
        open={isConsultModalOpen}
        onClose={onCloseConsultModal}
        initialCategoryId={activeCategoryId}
        initialVolume={activeVolume}
        welcomeEligibility={welcomeEligibility}
        selectedPackageId={selectedNewComboPkg?.id || null}
        todaySingleServicePrice={todaySingleServicePrice}
        existingUpperExpirySnapshot={existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={existingUnderExpirySnapshot}
        upperTodayUsageMode={upperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        todayServiceType={todayServiceType}
        underServiceType={underServiceType}
        initialSelectedUpperPkg={selectedNewComboPkg}
        initialSelectedUnderPkg={selectedUnderComboPkg}
        onSelectPackage={onSelectComboPackage}
        onApplyPackages={onApplyComboPackages}
      />

      <UpsellModals
        isDark={isDark}
        booking={booking}
        customerName={customerName}
        isSerumInfoModalOpen={isSerumInfoModalOpen}
        onCloseSerumInfoModal={onCloseSerumInfoModal}
        selectedSerumTierId={selectedSerumTierId}
        yeppeumCount={yeppeumCount}
        onSelectSerumTier={onSelectSerumTier}
        isLockedWelcomeModalOpen={isLockedWelcomeModalOpen}
        onCloseLockedWelcomeModal={onCloseLockedWelcomeModal}
      />

      <ProductQrScannerModal
        open={isQrScannerOpen}
        isDark={isDark}
        bookingId={Number(booking?.id || 0)}
        cartProducts={localCartProducts}
        onScannedProduct={onScannedProduct}
        onRemoveUnit={onRemoveScannedUnit}
        onClose={onCloseQrScanner}
      />

      <ComboWalletDetailModal
        booking={booking || null}
        isOpen={isWalletModalOpen}
        onClose={onCloseWalletModal}
        isAdmin={isAdmin}
        theme={isDark ? 'dark' : 'light'}
        onUpdated={onRefreshDb}
      />
    </>
  );
}
